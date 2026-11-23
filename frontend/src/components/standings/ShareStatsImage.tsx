"use client";

import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlayerStatEntry } from "@/lib/queries";

type StatType = "goals" | "assists";

interface Props {
  type: StatType;
  stats: PlayerStatEntry[];
  seasonLabel: string;
}

const TITLE: Record<StatType, string> = {
  goals: "TOP 5 - ARTILHARIA",
  assists: "TOP 5 - ASSISTÊNCIAS",
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = src.startsWith("/") ? `${window.location.origin}${src}` : src;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function drawStatsCard(
  type: StatType,
  stats: PlayerStatEntry[],
  seasonLabel: string,
): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // ── Background ──
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, "#0C0C0F");
  bg.addColorStop(0.5, "#141428");
  bg.addColorStop(1, "#0C0C0F");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Logo ──
  const logo = await loadImage("/images/competitions/sfl.png");

  // ── Calculate total content height to center vertically ──
  const top5 = stats.slice(0, 5);
  const logoH = logo ? 120 + 24 : 0;     // logo + gap
  const seasonH = 22 + 32;                // text + gap
  const titleH = 52 + 72;                 // text + gap
  const rowH = 96;
  const rowGap = 20;
  const rowsH = top5.length * rowH + (top5.length - 1) * rowGap;
  const totalH = logoH + seasonH + titleH + rowsH;

  let cursorY = (H - totalH) / 2 + logoH;

  // Subtle glow centered on content
  const glowCenterY = cursorY - logoH / 2;
  const glow = ctx.createRadialGradient(W / 2, glowCenterY, 0, W / 2, glowCenterY, 500);
  glow.addColorStop(0, "rgba(26,54,148,0.15)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  if (logo) {
    const logoSize = 120;
    ctx.drawImage(logo, (W - logoSize) / 2, cursorY - logoSize - 24, logoSize, logoSize);
  }

  // ── Season label ──
  ctx.fillStyle = "#7E7E8A";
  ctx.font = "600 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  ctx.fillText(seasonLabel.toUpperCase(), W / 2, cursorY);
  cursorY += 56;

  // ── Title with gradient ──
  ctx.font = "900 52px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "2px";
  const titleGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  if (type === "goals") {
    titleGrad.addColorStop(0, "#FBBF24");
    titleGrad.addColorStop(1, "#F59E0B");
  } else {
    titleGrad.addColorStop(0, "#34D399");
    titleGrad.addColorStop(1, "#10B981");
  }
  ctx.fillStyle = titleGrad;
  ctx.fillText(TITLE[type], W / 2, cursorY);
  cursorY += 80;

  // ── Load team logos in parallel ──
  const teamLogoMap = new Map<string, HTMLImageElement | null>();
  const logoUrls = new Set<string>();
  for (const s of top5) {
    if (s.team?.logoUrl) logoUrls.add(s.team.logoUrl);
  }
  await Promise.all(
    [...logoUrls].map(async (url) => {
      teamLogoMap.set(url, await loadImage(url));
    }),
  );

  // ── Player rows ──
  const padX = 80;
  const rowW = W - padX * 2;

  ctx.textAlign = "left";
  ctx.letterSpacing = "0px";

  for (let i = 0; i < top5.length; i++) {
    const stat = top5[i];
    if (!stat.player || !stat.team) continue;
    const isFirst = i === 0;
    const value = type === "goals" ? stat.goals : stat.assists;
    const y = cursorY + i * (rowH + rowGap);

    // Row background
    roundRect(ctx, padX, y, rowW, rowH, 20);
    if (isFirst) {
      const rowBg = ctx.createLinearGradient(padX, y, padX + rowW, y + rowH);
      rowBg.addColorStop(0, "rgba(251,191,36,0.12)");
      rowBg.addColorStop(1, "rgba(251,191,36,0.04)");
      ctx.fillStyle = rowBg;
      ctx.fill();
      ctx.strokeStyle = "rgba(251,191,36,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const rowCenterY = y + rowH / 2;
    let cx = padX + 32;

    // Rank
    ctx.fillStyle = isFirst ? "#FBBF24" : "#7E7E8A";
    ctx.font = `900 ${isFirst ? 40 : 32}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), cx + 40, rowCenterY + (isFirst ? 14 : 11));
    cx += 56;

    // Team color bar
    roundRect(ctx, cx, rowCenterY - 26, 6, 52, 3);
    ctx.fillStyle = stat.team.primaryColor;
    ctx.fill();
    cx += 24;

    // Team logo
    const teamLogo = stat.team.logoUrl ? teamLogoMap.get(stat.team.logoUrl) : null;
    if (teamLogo) {
      ctx.drawImage(teamLogo, cx, rowCenterY - 24, 48, 48);
      cx += 64;
    } else {
      cx += 8;
    }

    // Player name
    ctx.textAlign = "left";
    ctx.fillStyle = isFirst ? "#FBBF24" : "#EDEDEF";
    ctx.font = `800 ${isFirst ? 32 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(stat.player.nickname, cx, rowCenterY - 2);

    // Team name
    ctx.fillStyle = "#7E7E8A";
    ctx.font = "400 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(stat.team.name, cx, rowCenterY + 24);

    // Stat value
    ctx.textAlign = "right";
    ctx.fillStyle = isFirst ? "#FBBF24" : "#EDEDEF";
    ctx.font = `900 ${isFirst ? 52 : 42}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(String(value), padX + rowW - 32, rowCenterY + (isFirst ? 18 : 15));
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function ShareStatsButton({ type, stats, seasonLabel }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    setGenerating(true);
    try {
      const blob = await drawStatsCard(type, stats, seasonLabel);
      if (!blob) return;

      const file = new File(
        [blob],
        `sfl-${type === "goals" ? "artilharia" : "assistencias"}.png`,
        { type: "image/png" },
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = file.name;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setGenerating(false);
    }
  }, [type, stats, seasonLabel]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleShare}
      disabled={generating}
    >
      <Share2 className="h-3.5 w-3.5" />
      {generating ? "Gerando..." : "Compartilhar Top 5"}
    </Button>
  );
}
