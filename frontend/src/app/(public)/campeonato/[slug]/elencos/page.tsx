import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import {
  getCurrentSeason,
  getRosters,
  getTopScorers,
  getTopAssists,
} from "@/lib/queries";
import type { Position } from "@/types";

const positionColor: Record<Position, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

const positionOrder: readonly Position[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

export default async function CompetitionElencosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const season = await getCurrentSeason(null, { competitionSlug: slug });
  if (!season) return <p>Nenhuma temporada ativa.</p>;

  const [rosters, scorers, assists] = await Promise.all([
    getRosters(null, season.id),
    getTopScorers(null, season.id, 100),
    getTopAssists(null, season.id, 100),
  ]);

  const goalsByPlayer = new Map(scorers.map((s) => [s.playerId, s.goals]));
  const assistsByPlayer = new Map(assists.map((s) => [s.playerId, s.assists]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-4 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Elencos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          {season.name} - {season.year}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {rosters
          .filter((roster) => roster.team)
          .map((roster) => {
          const team = roster.team!;
          const sortedPlayers = [...roster.players].sort(
            (a, b) =>
              positionOrder.indexOf(a.position as Position) -
              positionOrder.indexOf(b.position as Position),
          );

          return (
            <Card
              key={roster.teamId || team.id}
              className="card-glow bg-card/80 backdrop-blur-sm overflow-hidden py-0 gap-0"
            >
              <div
                className="px-6 py-5"
                style={{
                  background: `linear-gradient(135deg, ${team.primaryColor}15 0%, transparent 100%)`,
                  borderBottom: `1px solid ${team.primaryColor}20`,
                }}
              >
                <div className="flex items-center gap-4">
                  <TeamBadge
                    name={team.name}
                    shortName={team.shortName}
                    primaryColor={team.primaryColor}
                    logoUrl={team.logoUrl}
                    size="lg"
                  />
                  <div>
                    <p className="text-xl font-black">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {roster.players.length} jogadores
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="pt-4 pb-4">
                <div className="space-y-1">
                  {sortedPlayers.map((player) => {
                    const goals = goalsByPlayer.get(player.id) ?? 0;
                    const playerAssists = assistsByPlayer.get(player.id) ?? 0;

                    return (
                      <Link
                        key={player.id}
                        href={`/jogador/${player.id}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white"
                            style={{
                              background: `linear-gradient(135deg, ${team.primaryColor} 0%, ${team.primaryColor}BB 100%)`,
                            }}
                          >
                            {player.number}
                          </span>
                          <div>
                            <p className="font-semibold text-sm leading-tight">
                              {player.nickname}
                            </p>
                            <p className="text-[11px] text-muted-foreground/60">
                              {player.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {goals > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {goals}G
                            </Badge>
                          )}
                          {playerAssists > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {playerAssists}A
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${positionColor[player.position as Position] ?? ""}`}
                          >
                            {player.position}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
