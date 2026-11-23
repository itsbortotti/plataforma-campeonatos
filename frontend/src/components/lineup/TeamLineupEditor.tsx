"use client";

import { useState, useTransition, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  GripVertical,
  UserPlus,
  UserMinus,
  X,
  List,
  LayoutGrid,
  Columns2,
  Search,
  Ban,
} from "lucide-react";
import type {
  Team,
  Player,
  MatchLineupPlayer,
  MatchSuspension,
} from "@/lib/queries";
import { FieldView, type FieldLayout } from "./FieldView";

export type SuspensionInfo = Pick<
  MatchSuspension,
  "reason" | "gamesRemaining"
>;

function suspensionLabel(s: SuspensionInfo): string {
  if (s.reason === "red_card") {
    return `Suspenso (vermelho · ${s.gamesRemaining} jogo${s.gamesRemaining === 1 ? "" : "s"})`;
  }
  return `Suspenso (amarelos · ${s.gamesRemaining} jogo${s.gamesRemaining === 1 ? "" : "s"})`;
}

// ── Constants ──

export const positionLabel: Record<string, string> = {
  GOL: "GOL",
  ZAG: "ZAG",
  LAT: "LAT",
  VOL: "VOL",
  MEI: "MEI",
  ATA: "ATA",
};

export const positionColor: Record<string, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

// ── Types ──

export type Group = "starter" | "substitute" | "available";

export interface LineupItem {
  playerId: string;
  nickname: string;
  position: string;
  shirtNumber: number;
  group: Group;
  avulso?: boolean;
}

export interface LineupEntry {
  playerId: string;
  shirtNumber: number;
  status: "starter" | "substitute";
  positionIndex?: number | null;
}

export type SaveResult = { success: boolean; error: string | null };

// ── Shirt number input (buffered to allow empty/intermediate values) ──

function ShirtNumberInput({
  playerId,
  shirtNumber,
  onChange,
}: {
  playerId: string;
  shirtNumber: number;
  onChange: (id: string, value: string) => void;
}) {
  const [buffer, setBuffer] = useState<string>(String(shirtNumber));

  useEffect(() => {
    setBuffer(String(shirtNumber));
  }, [shirtNumber]);

  return (
    <Input
      type="number"
      min={1}
      max={99}
      value={buffer}
      onChange={(e) => {
        const raw = e.target.value;
        setBuffer(raw);
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num >= 1 && num <= 99) {
          onChange(playerId, raw);
        }
      }}
      onBlur={() => {
        const num = parseInt(buffer, 10);
        if (isNaN(num) || num < 1 || num > 99) {
          setBuffer(String(shirtNumber));
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="h-6 w-10 text-center text-xs font-mono px-1 tabular-nums cursor-text"
    />
  );
}

// ── Sortable player card ──

function SortablePlayerCard({
  item,
  onChangeNumber,
  onToggleStatus,
  onRemove,
  onAddStarter,
  onAddSubstitute,
  suspension,
}: {
  item: LineupItem;
  onChangeNumber?: (id: string, value: string) => void;
  onToggleStatus?: (id: string) => void;
  onRemove?: (id: string) => void;
  onAddStarter?: (id: string) => void;
  onAddSubstitute?: (id: string) => void;
  suspension?: SuspensionInfo | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.playerId, disabled: Boolean(suspension) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...(suspension ? {} : listeners)}
      {...(suspension ? {} : attributes)}
      style={style}
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm touch-none transition-opacity bg-background ${
        suspension
          ? "border-orange-500/40 bg-orange-500/5 opacity-90 cursor-not-allowed"
          : item.group === "available"
            ? "border-border/20 opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing"
            : item.group === "substitute"
              ? "border-dashed border-border/40 opacity-80 cursor-grab active:cursor-grabbing"
              : "border-border/40 cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-30 z-10" : ""}`}
    >
      {!suspension ? (
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      ) : (
        <Ban className="h-3.5 w-3.5 shrink-0 text-orange-400" />
      )}

      {onChangeNumber && !suspension ? (
        <ShirtNumberInput
          playerId={item.playerId}
          shirtNumber={item.shirtNumber}
          onChange={onChangeNumber}
        />
      ) : (
        <span className="font-mono text-xs text-muted-foreground w-6 text-center">
          {item.shirtNumber || "—"}
        </span>
      )}

      <Badge
        variant="outline"
        className={`text-[9px] border px-1 py-0 ${positionColor[item.position] ?? ""}`}
      >
        {positionLabel[item.position] ?? item.position}
      </Badge>
      <span className="font-medium flex-1 truncate">{item.nickname}</span>
      {suspension ? (
        <Badge
          variant="outline"
          className="text-[8px] border px-1 py-0 bg-orange-500/15 text-orange-400 border-orange-500/30 max-w-[140px] truncate"
          title={suspensionLabel(suspension)}
        >
          Suspenso
        </Badge>
      ) : null}
      {item.avulso && !suspension && (
        <Badge variant="outline" className="text-[8px] border px-1 py-0 bg-orange-500/15 text-orange-400 border-orange-500/30">
          Avulso
        </Badge>
      )}

      {onToggleStatus && !suspension && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggleStatus(item.playerId)}
          title={
            item.group === "starter"
              ? "Mover para reservas"
              : "Mover para titulares"
          }
        >
          {item.group === "starter" ? (
            <UserMinus className="h-3 w-3" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
        </Button>
      )}
      {onRemove && !suspension && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(item.playerId)}
          title="Remover da escalação"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      {onAddStarter && !suspension && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAddStarter(item.playerId)}
        >
          Titular
        </Button>
      )}
      {onAddSubstitute && !suspension && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onAddSubstitute(item.playerId)}
        >
          Reserva
        </Button>
      )}
    </div>
  );
}

// ── Overlay card ──

function OverlayCard({ item }: { item: LineupItem }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/50 bg-background px-2 py-1.5 text-sm shadow-lg ring-2 ring-primary/20">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      <span className="font-mono text-xs text-muted-foreground w-6 text-center">
        {item.shirtNumber}
      </span>
      <Badge
        variant="outline"
        className={`text-[9px] border px-1 py-0 ${positionColor[item.position] ?? ""}`}
      >
        {positionLabel[item.position] ?? item.position}
      </Badge>
      <span className="font-medium">{item.nickname}</span>
    </div>
  );
}

// ── Droppable zone with sortable context ──

function SortableZone({
  id,
  label,
  items,
  children,
  hint,
  filter,
}: {
  id: string;
  label: string;
  items: string[];
  children: React.ReactNode;
  hint?: string;
  filter?: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {filter}
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`min-h-[48px] space-y-1 rounded-lg p-1 transition-colors ${
            isOver ? "bg-primary/10 ring-1 ring-primary/30" : ""
          }`}
        >
          {children}
          {items.length === 0 && hint && (
            <p className="text-xs text-muted-foreground/50 text-center py-3">
              {hint}
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Team lineup editor with DnD ──

export interface TeamLineupEditorProps {
  team: Team;
  roster: Player[];
  existing: MatchLineupPlayer[] | null;
  formation?: string | null;
  onSave: (entries: LineupEntry[], formation?: string | null) => Promise<SaveResult>;
  readOnly?: boolean;
  hideTeamHeader?: boolean;
  /** Jogadores suspensos para esta partida (não podem entrar na escalação). */
  suspensions?: Record<string, SuspensionInfo>;
  /** Texto do botão salvar (ex.: "Salvar e continuar"). */
  saveLabel?: string;
  /** Vista inicial — lista é mais limpa no fluxo Master. */
  defaultView?: "list" | "field" | "both";
}

export function TeamLineupEditor({
  team,
  roster,
  existing,
  formation: persistedFormation,
  onSave,
  readOnly,
  hideTeamHeader,
  suspensions = {},
  saveLabel,
  defaultView = "both",
}: TeamLineupEditorProps) {
  const [saving, startSave] = useTransition();
  const [activeItem, setActiveItem] = useState<LineupItem | null>(null);
  const [view, setView] = useState<"list" | "field" | "both">(defaultView);
  const [fieldLayout, setFieldLayout] = useState<FieldLayout | null>(null);
  const [availableQuery, setAvailableQuery] = useState("");

  const persistedSlots = useMemo(() => {
    if (!existing || existing.length === 0) return null;
    const map = new Map<number, number>();
    for (const p of existing) {
      if (p.positionIndex != null) {
        map.set(p.shirtNumber, p.positionIndex);
      }
    }
    return map.size > 0 ? map : null;
  }, [existing]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const [items, setItems] = useState<LineupItem[]>(() => {
    const selected: LineupItem[] = (existing ?? [])
      .filter((p) => !suspensions[p.id])
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        position: p.position,
        shirtNumber: p.shirtNumber,
        group: (p.status === "starter" ? "starter" : "substitute") as Group,
      }));

    const selectedIds = new Set(selected.map((s) => s.playerId));
    const avail: LineupItem[] = roster
      .filter((p) => !selectedIds.has(p.id))
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        position: p.position,
        shirtNumber: p.number ?? 0,
        group: "available" as Group,
        avulso: p.avulso,
      }));

    return [...selected, ...avail];
  });

  const starters = useMemo(
    () => items.filter((i) => i.group === "starter"),
    [items],
  );
  const substitutes = useMemo(
    () => items.filter((i) => i.group === "substitute"),
    [items],
  );
  const available = useMemo(
    () =>
      items.filter((i) => i.group === "available" && !suspensions[i.playerId]),
    [items, suspensions],
  );
  const suspendedItems = useMemo(
    () => items.filter((i) => suspensions[i.playerId]),
    [items, suspensions],
  );

  const starterIds = useMemo(() => starters.map((s) => s.playerId), [starters]);
  const substituteIds = useMemo(
    () => substitutes.map((s) => s.playerId),
    [substitutes],
  );
  const filteredAvailable = useMemo(() => {
    const q = availableQuery.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (i) =>
        i.nickname.toLowerCase().includes(q) ||
        (positionLabel[i.position] ?? i.position).toLowerCase().includes(q),
    );
  }, [available, availableQuery]);

  const filteredAvailableIds = useMemo(
    () => filteredAvailable.map((a) => a.playerId),
    [filteredAvailable],
  );

  function findItem(id: string) {
    return items.find((i) => i.playerId === id);
  }

  function findGroup(id: string): Group | null {
    if (id === "starter" || id === "substitute" || id === "available")
      return id;
    const item = findItem(id);
    return item?.group ?? null;
  }

  // ── Mutations ──

  const changeNumber = useCallback((playerId: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 99) return;
    setItems((prev) =>
      prev.map((i) =>
        i.playerId === playerId ? { ...i, shirtNumber: num } : i,
      ),
    );
  }, []);

  const MAX_STARTERS = 11;

  const toggleStatus = useCallback((playerId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.playerId === playerId);
      if (!item) return prev;
      if (item.group === "substitute") {
        const currentStarters = prev.filter(
          (i) => i.group === "starter",
        ).length;
        if (currentStarters >= MAX_STARTERS) return prev;
      }

      return prev.map((i) =>
        i.playerId === playerId
          ? { ...i, group: i.group === "starter" ? "substitute" : "starter" }
          : i,
      );
    });
  }, []);

  const removePlayer = useCallback(
    (playerId: string) => {
      const rosterP = roster.find((r) => r.id === playerId);
      setItems((prev) =>
        prev.map((i) =>
          i.playerId === playerId
            ? {
                ...i,
                group: "available",
                shirtNumber: rosterP?.number ?? i.shirtNumber,
              }
            : i,
        ),
      );
    },
    [roster],
  );

  const addAs = useCallback(
    (playerId: string, group: Group) => {
      if (suspensions[playerId]) {
        toast.error("Jogador suspenso — não pode ser escalado");
        return;
      }
      setItems((prev) => {
        if (group === "starter") {
          const currentStarters = prev.filter(
            (i) => i.group === "starter",
          ).length;
          if (currentStarters >= MAX_STARTERS) return prev;
        }

        return prev.map((i) =>
          i.playerId === playerId ? { ...i, group } : i,
        );
      });
    },
    [suspensions],
  );

  const addAsStarter = useCallback(
    (id: string) => addAs(id, "starter"),
    [addAs],
  );
  const addAsSubstitute = useCallback(
    (id: string) => addAs(id, "substitute"),
    [addAs],
  );

  // ── Drag handlers ──

  function handleDragStart(event: DragStartEvent) {
    const item = findItem(event.active.id as string);
    if (item) setActiveItem(item);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (suspensions[activeId]) return;

    const activeGroup = findItem(activeId)?.group;
    const overGroup = findGroup(overId);

    if (!activeGroup || !overGroup || activeGroup === overGroup) return;

    if (overGroup === "starter") {
      const currentStarters = items.filter(
        (i) => i.group === "starter" && i.playerId !== activeId,
      ).length;
      if (currentStarters >= MAX_STARTERS) return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.playerId === activeId ? { ...i, group: overGroup } : i,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeItem = findItem(activeId);
    const overItem = findItem(overId);

    if (activeItem && overItem && activeItem.group === overItem.group) {
      setItems((prev) => {
        const groupItems = prev.filter((i) => i.group === activeItem.group);
        const others = prev.filter((i) => i.group !== activeItem.group);
        const oldIdx = groupItems.findIndex((i) => i.playerId === activeId);
        const newIdx = groupItems.findIndex((i) => i.playerId === overId);
        const reordered = arrayMove(groupItems, oldIdx, newIdx);
        return [...others, ...reordered];
      });
    }
  }

  function handleSave() {
    startSave(async () => {
      const blocked = items.filter(
        (i) => i.group !== "available" && suspensions[i.playerId],
      );
      if (blocked.length > 0) {
        toast.error(
          `Remova suspensos da escalação: ${blocked.map((b) => b.nickname).join(", ")}`,
        );
        return;
      }

      const fk = fieldLayout?.formationKey ?? null;
      const slotByShirt = fieldLayout?.slotByShirt ?? null;

      const entries: LineupEntry[] = items
        .filter((i) => i.group !== "available")
        .map((i) => ({
          playerId: i.playerId,
          shirtNumber: i.shirtNumber,
          status: i.group as "starter" | "substitute",
          positionIndex:
            i.group === "starter" && slotByShirt
              ? (slotByShirt.get(i.shirtNumber) ?? null)
              : null,
        }));
      const result = await onSave(entries, fk);
      if (result.success) {
        toast.success(`Escalação do ${team.shortName} salva`);
      } else {
        toast.error(result.error ?? "Erro ao salvar escalação");
      }
    });
  }

  return (
    <div className="space-y-4">
      {suspendedItems.length > 0 ? (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2.5 space-y-2">
          <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5" />
            Suspensos nesta partida ({suspendedItems.length}) — não podem jogar
          </p>
          <ul className="space-y-1">
            {suspendedItems.map((item) => {
              const s = suspensions[item.playerId]!;
              return (
                <li
                  key={item.playerId}
                  className="flex items-center gap-2 text-sm text-orange-100/90"
                >
                  <span className="font-medium">{item.nickname}</span>
                  <span className="text-xs text-orange-200/70">
                    {suspensionLabel(s)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        {!hideTeamHeader && (
          <>
            {team.logoUrl ? (
              <Image
                src={team.logoUrl}
                alt={team.name}
                width={28}
                height={28}
                className="object-contain"
              />
            ) : (
              <div
                className="h-7 w-7 rounded flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: team.primaryColor }}
              >
                {team.shortName.slice(0, 3)}
              </div>
            )}
            <h3 className="font-bold text-sm flex-1">{team.name}</h3>
          </>
        )}
        {hideTeamHeader && <div className="flex-1" />}
        {starters.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-md border border-border/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded px-1.5 py-1 transition-colors ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("field")}
              className={`rounded px-1.5 py-1 transition-colors ${view === "field" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Campo"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("both")}
              className={`rounded px-1.5 py-1 transition-colors ${view === "both" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Lista + Campo"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={view === "both" && starters.length > 0 ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : ""}>
      {starters.length > 0 && (
        <div className={view === "field" || view === "both" ? "" : "hidden"}>
          <FieldView
            starters={starters}
            teamColor={team.primaryColor}
            initialFormation={persistedFormation}
            initialSlots={persistedSlots}
            onLayoutChange={setFieldLayout}
          />
        </div>
      )}

      {(view === "list" || view === "both") && <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
        <SortableZone
          id="starter"
          label={`Titulares (${starters.length}/${MAX_STARTERS})`}
          items={starterIds}
          hint="Arraste jogadores aqui"
        >
          {starters.map((item) => (
            <SortablePlayerCard
              key={item.playerId}
              item={item}
              onChangeNumber={readOnly ? undefined : changeNumber}
              onToggleStatus={readOnly ? undefined : toggleStatus}
              onRemove={readOnly ? undefined : removePlayer}
              suspension={suspensions[item.playerId]}
            />
          ))}
        </SortableZone>

        <SortableZone
          id="substitute"
          label={`Reservas (${substitutes.length})`}
          items={substituteIds}
          hint="Arraste jogadores aqui"
        >
          {substitutes.map((item) => (
            <SortablePlayerCard
              key={item.playerId}
              item={item}
              onChangeNumber={readOnly ? undefined : changeNumber}
              onToggleStatus={readOnly ? undefined : toggleStatus}
              onRemove={readOnly ? undefined : removePlayer}
              suspension={suspensions[item.playerId]}
            />
          ))}
        </SortableZone>

        <SortableZone
          id="available"
          label={`Elenco disponível (${
            availableQuery.trim()
              ? `${filteredAvailable.length}/${available.length}`
              : available.length
          })`}
          items={filteredAvailableIds}
          hint={availableQuery.trim() ? "Nenhum jogador encontrado" : undefined}
          filter={
            !readOnly && available.length > 0 ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={availableQuery}
                  onChange={(e) => setAvailableQuery(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="Buscar jogador..."
                  className="h-8 pl-7 pr-7 text-sm"
                />
                {availableQuery && (
                  <button
                    type="button"
                    onClick={() => setAvailableQuery("")}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
                    title="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : undefined
          }
        >
          {filteredAvailable.map((item) => (
            <SortablePlayerCard
              key={item.playerId}
              item={item}
              onAddStarter={readOnly ? undefined : addAsStarter}
              onAddSubstitute={readOnly ? undefined : addAsSubstitute}
            />
          ))}
        </SortableZone>

        <DragOverlay>
          {activeItem ? <OverlayCard item={activeItem} /> : null}
        </DragOverlay>
        </div>
      </DndContext>}
      </div>

      {!readOnly && (
        <Button
          onClick={handleSave}
          disabled={saving || starters.length === 0}
          size="sm"
          className="w-full"
        >
          <Save className="h-4 w-4 mr-1" />
          {saving
            ? "Salvando..."
            : (saveLabel ?? "Salvar escalação")}
        </Button>
      )}
    </div>
  );
}
