"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  addPenaltyKick,
  removePenaltyKick,
} from "@/app/admin/partidas/[id]/live/actions";
import type { PenaltyKick, RosterWithPlayers, Season } from "@/lib/queries";

interface Props {
  matchId: string;
  season: Season;
  tiedRosters: RosterWithPlayers[];
  shootout: PenaltyKick[];
}

export function PenaltyShootoutAdminActions({
  matchId,
  season,
  tiedRosters,
  shootout,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoster, setSelectedRoster] =
    useState<RosterWithPlayers | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedScored, setSelectedScored] = useState<boolean | null>(null);

  const isDecided = season.championTeamId != null;

  function openKickDialog(roster: RosterWithPlayers) {
    setSelectedRoster(roster);
    setSelectedPlayerId("");
    setSelectedScored(null);
    setDialogOpen(true);
  }

  function handleSaveKick() {
    if (!selectedRoster || !selectedPlayerId || selectedScored === null) return;
    startTransition(async () => {
      const result = await addPenaltyKick({
        matchId,
        teamId: selectedRoster.teamId,
        playerId: selectedPlayerId,
        scored: selectedScored,
      });
      if (!result.success) {
        toast.error(result.error ?? "Erro ao salvar cobrança");
        return;
      }
      setDialogOpen(false);
    });
  }

  function handleRemoveLast() {
    const last = [...shootout].sort((a, b) => b.shootOrder - a.shootOrder)[0];
    if (!last) return;
    startTransition(async () => {
      const result = await removePenaltyKick(matchId, last.id);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao remover");
      }
    });
  }

  return (
    <>
      {!isDecided && (
        <div className="flex flex-wrap gap-2 justify-center">
          {tiedRosters.map((r) => (
            <Button
              key={r.teamId}
              variant="outline"
              size="sm"
              onClick={() => openKickDialog(r)}
              disabled={pending}
            >
              Nova cobrança - {r.team!.shortName}
            </Button>
          ))}
          {shootout.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveLast}
              disabled={pending}
              className="gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Desfazer última
            </Button>
          )}
        </div>
      )}

      {/* Kick dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nova cobrança - {selectedRoster?.team?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jogador</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={(v) => setSelectedPlayerId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  {selectedRoster?.players.find(
                    (p) => p.id === selectedPlayerId,
                  )?.nickname ?? "Selecione..."}
                </SelectTrigger>
                <SelectContent>
                  {selectedRoster?.players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number} - {p.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resultado</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedScored === true ? "default" : "outline"}
                  className={
                    selectedScored === true
                      ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
                      : ""
                  }
                  onClick={() => setSelectedScored(true)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Gol
                </Button>
                <Button
                  variant={selectedScored === false ? "default" : "outline"}
                  className={
                    selectedScored === false
                      ? "bg-red-600 hover:bg-red-700 border-red-500"
                      : ""
                  }
                  onClick={() => setSelectedScored(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Errou
                </Button>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSaveKick}
              disabled={pending || !selectedPlayerId || selectedScored === null}
            >
              Salvar cobrança
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
