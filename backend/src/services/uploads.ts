import path from "node:path";

/** Fotos e logos. Celular cabe; arquivo grande demais é recusado. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STORED_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const SAFE_SEGMENT_RE = /^[a-z0-9-]{1,32}$/;
const SAFE_FILENAME_RE = /^[a-z0-9-]{1,80}\.(jpg|png|webp)$/;

export type StoredImage = {
  ext: "jpg" | "png" | "webp";
  mime: "image/jpeg" | "image/png" | "image/webp";
};

export class UploadRejected extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "UploadRejected";
    this.statusCode = statusCode;
  }
}

export function parseUuid(raw: string): string | null {
  const id = raw.trim();
  if (!UUID_RE.test(id)) return null;
  if (id.includes("..") || id.includes("/") || id.includes("\\")) return null;
  return id.toLowerCase();
}

/** Confere a assinatura do arquivo. Extensão e Content-Type do cliente são ignorados. */
export function detectImageType(buf: Buffer): StoredImage | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function inspectImageUpload(buf: Buffer): StoredImage {
  if (buf.length === 0) {
    throw new UploadRejected("Arquivo vazio.", 400);
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new UploadRejected("Arquivo maior que 5 MB.", 413);
  }
  const detected = detectImageType(buf);
  if (!detected) {
    throw new UploadRejected("Envie uma imagem JPG, PNG ou WebP.", 400);
  }
  return detected;
}

export function resolveInside(root: string, ...parts: string[]): string {
  const base = path.resolve(root);
  const dest = path.resolve(base, ...parts);
  const rel = path.relative(base, dest);
  if (
    rel === "" ||
    rel.startsWith("..") ||
    path.isAbsolute(rel) ||
    parts.some((part) => part.includes("..") || part.includes("\0"))
  ) {
    throw new UploadRejected("Caminho de upload inválido.", 400);
  }
  return dest;
}

export function playerPhotoDestination(
  uploadRoot: string,
  playerId: string,
  filename: string,
): string {
  const id = parseUuid(playerId);
  if (!id) {
    throw new UploadRejected("Identificador de jogador inválido.", 400);
  }
  const name = filename.trim().toLowerCase();
  if (!STORED_NAME_RE.test(name)) {
    throw new UploadRejected("Nome de arquivo inválido.", 400);
  }
  return resolveInside(uploadRoot, "player-photos", id, name);
}

export function systemAssetDestination(
  uploadRoot: string,
  segments: string[],
  filename: string,
): string {
  if (segments.length === 0 || segments.some((seg) => !SAFE_SEGMENT_RE.test(seg))) {
    throw new UploadRejected("Pasta de upload inválida.", 400);
  }
  const name = filename.trim().toLowerCase();
  if (!SAFE_FILENAME_RE.test(name)) {
    throw new UploadRejected("Nome de arquivo inválido.", 400);
  }
  return resolveInside(uploadRoot, ...segments, name);
}

/** Admin da liga, ou o próprio jogador vinculado à conta. */
export function canUploadPlayerPhoto(opts: {
  isLeagueAdmin: boolean;
  playerUserId: string | null;
  actorUserId: string;
}): boolean {
  if (opts.isLeagueAdmin) return true;
  return opts.playerUserId != null && opts.playerUserId === opts.actorUserId;
}

const IMAGE_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Headers de arquivo servido no mesmo domínio: sem sniff e sem HTML/SVG executável. */
export function safeUploadHeaders(filePath: string): Record<string, string> {
  const ext = path.extname(filePath).toLowerCase();
  const mime = IMAGE_MIME[ext];
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
  };
  if (!mime) {
    headers["Content-Type"] = "application/octet-stream";
    headers["Content-Disposition"] = "attachment";
    return headers;
  }
  headers["Content-Type"] = mime;
  headers["Content-Disposition"] = "inline";
  return headers;
}
