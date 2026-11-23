"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { getStandings, type StandingsEntry } from "@/lib/queries";

export function useLiveStandings(seasonId: string, initial: StandingsEntry[]) {
  const [standings, setStandings] = useState(initial);
  const initialKey = JSON.stringify(initial);
  const lastKey = useRef(initialKey);

  useEffect(() => {
    if (lastKey.current === initialKey) return;
    lastKey.current = initialKey;
    setStandings(initial);
  }, [initial, initialKey]);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/seasons/${seasonId}/stream`, {
      withCredentials: true,
    });
    const refresh = () => {
      void getStandings(null, seasonId).then(setStandings).catch(() => undefined);
    };
    es.onmessage = refresh;
    const poll = setInterval(refresh, 15000);
    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [seasonId]);

  return standings;
}
