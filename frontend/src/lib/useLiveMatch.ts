"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import {
  getMatchById,
  getMatchEvents,
  getMatchTimer,
  type MatchEvent,
  type MatchStatus,
  type TimerSnapshot,
} from "@/lib/queries";
import { formatElapsedClock } from "@/lib/match-time";

const EMPTY_EVENTS: MatchEvent[] = [];

export const halfLabel: Record<string, string> = {
  first: "1º Tempo",
  second: "2º Tempo",
  extra_first: "1º Prorrogação",
  extra_second: "2º Prorrogação",
  penalties: "Pênaltis",
};

export function formatClock(seconds: number): string {
  return formatElapsedClock(Math.max(0, Math.floor(seconds)));
}

/** Live elapsed seconds that tick while the timer is running. */
export function useTimerTick(timer: TimerSnapshot | null): number {
  const [elapsed, setElapsed] = useState(() => computeElapsed(timer));

  useEffect(() => {
    setElapsed(computeElapsed(timer));
    if (!timer?.isRunning || !timer.halfStartedAt) return;
    const id = setInterval(() => setElapsed(computeElapsed(timer)), 1000);
    return () => clearInterval(id);
  }, [timer]);

  return elapsed;
}

function computeElapsed(timer: TimerSnapshot | null): number {
  if (!timer) return 0;
  if (!timer.isRunning || !timer.halfStartedAt) return timer.elapsedSeconds;
  const started = new Date(timer.halfStartedAt).getTime();
  if (Number.isNaN(started)) return timer.elapsedSeconds;
  const delta = Math.max(0, Math.floor((Date.now() - started) / 1000));
  return timer.elapsedSeconds + delta;
}

type UseLiveMatchOpts = {
  matchId: string;
  initialTimer: TimerSnapshot | null;
  initialStatus: MatchStatus | string;
  initialHomeScore: number;
  initialAwayScore: number;
  initialEvents?: MatchEvent[];
  subscribeEvents?: boolean;
};

export function useLiveMatch({
  matchId,
  initialTimer,
  initialStatus,
  initialHomeScore,
  initialAwayScore,
  initialEvents = EMPTY_EVENTS,
  subscribeEvents = false,
}: UseLiveMatchOpts) {
  const [timer, setTimer] = useState(initialTimer);
  const [status, setStatus] = useState(initialStatus);
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [events, setEvents] = useState(initialEvents);
  const eventsKey = JSON.stringify(initialEvents);
  const lastEventsKey = useRef(eventsKey);
  const timerKey = JSON.stringify(initialTimer);
  const lastTimerKey = useRef(timerKey);

  useEffect(() => {
    setStatus(initialStatus);
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    if (lastTimerKey.current !== timerKey) {
      lastTimerKey.current = timerKey;
      setTimer(initialTimer);
    }
    if (lastEventsKey.current !== eventsKey) {
      lastEventsKey.current = eventsKey;
      setEvents(initialEvents);
    }
  }, [
    initialTimer,
    initialStatus,
    initialHomeScore,
    initialAwayScore,
    initialEvents,
    eventsKey,
    timerKey,
  ]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const [m, t, e] = await Promise.all([
          getMatchById(null, matchId),
          getMatchTimer(null, matchId),
          subscribeEvents
            ? getMatchEvents(null, matchId)
            : Promise.resolve(null),
        ]);
        if (m) {
          setStatus(m.status);
          setHomeScore(m.homeScore ?? 0);
          setAwayScore(m.awayScore ?? 0);
        }
        setTimer(t);
        if (e) setEvents(e);
      } catch {
        // ignore transient errors
      }
    };

    const es = new EventSource(`${API_URL}/api/matches/${matchId}/stream`, {
      withCredentials: true,
    });
    es.onmessage = () => {
      void refresh();
    };
    const poll = setInterval(() => void refresh(), 10000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [matchId, subscribeEvents]);

  return { timer, status, homeScore, awayScore, events };
}
