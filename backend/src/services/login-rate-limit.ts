const SFL_LOGIN_SUFFIX = "@sfl.local";

/**
 * Chave do limite de login: IP e usuário juntos, para não travar o campo inteiro.
 * "master" e "master@sfl.local" são a mesma conta — o login tenta as duas formas.
 */
export function loginRateLimitKey(ip: string, email: unknown): string {
  let login = typeof email === "string" ? email.trim().toLowerCase() : "";
  while (login.endsWith(SFL_LOGIN_SUFFIX)) {
    login = login.slice(0, -SFL_LOGIN_SUFFIX.length);
  }
  return `${ip}\n${login}`;
}
