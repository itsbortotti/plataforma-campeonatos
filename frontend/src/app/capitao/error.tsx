"use client";

import { AccessDenied } from "@/components/AccessDenied";
import { isAccessError } from "@/lib/api-error";

export default function CapitaoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (isAccessError(error)) {
    return (
      <AccessDenied
        title="Sem acesso"
        description={
          error.message ||
          "Você não tem permissão para esta área do time."
        }
        primaryHref="/capitao"
        primaryLabel="Voltar ao painel do time"
        onRetry={reset}
      />
    );
  }

  return (
    <AccessDenied
      title="Algo deu errado"
      description={
        error.message ||
        "Não foi possível carregar esta tela. Tente de novo em instantes."
      }
      primaryHref="/capitao"
      primaryLabel="Voltar ao painel do time"
      onRetry={reset}
    />
  );
}
