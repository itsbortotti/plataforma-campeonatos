"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Trophy } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { buttonVariants } from "@/components/ui/button";
import type { Season } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  seasons: Season[];
  currentSeasonId: string;
};

type CompGroup = {
  id: string;
  name: string;
  seasons: Season[];
};

/** Páginas filtradas por ?season= — alinhado ao SeasonWorkspaceNav. */
function usesSeasonScope(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname === "/admin/partidas" ||
    pathname === "/admin/jogadores" ||
    pathname === "/admin/cartoes"
  );
}

export function AdminScopeSwitcher({ seasons, currentSeasonId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("season") ?? currentSeasonId;
  const selected = seasons.find((s) => s.id === selectedId) ?? null;
  const inScope = usesSeasonScope(pathname);

  const groups = useMemo(() => {
    const map = new Map<string, CompGroup>();
    for (const s of seasons) {
      const id = s.competitionId ?? "none";
      const name = s.competitionName ?? "Sem campeonato";
      const g = map.get(id) ?? { id, name, seasons: [] };
      g.seasons.push(s);
      map.set(id, g);
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      seasons: [...g.seasons].sort(
        (a, b) => b.year - a.year || a.name.localeCompare(b.name),
      ),
    }));
  }, [seasons]);

  const [open, setOpen] = useState(false);
  const [pickCompId, setPickCompId] = useState<string | null>(
    selected?.competitionId ?? groups[0]?.id ?? null,
  );

  const activeGroup =
    groups.find((g) => g.id === (pickCompId ?? selected?.competitionId)) ??
    groups[0] ??
    null;

  function goToSeason(seasonId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (seasonId === currentSeasonId) params.delete("season");
    else params.set("season", seasonId);
    const qs = params.toString();
    const base =
      pathname.startsWith("/admin/partidas/") ||
      pathname.startsWith("/admin/campeonatos/")
        ? "/admin"
        : pathname;
    router.push(qs ? `${base}?${qs}` : base);
    setOpen(false);
  }

  if (!inScope) return null;

  if (seasons.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
        Nenhuma temporada — crie um campeonato primeiro.
      </div>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setPickCompId(selected?.competitionId ?? groups[0]?.id ?? null);
        }
      }}
    >
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className={cn(
              "flex min-w-0 max-w-full items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2 text-left transition-colors hover:bg-accent/40",
              open && "ring-1 ring-primary/30",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Escopo atual
              </span>
              <span className="block truncate text-sm font-semibold leading-tight">
                {selected?.competitionName ?? "Campeonato"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {selected
                  ? `${selected.name}${selected.isCurrent ? " · atual" : ""}`
                  : "Selecione a temporada"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        )}
      />
      <PopoverContent
        align="start"
        className="w-[min(100vw-2rem,420px)] p-0 overflow-hidden"
      >
        <div className="border-b border-border/40 px-3 py-2">
          <p className="text-xs font-semibold">Trocar campeonato e temporada</p>
          <p className="text-[11px] text-muted-foreground">
            Tudo que você editar abaixo vale só para este escopo.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border/40 max-h-[320px]">
          <div className="overflow-y-auto p-2 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Campeonato
            </p>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setPickCompId(g.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors",
                  activeGroup?.id === g.id
                    ? "bg-primary/10 font-medium"
                    : "hover:bg-accent/50",
                )}
              >
                <span className="truncate">{g.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {g.seasons.length}
                </span>
              </button>
            ))}
          </div>
          <div className="overflow-y-auto p-2 space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Temporada
            </p>
            {(activeGroup?.seasons ?? []).map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSeason(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary/15 font-medium"
                      : "hover:bg-accent/50",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {s.name}
                    {s.isCurrent ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        atual
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              );
            })}
            {(activeGroup?.seasons.length ?? 0) === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Sem temporadas neste campeonato.
              </p>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border/40 px-3 py-2 flex justify-end">
          <Link
            href="/admin/campeonatos"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Gerenciar campeonatos
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
