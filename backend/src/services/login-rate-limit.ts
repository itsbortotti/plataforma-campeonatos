/** Chave do limite de login: IP e usuário juntos, para não travar o campo inteiro. */
export function loginRateLimitKey(ip: string, email: unknown): string {
  const login = typeof email === "string" ? email.trim().toLowerCase() : "";
  return `${ip}\n${login}`;
}
