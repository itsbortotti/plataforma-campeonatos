import type { Competition, CompetitionFormat, Season } from "@prisma/client";

export type TieBreaker =
  | "points"
  | "wins"
  | "goalDifference"
  | "goalsFor"
  | "headToHead"
  | "fairPlay"
  | "name";

export const DEFAULT_TIE_BREAKERS: TieBreaker[] = [
  "points",
  "wins",
  "goalDifference",
  "goalsFor",
  "headToHead",
  "name",
];

export type CompetitionRules = {
  format: CompetitionFormat;
  tieBreakers: TieBreaker[];
  pointsWin: number;
  pointsDraw: number;
  yellowCardLimit: number;
  redSuspensionGames: number;
};

export function parseTieBreakers(raw: unknown): TieBreaker[] {
  const allowed = new Set<TieBreaker>([
    "points",
    "wins",
    "goalDifference",
    "goalsFor",
    "headToHead",
    "fairPlay",
    "name",
  ]);
  if (!Array.isArray(raw)) return [...DEFAULT_TIE_BREAKERS];
  const parsed = raw.filter(
    (x): x is TieBreaker => typeof x === "string" && allowed.has(x as TieBreaker),
  );
  return parsed.length ? parsed : [...DEFAULT_TIE_BREAKERS];
}

export function resolveCompetitionRules(
  competition: Pick<
    Competition,
    | "format"
    | "tieBreakers"
    | "pointsWin"
    | "pointsDraw"
    | "yellowCardLimit"
    | "redSuspensionGames"
  >,
  season?: Pick<Season, "format"> | null,
): CompetitionRules {
  return {
    format: season?.format ?? competition.format,
    tieBreakers: parseTieBreakers(competition.tieBreakers),
    pointsWin: competition.pointsWin,
    pointsDraw: competition.pointsDraw,
    yellowCardLimit: competition.yellowCardLimit,
    redSuspensionGames: competition.redSuspensionGames,
  };
}

export function formatLabel(format: CompetitionFormat): string {
  switch (format) {
    case "league":
      return "Pontos corridos";
    case "knockout":
      return "Mata-mata";
    case "groups_knockout":
      return "Grupos + mata-mata";
    default:
      return format;
  }
}
