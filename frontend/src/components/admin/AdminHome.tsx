import Link from "next/link";
import {
  ArrowRight,
  Play,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeamBadge } from "@/components/TeamBadge";
import { formatDate } from "@/lib/format-date";
import type { Competition, MatchWithTeams, Season } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  season: Season | null;
  competitions: Competition[];
  liveMatches: MatchWithTeams[];
  upcomingMatches: MatchWithTeams[];
  matchStats: {
    total: number;
    scheduled: number;
    ready: number;
    live: number;
    finished: number;
  };
  seasonQuery: string;
};

function MatchRow({
  match,
  actionLabel,
  actionHref,
  actionIcon: Icon,
}: {
  match: MatchWithTeams;
  actionLabel: string;
  actionHref: string;
  actionIcon: typeof Play;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/30 py-3 last:border-0">
      <div className="min-w-[4.5rem] text-xs text-muted-foreground tabular-nums">
        R{match.round}
        <span className="block sm:inline sm:before:content-['·'] sm:before:mx-1">
          {formatDate(match.date)}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center gap-2 min-w-[160px]">
        <TeamBadge
          name={match.homeTeam.name}
          shortName={match.homeTeam.shortName}
          primaryColor={match.homeTeam.primaryColor}
          logoUrl={match.homeTeam.logoUrl}
          size="sm"
        />
        <span className="text-sm font-semibold">{match.homeTeam.shortName}</span>
        <span className="text-muted-foreground text-xs px-1">x</span>
        <span className="text-sm font-semibold">{match.awayTeam.shortName}</span>
        <TeamBadge
          name={match.awayTeam.name}
          shortName={match.awayTeam.shortName}
          primaryColor={match.awayTeam.primaryColor}
          logoUrl={match.awayTeam.logoUrl}
          size="sm"
        />
      </div>
      <Link
        href={actionHref}
        className={cn(buttonVariants({ size: "sm" }), "gap-1.5 shrink-0")}
      >
        <Icon className="h-3.5 w-3.5" />
        {actionLabel}
      </Link>
    </div>
  );
}

export function AdminHome({
  season,
  competitions,
  liveMatches,
  upcomingMatches,
  matchStats,
  seasonQuery,
}: Props) {
  if (!season) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Escolha um campeonato"
          description="O Master trabalha sempre dentro de um campeonato e uma temporada. Entre num deles para gerenciar partidas e elenco."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((c) => (
            <Link
              key={c.id}
              href={`/admin/campeonatos/${c.id}`}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4 hover:bg-accent/30 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Trophy className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {c.seasonCount ?? c.seasons?.length ?? 0} temporada
                  {(c.seasonCount ?? c.seasons?.length ?? 0) === 1 ? "" : "s"}
                  {c.currentSeason
                    ? ` · atual: ${c.currentSeason.name}`
                    : ""}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
            </Link>
          ))}
        </div>
        {competitions.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Nenhum campeonato ainda.
            </p>
            <Link
              href="/admin/campeonatos"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Criar o primeiro
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  const needsPrep = matchStats.scheduled;
  const readyToStart = matchStats.ready;
  const qs = seasonQuery ? `?season=${seasonQuery}` : "";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={season.competitionName ?? "Temporada"}
        description={`${season.name}${season.isCurrent ? " · temporada atual" : ""} — painel de operação.`}
        actions={
          season.competitionId ? (
            <Link
              href={`/admin/campeonatos/${season.competitionId}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5",
              )}
            >
              <Trophy className="h-3.5 w-3.5" />
              Ver campeonato
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Partidas", value: matchStats.total },
          { label: "A preparar", value: needsPrep },
          { label: "Prontas", value: readyToStart },
          { label: "Encerradas", value: matchStats.finished },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border/40 bg-card/30 px-3 py-3"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="text-2xl font-black tabular-nums mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Precisa de você
        </h2>
        <div className="rounded-lg border border-border/40 divide-y divide-border/30">
          {liveMatches.length > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {liveMatches.length} partida
                  {liveMatches.length === 1 ? "" : "s"} ao vivo
                </p>
                <p className="text-xs text-muted-foreground">
                  Continue a súmula
                </p>
              </div>
              <Link
                href={`/admin/partidas/${liveMatches[0].id}/live`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Abrir
              </Link>
            </div>
          ) : null}
          {readyToStart > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <Play className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {readyToStart} pronta
                  {readyToStart === 1 ? "" : "s"} para iniciar
                </p>
                <p className="text-xs text-muted-foreground">
                  Escalação liberada — abra a súmula
                </p>
              </div>
              <Link
                href={`/admin/partidas${qs}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Ver
              </Link>
            </div>
          ) : null}
          {needsPrep > 0 ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {needsPrep} partida{needsPrep === 1 ? "" : "s"} sem escalação
                  liberada
                </p>
                <p className="text-xs text-muted-foreground">
                  Monte titulares e libere para iniciar
                </p>
              </div>
              <Link
                href={`/admin/partidas${qs}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Preparar
              </Link>
            </div>
          ) : null}
          {liveMatches.length === 0 &&
          readyToStart === 0 &&
          needsPrep === 0 ? (
            <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              Nada pendente nesta temporada.
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ao vivo agora
        </h2>
        {liveMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 border border-dashed border-border/50 rounded-lg px-4">
            Nenhuma partida em andamento.
          </p>
        ) : (
          <div className="rounded-lg border border-border/40 bg-card/40 px-4">
            {liveMatches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                actionLabel="Abrir súmula"
                actionHref={`/admin/partidas/${m.id}/live`}
                actionIcon={Play}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Próximas
          </h2>
          <Link
            href={`/admin/partidas${qs}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
            )}
          >
            Todas as partidas
          </Link>
        </div>
        {upcomingMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 border border-dashed border-border/50 rounded-lg px-4">
            Sem partidas agendadas. Gere a tabela ou crie partidas em Partidas.
          </p>
        ) : (
          <div className="rounded-lg border border-border/40 bg-card/40 px-4">
            {upcomingMatches.map((m) => {
              const ready = m.status === "lineups_set";
              return (
                <MatchRow
                  key={m.id}
                  match={m}
                  actionLabel={ready ? "Iniciar" : "Preparar"}
                  actionHref={
                    ready
                      ? `/admin/partidas/${m.id}/live`
                      : `/admin/partidas/${m.id}`
                  }
                  actionIcon={ready ? Play : ClipboardList}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
