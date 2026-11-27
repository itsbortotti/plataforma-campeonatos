import { OG_SIZE } from "@/lib/seo";
import { loadHomeHighlight } from "@/lib/og/data";
import { ogHome } from "@/lib/og/markup";
import { renderPng } from "@/lib/og/response";

export const runtime = "nodejs";

/** Prévia Open Graph da home e das páginas sem arte própria. */
export async function GET() {
  const { brand, fixture } = await loadHomeHighlight();
  return renderPng(
    ogHome({
      siteName: brand.siteName || "SFL",
      tagline: brand.tagline || "Plataforma de campeonatos",
      description:
        brand.description ||
        "Classificação, calendário, elencos e estatísticas da liga.",
      fixture,
      width: OG_SIZE.width,
      height: OG_SIZE.height,
    }),
    OG_SIZE.width,
    OG_SIZE.height,
  );
}
