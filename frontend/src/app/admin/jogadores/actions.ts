"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-server";

type ActionState = { success: boolean; error: string | null };

function playerFieldsFromForm(formData: FormData) {
  const teamRaw = String(formData.get("teamId") ?? "");
  const numberRaw = String(formData.get("number") ?? "");
  const photoRaw = String(formData.get("photoUrl") ?? "");
  return {
    name: String(formData.get("name") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    position: String(formData.get("position") ?? "MEI"),
    photoUrl: photoRaw || null,
    email: String(formData.get("email") ?? "") || null,
    isActive: formData.get("isActive") !== "false",
    seasonId: String(formData.get("seasonId") ?? "") || undefined,
    teamId: teamRaw && teamRaw !== "none" ? teamRaw : null,
    number: numberRaw ? Number(numberRaw) : null,
    isCaptain: formData.get("isCaptain") === "true",
    userId:
      String(formData.get("userId") ?? "") !== "none"
        ? String(formData.get("userId") ?? "") || null
        : null,
  };
}

export async function createPlayer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const fields = playerFieldsFromForm(formData);
    const player = await apiPost<{ id: string }>("/api/admin/players", fields);
    if (fields.seasonId) {
      await apiPost("/api/admin/rosters", {
        seasonId: fields.seasonId,
        playerId: player.id,
        teamId: fields.teamId,
        number: fields.number,
        isCaptain: fields.isCaptain,
      });
    }
    revalidatePath("/admin/jogadores");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updatePlayer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    const fields = playerFieldsFromForm(formData);
    await apiPatch(`/api/admin/players/${id}`, fields);
    if (fields.seasonId) {
      await apiPost("/api/admin/rosters", {
        seasonId: fields.seasonId,
        playerId: id,
        teamId: fields.teamId,
        number: fields.number,
        isCaptain: fields.isCaptain,
      });
    }
    revalidatePath("/admin/jogadores");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deletePlayer(id: string, _reason?: string) {
  try {
    await apiDelete(`/api/admin/players/${id}`);
    revalidatePath("/admin/jogadores");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function addExistingPlayerToSeason(fields: {
  seasonId: string;
  playerId: string;
  teamId: string | null;
  number?: number | null;
  isCaptain?: boolean;
}) {
  await apiPost("/api/admin/rosters", fields);
  revalidatePath("/admin/jogadores");
}

export async function removePlayerFromSeason(
  playerIdOrRosterId: string,
  seasonId?: string,
  _reason?: string,
) {
  try {
    if (seasonId) {
      const rows = await apiGet<Array<{ id: string; playerId: string }>>(
        `/api/admin/seasons/${seasonId}/rosters`,
      );
      const row = rows.find((r) => r.playerId === playerIdOrRosterId);
      if (!row) {
        return { success: false as const, error: "Elenco não encontrado" };
      }
      await apiDelete(`/api/admin/rosters/${row.id}`);
    } else {
      await apiDelete(`/api/admin/rosters/${playerIdOrRosterId}`);
    }
    revalidatePath("/admin/jogadores");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function setPlayerActive(id: string, isActive: boolean) {
  try {
    await apiPatch(`/api/admin/players/${id}`, { isActive });
    revalidatePath("/admin/jogadores");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function addPlayerToRoster(
  _prev: { success: boolean; error: string | null },
  formData: FormData,
) {
  try {
    const playerId = String(formData.get("playerId") || "");
    const seasonId = String(formData.get("seasonId") || "");
    const teamRaw = String(formData.get("teamId") || "");
    const numberRaw = String(formData.get("number") || "");
    await apiPost("/api/admin/rosters", {
      seasonId,
      playerId,
      teamId: teamRaw || null,
      number: numberRaw ? Number(numberRaw) : null,
      isCaptain: false,
    });
    revalidatePath("/admin/jogadores");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function copyRosterFromSeason(
  fromSeasonId: string,
  toSeasonId: string,
) {
  try {
    const res = await apiPost<{ copied: number }>("/api/admin/rosters/copy", {
      fromSeasonId,
      toSeasonId,
    });
    revalidatePath("/admin/jogadores");
    return {
      success: true as const,
      copied: res.copied,
      skipped: 0,
      total: res.copied,
    };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
      copied: 0,
      skipped: 0,
      total: 0,
    };
  }
}
