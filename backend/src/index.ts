import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { config } from "./core/config.js";
import { MAX_IMAGE_BYTES, safeUploadHeaders } from "./services/uploads.js";
import { authRoutes } from "./routes/auth.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { liveRoutes } from "./routes/live.js";
import { captainRoutes } from "./routes/captain.js";
import { storageRoutes } from "./routes/storage.js";
import { cronRoutes } from "./routes/cron.js";
import { competitionRoutes } from "./routes/competitions.js";
import { formatZodError, isZodError } from "./core/zod-errors.js";

// Cliente → Cloudflare → load balancer privado do Render. O socket é esse
// balanceador; sem confiar só nesses proxies, req.ip é compartilhado e o
// limite de login trava a conta para todo mundo. Confiar em qualquer
// X-Forwarded-For deixaria o cliente escolher o IP.
const TRUSTED_PROXIES = [
  "loopback",
  "linklocal",
  "uniquelocal",
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const app = Fastify({ logger: true, trustProxy: TRUSTED_PROXIES });

await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});
await app.register(helmet, {
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
  },
  hsts: { maxAge: 15552000, includeSubDomains: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
});
await app.register(rateLimit, {
  global: false,
  hook: "preHandler",
  max: 5,
  timeWindow: 15 * 60 * 1000,
});
await app.register(cookie);
await app.register(jwt, {
  secret: config.jwtSecret,
  cookie: { cookieName: config.cookieName, signed: false },
});
await app.register(multipart, { limits: { fileSize: MAX_IMAGE_BYTES } });

function setUploadHeaders(
  res: { setHeader: (name: string, value: string) => void },
  filePath: string,
) {
  for (const [name, value] of Object.entries(safeUploadHeaders(filePath))) {
    res.setHeader(name, value);
  }
}

await app.register(fastifyStatic, {
  root: path.join(config.uploadDir, "player-photos"),
  prefix: "/api/storage/player-photos/",
  decorateReply: false,
  setHeaders: setUploadHeaders,
});
const systemUploadDir = path.join(config.uploadDir, "system");
if (!existsSync(systemUploadDir)) mkdirSync(systemUploadDir, { recursive: true });
await app.register(fastifyStatic, {
  root: systemUploadDir,
  prefix: "/api/storage/system/",
  decorateReply: false,
  setHeaders: setUploadHeaders,
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
  if (isZodError(err)) {
    return reply.code(400).send({ error: formatZodError(err) });
  }
  const statusCode =
    typeof err === "object" && err && "statusCode" in err
      ? Number((err as { statusCode?: number }).statusCode)
      : 0;
  if (statusCode === 413) {
    return reply.code(413).send({ error: "Arquivo maior que 5 MB." });
  }
  if (statusCode === 429) {
    return reply.code(429).send({
      error: "Muitas tentativas de login. Espere alguns minutos e tente de novo.",
    });
  }
  const message = err instanceof Error ? err.message : "Erro interno";
  if (message.includes("Unique constraint")) {
    if (message.includes("email")) {
      return reply
        .code(400)
        .send({ error: "Já existe um usuário com este e-mail." });
    }
    return reply.code(400).send({ error: "Este registro já existe." });
  }
  if (message.includes("Foreign key")) {
    return reply
      .code(400)
      .send({ error: "Não foi possível salvar: dado relacionado inválido." });
  }
  return reply.code(500).send({ error: "Erro interno. Tente de novo." });
});

await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(`SFL API on http://127.0.0.1:${config.port}`);
