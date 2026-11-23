"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  Shield,
  Check,
  ChevronLeft,
} from "lucide-react";
import {
  saveLineup,
  saveOfficials,
  type OfficialEntry,
} from "@/app/admin/partidas/[id]/actions";
import type {
  MatchWithTeams,
  Player,
  MatchLineupPlayer,
  MatchOfficial,
  MatchSuspension,
} from "@/lib/queries";
import {
  TeamLineupEditor,
  type LineupEntry,
  type SuspensionInfo,
} from "@/components/lineup/TeamLineupEditor";
import { cn } from "@/lib/utils";

const officialRoles: { value: OfficialEntry["role"]; label: string }[] = [
  { value: "referee", label: "Árbitro" },
  { value: "assistant_1", label: "Auxiliar 1" },
  { value: "assistant_2", label: "Auxiliar 2" },
  { value: "narrator", label: "Narrador" },
];

type PrepStep = "home" | "away" | "officials";

interface Props {
  match: MatchWithTeams;
  homeRoster: Player[];
  awayRoster: Player[];
  homeLineup: MatchLineupPlayer[] | null;
  awayLineup: MatchLineupPlayer[] | null;
  officials: MatchOfficial[];
  suspensions: MatchSuspension[];
  onReadyToLiberar?: () => void;
  liberating?: boolean;
}

export function MatchLineupEditor({
  match,
  homeRoster,
  awayRoster,
  homeLineup,
  awayLineup,
  officials,
  suspensions,
  onReadyToLiberar,
  liberating,
}: Props) {
  const router = useRouter();
  const homeDone =
    (homeLineup?.filter((p) => p.status === "starter").length ?? 0) > 0;
  const awayDone =
    (awayLineup?.filter((p) => p.status === "starter").length ?? 0) > 0;

  const initialStep: PrepStep = !homeDone
    ? "home"
    : !awayDone
      ? "away"
      : "officials";
  const [step, setStep] = useState<PrepStep>(initialStep);
  const [officialSaving, startOfficialSave] = useTransition();

  const [officialForm, setOfficialForm] = useState<Record<string, string>>(
    () => {
      const map: Record<string, string> = {};
      for (const o of officials) map[o.role] = o.name;
      return map;
    },
  );

  const suspensionMap = useMemo(() => {
    const map: Record<string, SuspensionInfo> = {};
    for (const s of suspensions) {
      map[s.playerId] = {
        reason: s.reason,
        gamesRemaining: s.gamesRemaining,
      };
    }
    return map;
  }, [suspensions]);

  const homeSuspensions = useMemo(() => {
    const ids = new Set(homeRoster.map((p) => p.id));
    return Object.fromEntries(
      Object.entries(suspensionMap).filter(([id]) => ids.has(id)),
    );
  }, [homeRoster, suspensionMap]);

  const awaySuspensions = useMemo(() => {
    const ids = new Set(awayRoster.map((p) => p.id));
    return Object.fromEntries(
      Object.entries(suspensionMap).filter(([id]) => ids.has(id)),
    );
  }, [awayRoster, suspensionMap]);

  const steps: { id: PrepStep; label: string; done: boolean }[] = [
    {
      id: "home",
      label: match.homeTeam.shortName,
      done: homeDone,
    },
    {
      id: "away",
      label: match.awayTeam.shortName,
      done: awayDone,
    },
    {
      id: "officials",
      label: "Árbitros",
      done: officials.length > 0,
    },
  ];

  const handleSaveHome = useCallback(
    async (entries: LineupEntry[], formation?: string | null) => {
      const result = await saveLineup(
        match.id,
        match.homeTeam.id,
        entries,
        formation,
      );
      if (result.success) {
        setStep("away");
        router.refresh();
      }
      return result;
    },
    [match.id, match.homeTeam.id, router],
  );

  const handleSaveAway = useCallback(
    async (entries: LineupEntry[], formation?: string | null) => {
      const result = await saveLineup(
        match.id,
        match.awayTeam.id,
        entries,
        formation,
      );
      if (result.success) {
        setStep("officials");
        router.refresh();
      }
      return result;
    },
    [match.id, match.awayTeam.id, router],
  );

  function saveOfficialsForm() {
    startOfficialSave(async () => {
      const entries: OfficialEntry[] = officialRoles
        .filter((r) => (officialForm[r.value] ?? "").trim() !== "")
        .map((r) => ({
          role: r.value,
          name: officialForm[r.value] ?? "",
        }));
      const result = await saveOfficials(match.id, entries);
      if (result.success) {
        toast.success("Arbitragem salva");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao salvar arbitragem");
      }
    });
  }

  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border/40 p-1 bg-card/30">
        {steps.map((s, i) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "flex-1 rounded-md px-2 py-2 text-center text-xs font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                {s.done ? <Check className="h-3 w-3" /> : <span>{i + 1}.</span>}
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {step === "home" ? (
        <div className="rounded-lg border border-border/40 p-4">
          <TeamLineupEditor
            team={match.homeTeam}
            roster={homeRoster}
            existing={homeLineup}
            formation={match.homeFormation}
            onSave={handleSaveHome}
            suspensions={homeSuspensions}
            saveLabel="Salvar e continuar →"
            defaultView="list"
          />
        </div>
      ) : null}

      {step === "away" ? (
        <div className="rounded-lg border border-border/40 p-4">
          <TeamLineupEditor
            team={match.awayTeam}
            roster={awayRoster}
            existing={awayLineup}
            formation={match.awayFormation}
            onSave={handleSaveAway}
            suspensions={awaySuspensions}
            saveLabel="Salvar e continuar →"
            defaultView="list"
          />
        </div>
      ) : null}

      {step === "officials" ? (
        <div className="rounded-lg border border-border/40 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-bold text-sm">Arbitragem</h3>
            <span className="text-xs text-muted-foreground">(opcional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {officialRoles.map((role) => (
              <div key={role.value} className="space-y-1.5">
                <Label className="text-xs">{role.label}</Label>
                <Input
                  value={officialForm[role.value] ?? ""}
                  onChange={(e) =>
                    setOfficialForm((prev) => ({
                      ...prev,
                      [role.value]: e.target.value,
                    }))
                  }
                  placeholder={role.label}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={saveOfficialsForm}
              disabled={officialSaving}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-1" />
              {officialSaving ? "Salvando…" : "Salvar arbitragem"}
            </Button>
            {homeDone && awayDone && onReadyToLiberar ? (
              <Button
                onClick={onReadyToLiberar}
                disabled={liberating}
                size="sm"
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                {liberating ? "Liberando…" : "Liberar e abrir súmula"}
              </Button>
            ) : null}
          </div>
          {homeDone && awayDone && !onReadyToLiberar ? (
            <p className="text-sm text-muted-foreground">
              Escalações prontas. Use o botão no topo para liberar a partida.
            </p>
          ) : null}
        </div>
      ) : null}

      {stepIndex > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(steps[stepIndex - 1]!.id)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Button>
      ) : null}
    </div>
  );
}
