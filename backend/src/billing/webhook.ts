import { z } from "zod";
import type { AsaasConfig } from "./asaas-config.js";
import {
  cardHintFromPayment,
  chargeWriteFromPayment,
  deriveAccountStatus,
  parseSuspensionReference,
  playerIdFromExternalReference,
  saoPauloDate,
  webhookTokenMatches,
  type AsaasPaymentLike,
} from "./domain.js";
import type { BillingRepository } from "./repository.js";

const paymentSchema = z
  .object({
    id: z.string().min(1).max(80),
    customer: z.string().nullable().optional(),
    subscription: z.string().nullable().optional(),
    value: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    billingType: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    invoiceUrl: z.string().nullable().optional(),
    bankSlipUrl: z.string().nullable().optional(),
    externalReference: z.string().nullable().optional(),
    paymentDate: z.string().nullable().optional(),
    clientPaymentDate: z.string().nullable().optional(),
    confirmedDate: z.string().nullable().optional(),
    deleted: z.boolean().nullable().optional(),
    creditCard: z
      .object({
        creditCardNumber: z.string().nullable().optional(),
        creditCardBrand: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const bodySchema = z
  .object({
    id: z.string().min(1).max(200),
    event: z.string().min(1).max(80),
    payment: paymentSchema.nullable().optional(),
    subscription: z
      .object({
        id: z.string().min(1).max(80),
        customer: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        deleted: z.boolean().nullable().optional(),
        externalReference: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type WebhookResult = {
  status: number;
  body: Record<string, unknown>;
};

function toPayment(value: z.infer<typeof paymentSchema>): AsaasPaymentLike {
  return {
    id: value.id,
    customer: value.customer,
    subscription: value.subscription,
    value: value.value,
    status: value.status,
    billingType: value.billingType,
    dueDate: value.dueDate,
    invoiceUrl: value.invoiceUrl,
    bankSlipUrl: value.bankSlipUrl,
    externalReference: value.externalReference,
    paymentDate: value.paymentDate,
    clientPaymentDate: value.clientPaymentDate,
    confirmedDate: value.confirmedDate,
    deleted: value.deleted,
    creditCard: value.creditCard
      ? {
          creditCardNumber: value.creditCard.creditCardNumber,
          creditCardBrand: value.creditCard.creditCardBrand,
        }
      : null,
  };
}

export async function handleAsaasNotification(input: {
  tokenHeader: string | undefined;
  payload: unknown;
  config: AsaasConfig | null;
  repo: BillingRepository;
  today?: string;
}): Promise<WebhookResult> {
  if (!input.config) {
    return {
      status: 503,
      body: { error: "Mensalidades Asaas desativadas." },
    };
  }
  if (!webhookTokenMatches(input.config.webhookToken, input.tokenHeader)) {
    return { status: 401, body: { error: "Token do webhook inválido." } };
  }

  const parsed = bodySchema.safeParse(input.payload);
  if (!parsed.success) {
    return { status: 400, body: { error: "Evento do Asaas inválido." } };
  }

  const today = input.today ?? saoPauloDate();
  const event = parsed.data;
  const paymentId = event.payment?.id ?? null;
  const recorded = await input.repo.recordEvent(event.id, event.event, paymentId);
  if (recorded === "duplicate") {
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  try {
    if (event.payment) {
      await applyPaymentEvent(input.repo, toPayment(event.payment), today);
    } else if (event.subscription) {
      await applySubscriptionEvent(
        input.repo,
        event.event,
        event.subscription,
        today,
      );
    }
    return { status: 200, body: { ok: true } };
  } catch {
    await input.repo.forgetEvent(event.id);
    return { status: 500, body: { error: "Falha ao processar o evento." } };
  }
}

async function applyPaymentEvent(
  repo: BillingRepository,
  payment: AsaasPaymentLike,
  today: string,
) {
  const resolved = await resolvePlayer(repo, payment);
  if (!resolved) return;

  const snapshot = await repo.upsertCharge(
    chargeWriteFromPayment({
      playerId: resolved.playerId,
      kind: resolved.kind,
      seasonId: resolved.seasonId,
      payment,
      today,
    }),
  );

  const hint = cardHintFromPayment(payment);
  const charges = await repo.listSubscriptionCharges(resolved.playerId);
  await repo.setAccountStatus(resolved.playerId, deriveAccountStatus(charges, today), {
    cardLast4: hint.cardLast4,
    cardBrand: hint.cardBrand,
  });

  if (
    snapshot.kind === "suspension_fine" &&
    snapshot.seasonId &&
    (snapshot.status === "received" || snapshot.status === "confirmed")
  ) {
    const enabled = await repo.suspensionBuyoutEnabled();
    if (enabled) {
      await repo.applySuspensionBuyout({
        playerId: resolved.playerId,
        seasonId: snapshot.seasonId,
        asaasPaymentId: snapshot.asaasPaymentId,
      });
    }
  }
}

async function resolvePlayer(
  repo: BillingRepository,
  payment: AsaasPaymentLike,
): Promise<{ playerId: string; kind: "subscription" | "suspension_fine"; seasonId: string | null } | null> {
  const fine = parseSuspensionReference(payment.externalReference);
  if (fine) {
    const playerId = await repo.findPlayerById(fine.playerId);
    if (!playerId) return null;
    return { playerId, kind: "suspension_fine", seasonId: fine.seasonId };
  }

  if (payment.subscription) {
    const bySubscription = await repo.findPlayerBySubscription(payment.subscription);
    if (bySubscription) {
      return { playerId: bySubscription, kind: "subscription", seasonId: null };
    }
  }

  if (payment.customer) {
    const byCustomer = await repo.findPlayerByCustomer(payment.customer);
    if (byCustomer) {
      return { playerId: byCustomer, kind: "subscription", seasonId: null };
    }
  }

  const fromReference = playerIdFromExternalReference(payment.externalReference);
  if (fromReference) {
    const playerId = await repo.findPlayerById(fromReference);
    if (playerId) {
      return { playerId, kind: "subscription", seasonId: null };
    }
  }

  return null;
}

async function applySubscriptionEvent(
  repo: BillingRepository,
  eventName: string,
  subscription: { id: string; deleted?: boolean | null; externalReference?: string | null; customer?: string | null },
  today: string,
) {
  const ended =
    subscription.deleted === true ||
    eventName === "SUBSCRIPTION_INACTIVATED" ||
    eventName === "SUBSCRIPTION_DELETED";
  if (!ended) return;

  const playerId =
    (await repo.findPlayerBySubscription(subscription.id)) ||
    (subscription.customer
      ? await repo.findPlayerByCustomer(subscription.customer)
      : null) ||
    (subscription.externalReference
      ? await repo.findPlayerById(subscription.externalReference)
      : null);
  if (!playerId) return;

  await repo.clearSubscription(playerId);
  const charges = await repo.listSubscriptionCharges(playerId);
  const derived = deriveAccountStatus(charges, today);
  if (derived === "none" || derived === "current") {
    await repo.setAccountStatus(playerId, "inactive");
  }
}
