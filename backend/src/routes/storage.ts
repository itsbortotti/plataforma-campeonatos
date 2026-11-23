import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { requireAdmin, requireUser } from "../core/auth.js";
import { config } from "../core/config.js";

export async function storageRoutes(app: FastifyInstance) {
  app.post("/api/storage/player-photos", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (user.role !== "admin") {
      // players may update own photo via me endpoint after upload — allow authenticated
    }

    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    const playerId =
      (file.fields.playerId as { value?: string } | undefined)?.value ||
      randomUUID();
    const dir = path.join(config.uploadDir, "player-photos", playerId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.filename || "") || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const dest = path.join(dir, filename);
    await pipeline(file.file, createWriteStream(dest));

    const url = `${config.publicApiUrl}/api/storage/player-photos/${playerId}/${filename}`;
    return { url, playerId, filename };
  });

  app.post("/api/storage/player-photos/:playerId", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const playerId = (request.params as { playerId: string }).playerId;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    const dir = path.join(config.uploadDir, "player-photos", playerId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.filename || "") || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    const dest = path.join(dir, filename);
    await pipeline(file.file, createWriteStream(dest));
    const url = `${config.publicApiUrl}/api/storage/player-photos/${playerId}/${filename}`;
    return { url };
  });

  app.post("/api/storage/system-logo", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    const dir = path.join(config.uploadDir, "system");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.filename || "") || ".png";
    const filename = `logo-${randomUUID()}${ext}`;
    const dest = path.join(dir, filename);
    await pipeline(file.file, createWriteStream(dest));

    const url = `${config.publicApiUrl}/api/storage/system/${filename}`;
    return { url };
  });

  app.post("/api/storage/sponsor-logo", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;

    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    const dir = path.join(config.uploadDir, "system", "sponsors");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.filename || "") || ".png";
    const filename = `sponsor-${randomUUID()}${ext}`;
    const dest = path.join(dir, filename);
    await pipeline(file.file, createWriteStream(dest));

    const url = `${config.publicApiUrl}/api/storage/system/sponsors/${filename}`;
    return { url };
  });
}
