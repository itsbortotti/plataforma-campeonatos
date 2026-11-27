import {
  BillingChargeKind,
  BillingChargeStatus,
  PlayerBillingStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../core/prisma.js";
import type { AccountStatus, ChargeStatus } from "./domain.js";
import type {
  BillingRepository,
  ChargeSnapshot,
  ChargeWrite,
  SubscriptionChargeRef,
} from "./repository.js";

function isUniqueError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function parsePaidAt(value: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function snapshotFrom(row: {
  asaasPaymentId: string;
  kind: BillingChargeKind;
  status: BillingChargeStatus;
  dueDate: Date;
  seasonId: string | null;
  cardResetId: string | null;
  playerBilling: { playerId: string };
}): ChargeSnapshot {
  return {
    asaasPaymentId: row.asaasPaymentId,
    playerId: row.playerBilling.playerId,
    kind: row.kind,
    status: row.status,
    dueDate: dateKey(row.dueDate),
    seasonId: row.seasonId,
    buyoutApplied: Boolean(row.cardResetId),
  };
}

export function createPrismaBillingRepository(): BillingRepository {
  return {
    async recordEvent(id, event, paymentId) {
      try {
        await prisma.asaasWebhookEvent.create({
          data: { id, event, paymentId },
        });
        return "created";
      } catch (error) {
        if (isUniqueError(error)) return "duplicate";
        throw error;
      }
    },

    async forgetEvent(id) {
      await prisma.asaasWebhookEvent.deleteMany({ where: { id } });
    },

    async findPlayerBySubscription(subscriptionId) {
      const row = await prisma.playerBilling.findUnique({
        where: { asaasSubscriptionId: subscriptionId },
        select: { playerId: true },
      });
      return row?.playerId ?? null;
    },

    async findPlayerByCustomer(customerId) {
      const row = await prisma.playerBilling.findUnique({
        where: { asaasCustomerId: customerId },
        select: { playerId: true },
      });
      return row?.playerId ?? null;
    },

    async findPlayerById(playerId) {
      const row = await prisma.playerBilling.findUnique({
        where: { playerId },
        select: { playerId: true },
      });
      return row?.playerId ?? null;
    },

    async upsertCharge(input: ChargeWrite): Promise<ChargeSnapshot> {
      const billing = await prisma.playerBilling.findUnique({
        where: { playerId: input.playerId },
        select: { id: true },
      });
      if (!billing) throw new Error("BILLING_NOT_FOUND");

      const include = { playerBilling: { select: { playerId: true } } } as const;
      const buildData = (
        existing: {
          kind: BillingChargeKind;
          valueCents: number;
          externalReference: string | null;
          seasonId: string | null;
        } | null,
      ) => ({
        playerBillingId: billing.id,
        kind: (existing?.kind ?? input.kind) as BillingChargeKind,
        referenceMonth: input.referenceMonth,
        valueCents:
          input.valueCents > 0 ? input.valueCents : (existing?.valueCents ?? 0),
        status: input.status as BillingChargeStatus,
        billingType: input.billingType,
        dueDate: parseDateKey(input.dueDate),
        paidAt: parsePaidAt(input.paidAt),
        invoiceUrl: input.invoiceUrl,
        bankSlipUrl: input.bankSlipUrl,
        externalReference: input.externalReference ?? existing?.externalReference,
        seasonId: input.seasonId ?? existing?.seasonId ?? null,
      });

      const existing = await prisma.billingCharge.findUnique({
        where: { asaasPaymentId: input.asaasPaymentId },
      });
      if (existing) {
        const row = await prisma.billingCharge.update({
          where: { id: existing.id },
          data: buildData(existing),
          include,
        });
        return snapshotFrom(row);
      }

      try {
        const row = await prisma.billingCharge.create({
          data: { ...buildData(null), asaasPaymentId: input.asaasPaymentId },
          include,
        });
        return snapshotFrom(row);
      } catch (error) {
        if (!isUniqueError(error)) throw error;
        const raced = await prisma.billingCharge.findUnique({
          where: { asaasPaymentId: input.asaasPaymentId },
        });
        if (!raced) throw error;
        const row = await prisma.billingCharge.update({
          where: { id: raced.id },
          data: buildData(raced),
          include,
        });
        return snapshotFrom(row);
      }
    },

    async listSubscriptionCharges(playerId): Promise<SubscriptionChargeRef[]> {
      const rows = await prisma.billingCharge.findMany({
        where: {
          kind: "subscription",
          playerBilling: { playerId },
        },
        select: { status: true, dueDate: true },
      });
      return rows.map((row) => ({
        kind: "subscription" as const,
        status: row.status as ChargeStatus,
        dueDate: dateKey(row.dueDate),
      }));
    },

    async setAccountStatus(playerId, status: AccountStatus, extra) {
      await prisma.playerBilling.update({
        where: { playerId },
        data: {
          status: status as PlayerBillingStatus,
          ...(extra?.cardLast4 ? { cardLast4: extra.cardLast4 } : {}),
          ...(extra?.cardBrand ? { cardBrand: extra.cardBrand } : {}),
        },
      });
    },

    async clearSubscription(playerId) {
      await prisma.playerBilling.update({
        where: { playerId },
        data: { asaasSubscriptionId: null },
      });
    },

    async suspensionBuyoutEnabled() {
      const settings = await prisma.billingSettings.findUnique({
        where: { id: "default" },
        select: { suspensionBuyoutEnabled: true },
      });
      return settings?.suspensionBuyoutEnabled === true;
    },

    async applySuspensionBuyout({ playerId, seasonId, asaasPaymentId }) {
      return prisma.$transaction(async (tx) => {
        const settings = await tx.billingSettings.findUnique({
          where: { id: "default" },
        });
        if (!settings?.suspensionBuyoutEnabled) return "skipped" as const;

        const charge = await tx.billingCharge.findUnique({
          where: { asaasPaymentId },
        });
        if (!charge || charge.kind !== "suspension_fine") return "skipped" as const;
        if (charge.cardResetId) return "already" as const;
        if (charge.status !== "received" && charge.status !== "confirmed") {
          return "skipped" as const;
        }

        const season = await tx.season.findUnique({
          where: { id: seasonId },
          select: { id: true },
        });
        if (!season) return "skipped" as const;

        const reset = await tx.cardReset.create({
          data: {
            seasonId,
            playerId,
            yellowCleared: 0,
            redCleared: 0,
            clearsPending: true,
            reason: "Pagou a multa de suspensão no Asaas",
          },
        });
        await tx.billingCharge.update({
          where: { id: charge.id },
          data: { cardResetId: reset.id, seasonId },
        });
        return "applied" as const;
      });
    },
  };
}
