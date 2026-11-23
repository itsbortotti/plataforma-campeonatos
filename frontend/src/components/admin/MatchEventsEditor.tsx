"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Hand, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  createMatchEvent,
  updateMatchEvent,
  deleteMatchEvent,
  type MatchEventInput,
} from "@/app/admin/partidas/[id]/events-actions";
import type { MatchWithTeams, MatchEvent, Player } from "@/lib/queries";

type EditableEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "penalty_miss"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "save"
  | "tackle";

const EDITABLE_TYPES: { value: EditableEventType; label: string }[] = [
  { value: "goal", label: "Gol" },
  { value: "own_goal", label: "Gol contra" },
  { value: "penalty_goal", label: "Pênalti convertido" },
  { value: "penalty_miss", label: "Pênalti perdido" },
  { value: "yellow_card", label: "Cartão amarelo" },
  { value: "red_card", label: "Cartão vermelho" },
  { value: "substitution", label: "Substituição" },
  { value: "save", label: "Defesa" },
  { value: "tackle", label: "Desarme" },
];

const GOAL_TYPES = new Set<EditableEventType>([
  "goal",
  "penalty_goal",
]);

const SAVE_POSITIONS = new Set(["GOL"]);
const TACKLE_POSITIONS = new Set(["ZAG", "LAT", "VOL"]);

function preferredPositionsFor(type: string): Set<string> | null {
  if (type === "save") return SAVE_POSITIONS;
  if (type === "tackle") return TACKLE_POSITIONS;
  return null;
}

function sortRosterByPreference(
  roster: Player[],
  preferred: Set<string> | null,
): Player[] {
  if (!preferred) return roster;
  return [...roster].sort((a, b) => {
    const aHit = preferred.has(a.position) ? 0 : 1;
    const bHit = preferred.has(b.position) ? 0 : 1;
    if (aHit !== bHit) return aHit - bHit;
    return (a.number ?? 0) - (b.number ?? 0);
  });
}

const SYSTEM_TYPES = new Set<string>([
  "half_time",
  "second_half",
  "full_time",
]);

function typeLabel(type: string): string {
  return EDITABLE_TYPES.find((t) => t.value === type)?.label ?? type;
}

const ICON_BY_TYPE: Record<string, { src: string; alt: string; invert?: boolean }> = {
  goal: { src: "/icons/goal.svg", alt: "Gol", invert: true },
  own_goal: { src: "/icons/own-goal.svg", alt: "Gol contra" },
  penalty_goal: {
    src: "/icons/penalty-goal.svg",
    alt: "Pênalti convertido",
    invert: true,
  },
  penalty_miss: { src: "/icons/penalty-miss.svg", alt: "Pênalti perdido" },
  yellow_card: { src: "/icons/yellow-card.svg", alt: "Cartão amarelo" },
  red_card: { src: "/icons/red-card.svg", alt: "Cartão vermelho" },
  substitution: { src: "/icons/substitution.svg", alt: "Substituição" },
};

function TypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  if (type === "save") {
    return <Hand className="shrink-0 text-sky-400" style={{ width: size, height: size }} />;
  }
  if (type === "tackle") {
    return <Shield className="shrink-0 text-emerald-400" style={{ width: size, height: size }} />;
  }
  const cfg = ICON_BY_TYPE[type];
  if (!cfg) return null;
  return (
    <Image
      src={cfg.src}
      alt={cfg.alt}
      width={size}
      height={size}
      className={`shrink-0${cfg.invert ? " brightness-0 dark:brightness-100" : ""}`}
    />
  );
}

function AssistIcon() {
  return (
    <Image
      src="/icons/assist.svg"
      alt="Assistência"
      width={11}
      height={11}
      className="shrink-0 opacity-60 brightness-0 dark:brightness-100 inline-block align-middle"
    />
  );
}

function formatMinute(seconds: number): string {
  if (seconds <= 0) return "0'";
  return `${Math.ceil(seconds / 60)}'`;
}

function parseMinuteInput(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  // Accept "45" or "45:30"
  const colonMatch = v.match(/^(\d{1,3}):(\d{1,2})$/);
  if (colonMatch) {
    const m = parseInt(colonMatch[1], 10);
    const s = parseInt(colonMatch[2], 10);
    if (isNaN(m) || isNaN(s) || s >= 60) return null;
    return m * 60 + s;
  }
  const num = parseInt(v, 10);
  if (isNaN(num) || num < 0) return null;
  return num * 60;
}

function secondsToMinuteInput(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return String(m);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  readonly match: MatchWithTeams;
  readonly events: MatchEvent[];
  readonly homeRoster: Player[];
  readonly awayRoster: Player[];
}

interface FormState {
  type: EditableEventType;
  teamId: string;
  minute: string;
  playerId: string;
  assistPlayerId: string;
  playerInId: string;
  description: string;
}

function emptyForm(homeTeamId: string): FormState {
  return {
    type: "goal",
    teamId: homeTeamId,
    minute: "",
    playerId: "",
    assistPlayerId: "",
    playerInId: "",
    description: "",
  };
}

export function MatchEventsEditor({
  match,
  events,
  homeRoster,
  awayRoster,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(match.homeTeamId));
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const editableEvents = useMemo(
    () => events.filter((e) => !SYSTEM_TYPES.has(e.type)),
    [events],
  );

  const rawRoster = form.teamId === match.homeTeamId ? homeRoster : awayRoster;
  const roster = useMemo(
    () => sortRosterByPreference(rawRoster, preferredPositionsFor(form.type)),
    [rawRoster, form.type],
  );
  const teamName =
    form.teamId === match.homeTeamId
      ? match.homeTeam.shortName
      : match.awayTeam.shortName;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(match.homeTeamId));
    setDialogOpen(true);
  }

  function openEdit(event: MatchEvent) {
    setEditingId(event.id);
    setForm({
      type: event.type as EditableEventType,
      teamId: event.teamId ?? "",
      minute: secondsToMinuteInput(event.elapsedSeconds),
      playerId: event.playerId ?? "",
      assistPlayerId: event.assistPlayer?.id ?? "",
      playerInId: event.playerIn?.id ?? "",
      description: event.description ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const elapsed = parseMinuteInput(form.minute);
    if (elapsed === null) {
      toast.error("Tempo inválido. Use formato 45 ou 45:30.");
      return;
    }
    if (!form.teamId) {
      toast.error("Selecione o time.");
      return;
    }
    if (!form.playerId) {
      toast.error("Selecione o jogador.");
      return;
    }
    if (form.type === "substitution" && !form.playerInId) {
      toast.error("Selecione quem entra/sai na substituição.");
      return;
    }

    const input: MatchEventInput = {
      matchId: match.id,
      teamId: form.teamId,
      type: form.type,
      elapsedSeconds: elapsed,
      playerId: form.playerId,
      assistPlayerId:
        GOAL_TYPES.has(form.type) && form.assistPlayerId
          ? form.assistPlayerId
          : null,
      playerInId:
        form.type === "substitution" && form.playerInId
          ? form.playerInId
          : null,
      description: form.description || null,
    };

    startTransition(async () => {
      const result = editingId
        ? await updateMatchEvent(editingId, input)
        : await createMatchEvent(input);
      if (result.success) {
        toast.success(editingId ? "Evento atualizado" : "Evento adicionado");
        setDialogOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao salvar evento");
      }
    });
  }

  function handleDelete(eventId: string) {
    startTransition(async () => {
      const result = await deleteMatchEvent(match.id, eventId);
      if (result.success) {
        toast.success("Evento removido");
        setConfirmDeleteId(null);
      } else {
        toast.error(result.error ?? "Erro ao remover evento");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {editableEvents.length} evento{editableEvents.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar evento
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 divide-y divide-border/30">
        {editableEvents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum evento ainda.
          </p>
        )}
        {editableEvents.map((e) => {
          const teamShort =
            e.teamId === match.homeTeamId
              ? match.homeTeam.shortName
              : match.awayTeam.shortName;
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
            >
              <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                {formatMinute(e.elapsedSeconds)}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <TypeIcon type={e.type} />
                {typeLabel(e.type)}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-muted/50"
              >
                {teamShort}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {e.player?.nickname ?? e.player?.name ?? "—"}
                  {e.type === "substitution" && e.playerIn && (
                    <span className="text-muted-foreground">
                      {" "}
                      ⇄ {e.playerIn.nickname ?? e.playerIn.name}
                    </span>
                  )}
                  {e.assistPlayer && GOAL_TYPES.has(e.type as EditableEventType) && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 ml-1">
                      <AssistIcon />
                      {e.assistPlayer.nickname ?? e.assistPlayer.name}
                    </span>
                  )}
                </p>
                {e.description && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {e.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => openEdit(e)}
                  disabled={pending}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:text-red-400"
                  onClick={() => setConfirmDeleteId(e.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar evento" : "Adicionar evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: (v ?? "goal") as EditableEventType,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <span className="inline-flex items-center gap-1.5">
                      <TypeIcon type={form.type} />
                      {typeLabel(form.type)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {EDITABLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="inline-flex items-center gap-1.5">
                          <TypeIcon type={t.value} />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Tempo</Label>
                <Input
                  placeholder="Ex: 45 ou 45:30"
                  value={form.minute}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minute: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Time</Label>
              <Select
                value={form.teamId}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    teamId: v ?? match.homeTeamId,
                    playerId: "",
                    assistPlayerId: "",
                    playerInId: "",
                  }))
                }
              >
                <SelectTrigger className="w-full">{teamName}</SelectTrigger>
                <SelectContent>
                  <SelectItem value={match.homeTeamId}>
                    {match.homeTeam.shortName}
                  </SelectItem>
                  <SelectItem value={match.awayTeamId}>
                    {match.awayTeam.shortName}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">
                {form.type === "substitution" ? "Sai de campo" : "Jogador"}
              </Label>
              <Select
                value={form.playerId || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, playerId: v ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  {form.playerId
                    ? (() => {
                        const p = roster.find((r) => r.id === form.playerId);
                        return p
                          ? `${p.number} - ${p.nickname}`
                          : "Selecione...";
                      })()
                    : "Selecione..."}
                </SelectTrigger>
                <SelectContent>
                  {roster.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number} - {p.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {GOAL_TYPES.has(form.type) && (
              <div className="space-y-2">
                <Label className="text-sm">Assistência (opcional)</Label>
                <Select
                  value={form.assistPlayerId || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      assistPlayerId: v === "none" ? "" : (v ?? ""),
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    {form.assistPlayerId
                      ? (() => {
                          const p = roster.find(
                            (r) => r.id === form.assistPlayerId,
                          );
                          return p
                            ? `${p.number} - ${p.nickname}`
                            : "Sem assistência";
                        })()
                      : "Sem assistência"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem assistência</SelectItem>
                    {roster
                      .filter((p) => p.id !== form.playerId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.number} - {p.nickname}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type === "substitution" && (
              <div className="space-y-2">
                <Label className="text-sm">Entra em campo</Label>
                <Select
                  value={form.playerInId || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, playerInId: v ?? "" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    {form.playerInId
                      ? (() => {
                          const p = roster.find(
                            (r) => r.id === form.playerInId,
                          );
                          return p
                            ? `${p.number} - ${p.nickname}`
                            : "Selecione...";
                        })()
                      : "Selecione..."}
                  </SelectTrigger>
                  <SelectContent>
                    {roster
                      .filter((p) => p.id !== form.playerId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.number} - {p.nickname}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Descrição (opcional)</Label>
              <Input
                placeholder="Ex: cabeça, falta, etc."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Salvando..." : editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover evento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteId(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              disabled={pending}
            >
              {pending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
