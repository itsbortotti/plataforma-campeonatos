"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CirclePlay, Save, Search, Trash2, CheckCheck } from "lucide-react";
import {
  updateEventTimestamp,
  fetchAndMatchTimestamps,
  applyTimestampSuggestions,
} from "@/app/admin/partidas/[id]/actions";
import { secondsToMmss, mmssToSeconds } from "@/lib/youtube";
import type { MatchEvent, MatchWithTeams } from "@/lib/queries";
import type { SuggestedTimestamp } from "@/lib/youtube";

const GOAL_TYPES = new Set(["goal", "own_goal", "penalty_goal"]);

const goalTypeLabel: Record<string, string> = {
  goal: "Gol",
  own_goal: "Gol Contra",
  penalty_goal: "Pênalti",
};

const confidenceStyle: Record<string, string> = {
  high: "border-emerald-500/50 bg-emerald-500/10",
  medium: "border-amber-500/50 bg-amber-500/10",
  low: "border-red-500/50 bg-red-500/10",
};

function elapsedToMinute(seconds: number): number {
  return Math.floor(seconds / 60) + 1;
}

interface Props {
  match: MatchWithTeams;
  events: MatchEvent[];
}

export function GoalTimestampsEditor({ match, events }: Props) {
  const goalEvents = events.filter((e) => GOAL_TYPES.has(e.type));
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<
    Map<string, SuggestedTimestamp>
  >(new Map());
  const [isPending, startTransition] = useTransition();

  function getDisplayValue(event: MatchEvent): string {
    if (editValues[event.id] !== undefined) return editValues[event.id];

    const suggestion = suggestions.get(event.id);
    if (suggestion) return secondsToMmss(suggestion.timestampSeconds);

    if (event.youtubeTimestampSeconds !== null) {
      return secondsToMmss(event.youtubeTimestampSeconds);
    }

    return "";
  }

  function handleSave(eventId: string) {
    const value = editValues[eventId] ?? "";
    const suggestion = suggestions.get(eventId);

    let seconds: number | null = null;

    if (value) {
      seconds = mmssToSeconds(value);
      if (seconds === null) {
        toast.error("Formato inválido. Use MM:SS ou H:MM:SS.");
        return;
      }
    } else if (suggestion) {
      seconds = suggestion.timestampSeconds;
    } else {
      return;
    }

    startTransition(async () => {
      const result = await updateEventTimestamp(eventId, seconds);
      if (result.success) {
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        setSuggestions((prev) => {
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
        toast.success("Timestamp salvo.");
      } else {
        toast.error(result.error ?? "Erro ao salvar.");
      }
    });
  }

  function handleClear(eventId: string) {
    startTransition(async () => {
      const result = await updateEventTimestamp(eventId, null);
      if (result.success) {
        setEditValues((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        setSuggestions((prev) => {
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
        toast.success("Timestamp removido.");
      } else {
        toast.error(result.error ?? "Erro ao remover.");
      }
    });
  }

  function handleFetchYoutube() {
    startTransition(async () => {
      const result = await fetchAndMatchTimestamps(match.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const map = new Map<string, SuggestedTimestamp>();
      for (const s of result.suggestions) {
        map.set(s.eventId, s);
      }
      setSuggestions(map);
      toast.success(
        `${result.suggestions.length} timestamp(s) encontrado(s).`,
      );
    });
  }

  function handleSaveAll() {
    const mappings: Array<{ eventId: string; seconds: number }> = [];

    for (const event of goalEvents) {
      const value = editValues[event.id];
      const suggestion = suggestions.get(event.id);

      if (value) {
        const seconds = mmssToSeconds(value);
        if (seconds !== null) {
          mappings.push({ eventId: event.id, seconds });
        }
      } else if (suggestion) {
        mappings.push({
          eventId: event.id,
          seconds: suggestion.timestampSeconds,
        });
      }
    }

    if (mappings.length === 0) {
      toast.error("Nenhum timestamp para salvar.");
      return;
    }

    startTransition(async () => {
      const result = await applyTimestampSuggestions(match.id, mappings);
      if (result.success) {
        setEditValues({});
        setSuggestions(new Map());
        toast.success(`${mappings.length} timestamp(s) salvo(s).`);
      } else {
        toast.error(result.error ?? "Erro ao salvar.");
      }
    });
  }

  const hasPendingChanges =
    Object.keys(editValues).length > 0 || suggestions.size > 0;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CirclePlay className="h-3.5 w-3.5 text-red-400" />
            Timestamps dos Gols
          </CardTitle>
          <div className="flex gap-2">
            {hasPendingChanges && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Salvar Todos
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleFetchYoutube}
              disabled={isPending}
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Buscar do YouTube
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {goalEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground/50 italic text-center py-4">
            Nenhum gol registrado.
          </p>
        ) : (
          <div className="space-y-1">
            {goalEvents.map((event) => {
              const suggestion = suggestions.get(event.id);
              const displayValue = getDisplayValue(event);
              const isEditing = editValues[event.id] !== undefined;
              const hasSuggestion = !!suggestion && !isEditing;
              const hasSavedValue = event.youtubeTimestampSeconds !== null;

              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 ${
                    hasSuggestion ? confidenceStyle[suggestion.confidence] : ""
                  }`}
                >
                  <span className="text-xs font-bold text-muted-foreground/50 tabular-nums w-8 text-right shrink-0">
                    {elapsedToMinute(event.elapsedSeconds)}&apos;
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 w-16 shrink-0">
                    {goalTypeLabel[event.type] ?? event.type}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">
                    {event.player?.nickname ?? "?"}
                  </span>
                  {hasSuggestion && (
                    <span className="text-[10px] text-muted-foreground/50">
                      {suggestion.matchedBy}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM:SS"
                      className="w-20 h-7 text-center text-sm font-bold tabular-nums"
                      value={displayValue}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [event.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(event.id);
                      }}
                    />
                    {(isEditing || hasSuggestion) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={isPending}
                        onClick={() => handleSave(event.id)}
                        title="Salvar"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {hasSavedValue && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground/50 hover:text-red-400"
                        disabled={isPending}
                        onClick={() => handleClear(event.id)}
                        title="Remover timestamp"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
