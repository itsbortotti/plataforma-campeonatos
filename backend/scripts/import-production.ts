/**
 * One-shot import from production Supabase (sfl-website-delta) into local Postgres.
 * Runtime stays agnostic — this file is not used by the API.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { PrismaClient, type Prisma } from "@prisma/client";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.import"));

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || "http://127.0.0.1:4006";
const UPLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "./data/uploads",
);

if (!SUPABASE_URL || !ANON) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY");
  process.exit(1);
}

const prisma = new PrismaClient();

async function fetchAll<T extends Record<string, unknown>>(
  table: string,
  key = ANON,
): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: T[] = [];
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc&limit=${pageSize}&offset=${from}`;
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table}: ${res.status} ${text}`);
    }
    const batch = (await res.json()) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function downloadPhoto(photoUrl: string, playerId: string): Promise<string | null> {
  if (!photoUrl.includes("supabase.co/storage")) return photoUrl;
  try {
    const res = await fetch(photoUrl);
    if (!res.ok || !res.body) return photoUrl;
    const dir = path.join(UPLOAD_DIR, "player-photos", playerId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filename = path.basename(new URL(photoUrl).pathname) || `${playerId}.jpg`;
    const dest = path.join(dir, filename);
    // @ts-expect-error web stream to node
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return `${PUBLIC_API_URL}/api/storage/player-photos/${playerId}/${filename}`;
  } catch (e) {
    console.warn("photo fail", playerId, e);
    return photoUrl;
  }
}

async function main() {
  console.log("Importing from", SUPABASE_URL);

  const teams = await fetchAll<Record<string, unknown>>("teams");
  console.log("teams", teams.length);
  for (const t of teams) {
    await prisma.team.upsert({
      where: { id: String(t.id) },
      create: {
        id: String(t.id),
        slug: String(t.slug),
        name: String(t.name),
        shortName: String(t.short_name),
        primaryColor: String(t.primary_color),
        secondaryColor: String(t.secondary_color),
        logoUrl: (t.logo_url as string) ?? null,
        createdAt: new Date(String(t.created_at)),
      },
      update: {
        slug: String(t.slug),
        name: String(t.name),
        shortName: String(t.short_name),
        primaryColor: String(t.primary_color),
        secondaryColor: String(t.secondary_color),
        logoUrl: (t.logo_url as string) ?? null,
      },
    });
  }

  const DEFAULT_COMPETITION_ID = "a0000000-0000-4000-8000-000000000001";
  await prisma.competition.upsert({
    where: { slug: "sfl" },
    create: {
      id: DEFAULT_COMPETITION_ID,
      slug: "sfl",
      name: "Super Football League",
      description: "Campeonato principal SFL",
      isActive: true,
    },
    update: { isActive: true },
  });

  const seasons = await fetchAll<Record<string, unknown>>("seasons");
  console.log("seasons", seasons.length);
  for (const s of seasons) {
    await prisma.season.upsert({
      where: { id: String(s.id) },
      create: {
        id: String(s.id),
        competitionId: DEFAULT_COMPETITION_ID,
        name: String(s.name),
        year: Number(s.year),
        isCurrent: Boolean(s.is_current),
        championTeamId: (s.champion_team_id as string) ?? null,
        decidedByPenalties: (s.decided_by_penalties as boolean) ?? null,
        createdAt: new Date(String(s.created_at)),
      },
      update: {
        competitionId: DEFAULT_COMPETITION_ID,
        name: String(s.name),
        year: Number(s.year),
        isCurrent: Boolean(s.is_current),
        championTeamId: (s.champion_team_id as string) ?? null,
        decidedByPenalties: (s.decided_by_penalties as boolean) ?? null,
      },
    });
  }

  const players = await fetchAll<Record<string, unknown>>("players");
  console.log("players", players.length);
  for (const p of players) {
    const id = String(p.id);
    let photoUrl = (p.photo_url as string) ?? null;
    if (photoUrl) photoUrl = await downloadPhoto(photoUrl, id);

    await prisma.player.upsert({
      where: { id },
      create: {
        id,
        name: String(p.name),
        nickname: String(p.nickname),
        position: p.position as never,
        photoUrl,
        email: (p.email as string) ?? null,
        isActive: p.is_active !== false,
        // drop supabase auth user ids — will re-link locally
        userId: null,
        createdAt: new Date(String(p.created_at)),
      },
      update: {
        name: String(p.name),
        nickname: String(p.nickname),
        position: p.position as never,
        photoUrl,
        email: (p.email as string) ?? null,
        isActive: p.is_active !== false,
      },
    });
  }

  const rosters = await fetchAll<Record<string, unknown>>("season_rosters");
  console.log("season_rosters", rosters.length);
  for (const r of rosters) {
    await prisma.seasonRoster.upsert({
      where: { id: String(r.id) },
      create: {
        id: String(r.id),
        seasonId: String(r.season_id),
        teamId: (r.team_id as string) ?? null,
        playerId: String(r.player_id),
        number: (r.number as number) ?? null,
        isCaptain: Boolean(r.is_captain),
        createdAt: new Date(String(r.created_at)),
      },
      update: {
        teamId: (r.team_id as string) ?? null,
        number: (r.number as number) ?? null,
        isCaptain: Boolean(r.is_captain),
      },
    });
  }

  const matches = await fetchAll<Record<string, unknown>>("matches");
  console.log("matches", matches.length);
  for (const m of matches) {
    await prisma.match.upsert({
      where: { id: String(m.id) },
      create: {
        id: String(m.id),
        seasonId: String(m.season_id),
        round: Number(m.round),
        date: new Date(String(m.date)),
        homeTeamId: String(m.home_team_id),
        awayTeamId: String(m.away_team_id),
        homeScore: (m.home_score as number) ?? null,
        awayScore: (m.away_score as number) ?? null,
        status: m.status as never,
        youtubeUrl: (m.youtube_url as string) ?? null,
        venue: String(m.venue ?? ""),
        homeFormation: (m.home_formation as string) ?? null,
        awayFormation: (m.away_formation as string) ?? null,
        firstHalfDuration: (m.first_half_duration as number) ?? null,
        secondHalfDuration: (m.second_half_duration as number) ?? null,
        createdAt: new Date(String(m.created_at)),
        updatedAt: new Date(String(m.updated_at)),
      },
      update: {
        round: Number(m.round),
        date: new Date(String(m.date)),
        homeTeamId: String(m.home_team_id),
        awayTeamId: String(m.away_team_id),
        homeScore: (m.home_score as number) ?? null,
        awayScore: (m.away_score as number) ?? null,
        status: m.status as never,
        youtubeUrl: (m.youtube_url as string) ?? null,
        venue: String(m.venue ?? ""),
        homeFormation: (m.home_formation as string) ?? null,
        awayFormation: (m.away_formation as string) ?? null,
        firstHalfDuration: (m.first_half_duration as number) ?? null,
        secondHalfDuration: (m.second_half_duration as number) ?? null,
      },
    });
  }

  // match_timer has match_id as PK — order by match_id
  {
    const url = `${SUPABASE_URL}/rest/v1/match_timer?select=*&order=match_id.asc`;
    const res = await fetch(url, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    const timers = (await res.json()) as Record<string, unknown>[];
    console.log("match_timer", timers.length);
    for (const t of timers) {
      await prisma.matchTimer.upsert({
        where: { matchId: String(t.match_id) },
        create: {
          matchId: String(t.match_id),
          currentHalf: (t.current_half as never) ?? "first",
          elapsedSeconds: Number(t.elapsed_seconds ?? 0),
          halfStartedAt: t.half_started_at
            ? new Date(String(t.half_started_at))
            : null,
          isRunning: Boolean(t.is_running),
        },
        update: {
          currentHalf: (t.current_half as never) ?? "first",
          elapsedSeconds: Number(t.elapsed_seconds ?? 0),
          halfStartedAt: t.half_started_at
            ? new Date(String(t.half_started_at))
            : null,
          isRunning: Boolean(t.is_running),
        },
      });
    }
  }

  const events = await fetchAll<Record<string, unknown>>("match_events");
  console.log("match_events", events.length);
  for (const e of events) {
    await prisma.matchEvent.upsert({
      where: { id: String(e.id) },
      create: {
        id: String(e.id),
        matchId: String(e.match_id),
        teamId: (e.team_id as string) ?? null,
        playerId: (e.player_id as string) ?? null,
        assistPlayerId: (e.assist_player_id as string) ?? null,
        playerInId: (e.player_in_id as string) ?? null,
        type: e.type as never,
        elapsedSeconds: Number(e.elapsed_seconds),
        description: (e.description as string) ?? null,
        youtubeTimestampSeconds: (e.youtube_timestamp_seconds as number) ?? null,
        createdAt: new Date(String(e.created_at)),
        updatedAt: new Date(String(e.updated_at)),
      },
      update: {
        teamId: (e.team_id as string) ?? null,
        playerId: (e.player_id as string) ?? null,
        assistPlayerId: (e.assist_player_id as string) ?? null,
        playerInId: (e.player_in_id as string) ?? null,
        type: e.type as never,
        elapsedSeconds: Number(e.elapsed_seconds),
        description: (e.description as string) ?? null,
        youtubeTimestampSeconds: (e.youtube_timestamp_seconds as number) ?? null,
      },
    });
  }

  const lineups = await fetchAll<Record<string, unknown>>("match_lineups");
  console.log("match_lineups", lineups.length);
  for (const l of lineups) {
    await prisma.matchLineup.upsert({
      where: { id: String(l.id) },
      create: {
        id: String(l.id),
        matchId: String(l.match_id),
        teamId: String(l.team_id),
        playerId: String(l.player_id),
        shirtNumber: Number(l.shirt_number),
        status: l.status as never,
        positionIndex: (l.position_index as number) ?? null,
        createdAt: new Date(String(l.created_at)),
      },
      update: {
        shirtNumber: Number(l.shirt_number),
        status: l.status as never,
        positionIndex: (l.position_index as number) ?? null,
      },
    });
  }

  const officials = await fetchAll<Record<string, unknown>>("match_officials");
  console.log("match_officials", officials.length);
  for (const o of officials) {
    await prisma.matchOfficial.upsert({
      where: { id: String(o.id) },
      create: {
        id: String(o.id),
        matchId: String(o.match_id),
        role: o.role as never,
        name: String(o.name),
      },
      update: {
        name: String(o.name),
        role: o.role as never,
      },
    });
  }

  const ratings = await fetchAll<Record<string, unknown>>("match_player_ratings");
  console.log("match_player_ratings", ratings.length);
  for (const r of ratings) {
    await prisma.matchPlayerRating.upsert({
      where: { id: String(r.id) },
      create: {
        id: String(r.id),
        matchId: String(r.match_id),
        teamId: String(r.team_id),
        playerId: String(r.player_id),
        rating: Number(r.rating),
        calculatedRating: Number(r.calculated_rating),
        createdAt: new Date(String(r.created_at)),
        updatedAt: new Date(String(r.updated_at)),
      },
      update: {
        rating: Number(r.rating),
        calculatedRating: Number(r.calculated_rating),
      },
    });
  }

  const highlights = await fetchAll<Record<string, unknown>>("match_highlights");
  console.log("match_highlights", highlights.length);
  // highlights need given_by_user_id in users — create placeholder users
  for (const h of highlights) {
    const giverId = String(h.given_by_user_id);
    await prisma.user.upsert({
      where: { id: giverId },
      create: {
        id: giverId,
        email: `import-${giverId.slice(0, 8)}@sfl.import`,
        role: "user",
        displayName: "Importado",
      },
      update: {},
    });
    await prisma.matchHighlight.upsert({
      where: { id: String(h.id) },
      create: {
        id: String(h.id),
        matchId: String(h.match_id),
        teamId: String(h.team_id),
        playerId: String(h.player_id),
        slot: h.slot as never,
        givenByTeamId: String(h.given_by_team_id),
        givenByUserId: giverId,
        createdAt: new Date(String(h.created_at)),
        updatedAt: new Date(String(h.updated_at)),
      },
      update: {
        playerId: String(h.player_id),
        slot: h.slot as never,
      },
    });
  }

  const penalties = await fetchAll<Record<string, unknown>>("penalty_shootout");
  console.log("penalty_shootout", penalties.length);
  for (const p of penalties) {
    await prisma.penaltyShootout.upsert({
      where: { id: String(p.id) },
      create: {
        id: String(p.id),
        matchId: String(p.match_id),
        teamId: String(p.team_id),
        playerId: String(p.player_id),
        scored: Boolean(p.scored),
        shootOrder: Number(p.shoot_order),
      },
      update: {
        scored: Boolean(p.scored),
        shootOrder: Number(p.shoot_order),
      },
    });
  }

  // audit
  try {
    const key = SERVICE || ANON;
    const audit = await fetchAll<Record<string, unknown>>("admin_audit_log", key);
    console.log("admin_audit_log", audit.length);
    for (const a of audit) {
      const userId = String(a.user_id);
      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email: String(a.user_email || `audit-${userId.slice(0, 8)}@sfl.import`),
          role: "admin",
        },
        update: {},
      });
      await prisma.adminAuditLog.upsert({
        where: { id: String(a.id) },
        create: {
          id: String(a.id),
          userId,
          userEmail: String(a.user_email),
          action: String(a.action),
          entityType: String(a.entity_type),
          entityId: (a.entity_id as string) ?? null,
          description: (a.description as string) ?? null,
          details: (a.details as Prisma.InputJsonValue) ?? undefined,
          createdAt: new Date(String(a.created_at)),
        },
        update: {
          description: (a.description as string) ?? null,
          details: (a.details as Prisma.InputJsonValue) ?? undefined,
        },
      });
    }
    if (audit.length === 0 && !SERVICE) {
      console.warn(
        "audit vazio via anon — se houver dados em produção, rode de novo com SUPABASE_SERVICE_ROLE_KEY",
      );
    }
  } catch (e) {
    console.warn("audit import skipped:", e);
  }

  console.log("Import done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
