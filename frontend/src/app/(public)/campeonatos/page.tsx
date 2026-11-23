import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trophy } from "lucide-react";
import { getCompetitions } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function CampeonatosPage() {
  const competitions = await getCompetitions();

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden border-b border-border/40 bg-brand-bar text-white">
        <Image
          src="/images/banner.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-bar via-brand-bar/90 to-brand-bar/70" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-5 py-14 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cta mb-2">
            Liga
          </p>
          <h1 className="font-display text-5xl sm:text-7xl tracking-wide leading-none">
            Campeonatos
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/75 leading-relaxed">
            Escolha um campeonato para ver classificação, partidas, elencos e
            estatísticas.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-10 sm:py-14">
        {competitions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum campeonato ativo no momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {competitions.map((c) => (
              <Link
                key={c.id}
                href={`/campeonato/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition hover:border-cta/40 hover:shadow-md"
              >
                <div className="absolute inset-0 opacity-[0.07]">
                  <Image
                    src="/images/banner.png"
                    alt=""
                    fill
                    sizes="50vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative flex items-start gap-4 p-5 sm:p-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-secondary ring-2 ring-primary/10">
                    {c.logoUrl ? (
                      <Image
                        src={c.logoUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <Trophy className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl tracking-wide group-hover:text-cta truncate">
                        {c.name}
                      </h2>
                      {c.currentSeason ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {c.currentSeason.name}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {c.description ||
                        `${c.seasons.length} temporada${c.seasons.length === 1 ? "" : "s"}`}
                    </p>
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "gap-1 uppercase tracking-wide pointer-events-none",
                      )}
                    >
                      Entrar <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
