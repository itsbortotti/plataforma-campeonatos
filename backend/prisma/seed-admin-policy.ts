/**
 * Decisão do seed do Master, sem banco e sem gravar senha.
 * O valor da senha vem só do ambiente. Nunca registre o valor.
 */
import { assertSeedAdminPassword } from "./password-policy.ts";

export type AdminSeedDecision = "create" | "reset-password" | "skip";

/** Só o literal "true" regrava a senha de um admin que já existe. */
export function seedAdminResetPasswordEnabled(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Admin ausente: criar.
 * Admin presente: não mexer, a menos que SEED_ADMIN_RESET_PASSWORD=true.
 */
export function decideAdminSeed(opts: {
  adminExists: boolean;
  resetPassword: boolean;
}): AdminSeedDecision {
  if (!opts.adminExists) return "create";
  if (opts.resetPassword) return "reset-password";
  return "skip";
}

/** E-mail canônico primeiro, depois contas antigas, sem duplicar. */
export function adminLookupEmails(login: string, loginRaw: string): string[] {
  return [...new Set([login, "admin@sfl.local", loginRaw, "master"])];
}

export function adminCreateData(email: string, passwordHash: string) {
  return {
    email,
    passwordHash,
    role: "admin" as const,
    displayName: "Master SFL",
  };
}

/** Regrava só o hash. E-mail e papel ficam como estão. */
export function adminPasswordResetData(passwordHash: string) {
  return { passwordHash };
}

/**
 * Mensagem da política, ou null se a senha serve para criar/regravar.
 * Não lança: senha inválida não pode derrubar o start.
 */
export function seedPasswordError(
  password: string,
  username?: string,
): string | null {
  try {
    assertSeedAdminPassword(password, username);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
