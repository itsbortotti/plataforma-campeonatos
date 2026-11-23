import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  crumbs: Crumb[];
  /** Ex.: "3 temporadas · 42 partidas" */
  summary?: string;
};

/**
 * Trilha curta: Campeonato › Temporada › Partidas.
 * Deixa a hierarquia visível em cada tela do admin.
 */
export function AdminHierarchyHint({ crumbs, summary }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <nav
        aria-label="Hierarquia"
        className="flex flex-wrap items-center gap-1 text-muted-foreground"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
            ) : null}
            {c.href ? (
              <Link
                href={c.href}
                className="font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {summary ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {summary}
        </span>
      ) : null}
    </div>
  );
}
