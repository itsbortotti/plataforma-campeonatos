"use client";

import { useState, useCallback } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StandingsEntry } from "@/lib/queries";

interface Props {
  standings: StandingsEntry[];
  seasonLabel: string;
}

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

async function drawStandingsCard(
  standings: StandingsEntry[],
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

  // ── Calculate total content height ──
  const logoH = logo ? 120 + 24 : 0;
  const seasonH = 22 + 32;
  const titleH = 52 + 110;
  const headerH = 18 + 24;
  const rowH = 96;
  const rowGap = 12;
  const rowCount = standings.length;
  const rowsH = rowCount * rowH + (rowCount - 1) * rowGap;
  const totalH = logoH + seasonH + titleH + headerH + rowsH;

  let cursorY = (H - totalH) / 2 + logoH;

  // Subtle glow
  const glowCenterY = cursorY - logoH / 2;
  const glow = ctx.createRadialGradient(W / 2, glowCenterY, 0, W / 2, glowCenterY, 500);
  glow.addColorStop(0, "rgba(26,54,148,0.15)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Draw logo
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

  // ── Title ──
  ctx.font = "900 52px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.letterSpacing = "2px";
  const titleGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  titleGrad.addColorStop(0, "#FBBF24");
  titleGrad.addColorStop(1, "#F59E0B");
  ctx.fillStyle = titleGrad;
  ctx.fillText("CLASSIFICAÇÃO", W / 2, cursorY);
  cursorY += 110;

  // ── Load team logos ──
  const teamLogoMap = new Map<string, HTMLImageElement | null>();
  const logoUrls = new Set<string>();
  for (const s of standings) {
    if (s.team.logoUrl) logoUrls.add(s.team.logoUrl);
  }
  await Promise.all(
    [...logoUrls].map(async (url) => {
      teamLogoMap.set(url, await loadImage(url));
    }),
  );

  // ── Table header ──
  const padX = 80;
  const rowW = W - padX * 2;

  ctx.letterSpacing = "0px";
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#7E7E8A";

  // Column positions
  const colTeam = padX + 70;
  const colJ = padX + rowW - 440;
  const colV = colJ + 70;
  const colE = colV + 70;
  const colD = colE + 70;
  const colSG = colD + 70;
  const colPts = padX + rowW - 40;

  ctx.textAlign = "left";
  ctx.fillText("TIME", colTeam, cursorY);
  ctx.textAlign = "center";
  ctx.fillText("J", colJ, cursorY);
  ctx.fillText("V", colV, cursorY);
  ctx.fillText("E", colE, cursorY);
  ctx.fillText("D", colD, cursorY);
  ctx.fillText("SG", colSG, cursorY);
  ctx.fillText("PTS", colPts, cursorY);
  cursorY += 24;

  // ── Rows ──
  for (let i = 0; i < rowCount; i++) {
    const row = standings[i];
    const isFirst = i === 0;
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

    const rowMidY = y + rowH / 2;

    // Rank
    ctx.fillStyle = isFirst ? "#FBBF24" : "#7E7E8A";
    ctx.font = `900 ${isFirst ? 36 : 28}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), padX + 30, rowMidY + (isFirst ? 12 : 10));

    // Team color bar
    roundRect(ctx, padX + 56, rowMidY - 22, 5, 44, 3);
    ctx.fillStyle = row.team.primaryColor;
    ctx.fill();

    // Team logo
    const teamLogo = row.team.logoUrl ? teamLogoMap.get(row.team.logoUrl) : null;
    let teamNameX = colTeam;
    if (teamLogo) {
      ctx.drawImage(teamLogo, padX + 72, rowMidY - 20, 40, 40);
      teamNameX = padX + 122;
    }

    // Team name
    ctx.textAlign = "left";
    ctx.fillStyle = isFirst ? "#FBBF24" : "#EDEDEF";
    ctx.font = `800 ${isFirst ? 28 : 24}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(row.team.name, teamNameX, rowMidY + (isFirst ? 10 : 8));

    // Stats
    ctx.textAlign = "center";
    ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";

    ctx.fillStyle = "#7E7E8A";
    ctx.fillText(String(row.played), colJ, rowMidY + 8);

    ctx.fillStyle = "#EDEDEF";
    ctx.font = "700 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(String(row.won), colV, rowMidY + 8);

    ctx.fillStyle = "#7E7E8A";
    ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(String(row.drawn), colE, rowMidY + 8);
    ctx.fillText(String(row.lost), colD, rowMidY + 8);

    // Goal difference
    const gdStr = row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference);
    ctx.fillStyle = row.goalDifference > 0 ? "#34D399" : row.goalDifference < 0 ? "#EF4444" : "#7E7E8A";
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(gdStr, colSG, rowMidY + 8);

    // Points
    ctx.fillStyle = isFirst ? "#FBBF24" : "#EDEDEF";
    ctx.font = `900 ${isFirst ? 40 : 32}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.fillText(String(row.points), colPts, rowMidY + (isFirst ? 14 : 11));
  }

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function ShareStandingsButton({ standings, seasonLabel }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleShare = useCallback(async () => {
    setGenerating(true);
    try {
      const blob = await drawStandingsCard(standings, seasonLabel);
      if (!blob) return;

      const file = new File([blob], "sfl-classificacao.png", { type: "image/png" });

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
  }, [standings, seasonLabel]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      onClick={handleShare}
      disabled={generating}
    >
      <Share2 className="h-3.5 w-3.5" />
      {generating ? "Gerando..." : "Compartilhar"}
    </Button>
  );
}
