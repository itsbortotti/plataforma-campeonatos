"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { AdminSearchField } from "@/components/admin/shared/AdminSearchField";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUserWithProfile,
  deleteUser,
  grantMembership,
  revokeMembership,
  updateUser,
} from "@/app/admin/usuarios/actions";

type ProfileRole = "owner" | "league_admin" | "team_staff" | "captain";

const PROFILE_OPTIONS: Array<{
  value: ProfileRole;
  label: string;
  needsTeam: boolean;
}> = [
  { value: "owner", label: "Owner", needsTeam: false },
  { value: "league_admin", label: "Admin da liga", needsTeam: false },
  { value: "team_staff", label: "Comissão técnica", needsTeam: true },
  { value: "captain", label: "Capitão", needsTeam: true },
];

const roleLabel: Record<string, string> = Object.fromEntries(
  PROFILE_OPTIONS.map((p) => [p.value, p.label]),
);

export type MembershipBadge = {
  id: string;
  role: string;
  competitionId: string;
  competitionName: string;
  teamId: string | null;
  teamName: string | null;
};

export interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly isAdmin: boolean;
  readonly playerId: string | null;
  readonly playerNickname: string | null;
  readonly memberships: MembershipBadge[];
}

type Props = {
  users: UserRow[];
  competitions: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
};

type CreateForm = {
  email: string;
  displayName: string;
  password: string;
  competitionId: string;
  role: ProfileRole;
  teamId: string;
};

type GrantForm = {
  competitionId: string;
  role: ProfileRole;
  teamId: string;
};

export function UsersList({
  users,
  competitions,
  teams,
  page,
  pageCount,
  total,
  pageSize,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<UserRow | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const [createForm, setCreateForm] = useState<CreateForm>({
    email: "",
    displayName: "",
    password: "",
    competitionId: competitions[0]?.id ?? "",
    role: "league_admin",
    teamId: teams[0]?.id ?? "",
  });

  const [grantForm, setGrantForm] = useState<GrantForm>({
    competitionId: competitions[0]?.id ?? "",
    role: "team_staff",
    teamId: teams[0]?.id ?? "",
  });

  function needsTeam(role: ProfileRole) {
    return role === "team_staff" || role === "captain";
  }

  function openCreate() {
    setCreateForm({
      email: "",
      displayName: "",
      password: "",
      competitionId: competitions[0]?.id ?? "",
      role: "league_admin",
      teamId: teams[0]?.id ?? "",
    });
    setCreateOpen(true);
  }

  function openGrant(user: UserRow) {
    setGrantUser(user);
    setGrantForm({
      competitionId: competitions[0]?.id ?? "",
      role: "team_staff",
      teamId: teams[0]?.id ?? "",
    });
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setEditName(user.displayName);
    setEditPassword("");
  }

  function handleCreate() {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      toast.error("Email e senha são obrigatórios.");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (!createForm.competitionId) {
      toast.error("Escolha o campeonato.");
      return;
    }
    if (needsTeam(createForm.role) && !createForm.teamId) {
      toast.error("Escolha o time deste perfil.");
      return;
    }

    startTransition(async () => {
      const result = await createUserWithProfile({
        email: createForm.email.trim(),
        password: createForm.password,
        displayName: createForm.displayName.trim() || undefined,
        role: createForm.role,
        competitionId: createForm.competitionId,
        teamId: needsTeam(createForm.role) ? createForm.teamId : null,
      });
      if (result.success) {
        toast.success("Usuário criado com perfil");
        setCreateOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao criar");
      }
    });
  }

  function handleGrant() {
    if (!grantUser) return;
    if (!grantForm.competitionId) {
      toast.error("Escolha o campeonato.");
      return;
    }
    if (needsTeam(grantForm.role) && !grantForm.teamId) {
      toast.error("Escolha o time deste perfil.");
      return;
    }
    startTransition(async () => {
      const result = await grantMembership({
        userId: grantUser.id,
        role: grantForm.role,
        competitionId: grantForm.competitionId,
        teamId: needsTeam(grantForm.role) ? grantForm.teamId : null,
      });
      if (result.success) {
        toast.success("Perfil atribuído");
        setGrantUser(null);
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleEditSave() {
    if (!editing) return;
    if (editPassword && editPassword.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres.");
      return;
    }
    startTransition(async () => {
      const result = await updateUser(editing.id, {
        displayName: editName.trim() || null,
        password: editPassword || undefined,
      });
      if (result.success) {
        toast.success("Usuário atualizado");
        setEditing(null);
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeMembership(id);
      if (result.success) toast.success("Perfil removido");
      else toast.error(result.error ?? "Erro");
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteUser(deleteTarget.id);
      if (result.success) {
        toast.success("Usuário removido");
        setDeleteTarget(null);
      } else {
        toast.error(result.error ?? "Erro ao remover");
      }
    });
  }

  function ProfileFields({
    competitionId,
    role,
    teamId,
    onCompetition,
    onRole,
    onTeam,
  }: {
    competitionId: string;
    role: ProfileRole;
    teamId: string;
    onCompetition: (v: string) => void;
    onRole: (v: ProfileRole) => void;
    onTeam: (v: string) => void;
  }) {
    const teamRequired = needsTeam(role);
    return (
      <>
        <div className="space-y-1.5">
          <Label>Campeonato</Label>
          <Select value={competitionId} onValueChange={(v) => onCompetition(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Campeonato" />
            </SelectTrigger>
            <SelectContent>
              {competitions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Perfil de acesso</Label>
          <Select
            value={role}
            onValueChange={(v) => onRole((v as ProfileRole) ?? "league_admin")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFILE_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {teamRequired
              ? "Perfil de time — escolha o clube abaixo."
              : "Perfil da liga — vale para o campeonato inteiro."}
          </p>
        </div>
        {teamRequired ? (
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Select value={teamId} onValueChange={(v) => onTeam(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <AdminSearchField placeholder="Buscar por e-mail ou nome…" />
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo usuário
        </Button>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/20 divide-y divide-border/30 overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum usuário encontrado.
          </p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                {u.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <p className="text-sm font-medium truncate">{u.displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {u.email}
                    {u.isAdmin ? " · acesso ao Master" : ""}
                  </p>
                </div>
                {u.memberships.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/70 italic">
                    Sem perfil de acesso
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {u.memberships.map((m) => (
                      <Badge
                        key={m.id}
                        variant="secondary"
                        className="gap-1 pr-1 font-normal"
                      >
                        <span>
                          {roleLabel[m.role] ?? m.role}
                          {m.teamName ? ` · ${m.teamName}` : ""}
                          <span className="text-muted-foreground">
                            {" "}
                            · {m.competitionName}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive"
                          disabled={pending}
                          title="Remover perfil"
                          onClick={() => handleRevoke(m.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openGrant(u)}
                  disabled={pending}
                  title="Dar perfil"
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" />
                  Perfil
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(u)}
                  disabled={pending}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(u)}
                  disabled={pending}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nome</Label>
              <Input
                id="displayName"
                value={createForm.displayName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, displayName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <ProfileFields
              competitionId={createForm.competitionId}
              role={createForm.role}
              teamId={createForm.teamId}
              onCompetition={(v) =>
                setCreateForm((f) => ({ ...f, competitionId: v }))
              }
              onRole={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              onTeam={(v) => setCreateForm((f) => ({ ...f, teamId: v }))}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={pending}>
              {pending ? "Salvando…" : "Criar e dar acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={grantUser !== null}
        onOpenChange={(o) => !o && !pending && setGrantUser(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dar perfil</DialogTitle>
          </DialogHeader>
          {grantUser ? (
            <p className="text-sm text-muted-foreground -mt-1">
              {grantUser.displayName} · {grantUser.email}
            </p>
          ) : null}
          <div className="space-y-3">
            <ProfileFields
              competitionId={grantForm.competitionId}
              role={grantForm.role}
              teamId={grantForm.teamId}
              onCompetition={(v) =>
                setGrantForm((f) => ({ ...f, competitionId: v }))
              }
              onRole={(v) => setGrantForm((f) => ({ ...f, role: v }))}
              onTeam={(v) => setGrantForm((f) => ({ ...f, teamId: v }))}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setGrantUser(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleGrant} disabled={pending}>
              {pending ? "Salvando…" : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && !pending && setEditing(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={editing?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha (opcional)</Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Deixe em branco para manter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && !pending && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir usuário?</DialogTitle>
          </DialogHeader>
          {deleteTarget ? (
            <p className="text-sm text-muted-foreground">
              Remover {deleteTarget.email} e os perfis vinculados?
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
