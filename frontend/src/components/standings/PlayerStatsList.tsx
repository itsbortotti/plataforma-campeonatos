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
            className="flex items-center justify-between rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground/50 w-5 text-right">
                {idx + 1}.
              </span>
              <div
                className="h-5 w-1 rounded-full"
                style={{ backgroundColor: stat.team.primaryColor }}
              />
              <div>
                <span className="font-semibold text-sm">
                  {stat.player.nickname}
                </span>
                <span className="text-xs text-muted-foreground ml-1.5">
                  {stat.player.name}
                </span>
              </div>
            </div>
            <span className="font-black text-lg tabular-nums">
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
