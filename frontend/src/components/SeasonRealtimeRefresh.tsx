"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export function SeasonRealtimeRefresh({ seasonId }: { seasonId: string }) {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/seasons/${seasonId}/stream`, {
      withCredentials: true,
    });
    let t: ReturnType<typeof setTimeout> | null = null;
    es.onmessage = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => router.refresh(), 400);
    };
    return () => {
      es.close();
      if (t) clearTimeout(t);
    };
  }, [seasonId, router]);

  return null;
}
