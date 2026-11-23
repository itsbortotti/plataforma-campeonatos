"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TeamDialog } from "./TeamDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { AdminSearchField } from "@/components/admin/shared/AdminSearchField";
import { deleteTeam } from "@/app/admin/times/actions";
import type { Team } from "@/lib/queries";

interface Props {
  teams: Team[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-5 w-5 rounded border border-border/50"
      style={{ background: color }}
      title={color}
    />
  );
}

function TeamBadge({ team }: { team: Team }) {
  if (team.logoUrl) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={28}
        height={28}
        className="object-contain"
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center h-7 w-7 rounded text-[10px] font-black text-white"
      style={{ background: team.primaryColor }}
    >
      {team.shortName.slice(0, 3)}
    </span>
  );
}

export function TeamsTable({
  teams,
  page,
  pageCount,
  total,
  pageSize,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setDialogOpen(true);
  }

  function handleDeleteConfirm(reason: string) {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteTeam(deleteTarget.id, reason);
      if (result.success) {
        toast.success("Time excluído");
        setDeleteTarget(null);
        setDeleteError(null);
      } else {
        toast.error(result.error ?? "Erro ao excluir time");
        setDeleteError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <AdminSearchField placeholder="Buscar por nome, abreviação ou slug…" />
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo time
        </Button>
      </div>

      <ul className="rounded-xl border border-border/40 bg-card/20 divide-y divide-border/30 overflow-hidden">
        {teams.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum time nesta página.
          </li>
        ) : (
          teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/15"
            >
              <TeamBadge team={team} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{team.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {team.shortName} · {team.slug}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ColorSwatch color={team.primaryColor} />
                <ColorSwatch color={team.secondaryColor} />
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(team)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteTarget(team);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <AdminPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
      />

      <TeamDialog
        team={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={`Excluir ${deleteTarget?.name ?? ""}?`}
        description={`Tem certeza que deseja excluir o time ${deleteTarget?.name ?? ""}? Esta ação não pode ser desfeita e só é permitida se o time não tiver vínculos (partidas, elencos, etc).`}
        confirmLabel="Excluir time"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
