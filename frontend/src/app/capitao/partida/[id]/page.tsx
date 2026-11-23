import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireCaptain } from "@/lib/captain";
import {
  getMatchById,
  getRosterForLineup,
  getMatchLineups,
  getMatchHighlights,
  getMatchEvents,
} from "@/lib/queries";
import { CaptainLineupClient } from "./client";
import { CaptainHighlightsClient } from "./highlights-client";
import { MatchPostGameSummary } from "@/components/lineup/MatchPostGameSummary";
import { LineupExport } from "@/components/lineup/LineupExport";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Radio } from "lucide-react";

export default async function CaptainMatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const captain = await requireCaptain(null);

  const match = await getMatchById(null, id);
  if (!match) notFound();

  // Verify captain's team is in this match
  if (
    match.homeTeamId !== captain.teamId &&
    match.awayTeamId !== captain.teamId
  ) {
    redirect("/capitao");
  }

  const isEditable =
    match.status === "scheduled" || match.status === "lineups_set";
  const isLive =
    match.status === "live" || match.status === "halftime";

  const myTeam =
    match.homeTeamId === captain.teamId ? match.homeTeam : match.awayTeam;
  const opponent =
    match.homeTeamId === captain.teamId ? match.awayTeam : match.homeTeam;

  const isFinished = match.status === "finished";
  const opponentTeamId =
    match.homeTeamId === captain.teamId ? match.awayTeamId : match.homeTeamId;

  const [roster, lineup, opponentLineup, highlights, events] = await Promise.all([
    getRosterForLineup(null, match.seasonId, captain.teamId),
    getMatchLineups(null, id, captain.teamId),
    isFinished
      ? getMatchLineups(null, id, opponentTeamId)
      : Promise.resolve(null),
    isFinished ? getMatchHighlights(null, id) : Promise.resolve([]),
    isFinished ? getMatchEvents(null, id) : Promise.resolve([]),
  ]);

  // Destaques que ESTE capitão deu (próprios slots + respect)
  const givenByMe = highlights.filter(
    (h) => h.givenByTeamId === captain.teamId,
  );
  const ownTeamHighlights = givenByMe.filter((h) => h.slot !== "respect");
  const respectPick = givenByMe.find((h) => h.slot === "respect") ?? null;

  return (
    <div className="space-y-4">
      {/* Navigation + match info */}
      <div className="flex items-center gap-3">
        <Link
          href="/capitao"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1 shrink-0",
          )}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex-1 text-right">
          <p className="font-bold text-sm">
            {myTeam.shortName} vs {opponent.shortName}
          </p>
          <p className="text-xs text-muted-foreground">
            Rodada {match.round} · {new Date(match.date).toLocaleDateString("pt-BR")} · {match.venue}
          </p>
        </div>
        {isLive ? (
          <Link
            href={`/capitao/partida/${match.id}/live`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "gap-1.5 shrink-0",
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            Súmula
          </Link>
        ) : null}
        {!isEditable && !isLive && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
            Escalação travada
          </span>
        )}
        {!isFinished && lineup && lineup.length > 0 && (
          <LineupExport
            myTeam={myTeam}
            opponent={opponent}
            round={match.round}
            date={match.date}
            venue={match.venue}
            formation={
              match.homeTeamId === captain.teamId
                ? match.homeFormation
                : match.awayFormation
            }
            lineup={lineup}
            compact
          />
        )}
      </div>

      {isEditable ? (
        <p className="text-sm text-muted-foreground">
          Monte os 11 titulares, o banco e a formação. Salve para deixar a
          escalação pronta antes do jogo.
        </p>
      ) : null}

      {/* Lineup + (finalizada) Destaques lado a lado em telas largas */}
      <div
        className={
          isFinished && lineup && lineup.length > 0
            ? "grid grid-cols-1 lg:grid-cols-3 gap-4"
            : ""
        }
      >
        <div
          className={`rounded-lg border border-border/40 p-4 ${
            isFinished && lineup && lineup.length > 0 ? "lg:col-span-2" : ""
          }`}
        >
          {isFinished && lineup && lineup.length > 0 ? (
            <MatchPostGameSummary
              team={myTeam}
              lineup={lineup}
              formation={
                match.homeTeamId === captain.teamId
                  ? match.homeFormation
                  : match.awayFormation
              }
              events={events}
            />
          ) : (
            <CaptainLineupClient
              team={myTeam}
              roster={roster?.players ?? []}
              existing={lineup}
              formation={
                match.homeTeamId === captain.teamId
                  ? match.homeFormation
                  : match.awayFormation
              }
              matchId={match.id}
              readOnly={!isEditable}
              hideTeamHeader
            />
          )}
        </div>

        {isFinished && lineup && lineup.length > 0 && (
          <div className="rounded-lg border border-border/40 p-4">
            <CaptainHighlightsClient
              matchId={match.id}
              lineup={lineup}
              opponent={opponent}
              opponentLineup={opponentLineup ?? []}
              existing={ownTeamHighlights}
              existingRespect={respectPick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
