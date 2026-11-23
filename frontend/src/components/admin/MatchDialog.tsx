"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { createMatch, updateMatch } from "@/app/admin/partidas/actions";
import type { MatchWithTeams, Team } from "@/lib/queries";

const statusOptions = [
  { value: "scheduled", label: "Agendada" },
  { value: "postponed", label: "Adiada" },
  { value: "finished", label: "Encerrada" },
  { value: "awarded", label: "W.O. (awarded)" },
  { value: "abandoned", label: "Abandonada" },
] as const;

const phaseOptions = [
  { value: "league", label: "Pontos corridos" },
  { value: "group", label: "Fase de grupos" },
  { value: "knockout", label: "Mata-mata" },
] as const;


interface Props {
  match: MatchWithTeams | null;
  teams: Team[];
  seasonId: string;
  nextRound: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = { success: false, error: null as string | null };

function TeamOption({ team }: { team: Team }) {
  return (
    <span className="flex items-center gap-2">
      {team.logoUrl && (
        <Image
          src={team.logoUrl}
          alt=""
          width={16}
          height={16}
          className="object-contain shrink-0"
        />
      )}
      {team.name}
    </span>
  );
}

function parseMatchDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  // "2026-04-15" → parse as local date (not UTC) to avoid timezone offset
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

export function MatchDialog({
  match,
  teams,
  seasonId,
  nextRound,
  open,
  onOpenChange,
}: Props) {
  const isEdit = match !== null;
  const action = isEdit ? updateMatch : createMatch;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [homeTeamId, setHomeTeamId] = useState(match?.homeTeamId ?? "");
  const [awayTeamId, setAwayTeamId] = useState(match?.awayTeamId ?? "");
  const [status, setStatus] = useState(match?.status ?? "scheduled");
  const [date, setDate] = useState<Date | undefined>(parseMatchDate(match?.date));
  const [round, setRound] = useState(String(match?.round ?? nextRound));
  const [youtubeUrl, setYoutubeUrl] = useState(match?.youtubeUrl ?? "");
  const [phase, setPhase] = useState(match?.phase ?? "league");
  const [groupName, setGroupName] = useState(match?.groupName ?? "");
  const [knockoutLabel, setKnockoutLabel] = useState(
    match?.knockoutLabel ?? "",
  );
  const [isWalkover, setIsWalkover] = useState(match?.isWalkover ?? false);
  const [awardedToTeamId, setAwardedToTeamId] = useState(
    match?.awardedToTeamId ?? "",
  );

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;

    if (state.success) {
      toast.success(isEdit ? "Partida atualizada" : "Partida criada");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  useEffect(() => {
    setHomeTeamId(match?.homeTeamId ?? "");
    setAwayTeamId(match?.awayTeamId ?? "");
    setStatus(match?.status ?? "scheduled");
    setDate(parseMatchDate(match?.date));
    setRound(String(match?.round ?? nextRound));
    setYoutubeUrl(match?.youtubeUrl ?? "");
    setPhase(match?.phase ?? "league");
    setGroupName(match?.groupName ?? "");
    setKnockoutLabel(match?.knockoutLabel ?? "");
    setIsWalkover(match?.isWalkover ?? false);
    setAwardedToTeamId(match?.awardedToTeamId ?? "");
  }, [match, nextRound]);

  const homeTeam = teams.find((t) => t.id === homeTeamId);
  const awayTeam = teams.find((t) => t.id === awayTeamId);

  function handleSubmit() {
    const fd = new FormData();
    if (isEdit) {
      fd.set("id", match.id);
      fd.set("status", status);
    }
    fd.set("seasonId", seasonId);
    fd.set("round", round);
    fd.set("homeTeamId", homeTeamId);
    fd.set("awayTeamId", awayTeamId);
    fd.set("youtubeUrl", youtubeUrl);
    fd.set("phase", phase);
    fd.set("groupName", groupName);
    fd.set("knockoutLabel", knockoutLabel);
    fd.set("isWalkover", isWalkover ? "true" : "false");
    fd.set("awardedToTeamId", awardedToTeamId);
    if (isWalkover && awardedToTeamId) {
      fd.set("status", "awarded");
    }

    if (date) {
      const pad = (n: number) => String(n).padStart(2, "0");
      fd.set("date", `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
    }

    startTransition(() => formAction(fd));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Partida" : "Nova Partida"}
          </DialogTitle>
        </DialogHeader>
        <div key={match?.id ?? "new"} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rodada</Label>
              <Input
                type="number"
                min={1}
                value={round}
                onChange={(e) => setRound(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      data-empty={!date}
                      className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date
                    ? format(date, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione..."}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    defaultMonth={date}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mandante</Label>
              <Select
                value={homeTeamId}
                onValueChange={(v) => setHomeTeamId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  {homeTeam ? (
                    <TeamOption team={homeTeam} />
                  ) : (
                    <SelectValue placeholder="Selecione..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <TeamOption team={t} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visitante</Label>
              <Select
                value={awayTeamId}
                onValueChange={(v) => setAwayTeamId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  {awayTeam ? (
                    <TeamOption team={awayTeam} />
                  ) : (
                    <SelectValue placeholder="Selecione..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <TeamOption team={t} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select
                value={phase}
                onValueChange={(v) => setPhase((v as typeof phase) ?? "league")}
              >
                <SelectTrigger className="w-full">
                  {phaseOptions.find((p) => p.value === phase)?.label ?? (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {phase === "group" ? (
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="A"
                />
              </div>
            ) : phase === "knockout" ? (
              <div className="space-y-2">
                <Label>Chave</Label>
                <Input
                  value={knockoutLabel}
                  onChange={(e) => setKnockoutLabel(e.target.value)}
                  placeholder="Quartas / Semi / Final"
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v ?? "scheduled")}
              >
                <SelectTrigger className="w-full">
                  {statusOptions.find((s) => s.value === status)?.label ?? (
                    <SelectValue placeholder="Selecione..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border/50 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isWalkover}
                onCheckedChange={(v) => setIsWalkover(v === true)}
              />
              W.O. (vitória por ausência — placar 3×0)
            </label>
            {isWalkover ? (
              <Select
                value={awardedToTeamId}
                onValueChange={(v) => setAwardedToTeamId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Time vencedor do W.O." />
                </SelectTrigger>
                <SelectContent>
                  {[homeTeamId, awayTeamId]
                    .filter(Boolean)
                    .map((id) => {
                      const t = teams.find((x) => x.id === id);
                      if (!t) return null;
                      return (
                        <SelectItem key={id} value={id}>
                          {t.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>YouTube (opcional)</Label>
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
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
