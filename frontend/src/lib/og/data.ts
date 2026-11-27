import { publicImageDataUrl, clip } from "@/lib/og/assets";
import { DEFAULT_BRAND, type SystemBrand } from "@/lib/brand";
import { apiGet } from "@/lib/api";
import {
  resolveCompetitionSlugForSeason,
  resolveDefaultCompetitionSlug,
} from "@/lib/competition-routes";
import {
  getCompetitionBySlug,
  getCurrentSeason,
  getLiveMatchesGlobal,
  getMatchById,
  getMatches,
  getPlayerProfile,
  getSeasons,
  getStandings,
  getTopScorers,
  type MatchWithTeams,
  type Team,
} from "@/lib/queries";

export type OgSide = {
  name: string;
  shortName: string;
  color: string;
  logo: string | null;
};

export type OgFixture = {
  id: string;
  round: number;
  date: string;
  venue: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  home: OgSide;
  away: OgSide;
  competitionName: string;
  seasonName: string;
};

export type OgStandingRow = {
  rank: number;
  name: string;
  shortName: string;
  color: string;
  points: number;
  played: number;
  goalDifference: number;
};

export type OgScorer = {
  rank: number;
  nickname: string;
  team: string;
  color: string;
  goals: number;
};

export type OgPlayerCard = {
  nickname: string;
  name: string;
  position: string;
  team: string | null;
  number: number | null;
  goals: number;
  assists: number;
  photo: string | null;
};

const UPCOMING = new Set(["scheduled", "lineups_set"]);
const LIVE = new Set(["live", "halftime"]);
const FINISHED = new Set(["finished", "awarded"]);

export function showsScore(status: string): boolean {
  return FINISHED.has(status) || LIVE.has(status) || status === "abandoned";
}

export function fixtureKicker(status: string): string {
  if (LIVE.has(status)) return "AO VIVO";
  if (FINISHED.has(status)) return "RESULTADO";
  if (status === "postponed") return "ADIADO";
  if (status === "abandoned") return "INTERROMPIDO";
  return "PRÓXIMO JOGO";
}

async function sideOf(team: Team | null | undefined): Promise<OgSide> {
  return {
    name: clip(team?.name, 28) || "Time",
    shortName: clip(team?.shortName, 4) || "—",
    color: team?.primaryColor || "#1C2F68",
    logo: await publicImageDataUrl(team?.logoUrl),
  };
}

async function toFixture(
  match: MatchWithTeams,
  competitionName?: string | null,
  seasonName?: string | null,
): Promise<OgFixture> {
  return {
    id: match.id,
    round: match.round,
    date: match.date,
    venue: clip(match.venue, 42),
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    home: await sideOf(match.homeTeam),
    away: await sideOf(match.awayTeam),
    competitionName: clip(competitionName || match.competition?.name, 36) || "SFL",
    seasonName: clip(seasonName || match.seasonName, 28),
  };
}

function sortByDate(matches: MatchWithTeams[]): MatchWithTeams[] {
  return [...matches].sort(
    (a, b) => a.date.localeCompare(b.date) || a.round - b.round,
  );
}

export async function loadBrandName(): Promise<SystemBrand> {
  try {
    const settings = await apiGet<SystemBrand>("/api/settings");
    return { ...DEFAULT_BRAND, ...settings };
  } catch {
    return DEFAULT_BRAND;
  }
}

async function seasonMatches(slug?: string | null): Promise<{
  slug: string | null;
  competitionName: string;
  seasonName: string;
  matches: MatchWithTeams[];
}> {
  const competitionSlug = slug || (await resolveDefaultCompetitionSlug());
  if (!competitionSlug) {
    return { slug: null, competitionName: "SFL", seasonName: "", matches: [] };
  }
  const [competition, season] = await Promise.all([
    getCompetitionBySlug(competitionSlug),
    getCurrentSeason(null, { competitionSlug }),
  ]);
  const matches = season ? await getMatches(null, season.id).catch(() => []) : [];
  return {
    slug: competitionSlug,
    competitionName: competition?.name || "SFL",
    seasonName: season ? `${season.name}` : "",
    matches,
  };
}

export async function loadNextFixture(
  slug?: string | null,
  matchId?: string | null,
): Promise<OgFixture | null> {
  if (matchId) {
    const match = await getMatchById(null, matchId);
    if (!match) return null;
    return toFixture(match);
  }
  const { competitionName, seasonName, matches } = await seasonMatches(slug);
  const live = sortByDate(matches.filter((m) => LIVE.has(m.status)));
  const upcoming = sortByDate(matches.filter((m) => UPCOMING.has(m.status)));
  const picked = live[0] ?? upcoming[0] ?? null;
  if (!picked) return null;
  return toFixture(picked, competitionName, seasonName);
}

export async function loadLatestResult(
  slug?: string | null,
  matchId?: string | null,
): Promise<OgFixture | null> {
  if (matchId) {
    const match = await getMatchById(null, matchId);
    if (!match) return null;
    return toFixture(match);
  }
  const { competitionName, seasonName, matches } = await seasonMatches(slug);
  const finished = [...matches]
    .filter((m) => FINISHED.has(m.status))
    .sort((a, b) => b.date.localeCompare(a.date) || b.round - a.round);
  const picked = finished[0];
  if (!picked) return null;
  return toFixture(picked, competitionName, seasonName);
}

export async function loadHomeHighlight(): Promise<{
  brand: SystemBrand;
  fixture: OgFixture | null;
}> {
  const brand = await loadBrandName();
  try {
    const live = await getLiveMatchesGlobal();
    const playing = live.find((m) => LIVE.has(m.status));
    if (playing) {
      return { brand, fixture: await toFixture(playing) };
    }
  } catch {
    // segue para o próximo jogo ou último resultado
  }
  const next = await loadNextFixture(null, null).catch(() => null);
  if (next) return { brand, fixture: next };
  const last = await loadLatestResult(null, null).catch(() => null);
  return { brand, fixture: last };
}

export async function loadFixtureById(id: string): Promise<OgFixture | null> {
  const match = await getMatchById(null, id);
  if (!match) return null;
  const [slug, seasons] = await Promise.all([
    resolveCompetitionSlugForSeason(match.seasonId).catch(() => null),
    getSeasons().catch(() => []),
  ]);
  const competition = slug ? await getCompetitionBySlug(slug) : null;
  const season = seasons.find((item) => item.id === match.seasonId);
  return toFixture(match, competition?.name, season?.name);
}

export async function loadStandingsBoard(slug?: string | null): Promise<{
  competitionName: string;
  seasonName: string;
  rows: OgStandingRow[];
} | null> {
  const { competitionName, seasonName, slug: resolved } = await seasonMatches(slug);
  if (!resolved) return null;
  const season = await getCurrentSeason(null, { competitionSlug: resolved });
  if (!season) return null;
  const standings = await getStandings(null, season.id).catch(() => []);
  return {
    competitionName,
    seasonName: seasonName || season.name,
    rows: standings.slice(0, 8).map((row, index) => ({
      rank: index + 1,
      name: clip(row.team?.name, 22) || "Time",
      shortName: clip(row.team?.shortName, 4) || "—",
      color: row.team?.primaryColor || "#1C2F68",
      points: row.points,
      played: row.played,
      goalDifference: row.goalDifference,
    })),
  };
}

export async function loadScorersBoard(slug?: string | null): Promise<{
  competitionName: string;
  seasonName: string;
  rows: OgScorer[];
} | null> {
  const { competitionName, seasonName, slug: resolved } = await seasonMatches(slug);
  if (!resolved) return null;
  const season = await getCurrentSeason(null, { competitionSlug: resolved });
  if (!season) return null;
  const scorers = await getTopScorers(null, season.id, 8).catch(() => []);
  const rows = scorers
    .filter((row) => row.player && row.goals > 0)
    .map((row, index) => ({
      rank: index + 1,
      nickname: clip(row.player?.nickname || row.player?.name, 22),
      team: clip(row.team?.shortName || row.team?.name, 8),
      color: row.team?.primaryColor || "#1C2F68",
      goals: row.goals,
    }));
  return {
    competitionName,
    seasonName: seasonName || season.name,
    rows,
  };
}

const POSITION_LABEL: Record<string, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

export async function loadPlayerCard(id: string): Promise<OgPlayerCard | null> {
  const profile = await getPlayerProfile(null, id);
  if (!profile) return null;
  let goals = 0;
  let assists = 0;
  const seasonId = profile.currentSeason?.seasonId;
  if (seasonId) {
    try {
      const stats = await apiGet<
        Array<{ playerId: string; goals: number; assists: number }>
      >(`/api/seasons/${seasonId}/player-stats`);
      const row = stats.find((item) => item.playerId === id);
      goals = row?.goals ?? 0;
      assists = row?.assists ?? 0;
    } catch {
      goals = 0;
      assists = 0;
    }
  }
  return {
    nickname: clip(profile.nickname || profile.name, 16),
    name: clip(profile.name, 36),
    position: POSITION_LABEL[profile.position] || profile.position || "Jogador",
    team: profile.currentSeason?.team?.name
      ? clip(profile.currentSeason.team.name, 28)
      : null,
    number: profile.currentSeason?.number ?? null,
    goals,
    assists,
    photo: await publicImageDataUrl(profile.photoUrl),
  };
}

export function sanitizeSlug(value: string | null): string | null {
  if (!value) return null;
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return slug;
}

export function sanitizeMatchId(value: string | null): string | null {
  if (!value) return null;
  const id = value.trim().toLowerCase();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  ) {
    return null;
  }
  return id;
}
