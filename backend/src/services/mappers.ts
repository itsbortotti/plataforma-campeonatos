import type {
  Match,
  MatchEvent,
  MatchOfficial,
  PenaltyShootout,
  Player,
  Team,
} from "@prisma/client";

export function mapTeam(row: Team) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    logoUrl: row.logoUrl,
  };
}

export function mapPlayer(row: Player) {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    position: row.position,
    photoUrl: row.photoUrl,
    email: row.email,
    isActive: row.isActive,
    userId: row.userId,
  };
}

type MatchWithTeams = Match & { homeTeam: Team; awayTeam: Team };

export function mapMatch(row: MatchWithTeams) {
  return {
    id: row.id,
    seasonId: row.seasonId,
    round: row.round,
    date: row.date.toISOString(),
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    status: row.status,
    phase: row.phase,
    groupName: row.groupName,
    knockoutLabel: row.knockoutLabel,
    leg: row.leg,
    isWalkover: row.isWalkover,
    awardedToTeamId: row.awardedToTeamId,
    youtubeUrl: row.youtubeUrl,
    venue: row.venue,
    homeFormation: row.homeFormation,
    awayFormation: row.awayFormation,
    firstHalfDuration: row.firstHalfDuration,
    secondHalfDuration: row.secondHalfDuration,
    homeTeam: mapTeam(row.homeTeam),
    awayTeam: mapTeam(row.awayTeam),
  };
}

type EventWithPlayers = MatchEvent & {
  player: Player | null;
  assistPlayer: Player | null;
  playerIn: Player | null;
};

export function mapEvent(row: EventWithPlayers) {
  return {
    id: row.id,
    matchId: row.matchId,
    teamId: row.teamId,
    playerId: row.playerId,
    type: row.type,
    elapsedSeconds: row.elapsedSeconds,
    description: row.description,
    youtubeTimestampSeconds: row.youtubeTimestampSeconds,
    player: row.player
      ? { id: row.player.id, name: row.player.name, nickname: row.player.nickname }
      : null,
    assistPlayer: row.assistPlayer
      ? {
          id: row.assistPlayer.id,
          name: row.assistPlayer.name,
          nickname: row.assistPlayer.nickname,
        }
      : null,
    playerIn: row.playerIn
      ? {
          id: row.playerIn.id,
          name: row.playerIn.name,
          nickname: row.playerIn.nickname,
        }
      : null,
  };
}

export function mapOfficial(row: MatchOfficial) {
  return { matchId: row.matchId, role: row.role, name: row.name, id: row.id };
}

export function mapPenalty(
  row: PenaltyShootout & { player: Player | null },
) {
  return {
    id: row.id,
    matchId: row.matchId,
    teamId: row.teamId,
    playerId: row.playerId,
    scored: row.scored,
    shootOrder: row.shootOrder,
    player: row.player
      ? { id: row.player.id, name: row.player.name, nickname: row.player.nickname }
      : null,
  };
}
