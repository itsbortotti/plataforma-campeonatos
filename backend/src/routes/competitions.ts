import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, requireOwner, requireUser } from "../core/auth.js";
import { prisma } from "../core/prisma.js";
import { writeAudit } from "../services/audit.js";
import {
  isGlobalOwnerOrBootstrapAdmin,
  listMembershipsForUser,
} from "../services/memberships.js";
import {
  listRolePermissions,
  setRolePermissions,
} from "../services/role-permissions.js";
import { MembershipRole } from "@prisma/client";

function mapCompetition(c: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  format?: string;
  tieBreakers?: unknown;
  pointsWin?: number;
  pointsDraw?: number;
  yellowCardLimit?: number;
  redSuspensionGames?: number;
}) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    logoUrl: c.logoUrl,
    isActive: c.isActive,
    format: c.format ?? "league",
    tieBreakers: c.tieBreakers ?? [
      "points",
      "wins",
      "goalDifference",
      "goalsFor",
      "headToHead",
      "name",
    ],
    pointsWin: c.pointsWin ?? 3,
    pointsDraw: c.pointsDraw ?? 1,
    yellowCardLimit: c.yellowCardLimit ?? 3,
    redSuspensionGames: c.redSuspensionGames ?? 1,
  };
}

export async function competitionRoutes(app: FastifyInstance) {
  app.get("/api/competitions", async (request, reply) => {
    const q = z
      .object({ all: z.enum(["1", "true"]).optional() })
      .parse(request.query ?? {});
    const includeInactive = Boolean(q.all);
    if (includeInactive) {
      const user = await requireAdmin(request, reply);
      if (!user) return;
    }
    const rows = await prisma.competition.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: "asc" },
      include: {
        seasons: {
          orderBy: { year: "desc" },
          select: {
            id: true,
            name: true,
            year: true,
            isCurrent: true,
            championTeamId: true,
            _count: { select: { matches: true } },
          },
        },
      },
    });
    return rows.map((c) => ({
      ...mapCompetition(c),
      seasons: c.seasons.map((s) => ({
        id: s.id,
        name: s.name,
        year: s.year,
        isCurrent: s.isCurrent,
        championTeamId: s.championTeamId,
        matchCount: s._count.matches,
      })),
      seasonCount: c.seasons.length,
      matchCount: c.seasons.reduce((n, s) => n + s._count.matches, 0),
      currentSeason: c.seasons.find((s) => s.isCurrent) ?? c.seasons[0] ?? null,
    }));
  });

  app.get("/api/competitions/:slug", async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const c = await prisma.competition.findUnique({
      where: { slug },
      include: {
        seasons: { orderBy: { year: "desc" } },
      },
    });
    if (!c) return reply.code(404).send({ error: "Campeonato não encontrado" });
    return {
      ...mapCompetition(c),
      seasons: c.seasons.map((s) => ({
        id: s.id,
        competitionId: s.competitionId,
        name: s.name,
        year: s.year,
        isCurrent: s.isCurrent,
        championTeamId: s.championTeamId,
        decidedByPenalties: s.decidedByPenalties,
      })),
      currentSeason:
        c.seasons.find((s) => s.isCurrent) ?? c.seasons[0] ?? null,
    };
  });

  app.get("/api/competitions/:slug/seasons", async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const c = await prisma.competition.findUnique({ where: { slug } });
    if (!c) return reply.code(404).send({ error: "Campeonato não encontrado" });
    return prisma.season.findMany({
      where: { competitionId: c.id },
      orderBy: { year: "desc" },
    });
  });

  app.post("/api/competitions", async (request, reply) => {
    const user = await requireOwner(request, reply);
    if (!user) return;
    const body = z
      .object({
        slug: z.string().min(2),
        name: z.string().min(2),
        description: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        format: z.enum(["league", "knockout", "groups_knockout"]).optional(),
        tieBreakers: z.array(z.string()).optional(),
        pointsWin: z.number().int().min(0).optional(),
        pointsDraw: z.number().int().min(0).optional(),
        yellowCardLimit: z.number().int().min(1).optional(),
        redSuspensionGames: z.number().int().min(1).optional(),
      })
      .parse(request.body);
    const created = await prisma.competition.create({
      data: {
        slug: body.slug,
        name: body.name,
        description: body.description ?? null,
        logoUrl: body.logoUrl ?? null,
        isActive: body.isActive ?? true,
        format: body.format ?? "league",
        tieBreakers: body.tieBreakers ?? [
          "points",
          "wins",
          "goalDifference",
          "goalsFor",
          "headToHead",
          "name",
        ],
        pointsWin: body.pointsWin ?? 3,
        pointsDraw: body.pointsDraw ?? 1,
        yellowCardLimit: body.yellowCardLimit ?? 3,
        redSuspensionGames: body.redSuspensionGames ?? 1,
      },
    });
    await prisma.userMembership.create({
      data: {
        userId: user.id,
        role: "owner",
        competitionId: created.id,
        teamId: null,
      },
    });
    await writeAudit({
      userId: user.id,
      userEmail: user.email,
      action: "create",
      entityType: "competition",
      entityId: created.id,
      description: `Criou campeonato ${created.name}`,
    });
    return mapCompetition(created);
  });

  app.patch("/api/competitions/:id", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        format: z.enum(["league", "knockout", "groups_knockout"]).optional(),
        tieBreakers: z.array(z.string()).optional(),
        pointsWin: z.number().int().min(0).optional(),
        pointsDraw: z.number().int().min(0).optional(),
        yellowCardLimit: z.number().int().min(1).optional(),
        redSuspensionGames: z.number().int().min(1).optional(),
      })
      .parse(request.body);
    const updated = await prisma.competition.update({
      where: { id },
      data: body,
    });
    return mapCompetition(updated);
  });

  // ── Memberships ──
  app.get("/api/admin/memberships", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;
    const q = z
      .object({ competitionId: z.string().uuid().optional() })
      .parse(request.query ?? {});
    const rows = await prisma.userMembership.findMany({
      where: q.competitionId ? { competitionId: q.competitionId } : undefined,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        competition: { select: { id: true, slug: true, name: true } },
        team: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      userId: r.userId,
      userEmail: r.user.email,
      userDisplayName: r.user.displayName,
      competitionId: r.competitionId,
      competitionSlug: r.competition.slug,
      competitionName: r.competition.name,
      teamId: r.teamId,
      teamName: r.team?.name ?? null,
      teamShortName: r.team?.shortName ?? null,
    }));
  });

  app.post("/api/admin/memberships", async (request, reply) => {
    const actor = await requireUser(request, reply);
    if (!actor) return;

    const parsed = z
      .object({
        userId: z.string().uuid().optional(),
        email: z
          .string()
          .trim()
          .email("Digite um e-mail válido, com @ (ex: nome@dominio.com).")
          .optional(),
        role: z.nativeEnum(MembershipRole, {
          errorMap: () => ({ message: "Escolha um perfil de acesso." }),
        }),
        competitionId: z.string().uuid().optional(),
        teamId: z.string().uuid().nullable().optional(),
        password: z
          .string()
          .min(6, "A senha precisa ter pelo menos 6 caracteres.")
          .optional(),
        displayName: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return reply
        .code(400)
        .send({ error: first?.message || "Dados inválidos. Confira o formulário." });
    }
    const body = parsed.data;

    if (!body.userId && !body.email) {
      return reply
        .code(400)
        .send({ error: "Informe o e-mail do usuário (ex: nome@dominio.com)." });
    }

    if (
      (body.role === "team_staff" || body.role === "captain") &&
      !body.teamId
    ) {
      return reply
        .code(400)
        .send({ error: "Escolha o time para este perfil." });
    }
    if (
      (body.role === "owner" || body.role === "league_admin") &&
      body.teamId
    ) {
      return reply
        .code(400)
        .send({ error: "Perfis da liga não usam time." });
    }

    let competitionId = body.competitionId;
    if (!competitionId) {
      const preferred =
        (await prisma.competition.findFirst({
          where: { slug: "sfl", isActive: true },
          select: { id: true },
        })) ??
        (await prisma.competition.findFirst({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true },
        })) ??
        (await prisma.competition.findFirst({
          orderBy: { name: "asc" },
          select: { id: true },
        }));
      if (!preferred) {
        return reply.code(400).send({ error: "Nenhum campeonato cadastrado" });
      }
      competitionId = preferred.id;
    }

    const isOwner = await isGlobalOwnerOrBootstrapAdmin(actor);
    const memberships = await listMembershipsForUser(actor.id);
    const isLeagueAdmin = memberships.some(
      (m) => m.role === "owner" || m.role === "league_admin",
    );

    if (body.role === "owner" && !isOwner) {
      return reply.code(403).send({ error: "Só owner pode conceder owner" });
    }
    if (!isOwner && !isLeagueAdmin) {
      return reply
        .code(403)
        .send({ error: "Você não tem permissão para conceder este perfil." });
    }
    if (!isOwner && body.role === "league_admin") {
      return reply
        .code(403)
        .send({ error: "Só o Owner pode criar Admin da liga." });
    }

    let userId = body.userId;
    if (!userId && body.email) {
      const existing = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      if (existing) {
        userId = existing.id;
      } else {
        if (!body.password) {
          return reply.code(400).send({
            error: "Digite uma senha com pelo menos 6 caracteres para criar o usuário.",
          });
        }
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(body.password, 10);
        const created = await prisma.user.create({
          data: {
            email: body.email.toLowerCase(),
            passwordHash,
            displayName: body.displayName ?? null,
            role: "user",
          },
        });
        userId = created.id;
      }
    }
    if (!userId) {
      return reply.code(400).send({ error: "userId ou email obrigatório" });
    }

    const teamId =
      body.role === "team_staff" || body.role === "captain"
        ? body.teamId!
        : null;

    const dup = await prisma.userMembership.findFirst({
      where: {
        userId,
        role: body.role,
        competitionId,
        teamId,
      },
    });
    if (dup) return dup;

    const row = await prisma.userMembership.create({
      data: {
        userId,
        role: body.role,
        competitionId,
        teamId,
      },
    });
    await writeAudit({
      userId: actor.id,
      userEmail: actor.email,
      action: "create",
      entityType: "membership",
      entityId: row.id,
      description: `Concedeu ${body.role}`,
      details: { ...body, competitionId },
    });
    return row;
  });

  app.delete("/api/admin/memberships/:id", async (request, reply) => {
    const actor = await requireUser(request, reply);
    if (!actor) return;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const row = await prisma.userMembership.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "Membership não encontrada" });

    const isOwner = await isGlobalOwnerOrBootstrapAdmin(actor);
    if (row.role === "owner" && !isOwner) {
      return reply.code(403).send({ error: "Só owner pode remover owner" });
    }
    if (!isOwner) {
      const ok = await listMembershipsForUser(actor.id).then((ms) =>
        ms.some((m) => m.role === "owner" || m.role === "league_admin"),
      );
      if (!ok) {
        return reply
          .code(403)
          .send({ error: "Você não tem permissão para remover este perfil." });
      }
    }

    await prisma.userMembership.delete({ where: { id } });
    return { ok: true };
  });

  // ── Perfis / permissões ──
  app.get("/api/admin/role-permissions", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;
    return listRolePermissions();
  });

  app.put("/api/admin/role-permissions/:role", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;
    const { role } = z
      .object({ role: z.nativeEnum(MembershipRole) })
      .parse(request.params);
    const body = z
      .object({
        capabilities: z.record(z.string(), z.boolean()),
      })
      .parse(request.body);
    const result = await setRolePermissions(role, body.capabilities);
    await writeAudit({
      userId: user.id,
      userEmail: user.email,
      action: "update",
      entityType: "role_permission",
      entityId: role,
      description: `Atualizou permissões do perfil ${role}`,
      details: body.capabilities,
    });
    return result;
  });
}
