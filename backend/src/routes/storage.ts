import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { requireAdmin, requireUser, type AuthUser } from "../core/auth.js";
import { config } from "../core/config.js";
import { prisma } from "../core/prisma.js";
import {
  isGlobalOwnerOrBootstrapAdmin,
  listMembershipsForUser,
} from "../services/memberships.js";
import {
  MAX_IMAGE_BYTES,
  UploadRejected,
  canUploadPlayerPhoto,
  inspectImageUpload,
  parseUuid,
  playerPhotoDestination,
  systemAssetDestination,
} from "../services/uploads.js";

function fieldValue(file: MultipartFile, name: string): string {
  const fields = file.fields as Record<string, { value?: unknown } | undefined>;
  const value = fields[name]?.value;
  return typeof value === "string" ? value : "";
}

async function readUpload(file: MultipartFile): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of file.file) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_IMAGE_BYTES) {
      file.file.destroy();
      throw new UploadRejected("Arquivo maior que 5 MB.", 413);
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

async function isLeagueAdmin(user: AuthUser): Promise<boolean> {
  if (await isGlobalOwnerOrBootstrapAdmin(user)) return true;
  const memberships = await listMembershipsForUser(user.id);
  return memberships.some(
    (membership) =>
      membership.role === "owner" || membership.role === "league_admin",
  );
}

function sendUploadError(reply: FastifyReply, err: unknown) {
  if (err instanceof UploadRejected) {
    return reply.code(err.statusCode).send({ error: err.message });
  }
  throw err;
}

async function savePlayerPhoto(
  user: AuthUser,
  requestedId: string,
  file: MultipartFile,
) {
  let playerId = requestedId ? parseUuid(requestedId) : null;
  if (requestedId && !playerId) {
    file.file.destroy();
    throw new UploadRejected("Identificador de jogador inválido.", 400);
  }

  if (!playerId) {
    const own = await prisma.player.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!own) {
      file.file.destroy();
      throw new UploadRejected("Informe o jogador da foto.", 400);
    }
    playerId = own.id;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, userId: true },
  });
  if (!player) {
    file.file.destroy();
    throw new UploadRejected("Jogador não encontrado.", 404);
  }

  const allowed = canUploadPlayerPhoto({
    isLeagueAdmin: await isLeagueAdmin(user),
    playerUserId: player.userId,
    actorUserId: user.id,
  });
  if (!allowed) {
    file.file.destroy();
    throw new UploadRejected("Você só pode enviar a própria foto.", 403);
  }

  const bytes = await readUpload(file);
  const image = inspectImageUpload(bytes);
  const filename = `${randomUUID()}.${image.ext}`;
  const dest = playerPhotoDestination(config.uploadDir, player.id, filename);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  const url = `${config.publicApiUrl}/api/storage/player-photos/${player.id}/${filename}`;
  return { url, playerId: player.id, filename };
}

async function saveSystemImage(
  file: MultipartFile,
  segments: string[],
  prefix: string,
) {
  const bytes = await readUpload(file);
  const image = inspectImageUpload(bytes);
  const filename = `${prefix}-${randomUUID()}.${image.ext}`;
  const dest = systemAssetDestination(config.uploadDir, segments, filename);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);
  const url = `${config.publicApiUrl}/api/storage/${segments.join("/")}/${filename}`;
  return { url };
}

export async function storageRoutes(app: FastifyInstance) {
  app.post("/api/storage/player-photos", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    try {
      return await savePlayerPhoto(user, fieldValue(file, "playerId"), file);
    } catch (err) {
      return sendUploadError(reply, err);
    }
  });

  app.post("/api/storage/player-photos/:playerId", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const playerId = (request.params as { playerId: string }).playerId;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    try {
      const saved = await savePlayerPhoto(admin, playerId, file);
      return { url: saved.url };
    } catch (err) {
      return sendUploadError(reply, err);
    }
  });

  app.post("/api/storage/system-logo", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    try {
      return await saveSystemImage(file, ["system"], "logo");
    } catch (err) {
      return sendUploadError(reply, err);
    }
  });

  app.post("/api/storage/sponsor-logo", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "Arquivo ausente" });

    try {
      return await saveSystemImage(file, ["system", "sponsors"], "sponsor");
    } catch (err) {
      return sendUploadError(reply, err);
    }
  });
}
