import { timingSafeEqual } from "node:crypto";
import type { AsaasConfig } from "./asaas-config.js";

export type BillingMethod = "CREDIT_CARD" | "PIX" | "BOLETO";
export type ChargeKind = "subscription" | "suspension_fine";
export type ChargeStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "refunded"
  | "canceled";
export type AccountStatus =
  | "none"
  | "current"
  | "pending"
  | "overdue"
  | "inactive";
export type MonthStatus =
  | "paid"
  | "pending"
  | "overdue"
  | "refunded"
  | "none";

export type FineSettings = {
  fineType: "FIXED" | "PERCENTAGE";
  fineFixedCents: number;
  finePercentBps: number;
  interestPercentBps: number;
};

export type AsaasPaymentLike = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  value?: number | null;
  status?: string | null;
  billingType?: string | null;
  dueDate?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  deleted?: boolean | null;
  creditCard?: {
    creditCardNumber?: string | null;
    creditCardBrand?: string | null;
    creditCardToken?: string | null;
  } | null;
};

export function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

export function reaisToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function maskCpf(value: string | null | undefined): string | null {
  const cpf = value ? onlyDigits(value) : "";
  if (cpf.length !== 11) return null;
  return `***.***.***-${cpf.slice(9)}`;
}

export function isMonthKey(value: string | undefined | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

/** Data civil em America/Sao_Paulo, no formato YYYY-MM-DD. */
export function saoPauloDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMonthKey(now = new Date()): string {
  return saoPauloDate(now).slice(0, 7);
}

export function referenceMonthFromDueDate(dueDate: string): string | null {
  const match = /^(\d{4}-\d{2})-\d{2}$/.exec(dueDate);
  return match?.[1] ?? null;
}

/**
 * Próximo vencimento no dia configurado (1–28).
 * Se o dia deste mês já passou, usa o mês seguinte.
 */
export function computeNextDueDate(dueDay: number, today = saoPauloDate()): string {
  const day = Math.min(28, Math.max(1, Math.trunc(dueDay) || 1));
  const [yearText, monthText, dayText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const todayDay = Number(dayText);
  const useNext = todayDay > day;
  const targetMonthIndex = month - 1 + (useNext ? 1 : 0);
  const target = new Date(Date.UTC(year, targetMonthIndex, day));
  return target.toISOString().slice(0, 10);
}

export function buildFineInterest(settings: FineSettings): {
  fine: { value: number; type: "FIXED" | "PERCENTAGE" };
  interest: { value: number };
} {
  if (settings.fineType === "PERCENTAGE") {
    return {
      fine: {
        value: roundMoney(settings.finePercentBps / 100),
        type: "PERCENTAGE",
      },
      interest: { value: roundMoney(settings.interestPercentBps / 100) },
    };
  }
  return {
    fine: {
      value: centsToReais(settings.fineFixedCents),
      type: "FIXED",
    },
    interest: { value: roundMoney(settings.interestPercentBps / 100) },
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildCustomerPayload(input: {
  name: string;
  cpf: string;
  email?: string | null;
  mobilePhone?: string | null;
  playerId: string;
}) {
  const phone = input.mobilePhone ? onlyDigits(input.mobilePhone) : "";
  return {
    name: input.name.slice(0, 100),
    cpfCnpj: onlyDigits(input.cpf),
    email: input.email || undefined,
    mobilePhone: phone.length >= 10 ? phone : undefined,
    externalReference: input.playerId,
    notificationDisabled: false,
    observations: "Jogador SFL",
  };
}

export function buildSubscriptionPayload(input: {
  customerId: string;
  billingType: BillingMethod;
  valueCents: number;
  nextDueDate: string;
  playerId: string;
  fine: FineSettings;
}) {
  return {
    customer: input.customerId,
    billingType: input.billingType,
    value: centsToReais(input.valueCents),
    nextDueDate: input.nextDueDate,
    cycle: "MONTHLY" as const,
    description: "Mensalidade SFL",
    externalReference: input.playerId,
    ...buildFineInterest(input.fine),
  };
}

export function buildSuspensionPaymentPayload(input: {
  customerId: string;
  valueCents: number;
  dueDate: string;
  playerId: string;
  seasonId: string;
  billingType?: BillingMethod;
}) {
  return {
    customer: input.customerId,
    billingType: input.billingType ?? "PIX",
    value: centsToReais(input.valueCents),
    dueDate: input.dueDate,
    description: "Multa de suspensão SFL",
    externalReference: suspensionReference(input.playerId, input.seasonId),
  };
}

export function suspensionReference(playerId: string, seasonId: string): string {
  return `fine:${playerId}:${seasonId}`;
}

export function parseSuspensionReference(
  value: string | null | undefined,
): { playerId: string; seasonId: string } | null {
  if (!value?.startsWith("fine:")) return null;
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  const playerId = parts[1] ?? "";
  const seasonId = parts[2] ?? "";
  if (!playerId || !seasonId) return null;
  return { playerId, seasonId };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function playerIdFromExternalReference(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (UUID_RE.test(value)) return value;
  return null;
}

export function webhookTokenMatches(
  expected: string,
  received: string | undefined,
): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function mapAsaasChargeStatus(
  payment: Pick<AsaasPaymentLike, "status" | "deleted" | "dueDate">,
  today: string,
): ChargeStatus {
  if (payment.deleted) return "canceled";
  const status = (payment.status ?? "").toUpperCase();
  if (status === "RECEIVED" || status === "RECEIVED_IN_CASH" || status === "DUNNING_RECEIVED") {
    return "received";
  }
  if (status === "CONFIRMED") return "confirmed";
  if (
    status === "REFUNDED" ||
    status === "REFUND_REQUESTED" ||
    status === "REFUND_IN_PROGRESS" ||
    status === "CHARGEBACK_REQUESTED" ||
    status === "CHARGEBACK_DISPUTE" ||
    status === "AWAITING_CHARGEBACK_REVERSAL"
  ) {
    return "refunded";
  }
  if (status === "OVERDUE" || status === "DUNNING_REQUESTED") return "overdue";
  const due = payment.dueDate ?? "";
  if (due && due < today) return "overdue";
  return "pending";
}

export function paidAtFromPayment(
  payment: AsaasPaymentLike,
  status: ChargeStatus,
): string | null {
  if (status !== "received" && status !== "confirmed") return null;
  return (
    payment.clientPaymentDate ||
    payment.paymentDate ||
    payment.confirmedDate ||
    null
  );
}

export function cardHintFromPayment(payment: AsaasPaymentLike): {
  cardLast4: string | null;
  cardBrand: string | null;
} {
  const number = payment.creditCard?.creditCardNumber?.replace(/\D/g, "") ?? "";
  const last4 = number.length >= 4 ? number.slice(-4) : null;
  const brand = payment.creditCard?.creditCardBrand?.slice(0, 40) || null;
  return { cardLast4: last4, cardBrand: brand };
}

export function monthStatusOf(
  charge: { status: ChargeStatus; dueDate: string } | null,
  today: string,
): MonthStatus {
  if (!charge || charge.status === "canceled") return "none";
  if (charge.status === "received" || charge.status === "confirmed") return "paid";
  if (charge.status === "refunded") return "refunded";
  if (charge.status === "overdue" || charge.dueDate < today) return "overdue";
  return "pending";
}

export function deriveAccountStatus(
  charges: Array<{ kind: ChargeKind; status: ChargeStatus; dueDate: string }>,
  today: string,
): AccountStatus {
  const subs = charges.filter(
    (charge) => charge.kind === "subscription" && charge.status !== "canceled",
  );
  const open = subs.filter(
    (charge) =>
      charge.status === "pending" ||
      charge.status === "overdue" ||
      charge.status === "refunded",
  );
  const overdue = open.some(
    (charge) => charge.status === "overdue" || charge.dueDate < today,
  );
  if (overdue) return "overdue";
  if (open.length > 0) return "pending";
  if (subs.some((charge) => charge.status === "received" || charge.status === "confirmed")) {
    return "current";
  }
  return "none";
}

export function assertAsaasReady(config: AsaasConfig | null): asserts config is AsaasConfig {
  if (!config) {
    throw new Error("ASAAS_DISABLED");
  }
}

export function chargeWriteFromPayment(input: {
  playerId: string;
  kind: ChargeKind;
  seasonId: string | null;
  payment: AsaasPaymentLike;
  today: string;
}) {
  const status = mapAsaasChargeStatus(input.payment, input.today);
  const dueDate =
    input.payment.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.payment.dueDate)
      ? input.payment.dueDate
      : input.today;
  return {
    playerId: input.playerId,
    asaasPaymentId: input.payment.id,
    kind: input.kind,
    referenceMonth: referenceMonthFromDueDate(dueDate),
    valueCents: reaisToCents(input.payment.value ?? 0),
    status,
    billingType: input.payment.billingType ?? null,
    dueDate,
    paidAt: paidAtFromPayment(input.payment, status),
    invoiceUrl: input.payment.invoiceUrl ?? null,
    bankSlipUrl: input.payment.bankSlipUrl ?? null,
    externalReference: input.payment.externalReference ?? null,
    seasonId: input.seasonId,
  };
}
