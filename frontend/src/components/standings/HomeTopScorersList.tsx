"use client";

import Link from "next/link";
import { useLivePlayerStats } from "@/lib/useLivePlayerStats";
import type { PlayerStatEntry } from "@/lib/queries";

interface Props {
  seasonId: string;
  initialStats: PlayerStatEntry[];
  limit?: number;
}

export function HomeTopScorersList({
  seasonId,
  initialStats,
  limit = 5,
}: Props) {
  const stats = useLivePlayerStats(seasonId, "goals", initialStats, limit);

  return (
    <div className="space-y-1">
      {stats.map((stat, idx) => {
        if (!stat.player || !stat.team) return null;
        const isFirst = idx === 0;
        return (
          <Link
            key={stat.playerId}
            href={`/jogador/${stat.playerId}`}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
              isFirst
                ? "bg-[var(--color-gold)]/5 border border-[var(--color-gold)]/15"
                : "hover:bg-card transition-colors"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-black w-4 text-right tabular-nums ${isFirst ? "text-[var(--color-gold)]" : "text-muted-foreground/40"}`}
              >
                {idx + 1}
              </span>
              <div
                className="w-0.5 h-5 rounded-full"
                style={{ backgroundColor: stat.team.primaryColor }}
              />
              <div>
                <span className="font-bold text-sm">
                  {stat.player.nickname}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  {stat.team.shortName}
                </span>
              </div>
            </div>
            <span
              className={`font-black tabular-nums ${isFirst ? "text-lg text-[var(--color-gold)]" : "text-sm"}`}
            >
              {stat.goals}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
