/** Política de cache das leituras públicas. A súmula e o admin ficam de fora. */

export type PublicCachePolicy = {
  revalidate: number;
  tags: string[];
};

const RULES: Array<{ test: RegExp; revalidate: number; tags: string[] }> = [
  { test: /^\/api\/settings$/, revalidate: 300, tags: ["sfl-settings"] },
  {
    test: /^\/api\/competitions(?:\/[^/]+)?$/,
    revalidate: 180,
    tags: ["sfl-competitions"],
  },
  { test: /^\/api\/teams$/, revalidate: 300, tags: ["sfl-teams"] },
  { test: /^\/api\/seasons\/current$/, revalidate: 120, tags: ["sfl-seasons"] },
  { test: /^\/api\/seasons$/, revalidate: 120, tags: ["sfl-seasons"] },
  {
    test: /^\/api\/seasons\/[^/]+\/standings$/,
    revalidate: 60,
    tags: ["sfl-standings"],
  },
  {
    test: /^\/api\/seasons\/[^/]+\/player-stats$/,
    revalidate: 60,
    tags: ["sfl-stats"],
  },
  {
    test: /^\/api\/seasons\/[^/]+\/matches$/,
    revalidate: 60,
    tags: ["sfl-matches"],
  },
  {
    test: /^\/api\/seasons\/[^/]+\/rosters$/,
    revalidate: 120,
    tags: ["sfl-rosters"],
  },
  { test: /^\/api\/matches\/recent$/, revalidate: 60, tags: ["sfl-matches"] },
  { test: /^\/api\/players$/, revalidate: 120, tags: ["sfl-players"] },
  { test: /^\/api\/players\/[^/]+$/, revalidate: 120, tags: ["sfl-players"] },
];

/** Partida individual (súmula), ao vivo, sessão e painel: sempre frescos. */
const FRESH: RegExp[] = [
  /^\/api\/matches\/live$/,
  /^\/api\/matches\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^\/api\/admin\//,
  /^\/api\/auth\//,
  /^\/api\/captain\//,
  /^\/api\/storage\//,
  /^\/api\/cron\//,
];

export const PUBLIC_CACHE_TAG = "sfl-public";

export function cachePolicyFor(path: string): PublicCachePolicy | null {
  const pathname = path.split("?")[0] ?? path;
  if (FRESH.some((re) => re.test(pathname))) return null;
  const hit = RULES.find((rule) => rule.test.test(pathname));
  if (!hit) return null;
  return { revalidate: hit.revalidate, tags: hit.tags };
}
