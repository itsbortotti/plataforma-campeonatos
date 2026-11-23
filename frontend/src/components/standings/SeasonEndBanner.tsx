import { Trophy, Zap } from "lucide-react";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import type { Season, StandingsEntry, Team } from "@/lib/queries";

interface Props {
  season: Season;
  standings: StandingsEntry[];
}

/**
 * Shows the champion once the season has ended, or a "pending penalties" card
 * when points are tied at the top and the title will be decided in a shootout.
 */
export function SeasonEndBanner({ season, standings }: Props) {
  // Pending penalties: decided by penalties but no champion yet
  if (season.decidedByPenalties && !season.championTeamId) {
    if (standings.length < 2) return null;
    const topPoints = standings[0].points;
    const tied = standings.filter((s) => s.points === topPoints);
    return (
      <Card className="bg-amber-500/5 border-amber-500/30">
        <CardContent className="py-5 px-5 flex items-center gap-4">
          <Zap className="h-6 w-6 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Temporada encerrada
            </p>
            <p className="text-sm font-bold mt-0.5">
              Empate no topo - campeão será decidido nos pênaltis
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tied.map((row) => (
              <TeamBadge
                key={row.teamId}
                name={row.team.name}
                shortName={row.team.shortName}
                primaryColor={row.team.primaryColor}
                logoUrl={row.team.logoUrl}
                size="sm"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!season.championTeamId) return null;

  const champion: Team | null =
    standings.find((s) => s.teamId === season.championTeamId)?.team ?? null;
  if (!champion) return null;

  return (
    <Card className="bg-[var(--color-gold)]/5 border-[var(--color-gold)]/30">
      <CardContent className="py-5 px-5 flex items-center gap-4">
        <Trophy className="h-6 w-6 text-[var(--color-gold)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-gold)]">
            Campeão {season.name}
            {season.decidedByPenalties && (
              <span className="text-muted-foreground/60 ml-1">
                (nos pênaltis)
              </span>
            )}
          </p>
          <p className="text-base font-black mt-0.5 truncate">
            {champion.name}
          </p>
        </div>
        <TeamBadge
          name={champion.name}
          shortName={champion.shortName}
          primaryColor={champion.primaryColor}
          logoUrl={champion.logoUrl}
          size="lg"
        />
      </CardContent>
    </Card>
  );
}
