/** Canais oficiais da liga — usados na home e rodapé. */
export const SOCIAL = {
  youtubeChannel: "https://www.youtube.com/@CampeonatoS.F.L",
  youtubeChannelId: "UC21JiyhTqMWdP8DMeLE5pKg",
  instagram: "https://www.instagram.com/liga.sfl/",
  instagramHandle: "@liga.sfl",
} as const;

/** Últimos vídeos do canal (atualize periodicamente ou via API depois). */
export const FEATURED_VIDEOS: Array<{
  id: string;
  title: string;
}> = [
  {
    id: "qe5o_vfpRPc",
    title: "CLIMA DE GUERRA ATÉ O FIM! Tormento 3x3 Dínamo — 11ª rodada",
  },
  {
    id: "WQvfyhGmRW4",
    title: "A MAIOR REMONTADA! Tormento 3x5 Dínamo — 10ª rodada",
  },
  {
    id: "WC8pm-pSR0k",
    title: "A REMONTADA É REAL! Tormento 2x3 Dínamo — 9ª rodada",
  },
  {
    id: "ffdkoZq7-4Y",
    title: "QUE AMASSO DO DÍNAMO! Tormento 1x5 Dínamo — 8ª rodada",
  },
];

export function youtubeThumb(id: string, quality: "hq" | "mq" | "sd" = "hq") {
  return `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;
}

export function youtubeWatch(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbed(id: string) {
  return `https://www.youtube.com/embed/${id}`;
}
