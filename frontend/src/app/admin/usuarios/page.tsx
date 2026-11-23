import { Suspense } from "react";
import { apiGet } from "@/lib/api-server";
import { getCompetitions, getTeams } from "@/lib/queries";
import { UsersList, type UserRow } from "@/components/admin/UsersList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  buildListQuery,
  parseListSearchParams,
  type Paginated,
} from "@/lib/pagination";

type ApiUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  player: { id: string; nickname: string; name: string } | null;
  memberships: Array<{
    id: string;
    role: string;
    competitionId: string;
    competitionName: string;
    teamId: string | null;
    teamName: string | null;
  }>;
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, pageSize, q } = parseListSearchParams(sp);
  const qs = buildListQuery({ page, pageSize, q });

  const [data, competitions, teams] = await Promise.all([
    apiGet<Paginated<ApiUser>>(`/api/admin/users?${qs}`).catch(
      () =>
        ({
          items: [],
          total: 0,
          page: 1,
          pageSize,
          pageCount: 1,
          hasNext: false,
          hasPrev: false,
        }) satisfies Paginated<ApiUser>,
    ),
    getCompetitions(),
    getTeams(),
  ]);

  const rows: UserRow[] = data.items.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName ?? u.email.split("@")[0],
    isAdmin: u.role === "admin",
    playerId: u.player?.id ?? null,
    playerNickname: u.player?.nickname ?? null,
    memberships: u.memberships ?? [],
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Usuários"
        description="Crie a conta e escolha o perfil de acesso. Perfis de time pedem o time; perfis da liga não."
      />
      <Suspense fallback={null}>
        <UsersList
          users={rows}
          competitions={competitions.map((c) => ({ id: c.id, name: c.name }))}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          pageSize={data.pageSize}
        />
      </Suspense>
    </div>
  );
}
