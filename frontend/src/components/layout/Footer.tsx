"use client";

import Link from "next/link";
import { SystemLogo } from "@/components/SystemLogo";
import { useBrand } from "@/components/BrandProvider";
import { SOCIAL } from "@/lib/social";
import {
  InstagramIcon,
  YoutubeIcon,
} from "@/components/icons/SocialIcons";

export function Footer() {
  const brand = useBrand();

  return (
    <footer className="mt-auto relative overflow-hidden bg-brand-bar text-brand-bar-foreground pb-[env(safe-area-inset-bottom)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(193,86,34,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(255,255,255,0.06), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-5 pt-14 sm:pt-16 pb-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <SystemLogo
                size={44}
                className="rounded-xl ring-1 ring-white/20"
              />
              <div>
                <p className="font-display text-3xl tracking-wide leading-none">
                  {brand.siteName}
                </p>
                <p className="mt-1 text-sm text-brand-bar-foreground/65">
                  {brand.tagline}
                </p>
              </div>
            </div>
            {brand.footerText ? (
              <p className="text-xs text-brand-bar-foreground/50 leading-relaxed">
                {brand.footerText}
              </p>
            ) : null}
            {brand.supportEmail ? (
              <a
                href={`mailto:${brand.supportEmail}`}
                className="inline-block text-xs text-brand-bar-foreground/80 hover:text-white underline-offset-4 hover:underline"
              >
                {brand.supportEmail}
              </a>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bar-foreground/40 mb-4">
                Navegação
              </p>
              <ul className="space-y-2.5 text-sm text-brand-bar-foreground/85">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Início
                  </Link>
                </li>
                <li>
                  <Link
                    href="/campeonatos"
                    className="hover:text-white transition-colors"
                  >
                    Campeonatos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/loja"
                    className="hover:text-white transition-colors"
                  >
                    Loja
                  </Link>
                </li>
                <li>
                  <Link
                    href="/master/login"
                    className="hover:text-white transition-colors"
                  >
                    Acesso {brand.masterLabel}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/time/login"
                    className="hover:text-white transition-colors"
                  >
                    Acesso do time
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bar-foreground/40 mb-4">
                Redes
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href={SOCIAL.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-cta transition"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
                <a
                  href={SOCIAL.youtubeChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-cta transition"
                  aria-label="YouTube"
                >
                  <YoutubeIcon className="h-5 w-5" />
                </a>
              </div>
              <p className="mt-4 text-xs text-brand-bar-foreground/50 leading-relaxed">
                {SOCIAL.instagramHandle}
                <br />
                YouTube Campeonato S.F.L
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 sm:px-5 py-4 text-[11px] text-brand-bar-foreground/40">
          © {new Date().getFullYear()} {brand.siteName}
        </p>
      </div>
    </footer>
  );
}
