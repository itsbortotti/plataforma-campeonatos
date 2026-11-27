import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Pastas que o @fastify/static usa como root. O plugin avisa
 * `"root" path "…" must exist` se elas não existirem no boot.
 * `mkdirSync` recursivo cria a raiz (UPLOAD_DIR) e as subpastas.
 */
export function ensureUploadDirs(uploadRoot: string): {
  playerPhotos: string;
  system: string;
} {
  const playerPhotos = path.resolve(uploadRoot, "player-photos");
  const system = path.resolve(uploadRoot, "system");
  mkdirSync(playerPhotos, { recursive: true });
  mkdirSync(system, { recursive: true });
  return { playerPhotos, system };
}
