"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCompetition,
  updateCompetition,
} from "@/app/admin/campeonatos/actions";
import type { Competition, CompetitionFormat } from "@/lib/queries";

interface Props {
  competition: Competition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = { success: false, error: null as string | null };

const FORMAT_OPTIONS: Array<{ value: CompetitionFormat; label: string }> = [
  { value: "league", label: "Pontos corridos" },
  { value: "knockout", label: "Mata-mata" },
  { value: "groups_knockout", label: "Grupos + mata-mata" },
];

const DEFAULT_TIE = [
  "points",
  "wins",
  "goalDifference",
  "goalsFor",
  "headToHead",
  "name",
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CompetitionDialog({
  competition,
  open,
  onOpenChange,
}: Props) {
  const isEdit = competition !== null;
  const action = isEdit ? updateCompetition : createCompetition;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(competition?.name ?? "");
  const [slug, setSlug] = useState(competition?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(
    competition?.description ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(competition?.logoUrl ?? "");
  const [isActive, setIsActive] = useState(competition?.isActive ?? true);
  const [format, setFormat] = useState<CompetitionFormat>(
    competition?.format ?? "league",
  );
  const [pointsWin, setPointsWin] = useState(
    String(competition?.pointsWin ?? 3),
  );
  const [pointsDraw, setPointsDraw] = useState(
    String(competition?.pointsDraw ?? 1),
  );
  const [yellowCardLimit, setYellowCardLimit] = useState(
    String(competition?.yellowCardLimit ?? 3),
  );
  const [redSuspensionGames, setRedSuspensionGames] = useState(
    String(competition?.redSuspensionGames ?? 1),
  );

  useEffect(() => {
    setName(competition?.name ?? "");
    setSlug(competition?.slug ?? "");
    setSlugTouched(Boolean(competition));
    setDescription(competition?.description ?? "");
    setLogoUrl(competition?.logoUrl ?? "");
    setIsActive(competition?.isActive ?? true);
    setFormat(competition?.format ?? "league");
    setPointsWin(String(competition?.pointsWin ?? 3));
    setPointsDraw(String(competition?.pointsDraw ?? 1));
    setYellowCardLimit(String(competition?.yellowCardLimit ?? 3));
    setRedSuspensionGames(String(competition?.redSuspensionGames ?? 1));
  }, [competition, open]);

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state.success) {
      toast.success(isEdit ? "Campeonato salvo" : "Campeonato criado");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar campeonato" : "Novo campeonato"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          action={(fd) => {
            startTransition(() => formAction(fd));
          }}
        >
          {isEdit ? <input type="hidden" name="id" value={competition.id} /> : null}
          <input
            type="hidden"
            name="tieBreakers"
            value={JSON.stringify(competition?.tieBreakers ?? DEFAULT_TIE)}
          />
          <div className="space-y-2">
            <Label htmlFor="comp-name">Nome</Label>
            <Input
              id="comp-name"
              name="name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (!isEdit && !slugTouched) setSlug(slugify(v));
              }}
              required
            />
          </div>
          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="comp-slug">Slug (URL)</Label>
              <Input
                id="comp-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="ex: sfl-feminino"
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="comp-desc">Descrição</Label>
            <Input
              id="comp-desc"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-logo">Logo (URL)</Label>
            <Input
              id="comp-logo"
              name="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Formato da disputa</Label>
            <input type="hidden" name="format" value={format} />
            <Select
              value={format}
              onValueChange={(v) => setFormat((v as CompetitionFormat) ?? "league")}
              items={FORMAT_OPTIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Campeonato → Temporadas → Partidas. O formato define como a
              classificação e a chave funcionam.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pts-win">Pts vitória</Label>
              <Input
                id="pts-win"
                name="pointsWin"
                type="number"
                min={0}
                value={pointsWin}
                onChange={(e) => setPointsWin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pts-draw">Pts empate</Label>
              <Input
                id="pts-draw"
                name="pointsDraw"
                type="number"
                min={0}
                value={pointsDraw}
                onChange={(e) => setPointsDraw(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yellow-lim">Amarelos → suspensão</Label>
              <Input
                id="yellow-lim"
                name="yellowCardLimit"
                type="number"
                min={1}
                value={yellowCardLimit}
                onChange={(e) => setYellowCardLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="red-games">Jogos p/ vermelho</Label>
              <Input
                id="red-games"
                name="redSuspensionGames"
                type="number"
                min={1}
                value={redSuspensionGames}
                onChange={(e) => setRedSuspensionGames(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
            />
            <input
              type="hidden"
              name="isActive"
              value={isActive ? "true" : "false"}
            />
            Campeonato ativo
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
