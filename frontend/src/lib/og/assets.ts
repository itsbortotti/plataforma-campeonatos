import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const MAX_EMBED_BYTES = 1_500_000;

/**
 * Só embute arquivo que já está em `public/`.
 * URL remota não entra no gerador: o ImageResponse buscaria o host no servidor.
 */
export async function publicImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return null;
  if (url.includes("..") || url.includes("\\") || url.includes("\0")) return null;
  const ext = path.extname(url).slice(1).toLowerCase();
  const mime = MIME[ext];
  if (!mime) return null;
  const root = path.resolve(process.cwd(), "public");
  const file = path.resolve(root, url.replace(/^\/+/, ""));
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) return null;
  try {
    const buf = await readFile(file);
    if (buf.length > MAX_EMBED_BYTES) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function clip(text: string | null | undefined, max: number): string {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1)).trim()}…`;
}
