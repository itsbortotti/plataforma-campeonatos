import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { CirclePlay, Circle, ArrowUpDown } from "lucide-react";
import {
  getCompetitionBySlug,
  getCurrentSeason,
  getMatches,
  getTotalRounds,
} from "@/lib/queries";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
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
    title: `Calendário · ${name}`,
    description: `Datas, locais e resultados das rodadas de ${name}.`,
    path: `/campeonato/${slug}/calendario`,
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "finished":
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-primary/10 text-primary border-0"
        >
          Encerrado
        </Badge>
      );
    case "live":
      return (
        <Badge className="text-[10px] bg-red-500/20 text-red-400 border-0 gap-1">
          <Circle className="h-1.5 w-1.5 fill-red-400 animate-pulse" />
          Ao vivo
        </Badge>
      );
    case "halftime":
      return (
        <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-0 gap-1">
          <Circle className="h-1.5 w-1.5 fill-amber-400" />
          Intervalo
        </Badge>
      );
    case "postponed":
      return (
        <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Adiado
        </Badge>
      );
    case "abandoned":
      return (
        <Badge className="text-[10px] bg-red-500/15 text-red-300 border border-red-500/30">
          Cancelada
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="text-[10px] border-border/50 text-muted-foreground"
        >
          Agendado
        </Badge>
      );
  }
}

export default async function CompetitionCalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ordem?: string }>;
}) {
  const { slug } = await params;
  const { ordem } = await searchParams;

  const season = await getCurrentSeason(null, { competitionSlug: slug });
  if (!season) return <p>Nenhuma temporada ativa.</p>;

  const desc = ordem === "desc";

  const [matches, totalRounds] = await Promise.all([
    getMatches(null, season.id),
    getTotalRounds(null, season.id),
  ]);
  const sorted = desc ? [...matches].reverse() : matches;
  const base = `/campeonato/${slug}/calendario`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Calendário
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            {season.name} - {totalRounds} rodadas
          </p>
        </div>
        <Link
          href={desc ? base : `${base}?ordem=desc`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full justify-center sm:w-auto",
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
          {desc ? "Mais antigos primeiro" : "Mais recentes primeiro"}
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {sorted.map((match) => {
          const home = match.homeTeam;
          const away = match.awayTeam;
          const isFinished = match.status === "finished";
          const isLive = match.status === "live" || match.status === "halftime";
          const showScore = isFinished || isLive;

          return (
            <Link
              key={match.id}
              href={`/partida/${match.id}`}
              className="block"
            >
              <Card
                className={`card-glow-hover bg-card/80 border-border/50 hover:border-border transition-all ${match.status === "postponed" ? "opacity-90" : ""}`}
              >
                <CardContent className="px-3 py-3 sm:px-5 sm:py-4">
                  <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Rodada {match.round}
                      <span className="font-medium text-muted-foreground/80">
                        {" "}
                        ·{" "}
                        {formatDate(match.date, {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {statusBadge(match.status)}
                      {match.youtubeUrl ? (
                        <CirclePlay className="h-4 w-4 text-red-400/60" />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="hidden w-[7.5rem] shrink-0 sm:block">
                      <p className="text-xs font-black text-muted-foreground">
                        Rodada {match.round}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {formatDate(match.date, {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
                        <span className="truncate text-xs font-semibold sm:text-sm">
                          {home.shortName}
                        </span>
                        <TeamBadge
                          name={home.name}
                          shortName={home.shortName}
                          primaryColor={home.primaryColor}
                          logoUrl={home.logoUrl}
                          size="sm"
                        />
                      </div>

                      <div className="w-16 shrink-0 text-center sm:w-20">
                        {showScore ? (
                          <span
                            className={`text-lg font-black tabular-nums tracking-tight sm:text-xl ${isLive ? "text-red-500" : ""}`}
                          >
                            {match.homeScore ?? 0}
                            <span className="text-muted-foreground/40">:</span>
                            {match.awayScore ?? 0}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground/50">
                            vs
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                        <TeamBadge
                          name={away.name}
                          shortName={away.shortName}
                          primaryColor={away.primaryColor}
                          logoUrl={away.logoUrl}
                          size="sm"
                        />
                        <span className="truncate text-xs font-semibold sm:text-sm">
                          {away.shortName}
                        </span>
                      </div>
                    </div>

                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      {statusBadge(match.status)}
                      {match.youtubeUrl ? (
                        <CirclePlay className="h-4 w-4 text-red-400/60" />
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
