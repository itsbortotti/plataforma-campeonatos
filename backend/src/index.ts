import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { config } from "./core/config.js";
import { authRoutes } from "./routes/auth.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { liveRoutes } from "./routes/live.js";
import { captainRoutes } from "./routes/captain.js";
import { storageRoutes } from "./routes/storage.js";
import { cronRoutes } from "./routes/cron.js";
import { competitionRoutes } from "./routes/competitions.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});
await app.register(cookie);
await app.register(jwt, {
  secret: config.jwtSecret,
  cookie: { cookieName: config.cookieName, signed: false },
});
await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });
await app.register(fastifyStatic, {
  root: path.join(config.uploadDir, "player-photos"),
  prefix: "/api/storage/player-photos/",
  decorateReply: false,
});
const systemUploadDir = path.join(config.uploadDir, "system");
if (!existsSync(systemUploadDir)) mkdirSync(systemUploadDir, { recursive: true });
await app.register(fastifyStatic, {
  root: systemUploadDir,
  prefix: "/api/storage/system/",
  decorateReply: false,
});

app.get("/health", async () => ({ ok: true, service: "sfl-backend" }));

await app.register(authRoutes);
await app.register(publicRoutes);
await app.register(competitionRoutes);
await app.register(adminRoutes);
await app.register(liveRoutes);
await app.register(captainRoutes);
await app.register(storageRoutes);
await app.register(cronRoutes);

app.setErrorHandler((err, _request, reply) => {
  app.log.error(err);
  if (err && typeof err === "object" && "issues" in err) {
    return reply.code(400).send({ error: "Validação inválida", details: err });
  }
  const message = err instanceof Error ? err.message : "Erro interno";
  const status =
    message.includes("Unique constraint") || message.includes("Foreign key")
      ? 400
      : 500;
  return reply.code(status).send({ error: message });
});

await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(`SFL API on http://127.0.0.1:${config.port}`);
