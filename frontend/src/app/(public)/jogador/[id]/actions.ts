"use server";

import { revalidatePath } from "next/cache";
import { apiPatch } from "@/lib/api-server";

export async function updateMyPlayerProfile(fields: {
  nickname: string;
  photoUrl?: string | null;
}) {
  await apiPatch("/api/me/player", fields);
  revalidatePath("/jogador");
}

export async function updateMyProfile(
  nickname: string,
  photoUrl: string | null,
) {
  try {
    await apiPatch("/api/me/player", {
      nickname,
      photoUrl,
    });
    revalidatePath("/jogador");
    return { success: true as const };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
    };
  }
}
