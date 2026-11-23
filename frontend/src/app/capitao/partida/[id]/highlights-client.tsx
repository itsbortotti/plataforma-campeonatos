"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Award, Handshake, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  HighlightSlot,
  MatchHighlight,
  MatchLineupPlayer,
  Team,
} from "@/lib/queries";
import {
  saveCaptainHighlights,
  saveCaptainRespectPick,
} from "./highlights-actions";

interface Props {
  readonly matchId: string;
  readonly lineup: readonly MatchLineupPlayer[];
  readonly opponent: Team;
  readonly opponentLineup: readonly MatchLineupPlayer[];
  readonly existing: readonly MatchHighlight[];
  readonly existingRespect: MatchHighlight | null;
  readonly readOnly?: boolean;
}

const NONE = "none";

function findExisting(
  highlights: readonly MatchHighlight[],
  slot: HighlightSlot,
): string {
  return highlights.find((h) => h.slot === slot)?.playerId ?? NONE;
}

export function CaptainHighlightsClient({
  matchId,
  lineup,
  opponent,
  opponentLineup,
  existing,
  existingRespect,
  readOnly,
}: Props) {
  const [mvp, setMvp] = useState<string>(findExisting(existing, "mvp"));
  const [second, setSecond] = useState<string>(findExisting(existing, "second"));
  const [third, setThird] = useState<string>(findExisting(existing, "third"));
  const [respect, setRespect] = useState<string>(
    existingRespect?.playerId ?? NONE,
  );
  const [isSavingOwn, startOwnTransition] = useTransition();
  const [isSavingRespect, startRespectTransition] = useTransition();

  const ownById = useMemo(
    () => new Map(lineup.map((p) => [p.playerId, p])),
    [lineup],
  );
  const oppById = useMemo(
    () => new Map(opponentLineup.map((p) => [p.playerId, p])),
    [opponentLineup],
  );

  function optionsFor(currentValue: string, excluded: string[]) {
    return lineup.filter(
      (p) => p.playerId === currentValue || !excluded.includes(p.playerId),
    );
  }

  function handleSaveOwn() {
    if (!mvp || mvp === NONE) {
      toast.error("Selecione ao menos o MVP.");
      return;
    }
    startOwnTransition(async () => {
      const result = await saveCaptainHighlights(matchId, {
        mvp,
        second: second && second !== NONE ? second : null,
        third: third && third !== NONE ? third : null,
      });
      if (result.success) {
        toast.success("Destaques salvos.");
      } else {
        toast.error(result.error ?? "Erro ao salvar destaques.");
      }
    });
  }

  function handleSaveRespect() {
    startRespectTransition(async () => {
      const result = await saveCaptainRespectPick(
        matchId,
        respect && respect !== NONE ? respect : null,
      );
      if (result.success) {
        toast.success(
          respect && respect !== NONE
            ? "Respeito do rival salvo."
            : "Respeito do rival removido.",
        );
      } else {
        toast.error(result.error ?? "Erro ao salvar respeito do rival.");
      }
    });
  }

  const slots: {
    key: HighlightSlot;
    label: string;
    icon: typeof Award;
    value: string;
    setValue: (v: string) => void;
    excluded: string[];
  }[] = [
    {
      key: "mvp",
      label: "MVP",
      icon: Award,
      value: mvp,
      setValue: setMvp,
      excluded: [second, third].filter((v) => v && v !== NONE),
    },
    {
      key: "second",
      label: "2º destaque",
      icon: Medal,
      value: second,
      setValue: setSecond,
      excluded: [mvp, third].filter((v) => v && v !== NONE),
    },
    {
      key: "third",
      label: "3º destaque",
      icon: Star,
      value: third,
      setValue: setThird,
      excluded: [mvp, second].filter((v) => v && v !== NONE),
    },
  ];

  const respectSelected =
    respect !== NONE ? oppById.get(respect) ?? null : null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-bold">Destaques do seu time</h3>
          <p className="text-xs text-muted-foreground">
            Escolha até 3 jogadores do seu time. MVP é obrigatório.
          </p>
        </div>

        <div className="grid gap-3">
          {slots.map(({ key, label, icon: Icon, value, setValue, excluded }) => {
            const opts = optionsFor(value, excluded);
            const selected = value !== NONE ? ownById.get(value) : null;

            return (
              <div key={key} className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Label>
                <Select
                  value={value}
                  onValueChange={(v) => setValue(v ?? NONE)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full">
                    {selected ? (
                      <SelectValue>
                        <span className="truncate">
                          #{selected.shirtNumber} {selected.nickname}
                          <span className="ml-2 text-muted-foreground">
                            {selected.position}
                          </span>
                        </span>
                      </SelectValue>
                    ) : (
                      <span className="text-muted-foreground">
                        {key === "mvp" ? "Selecione o MVP" : "Nenhum"}
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {key !== "mvp" && (
                      <SelectItem value={NONE}>Nenhum</SelectItem>
                    )}
                    {opts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.shirtNumber} {p.nickname}{" "}
                        <span className="text-muted-foreground">{p.position}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <Button onClick={handleSaveOwn} disabled={isSavingOwn} size="sm">
              {isSavingOwn ? "Salvando..." : "Salvar destaques"}
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3 pt-4 border-t border-border/40">
        <div>
          <h3 className="text-sm font-bold">Respeito do rival</h3>
          <p className="text-xs text-muted-foreground">
            Escolha 1 jogador do {opponent.name} que merece reconhecimento. Opcional.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Handshake className="h-3.5 w-3.5" />
            Respeito
          </Label>
          {opponentLineup.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 italic">
              Escalação do {opponent.shortName} não está disponível.
            </p>
          ) : (
            <Select
              value={respect}
              onValueChange={(v) => setRespect(v ?? NONE)}
              disabled={readOnly}
            >
              <SelectTrigger className="w-full">
                {respectSelected ? (
                  <SelectValue>
                    <span className="truncate">
                      #{respectSelected.shirtNumber} {respectSelected.nickname}
                      <span className="ml-2 text-muted-foreground">
                        {respectSelected.position}
                      </span>
                    </span>
                  </SelectValue>
                ) : (
                  <span className="text-muted-foreground">
                    Nenhum
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {opponentLineup.map((p) => (
                  <SelectItem key={p.playerId} value={p.playerId}>
                    #{p.shirtNumber} {p.nickname}{" "}
                    <span className="text-muted-foreground">{p.position}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!readOnly && opponentLineup.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={handleSaveRespect}
              disabled={isSavingRespect}
              size="sm"
              variant="outline"
            >
              {isSavingRespect ? "Salvando..." : "Salvar respeito"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
