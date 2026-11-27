import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { TeamBadge } from "@/components/TeamBadge";
import {
  getCurrentSeason,
  getStandings,
  getNextMatch,
  getRecentMatches,
  getTopScorers,
  getFinishedMatchCount,
  getLiveMatch,
  getShootoutState,
  getTotalRounds,
  hasOtherOngoingSeason,
  getCompetitionBySlug,
} from "@/lib/queries";
import { LiveMatchHero } from "@/components/match/LiveMatchHero";
import { PenaltyScoreboard } from "@/components/match/PenaltyScoreboard";
import { HomeStandingsList } from "@/components/standings/HomeStandingsList";
import { HomeTopScorersList } from "@/components/standings/HomeTopScorersList";
import { SeasonEndBanner } from "@/components/standings/SeasonEndBanner";
import { SeasonRealtimeRefresh } from "@/components/SeasonRealtimeRefresh";
import { VenueLink } from "@/components/VenueLink";
import { formatDate } from "@/lib/format-date";
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
    title: name,
    description:
      competition?.description ||
      `Tabela, calendário, elencos e artilharia de ${name}.`,
    path: `/campeonato/${slug}`,
  });
}

const sponsors = [
  { name: "Sr. e Sra. Docinho", logo: "/patrocinadores/docinho.png", href: null },
  { name: "L3M'S Utilitários", logo: "/patrocinadores/l3ms.jpeg", href: null },
  {
    name: "Altivon",
    logo: "/patrocinadores/altivon.png",
    href: "https://www.altivon.com.br",
  },
  {
    name: "GarageFlow",
    logo: "/patrocinadores/garageflow.png",
    href: "https://garageflow.altivon.com.br",
  },
  {
    name: "Operatta",
    logo: "/patrocinadores/operatta.png",
    href: "https://chatflow-web.onrender.com",
  },
] as const;

export default async function CompetitionHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [competition, season] = await Promise.all([
    getCompetitionBySlug(slug),
    getCurrentSeason(null, { competitionSlug: slug }),
  ]);
  if (!season) return <p>Nenhuma temporada ativa neste campeonato.</p>;

  const [
    standings,
    liveMatch,
    shootout,
    nextMatch,
    recentMatches,
    topScorers,
    finishedCount,
    otherSeasonOngoing,
    totalRounds,
  ] = await Promise.all([
    getStandings(null, season.id),
    getLiveMatch(null, season.id),
    getShootoutState(null, season.id),
    getNextMatch(null, season.id),
    getRecentMatches(null, season.id, 5),
    getTopScorers(null, season.id, 5),
    getFinishedMatchCount(null, season.id),
    hasOtherOngoingSeason(null, season.id),
    getTotalRounds(null, season.id),
  ]);

  return (
    <div>
      <SeasonRealtimeRefresh seasonId={season.id} />
      {/* Hero */}
      <section className="relative border-b border-border/30 overflow-hidden">
        {/* Banner background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/banner.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-background/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/30 to-background/90" />
        </div>

        {/* Patrocinadores */}
        <div className="absolute top-3 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto w-auto sm:w-full sm:max-w-5xl sm:px-4 z-20">
          <div className="flex items-center gap-3 sm:gap-4 sm:pl-[142px]">
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Oferecimento
            </span>
            {sponsors.map((s) => {
              const img = (
                <Image
                  src={s.logo}
                  alt={s.name}
                  width={48}
                  height={48}
                  className="object-contain h-8 w-auto rounded"
                  title={s.name}
                />
              );
              if (!s.href) {
                return (
                  <span key={s.name} className="inline-flex">
                    {img}
                  </span>
                );
              }
              return (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="inline-flex"
                >
                  {img}
                </a>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pt-14 pb-14">
          {/* Penalty shootout (priority), live match, or next match */}
          {(() => {
            const heroRound = shootout
              ? null
              : liveMatch
                ? liveMatch.match.round
                : ((nextMatch ?? recentMatches[0])?.round ?? null);
            const currentRound = heroRound ?? finishedCount;
            return (
              <div className="flex items-center gap-3 mb-8">
                {competition?.logoUrl ? (
                  <Image
                    src={competition.logoUrl}
                    alt={competition.name}
                    width={40}
                    height={40}
                    className="rounded-full object-contain drop-shadow"
                    priority
                  />
                ) : null}
                <div className="h-px flex-1 bg-gradient-to-r from-primary to-transparent opacity-30" />
                <Badge
                  variant="outline"
                  className="border-border/50 text-muted-foreground uppercase tracking-widest text-[10px] font-bold"
                >
                  {season.name} &bull; Rodada {currentRound}/{totalRounds}
                </Badge>
                <div className="h-px flex-1 bg-gradient-to-l from-[var(--color-tor)] to-transparent opacity-30" />
              </div>
            );
          })()}
          {shootout ? (
            <Link href={`/partida/${shootout.matchId}`} className="block group">
              <div className="transition-opacity group-hover:opacity-95">
                <PenaltyScoreboard
                  matchId={shootout.matchId}
                  tiedTeams={shootout.tiedTeams}
                  initialShootout={shootout.kicks}
                  championTeamId={shootout.championTeamId}
                  teamBadgeSize="2xl"
                />
              </div>
            </Link>
          ) : liveMatch ? (
            <LiveMatchHero liveMatch={liveMatch} />
          ) : (
            (() => {
              const heroMatch = nextMatch ?? recentMatches[0] ?? null;
              if (!heroMatch) return null;
              const isFinished = !nextMatch;
              const home = heroMatch.homeTeam;
              const away = heroMatch.awayTeam;
              const content = (
                <div className="flex items-center justify-center gap-6 sm:gap-12">
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <TeamBadge
                      name={home.name}
                      shortName={home.shortName}
                      primaryColor={home.primaryColor}
                      logoUrl={home.logoUrl}
                      size="2xl"
                    />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {isFinished ? "Resultado Final" : "Próximo"}
                    </span>
                    {isFinished ? (
                      <div className="flex items-center gap-2 tabular-nums font-black text-4xl sm:text-5xl tracking-tighter">
                        <span>{heroMatch.homeScore}</span>
                        <span className="text-2xl sm:text-3xl">-</span>
                        <span>{heroMatch.awayScore}</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="text-4xl sm:text-5xl font-black text-muted-foreground/20 tracking-tighter">
                          VS
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(heroMatch.date)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-3 flex-1">
                    <TeamBadge
                      name={away.name}
                      shortName={away.shortName}
                      primaryColor={away.primaryColor}
                      logoUrl={away.logoUrl}
                      size="2xl"
                    />
                  </div>
                </div>
              );
              return (
                <>
                  {isFinished ? (
                    <Link
                      href={`/partida/${heroMatch.id}`}
                      className="block transition-opacity hover:opacity-95"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                  <VenueLink
                    venue={heroMatch.venue}
                    className="text-center mt-6"
                  />
                </>
              );
            })()
          )}
        </div>
      </section>

      {/* Conteúdo */}
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        {(season.championTeamId || season.decidedByPenalties) &&
          !otherSeasonOngoing && (
            <SeasonEndBanner season={season} standings={standings} />
          )}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Coluna principal */}
          <div className="lg:col-span-3 space-y-8">
            {/* Classificação */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Classificação
                </h2>
                <Link
                  href={`/campeonato/${slug}/classificacao`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Ver completa <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
              <HomeStandingsList
                seasonId={season.id}
                initialStandings={standings}
              />
            </div>

            {/* Últimos resultados */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Últimos Resultados
                </h2>
                <Link
                  href={`/campeonato/${slug}/calendario`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Calendário <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
              {recentMatches.length === 0 && (
                <div className="rounded-lg border border-border/40 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado ainda. Aguarde as primeiras partidas!
                </div>
              )}
              <div className="space-y-2">
                {recentMatches.map((match) => {
                  const home = match.homeTeam;
                  const away = match.awayTeam;
                  const homeWon =
                    (match.homeScore ?? 0) > (match.awayScore ?? 0);
                  const awayWon =
                    (match.awayScore ?? 0) > (match.homeScore ?? 0);
                  return (
                    <Link
                      key={match.id}
                      href={`/partida/${match.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2 rounded-lg bg-card border border-border/40 px-3 py-3 hover:border-border transition-colors sm:gap-3 sm:px-4">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold shrink-0 w-8 justify-center"
                        >
                          R{match.round}
                        </Badge>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
                          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                            <TeamBadge
                              name={home.name}
                              shortName={home.shortName}
                              primaryColor={home.primaryColor}
                              logoUrl={home.logoUrl}
                              size="sm"
                            />
                            <span
                              className={`truncate font-bold text-sm ${homeWon ? "" : "text-muted-foreground"}`}
                            >
                              {home.shortName}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 px-1 tabular-nums font-black text-base sm:px-3 sm:text-lg">
                            <span
                              className={homeWon ? "" : "text-muted-foreground"}
                            >
                              {match.homeScore}
                            </span>
                            <span className="text-muted-foreground/30 text-sm">
                              -
                            </span>
                            <span
                              className={awayWon ? "" : "text-muted-foreground"}
                            >
                              {match.awayScore}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
                            <span
                              className={`truncate font-bold text-sm ${awayWon ? "" : "text-muted-foreground"}`}
                            >
                              {away.shortName}
                            </span>
                            <TeamBadge
                              name={away.name}
                              shortName={away.shortName}
                              primaryColor={away.primaryColor}
                              logoUrl={away.logoUrl}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            {/* Artilharia */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                  Artilharia
                </h2>
                <Link
                  href={`/campeonato/${slug}/classificacao`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  })}
                >
                  Ver tudo <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
              {topScorers.length === 0 ? (
                <div className="rounded-lg border border-border/40 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum gol marcado ainda. Aguarde as primeiras partidas!
                </div>
              ) : (
                <HomeTopScorersList
                  seasonId={season.id}
                  initialStats={topScorers}
                  limit={5}
                />
              )}
            </div>

            {/* Info da liga */}
            <Card className="border-border/40 bg-card/50">
              <CardContent className="pt-0 pb-0 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Sobre a SFL
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Formato</span>
                    <span className="text-foreground font-medium">
                      {totalRounds} rodadas
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vitória</span>
                    <span className="text-foreground font-medium">3 pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Empate</span>
                    <span className="text-foreground font-medium">1 pt</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Desempate</span>
                    <span className="text-foreground font-medium">
                      Pênaltis
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    Cada partida conta com trio de arbitragem e narrador. Os
                    jogos são filmados e publicados no YouTube.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
