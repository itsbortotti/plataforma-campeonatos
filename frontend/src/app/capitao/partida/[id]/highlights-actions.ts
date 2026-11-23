"use server";

import { revalidatePath } from "next/cache";
import { apiGet, apiPut } from "@/lib/api-server";

type HighlightItems = {
  mvp: string;
  second: string | null;
  third: string | null;
};

async function myCaptainTeamId(): Promise<string | null> {
  try {
    const info = await apiGet<{ teamId: string }>("/api/captain/me");
    return info.teamId;
  } catch {
    return null;
  }
}

export async function saveCaptainHighlights(
  matchId: string,
  picks: HighlightItems,
) {
  try {
    const teamId = await myCaptainTeamId();
    if (!teamId) {
      return { success: false as const, error: "Não é capitão" };
    }
    const detail = await apiGet<{
      lineups: Array<{ playerId: string; teamId: string }>;
    }>(`/api/matches/${matchId}`);
    const teamOf = (playerId: string) =>
      detail.lineups.find((l) => l.playerId === playerId)?.teamId ?? teamId;

    const items: Array<{ slot: string; playerId: string; teamId: string }> = [
      { slot: "mvp", playerId: picks.mvp, teamId: teamOf(picks.mvp) },
    ];
    if (picks.second) {
      items.push({
        slot: "second",
        playerId: picks.second,
        teamId: teamOf(picks.second),
      });
    }
    if (picks.third) {
      items.push({
        slot: "third",
        playerId: picks.third,
        teamId: teamOf(picks.third),
      });
    }

    // Keep existing respect when rewriting own highlights
    const current = await apiGet<{
      highlights: Array<{
        slot: string;
        playerId: string;
        teamId: string;
        givenByTeamId?: string;
      }>;
    }>(`/api/matches/${matchId}`);
    for (const h of current.highlights ?? []) {
      if (h.slot === "respect" && h.givenByTeamId === teamId) {
        items.push({
          slot: "respect",
          playerId: h.playerId,
          teamId: h.teamId,
        });
      }
    }

    await apiPut(`/api/captain/matches/${matchId}/highlights`, { items });
    revalidatePath(`/capitao/partida/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function saveCaptainRespectPick(
  matchId: string,
  playerId: string | null,
) {
  try {
    const teamId = await myCaptainTeamId();
    if (!teamId) {
      return { success: false as const, error: "Não é capitão" };
    }
    const detail = await apiGet<{
      lineups: Array<{ playerId: string; teamId: string }>;
      highlights: Array<{
        slot: string;
        playerId: string;
        teamId: string;
        givenByTeamId?: string;
      }>;
    }>(`/api/matches/${matchId}`);

    const items: Array<{ slot: string; playerId: string; teamId: string }> = [];
    for (const h of detail.highlights ?? []) {
      if (h.givenByTeamId === teamId && h.slot !== "respect") {
        items.push({
          slot: h.slot,
          playerId: h.playerId,
          teamId: h.teamId,
        });
      }
    }
    if (playerId) {
      const oppTeamId =
        detail.lineups.find((l) => l.playerId === playerId)?.teamId ?? null;
      if (!oppTeamId) {
        return { success: false as const, error: "Jogador inválido" };
      }
      items.push({ slot: "respect", playerId, teamId: oppTeamId });
    }

    await apiPut(`/api/captain/matches/${matchId}/highlights`, { items });
    revalidatePath(`/capitao/partida/${matchId}`);
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
