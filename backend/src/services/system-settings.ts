import { prisma } from "../core/prisma.js";

export type SponsorDto = {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl: string | null;
};

export type SystemSettingsDto = {
  siteName: string;
  tagline: string;
  description: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
  footerText: string | null;
  masterLabel: string;
  sponsors: SponsorDto[];
};

/** Patrocinadores iniciais do site (assets em frontend/public/patrocinadores). */
export const DEFAULT_SPONSORS: SponsorDto[] = [
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
  {
    id: "altivon",
    name: "Altivon",
    imageUrl: "/patrocinadores/altivon.png",
    linkUrl: "https://www.altivon.com.br",
  },
  {
    id: "garageflow",
    name: "GarageFlow",
    imageUrl: "/patrocinadores/garageflow.png",
    linkUrl: "https://garageflow.altivon.com.br",
  },
  {
    id: "operatta",
    name: "Operatta",
    imageUrl: "/patrocinadores/operatta.png",
    linkUrl: "https://chatflow-web.onrender.com",
  },
];

function withDefaultSponsors(sponsors: SponsorDto[]): SponsorDto[] {
  const byId = new Map(sponsors.map((s) => [s.id, s]));
  const merged = [...sponsors];
  for (const def of DEFAULT_SPONSORS) {
    if (!byId.has(def.id)) {
      merged.push(def);
      byId.set(def.id, def);
    }
  }
  return merged;
}

const DEFAULTS: SystemSettingsDto = {
  siteName: "SFL",
  tagline: "Plataforma de campeonatos",
  description:
    "Hub de campeonatos: classificação, calendário, elencos e estatísticas.",
  logoUrl: null,
  supportEmail: null,
  footerText: null,
  masterLabel: "Master",
  sponsors: DEFAULT_SPONSORS,
};

function parseSponsors(raw: unknown): SponsorDto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      const imageUrl =
        typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
      if (!name || !imageUrl) return null;
      const id =
        typeof o.id === "string" && o.id.trim()
          ? o.id.trim()
          : crypto.randomUUID();
      const linkUrl =
        typeof o.linkUrl === "string" && o.linkUrl.trim()
          ? o.linkUrl.trim()
          : null;
      return { id, name, imageUrl, linkUrl };
    })
    .filter((s): s is SponsorDto => Boolean(s));
}

function mapRow(row: {
  siteName: string;
  tagline: string;
  description: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
  footerText: string | null;
  masterLabel: string;
  sponsorsJson: unknown;
}): SystemSettingsDto {
  return {
    siteName: row.siteName,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logoUrl,
    supportEmail: row.supportEmail,
    footerText: row.footerText,
    masterLabel: row.masterLabel,
    sponsors: parseSponsors(row.sponsorsJson),
  };
}

export async function getSystemSettings(): Promise<SystemSettingsDto> {
  const existing = await prisma.systemSettings.findUnique({
    where: { id: "default" },
  });

  if (!existing) {
    const created = await prisma.systemSettings.create({
      data: {
        id: "default",
        sponsorsJson: DEFAULT_SPONSORS,
      },
    });
    return mapRow(created);
  }

  const mapped = mapRow(existing);
  // Sem lista salva → grava os padrão (já usados na home).
  if (mapped.sponsors.length === 0) {
    const seeded = await prisma.systemSettings.update({
      where: { id: "default" },
      data: { sponsorsJson: DEFAULT_SPONSORS },
    });
    return mapRow(seeded);
  }

  // Inclui patrocinadores padrão novos (ex.: Altivon) sem apagar os já salvos.
  const merged = withDefaultSponsors(mapped.sponsors);
  if (merged.length !== mapped.sponsors.length) {
    const saved = await prisma.systemSettings.update({
      where: { id: "default" },
      data: { sponsorsJson: merged },
    });
    return mapRow(saved);
  }

  return mapped;
}

export async function updateSystemSettings(
  patch: Partial<Omit<SystemSettingsDto, "sponsors">> & {
    sponsors?: SponsorDto[];
  },
): Promise<SystemSettingsDto> {
  await getSystemSettings();
  const updated = await prisma.systemSettings.update({
    where: { id: "default" },
    data: {
      ...(patch.siteName !== undefined
        ? { siteName: patch.siteName.trim() || DEFAULTS.siteName }
        : {}),
      ...(patch.tagline !== undefined
        ? { tagline: patch.tagline.trim() || DEFAULTS.tagline }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      ...(patch.supportEmail !== undefined
        ? { supportEmail: patch.supportEmail?.trim() || null }
        : {}),
      ...(patch.footerText !== undefined
        ? { footerText: patch.footerText?.trim() || null }
        : {}),
      ...(patch.masterLabel !== undefined
        ? { masterLabel: patch.masterLabel.trim() || DEFAULTS.masterLabel }
        : {}),
      ...(patch.sponsors !== undefined
        ? { sponsorsJson: parseSponsors(patch.sponsors) }
        : {}),
    },
  });
  return mapRow(updated);
}
