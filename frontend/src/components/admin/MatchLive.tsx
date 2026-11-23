"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ArrowLeft, Play, Pause, Square, Trash2, Shield, Footprints, ChevronUp, ChevronDown, LayoutGrid } from "lucide-react";
import { TacticalBoard } from "@/components/match/TacticalBoard";
import { toast } from "sonner";
import {
  startTimer,
  stopTimer,
  setHalftime,
  startSecondHalf,
  endMatch,
  addEvent,
  removeEvent,
  removePenaltyKick,
  type AddEventInput,
} from "@/app/admin/partidas/[id]/live/actions";
import { elapsedToDisplayMinute } from "@/lib/match-time";
import type {
  MatchWithTeams,
  Team,
  MatchLineupPlayer,
  MatchEvent,
  PenaltyKick,
  RosterWithPlayers,
  Season,
} from "@/lib/queries";
import { PenaltyShootoutAdminActions } from "@/components/admin/PenaltyShootout";
import { PenaltyScoreboard } from "@/components/match/PenaltyScoreboard";
import type { StandingsEntry } from "@/lib/queries";

/**
 * Reorders tied teams so the match's home team appears first, aligning the
 * penalty scoreboard dots with the match scoreboard layout.
 */
function orderTiedTeamsByMatch(
  tiedTeams: StandingsEntry[],
  homeTeamId: string,
): StandingsEntry[] {
  const homeIdx = tiedTeams.findIndex((t) => t.teamId === homeTeamId);
  if (homeIdx <= 0) return tiedTeams;
  const reordered = [...tiedTeams];
  const [home] = reordered.splice(homeIdx, 1);
  reordered.unshift(home);
  return reordered;
}
import Link from "next/link";

type TimerRow = {
  match_id: string;
  elapsed_seconds: number;
  is_running: boolean;
  half_started_at: string | null;
  current_half: string;
  updated_at?: string;
};
type MatchStatus =
  | "scheduled"
  | "lineups_set"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "walkover";

const positionLabel: Record<string, string> = {
  GOL: "GOL",
  ZAG: "ZAG",
  LAT: "LAT",
  VOL: "VOL",
  MEI: "MEI",
  ATA: "ATA",
};

const positionColor: Record<string, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

const halfLabel: Record<string, string> = {
  first: "1º Tempo",
  second: "2º Tempo",
  extra_first: "1º Prorrogação",
  extra_second: "2º Prorrogação",
  penalties: "Pênaltis",
};

const eventSuffix: Record<string, string> = {};

const eventIconSrc: Record<string, string> = {
  goal: "/icons/goal.svg",
  own_goal: "/icons/own-goal.svg",
  penalty_goal: "/icons/penalty-goal.svg",
  penalty_miss: "/icons/penalty-miss.svg",
  yellow_card: "/icons/yellow-card.svg",
  red_card: "/icons/red-card.svg",
  second_yellow: "/icons/second-yellow.svg",
  substitution: "/icons/substitution.svg",
  injury_sub: "/icons/injury-sub.svg",
  shootout_goal: "/icons/penalty-goal.svg",
  shootout_miss: "/icons/penalty-miss.svg",
};

function EventIcon({
  type,
  size = 16,
  white,
}: {
  type: string;
  size?: number;
  white?: boolean;
}) {
  const src = eventIconSrc[type];
  if (!src) return null;
  // These icons keep their intrinsic fill in both themes (unless forced white)
  const keepColor =
    type === "shootout_miss" ||
    type === "penalty_miss" ||
    type === "own_goal" ||
    type === "second_yellow" ||
    type === "injury_sub";
  // white: force white (for colored button backgrounds) — overrides keepColor
  // default: adapt to theme (black in light, white in dark)
  const filter = white
    ? "brightness-0 invert"
    : keepColor
      ? ""
      : "brightness-0 dark:brightness-100";
  return (
    <Image
      src={src}
      alt={type}
      width={size}
      height={size}
      className={`shrink-0 ${filter}`}
    />
  );
}

function AssistIcon({ size = 12 }: { size?: number }) {
  return (
    <Image
      src="/icons/assist.svg"
      alt="Assistência"
      width={size}
      height={size}
      className="shrink-0 brightness-0 dark:brightness-100"
    />
  );
}

// ── Timer display ──

function calcElapsed(timer: TimerRow | null): number {
  if (!timer) return 0;
  let secs = timer.elapsed_seconds;
  if (timer.is_running && timer.half_started_at) {
    secs += Math.floor(
      (Date.now() - new Date(timer.half_started_at).getTime()) / 1000,
    );
  }
  return secs;
}

function useTimer(timer: TimerRow | null) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timer?.is_running) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, [timer?.is_running, timer?.half_started_at]);

  const elapsed = calcElapsed(timer);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { elapsed, minutes, seconds, display };
}

// ── Event action types for the quick-add dialog ──

type EventAction =
  | "goal"
  | "penalty_goal"
  | "penalty_miss"
  | "own_goal"
  | "yellow_card"
  | "red_card"
  | "substitution";

const eventActions: { type: EventAction; label: string; color: string }[] = [
  {
    type: "goal",
    label: "Gol",
    color: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500",
  },
  {
    type: "penalty_goal",
    label: "Gol de Pênalti",
    color: "bg-lime-600 hover:bg-lime-700 text-white border-lime-500",
  },
  {
    type: "penalty_miss",
    label: "Pênalti Perdido",
    color: "bg-rose-600 hover:bg-rose-700 text-white border-rose-500",
  },
  {
    type: "own_goal",
    label: "Gol Contra",
    color: "bg-orange-600 hover:bg-orange-700 text-white border-orange-500",
  },
  {
    type: "substitution",
    label: "Substituição",
    color: "bg-blue-600 hover:bg-blue-700 text-white border-blue-500",
  },
  {
    type: "yellow_card",
    label: "Amarelo",
    color: "bg-amber-500 hover:bg-amber-600 text-white border-amber-400",
  },
  {
    type: "red_card",
    label: "Vermelho",
    color: "bg-red-600 hover:bg-red-700 text-white border-red-500",
  },
];

// ── Player stats from events ──

interface PlayerEventStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  subsOut: number;
  subsIn: number;
  onPitch: boolean; // net state: currently on the pitch
  saves: number;
  tackles: number;
}

function buildPlayerStats(
  events: MatchEvent[],
  homeLineup: MatchLineupPlayer[],
  awayLineup: MatchLineupPlayer[],
): Map<string, PlayerEventStats> {
  const map = new Map<string, PlayerEventStats>();

  // Initialize all lineup players
  const allPlayers = [...homeLineup, ...awayLineup];
  for (const p of allPlayers) {
    map.set(p.id, {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      subsOut: 0,
      subsIn: 0,
      onPitch: p.status === "starter",
      saves: 0,
      tackles: 0,
    });
  }

  function get(id: string): PlayerEventStats {
    if (!map.has(id)) {
      map.set(id, {
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        subsOut: 0,
        subsIn: 0,
        onPitch: false,
        saves: 0,
        tackles: 0,
      });
    }
    return map.get(id)!;
  }

  // Process events in order
  for (const e of events) {
    if (["goal", "penalty_goal"].includes(e.type) && e.playerId) {
      get(e.playerId).goals++;
    }
    if (["goal", "penalty_goal"].includes(e.type) && e.assistPlayer) {
      get(e.assistPlayer.id).assists++;
    }
    if (e.type === "yellow_card" && e.playerId) {
      const stat = get(e.playerId);
      stat.yellowCards++;
      if (stat.yellowCards >= 2) {
        stat.redCards++;
        stat.onPitch = false;
      }
    }
    if (e.type === "red_card" && e.playerId) {
      get(e.playerId).redCards++;
      get(e.playerId).onPitch = false;
    }
    if (e.type === "substitution") {
      if (e.playerId) {
        const out = get(e.playerId);
        out.subsOut++;
        out.onPitch = false;
      }
      if (e.playerIn) {
        const inn = get(e.playerIn.id);
        inn.subsIn++;
        inn.onPitch = true;
      }
    }
    if (e.type === "save" && e.playerId) get(e.playerId).saves++;
    if (e.type === "tackle" && e.playerId) get(e.playerId).tackles++;
  }

  return map;
}

// ── Player button in lineup ──

type QuickStatType = "save" | "tackle";

const allQuickStats: { type: QuickStatType; label: string; icon: typeof Shield }[] = [
  { type: "save", label: "Defesa", icon: Shield },
  { type: "tackle", label: "Desarme", icon: Footprints },
];

const quickStatsByPosition: Record<string, QuickStatType[]> = {
  GOL: ["save"],
  ZAG: ["tackle"],
  LAT: ["tackle"],
  VOL: ["tackle"],
};

function getQuickStatsForPosition(position: string) {
  const allowed = quickStatsByPosition[position] ?? [];
  return allQuickStats.filter((s) => allowed.includes(s.type));
}

function QuickStatBadge({ count, Icon, label }: { count: number; Icon: typeof Shield; label?: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
      <Icon className="h-3 w-3" />
      <span className="font-bold">{count}</span>
      {label && <span className="text-muted-foreground/60">{label}</span>}
    </span>
  );
}

function PlayerButton({
  player,
  teamColor,
  stats,
  onClick,
  onQuickEvent,
  showQuickStats,
}: {
  player: MatchLineupPlayer;
  teamColor: string;
  stats?: PlayerEventStats;
  onClick?: () => void;
  onQuickEvent?: (type: QuickStatType) => void;
  showQuickStats?: boolean;
}) {
  const isOff = stats ? !stats.onPitch : false;
  const isExpelled = (stats?.redCards ?? 0) > 0 && isOff;
  const disabled = isExpelled;
  const interactive = Boolean(onClick) && !disabled;

  return (
    <div className={`rounded-lg border border-border/40 ${disabled ? "opacity-20 pointer-events-none" : isOff ? "opacity-60" : ""}`}>
      <Button
        variant="ghost"
        type="button"
        className={`h-auto py-3 px-4 justify-start gap-3 w-full text-left rounded-b-none ${!interactive ? "pointer-events-none" : ""}`}
        onClick={interactive ? onClick : undefined}
        tabIndex={interactive ? 0 : -1}
      >
        <span
          className="inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-white shrink-0"
          style={{ background: teamColor }}
        >
          {player.shirtNumber}
        </span>
        <span
          className={`font-semibold text-base truncate ${isExpelled ? "line-through" : ""}`}
        >
          {player.nickname}
        </span>

        {/* Event badges */}
        <span className="flex items-center gap-1 ml-auto shrink-0">
          {stats && stats.goals > 0 && (
            <span className="flex items-center gap-0.5">
              <EventIcon type="goal" size={12} />
              {stats.goals > 1 && (
                <span className="text-[10px] font-bold">{stats.goals}</span>
              )}
            </span>
          )}
          {stats && stats.assists > 0 && (
            <span className="flex items-center gap-0.5">
              <AssistIcon size={12} />
              {stats.assists > 1 && (
                <span className="text-[10px] font-bold">{stats.assists}</span>
              )}
            </span>
          )}
          {stats && stats.yellowCards >= 2 ? (
            <EventIcon type="second_yellow" size={10} />
          ) : stats && stats.yellowCards > 0 ? (
            <EventIcon type="yellow_card" size={10} />
          ) : null}
          {stats && stats.redCards > 0 && stats.yellowCards < 2 && (
            <EventIcon type="red_card" size={10} />
          )}
          {stats && stats.subsOut > 0 && (
            <EventIcon type="substitution" size={12} />
          )}
          {stats && stats.subsIn > 0 && (
            <EventIcon type="substitution" size={12} />
          )}
        </span>

        <Badge
          variant="outline"
          className={`text-[9px] border px-1.5 py-0.5 shrink-0 ${positionColor[player.position] ?? ""}`}
        >
          {positionLabel[player.position] ?? player.position}
        </Badge>
      </Button>

      {showQuickStats && stats && (stats.saves > 0 || stats.tackles > 0) && (
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 border-t border-border/30 bg-muted/30 flex-wrap">
          <QuickStatBadge count={stats.saves} Icon={Shield} label="DEF" />
          <QuickStatBadge count={stats.tackles} Icon={Footprints} label="DES" />
        </div>
      )}

      {showQuickStats && onQuickEvent && !isOff && (() => {
        const buttons = getQuickStatsForPosition(player.position);
        if (buttons.length === 0) return null;
        return (
          <div className="flex border-t border-border/30">
            {buttons.map((btn) => {
              const BtnIcon = btn.icon;
              return (
                <button
                  key={btn.type}
                  type="button"
                  title={btn.label}
                  onClick={(e) => { e.stopPropagation(); onQuickEvent(btn.type); }}
                  className="flex-1 py-3 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground active:bg-accent transition-colors border-r last:border-r-0 border-border/30 flex items-center justify-center gap-1.5"
                >
                  <BtnIcon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{btn.label}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ── Main component ──

interface Props {
  match: MatchWithTeams;
  homeLineup: MatchLineupPlayer[];
  awayLineup: MatchLineupPlayer[];
  initialEvents: MatchEvent[];
  initialTimer: TimerRow | null;
  initialStatus: MatchStatus;
  initialShootout: PenaltyKick[];
  season: Season | null;
  tiedTeams: StandingsEntry[];
  tiedRosters: RosterWithPlayers[];
  /** admin = Master opera a súmula; staff = comissão acompanha + mesa tática. */
  mode?: "admin" | "staff";
  /** Voltar para… (padrão: ficha admin da partida). */
  backHref?: string;
  /** No modo staff, só este time abre mesa tática. */
  focusTeamId?: string | null;
}

export function MatchLive({
  match,
  homeLineup,
  awayLineup,
  initialEvents,
  initialTimer,
  initialStatus,
  initialShootout,
  season,
  tiedTeams,
  tiedRosters,
  mode = "admin",
  backHref,
  focusTeamId = null,
}: Props) {
  const isStaff = mode === "staff";
  const resolvedBackHref =
    backHref ?? `/admin/partidas/${match.id}`;
  const [pending, startTransition] = useTransition();
  const [timer, setTimer] = useState<TimerRow | null>(initialTimer);
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents);
  const [status, setStatus] = useState<MatchStatus>(initialStatus);
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [shootout, setShootout] = useState<PenaltyKick[]>(initialShootout);

  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  /** Mesa tática fullscreen — null = fechada (estado da mesa some no unmount). */
  const [tacticalTeamId, setTacticalTeamId] = useState<string | null>(null);

  // Event dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] =
    useState<MatchLineupPlayer | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedAction, setSelectedAction] = useState<EventAction | null>(
    null,
  );
  const [assistPlayerId, setAssistPlayerId] = useState<string>("");
  const [playerInId, setPlayerInId] = useState<string>("");
  const [eventDescription, setEventDescription] = useState<string>("");

  const { elapsed, display } = useTimer(timer);

  // ── Live updates via SSE + polling (backend Postgres) ──
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        // Same-origin rewrite → API (cookies preserved)
        const res = await fetch(`/api/matches/${match.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (!alive) return;
        setEvents(data.events ?? []);
        if (data.timer) {
          setTimer({
            match_id: match.id,
            elapsed_seconds: data.timer.elapsedSeconds,
            is_running: data.timer.isRunning,
            half_started_at: data.timer.halfStartedAt,
            current_half: data.timer.currentHalf,
            updated_at: new Date().toISOString(),
          } as TimerRow);
        }
        if (data.match) {
          setStatus(data.match.status as MatchStatus);
          setHomeScore(data.match.homeScore ?? 0);
          setAwayScore(data.match.awayScore ?? 0);
        }
        setShootout(data.penalties ?? []);
      } catch {
        // ignore
      }
    }
    void refresh();
    const es = new EventSource(`/api/matches/${match.id}/stream`, {
      withCredentials: true,
    });
    es.onmessage = () => {
      void refresh();
    };
    es.onerror = () => {
      // fallback: polling already covers this
    };
    const poll = setInterval(() => void refresh(), 3000);
    return () => {
      alive = false;
      es.close();
      clearInterval(poll);
    };
  }, [match.id]);

  // ── Timer actions ──

  function handleStartFirstHalf() {
    startTransition(async () => {
      const result = await startTimer(match.id, "first");
      if (!result.success) {
        toast.error(result.error ?? "Erro ao iniciar 1º tempo");
        return;
      }
      const startedAt = result.halfStartedAt ?? new Date().toISOString();
      setStatus("live");
      setTimer({
        match_id: match.id,
        elapsed_seconds: timer?.elapsed_seconds ?? 0,
        is_running: true,
        half_started_at: startedAt,
        current_half: "first",
        updated_at: new Date().toISOString(),
      });
      toast.success("1º tempo iniciado");
    });
  }

  function handleStartSecondHalf() {
    startTransition(async () => {
      const result = await startSecondHalf(match.id);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao iniciar 2º tempo");
        return;
      }
      const startedAt = result.halfStartedAt ?? new Date().toISOString();
      setStatus("live");
      setTimer({
        match_id: match.id,
        elapsed_seconds: 0,
        is_running: true,
        half_started_at: startedAt,
        current_half: "second",
        updated_at: new Date().toISOString(),
      });
      toast.success("2º tempo iniciado");
    });
  }

  function handlePause() {
    startTransition(async () => {
      try {
        await stopTimer(match.id);
        setTimer((prev) =>
          prev
            ? {
                ...prev,
                is_running: false,
                elapsed_seconds: calcElapsed(prev),
                half_started_at: null,
              }
            : prev,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao pausar");
      }
    });
  }

  function handleResume() {
    startTransition(async () => {
      const half = timer?.current_half ?? "first";
      const result = await startTimer(match.id, half);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao retomar");
        return;
      }
      setTimer((prev) =>
        prev
          ? {
              ...prev,
              is_running: true,
              half_started_at: result.halfStartedAt ?? new Date().toISOString(),
            }
          : prev,
      );
    });
  }

  function handleHalftime() {
    startTransition(async () => {
      try {
        await setHalftime(match.id);
        setStatus("halftime");
        setTimer((prev) =>
          prev
            ? {
                ...prev,
                is_running: false,
                elapsed_seconds: 0,
                half_started_at: null,
                current_half: "second",
              }
            : {
                match_id: match.id,
                elapsed_seconds: 0,
                is_running: false,
                half_started_at: null,
                current_half: "second",
              },
        );
        toast.success("Intervalo");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro no intervalo");
      }
    });
  }

  function handleEndMatch() {
    startTransition(async () => {
      const result = await endMatch(match.id);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao encerrar partida");
        return;
      }
      const { season } = result;
      if (season.seasonEnded) {
        if (season.decidedByPenalties) {
          toast.warning(
            "Temporada encerrada - empate no topo. Pênaltis vão decidir o campeão!",
            {
              duration: 8000,
            },
          );
        } else if (season.championTeamName) {
          toast.success(
            `Temporada encerrada - ${season.championTeamName} é o campeão!`,
            {
              duration: 8000,
            },
          );
        }
      }
    });
  }

  // ── Event actions ──

  function openEventDialog(player: MatchLineupPlayer, team: Team) {
    setSelectedPlayer(player);
    setSelectedTeam(team);
    setSelectedAction(null);
    setAssistPlayerId("");
    setPlayerInId("");
    setEventDescription("");
    setDialogOpen(true);
  }

  const currentElapsed = useCallback(() => {
    return elapsed;
  }, [elapsed]);

  function handleAddEvent() {
    if (!selectedPlayer || !selectedTeam || !selectedAction) return;

    startTransition(async () => {
      const input: AddEventInput = {
        matchId: match.id,
        teamId: selectedTeam.id,
        type: selectedAction,
        elapsedSeconds: currentElapsed(),
        playerId: selectedPlayer.id,
      };

      if (
        selectedAction === "goal" &&
        assistPlayerId &&
        assistPlayerId !== "none"
      ) {
        input.assistPlayerId = assistPlayerId;
      }

      if (
        selectedAction === "substitution" &&
        playerInId &&
        playerInId !== "none"
      ) {
        const selectedIsOnPitch =
          playerStats.get(selectedPlayer.id)?.onPitch ??
          selectedPlayer.status === "starter";
        if (selectedIsOnPitch) {
          // Selected is on pitch → selected goes OUT, playerInId comes IN
          input.playerInId = playerInId;
        } else {
          // Selected is on bench → selected comes IN, playerInId goes OUT
          input.playerId = playerInId;
          input.playerInId = selectedPlayer.id;
        }
      }

      if (eventDescription) {
        input.description = eventDescription;
      }

      await addEvent(input);
      setDialogOpen(false);
    });
  }

  function handleRemoveEvent(eventId: string) {
    // Optimistic removal
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    startTransition(async () => {
      await removeEvent(match.id, eventId);
    });
  }

  function handleRemoveKick(kickId: string) {
    setShootout((prev) => prev.filter((k) => k.id !== kickId));
    startTransition(async () => {
      await removePenaltyKick(match.id, kickId);
    });
  }

  function handleQuickEvent(playerId: string, teamId: string, type: QuickStatType) {
    startTransition(async () => {
      await addEvent({
        matchId: match.id,
        teamId,
        type,
        elapsedSeconds: currentElapsed(),
        playerId,
      });
    });
  }

  // Build player stats from events
  const playerStats = buildPlayerStats(events, homeLineup, awayLineup);

  // Get teammates for assist selection (players currently on the pitch)
  const getTeammates = (teamId: string, excludeId: string) => {
    const lineup = teamId === match.homeTeamId ? homeLineup : awayLineup;
    return lineup.filter((p) => {
      if (p.id === excludeId) return false;
      return playerStats.get(p.id)?.onPitch ?? p.status === "starter";
    });
  };

  // Get players NOT on the pitch (for substitution "enters" selector)
  // Excludes expelled players (red card or 2 yellows)
  const getBenchPlayers = (teamId: string) => {
    const lineup = teamId === match.homeTeamId ? homeLineup : awayLineup;
    return lineup.filter((p) => {
      const s = playerStats.get(p.id);
      const isOff = !(s?.onPitch ?? p.status === "starter");
      const isExpelled = (s?.redCards ?? 0) > 0;
      return isOff && !isExpelled;
    });
  };

  const isFinished = status === "finished";
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isScheduled = status === "scheduled" || status === "lineups_set";

  // Filter only game events (not system or quick-stat events)
  const gameEvents = events.filter(
    (e) => !["half_time", "second_half", "full_time", "save", "tackle", "key_pass", "shot", "foul_suffered"].includes(e.type),
  );

  return (
    <div className="p-4 space-y-4 mx-auto max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={resolvedBackHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8",
          )}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-black tracking-tight flex-1">
          {isStaff ? "Súmula · Quadro técnico" : "Súmula ao Vivo"}
        </h1>
        {isStaff ? (
          <Badge
            variant="outline"
            className="text-[10px] border border-amber-500/30 text-amber-400"
          >
            Somente leitura
          </Badge>
        ) : null}
        {isFinished && (
          <Badge
            variant="outline"
            className="text-[10px] border bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
          >
            Encerrada
          </Badge>
        )}
      </div>

      {/* Scoreboard + Timer + Controls */}
      {headerCollapsed ? (
        <button
          type="button"
          onClick={() => setHeaderCollapsed(false)}
          className="w-full rounded-xl border border-border/40 px-4 py-2 flex items-center justify-between hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tabular-nums">
              {match.homeTeam.shortName} {homeScore} - {awayScore} {match.awayTeam.shortName}
            </span>
            <span className="text-lg font-mono font-bold tabular-nums text-muted-foreground">
              {display}
            </span>
            {timer?.current_half && (
              <span className="text-xs text-muted-foreground">
                {halfLabel[timer.current_half] ?? timer.current_half}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : (
      <div className="rounded-xl border border-border/40 px-4 py-4 md:px-6">
        <div className="flex items-center gap-4">
          {/* Left: Controls (admin only; desktop) */}
          {!isStaff ? (
          <div className="hidden md:flex flex-col gap-2 shrink-0 w-44">
            {isScheduled && (
              <Button
                size="lg"
                onClick={handleStartFirstHalf}
                disabled={pending}
                className="gap-2 w-full"
              >
                <Play className="h-5 w-5" /> Iniciar 1º Tempo
              </Button>
            )}

            {isLive && timer?.is_running && (
              <>
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={pending}
                  className="gap-2 w-full"
                >
                  <Pause className="h-4 w-4" /> Pausar
                </Button>
                {timer.current_half === "first" && (
                  <Button
                    variant="outline"
                    onClick={handleHalftime}
                    disabled={pending}
                    className="gap-2 w-full"
                  >
                    <Square className="h-4 w-4" /> Intervalo
                  </Button>
                )}
                {timer.current_half === "second" && (
                  <Button
                    variant="destructive"
                    onClick={handleEndMatch}
                    disabled={pending}
                    className="gap-2 w-full"
                  >
                    <Square className="h-4 w-4" /> Encerrar
                  </Button>
                )}
              </>
            )}

            {isLive && !timer?.is_running && (
              <Button
                size="lg"
                onClick={handleResume}
                disabled={pending}
                className="gap-2 w-full"
              >
                <Play className="h-5 w-5" /> Retomar
              </Button>
            )}

            {isHalftime && (
              <Button
                size="lg"
                onClick={handleStartSecondHalf}
                disabled={pending}
                className="gap-2 w-full"
              >
                <Play className="h-5 w-5" /> Iniciar 2º Tempo
              </Button>
            )}
          </div>
          ) : null}

          {/* Center: Scoreboard + Timer (mobile: stacked, desktop: side by side) */}
          <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-4">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
                  {match.homeTeam.logoUrl ? (
                    <Image
                      src={match.homeTeam.logoUrl}
                      alt={match.homeTeam.name}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: match.homeTeam.primaryColor }}
                    >
                      {match.homeTeam.shortName.slice(0, 3)}
                    </div>
                  )}
                  <span className="text-base sm:text-lg font-bold">
                    {match.homeTeam.shortName}
                  </span>
                </div>

                <div className="text-4xl sm:text-6xl font-black tabular-nums">
                  {homeScore} - {awayScore}
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-start">
                  <span className="text-base sm:text-lg font-bold">
                    {match.awayTeam.shortName}
                  </span>
                  {match.awayTeam.logoUrl ? (
                    <Image
                      src={match.awayTeam.logoUrl}
                      alt={match.awayTeam.name}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-black text-white"
                      style={{ background: match.awayTeam.primaryColor }}
                    >
                      {match.awayTeam.shortName.slice(0, 3)}
                    </div>
                  )}
                </div>
              </div>

              {/* Timer + Controls: below score on mobile */}
              <div className="md:hidden mt-2 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold tabular-nums">
                    {display}
                  </span>
                  {timer?.current_half && (
                    <span className="text-xs text-muted-foreground">
                      {halfLabel[timer.current_half] ?? timer.current_half}
                    </span>
                  )}
                </div>
                {!isStaff ? (
                <div className="flex flex-col gap-2">
                  {isScheduled && (
                    <Button onClick={handleStartFirstHalf} disabled={pending} className="gap-2 w-full">
                      <Play className="h-4 w-4" /> Iniciar 1º Tempo
                    </Button>
                  )}
                  {isLive && timer?.is_running && (
                    <>
                      <Button variant="outline" onClick={handlePause} disabled={pending} className="gap-2 w-full">
                        <Pause className="h-4 w-4" /> Pausar
                      </Button>
                      {timer.current_half === "first" && (
                        <Button variant="outline" onClick={handleHalftime} disabled={pending} className="gap-2 w-full">
                          <Square className="h-4 w-4" /> Intervalo
                        </Button>
                      )}
                      {timer.current_half === "second" && (
                        <Button variant="destructive" onClick={handleEndMatch} disabled={pending} className="gap-2 w-full">
                          <Square className="h-4 w-4" /> Encerrar
                        </Button>
                      )}
                    </>
                  )}
                  {isLive && !timer?.is_running && (
                    <Button onClick={handleResume} disabled={pending} className="gap-2 w-full">
                      <Play className="h-4 w-4" /> Retomar
                    </Button>
                  )}
                  {isHalftime && (
                    <Button onClick={handleStartSecondHalf} disabled={pending} className="gap-2 w-full">
                      <Play className="h-4 w-4" /> Iniciar 2º Tempo
                    </Button>
                  )}
                </div>
                ) : null}
              </div>

              {/* Penalty shootout compact score */}
              {isFinished && season?.decidedByPenalties && tiedTeams.length >= 2 && (
                <div className="pt-2 mt-2 border-t border-border/30">
                  <PenaltyScoreboard
                    matchId={match.id}
                    tiedTeams={orderTiedTeamsByMatch(tiedTeams, match.homeTeamId)}
                    initialShootout={shootout}
                    championTeamId={season.championTeamId}
                    variant="compact"
                  />
                </div>
              )}
            </div>

            {/* Timer: right side on desktop */}
            <div className="hidden md:flex flex-col items-center shrink-0 w-44">
              <span className="text-4xl font-mono font-bold tabular-nums">
                {display}
              </span>
              {timer?.current_half && (
                <span className="text-sm text-muted-foreground">
                  {halfLabel[timer.current_half] ?? timer.current_half}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHeaderCollapsed(true)}
          className="w-full flex items-center justify-center pt-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
      )}

      {/* Penalty shootout actions (only when season ended in a tie and this match closed it) */}
      {!isStaff &&
        isFinished &&
        season?.decidedByPenalties &&
        tiedTeams.length >= 2 &&
        tiedRosters.length >= 2 && (
          <PenaltyShootoutAdminActions
            matchId={match.id}
            season={season}
            tiedRosters={tiedRosters}
            shootout={shootout}
          />
        )}

      {/* Lineups - two columns, split by live state */}
      {!isFinished &&
        !isScheduled &&
        (() => {
          function splitLineup(lineup: MatchLineupPlayer[]) {
            const onPitch: MatchLineupPlayer[] = [];
            const bench: MatchLineupPlayer[] = [];
            for (const p of lineup) {
              const s = playerStats.get(p.id);
              const isOnPitch = s?.onPitch ?? p.status === "starter";
              (isOnPitch ? onPitch : bench).push(p);
            }
            return { onPitch, bench };
          }

          const home = splitLineup(homeLineup);
          const away = splitLineup(awayLineup);

          function renderTeamLineup(
            team: Team,
            {
              onPitch,
              bench,
            }: { onPitch: MatchLineupPlayer[]; bench: MatchLineupPlayer[] },
          ) {
            const canTactics =
              !isStaff || !focusTeamId || team.id === focusTeamId;
            const canEditEvents = !isStaff;
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {team.shortName} - Em campo ({onPitch.length})
                    </Label>
                    {canTactics ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                        onClick={() => setTacticalTeamId(team.id)}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Mesa tática
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    {onPitch.map((p) => (
                      <PlayerButton
                        key={p.id}
                        player={p}
                        teamColor={team.primaryColor}
                        stats={playerStats.get(p.id)}
                        onClick={
                          canEditEvents
                            ? () => openEventDialog(p, team)
                            : undefined
                        }
                        onQuickEvent={
                          canEditEvents
                            ? (type) => handleQuickEvent(p.id, team.id, type)
                            : undefined
                        }
                        showQuickStats={canEditEvents}
                      />
                    ))}
                  </div>
                </div>
                {bench.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Banco ({bench.length})
                    </Label>
                    <div className="space-y-1">
                      {bench.map((p) => (
                        <PlayerButton
                          key={p.id}
                          player={p}
                          teamColor={team.primaryColor}
                          stats={playerStats.get(p.id)}
                          onClick={
                            canEditEvents
                              ? () => openEventDialog(p, team)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <>
              <div className="grid grid-cols-2 gap-4">
                {renderTeamLineup(match.homeTeam, home)}
                {renderTeamLineup(match.awayTeam, away)}
              </div>
              {tacticalTeamId
                ? (() => {
                    const team =
                      tacticalTeamId === match.homeTeamId
                        ? match.homeTeam
                        : match.awayTeam;
                    const lineup =
                      tacticalTeamId === match.homeTeamId
                        ? homeLineup
                        : awayLineup;
                    const onFieldIds = new Set(
                      (tacticalTeamId === match.homeTeamId
                        ? home.onPitch
                        : away.onPitch
                      ).map((p) => p.id),
                    );
                    const boardPlayers =
                      lineup.filter((p) => onFieldIds.has(p.id)).length > 0
                        ? lineup.filter((p) => onFieldIds.has(p.id))
                        : lineup.filter((p) => p.status === "starter");
                    return (
                      <TacticalBoard
                        key={team.id}
                        team={team}
                        players={boardPlayers}
                        formation={
                          tacticalTeamId === match.homeTeamId
                            ? match.homeFormation
                            : match.awayFormation
                        }
                        onClose={() => setTacticalTeamId(null)}
                      />
                    );
                  })()
                : null}
            </>
          );
        })()}

      {/* Penalty shootout kicks */}
      {shootout.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Pênaltis ({shootout.length})
          </Label>
          <div className="space-y-1">
            {[...shootout].reverse().map((kick) => {
              const isHome = kick.teamId === match.homeTeamId;
              const iconType = kick.scored ? "shootout_goal" : "shootout_miss";
              return (
                <div
                  key={kick.id}
                  className={`flex items-center gap-2 rounded-lg border border-border/30 px-3 py-1.5 text-sm ${
                    isHome ? "" : "flex-row-reverse text-right"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 text-center">
                    {kick.shootOrder}
                  </span>
                  <EventIcon type={iconType} />
                  <span className="font-medium flex-1 truncate">
                    {kick.player?.nickname ?? ""}
                  </span>
                  {!isStaff && (!isFinished || season?.decidedByPenalties) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveKick(kick.id)}
                      disabled={pending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events timeline */}
      {gameEvents.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Eventos ({gameEvents.length})
          </Label>
          <div className="space-y-1">
            {[...gameEvents].reverse().map((event) => {
              // Own goals display on the side of the team that benefited
              const isHome =
                event.type === "own_goal"
                  ? event.teamId !== match.homeTeamId
                  : event.teamId === match.homeTeamId;
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-2 rounded-lg border border-border/30 px-3 py-1.5 text-sm ${
                    isHome ? "" : "flex-row-reverse text-right"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 text-center">
                    {elapsedToDisplayMinute(event.elapsedSeconds)}&apos;
                  </span>
                  <EventIcon
                    type={
                      event.type === "substitution" &&
                      event.description === "Lesão"
                        ? "injury_sub"
                        : event.type
                    }
                  />
                  <span className="flex-1 truncate">
                    {event.type === "substitution" && event.playerIn ? (
                      <>
                        <span className="font-medium">
                          {event.playerIn.nickname}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          {event.player?.nickname ?? ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium">
                          {event.player?.nickname ?? ""}
                        </span>
                        {eventSuffix[event.type] && (
                          <span className="text-muted-foreground text-xs ml-1">
                            {eventSuffix[event.type]}
                          </span>
                        )}
                        {event.assistPlayer && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs ml-1">
                            <AssistIcon size={10} />
                            {event.assistPlayer.nickname}
                          </span>
                        )}
                        {event.type === "penalty_miss" && event.description && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({event.description})
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  {!isStaff && !isFinished && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveEvent(event.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              {selectedPlayer && (
                <>
                  <span
                    className="inline-flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold text-white"
                    style={{ background: selectedTeam?.primaryColor }}
                  >
                    {selectedPlayer.shirtNumber}
                  </span>
                  {selectedPlayer.nickname}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {!selectedAction ? (
            <div className="grid grid-cols-2 gap-3">
              {eventActions.map((a) => (
                <Button
                  key={a.type}
                  className={`h-16 gap-2 border ${a.color}`}
                  onClick={() => setSelectedAction(a.type)}
                >
                  <EventIcon type={a.type} size={22} white />
                  <span className="text-sm font-semibold">{a.label}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setSelectedAction(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <EventIcon type={selectedAction} size={24} />
                <span className="font-semibold text-lg">
                  {eventActions.find((a) => a.type === selectedAction)?.label}
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto text-sm px-2 py-0.5"
                >
                  {elapsedToDisplayMinute(currentElapsed())}&apos;
                </Badge>
              </div>

              {/* Goal: select assist */}
              {selectedAction === "goal" &&
                selectedTeam &&
                (() => {
                  const teammates = getTeammates(
                    selectedTeam.id,
                    selectedPlayer?.id ?? "",
                  );
                  const assistPlayer = teammates.find(
                    (p) => p.id === assistPlayerId,
                  );
                  return (
                    <div className="space-y-2">
                      <Label className="text-sm">Assistência (opcional)</Label>
                      <Select
                        value={assistPlayerId || "none"}
                        onValueChange={(v) => setAssistPlayerId(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          {assistPlayer
                            ? `${assistPlayer.shirtNumber} - ${assistPlayer.nickname}`
                            : "Sem assistência"}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem assistência</SelectItem>
                          {teammates.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.shirtNumber} - {p.nickname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

              {/* Penalty miss: reason */}
              {selectedAction === "penalty_miss" && (
                <div className="space-y-2">
                  <Label className="text-sm">Motivo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "Defesa do goleiro", label: "Defesa do goleiro" },
                      { value: "Fora do alvo", label: "Fora do alvo" },
                    ].map((opt) => (
                      <Button
                        key={opt.value}
                        variant={
                          eventDescription === opt.value
                            ? "default"
                            : "outline"
                        }
                        className="h-12 text-sm"
                        onClick={() => setEventDescription(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Substitution: context-aware */}
              {selectedAction === "substitution" &&
                selectedTeam &&
                selectedPlayer &&
                (() => {
                  const selectedIsOnPitch =
                    playerStats.get(selectedPlayer.id)?.onPitch ??
                    selectedPlayer.status === "starter";
                  // If selected player is on pitch → pick who ENTERS (from bench)
                  // If selected player is on bench → pick who LEAVES (from pitch)
                  const options = selectedIsOnPitch
                    ? getBenchPlayers(selectedTeam.id)
                    : getTeammates(selectedTeam.id, "");
                  const chosen = options.find((p) => p.id === playerInId);
                  const label = selectedIsOnPitch
                    ? "Entra em campo"
                    : "Sai de campo";
                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">{label}</Label>
                        <Select
                          value={playerInId || undefined}
                          onValueChange={(v) => setPlayerInId(v ?? "")}
                        >
                          <SelectTrigger className="w-full">
                            {chosen ? (
                              `${chosen.shirtNumber} - ${chosen.nickname}`
                            ) : (
                              <span className="text-muted-foreground">
                                Selecione...
                              </span>
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.shirtNumber} - {p.nickname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant={
                          eventDescription === "Lesão"
                            ? "default"
                            : "outline"
                        }
                        className="h-10 text-sm w-full gap-2"
                        onClick={() =>
                          setEventDescription(
                            eventDescription === "Lesão" ? "" : "Lesão",
                          )
                        }
                      >
                        🤕 Substituição por lesão
                      </Button>
                    </div>
                  );
                })()}

              <div className="flex gap-3 pt-2">
                <Button
                  size="lg"
                  variant="ghost"
                  className="flex-1 text-base"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="lg"
                  className="flex-1 text-base"
                  onClick={handleAddEvent}
                  disabled={
                    pending ||
                    (selectedAction === "substitution" && !playerInId) ||
                    (selectedAction === "penalty_miss" && !eventDescription)
                  }
                >
                  {pending ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
