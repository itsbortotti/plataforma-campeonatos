import type { FastifyInstance } from "fastify";
import { readAsaasConfig } from "../billing/asaas-config.js";
import { createPrismaBillingRepository } from "../billing/prisma-repo.js";
import { handleAsaasNotification } from "../billing/webhook.js";

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function asaasWebhookRoutes(app: FastifyInstance) {
  app.post("/api/webhooks/asaas", async (request, reply) => {
    const result = await handleAsaasNotification({
      tokenHeader: headerValue(request.headers["asaas-access-token"]),
      payload: request.body,
      config: readAsaasConfig(),
      repo: createPrismaBillingRepository(),
    });
    return reply.code(result.status).send(result.body);
  });
}
