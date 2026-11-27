import { describe, expect, it } from "vitest";
import type { Player } from "@prisma/client";
import { mapPlayer, mapPlayerAdmin } from "./mappers.js";

function player(email: string): Player {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Fulano da Silva",
    nickname: "Fu",
    position: "ATA",
    photoUrl: null,
    email,
    isActive: true,
    userId: "22222222-2222-4222-8222-222222222222",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("mapPlayer público", () => {
  it("não devolve e-mail nem userId na lista pública", () => {
    const email = "jogador@example.com";
    const pub = mapPlayer(player(email));
    const json = JSON.stringify(pub);

    expect(pub).not.toHaveProperty("email");
    expect(pub).not.toHaveProperty("userId");
    expect(json).not.toContain(email);
    expect(json).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(pub).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      nickname: "Fu",
      isActive: true,
    });
  });

  it("mantém o e-mail só no mapper do admin", () => {
    const email = "jogador@example.com";
    const admin = mapPlayerAdmin(player(email));
    expect(admin.email).toBe(email);
    expect(admin.userId).toBe("22222222-2222-4222-8222-222222222222");
  });
});
