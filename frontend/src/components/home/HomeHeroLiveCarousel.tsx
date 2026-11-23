"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeamBadge } from "@/components/TeamBadge";
import {
  formatClock,
  halfLabel,
  useTimerTick,
} from "@/lib/useLiveMatch";
import { elapsedToDisplayMinute } from "@/lib/match-time";
import { cn } from "@/lib/utils";
import type { LiveMatchCard, TimerSnapshot } from "@/lib/queries";
import { API_URL } from "@/lib/api";

type Props = {
  initial: LiveMatchCard[];
};

function isActiveStatus(status: string) {
  return status === "live" || status === "halftime";
}

function eventLabel(type: string): string {
  switch (type) {
    case "goal":
      return "Gol";
    case "penalty_goal":
      return "Pênalti";
    case "own_goal":
      return "Gol contra";
    case "red_card":
      return "Vermelho";
    case "yellow_card":
      return "Amarelo";
    default:
      return type;
  }
}

function useLiveMatchState(match: LiveMatchCard) {
  const [status, setStatus] = useState(match.status);
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [timer, setTimer] = useState<TimerSnapshot | null>(match.timer);
  const [events, setEvents] = useState(match.recentEvents);
  const elapsed = useTimerTick(
    isActiveStatus(status) ? timer : null,
  );

  useEffect(() => {
    setStatus(match.status);
    setHomeScore(match.homeScore ?? 0);
    setAwayScore(match.awayScore ?? 0);
    setTimer(match.timer);
    setEvents(match.recentEvents);
  }, [match]);

  useEffect(() => {
    if (!isActiveStatus(match.status) && !isActiveStatus(status)) return;

    async function refresh() {
      try {
        const res = await fetch(`${API_URL}/api/matches/${match.id}`);
        if (!res.ok) return;
        const d = (await res.json()) as {
          match: {
            status: string;
            homeScore: number | null;
            awayScore: number | null;
          };
          timer: TimerSnapshot | null;
          events: Array<{
            id: string;
            type: string;
            elapsedSeconds: number;
            teamId: string | null;
            player?: { nickname?: string } | null;
          }>;
        };
        setStatus(d.match.status);
        setHomeScore(d.match.homeScore ?? 0);
        setAwayScore(d.match.awayScore ?? 0);
        setTimer(d.timer);
        setEvents(
          d.events
            .filter((e) =>
              [
                "goal",
                "penalty_goal",
                "own_goal",
                "red_card",
                "yellow_card",
              ].includes(e.type),
            )
            .sort((a, b) => b.elapsedSeconds - a.elapsedSeconds)
            .slice(0, 8)
            .map((e) => ({
              id: e.id,
              type: e.type,
              elapsedSeconds: e.elapsedSeconds,
              teamId: e.teamId,
              playerNickname: e.player?.nickname ?? null,
            })),
        );
      } catch {
        /* ignore */
      }
    }

    const es = new EventSource(`${API_URL}/api/matches/${match.id}/stream`, {
      withCredentials: true,
    });
    es.onmessage = () => {
      void refresh();
    };
    const poll = setInterval(() => void refresh(), 12_000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [match.id, match.status, status]);

  return { status, homeScore, awayScore, timer, events, elapsed };
}

function CompactCard({
  match,
  active,
  onSelect,
}: {
  match: LiveMatchCard;
  active: boolean;
  onSelect: () => void;
}) {
  const { status, homeScore, awayScore, timer, elapsed } =
    useLiveMatchState(match);
  const live = isActiveStatus(status);
  const kickoff = new Date(match.date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "shrink-0 w-[160px] rounded-lg text-left transition p-2.5 backdrop-blur-md",
        active
          ? "bg-white/15 ring-1 ring-cta/80"
          : "bg-black/35 ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/25",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        {live ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            {status === "halftime" ? "Int" : formatClock(elapsed)}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-white/55 tabular-nums">
            {kickoff}
          </span>
        )}
        <span className="text-[9px] font-semibold text-white/40 truncate max-w-[70px]">
          {match.competition?.name?.split(" ")[0] ?? "SFL"}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <TeamBadge
              name={match.homeTeam.name}
              shortName={match.homeTeam.shortName}
              primaryColor={match.homeTeam.primaryColor}
              logoUrl={match.homeTeam.logoUrl}
              size="sm"
            />
            <span className="text-xs font-bold text-white/90 truncate">
              {match.homeTeam.shortName}
            </span>
          </span>
          <span className="text-sm font-black tabular-nums text-white">
            {live || status === "finished" ? homeScore : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0">
            <TeamBadge
              name={match.awayTeam.name}
              shortName={match.awayTeam.shortName}
              primaryColor={match.awayTeam.primaryColor}
              logoUrl={match.awayTeam.logoUrl}
              size="sm"
            />
            <span className="text-xs font-bold text-white/90 truncate">
              {match.awayTeam.shortName}
            </span>
          </span>
          <span className="text-sm font-black tabular-nums text-white">
            {live || status === "finished" ? awayScore : ""}
          </span>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-white/40 truncate">
        {match.competition?.name ?? "Campeonato"}
        {timer && live && status !== "halftime"
          ? ` · ${halfLabel[timer.currentHalf] ?? ""}`
          : ""}
      </p>
    </button>
  );
}

function FeaturedBody({ match }: { match: LiveMatchCard }) {
  const { status, homeScore, awayScore, timer, events, elapsed } =
    useLiveMatchState(match);
  const live = isActiveStatus(status);

  const headline = useMemo(() => {
    const home = match.homeTeam.name.toUpperCase();
    const away = match.awayTeam.name.toUpperCase();
    if (status === "halftime") {
      return `${home} E ${away} EMPATAM NO INTERVALO`;
    }
    if (live) {
      if (homeScore > awayScore) {
        return `${home} VENCE ${away} NO MOMENTO`;
      }
      if (awayScore > homeScore) {
        return `${away} VENCE ${home} NO MOMENTO`;
      }
      return `${home} ENFRENTA ${away} AO VIVO`;
    }
    return `${home} X ${away} — HOJE`;
  }, [
    match.homeTeam.name,
    match.awayTeam.name,
    status,
    live,
    homeScore,
    awayScore,
  ]);

  const bullets = useMemo(() => {
    const fromEvents = events
      .filter((e) =>
        ["goal", "penalty_goal", "own_goal", "red_card"].includes(e.type),
      )
      .slice(0, 3)
      .map((e) => {
        const min = elapsedToDisplayMinute(e.elapsedSeconds);
        const who = e.playerNickname ?? "Jogador";
        return `${eventLabel(e.type)} de ${who} aos ${min}'`;
      });
    if (fromEvents.length > 0) return fromEvents;
    return [
      `Rodada ${match.round}${match.venue ? ` · ${match.venue}` : ""}`,
      match.competition?.name
        ? `${match.competition.name}${match.seasonName ? ` · ${match.seasonName}` : ""}`
        : "Partida da liga",
      live
        ? "Acompanhe o lance a lance na página da partida"
        : "Escalações e detalhes disponíveis na página do jogo",
    ];
  }, [events, match, live]);

  return (
    <div className="mt-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10 pt-10">
      <div className="shrink-0">
        {live ? (
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-sm bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {status === "halftime" ? "Intervalo" : "Ao vivo"}
            {status !== "halftime" ? (
              <span className="tabular-nums">· {formatClock(elapsed)}</span>
            ) : null}
          </p>
        ) : (
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cta">
            Próximo jogo
          </p>
        )}

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-2 w-20 sm:w-24">
            <TeamBadge
              name={match.homeTeam.name}
              shortName={match.homeTeam.shortName}
              primaryColor={match.homeTeam.primaryColor}
              logoUrl={match.homeTeam.logoUrl}
              size="xl"
            />
            <span className="font-display text-xl sm:text-2xl tracking-wide text-white">
              {match.homeTeam.shortName}
            </span>
          </div>

          <div className="text-center">
            {live ? (
              <p className="font-display text-5xl sm:text-6xl tracking-wide text-white tabular-nums leading-none">
                {homeScore}
                <span className="mx-2 text-white/40 text-3xl">x</span>
                {awayScore}
              </p>
            ) : (
              <p className="font-display text-3xl sm:text-4xl tracking-wide text-white/50">
                x
              </p>
            )}
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-white/55">
              {live
                ? status === "halftime"
                  ? "HT"
                  : timer
                    ? halfLabel[timer.currentHalf]
                    : "1º Tempo"
                : new Date(match.date).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 w-20 sm:w-24">
            <TeamBadge
              name={match.awayTeam.name}
              shortName={match.awayTeam.shortName}
              primaryColor={match.awayTeam.primaryColor}
              logoUrl={match.awayTeam.logoUrl}
              size="xl"
            />
            <span className="font-display text-xl sm:text-2xl tracking-wide text-white">
              {match.awayTeam.shortName}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cta mb-2">
          {match.competition?.name ?? "Campeonato"}
          {match.seasonName ? ` · ${match.seasonName}` : ""}
        </p>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-[1.05]">
          {headline}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-white/75 leading-relaxed">
          Rodada {match.round}
          {match.venue ? ` · ${match.venue}` : ""}
          {live
            ? " — acompanhe o placar e os lances em tempo real."
            : " — confira horário e escalações."}
        </p>
        <ul className="mt-4 space-y-1.5">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex gap-2 text-sm text-white/80 leading-snug"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cta" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/partida/${match.id}`}
          className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-cta px-5 py-2.5 text-xs font-black uppercase tracking-wide text-cta-foreground hover:brightness-110 transition"
        >
          Ver partida
        </Link>
      </div>
    </div>
  );
}

export function HomeHeroLiveCarousel({ initial }: Props) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setItems(initial);
    setIndex(0);
  }, [initial]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch(`${API_URL}/api/matches/live`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data: LiveMatchCard[]) => {
          if (Array.isArray(data)) {
            setItems(data);
            setIndex((i) => (data.length === 0 ? 0 : i % data.length));
          }
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 9000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const featured = items[Math.min(index, items.length - 1)];
  const liveCount = items.filter((m) => isActiveStatus(m.status)).length;

  return (
    <div className="relative min-h-[78svh] sm:min-h-[85svh] overflow-hidden bg-[#0B1220]">
      <Image
        src="/images/banner.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[78svh] sm:min-h-[85svh] max-w-6xl flex-col px-4 sm:px-5 pt-5 sm:pt-6 pb-10 sm:pb-14">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Ao vivo
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wide text-white/55">
                  Jogos de hoje
                </span>
              )}
              <span className="text-[11px] text-white/40">
                {items.length} partida{items.length === 1 ? "" : "s"}
              </span>
            </div>
            {items.length > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition"
                  onClick={() =>
                    setIndex((i) => (i - 1 + items.length) % items.length)
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próxima"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition"
                  onClick={() => setIndex((i) => (i + 1) % items.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin snap-x snap-mandatory">
            {items.map((m, i) => (
              <div key={m.id} className="snap-start">
                <CompactCard
                  match={m}
                  active={i === index}
                  onSelect={() => setIndex(i)}
                />
              </div>
            ))}
          </div>
        </div>

        <FeaturedBody key={featured.id} match={featured} />
      </div>
    </div>
  );
}
