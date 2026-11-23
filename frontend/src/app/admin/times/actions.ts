"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-server";

type ActionState = { success: boolean; error: string | null };

export async function createTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await apiPost("/api/admin/teams", {
      name: String(formData.get("name") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      primaryColor: String(formData.get("primaryColor") ?? "#000000"),
      secondaryColor: String(formData.get("secondaryColor") ?? "#ffffff"),
      logoUrl: String(formData.get("logoUrl") ?? "") || null,
    });
    revalidatePath("/admin/times");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function updateTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    await apiPatch(`/api/admin/teams/${id}`, {
      name: String(formData.get("name") ?? ""),
      shortName: String(formData.get("shortName") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      primaryColor: String(formData.get("primaryColor") ?? "#000000"),
      secondaryColor: String(formData.get("secondaryColor") ?? "#ffffff"),
      logoUrl: String(formData.get("logoUrl") ?? "") || null,
    });
    revalidatePath("/admin/times");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}

export async function deleteTeam(id: string, _reason?: string) {
  try {
    await apiDelete(`/api/admin/teams/${id}`);
    revalidatePath("/admin/times");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
