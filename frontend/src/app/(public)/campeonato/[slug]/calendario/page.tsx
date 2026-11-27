import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { CirclePlay, Circle, ArrowUpDown } from "lucide-react";
import { getCurrentSeason, getMatches, getTotalRounds } from "@/lib/queries";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";

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
      <div className="flex items-start justify-between gap-4">
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
          className={buttonVariants({ variant: "outline", size: "sm" })}
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
                <CardContent className="py-3 px-3 sm:py-4 sm:px-5">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="hidden sm:block min-w-[110px]">
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

                    <div className="flex flex-1 items-center justify-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-[70px] sm:min-w-[90px] justify-end">
                        <span className="font-semibold text-xs sm:text-sm">
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

                      <div className="min-w-[70px] text-center">
                        {showScore ? (
                          <span
                            className={`text-xl font-black tabular-nums tracking-tight ${isLive ? "text-red-500" : ""}`}
                          >
                            {match.homeScore ?? 0}{" "}
                            <span className="text-muted-foreground/40">:</span>{" "}
                            {match.awayScore ?? 0}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50 font-medium">
                            vs
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-[70px] sm:min-w-[90px]">
                        <TeamBadge
                          name={away.name}
                          shortName={away.shortName}
                          primaryColor={away.primaryColor}
                          logoUrl={away.logoUrl}
                          size="sm"
                        />
                        <span className="font-semibold text-xs sm:text-sm">
                          {away.shortName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="sm:hidden text-[10px] text-muted-foreground font-bold">
                        R{match.round}
                      </span>
                      {statusBadge(match.status)}
                      {match.youtubeUrl && (
                        <CirclePlay className="h-4 w-4 text-red-400/60" />
                      )}
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
