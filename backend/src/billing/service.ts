import type { BillingMethod as PrismaBillingMethod } from "@prisma/client";
import { prisma } from "../core/prisma.js";
import { writeAudit } from "../services/audit.js";
import { readAsaasConfig, type AsaasConfig } from "./asaas-config.js";
import { AsaasApiError, createAsaasClient, type AsaasPayment } from "./asaas-client.js";
import {
  buildCustomerPayload,
  buildFineInterest,
  buildSubscriptionPayload,
  buildSuspensionPaymentPayload,
  centsToReais,
  chargeWriteFromPayment,
  computeNextDueDate,
  deriveAccountStatus,
  isValidCpf,
  mapAsaasChargeStatus,
  maskCpf,
  monthStatusOf,
  onlyDigits,
  saoPauloDate,
  suspensionReference,
  type AccountStatus,
  type BillingMethod,
  type ChargeStatus,
  type MonthStatus,
} from "./domain.js";
import { createPrismaBillingRepository } from "./prisma-repo.js";

export class BillingError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "BillingError";
    this.statusCode = statusCode;
  }
}

export type BillingActor = { id: string; email: string };

export type BillingSettingsInput = {
  monthlyAmountCents: number;
  dueDay: number;
  fineType: "FIXED" | "PERCENTAGE";
  fineFixedCents: number;
  finePercentBps: number;
  interestPercentBps: number;
  suspensionBuyoutEnabled: boolean;
  suspensionFineCents: number;
  applyToActive?: boolean;
};

const DEFAULT_SETTINGS: BillingSettingsInput = {
  monthlyAmountCents: 6000,
  dueDay: 10,
  fineType: "FIXED",
  fineFixedCents: 1000,
  finePercentBps: 0,
  interestPercentBps: 0,
  suspensionBuyoutEnabled: false,
  suspensionFineCents: 1500,
};

function requireConfig(): AsaasConfig {
  const config = readAsaasConfig();
  if (!config) {
    throw new BillingError(
      409,
      "Asaas não está configurado. Defina ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN e ASAAS_ENV (sandbox ou production) no servidor.",
    );
  }
  return config;
}

export async function getOrCreateSettings() {
  const existing = await prisma.billingSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;
  return prisma.billingSettings.create({
    data: { id: "default", ...DEFAULT_SETTINGS },
  });
}

function fineOf(settings: {
  fineType: string;
  fineFixedCents: number;
  finePercentBps: number;
  interestPercentBps: number;
}) {
  return buildFineInterest({
    fineType: settings.fineType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
    fineFixedCents: settings.fineFixedCents,
    finePercentBps: settings.finePercentBps,
    interestPercentBps: settings.interestPercentBps,
  });
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function ensureCustomer(input: {
  playerId: string;
  name: string;
  email: string | null;
  cpf: string;
  mobilePhone: string | null;
  customerId: string | null;
  config: AsaasConfig;
}) {
  const client = createAsaasClient(input.config);
  if (input.customerId) return { client, customerId: input.customerId };

  const found = await client.findCustomerByExternalReference(input.playerId);
  const existing = found.data?.[0];
  if (existing?.id) return { client, customerId: existing.id };

  const created = await client.createCustomer(
    buildCustomerPayload({
      name: input.name,
      cpf: input.cpf,
      email: input.email,
      mobilePhone: input.mobilePhone,
      playerId: input.playerId,
    }),
  );
  return { client, customerId: created.id };
}

async function persistPayments(
  playerId: string,
  payments: AsaasPayment[],
  kind: "subscription" | "suspension_fine",
  seasonId: string | null,
  today: string,
) {
  const repo = createPrismaBillingRepository();
  for (const payment of payments) {
    await repo.upsertCharge(
      chargeWriteFromPayment({
        playerId,
        kind,
        seasonId,
        payment,
        today,
      }),
    );
  }
  if (kind === "subscription") {
    const charges = await repo.listSubscriptionCharges(playerId);
    await repo.setAccountStatus(playerId, deriveAccountStatus(charges, today));
  }
}

export async function saveBillingSettings(
  actor: BillingActor,
  input: BillingSettingsInput,
) {
  const data = {
    monthlyAmountCents: input.monthlyAmountCents,
    dueDay: input.dueDay,
    fineType: input.fineType,
    fineFixedCents: input.fineFixedCents,
    finePercentBps: input.finePercentBps,
    interestPercentBps: input.interestPercentBps,
    suspensionBuyoutEnabled: input.suspensionBuyoutEnabled,
    suspensionFineCents: input.suspensionFineCents,
  };
  const settings = await prisma.billingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  let applied = 0;
  let failed = 0;
  if (input.applyToActive) {
    const config = requireConfig();
    const client = createAsaasClient(config);
    const rows = await prisma.playerBilling.findMany({
      where: { asaasSubscriptionId: { not: null } },
      select: { asaasSubscriptionId: true },
    });
    const fine = fineOf(settings);
    for (const row of rows) {
      if (!row.asaasSubscriptionId) continue;
      try {
        await client.updateSubscription(row.asaasSubscriptionId, {
          value: centsToReais(settings.monthlyAmountCents),
          updatePendingPayments: true,
          ...fine,
        });
        applied += 1;
      } catch (error) {
        if (!(error instanceof AsaasApiError)) throw error;
        failed += 1;
      }
    }
  }

  await writeAudit({
    userId: actor.id,
    userEmail: actor.email,
    action: "update",
    entityType: "billing_settings",
    entityId: "default",
    description: "Atualizou as regras de mensalidade",
    details: {
      monthlyAmountCents: input.monthlyAmountCents,
      dueDay: input.dueDay,
      fineType: input.fineType,
      suspensionBuyoutEnabled: input.suspensionBuyoutEnabled,
      applyToActive: Boolean(input.applyToActive),
      applied,
      failed,
    },
  });

  return { settings, applied, failed };
}

export async function subscribePlayer(
  actor: BillingActor,
  input: {
    playerId: string;
    billingType: BillingMethod;
    cpf?: string | null;
    mobilePhone?: string | null;
  },
) {
  const config = requireConfig();
  const phoneDigits = input.mobilePhone ? onlyDigits(input.mobilePhone) : "";
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
    throw new BillingError(400, "Celular inválido. Use DDD + número.");
  }

  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  if (!player || !player.isActive) {
    throw new BillingError(404, "Jogador não encontrado.");
  }
  const existingBilling = await prisma.playerBilling.findUnique({
    where: { playerId: player.id },
    select: { cpf: true },
  });
  const cpf = onlyDigits(input.cpf || existingBilling?.cpf || "");
  if (!isValidCpf(cpf)) {
    throw new BillingError(400, "Informe um CPF válido.");
  }

  const settings = await getOrCreateSettings();
  const today = saoPauloDate();
  const mobilePhone = phoneDigits || null;

  let billing = await prisma.playerBilling.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      cpf,
      mobilePhone,
    },
    update: {
      cpf,
      ...(phoneDigits ? { mobilePhone: phoneDigits } : {}),
    },
  });
  const hadSubscription = Boolean(billing.asaasSubscriptionId);

  const ensured = await ensureCustomer({
    playerId: player.id,
    name: player.name,
    email: player.email,
    cpf,
    mobilePhone,
    customerId: billing.asaasCustomerId,
    config,
  });

  if (billing.asaasCustomerId !== ensured.customerId) {
    billing = await prisma.playerBilling.update({
      where: { id: billing.id },
      data: { asaasCustomerId: ensured.customerId },
    });
  }

  const fine = fineOf(settings);
  const value = settings.monthlyAmountCents;
  let subscriptionId = billing.asaasSubscriptionId;

  if (subscriptionId) {
    await ensured.client.updateSubscription(subscriptionId, {
      billingType: input.billingType,
      value: centsToReais(value),
      updatePendingPayments: true,
      description: "Mensalidade SFL",
      ...fine,
    });
  } else {
    const created = await ensured.client.createSubscription(
      buildSubscriptionPayload({
        customerId: ensured.customerId,
        billingType: input.billingType,
        valueCents: value,
        nextDueDate: computeNextDueDate(settings.dueDay, today),
        playerId: player.id,
        fine: {
          fineType: settings.fineType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
          fineFixedCents: settings.fineFixedCents,
          finePercentBps: settings.finePercentBps,
          interestPercentBps: settings.interestPercentBps,
        },
      }),
    );
    subscriptionId = created.id;
    billing = await prisma.playerBilling.update({
      where: { id: billing.id },
      data: {
        asaasSubscriptionId: subscriptionId,
        billingType: input.billingType as PrismaBillingMethod,
        status: billing.status === "none" ? "pending" : billing.status,
      },
    });
  }

  const listed = await ensured.client.listSubscriptionPayments(subscriptionId);
  await persistPayments(
    player.id,
    listed.data ?? [],
    "subscription",
    null,
    today,
  );

  await prisma.playerBilling.update({
    where: { playerId: player.id },
    data: { billingType: input.billingType as PrismaBillingMethod },
  });

  await writeAudit({
    userId: actor.id,
    userEmail: actor.email,
    action: hadSubscription ? "update" : "create",
    entityType: "player_billing",
    entityId: player.id,
    description: "Configurou a assinatura de mensalidade",
    details: { billingType: input.billingType },
  });

  return { playerId: player.id, subscriptionId };
}

export async function cancelSubscription(actor: BillingActor, playerId: string) {
  const config = requireConfig();
  const billing = await prisma.playerBilling.findUnique({ where: { playerId } });
  if (!billing?.asaasSubscriptionId) {
    throw new BillingError(404, "Este jogador não tem assinatura ativa.");
  }
  const client = createAsaasClient(config);
  await client.deleteSubscription(billing.asaasSubscriptionId);
  await prisma.playerBilling.update({
    where: { playerId },
    data: { asaasSubscriptionId: null },
  });
  const today = saoPauloDate();
  const repo = createPrismaBillingRepository();
  const charges = await repo.listSubscriptionCharges(playerId);
  const derived = deriveAccountStatus(charges, today);
  await repo.setAccountStatus(playerId, derived === "none" ? "inactive" : derived);

  await writeAudit({
    userId: actor.id,
    userEmail: actor.email,
    action: "delete",
    entityType: "player_billing",
    entityId: playerId,
    description: "Cancelou a assinatura de mensalidade",
  });
  return { ok: true };
}

export async function createSuspensionFine(
  actor: BillingActor,
  input: {
    playerId: string;
    seasonId: string;
    billingType?: "PIX" | "BOLETO";
    cpf?: string | null;
    mobilePhone?: string | null;
  },
) {
  const config = requireConfig();
  const settings = await getOrCreateSettings();
  if (!settings.suspensionBuyoutEnabled) {
    throw new BillingError(
      409,
      "A compra da suspensão está desligada. Ative a regra nesta tela antes de gerar a cobrança.",
    );
  }

  const season = await prisma.season.findUnique({
    where: { id: input.seasonId },
    select: { id: true },
  });
  if (!season) throw new BillingError(404, "Temporada não encontrada.");

  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  if (!player || !player.isActive) {
    throw new BillingError(404, "Jogador não encontrado.");
  }

  const cpfSource = input.cpf || null;
  let billing = await prisma.playerBilling.findUnique({
    where: { playerId: player.id },
  });
  const cpf = onlyDigits(cpfSource || billing?.cpf || "");
  if (!isValidCpf(cpf)) {
    throw new BillingError(400, "Informe um CPF válido para gerar a cobrança no Asaas.");
  }
  const phoneDigits = input.mobilePhone ? onlyDigits(input.mobilePhone) : "";
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
    throw new BillingError(400, "Celular inválido. Use DDD + número.");
  }

  billing = await prisma.playerBilling.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      cpf,
      mobilePhone: phoneDigits || null,
    },
    update: {
      cpf,
      ...(phoneDigits ? { mobilePhone: phoneDigits } : {}),
    },
  });

  const ensured = await ensureCustomer({
    playerId: player.id,
    name: player.name,
    email: player.email,
    cpf,
    mobilePhone: phoneDigits || billing.mobilePhone,
    customerId: billing.asaasCustomerId,
    config,
  });
  if (billing.asaasCustomerId !== ensured.customerId) {
    billing = await prisma.playerBilling.update({
      where: { id: billing.id },
      data: { asaasCustomerId: ensured.customerId },
    });
  }

  const today = saoPauloDate();
  const open = await prisma.billingCharge.findFirst({
    where: {
      playerBillingId: billing.id,
      kind: "suspension_fine",
      seasonId: season.id,
      status: { in: ["pending", "overdue"] },
    },
  });
  if (open) {
    return {
      reused: true,
      invoiceUrl: open.invoiceUrl,
      asaasPaymentId: open.asaasPaymentId,
    };
  }

  const listed = await ensured.client.listPaymentsByExternalReference(
    ensured.customerId,
    suspensionReference(player.id, season.id),
  );
  const existingPayment = (listed.data ?? []).find((payment) => {
    const status = mapAsaasChargeStatus(payment, today);
    return status === "pending" || status === "overdue";
  });
  if (existingPayment) {
    await persistPayments(
      player.id,
      [existingPayment],
      "suspension_fine",
      season.id,
      today,
    );
    return {
      reused: true,
      invoiceUrl: existingPayment.invoiceUrl ?? null,
      asaasPaymentId: existingPayment.id,
    };
  }

  const payment = await ensured.client.createPayment(
    buildSuspensionPaymentPayload({
      customerId: ensured.customerId,
      valueCents: settings.suspensionFineCents,
      dueDate: today,
      playerId: player.id,
      seasonId: season.id,
      billingType: input.billingType ?? "PIX",
    }),
  );
  await persistPayments(player.id, [payment], "suspension_fine", season.id, today);

  await writeAudit({
    userId: actor.id,
    userEmail: actor.email,
    action: "create",
    entityType: "suspension_fine",
    entityId: player.id,
    description: "Gerou cobrança da multa de suspensão",
    details: { seasonId: season.id, valueCents: settings.suspensionFineCents },
  });

  return {
    reused: false,
    invoiceUrl: payment.invoiceUrl ?? null,
    asaasPaymentId: payment.id,
  };
}

export async function syncSubscriptionsFromAsaas() {
  const config = requireConfig();
  const client = createAsaasClient(config);
  const today = saoPauloDate();
  const rows = await prisma.playerBilling.findMany({
    where: { asaasSubscriptionId: { not: null } },
    select: { playerId: true, asaasSubscriptionId: true },
  });
  let payments = 0;
  let failed = 0;
  for (const row of rows) {
    if (!row.asaasSubscriptionId) continue;
    try {
      const listed = await client.listSubscriptionPayments(row.asaasSubscriptionId);
      const data = listed.data ?? [];
      await persistPayments(row.playerId, data, "subscription", null, today);
      payments += data.length;
    } catch (error) {
      if (!(error instanceof AsaasApiError)) throw error;
      failed += 1;
    }
  }
  return { subscriptions: rows.length, payments, failed };
}

export async function getBillingOverview(input: {
  month: string;
  seasonId?: string | null;
}) {
  const config = readAsaasConfig();
  const settings = await getOrCreateSettings();
  const today = saoPauloDate();
  const seasonId = input.seasonId || null;

  const players = await prisma.player.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      nickname: true,
      rosters: {
        where: seasonId ? { seasonId } : { season: { isCurrent: true } },
        take: 1,
        select: { team: { select: { name: true } } },
      },
      billing: {
        select: {
          billingType: true,
          status: true,
          asaasSubscriptionId: true,
          cpf: true,
          cardLast4: true,
          cardBrand: true,
          charges: {
            where: { referenceMonth: input.month },
            orderBy: { dueDate: "desc" },
          },
        },
      },
    },
  });

  const summary = {
    paid: 0,
    pending: 0,
    overdue: 0,
    none: 0,
    refunded: 0,
    expectedCents: 0,
    receivedCents: 0,
  };

  const rows = players.map((player) => {
    const charges = player.billing?.charges ?? [];
    const subscription =
      charges.find((charge) => charge.kind === "subscription") ?? null;
    const suspension =
      charges.find((charge) => charge.kind === "suspension_fine") ?? null;
    const monthStatus: MonthStatus = monthStatusOf(
      subscription
        ? { status: subscription.status, dueDate: dateKey(subscription.dueDate) }
        : null,
      today,
    );
    if (monthStatus === "paid") summary.paid += 1;
    else if (monthStatus === "pending") summary.pending += 1;
    else if (monthStatus === "overdue") summary.overdue += 1;
    else if (monthStatus === "refunded") summary.refunded += 1;
    else summary.none += 1;

    if (subscription) {
      summary.expectedCents += subscription.valueCents;
      if (monthStatus === "paid") summary.receivedCents += subscription.valueCents;
    }

    return {
      playerId: player.id,
      name: player.name,
      nickname: player.nickname,
      teamName: player.rosters[0]?.team?.name ?? null,
      billingType: player.billing?.billingType ?? null,
      accountStatus: (player.billing?.status ?? "none") as AccountStatus,
      hasSubscription: Boolean(player.billing?.asaasSubscriptionId),
      cpfMasked: maskCpf(player.billing?.cpf),
      cardLast4: player.billing?.cardLast4 ?? null,
      cardBrand: player.billing?.cardBrand ?? null,
      monthStatus,
      charge: subscription
        ? {
            valueCents: subscription.valueCents,
            dueDate: dateKey(subscription.dueDate),
            invoiceUrl: subscription.invoiceUrl,
            bankSlipUrl: subscription.bankSlipUrl,
            status: subscription.status as ChargeStatus,
            paidAt: subscription.paidAt?.toISOString() ?? null,
          }
        : null,
      suspensionCharge: suspension
        ? {
            valueCents: suspension.valueCents,
            dueDate: dateKey(suspension.dueDate),
            invoiceUrl: suspension.invoiceUrl,
            status: suspension.status as ChargeStatus,
            buyoutApplied: Boolean(suspension.cardResetId),
          }
        : null,
    };
  });

  return {
    configured: Boolean(config),
    environment: config?.environment ?? null,
    month: input.month,
    today,
    seasonId,
    settings: {
      monthlyAmountCents: settings.monthlyAmountCents,
      dueDay: settings.dueDay,
      fineType: settings.fineType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
      fineFixedCents: settings.fineFixedCents,
      finePercentBps: settings.finePercentBps,
      interestPercentBps: settings.interestPercentBps,
      suspensionBuyoutEnabled: settings.suspensionBuyoutEnabled,
      suspensionFineCents: settings.suspensionFineCents,
    },
    summary,
    players: rows,
  };
}
