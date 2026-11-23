"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Save, Trash2, Star } from "lucide-react";
import {
  generateRatings,
  updateRating,
  deleteRatings,
} from "@/app/admin/partidas/[id]/rating-actions";
import type { MatchPlayerRating, MatchWithTeams, Team } from "@/lib/queries";

const positionColor: Record<string, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

function ratingColor(rating: number): string {
  if (rating >= 8.0) return "text-emerald-400";
  if (rating >= 7.0) return "text-blue-400";
  if (rating >= 6.0) return "text-foreground";
  if (rating >= 5.0) return "text-amber-400";
  return "text-red-400";
}

interface Props {
  match: MatchWithTeams;
  ratings: MatchPlayerRating[];
}

export function MatchRatingsEditor({ match, ratings: initialRatings }: Props) {
  const [ratings, setRatings] = useState(initialRatings);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const isFinished = match.status === "finished";
  const hasRatings = ratings.length > 0;

  const homeRatings = ratings
    .filter((r) => r.teamId === match.homeTeamId)
    .sort((a, b) => b.rating - a.rating);
  const awayRatings = ratings
    .filter((r) => r.teamId === match.awayTeamId)
    .sort((a, b) => b.rating - a.rating);

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRatings(match.id);
      if (result.success) {
        toast.success("Notas geradas com sucesso!");
        window.location.reload();
      } else {
        toast.error(result.error ?? "Erro ao gerar notas.");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Remover todas as notas desta partida?")) return;
    startTransition(async () => {
      const result = await deleteRatings(match.id);
      if (result.success) {
        setRatings([]);
        toast.success("Notas removidas.");
      } else {
        toast.error(result.error ?? "Erro ao remover notas.");
      }
    });
  }

  function handleSaveRating(ratingId: string) {
    const value = editValues[ratingId];
    if (value === undefined) return;

    const parsed = parseFloat(value.replace(",", "."));
    if (isNaN(parsed)) {
      toast.error("Valor inválido.");
      return;
    }

    startTransition(async () => {
      const result = await updateRating(ratingId, parsed);
      if (result.success) {
        const clamped =
          Math.round(Math.min(10.0, Math.max(3.0, parsed)) * 10) / 10;
        setRatings((prev) =>
          prev.map((r) => (r.id === ratingId ? { ...r, rating: clamped } : r)),
        );
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[ratingId];
          return next;
        });
        toast.success("Nota salva.");
      } else {
        toast.error(result.error ?? "Erro ao salvar nota.");
      }
    });
  }

  function renderTeamRatings(
    team: Team,
    teamRatings: MatchPlayerRating[],
  ) {
    return (
      <div key={team.id}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold">{team.name}</span>
        </div>
        <div className="space-y-1">
          {teamRatings.map((r) => {
            const editing = editValues[r.id] !== undefined;
            const diff = r.rating - r.calculatedRating;
            const diffStr =
              diff === 0
                ? ""
                : diff > 0
                  ? `+${diff.toFixed(1)}`
                  : diff.toFixed(1);

            return (
              <div
                key={r.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group"
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-bold ${positionColor[r.player?.position ?? ""] ?? ""}`}
                >
                  {r.player?.position ?? "?"}
                </Badge>
                <span className="text-sm flex-1 truncate">
                  {r.player?.nickname ?? "?"}
                </span>
                {diffStr && (
                  <span
                    className={`text-[10px] font-bold ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {diffStr}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  calc: {r.calculatedRating.toFixed(1)}
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="w-16 h-7 text-center text-sm font-bold tabular-nums"
                    defaultValue={r.rating.toFixed(1)}
                    value={editing ? editValues[r.id] : r.rating.toFixed(1)}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [r.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRating(r.id);
                    }}
                  />
                  {editing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={isPending}
                      onClick={() => handleSaveRating(r.id)}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Star className="h-3.5 w-3.5" />
            Notas dos Jogadores
          </CardTitle>
          <div className="flex gap-2">
            {hasRatings && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remover
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isPending || !isFinished}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />
              {hasRatings ? "Recalcular" : "Gerar Notas"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isFinished && !hasRatings && (
          <p className="text-sm text-muted-foreground/50 italic text-center py-4">
            Finalize a partida para gerar as notas.
          </p>
        )}
        {hasRatings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderTeamRatings(match.homeTeam, homeRatings)}
            {renderTeamRatings(match.awayTeam, awayRatings)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
