"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-server";

export async function saveRolePermissions(
  role: "owner" | "league_admin" | "team_staff" | "captain",
  capabilities: Record<string, boolean>,
) {
  try {
    const data = await apiPut<{
      catalog: Array<{
        id: string;
        label: string;
        group: "liga" | "partida" | "time" | "sistema";
      }>;
      profiles: Record<
        string,
        { label: string; description: string; needsTeam: boolean }
      >;
      permissions: Record<string, Record<string, boolean>>;
    }>(`/api/admin/role-permissions/${role}`, { capabilities });
    revalidatePath("/admin/perfis");
    return { success: true as const, data };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
      data: null,
    };
  }
}
