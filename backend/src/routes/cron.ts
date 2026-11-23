import type { FastifyInstance } from "fastify";
import { config } from "../core/config.js";
import { finalizeStaleMatches } from "../services/finalize-stale.js";

export async function cronRoutes(app: FastifyInstance) {
  app.post("/api/cron/finalize-stale-matches", async (request, reply) => {
    const auth = request.headers.authorization || "";
    const expected = `Bearer ${config.cronSecret}`;
    if (!config.cronSecret || auth !== expected) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    const result = await finalizeStaleMatches();
    return result;
  });
}
