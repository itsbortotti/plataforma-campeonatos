import Image from "next/image";
import Link from "next/link";
import { requireCaptain } from "@/lib/captain";
import {
  getCaptainMatches,
  getCaptainLiveMatches,
  getCaptainFinishedMatches,
  getRoster,
  getTeams,
  getTopAssists,
  getTopScorers,
  type MatchWithTeams,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Award, ClipboardList, Users } from "lucide-react";
import { CaptainTabs } from "./CaptainTabs";
import {
  CaptainRoster,
  type CaptainRosterEntry,
} from "./CaptainRoster";

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  lineups_set: "Escalação pronta",
  live: "Ao vivo",
  halftime: "Intervalo",
};

export default async function CaptainPage() {
  const captain = await requireCaptain(null);
  const [matches, liveMatches, finishedMatches, teams, roster, scorers, assists] =
    await Promise.all([
      getCaptainMatches(null, captain.seasonId, captain.teamId),
      getCaptainLiveMatches(null, captain.seasonId, captain.teamId),
      getCaptainFinishedMatches(null, captain.seasonId, captain.teamId),
      getTeams(null),
      getRoster(null, captain.seasonId, captain.teamId),
      getTopScorers(null, captain.seasonId, 200),
      getTopAssists(null, captain.seasonId, 200),
    ]);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const myTeam = teamMap.get(captain.teamId);

  const goalsByPlayer = new Map(scorers.map((s) => [s.playerId, s.goals]));
  const assistsByPlayer = new Map(assists.map((a) => [a.playerId, a.assists]));

  // Ratings/highlights: optional enrichment via match detail (best-effort).
  const ratingsByPlayer = new Map<string, { sum: number; count: number }>();
  const matchesWithHighlights = new Set<string>();
  for (const m of finishedMatches) {
    try {
      const { apiGet } = await import("@/lib/api");
      const detail = await apiGet<{
        ratings: Array<{ playerId: string; teamId: string; rating: number }>;
        highlights: Array<{ givenByTeamId?: string; slot: string; matchId?: string }>;
      }>(`/api/matches/${m.id}`);
      for (const row of detail.ratings) {
        if (row.teamId !== captain.teamId) continue;
        const acc = ratingsByPlayer.get(row.playerId) ?? { sum: 0, count: 0 };
        acc.sum += Number(row.rating);
        acc.count += 1;
        ratingsByPlayer.set(row.playerId, acc);
      }
      if (
        detail.highlights.some(
          (h) => (h as { givenByTeamId?: string }).givenByTeamId === captain.teamId && h.slot !== "respect",
        )
      ) {
        matchesWithHighlights.add(m.id);
      }
    } catch {
      // ignore per-match failures
    }
  }

  function renderMatchRow(
    match: MatchWithTeams,
    options: {
      actionLabel: string;
      href: string;
      rightBadge?: {
        label: string;
        tone: "default" | "success" | "warning" | "live";
      };
    },
  ) {
    const opponent =
      match.homeTeamId === captain.teamId ? match.awayTeam : match.homeTeam;
    const isHome = match.homeTeamId === captain.teamId;
    const myScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;
    const showScore =
      (match.status === "finished" ||
        match.status === "live" ||
        match.status === "halftime") &&
      myScore !== null &&
      oppScore !== null;

    const badgeClass =
      options.rightBadge?.tone === "success"
        ? "border-emerald-500/40 text-emerald-400"
        : options.rightBadge?.tone === "warning"
          ? "border-amber-500/40 text-amber-400"
          : options.rightBadge?.tone === "live"
            ? "border-red-500/40 text-red-400"
            : "";

    return (
      <div
        key={match.id}
        className="rounded-lg border border-border/40 p-4 flex items-center gap-4"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {opponent.logoUrl ? (
            <Image
              src={opponent.logoUrl}
              alt={opponent.name}
              width={32}
              height={32}
              className="object-contain shrink-0"
            />
          ) : (
            <div
              className="h-8 w-8 rounded flex items-center justify-center text-[9px] font-black text-white shrink-0"
              style={{ background: opponent.primaryColor }}
            >
              {opponent.shortName.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              vs {opponent.name}
              {showScore && (
                <span className="ml-2 tabular-nums text-muted-foreground font-normal">
                  ({myScore ?? 0} × {oppScore ?? 0})
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Rodada {match.round} -{" "}
              {new Date(match.date).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>

        {options.rightBadge && (
          <Badge
            variant="outline"
            className={`text-[10px] shrink-0 ${badgeClass}`}
          >
            {options.rightBadge.label}
          </Badge>
        )}

        <Link
          href={options.href}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          {options.actionLabel}
        </Link>
      </div>
    );
  }

  const rosterEntries: CaptainRosterEntry[] = roster
    ? roster.players.map((p) => {
        const r = ratingsByPlayer.get(p.id);
        return {
          id: p.id,
          name: p.name,
          nickname: p.nickname,
          position: p.position,
          number: p.number ?? 0,
          isCaptain: Boolean(p.captain),
          goals: goalsByPlayer.get(p.id) ?? 0,
          assists: assistsByPlayer.get(p.id) ?? 0,
          averageRating: r && r.count > 0 ? r.sum / r.count : null,
        };
      })
    : [];

  const highlightsPendingCount = finishedMatches.filter(
    (m) => !matchesWithHighlights.has(m.id),
  ).length;

  const jogadoresPanel =
    rosterEntries.length === 0 ? (
      <div className="rounded-lg border border-border/40 p-8 text-center">
        <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum jogador no elenco
        </p>
      </div>
    ) : (
      <CaptainRoster
        players={rosterEntries}
        teamColor={myTeam?.primaryColor ?? "#525252"}
      />
    );

  const partidasPanel =
    liveMatches.length === 0 && matches.length === 0 ? (
      <div className="rounded-lg border border-border/40 p-8 text-center">
        <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma partida para escalar ou acompanhar agora
        </p>
      </div>
    ) : (
      <div className="space-y-6">
        {liveMatches.length > 0 ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-black tracking-tight">Ao vivo</h2>
              <p className="text-sm text-muted-foreground">
                Acompanhe a súmula e use a mesa tática do seu time.
              </p>
            </div>
            {liveMatches.map((m) =>
              renderMatchRow(m, {
                actionLabel: "Súmula",
                href: `/capitao/partida/${m.id}/live`,
                rightBadge: {
                  label: statusLabel[m.status] ?? m.status,
                  tone: "live",
                },
              }),
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-black tracking-tight">
              Preparar escalação
            </h2>
            <p className="text-sm text-muted-foreground">
              Deixe titulares, reservas e formação prontos antes do apito.
            </p>
          </div>
          {matches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhuma partida agendada para escalar.
            </div>
          ) : (
            matches.map((m) =>
              renderMatchRow(m, {
                actionLabel:
                  m.status === "lineups_set" ? "Editar" : "Escalar",
                href: `/capitao/partida/${m.id}`,
                rightBadge: {
                  label: statusLabel[m.status] ?? m.status,
                  tone:
                    m.status === "lineups_set" ? "success" : "default",
                },
              }),
            )
          )}
        </section>
      </div>
    );

  const destaquesPanel =
    finishedMatches.length === 0 ? (
      <div className="rounded-lg border border-border/40 p-8 text-center">
        <Award className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhuma partida finalizada ainda
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {finishedMatches.map((m) =>
          renderMatchRow(m, {
            actionLabel: matchesWithHighlights.has(m.id) ? "Editar" : "Definir",
            href: `/capitao/partida/${m.id}`,
            rightBadge: matchesWithHighlights.has(m.id)
              ? { label: "Destaques OK", tone: "success" }
              : { label: "Pendente", tone: "warning" },
          }),
        )}
      </div>
    );

  return (
    <CaptainTabs
      playersCount={rosterEntries.length}
      pendingCount={matches.length + liveMatches.length}
      liveCount={liveMatches.length}
      highlightsPendingCount={highlightsPendingCount}
      jogadores={jogadoresPanel}
      partidas={partidasPanel}
      destaques={destaquesPanel}
    />
  );
}
