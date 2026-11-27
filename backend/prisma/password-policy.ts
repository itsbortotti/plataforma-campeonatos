/**
 * Política da senha do usuário Master.
 * O valor vem só do ambiente (SEED_ADMIN_PASSWORD). Nunca grave a senha aqui.
 */

const MIN_LENGTH = 12;

/** Senhas óbvias. Não inclui nenhum segredo que já tenha aparecido no Git. */
const WEAK = new Set([
  "password",
  "password1",
  "senha",
  "senha123",
  "admin",
  "admin123",
  "master",
  "master123",
  "123456",
  "12345678",
  "123456789",
  "qwerty",
  "qwerty123",
  "changeme",
  "change-me",
  "change-me1",
  "alterar",
  "sfl",
  "sfl123",
  "sflcampeonato",
]);

export function assertSeedAdminPassword(
  password: string,
  username?: string,
): void {
  const value = password.trim();
  if (!value) {
    throw new Error(
      "SEED_ADMIN_PASSWORD ausente. Defina uma senha nova só no ambiente (Render ou .env local), nunca no repositório.",
    );
  }
  if (value !== password) {
    throw new Error(
      "SEED_ADMIN_PASSWORD não pode começar ou terminar com espaço.",
    );
  }
  if (value.length < MIN_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD fraca: use pelo menos ${MIN_LENGTH} caracteres, com letras e números.`,
    );
  }
  const lower = value.toLowerCase();
  const user = username?.trim().toLowerCase() ?? "";
  if (WEAK.has(lower) || (user && lower === user)) {
    throw new Error(
      "SEED_ADMIN_PASSWORD fraca ou igual ao usuário. Escolha outra senha só no ambiente.",
    );
  }
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    throw new Error(
      "SEED_ADMIN_PASSWORD fraca: misture letras e números. Não grave o valor no repositório.",
    );
  }
}
