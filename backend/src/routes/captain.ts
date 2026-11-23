import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HighlightSlot, LineupStatus } from "@prisma/client";
import { requireUser } from "../core/auth.js";
import { prisma } from "../core/prisma.js";
import { getCaptainInfo } from "../services/captain.js";
import { liveBus } from "../services/live-bus.js";
import { mapMatch, mapPlayer, mapTeam } from "../services/mappers.js";

export async function captainRoutes(app: FastifyInstance) {
  app.get("/api/captain/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const info = await getCaptainInfo(user.id);
    if (!info) return reply.code(403).send({ error: "Não é capitão" });
    return info;
  });

  app.get("/api/captain/dashboard", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const info = await getCaptainInfo(user.id);
    if (!info) return reply.code(403).send({ error: "Não é capitão" });

    const [team, roster, matches] = await Promise.all([
      prisma.team.findUnique({ where: { id: info.teamId } }),
      prisma.seasonRoster.findMany({
        where: { seasonId: info.seasonId, teamId: info.teamId },
        include: { player: true },
        orderBy: { number: "asc" },
      }),
      prisma.match.findMany({
        where: {
          seasonId: info.seasonId,
          OR: [{ homeTeamId: info.teamId }, { awayTeamId: info.teamId }],
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ round: "asc" }, { date: "asc" }],
      }),
    ]);

    return {
      info,
      team: team ? mapTeam(team) : null,
      roster: roster.map((r) => ({
        ...mapPlayer(r.player),
        number: r.number,
        captain: r.isCaptain,
      })),
      matches: matches.map(mapMatch),
    };
  });

  app.put("/api/captain/matches/:id/lineup", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const info = await getCaptainInfo(user.id);
    if (!info) return reply.code(403).send({ error: "Não é capitão" });

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match || match.seasonId !== info.seasonId) {
      return reply.code(404).send({ error: "Partida inválida" });
    }
    if (match.homeTeamId !== info.teamId && match.awayTeamId !== info.teamId) {
      return reply.code(403).send({ error: "Partida de outro time" });
    }

    const body = z
      .object({
        entries: z.array(
          z.object({
            playerId: z.string().uuid(),
            shirtNumber: z.number().int(),
            status: z.nativeEnum(LineupStatus),
            positionIndex: z.number().int().nullable().optional(),
          }),
        ),
        formation: z.string().nullable().optional(),
      })
      .parse(request.body);

    if (
      match.status !== "scheduled" &&
      match.status !== "lineups_set"
    ) {
      return reply.code(409).send({
        error: "Escalação só pode ser alterada antes do jogo começar",
      });
    }

    const { assertLineupNotSuspended } = await import("../services/suspensions.js");
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

    await prisma.matchLineup.deleteMany({
      where: { matchId: id, teamId: info.teamId },
    });
    await prisma.matchLineup.createMany({
      data: body.entries.map((e) => ({
        matchId: id,
        teamId: info.teamId,
        playerId: e.playerId,
        shirtNumber: e.shirtNumber,
        status: e.status,
        positionIndex: e.positionIndex ?? null,
      })),
    });

    if (body.formation !== undefined) {
      const isHome = match.homeTeamId === info.teamId;
      await prisma.match.update({
        where: { id },
        data: isHome
          ? { homeFormation: body.formation }
          : { awayFormation: body.formation },
      });
    }

    liveBus.publish(id, "lineup", { teamId: info.teamId });
    return { ok: true };
  });

  app.put("/api/captain/matches/:id/highlights", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const info = await getCaptainInfo(user.id);
    if (!info) return reply.code(403).send({ error: "Não é capitão" });

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        items: z.array(
          z.object({
            slot: z.nativeEnum(HighlightSlot),
            playerId: z.string().uuid(),
            teamId: z.string().uuid(),
          }),
        ),
      })
      .parse(request.body);

    await prisma.matchHighlight.deleteMany({
      where: { matchId: id, givenByTeamId: info.teamId },
    });

    for (const item of body.items) {
      await prisma.matchHighlight.create({
        data: {
          matchId: id,
          teamId: item.teamId,
          playerId: item.playerId,
          slot: item.slot,
          givenByTeamId: info.teamId,
          givenByUserId: user.id,
        },
      });
    }
    return { ok: true };
  });
}
