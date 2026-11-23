"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useCallback } from "react";
import { CirclePlay } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import {
  useLiveMatch,
  useTimerTick,
  formatClock,
  halfLabel,
} from "@/lib/useLiveMatch";
import { elapsedToDisplayMinute } from "@/lib/match-time";
import { useShootoutKicks } from "@/lib/useShootoutKicks";
import { extractYoutubeVideoId } from "@/lib/youtube";
import { PenaltyScoreboard } from "@/components/match/PenaltyScoreboard";
import { formatDate as formatDateBase } from "@/lib/format-date";
import type {
  MatchEvent,
  MatchLineupPlayer,
  MatchPlayerRating,
  MatchStatus,
  MatchWithTeams,
  PenaltyKick,
  ShootoutState,
  StandingsEntry,
  TimerSnapshot,
} from "@/lib/queries";

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

// ── Icons ──

function SubInIcon() {
  return (
    <Image
      src="/icons/sub-in.svg"
      alt="Entrou"
      width={12}
      height={12}
      className="shrink-0"
    />
  );
}
function SubOutIcon() {
  return (
    <Image
      src="/icons/sub-out.svg"
      alt="Saiu"
      width={12}
      height={12}
      className="shrink-0"
    />
  );
}
function GoalIcon() {
  return (
    <Image
      src="/icons/goal.svg"
      alt="Gol"
      width={14}
      height={14}
      className="shrink-0 brightness-0 dark:brightness-100"
    />
  );
}
function OwnGoalIcon() {
  return (
    <Image
      src="/icons/own-goal.svg"
      alt="Gol contra"
      width={14}
      height={14}
      className="shrink-0"
    />
  );
}
function YellowCardIcon() {
  return (
    <Image
      src="/icons/yellow-card.svg"
      alt="Cartão amarelo"
      width={14}
      height={16}
      className="shrink-0"
    />
  );
}
function RedCardIcon() {
  return (
    <Image
      src="/icons/red-card.svg"
      alt="Cartão vermelho"
      width={14}
      height={16}
      className="shrink-0"
    />
  );
}
function SecondYellowIcon() {
  return (
    <Image
      src="/icons/second-yellow.svg"
      alt="2º amarelo (vermelho)"
      width={14}
      height={16}
      className="shrink-0"
    />
  );
}
function InjurySubIcon() {
  return (
    <Image
      src="/icons/injury-sub.svg"
      alt="Substituição por lesão"
      width={14}
      height={14}
      className="shrink-0"
    />
  );
}
function SubIcon() {
  return (
    <Image
      src="/icons/substitution.svg"
      alt="Substituição"
      width={14}
      height={14}
      className="shrink-0"
    />
  );
}
function PenaltyGoalIcon() {
  return (
    <Image
      src="/icons/penalty-goal.svg"
      alt="Pênalti convertido"
      width={14}
      height={14}
      className="shrink-0 brightness-0 dark:brightness-100"
    />
  );
}
function PenaltyMissIcon() {
  return (
    <Image
      src="/icons/penalty-miss.svg"
      alt="Pênalti perdido"
      width={14}
      height={14}
      className="shrink-0"
    />
  );
}
function AssistIcon() {
  return (
    <Image
      src="/icons/assist.svg"
      alt="Assistência"
      width={12}
      height={12}
      className="shrink-0 opacity-50 brightness-0 dark:brightness-100"
    />
  );
}

function formatDate(dateStr: string): string {
  return formatDateBase(dateStr, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface SubEntry {
  minute: number;
  direction: "in" | "out";
  injury: boolean;
}

interface PlayerIcons {
  goals: number;
  penaltyGoals: number;
  ownGoals: number;
  penaltyMisses: number;
}

interface EventStats {
  playerIcons: Map<string, PlayerIcons>;
  assistCount: Map<string, number>;
  subEntries: Map<string, SubEntry[]>;
  yellowCards: Map<string, number>;
  redCards: Set<string>;
}

function getIcons(
  map: Map<string, PlayerIcons>,
  id: string,
): PlayerIcons {
  let entry = map.get(id);
  if (!entry) {
    entry = { goals: 0, penaltyGoals: 0, ownGoals: 0, penaltyMisses: 0 };
    map.set(id, entry);
  }
  return entry;
}

function computeStats(events: MatchEvent[]): EventStats {
  const playerIcons = new Map<string, PlayerIcons>();
  const assistCount = new Map<string, number>();
  const subEntries = new Map<string, SubEntry[]>();
  const yellowCards = new Map<string, number>();
  const redCards = new Set<string>();
  for (const e of events) {
    const minute = elapsedToDisplayMinute(e.elapsedSeconds);
    const playerId = e.playerId ?? "";
    if (!playerId && e.type !== "substitution") continue;
    if (e.type === "goal") {
      getIcons(playerIcons, playerId).goals++;
      if (e.assistPlayer) {
        assistCount.set(
          e.assistPlayer.id,
          (assistCount.get(e.assistPlayer.id) ?? 0) + 1,
        );
      }
    }
    if (e.type === "penalty_goal") {
      getIcons(playerIcons, playerId).penaltyGoals++;
    }
    if (e.type === "own_goal") {
      getIcons(playerIcons, playerId).ownGoals++;
    }
    if (e.type === "penalty_miss") {
      getIcons(playerIcons, playerId).penaltyMisses++;
    }
    if (e.type === "substitution" && e.playerIn && playerId) {
      const injury = e.description === "Lesão";
      const outList = subEntries.get(playerId) ?? [];
      subEntries.set(playerId, [...outList, { minute, direction: "out", injury }]);
      const inList = subEntries.get(e.playerIn.id) ?? [];
      subEntries.set(e.playerIn.id, [...inList, { minute, direction: "in", injury }]);
    }
    if (e.type === "yellow_card") {
      const count = (yellowCards.get(playerId) ?? 0) + 1;
      yellowCards.set(playerId, count);
      if (count >= 2) {
        redCards.add(playerId);
      }
    }
    if (e.type === "red_card") {
      redCards.add(playerId);
    }
  }
  return {
    playerIcons,
    assistCount,
    subEntries,
    yellowCards,
    redCards,
  };
}

interface Props {
  match: MatchWithTeams;
  homeLineup: MatchLineupPlayer[] | null;
  awayLineup: MatchLineupPlayer[] | null;
  initialEvents: MatchEvent[];
  initialTimer: TimerSnapshot | null;
  initialStatus: MatchStatus;
  initialHomeScore: number;
  initialAwayScore: number;
  shootout?: ShootoutState | null;
  ratings?: MatchPlayerRating[];
  youtubeUrl?: string | null;
}

export function PublicMatchBoard({
  match,
  homeLineup,
  awayLineup,
  initialEvents,
  initialTimer,
  initialStatus,
  initialHomeScore,
  initialAwayScore,
  shootout,
  ratings,
  youtubeUrl,
}: Props) {
  const { timer, status, homeScore, awayScore, events } = useLiveMatch({
    matchId: match.id,
    initialTimer,
    initialStatus,
    initialHomeScore,
    initialAwayScore,
    initialEvents,
    subscribeEvents: true,
  });

  const shootoutKicks = useShootoutKicks(match.id, shootout?.kicks);

  const elapsed = useTimerTick(timer);

  const videoId = youtubeUrl ? extractYoutubeVideoId(youtubeUrl) : null;
  const [videoStart, setVideoStart] = useState<number | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const seekToGoal = useCallback((seconds: number) => {
    setVideoStart(seconds);
    setTimeout(() => {
      videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  const isFinished = status === "finished";
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isActive = isLive || isHalftime;
  const showBoard = isFinished || isActive;

  const home = match.homeTeam;
  const away = match.awayTeam;

  const timelineEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.type !== "half_time" &&
            e.type !== "second_half" &&
            e.type !== "full_time" &&
            e.type !== "save" &&
            e.type !== "tackle" &&
            e.type !== "key_pass" &&
            e.type !== "shot" &&
            e.type !== "foul_suffered",
        )
        .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds),
    [events],
  );

  const stats = useMemo(() => computeStats(events), [events]);

  const ratingMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of ratings ?? []) map.set(r.playerId, r.rating);
    return map;
  }, [ratings]);

  const groupGoals = (teamId: string) => {
    const oppositeTeamId =
      teamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    // Regular goals for this team + own goals by the opposing team (count for us)
    const goals = timelineEvents.filter(
      (e) =>
        ((e.type === "goal" || e.type === "penalty_goal") &&
          e.teamId === teamId) ||
        (e.type === "own_goal" && e.teamId === oppositeTeamId),
    );
    const grouped = new Map<
      string,
      { nickname: string; minutes: number[] }
    >();
    for (const g of goals) {
      const key = g.playerId + (g.type === "own_goal" ? "_og" : "");
      const entry = grouped.get(key) ?? {
        nickname: g.player?.nickname ?? "?",
        minutes: [],
      };
      grouped.set(key, {
        ...entry,
        minutes: [
          ...entry.minutes,
          elapsedToDisplayMinute(g.elapsedSeconds),
        ],
      });
    }
    return [...grouped.values()];
  };

  return (
    <>
      {/* Scoreboard */}
      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-brand-bar text-white shadow-lg">
        <Image
          src="/images/banner.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bar/70 via-brand-bar/85 to-brand-bar" />

        <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-10">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cta">
              Rodada {match.round}
            </p>
            <p className="mt-1 text-sm text-white/70 capitalize">
              {formatDate(match.date)}
            </p>
            {match.venue ? (
              <p className="mt-0.5 text-xs text-white/45">{match.venue}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-3 sm:gap-8">
            <div className="flex flex-1 flex-col items-center gap-2.5 min-w-0">
              <TeamBadge
                name={home.name}
                shortName={home.shortName}
                primaryColor={home.primaryColor}
                logoUrl={home.logoUrl}
                size="2xl"
              />
              <div className="text-center min-w-0 w-full">
                <p className="font-display text-2xl sm:text-3xl tracking-wide truncate">
                  {home.shortName}
                </p>
                <p className="text-xs text-white/50 truncate hidden sm:block">
                  {home.name}
                </p>
              </div>
            </div>

            <div className="text-center shrink-0 px-1">
              {showBoard ? (
                <div>
                  {isActive ? (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                        Ao vivo
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-display text-5xl sm:text-6xl tracking-wide tabular-nums leading-none">
                      {homeScore}
                    </span>
                    <span className="text-2xl text-white/25 font-black">-</span>
                    <span className="font-display text-5xl sm:text-6xl tracking-wide tabular-nums leading-none">
                      {awayScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-cta font-bold mt-2.5 uppercase tracking-widest tabular-nums">
                    {isFinished
                      ? "Encerrado"
                      : isHalftime
                        ? "Intervalo"
                        : formatClock(elapsed)}
                  </p>
                  {isActive ? (
                    <Badge className="mt-2 bg-white/10 text-white border-0 text-[10px] font-bold">
                      {isHalftime
                        ? "HT"
                        : timer
                          ? halfLabel[timer.currentHalf]
                          : "1º Tempo"}
                    </Badge>
                  ) : null}
                </div>
              ) : (
                <span className="font-display text-3xl tracking-wide text-white/40">
                  VS
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col items-center gap-2.5 min-w-0">
              <TeamBadge
                name={away.name}
                shortName={away.shortName}
                primaryColor={away.primaryColor}
                logoUrl={away.logoUrl}
                size="2xl"
              />
              <div className="text-center min-w-0 w-full">
                <p className="font-display text-2xl sm:text-3xl tracking-wide truncate">
                  {away.shortName}
                </p>
                <p className="text-xs text-white/50 truncate hidden sm:block">
                  {away.name}
                </p>
              </div>
            </div>
          </div>

          {showBoard &&
          timelineEvents.filter(
            (e) =>
              e.type === "goal" ||
              e.type === "penalty_goal" ||
              e.type === "own_goal",
          ).length > 0 ? (
            <div className="flex items-start justify-center gap-8 sm:gap-16 mt-7 pt-5 border-t border-white/10">
              <div className="flex-1 text-right space-y-1">
                {groupGoals(match.homeTeamId).map((g) => (
                  <p key={g.nickname} className="text-xs text-white/65">
                    {g.nickname}{" "}
                    <span className="text-cta">
                      {g.minutes.map((m) => `${m}'`).join(", ")}
                    </span>
                  </p>
                ))}
              </div>
              <div className="flex-1 text-left space-y-1">
                {groupGoals(match.awayTeamId).map((g) => (
                  <p key={g.nickname} className="text-xs text-white/65">
                    <span className="text-cta">
                      {g.minutes.map((m) => `${m}'`).join(", ")}
                    </span>{" "}
                    {g.nickname}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {shootout ? (
            <div className="mt-5 pt-4 border-t border-white/10">
              <PenaltyScoreboard
                matchId={shootout.matchId}
                tiedTeams={orderTiedTeamsByMatch(
                  shootout.tiedTeams,
                  match.homeTeamId,
                )}
                initialShootout={shootout.kicks as PenaltyKick[]}
                championTeamId={shootout.championTeamId}
                variant="compact"
              />
            </div>
          ) : null}
        </div>
      </section>

      {showBoard ? (
        <div className="grid gap-5 lg:grid-cols-12">
          {(timelineEvents.length > 0 || shootoutKicks.length > 0) && (
            <div className="lg:col-span-5">
              <MatchTimeline
                match={match}
                timelineEvents={timelineEvents}
                homeScore={homeScore}
                awayScore={awayScore}
                status={status}
                clockLabel={
                  isFinished
                    ? "FT"
                    : isHalftime
                      ? "HT"
                      : formatClock(elapsed)
                }
                shootoutKicks={shootoutKicks}
                youtubeVideoId={videoId}
                onGoalClick={seekToGoal}
              />
            </div>
          )}

          <section
            className={`rounded-2xl border border-border/50 bg-card/70 p-4 sm:p-5 self-start ${
              timelineEvents.length > 0 || shootoutKicks.length > 0
                ? "lg:col-span-7"
                : "lg:col-span-12"
            }`}
          >
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Escalações
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {[
                { team: home, lineup: homeLineup },
                { team: away, lineup: awayLineup },
              ].map(({ team, lineup }) => {
                const hasLineup = lineup && lineup.length > 0;
                const starters = hasLineup
                  ? lineup.filter((p) => p.status === "starter")
                  : null;
                const subs = hasLineup
                  ? lineup.filter((p) => p.status === "substitute")
                  : null;

                return (
                  <div key={team.id}>
                    <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-border/40">
                      <TeamBadge
                        name={team.name}
                        shortName={team.shortName}
                        primaryColor={team.primaryColor}
                        logoUrl={team.logoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-lg tracking-wide truncate">
                          {team.shortName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {team.name}
                        </p>
                      </div>
                    </div>

                    {hasLineup ? (
                      <div className="space-y-0.5">
                        {starters?.map((p) => (
                          <LineupRow
                            key={p.id}
                            player={p}
                            stats={stats}
                            isStarter
                            rating={ratingMap.get(p.id)}
                          />
                        ))}
                        {subs && subs.length > 0 ? (
                          <>
                            <div className="flex items-center gap-2 my-3">
                              <div className="flex-1 h-px bg-border/40" />
                              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                                Reservas
                              </span>
                              <div className="flex-1 h-px bg-border/40" />
                            </div>
                            {subs.map((p) => (
                              <LineupRow
                                key={p.id}
                                player={p}
                                stats={stats}
                                isStarter={false}
                                rating={ratingMap.get(p.id)}
                              />
                            ))}
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 italic py-4 text-center">
                        Escalação não disponível
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {videoId ? (
        <section
          ref={videoRef}
          className="rounded-2xl border border-border/50 bg-card/70 overflow-hidden"
        >
          <div className="px-4 sm:px-5 py-3 flex items-center gap-2 border-b border-border/40">
            <CirclePlay className="h-3.5 w-3.5 text-red-400" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Vídeo da partida
            </h2>
          </div>
          <div className="aspect-video bg-black">
            <iframe
              key={videoStart}
              src={`https://www.youtube.com/embed/${videoId}${videoStart != null ? `?start=${videoStart}&autoplay=1` : ""}`}
              title={`Rodada ${match.round}`}
              className="h-full w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </section>
      ) : null}
    </>
  );
}


function ratingColor(rating: number): string {
  if (rating >= 8.0) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (rating >= 7.0) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (rating >= 6.0) return "bg-muted text-foreground border-border/40";
  if (rating >= 5.0) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

function LineupRow({
  player,
  stats,
  isStarter,
  rating,
}: {
  player: MatchLineupPlayer;
  stats: EventStats;
  isStarter: boolean;
  rating?: number;
}) {
  const icons = stats.playerIcons.get(player.id);
  const totalGoals =
    (icons?.goals ?? 0) + (icons?.penaltyGoals ?? 0);
  const assists = stats.assistCount.get(player.id) ?? 0;
  const yellows = stats.yellowCards.get(player.id) ?? 0;
  const hasRed = stats.redCards.has(player.id);
  const subs = stats.subEntries.get(player.id) ?? [];
  const hasEntered = subs.some((s) => s.direction === "in");

  const highlight =
    totalGoals > 0 || hasRed
      ? "font-semibold text-foreground"
      : isStarter
        ? "text-muted-foreground/70"
        : hasEntered
          ? "text-foreground/70"
          : "text-muted-foreground/50";

  return (
    <div className="flex items-center gap-1.5 py-1 flex-wrap">
      <span className="text-[11px] font-bold text-muted-foreground/40 tabular-nums w-5 text-right shrink-0">
        {player.shirtNumber}
      </span>
      <span className={`text-xs ${highlight}`}>{player.nickname}</span>
      {subs.map((sub, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {sub.injury ? (
            <InjurySubIcon />
          ) : sub.direction === "in" ? (
            <SubInIcon />
          ) : (
            <SubOutIcon />
          )}
          <span
            className={`text-[10px] font-bold tabular-nums ${sub.direction === "in" ? "text-emerald-400" : "text-red-500"}`}
          >
            {sub.minute}&apos;
          </span>
        </span>
      ))}
      {(icons?.goals ?? 0) > 0 &&
        Array.from({ length: icons!.goals }).map((_, i) => (
          <GoalIcon key={`g${i}`} />
        ))}
      {(icons?.penaltyGoals ?? 0) > 0 &&
        Array.from({ length: icons!.penaltyGoals }).map((_, i) => (
          <PenaltyGoalIcon key={`pg${i}`} />
        ))}
      {(icons?.ownGoals ?? 0) > 0 &&
        Array.from({ length: icons!.ownGoals }).map((_, i) => (
          <OwnGoalIcon key={`og${i}`} />
        ))}
      {(icons?.penaltyMisses ?? 0) > 0 &&
        Array.from({ length: icons!.penaltyMisses }).map((_, i) => (
          <PenaltyMissIcon key={`pm${i}`} />
        ))}
      {assists > 0 &&
        Array.from({ length: assists }).map((_, i) => (
          <AssistIcon key={`a${i}`} />
        ))}
      {yellows >= 2 ? (
        <SecondYellowIcon />
      ) : (
        <>
          {yellows > 0 &&
            Array.from({ length: yellows }).map((_, i) => (
              <YellowCardIcon key={i} />
            ))}
          {hasRed && <RedCardIcon />}
        </>
      )}
      {rating !== undefined && (
        <Badge
          variant="outline"
          className={`ml-auto text-[10px] font-black tabular-nums px-1.5 py-0 shrink-0 ${ratingColor(rating)}`}
        >
          {rating.toFixed(1)}
        </Badge>
      )}
    </div>
  );
}

function MatchTimeline({
  match,
  timelineEvents,
  homeScore,
  awayScore,
  status,
  clockLabel,
  shootoutKicks,
  youtubeVideoId,
  onGoalClick,
}: {
  match: MatchWithTeams;
  timelineEvents: MatchEvent[];
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  clockLabel: string;
  shootoutKicks: PenaltyKick[];
  youtubeVideoId?: string | null;
  onGoalClick?: (seconds: number) => void;
}) {
  const eventsReversed = [...timelineEvents].reverse();
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";

  const isGoalType = (type: string) =>
    type === "goal" || type === "penalty_goal" || type === "own_goal";

  // Detect which yellow_card events are a second yellow (→ expulsion)
  const secondYellowEventIds = new Set<string>();
  const yellowCountByPlayer = new Map<string, number>();
  for (const e of timelineEvents) {
    if (e.type === "yellow_card" && e.playerId) {
      const count = (yellowCountByPlayer.get(e.playerId) ?? 0) + 1;
      yellowCountByPlayer.set(e.playerId, count);
      if (count >= 2) {
        secondYellowEventIds.add(e.id);
      }
    }
  }

  const scoreAtEvent = new Map<string, { h: number; a: number }>();
  let hg = 0;
  let ag = 0;
  for (const e of timelineEvents) {
    if (isGoalType(e.type)) {
      if (e.type === "own_goal") {
        // Own goal counts for the opposing team
        if (e.teamId === match.homeTeamId) ag++;
        else hg++;
      } else {
        if (e.teamId === match.homeTeamId) hg++;
        else ag++;
      }
    }
    scoreAtEvent.set(e.id, { h: hg, a: ag });
  }

  let htHome = 0;
  let htAway = 0;
  const firstHalfCutoff = 45 * 60;
  for (const e of timelineEvents) {
    if (isGoalType(e.type) && e.elapsedSeconds < firstHalfCutoff) {
      if (e.type === "own_goal") {
        if (e.teamId === match.homeTeamId) htAway++;
        else htHome++;
      } else {
        if (e.teamId === match.homeTeamId) htHome++;
        else htAway++;
      }
    }
  }

  // Penalty shootout: compute running score per kick (home/away by match side)
  const sortedKicks = [...shootoutKicks].sort(
    (a, b) => a.shootOrder - b.shootOrder,
  );
  const kicksReversed = [...sortedKicks].reverse();
  const penScoreAtKick = new Map<string, { h: number; a: number }>();
  let ph = 0;
  let pa = 0;
  for (const k of sortedKicks) {
    if (k.scored) {
      if (k.teamId === match.homeTeamId) ph++;
      else pa++;
    }
    penScoreAtKick.set(k.id, { h: ph, a: pa });
  }
  const hasShootout = sortedKicks.length > 0;
  const penHome = ph;
  const penAway = pa;

  const topLabel = isFinished ? "FT" : isHalftime ? "HT" : "AO VIVO";
  const topLabelClass = isLive
    ? "text-red-500"
    : "text-muted-foreground/50";

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/40 self-start w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Lance a lance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        {hasShootout && (
          <>
            <div className="flex items-center gap-3 py-2 mb-1">
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-[10px] font-bold uppercase text-amber-400">
                PEN
              </span>
              <span className="text-sm font-black tabular-nums">
                {penHome} - {penAway}
              </span>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            {kicksReversed.map((kick) => {
              const isHome = kick.teamId === match.homeTeamId;
              const nickname = kick.player?.nickname ?? "?";
              const score = penScoreAtKick.get(kick.id);
              return (
                <div key={kick.id}>
                  {isHome ? (
                    <div className="flex items-center py-2">
                      <div className="flex items-center gap-2">
                        {kick.scored ? <PenaltyGoalIcon /> : <PenaltyMissIcon />}
                        <span
                          className={`text-sm font-medium ${kick.scored ? "font-bold" : ""}`}
                        >
                          {nickname}
                        </span>
                        {kick.scored && score && (
                          <span className="inline-flex items-center bg-muted rounded px-1.5 py-0.5">
                            <span className="text-[11px] font-black tabular-nums">
                              {score.h} - {score.a}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${kick.scored ? "font-bold" : ""}`}
                        >
                          {nickname}
                        </span>
                        {kick.scored && score && (
                          <span className="inline-flex items-center bg-muted rounded px-1.5 py-0.5">
                            <span className="text-[11px] font-black tabular-nums">
                              {score.h} - {score.a}
                            </span>
                          </span>
                        )}
                        {kick.scored ? <PenaltyGoalIcon /> : <PenaltyMissIcon />}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <div className="flex items-center gap-3 py-2 mb-1">
          <div className="flex-1 h-px bg-border/30" />
          <span
            className={`text-[10px] font-bold uppercase inline-flex items-center gap-1 ${topLabelClass}`}
          >
            {isLive && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
            {topLabel}
          </span>
          <span className="text-sm font-black tabular-nums">
            {homeScore} - {awayScore}
          </span>
          {isLive && (
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {clockLabel}
            </span>
          )}
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <div>
          {eventsReversed.map((event, idx) => {
            const nickname = event.player?.nickname ?? "?";
            const prevEvent = idx > 0 ? eventsReversed[idx - 1] : null;
            const displayMinute = elapsedToDisplayMinute(event.elapsedSeconds);
            const inFirstHalf = event.elapsedSeconds < firstHalfCutoff;
            const prevInFirstHalf = prevEvent
              ? prevEvent.elapsedSeconds < firstHalfCutoff
              : null;
            const showHt =
              prevInFirstHalf === false && inFirstHalf
                ? true
                : prevInFirstHalf === null &&
                  inFirstHalf &&
                  (eventsReversed[0]?.elapsedSeconds ?? 0) >= firstHalfCutoff;

            const isOwnGoal = event.type === "own_goal";
            // Own goals show on the benefiting team's side (opposite of player's team)
            const isHome = isOwnGoal
              ? event.teamId !== match.homeTeamId
              : event.teamId === match.homeTeamId;
            const isPenaltyGoal = event.type === "penalty_goal";
            const isPenaltyMiss = event.type === "penalty_miss";
            const isGoal =
              event.type === "goal" || isPenaltyGoal || isOwnGoal;
            const isYellow = event.type === "yellow_card";
            const isSecondYellow =
              isYellow && secondYellowEventIds.has(event.id);
            const isRed = event.type === "red_card";
            const isSub = event.type === "substitution";
            const score = scoreAtEvent.get(event.id);
            const playerInName = event.playerIn?.nickname ?? "?";
            const assistName = event.assistPlayer?.nickname;

            return (
              <div key={event.id}>
                {showHt && (
                  <div className="flex items-center gap-3 py-2 my-1">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase">
                      HT
                    </span>
                    <span className="text-sm font-black tabular-nums">
                      {htHome} - {htAway}
                    </span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>
                )}

                {isHome ? (
                  <div className="flex items-center py-2">
                    <span className="text-xs font-bold text-muted-foreground/50 tabular-nums w-9 text-right shrink-0">
                      {displayMinute}&apos;
                    </span>
                    <div className="flex items-center gap-2 ml-3">
                      {isGoal && (isOwnGoal ? <OwnGoalIcon /> : isPenaltyGoal ? <PenaltyGoalIcon /> : <GoalIcon />)}
                      {isPenaltyMiss && <PenaltyMissIcon />}
                      {isSecondYellow ? (
                        <SecondYellowIcon />
                      ) : isYellow ? (
                        <YellowCardIcon />
                      ) : null}
                      {isRed && <RedCardIcon />}
                      {isSub && (event.description === "Lesão" ? <InjurySubIcon /> : <SubIcon />)}
                      {isSub ? (
                        <span className="text-sm">
                          <span className="font-medium">{playerInName}</span>{" "}
                          <span className="text-muted-foreground/50">
                            {nickname}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-medium ${isGoal ? "font-bold" : ""}`}
                        >
                          {nickname}
                          {isPenaltyMiss && event.description && (
                            <span className="text-muted-foreground/50 text-xs font-normal ml-1">
                              ({event.description})
                            </span>
                          )}
                        </span>
                      )}
                      {isGoal && !isOwnGoal && assistName && (
                        <span className="inline-flex items-center gap-1">
                          <AssistIcon />
                          <span className="text-xs text-muted-foreground/50">
                            {assistName}
                          </span>
                        </span>
                      )}
                      {isGoal && score && (
                        <span className="inline-flex items-center bg-muted rounded px-1.5 py-0.5">
                          <span className="text-[11px] font-black tabular-nums">
                            {score.h} - {score.a}
                          </span>
                        </span>
                      )}
                      {isGoal && youtubeVideoId && event.youtubeTimestampSeconds != null && onGoalClick && (
                        <button
                          type="button"
                          onClick={() => onGoalClick(event.youtubeTimestampSeconds!)}
                          className="text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                          title="Assistir gol"
                        >
                          <CirclePlay className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end py-2">
                    <div className="flex items-center gap-2 mr-3">
                      {isSub ? (
                        <span className="text-sm">
                          <span className="text-muted-foreground/50">
                            {nickname}
                          </span>{" "}
                          <span className="font-medium">{playerInName}</span>
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-medium ${isGoal ? "font-bold" : ""}`}
                        >
                          {nickname}
                          {isPenaltyMiss && event.description && (
                            <span className="text-muted-foreground/50 text-xs font-normal ml-1">
                              ({event.description})
                            </span>
                          )}
                        </span>
                      )}
                      {isGoal && !isOwnGoal && assistName && (
                        <span className="inline-flex items-center gap-1">
                          <AssistIcon />
                          <span className="text-xs text-muted-foreground/50">
                            {assistName}
                          </span>
                        </span>
                      )}
                      {isGoal && score && (
                        <span className="inline-flex items-center bg-muted rounded px-1.5 py-0.5">
                          <span className="text-[11px] font-black tabular-nums">
                            {score.h} - {score.a}
                          </span>
                        </span>
                      )}
                      {isGoal && youtubeVideoId && event.youtubeTimestampSeconds != null && onGoalClick && (
                        <button
                          type="button"
                          onClick={() => onGoalClick(event.youtubeTimestampSeconds!)}
                          className="text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                          title="Assistir gol"
                        >
                          <CirclePlay className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isGoal && (isOwnGoal ? <OwnGoalIcon /> : isPenaltyGoal ? <PenaltyGoalIcon /> : <GoalIcon />)}
                      {isPenaltyMiss && <PenaltyMissIcon />}
                      {isSecondYellow ? (
                        <SecondYellowIcon />
                      ) : isYellow ? (
                        <YellowCardIcon />
                      ) : null}
                      {isRed && <RedCardIcon />}
                      {isSub && (event.description === "Lesão" ? <InjurySubIcon /> : <SubIcon />)}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground/50 tabular-nums w-9 text-left shrink-0">
                      {displayMinute}&apos;
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
