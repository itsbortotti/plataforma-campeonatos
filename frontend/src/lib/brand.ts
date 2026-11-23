/** Fallbacks da marca — usados se a API ainda não tiver settings. */
export const SYSTEM_NAME = "SFL";
export const SYSTEM_TAGLINE = "Plataforma de campeonatos";
export const SYSTEM_DESCRIPTION =
  "Hub de campeonatos: classificação, calendário, elencos e estatísticas.";
/**
 * Marca do sistema: bola (futebol) + SFL + 3 pontos (vários campeonatos
 * sob a mesma casa). Não usar o emblema do campeonato SFL aqui.
 */
export const SYSTEM_LOGO_SRC = "/images/system-logo.svg";
export const SYSTEM_MASTER_LABEL = "Master";
/** Emblema do campeonato SFL (não usar no chrome do sistema). */
export const COMPETITION_SFL_LOGO_SRC = "/images/competitions/sfl.png";

export type SponsorBrand = {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl: string | null;
};

export type SystemBrand = {
  siteName: string;
  tagline: string;
  description: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
  footerText: string | null;
  masterLabel: string;
  sponsors: SponsorBrand[];
};

/** Fallback visual enquanto não há patrocinadores cadastrados. */
export const DEFAULT_SPONSORS: SponsorBrand[] = [
  {
    id: "docinho",
    name: "Sr. e Sra. Docinho",
    imageUrl: "/patrocinadores/docinho.png",
    linkUrl: null,
  },
  {
    id: "l3ms",
    name: "L3M'S",
    imageUrl: "/patrocinadores/l3ms.jpeg",
    linkUrl: null,
  },
  {
    id: "wsbc",
    name: "WSBC",
    imageUrl: "/patrocinadores/wsbc.png",
    linkUrl: null,
  },
];

export const DEFAULT_BRAND: SystemBrand = {
  siteName: SYSTEM_NAME,
  tagline: SYSTEM_TAGLINE,
  description: SYSTEM_DESCRIPTION,
  logoUrl: null,
  supportEmail: null,
  footerText: null,
  masterLabel: SYSTEM_MASTER_LABEL,
  sponsors: DEFAULT_SPONSORS,
};

export function resolveLogoSrc(brand: Pick<SystemBrand, "logoUrl">) {
  return brand.logoUrl?.trim() || SYSTEM_LOGO_SRC;
}

export function resolveSponsors(brand: Pick<SystemBrand, "sponsors">) {
  return brand.sponsors?.length ? brand.sponsors : DEFAULT_SPONSORS;
}
