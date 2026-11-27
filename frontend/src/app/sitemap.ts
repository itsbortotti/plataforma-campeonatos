import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";
import { getCompetitions, getMatches, getSeasons } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    {
      url: `${SITE_URL}/campeonatos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/loja`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/rating`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  try {
    const competitions = await getCompetitions();
    for (const competition of competitions) {
      const base = `${SITE_URL}/campeonato/${competition.slug}`;
      entries.push(
        { url: base, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
        {
          url: `${base}/classificacao`,
          lastModified: now,
          changeFrequency: "hourly",
          priority: 0.8,
        },
        {
          url: `${base}/calendario`,
          lastModified: now,
          changeFrequency: "hourly",
          priority: 0.8,
        },
        {
          url: `${base}/elencos`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.6,
        },
      );
    }

    const seasons = await getSeasons();
    for (const season of seasons) {
      const matches = await getMatches(null, season.id).catch(() => []);
      for (const match of matches) {
        const live = match.status === "live" || match.status === "halftime";
        entries.push({
          url: `${SITE_URL}/partida/${match.id}`,
          lastModified: match.date ? new Date(match.date) : now,
          changeFrequency: live ? "hourly" : "weekly",
          priority: 0.7,
        });
      }
    }

    const players = await apiGet<Array<{ id: string }>>("/api/players").catch(
      () => [],
    );
    for (const player of players) {
      if (!player?.id) continue;
      entries.push({
        url: `${SITE_URL}/jogador/${player.id}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch {
    // Sem a API, o sitemap ainda lista as páginas fixas.
  }

  return entries;
}
