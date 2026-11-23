import type { PlayerWithRoster } from "@/lib/queries";

const positionLabel: Record<string, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

interface PlayerGroup {
  key: string;
  label: string;
  isAvulso: boolean;
  players: PlayerWithRoster[];
}

/**
 * Groups players by team (avulso bucket last). Inside each group, active
 * players come first, then inactives. Inside each status section, sorted by
 * jersey number (nulls last) then nickname.
 */
export function groupPlayersForExport(
  players: PlayerWithRoster[],
): PlayerGroup[] {
  const byKey = new Map<string, PlayerGroup>();
  const avulsoKey = "__avulso__";

  for (const p of players) {
    const key = p.roster!.teamId ?? avulsoKey;
    const label = p.roster!.teamName ?? "Avulsos";
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, isAvulso: key === avulsoKey, players: [] };
      byKey.set(key, group);
    }
    group.players.push(p);
  }

  const sortPlayers = (a: PlayerWithRoster, b: PlayerWithRoster) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const na = a.roster!.number ?? 9999;
    const nb = b.roster!.number ?? 9999;
    if (na !== nb) return na - nb;
    return a.nickname.localeCompare(b.nickname);
  };

  const groups = [...byKey.values()];
  for (const g of groups) g.players.sort(sortPlayers);

  return groups.sort((a, b) => {
    if (a.isAvulso !== b.isAvulso) return a.isAvulso ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildPlayersCsv(players: PlayerWithRoster[]): string {
  const groups = groupPlayersForExport(players);
  const header = [
    "Time",
    "Status",
    "Camisa",
    "Apelido",
    "Nome",
    "Posição",
    "Capitão",
    "Email",
    "Conta vinculada",
  ].join(",");

  const lines: string[] = [header];
  for (const group of groups) {
    for (const p of group.players) {
      lines.push(
        [
          csvCell(group.label),
          csvCell(p.isActive ? "Ativo" : "Inativo"),
          csvCell(p.roster!.number ?? ""),
          csvCell(p.nickname),
          csvCell(p.name),
          csvCell(positionLabel[p.position] ?? p.position),
          csvCell(p.roster!.isCaptain ? "Sim" : ""),
          csvCell(p.email ?? ""),
          csvCell(p.userId ? "Sim" : ""),
        ].join(","),
      );
    }
  }
  // BOM so Excel recognizes UTF-8.
  return "﻿" + lines.join("\n");
}

export function buildPlayersText(
  players: PlayerWithRoster[],
  seasonName: string,
): string {
  const groups = groupPlayersForExport(players);
  const lines: string[] = [];
  lines.push(`*Elenco - ${seasonName}*`);
  lines.push(`Total: ${players.length} jogador(es)`);
  lines.push("");

  for (const group of groups) {
    const active = group.players.filter((p) => p.isActive);
    const inactive = group.players.filter((p) => !p.isActive);

    lines.push(`*${group.label}* (${group.players.length})`);

    if (active.length) {
      for (const p of active) {
        const num = p.roster!.number != null ? `${p.roster!.number}. ` : "• ";
        const cap = p.roster!.isCaptain ? " (C)" : "";
        const pos = positionLabel[p.position] ?? p.position;
        lines.push(`${num}${p.nickname}${cap} - ${pos}`);
      }
    }

    if (inactive.length) {
      lines.push(`_Inativos:_`);
      for (const p of inactive) {
        const pos = positionLabel[p.position] ?? p.position;
        lines.push(`• ${p.nickname} - ${pos}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const positionColors: Record<string, { bg: string; fg: string }> = {
  GOL: { bg: "#fef3c7", fg: "#92400e" },
  ZAG: { bg: "#dbeafe", fg: "#1e40af" },
  LAT: { bg: "#cffafe", fg: "#155e75" },
  VOL: { bg: "#ede9fe", fg: "#5b21b6" },
  MEI: { bg: "#d1fae5", fg: "#065f46" },
  ATA: { bg: "#fee2e2", fg: "#991b1b" },
};

export function buildPlayersHtml(
  players: PlayerWithRoster[],
  seasonName: string,
): string {
  const groups = groupPlayersForExport(players);
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const renderRow = (p: PlayerWithRoster) => {
    const pos = positionLabel[p.position] ?? p.position;
    const color = positionColors[p.position] ?? { bg: "#f3f4f6", fg: "#374151" };
    const num = p.roster!.number != null ? p.roster!.number : "-";
    const cap = p.roster!.isCaptain
      ? '<span class="cap" title="Capitão">C</span>'
      : "";
    const linked = p.email
      ? `<span class="link-dot" title="Conta vinculada"></span>`
      : "";
    return `
      <tr class="${p.isActive ? "" : "row-inactive"}">
        <td class="num">${num}</td>
        <td class="player">
          <div class="player-cell">
            <div class="player-main">
              <span class="nick">${escapeHtml(p.nickname.trim())}</span>
              ${cap}
              ${linked}
            </div>
            <span class="full-name">${escapeHtml(p.name.trim())}</span>
          </div>
        </td>
        <td><span class="pos" style="background:${color.bg};color:${color.fg}">${escapeHtml(pos)}</span></td>
        <td class="email">${escapeHtml(p.email ?? "")}</td>
      </tr>`;
  };

  const sections = groups
    .map((group) => {
      const active = group.players.filter((p) => p.isActive);
      const inactive = group.players.filter((p) => !p.isActive);
      const sample = group.players[0];
      const logo = sample?.roster?.teamLogoUrl;

      const inactiveBlock = inactive.length
        ? `
        <div class="subhead">Inativos <span class="count">${inactive.length}</span></div>
        <table class="roster">
          <tbody>${inactive.map(renderRow).join("")}</tbody>
        </table>`
        : "";

      return `
        <section class="team-block">
          <header class="team-header">
            ${
              logo
                ? `<img src="${escapeHtml(logo)}" alt="" class="team-logo" />`
                : `<div class="team-logo team-logo-fallback">${escapeHtml(group.label.charAt(0))}</div>`
            }
            <div class="team-id">
              <h2>${escapeHtml(group.label)}</h2>
              <span class="team-count">${group.players.length} jogador${group.players.length === 1 ? "" : "es"}</span>
            </div>
          </header>
          ${
            active.length
              ? `<table class="roster">
                  <thead>
                    <tr>
                      <th class="num">Nº</th>
                      <th>Jogador</th>
                      <th>Posição</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>${active.map(renderRow).join("")}</tbody>
                </table>`
              : `<p class="empty">Sem jogadores ativos</p>`
          }
          ${inactiveBlock}
        </section>`;
    })
    .join("");

  const totalActive = players.filter((p) => p.isActive).length;
  const totalInactive = players.length - totalActive;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Elenco - ${escapeHtml(seasonName)}</title>
<style>
  :root {
    --ink: #0f172a;
    --ink-2: #334155;
    --muted: #64748b;
    --line: #e2e8f0;
    --line-2: #f1f5f9;
    --bg: #ffffff;
    --accent: #0f172a;
  }
  * { box-sizing: border-box; }
  html, body { background: var(--bg); }
  body {
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, "Helvetica Neue", Arial, sans-serif;
    margin: 0;
    padding: 20px 28px 28px;
    color: var(--ink);
    font-size: 11.5px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Hero ───────────────────────────────── */
  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 10px;
    margin-bottom: 16px;
    border-bottom: 2px solid var(--accent);
  }
  .hero-title {
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 2px;
  }
  .hero h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--ink);
    line-height: 1.1;
  }
  .hero-meta {
    text-align: right;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
  }
  .hero-stats {
    display: flex;
    gap: 14px;
    margin-top: 4px;
    justify-content: flex-end;
    color: var(--ink);
  }
  .hero-stat {
    text-align: right;
  }
  .hero-stat-num {
    font-size: 14px;
    font-weight: 800;
    line-height: 1;
  }
  .hero-stat-lbl {
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    margin-top: 1px;
  }

  /* ── Team section ──────────────────────── */
  .team-block {
    margin-bottom: 20px;
  }
  /* Each team after the first starts on a new page */
  .team-block + .team-block {
    break-before: page;
    page-break-before: always;
  }
  .team-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 8px;
    margin-bottom: 6px;
    border-bottom: 1px solid var(--line);
    break-inside: avoid;
    page-break-inside: avoid;
    break-after: avoid;
    page-break-after: avoid;
  }
  table.roster thead {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  table.roster tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .team-logo {
    width: 36px;
    height: 36px;
    object-fit: contain;
    border-radius: 8px;
    background: var(--line-2);
    padding: 3px;
    flex-shrink: 0;
  }
  .team-logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ink);
    color: white;
    font-weight: 800;
    font-size: 16px;
    text-transform: uppercase;
  }
  .team-id h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .team-count {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }
  .subhead {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--muted);
    font-weight: 700;
    margin: 16px 0 4px;
  }
  .subhead .count {
    background: var(--line-2);
    color: var(--muted);
    border-radius: 999px;
    padding: 1px 7px;
    font-size: 9px;
    margin-left: 4px;
    letter-spacing: 0;
  }
  .empty {
    color: var(--muted);
    font-style: italic;
    font-size: 11px;
    margin: 6px 0 0;
  }

  /* ── Roster table ───────────────────────── */
  table.roster {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  table.roster th {
    text-align: left;
    padding: 6px 10px;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    font-weight: 700;
    border-bottom: 1px solid var(--line);
  }
  table.roster td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--line-2);
    vertical-align: middle;
  }
  table.roster tr:last-child td { border-bottom: 0; }
  table.roster tr.row-inactive td { color: var(--muted); }
  table.roster tr.row-inactive .nick {
    text-decoration: line-through;
    text-decoration-color: var(--muted);
  }

  td.num, th.num {
    width: 36px;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .player-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .player-main {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .nick {
    font-weight: 700;
    color: var(--ink);
    font-size: 11.5px;
  }
  .full-name {
    font-size: 10px;
    color: var(--muted);
  }
  .cap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #fbbf24;
    color: #78350f;
    font-size: 8.5px;
    font-weight: 800;
    line-height: 1;
  }
  .link-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #10b981;
  }
  .pos {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    border-radius: 999px;
  }
  td.email {
    font-size: 10px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  /* ── Footer / print ──────────────────────── */
  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 9.5px;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
  }

  @page {
    size: A4;
    margin: 10mm 12mm;
  }
  @media print {
    body { padding: 0; }
    .hero { padding-bottom: 8px; margin-bottom: 12px; }
    .team-block { margin-bottom: 16px; }
  }
</style>
</head>
<body>
  <div class="hero">
    <div>
      <div class="hero-title">SFL · Elenco</div>
      <h1>${escapeHtml(seasonName)}</h1>
    </div>
    <div class="hero-meta">
      ${today}
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-num">${players.length}</div>
          <div class="hero-stat-lbl">Total</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-num">${totalActive}</div>
          <div class="hero-stat-lbl">Ativos</div>
        </div>
        ${
          totalInactive > 0
            ? `<div class="hero-stat">
                <div class="hero-stat-num">${totalInactive}</div>
                <div class="hero-stat-lbl">Inativos</div>
              </div>`
            : ""
        }
      </div>
    </div>
  </div>
  ${sections}
  <div class="footer">
    <span>Elenco - ${escapeHtml(seasonName)}</span>
    <span>Gerado em ${today}</span>
  </div>
</body>
</html>`;
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Wait for images (team logos) to load before triggering print, so they
  // actually render. Fall back after 2.5s if some image hangs.
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore
    }
  };
  const onReady = () => {
    const imgs = Array.from(win.document.images);
    if (imgs.length === 0) {
      setTimeout(triggerPrint, 100);
      return;
    }
    let remaining = imgs.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) setTimeout(triggerPrint, 100);
    };
    for (const img of imgs) {
      if (img.complete) done();
      else {
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      }
    }
    setTimeout(triggerPrint, 2500); // safety net
  };
  if (win.document.readyState === "complete") onReady();
  else win.addEventListener("load", onReady);
  return true;
}
