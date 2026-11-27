import type { AsaasConfig } from "./asaas-config.js";

export class AsaasApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AsaasApiError";
    this.status = status;
  }
}

export type AsaasList<T> = {
  object?: string;
  hasMore?: boolean;
  data?: T[];
};

export type AsaasCustomer = { id: string; externalReference?: string | null };
export type AsaasSubscription = { id: string; status?: string };
export type AsaasPayment = {
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

type FetchLike = typeof fetch;

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object" && "errors" in body) {
    const errors = (body as { errors?: Array<{ description?: string }> }).errors;
    const text = errors
      ?.map((item) => item.description?.trim())
      .filter((item): item is string => Boolean(item))
      .join(" ");
    if (text) return text;
  }
  return `O Asaas respondeu HTTP ${status}.`;
}

export function createAsaasClient(
  config: AsaasConfig,
  fetchImpl: FetchLike = fetch,
) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: config.apiKey,
        "User-Agent": "sfl-campeonato/1.0",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = null;
      }
    }
    if (!response.ok) {
      throw new AsaasApiError(response.status, errorMessage(response.status, parsed));
    }
    return parsed as T;
  }

  return {
    async findCustomerByExternalReference(externalReference: string) {
      const query = new URLSearchParams({ externalReference });
      return request<AsaasList<AsaasCustomer>>(
        "GET",
        `/customers?${query.toString()}`,
      );
    },
    createCustomer(body: Record<string, unknown>) {
      return request<AsaasCustomer>("POST", "/customers", body);
    },
    createSubscription(body: Record<string, unknown>) {
      return request<AsaasSubscription>("POST", "/subscriptions", body);
    },
    updateSubscription(id: string, body: Record<string, unknown>) {
      return request<AsaasSubscription>(
        "PUT",
        `/subscriptions/${encodeURIComponent(id)}`,
        body,
      );
    },
    deleteSubscription(id: string) {
      return request<{ deleted?: boolean }>(
        "DELETE",
        `/subscriptions/${encodeURIComponent(id)}`,
      );
    },
    listSubscriptionPayments(id: string) {
      return request<AsaasList<AsaasPayment>>(
        "GET",
        `/subscriptions/${encodeURIComponent(id)}/payments?limit=12`,
      );
    },
    createPayment(body: Record<string, unknown>) {
      return request<AsaasPayment>("POST", "/payments", body);
    },
  };
}

export type AsaasClient = ReturnType<typeof createAsaasClient>;
