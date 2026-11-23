"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Save, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveRolePermissions } from "@/app/admin/perfis/actions";

export type CapabilityDef = {
  id: string;
  label: string;
  group: "liga" | "partida" | "time" | "sistema";
};

export type ProfileMeta = {
  label: string;
  description: string;
  needsTeam: boolean;
};

type RoleKey = "owner" | "league_admin" | "team_staff" | "captain";

const GROUP_LABEL: Record<CapabilityDef["group"], string> = {
  liga: "Liga",
  partida: "Partidas",
  time: "Painel do time",
  sistema: "Sistema",
};

const ROLE_ORDER: RoleKey[] = [
  "owner",
  "league_admin",
  "team_staff",
  "captain",
];

type Props = {
  catalog: CapabilityDef[];
  profiles: Record<string, ProfileMeta>;
  permissions: Record<string, Record<string, boolean>>;
};

export function RolePermissionsEditor({
  catalog,
  profiles,
  permissions: initial,
}: Props) {
  const [selected, setSelected] = useState<RoleKey>("league_admin");
  const [draft, setDraft] = useState(initial);
  const [pending, startTransition] = useTransition();

  const meta = profiles[selected];
  const caps = draft[selected] ?? {};

  const groups = useMemo(() => {
    const map = new Map<CapabilityDef["group"], CapabilityDef[]>();
    for (const c of catalog) {
      const list = map.get(c.group) ?? [];
      list.push(c);
      map.set(c.group, list);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const dirty = useMemo(() => {
    const a = initial[selected] ?? {};
    const b = draft[selected] ?? {};
    return catalog.some((c) => Boolean(a[c.id]) !== Boolean(b[c.id]));
  }, [initial, draft, selected, catalog]);

  function toggle(capability: string) {
    setDraft((prev) => ({
      ...prev,
      [selected]: {
        ...(prev[selected] ?? {}),
        [capability]: !prev[selected]?.[capability],
      },
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveRolePermissions(selected, draft[selected] ?? {});
      if (result.success && result.data) {
        setDraft(result.data.permissions);
        toast.success(`Permissões de ${meta?.label ?? selected} salvas`);
      } else {
        toast.error(result.error ?? "Erro ao salvar");
      }
    });
  }

  const saveButton = (
    <Button
      size="sm"
      onClick={handleSave}
      disabled={!dirty || pending}
      className="gap-1"
    >
      <Save className="h-3.5 w-3.5" />
      {pending ? "Salvando…" : "Salvar"}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Escolha o perfil e marque o que cada um pode fazer no painel.
        </p>
        {saveButton}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border/40 bg-card/20 overflow-hidden h-fit">
          <div className="border-b border-border/40 px-4 py-3">
            <h2 className="text-base font-black tracking-tight">Perfis</h2>
          </div>
          <ul className="divide-y divide-border/40">
            {ROLE_ORDER.map((role) => {
              const p = profiles[role];
              const active = selected === role;
              return (
                <li key={role}>
                  <button
                    type="button"
                    onClick={() => setSelected(role)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    <Shield className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {p?.label ?? role}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px] line-clamp-2 mt-0.5",
                          active
                            ? "text-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {p?.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-base font-black tracking-tight">
                {meta?.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {meta?.description}
                {meta?.needsTeam
                  ? " · exige time na atribuição."
                  : " · vale para o campeonato inteiro."}
              </p>
            </div>
            {saveButton}
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {groups.map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABEL[group]}
                </p>
                <ul className="rounded-xl border border-border/40 bg-background/30 divide-y divide-border/40 overflow-hidden">
                  {items.map((cap) => {
                    const on = Boolean(caps[cap.id]);
                    return (
                      <li key={cap.id}>
                        <button
                          type="button"
                          onClick={() => toggle(cap.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/15 transition-colors"
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded border shrink-0",
                              on
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-background",
                            )}
                          >
                            {on ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span className="text-sm flex-1 font-medium">
                            {cap.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {on ? "Permitido" : "Negado"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
