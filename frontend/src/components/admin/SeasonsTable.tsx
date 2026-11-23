"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { SeasonDialog } from "./SeasonDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { deleteSeason, setCurrentSeason } from "@/app/admin/temporadas/actions";
import type { Competition, Season, Team } from "@/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  seasons: Season[];
  teams: Team[];
  competitions: Competition[];
  filterCompetitionId?: string | null;
}

export function SeasonsTable({
  seasons,
  teams,
  competitions,
  filterCompetitionId,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Season | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [makingCurrent, startMakeCurrent] = useTransition();
  const [makeCurrentError, setMakeCurrentError] = useState<string | null>(null);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const compById = new Map(competitions.map((c) => [c.id, c]));

  const filtered = useMemo(() => {
    const list = filterCompetitionId
      ? seasons.filter((s) => s.competitionId === filterCompetitionId)
      : seasons;
    return [...list].sort((a, b) => b.year - a.year);
  }, [seasons, filterCompetitionId]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { competition: Competition | null; label: string; seasons: Season[] }
    >();
    for (const s of filtered) {
      const key = s.competitionId ?? "none";
      const competition = s.competitionId
        ? (compById.get(s.competitionId) ?? null)
        : null;
      const label =
        s.competitionName ?? competition?.name ?? "Sem campeonato";
      const g = map.get(key) ?? { competition, label, seasons: [] };
      g.seasons.push(s);
      map.set(key, g);
    }
    return Array.from(map.values());
  }, [filtered, compById]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(season: Season) {
    setEditing(season);
    setDialogOpen(true);
  }

  function handleDeleteConfirm(reason: string) {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteSeason(deleteTarget.id, reason);
      if (result.success) {
        toast.success("Temporada excluída");
        setDeleteTarget(null);
        setDeleteError(null);
      } else {
        toast.error(result.error ?? "Erro ao excluir temporada");
        setDeleteError(result.error);
      }
    });
  }

  function handleMakeCurrent(season: Season) {
    setMakeCurrentError(null);
    startMakeCurrent(async () => {
      const result = await setCurrentSeason(season.id);
      if (result.success) {
        toast.success("Temporada marcada como atual");
      } else {
        toast.error(result.error ?? "Erro ao marcar temporada");
        setMakeCurrentError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "temporada" : "temporadas"}
            {filterCompetitionId
              ? ` neste campeonato`
              : " — agrupadas por campeonato"}
          </p>
          {makeCurrentError && (
            <p className="text-xs text-destructive">{makeCurrentError}</p>
          )}
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova Temporada
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhuma temporada. Crie uma vinculada a um campeonato.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2">
              {!filterCompetitionId ? (
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold tracking-tight">
                    {g.label}
                  </h2>
                  {g.competition ? (
                    <Link
                      href={`/admin/temporadas?competition=${g.competition.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      Filtrar
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider">
                        Temporada
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider w-20 text-center">
                        Ano
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider w-28 text-center">
                        Partidas
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider w-32 text-center">
                        Status
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wider">
                        Campeão
                      </TableHead>
                      <TableHead className="w-36" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.seasons.map((season) => {
                      const champion = season.championTeamId
                        ? (teamById.get(season.championTeamId) ?? null)
                        : null;
                      const finished = Boolean(
                        season.championTeamId || season.decidedByPenalties,
                      );
                      const matchCount = season.matchCount ?? 0;
                      return (
                        <TableRow
                          key={season.id}
                          className="border-border/30 hover:bg-accent/30"
                        >
                          <TableCell className="font-semibold">
                            {season.name}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {season.year}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link
                              href={`/admin/partidas?season=${season.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                }),
                                "gap-1 tabular-nums",
                              )}
                            >
                              {matchCount}
                              <ArrowRight className="h-3 w-3 opacity-60" />
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              {season.isCurrent ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border text-[10px]">
                                  Atual
                                </Badge>
                              ) : finished ? (
                                <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 border text-[10px]">
                                  Encerrada
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-[10px]">
                                  Arquivada
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {champion ? (
                              <span className="flex items-center gap-2">
                                <Trophy className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                                {champion.logoUrl ? (
                                  <Image
                                    src={champion.logoUrl}
                                    alt={champion.name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                  />
                                ) : (
                                  <span
                                    className="inline-block h-5 w-5 rounded"
                                    style={{
                                      background: champion.primaryColor,
                                    }}
                                  />
                                )}
                                <span className="text-sm">{champion.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              {!season.isCurrent && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-500 hover:text-amber-600"
                                  title="Marcar como atual"
                                  onClick={() => handleMakeCurrent(season)}
                                  disabled={makingCurrent}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(season)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteTarget(season);
                                }}
                                disabled={season.isCurrent}
                                title={
                                  season.isCurrent
                                    ? "Não é possível excluir a temporada atual"
                                    : "Excluir"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      <SeasonDialog
        season={editing}
        teams={teams}
        competitions={competitions}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCompetitionId={filterCompetitionId ?? undefined}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={`Excluir ${deleteTarget?.name ?? ""}?`}
        description={`Tem certeza que deseja excluir "${deleteTarget?.name ?? ""}"? Só é possível excluir temporadas sem partidas cadastradas.`}
        confirmLabel="Excluir temporada"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        error={deleteError}
      />
    </>
  );
}
