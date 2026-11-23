"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-server";

type ActionState = { success: boolean; error: string | null };

function matchPayload(formData: FormData) {
  const isWalkover = formData.get("isWalkover") === "true";
  const awardedToTeamId = String(formData.get("awardedToTeamId") ?? "") || null;
  return {
    seasonId: String(formData.get("seasonId") ?? ""),
    round: Number(formData.get("round")),
    date: String(formData.get("date") ?? ""),
    homeTeamId: String(formData.get("homeTeamId") ?? ""),
    awayTeamId: String(formData.get("awayTeamId") ?? ""),
    youtubeUrl: String(formData.get("youtubeUrl") ?? "") || null,
    status: String(formData.get("status") ?? "scheduled"),
    phase: String(formData.get("phase") ?? "league"),
    groupName: String(formData.get("groupName") ?? "") || null,
    knockoutLabel: String(formData.get("knockoutLabel") ?? "") || null,
    leg: Number(formData.get("leg") ?? 1),
    isWalkover,
    awardedToTeamId: isWalkover ? awardedToTeamId : null,
  };
}

export async function createMatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await apiPost("/api/admin/matches", matchPayload(formData));
    revalidatePath("/admin/partidas");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateMatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    await apiPatch(`/api/admin/matches/${id}`, matchPayload(formData));
    revalidatePath("/admin/partidas");
    revalidatePath(`/admin/partidas/${id}`);
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function generateFixtures(input: {
  seasonId: string;
  teamIds: string[];
  double?: boolean;
  replaceScheduled?: boolean;
  groupName?: string | null;
  startDate?: string;
}) {
  try {
    const res = await apiPost<{ created: number; matchIds: string[] }>(
      `/api/admin/seasons/${input.seasonId}/generate-fixtures`,
      {
        teamIds: input.teamIds,
        double: input.double ?? false,
        replaceScheduled: input.replaceScheduled ?? false,
        groupName: input.groupName ?? null,
        startDate: input.startDate,
      },
    );
    revalidatePath("/admin/partidas");
    return { success: true as const, created: res.created };
  } catch (e) {
    return {
      success: false as const,
      created: 0,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteMatch(id: string, _reason?: string) {
  try {
    await apiDelete(`/api/admin/matches/${id}`);
    revalidatePath("/admin/partidas");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
