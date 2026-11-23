"use client";

import { useState } from "react";
import { LoginScreenShell } from "@/components/auth/LoginScreenShell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function MasterLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError("Digite o usuário Master ou o e-mail da conta.");
      return;
    }
    if (!password) {
      setError("Digite a senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            "E-mail ou senha incorretos. Confira e tente de novo.",
        );
      }
      if (data.token) localStorage.setItem("sfl_token", data.token);

      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        credentials: "include",
      });
      const me = await meRes.json();
      const memberships = me.memberships ?? [];
      const canMaster =
        me.user?.role === "admin" ||
        memberships.some(
          (m: { role: string }) =>
            m.role === "owner" || m.role === "league_admin",
        );
      if (!canMaster) {
        setError(
          "Esta conta não tem acesso Master. Peça um perfil Admin da liga ou Owner.",
        );
        return;
      }
      window.location.assign("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginScreenShell
      brandName="SFL Master"
      brandTo="/master/login"
      eyebrow="Painel administrativo"
      heroAlt="Campeonatos, times e partidas sob controle"
    >
      <div className="flex flex-col gap-7">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground">
            Acesso Master
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gerencie campeonatos, times, jogos e o que acontece em cada
            partida.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          {error ? (
            <div
              className="rounded-xl border border-red-300/80 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="master-email" className="text-sm font-medium">
              Usuário ou e-mail
            </label>
            <Input
              id="master-email"
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="master"
              className="h-12 rounded-xl text-base"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="master-password" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="master-password"
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
            {loading ? "Entrando..." : "Entrar no Master"}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            É comissão ou capitão?
          </p>
          <Link
            href="/time/login"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Acesso do time
          </Link>
        </div>
      </div>
    </LoginScreenShell>
  );
}
