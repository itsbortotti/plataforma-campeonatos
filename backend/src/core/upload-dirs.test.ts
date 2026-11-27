import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureUploadDirs } from "./upload-dirs.js";

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("diretórios de upload", () => {
  it("cria player-photos e system de forma recursiva", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "sfl-uploads-"));
    created.push(parent);
    const root = path.join(parent, "var", "data", "uploads");
    expect(existsSync(root)).toBe(false);

    const dirs = ensureUploadDirs(root);

    expect(dirs.playerPhotos).toBe(path.join(root, "player-photos"));
    expect(dirs.system).toBe(path.join(root, "system"));
    expect(existsSync(dirs.playerPhotos)).toBe(true);
    expect(existsSync(dirs.system)).toBe(true);
  });

  it("aceita a pasta quando ela já existe", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "sfl-uploads-"));
    created.push(parent);
    ensureUploadDirs(parent);
    expect(() => ensureUploadDirs(parent)).not.toThrow();
    expect(existsSync(path.join(parent, "player-photos"))).toBe(true);
  });
});
