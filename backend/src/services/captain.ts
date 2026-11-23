import { prisma } from "../core/prisma.js";
import { getTeamScopedMembership } from "./memberships.js";

export async function getCaptainInfo(userId: string) {
  // Prefer explicit captain/team_staff membership
  const membership = await getTeamScopedMembership(userId);
  if (membership?.teamId) {
    const season = await prisma.season.findFirst({
      where: {
        competitionId: membership.competitionId,
        isCurrent: true,
      },
    });
    if (!season) return null;
    const player = await prisma.player.findFirst({ where: { userId } });
    return {
      teamId: membership.teamId,
      playerId: player?.id ?? null,
      seasonId: season.id,
      competitionId: membership.competitionId,
      scopeRole: membership.role as "captain" | "team_staff",
    };
  }

  // Legacy fallback: roster isCaptain on current season
  const player = await prisma.player.findFirst({ where: { userId } });
  if (!player) return null;

  const season = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (!season) return null;

  const roster = await prisma.seasonRoster.findFirst({
    where: {
      seasonId: season.id,
      playerId: player.id,
      isCaptain: true,
      teamId: { not: null },
    },
  });
  if (!roster?.teamId) return null;

  return {
    teamId: roster.teamId,
    playerId: player.id,
    seasonId: season.id,
    competitionId: season.competitionId,
    scopeRole: "captain" as const,
  };
}
