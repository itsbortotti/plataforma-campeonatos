"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trophy, ArrowRight } from "lucide-react";
import { CompetitionDialog } from "./CompetitionDialog";
import type { Competition } from "@/lib/queries";

interface Props {
  competitions: Competition[];
}

export function CompetitionsTable({ competitions }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: Competition) {
    setEditing(c);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Entre no campeonato para ver temporadas e operar partidas.
        </p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo campeonato
        </Button>
      </div>

      {competitions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhum campeonato ainda. Crie o primeiro para organizar temporadas e
          partidas.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((c) => {
            const seasonCount = c.seasonCount ?? c.seasons?.length ?? 0;
            const formatLabel =
              c.format === "knockout"
                ? "Mata-mata"
                : c.format === "groups_knockout"
                  ? "Grupos + mata-mata"
                  : "Pontos corridos";
            return (
              <div
                key={c.id}
                className="rounded-xl border border-border/50 bg-card/40 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-secondary shrink-0">
                    {c.logoUrl ? (
                      <Image
                        src={c.logoUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="object-contain"
                      />
                    ) : (
                      <Trophy className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{c.name}</p>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatLabel} · {seasonCount} temporada
                      {seasonCount === 1 ? "" : "s"}
                      {c.currentSeason
                        ? ` · atual: ${c.currentSeason.name}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    onClick={() => openEdit(c)}
                    aria-label="Editar regras"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Link
                  href={`/admin/campeonatos/${c.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm font-medium hover:bg-accent/40 transition-colors"
                >
                  Abrir campeonato
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <CompetitionDialog
        competition={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
