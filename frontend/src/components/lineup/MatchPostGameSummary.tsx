"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { FieldView, type FieldPlayerStats } from "./FieldView";
import type { MatchEvent, MatchLineupPlayer, Team } from "@/lib/queries";

const positionLabel: Record<string, string> = {
  GOL: "GOL",
  ZAG: "ZAG",
  LAT: "LAT",
  VOL: "VOL",
  MEI: "MEI",
  ATA: "ATA",
};

interface Props {
  readonly team: Team;
  readonly lineup: MatchLineupPlayer[];
  readonly formation?: string | null;
  readonly events: MatchEvent[];
}

interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  subOut: boolean;
  subIn: boolean;
}

function emptyStats(): PlayerStats {
  return {
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    subOut: false,
    subIn: false,
  };
}

function buildPlayerStats(
  lineup: MatchLineupPlayer[],
  events: MatchEvent[],
  teamId: string,
): Map<string, PlayerStats> {
  const map = new Map<string, PlayerStats>();
  for (const p of lineup) map.set(p.id, emptyStats());

  function ensure(id: string): PlayerStats {
    let s = map.get(id);
    if (!s) {
      s = emptyStats();
      map.set(id, s);
    }
    return s;
  }

  for (const e of events) {
    if (e.teamId !== teamId) continue;
    if (e.type === "goal" || e.type === "penalty_goal") {
      if (e.playerId) ensure(e.playerId).goals++;
      if (e.assistPlayer) ensure(e.assistPlayer.id).assists++;
    } else if (e.type === "yellow_card") {
      if (e.playerId) ensure(e.playerId).yellowCards++;
    } else if (e.type === "red_card") {
      if (e.playerId) ensure(e.playerId).redCards++;
    } else if (e.type === "substitution") {
      if (e.playerId) ensure(e.playerId).subOut = true;
      if (e.playerIn) ensure(e.playerIn.id).subIn = true;
    }
  }
  return map;
}

export function MatchPostGameSummary({
  team,
  lineup,
  formation,
  events,
}: Props) {
  const starters = useMemo(
    () =>
      lineup
        .filter((p) => p.status === "starter")
        .map((p) => ({
          nickname: p.nickname,
          position: p.position,
          shirtNumber: p.shirtNumber,
        })),
    [lineup],
  );

  const subs = useMemo(
    () => lineup.filter((p) => p.status === "substitute"),
    [lineup],
  );

  const initialSlots = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of lineup) {
      if (p.status === "starter" && p.positionIndex != null) {
        map.set(p.shirtNumber, p.positionIndex);
      }
    }
    return map.size > 0 ? map : null;
  }, [lineup]);

  const statsByPlayerId = useMemo(
    () => buildPlayerStats(lineup, events, team.id),
    [lineup, events, team.id],
  );

  // FieldView keys stats by shirtNumber.
  const statsByShirt = useMemo(() => {
    const map = new Map<number, FieldPlayerStats>();
    for (const p of lineup) {
      if (p.status !== "starter") continue;
      const s = statsByPlayerId.get(p.id);
      if (!s) continue;
      if (
        s.goals === 0 &&
        s.assists === 0 &&
        s.yellowCards === 0 &&
        s.redCards === 0 &&
        !s.subOut &&
        !s.subIn
      )
        continue;
      map.set(p.shirtNumber, s);
    }
    return map;
  }, [lineup, statsByPlayerId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 min-w-0">
        <FieldView
          starters={starters}
          teamColor={team.primaryColor}
          initialFormation={formation ?? null}
          initialSlots={initialSlots}
          readOnly
          playerStats={statsByShirt}
        />
      </div>

      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Reservas ({subs.length})
        </h3>
        {subs.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic">
            Sem reservas escalados.
          </p>
        ) : (
          <ul className="space-y-1">
            {subs.map((p) => {
              const stats = statsByPlayerId.get(p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-2 text-sm rounded-md border border-border/30 px-2 py-1"
                >
                  <span
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ background: team.primaryColor }}
                  >
                    {p.shirtNumber}
                  </span>
                  <span className="truncate flex-1">{p.nickname}</span>
                  {stats && <ReservePlayerBadges stats={stats} />}
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 shrink-0"
                  >
                    {positionLabel[p.position] ?? p.position}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const WHITE_FILL_ICONS = new Set([
  "/icons/goal.svg",
  "/icons/assist.svg",
  "/icons/penalty-goal.svg",
]);

function MiniIcon({ src, size = 11 }: { src: string; size?: number }) {
  const needsInvert = WHITE_FILL_ICONS.has(src);
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0${needsInvert ? " brightness-0 dark:invert" : ""}`}
    />
  );
}

function ReservePlayerBadges({ stats }: { stats: PlayerStats }) {
  const items: React.ReactNode[] = [];
  if (stats.goals > 0) {
    items.push(
      <span key="goals" className="inline-flex items-center gap-0.5">
        <MiniIcon src="/icons/goal.svg" />
        {stats.goals > 1 && (
          <span className="text-[9px] font-bold">{stats.goals}</span>
        )}
      </span>,
    );
  }
  if (stats.assists > 0) {
    items.push(
      <span key="assists" className="inline-flex items-center gap-0.5">
        <MiniIcon src="/icons/assist.svg" />
        {stats.assists > 1 && (
          <span className="text-[9px] font-bold">{stats.assists}</span>
        )}
      </span>,
    );
  }
  if (stats.yellowCards >= 2) {
    items.push(
      <MiniIcon key="2y" src="/icons/second-yellow.svg" size={10} />,
    );
  } else if (stats.yellowCards > 0) {
    items.push(<MiniIcon key="ya" src="/icons/yellow-card.svg" size={10} />);
  }
  if (stats.redCards > 0 && stats.yellowCards < 2) {
    items.push(<MiniIcon key="re" src="/icons/red-card.svg" size={10} />);
  }
  if (stats.subOut || stats.subIn) {
    items.push(<MiniIcon key="sub" src="/icons/substitution.svg" />);
  }
  if (items.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0">{items}</span>
  );
}
