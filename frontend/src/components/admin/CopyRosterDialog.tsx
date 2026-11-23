"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { copyRosterFromSeason } from "@/app/admin/jogadores/actions";
import type { Season } from "@/lib/queries";

interface Props {
  toSeasonId: string;
  toSeasonName: string;
  sourceSeasons: Season[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CopyRosterDialog({
  toSeasonId,
  toSeasonName,
  sourceSeasons,
  open,
  onOpenChange,
}: Props) {
  const [fromSeasonId, setFromSeasonId] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    copied: number;
    skipped: number;
    total: number;
  } | null>(null);

  function handleCopy() {
    if (!fromSeasonId) return;
    setError(null);
    startTransition(async () => {
      const res = await copyRosterFromSeason(fromSeasonId, toSeasonId);
      if (!res.success) {
        toast.error(res.error ?? "Erro ao copiar elenco");
        setError(res.error);
        return;
      }
      toast.success(`${res.copied} jogadores copiados`);
      setResult({ copied: res.copied, skipped: res.skipped, total: res.total });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar elenco de outra temporada</DialogTitle>
        </DialogHeader>

        {sourceSeasons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não há outras temporadas para copiar.
          </p>
        ) : result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 p-4 space-y-1 text-sm">
              <p>
                <span className="font-semibold text-emerald-400">
                  {result.copied}
                </span>{" "}
                jogadores copiados para{" "}
                <span className="font-semibold">{toSeasonName}</span>.
              </p>
              {result.skipped > 0 && (
                <p className="text-muted-foreground">
                  {result.skipped} já estavam no elenco atual e foram ignorados.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copia todos os jogadores do elenco da temporada escolhida para{" "}
              <span className="font-semibold text-foreground">
                {toSeasonName}
              </span>
              , mantendo time e número. Jogadores que já estão no elenco atual
              não são alterados.
            </p>

            <div className="space-y-2">
              <Label htmlFor="fromSeason">Copiar de</Label>
              <Select
                value={fromSeasonId}
                onValueChange={(v) => setFromSeasonId(v ?? "")}
                items={sourceSeasons.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a temporada..." />
                </SelectTrigger>
                <SelectContent>
                  {sourceSeasons.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCopy}
                disabled={pending || !fromSeasonId}
              >
                {pending ? "Copiando..." : "Copiar elenco"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
