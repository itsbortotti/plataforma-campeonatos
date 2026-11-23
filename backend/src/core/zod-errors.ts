import { ZodError, type ZodIssue } from "zod";

const FIELD_LABELS: Record<string, string> = {
  email: "e-mail",
  password: "senha",
  displayName: "nome",
  role: "perfil",
  teamId: "time",
  competitionId: "campeonato",
  userId: "usuário",
};

function fieldLabel(path: (string | number)[]): string {
  const key = String(path[0] ?? "");
  return FIELD_LABELS[key] ?? (key || "campo");
}

function issueMessage(issue: ZodIssue): string {
  const label = fieldLabel(issue.path);
  if (issue.code === "invalid_type" && issue.received === "undefined") {
    return `Preencha o ${label}.`;
  }
  if (issue.code === "too_small") {
    if (issue.type === "string") {
      if (issue.path[0] === "password") {
        return `A senha precisa ter pelo menos ${issue.minimum} caracteres.`;
      }
      return `O ${label} está curto demais.`;
    }
  }
  if (issue.code === "invalid_string" && issue.validation === "email") {
    return "Digite um e-mail válido, com @ (ex: nome@dominio.com).";
  }
  if (issue.code === "invalid_enum_value") {
    return `Escolha um ${label} válido.`;
  }
  if (issue.message && issue.message !== "Required") {
    if (issue.path[0] === "email") {
      return "Digite um e-mail válido, com @ (ex: nome@dominio.com).";
    }
    if (issue.path[0] === "password") {
      return `A senha precisa ter pelo menos 6 caracteres.`;
    }
  }
  return `Verifique o ${label}.`;
}

export function formatZodError(err: ZodError): string {
  const parts = err.issues.map(issueMessage);
  return [...new Set(parts)].join(" ");
}

export function isZodError(err: unknown): err is ZodError {
  return err instanceof ZodError || (Boolean(err) && typeof err === "object" && "issues" in (err as object));
}
