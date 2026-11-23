"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignPlayersToSlots,
  dotColor,
  formations,
} from "@/components/lineup/FieldView";
import type { MatchLineupPlayer, Team } from "@/lib/queries";

interface Props {
  readonly myTeam: Team;
  readonly opponent: Team;
  readonly round: number;
  readonly date: string;
  readonly venue: string;
  readonly formation?: string | null;
  readonly lineup: MatchLineupPlayer[];
  readonly compact?: boolean;
}

const POSITION_ORDER: Record<string, number> = {
  GOL: 0,
  ZAG: 1,
  LAT: 2,
  VOL: 3,
  MEI: 4,
  ATA: 5,
};

const POSITION_LABEL: Record<string, string> = {
  GOL: "GOL",
  ZAG: "ZAG",
  LAT: "LAT",
  VOL: "VOL",
  MEI: "MEI",
  ATA: "ATA",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildText(props: Props): string {
  const { myTeam, opponent, round, date, formation, lineup } = props;
  const sortByPosition = (a: MatchLineupPlayer, b: MatchLineupPlayer) =>
    (POSITION_ORDER[a.position] ?? 99) -
      (POSITION_ORDER[b.position] ?? 99) ||
    a.shirtNumber - b.shirtNumber;

  const starters = lineup
    .filter((p) => p.status === "starter")
    .sort(sortByPosition);
  const substitutes = lineup
    .filter((p) => p.status === "substitute")
    .sort(sortByPosition);

  const lines: string[] = [];
  lines.push(`${myTeam.shortName} vs ${opponent.shortName} — Rodada ${round}`);
  lines.push(`${formatDate(date)}${formation ? ` · ${formation}` : ""}`);
  lines.push("");
  lines.push(`Titulares (${starters.length}):`);
  for (const p of starters) {
    lines.push(`*${p.shirtNumber}* ${p.nickname || p.name}`);
  }

  if (substitutes.length > 0) {
    lines.push("");
    lines.push(`Reservas (${substitutes.length}):`);
    for (const p of substitutes) {
      lines.push(`*${p.shirtNumber}* ${p.nickname || p.name}`);
    }
  }

  return lines.join("\n");
}

export function LineupExport(props: Props) {
  const { myTeam, opponent, round, date, venue, formation, lineup, compact } =
    props;
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const text = useMemo(() => buildText(props), [props]);
  const starters = useMemo(
    () => lineup.filter((p) => p.status === "starter"),
    [lineup],
  );
  const substitutes = useMemo(
    () => lineup.filter((p) => p.status === "substitute"),
    [lineup],
  );
  const slug = `${myTeam.shortName}-vs-${opponent.shortName}-r${round}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  function handleWhatsApp() {
    if (starters.length === 0) {
      toast.error("Escalação ainda não tem titulares");
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDownload() {
    if (!captureRef.current) return;
    if (starters.length === 0) {
      toast.error("Escalação ainda não tem titulares");
      return;
    }
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0b1220",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `escalacao-${slug}.png`;
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

  const disabled = starters.length === 0;

  return (
    <div className={compact ? "" : "space-y-2"}>
      <div className={`flex items-center gap-${compact ? "1" : "2"}`}>
        <Button
          type="button"
          size={compact ? "icon" : "sm"}
          variant="outline"
          onClick={handleWhatsApp}
          disabled={disabled}
          className={compact ? "h-8 w-8" : "flex-1"}
          title="Compartilhar escalação no WhatsApp"
          aria-label="Compartilhar escalação no WhatsApp"
        >
          <Share2 className={compact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
          {!compact && "WhatsApp"}
        </Button>
        <Button
          type="button"
          size={compact ? "icon" : "sm"}
          variant="outline"
          onClick={handleDownload}
          disabled={disabled || downloading}
          className={compact ? "h-8 w-8" : "flex-1"}
          title="Baixar escalação como imagem"
          aria-label="Baixar escalação como imagem"
        >
          <Download className={compact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
          {!compact && (downloading ? "Gerando..." : "Imagem")}
        </Button>
      </div>

      {/* Hidden mirror used for PNG capture — fixed 720px, off-screen. */}
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
          <LineupCard
            myTeam={myTeam}
            opponent={opponent}
            round={round}
            date={date}
            venue={venue}
            formation={formation}
            starters={starters}
            substitutes={substitutes}
          />
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  readonly myTeam: Team;
  readonly opponent: Team;
  readonly round: number;
  readonly date: string;
  readonly venue: string;
  readonly formation?: string | null;
  readonly starters: MatchLineupPlayer[];
  readonly substitutes: MatchLineupPlayer[];
}

const FIELD_WIDTH = 460;
const FIELD_HEIGHT = Math.round((FIELD_WIDTH * 105) / 68);
const CARD_WIDTH = 720;

function resolveFormationKey(formation?: string | null): string {
  if (formation && formation in formations) return formation;
  return "4-3-3";
}

function buildFieldAssignments(
  starters: MatchLineupPlayer[],
  formationKey: string,
): (MatchLineupPlayer | null)[] {
  const formation = formations[formationKey];
  const slots = formation.slots;
  const result: (MatchLineupPlayer | null)[] = new Array(slots.length).fill(
    null,
  );
  const placed = new Set<number>();
  const usedShirts = new Set<number>();

  // Honor persisted positionIndex first
  for (const p of starters) {
    if (
      p.positionIndex !== null &&
      p.positionIndex !== undefined &&
      p.positionIndex < slots.length &&
      !placed.has(p.positionIndex)
    ) {
      result[p.positionIndex] = p;
      placed.add(p.positionIndex);
      usedShirts.add(p.shirtNumber);
    }
  }

  // Auto-assign the rest by role
  const remaining = starters.filter((p) => !usedShirts.has(p.shirtNumber));
  if (remaining.length > 0) {
    const fieldPlayers = remaining.map((p) => ({
      nickname: p.nickname || p.name,
      position: p.position,
      shirtNumber: p.shirtNumber,
    }));
    const autoSlots = slots.map((slot, i) => ({
      slot,
      filled: placed.has(i),
      index: i,
    }));
    const freeSlots = autoSlots.filter((s) => !s.filled).map((s) => s.slot);
    const assigned = assignPlayersToSlots(fieldPlayers, freeSlots);
    let freeIdx = 0;
    for (let i = 0; i < slots.length; i++) {
      if (placed.has(i)) continue;
      const fp = assigned[freeIdx++];
      if (fp) {
        const original = remaining.find((p) => p.shirtNumber === fp.shirtNumber);
        if (original) {
          result[i] = original;
          placed.add(i);
        }
      }
    }
  }

  return result;
}

function LineupCard({
  myTeam,
  opponent,
  round,
  date,
  venue,
  formation,
  starters,
  substitutes,
}: CardProps) {
  const formationKey = resolveFormationKey(formation);
  const slots = formations[formationKey].slots;
  const assignments = buildFieldAssignments(starters, formationKey);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0b1220 0%, #111827 100%)",
        color: "#f9fafb",
        padding: 28,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        width: CARD_WIDTH,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {myTeam.logoUrl ? (
          <Image
            src={myTeam.logoUrl}
            alt={myTeam.shortName}
            width={44}
            height={44}
            unoptimized
            style={{ borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: myTeam.primaryColor,
            }}
          />
        )}
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
            Escalação · Rodada {round}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: -0.4,
            }}
          >
            {myTeam.name}{" "}
            <span style={{ color: "#94a3b8", fontWeight: 700 }}>vs</span>{" "}
            {opponent.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              marginTop: 4,
            }}
          >
            {formatDate(date)}
            {venue ? ` · ${venue}` : ""}
            {` · ${formations[formationKey].label}`}
          </div>
        </div>
      </div>

      {/* Field */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: substitutes.length > 0 ? 18 : 0,
        }}
      >
        <FieldMap
          width={FIELD_WIDTH}
          height={FIELD_HEIGHT}
          slots={slots}
          assignments={assignments}
          teamColor={myTeam.primaryColor}
        />
      </div>

      {/* Substitutes */}
      {substitutes.length > 0 && (
        <>
          <SectionTitle>Reservas ({substitutes.length})</SectionTitle>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {[...substitutes]
              .sort(
                (a, b) =>
                  (POSITION_ORDER[a.position] ?? 99) -
                    (POSITION_ORDER[b.position] ?? 99) ||
                  a.shirtNumber - b.shirtNumber,
              )
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <ShirtBadge
                    number={p.shirtNumber}
                    accent={dotColor[p.position] ?? myTeam.primaryColor}
                    small
                  />
                  <span style={{ fontWeight: 600 }}>
                    {p.nickname || p.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#94a3b8",
                      letterSpacing: 0.5,
                    }}
                  >
                    {POSITION_LABEL[p.position] ?? p.position}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: "#94a3b8",
        fontWeight: 700,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

interface FieldMapProps {
  readonly width: number;
  readonly height: number;
  readonly slots: readonly { sx: number; sy: number; role: string }[];
  readonly assignments: (MatchLineupPlayer | null)[];
  readonly teamColor: string;
}

function FieldMap({
  width,
  height,
  slots,
  assignments,
  teamColor,
}: FieldMapProps) {
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(16,185,129,0.4)",
        background:
          "linear-gradient(180deg, #1a7a3a 0%, #15692f 50%, #1a7a3a 100%)",
      }}
    >
      {/* Field markings */}
      <svg
        viewBox="0 0 68 105"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.3"
        preserveAspectRatio="none"
      >
        <rect x="2" y="2" width="64" height="101" rx="0.5" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <circle cx="34" cy="52.5" r="0.5" fill="rgba(255,255,255,0.28)" />
        <rect x="14.5" y="2" width="39" height="16.5" />
        <rect x="22.5" y="2" width="23" height="5.5" />
        <path d="M 25 18.5 A 9.15 9.15 0 0 0 43 18.5" />
        <rect x="14.5" y="86.5" width="39" height="16.5" />
        <rect x="22.5" y="97.5" width="23" height="5.5" />
        <path d="M 25 86.5 A 9.15 9.15 0 0 1 43 86.5" />
      </svg>

      {/* Players */}
      {slots.map((slot, i) => {
        const player = assignments[i];
        if (!player) return null;
        const xPct = (slot.sx / 68) * 100;
        const yPct = (slot.sy / 105) * 100;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              width: 80,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: teamColor,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 900,
                border: "2px solid rgba(255,255,255,0.35)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
              }}
            >
              {player.shirtNumber}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#ffffff",
                textShadow: "0 1px 2px rgba(0,0,0,0.85)",
                textAlign: "center",
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.1,
              }}
            >
              {player.nickname || player.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShirtBadge({
  number,
  accent,
  small,
}: {
  number: number;
  accent: string;
  small?: boolean;
}) {
  const size = small ? 20 : 26;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: accent,
        color: "#ffffff",
        fontSize: small ? 10 : 12,
        fontWeight: 900,
        border: "1.5px solid rgba(255,255,255,0.35)",
      }}
    >
      {number}
    </span>
  );
}
