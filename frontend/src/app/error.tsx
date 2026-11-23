"use client";

import { AccessDenied } from "@/components/AccessDenied";
import { isAccessError } from "@/lib/api-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (isAccessError(error)) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center px-4 py-10">
        <AccessDenied
          title="Sem acesso"
          description={
            error.message ||
            "Você não tem permissão para abrir esta página."
          }
          primaryHref="/"
          primaryLabel="Ir para o início"
          onRetry={reset}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center px-4 py-10">
      <AccessDenied
        title="Algo deu errado"
        description={
          error.message ||
          "Não foi possível carregar a página. Tente de novo."
        }
        primaryHref="/"
        primaryLabel="Ir para o início"
        onRetry={reset}
      />
    </main>
  );
}
