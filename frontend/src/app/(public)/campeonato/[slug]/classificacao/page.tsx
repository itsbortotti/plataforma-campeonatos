import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, HandHelping } from "lucide-react";
import {
  getCompetitionBySlug,
  getCurrentSeason,
  getStandings,
  getTopScorers,
  getTopAssists,
  getTotalRounds,
  hasOtherOngoingSeason,
} from "@/lib/queries";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { PlayerStatsList } from "@/components/standings/PlayerStatsList";
import { SeasonEndBanner } from "@/components/standings/SeasonEndBanner";
import { SeasonRealtimeRefresh } from "@/components/SeasonRealtimeRefresh";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition = await getCompetitionBySlug(slug);
  const name = competition?.name ?? "Campeonato";
  return pageMetadata({
    title: `Classificação · ${name}`,
    description: `Tabela de pontos, artilharia e assistências de ${name}.`,
    path: `/campeonato/${slug}/classificacao`,
    image: `/og/classificacao/${slug}`,
  });
}

const TIE_BREAKER_LABEL: Record<string, string> = {
  points: "pontos",
  wins: "vitórias",
  goalDifference: "saldo de gols",
  goalsFor: "gols pró",
  headToHead: "confronto direto",
  name: "nome",
};

export default async function CompetitionClassificacaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const season = await getCurrentSeason(null, { competitionSlug: slug });
  if (!season) return <p>Nenhuma temporada ativa.</p>;

  const [
    standings,
    topScorers,
    topAssists,
    otherSeasonOngoing,
    totalRounds,
    competition,
  ] = await Promise.all([
    getStandings(null, season.id),
    getTopScorers(null, season.id, 100),
    getTopAssists(null, season.id, 100),
    hasOtherOngoingSeason(null, season.id),
    getTotalRounds(null, season.id),
    getCompetitionBySlug(slug),
  ]);
  const tieLabels = (competition?.tieBreakers ?? [])
    .map((k) => TIE_BREAKER_LABEL[k] ?? k)
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-4 sm:space-y-8">
      <SeasonRealtimeRefresh seasonId={season.id} />
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Classificação
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          {season.name} - {season.year}
        </p>
      </div>

      {(season.championTeamId || season.decidedByPenalties) &&
        !otherSeasonOngoing && (
          <SeasonEndBanner season={season} standings={standings} />
        )}

      {/* Tabela de pontos */}
      <Card className="card-glow bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-0 px-3 sm:px-6">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-[var(--color-gold)]" />
            Tabela de Pontos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 px-3 sm:px-6">
          <StandingsTable
            seasonId={season.id}
            initialStandings={standings}
            seasonLabel={`${season.name} - ${season.year}`}
          />
          <p className="text-[10px] text-muted-foreground/50 mt-4 px-1">
            {tieLabels.length > 0
              ? `Desempate: ${tieLabels.join(", ")}. `
              : ""}
            Em caso de empate ao final das {totalRounds} rodadas, o campeão
            pode ser decidido nos pênaltis.
          </p>
        </CardContent>
      </Card>

      {/* Estatísticas individuais */}
      <Card className="card-glow bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <Tabs defaultValue="artilharia">
            <TabsList className="w-full bg-accent/50">
              <TabsTrigger
                value="artilharia"
                className="flex-1 gap-1.5 text-xs"
              >
                <Zap className="h-3.5 w-3.5" /> Artilharia
              </TabsTrigger>
              <TabsTrigger
                value="assistencias"
                className="flex-1 gap-1.5 text-xs"
              >
                <HandHelping className="h-3.5 w-3.5" /> Assistências
              </TabsTrigger>
            </TabsList>

            <TabsContent value="artilharia" className="mt-4 sm:mt-6">
              <PlayerStatsList
                seasonId={season.id}
                type="goals"
                initialStats={topScorers}
                limit={100}
                seasonLabel={`${season.name} - ${season.year}`}
              />
            </TabsContent>

            <TabsContent value="assistencias" className="mt-4 sm:mt-6">
              <PlayerStatsList
                seasonId={season.id}
                type="assists"
                initialStats={topAssists}
                limit={100}
                seasonLabel={`${season.name} - ${season.year}`}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
