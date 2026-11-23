"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-server";

export type AddEventInput = {
  matchId: string;
  teamId: string;
  type: string;
  elapsedSeconds: number;
  playerId: string;
  assistPlayerId?: string;
  playerInId?: string;
  description?: string;
};

async function refresh(matchId: string) {
  revalidatePath(`/admin/partidas/${matchId}/live`);
  revalidatePath(`/admin/partidas/${matchId}`);
}

export async function startTimer(
  matchId: string,
  half: "first" | "second" | string,
) {
  try {
    const halfStartedAt = new Date().toISOString();
    await apiPatch(`/api/admin/matches/${matchId}/timer`, {
      isRunning: true,
      currentHalf: half,
      halfStartedAt,
    });
    if (half === "first") {
      await apiPatch(`/api/admin/matches/${matchId}`, { status: "live" });
    }
    await refresh(matchId);
    return {
      success: true as const,
      error: null as string | null,
      halfStartedAt,
      half,
    };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro ao iniciar cronômetro",
      halfStartedAt: null as string | null,
      half,
    };
  }
}

export async function stopTimer(matchId: string) {
  const detail = await apiGet<{
    timer: { elapsedSeconds: number; halfStartedAt: string | null; isRunning: boolean } | null;
  }>(`/api/matches/${matchId}`);
  let elapsed = detail.timer?.elapsedSeconds ?? 0;
  if (detail.timer?.isRunning && detail.timer.halfStartedAt) {
    elapsed += Math.floor(
      (Date.now() - new Date(detail.timer.halfStartedAt).getTime()) / 1000,
    );
  }
  await apiPatch(`/api/admin/matches/${matchId}/timer`, {
    isRunning: false,
    elapsedSeconds: elapsed,
    halfStartedAt: null,
  });
  await refresh(matchId);
}

export async function setHalftime(matchId: string) {
  await stopTimer(matchId);
  await apiPatch(`/api/admin/matches/${matchId}`, { status: "halftime" });
  await apiPatch(`/api/admin/matches/${matchId}/timer`, {
    currentHalf: "second",
    elapsedSeconds: 0,
  });
  await refresh(matchId);
}

export async function startSecondHalf(matchId: string) {
  try {
    await apiPatch(`/api/admin/matches/${matchId}`, { status: "live" });
    return await startTimer(matchId, "second");
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro ao iniciar 2º tempo",
      halfStartedAt: null as string | null,
      half: "second",
    };
  }
}

export async function endMatch(matchId: string) {
  try {
    await stopTimer(matchId);
    await apiPatch(`/api/admin/matches/${matchId}`, { status: "finished" });
    await refresh(matchId);
    return {
      success: true as const,
      error: null as string | null,
      season: {
        seasonEnded: false,
        decidedByPenalties: false,
        championTeamName: null as string | null,
      },
    };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
      season: {
        seasonEnded: false,
        decidedByPenalties: false,
        championTeamName: null as string | null,
      },
    };
  }
}

export async function addEvent(input: AddEventInput) {
  await apiPost(`/api/admin/matches/${input.matchId}/events`, {
    type: input.type,
    elapsedSeconds: input.elapsedSeconds,
    teamId: input.teamId,
    playerId: input.playerId,
    assistPlayerId: input.assistPlayerId ?? null,
    playerInId: input.playerInId ?? null,
    description: input.description ?? null,
  });

  // bump score for goals
  if (["goal", "penalty_goal", "own_goal"].includes(input.type)) {
    const detail = await apiGet<{
      match: {
        homeTeamId: string;
        awayTeamId: string;
        homeScore: number | null;
        awayScore: number | null;
      };
    }>(`/api/matches/${input.matchId}`);
    let home = detail.match.homeScore ?? 0;
    let away = detail.match.awayScore ?? 0;
    if (input.type === "own_goal") {
      if (input.teamId === detail.match.homeTeamId) away += 1;
      else home += 1;
    } else if (input.teamId === detail.match.homeTeamId) {
      home += 1;
    } else {
      away += 1;
    }
    await apiPatch(`/api/admin/matches/${input.matchId}`, {
      homeScore: home,
      awayScore: away,
    });
  }
  await refresh(input.matchId);
}

export async function removeEvent(matchId: string, eventId: string) {
  await apiDelete(`/api/admin/events/${eventId}`);
  await refresh(matchId);
}

export async function removePenaltyKick(matchId: string, kickId: string) {
  try {
    const detail = await apiGet<{
      penalties: Array<{
        id: string;
        teamId: string;
        playerId: string;
        scored: boolean;
        shootOrder: number;
      }>;
    }>(`/api/matches/${matchId}`);
    const kicks = detail.penalties
      .filter((k) => k.id !== kickId)
      .map((k) => ({
        teamId: k.teamId,
        playerId: k.playerId,
        scored: k.scored,
        shootOrder: k.shootOrder,
      }));
    await apiPut(`/api/admin/matches/${matchId}/penalties`, { kicks });
    await refresh(matchId);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function addPenaltyKick(input: {
  matchId: string;
  teamId: string;
  playerId: string;
  scored: boolean;
}) {
  try {
    const detail = await apiGet<{
      penalties: Array<{
        id: string;
        teamId: string;
        playerId: string;
        scored: boolean;
        shootOrder: number;
      }>;
    }>(`/api/matches/${input.matchId}`);
    const nextOrder =
      detail.penalties.reduce((m, k) => Math.max(m, k.shootOrder), 0) + 1;
    const kicks = [
      ...detail.penalties.map((k) => ({
        teamId: k.teamId,
        playerId: k.playerId,
        scored: k.scored,
        shootOrder: k.shootOrder,
      })),
      {
        teamId: input.teamId,
        playerId: input.playerId,
        scored: input.scored,
        shootOrder: nextOrder,
      },
    ];
    await apiPut(`/api/admin/matches/${input.matchId}/penalties`, { kicks });
    await refresh(input.matchId);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
