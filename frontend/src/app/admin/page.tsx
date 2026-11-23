import {
  getCurrentSeason,
  getMatches,
  getSeasons,
  getCompetitions,
} from "@/lib/queries";
import { AdminHome } from "@/components/admin/AdminHome";

export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const [seasons, currentSeason, competitions] = await Promise.all([
    getSeasons(null),
    getCurrentSeason(null),
    getCompetitions({ all: true }).catch(() => getCompetitions()),
  ]);
  const season =
    seasons.find((s) => s.id === seasonParam) ?? currentSeason ?? null;
  const matches = season ? await getMatches(null, season.id) : [];

  const liveMatches = matches.filter(
    (m) => m.status === "live" || m.status === "halftime",
  );
  const upcomingMatches = matches
    .filter((m) => m.status === "scheduled" || m.status === "lineups_set")
    .sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return da - db || a.round - b.round;
    })
    .slice(0, 8);

  const matchStats = {
    total: matches.length,
    scheduled: matches.filter((m) => m.status === "scheduled").length,
    ready: matches.filter((m) => m.status === "lineups_set").length,
    live: liveMatches.length,
    finished: matches.filter(
      (m) =>
        m.status === "finished" ||
        m.status === "awarded" ||
        m.status === "abandoned",
    ).length,
  };

  return (
    <AdminHome
      season={season}
      competitions={competitions}
      liveMatches={liveMatches}
      upcomingMatches={upcomingMatches}
      matchStats={matchStats}
      seasonQuery={seasonParam ?? ""}
    />
  );
}
