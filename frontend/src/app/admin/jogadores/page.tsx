import {
  getCurrentSeason,
  getSeasons,
  getPlayersWithRoster,
  getAvailablePlayersForSeason,
  getTeams,
  getAuthUsers,
} from "@/lib/queries";
import { PlayersTable } from "@/components/admin/PlayersTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;

  const [seasons, currentSeason, teams, authUsers] = await Promise.all([
    getSeasons(null),
    getCurrentSeason(null),
    getTeams(null),
    getAuthUsers(null),
  ]);

  const selectedId = seasonParam ?? currentSeason?.id;
  const season = seasons.find((s) => s.id === selectedId) ?? currentSeason;

  const [players, availablePlayers] = season
    ? await Promise.all([
        getPlayersWithRoster(null, season.id),
        getAvailablePlayersForSeason(null, season.id),
      ])
    : [[], []];

  const otherSeasons = seasons.filter((s) => s.id !== season?.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Jogadores"
        description={
          season
            ? `Elenco da temporada ${season.name}.`
            : "Selecione uma temporada no header para ver o elenco."
        }
      />
      <PlayersTable
        players={players}
        availablePlayers={availablePlayers}
        teams={teams}
        authUsers={authUsers}
        seasonId={season?.id ?? ""}
        seasonName={season?.name ?? ""}
        otherSeasons={otherSeasons}
      />
    </div>
  );
}
