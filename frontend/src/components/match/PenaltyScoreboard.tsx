"use client";

import { Trophy } from "lucide-react";
import { TeamBadge } from "@/components/TeamBadge";
import { resolveShootoutWinner, REGULATION_KICKS } from "@/lib/shootout";
import { useShootoutKicks } from "@/lib/useShootoutKicks";
import type { PenaltyKick, StandingsEntry } from "@/lib/queries";

type BadgeSize = "sm" | "md" | "lg" | "xl" | "2xl";
type Variant = "full" | "compact";

interface Props {
  matchId: string;
  tiedTeams: StandingsEntry[];
  initialShootout: PenaltyKick[];
  championTeamId?: string | null;
  teamBadgeSize?: BadgeSize;
  variant?: Variant;
}

export function PenaltyScoreboard({
  matchId,
  tiedTeams,
  initialShootout,
  championTeamId = null,
  teamBadgeSize = "xl",
  variant = "full",
}: Props) {
  const shootout = useShootoutKicks(matchId, initialShootout);

  if (!tiedTeams || tiedTeams.length < 2) return null;

  const [teamA, teamB] = tiedTeams;
  const kicksA = shootout.filter((k) => k.teamId === teamA.teamId);
  const kicksB = shootout.filter((k) => k.teamId === teamB.teamId);
  const scoreA = kicksA.filter((k) => k.scored).length;
  const scoreB = kicksB.filter((k) => k.scored).length;

  // Resolve winner client-side from the current kicks so the UI updates
  // immediately after the decisive kick, without waiting for the server to
  // persist the champion back.
  const resolved = resolveShootoutWinner(shootout, [
    teamA.teamId,
    teamB.teamId,
  ]);
  const effectiveChampionId = championTeamId ?? resolved.winnerId;
  const isDecided = effectiveChampionId != null;

  // Number of slots per team:
  // - regulation: always 5
  // - sudden death (undecided + at least one team past 5):
  //     - both teams equal → show 1 extra placeholder per side for the next
  //       alternating round
  //     - teams uneven (one has kicked in the current round, other hasn't) →
  //       match the longer side so the shorter one shows a placeholder
  // - shootout decided: no trailing placeholders beyond what was played
  const maxAttempts = Math.max(kicksA.length, kicksB.length);
  const inSuddenDeath = maxAttempts >= REGULATION_KICKS;
  const totalSlots = isDecided
    ? Math.max(REGULATION_KICKS, maxAttempts)
    : inSuddenDeath
      ? kicksA.length === kicksB.length
        ? maxAttempts + 1
        : maxAttempts
      : REGULATION_KICKS;

  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
          {isDecided ? (
            <>
              <Trophy className="h-3 w-3" />
              Pênaltis
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              Pênaltis ao vivo
            </>
          )}
        </span>
        <div className="flex items-center gap-3">
          <KickDots kicks={kicksA} totalSlots={totalSlots} dotSize="h-1.5 w-1.5" />
          <span
            className={`text-lg font-black tabular-nums ${effectiveChampionId === teamA.teamId ? "text-[var(--color-gold)]" : ""}`}
          >
            {scoreA}
          </span>
          <span className="text-muted-foreground/30 font-black text-xs">-</span>
          <span
            className={`text-lg font-black tabular-nums ${effectiveChampionId === teamB.teamId ? "text-[var(--color-gold)]" : ""}`}
          >
            {scoreB}
          </span>
          <KickDots kicks={kicksB} totalSlots={totalSlots} dotSize="h-1.5 w-1.5" reverse />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
        {isDecided ? (
          <>
            <Trophy className="h-3 w-3" />
            Pênaltis
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Pênaltis ao vivo
          </>
        )}
      </span>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Team A */}
        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            name={teamA.team.name}
            shortName={teamA.team.shortName}
            primaryColor={teamA.team.primaryColor}
            logoUrl={teamA.team.logoUrl}
            size={teamBadgeSize}
          />
          <KickDots kicks={kicksA} totalSlots={totalSlots} dotSize="h-2.5 w-2.5" />
        </div>

        {/* Score */}
        <div className="flex items-center gap-2">
          <span
            className={`text-4xl sm:text-5xl font-black tabular-nums ${effectiveChampionId === teamA.teamId ? "text-[var(--color-gold)]" : ""}`}
          >
            {scoreA}
          </span>
          <span className="text-muted-foreground/30 font-black text-lg">-</span>
          <span
            className={`text-4xl sm:text-5xl font-black tabular-nums ${effectiveChampionId === teamB.teamId ? "text-[var(--color-gold)]" : ""}`}
          >
            {scoreB}
          </span>
        </div>

        {/* Team B */}
        <div className="flex flex-col items-center gap-2">
          <TeamBadge
            name={teamB.team.name}
            shortName={teamB.team.shortName}
            primaryColor={teamB.team.primaryColor}
            logoUrl={teamB.team.logoUrl}
            size={teamBadgeSize}
          />
          <KickDots kicks={kicksB} totalSlots={totalSlots} dotSize="h-2.5 w-2.5" reverse />
        </div>
      </div>
    </div>
  );
}

function KickDots({
  kicks,
  totalSlots,
  dotSize,
  reverse = false,
}: {
  kicks: PenaltyKick[];
  totalSlots: number;
  dotSize: string;
  reverse?: boolean;
}) {
  const sorted = [...kicks].sort((a, b) => a.shootOrder - b.shootOrder);
  const placeholdersNeeded = Math.max(0, totalSlots - sorted.length);

  const kickDots = sorted.map((k) => (
    <span
      key={k.id}
      title={`${k.shootOrder}. ${k.player?.nickname ?? "?"} - ${k.scored ? "Gol" : "Errou"}`}
      className={`${dotSize} rounded-full ${k.scored ? "bg-emerald-500" : "bg-red-500"} shrink-0`}
    />
  ));

  const placeholders = Array.from({ length: placeholdersNeeded }).map(
    (_, i) => (
      <span
        key={`placeholder-${i}`}
        className={`${dotSize} rounded-full border border-muted-foreground/30 shrink-0`}
      />
    ),
  );

  // Dots grow from the score outward toward the badge, with P1 anchored at
  // the score side and P5 furthest out.
  // Home (score on the right, no reverse): L→R is P5 P4 … P1, with
  // placeholders padding the badge side. Latest kick goes outward.
  // Away (score on the left, reverse): L→R is P1 P2 … P5, same rule mirrored.
  const displayed = reverse
    ? [...kickDots, ...placeholders]
    : [...placeholders, ...kickDots.slice().reverse()];

  if (displayed.length === 0) {
    return (
      <div className="h-2.5 flex items-center">
        <span className="text-[10px] text-muted-foreground/40">-</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {displayed}
    </div>
  );
}
