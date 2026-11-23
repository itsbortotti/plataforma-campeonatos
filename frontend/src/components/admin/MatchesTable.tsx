"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Plus, Trash2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchDialog } from "./MatchDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { deleteMatch } from "@/app/admin/partidas/actions";
import type { MatchWithTeams, Team } from "@/lib/queries";
import { formatDate as formatDateBase } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabel: Record<string, string> = {
  scheduled: "Agendada",
  lineups_set: "Pronta",
  live: "Ao vivo",
  halftime: "Intervalo",
  finished: "Encerrada",
  postponed: "Adiada",
  awarded: "W.O.",
  abandoned: "Abandonada",
};

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  lineups_set: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  live: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  halftime: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  finished: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  postponed: "bg-red-500/15 text-red-300 border-red-500/25",
  awarded: "bg-orange-500/15 text-orange-300 border-orange-500/25",
  abandoned: "bg-red-500/15 text-red-300 border-red-500/25",
};

type FilterId = "all" | "upcoming" | "live" | "finished";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "upcoming", label: "Agendadas" },
  { id: "live", label: "Em andamento" },
  { id: "finished", label: "Encerradas" },
  { id: "all", label: "Todas" },
];

function TeamCell({ team, reverse }: { team: Team; reverse?: boolean }) {
  const logo = team.logoUrl ? (
    <Image
      src={team.logoUrl}
      alt={team.name}
      width={20}
      height={20}
      className="object-contain shrink-0"
    />
  ) : (
    <span
      className="inline-flex items-center justify-center h-5 w-5 rounded text-[8px] font-black text-white shrink-0"
      style={{ background: team.primaryColor }}
    >
      {team.shortName.slice(0, 3)}
    </span>
  );
  const name = <span className="truncate">{team.shortName}</span>;
  return (
    <span className={`flex items-center gap-2 ${reverse ? "justify-end" : ""}`}>
      {reverse ? (
        <>
          {name}
          {logo}
        </>
      ) : (
        <>
          {logo}
          {name}
        </>
      )}
    </span>
  );
}

function formatDate(iso: string) {
  return formatDateBase(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function primaryAction(match: MatchWithTeams): {
  label: string;
  href: string;
} {
  switch (match.status) {
    case "scheduled":
      return { label: "Preparar", href: `/admin/partidas/${match.id}` };
    case "lineups_set":
      return { label: "Iniciar", href: `/admin/partidas/${match.id}/live` };
    case "live":
    case "halftime":
      return { label: "Súmula", href: `/admin/partidas/${match.id}/live` };
    default:
      return { label: "Ver", href: `/admin/partidas/${match.id}` };
  }
}

function matchesFilter(match: MatchWithTeams, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "live")
    return match.status === "live" || match.status === "halftime";
  if (filter === "upcoming")
    return match.status === "scheduled" || match.status === "lineups_set";
  if (filter === "finished")
    return (
      match.status === "finished" ||
      match.status === "awarded" ||
      match.status === "abandoned"
    );
  return true;
}

interface Props {
  matches: MatchWithTeams[];
  teams: Team[];
  seasonId: string;
}

export function MatchesTable({ matches, teams, seasonId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MatchWithTeams | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("upcoming");

  const filtered = useMemo(() => {
    const list = matches.filter((m) => matchesFilter(m, filter));
    return [...list].sort((a, b) => a.round - b.round || a.date.localeCompare(b.date));
  }, [matches, filter]);

  const counts = useMemo(() => {
    const c: Record<FilterId, number> = {
      all: matches.length,
      upcoming: 0,
      live: 0,
      finished: 0,
    };
    for (const m of matches) {
      if (matchesFilter(m, "upcoming")) c.upcoming += 1;
      if (matchesFilter(m, "live")) c.live += 1;
      if (matchesFilter(m, "finished")) c.finished += 1;
    }
    return c;
  }, [matches]);

  const nextRound = useMemo(() => {
    if (matches.length === 0) return 1;
    return Math.max(...matches.map((m) => m.round)) + 1;
  }, [matches]);

  function handleDeleteConfirm(reason: string) {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteMatch(deleteTarget.id, reason);
      if (result.success) {
        toast.success("Partida excluída");
        setDeleteTarget(null);
        setDeleteError(null);
      } else {
        toast.error(result.error ?? "Erro ao excluir partida");
        setDeleteError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/40",
              )}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-70">
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova partida
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider w-12 text-center">
                Rod.
              </TableHead>
              <TableHead className="text-right" />
              <TableHead className="w-20 text-center" />
              <TableHead />
              <TableHead className="text-xs uppercase tracking-wider w-24">
                Data
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wider w-24">
                Status
              </TableHead>
              <TableHead className="w-36 text-right pr-4">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  Nenhuma partida neste filtro.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((match) => {
              const action = primaryAction(match);
              return (
                <TableRow
                  key={match.id}
                  className="border-border/30 hover:bg-accent/30 cursor-pointer"
                  onClick={() => router.push(`/admin/partidas/${match.id}`)}
                >
                  <TableCell className="text-center font-semibold tabular-nums">
                    {match.round}
                  </TableCell>
                  <TableCell className="text-right">
                    <TeamCell team={match.homeTeam} reverse />
                  </TableCell>
                  <TableCell className="text-center font-bold tabular-nums">
                    {match.status === "finished" ||
                    match.status === "live" ||
                    match.status === "halftime" ||
                    match.status === "awarded"
                      ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
                      : "- x -"}
                  </TableCell>
                  <TableCell>
                    <TeamCell team={match.awayTeam} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {formatDate(match.date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border ${statusColor[match.status] ?? ""}`}
                    >
                      {statusLabel[match.status] ?? match.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 justify-end">
                      <Link
                        href={action.href}
                        className={cn(
                          buttonVariants({ size: "sm", variant: "secondary" }),
                          "h-8 text-xs",
                        )}
                      >
                        {action.label}
                      </Link>
                      {match.status === "scheduled" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={(triggerProps) => (
                              <Button
                                {...triggerProps}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Mais ações"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(match);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <MatchDialog
        match={null}
        teams={teams}
        seasonId={seasonId}
        nextRound={nextRound}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={`Excluir partida da rodada ${deleteTarget?.round ?? ""}?`}
        description={`Tem certeza que deseja excluir a partida ${deleteTarget?.homeTeam.shortName ?? ""} x ${deleteTarget?.awayTeam.shortName ?? ""}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir partida"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        error={deleteError}
      />
    </>
  );
}
