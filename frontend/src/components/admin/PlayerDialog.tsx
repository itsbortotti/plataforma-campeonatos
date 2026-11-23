"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Upload, Trash2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createPlayer, updatePlayer } from "@/app/admin/jogadores/actions";
import type { AuthUser, PlayerWithRoster, Team } from "@/lib/queries";

const positions = [
  { value: "GOL", label: "Goleiro" },
  { value: "ZAG", label: "Zagueiro" },
  { value: "LAT", label: "Lateral" },
  { value: "VOL", label: "Volante" },
  { value: "MEI", label: "Meia" },
  { value: "ATA", label: "Atacante" },
] as const;

const PHOTOS_BUCKET = "player-photos";
const MAX_BYTES = 5 * 1024 * 1024;

interface Props {
  player: PlayerWithRoster | null;
  teams: Team[];
  authUsers: AuthUser[];
  seasonId: string;
  usedNumbersByTeam: Record<string, number[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function nextFreeNumber(used: number[], exclude?: number | null): number | null {
  const taken = new Set(used);
  if (exclude != null) taken.delete(exclude);
  for (let n = 1; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return null;
}

const initialState = { success: false, error: null as string | null };

function TeamOption({ team }: { team: Team }) {
  return (
    <span className="flex items-center gap-2">
      {team.logoUrl && (
        <Image
          src={team.logoUrl}
          alt=""
          width={16}
          height={16}
          className="object-contain shrink-0"
        />
      )}
      {team.name}
    </span>
  );
}

export function PlayerDialog({
  player,
  teams,
  authUsers,
  seasonId,
  usedNumbersByTeam,
  open,
  onOpenChange,
}: Props) {
  const isEdit = player !== null;
  const action = isEdit ? updatePlayer : createPlayer;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedTeamId, setSelectedTeamId] = useState(
    player?.roster?.teamId ?? "none",
  );
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const [isCaptain, setIsCaptain] = useState(
    player?.roster?.isCaptain ?? false,
  );
  const [selectedUserId, setSelectedUserId] = useState(
    player?.userId ?? "none",
  );
  const [isActive, setIsActive] = useState(player?.isActive ?? true);
  const [number, setNumber] = useState<string>(
    player?.roster?.number != null ? String(player.roster.number) : "",
  );

  // Photo state:
  //  - existingPhotoUrl: value persisted in DB
  //  - stagedFile: file chosen in this session but NOT yet uploaded
  //  - removeExisting: user clicked "Remover" over the persisted photo
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(
    player?.photoUrl ?? null,
  );
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state.success) {
      toast.success(isEdit ? "Jogador salvo" : "Jogador criado");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  // Reset when dialog opens for a different player.
  useEffect(() => {
    setSelectedTeamId(player?.roster?.teamId ?? "none");
    setExistingPhotoUrl(player?.photoUrl ?? null);
    setStagedFile(null);
    setRemoveExisting(false);
    setUploadError(null);
    setIsCaptain(player?.roster?.isCaptain ?? false);
    setSelectedUserId(player?.userId ?? "none");
    setIsActive(player?.isActive ?? true);
    setNumber(
      player?.roster?.number != null ? String(player.roster.number) : "",
    );
  }, [player, open]);

  // When the team changes (and it's not the persisted team), suggest the next
  // free sequential number for the new team. Avulso clears the number.
  useEffect(() => {
    if (!open) return;
    if (selectedTeamId === "none") {
      setNumber("");
      return;
    }
    const persistedTeamId = player?.roster?.teamId ?? null;
    const persistedNumber = player?.roster?.number ?? null;
    if (selectedTeamId === persistedTeamId && persistedNumber != null) {
      setNumber(String(persistedNumber));
      return;
    }
    const used = usedNumbersByTeam[selectedTeamId] ?? [];
    const exclude =
      selectedTeamId === persistedTeamId ? persistedNumber : null;
    const next = nextFreeNumber(used, exclude);
    setNumber(next != null ? String(next) : "");
  }, [selectedTeamId, player, usedNumbersByTeam, open]);

  // Preview URL — prefers the staged file (via blob URL), falls back to
  // the persisted photo unless the user explicitly removed it.
  const previewUrl = useMemo(() => {
    if (stagedFile) return URL.createObjectURL(stagedFile);
    if (removeExisting) return null;
    return existingPhotoUrl;
  }, [stagedFile, removeExisting, existingPhotoUrl]);

  // Revoke blob URL when the staged file changes or dialog closes.
  useEffect(() => {
    if (!stagedFile) return;
    const url = URL.createObjectURL(stagedFile);
    return () => URL.revokeObjectURL(url);
  }, [stagedFile]);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setUploadError("Imagem maior que 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Arquivo precisa ser uma imagem.");
      return;
    }

    setUploadError(null);
    setStagedFile(file);
    setRemoveExisting(false);
  }

  function handleRemovePhoto() {
    setStagedFile(null);
    setRemoveExisting(true);
    setUploadError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    if (isEdit) fd.set("id", player.id);
    fd.set("seasonId", seasonId);
    fd.set("teamId", selectedTeamId === "none" ? "" : selectedTeamId);
    fd.set("isCaptain", isCaptain ? "true" : "false");
    fd.set("userId", selectedUserId === "none" ? "" : selectedUserId);
    fd.set("isActive", isActive ? "true" : "false");

    // Resolve final photoUrl via local API storage.
    let finalPhotoUrl: string | null = existingPhotoUrl;
    if (stagedFile) {
      setUploading(true);
      setUploadError(null);
      try {
        const body = new FormData();
        body.append("file", stagedFile);
        if (player?.id) body.append("playerId", player.id);
        const res = await fetch("/api/storage/player-photos", {
          method: "POST",
          credentials: "include",
          body,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no upload");
        finalPhotoUrl = data.url;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao enviar a imagem.";
        setUploadError(message);
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (removeExisting) {
      finalPhotoUrl = null;
    }

    fd.set("photoUrl", finalPhotoUrl ?? "");
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Jogador" : "Novo Jogador"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo uploader */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-accent/30 border border-border/40 shrink-0 flex items-center justify-center">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              ) : (
                <User className="h-7 w-7 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label>Foto</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || pending}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {previewUrl ? "Trocar" : "Selecionar"}
                </Button>
                {previewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="text-destructive hover:text-destructive"
                    disabled={uploading || pending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Até 5 MB - JPEG, PNG, WebP ou AVIF. Envio acontece ao salvar.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handlePickFile}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Apelido</Label>
              <Input
                id="nickname"
                name="nickname"
                defaultValue={player?.nickname ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                name="name"
                defaultValue={player?.name ?? ""}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Posição</Label>
            <Select
              name="position"
              defaultValue={player?.position ?? undefined}
              items={positions.map((p) => ({ value: p.value, label: p.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={player?.email ?? ""}
              placeholder="jogador@exemplo.com"
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground">
              Quando essa pessoa logar com Google usando esse email, a conta
              dela é vinculada automaticamente ao jogador.
              {player?.userId && (
                <span className="block text-emerald-400 mt-0.5">
                  Conta já vinculada.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
            />
            <Label
              htmlFor="isActive"
              className="text-sm font-normal cursor-pointer"
            >
              Jogador ativo
            </Label>
            <span className="text-[10px] text-muted-foreground ml-1">
              (inativos não aparecem em escalações nem novos eventos)
            </span>
          </div>

          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Elenco na temporada
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamId">Time</Label>
                <Select
                  value={selectedTeamId}
                  onValueChange={(v) => setSelectedTeamId(v ?? "none")}
                >
                  <SelectTrigger className="w-full">
                    {selectedTeam ? (
                      <TeamOption team={selectedTeam} />
                    ) : (
                      <span className="text-muted-foreground">Avulso</span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Avulso</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <TeamOption team={t} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Camisa</Label>
                <Input
                  id="number"
                  name="number"
                  type="number"
                  min={1}
                  max={99}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="-"
                  disabled={selectedTeamId === "none"}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isCaptain"
                checked={isCaptain}
                onCheckedChange={(v) => setIsCaptain(v === true)}
              />
              <Label
                htmlFor="isCaptain"
                className="text-sm font-normal cursor-pointer"
              >
                Capitão do time
              </Label>
            </div>

            {isCaptain && (
              <div className="space-y-2 mt-4">
                <Label>Conta do capitão</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={(v) => setSelectedUserId(v ?? "none")}
                >
                  <SelectTrigger className="w-full">
                    {selectedUserId !== "none" ? (
                      <span className="truncate">
                        {authUsers.find((u) => u.id === selectedUserId)
                          ?.displayName ?? "Usuário"}{" "}
                        <span className="text-muted-foreground">
                          (
                          {
                            authUsers.find((u) => u.id === selectedUserId)
                              ?.email
                          }
                          )
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Selecionar usuário...
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {authUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  O capitão precisa ter feito login no site pelo menos uma vez
                  para aparecer aqui.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={uploading || pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading || pending}>
              {uploading
                ? "Enviando foto..."
                : pending
                  ? "Salvando..."
                  : isEdit
                    ? "Salvar"
                    : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
