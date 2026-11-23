"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPut } from "@/lib/api-server";
import { calculateRatings } from "@/lib/player-rating";
import {
  getMatchById,
  getMatchEvents,
  getMatchHighlights,
  getMatchLineups,
  getMatchTimer,
  type MatchLineupPlayer,
} from "@/lib/queries";

function flattenLineup(rows: MatchLineupPlayer[] | null) {
  if (!rows) return [];
  return rows.map((r) => ({
    id: r.playerId,
    nickname: r.player.nickname,
    position: r.player.position,
    shirtNumber: r.shirtNumber,
    status: r.status,
  }));
}

export async function saveRatings(
  matchId: string,
  ratings: Array<{
    teamId: string;
    playerId: string;
    rating: number;
    calculatedRating: number;
  }>,
) {
  await apiPut(`/api/admin/matches/${matchId}/ratings`, { ratings });
  revalidatePath(`/admin/partidas/${matchId}`);
}

export async function loadRatingContext(matchId: string) {
  const match = await getMatchById(null, matchId);
  if (!match) return null;
  const [events, homeLineup, awayLineup, timer, highlights] = await Promise.all([
    getMatchEvents(null, matchId),
    getMatchLineups(null, matchId, match.homeTeamId),
    getMatchLineups(null, matchId, match.awayTeamId),
    getMatchTimer(null, matchId),
    getMatchHighlights(null, matchId),
  ]);
  return { match, events, homeLineup, awayLineup, timer, highlights };
}

export async function generateRatings(matchId: string) {
  try {
    const ctx = await loadRatingContext(matchId);
    if (!ctx?.match) {
      return { success: false as const, error: "Partida não encontrada" };
    }
    const { match, events, homeLineup, awayLineup, timer, highlights } = ctx;
    const results = calculateRatings({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      matchDurationSeconds: timer?.elapsedSeconds ?? 0,
      events,
      homeLineup: flattenLineup(homeLineup) as never,
      awayLineup: flattenLineup(awayLineup) as never,
      highlights,
    });
    await apiPut(`/api/admin/matches/${matchId}/ratings`, {
      ratings: results.map((r) => ({
        teamId: r.teamId,
        playerId: r.playerId,
        rating: r.calculatedRating,
        calculatedRating: r.calculatedRating,
      })),
    });
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateRating(ratingId: string, rating: number) {
  try {
    const clamped = Math.round(Math.min(10, Math.max(3, rating)) * 10) / 10;
    const row = await apiPatch<{ matchId: string }>(
      `/api/admin/ratings/${ratingId}`,
      { rating: clamped },
    );
    revalidatePath(`/admin/partidas/${row.matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteRatings(matchId: string) {
  try {
    await apiDelete(`/api/admin/matches/${matchId}/ratings`);
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
