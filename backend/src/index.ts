import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { config } from "./core/config.js";
import { ensureUploadDirs } from "./core/upload-dirs.js";
import { MAX_IMAGE_BYTES, safeUploadHeaders } from "./services/uploads.js";
import { authRoutes } from "./routes/auth.js";
import { publicRoutes } from "./routes/public.js";
import { adminRoutes } from "./routes/admin.js";
import { liveRoutes } from "./routes/live.js";
import { captainRoutes } from "./routes/captain.js";
import { storageRoutes } from "./routes/storage.js";
import { cronRoutes } from "./routes/cron.js";
import { competitionRoutes } from "./routes/competitions.js";
import { billingAdminRoutes } from "./routes/billing-admin.js";
import { asaasWebhookRoutes } from "./routes/asaas-webhook.js";
import { formatZodError, isZodError } from "./core/zod-errors.js";

const app = Fastify({ logger: true });

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

const uploadDirs = ensureUploadDirs(config.uploadDir);
await app.register(fastifyStatic, {
  root: uploadDirs.playerPhotos,
  prefix: "/api/storage/player-photos/",
  decorateReply: false,
  setHeaders: setUploadHeaders,
});
await app.register(fastifyStatic, {
  root: uploadDirs.system,
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
await app.register(billingAdminRoutes);
await app.register(asaasWebhookRoutes);

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
