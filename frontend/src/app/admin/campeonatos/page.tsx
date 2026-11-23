import { apiGet } from "@/lib/api-server";
import { CompetitionsTable } from "@/components/admin/CompetitionsTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Competition } from "@/lib/queries";

export default async function AdminCampeonatosPage() {
  const competitions = await apiGet<Competition[]>("/api/competitions?all=1");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campeonatos"
        description="Cada campeonato tem temporadas. Entre num campeonato, escolha a temporada e opere partidas no escopo do topo."
      />
      <CompetitionsTable competitions={competitions} />
    </div>
  );
}
