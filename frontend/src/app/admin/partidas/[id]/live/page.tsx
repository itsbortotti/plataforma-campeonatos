import { notFound } from "next/navigation";
import {
  getMatchById,
  getMatchLineups,
  getMatchEvents,
  getMatchTimer,
  getPenaltyShootout,
  getTiedTopTeams,
  getRoster,
  getSeasons,
  type RosterWithPlayers,
  type Season,
} from "@/lib/queries";
import { MatchLive } from "@/components/admin/MatchLive";

export default async function MatchLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await getMatchById(null, id);
  if (!match) notFound();

  const [homeLineup, awayLineup, events, timer, shootout, seasons] =
    await Promise.all([
      getMatchLineups(null, id, match.homeTeamId),
      getMatchLineups(null, id, match.awayTeamId),
      getMatchEvents(null, id),
      getMatchTimer(null, id),
      getPenaltyShootout(null, id),
      getSeasons(null),
    ]);

  const season: Season | null =
    seasons.find((s) => s.id === match.seasonId) ?? null;

  const tiedTeams = season?.decidedByPenalties
    ? await getTiedTopTeams(null, match.seasonId)
    : [];

  const tiedRosters: RosterWithPlayers[] = (
    await Promise.all(
      tiedTeams.map((entry) => getRoster(null, match.seasonId, entry.teamId)),
    )
  ).filter((r): r is RosterWithPlayers => r !== null);

  const timerRow = timer
    ? {
        match_id: id,
        elapsed_seconds: timer.elapsedSeconds,
        is_running: timer.isRunning,
        half_started_at: timer.halfStartedAt,
        current_half: timer.currentHalf,
      }
    : null;

  return (
    <MatchLive
      match={match}
      homeLineup={homeLineup ?? []}
      awayLineup={awayLineup ?? []}
      initialEvents={events}
      initialTimer={timerRow}
      initialStatus={
        match.status as
          | "scheduled"
          | "lineups_set"
          | "live"
          | "halftime"
          | "finished"
          | "postponed"
      }
      initialShootout={shootout}
      season={season}
      tiedTeams={tiedTeams}
      tiedRosters={tiedRosters}
    />
  );
}
