import { prisma } from "../core/prisma.js";
import {
  resolveCompetitionRules,
  type TieBreaker,
} from "./competition-rules.js";

export type StandingsEntry = {
  teamId: string;
  team: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  yellowCards: number;
  redCards: number;
  groupName: string | null;
};

type MiniMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  phase: string;
  groupName: string | null;
};

function emptyEntry(
  team: StandingsEntry["team"],
  groupName: string | null,
): StandingsEntry {
  return {
    teamId: team.id,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    yellowCards: 0,
    redCards: 0,
    groupName,
  };
}

function headToHeadPoints(
  aId: string,
  bId: string,
  matches: MiniMatch[],
  pointsWin: number,
  pointsDraw: number,
): { points: number; gd: number; gf: number } {
  let points = 0;
  let gd = 0;
  let gf = 0;
  for (const m of matches) {
    const involves =
      (m.homeTeamId === aId && m.awayTeamId === bId) ||
      (m.homeTeamId === bId && m.awayTeamId === aId);
    if (!involves) continue;
    const aIsHome = m.homeTeamId === aId;
    const aScore = aIsHome ? m.homeScore : m.awayScore;
    const bScore = aIsHome ? m.awayScore : m.homeScore;
    gf += aScore;
    gd += aScore - bScore;
    if (aScore > bScore) points += pointsWin;
    else if (aScore === bScore) points += pointsDraw;
  }
  return { points, gd, gf };
}

function compareEntries(
  a: StandingsEntry,
  b: StandingsEntry,
  order: TieBreaker[],
  matches: MiniMatch[],
  pointsWin: number,
  pointsDraw: number,
): number {
  for (const key of order) {
    let diff = 0;
    switch (key) {
      case "points":
        diff = b.points - a.points;
        break;
      case "wins":
        diff = b.won - a.won;
        break;
      case "goalDifference":
        diff = b.goalDifference - a.goalDifference;
        break;
      case "goalsFor":
        diff = b.goalsFor - a.goalsFor;
        break;
      case "headToHead": {
        const ha = headToHeadPoints(
          a.teamId,
          b.teamId,
          matches,
          pointsWin,
          pointsDraw,
        );
        const hb = headToHeadPoints(
          b.teamId,
          a.teamId,
          matches,
          pointsWin,
          pointsDraw,
        );
        diff = hb.points - ha.points;
        if (diff === 0) diff = hb.gd - ha.gd;
        if (diff === 0) diff = hb.gf - ha.gf;
        break;
      }
      case "fairPlay": {
        const fa = a.yellowCards + a.redCards * 3;
        const fb = b.yellowCards + b.redCards * 3;
        diff = fa - fb; // menos cartões fica na frente
        break;
      }
      case "name":
        return a.team.name.localeCompare(b.team.name);
      default:
        break;
    }
    if (diff !== 0) return diff;
  }
  return a.team.name.localeCompare(b.team.name);
}

/**
 * Classificação da temporada.
 * Só inclui times com elenco (roster) na temporada.
 * Partidas finished + awarded contam; abandoned não.
 * Em groups_knockout, fase group gera tabelas por grupo.
 */
export async function computeStandings(
  seasonId: string,
  opts?: { groupName?: string | null },
): Promise<StandingsEntry[]> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { competition: true },
  });
  if (!season) return [];

  const rules = resolveCompetitionRules(season.competition, season);

  // Mata-mata puro não tem tabela de pontos
  if (rules.format === "knockout") return [];

  const rosters = await prisma.seasonRoster.findMany({
    where: { seasonId, teamId: { not: null } },
    include: { team: true },
  });
  const teamMap = new Map<string, StandingsEntry["team"]>();
  for (const r of rosters) {
    if (r.team) teamMap.set(r.team.id, {
      id: r.team.id,
      slug: r.team.slug,
      name: r.team.name,
      shortName: r.team.shortName,
      primaryColor: r.team.primaryColor,
      secondaryColor: r.team.secondaryColor,
      logoUrl: r.team.logoUrl,
    });
  }

  // Partidas válidas da fase
  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      status: { in: ["finished", "awarded"] },
      ...(rules.format === "groups_knockout" ? { phase: "group" as const } : {}),
      ...(opts?.groupName ? { groupName: opts.groupName } : {}),
    },
  });

  // União: elenco da temporada + qualquer time que já jogou
  // (só elenco incompleto não pode esconder a tabela)
  const missingIds = new Set<string>();
  for (const m of matches) {
    if (!teamMap.has(m.homeTeamId)) missingIds.add(m.homeTeamId);
    if (!teamMap.has(m.awayTeamId)) missingIds.add(m.awayTeamId);
  }
  if (missingIds.size > 0) {
    const extras = await prisma.team.findMany({
      where: { id: { in: [...missingIds] } },
    });
    for (const t of extras) {
      teamMap.set(t.id, {
        id: t.id,
        slug: t.slug,
        name: t.name,
        shortName: t.shortName,
        primaryColor: t.primaryColor,
        secondaryColor: t.secondaryColor,
        logoUrl: t.logoUrl,
      });
    }
  }

  // Grupo: inferir groupName do primeiro jogo do time
  const groupByTeam = new Map<string, string | null>();
  for (const m of matches) {
    if (m.groupName) {
      groupByTeam.set(m.homeTeamId, m.groupName);
      groupByTeam.set(m.awayTeamId, m.groupName);
    }
  }

  const map = new Map<string, StandingsEntry>();
  for (const [id, team] of teamMap) {
    map.set(id, emptyEntry(team, groupByTeam.get(id) ?? null));
  }

  const mini: MiniMatch[] = [];
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;

    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    mini.push({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      phase: m.phase,
      groupName: m.groupName,
    });

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += rules.pointsWin;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += rules.pointsWin;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += rules.pointsDraw;
      away.points += rules.pointsDraw;
    }
  }

  // Fair play: cartões na temporada (só partidas da fase relevante)
  const cardEvents = await prisma.matchEvent.findMany({
    where: {
      match: { seasonId, id: { in: matches.map((m) => m.id) } },
      type: { in: ["yellow_card", "red_card"] },
      teamId: { not: null },
    },
  });
  for (const e of cardEvents) {
    if (!e.teamId) continue;
    const row = map.get(e.teamId);
    if (!row) continue;
    if (e.type === "yellow_card") row.yellowCards += 1;
    if (e.type === "red_card") row.redCards += 1;
  }

  const rows = [...map.values()].map((r) => ({
    ...r,
    goalDifference: r.goalsFor - r.goalsAgainst,
  }));

  rows.sort((a, b) =>
    compareEntries(
      a,
      b,
      rules.tieBreakers,
      mini,
      rules.pointsWin,
      rules.pointsDraw,
    ),
  );

  if (opts?.groupName) {
    return rows.filter((r) => r.groupName === opts.groupName);
  }
  return rows;
}

export async function computePlayerStats(seasonId: string) {
  const events = await prisma.matchEvent.findMany({
    where: {
      match: { seasonId },
      type: { in: ["goal", "own_goal", "penalty_goal", "yellow_card", "red_card"] },
    },
    include: {
      player: true,
      team: true,
      match: { select: { seasonId: true, date: true } },
    },
  });

  const resets = await prisma.cardReset.findMany({
    where: { seasonId },
    orderBy: { createdAt: "desc" },
  });
  const lastResetByPlayer = new Map<string, Date>();
  for (const r of resets) {
    if (!lastResetByPlayer.has(r.playerId)) {
      lastResetByPlayer.set(r.playerId, r.createdAt);
    }
  }

  const rosters = await prisma.seasonRoster.findMany({
    where: { seasonId },
    include: { team: true, player: true },
  });
  const rosterByPlayer = new Map(rosters.map((r) => [r.playerId, r]));

  type Acc = {
    playerId: string;
    player: {
      id: string;
      name: string;
      nickname: string;
      position: string;
      photoUrl: string | null;
    };
    teamId: string | null;
    team: {
      id: string;
      slug: string;
      name: string;
      shortName: string;
      logoUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
    } | null;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };

  const map = new Map<string, Acc>();

  for (const r of rosters) {
    if (!r.player) continue;
    map.set(r.playerId, {
      playerId: r.playerId,
      player: {
        id: r.player.id,
        name: r.player.name,
        nickname: r.player.nickname,
        position: r.player.position,
        photoUrl: r.player.photoUrl,
      },
      teamId: r.teamId,
      team: r.team
        ? {
            id: r.team.id,
            slug: r.team.slug,
            name: r.team.name,
            shortName: r.team.shortName,
            logoUrl: r.team.logoUrl,
            primaryColor: r.team.primaryColor,
            secondaryColor: r.team.secondaryColor,
          }
        : null,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    });
  }

  for (const e of events) {
    if (!e.playerId) continue;
    let row = map.get(e.playerId);
    if (!row && e.player) {
      row = {
        playerId: e.playerId,
        player: {
          id: e.player.id,
          name: e.player.name,
          nickname: e.player.nickname,
          position: e.player.position,
          photoUrl: e.player.photoUrl,
        },
        teamId: e.teamId,
        team: e.team
          ? {
              id: e.team.id,
              slug: e.team.slug,
              name: e.team.name,
              shortName: e.team.shortName,
              logoUrl: e.team.logoUrl,
              primaryColor: e.team.primaryColor,
              secondaryColor: e.team.secondaryColor,
            }
          : null,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      };
      map.set(e.playerId, row);
    }
    if (!row) continue;

    const resetAt = lastResetByPlayer.get(e.playerId);
    const eventAt = e.match.date;
    const afterReset = !resetAt || eventAt > resetAt;

    if (e.type === "goal" || e.type === "penalty_goal") row.goals += 1;
    if (e.type === "own_goal") {
      /* own goal não conta para o marcador */
    }
    if (e.type === "yellow_card" && afterReset) row.yellowCards += 1;
    if (e.type === "red_card" && afterReset) row.redCards += 1;
  }

  // Assists
  const assists = await prisma.matchEvent.findMany({
    where: {
      match: { seasonId },
      assistPlayerId: { not: null },
      type: { in: ["goal", "penalty_goal"] },
    },
  });
  for (const e of assists) {
    if (!e.assistPlayerId) continue;
    const row = map.get(e.assistPlayerId);
    if (row) row.assists += 1;
  }

  return [...map.values()].sort(
    (a, b) => b.goals - a.goals || b.assists - a.assists,
  );
}
