"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTeam, updateTeam } from "@/app/admin/times/actions";
import type { Team } from "@/lib/queries";

interface Props {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = { success: false, error: null as string | null };

const DEFAULT_PRIMARY = "#1f2937";
const DEFAULT_SECONDARY = "#ffffff";

export function TeamDialog({ team, open, onOpenChange }: Props) {
  const isEdit = team !== null;
  const action = isEdit ? updateTeam : createTeam;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(team?.name ?? "");
  const [shortName, setShortName] = useState(team?.shortName ?? "");
  const [slug, setSlug] = useState(team?.slug ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    team?.primaryColor ?? DEFAULT_PRIMARY,
  );
  const [secondaryColor, setSecondaryColor] = useState(
    team?.secondaryColor ?? DEFAULT_SECONDARY,
  );
  const [logoUrl, setLogoUrl] = useState(team?.logoUrl ?? "");

  useEffect(() => {
    setName(team?.name ?? "");
    setShortName(team?.shortName ?? "");
    setSlug(team?.slug ?? "");
    setPrimaryColor(team?.primaryColor ?? DEFAULT_PRIMARY);
    setSecondaryColor(team?.secondaryColor ?? DEFAULT_SECONDARY);
    setLogoUrl(team?.logoUrl ?? "");
  }, [team, open]);

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state.success) {
      toast.success(isEdit ? "Time salvo" : "Time criado");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, onOpenChange]);

  function handleSubmit() {
    const fd = new FormData();
    if (isEdit) fd.set("id", team.id);
    fd.set("name", name);
    fd.set("shortName", shortName);
    fd.set("slug", slug);
    fd.set("primaryColor", primaryColor);
    fd.set("secondaryColor", secondaryColor);
    fd.set("logoUrl", logoUrl);
    startTransition(() => formAction(fd));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Time" : "Novo Time"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tormento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortName">Nome curto</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) =>
                  setShortName(e.target.value.toUpperCase().slice(0, 5))
                }
                placeholder="TOR"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="tormento"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-xs uppercase"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-8 w-10 p-1 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo (URL)</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/images/time.png"
            />
          </div>


          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
