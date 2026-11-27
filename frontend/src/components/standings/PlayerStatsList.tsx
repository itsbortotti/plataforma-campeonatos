"use client";

import Link from "next/link";
import { useLivePlayerStats } from "@/lib/useLivePlayerStats";
import type { PlayerStatEntry } from "@/lib/queries";
import { ShareStatsButton } from "./ShareStatsImage";

type StatType = "goals" | "assists";

interface Props {
  seasonId: string;
  type: StatType;
  initialStats: PlayerStatEntry[];
  limit?: number;
  seasonLabel?: string;
}

export function PlayerStatsList({
  seasonId,
  type,
  initialStats,
  limit = 100,
  seasonLabel,
}: Props) {
  const stats = useLivePlayerStats(seasonId, type, initialStats, limit);

  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
        {type === "goals"
          ? "Nenhum gol marcado ainda. Aguarde as primeiras partidas!"
          : "Nenhuma assistência registrada ainda. Aguarde as primeiras partidas!"}
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      {stats.map((stat, idx) => {
        if (!stat.player || !stat.team) return null;
        return (
          <Link
            key={stat.playerId}
            href={`/jogador/${stat.playerId}`}
            className="flex items-center gap-2 rounded-xl px-2 sm:px-3 py-2.5 hover:bg-accent/30 transition-colors"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground/50">
                {idx + 1}.
              </span>
              <div
                className="h-5 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: stat.team.primaryColor }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {stat.player.nickname}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {stat.player.name}
                </p>
              </div>
            </div>
            <span className="shrink-0 font-black text-lg tabular-nums">
              {type === "goals" ? stat.goals : stat.assists}
            </span>
          </Link>
        );
      })}
      {seasonLabel && stats.length > 0 && (
        <div className="flex justify-center pt-4">
          <ShareStatsButton
            type={type}
            stats={stats}
            seasonLabel={seasonLabel}
          />
        </div>
      )}
    </div>
  );
}
