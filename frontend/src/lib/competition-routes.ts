import { getCompetitions, getSeasons } from "@/lib/queries";

/**
 * Escolhe um campeonato com temporada (preferência: temporada atual,
 * depois mais partidas). Evita cair em copa vazia só porque o nome
 * vem primeiro na ordem alfabética.
 */
export async function resolveDefaultCompetitionSlug(): Promise<string | null> {
  const [competitions, seasons] = await Promise.all([
    getCompetitions(),
    getSeasons(),
  ]);
  if (!competitions.length) return null;

  const current = seasons.find((s) => s.isCurrent && s.competitionSlug);
  if (current?.competitionSlug) return current.competitionSlug;

  const withSeason = competitions.find((c) => (c.seasons?.length ?? 0) > 0);
  if (withSeason) return withSeason.slug;

  const byMatches = [...seasons]
    .filter((s) => s.competitionSlug)
    .sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0))[0];
  if (byMatches?.competitionSlug) return byMatches.competitionSlug;

  return competitions[0]?.slug ?? null;
}

export async function resolveCompetitionSlugForSeason(
  seasonId: string,
): Promise<string | null> {
  const seasons = await getSeasons();
  const season = seasons.find((s) => s.id === seasonId);
  if (season?.competitionSlug) return season.competitionSlug;

  const competitions = await getCompetitions();
  if (season?.competitionId) {
    const c = competitions.find((x) => x.id === season.competitionId);
    if (c) return c.slug;
  }
  return resolveDefaultCompetitionSlug();
}
