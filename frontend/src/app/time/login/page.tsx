"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoginScreenShell } from "@/components/auth/LoginScreenShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

function TeamLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("erro") === "sem-acesso"
      ? "Sua conta não tem painel de time. Peça ao Master um acesso de comissão ou capitão."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Credenciais inválidas");
      if (data.token) localStorage.setItem("sfl_token", data.token);

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      const me = await meRes.json();
      const memberships = me.memberships ?? [];
      const canTeam =
        Boolean(me.captain) ||
        memberships.some(
          (m: { role: string }) =>
            m.role === "team_staff" || m.role === "captain",
        );
      if (!canTeam) {
        setError(
          "Esta conta não tem acesso de time. Peça liberação ao Master em Acessos.",
        );
        return;
      }
      window.location.assign("/capitao");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground">
          Acesso do time
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Comissão técnica e capitão: cadastre jogadores e gerencie o elenco do
          seu time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <div
            className="rounded-xl border border-red-300/80 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="grid gap-2">
          <label htmlFor="team-email" className="text-sm font-medium">
            E-mail
          </label>
          <Input
            id="team-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="h-12 rounded-xl text-base"
            required
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="team-password" className="text-sm font-medium">
            Senha
          </label>
          <Input
            id="team-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-12 rounded-xl text-base"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-12 w-full rounded-full bg-cta text-cta-foreground text-sm font-black uppercase tracking-wide hover:bg-cta/90"
        >
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-muted-foreground">
          É administrador da liga?
        </p>
        <Link
          href="/master/login"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Acesso Master
        </Link>
      </div>
    </div>
  );
}

export default function TeamLoginPage() {
  return (
    <LoginScreenShell
      brandName="SFL Time"
      brandTo="/time/login"
      eyebrow="Painel do time"
      heroAlt="Elenco, escalação e o dia a dia da equipe"
    >
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Carregando…</p>
        }
      >
        <TeamLoginForm />
      </Suspense>
    </LoginScreenShell>
  );
}
