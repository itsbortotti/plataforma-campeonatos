"use server";

import { revalidatePath } from "next/cache";
import { apiGet, apiPatch, apiPut } from "@/lib/api-server";
import { getMatchById, getMatchEvents } from "@/lib/queries";

export async function updateMatchInfo(input: {
  matchId: string;
  round?: number;
  date?: string;
  status?: string;
  venue?: string;
  youtubeUrl?: string | null;
}) {
  try {
    const { matchId, ...fields } = input;
    await apiPatch(`/api/admin/matches/${matchId}`, fields);
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const, error: null as string | null };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export type OfficialEntry = {
  role: "referee" | "assistant_1" | "assistant_2" | "narrator";
  name: string;
};

export async function saveLineup(
  matchId: string,
  teamId: string,
  entries: Array<{
    playerId: string;
    shirtNumber: number;
    status: "starter" | "substitute";
    positionIndex?: number | null;
  }>,
  formation?: string | null,
) {
  try {
    await apiPut(`/api/admin/matches/${matchId}/lineups`, {
      teamId,
      entries,
      formation: formation ?? undefined,
    });
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const, error: null as string | null };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function saveOfficials(
  matchId: string,
  officials: OfficialEntry[],
) {
  try {
    await apiPut(`/api/admin/matches/${matchId}/officials`, { officials });
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const, error: null as string | null };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function getMatchDetail(matchId: string) {
  const match = await getMatchById(null, matchId);
  const events = await getMatchEvents(null, matchId);
  return { match, events };
}

export async function updateMatchStatus(id: string, status: string) {
  try {
    await apiPatch(`/api/admin/matches/${id}`, { status });
    revalidatePath(`/admin/partidas/${id}`);
    revalidatePath(`/admin/partidas/${id}/live`);
    revalidatePath("/admin/partidas");
    revalidatePath("/admin");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateEventTimestamp(
  eventId: string,
  seconds: number | null,
) {
  try {
    const event = await apiPatch<{ matchId: string }>(
      `/api/admin/events/${eventId}`,
      { youtubeTimestampSeconds: seconds },
    );
    if (event?.matchId) revalidatePath(`/admin/partidas/${event.matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function fetchAndMatchTimestamps(matchId: string) {
  try {
    const {
      extractYoutubeVideoId,
      fetchYoutubeDescription,
      parseGoalTimestamps,
      matchTimestampsToEvents,
    } = await import("@/lib/youtube");
    const match = await getMatchById(null, matchId);
    const events = await getMatchEvents(null, matchId);
    if (!match?.youtubeUrl) {
      return { suggestions: [], error: "Partida sem URL do YouTube." };
    }
    const videoId = extractYoutubeVideoId(match.youtubeUrl);
    if (!videoId) {
      return { suggestions: [], error: "URL do YouTube inválida." };
    }
    const description = await fetchYoutubeDescription(videoId);
    if (!description) {
      return {
        suggestions: [],
        error: "Não foi possível ler a descrição do vídeo (YOUTUBE_API_KEY?).",
      };
    }
    const parsed = parseGoalTimestamps(description);
    const suggestions = matchTimestampsToEvents(parsed, events, match);
    return { suggestions, error: null as string | null };
  } catch (e) {
    return {
      suggestions: [],
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function applyTimestampSuggestions(
  matchId: string,
  mappings: Array<{ eventId: string; seconds: number }>,
) {
  try {
    for (const m of mappings) {
      await apiPatch(`/api/admin/events/${m.eventId}`, {
        youtubeTimestampSeconds: m.seconds,
      });
    }
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
