"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { getPenaltyShootout, type PenaltyKick } from "@/lib/queries";

const EMPTY: PenaltyKick[] = [];

export function useShootoutKicks(
  matchId: string,
  initial: PenaltyKick[] = EMPTY,
): PenaltyKick[] {
  const [kicks, setKicks] = useState(initial);
  const initialKey = JSON.stringify(initial);
  const lastKey = useRef(initialKey);

  useEffect(() => {
    if (lastKey.current === initialKey) return;
    lastKey.current = initialKey;
    setKicks(initial);
  }, [initial, initialKey]);

  useEffect(() => {
    const refresh = () => {
      void getPenaltyShootout(null, matchId).then(setKicks).catch(() => undefined);
    };
    const es = new EventSource(`${API_URL}/api/matches/${matchId}/stream`, {
      withCredentials: true,
    });
    es.onmessage = refresh;
    const poll = setInterval(refresh, 15000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [matchId]);

  return kicks;
}
