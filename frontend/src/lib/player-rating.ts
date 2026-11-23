import type {
  HighlightSlot,
  MatchEvent,
  MatchHighlight,
  MatchLineupPlayer,
} from "@/lib/queries";

// ── Types ──

type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface PlayerRatingResult {
  readonly playerId: string;
  readonly teamId: string;
  readonly nickname: string;
  readonly position: Position;
  readonly shirtNumber: number;
  readonly starter: boolean;
  readonly calculatedRating: number;
}

// ── Position weight multipliers ──

const POSITION_WEIGHTS: Record<
  Position,
  { goal: number; assist: number; cleanSheet: number }
> = {
  GOL: { goal: 1.5, assist: 1.0, cleanSheet: 1.5 },
  ZAG: { goal: 1.3, assist: 1.2, cleanSheet: 1.2 },
  LAT: { goal: 1.2, assist: 1.2, cleanSheet: 1.0 },
  VOL: { goal: 1.2, assist: 1.0, cleanSheet: 0.8 },
  MEI: { goal: 1.1, assist: 1.1, cleanSheet: 0.0 },
  ATA: { goal: 1.0, assist: 0.8, cleanSheet: 0.0 },
};

// ── Scoring constants ──

const BASE_RATING = 6.0;
const POINTS = {
  goal: 1.0,
  penaltyGoal: 0.7,
  penaltyMiss: -0.5,
  assist: 0.5,
  ownGoal: -1.0,
  yellowCard: -0.5,
  redCard: -3.0,
  cleanSheet: 0.5,
  goalConceded: -0.15,
  teamWin: 0.2,
  teamLoss: -0.2,
  goalOpener: 0.2,
  goalEqualizer: 0.2,
  goalGoAhead: 0.3,
  // Penalty defense (goalkeeper bonus)
  penaltySave: 0.4,
  penaltyMissKeeperBonus: 0.1,
};

const HIGHLIGHT_BONUS: Record<HighlightSlot, number> = {
  mvp: 0.8,
  second: 0.5,
  third: 0.3,
  respect: 0.4,
};

const MAX_EFFICIENCY = 1.35;
const MIN_RATING = 3.0;
const MAX_RATING = 10.0;
const EFFICIENCY_FACTOR = 0.3;

// ── Calculator ──

interface CalculateInput {
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly matchDurationSeconds: number;
  readonly events: readonly MatchEvent[];
  readonly homeLineup: readonly MatchLineupPlayer[];
  readonly awayLineup: readonly MatchLineupPlayer[];
  readonly highlights: readonly MatchHighlight[];
}

export function calculateRatings(input: CalculateInput): PlayerRatingResult[] {
  const {
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    matchDurationSeconds,
    events,
    homeLineup,
    awayLineup,
    highlights,
  } = input;

  // Build player lookup from lineups
  interface PlayerInfo {
    id: string;
    nickname: string;
    position: Position;
    teamId: string;
    shirtNumber: number;
    starter: boolean;
  }

  const allPlayers: PlayerInfo[] = [
    ...homeLineup.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      position: p.position as Position,
      teamId: homeTeamId,
      shirtNumber: p.shirtNumber,
      starter: p.status === "starter",
    })),
    ...awayLineup.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      position: p.position as Position,
      teamId: awayTeamId,
      shirtNumber: p.shirtNumber,
      starter: p.status === "starter",
    })),
  ];

  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  // Per-player stats accumulator
  interface PlayerStats {
    goals: number;
    penaltyGoals: number;
    penaltyMisses: number;
    ownGoals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    penaltySaves: number;
    penaltyMissKeeperBonuses: number;
    goalImportanceBonus: number;
    highlightBonus: number;
    subbedOutAt: number | null;
    subbedInAt: number | null;
  }

  const stats = new Map<string, PlayerStats>();
  function getStats(id: string): PlayerStats {
    const existing = stats.get(id);
    if (existing) return existing;
    const fresh: PlayerStats = {
      goals: 0,
      penaltyGoals: 0,
      penaltyMisses: 0,
      ownGoals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      penaltySaves: 0,
      penaltyMissKeeperBonuses: 0,
      goalImportanceBonus: 0,
      highlightBonus: 0,
      subbedOutAt: null,
      subbedInAt: null,
    };
    stats.set(id, fresh);
    return fresh;
  }

  // Apply highlight bonuses up front (highlights are pós-jogo, sem dependência de events)
  for (const h of highlights) {
    if (!playerMap.has(h.playerId)) continue;
    getStats(h.playerId).highlightBonus +=
      HIGHLIGHT_BONUS[h.slot as HighlightSlot] ?? 0;
  }

  // Goal importance tracking
  let runningHome = 0;
  let runningAway = 0;

  function classifyGoal(scoringTeamId: string): number {
    const wasTied = runningHome === runningAway;
    const wasFirstGoal = runningHome === 0 && runningAway === 0;

    if (scoringTeamId === homeTeamId) runningHome++;
    else runningAway++;

    if (wasFirstGoal) return POINTS.goalOpener;
    if (wasTied) return POINTS.goalGoAhead;

    const isNowTied = runningHome === runningAway;
    if (isNowTied) return POINTS.goalEqualizer;

    return 0;
  }

  // Process events sorted by time
  const gameEvents = events.filter(
    (e) =>
      e.type !== "half_time" &&
      e.type !== "second_half" &&
      e.type !== "full_time",
  );
  const sorted = [...gameEvents].sort(
    (a, b) => a.elapsedSeconds - b.elapsedSeconds,
  );

  for (const e of sorted) {
    if (!e.playerId) continue;
    const s = getStats(e.playerId);

    switch (e.type) {
      case "goal": {
        s.goals++;
        const player = playerMap.get(e.playerId);
        if (player) s.goalImportanceBonus += classifyGoal(player.teamId);
        if (e.assistPlayer) getStats(e.assistPlayer.id).assists++;
        break;
      }
      case "penalty_goal": {
        s.penaltyGoals++;
        const player = playerMap.get(e.playerId);
        if (player) s.goalImportanceBonus += classifyGoal(player.teamId);
        break;
      }
      case "penalty_miss":
      case "penalty_save": {
        s.penaltyMisses++;
        // Bonus for opposing goalkeeper based on description
        const missPlayer = playerMap.get(e.playerId);
        if (missPlayer) {
          const keeperTeamId = missPlayer.teamId === homeTeamId ? awayTeamId : homeTeamId;
          const keeper = allPlayers.find((p) => p.teamId === keeperTeamId && p.position === "GOL");
          if (keeper) {
            const wasSaved = e.description?.toLowerCase().includes("defesa");
            if (wasSaved) {
              getStats(keeper.id).penaltySaves++;
            } else {
              getStats(keeper.id).penaltyMissKeeperBonuses++;
            }
          }
        }
        break;
      }
      case "own_goal": {
        s.ownGoals++;
        const scorer = playerMap.get(e.playerId);
        if (scorer) {
          const beneficiary =
            scorer.teamId === homeTeamId ? awayTeamId : homeTeamId;
          classifyGoal(beneficiary);
        }
        break;
      }
      case "yellow_card":
        s.yellowCards++;
        break;
      case "red_card":
        s.redCards++;
        s.subbedOutAt = e.elapsedSeconds;
        break;
      case "substitution":
        s.subbedOutAt = e.elapsedSeconds;
        if (e.playerIn) {
          getStats(e.playerIn.id).subbedInAt = e.elapsedSeconds;
        }
        break;
    }
  }

  // Team results
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  // Track goal timestamps by scoring team for per-player conceded calculation
  const goalTimestamps: { teamId: string; elapsedSeconds: number }[] = [];
  for (const e of sorted) {
    if (e.type === "goal" || e.type === "penalty_goal") {
      const scorer = e.playerId ? playerMap.get(e.playerId) : undefined;
      if (scorer) goalTimestamps.push({ teamId: scorer.teamId, elapsedSeconds: e.elapsedSeconds });
    } else if (e.type === "own_goal") {
      const scorer = e.playerId ? playerMap.get(e.playerId) : undefined;
      if (scorer) {
        const beneficiary = scorer.teamId === homeTeamId ? awayTeamId : homeTeamId;
        goalTimestamps.push({ teamId: beneficiary, elapsedSeconds: e.elapsedSeconds });
      }
    }
  }

  const matchDurationMinutes = matchDurationSeconds / 60;

  // Calculate each player's rating
  const ratings: PlayerRatingResult[] = [];

  for (const player of allPlayers) {
    const s = getStats(player.id);

    // Skip subs that never entered
    const entered = player.starter || s.subbedInAt !== null;
    if (!entered) continue;

    // Minutes played
    const startTime = player.starter ? 0 : (s.subbedInAt ?? 0);
    const endTime = s.subbedOutAt ?? matchDurationSeconds;
    const minutesPlayed = Math.round((endTime - startTime) / 60);

    const isHome = player.teamId === homeTeamId;
    const teamWon = isHome ? homeWon : awayWon;
    const teamLost = isHome ? awayWon : homeWon;
    const isDefensive = ["GOL", "ZAG", "LAT"].includes(player.position);

    // Count only goals conceded while this player was on the field
    const opposingTeamId = isHome ? awayTeamId : homeTeamId;
    const goalsConceded = isDefensive
      ? goalTimestamps.filter(
          (g) =>
            g.teamId === opposingTeamId &&
            g.elapsedSeconds >= startTime &&
            g.elapsedSeconds <= endTime,
        ).length
      : 0;
    const cleanSheet = isDefensive && goalsConceded === 0;

    const w = POSITION_WEIGHTS[player.position];

    // Efficiency multiplier
    const rawEff =
      1 + (1 - minutesPlayed / matchDurationMinutes) * EFFICIENCY_FACTOR;
    const efficiencyMultiplier = Math.min(MAX_EFFICIENCY, rawEff);

    // Build score
    let score = BASE_RATING;
    score += s.goals * POINTS.goal * w.goal * efficiencyMultiplier;
    score += s.penaltyGoals * POINTS.penaltyGoal * w.goal * efficiencyMultiplier;
    score += s.assists * POINTS.assist * w.assist * efficiencyMultiplier;
    score += s.goalImportanceBonus;
    score += s.ownGoals * POINTS.ownGoal;
    score += s.penaltyMisses * POINTS.penaltyMiss;
    score += s.yellowCards * POINTS.yellowCard;
    score += s.redCards * POINTS.redCard;
    score += goalsConceded * POINTS.goalConceded;
    if (cleanSheet) {
      const playedRatio = Math.min(1, minutesPlayed / matchDurationMinutes);
      score += POINTS.cleanSheet * w.cleanSheet * playedRatio;
    }
    if (teamWon) score += POINTS.teamWin;
    if (teamLost) score += POINTS.teamLoss;

    // Penalty defense bonuses (goalkeeper)
    score += s.penaltySaves * POINTS.penaltySave;
    score += s.penaltyMissKeeperBonuses * POINTS.penaltyMissKeeperBonus;

    // Highlights pós-jogo (MVP / 2º / 3º / Respeito do rival)
    score += s.highlightBonus;

    const finalRating =
      Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, score)) * 10) / 10;

    ratings.push({
      playerId: player.id,
      teamId: player.teamId,
      nickname: player.nickname,
      position: player.position,
      shirtNumber: player.shirtNumber,
      starter: player.starter,
      calculatedRating: finalRating,
    });
  }

  return ratings.sort((a, b) => b.calculatedRating - a.calculatedRating);
}
