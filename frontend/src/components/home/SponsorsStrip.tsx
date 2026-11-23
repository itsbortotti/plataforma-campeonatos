"use client";

import Image from "next/image";
import { useBrand } from "@/components/BrandProvider";
import { resolveSponsors } from "@/lib/brand";

export function SponsorsStrip() {
  const brand = useBrand();
  const sponsors = resolveSponsors(brand);

  if (sponsors.length === 0) return null;

  return (
    <section className="border-b border-border/50 bg-card">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-8 sm:py-10">
        <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Patrocinadores
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
          {sponsors.map((s) => {
            const img = (
              <Image
                src={s.imageUrl}
                alt={s.name}
                width={180}
                height={72}
                className="h-12 sm:h-14 md:h-16 w-auto max-w-[160px] object-contain opacity-90 hover:opacity-100 transition dark:brightness-110"
              />
            );
            if (s.linkUrl) {
              return (
                <a
                  key={s.id}
                  href={s.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta"
                  aria-label={s.name}
                >
                  {img}
                </a>
              );
            }
            return (
              <span
                key={s.id}
                className="inline-flex items-center justify-center"
                title={s.name}
              >
                {img}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
