"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Download,
  AlertTriangle,
  Check,
  History,
  RotateCcw,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  resolvePlayerCards,
  undoLastCardReset,
} from "@/app/admin/cartoes/actions";
import type { CardReportEntry, CardResetEntry, Team } from "@/lib/queries";

interface Props {
  readonly entries: CardReportEntry[];
  readonly resets: CardResetEntry[];
  readonly seasonId: string;
  readonly seasonName: string;
}

interface TeamGroup {
  team: Team;
  rows: CardReportEntry[];
  totalYellow: number;
  totalRed: number;
  totalSuspended: number;
}

function isSuspended(entry: CardReportEntry, yellowLimit = 3): boolean {
  return entry.redCards > 0 || entry.yellowCards >= yellowLimit;
}

function groupByTeam(entries: CardReportEntry[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>();
  for (const e of entries) {
    if (!e.team || !e.player) continue;
    const existing = map.get(e.teamId);
    if (existing) {
      existing.rows.push(e);
      existing.totalYellow += e.yellowCards;
      existing.totalRed += e.redCards;
      if (isSuspended(e)) existing.totalSuspended += 1;
    } else {
      map.set(e.teamId, {
        team: e.team,
        rows: [e],
        totalYellow: e.yellowCards,
        totalRed: e.redCards,
        totalSuspended: isSuspended(e) ? 1 : 0,
      });
    }
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.rows.sort((a, b) => {
      const aSusp = isSuspended(a) ? 0 : 1;
      const bSusp = isSuspended(b) ? 0 : 1;
      if (aSusp !== bSusp) return aSusp - bSusp;
      const aTotal = a.yellowCards + a.redCards * 3;
      const bTotal = b.yellowCards + b.redCards * 3;
      if (aTotal !== bTotal) return bTotal - aTotal;
      return (a.player?.nickname ?? "").localeCompare(
        b.player?.nickname ?? "",
      );
    });
  }
  groups.sort((a, b) => {
    if (a.totalSuspended !== b.totalSuspended)
      return b.totalSuspended - a.totalSuspended;
    const aTotal = a.totalYellow + a.totalRed * 3;
    const bTotal = b.totalYellow + b.totalRed * 3;
    if (aTotal !== bTotal) return bTotal - aTotal;
    return a.team.shortName.localeCompare(b.team.shortName);
  });
  return groups;
}

function YellowCard({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-label="Cartão amarelo"
      style={{
        width: size,
        height: size * 1.4,
        background: "#facc15",
        borderRadius: 2,
        boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.18)",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function RedCard({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-label="Cartão vermelho"
      style={{
        width: size,
        height: size * 1.4,
        background: "#dc2626",
        borderRadius: 2,
        boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function CardStack({
  count,
  variant,
}: {
  count: number;
  variant: "yellow" | "red";
}) {
  if (count <= 0) return null;
  const Card = variant === "yellow" ? YellowCard : RedCard;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-flex", gap: 2 }}>
        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
          <Card key={i} />
        ))}
      </span>
      {count > 3 && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1f2937",
          }}
        >
          ×{count}
        </span>
      )}
    </span>
  );
}

type CardFilter = "suspended" | "all";

export function CardsReport({ entries, resets, seasonId, seasonName }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filter, setFilter] = useState<CardFilter>("suspended");
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => groupByTeam(entries), [entries]);
  const totalSuspended = useMemo(
    () => entries.filter((e) => isSuspended(e)).length,
    [entries],
  );
  const totalYellow = useMemo(
    () => entries.reduce((n, e) => n + e.yellowCards, 0),
    [entries],
  );
  const totalRed = useMemo(
    () => entries.reduce((n, e) => n + e.redCards, 0),
    [entries],
  );
  const visibleGroups = useMemo(() => {
    if (filter === "all") return groups;
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => isSuspended(r)),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, filter]);
  const entryById = useMemo(
    () => new Map(entries.map((e) => [e.playerId, e])),
    [entries],
  );
  const playerNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries) {
      if (e.player) m.set(e.playerId, e.player.nickname ?? e.player.name);
    }
    return m;
  }, [entries]);

  async function handleDownload() {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0b1220",
        cacheBust: true,
      });
      const link = document.createElement("a");
      const slug = (seasonName || "temporada")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      link.download = `cartoes-${slug}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem baixada");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar imagem");
    } finally {
      setDownloading(false);
    }
  }

  function handleConfirmResolve() {
    const playerId = pendingPlayerId;
    if (!playerId) return;
    startTransition(async () => {
      const result = await resolvePlayerCards(playerId, seasonId);
      if (result.success) {
        toast.success("Cartões zerados");
        setPendingPlayerId(null);
      } else {
        toast.error(result.error ?? "Erro ao zerar cartões");
      }
    });
  }

  function handleUndoReset(resetId: string) {
    startTransition(async () => {
      const result = await undoLastCardReset(resetId);
      if (result.success) {
        toast.success("Reset desfeito");
      } else {
        toast.error(result.error ?? "Erro ao desfazer");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-200/80">
            Suspensos
          </p>
          <p className="text-2xl font-black tabular-nums mt-1">{totalSuspended}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Amarelos
          </p>
          <p className="text-2xl font-black tabular-nums mt-1">{totalYellow}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Vermelhos
          </p>
          <p className="text-2xl font-black tabular-nums mt-1">{totalRed}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1 rounded-lg border border-border/40 p-1">
          <button
            type="button"
            onClick={() => setFilter("suspended")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "suspended"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Suspensos
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos com cartão
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            disabled={resets.length === 0}
          >
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || groups.length === 0}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-1" />
            {downloading ? "Gerando..." : "PNG"}
          </Button>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-4 py-10 text-center text-sm text-muted-foreground">
          {filter === "suspended"
            ? "Nenhum jogador suspenso nesta temporada."
            : "Nenhum cartão registrado."}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map((group) => (
            <div
              key={group.team.id}
              className="rounded-xl border border-border/40 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-card/40">
                {group.team.logoUrl ? (
                  <Image
                    src={group.team.logoUrl}
                    alt=""
                    width={22}
                    height={22}
                    className="rounded"
                  />
                ) : (
                  <span
                    className="h-5 w-5 rounded"
                    style={{ background: group.team.primaryColor }}
                  />
                )}
                <p className="text-sm font-semibold flex-1">{group.team.name}</p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {group.rows.filter((r) => isSuspended(r)).length} suspenso
                  {group.rows.filter((r) => isSuspended(r)).length === 1
                    ? ""
                    : "s"}
                </span>
              </div>
              <ul className="divide-y divide-border/30">
                {group.rows.map((row) => {
                  const suspended = isSuspended(row);
                  return (
                    <li
                      key={row.playerId}
                      className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${
                        suspended ? "bg-orange-500/5" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {row.player?.nickname ?? row.player?.name ?? "—"}
                          <span className="ml-2 text-[10px] font-bold text-muted-foreground">
                            {row.player?.position}
                          </span>
                        </p>
                        {suspended ? (
                          <p className="text-xs text-orange-300/90">
                            {row.redCards > 0
                              ? "Suspenso por vermelho"
                              : "Suspenso por acumulação de amarelos"}
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm tabular-nums">
                        {row.yellowCards > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <YellowCard size={12} /> {row.yellowCards}
                          </span>
                        ) : null}
                        {row.redCards > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <RedCard size={12} /> {row.redCards}
                          </span>
                        ) : null}
                      </span>
                      {suspended ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          disabled={pending}
                          onClick={() => setPendingPlayerId(row.playerId)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Cumpriu
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Hidden mirror used for PNG capture — fixed 720px, off-screen.
          No action buttons here so the exported image stays clean. */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: -10000,
          width: 720,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={captureRef}>
          <ReportBody groups={groups} seasonName={seasonName} width={720} />
        </div>
      </div>

      {/* Confirm resolve dialog */}
      <Dialog
        open={pendingPlayerId !== null}
        onOpenChange={(o) => !o && setPendingPlayerId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zerar cartões?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">
                {pendingPlayerId
                  ? playerNameMap.get(pendingPlayerId) ?? "Jogador"
                  : ""}
              </strong>{" "}
              terá os cartões zerados na temporada{" "}
              <strong className="text-foreground">{seasonName}</strong>.
            </p>
            {pendingPlayerId && entryById.get(pendingPlayerId) && (
              <p className="text-xs">
                Acumulado atual:{" "}
                <span className="text-foreground font-medium">
                  {entryById.get(pendingPlayerId)!.yellowCards} 🟨 ·{" "}
                  {entryById.get(pendingPlayerId)!.redCards} 🟥
                </span>
              </p>
            )}
            <p className="text-xs">
              O histórico dos cartões continua salvo. Use o botão
              &quot;Histórico&quot; para desfazer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingPlayerId(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmResolve} disabled={pending}>
              {pending ? "Zerando..." : "Zerar cartões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de resets</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/30">
            {resets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum reset registrado.
              </p>
            ) : (
              resets.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {playerNameMap.get(r.playerId) ?? r.playerId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.resetAt).toLocaleString("pt-BR")}
                      {r.userEmail && ` · ${r.userEmail}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-400"
                    onClick={() => handleUndoReset(r.id)}
                    disabled={pending}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Desfazer
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportBody({
  groups,
  seasonName,
  width,
  onResolve,
  actionDisabled,
}: {
  groups: TeamGroup[];
  seasonName: string;
  width: number | string;
  onResolve?: (playerId: string) => void;
  actionDisabled?: boolean;
}) {
  const totalSuspended = groups.reduce((s, g) => s + g.totalSuspended, 0);
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        color: "#f9fafb",
        padding: 28,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        width,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Image
          src="/images/competitions/sfl.png"
          alt="SFL"
          width={44}
          height={44}
          style={{ borderRadius: 999 }}
          unoptimized
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#94a3b8",
              fontWeight: 700,
            }}
          >
            Relatório de Cartões
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: -0.4,
            }}
          >
            {seasonName || "Temporada"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Stat
            label="Amarelos"
            value={groups.reduce((s, g) => s + g.totalYellow, 0)}
            accent="#facc15"
          />
          <Stat
            label="Vermelhos"
            value={groups.reduce((s, g) => s + g.totalRed, 0)}
            accent="#dc2626"
          />
          <Stat label="Suspensos" value={totalSuspended} accent="#f97316" />
        </div>
      </div>

      {/* Teams */}
      {groups.length === 0 ? (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          Nenhum cartão registrado nessa temporada ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {groups.map((g) => (
            <TeamBlock
              key={g.team.id}
              group={g}
              onResolve={onResolve}
              actionDisabled={actionDisabled}
            />
          ))}
        </div>
      )}

      {/* Footer rules */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "rgba(249, 115, 22, 0.08)",
          border: "1px solid rgba(249, 115, 22, 0.25)",
          borderRadius: 12,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            background: "#f97316",
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <AlertTriangle size={16} color="#0b1220" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "#e5e7eb" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span style={{ display: "inline-flex", gap: 2 }}>
              <YellowCard size={12} />
              <YellowCard size={12} />
              <YellowCard size={12} />
            </span>
            <span>
              <strong>3 Amarelos</strong> = Suspensão de 1 Jogo ou Pagamento
              da Multa (<strong>R$15,00</strong>)
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RedCard size={12} />
            <span>
              <strong>1 Vermelho direto</strong> = Suspensão de 1 Jogo ou
              Pagamento da Multa (dependendo do motivo da expulsão)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div style={{ textAlign: "right" }}>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#94a3b8",
          marginTop: 4,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function TeamBlock({
  group,
  onResolve,
  actionDisabled,
}: {
  group: TeamGroup;
  onResolve?: (playerId: string) => void;
  actionDisabled?: boolean;
}) {
  const { team, rows } = group;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: `linear-gradient(90deg, ${team.primaryColor}33 0%, transparent 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.shortName}
            width={26}
            height={26}
            unoptimized
            style={{ borderRadius: 6 }}
          />
        ) : (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: team.primaryColor,
            }}
          />
        )}
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {team.name}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            fontSize: 12,
            color: "#94a3b8",
          }}
        >
          {group.totalYellow > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <YellowCard size={10} /> {group.totalYellow}
            </span>
          )}
          {group.totalRed > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <RedCard size={10} /> {group.totalRed}
            </span>
          )}
        </div>
      </div>

      <div>
        {rows.map((row, idx) => {
          const suspended = isSuspended(row);
          return (
            <div
              key={row.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderTop:
                  idx === 0 ? "none" : "1px solid rgba(255,255,255,0.04)",
                background: suspended
                  ? "rgba(249, 115, 22, 0.10)"
                  : "transparent",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: suspended ? "#fdba74" : "#e5e7eb",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.player?.nickname ?? row.player?.name ?? "—"}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      letterSpacing: 0.6,
                    }}
                  >
                    {row.player?.position}
                  </span>
                </div>
                {row.lastResetAt && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#64748b",
                      marginTop: 2,
                    }}
                  >
                    Histórico: {row.totalYellowCards} 🟨 · {row.totalRedCards}{" "}
                    🟥
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CardStack count={row.yellowCards} variant="yellow" />
                <CardStack count={row.redCards} variant="red" />
              </div>

              {suspended && (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: "#0b1220",
                    background: "#f97316",
                    padding: "3px 8px",
                    borderRadius: 999,
                    flexShrink: 0,
                  }}
                >
                  SUSPENSO
                </div>
              )}
              {suspended && onResolve && (
                <button
                  type="button"
                  onClick={() => onResolve(row.playerId)}
                  disabled={actionDisabled}
                  title="Marcar como cumprido / pago"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#10b981",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    padding: "4px 10px",
                    borderRadius: 999,
                    cursor: actionDisabled ? "not-allowed" : "pointer",
                    opacity: actionDisabled ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  <Check size={12} strokeWidth={2.5} />
                  Resolveu
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
