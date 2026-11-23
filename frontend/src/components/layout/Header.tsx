"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { SystemLogo } from "@/components/SystemLogo";
import { useBrand } from "@/components/BrandProvider";
import { API_URL } from "@/lib/api";

const navItems = [
  { href: "/", label: "Início", match: (p: string) => p === "/" },
  {
    href: "/campeonatos",
    label: "Campeonatos",
    match: (p: string) =>
      p === "/campeonatos" || p.startsWith("/campeonato/"),
  },
  {
    href: "/loja",
    label: "Loja",
    match: (p: string) => p === "/loja" || p.startsWith("/loja/"),
  },
] as const;

export function Header() {
  const pathname = usePathname();
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-bar/95 text-brand-bar-foreground backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={`${brand.siteName} — início`}
        >
          <SystemLogo size={40} className="rounded-xl ring-1 ring-white/20" />
          <span className="font-display text-xl tracking-wide text-white leading-none">
            {brand.siteName}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navItems.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors rounded-full",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 ml-auto">
          <UserMenu />
          <ThemeToggle className="text-white hover:bg-white/10 hover:text-white" />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/90 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw-2rem,20rem)] bg-background border-border flex flex-col pb-[env(safe-area-inset-bottom)]"
            >
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <SystemLogo size={40} className="rounded-xl" />
                  <span className="font-display text-xl tracking-wide">
                    {brand.siteName}
                  </span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 flex-1 px-4 pt-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-xl px-3 py-3 text-base font-medium transition-colors",
                      item.match(pathname)
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                {!loggedIn ? (
                  <>
                    <div className="my-3 h-px bg-border" />
                    <Link
                      href="/master/login"
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-semibold text-cta"
                    >
                      Acesso Master
                    </Link>
                    <Link
                      href="/time/login"
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-3 py-3 text-base font-medium text-foreground hover:bg-accent/50"
                    >
                      Acesso do time
                    </Link>
                  </>
                ) : null}
              </nav>
              <SheetFooter />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
