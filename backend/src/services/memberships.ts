import type { MembershipRole } from "@prisma/client";
import { prisma } from "../core/prisma.js";

export type MembershipDto = {
  id: string;
  role: MembershipRole;
  competitionId: string;
  competitionSlug: string;
  competitionName: string;
  teamId: string | null;
  teamName: string | null;
};

export async function listMembershipsForUser(
  userId: string,
): Promise<MembershipDto[]> {
  const rows = await prisma.userMembership.findMany({
    where: { userId },
    include: {
      competition: { select: { id: true, slug: true, name: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    competitionId: r.competitionId,
    competitionSlug: r.competition.slug,
    competitionName: r.competition.name,
    teamId: r.teamId,
    teamName: r.team?.name ?? null,
  }));
}

export async function hasMembership(
  userId: string,
  opts: {
    competitionId: string;
    roles: MembershipRole[];
    teamId?: string | null;
  },
): Promise<boolean> {
  const { competitionId, roles, teamId } = opts;

  // owner / league_admin of competition
  const league = await prisma.userMembership.findFirst({
    where: {
      userId,
      competitionId,
      role: { in: roles.filter((r) => r === "owner" || r === "league_admin") },
      teamId: null,
    },
  });
  if (league) return true;

  const teamRoles = roles.filter(
    (r) => r === "team_staff" || r === "captain",
  );
  if (teamRoles.length && teamId) {
    const team = await prisma.userMembership.findFirst({
      where: {
        userId,
        competitionId,
        teamId,
        role: { in: teamRoles },
      },
    });
    if (team) return true;
  }

  return false;
}

/** Owner of any competition, or legacy User.role=admin bootstrap. */
export async function isGlobalOwnerOrBootstrapAdmin(user: {
  id: string;
  role: string;
}): Promise<boolean> {
  if (user.role === "admin") {
    const owner = await prisma.userMembership.findFirst({
      where: { userId: user.id, role: "owner" },
    });
    if (owner) return true;
    // bootstrap: admin without membership yet still treated as owner-capable
    return true;
  }
  const owner = await prisma.userMembership.findFirst({
    where: { userId: user.id, role: "owner" },
  });
  return Boolean(owner);
}

export async function canManageLeague(
  userId: string,
  competitionId: string,
): Promise<boolean> {
  return hasMembership(userId, {
    competitionId,
    roles: ["owner", "league_admin"],
  });
}

export async function canManageTeam(
  userId: string,
  competitionId: string,
  teamId: string,
): Promise<boolean> {
  if (await canManageLeague(userId, competitionId)) return true;
  return hasMembership(userId, {
    competitionId,
    roles: ["team_staff"],
    teamId,
  });
}

export async function canCaptainTeam(
  userId: string,
  competitionId: string,
  teamId: string,
): Promise<boolean> {
  if (await canManageTeam(userId, competitionId, teamId)) return true;
  return hasMembership(userId, {
    competitionId,
    roles: ["captain"],
    teamId,
  });
}

export async function getCaptainMembership(userId: string) {
  return prisma.userMembership.findFirst({
    where: { userId, role: "captain", teamId: { not: null } },
    include: { competition: true, team: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Capitão ou comissão técnica com time definido (painel do time). */
export async function getTeamScopedMembership(userId: string) {
  const captain = await getCaptainMembership(userId);
  if (captain) return captain;
  return prisma.userMembership.findFirst({
    where: { userId, role: "team_staff", teamId: { not: null } },
    include: { competition: true, team: true },
    orderBy: { createdAt: "desc" },
  });
}
