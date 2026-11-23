import { prisma } from "../core/prisma.js";
import { resolveCompetitionRules } from "./competition-rules.js";

export type PlayerSuspension = {
  playerId: string;
  reason: "yellow_accumulation" | "red_card";
  gamesRemaining: number;
  yellowCards: number;
  redCards: number;
};

/**
 * Calcula quem está suspenso para jogar `matchId`.
 *
 * Regras (configuráveis no campeonato):
 * - N amarelos (yellowCardLimit) → 1 jogo de suspensão (contador zera)
 * - Vermelho → redSuspensionGames jogos
 * - CardReset zera amarelos daquele jogador na temporada a partir da data do reset
 */
export async function getSuspensionsForMatch(
  matchId: string,
): Promise<PlayerSuspension[]> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { season: { include: { competition: true } } },
  });
  if (!match) return [];

  const rules = resolveCompetitionRules(match.season.competition, match.season);
  const seasonId = match.seasonId;

  const priorMatches = await prisma.match.findMany({
    where: {
      seasonId,
      id: { not: matchId },
      status: { in: ["finished", "awarded"] },
      OR: [
        { date: { lt: match.date } },
        { AND: [{ date: match.date }, { round: { lt: match.round } }] },
      ],
    },
    orderBy: [{ date: "asc" }, { round: "asc" }, { createdAt: "asc" }],
    select: { id: true, date: true },
  });

  type St = {
    yellow: number;
    pending: number;
    reason: PlayerSuspension["reason"] | null;
  };
  const byPlayer = new Map<string, St>();

  const resets = await prisma.cardReset.findMany({
    where: { seasonId },
    orderBy: { createdAt: "asc" },
  });

  const events = await prisma.matchEvent.findMany({
    where: {
      matchId: { in: priorMatches.map((m) => m.id) },
      type: { in: ["yellow_card", "red_card"] },
      playerId: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  const eventsByMatch = new Map<string, typeof events>();
  for (const e of events) {
    const list = eventsByMatch.get(e.matchId) ?? [];
    list.push(e);
    eventsByMatch.set(e.matchId, list);
  }

  let resetIdx = 0;

  for (const pm of priorMatches) {
    // Resets ocorridos até o fim deste jogo
    while (
      resetIdx < resets.length &&
      resets[resetIdx]!.createdAt <=
        new Date(pm.date.getTime() + 24 * 3600 * 1000)
    ) {
      const r = resets[resetIdx]!;
      const st = byPlayer.get(r.playerId) ?? {
        yellow: 0,
        pending: 0,
        reason: null,
      };
      st.yellow = 0;
      byPlayer.set(r.playerId, st);
      resetIdx += 1;
    }

    // Quem estava pendente cumpre 1 jogo nesta partida
    for (const st of byPlayer.values()) {
      if (st.pending > 0) {
        st.pending -= 1;
        if (st.pending === 0) st.reason = null;
      }
    }

    for (const e of eventsByMatch.get(pm.id) ?? []) {
      if (!e.playerId) continue;
      const st = byPlayer.get(e.playerId) ?? {
        yellow: 0,
        pending: 0,
        reason: null,
      };
      if (e.type === "yellow_card") {
        st.yellow += 1;
        if (st.yellow >= rules.yellowCardLimit) {
          st.pending = Math.max(st.pending, 1);
          st.reason = "yellow_accumulation";
          st.yellow = 0;
        }
      } else if (e.type === "red_card") {
        st.pending = Math.max(st.pending, rules.redSuspensionGames);
        st.reason = "red_card";
        st.yellow = 0;
      }
      byPlayer.set(e.playerId, st);
    }
  }

  // Aplica resets restantes antes da partida alvo
  while (resetIdx < resets.length && resets[resetIdx]!.createdAt <= match.date) {
    const r = resets[resetIdx]!;
    const st = byPlayer.get(r.playerId) ?? {
      yellow: 0,
      pending: 0,
      reason: null,
    };
    st.yellow = 0;
    byPlayer.set(r.playerId, st);
    resetIdx += 1;
  }

  const out: PlayerSuspension[] = [];
  for (const [playerId, st] of byPlayer) {
    if (st.pending > 0 && st.reason) {
      out.push({
        playerId,
        reason: st.reason,
        gamesRemaining: st.pending,
        yellowCards: st.yellow,
        redCards: st.reason === "red_card" ? 1 : 0,
      });
    }
  }
  return out;
}

export async function assertLineupNotSuspended(
  matchId: string,
  playerIds: string[],
): Promise<{ ok: true } | { ok: false; suspended: PlayerSuspension[] }> {
  if (playerIds.length === 0) return { ok: true };
  const all = await getSuspensionsForMatch(matchId);
  const set = new Set(playerIds);
  const hit = all.filter((s) => set.has(s.playerId));
  if (hit.length) return { ok: false, suspended: hit };
  return { ok: true };
}
