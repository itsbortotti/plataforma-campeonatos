import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MatchHalf } from "@prisma/client";
import { requireAdmin } from "../core/auth.js";
import { prisma } from "../core/prisma.js";
import { liveBus } from "../services/live-bus.js";

export async function liveRoutes(app: FastifyInstance) {
  app.get("/api/matches/:id/stream", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": request.headers.origin || "*",
      "Access-Control-Allow-Credentials": "true",
    });
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ matchId: id })}\n\n`);

    const send = (payload: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const unsub = liveBus.subscribeMatch(id, send);
    const keepAlive = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsub();
    });
  });

  app.get("/api/seasons/:seasonId/stream", async (request, reply) => {
    const { seasonId } = z
      .object({ seasonId: z.string().uuid() })
      .parse(request.params);

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": request.headers.origin || "*",
      "Access-Control-Allow-Credentials": "true",
    });
    reply.raw.write(
      `event: connected\ndata: ${JSON.stringify({ seasonId })}\n\n`,
    );

    const send = (payload: { matchId: string }) => {
      // only forward if match belongs to season — cheap check async
      void prisma.match
        .findFirst({ where: { id: payload.matchId, seasonId }, select: { id: true } })
        .then((m) => {
          if (m) reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
        });
    };

    const unsub = liveBus.subscribeSeason(send);
    const keepAlive = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsub();
    });
  });

  app.patch("/api/admin/matches/:id/timer", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        elapsedSeconds: z.number().int().optional(),
        isRunning: z.boolean().optional(),
        currentHalf: z.nativeEnum(MatchHalf).optional(),
        halfStartedAt: z.string().nullable().optional(),
      })
      .parse(request.body);

    const timer = await prisma.matchTimer.upsert({
      where: { matchId: id },
      create: {
        matchId: id,
        elapsedSeconds: body.elapsedSeconds ?? 0,
        isRunning: body.isRunning ?? false,
        currentHalf: body.currentHalf ?? "first",
        halfStartedAt: body.halfStartedAt ? new Date(body.halfStartedAt) : null,
      },
      update: {
        elapsedSeconds: body.elapsedSeconds,
        isRunning: body.isRunning,
        currentHalf: body.currentHalf,
        halfStartedAt:
          body.halfStartedAt === undefined
            ? undefined
            : body.halfStartedAt
              ? new Date(body.halfStartedAt)
              : null,
      },
    });

    const payload = {
      elapsedSeconds: timer.elapsedSeconds,
      isRunning: timer.isRunning,
      halfStartedAt: timer.halfStartedAt?.toISOString() ?? null,
      currentHalf: timer.currentHalf,
    };
    liveBus.publish(id, "timer", payload);
    return payload;
  });
}
