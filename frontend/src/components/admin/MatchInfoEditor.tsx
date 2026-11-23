"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { updateMatchInfo } from "@/app/admin/partidas/[id]/actions";
import type { MatchWithTeams } from "@/lib/queries";

function parseMatchDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

interface Props {
  match: MatchWithTeams;
}

export function MatchInfoEditor({ match }: Props) {
  const [round, setRound] = useState(String(match.round));
  const [date, setDate] = useState<Date | undefined>(
    parseMatchDate(match.date),
  );
  const [venue, setVenue] = useState(match.venue);
  const [youtubeUrl, setYoutubeUrl] = useState(match.youtubeUrl ?? "");
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    round !== String(match.round) ||
    date?.toISOString().slice(0, 10) !== match.date ||
    venue !== match.venue ||
    (youtubeUrl || null) !== (match.youtubeUrl || null);

  function handleSave() {
    if (!date) {
      toast.error("Selecione uma data.");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    startTransition(async () => {
      const result = await updateMatchInfo({
        matchId: match.id,
        round: parseInt(round, 10),
        date: dateStr,
        venue: venue.trim(),
        youtubeUrl: youtubeUrl.trim() || null,
      });
      if (result.success) {
        toast.success("Partida atualizada.");
      } else {
        toast.error(result.error ?? "Erro ao atualizar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Rodada</Label>
          <Input
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Data</Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  data-empty={!date}
                  className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                />
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date
                ? format(date, "dd/MM/yyyy", { locale: ptBR })
                : "Selecione..."}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                defaultMonth={date}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Local</Label>
          <Input
            placeholder="CDC UCRA"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">YouTube (opcional)</Label>
        <Input
          type="url"
          placeholder="https://youtube.com/watch?v=..."
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
      </div>
      {hasChanges ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
