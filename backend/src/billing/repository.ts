import type {
  AccountStatus,
  AsaasPaymentLike,
  ChargeKind,
  ChargeStatus,
} from "./domain.js";

export type ChargeSnapshot = {
  asaasPaymentId: string;
  playerId: string;
  kind: ChargeKind;
  status: ChargeStatus;
  dueDate: string;
  seasonId: string | null;
  buyoutApplied: boolean;
};

export type ChargeWrite = {
  playerId: string;
  asaasPaymentId: string;
  kind: ChargeKind;
  referenceMonth: string | null;
  valueCents: number;
  status: ChargeStatus;
  billingType: string | null;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  externalReference: string | null;
  seasonId: string | null;
};

export type SubscriptionChargeRef = {
  kind: "subscription";
  status: ChargeStatus;
  dueDate: string;
};

export interface BillingRepository {
  recordEvent(
    id: string,
    event: string,
    paymentId: string | null,
  ): Promise<"created" | "duplicate">;
  forgetEvent(id: string): Promise<void>;
  findPlayerBySubscription(subscriptionId: string): Promise<string | null>;
  findPlayerByCustomer(customerId: string): Promise<string | null>;
  findPlayerById(playerId: string): Promise<string | null>;
  upsertCharge(input: ChargeWrite): Promise<ChargeSnapshot>;
  listSubscriptionCharges(playerId: string): Promise<SubscriptionChargeRef[]>;
  setAccountStatus(
    playerId: string,
    status: AccountStatus,
    extra?: {
      cardLast4?: string | null;
      cardBrand?: string | null;
    },
  ): Promise<void>;
  clearSubscription(playerId: string): Promise<void>;
  suspensionBuyoutEnabled(): Promise<boolean>;
  applySuspensionBuyout(input: {
    playerId: string;
    seasonId: string;
    asaasPaymentId: string;
  }): Promise<"applied" | "already" | "skipped">;
}

export type ResolvedPayment = {
  playerId: string;
  kind: ChargeKind;
  seasonId: string | null;
  payment: AsaasPaymentLike;
};
