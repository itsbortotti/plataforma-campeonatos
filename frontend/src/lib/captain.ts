import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-server";

export interface CaptainInfo {
  readonly teamId: string;
  readonly playerId: string | null;
  readonly seasonId: string;
  readonly competitionId?: string;
  readonly scopeRole?: "captain" | "team_staff";
}

export async function getCaptainInfo(
  _client?: unknown,
): Promise<CaptainInfo | null> {
  try {
    return await apiGet<CaptainInfo>("/api/captain/me");
  } catch {
    return null;
  }
}

export async function requireCaptain(
  _client?: unknown,
): Promise<CaptainInfo> {
  try {
    await apiGet("/api/auth/me");
  } catch {
    redirect("/time/login");
  }
  const info = await getCaptainInfo();
  if (!info) redirect("/time/login?erro=sem-acesso");
  return info;
}
