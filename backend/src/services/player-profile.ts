/**
 * Estatísticas do perfil a partir da súmula e da escalação.
 * Gols e assistências seguem a artilharia (computePlayerStats):
 * gol e pênalti convertido contam para quem marcou; assistência é outro campo;
 * gol contra não entra na artilharia.
 */

export type ProfileTeam = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

export type ProfileRoster = {
  seasonId: string;
  seasonName: string;
  year: number;
  isCurrent: boolean;
  team: ProfileTeam | null;
  number: number | null;
  isCaptain: boolean;
};

export type ProfileMatch = {
  id: string;
  seasonId: string;
  seasonName: string;
  year: number;
  isCurrent: boolean;
  round: number;
  date: string;
  status: string;
  homeTeam: ProfileTeam;
  awayTeam: ProfileTeam;
  homeScore: number | null;
  awayScore: number | null;
};

export type ProfileLineup = {
  matchId: string;
  status: "starter" | "substitute";
  team: ProfileTeam | null;
};

export type ProfileEvent = {
  matchId: string;
  type: string;
  playerId: string | null;
  assistPlayerId: string | null;
  playerInId: string | null;
  team: ProfileTeam | null;
};

export type ProfileRating = {
  matchId: string;
  rating: number;
};

const PLAYED_STATUSES = new Set([
  "finished",
  "awarded",
  "live",
  "halftime",
  "abandoned",
]);

const RECENT_LIMIT = 8;

export type PlayerSeasonStats = {
  seasonId: string;
  seasonName: string;
  year: number;
  isCurrent: boolean;
  team: ProfileTeam | null;
  number: number | null;
  isCaptain: boolean;
  matches: number;
  matchesPlayed: number;
  starts: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating: number | null;
};

export type PlayerMatchSummary = {
  matchId: string;
  seasonId: string;
  seasonName: string;
  round: number;
  date: string;
  status: string;
  homeTeam: ProfileTeam;
  awayTeam: ProfileTeam;
  homeScore: number | null;
  awayScore: number | null;
  playerTeam: ProfileTeam | null;
  wasStarter: boolean;
  cameOnAsSub: boolean;
  wentOffAsSub: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number | null;
};

export type BuiltPlayerProfile = {
  currentSeason: {
    seasonId: string;
    seasonName: string;
    year: number;
    team: ProfileTeam;
    number: number;
    isCaptain: boolean;
  } | null;
  career: {
    matches: number;
    matchesPlayed: number;
    starts: number;
    substitutionsIn: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    averageRating: number | null;
  };
  seasons: PlayerSeasonStats[];
  recentMatches: PlayerMatchSummary[];
};

type SeasonAcc = {
  seasonId: string;
  seasonName: string;
  year: number;
  isCurrent: boolean;
  team: ProfileTeam | null;
  number: number | null;
  isCaptain: boolean;
  matches: number;
  starts: number;
  substitutionsIn: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  ratings: number[];
};

function roundRating(values: number[]): number | null {
  if (values.length === 0) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

function isScoringType(type: string): boolean {
  return type === "goal" || type === "penalty_goal";
}

export function buildPlayerProfile(input: {
  playerId: string;
  rosters: ProfileRoster[];
  matches: ProfileMatch[];
  lineups: ProfileLineup[];
  events: ProfileEvent[];
  ratings: ProfileRating[];
  recentLimit?: number;
}): BuiltPlayerProfile {
  const seasons = new Map<string, SeasonAcc>();

  for (const roster of input.rosters) {
    seasons.set(roster.seasonId, {
      seasonId: roster.seasonId,
      seasonName: roster.seasonName,
      year: roster.year,
      isCurrent: roster.isCurrent,
      team: roster.team,
      number: roster.number,
      isCaptain: roster.isCaptain,
      matches: 0,
      starts: 0,
      substitutionsIn: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      ratings: [],
    });
  }

  const matches = new Map<string, ProfileMatch>();
  for (const match of input.matches) matches.set(match.id, match);

  const lineupByMatch = new Map<string, ProfileLineup>();
  for (const lineup of input.lineups) lineupByMatch.set(lineup.matchId, lineup);

  const eventsByMatch = new Map<string, ProfileEvent[]>();
  for (const event of input.events) {
    const list = eventsByMatch.get(event.matchId) ?? [];
    list.push(event);
    eventsByMatch.set(event.matchId, list);
  }

  const ratingByMatch = new Map<string, number>();
  for (const rating of input.ratings) {
    if (!ratingByMatch.has(rating.matchId)) {
      ratingByMatch.set(rating.matchId, rating.rating);
    }
  }

  const recent: PlayerMatchSummary[] = [];

  for (const match of matches.values()) {
    let season = seasons.get(match.seasonId);
    if (!season) {
      season = {
        seasonId: match.seasonId,
        seasonName: match.seasonName,
        year: match.year,
        isCurrent: match.isCurrent,
        team: null,
        number: null,
        isCaptain: false,
        matches: 0,
        starts: 0,
        substitutionsIn: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        ratings: [],
      };
      seasons.set(match.seasonId, season);
    }

    const lineup = lineupByMatch.get(match.id) ?? null;
    const events = eventsByMatch.get(match.id) ?? [];
    const isStarter = lineup?.status === "starter";
    const cameOn = events.some(
      (event) =>
        event.type === "substitution" && event.playerInId === input.playerId,
    );
    const wentOff = events.some(
      (event) =>
        event.type === "substitution" && event.playerId === input.playerId,
    );

    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let hasStatEvent = false;

    for (const event of events) {
      const scoredByHim =
        isScoringType(event.type) && event.playerId === input.playerId;
      const assistedByHim =
        isScoringType(event.type) &&
        event.assistPlayerId === input.playerId &&
        event.playerId !== input.playerId;
      if (scoredByHim) {
        goals += 1;
        hasStatEvent = true;
      }
      if (assistedByHim) {
        assists += 1;
        hasStatEvent = true;
      }
      if (event.type === "own_goal" && event.playerId === input.playerId) {
        hasStatEvent = true;
      }
      if (event.type === "yellow_card" && event.playerId === input.playerId) {
        yellowCards += 1;
        hasStatEvent = true;
      }
      if (event.type === "red_card" && event.playerId === input.playerId) {
        redCards += 1;
        hasStatEvent = true;
      }
    }

    season.goals += goals;
    season.assists += assists;
    season.yellowCards += yellowCards;
    season.redCards += redCards;

    const playedStatus = PLAYED_STATUSES.has(match.status);
    const played =
      playedStatus && (isStarter || cameOn || wentOff || hasStatEvent);

    const rating = ratingByMatch.get(match.id) ?? null;
    if (played && rating != null) season.ratings.push(rating);

    if (!played) continue;

    season.matches += 1;
    if (isStarter) season.starts += 1;
    if (cameOn && !isStarter) season.substitutionsIn += 1;

    const playerTeam =
      lineup?.team ??
      events.find((event) => event.team)?.team ??
      season.team;

    recent.push({
      matchId: match.id,
      seasonId: match.seasonId,
      seasonName: match.seasonName,
      round: match.round,
      date: match.date,
      status: match.status,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      playerTeam,
      wasStarter: isStarter,
      cameOnAsSub: cameOn && !isStarter,
      wentOffAsSub: wentOff,
      goals,
      assists,
      yellowCards,
      redCards,
      rating,
    });
  }

  const seasonList = [...seasons.values()]
    .sort((a, b) => b.year - a.year || a.seasonName.localeCompare(b.seasonName))
    .map((season) => ({
      seasonId: season.seasonId,
      seasonName: season.seasonName,
      year: season.year,
      isCurrent: season.isCurrent,
      team: season.team,
      number: season.number,
      isCaptain: season.isCaptain,
      matches: season.matches,
      matchesPlayed: season.matches,
      starts: season.starts,
      goals: season.goals,
      assists: season.assists,
      yellowCards: season.yellowCards,
      redCards: season.redCards,
      averageRating: roundRating(season.ratings),
    }));

  const career = seasonList.reduce(
    (acc, season) => {
      acc.matches += season.matches;
      acc.starts += season.starts;
      acc.goals += season.goals;
      acc.assists += season.assists;
      acc.yellowCards += season.yellowCards;
      acc.redCards += season.redCards;
      return acc;
    },
    {
      matches: 0,
      starts: 0,
      substitutionsIn: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    },
  );

  const substitutionsIn = [...seasons.values()].reduce(
    (sum, season) => sum + season.substitutionsIn,
    0,
  );
  const allRatings = [...seasons.values()].flatMap((season) => season.ratings);
  const current = seasonList.find((season) => season.isCurrent && season.team);

  recent.sort((a, b) => b.date.localeCompare(a.date) || b.round - a.round);

  return {
    currentSeason: current?.team
      ? {
          seasonId: current.seasonId,
          seasonName: current.seasonName,
          year: current.year,
          team: current.team,
          number: current.number ?? 0,
          isCaptain: current.isCaptain,
        }
      : null,
    career: {
      matches: career.matches,
      matchesPlayed: career.matches,
      starts: career.starts,
      substitutionsIn,
      goals: career.goals,
      assists: career.assists,
      yellowCards: career.yellowCards,
      redCards: career.redCards,
      averageRating: roundRating(allRatings),
    },
    seasons: seasonList,
    recentMatches: recent.slice(0, input.recentLimit ?? RECENT_LIMIT),
  };
}
