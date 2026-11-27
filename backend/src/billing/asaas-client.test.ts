import { describe, expect, it, vi } from "vitest";
import { readAsaasConfig } from "./asaas-config.js";
import { AsaasApiError, createAsaasClient } from "./asaas-client.js";

const config = readAsaasConfig({
  ASAAS_API_KEY: "asaas-key-de-teste",
  ASAAS_WEBHOOK_TOKEN: "webhook-token-com-mais-de-32-caracteres",
  ASAAS_ENV: "sandbox",
})!;

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
}

describe("createAsaasClient", () => {
  it("chama o sandbox com access_token e não devolve a chave no erro", async () => {
    const fetchImpl = mockFetch(400, {
      errors: [{ description: "O CPF informado é inválido." }],
    });
    const client = createAsaasClient(config, fetchImpl as unknown as typeof fetch);
    await expect(
      client.createCustomer({ name: "Jogador", cpfCnpj: "52998224725" }),
    ).rejects.toMatchObject({
      name: "AsaasApiError",
      message: "O CPF informado é inválido.",
      status: 400,
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api-sandbox.asaas.com/v3/customers");
    const headers = new Headers(init.headers);
    expect(headers.get("access_token")).toBe("asaas-key-de-teste");
    expect(headers.get("User-Agent")).toBe("sfl-campeonato/1.0");
    await expect(
      client.createCustomer({ name: "Jogador" }),
    ).rejects.toBeInstanceOf(AsaasApiError);
    try {
      await client.createCustomer({ name: "Jogador" });
    } catch (error) {
      expect(String(error)).not.toContain("asaas-key-de-teste");
    }
  });

  it("usa a URL de produção quando ASAAS_ENV=production", async () => {
    const production = readAsaasConfig({
      ASAAS_API_KEY: "asaas-key-de-teste",
      ASAAS_WEBHOOK_TOKEN: "webhook-token-com-mais-de-32-caracteres",
      ASAAS_ENV: "production",
    })!;
    const fetchImpl = mockFetch(200, { id: "sub_1" });
    const client = createAsaasClient(production, fetchImpl as unknown as typeof fetch);
    await client.createSubscription({
      customer: "cus_1",
      billingType: "PIX",
      value: 60,
      nextDueDate: "2026-12-10",
      cycle: "MONTHLY",
    });
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.asaas.com/v3/subscriptions");
  });
});
