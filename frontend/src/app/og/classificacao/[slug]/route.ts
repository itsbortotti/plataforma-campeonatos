import { OG_SIZE } from "@/lib/seo";
import { loadStandingsBoard, sanitizeSlug } from "@/lib/og/data";
import { ogStandings } from "@/lib/og/markup";
import { renderPng } from "@/lib/og/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const board = await loadStandingsBoard(sanitizeSlug(slug));
  return renderPng(
    ogStandings({
      competitionName: board?.competitionName || "SFL",
      seasonName: board?.seasonName || "",
      rows: (board?.rows ?? []).slice(0, 6),
      width: OG_SIZE.width,
      height: OG_SIZE.height,
    }),
    OG_SIZE.width,
    OG_SIZE.height,
  );
}
