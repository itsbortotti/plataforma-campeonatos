"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

interface UseLiveLineupOptions {
  matchId: string;
  teamId: string;
  onExternalChange?: () => void;
}

export function useLiveLineup({
  matchId,
  teamId,
  onExternalChange,
}: UseLiveLineupOptions) {
  const callbackRef = useRef(onExternalChange);
  callbackRef.current = onExternalChange;

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/matches/${matchId}/stream`, {
      withCredentials: true,
    });
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { type?: string; data?: { teamId?: string } };
        if (payload.type === "lineup") {
          toast.info("Escalação atualizada por outro usuário");
          callbackRef.current?.();
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [matchId, teamId]);
}
