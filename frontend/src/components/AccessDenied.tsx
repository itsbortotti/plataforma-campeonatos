"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  onRetry?: () => void;
};

export function AccessDenied({
  title = "Sem acesso",
  description,
  primaryHref = "/admin",
  primaryLabel = "Voltar ao painel",
  onRetry,
}: Props) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-border/50 bg-card/40 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <ShieldOff className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-wide text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar de novo
          </Button>
        ) : null}
        <Link
          href={primaryHref}
          className={cn(buttonVariants({ variant: "default" }))}
        >
          {primaryLabel}
        </Link>
      </div>
    </div>
  );
}
