import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getMatchById,
  getMatchEvents,
  getMatchOfficials,
  getMatchLineups,
  getMatchTimer,
  getShootoutState,
  getMatchRatings,
  type MatchStatus,
} from "@/lib/queries";
import { resolveCompetitionSlugForSeason } from "@/lib/competition-routes";
import { PublicMatchBoard } from "@/components/match/PublicMatchBoard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const roleLabel: Record<string, string> = {
  referee: "Árbitro",
  assistant_1: "Auxiliar 1",
  assistant_2: "Auxiliar 2",
  narrator: "Narrador",
};

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await getMatchById(null, id);
  if (!match) notFound();

  const [
    events,
    officials,
    homeLineup,
    awayLineup,
    timer,
    shootout,
    ratings,
    competitionSlug,
  ] = await Promise.all([
    getMatchEvents(null, match.id),
    getMatchOfficials(null, match.id),
    getMatchLineups(null, match.id, match.homeTeamId),
    getMatchLineups(null, match.id, match.awayTeamId),
    getMatchTimer(null, match.id),
    getShootoutState(null, match.seasonId),
    getMatchRatings(null, match.id),
    resolveCompetitionSlugForSeason(match.seasonId),
  ]);

  const showShootout = shootout && shootout.matchId === match.id;
  const calendarHref = competitionSlug
    ? `/campeonato/${competitionSlug}/calendario`
    : "/campeonatos";

  return (
    <div className="bg-background">
      <div className="border-b border-border/40 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-3">
          <Link
            href={calendarHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao calendário
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6 sm:py-8 space-y-6">
        <PublicMatchBoard
          match={match}
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          initialEvents={events}
          initialTimer={timer}
          initialStatus={match.status as MatchStatus}
          initialHomeScore={match.homeScore ?? 0}
          initialAwayScore={match.awayScore ?? 0}
          shootout={showShootout ? shootout : null}
          ratings={ratings}
          youtubeUrl={match.youtubeUrl}
        />

        {officials.length > 0 ? (
          <section className="rounded-2xl border border-border/50 bg-card/60 p-5 sm:p-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Arbitragem
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {officials.map((official, idx) => (
                <div key={`${official.role}-${idx}`} className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                    {roleLabel[official.role] ?? official.role}
                  </p>
                  <p className="text-sm font-semibold">{official.name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
