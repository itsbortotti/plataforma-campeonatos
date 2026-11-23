import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../core/prisma.js";
import {
  mapEvent,
  mapMatch,
  mapOfficial,
  mapPenalty,
  mapPlayer,
  mapTeam,
} from "../services/mappers.js";
import { computePlayerStats, computeStandings } from "../services/standings.js";
import { getSystemSettings } from "../services/system-settings.js";

const teamInclude = { homeTeam: true, awayTeam: true } as const;

export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/seasons", async (request) => {
    const q = z
      .object({ competitionId: z.string().uuid().optional() })
      .parse(request.query ?? {});
    const seasons = await prisma.season.findMany({
      where: q.competitionId ? { competitionId: q.competitionId } : undefined,
      orderBy: [{ year: "desc" }, { name: "asc" }],
      include: {
        competition: { select: { id: true, name: true, slug: true } },
        _count: { select: { matches: true } },
      },
    });
    return seasons.map((s) => ({
      id: s.id,
      competitionId: s.competitionId,
      competitionName: s.competition.name,
      competitionSlug: s.competition.slug,
      name: s.name,
      year: s.year,
      isCurrent: s.isCurrent,
      championTeamId: s.championTeamId,
      decidedByPenalties: s.decidedByPenalties,
      matchCount: s._count.matches,
    }));
  });

  app.get("/api/seasons/current", async (request, reply) => {
    const q = z
      .object({
        competitionId: z.string().uuid().optional(),
        competitionSlug: z.string().optional(),
      })
      .parse(request.query ?? {});
    let competitionId = q.competitionId;
    if (!competitionId && q.competitionSlug) {
      const c = await prisma.competition.findUnique({
        where: { slug: q.competitionSlug },
      });
      competitionId = c?.id;
    }
    const season = await prisma.season.findFirst({
      where: {
        isCurrent: true,
        ...(competitionId ? { competitionId } : {}),
      },
      orderBy: { year: "desc" },
    });
    if (!season) return reply.code(404).send({ error: "Sem temporada atual" });
    const competition = await prisma.competition.findUnique({
      where: { id: season.competitionId },
      select: { name: true, slug: true, format: true },
    });
    const matchCount = await prisma.match.count({ where: { seasonId: season.id } });
    return {
      id: season.id,
      competitionId: season.competitionId,
      competitionName: competition?.name,
      competitionSlug: competition?.slug,
      format: season.format ?? competition?.format ?? "league",
      name: season.name,
      year: season.year,
      isCurrent: season.isCurrent,
      championTeamId: season.championTeamId,
      decidedByPenalties: season.decidedByPenalties,
      matchCount,
    };
  });

  app.get("/api/teams", async () => {
    const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });
    return teams.map(mapTeam);
  });

  app.get("/api/seasons/:seasonId/standings", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    return computeStandings(seasonId);
  });

  app.get("/api/seasons/:seasonId/player-stats", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    return computePlayerStats(seasonId);
  });

  app.get("/api/seasons/:seasonId/matches", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const matches = await prisma.match.findMany({
      where: { seasonId },
      include: teamInclude,
      orderBy: [{ round: "asc" }, { date: "asc" }],
    });
    return matches.map(mapMatch);
  });

  /** Partidas ao vivo / intervalo (+ agenda do dia) para faixa estilo GE. */
  app.get("/api/matches/live", async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const matches = await prisma.match.findMany({
      where: {
        season: { competition: { isActive: true } },
        OR: [
          { status: { in: ["live", "halftime"] } },
          {
            status: { in: ["scheduled", "lineups_set"] },
            date: { gte: start, lt: end },
          },
        ],
      },
      include: {
        ...teamInclude,
        timer: true,
        season: {
          include: {
            competition: {
              select: { id: true, slug: true, name: true, logoUrl: true },
            },
          },
        },
        events: {
          where: {
            type: {
              in: [
                "goal",
                "penalty_goal",
                "own_goal",
                "red_card",
                "yellow_card",
              ],
            },
          },
          include: { player: true },
          orderBy: { elapsedSeconds: "desc" },
          take: 8,
        },
      },
      orderBy: [{ date: "asc" }, { round: "asc" }],
    });

    const statusRank: Record<string, number> = {
      live: 0,
      halftime: 1,
      lineups_set: 2,
      scheduled: 3,
    };

    return matches
      .map((m) => ({
        ...mapMatch(m),
        competition: {
          id: m.season.competition.id,
          slug: m.season.competition.slug,
          name: m.season.competition.name,
          logoUrl: m.season.competition.logoUrl,
        },
        seasonName: m.season.name,
        timer: m.timer
          ? {
              elapsedSeconds: m.timer.elapsedSeconds,
              isRunning: m.timer.isRunning,
              halfStartedAt: m.timer.halfStartedAt?.toISOString() ?? null,
              currentHalf: m.timer.currentHalf,
            }
          : null,
        recentEvents: m.events.map((e) => ({
          id: e.id,
          type: e.type,
          elapsedSeconds: e.elapsedSeconds,
          teamId: e.teamId,
          playerNickname: e.player?.nickname ?? null,
        })),
      }))
      .sort(
        (a, b) =>
          (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
          a.date.localeCompare(b.date),
      );
  });

  /** Últimas partidas encerradas de todos os campeonatos ativos. */
  app.get("/api/matches/recent", async (request) => {
    const q = z
      .object({ limit: z.coerce.number().int().min(1).max(48).optional() })
      .parse(request.query ?? {});
    const limit = q.limit ?? 12;
    const matches = await prisma.match.findMany({
      where: {
        status: "finished",
        season: { competition: { isActive: true } },
      },
      include: {
        ...teamInclude,
        season: {
          include: {
            competition: {
              select: { id: true, slug: true, name: true, logoUrl: true },
            },
          },
        },
      },
      orderBy: [{ date: "desc" }, { round: "desc" }],
      take: limit,
    });
    return matches.map((m) => ({
      ...mapMatch(m),
      competition: {
        id: m.season.competition.id,
        slug: m.season.competition.slug,
        name: m.season.competition.name,
        logoUrl: m.season.competition.logoUrl,
      },
      seasonName: m.season.name,
    }));
  });

  app.get("/api/seasons/:seasonId/rosters", async (request) => {
    const { seasonId } = z.object({ seasonId: z.string().uuid() }).parse(request.params);
    const rosters = await prisma.seasonRoster.findMany({
      where: { seasonId },
      include: { player: true, team: true },
      orderBy: { number: "asc" },
    });

    const byTeam = new Map<
      string,
      {
        teamId: string;
        team: ReturnType<typeof mapTeam> | null;
        players: Array<ReturnType<typeof mapPlayer> & { number: number | null; captain: boolean; avulso: boolean }>;
      }
    >();

    for (const r of rosters) {
      const key = r.teamId ?? "avulso";
      if (!byTeam.has(key)) {
        byTeam.set(key, {
          teamId: r.teamId ?? "",
          team: r.team ? mapTeam(r.team) : null,
          players: [],
        });
      }
      byTeam.get(key)!.players.push({
        ...mapPlayer(r.player),
        number: r.number,
        captain: r.isCaptain,
        avulso: !r.teamId,
      });
    }
    return [...byTeam.values()];
  });

  app.get("/api/matches/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const match = await prisma.match.findUnique({
      where: { id },
      include: teamInclude,
    });
    if (!match) return reply.code(404).send({ error: "Partida não encontrada" });

    const [events, lineups, officials, timer, penalties, ratings, highlights] =
      await Promise.all([
        prisma.matchEvent.findMany({
          where: { matchId: id },
          include: { player: true, assistPlayer: true, playerIn: true },
          orderBy: { elapsedSeconds: "asc" },
        }),
        prisma.matchLineup.findMany({
          where: { matchId: id },
          include: { player: true },
          orderBy: [{ status: "asc" }, { shirtNumber: "asc" }],
        }),
        prisma.matchOfficial.findMany({ where: { matchId: id } }),
        prisma.matchTimer.findUnique({ where: { matchId: id } }),
        prisma.penaltyShootout.findMany({
          where: { matchId: id },
          include: { player: true },
          orderBy: { shootOrder: "asc" },
        }),
        prisma.matchPlayerRating.findMany({ where: { matchId: id } }),
        prisma.matchHighlight.findMany({
          where: { matchId: id },
          include: { player: true },
        }),
      ]);

    return {
      match: mapMatch(match),
      events: events.map(mapEvent),
      lineups: lineups.map((l) => ({
        id: l.id,
        matchId: l.matchId,
        teamId: l.teamId,
        playerId: l.playerId,
        shirtNumber: l.shirtNumber,
        status: l.status,
        positionIndex: l.positionIndex,
        player: mapPlayer(l.player),
      })),
      officials: officials.map(mapOfficial),
      timer: timer
        ? {
            elapsedSeconds: timer.elapsedSeconds,
            isRunning: timer.isRunning,
            halfStartedAt: timer.halfStartedAt?.toISOString() ?? null,
            currentHalf: timer.currentHalf,
          }
        : null,
      penalties: penalties.map(mapPenalty),
      ratings,
      highlights: highlights.map((h) => ({
        id: h.id,
        matchId: h.matchId,
        teamId: h.teamId,
        playerId: h.playerId,
        slot: h.slot,
        givenByTeamId: h.givenByTeamId,
        player: h.player ? mapPlayer(h.player) : null,
      })),
    };
  });

  app.get("/api/players/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) return reply.code(404).send({ error: "Jogador não encontrado" });

    const rosters = await prisma.seasonRoster.findMany({
      where: { playerId: id },
      include: { team: true, season: true },
      orderBy: { createdAt: "desc" },
    });

    const events = await prisma.matchEvent.findMany({
      where: {
        OR: [{ playerId: id }, { assistPlayerId: id }],
        type: { in: ["goal", "own_goal", "penalty_goal", "yellow_card", "red_card"] },
      },
      include: { match: { include: teamInclude } },
      orderBy: { createdAt: "desc" },
    });

    return {
      player: mapPlayer(player),
      rosters: rosters.map((r) => ({
        seasonId: r.seasonId,
        seasonName: r.season.name,
        team: r.team ? mapTeam(r.team) : null,
        number: r.number,
        isCaptain: r.isCaptain,
      })),
      events: events.map((e) => ({
        ...mapEvent({ ...e, player: player, assistPlayer: null, playerIn: null }),
        match: mapMatch(e.match),
      })),
    };
  });

  app.get("/api/players", async (request) => {
    const q = z
      .object({ active: z.enum(["true", "false"]).optional() })
      .parse(request.query);
    const players = await prisma.player.findMany({
      where: q.active === "false" ? undefined : { isActive: true },
      orderBy: { nickname: "asc" },
    });
    return players.map(mapPlayer);
  });

  app.get("/api/settings", async () => getSystemSettings());
}
