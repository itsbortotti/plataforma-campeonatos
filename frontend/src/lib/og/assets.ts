import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Data URL de um arquivo em `public/`, para o gerador de imagem embutir o escudo. */
export async function publicImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  if (!url.startsWith("/") || url.includes("..")) return null;
  const ext = path.extname(url).slice(1).toLowerCase();
  const mime = MIME[ext];
  if (!mime) return null;
  try {
    const file = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
    const buf = await readFile(file);
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
