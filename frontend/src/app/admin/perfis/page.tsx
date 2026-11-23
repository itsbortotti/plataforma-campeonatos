import { apiGet } from "@/lib/api-server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProfilesAccessPage } from "@/components/admin/ProfilesAccessPage";

export default async function PerfisPage() {
  const rolePerms = await apiGet<{
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
  }>("/api/admin/role-permissions");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Perfis de acesso"
        description="Marque o que cada perfil pode fazer. Para criar usuário e vincular a um perfil, use Usuários."
      />
      <ProfilesAccessPage
        catalog={rolePerms.catalog}
        profiles={rolePerms.profiles}
        permissions={rolePerms.permissions}
      />
    </div>
  );
}
