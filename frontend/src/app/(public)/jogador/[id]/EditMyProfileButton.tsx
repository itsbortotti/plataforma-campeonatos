"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateMyProfile } from "./actions";

interface Props {
  readonly initialNickname: string;
  readonly initialPhotoUrl: string | null;
}

export function EditMyProfileButton({
  initialNickname,
  initialPhotoUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(initialNickname);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl ?? "");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!nickname.trim()) {
      toast.error("Apelido obrigatório.");
      return;
    }
    startTransition(async () => {
      const result = await updateMyProfile(
        nickname,
        photoUrl.trim() || null,
      );
      if (result.success) {
        toast.success("Perfil atualizado");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Erro ao atualizar perfil");
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setNickname(initialNickname);
          setPhotoUrl(initialPhotoUrl ?? "");
          setOpen(true);
        }}
        className="gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm">
                Apelido
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Pelé"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photoUrl" className="text-sm">
                Foto (URL)
              </Label>
              <Input
                id="photoUrl"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-[10px] text-muted-foreground">
                Cole aqui o link de uma imagem pública. Deixe em branco pra
                remover.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
