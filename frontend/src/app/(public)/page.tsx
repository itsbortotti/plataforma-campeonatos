import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import {
  getCompetitions,
  getLiveMatchesGlobal,
  getRecentMatchesGlobal,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DEFAULT_BRAND, type SystemBrand } from "@/lib/brand";
import { formatDate } from "@/lib/format-date";
import { apiGet } from "@/lib/api-server";
import {
  FEATURED_VIDEOS,
  SOCIAL,
  youtubeEmbed,
  youtubeThumb,
  youtubeWatch,
} from "@/lib/social";
import {
  InstagramIcon,
  YoutubeIcon,
} from "@/components/icons/SocialIcons";
import { HomeHeroLiveCarousel } from "@/components/home/HomeHeroLiveCarousel";
import { SponsorsStrip } from "@/components/home/SponsorsStrip";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  let title = "SFL — Plataforma de campeonatos";
  let description =
    "Classificação, calendário, elencos e estatísticas da liga.";
  let siteName = "SFL";
  try {
    const settings = await apiGet<SystemBrand>("/api/settings");
    siteName = settings.siteName || siteName;
    title = `${siteName} — ${settings.tagline || "Plataforma de campeonatos"}`;
    description = settings.description || settings.tagline || description;
  } catch {
    // marca padrão
  }
  return pageMetadata({
    title,
    description,
    path: "/",
    image: "/og",
    siteName,
  });
}

export default async function HomePage() {
  const [competitions, recent, liveMatches, brand] = await Promise.all([
    getCompetitions(),
    getRecentMatchesGlobal(6),
    getLiveMatchesGlobal(),
    apiGet<SystemBrand>("/api/settings")
      .then((s) => ({ ...DEFAULT_BRAND, ...s }))
      .catch(() => DEFAULT_BRAND),
  ]);

  const featured = FEATURED_VIDEOS[0];
  const moreVideos = FEATURED_VIDEOS.slice(1);
  const hasBoard = liveMatches.length > 0;

  return (
    <div className="bg-background">
      {/* Estilo GE: faixa de placares + hero da partida em destaque */}
      {hasBoard ? (
        <HomeHeroLiveCarousel initial={liveMatches} />
      ) : (
        <section className="relative min-h-[100svh] overflow-hidden bg-[#0B1220]">
          <Image
            src="/images/banner.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center animate-sfl-kenburns"
          />
          <div className="absolute inset-0 bg-[#0B1220]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/80 via-transparent to-transparent" />

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-5 sm:pb-24">
            <p className="animate-sfl-fade font-display text-5xl sm:text-7xl md:text-8xl tracking-wide text-white leading-none">
              {brand.siteName}
            </p>
            <h1 className="animate-sfl-rise mt-4 max-w-xl text-xl sm:text-2xl font-medium text-white/90 leading-snug [animation-delay:120ms]">
              {brand.tagline}
            </h1>
            <p className="animate-sfl-rise mt-3 max-w-md text-sm text-white/65 [animation-delay:220ms]">
              Resultados, classificação e o clima da liga — no site, no YouTube
              e no Instagram.
            </p>
            <div className="animate-sfl-rise mt-8 flex flex-wrap gap-3 [animation-delay:320ms]">
              <Link
                href="/campeonatos"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-cta px-7 py-3 text-sm font-black uppercase tracking-wide text-cta-foreground shadow-lg shadow-cta/25 hover:brightness-110 transition active:scale-[0.98]"
              >
                Ver campeonatos <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={SOCIAL.youtubeChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-md hover:bg-white/20 transition active:scale-[0.98]"
              >
                <YoutubeIcon className="h-4 w-4" /> Vídeos
              </a>
            </div>
          </div>
        </section>
      )}

      <SponsorsStrip />

      {/* Destaque YouTube */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cta mb-2">
              YouTube · Campeonato S.F.L
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              Os jogos em vídeo
            </h2>
          </div>
          <a
            href={SOCIAL.youtubeChannel}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2 uppercase tracking-wide",
            )}
          >
            Ver canal <YoutubeIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-border/60">
            <div className="relative aspect-video">
              <iframe
                title={featured.title}
                src={`${youtubeEmbed(featured.id)}?rel=0`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <p className="px-4 py-3 text-sm font-medium text-white/90 bg-[#0B1220] line-clamp-2">
              {featured.title}
            </p>
          </div>

          <ul className="lg:col-span-2 flex flex-col gap-3">
            {moreVideos.map((v) => (
              <li key={v.id}>
                <a
                  href={youtubeWatch(v.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 rounded-xl bg-card ring-1 ring-border/60 p-2.5 hover:ring-cta/40 transition"
                >
                  <span className="relative h-20 w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={youtubeThumb(v.id)}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition">
                      <Play className="h-6 w-6 text-white fill-white" />
                    </span>
                  </span>
                  <span className="flex flex-col justify-center min-w-0 py-0.5">
                    <span className="text-sm font-semibold text-foreground line-clamp-3 leading-snug group-hover:text-cta transition-colors">
                      {v.title}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Instagram CTA — full visual strip */}
      <section className="relative overflow-hidden bg-brand-bar text-brand-bar-foreground">
        <Image
          src="/images/banner.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-bar via-brand-bar/90 to-brand-bar/70" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-5 py-16 sm:py-20 flex flex-col sm:flex-row sm:items-center gap-8">
          <div className="flex-1 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cta">
              Instagram
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide">
              {SOCIAL.instagramHandle}
            </h2>
            <p className="max-w-md text-sm text-brand-bar-foreground/75 leading-relaxed">
              Bastidores, gols e o dia a dia da liga. Siga e acompanhe os
              destaques entre uma rodada e outra.
            </p>
          </div>
          <a
            href={SOCIAL.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cta px-7 py-3.5 text-sm font-black uppercase tracking-wide text-cta-foreground shadow-lg hover:brightness-110 transition active:scale-[0.98]"
          >
            <InstagramIcon className="h-5 w-5" /> Abrir Instagram
          </a>
        </div>
      </section>

      {/* Últimas partidas */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-14 sm:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Resultados
            </p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
              Últimas partidas
            </h2>
          </div>
          <Link
            href="/campeonatos"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "uppercase tracking-wide shrink-0",
            )}
          >
            Campeonatos
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            Ainda não há partidas encerradas. Quando os campeonatos começarem,
            os resultados aparecem aqui.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((m) => (
              <Link
                key={m.id}
                href={`/partida/${m.id}`}
                className="group relative overflow-hidden rounded-2xl min-h-[188px] bg-brand-bar text-white shadow-md"
              >
                <Image
                  src="/images/banner.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-40 transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
                <div className="relative z-10 flex h-full min-h-[188px] flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-medium text-white/75">
                      {formatDate(m.date)}
                    </span>
                    {m.competition ? (
                      <Badge className="bg-cta text-cta-foreground border-0 text-[9px] font-bold uppercase max-w-[55%] truncate">
                        {m.competition.name}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-display text-2xl sm:text-3xl leading-none tracking-wide">
                      {m.homeTeam.shortName}{" "}
                      <span className="text-cta">
                        {m.homeScore ?? 0}x{m.awayScore ?? 0}
                      </span>{" "}
                      {m.awayTeam.shortName}
                    </p>
                    <p className="mt-1.5 text-[11px] text-white/60 uppercase tracking-wide">
                      Rodada {m.round}
                      {m.seasonName ? ` · ${m.seasonName}` : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {competitions.length > 0 ? (
        <section className="border-t border-border/40 bg-secondary">
          <div className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-14 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground">
                {competitions.length === 1
                  ? "1 campeonato ativo"
                  : `${competitions.length} campeonatos ativos`}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Entre em cada liga para ver tabela, calendário, elencos e
                artilharia.
              </p>
            </div>
            <Link
              href="/campeonatos"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cta px-6 py-3 text-sm font-black uppercase tracking-wide text-cta-foreground hover:brightness-110 transition"
            >
              Ir para campeonatos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
