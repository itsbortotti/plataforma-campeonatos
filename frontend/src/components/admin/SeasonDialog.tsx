"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createSeason, updateSeason } from "@/app/admin/temporadas/actions";
import type { Competition, Season, Team } from "@/lib/queries";

interface Props {
  season: Season | null;
  teams: Team[];
  competitions: Competition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompetitionId?: string;
}

const initialState = { success: false, error: null as string | null };

function TeamOption({ team }: { team: Team }) {
  return (
    <span className="flex items-center gap-2">
      {team.logoUrl ? (
        <Image
          src={team.logoUrl}
          alt=""
          width={16}
          height={16}
          className="object-contain shrink-0"
        />
      ) : (
        <span
          className="inline-block h-4 w-4 rounded shrink-0"
          style={{ background: team.primaryColor }}
        />
      )}
      {team.name}
    </span>
  );
}

export function SeasonDialog({
  season,
  teams,
  competitions,
  open,
  onOpenChange,
  defaultCompetitionId,
}: Props) {
  const isEdit = season !== null;
  const action = isEdit ? updateSeason : createSeason;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(season?.name ?? "");
  const [year, setYear] = useState(
    String(season?.year ?? new Date().getFullYear()),
  );
  const [isCurrent, setIsCurrent] = useState(season?.isCurrent ?? false);
  const [decidedByPenalties, setDecidedByPenalties] = useState(
    season?.decidedByPenalties ?? false,
  );
  const [championTeamId, setChampionTeamId] = useState(
    season?.championTeamId ?? "none",
  );
  const [competitionId, setCompetitionId] = useState(
    season?.competitionId ??
      defaultCompetitionId ??
      competitions[0]?.id ??
      "",
  );

  useEffect(() => {
    setName(season?.name ?? "");
    setYear(String(season?.year ?? new Date().getFullYear()));
    setIsCurrent(season?.isCurrent ?? false);
    setDecidedByPenalties(season?.decidedByPenalties ?? false);
    setChampionTeamId(season?.championTeamId ?? "none");
    setCompetitionId(
      season?.competitionId ??
        defaultCompetitionId ??
        competitions[0]?.id ??
        "",
    );
  }, [season, open, competitions, defaultCompetitionId]);

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state.success) {
      toast.success(isEdit ? "Temporada salva" : "Temporada criada");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  const selectedChampion = teams.find((t) => t.id === championTeamId);

  function handleSubmit() {
    const fd = new FormData();
    if (isEdit) fd.set("id", season.id);
    else fd.set("competitionId", competitionId);
    fd.set("name", name);
    fd.set("year", year);
    fd.set("isCurrent", isCurrent ? "true" : "false");
    fd.set("decidedByPenalties", decidedByPenalties ? "true" : "false");
    fd.set("championTeamId", championTeamId);
    startTransition(() => formAction(fd));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Temporada" : "Nova Temporada"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit ? (
            <div className="space-y-2">
              <Label>Campeonato</Label>
              <Select
                value={competitionId}
                onValueChange={(v) => setCompetitionId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <span>
                    {competitions.find((c) => c.id === competitionId)?.name ??
                      "Selecione"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_100px] gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Temporada 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Input
                id="year"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors">
            <Checkbox
              checked={isCurrent}
              onCheckedChange={(v) => setIsCurrent(v === true)}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Temporada atual</p>
              <p className="text-xs text-muted-foreground">
                Apenas uma temporada pode estar marcada como atual. Demais
                serão desmarcadas automaticamente.
              </p>
            </div>
          </label>

          <div className="pt-2 border-t border-border/30 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Encerramento
            </p>

            <div className="space-y-2">
              <Label>Campeão</Label>
              <Select
                value={championTeamId}
                onValueChange={(v) => setChampionTeamId(v ?? "none")}
              >
                <SelectTrigger className="w-full">
                  {selectedChampion ? (
                    <TeamOption team={selectedChampion} />
                  ) : (
                    <span className="text-muted-foreground">Sem campeão</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem campeão</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <TeamOption team={t} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors">
              <Checkbox
                checked={decidedByPenalties}
                onCheckedChange={(v) => setDecidedByPenalties(v === true)}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Decidido nos pênaltis</p>
                <p className="text-xs text-muted-foreground">
                  Marca o título como decidido após disputa de pênaltis.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
