"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/partidas", label: "Partidas" },
  { href: "/admin/jogadores", label: "Elenco" },
  { href: "/admin/cartoes", label: "Cartões" },
  { href: "/admin/mensalidades", label: "Mensalidades" },
];

/** Abas do workspace da temporada em foco (padrão PlayHQ / MyCup). */
export function SeasonWorkspaceNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const season = searchParams.get("season");
  const qs = season ? `?season=${season}` : "";

  // Só nas telas de operação da temporada — não em campeonatos/sistema/detalhe de partida
  const show =
    pathname === "/admin" ||
    pathname === "/admin/partidas" ||
    pathname === "/admin/jogadores" ||
    pathname === "/admin/cartoes" ||
    pathname === "/admin/mensalidades";

  if (!show) return null;

  return (
    <nav
      aria-label="Workspace da temporada"
      className="flex gap-1 overflow-x-auto border-b border-border/40 -mb-px"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${qs}`}
            className={cn(
              "shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
