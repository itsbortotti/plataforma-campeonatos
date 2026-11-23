"use client";

import { AccessDenied } from "@/components/AccessDenied";
import { isAccessError } from "@/lib/api-error";

export default function AdminError({
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
          "Você não tem permissão para abrir esta tela. Peça liberação ao Master."
        }
        primaryHref="/admin"
        primaryLabel="Voltar ao painel"
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
      primaryHref="/admin"
      primaryLabel="Voltar ao painel"
      onRetry={reset}
    />
  );
}
