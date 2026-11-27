import type { Metadata } from "next";

/** Domínio canônico. Sobrescreva com NEXT_PUBLIC_SITE_URL se o host mudar. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://sflcampeonato.com.br"
).replace(/\/$/, "");

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const CARD_SIZE = { width: 1080, height: 1350 } as const;

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  /** Caminho da imagem OG. Padrão: a arte da home em /og. */
  image?: string;
  siteName?: string;
  noIndex?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  image = "/og",
  siteName = "SFL",
  noIndex = false,
}: PageMetaInput): Metadata {
  const fullTitle = title.includes(siteName) ? title : `${title} · ${siteName}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: path,
      siteName,
      title: fullTitle,
      description,
      images: [{ url: image, width: OG_SIZE.width, height: OG_SIZE.height, alt: fullTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}
