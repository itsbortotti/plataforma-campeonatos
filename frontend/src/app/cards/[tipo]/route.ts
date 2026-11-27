import { CARD_SIZE } from "@/lib/seo";
import {
  loadBrandName,
  loadLatestResult,
  loadNextFixture,
  loadScorersBoard,
  sanitizeMatchId,
  sanitizeSlug,
} from "@/lib/og/data";
import { storyFixture, storyScorers } from "@/lib/og/markup";
import { renderPng } from "@/lib/og/response";

export const runtime = "nodejs";

const KINDS = ["proximo-jogo", "resultado", "artilharia"] as const;
type Kind = (typeof KINDS)[number];

function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

/** PNG 1080×1350 para grupos de WhatsApp e Instagram. */
export async function GET(
  request: Request,
  context: { params: Promise<{ tipo: string }> },
) {
  const { tipo } = await context.params;
  if (!isKind(tipo)) {
    return new Response(
      "Card não encontrado. Use /cards/proximo-jogo, /cards/resultado ou /cards/artilharia.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const url = new URL(request.url);
  const slug = sanitizeSlug(url.searchParams.get("campeonato"));
  const matchId = sanitizeMatchId(url.searchParams.get("partida"));
  const brand = await loadBrandName();
  const siteName = brand.siteName || "SFL";

  if (tipo === "artilharia") {
    const board = await loadScorersBoard(slug);
    const image = await renderPng(
      storyScorers({
        siteName,
        competitionName: board?.competitionName || "SFL",
        seasonName: board?.seasonName || "",
        rows: board?.rows ?? [],
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
      }),
      CARD_SIZE.width,
      CARD_SIZE.height,
    );
    image.headers.set(
      "Content-Disposition",
      'inline; filename="sfl-artilharia.png"',
    );
    return image;
  }

  const fixture =
    tipo === "resultado"
      ? await loadLatestResult(slug, matchId)
      : await loadNextFixture(slug, matchId);
  const image = await renderPng(
    storyFixture({
      siteName,
      fixture,
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
    }),
    CARD_SIZE.width,
    CARD_SIZE.height,
  );
  image.headers.set(
    "Content-Disposition",
    `inline; filename="sfl-${tipo}.png"`,
  );
  return image;
}
