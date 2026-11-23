"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-server";

type ActionState = { success: boolean; error: string | null };

export async function createSeason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const competitionId = String(formData.get("competitionId") ?? "");
    if (!competitionId) {
      return { success: false, error: "Campeonato obrigatório" };
    }
    await apiPost("/api/admin/seasons", {
      competitionId,
      name: String(formData.get("name") ?? ""),
      year: Number(formData.get("year")),
      isCurrent: formData.get("isCurrent") === "true",
    });
    revalidatePath("/admin/temporadas");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateSeason(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    const championRaw = String(formData.get("championTeamId") ?? "none");
    await apiPatch(`/api/admin/seasons/${id}`, {
      name: String(formData.get("name") ?? ""),
      year: Number(formData.get("year")),
      isCurrent: formData.get("isCurrent") === "true",
      decidedByPenalties: formData.get("decidedByPenalties") === "true",
      championTeamId: championRaw === "none" ? null : championRaw,
    });
    revalidatePath("/admin/temporadas");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteSeason(id: string, _reason?: string) {
  try {
    await apiDelete(`/api/admin/seasons/${id}`);
    revalidatePath("/admin/temporadas");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function copyRoster(fromSeasonId: string, toSeasonId: string) {
  await apiPost("/api/admin/rosters/copy", { fromSeasonId, toSeasonId });
  revalidatePath("/admin/jogadores");
}

export async function setCurrentSeason(id: string) {
  try {
    await apiPatch(`/api/admin/seasons/${id}`, { isCurrent: true });
    revalidatePath("/admin/temporadas");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
