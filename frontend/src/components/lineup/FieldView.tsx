"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Pencil, Undo2, Trash2 } from "lucide-react";

// ── Types ──

export interface FieldPlayerStats {
  readonly goals: number;
  readonly assists: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly subOut: boolean;
  readonly subIn: boolean;
}

interface FieldPlayer {
  readonly nickname: string;
  readonly position: string;
  readonly shirtNumber: number;
}

// SVG viewBox is 0 0 68 105
// Field outline: x 2..66, y 2..103
// Convert SVG coords → CSS %: x% = svgX/68*100, y% = svgY/105*100
//
// Key SVG landmarks (bottom half = our side):
//   Goal line:       y = 103
//   Goal area:       y = 97.5..103, x = 22.5..45.5
//   Penalty area:    y = 86.5..103, x = 14.5..53.5
//   Penalty spot:    y ≈ 91
//   Center circle:   cy = 52.5, r = 9.15
//   Half line:       y = 52.5
//   Penalty area top: y = 2..18.5
//   Goal area top:    y = 2..7.5

interface Slot {
  readonly sx: number; // SVG x (0-68)
  readonly sy: number; // SVG y (0-105)
  readonly role: string;
}

interface Formation {
  readonly label: string;
  readonly slots: readonly Slot[];
}

function pct(svgX: number, svgY: number): { x: number; y: number } {
  return { x: (svgX / 68) * 100, y: (svgY / 105) * 100 };
}

// ── Formations in SVG coordinates ──

const formations: Record<string, Formation> = {
  // ── 4 defenders ──
  "4-3-3": {
    label: "4-3-3",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 18, sy: 58, role: "MEI" },
      { sx: 34, sy: 54, role: "MEI" },
      { sx: 50, sy: 58, role: "MEI" },
      { sx: 14, sy: 30, role: "ATA" },
      { sx: 34, sy: 22, role: "ATA" },
      { sx: 54, sy: 30, role: "ATA" },
    ],
  },
  "4-4-2": {
    label: "4-4-2",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 10, sy: 55, role: "MEI" },
      { sx: 26, sy: 58, role: "MEI" },
      { sx: 42, sy: 58, role: "MEI" },
      { sx: 58, sy: 55, role: "MEI" },
      { sx: 24, sy: 28, role: "ATA" },
      { sx: 44, sy: 28, role: "ATA" },
    ],
  },
  "4-4-2-diamante": {
    label: "4-4-2 Diamante",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 34, sy: 66, role: "VOL" },
      { sx: 16, sy: 54, role: "MEI" },
      { sx: 52, sy: 54, role: "MEI" },
      { sx: 34, sy: 42, role: "MEI" },    // meia atacante
      { sx: 24, sy: 26, role: "ATA" },
      { sx: 44, sy: 26, role: "ATA" },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 24, sy: 64, role: "VOL" },
      { sx: 44, sy: 64, role: "VOL" },
      { sx: 14, sy: 42, role: "MEI" },
      { sx: 34, sy: 38, role: "MEI" },
      { sx: 54, sy: 42, role: "MEI" },
      { sx: 34, sy: 18, role: "ATA" },
    ],
  },
  "4-1-4-1": {
    label: "4-1-4-1",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 34, sy: 66, role: "VOL" },
      { sx: 10, sy: 46, role: "MEI" },
      { sx: 26, sy: 50, role: "MEI" },
      { sx: 42, sy: 50, role: "MEI" },
      { sx: 58, sy: 46, role: "MEI" },
      { sx: 34, sy: 22, role: "ATA" },
    ],
  },
  "4-3-1-2": {
    label: "4-3-1-2",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 18, sy: 62, role: "MEI" },
      { sx: 34, sy: 58, role: "MEI" },
      { sx: 50, sy: 62, role: "MEI" },
      { sx: 34, sy: 40, role: "MEI" },    // trequartista
      { sx: 24, sy: 24, role: "ATA" },
      { sx: 44, sy: 24, role: "ATA" },
    ],
  },
  "4-5-1": {
    label: "4-5-1",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 10, sy: 80, role: "LAT" },
      { sx: 26, sy: 83, role: "ZAG" },
      { sx: 42, sy: 83, role: "ZAG" },
      { sx: 58, sy: 80, role: "LAT" },
      { sx: 10, sy: 52, role: "MEI" },
      { sx: 22, sy: 58, role: "MEI" },
      { sx: 34, sy: 54, role: "MEI" },
      { sx: 46, sy: 58, role: "MEI" },
      { sx: 58, sy: 52, role: "MEI" },
      { sx: 34, sy: 22, role: "ATA" },
    ],
  },
  // ── 3 defenders ──
  "3-5-2": {
    label: "3-5-2",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 18, sy: 82, role: "ZAG" },
      { sx: 34, sy: 84, role: "ZAG" },
      { sx: 50, sy: 82, role: "ZAG" },
      { sx: 6,  sy: 58, role: "LAT" },
      { sx: 24, sy: 62, role: "MEI" },
      { sx: 34, sy: 56, role: "MEI" },
      { sx: 44, sy: 62, role: "MEI" },
      { sx: 62, sy: 58, role: "LAT" },
      { sx: 24, sy: 28, role: "ATA" },
      { sx: 44, sy: 28, role: "ATA" },
    ],
  },
  "3-4-3": {
    label: "3-4-3",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 18, sy: 82, role: "ZAG" },
      { sx: 34, sy: 84, role: "ZAG" },
      { sx: 50, sy: 82, role: "ZAG" },
      { sx: 10, sy: 58, role: "LAT" },
      { sx: 28, sy: 60, role: "MEI" },
      { sx: 40, sy: 60, role: "MEI" },
      { sx: 58, sy: 58, role: "LAT" },
      { sx: 14, sy: 30, role: "ATA" },
      { sx: 34, sy: 22, role: "ATA" },
      { sx: 54, sy: 30, role: "ATA" },
    ],
  },
  "3-4-1-2": {
    label: "3-4-1-2",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 18, sy: 82, role: "ZAG" },
      { sx: 34, sy: 84, role: "ZAG" },
      { sx: 50, sy: 82, role: "ZAG" },
      { sx: 8,  sy: 58, role: "LAT" },
      { sx: 26, sy: 62, role: "MEI" },
      { sx: 42, sy: 62, role: "MEI" },
      { sx: 60, sy: 58, role: "LAT" },
      { sx: 34, sy: 40, role: "MEI" },    // trequartista
      { sx: 24, sy: 24, role: "ATA" },
      { sx: 44, sy: 24, role: "ATA" },
    ],
  },
  "3-4-2-1": {
    label: "3-4-2-1",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 18, sy: 82, role: "ZAG" },
      { sx: 34, sy: 84, role: "ZAG" },
      { sx: 50, sy: 82, role: "ZAG" },
      { sx: 8,  sy: 58, role: "LAT" },
      { sx: 26, sy: 62, role: "MEI" },
      { sx: 42, sy: 62, role: "MEI" },
      { sx: 60, sy: 58, role: "LAT" },
      { sx: 20, sy: 36, role: "ATA" },
      { sx: 48, sy: 36, role: "ATA" },
      { sx: 34, sy: 20, role: "ATA" },
    ],
  },
  // ── 5 defenders ──
  "5-3-2": {
    label: "5-3-2",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 6,  sy: 78, role: "LAT" },
      { sx: 18, sy: 83, role: "ZAG" },
      { sx: 34, sy: 85, role: "ZAG" },
      { sx: 50, sy: 83, role: "ZAG" },
      { sx: 62, sy: 78, role: "LAT" },
      { sx: 18, sy: 56, role: "MEI" },
      { sx: 34, sy: 52, role: "MEI" },
      { sx: 50, sy: 56, role: "MEI" },
      { sx: 24, sy: 28, role: "ATA" },
      { sx: 44, sy: 28, role: "ATA" },
    ],
  },
  "5-4-1": {
    label: "5-4-1",
    slots: [
      { sx: 34, sy: 96, role: "GOL" },
      { sx: 6,  sy: 78, role: "LAT" },
      { sx: 18, sy: 83, role: "ZAG" },
      { sx: 34, sy: 85, role: "ZAG" },
      { sx: 50, sy: 83, role: "ZAG" },
      { sx: 62, sy: 78, role: "LAT" },
      { sx: 10, sy: 52, role: "MEI" },
      { sx: 26, sy: 56, role: "MEI" },
      { sx: 42, sy: 56, role: "MEI" },
      { sx: 58, sy: 52, role: "MEI" },
      { sx: 34, sy: 24, role: "ATA" },
    ],
  },
};

// ── Slot assignment ──

export function assignPlayersToSlots(
  players: readonly FieldPlayer[],
  slots: readonly Slot[],
): (FieldPlayer | null)[] {
  const assigned: (FieldPlayer | null)[] = new Array(slots.length).fill(null);
  const used = new Set<number>();

  const roleSlots = new Map<string, number[]>();
  slots.forEach((slot, i) => {
    const arr = roleSlots.get(slot.role) ?? [];
    arr.push(i);
    roleSlots.set(slot.role, arr);
  });

  const remaining: FieldPlayer[] = [];
  for (const player of players) {
    const slotIndices = roleSlots.get(player.position);
    if (slotIndices) {
      const freeSlot = slotIndices.find((i) => !used.has(i));
      if (freeSlot !== undefined) {
        assigned[freeSlot] = player;
        used.add(freeSlot);
        continue;
      }
    }
    remaining.push(player);
  }

  for (const player of remaining) {
    const freeSlot = assigned.findIndex((_, i) => !used.has(i));
    if (freeSlot !== -1) {
      assigned[freeSlot] = player;
      used.add(freeSlot);
    }
  }

  return assigned;
}

// ── Position colors ──

export const dotColor: Record<string, string> = {
  GOL: "#eab308",
  ZAG: "#3b82f6",
  LAT: "#06b6d4",
  VOL: "#8b5cf6",
  MEI: "#10b981",
  ATA: "#ef4444",
};

// ── Drawing overlay ──

const DRAW_COLORS = ["#ffffff", "#ef4444", "#eab308", "#3b82f6"] as const;

interface Stroke {
  readonly points: readonly { x: number; y: number }[];
  readonly color: string;
}

function FieldDrawingOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [color, setColor] = useState<string>(DRAW_COLORS[0]);
  const drawingRef = useRef(false);
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Redraw all strokes
  const redraw = useCallback((ctx: CanvasRenderingContext2D, allStrokes: readonly Stroke[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Resize canvas to match parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext("2d");
      if (ctx) redraw(ctx, strokes);
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [strokes, redraw]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    e.preventDefault();
    drawingRef.current = true;
    currentPointsRef.current = [getPos(e)];
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getPos(e);
    currentPointsRef.current.push(pt);

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    redraw(ctx, strokes);

    // Draw current stroke
    const pts = currentPointsRef.current;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = currentPointsRef.current;
    if (pts.length >= 2) {
      setStrokes((prev) => [...prev, { points: [...pts], color }]);
    }
    currentPointsRef.current = [];
  };

  const undo = () => setStrokes((prev) => prev.slice(0, -1));
  const clear = () => {
    setStrokes([]);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-30"
        style={{ pointerEvents: active ? "auto" : "none", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* Drawing toolbar */}
      {active && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                color === c ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <div className="w-px h-5 bg-white/30 mx-1" />
          <button
            type="button"
            className="text-white/80 hover:text-white p-1 disabled:opacity-30"
            onClick={undo}
            disabled={strokes.length === 0}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="text-white/80 hover:text-white p-1 disabled:opacity-30"
            onClick={clear}
            disabled={strokes.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}

// ── Component ──

export const formationKeys = Object.keys(formations);
export { formations };

export interface FieldLayout {
  readonly formationKey: string;
  /** Maps playerShirtNumber → slot index (0-10) */
  readonly slotByShirt: ReadonlyMap<number, number>;
}

interface FieldViewProps {
  readonly starters: readonly FieldPlayer[];
  readonly teamColor?: string;
  readonly initialFormation?: string | null;
  readonly initialSlots?: ReadonlyMap<number, number> | null;
  readonly onLayoutChange?: (layout: FieldLayout) => void;
  readonly readOnly?: boolean;
  readonly playerStats?: ReadonlyMap<number, FieldPlayerStats>;
}

export function FieldView({ starters, teamColor, initialFormation, initialSlots, onLayoutChange, readOnly, playerStats }: FieldViewProps) {
  const [formationKey, setFormationKey] = useState(
    initialFormation && initialFormation in formations ? initialFormation : "4-3-3",
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const formation = formations[formationKey];

  const autoAssigned = useMemo(
    () => assignPlayersToSlots(starters, formation.slots),
    [starters, formation.slots],
  );

  // If we have persisted slot assignments, apply them on top of auto-assigned
  const initialAssigned = useMemo(() => {
    if (!initialSlots || initialSlots.size === 0) return autoAssigned;

    const result: (FieldPlayer | null)[] = new Array(formation.slots.length).fill(null);
    const placed = new Set<number>(); // slot indices already filled
    const usedPlayers = new Set<number>(); // shirt numbers already placed

    // Place players that have a persisted slot
    for (const player of starters) {
      const slotIdx = initialSlots.get(player.shirtNumber);
      if (slotIdx !== undefined && slotIdx < formation.slots.length && !placed.has(slotIdx)) {
        result[slotIdx] = player;
        placed.add(slotIdx);
        usedPlayers.add(player.shirtNumber);
      }
    }

    // Fill remaining players using auto-assignment for any unplaced
    for (const player of starters) {
      if (usedPlayers.has(player.shirtNumber)) continue;
      const freeSlot = result.findIndex((_, i) => !placed.has(i));
      if (freeSlot !== -1) {
        result[freeSlot] = player;
        placed.add(freeSlot);
      }
    }

    return result;
  }, [autoAssigned, initialSlots, starters, formation.slots.length]);

  const [positions, setPositions] = useState<(FieldPlayer | null)[]>(initialAssigned);
  const [selected, setSelected] = useState<number | null>(null);

  // Track whether this is the first render to avoid overwriting persisted slots
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPositions(autoAssigned);
    setSelected(null);
  }, [autoAssigned]);

  // Emit layout changes
  const emitLayout = useCallback(
    (fk: string, pos: (FieldPlayer | null)[]) => {
      if (!onLayoutChange) return;
      const slotByShirt = new Map<number, number>();
      pos.forEach((p, i) => {
        if (p) slotByShirt.set(p.shirtNumber, i);
      });
      onLayoutChange({ formationKey: fk, slotByShirt });
    },
    [onLayoutChange],
  );

  // Emit on positions or formation change
  useEffect(() => {
    emitLayout(formationKey, positions);
  }, [formationKey, positions, emitLayout]);

  function handleTap(index: number) {
    if (readOnly) return;
    if (positions[index] === null) return;

    if (selected === null) {
      setSelected(index);
    } else if (selected === index) {
      setSelected(null);
    } else {
      setPositions((prev) => {
        const next = [...prev];
        const temp = next[selected];
        next[selected] = next[index];
        next[index] = temp;
        return next;
      });
      setSelected(null);
    }
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "space-y-3"}>
      <div className={`flex items-center gap-3 ${fullscreen ? "px-4 py-3 border-b border-border/40" : ""}`}>
        {readOnly ? (
          <span className="text-xs text-muted-foreground shrink-0">
            Formação · {formation.label}
          </span>
        ) : (
          <>
            <Label className="text-xs text-muted-foreground shrink-0">Formação</Label>
            <Select value={formationKey} onValueChange={(v) => { if (v) setFormationKey(v); }}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formationKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {formations[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected !== null && (
              <span className="text-[10px] text-muted-foreground animate-pulse">
                Toque em outro jogador para trocar
              </span>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!readOnly && (
            <Button
              variant={drawing ? "secondary" : "ghost"}
              size="icon"
              className={`h-8 w-8 shrink-0 ${drawing ? "text-yellow-400" : ""}`}
              onClick={() => { setDrawing((d) => !d); setSelected(null); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Field */}
      <div
        className={`relative rounded-lg overflow-hidden border border-emerald-800/40 select-none ${
          fullscreen ? "flex-1 mx-4 mb-4" : "w-full max-w-sm mx-auto"
        }`}
        style={{
          ...(!fullscreen ? { aspectRatio: "68 / 105" } : {}),
          background: "linear-gradient(180deg, #1a7a3a 0%, #15692f 50%, #1a7a3a 100%)",
        }}
        onClick={() => { if (!drawing) setSelected(null); }}
      >
        {/* Drawing overlay */}
        <FieldDrawingOverlay active={drawing} />

        {/* Field markings */}
        <svg
          viewBox="0 0 68 105"
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.3"
          preserveAspectRatio="none"
        >
          <rect x="2" y="2" width="64" height="101" rx="0.5" />
          <line x1="2" y1="52.5" x2="66" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.15" />
          <circle cx="34" cy="52.5" r="0.5" fill="rgba(255,255,255,0.25)" />
          <rect x="14.5" y="2" width="39" height="16.5" />
          <rect x="22.5" y="2" width="23" height="5.5" />
          <path d="M 25 18.5 A 9.15 9.15 0 0 0 43 18.5" />
          <rect x="14.5" y="86.5" width="39" height="16.5" />
          <rect x="22.5" y="97.5" width="23" height="5.5" />
          <path d="M 25 86.5 A 9.15 9.15 0 0 1 43 86.5" />
          <path d="M 2 4 A 2 2 0 0 0 4 2" />
          <path d="M 64 2 A 2 2 0 0 0 66 4" />
          <path d="M 2 101 A 2 2 0 0 1 4 103" />
          <path d="M 64 103 A 2 2 0 0 1 66 101" />
        </svg>

        {/* Players — positioned using exact SVG coordinates as % */}
        {formation.slots.map((slot, i) => {
          const player = positions[i];
          if (!player) return null;

          const isSelected = selected === i;
          const color = teamColor ?? dotColor[player.position] ?? "#fff";
          const pos = pct(slot.sx, slot.sy);
          const stats = playerStats?.get(player.shirtNumber);

          return (
            <button
              key={i}
              type="button"
              className={`absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-transform ${
                isSelected ? "scale-125 z-20" : "z-10"
              } ${drawing ? "pointer-events-none" : ""} ${readOnly ? "cursor-default" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleTap(i);
              }}
            >
              <div className="relative">
                <div
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-md border-2 transition-colors ${
                    isSelected ? "border-yellow-300 ring-2 ring-yellow-300/50" : "border-white/30"
                  }`}
                  style={{ background: color }}
                >
                  {player.shirtNumber}
                </div>
                {stats && <PlayerStatsBadges stats={stats} />}
              </div>
              <span className="text-[9px] sm:text-[10px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mt-0.5 max-w-[70px] sm:max-w-[80px] text-center truncate leading-tight">
                {player.nickname}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Icons with intrinsic white fill (goal, assist, penalty-goal) need the
// brightness-0 filter to become visible on a light background.
const WHITE_FILL_ICONS = new Set([
  "/icons/goal.svg",
  "/icons/assist.svg",
  "/icons/penalty-goal.svg",
]);

function StatIcon({ src, size = 11 }: { src: string; size?: number }) {
  const needsInvert = WHITE_FILL_ICONS.has(src);
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0${needsInvert ? " brightness-0" : ""}`}
    />
  );
}

function PlayerStatsBadges({ stats }: { stats: FieldPlayerStats }) {
  const items: React.ReactNode[] = [];
  if (stats.goals > 0) {
    items.push(
      <span key="goals" className="inline-flex items-center gap-0.5">
        <StatIcon src="/icons/goal.svg" />
        {stats.goals > 1 && (
          <span className="text-[9px] font-bold">{stats.goals}</span>
        )}
      </span>,
    );
  }
  if (stats.assists > 0) {
    items.push(
      <span key="assists" className="inline-flex items-center gap-0.5">
        <StatIcon src="/icons/assist.svg" />
        {stats.assists > 1 && (
          <span className="text-[9px] font-bold">{stats.assists}</span>
        )}
      </span>,
    );
  }
  if (stats.yellowCards >= 2) {
    items.push(<StatIcon key="2y" src="/icons/second-yellow.svg" size={10} />);
  } else if (stats.yellowCards > 0) {
    items.push(<StatIcon key="ya" src="/icons/yellow-card.svg" size={10} />);
  }
  if (stats.redCards > 0 && stats.yellowCards < 2) {
    items.push(<StatIcon key="re" src="/icons/red-card.svg" size={10} />);
  }
  if (stats.subOut || stats.subIn) {
    items.push(<StatIcon key="sub" src="/icons/substitution.svg" />);
  }

  if (items.length === 0) return null;

  return (
    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 rounded-full bg-white shadow-md px-1.5 py-0.5 whitespace-nowrap text-zinc-900">
      {items}
    </span>
  );
}
