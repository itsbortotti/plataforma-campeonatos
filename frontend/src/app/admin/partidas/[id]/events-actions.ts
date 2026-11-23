"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-server";

export async function createEvent(
  matchId: string,
  fields: Record<string, unknown>,
) {
  await apiPost(`/api/admin/matches/${matchId}/events`, fields);
  revalidatePath(`/admin/partidas/${matchId}`);
}

export async function updateEvent(
  matchId: string,
  eventId: string,
  fields: Record<string, unknown>,
) {
  await apiPatch(`/api/admin/events/${eventId}`, fields);
  revalidatePath(`/admin/partidas/${matchId}`);
}

export async function deleteEvent(matchId: string, eventId: string) {
  await apiDelete(`/api/admin/events/${eventId}`);
  revalidatePath(`/admin/partidas/${matchId}`);
}

export type MatchEventInput = {
  matchId: string;
  teamId: string;
  type: string;
  elapsedSeconds: number;
  playerId: string;
  assistPlayerId?: string | null;
  playerInId?: string | null;
  description?: string | null;
};

export async function createMatchEvent(input: MatchEventInput) {
  try {
    await apiPost(`/api/admin/matches/${input.matchId}/events`, {
      type: input.type,
      elapsedSeconds: input.elapsedSeconds,
      teamId: input.teamId,
      playerId: input.playerId,
      assistPlayerId: input.assistPlayerId ?? null,
      playerInId: input.playerInId ?? null,
      description: input.description ?? null,
    });
    revalidatePath(`/admin/partidas/${input.matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateMatchEvent(
  eventId: string,
  input: MatchEventInput,
) {
  try {
    await apiPatch(`/api/admin/events/${eventId}`, {
      type: input.type,
      elapsedSeconds: input.elapsedSeconds,
      teamId: input.teamId,
      playerId: input.playerId,
      assistPlayerId: input.assistPlayerId ?? null,
      playerInId: input.playerInId ?? null,
      description: input.description ?? null,
    });
    revalidatePath(`/admin/partidas/${input.matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteMatchEvent(matchId: string, eventId: string) {
  try {
    await apiDelete(`/api/admin/events/${eventId}`);
    revalidatePath(`/admin/partidas/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
