import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  UploadRejected,
  canUploadPlayerPhoto,
  detectImageType,
  inspectImageUpload,
  parseUuid,
  playerPhotoDestination,
  safeUploadHeaders,
  systemAssetDestination,
} from "./uploads.js";

const PLAYER = "11111111-1111-4111-8111-111111111111";
const FILE = "22222222-2222-4222-8222-222222222222.jpg";

function jpeg(size = 16): Buffer {
  const buf = Buffer.alloc(size, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

function png(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
  ]);
}

function webp(): Buffer {
  const buf = Buffer.alloc(16, 0);
  buf.write("RIFF", 0, "ascii");
  buf.write("WEBP", 8, "ascii");
  return buf;
}

describe("upload de imagem", () => {
  it("aceita JPG, PNG e WebP pelo conteúdo, não pela extensão", () => {
    expect(detectImageType(jpeg())?.ext).toBe("jpg");
    expect(detectImageType(png())?.mime).toBe("image/png");
    expect(detectImageType(webp())?.ext).toBe("webp");
    expect(inspectImageUpload(jpeg()).ext).toBe("jpg");
  });

  it("recusa HTML, SVG e arquivo vazio", () => {
    expect(detectImageType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(() => inspectImageUpload(Buffer.from("<svg></svg>"))).toThrow(UploadRejected);
    expect(() => inspectImageUpload(Buffer.alloc(0))).toThrow(/vazio/);
  });

  it("recusa arquivo acima do limite", () => {
    const huge = jpeg(MAX_IMAGE_BYTES + 1);
    expect(() => inspectImageUpload(huge)).toThrow(/5 MB/);
  });

  it("não deixa o playerId escapar da pasta de fotos", () => {
    const root = path.resolve("/tmp/sfl-uploads");
    const dest = playerPhotoDestination(root, PLAYER, FILE);
    expect(dest.startsWith(root + path.sep)).toBe(true);
    expect(dest).toBe(path.join(root, "player-photos", PLAYER, FILE));

    expect(parseUuid("../etc/passwd")).toBeNull();
    expect(parseUuid("..")).toBeNull();
    expect(parseUuid(`${PLAYER}/../../etc`)).toBeNull();
    expect(() => playerPhotoDestination(root, "../..", FILE)).toThrow(UploadRejected);
    expect(() => playerPhotoDestination(root, PLAYER, "../../etc/passwd.jpg")).toThrow(
      UploadRejected,
    );
    expect(() =>
      playerPhotoDestination(root, PLAYER, `${PLAYER}.svg`),
    ).toThrow(UploadRejected);
  });

  it("recusa segmento de logo fora da pasta system", () => {
    const root = "/tmp/sfl-uploads";
    const ok = systemAssetDestination(root, ["system", "sponsors"], "sponsor-logo.webp");
    expect(ok).toContain(`${path.sep}system${path.sep}sponsors${path.sep}`);
    expect(() => systemAssetDestination(root, ["..", "system"], "logo.png")).toThrow(
      UploadRejected,
    );
    expect(() => systemAssetDestination(root, ["system"], "../logo.png")).toThrow(
      UploadRejected,
    );
  });

  it("serve HTML e SVG como anexo, e imagem como inline", () => {
    expect(safeUploadHeaders("/var/data/evil.html")["Content-Disposition"]).toBe(
      "attachment",
    );
    expect(safeUploadHeaders("/var/data/evil.svg")["Content-Type"]).toBe(
      "application/octet-stream",
    );
    expect(safeUploadHeaders("/var/data/evil.html")["X-Content-Type-Options"]).toBe(
      "nosniff",
    );
    const photo = safeUploadHeaders(`/var/data/${FILE}`);
    expect(photo["Content-Type"]).toBe("image/jpeg");
    expect(photo["Content-Disposition"]).toBe("inline");
  });

  it("só admin ou o próprio jogador envia a foto", () => {
    expect(
      canUploadPlayerPhoto({
        isLeagueAdmin: false,
        playerUserId: "user-1",
        actorUserId: "user-2",
      }),
    ).toBe(false);
    expect(
      canUploadPlayerPhoto({
        isLeagueAdmin: false,
        playerUserId: "user-1",
        actorUserId: "user-1",
      }),
    ).toBe(true);
    expect(
      canUploadPlayerPhoto({
        isLeagueAdmin: true,
        playerUserId: "user-1",
        actorUserId: "admin",
      }),
    ).toBe(true);
    expect(
      canUploadPlayerPhoto({
        isLeagueAdmin: false,
        playerUserId: null,
        actorUserId: "user-1",
      }),
    ).toBe(false);
  });
});
