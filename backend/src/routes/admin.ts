import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  HighlightSlot,
  LineupStatus,
  MatchEventType,
  MatchPhase,
  MatchStatus,
  OfficialRole,
  PlayerPosition,
  UserRole,
} from "@prisma/client";
import { requireAdmin } from "../core/auth.js";
import { prisma } from "../core/prisma.js";
import { writeAudit } from "../services/audit.js";
import { mapMatch, mapPlayerAdmin, mapTeam } from "../services/mappers.js";
import { liveBus } from "../services/live-bus.js";
import {
  generateKnockoutBracket,
  generateRoundRobin,
} from "../services/fixtures.js";
import {
  assertLineupNotSuspended,
  getSuspensionsForMatch,
} from "../services/suspensions.js";
import { resolveCompetitionRules } from "../services/competition-rules.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/system-settings.js";
import {
  paginatedResult,
  parsePagination,
  skipTake,
} from "../lib/pagination.js";

const teamInclude = { homeTeam: true, awayTeam: true } as const;

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/api/admin")) return;
    const user = await requireAdmin(request, reply);
    if (!user) return;
    (request as unknown as { adminUser?: typeof user }).adminUser = user;
  });

  // ── Teams ──
  app.get("/api/admin/teams", async (request) => {
    const { page, pageSize, q } = parsePagination(request.query);
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { shortName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;
    const { skip, take } = skipTake(page, pageSize);
    const [rows, total] = await Promise.all([
      prisma.team.findMany({ where, orderBy: { name: "asc" }, skip, take }),
      prisma.team.count({ where }),
    ]);
    return paginatedResult(rows.map(mapTeam), total, page, pageSize);
  });

  app.post("/api/admin/teams", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const body = z
      .object({
        name: z.string(),
        shortName: z.string(),
        slug: z.string(),
        primaryColor: z.string(),
        secondaryColor: z.string(),
        logoUrl: z.string().nullable().optional(),
      })
      .parse(request.body);
    const team = await prisma.team.create({
      data: {
        name: body.name,
        shortName: body.shortName,
        slug: body.slug,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        logoUrl: body.logoUrl ?? null,
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "team",
      entityId: team.id,
      description: `Criou time ${team.name}`,
      details: body,
    });
    return mapTeam(team);
  });

  app.patch("/api/admin/teams/:id", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        name: z.string().optional(),
        shortName: z.string().optional(),
        slug: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        logoUrl: z.string().nullable().optional(),
      })
      .parse(request.body);
    const team = await prisma.team.update({ where: { id }, data: body });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "team",
      entityId: id,
      description: `Atualizou time ${team.name}`,
      details: body,
    });
    return mapTeam(team);
  });

  app.delete("/api/admin/teams/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.team.delete({ where: { id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "team",
      entityId: id,
      description: "Removeu time",
    });
    return { ok: true };
  });

  // ── Seasons ──
  app.get("/api/admin/seasons", async () => prisma.season.findMany({ orderBy: { year: "desc" } }));

  app.post("/api/admin/seasons", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const body = z
      .object({
        competitionId: z.string().uuid(),
        name: z.string(),
        year: z.number().int(),
        isCurrent: z.boolean().optional(),
      })
      .parse(request.body);
    if (body.isCurrent) {
      await prisma.season.updateMany({
        where: { competitionId: body.competitionId },
        data: { isCurrent: false },
      });
    }
    const season = await prisma.season.create({
      data: {
        competitionId: body.competitionId,
        name: body.name,
        year: body.year,
        isCurrent: body.isCurrent ?? false,
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "season",
      entityId: season.id,
      description: `Criou temporada ${season.name}`,
    });
    return season;
  });

  app.patch("/api/admin/seasons/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        name: z.string().optional(),
        year: z.number().int().optional(),
        isCurrent: z.boolean().optional(),
        championTeamId: z.string().uuid().nullable().optional(),
        decidedByPenalties: z.boolean().nullable().optional(),
      })
      .parse(request.body);
    const existing = await prisma.season.findUnique({ where: { id } });
    if (body.isCurrent && existing) {
      await prisma.season.updateMany({
        where: { competitionId: existing.competitionId },
        data: { isCurrent: false },
      });
    }
    const season = await prisma.season.update({ where: { id }, data: body });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "season",
      entityId: id,
      description: `Atualizou temporada ${season.name}`,
      details: body,
    });
    return season;
  });

  app.delete("/api/admin/seasons/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.season.delete({ where: { id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "season",
      entityId: id,
      description: "Removeu temporada",
    });
    return { ok: true };
  });

  // ── Players ──
  app.get("/api/admin/players", async (request) => {
    const raw = z
      .object({ all: z.enum(["1", "true"]).optional() })
      .parse(request.query ?? {});
    const { page, pageSize, q } = parsePagination(request.query);
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { nickname: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;
    const include = {
      user: { select: { id: true, email: true, role: true } },
    } as const;
    if (raw.all) {
      const players = await prisma.player.findMany({
        where,
        include,
        orderBy: { nickname: "asc" },
      });
      return players.map((p) => ({ ...mapPlayerAdmin(p), user: p.user }));
    }
    const { skip, take } = skipTake(page, pageSize);
    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        include,
        orderBy: { nickname: "asc" },
        skip,
        take,
      }),
      prisma.player.count({ where }),
    ]);
    return paginatedResult(
      players.map((p) => ({ ...mapPlayerAdmin(p), user: p.user })),
      total,
      page,
      pageSize,
    );
  });

  app.post("/api/admin/players", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const body = z
      .object({
        name: z.string(),
        nickname: z.string(),
        position: z.nativeEnum(PlayerPosition),
        photoUrl: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        isActive: z.boolean().optional(),
        linkByEmail: z.boolean().optional(),
      })
      .parse(request.body);

    let userId: string | null = null;
    if (body.linkByEmail && body.email) {
      const u = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      userId = u?.id ?? null;
    }

    const player = await prisma.player.create({
      data: {
        name: body.name,
        nickname: body.nickname,
        position: body.position,
        photoUrl: body.photoUrl ?? null,
        email: body.email?.toLowerCase() ?? null,
        isActive: body.isActive ?? true,
        userId,
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "player",
      entityId: player.id,
      description: `Criou jogador ${player.nickname}`,
      details: body,
    });
    return mapPlayerAdmin(player);
  });

  app.patch("/api/admin/players/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        name: z.string().optional(),
        nickname: z.string().optional(),
        position: z.nativeEnum(PlayerPosition).optional(),
        photoUrl: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        isActive: z.boolean().optional(),
        linkByEmail: z.boolean().optional(),
        userId: z.string().uuid().nullable().optional(),
      })
      .parse(request.body);

    let userId = body.userId;
    if (body.linkByEmail && body.email) {
      const u = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      userId = u?.id ?? null;
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        name: body.name,
        nickname: body.nickname,
        position: body.position,
        photoUrl: body.photoUrl,
        email: body.email === undefined ? undefined : body.email?.toLowerCase() ?? null,
        isActive: body.isActive,
        userId: userId === undefined ? undefined : userId,
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "player",
      entityId: id,
      description: `Atualizou jogador ${player.nickname}`,
      details: body,
    });
    return mapPlayerAdmin(player);
  });

  app.delete("/api/admin/players/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.player.delete({ where: { id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "player",
      entityId: id,
      description: "Removeu jogador",
    });
    return { ok: true };
  });

  // ── Rosters ──
  app.get("/api/admin/seasons/:seasonId/rosters", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    return prisma.seasonRoster.findMany({
      where: { seasonId },
      include: { player: true, team: true },
    });
  });

  app.post("/api/admin/rosters", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const body = z
      .object({
        seasonId: z.string().uuid(),
        playerId: z.string().uuid(),
        teamId: z.string().uuid().nullable(),
        number: z.number().int().nullable().optional(),
        isCaptain: z.boolean().optional(),
      })
      .parse(request.body);
    const roster = await prisma.seasonRoster.upsert({
      where: {
        seasonId_playerId: { seasonId: body.seasonId, playerId: body.playerId },
      },
      create: {
        seasonId: body.seasonId,
        playerId: body.playerId,
        teamId: body.teamId,
        number: body.number ?? null,
        isCaptain: body.isCaptain ?? false,
      },
      update: {
        teamId: body.teamId,
        number: body.number ?? null,
        isCaptain: body.isCaptain ?? false,
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "upsert",
      entityType: "roster",
      entityId: roster.id,
      description: "Atualizou elenco",
      details: body,
    });
    return roster;
  });

  app.delete("/api/admin/rosters/:id", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.seasonRoster.delete({ where: { id } });
    return { ok: true };
  });

  app.post("/api/admin/rosters/copy", async (request) => {
    const body = z
      .object({
        fromSeasonId: z.string().uuid(),
        toSeasonId: z.string().uuid(),
      })
      .parse(request.body);
    const source = await prisma.seasonRoster.findMany({
      where: { seasonId: body.fromSeasonId },
    });
    for (const r of source) {
      await prisma.seasonRoster.upsert({
        where: {
          seasonId_playerId: {
            seasonId: body.toSeasonId,
            playerId: r.playerId,
          },
        },
        create: {
          seasonId: body.toSeasonId,
          playerId: r.playerId,
          teamId: r.teamId,
          number: r.number,
          isCaptain: r.isCaptain,
        },
        update: {
          teamId: r.teamId,
          number: r.number,
          isCaptain: r.isCaptain,
        },
      });
    }
    return { copied: source.length };
  });

  // ── Matches ──
  app.get("/api/admin/seasons/:seasonId/matches", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const matches = await prisma.match.findMany({
      where: { seasonId },
      include: teamInclude,
      orderBy: [{ round: "asc" }, { date: "asc" }],
    });
    return matches.map(mapMatch);
  });

  app.post("/api/admin/matches", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const body = z
      .object({
        seasonId: z.string().uuid(),
        round: z.number().int(),
        date: z.string(),
        homeTeamId: z.string().uuid(),
        awayTeamId: z.string().uuid(),
        venue: z.string().optional(),
        youtubeUrl: z.string().nullable().optional(),
        status: z.nativeEnum(MatchStatus).optional(),
        phase: z.nativeEnum(MatchPhase).optional(),
        groupName: z.string().nullable().optional(),
        knockoutLabel: z.string().nullable().optional(),
        leg: z.number().int().min(1).max(2).optional(),
        isWalkover: z.boolean().optional(),
        awardedToTeamId: z.string().uuid().nullable().optional(),
        homeScore: z.number().int().nullable().optional(),
        awayScore: z.number().int().nullable().optional(),
      })
      .parse(request.body);
    const match = await prisma.match.create({
      data: {
        seasonId: body.seasonId,
        round: body.round,
        date: new Date(body.date),
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        venue: body.venue ?? "",
        youtubeUrl: body.youtubeUrl ?? null,
        status: body.status ?? "scheduled",
        phase: body.phase ?? "league",
        groupName: body.groupName ?? null,
        knockoutLabel: body.knockoutLabel ?? null,
        leg: body.leg ?? 1,
        isWalkover: body.isWalkover ?? false,
        awardedToTeamId: body.awardedToTeamId ?? null,
        homeScore: body.homeScore ?? null,
        awayScore: body.awayScore ?? null,
      },
      include: teamInclude,
    });
    await prisma.matchTimer.create({
      data: { matchId: match.id },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "match",
      entityId: match.id,
      description: `Criou partida R${match.round}`,
    });
    return mapMatch(match);
  });

  app.patch("/api/admin/matches/:id", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        round: z.number().int().optional(),
        date: z.string().optional(),
        homeTeamId: z.string().uuid().optional(),
        awayTeamId: z.string().uuid().optional(),
        homeScore: z.number().int().nullable().optional(),
        awayScore: z.number().int().nullable().optional(),
        status: z.nativeEnum(MatchStatus).optional(),
        phase: z.nativeEnum(MatchPhase).optional(),
        groupName: z.string().nullable().optional(),
        knockoutLabel: z.string().nullable().optional(),
        leg: z.number().int().min(1).max(2).optional(),
        isWalkover: z.boolean().optional(),
        awardedToTeamId: z.string().uuid().nullable().optional(),
        venue: z.string().optional(),
        youtubeUrl: z.string().nullable().optional(),
        homeFormation: z.string().nullable().optional(),
        awayFormation: z.string().nullable().optional(),
        firstHalfDuration: z.number().int().nullable().optional(),
        secondHalfDuration: z.number().int().nullable().optional(),
      })
      .parse(request.body);

    if (body.status === "lineups_set") {
      const existing = await prisma.match.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: "Partida não encontrada" });
      }
      const lineups = await prisma.matchLineup.findMany({
        where: { matchId: id, status: "starter" },
        select: { teamId: true },
      });
      const homeOk = lineups.some((l) => l.teamId === existing.homeTeamId);
      const awayOk = lineups.some((l) => l.teamId === existing.awayTeamId);
      if (!homeOk || !awayOk) {
        return reply.code(400).send({
          error:
            "Salve a escalação com titulares dos dois times antes de liberar",
        });
      }
    }

    // W.O.: marca awarded + placar 3x0 padrão se não informado
    let patch = { ...body, date: body.date ? new Date(body.date) : undefined };
    if (body.isWalkover && body.awardedToTeamId) {
      const existing = await prisma.match.findUnique({ where: { id } });
      const winner = body.awardedToTeamId;
      const home = body.homeTeamId ?? existing?.homeTeamId;
      const away = body.awayTeamId ?? existing?.awayTeamId;
      patch = {
        ...patch,
        status: "awarded",
        homeScore:
          body.homeScore ??
          (winner === home ? 3 : 0),
        awayScore:
          body.awayScore ??
          (winner === away ? 3 : 0),
      };
    }

    const match = await prisma.match.update({
      where: { id },
      data: patch,
      include: teamInclude,
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "match",
      entityId: id,
      description: "Atualizou partida",
      details: body,
    });
    if (body.status) liveBus.publish(id, "match_status", { status: body.status });
    if (body.homeScore !== undefined || body.awayScore !== undefined) {
      liveBus.publish(id, "match_score", {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      });
    }
    return mapMatch(match);
  });

  app.delete("/api/admin/matches/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.match.delete({ where: { id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "match",
      entityId: id,
      description: "Removeu partida",
    });
    return { ok: true };
  });

  app.post("/api/admin/matches/:id/postpone", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        reason: z.string().trim().min(3).max(500),
      })
      .parse(request.body);

    const existing = await prisma.match.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ error: "Partida não encontrada" });
    }
    if (existing.status !== "scheduled" && existing.status !== "lineups_set") {
      return reply.code(400).send({
        error: "Só dá para adiar uma partida que ainda não começou.",
      });
    }

    const match = await prisma.match.update({
      where: { id },
      data: { status: "postponed" },
      include: teamInclude,
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "match",
      entityId: id,
      description: `Adiou a partida da rodada ${match.round}: ${body.reason}`,
      details: { status: "postponed", reason: body.reason },
    });
    liveBus.publish(id, "match_status", { status: "postponed" });
    return mapMatch(match);
  });

  // ── Lineups / officials / ratings (admin) ──
  app.get("/api/admin/matches/:id/suspensions", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return getSuspensionsForMatch(id);
  });

  app.put("/api/admin/matches/:id/lineups", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        teamId: z.string().uuid(),
        entries: z.array(
          z.object({
            playerId: z.string().uuid(),
            shirtNumber: z.number().int(),
            status: z.nativeEnum(LineupStatus),
            positionIndex: z.number().int().nullable().optional(),
          }),
        ),
        formation: z.string().nullable().optional(),
        /** Admin pode forçar inclusão de suspenso (auditoria). */
        allowSuspended: z.boolean().optional(),
      })
      .parse(request.body);

    if (!body.allowSuspended) {
      const check = await assertLineupNotSuspended(
        id,
        body.entries.map((e) => e.playerId),
      );
      if (!check.ok) {
        return reply.code(409).send({
          error: "Jogador(es) suspenso(s) na escalação",
          suspended: check.suspended,
        });
      }
    }

    const matchRow = await prisma.match.findUnique({ where: { id } });
    if (!matchRow) {
      return reply.code(404).send({ error: "Partida não encontrada" });
    }
    if (
      body.teamId !== matchRow.homeTeamId &&
      body.teamId !== matchRow.awayTeamId
    ) {
      return reply.code(400).send({ error: "Time não pertence à partida" });
    }

    await prisma.matchLineup.deleteMany({
      where: { matchId: id, teamId: body.teamId },
    });
    await prisma.matchLineup.createMany({
      data: body.entries.map((e) => ({
        matchId: id,
        teamId: body.teamId,
        playerId: e.playerId,
        shirtNumber: e.shirtNumber,
        status: e.status,
        positionIndex: e.positionIndex ?? null,
      })),
    });

    if (body.formation !== undefined) {
      const isHome = body.teamId === matchRow.homeTeamId;
      await prisma.match.update({
        where: { id },
        data: isHome
          ? { homeFormation: body.formation }
          : { awayFormation: body.formation },
      });
    }

    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "match_lineup",
      entityId: id,
      description: "Atualizou escalação",
      details: {
        teamId: body.teamId,
        count: body.entries.length,
        formation: body.formation ?? null,
      },
    });
    liveBus.publish(id, "lineup", { teamId: body.teamId });
    return { ok: true };
  });

  app.put("/api/admin/matches/:id/officials", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        officials: z.array(
          z.object({
            role: z.nativeEnum(OfficialRole),
            name: z.string(),
          }),
        ),
      })
      .parse(request.body);
    await prisma.matchOfficial.deleteMany({ where: { matchId: id } });
    await prisma.matchOfficial.createMany({
      data: body.officials.map((o) => ({
        matchId: id,
        role: o.role,
        name: o.name,
      })),
    });
    return { ok: true };
  });

  app.delete("/api/admin/matches/:id/ratings", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.matchPlayerRating.deleteMany({ where: { matchId: id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "match_player_ratings",
      entityId: id,
      description: "Removeu ratings",
    });
    return { ok: true };
  });

  app.put("/api/admin/matches/:id/ratings", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        ratings: z.array(
          z.object({
            teamId: z.string().uuid(),
            playerId: z.string().uuid(),
            rating: z.number(),
            calculatedRating: z.number(),
          }),
        ),
      })
      .parse(request.body);

    for (const r of body.ratings) {
      await prisma.matchPlayerRating.upsert({
        where: {
          matchId_playerId: { matchId: id, playerId: r.playerId },
        },
        create: {
          matchId: id,
          teamId: r.teamId,
          playerId: r.playerId,
          rating: r.rating,
          calculatedRating: r.calculatedRating,
        },
        update: {
          rating: r.rating,
          calculatedRating: r.calculatedRating,
          teamId: r.teamId,
        },
      });
    }
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "match_player_ratings",
      entityId: id,
      description: "Atualizou ratings",
    });
    return { ok: true };
  });


  app.patch("/api/admin/ratings/:id", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ rating: z.number() }).parse(request.body);
    const row = await prisma.matchPlayerRating.update({
      where: { id },
      data: { rating: body.rating },
    });
    return row;
  });

  // ── Events CRUD (admin also uses live routes) ──
  app.post("/api/admin/matches/:id/events", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        type: z.nativeEnum(MatchEventType),
        elapsedSeconds: z.number().int(),
        teamId: z.string().uuid().nullable().optional(),
        playerId: z.string().uuid().nullable().optional(),
        assistPlayerId: z.string().uuid().nullable().optional(),
        playerInId: z.string().uuid().nullable().optional(),
        description: z.string().nullable().optional(),
        youtubeTimestampSeconds: z.number().int().nullable().optional(),
      })
      .parse(request.body);
    const event = await prisma.matchEvent.create({
      data: {
        matchId: id,
        type: body.type,
        elapsedSeconds: body.elapsedSeconds,
        teamId: body.teamId ?? null,
        playerId: body.playerId ?? null,
        assistPlayerId: body.assistPlayerId ?? null,
        playerInId: body.playerInId ?? null,
        description: body.description ?? null,
        youtubeTimestampSeconds: body.youtubeTimestampSeconds ?? null,
      },
      include: { player: true, assistPlayer: true, playerIn: true },
    });
    liveBus.publish(id, "event", event);
    return event;
  });

  app.patch("/api/admin/events/:eventId", async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        type: z.nativeEnum(MatchEventType).optional(),
        elapsedSeconds: z.number().int().optional(),
        teamId: z.string().uuid().nullable().optional(),
        playerId: z.string().uuid().nullable().optional(),
        assistPlayerId: z.string().uuid().nullable().optional(),
        playerInId: z.string().uuid().nullable().optional(),
        description: z.string().nullable().optional(),
        youtubeTimestampSeconds: z.number().int().nullable().optional(),
      })
      .parse(request.body);
    const event = await prisma.matchEvent.update({
      where: { id: eventId },
      data: body,
      include: { player: true, assistPlayer: true, playerIn: true },
    });
    liveBus.publish(event.matchId, "event", event);
    return event;
  });

  app.delete("/api/admin/events/:eventId", async (request) => {
    const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
    const event = await prisma.matchEvent.delete({ where: { id: eventId } });
    liveBus.publish(event.matchId, "event_deleted", { id: eventId });
    return { ok: true };
  });

  // ── Users ──
  app.get("/api/admin/users", async (request) => {
    const raw = z
      .object({ all: z.enum(["1", "true"]).optional() })
      .parse(request.query ?? {});
    const { page, pageSize, q } = parsePagination(request.query);
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : undefined;
    const include = {
      players: { select: { id: true, nickname: true, name: true } },
      memberships: {
        include: {
          competition: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
      },
    } as const;

    function mapUser(u: {
      id: string;
      email: string;
      role: string;
      displayName: string | null;
      players: Array<{ id: string; nickname: string; name: string }>;
      memberships: Array<{
        id: string;
        role: string;
        competitionId: string;
        teamId: string | null;
        competition: { id: string; name: string };
        team: { id: string; name: string } | null;
      }>;
    }) {
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        displayName: u.displayName,
        player: u.players[0]
          ? {
              id: u.players[0].id,
              nickname: u.players[0].nickname,
              name: u.players[0].name,
            }
          : null,
        memberships: u.memberships.map((m) => ({
          id: m.id,
          role: m.role,
          competitionId: m.competitionId,
          competitionName: m.competition.name,
          teamId: m.teamId,
          teamName: m.team?.name ?? null,
        })),
      };
    }

    if (raw.all) {
      const users = await prisma.user.findMany({
        where,
        orderBy: { email: "asc" },
        include,
      });
      return users.map(mapUser);
    }
    const { skip, take } = skipTake(page, pageSize);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { email: "asc" },
        skip,
        take,
        include,
      }),
      prisma.user.count({ where }),
    ]);
    return paginatedResult(users.map(mapUser), total, page, pageSize);
  });

  app.patch("/api/admin/users/:id", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        role: z.nativeEnum(UserRole).optional(),
        displayName: z.string().nullable().optional(),
        password: z.string().min(6).optional(),
      })
      .parse(request.body);
    const data: {
      role?: UserRole;
      displayName?: string | null;
      passwordHash?: string;
    } = {
      role: body.role,
      displayName: body.displayName,
    };
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    return prisma.user.update({ where: { id }, data });
  });

  app.post("/api/admin/users", async (request) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        role: z.nativeEnum(UserRole).default("user"),
        displayName: z.string().optional(),
      })
      .parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    return prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        displayName: body.displayName ?? null,
      },
    });
  });


  app.delete("/api/admin/users/:id", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    if (id === admin.id) {
      return reply.code(400).send({ error: "Não é possível excluir a si mesmo" });
    }
    await prisma.$transaction([
      prisma.matchHighlight.deleteMany({ where: { givenByUserId: id } }),
      prisma.adminAuditLog.deleteMany({ where: { userId: id } }),
      prisma.userMembership.deleteMany({ where: { userId: id } }),
      prisma.player.updateMany({
        where: { userId: id },
        data: { userId: null },
      }),
      prisma.user.delete({ where: { id } }),
    ]);
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "user",
      entityId: id,
      description: "Removeu usuário",
    });
    return { ok: true };
  });

  // ── Audit ──
  app.get("/api/admin/audit", async (request) => {
    const { page, pageSize, q } = parsePagination(request.query);
    const action = z
      .object({ action: z.string().optional() })
      .parse(request.query).action;
    const where = {
      AND: [
        q
          ? {
              OR: [
                { description: { contains: q, mode: "insensitive" as const } },
                { userEmail: { contains: q, mode: "insensitive" as const } },
                { entityType: { contains: q, mode: "insensitive" as const } },
                { action: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {},
        action ? { action } : {},
      ],
    };
    const { skip, take } = skipTake(page, pageSize);
    const [entries, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);
    return paginatedResult(
      entries.map((e) => ({
        id: e.id,
        userEmail: e.userEmail,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        description: e.description,
        details: e.details,
        createdAt: e.createdAt,
      })),
      total,
      page,
      pageSize,
    );
  });

  // ── Cards report helper (season events) ──
  app.get("/api/admin/seasons/:seasonId/cards", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const events = await prisma.matchEvent.findMany({
      where: {
        match: { seasonId },
        type: { in: ["yellow_card", "red_card"] },
      },
      include: {
        player: true,
        team: true,
        match: { include: teamInclude },
      },
      orderBy: { createdAt: "desc" },
    });
    return events;
  });

  app.get("/api/admin/seasons/:seasonId/card-resets", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    return prisma.cardReset.findMany({
      where: { seasonId },
      orderBy: { createdAt: "desc" },
      include: {
        player: { select: { id: true, name: true, nickname: true } },
      },
    });
  });

  app.post("/api/admin/seasons/:seasonId/card-resets", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        playerId: z.string().uuid(),
        yellowCleared: z.number().int().min(0).optional(),
        redCleared: z.number().int().min(0).optional(),
        reason: z.string().optional(),
      })
      .parse(request.body);
    const row = await prisma.cardReset.create({
      data: {
        seasonId,
        playerId: body.playerId,
        yellowCleared: body.yellowCleared ?? 0,
        redCleared: body.redCleared ?? 0,
        reason: body.reason ?? "Cumpriu suspensão / zera acumulação",
      },
    });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "card_reset",
      entityId: row.id,
      description: "Registrou reset de cartões",
      details: body,
    });
    return row;
  });

  app.delete("/api/admin/card-resets/:id", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    await prisma.cardReset.delete({ where: { id } });
    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "delete",
      entityType: "card_reset",
      entityId: id,
      description: "Desfez reset de cartões",
    });
    return { ok: true };
  });

  /** Gera tabela de confrontos (pontos corridos ou 1ª rodada de mata-mata). */
  app.post("/api/admin/seasons/:seasonId/generate-fixtures", async (request, reply) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } }).adminUser;
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        teamIds: z.array(z.string().uuid()).min(2),
        double: z.boolean().optional(),
        startDate: z.string().optional(),
        venue: z.string().optional(),
        groupName: z.string().nullable().optional(),
        replaceScheduled: z.boolean().optional(),
      })
      .parse(request.body);

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { competition: true },
    });
    if (!season) return reply.code(404).send({ error: "Temporada não encontrada" });

    const rules = resolveCompetitionRules(season.competition, season);
    const start = body.startDate ? new Date(body.startDate) : new Date();

    if (body.replaceScheduled) {
      await prisma.match.deleteMany({
        where: { seasonId, status: "scheduled" },
      });
    }

    const createdIds: string[] = [];

    if (rules.format === "knockout") {
      const bracket = generateKnockoutBracket(body.teamIds);
      // Só cria a 1ª rodada com times reais; demais ficam TBD depois
      const first = bracket[0];
      if (!first) return { created: 0, matchIds: [] };
      let i = 0;
      for (const f of first.fixtures) {
        if (!f.homeTeamId || !f.awayTeamId) continue; // bye
        const date = new Date(start.getTime() + i * 7 * 24 * 3600 * 1000);
        const m = await prisma.match.create({
          data: {
            seasonId,
            round: first.round,
            date,
            homeTeamId: f.homeTeamId,
            awayTeamId: f.awayTeamId,
            venue: body.venue ?? "",
            phase: "knockout",
            knockoutLabel: first.knockoutLabel,
            status: "scheduled",
          },
        });
        await prisma.matchTimer.create({ data: { matchId: m.id } });
        createdIds.push(m.id);
        i += 1;
      }
    } else {
      const rounds = generateRoundRobin(body.teamIds, { double: body.double });
      const phase = rules.format === "groups_knockout" ? "group" : "league";
      let i = 0;
      for (const round of rounds) {
        for (const f of round.fixtures) {
          const date = new Date(start.getTime() + (round.round - 1) * 7 * 24 * 3600 * 1000);
          const m = await prisma.match.create({
            data: {
              seasonId,
              round: round.round,
              date,
              homeTeamId: f.homeTeamId,
              awayTeamId: f.awayTeamId,
              venue: body.venue ?? "",
              phase,
              groupName: body.groupName ?? null,
              status: "scheduled",
            },
          });
          await prisma.matchTimer.create({ data: { matchId: m.id } });
          createdIds.push(m.id);
          i += 1;
        }
      }
      void i;
    }

    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "create",
      entityType: "match",
      entityId: seasonId,
      description: `Gerou ${createdIds.length} partidas (${rules.format})`,
    });
    return { created: createdIds.length, matchIds: createdIds };
  });

  // Penalties
  app.put("/api/admin/matches/:id/penalties", async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        kicks: z.array(
          z.object({
            teamId: z.string().uuid(),
            playerId: z.string().uuid(),
            scored: z.boolean(),
            shootOrder: z.number().int(),
          }),
        ),
      })
      .parse(request.body);
    await prisma.penaltyShootout.deleteMany({ where: { matchId: id } });
    await prisma.penaltyShootout.createMany({
      data: body.kicks.map((k) => ({
        matchId: id,
        teamId: k.teamId,
        playerId: k.playerId,
        scored: k.scored,
        shootOrder: k.shootOrder,
      })),
    });
    liveBus.publish(id, "shootout", { count: body.kicks.length });
    return { ok: true };
  });

  // ── Configurações do sistema ──
  app.get("/api/admin/settings", async () => getSystemSettings());

  app.put("/api/admin/settings", async (request) => {
    const admin = (request as unknown as { adminUser: { id: string; email: string } })
      .adminUser;
    const body = z
      .object({
        siteName: z.string().min(1).max(80).optional(),
        tagline: z.string().min(1).max(160).optional(),
        description: z.string().max(500).nullable().optional(),
        logoUrl: z.string().max(500).nullable().optional(),
        supportEmail: z.string().max(120).nullable().optional(),
        footerText: z.string().max(200).nullable().optional(),
        masterLabel: z.string().min(1).max(40).optional(),
        sponsors: z
          .array(
            z.object({
              id: z.string().min(1).max(80),
              name: z.string().min(1).max(80),
              imageUrl: z.string().min(1).max(500),
              linkUrl: z.string().max(500).nullable(),
            }),
          )
          .max(24)
          .optional(),
      })
      .parse(request.body);

    const logoUrl =
      body.logoUrl === undefined
        ? undefined
        : body.logoUrl?.trim()
          ? body.logoUrl.trim()
          : null;
    const supportEmail =
      body.supportEmail === undefined
        ? undefined
        : body.supportEmail?.trim()
          ? body.supportEmail.trim()
          : null;

    const result = await updateSystemSettings({
      siteName: body.siteName,
      tagline: body.tagline,
      description: body.description,
      logoUrl,
      supportEmail,
      footerText: body.footerText,
      masterLabel: body.masterLabel,
      sponsors: body.sponsors,
    });

    await writeAudit({
      userId: admin.id,
      userEmail: admin.email,
      action: "update",
      entityType: "system_settings",
      entityId: "default",
      description: "Atualizou configurações do sistema",
      details: body,
    });
    return result;
  });
}
