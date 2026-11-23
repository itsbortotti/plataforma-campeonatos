"use client";

import Link from "next/link";
import { useBrand, useBrandLogoSrc } from "@/components/BrandProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HERO_SRC = "/images/banner.png";

type Props = {
  brandName: string;
  brandTo: string;
  heroAlt: string;
  eyebrow?: string;
  children: React.ReactNode;
};

/**
 * Layout split: formulário + hero de marca (GarageFlow / Pisa).
 * Safe-area para iPhone 15 / Dynamic Island.
 */
export function LoginScreenShell({
  brandName,
  brandTo,
  heroAlt,
  eyebrow,
  children,
}: Props) {
  const brand = useBrand();
  const logoSrc = useBrandLogoSrc();

  return (
    <div className="min-h-[100svh] w-full overflow-x-hidden bg-background text-foreground">
      <div className="grid min-h-[100svh] w-full grid-cols-1 lg:grid-cols-2">
        {/* Mobile hero strip */}
        <div className="relative h-44 w-full shrink-0 overflow-hidden sm:h-52 lg:hidden pt-[env(safe-area-inset-top)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_SRC}
            alt={heroAlt}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-brand-bar/40" />
          <div className="absolute bottom-4 left-5 right-5">
            <p className="font-display text-3xl tracking-wide text-white drop-shadow-md">
              {brand.siteName}
            </p>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-col gap-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:py-8 lg:p-12">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <Link
              href={brandTo}
              className="flex items-center gap-2.5 font-semibold text-foreground"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                className="h-10 w-10 shrink-0 object-contain rounded-xl ring-1 ring-border"
                width={40}
                height={40}
                suppressHydrationWarning
              />
              <span className="font-display text-xl tracking-wide">
                {brandName}
              </span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 flex-col items-stretch justify-center py-2 sm:py-6">
            <div className="mx-auto w-full max-w-[22rem]">
              {eyebrow ? (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cta">
                  {eyebrow}
                </p>
              ) : null}
              {children}
            </div>
          </div>

          <footer className="mt-auto border-t border-border pt-4 text-center sm:text-left">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1",
              )}
            >
              ← Voltar ao site {brand.siteName}
            </Link>
          </footer>
        </div>

        {/* Desktop hero */}
        <div className="relative hidden min-h-0 overflow-hidden bg-brand-bar lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_SRC}
            alt={heroAlt}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-55 animate-sfl-kenburns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/45 to-brand-bar/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(193,86,34,0.25),transparent_55%)]" />
          <div className="absolute bottom-12 left-12 right-12 text-white animate-sfl-rise">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cta">
              {brand.siteName}
            </p>
            <p className="mt-3 font-display text-5xl xl:text-6xl tracking-wide leading-[0.95]">
              {heroAlt}
            </p>
            <p className="mt-4 max-w-sm text-sm text-white/70 leading-relaxed">
              {brand.tagline}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
