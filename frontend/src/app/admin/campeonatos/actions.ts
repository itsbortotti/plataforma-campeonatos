"use server";

import { revalidatePath } from "next/cache";
import { apiPatch, apiPost } from "@/lib/api-server";

type ActionState = { success: boolean; error: string | null };

function parseTieBreakers(raw: FormDataEntryValue | null): string[] | undefined {
  if (raw == null || raw === "") return undefined;
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function createCompetition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!name || !slug) {
      return { success: false, error: "Nome e slug são obrigatórios" };
    }
    await apiPost("/api/competitions", {
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      isActive: formData.get("isActive") !== "false",
      format: String(formData.get("format") ?? "league"),
      tieBreakers: parseTieBreakers(formData.get("tieBreakers")),
      pointsWin: Number(formData.get("pointsWin") ?? 3),
      pointsDraw: Number(formData.get("pointsDraw") ?? 1),
      yellowCardLimit: Number(formData.get("yellowCardLimit") ?? 3),
      redSuspensionGames: Number(formData.get("redSuspensionGames") ?? 1),
    });
    revalidatePath("/admin/campeonatos");
    revalidatePath("/campeonatos");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao criar campeonato",
    };
  }
}

export async function updateCompetition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return { success: false, error: "ID obrigatório" };
    await apiPatch(`/api/competitions/${id}`, {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      isActive: formData.get("isActive") === "true",
      format: String(formData.get("format") ?? "league"),
      tieBreakers: parseTieBreakers(formData.get("tieBreakers")),
      pointsWin: Number(formData.get("pointsWin") ?? 3),
      pointsDraw: Number(formData.get("pointsDraw") ?? 1),
      yellowCardLimit: Number(formData.get("yellowCardLimit") ?? 3),
      redSuspensionGames: Number(formData.get("redSuspensionGames") ?? 1),
    });
    revalidatePath("/admin/campeonatos");
    revalidatePath("/campeonatos");
    revalidatePath("/");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao salvar campeonato",
    };
  }
}
