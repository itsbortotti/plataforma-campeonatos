import {
  getCurrentSeason,
  getSeasons,
  getSeasonCardEntries,
  getSeasonCardResets,
} from "@/lib/queries";
import { CardsReport } from "@/components/admin/CardsReport";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function CartoesPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;

  const [seasons, currentSeason] = await Promise.all([
    getSeasons(null),
    getCurrentSeason(null),
  ]);

  const selectedId = seasonParam ?? currentSeason?.id;
  const season = seasons.find((s) => s.id === selectedId) ?? currentSeason;

  const [entries, resets] = season
    ? await Promise.all([
        getSeasonCardEntries(null, season.id),
        getSeasonCardResets(null, season.id),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cartões"
        description={
          season
            ? `${season.name} — quem está suspenso e quem acumula cartão.`
            : "Selecione a temporada no escopo do topo."
        }
      />
      <CardsReport
        entries={entries}
        resets={resets}
        seasonId={season?.id ?? ""}
        seasonName={season?.name ?? ""}
      />
    </div>
  );
}
