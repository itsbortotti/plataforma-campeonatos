import { describe, expect, it } from "vitest";
import {
  adminCreateData,
  adminLookupEmails,
  adminPasswordResetData,
  decideAdminSeed,
  seedAdminResetPasswordEnabled,
  seedPasswordError,
} from "./seed-admin-policy.ts";

describe("seed do admin", () => {
  it("só cria quando o admin não existe", () => {
    expect(decideAdminSeed({ adminExists: false, resetPassword: false })).toBe(
      "create",
    );
    expect(decideAdminSeed({ adminExists: false, resetPassword: true })).toBe(
      "create",
    );
  });

  it("não regrava senha, e-mail nem papel de um admin existente", () => {
    expect(decideAdminSeed({ adminExists: true, resetPassword: false })).toBe(
      "skip",
    );
    const created = adminCreateData("master@sfl.local", "hash");
    expect(created).toEqual({
      email: "master@sfl.local",
      passwordHash: "hash",
      role: "admin",
      displayName: "Master SFL",
    });
  });

  it("regrava só o hash quando SEED_ADMIN_RESET_PASSWORD=true", () => {
    expect(seedAdminResetPasswordEnabled("true")).toBe(true);
    expect(seedAdminResetPasswordEnabled("false")).toBe(false);
    expect(seedAdminResetPasswordEnabled("TRUE")).toBe(false);
    expect(seedAdminResetPasswordEnabled("1")).toBe(false);
    expect(seedAdminResetPasswordEnabled(undefined)).toBe(false);

    expect(decideAdminSeed({ adminExists: true, resetPassword: true })).toBe(
      "reset-password",
    );
    expect(adminPasswordResetData("hash")).toEqual({ passwordHash: "hash" });
  });

  it("procura o e-mail canônico antes dos legados", () => {
    expect(adminLookupEmails("master@sfl.local", "master")).toEqual([
      "master@sfl.local",
      "admin@sfl.local",
      "master",
    ]);
  });

  it("devolve o erro da senha sem lançar e sem ecoar o valor", () => {
    const secret = "curta1";
    const message = seedPasswordError(secret, "master");
    expect(message).toMatch(/fraca/);
    expect(message).not.toContain(secret);
    expect(seedPasswordError("liga-forte-2027", "master")).toBeNull();
  });
});
