import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, type AuthUser } from "../core/auth.js";
import { AsaasApiError } from "../billing/asaas-client.js";
import { currentMonthKey, isMonthKey } from "../billing/domain.js";
import {
  BillingError,
  cancelSubscription,
  createSuspensionFine,
  getBillingOverview,
  saveBillingSettings,
  subscribePlayer,
  syncSubscriptionsFromAsaas,
} from "../billing/service.js";

function actor(request: { adminUser?: AuthUser }): AuthUser {
  const user = request.adminUser;
  if (!user) throw new BillingError(401, "Faça login para continuar.");
  return user;
}

function sendKnownError(
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof BillingError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (error instanceof AsaasApiError) {
    return reply.code(502).send({ error: error.message });
  }
  throw error;
}

const settingsSchema = z.object({
  monthlyAmountCents: z.number().int().min(100).max(100_000),
  dueDay: z.number().int().min(1).max(28),
  fineType: z.enum(["FIXED", "PERCENTAGE"]),
  fineFixedCents: z.number().int().min(0).max(100_000),
  finePercentBps: z.number().int().min(0).max(10_000),
  interestPercentBps: z.number().int().min(0).max(10_000),
  suspensionBuyoutEnabled: z.boolean(),
  suspensionFineCents: z.number().int().min(100).max(100_000),
  applyToActive: z.boolean().optional(),
});

export async function billingAdminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/admin/billing")) return;
    const user = await requireAdmin(request, reply);
    if (!user) return reply;
    (request as { adminUser?: AuthUser }).adminUser = user;
  });

  app.get("/api/admin/billing/overview", async (request, reply) => {
    try {
      const query = z
        .object({
          month: z.string().optional(),
          season: z.string().uuid().optional(),
        })
        .parse(request.query);
      const month = isMonthKey(query.month) ? query.month : currentMonthKey();
      return await getBillingOverview({
        month,
        seasonId: query.season ?? null,
      });
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });

  app.put("/api/admin/billing/settings", async (request, reply) => {
    try {
      const body = settingsSchema.parse(request.body);
      return await saveBillingSettings(
        actor(request as { adminUser?: AuthUser }),
        body,
      );
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });

  app.post("/api/admin/billing/sync", async (request, reply) => {
    try {
      actor(request as { adminUser?: AuthUser });
      return await syncSubscriptionsFromAsaas();
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });

  app.post("/api/admin/billing/players/:playerId/subscription", async (request, reply) => {
    try {
      const { playerId } = z
        .object({ playerId: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({
          billingType: z.enum(["CREDIT_CARD", "PIX", "BOLETO"]),
          cpf: z.string().min(11).max(18).optional().nullable(),
          mobilePhone: z.string().max(20).optional().nullable(),
        })
        .parse(request.body);
      return await subscribePlayer(actor(request as { adminUser?: AuthUser }), {
        playerId,
        ...body,
      });
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });

  app.delete("/api/admin/billing/players/:playerId/subscription", async (request, reply) => {
    try {
      const { playerId } = z
        .object({ playerId: z.string().uuid() })
        .parse(request.params);
      return await cancelSubscription(
        actor(request as { adminUser?: AuthUser }),
        playerId,
      );
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });

  app.post("/api/admin/billing/players/:playerId/suspension-fine", async (request, reply) => {
    try {
      const { playerId } = z
        .object({ playerId: z.string().uuid() })
        .parse(request.params);
      const body = z
        .object({
          seasonId: z.string().uuid(),
          billingType: z.enum(["PIX", "BOLETO"]).optional(),
          cpf: z.string().min(11).max(18).optional().nullable(),
          mobilePhone: z.string().max(20).optional().nullable(),
        })
        .parse(request.body);
      return await createSuspensionFine(actor(request as { adminUser?: AuthUser }), {
        playerId,
        ...body,
      });
    } catch (error) {
      return sendKnownError(reply, error);
    }
  });
}
