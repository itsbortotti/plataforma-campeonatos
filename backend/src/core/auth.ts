import type { FastifyReply, FastifyRequest } from "fastify";
import type { UserRole } from "@prisma/client";
import { config } from "./config.js";
import { prisma } from "./prisma.js";
import {
  canCaptainTeam,
  canManageLeague,
  canManageTeam,
  isGlobalOwnerOrBootstrapAdmin,
  listMembershipsForUser,
} from "../services/memberships.js";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: UserRole };
    user: { sub: string; email: string; role: UserRole };
  }
}

export async function resolveUser(
  request: FastifyRequest,
): Promise<AuthUser | null> {
  try {
    await request.jwtVerify();
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
}

const cookieSecure =
  process.env.COOKIE_SECURE === "true" ||
  process.env.NODE_ENV === "production";

export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(config.cookieName, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure,
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(config.cookieName, {
    path: "/",
    secure: cookieSecure,
    sameSite: "lax",
  });
}

export async function requireUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const user = await resolveUser(request);
  if (!user) {
    reply
      .code(401)
      .send({ error: "Faça login para continuar." });
    return null;
  }
  return user;
}

/** Legacy: bootstrap admin OR any owner/league_admin membership. */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) return null;

  if (await isGlobalOwnerOrBootstrapAdmin(user)) return user;

  const memberships = await listMembershipsForUser(user.id);
  const ok = memberships.some(
    (m) => m.role === "owner" || m.role === "league_admin",
  );
  if (!ok) {
    reply
      .code(403)
      .send({ error: "Você não tem acesso a esta área do Master." });
    return null;
  }
  return user;
}

export async function requireOwner(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) return null;
  if (!(await isGlobalOwnerOrBootstrapAdmin(user))) {
    reply
      .code(403)
      .send({ error: "Só o Owner pode fazer esta ação." });
    return null;
  }
  return user;
}

export async function requireLeagueAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  competitionId: string,
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) return null;
  if (await isGlobalOwnerOrBootstrapAdmin(user)) return user;
  if (!(await canManageLeague(user.id, competitionId))) {
    reply
      .code(403)
      .send({ error: "Você precisa ser Admin da liga para esta ação." });
    return null;
  }
  return user;
}

export async function requireTeamStaff(
  request: FastifyRequest,
  reply: FastifyReply,
  competitionId: string,
  teamId: string,
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) return null;
  if (!(await canManageTeam(user.id, competitionId, teamId))) {
    reply
      .code(403)
      .send({ error: "Você precisa ser da comissão técnica para esta ação." });
    return null;
  }
  return user;
}

export async function requireCaptainAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  competitionId: string,
  teamId: string,
): Promise<AuthUser | null> {
  const user = await requireUser(request, reply);
  if (!user) return null;
  if (!(await canCaptainTeam(user.id, competitionId, teamId))) {
    reply
      .code(403)
      .send({ error: "Você precisa ser capitão para esta ação." });
    return null;
  }
  return user;
}
