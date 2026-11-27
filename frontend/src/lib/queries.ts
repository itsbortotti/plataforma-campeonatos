/* Data access via SFL backend API (Postgres) — no Supabase. */
import { apiGet } from "@/lib/api";

export type MatchStatus =
  | "scheduled"
  | "lineups_set"
  | "live"
  | "halftime"
  | "finished"
  | "postponed"
  | "awarded"
  | "abandoned";

export interface TimerSnapshot {
  elapsedSeconds: number;
  isRunning: boolean;
  halfStartedAt: string | null;
  currentHalf: string;
}

export interface LiveMatch {
  match: MatchWithTeams;
  timer: TimerSnapshot | null;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
}

export interface MatchWithTeams {
  id: string;
  seasonId: string;
  round: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  phase?: MatchPhase;
  groupName?: string | null;
  knockoutLabel?: string | null;
  leg?: number;
  isWalkover?: boolean;
  awardedToTeamId?: string | null;
  youtubeUrl: string | null;
  venue: string;
  homeFormation: string | null;
  awayFormation: string | null;
  homeTeam: Team;
  awayTeam: Team;
  competition?: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  };
  seasonName?: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  teamId: string | null;
  playerId: string | null;
  type: string;
  elapsedSeconds: number;
  description: string | null;
  youtubeTimestampSeconds: number | null;
  player: { id: string; name: string; nickname: string } | null;
  assistPlayer: { id: string; name: string; nickname: string } | null;
  playerIn: { id: string; name: string; nickname: string } | null;
}

export interface PenaltyKick {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  scored: boolean;
  shootOrder: number;
  player: { id: string; name: string; nickname: string } | null;
}

export interface MatchOfficial {
  id?: string;
  matchId: string;
  role: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  position: string;
  number?: number | null;
  captain?: boolean;
  avulso?: boolean;
  photoUrl?: string | null;
  email?: string | null;
  isActive?: boolean;
  userId?: string | null;
}

export interface RosterWithPlayers {
  teamId: string;
  team: Team | null;
  players: Player[];
}

export interface StandingsEntry {
  teamId: string;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  yellowCards?: number;
  redCards?: number;
  groupName?: string | null;
}

export interface PlayerStatEntry {
  playerId: string;
  player: { id: string; name: string; nickname: string; position: string } | null;
  teamId: string;
  team: Team | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export type CompetitionFormat = "league" | "knockout" | "groups_knockout";
export type MatchPhase = "league" | "group" | "knockout";

export interface Season {
  id: string;
  competitionId?: string;
  competitionName?: string;
  competitionSlug?: string;
  name: string;
  year: number;
  isCurrent: boolean;
  championTeamId: string | null;
  decidedByPenalties: boolean | null;
  matchCount?: number;
  format?: CompetitionFormat | null;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  format?: CompetitionFormat;
  tieBreakers?: string[];
  pointsWin?: number;
  pointsDraw?: number;
  yellowCardLimit?: number;
  redSuspensionGames?: number;
  seasonCount?: number;
  matchCount?: number;
  seasons: Array<{
    id: string;
    name: string;
    year: number;
    isCurrent: boolean;
    championTeamId: string | null;
    matchCount?: number;
  }>;
  currentSeason: {
    id: string;
    name: string;
    year: number;
    isCurrent: boolean;
    championTeamId: string | null;
    matchCount?: number;
  } | null;
}

export interface MatchLineupPlayer {
  /** Lineup row id (DB). */
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  shirtNumber: number;
  status: "starter" | "substitute";
  positionIndex: number | null;
  /** Flattened from player for UI components. */
  name: string;
  nickname: string;
  position: string;
  photoUrl: string | null;
  player: Player;
}

export interface MatchPlayerRating {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  rating: number;
  calculatedRating: number;
  player?: Player;
}

export type HighlightSlot = "mvp" | "second" | "third" | "respect";

export interface MatchHighlight {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  slot: string;
  givenByTeamId?: string | null;
  player?: Player;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  displayName: string | null;
  player: { id: string; nickname: string; name: string } | null;
}

export interface PlayerWithRoster {
  id: string;
  name: string;
  nickname: string;
  position: string;
  photoUrl: string | null;
  email: string | null;
  isActive: boolean;
  userId: string | null;
  roster: {
    id: string;
    teamId: string | null;
    number: number | null;
    isCaptain: boolean;
    teamName: string | null;
    teamShortName: string | null;
    teamLogoUrl: string | null;
  } | null;
}

export interface AvailablePlayer {
  id: string;
  name: string;
  nickname: string;
  position: string;
  photoUrl: string | null;
  /** Último time em temporada anterior (opcional; preenchido se a API enviar). */
  lastTeamId?: string | null;
  lastTeamName?: string | null;
  lastTeamShortName?: string | null;
  lastTeamLogoUrl?: string | null;
  lastNumber?: number | null;
}

export interface CardResetEntry {
  id: string;
  playerId: string;
  seasonId: string;
  resetAt: string;
  userEmail: string | null;
}

export interface CardReportEntry extends PlayerStatEntry {
  totalYellowCards: number;
  totalRedCards: number;
  lastResetAt: string | null;
}

export interface PlayerCareerTotals {
  matches: number;
  matchesPlayed?: number;
  starts?: number;
  substitutionsIn?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating?: number | null;
}

export interface PlayerSeasonEntry {
  seasonId: string;
  seasonName: string;
  year: number;
  isCurrent?: boolean;
  team: Team | null;
  number: number | null;
  isCaptain: boolean;
  matches: number;
  matchesPlayed?: number;
  starts?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  averageRating?: number | null;
}

export interface PlayerMatchAppearance {
  matchId: string;
  seasonId: string;
  seasonName: string;
  round: number;
  date: string;
  status: MatchStatus;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  playerTeam: Team | null;
  wasStarter: boolean;
  cameOnAsSub: boolean;
  wentOffAsSub: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number | null;
}

export interface PlayerProfile {
  id: string;
  name: string;
  nickname: string;
  position: string;
  photoUrl: string | null;
  currentSeason: {
    seasonId: string;
    seasonName: string;
    year: number;
    team: Team;
    number: number;
    isCaptain: boolean;
  } | null;
  career: PlayerCareerTotals;
  seasons: PlayerSeasonEntry[];
  recentMatches: PlayerMatchAppearance[];
}

type MatchDetail = {
  match: MatchWithTeams;
  events: MatchEvent[];
  lineups: MatchLineupPlayer[];
  officials: MatchOfficial[];
  timer: TimerSnapshot | null;
  penalties: PenaltyKick[];
  ratings: MatchPlayerRating[];
  highlights: MatchHighlight[];
};

async function matchDetail(id: string): Promise<MatchDetail> {
  return apiGet<MatchDetail>(`/api/matches/${id}`);
}

export async function getTeams(_c?: unknown): Promise<Team[]> {
  return apiGet("/api/teams");
}

export async function getCompetitions(
  opts?: { all?: boolean },
): Promise<Competition[]> {
  const qs = opts?.all ? "?all=1" : "";
  try {
    return await apiGet(`/api/competitions${qs}`);
  } catch {
    // Sem sessão admin, ?all=1 falha — cai na lista pública.
    if (opts?.all) return apiGet("/api/competitions");
    throw new Error("Não foi possível carregar campeonatos");
  }
}

export async function getCompetitionBySlug(
  slug: string,
): Promise<Competition | null> {
  try {
    return await apiGet(`/api/competitions/${slug}`);
  } catch {
    return null;
  }
}

export async function getSeasons(
  _c?: unknown,
  competitionId?: string,
): Promise<Season[]> {
  const qs = competitionId ? `?competitionId=${competitionId}` : "";
  const rows = await apiGet<
    Array<{
      id: string;
      competitionId?: string;
      competitionName?: string;
      competitionSlug?: string;
      name: string;
      year: number;
      isCurrent: boolean;
      championTeamId: string | null;
      decidedByPenalties: boolean | null;
      matchCount?: number;
    }>
  >(`/api/seasons${qs}`);
  return rows.map((s) => ({
    id: s.id,
    competitionId: s.competitionId,
    competitionName: s.competitionName,
    competitionSlug: s.competitionSlug,
    name: s.name,
    year: s.year,
    isCurrent: s.isCurrent,
    championTeamId: s.championTeamId,
    decidedByPenalties: s.decidedByPenalties ?? false,
    matchCount: s.matchCount ?? 0,
  }));
}

export async function getCurrentSeason(
  _c?: unknown,
  opts?: { competitionSlug?: string; competitionId?: string },
): Promise<Season | null> {
  try {
    const params = new URLSearchParams();
    if (opts?.competitionSlug) params.set("competitionSlug", opts.competitionSlug);
    if (opts?.competitionId) params.set("competitionId", opts.competitionId);
    const qs = params.toString() ? `?${params}` : "";
    const s = await apiGet<{
      id: string;
      competitionId?: string;
      competitionName?: string;
      competitionSlug?: string;
      name: string;
      year: number;
      isCurrent: boolean;
      championTeamId: string | null;
      decidedByPenalties: boolean | null;
      matchCount?: number;
    }>(`/api/seasons/current${qs}`);
    return {
      id: s.id,
      competitionId: s.competitionId,
      competitionName: s.competitionName,
      competitionSlug: s.competitionSlug,
      name: s.name,
      year: s.year,
      isCurrent: s.isCurrent,
      championTeamId: s.championTeamId,
      decidedByPenalties: s.decidedByPenalties ?? false,
      matchCount: s.matchCount,
    };
  } catch {
    return null;
  }
}

export async function hasOtherOngoingSeason(
  _c: unknown,
  seasonId: string,
): Promise<boolean> {
  const seasons = await getSeasons();
  return seasons.some((s) => s.id !== seasonId && !s.championTeamId);
}

export async function getMatches(
  _c: unknown,
  seasonId: string,
): Promise<MatchWithTeams[]> {
  return apiGet(`/api/seasons/${seasonId}/matches`);
}

export async function getMatchById(
  _c: unknown,
  id: string,
): Promise<MatchWithTeams | null> {
  try {
    const d = await matchDetail(id);
    return d.match;
  } catch {
    return null;
  }
}

export async function getCaptainMatches(
  _c: unknown,
  seasonId: string,
  teamId: string,
): Promise<MatchWithTeams[]> {
  const matches = await getMatches(null, seasonId);
  return matches.filter(
    (m) =>
      (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
      (m.status === "scheduled" || m.status === "lineups_set"),
  );
}

/** Partidas do time em andamento (ao vivo / intervalo). */
export async function getCaptainLiveMatches(
  _c: unknown,
  seasonId: string,
  teamId: string,
): Promise<MatchWithTeams[]> {
  const matches = await getMatches(null, seasonId);
  return matches.filter(
    (m) =>
      (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
      (m.status === "live" || m.status === "halftime"),
  );
}

export async function getCaptainFinishedMatches(
  _c: unknown,
  seasonId: string,
  teamId: string,
): Promise<MatchWithTeams[]> {
  const matches = await getMatches(null, seasonId);
  return matches.filter(
    (m) =>
      (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
      m.status === "finished",
  );
}

export async function getNextMatch(
  _c: unknown,
  seasonId: string,
): Promise<MatchWithTeams | null> {
  const matches = await getMatches(null, seasonId);
  return (
    matches.find(
      (m) => m.status === "scheduled" || m.status === "lineups_set",
    ) ?? null
  );
}

export async function getLiveMatch(
  _c: unknown,
  seasonId: string,
): Promise<LiveMatch | null> {
  const matches = await getMatches(null, seasonId);
  const live = matches.find(
    (m) => m.status === "live" || m.status === "halftime",
  );
  if (!live) return null;
  const d = await matchDetail(live.id);
  return { match: d.match, timer: d.timer };
}

export async function getMatchTimer(
  _c: unknown,
  matchId: string,
): Promise<TimerSnapshot | null> {
  const d = await matchDetail(matchId);
  return d.timer;
}

export async function getRecentMatches(
  _c: unknown,
  seasonId: string,
  limit = 5,
): Promise<MatchWithTeams[]> {
  const matches = await getMatches(null, seasonId);
  return matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** Últimas partidas encerradas de todos os campeonatos. */
export async function getRecentMatchesGlobal(
  limit = 12,
): Promise<MatchWithTeams[]> {
  try {
    return await apiGet(`/api/matches/recent?limit=${limit}`);
  } catch {
    return [];
  }
}

export type LiveMatchCard = MatchWithTeams & {
  timer: TimerSnapshot | null;
  recentEvents: Array<{
    id: string;
    type: string;
    elapsedSeconds: number;
    teamId: string | null;
    playerNickname: string | null;
  }>;
};

/** Partidas ao vivo / intervalo em todos os campeonatos. */
export async function getLiveMatchesGlobal(): Promise<LiveMatchCard[]> {
  try {
    return await apiGet("/api/matches/live");
  } catch {
    return [];
  }
}

export async function getTotalRounds(
  _c: unknown,
  seasonId: string,
): Promise<number> {
  const matches = await getMatches(null, seasonId);
  return matches.reduce((max, m) => Math.max(max, m.round), 0);
}

export async function getFinishedMatchCount(
  _c: unknown,
  seasonId: string,
): Promise<number> {
  const matches = await getMatches(null, seasonId);
  return matches.filter((m) => m.status === "finished").length;
}

export async function getMatchEvents(
  _c: unknown,
  matchId: string,
): Promise<MatchEvent[]> {
  const d = await matchDetail(matchId);
  return d.events;
}

export async function getPenaltyShootout(
  _c: unknown,
  matchId: string,
): Promise<PenaltyKick[]> {
  const d = await matchDetail(matchId);
  return d.penalties;
}

export async function getTiedTopTeams(
  _c: unknown,
  seasonId: string,
): Promise<StandingsEntry[]> {
  const standings = await getStandings(null, seasonId);
  if (standings.length < 2) return [];
  const top = standings[0].points;
  return standings.filter((s) => s.points === top).slice(0, 2);
}

export type ShootoutState = {
  matchId: string;
  kicks: PenaltyKick[];
  tiedTeams: StandingsEntry[];
  championTeamId: string | null;
};

export async function getShootoutState(
  _c: unknown,
  seasonId: string,
): Promise<ShootoutState | null> {
  const season = await getCurrentSeason(null).catch(() => null);
  // Prefer season-scoped season when listing from a known seasonId
  const seasons = await getSeasons();
  const scoped = seasons.find((s) => s.id === seasonId) ?? season;
  const tiedTeams = await getTiedTopTeams(null, seasonId);
  const matchId = await getShootoutMatchId(null, seasonId);
  if (!matchId || tiedTeams.length < 2) return null;
  const kicks = await getPenaltyShootout(null, matchId);
  if (!kicks.length && !scoped?.decidedByPenalties) return null;
  return {
    matchId,
    kicks,
    tiedTeams,
    championTeamId: scoped?.championTeamId ?? null,
  };
}

export async function getShootoutMatchId(
  _c: unknown,
  seasonId: string,
): Promise<string | null> {
  const matches = await getMatches(null, seasonId);
  const pen = matches.find((m) => m.status === "finished" && m.homeScore === m.awayScore);
  // Prefer match that has penalties
  for (const m of [...matches].reverse()) {
    const kicks = await getPenaltyShootout(null, m.id);
    if (kicks.length) return m.id;
  }
  return pen?.id ?? null;
}

export async function getMatchOfficials(
  _c: unknown,
  matchId: string,
): Promise<MatchOfficial[]> {
  const d = await matchDetail(matchId);
  return d.officials;
}

export async function getMatchLineups(
  _c: unknown,
  matchId: string,
  teamId: string,
): Promise<MatchLineupPlayer[] | null> {
  const d = await matchDetail(matchId);
  const rows = d.lineups
    .filter((l) => l.teamId === teamId)
    .map((l) => {
      const player = (l.player ?? {
        id: l.playerId,
        name: "",
        nickname: "",
        position: "",
        photoUrl: null,
      }) as Player;
      return {
        id: l.id,
        matchId: l.matchId,
        teamId: l.teamId,
        playerId: l.playerId,
        shirtNumber: l.shirtNumber,
        status: l.status,
        positionIndex: l.positionIndex,
        name: player.name,
        nickname: player.nickname,
        position: player.position,
        photoUrl: player.photoUrl ?? null,
        player,
      } satisfies MatchLineupPlayer;
    });
  return rows.length ? rows : null;
}

export async function getRosters(
  _c: unknown,
  seasonId: string,
): Promise<RosterWithPlayers[]> {
  return apiGet(`/api/seasons/${seasonId}/rosters`);
}

export async function getRoster(
  _c: unknown,
  seasonId: string,
  teamId: string,
): Promise<RosterWithPlayers | null> {
  const all = await getRosters(null, seasonId);
  return all.find((r) => r.teamId === teamId) ?? null;
}

export async function getRosterForLineup(
  _c: unknown,
  seasonId: string,
  teamId: string,
): Promise<RosterWithPlayers | null> {
  return getRoster(null, seasonId, teamId);
}

export async function getStandings(
  _c: unknown,
  seasonId: string,
): Promise<StandingsEntry[]> {
  return apiGet(`/api/seasons/${seasonId}/standings`);
}

export async function getTopScorers(
  _c: unknown,
  seasonId: string,
  limit = 5,
): Promise<PlayerStatEntry[]> {
  const stats = await apiGet<PlayerStatEntry[]>(
    `/api/seasons/${seasonId}/player-stats`,
  );
  return stats.sort((a, b) => b.goals - a.goals).slice(0, limit);
}

export async function getTopAssists(
  _c: unknown,
  seasonId: string,
  limit = 5,
): Promise<PlayerStatEntry[]> {
  const stats = await apiGet<PlayerStatEntry[]>(
    `/api/seasons/${seasonId}/player-stats`,
  );
  return stats.sort((a, b) => b.assists - a.assists).slice(0, limit);
}

export type MatchSuspension = {
  playerId: string;
  reason: "yellow_accumulation" | "red_card";
  gamesRemaining: number;
  yellowCards: number;
  redCards: number;
};

export async function getMatchSuspensions(
  _c: unknown,
  matchId: string,
): Promise<MatchSuspension[]> {
  try {
    return await apiGet<MatchSuspension[]>(
      `/api/admin/matches/${matchId}/suspensions`,
    );
  } catch {
    return [];
  }
}

export async function getSeasonCardResets(
  _c: unknown,
  seasonId: string,
): Promise<CardResetEntry[]> {
  try {
    const rows = await apiGet<
      Array<{
        id: string;
        seasonId: string;
        playerId: string;
        yellowCleared: number;
        redCleared: number;
        reason: string | null;
        createdAt: string;
        player?: { id: string; name: string; nickname: string };
      }>
    >(`/api/admin/seasons/${seasonId}/card-resets`);
    return rows.map((r) => ({
      id: r.id,
      seasonId: r.seasonId,
      playerId: r.playerId,
      resetAt: r.createdAt,
      userEmail: null,
    }));
  } catch {
    return [];
  }
}

export async function getSeasonCardEntries(
  _c: unknown,
  seasonId: string,
): Promise<CardReportEntry[]> {
  const stats = await apiGet<PlayerStatEntry[]>(
    `/api/seasons/${seasonId}/player-stats`,
  );
  return stats
    .filter((s) => s.yellowCards > 0 || s.redCards > 0)
    .map((s) => ({
      ...s,
      totalYellowCards: s.yellowCards,
      totalRedCards: s.redCards,
      lastResetAt: null,
    }));
}

export async function getAllMatchIds(_c?: unknown): Promise<string[]> {
  const seasons = await getSeasons();
  const ids: string[] = [];
  for (const s of seasons) {
    const matches = await getMatches(null, s.id);
    ids.push(...matches.map((m) => m.id));
  }
  return ids;
}

export async function getMatchRatings(
  _c: unknown,
  matchId: string,
): Promise<MatchPlayerRating[]> {
  const d = await matchDetail(matchId);
  return d.ratings;
}

export async function getMatchHighlights(
  _c: unknown,
  matchId: string,
): Promise<MatchHighlight[]> {
  const d = await matchDetail(matchId);
  return d.highlights;
}

export async function getPlayersWithRoster(
  _c: unknown,
  seasonId: string,
): Promise<PlayerWithRoster[]> {
  type PlayerRow = {
    id: string;
    name: string;
    nickname: string;
    position: string;
    photoUrl: string | null;
    email: string | null;
    isActive: boolean;
    userId: string | null;
  };
  type RosterRow = {
    id: string;
    playerId: string;
    teamId: string | null;
    number: number | null;
    isCaptain: boolean;
    team: Team | null;
    player: PlayerRow;
  };

  const [players, flatRosters] = await Promise.all([
    apiGet<PlayerRow[]>("/api/admin/players?all=1").catch(() =>
      apiGet<PlayerRow[]>("/api/players"),
    ),
    apiGet<RosterRow[]>(`/api/admin/seasons/${seasonId}/rosters`).catch(
      async () => {
        const grouped = await getRosters(null, seasonId);
        const flat: RosterRow[] = [];
        for (const g of grouped) {
          for (const p of g.players) {
            flat.push({
              id: `${seasonId}:${p.id}`,
              playerId: p.id,
              teamId: g.teamId || null,
              number: p.number ?? null,
              isCaptain: Boolean(p.captain),
              team: g.team,
              player: {
                id: p.id,
                name: p.name,
                nickname: p.nickname,
                position: p.position,
                photoUrl: p.photoUrl ?? null,
                email: p.email ?? null,
                isActive: p.isActive ?? true,
                userId: p.userId ?? null,
              },
            });
          }
        }
        return flat;
      },
    ),
  ]);

  const byPlayer = new Map<string, PlayerWithRoster["roster"]>();
  for (const r of flatRosters) {
    byPlayer.set(r.playerId, {
      id: r.id,
      teamId: r.teamId,
      number: r.number,
      isCaptain: r.isCaptain,
      teamName: r.team?.name ?? null,
      teamShortName: r.team?.shortName ?? null,
      teamLogoUrl: r.team?.logoUrl ?? null,
    });
  }

  // Prefer players that belong to this season's roster for the admin table
  const inSeason = players
    .filter((p) => byPlayer.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      position: p.position,
      photoUrl: p.photoUrl,
      email: p.email,
      isActive: p.isActive ?? true,
      userId: p.userId,
      roster: byPlayer.get(p.id)!,
    }));

  return inSeason;
}

export async function getAuthUsers(_c?: unknown): Promise<AuthUser[]> {
  try {
    // Lista completa para selects (vínculo jogador ↔ conta).
    return await apiGet("/api/admin/users?all=1");
  } catch {
    return [];
  }
}

export async function getAvailablePlayersForSeason(
  _c: unknown,
  seasonId: string,
): Promise<AvailablePlayer[]> {
  type PlayerRow = {
    id: string;
    name: string;
    nickname: string;
    position: string;
    photoUrl: string | null;
  };
  const [all, inSeason] = await Promise.all([
    apiGet<PlayerRow[]>("/api/admin/players?all=1").catch(() =>
      apiGet<PlayerRow[]>("/api/players"),
    ),
    getPlayersWithRoster(null, seasonId),
  ]);
  const taken = new Set(inSeason.map((p) => p.id));
  return all
    .filter((p) => !taken.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      position: p.position,
      photoUrl: p.photoUrl,
    }));
}

export async function getPlayerProfile(
  _c: unknown,
  playerId: string,
): Promise<PlayerProfile | null> {
  try {
    const data = await apiGet<{
      player: {
        id: string;
        name: string;
        nickname: string;
        position: string;
        photoUrl: string | null;
      };
      currentSeason: PlayerProfile["currentSeason"];
      career: PlayerCareerTotals;
      seasons: PlayerSeasonEntry[];
      recentMatches: PlayerMatchAppearance[];
    }>(`/api/players/${playerId}`);

    if (!data.career || !data.seasons || !data.recentMatches) return null;

    return {
      id: data.player.id,
      name: data.player.name,
      nickname: data.player.nickname,
      position: data.player.position,
      photoUrl: data.player.photoUrl,
      currentSeason: data.currentSeason,
      career: data.career,
      seasons: data.seasons,
      recentMatches: data.recentMatches,
    };
  } catch {
    return null;
  }
}
