export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isAccessError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    return (
      m.includes("acesso") ||
      m.includes("permissão") ||
      m.includes("permissao") ||
      m.includes("não autenticado") ||
      m.includes("nao autenticado") ||
      m.includes("403") ||
      m.includes("401")
    );
  }
  return false;
}

export function friendlyApiMessage(status: number, fallback?: string): string {
  if (status === 401) {
    return "Sua sessão expirou ou você não está autenticado. Entre de novo.";
  }
  if (status === 403) {
    return (
      fallback ||
      "Você não tem acesso a esta área. Peça liberação ao Master."
    );
  }
  if (status === 404) {
    return fallback || "Recurso não encontrado.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "Serviço temporariamente indisponível. Tente de novo em instantes.";
  }
  if (status >= 500) {
    return fallback || "Erro interno. Tente de novo.";
  }
  return fallback || `Não foi possível concluir a ação (${status}).`;
}
