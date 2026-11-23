"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import {
  getTopScorers,
  getTopAssists,
  type PlayerStatEntry,
} from "@/lib/queries";

type StatType = "goals" | "assists";

export function useLivePlayerStats(
  seasonId: string,
  type: StatType,
  initial: PlayerStatEntry[],
  limit = 5,
): PlayerStatEntry[] {
  const [stats, setStats] = useState(initial);
  const initialKey = JSON.stringify(initial);
  const lastKey = useRef(initialKey);

  useEffect(() => {
    if (lastKey.current === initialKey) return;
    lastKey.current = initialKey;
    setStats(initial);
  }, [initial, initialKey]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    function refetch() {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const fresh =
          type === "goals"
            ? await getTopScorers(null, seasonId, limit)
            : await getTopAssists(null, seasonId, limit);
        setStats(fresh);
      }, 300);
    }

    const es = new EventSource(`${API_URL}/api/seasons/${seasonId}/stream`, {
      withCredentials: true,
    });
    es.onmessage = refetch;
    const poll = setInterval(refetch, 20000);
    return () => {
      if (timeout) clearTimeout(timeout);
      es.close();
      clearInterval(poll);
    };
  }, [seasonId, type, limit]);

  return stats;
}
