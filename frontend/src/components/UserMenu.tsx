"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

type Me = {
  user: { email: string; role: string; displayName: string | null };
  captain: { teamId: string } | null;
  player: { id: string; nickname: string; photoUrl: string | null } | null;
  memberships?: Array<{ role: string; teamId: string | null }>;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  return parts[0];
}

export function UserMenu() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("sfl_token");
    setMe(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  if (me === undefined) {
    return (
      <div
        className="h-8 w-24 animate-pulse rounded-full bg-white/10"
        aria-hidden
      />
    );
  }

  if (!me) {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 text-[11px] font-black uppercase tracking-wide text-cta-foreground shadow-sm hover:brightness-110 transition"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <UserRound className="h-4 w-4" />
          Acessar
          <ChevronDown
            className={cn("h-3.5 w-3.5 opacity-70 transition", open && "rotate-180")}
          />
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 min-w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => go("/master/login")}
            >
              <Shield className="h-4 w-4" />
              Acesso Master
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => go("/time/login")}
            >
              <Users className="h-4 w-4" />
              Acesso do time
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const memberships = me.memberships ?? [];
  const canMaster =
    me.user.role === "admin" ||
    memberships.some(
      (m) => m.role === "owner" || m.role === "league_admin",
    );
  const isCaptain =
    Boolean(me.captain) || memberships.some((m) => m.role === "captain");
  const isStaff = memberships.some((m) => m.role === "team_staff");
  const canTeam = isCaptain || isStaff;

  const label =
    me.player?.nickname ||
    me.user.displayName ||
    me.user.email.split("@")[0];
  const roleLabel = canMaster
    ? "Master"
    : canTeam
      ? isCaptain
        ? "Capitão"
        : "Comissão"
      : "Conta";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1 pr-2.5 text-white hover:bg-white/15 transition"
        aria-label={`Conta de ${label}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cta text-[10px] font-black text-cta-foreground">
          {initials(label)}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span className="text-xs font-semibold max-w-[110px] truncate">
            {shortName(label)}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-brand-bar-foreground/75">
            {roleLabel}
          </span>
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 opacity-70 transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <div className="px-2 py-1.5">
            <p className="text-sm font-semibold truncate">{label}</p>
            <p className="text-xs text-muted-foreground truncate">
              {me.user.email}
            </p>
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => go("/perfil")}
          >
            <UserRound className="h-4 w-4" />
            Meu perfil
          </button>
          {canMaster ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => go("/admin/jogadores")}
            >
              <Shield className="h-4 w-4" />
              Painel Master
            </button>
          ) : null}
          {canTeam ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => go("/capitao")}
            >
              <Users className="h-4 w-4" />
              Painel do time
            </button>
          ) : null}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
