import { OG_SIZE } from "@/lib/seo";
import { loadFixtureById } from "@/lib/og/data";
import { ogFixture } from "@/lib/og/markup";
import { renderPng } from "@/lib/og/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const fixture = await loadFixtureById(id);
  return renderPng(
    ogFixture({ fixture, width: OG_SIZE.width, height: OG_SIZE.height }),
    OG_SIZE.width,
    OG_SIZE.height,
  );
}
