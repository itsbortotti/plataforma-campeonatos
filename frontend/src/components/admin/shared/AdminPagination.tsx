"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  className?: string;
};

export function AdminPagination({
  page,
  pageCount,
  total,
  pageSize,
  className,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    if (!params.get("pageSize")) params.set("pageSize", String(pageSize));
    return `${pathname}?${params.toString()}`;
  }

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 pt-2",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1.5">
        {canPrev ? (
          <Link
            href={hrefFor(page - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 pointer-events-none opacity-50",
            )}
            aria-disabled
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </span>
        )}
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {page} / {pageCount}
        </span>
        {canNext ? (
          <Link
            href={hrefFor(page + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1 pointer-events-none opacity-50",
            )}
            aria-disabled
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
