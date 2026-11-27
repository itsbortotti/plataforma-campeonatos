import { describe, expect, it } from "vitest";
import {
  buildPlayerProfile,
  type ProfileEvent,
  type ProfileMatch,
  type ProfileTeam,
} from "./player-profile.js";

const PLAYER = "diogo";
const SEASON_3 = "season-3";
const SEASON_2 = "season-2";

function team(id: string, name: string): ProfileTeam {
  return {
    id,
    slug: id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    primaryColor: "#111111",
    secondaryColor: "#eeeeee",
    logoUrl: null,
  };
}

const tormento = team("tormento", "Tormento");
const dinamo = team("dinamo", "Dinamo");

function match(opts: {
  id: string;
  round: number;
  date: string;
  status?: string;
  seasonId?: string;
  seasonName?: string;
  year?: number;
  isCurrent?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
}): ProfileMatch {
  return {
    id: opts.id,
    seasonId: opts.seasonId ?? SEASON_3,
    seasonName: opts.seasonName ?? "Temporada 3",
    year: opts.year ?? 2026,
    isCurrent: opts.isCurrent ?? true,
    round: opts.round,
    date: opts.date,
    status: opts.status ?? "finished",
    homeTeam: tormento,
    awayTeam: dinamo,
    homeScore: opts.homeScore ?? 1,
    awayScore: opts.awayScore ?? 0,
  };
}

function goal(matchId: string, scorer: string, assist: string | null = null): ProfileEvent {
  return {
    matchId,
    type: "goal",
    playerId: scorer,
    assistPlayerId: assist,
    playerInId: null,
    team: tormento,
  };
}

describe("perfil do jogador", () => {
  it("separa gols de assistências e conta partidas, não lances", () => {
    const matches = [
      match({ id: "m1", round: 1, date: "2026-03-01T15:00:00.000Z" }),
      match({ id: "m2", round: 2, date: "2026-03-08T15:00:00.000Z" }),
    ];
    const events: ProfileEvent[] = [
      goal("m1", PLAYER),
      goal("m1", PLAYER),
      {
        ...goal("m1", PLAYER),
        type: "yellow_card",
      },
      goal("m2", "colega", PLAYER),
      goal("m2", "colega", PLAYER),
    ];

    const profile = buildPlayerProfile({
      playerId: PLAYER,
      rosters: [
        {
          seasonId: SEASON_3,
          seasonName: "Temporada 3",
          year: 2026,
          isCurrent: true,
          team: tormento,
          number: 9,
          isCaptain: false,
        },
      ],
      matches,
      lineups: matches.map((item) => ({
        matchId: item.id,
        status: "starter" as const,
        team: tormento,
      })),
      events,
      ratings: [],
    });

    const season = profile.seasons.find((item) => item.seasonId === SEASON_3);
    expect(season?.goals).toBe(2);
    expect(season?.assists).toBe(2);
    expect(season?.matchesPlayed).toBe(2);
    expect(season?.yellowCards).toBe(1);
    expect(profile.career.goals).toBe(2);
    expect(profile.career.assists).toBe(2);
    expect(profile.career.matches).toBe(2);
    expect(profile.recentMatches).toHaveLength(2);
    expect(profile.recentMatches[0]?.matchId).toBe("m2");
    expect(profile.recentMatches[0]?.assists).toBe(2);
    expect(profile.recentMatches[0]?.goals).toBe(0);
  });

  it("mostra os 8 gols da temporada e não zera o histórico", () => {
    const played = Array.from({ length: 7 }, (_, index) =>
      match({
        id: `g${index + 1}`,
        round: index + 1,
        date: `2026-04-${String(index + 1).padStart(2, "0")}T15:00:00.000Z`,
        homeScore: index === 3 ? 2 : 1,
      }),
    );
    const subIn = match({
      id: "sub",
      round: 9,
      date: "2026-05-01T15:00:00.000Z",
      homeScore: 0,
      awayScore: 0,
    });
    const bench = match({
      id: "bench",
      round: 10,
      date: "2026-05-08T15:00:00.000Z",
    });
    const scheduled = match({
      id: "future",
      round: 11,
      date: "2026-06-01T15:00:00.000Z",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
    });
    const ownGoal = match({
      id: "og",
      round: 12,
      date: "2026-05-15T15:00:00.000Z",
      homeScore: 0,
      awayScore: 1,
    });

    const events: ProfileEvent[] = played.map((item, index) =>
      index === 3
        ? { ...goal(item.id, PLAYER), type: "penalty_goal" }
        : goal(item.id, PLAYER),
    );
    events.push(
      { ...goal(played[3]!.id, PLAYER), type: "goal" },
      {
        matchId: "sub",
        type: "substitution",
        playerId: "titular",
        assistPlayerId: null,
        playerInId: PLAYER,
        team: tormento,
      },
      {
        matchId: "og",
        type: "own_goal",
        playerId: PLAYER,
        assistPlayerId: null,
        playerInId: null,
        team: tormento,
      },
    );

    const profile = buildPlayerProfile({
      playerId: PLAYER,
      rosters: [
        {
          seasonId: SEASON_3,
          seasonName: "Temporada 3",
          year: 2026,
          isCurrent: true,
          team: tormento,
          number: 10,
          isCaptain: true,
        },
        {
          seasonId: SEASON_2,
          seasonName: "Temporada 2",
          year: 2025,
          isCurrent: false,
          team: dinamo,
          number: 7,
          isCaptain: false,
        },
      ],
      matches: [...played, subIn, bench, scheduled, ownGoal],
      lineups: [
        ...played.map((item) => ({
          matchId: item.id,
          status: "starter" as const,
          team: tormento,
        })),
        { matchId: "sub", status: "substitute" as const, team: tormento },
        { matchId: "bench", status: "substitute" as const, team: tormento },
        { matchId: "future", status: "starter" as const, team: tormento },
        { matchId: "og", status: "starter" as const, team: tormento },
      ],
      events,
      ratings: [
        { matchId: "g1", rating: 8 },
        { matchId: "g2", rating: 6 },
        { matchId: "bench", rating: 9 },
      ],
    });

    const current = profile.seasons.find((item) => item.seasonId === SEASON_3);
    const previous = profile.seasons.find((item) => item.seasonId === SEASON_2);

    expect(current?.goals).toBe(8);
    expect(current?.assists).toBe(0);
    expect(current?.matchesPlayed).toBe(9);
    expect(current?.starts).toBe(8);
    expect(current?.averageRating).toBe(7);
    expect(previous?.goals).toBe(0);
    expect(previous?.matchesPlayed).toBe(0);
    expect(profile.currentSeason?.team.shortName).toBe("TOR");
    expect(profile.currentSeason?.isCaptain).toBe(true);
    expect(profile.career.goals).toBe(8);
    expect(profile.career.matchesPlayed).toBe(9);
    expect(profile.career.substitutionsIn).toBe(1);
    expect(profile.recentMatches.length).toBeGreaterThan(0);
    expect(profile.recentMatches.some((item) => item.matchId === "bench")).toBe(false);
    expect(profile.recentMatches.some((item) => item.matchId === "future")).toBe(false);
    expect(profile.recentMatches[0]?.date >= profile.recentMatches.at(-1)!.date).toBe(
      true,
    );

    const double = profile.recentMatches.find((item) => item.matchId === "g4");
    expect(double?.goals).toBe(2);
  });
});
