import type { MatchEvent, MatchWithTeams } from "./queries";

// ── Video ID extraction ──

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ── YouTube Data API ──

export async function fetchYoutubeDescription(
  videoId: string,
): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const json = await res.json();
  const description = json?.items?.[0]?.snippet?.description;
  return typeof description === "string" ? description : null;
}

// ── Parser do formato padronizado ──

export interface ParsedGoal {
  readonly timestampSeconds: number;
  readonly playerName: string;
  readonly teamName: string;
  readonly isOwnGoal: boolean;
}

function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

export function parseGoalTimestamps(description: string): ParsedGoal[] {
  // Try standard format first (⚽ markers)
  const standard = parseStandardFormat(description);
  if (standard.length > 0) return standard;

  // Fallback: legacy format ("GOLS TEAM: NAME AOS MM:SS")
  return parseLegacyFormat(description);
}

function parseStandardFormat(description: string): ParsedGoal[] {
  const regex =
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(?:Gol|⚽)\s*-?\s*(.+?)\s+\((.+?)\)(.*)$/gm;
  const results: ParsedGoal[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(description)) !== null) {
    const [, timestamp, playerName, teamName, extra] = match;
    results.push({
      timestampSeconds: parseTimestamp(timestamp),
      playerName: playerName.trim(),
      teamName: teamName.trim(),
      isOwnGoal: /\[GC\]/i.test(extra),
    });
  }

  return results;
}

function parseLegacyFormat(description: string): ParsedGoal[] {
  const results: ParsedGoal[] = [];
  const lines = description.split("\n");
  const nameChars =
    "[A-ZÁÉÍÓÚÀÃÕÂÊÔa-záéíóúàãõâêô.]";
  const namePattern = new RegExp(
    `(${nameChars}${nameChars}*(?:\\s+${nameChars}+)*)`,
  );

  for (const line of lines) {
    const headerMatch = line.match(/^GOLS?\s+(.+?)\s*:/i);
    if (!headerMatch) continue;

    const teamName = headerMatch[1].trim();
    const content = line.slice(headerMatch[0].length);

    const tsRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
    let lastPlayer: string | null = null;
    let m: RegExpExecArray | null;

    while ((m = tsRegex.exec(content)) !== null) {
      const ts = m[1];
      const before = content.slice(0, m.index);
      const after = content.slice(m.index + ts.length);

      let name: string | null = null;

      // Strategy 1: "NAME AOS|EM TIMESTAMP"
      const preKeyword = before.match(
        new RegExp(
          `(${nameChars}+(?:\\s+${nameChars}+)*)\\s+(?:AOS|EM)\\s*$`,
          "i",
        ),
      );
      if (preKeyword) {
        name = preKeyword[1].trim();
      }

      // Strategy 2: "TIMESTAMP NAME" (after timestamp, stop at separator/keyword/timestamp)
      if (!name) {
        const postName = after.match(
          new RegExp(
            `^\\s+(${nameChars}+(?:\\s+${nameChars}+)*?)(?=\\s*[-,&]|\\s+(?:AOS|EM|E)\\b|\\s+\\d{1,2}:\\d{2}|$)`,
            "i",
          ),
        );
        if (postName) {
          name = postName[1].trim();
        }
      }

      // Strategy 3: "NAME TIMESTAMP" (no keyword, name directly before)
      if (!name) {
        const preDirect = before.match(
          new RegExp(`(${nameChars}+(?:\\s+${nameChars}+)*?)\\s+$`),
        );
        if (preDirect) {
          const candidate = preDirect[1].trim();
          if (candidate.length > 1) {
            name = candidate;
          }
        }
      }

      // Strategy 4: same player (e.g., "DIOGO AOS 35:00 & 39:00")
      if (!name) {
        name = lastPlayer;
      }

      if (name) {
        name = name
          .replace(/^E\s+/i, "")
          .replace(/\s+(AOS|EM|E)\s*$/i, "")
          .trim();
        lastPlayer = name;
        results.push({
          timestampSeconds: parseTimestamp(ts),
          playerName: name,
          teamName,
          isOwnGoal: false,
        });
      }
    }
  }

  return results;
}

// ── Matching: parsed goals → match events ──

export interface SuggestedTimestamp {
  readonly eventId: string;
  readonly timestampSeconds: number;
  readonly confidence: "high" | "medium" | "low";
  readonly matchedBy: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function matchTimestampsToEvents(
  parsed: ParsedGoal[],
  events: MatchEvent[],
  match: MatchWithTeams,
): SuggestedTimestamp[] {
  const goalEvents = events.filter(
    (e) => e.type === "goal" || e.type === "own_goal" || e.type === "penalty_goal",
  );

  const teamNameMap = new Map<string, string>([
    [match.homeTeam.id, normalize(match.homeTeam.name)],
    [match.awayTeam.id, normalize(match.awayTeam.name)],
  ]);

  const teamShortMap = new Map<string, string>([
    [match.homeTeam.id, normalize(match.homeTeam.shortName)],
    [match.awayTeam.id, normalize(match.awayTeam.shortName)],
  ]);

  const usedEvents = new Set<string>();
  const usedParsed = new Set<number>();
  const suggestions: SuggestedTimestamp[] = [];

  // Pass 1: high confidence — name + team + type match
  for (let pi = 0; pi < parsed.length; pi++) {
    if (usedParsed.has(pi)) continue;
    const pg = parsed[pi];
    const normalizedParsedTeam = normalize(pg.teamName);

    for (const ev of goalEvents) {
      if (usedEvents.has(ev.id)) continue;

      const playerNickname = ev.player?.nickname ?? "";
      const nameOk = namesMatch(pg.playerName, playerNickname);
      if (!nameOk) continue;

      const evTeamName = teamNameMap.get(ev.teamId ?? "") ?? "";
      const evTeamShort = teamShortMap.get(ev.teamId ?? "") ?? "";
      const teamOk =
        normalizedParsedTeam === evTeamName ||
        normalizedParsedTeam === evTeamShort ||
        evTeamName.includes(normalizedParsedTeam) ||
        normalizedParsedTeam.includes(evTeamName);

      const typeOk =
        (pg.isOwnGoal && ev.type === "own_goal") ||
        (!pg.isOwnGoal && ev.type !== "own_goal");

      if (nameOk && teamOk && typeOk) {
        suggestions.push({
          eventId: ev.id,
          timestampSeconds: pg.timestampSeconds,
          confidence: "high",
          matchedBy: "nome+time+tipo",
        });
        usedEvents.add(ev.id);
        usedParsed.add(pi);
        break;
      }
    }
  }

  // Pass 2: medium confidence — name match only
  for (let pi = 0; pi < parsed.length; pi++) {
    if (usedParsed.has(pi)) continue;
    const pg = parsed[pi];

    for (const ev of goalEvents) {
      if (usedEvents.has(ev.id)) continue;

      const playerNickname = ev.player?.nickname ?? "";
      if (namesMatch(pg.playerName, playerNickname)) {
        suggestions.push({
          eventId: ev.id,
          timestampSeconds: pg.timestampSeconds,
          confidence: "medium",
          matchedBy: "nome",
        });
        usedEvents.add(ev.id);
        usedParsed.add(pi);
        break;
      }
    }
  }

  // Pass 3: low confidence — chronological order for remaining
  const remainingParsed = parsed
    .map((pg, i) => ({ pg, i }))
    .filter(({ i }) => !usedParsed.has(i));
  const remainingEvents = goalEvents.filter((e) => !usedEvents.has(e.id));

  for (
    let i = 0;
    i < Math.min(remainingParsed.length, remainingEvents.length);
    i++
  ) {
    suggestions.push({
      eventId: remainingEvents[i].id,
      timestampSeconds: remainingParsed[i].pg.timestampSeconds,
      confidence: "low",
      matchedBy: "ordem cronológica",
    });
  }

  return suggestions;
}

// ── Helpers for MM:SS display ──

export function secondsToMmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function mmssToSeconds(mmss: string): number | null {
  const trimmed = mmss.trim();
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map(Number);
  if (nums.some(isNaN) || nums.some((n) => n < 0)) return null;

  if (parts.length === 3) {
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  return nums[0] * 60 + nums[1];
}
