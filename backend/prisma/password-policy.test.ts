import { describe, expect, it } from "vitest";
import { assertSeedAdminPassword } from "./password-policy.ts";

describe("SEED_ADMIN_PASSWORD", () => {
  it("recusa senha vazia, curta ou óbvia", () => {
    expect(() => assertSeedAdminPassword("")).toThrow(/ausente/);
    expect(() => assertSeedAdminPassword("   ")).toThrow(/ausente/);
    expect(() => assertSeedAdminPassword("curta1")).toThrow(/fraca/);
    expect(() => assertSeedAdminPassword("somenteletras")).toThrow(/fraca/);
    expect(() => assertSeedAdminPassword("123456789012")).toThrow(/fraca/);
    expect(() => assertSeedAdminPassword("change-me")).toThrow(/fraca/);
    expect(() => assertSeedAdminPassword("master123456", "master")).not.toThrow();
    expect(() => assertSeedAdminPassword("master", "master")).toThrow(/fraca/);
  });

  it("aceita senha forte sem devolver o valor no erro", () => {
    expect(() => assertSeedAdminPassword("liga-forte-2027", "master")).not.toThrow();
  });
});
