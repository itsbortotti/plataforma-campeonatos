import { describe, expect, it } from "vitest";
import type { AsaasConfig } from "./asaas-config.js";
import type { AccountStatus, ChargeStatus } from "./domain.js";
import type {
  BillingRepository,
  ChargeSnapshot,
  ChargeWrite,
} from "./repository.js";
import { handleAsaasNotification } from "./webhook.js";

const TOKEN = "webhook-token-com-mais-de-32-caracteres";
const config: AsaasConfig = {
  apiKey: "asaas-key-de-teste",
  webhookToken: TOKEN,
  environment: "sandbox",
  baseUrl: "https://api-sandbox.asaas.com/v3",
};
const PLAYER = "11111111-1111-4111-8111-111111111111";
const SEASON = "22222222-2222-4222-8222-222222222222";
const TOKEN_CARD = "tok_nao_pode_ir_pro_banco";

class MemoryRepo implements BillingRepository {
  events = new Map<string, string>();
  status: AccountStatus = "none";
  cardLast4: string | null = null;
  charges = new Map<string, ChargeWrite>();
  buyouts: string[] = [];
  buyoutEnabled = false;
  failUpsert = false;
  statusWrites = 0;
  subscriptionCleared = false;

  async recordEvent(id: string, event: string) {
    if (this.events.has(id)) return "duplicate" as const;
    this.events.set(id, event);
    return "created" as const;
  }

  async forgetEvent(id: string) {
    this.events.delete(id);
  }

  async findPlayerBySubscription(subscriptionId: string) {
    return subscriptionId === "sub_1" ? PLAYER : null;
  }

  async findPlayerByCustomer(customerId: string) {
    return customerId === "cus_1" ? PLAYER : null;
  }

  async findPlayerById(playerId: string) {
    return playerId === PLAYER ? PLAYER : null;
  }

  async upsertCharge(input: ChargeWrite): Promise<ChargeSnapshot> {
    if (this.failUpsert) throw new Error("db down");
    this.charges.set(input.asaasPaymentId, input);
    return {
      asaasPaymentId: input.asaasPaymentId,
      playerId: input.playerId,
      kind: input.kind,
      status: input.status,
      dueDate: input.dueDate,
      seasonId: input.seasonId,
      buyoutApplied: this.buyouts.includes(input.asaasPaymentId),
    };
  }

  async listSubscriptionCharges() {
    return [...this.charges.values()]
      .filter((charge) => charge.kind === "subscription")
      .map((charge) => ({
        kind: "subscription" as const,
        status: charge.status,
        dueDate: charge.dueDate,
      }));
  }

  async setAccountStatus(playerId: string, status: AccountStatus, extra?: { cardLast4?: string | null }) {
    expect(playerId).toBe(PLAYER);
    this.status = status;
    this.statusWrites += 1;
    if (extra?.cardLast4) this.cardLast4 = extra.cardLast4;
  }

  async clearSubscription() {
    this.subscriptionCleared = true;
  }

  async suspensionBuyoutEnabled() {
    return this.buyoutEnabled;
  }

  async applySuspensionBuyout(input: { asaasPaymentId: string }) {
    if (!this.buyoutEnabled) return "skipped" as const;
    if (this.buyouts.includes(input.asaasPaymentId)) return "already" as const;
    this.buyouts.push(input.asaasPaymentId);
    return "applied" as const;
  }
}

function notify(
  repo: MemoryRepo,
  payload: unknown,
  token: string | undefined = TOKEN,
  cfg: AsaasConfig | null = config,
) {
  return handleAsaasNotification({
    tokenHeader: token,
    payload,
    config: cfg,
    repo,
    today: "2026-12-15",
  });
}

function paymentEvent(overrides: {
  id?: string;
  event?: string;
  status?: string;
  dueDate?: string;
  subscription?: string | null;
  externalReference?: string | null;
  value?: number;
  invoiceUrl?: string | null;
  includeCard?: boolean;
}) {
  return {
    id: overrides.id ?? "evt_pagamento_001",
    event: overrides.event ?? "PAYMENT_RECEIVED",
    payment: {
      id: "pay_1",
      customer: "cus_1",
      subscription: overrides.subscription === undefined ? "sub_1" : overrides.subscription,
      value: overrides.value ?? 60,
      status: overrides.status ?? "RECEIVED",
      billingType: "PIX",
      dueDate: overrides.dueDate ?? "2026-12-10",
      invoiceUrl:
        overrides.invoiceUrl === undefined
          ? "https://sandbox.asaas.com/i/pay_1"
          : overrides.invoiceUrl,
      externalReference: overrides.externalReference ?? PLAYER,
      paymentDate: "2026-12-10",
      ...(overrides.includeCard
        ? {
            creditCard: {
              creditCardNumber: "8829",
              creditCardBrand: "MASTERCARD",
              creditCardToken: TOKEN_CARD,
            },
          }
        : {}),
    },
  };
}

describe("webhook Asaas", () => {
  it("recusa quando a integração está desligada ou o token não confere", async () => {
    const repo = new MemoryRepo();
    const disabled = await notify(repo, paymentEvent({}), TOKEN, null);
    expect(disabled.status).toBe(503);
    const denied = await notify(repo, paymentEvent({}), "token-errado");
    expect(denied.status).toBe(401);
    expect(repo.events.size).toBe(0);
    const invalid = await notify(repo, { event: "PAYMENT_RECEIVED" });
    expect(invalid.status).toBe(400);
  });

  it("grava a fatura pendente com o link e marca atraso depois do vencimento", async () => {
    const repo = new MemoryRepo();
    const created = await notify(
      repo,
      paymentEvent({
        id: "evt_criada",
        event: "PAYMENT_CREATED",
        status: "PENDING",
        dueDate: "2026-12-20",
      }),
    );
    expect(created.status).toBe(200);
    expect(repo.charges.get("pay_1")?.invoiceUrl).toContain("/i/pay_1");
    expect(repo.charges.get("pay_1")?.status).toBe<ChargeStatus>("pending");
    expect(repo.status).toBe("pending");

    const late = await notify(
      repo,
      paymentEvent({
        id: "evt_atraso",
        event: "PAYMENT_OVERDUE",
        status: "OVERDUE",
        dueDate: "2026-12-10",
      }),
    );
    expect(late.status).toBe(200);
    expect(repo.status).toBe("overdue");
  });

  it("é idempotente e marca o jogador em dia quando o pagamento entra", async () => {
    const repo = new MemoryRepo();
    const payload = paymentEvent({ includeCard: true, event: "PAYMENT_CONFIRMED", status: "CONFIRMED" });
    const first = await notify(repo, payload);
    const second = await notify(repo, payload);
    expect(first.status).toBe(200);
    expect(second.body).toMatchObject({ ok: true, duplicate: true });
    expect(repo.statusWrites).toBe(1);
    expect(repo.status).toBe("current");
    expect(repo.cardLast4).toBe("8829");
    expect(JSON.stringify([...repo.charges.values()])).not.toContain(TOKEN_CARD);
  });

  it("libera a suspensão só quando a regra está ligada", async () => {
    const repo = new MemoryRepo();
    const payload = paymentEvent({
      id: "evt_multa",
      event: "PAYMENT_RECEIVED",
      status: "RECEIVED",
      subscription: null,
      externalReference: `fine:${PLAYER}:${SEASON}`,
      value: 15,
    });
    const blocked = await notify(repo, payload);
    expect(blocked.status).toBe(200);
    expect(repo.buyouts).toEqual([]);
    expect(repo.charges.get("pay_1")?.kind).toBe("suspension_fine");

    repo.buyoutEnabled = true;
    const released = await notify(repo, { ...payload, id: "evt_multa_2" });
    expect(released.status).toBe(200);
    expect(repo.buyouts).toEqual(["pay_1"]);

    const again = await notify(repo, { ...payload, id: "evt_multa_3" });
    expect(again.body).toMatchObject({ ok: true });
    expect(repo.buyouts).toEqual(["pay_1"]);
  });

  it("esquece o evento se o processamento falha, para o Asaas poder reenviar", async () => {
    const repo = new MemoryRepo();
    repo.failUpsert = true;
    const failed = await notify(repo, paymentEvent({ id: "evt_falha" }));
    expect(failed.status).toBe(500);
    expect(repo.events.has("evt_falha")).toBe(false);

    repo.failUpsert = false;
    const retried = await notify(repo, paymentEvent({ id: "evt_falha" }));
    expect(retried.status).toBe(200);
    expect(repo.status).toBe("current");
  });

  it("inativa a assinatura cancelada quando não há dívida", async () => {
    const repo = new MemoryRepo();
    await notify(repo, paymentEvent({ status: "RECEIVED" }));
    expect(repo.status).toBe("current");
    const result = await notify(repo, {
      id: "evt_sub",
      event: "SUBSCRIPTION_DELETED",
      subscription: {
        id: "sub_1",
        customer: "cus_1",
        deleted: true,
        externalReference: PLAYER,
      },
    });
    expect(result.status).toBe(200);
    expect(repo.subscriptionCleared).toBe(true);
    expect(repo.status).toBe("inactive");
  });
});
