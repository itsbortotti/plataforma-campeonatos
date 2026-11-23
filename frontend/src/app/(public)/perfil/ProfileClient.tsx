"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Shield, Trophy, UserRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  league_admin: "Admin da liga",
  team_staff: "Comissão técnica",
  captain: "Capitão",
};

const roleTone: Record<string, string> = {
  owner: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  league_admin:
    "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  team_staff:
    "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  captain:
    "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

type Props = {
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
  player: {
    id: string;
    nickname: string;
    photoUrl: string | null;
    name: string;
  } | null;
  memberships: Array<{
    id: string;
    role: string;
    competitionSlug: string;
    competitionName: string;
    teamId: string | null;
    teamName: string | null;
  }>;
};

export function ProfileClient({ user, player, memberships }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const body: { displayName: string | null; password?: string } = {
        displayName: displayName.trim() || null,
      };
      if (password.trim()) body.password = password.trim();
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar");
        return;
      }
      toast.success("Perfil atualizado");
      setPassword("");
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border/40 p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Email
          </p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Nome de exibição</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha (opcional)</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <Button onClick={save} disabled={pending} size="sm">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Papéis
        </h2>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/50 px-4 py-6 text-center">
            Nenhum acesso especial concedido.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/campeonato/${m.competitionSlug}`}
                  className="group flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 px-3.5 py-3.5 transition-colors hover:bg-accent/30 sm:items-center sm:px-4"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mt-0">
                    <Shield className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border text-[10px] font-semibold uppercase tracking-wide",
                        roleTone[m.role] ?? "",
                      )}
                    >
                      {roleLabel[m.role] ?? m.role}
                    </Badge>
                    <span className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Trophy className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline" />
                        {m.competitionName}
                      </span>
                      {m.teamName ? (
                        <span className="text-xs text-muted-foreground">
                          Time · {m.teamName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Acesso à liga
                        </span>
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "shrink-0 gap-1 pointer-events-none group-hover:bg-accent",
                    )}
                  >
                    Ver
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {player ? (
        <section className="rounded-xl border border-border/40 bg-card/40 p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Jogador vinculado
          </p>
          <Link
            href={`/jogador/${player.id}`}
            className="group flex items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
              {player.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold truncate">
                {player.nickname}
              </span>
              <span className="block text-xs text-muted-foreground truncate">
                {player.name}
              </span>
            </span>
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 gap-1 pointer-events-none group-hover:bg-accent",
              )}
            >
              Perfil
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
