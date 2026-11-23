"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { AdminSearchField } from "@/components/admin/shared/AdminSearchField";
import type { Json } from "@/types/json";

export type AuditEntry = {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string | null;
  details: Json | null;
  createdAt: string;
};

type Props = {
  entries: AuditEntry[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

const actionColor: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  update: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
};

const entityLabel: Record<string, string> = {
  player: "Jogador",
  season: "Temporada",
  team: "Time",
  match: "Partida",
  match_lineup: "Escalação",
  match_officials: "Árbitros",
  match_player_ratings: "Notas",
  match_event: "Evento",
  role_permission: "Perfil",
  system_settings: "Configurações",
  user: "Usuário",
  membership: "Acesso",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLog({
  entries,
  page,
  pageCount,
  total,
  pageSize,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <AdminSearchField placeholder="Buscar por ação, e-mail, entidade…" />

      <ul className="rounded-xl border border-border/40 bg-card/20 divide-y divide-border/30 overflow-hidden">
        {entries.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum registro nesta página.
          </li>
        ) : (
          entries.map((e) => {
            const open = expanded.has(e.id);
            const hasDetails =
              e.details !== null &&
              e.details !== undefined &&
              typeof e.details === "object";

            return (
              <li key={e.id} className="px-4 py-3 hover:bg-muted/15">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                    {e.userEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase px-1.5 py-0 ${actionColor[e.action] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {e.action}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border/40"
                      >
                        {entityLabel[e.entityType] ?? e.entityType}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
                        {formatDate(e.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-snug">
                      {e.description || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {e.userEmail}
                    </p>
                    {hasDetails ? (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle(e.id)}
                          className="h-6 px-2 text-[11px] text-muted-foreground"
                        >
                          {open ? (
                            <ChevronDown className="h-3 w-3 mr-1" />
                          ) : (
                            <ChevronRight className="h-3 w-3 mr-1" />
                          )}
                          Detalhes
                        </Button>
                        {open ? (
                          <pre className="mt-1 text-[11px] bg-muted/40 border border-border/30 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(e.details, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <AdminPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
      />
    </div>
  );
}
