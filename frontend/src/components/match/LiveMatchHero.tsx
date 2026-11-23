"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import {
  useLiveMatch,
  useTimerTick,
  formatClock,
  halfLabel,
} from "@/lib/useLiveMatch";
import type { LiveMatch } from "@/lib/queries";

interface Props {
  liveMatch: LiveMatch;
}

export function LiveMatchHero({ liveMatch }: Props) {
  const { match, timer: initialTimer } = liveMatch;

  const { timer, status, homeScore, awayScore } = useLiveMatch({
    matchId: match.id,
    initialTimer,
    initialStatus: match.status as "live" | "halftime",
    initialHomeScore: match.homeScore ?? 0,
    initialAwayScore: match.awayScore ?? 0,
  });

  const elapsed = useTimerTick(timer);

  // If match finished while viewing, don't render — a full reload will pick up the finished state
  if (status !== "live" && status !== "halftime") return null;

  const home = match.homeTeam;
  const away = match.awayTeam;
  const isHalftime = status === "halftime";

  return (
    <Link
      href={`/partida/${match.id}`}
      className="block group"
      aria-label="Ver detalhes da partida ao vivo"
    >
      <div className="flex items-center justify-center gap-6 sm:gap-12 transition-opacity group-hover:opacity-95">
        <div className="flex flex-col items-center gap-3 flex-1">
          <TeamBadge
            name={home.name}
            shortName={home.shortName}
            primaryColor={home.primaryColor}
            logoUrl={home.logoUrl}
            size="2xl"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Ao vivo
          </span>
          <div className="flex items-center gap-3">
            <span className="text-4xl sm:text-5xl font-black tabular-nums">
              {homeScore}
            </span>
            <span className="text-2xl text-muted-foreground/30 font-black">
              -
            </span>
            <span className="text-4xl sm:text-5xl font-black tabular-nums">
              {awayScore}
            </span>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {isHalftime ? "INTERVALO" : formatClock(elapsed)}
          </span>
          <Badge variant="secondary" className="text-[10px] font-bold mt-1">
            {isHalftime
              ? "HT"
              : timer
                ? halfLabel[timer.currentHalf]
                : "1º Tempo"}{" "}
            &bull; Rodada {match.round}
          </Badge>
        </div>

        <div className="flex flex-col items-center gap-3 flex-1">
          <TeamBadge
            name={away.name}
            shortName={away.shortName}
            primaryColor={away.primaryColor}
            logoUrl={away.logoUrl}
            size="2xl"
          />
        </div>
      </div>
    </Link>
  );
}
