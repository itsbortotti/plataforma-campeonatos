import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { ProfileClient } from "./ProfileClient";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
  player: {
    id: string;
    nickname: string;
    photoUrl: string | null;
    name: string;
  } | null;
  memberships: Array<{
    id: string;
    role: string;
    competitionId: string;
    competitionSlug: string;
    competitionName: string;
    teamId: string | null;
    teamName: string | null;
  }>;
};

export default async function PerfilPage() {
  let me: MeResponse;
  try {
    me = await apiGet("/api/auth/me");
  } catch {
    redirect("/login?next=/perfil");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Conta, papéis e vínculos nos campeonatos.
        </p>
      </div>
      <ProfileClient
        user={me.user}
        player={me.player}
        memberships={me.memberships ?? []}
      />
    </div>
  );
}
