"use client";

import { TeamBadge } from "@/components/TeamBadge";
import { useLiveStandings } from "@/lib/useLiveStandings";
import type { StandingsEntry } from "@/lib/queries";

interface Props {
  seasonId: string;
  initialStandings: StandingsEntry[];
}

export function HomeStandingsList({ seasonId, initialStandings }: Props) {
  const standings = useLiveStandings(seasonId, initialStandings);

  return (
    <div className="space-y-2">
      {standings.map((row, idx) => {
        const team = row.team;
        const isLeader = idx === 0;
        return (
          <div
            key={row.teamId}
            className="flex items-center justify-between gap-2 rounded-lg bg-card border border-border/40 px-3 py-3 sm:px-4 sm:py-3.5 transition-colors"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span
                className={`text-sm font-black w-5 shrink-0 text-center ${isLeader ? "text-foreground" : "text-muted-foreground"}`}
              >
                {idx + 1}
              </span>
              <TeamBadge
                name={team.name}
                shortName={team.shortName}
                primaryColor={team.primaryColor}
                logoUrl={team.logoUrl}
              />
              <span className="truncate font-bold text-sm">
                <span className="sm:hidden">{team.shortName}</span>
                <span className="hidden sm:inline">{team.name}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{row.won}V</span>
                <span>{row.drawn}E</span>
                <span>{row.lost}D</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {row.played}J
              </span>
              <span
                className={`font-black text-xl tabular-nums ${isLeader ? "text-foreground" : ""}`}
              >
                {row.points}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
