"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPost } from "@/lib/api-server";

export async function resetPlayerCards(_seasonId: string, _playerId: string) {
  revalidatePath("/admin/cartoes");
  return { ok: true, skipped: true };
}

export async function resolvePlayerCards(playerId: string, seasonId: string) {
  try {
    await apiPost(`/api/admin/seasons/${seasonId}/card-resets`, {
      playerId,
      reason: "Cumpriu suspensão / zera acumulação",
    });
    revalidatePath("/admin/cartoes");
    return {
      success: true as const,
      skipped: false,
      playerId,
      seasonId,
      error: null as string | null,
    };
  } catch (e) {
    return {
      success: false as const,
      skipped: false,
      playerId,
      seasonId,
      error: e instanceof Error ? e.message : "Erro ao resetar cartões",
    };
  }
}

export async function undoLastCardReset(resetId: string) {
  try {
    await apiDelete(`/api/admin/card-resets/${resetId}`);
    revalidatePath("/admin/cartoes");
    return {
      success: true as const,
      skipped: false,
      resetId,
      error: null as string | null,
    };
  } catch (e) {
    return {
      success: false as const,
      skipped: false,
      resetId,
      error: e instanceof Error ? e.message : "Erro ao desfazer",
    };
  }
}
