"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Play,
  Radio,
  ListChecks,
  Star,
  CirclePlay,
  Users,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MatchLineupEditor } from "./MatchLineupEditor";
import { MatchRatingsEditor } from "./MatchRatingsEditor";
import { GoalTimestampsEditor } from "./GoalTimestampsEditor";
import { MatchEventsEditor } from "./MatchEventsEditor";
import { updateMatchStatus } from "@/app/admin/partidas/[id]/actions";
import type {
  MatchWithTeams,
  Player,
  MatchLineupPlayer,
  MatchOfficial,
  MatchPlayerRating,
  MatchEvent,
  MatchSuspension,
} from "@/lib/queries";
import { formatDate } from "@/lib/format-date";

interface Props {
  match: MatchWithTeams;
  homeRoster: Player[];
  awayRoster: Player[];
  homeLineup: MatchLineupPlayer[] | null;
  awayLineup: MatchLineupPlayer[] | null;
  officials: MatchOfficial[];
  ratings: MatchPlayerRating[];
  events: MatchEvent[];
  suspensions: MatchSuspension[];
}

export function MatchDetailTabs({
  match,
  homeRoster,
  awayRoster,
  homeLineup,
  awayLineup,
  officials,
  ratings,
  events,
  suspensions,
}: Props) {
  const router = useRouter();
  const [statusSaving, startStatusSave] = useTransition();

  const eventRosterFor = (
    lineup: MatchLineupPlayer[] | null,
    fallback: Player[],
  ): Player[] => {
    if (!lineup || lineup.length === 0) return fallback;
    return lineup.map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      position: p.position,
      number: p.shirtNumber,
    }));
  };

  const homeEventRoster = useMemo(
    () => eventRosterFor(homeLineup, homeRoster),
    [homeLineup, homeRoster],
  );
  const awayEventRoster = useMemo(
    () => eventRosterFor(awayLineup, awayRoster),
    [awayLineup, awayRoster],
  );

  const homeStarters =
    homeLineup?.filter((p) => p.status === "starter").length ?? 0;
  const awayStarters =
    awayLineup?.filter((p) => p.status === "starter").length ?? 0;
  const hasBothLineups = homeStarters > 0 && awayStarters > 0;
  const canLiberar = match.status === "scheduled" && hasBothLineups;
  const isFinished =
    match.status === "finished" ||
    match.status === "awarded" ||
    match.status === "abandoned";
  const isLive = match.status === "live" || match.status === "halftime";
  const isReady = match.status === "lineups_set";

  const scopeLabel = match.competition?.name
    ? `${match.competition.name}${match.seasonName ? ` · ${match.seasonName}` : ""}`
    : (match.seasonName ?? null);

  function handleLiberar() {
    startStatusSave(async () => {
      const result = await updateMatchStatus(match.id, "lineups_set");
      if (result.success) {
        toast.success("Partida liberada");
        router.push(`/admin/partidas/${match.id}/live`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao liberar partida");
      }
    });
  }

  const backHref = match.seasonId
    ? `/admin/partidas?season=${match.seasonId}`
    : "/admin/partidas";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8",
          )}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          {scopeLabel ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {scopeLabel}
            </p>
          ) : null}
          <h1 className="text-xl font-black tracking-tight">
            {match.homeTeam.shortName} x {match.awayTeam.shortName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Rodada {match.round} ·{" "}
            {formatDate(match.date, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
            {match.venue ? ` · ${match.venue}` : ""}
          </p>
        </div>

        {canLiberar ? (
          <Button size="sm" onClick={handleLiberar} disabled={statusSaving}>
            <Check className="h-4 w-4 mr-1" />
            {statusSaving ? "Liberando…" : "Liberar e abrir súmula"}
          </Button>
        ) : null}
        {isReady || isLive ? (
          <Link
            href={`/admin/partidas/${match.id}/live`}
            className={cn(buttonVariants({ size: "sm" }), "gap-1")}
          >
            {isLive ? (
              <Radio className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isLive ? "Continuar súmula" : "Abrir súmula"}
          </Link>
        ) : null}
      </div>

      {/* Fluxo principal: uma tela por fase */}
      {!isFinished && !isLive && !isReady ? (
        <MatchLineupEditor
          match={match}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          homeLineup={homeLineup}
          awayLineup={awayLineup}
          officials={officials}
          suspensions={suspensions}
          onReadyToLiberar={canLiberar ? handleLiberar : undefined}
          liberating={statusSaving}
        />
      ) : null}

      {(isReady || isLive) && !isFinished ? (
        <div className="rounded-xl border border-border/40 bg-card/40 px-6 py-10 text-center space-y-4">
          <Play className="h-8 w-8 mx-auto text-primary" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {isLive ? "Partida em andamento" : "Pronta para iniciar"}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isLive
                ? "Continue na súmula: cronômetro, gols e cartões."
                : "Abra a súmula e toque em Iniciar 1º Tempo."}
            </p>
          </div>
          <Link
            href={`/admin/partidas/${match.id}/live`}
            className={cn(buttonVariants(), "gap-2 inline-flex")}
          >
            <Play className="h-4 w-4" />
            {isLive ? "Continuar súmula" : "Abrir súmula"}
          </Link>
          <details className="text-left max-w-3xl mx-auto mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Ajustar escalação
            </summary>
            <div className="mt-4">
              <MatchLineupEditor
                match={match}
                homeRoster={homeRoster}
                awayRoster={awayRoster}
                homeLineup={homeLineup}
                awayLineup={awayLineup}
                officials={officials}
                suspensions={suspensions}
              />
            </div>
          </details>
        </div>
      ) : null}

      {isFinished ? (
        <Tabs defaultValue="eventos">
          <TabsList>
            <TabsTrigger value="eventos">
              <ListChecks className="h-3.5 w-3.5" />
              Eventos
            </TabsTrigger>
            {match.youtubeUrl ? (
              <TabsTrigger value="timestamps">
                <CirclePlay className="h-3.5 w-3.5" />
                Timestamps
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="notas">
              <Star className="h-3.5 w-3.5" />
              Notas
            </TabsTrigger>
            <TabsTrigger value="escalacao">
              <Users className="h-3.5 w-3.5" />
              Escalação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eventos">
            <MatchEventsEditor
              match={match}
              events={events}
              homeRoster={homeEventRoster}
              awayRoster={awayEventRoster}
            />
          </TabsContent>

          {match.youtubeUrl ? (
            <TabsContent value="timestamps">
              <GoalTimestampsEditor match={match} events={events} />
            </TabsContent>
          ) : null}

          <TabsContent value="notas">
            <MatchRatingsEditor match={match} ratings={ratings} />
          </TabsContent>

          <TabsContent value="escalacao">
            <MatchLineupEditor
              match={match}
              homeRoster={homeRoster}
              awayRoster={awayRoster}
              homeLineup={homeLineup}
              awayLineup={awayLineup}
              officials={officials}
              suspensions={suspensions}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
