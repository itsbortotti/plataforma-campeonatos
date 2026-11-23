import { notFound } from "next/navigation";
import {
  getMatchById,
  getRosterForLineup,
  getMatchLineups,
  getMatchOfficials,
  getMatchRatings,
  getMatchEvents,
  getMatchSuspensions,
} from "@/lib/queries";
import { MatchDetailTabs } from "@/components/admin/MatchDetailTabs";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await getMatchById(null, id);
  if (!match) notFound();

  const [
    homeRoster,
    awayRoster,
    homeLineup,
    awayLineup,
    officials,
    ratings,
    events,
    suspensions,
  ] = await Promise.all([
    getRosterForLineup(null, match.seasonId, match.homeTeamId),
    getRosterForLineup(null, match.seasonId, match.awayTeamId),
    getMatchLineups(null, id, match.homeTeamId),
    getMatchLineups(null, id, match.awayTeamId),
    getMatchOfficials(null, id),
    getMatchRatings(null, id),
    getMatchEvents(null, id),
    getMatchSuspensions(null, id),
  ]);

  return (
    <MatchDetailTabs
      match={match}
      homeRoster={homeRoster?.players ?? []}
      awayRoster={awayRoster?.players ?? []}
      homeLineup={homeLineup}
      awayLineup={awayLineup}
      officials={officials}
      ratings={ratings}
      events={events}
      suspensions={suspensions}
    />
  );
}
