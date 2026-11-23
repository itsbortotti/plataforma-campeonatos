import { apiGet } from "@/lib/api-server";

export interface MyPlayer {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
  readonly position: string;
  readonly photoUrl: string | null;
}

export async function getMyPlayer(_client?: unknown): Promise<MyPlayer | null> {
  try {
    const me = await apiGet<{
      player: {
        id: string;
        name: string;
        nickname: string;
        photoUrl: string | null;
      } | null;
    }>("/api/auth/me");
    if (!me.player) return null;
    return {
      id: me.player.id,
      name: me.player.name,
      nickname: me.player.nickname,
      position: "",
      photoUrl: me.player.photoUrl,
    };
  } catch {
    return null;
  }
}
