"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowRight,
  Circle,
  Eraser,
  Minus,
  Move,
  Pen,
  RotateCcw,
  Trash2,
  X,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchLineupPlayer, Team } from "@/lib/queries";
import {
  assignPlayersToSlots,
  formations,
} from "@/components/lineup/FieldView";

type Tool = "move" | "pen" | "arrow" | "line" | "circle" | "erase" | "ball";

type Point = { x: number; y: number }; // 0–1 relative to pitch

type Token = {
  id: string;
  kind: "player" | "ball" | "opponent";
  label: string;
  number?: number;
  color: string;
  x: number;
  y: number;
};

type Stroke =
  | {
      id: string;
      type: "pen" | "line" | "arrow" | "erase";
      color: string;
      width: number;
      points: Point[];
    }
  | {
      id: string;
      type: "circle";
      color: string;
      width: number;
      center: Point;
      radius: number;
    };

const COLORS = [
  "#FFFFFF",
  "#FBBF24",
  "#EF4444",
  "#3B82F6",
  "#22C55E",
  "#000000",
] as const;

const TOOLS: { id: Tool; label: string; icon: typeof Pen }[] = [
  { id: "move", label: "Mover", icon: Move },
  { id: "pen", label: "Caneta", icon: Pen },
  { id: "arrow", label: "Seta", icon: ArrowRight },
  { id: "line", label: "Linha", icon: Minus },
  { id: "circle", label: "Zona", icon: Circle },
  { id: "ball", label: "Bola", icon: CircleDot },
  { id: "erase", label: "Borracha", icon: Eraser },
];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** SVG do campo (68×105) → coordenada relativa 0–1 no pitch. */
function slotToPoint(sx: number, sy: number): Point {
  return { x: sx / 68, y: sy / 105 };
}

function resolveFormationKey(formation?: string | null): string {
  if (formation && formation in formations) return formation;
  return "4-3-3";
}

/**
 * Coloca titulares nos slots da formação.
 * Com formação salva: honra positionIndex (mesmo critério do FieldView).
 * Sem formação: ignora positionIndex (muitas vezes é só ordem da lista) e
 * encaixa por posição (GOL/ZAG/LAT/…).
 */
function assignToFormation(
  players: MatchLineupPlayer[],
  formationKey: string,
  honorSlotIndex: boolean,
): Array<{ player: MatchLineupPlayer; point: Point }> {
  const formation = formations[formationKey] ?? formations["4-3-3"];
  const slots = formation.slots;
  const result: (MatchLineupPlayer | null)[] = new Array(slots.length).fill(
    null,
  );
  const placed = new Set<number>();
  const usedIds = new Set<string>();

  if (honorSlotIndex) {
    for (const p of players) {
      if (
        p.positionIndex != null &&
        p.positionIndex >= 0 &&
        p.positionIndex < slots.length &&
        !placed.has(p.positionIndex)
      ) {
        result[p.positionIndex] = p;
        placed.add(p.positionIndex);
        usedIds.add(p.id);
      }
    }
  }

  const remaining = players.filter((p) => !usedIds.has(p.id));
  if (remaining.length > 0) {
    const freeSlots = slots.filter((_, i) => !placed.has(i));
    const fieldPlayers = remaining.map((p) => ({
      nickname: p.nickname || p.name,
      position: p.position || "MEI",
      shirtNumber: p.shirtNumber,
    }));
    const assigned = assignPlayersToSlots(fieldPlayers, freeSlots);
    let freeIdx = 0;
    for (let i = 0; i < slots.length; i++) {
      if (placed.has(i)) continue;
      const fp = assigned[freeIdx++];
      if (!fp) continue;
      const original =
        remaining.find(
          (p) => p.shirtNumber === fp.shirtNumber && !usedIds.has(p.id),
        ) ?? remaining.find((p) => !usedIds.has(p.id));
      if (original) {
        result[i] = original;
        placed.add(i);
        usedIds.add(original.id);
      }
    }
  }

  const placedPlayers: Array<{ player: MatchLineupPlayer; point: Point }> = [];
  for (let i = 0; i < slots.length; i++) {
    const p = result[i];
    if (!p) continue;
    placedPlayers.push({
      player: p,
      point: slotToPoint(slots[i].sx, slots[i].sy),
    });
  }

  // Extras (ex.: mais de 11 em campo) na lateral
  const extras = players.filter((p) => !usedIds.has(p.id));
  extras.forEach((p, i) => {
    placedPlayers.push({
      player: p,
      point: { x: 0.92, y: 0.2 + i * 0.07 },
    });
  });

  return placedPlayers;
}

function buildInitialTokens(
  team: Team,
  players: MatchLineupPlayer[],
  formation?: string | null,
): Token[] {
  const hasSavedFormation = Boolean(
    formation && formation in formations,
  );
  const formationKey = resolveFormationKey(formation);
  const placed = assignToFormation(
    players,
    formationKey,
    hasSavedFormation,
  );
  const tokens: Token[] = placed.map(({ player: p, point }) => ({
    id: p.playerId || p.id,
    kind: "player" as const,
    label: p.nickname,
    number: p.shirtNumber,
    color: team.primaryColor || "#1C2F68",
    x: point.x,
    y: point.y,
  }));

  for (let i = 0; i < 5; i++) {
    tokens.push({
      id: `opp-${i}`,
      kind: "opponent",
      label: "ADV",
      color: "#6B7280",
      x: 0.2 + i * 0.15,
      y: 0.08,
    });
  }

  tokens.push({
    id: "ball",
    kind: "ball",
    label: "●",
    color: "#FFFFFF",
    x: 0.5,
    y: 0.5,
  });

  return tokens;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  w: number,
  h: number,
) {
  const x1 = from.x * w;
  const y1 = from.y * h;
  const x2 = to.x * w;
  const y2 = to.y * h;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 14;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  for (const s of strokes) {
    if (s.type === "circle") {
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.setLineDash([8, 6]);
      ctx.arc(
        s.center.x * w,
        s.center.y * h,
        s.radius * Math.min(w, h),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }

    if (s.points.length < 2) continue;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.width;
    if (s.type === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = s.width * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
    }
    ctx.stroke();
    if (s.type === "arrow") {
      drawArrowHead(
        ctx,
        s.points[s.points.length - 2] ?? s.points[0],
        s.points[s.points.length - 1],
        w,
        h,
      );
    }
    ctx.globalCompositeOperation = "source-over";
  }
}

type Props = {
  team: Team;
  players: MatchLineupPlayer[];
  /** Chave da formação salva na partida (ex. "4-3-3"). */
  formation?: string | null;
  onClose: () => void;
};

/**
 * Mesa tática fullscreen. Estado local — ao fechar (unmount) zera tudo.
 */
export function TacticalBoard({ team, players, formation, onClose }: Props) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formationKey = resolveFormationKey(formation);
  const formationLabel =
    formations[formationKey]?.label ?? formationKey;

  const [tool, setTool] = useState<Tool>("move");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [tokens, setTokens] = useState<Token[]>(() =>
    buildInitialTokens(team, players, formation),
  );
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<
    Array<{ tokens: Token[]; strokes: Stroke[] }>
  >([]);

  const drawing = useRef(false);
  const currentStroke = useRef<Stroke | null>(null);
  const dragId = useRef<string | null>(null);

  const pushHistory = useCallback(() => {
    setHistory((h) =>
      [...h, { tokens: structuredClone(tokens), strokes: structuredClone(strokes) }].slice(
        -40,
      ),
    );
  }, [tokens, strokes]);

  const relPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const el = pitchRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return {
      x: Math.min(1, Math.max(0, (clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (clientY - r.top) / r.height)),
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const pitch = pitchRef.current;
    if (!canvas || !pitch) return;
    const r = pitch.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    canvas.style.width = `${r.width}px`;
    canvas.style.height = `${r.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintStrokes(ctx, strokes, r.width, r.height);
  }, [strokes]);

  useEffect(() => {
    redraw();
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    const pitch = pitchRef.current;
    const ro =
      pitch && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => redraw())
        : null;
    if (pitch && ro) ro.observe(pitch);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [redraw]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleUndo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setTokens(prev.tokens);
      setStrokes(prev.strokes);
      return h.slice(0, -1);
    });
  }

  function handleClear() {
    pushHistory();
    setStrokes([]);
    setTokens(buildInitialTokens(team, players, formation));
  }

  function onPitchPointerDown(e: ReactPointerEvent) {
    if (tool === "move") return;
    if (tool === "ball") {
      const p = relPoint(e.clientX, e.clientY);
      if (!p) return;
      pushHistory();
      setTokens((list) =>
        list.map((t) => (t.kind === "ball" ? { ...t, x: p.x, y: p.y } : t)),
      );
      return;
    }

    const p = relPoint(e.clientX, e.clientY);
    if (!p) return;
    pushHistory();
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (tool === "circle") {
      currentStroke.current = {
        id: uid(),
        type: "circle",
        color,
        width: 3,
        center: p,
        radius: 0,
      };
    } else {
      currentStroke.current = {
        id: uid(),
        type: tool === "erase" ? "erase" : tool,
        color,
        width: tool === "erase" ? 8 : 3.5,
        points: [p],
      };
    }
    setStrokes((s) => [...s, currentStroke.current!]);
  }

  function onPitchPointerMove(e: ReactPointerEvent) {
    if (!drawing.current || !currentStroke.current) return;
    const p = relPoint(e.clientX, e.clientY);
    if (!p) return;
    const cur = currentStroke.current;
    if (cur.type === "circle") {
      const dx = p.x - cur.center.x;
      const dy = p.y - cur.center.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      currentStroke.current = { ...cur, radius };
      setStrokes((list) =>
        list.map((s) => (s.id === cur.id ? currentStroke.current! : s)),
      );
      return;
    }
    if (cur.type === "line" || cur.type === "arrow") {
      currentStroke.current = {
        ...cur,
        points: [cur.points[0], p],
      };
    } else {
      currentStroke.current = {
        ...cur,
        points: [...cur.points, p],
      };
    }
    setStrokes((list) =>
      list.map((s) => (s.id === cur.id ? currentStroke.current! : s)),
    );
  }

  function onPitchPointerUp() {
    drawing.current = false;
    currentStroke.current = null;
  }

  function onTokenPointerDown(e: ReactPointerEvent, id: string) {
    if (tool !== "move" && tool !== "ball") return;
    e.stopPropagation();
    pushHistory();
    dragId.current = id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onTokenPointerMove(e: ReactPointerEvent) {
    if (!dragId.current) return;
    const p = relPoint(e.clientX, e.clientY);
    if (!p) return;
    const id = dragId.current;
    setTokens((list) =>
      list.map((t) => (t.id === id ? { ...t, x: p.x, y: p.y } : t)),
    );
  }

  function onTokenPointerUp() {
    dragId.current = null;
  }

  const title = useMemo(
    () => `${team.name} · ${formationLabel}`,
    [team.name, formationLabel],
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0B1220] text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Title bar — compact on phone */}
      <header className="shrink-0 border-b border-white/10 bg-[#0B1220]/95">
        <div className="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cta sm:text-[10px]">
              Quadro tático
            </p>
            <h2 className="font-display text-base tracking-wide truncate leading-tight mt-0.5 sm:text-xl sm:leading-none">
              {title}
            </h2>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleUndo}
              disabled={history.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Desfazer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-300 hover:bg-red-500/20 hover:text-red-200"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10"
            onClick={onClose}
            aria-label="Fechar mesa tática"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Pitch — contain inside remaining viewport (iPhone 15 safe) */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2 sm:px-5 sm:py-4 [container-type:size]">
        <div
          ref={pitchRef}
          className="relative touch-none select-none overflow-visible rounded-xl shadow-2xl ring-1 ring-white/20 sm:rounded-2xl"
          style={{
            aspectRatio: "68 / 105",
            width: "min(100cqw, calc(100cqh * 68 / 105), 48rem)",
            height: "auto",
            maxHeight: "100cqh",
          }}
          onPointerDown={onPitchPointerDown}
          onPointerMove={onPitchPointerMove}
          onPointerUp={onPitchPointerUp}
          onPointerCancel={onPitchPointerUp}
        >
          <div
            className="absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl"
            style={{
              background:
                "linear-gradient(180deg, #1a7a3a 0%, #14632f 40%, #0f5226 100%)",
            }}
            aria-hidden
          >
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              viewBox="0 0 100 140"
              preserveAspectRatio="none"
            >
              <rect
                x="3"
                y="3"
                width="94"
                height="134"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.6"
              />
              <line
                x1="3"
                y1="70"
                x2="97"
                y2="70"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
              <circle
                cx="50"
                cy="70"
                r="10"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="70" r="0.8" fill="rgba(255,255,255,0.7)" />
              <rect
                x="28"
                y="3"
                width="44"
                height="18"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
              <rect
                x="36"
                y="3"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
              <rect
                x="28"
                y="119"
                width="44"
                height="18"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
              <rect
                x="36"
                y="129"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.5"
              />
            </svg>
          </div>

          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full pointer-events-none rounded-xl sm:rounded-2xl"
          />

          {tokens.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none",
                tool === "move" || (tool === "ball" && t.kind === "ball")
                  ? "cursor-grab active:cursor-grabbing"
                  : "pointer-events-none",
              )}
              style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
              onPointerDown={(e) => onTokenPointerDown(e, t.id)}
              onPointerMove={onTokenPointerMove}
              onPointerUp={onTokenPointerUp}
              onPointerCancel={onTokenPointerUp}
              title={t.label}
            >
              {t.kind === "ball" ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-black text-zinc-800 shadow-md ring-2 ring-black/20 sm:h-7 sm:w-7 sm:text-[10px]">
                  ●
                </span>
              ) : t.kind === "opponent" ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-700/90 text-[8px] font-bold text-white shadow-md ring-2 ring-white/20 sm:h-9 sm:w-9 sm:text-[9px]">
                  ADV
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-lg ring-2 ring-white/40 sm:h-10 sm:w-10 sm:text-sm"
                    style={{ background: t.color }}
                  >
                    {t.number ?? "?"}
                  </span>
                  <span className="mt-0.5 max-w-[56px] truncate rounded bg-black/55 px-1 py-0.5 text-[8px] font-semibold leading-none sm:max-w-[72px] sm:px-1.5 sm:text-[9px]">
                    {t.label}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom chrome: tools + colors + mobile actions */}
      <footer className="shrink-0 border-t border-white/10 bg-[#0B1220]/98">
        <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 sm:gap-2 sm:px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/5 p-0.5 sm:gap-1 sm:p-1">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={tool === t.id}
                  onClick={() => setTool(t.id)}
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5",
                    tool === t.id
                      ? "bg-cta text-cta-foreground"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mx-0.5 h-7 w-px shrink-0 bg-white/15 sm:mx-1" />

          <div className="flex shrink-0 items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full ring-2 transition sm:h-7 sm:w-7",
                  color === c ? "ring-cta scale-110" : "ring-transparent",
                )}
                style={{
                  background: c,
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={handleUndo}
              disabled={history.length === 0}
              aria-label="Desfazer"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-red-300 hover:bg-red-500/20 hover:text-red-200"
              onClick={handleClear}
              aria-label="Limpar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="hidden px-4 pb-2 text-center text-[11px] text-white/40 sm:block">
          Ao fechar, a mesa é zerada. Use Desfazer ou Limpar durante a sessão.
        </p>
      </footer>
    </div>
  );
}
