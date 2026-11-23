export type TeamSlug = "shakhtar" | "tormento";

export interface Team {
  readonly id: string;
  readonly name: string;
  readonly slug: TeamSlug;
  readonly shortName: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly logoUrl?: string;
}

export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly nickname: string;
  readonly position: Position;
  readonly number: number;
  readonly captain?: boolean;
  readonly photoUrl?: string;
}

export interface SeasonRoster {
  readonly teamId: string;
  readonly players: readonly Player[];
}

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Match {
  readonly id: string;
  readonly seasonId: string;
  readonly round: number;
  readonly date: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly status: MatchStatus;
  readonly youtubeUrl?: string;
}

export type EventType = "goal" | "assist" | "yellow_card" | "red_card";

export interface MatchEvent {
  readonly id: string;
  readonly matchId: string;
  readonly playerId: string;
  readonly teamId: string;
  readonly type: EventType;
  readonly elapsedSeconds: number;
  readonly relatedPlayerId?: string; // for assists linked to goals
}

export interface MatchOfficial {
  readonly matchId: string;
  readonly role: "referee" | "assistant_1" | "assistant_2" | "narrator";
  readonly name: string;
}

export interface Season {
  readonly id: string;
  readonly name: string;
  readonly year: number;
  readonly isCurrent: boolean;
  readonly championTeamId?: string;
  readonly decidedByPenalties?: boolean;
}

export interface StandingsRow {
  readonly teamId: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface PlayerStats {
  readonly playerId: string;
  readonly goals: number;
  readonly assists: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly matchesPlayed: number;
}
