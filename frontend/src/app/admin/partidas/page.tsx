import {
  getCurrentSeason,
  getSeasons,
  getMatches,
  getTeams,
  getCompetitions,
} from "@/lib/queries";
import { MatchesTable } from "@/components/admin/MatchesTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GenerateFixturesButton } from "@/components/admin/GenerateFixturesButton";

export default async function PartidasPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;

  const [seasons, currentSeason, teams, competitions] = await Promise.all([
    getSeasons(null),
    getCurrentSeason(null),
    getTeams(null),
    getCompetitions(),
  ]);

  const selectedId = seasonParam ?? currentSeason?.id;
  const season = seasons.find((s) => s.id === selectedId) ?? currentSeason;
  const competition = season?.competitionId
    ? competitions.find((c) => c.id === season.competitionId)
    : null;

  const matches = season ? await getMatches(null, season.id) : [];

  const seasonLabel = season
    ? `${competition?.name ? `${competition.name} · ` : ""}${season.name}`
    : "Nenhuma temporada selecionada";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Partidas"
        description={
          season
            ? `${seasonLabel} — prepare escalações, libere e inicie a súmula.`
            : "Selecione campeonato e temporada no escopo do topo."
        }
        actions={
          season ? (
            <GenerateFixturesButton
              seasonId={season.id}
              teams={teams}
              format={competition?.format ?? "league"}
            />
          ) : null
        }
      />
      <MatchesTable
        matches={matches}
        teams={teams}
        seasonId={season?.id ?? ""}
      />
    </div>
  );
}
