export type AsaasEnvironment = "sandbox" | "production";

export type AsaasConfig = {
  apiKey: string;
  webhookToken: string;
  environment: AsaasEnvironment;
  baseUrl: string;
};

const URLS: Record<AsaasEnvironment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

/**
 * A integração só liga quando as três variáveis existem.
 * Sem elas o site segue no ar e as rotas de mensalidade respondem que o recurso está desativado.
 */
export function readAsaasConfig(
  env: NodeJS.ProcessEnv = process.env,
): AsaasConfig | null {
  const apiKey = env.ASAAS_API_KEY?.trim() ?? "";
  const webhookToken = env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";
  const rawEnv = env.ASAAS_ENV?.trim().toLowerCase() ?? "";
  if (!apiKey || !webhookToken) return null;
  if (rawEnv !== "sandbox" && rawEnv !== "production") return null;
  return {
    apiKey,
    webhookToken,
    environment: rawEnv,
    baseUrl: URLS[rawEnv],
  };
}
