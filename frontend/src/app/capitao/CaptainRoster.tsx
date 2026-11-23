"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Position } from "@/types";

const positionColor: Record<Position, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

const positionOrder: readonly Position[] = [
  "GOL",
  "ZAG",
  "LAT",
  "VOL",
  "MEI",
  "ATA",
];

function ratingColor(rating: number): string {
  if (rating >= 8.0)
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (rating >= 7.0) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (rating >= 6.0) return "bg-muted text-foreground border-border/40";
  if (rating >= 5.0) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

export interface CaptainRosterEntry {
  id: string;
  name: string;
  nickname: string;
  position: string;
  number: number;
  isCaptain: boolean;
  goals: number;
  assists: number;
  averageRating: number | null;
}

type SortKey =
  | "position"
  | "number"
  | "nickname"
  | "goals"
  | "assists"
  | "rating";

type SortDir = "asc" | "desc";

const sortOptions: { value: SortKey; label: string; defaultDir: SortDir }[] = [
  { value: "position", label: "Posição", defaultDir: "asc" },
  { value: "number", label: "Número", defaultDir: "asc" },
  { value: "nickname", label: "Nome", defaultDir: "asc" },
  { value: "goals", label: "Gols", defaultDir: "desc" },
  { value: "assists", label: "Assistências", defaultDir: "desc" },
  { value: "rating", label: "Nota média", defaultDir: "desc" },
];

interface Props {
  players: CaptainRosterEntry[];
  teamColor: string;
}

export function CaptainRoster({ players, teamColor }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function setSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      const def = sortOptions.find((s) => s.value === key)?.defaultDir ?? "asc";
      setSortDir(def);
    }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = [...players];
    const cmp = (a: CaptainRosterEntry, b: CaptainRosterEntry): number => {
      switch (sortKey) {
        case "position": {
          const ap = positionOrder.indexOf(a.position as Position);
          const bp = positionOrder.indexOf(b.position as Position);
          if (ap !== bp) return ap - bp;
          return a.number - b.number;
        }
        case "number":
          return a.number - b.number;
        case "nickname":
          return a.nickname.localeCompare(b.nickname, "pt-BR");
        case "goals":
          return a.goals - b.goals;
        case "assists":
          return a.assists - b.assists;
        case "rating": {
          const ar = a.averageRating ?? -Infinity;
          const br = b.averageRating ?? -Infinity;
          return ar - br;
        }
      }
    };
    return list.sort((a, b) => cmp(a, b) * dir);
  }, [players, sortKey, sortDir]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Ordenar por
          </span>
          <Select
            value={sortKey}
            onValueChange={(v) => setSort(v as SortKey)}
          >
            <SelectTrigger size="sm" className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="h-8 px-2"
            title={sortDir === "asc" ? "Crescente" : "Decrescente"}
          >
            {sortDir === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {sorted.length}{" "}
          {sorted.length === 1 ? "jogador" : "jogadores"}
        </span>
      </div>

      <div className="rounded-lg border border-border/40 divide-y divide-border/40 overflow-hidden">
        {sorted.map((player) => (
          <Link
            key={player.id}
            href={`/jogador/${player.id}`}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white tabular-nums shrink-0"
              style={{
                background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}BB 100%)`,
              }}
            >
              {player.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight truncate flex items-center gap-1.5">
                {player.nickname}
                {player.isCaptain && (
                  <Badge className="text-[9px] bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 px-1.5 py-0">
                    C
                  </Badge>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground/60 truncate">
                {player.name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {player.averageRating != null && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-black tabular-nums ${ratingColor(player.averageRating)}`}
                  title="Nota média"
                >
                  {player.averageRating.toFixed(1).replace(".", ",")}
                </Badge>
              )}
              {player.goals > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  title="Gols"
                >
                  {player.goals}G
                </Badge>
              )}
              {player.assists > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  title="Assistências"
                >
                  {player.assists}A
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] border ${positionColor[player.position as Position] ?? ""}`}
              >
                {player.position}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { ArrowUpDown };
