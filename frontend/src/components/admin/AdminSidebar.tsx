"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Trophy,
  Shield,
  ScrollText,
  Menu,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  KeyRound,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SystemLogo } from "@/components/SystemLogo";
import { useBrand } from "@/components/BrandProvider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  keepSeason?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const STORAGE_KEY = "sfl-admin-sidebar-collapsed";

const navGroups: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      {
        href: "/admin",
        label: "Visão geral",
        icon: LayoutDashboard,
        exact: true,
        keepSeason: true,
      },
    ],
  },
  {
    id: "liga",
    label: "Liga",
    items: [
      { href: "/admin/campeonatos", label: "Campeonatos", icon: Trophy },
      { href: "/admin/times", label: "Times", icon: Shield },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { href: "/admin/usuarios", label: "Usuários", icon: UserCog },
      { href: "/admin/perfis", label: "Perfis de acesso", icon: KeyRound },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
      { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const searchParams = useSearchParams();
  const season = searchParams.get("season");

  return (
    <>
      {navGroups.map((group) => (
        <div
          key={group.id}
          className={collapsed ? "space-y-1" : "space-y-1 mb-4"}
        >
          {!collapsed ? (
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item);
            const href =
              item.keepSeason && season
                ? `${item.href}?season=${season}`
                : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  collapsed ? "justify-center px-2" : ""
                } ${
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon
                  className={`shrink-0 ${collapsed ? "h-5 w-5" : "h-4 w-4"}`}
                />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="pt-2 mt-2 border-t border-border/30">
        <Link
          href="/"
          onClick={onNavigate}
          title={collapsed ? "Voltar ao site" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors ${
            collapsed ? "justify-center px-2" : ""
          }`}
        >
          <ArrowLeft
            className={`shrink-0 ${collapsed ? "h-5 w-5" : "h-3.5 w-3.5"}`}
          />
          {!collapsed && "Voltar ao site"}
        </Link>
      </div>
    </>
  );
}

/** Sidebar flutuante no desktop — expandida ou rail de ícones. */
export function AdminSidebar() {
  const pathname = usePathname();
  const brand = useBrand();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const panelW = collapsed ? "w-[68px]" : "w-56";
  const spacerW = collapsed ? "w-[92px]" : "w-[248px]";

  return (
    <>
      {/* Reserva espaço para o painel fixo não cobrir o conteúdo */}
      <div
        aria-hidden
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out ${
          ready ? spacerW : "w-[248px]"
        }`}
      />

      <aside
        className={`hidden md:flex fixed z-50 top-3 bottom-3 left-3 flex-col overflow-y-auto rounded-2xl border border-border/50 bg-card/85 backdrop-blur-xl shadow-lg shadow-black/5 transition-[width] duration-200 ease-out ${panelW} ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 py-1.5 mb-3 ${
            collapsed ? "justify-center" : "px-2"
          }`}
        >
          <SystemLogo
            size={36}
            className="rounded-[10px] ring-1 ring-border/60"
          />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-black tracking-tight truncate">
                {brand.siteName}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {brand.masterLabel}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1">
          <NavLinks pathname={pathname} collapsed={collapsed} />
        </nav>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={`flex items-center rounded-lg px-3 py-2.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors ${
            collapsed ? "justify-center px-2" : "gap-3"
          }`}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </aside>
    </>
  );
}

export function AdminMobileMenu() {
  const pathname = usePathname();
  const brand = useBrand();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir menu"
          />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 bg-background border-border flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SystemLogo size={32} className="rounded-[8px]" />
            <span className="text-sm font-black uppercase tracking-widest text-primary">
              {brand.masterLabel}
            </span>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-4 flex-1">
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
