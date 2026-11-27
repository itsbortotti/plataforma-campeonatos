import { describe, expect, it } from "vitest";
import { readAsaasConfig } from "./asaas-config.js";
import {
  buildFineInterest,
  buildSubscriptionPayload,
  computeNextDueDate,
  deriveAccountStatus,
  isValidCpf,
  mapAsaasChargeStatus,
  monthStatusOf,
  reaisToCents,
  webhookTokenMatches,
} from "./domain.js";

const TOKEN = "webhook-token-com-mais-de-32-caracteres";

describe("readAsaasConfig", () => {
  it("fica desligado sem as três variáveis", () => {
    expect(readAsaasConfig({})).toBeNull();
    expect(
      readAsaasConfig({
        ASAAS_API_KEY: "chave",
        ASAAS_WEBHOOK_TOKEN: TOKEN,
      }),
    ).toBeNull();
    expect(
      readAsaasConfig({
        ASAAS_API_KEY: "  ",
        ASAAS_WEBHOOK_TOKEN: TOKEN,
        ASAAS_ENV: "sandbox",
      }),
    ).toBeNull();
  });

  it("aponta sandbox ou produção só pelo ASAAS_ENV", () => {
    const sandbox = readAsaasConfig({
      ASAAS_API_KEY: "chave-sandbox",
      ASAAS_WEBHOOK_TOKEN: TOKEN,
      ASAAS_ENV: "sandbox",
    });
    expect(sandbox?.baseUrl).toBe("https://api-sandbox.asaas.com/v3");
    const production = readAsaasConfig({
      ASAAS_API_KEY: "chave-prod",
      ASAAS_WEBHOOK_TOKEN: TOKEN,
      ASAAS_ENV: "PRODUCTION",
    });
    expect(production?.baseUrl).toBe("https://api.asaas.com/v3");
    expect(production?.environment).toBe("production");
  });
});

describe("mensalidade", () => {
  it("aceita o CPF de exemplo e recusa sequência", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });

  it("calcula o próximo vencimento no dia configurado", () => {
    expect(computeNextDueDate(10, "2026-12-05")).toBe("2026-12-10");
    expect(computeNextDueDate(10, "2026-12-10")).toBe("2026-12-10");
    expect(computeNextDueDate(10, "2026-12-11")).toBe("2027-01-10");
    expect(computeNextDueDate(31, "2026-12-01")).toBe("2026-12-28");
  });

  it("monta multa fixa de R$10 e juros, sem dados de cartão", () => {
    const payload = buildSubscriptionPayload({
      customerId: "cus_1",
      billingType: "CREDIT_CARD",
      valueCents: 6000,
      nextDueDate: "2026-12-10",
      playerId: "11111111-1111-4111-8111-111111111111",
      fine: {
        fineType: "FIXED",
        fineFixedCents: 1000,
        finePercentBps: 0,
        interestPercentBps: 100,
      },
    });
    expect(payload.value).toBe(60);
    expect(payload.cycle).toBe("MONTHLY");
    expect(payload.fine).toEqual({ value: 10, type: "FIXED" });
    expect(payload.interest).toEqual({ value: 1 });
    expect(payload).not.toHaveProperty("creditCard");
    expect(JSON.stringify(payload)).not.toMatch(/ccv|holderName/);
  });

  it("envia multa percentual quando configurada", () => {
    expect(
      buildFineInterest({
        fineType: "PERCENTAGE",
        fineFixedCents: 0,
        finePercentBps: 250,
        interestPercentBps: 0,
      }).fine,
    ).toEqual({ value: 2.5, type: "PERCENTAGE" });
  });

  it("arredonda reais para centavos", () => {
    expect(reaisToCents(60)).toBe(6000);
    expect(reaisToCents(19.9)).toBe(1990);
  });
});

describe("status da cobrança", () => {
  const today = "2026-12-15";

  it("trata recebido e confirmado como em dia", () => {
    expect(
      monthStatusOf(
        { status: "received", dueDate: "2026-12-10" },
        today,
      ),
    ).toBe("paid");
    expect(
      monthStatusOf(
        { status: "confirmed", dueDate: "2026-12-10" },
        today,
      ),
    ).toBe("paid");
  });

  it("marca pendente vencido como atrasado", () => {
    expect(
      mapAsaasChargeStatus(
        { status: "PENDING", dueDate: "2026-12-10" },
        today,
      ),
    ).toBe("overdue");
    expect(
      monthStatusOf({ status: "pending", dueDate: "2026-12-20" }, today),
    ).toBe("pending");
  });

  it("prioriza dívida aberta mesmo com outra mensalidade paga", () => {
    expect(
      deriveAccountStatus(
        [
          { kind: "subscription", status: "received", dueDate: "2026-11-10" },
          { kind: "subscription", status: "overdue", dueDate: "2026-12-10" },
        ],
        today,
      ),
    ).toBe("overdue");
    expect(
      deriveAccountStatus(
        [{ kind: "subscription", status: "received", dueDate: "2026-12-10" }],
        today,
      ),
    ).toBe("current");
  });
});

describe("webhookTokenMatches", () => {
  it("exige o token inteiro e rejeita ausência ou tamanho diferente", () => {
    expect(webhookTokenMatches(TOKEN, TOKEN)).toBe(true);
    expect(webhookTokenMatches(TOKEN, undefined)).toBe(false);
    expect(webhookTokenMatches(TOKEN, TOKEN.slice(0, -1))).toBe(false);
    expect(webhookTokenMatches(TOKEN, `${TOKEN}x`)).toBe(false);
    expect(webhookTokenMatches(TOKEN, TOKEN.replace("w", "W"))).toBe(false);
  });
});
