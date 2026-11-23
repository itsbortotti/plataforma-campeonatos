"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Wand2 } from "lucide-react";
import { generateFixtures } from "@/app/admin/partidas/actions";
import type { CompetitionFormat, Team } from "@/lib/queries";

type Props = {
  seasonId: string;
  teams: Team[];
  format: CompetitionFormat;
};

export function GenerateFixturesButton({ seasonId, teams, format }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(() =>
    teams.map((t) => t.id),
  );
  const [double, setDouble] = useState(false);
  const [replaceScheduled, setReplaceScheduled] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [pending, start] = useTransition();

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function run() {
    if (selected.length < 2) {
      toast.error("Selecione pelo menos 2 times");
      return;
    }
    start(async () => {
      const result = await generateFixtures({
        seasonId,
        teamIds: selected,
        double: format === "league" ? double : false,
        replaceScheduled,
        groupName:
          format === "groups_knockout" ? groupName.trim() || null : null,
      });
      if (result.success) {
        toast.success(`${result.created} partida(s) gerada(s)`);
        setOpen(false);
      } else {
        toast.error(result.error ?? "Falha ao gerar");
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Wand2 className="h-4 w-4 mr-1" />
        Gerar tabela
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerar confrontos (
              {format === "knockout"
                ? "mata-mata"
                : format === "groups_knockout"
                  ? "fase de grupos"
                  : "pontos corridos"}
              )
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {teams.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  <Checkbox
                    checked={selected.includes(t.id)}
                    onCheckedChange={() => toggle(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
            {format === "league" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={double}
                  onCheckedChange={(v) => setDouble(v === true)}
                />
                Ida e volta (turno e returno)
              </label>
            ) : null}
            {format === "groups_knockout" ? (
              <div className="space-y-2">
                <Label htmlFor="group">Nome do grupo (ex.: A)</Label>
                <Input
                  id="group"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="A"
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={replaceScheduled}
                onCheckedChange={(v) => setReplaceScheduled(v === true)}
              />
              Apagar partidas ainda agendadas antes de gerar
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={run} disabled={pending}>
                {pending ? "Gerando…" : "Gerar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
