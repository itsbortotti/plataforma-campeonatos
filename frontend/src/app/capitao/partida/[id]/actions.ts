"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-server";
import type { SaveResult } from "@/components/lineup/TeamLineupEditor";

export async function saveCaptainLineup(
  matchId: string,
  entries: Array<{
    playerId: string;
    shirtNumber: number;
    status: "starter" | "substitute";
    positionIndex?: number | null;
  }>,
  formation?: string | null,
): Promise<SaveResult> {
  try {
    await apiPut(`/api/captain/matches/${matchId}/lineup`, {
      entries,
      formation: formation ?? undefined,
    });
    revalidatePath(`/capitao/partida/${matchId}`);
    revalidatePath("/capitao");
    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erro ao salvar escalação",
    };
  }
}
