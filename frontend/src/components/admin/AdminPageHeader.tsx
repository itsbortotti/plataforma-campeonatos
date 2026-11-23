import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

/** Título + frase curta + ações — chrome padrão das telas Master. */
export function AdminPageHeader({
  title,
  description,
  actions,
  children,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
