"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Search, User } from "lucide-react";
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
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { addPlayerToRoster } from "@/app/admin/jogadores/actions";
import type { AvailablePlayer, Team } from "@/lib/queries";

const positionLabel: Record<string, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

interface Props {
  players: AvailablePlayer[];
  teams: Team[];
  seasonId: string;
  usedNumbersByTeam: Record<string, number[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState = { success: false, error: null as string | null };

function nextFreeNumber(used: number[]): number | null {
  const taken = new Set(used);
  for (let n = 1; n <= 99; n++) {
    if (!taken.has(n)) return n;
  }
  return null;
}

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

export function AddExistingPlayerDialog({
  players,
  teams,
  seasonId,
  usedNumbersByTeam,
  open,
  onOpenChange,
}: Props) {
  const [state, formAction, pending] = useActionState(
    addPlayerToRoster,
    initialState,
  );
  const [search, setSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [number, setNumber] = useState<string>("");

  const prevState = useRef(state);
  useEffect(() => {
    if (state === prevState.current) return;
    prevState.current = state;
    if (state.success) {
      toast.success("Jogador adicionado ao elenco");
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.nickname.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    );
  }, [players, search]);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;
  const selectedTeam = teams.find((t) => t.id === teamId);

  function handleSelectPlayer(p: AvailablePlayer) {
    setSelectedPlayerId(p.id);
    const targetTeamId =
      p.lastTeamId && teams.some((t) => t.id === p.lastTeamId)
        ? p.lastTeamId
        : "";
    setTeamId(targetTeamId);
    if (!targetTeamId) {
      setNumber("");
      return;
    }
    const used = usedNumbersByTeam[targetTeamId] ?? [];
    const lastFree =
      p.lastNumber != null && !used.includes(p.lastNumber) ? p.lastNumber : null;
    const candidate = lastFree ?? nextFreeNumber(used);
    setNumber(candidate != null ? String(candidate) : "");
  }

  const isAvulso = teamId === "none" || teamId === "";

  function handleTeamChange(v: string | null) {
    const next = v ?? "";
    setTeamId(next);
    if (!next || next === "none") {
      setNumber("");
      return;
    }
    const used = usedNumbersByTeam[next] ?? [];
    const candidate = nextFreeNumber(used);
    setNumber(candidate != null ? String(candidate) : "");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPlayerId) return;
    if (!isAvulso && !number) return;
    const fd = new FormData();
    fd.set("playerId", selectedPlayerId);
    fd.set("seasonId", seasonId);
    fd.set("teamId", isAvulso ? "" : teamId);
    fd.set("number", isAvulso ? "" : number);
    startTransition(() => formAction(fd));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar jogador existente</DialogTitle>
        </DialogHeader>

        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Todos os jogadores cadastrados já estão no elenco desta temporada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!selectedPlayer ? (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar jogador..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                    autoFocus
                  />
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-border/40 divide-y divide-border/30">
                  {filtered.length === 0 ? (
                    <p className="py-6 text-sm text-center text-muted-foreground">
                      Nenhum jogador encontrado.
                    </p>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPlayer(p)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
                      >
                        <span className="relative h-8 w-8 rounded-lg overflow-hidden bg-accent/40 border border-border/40 shrink-0 flex items-center justify-center">
                          {p.photoUrl ? (
                            <Image
                              src={p.photoUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="32px"
                              unoptimized
                            />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground/40" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">
                            {p.nickname}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {p.name}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            {positionLabel[p.position] ?? p.position}
                          </span>
                          {p.lastTeamLogoUrl ? (
                            <Image
                              src={p.lastTeamLogoUrl}
                              alt={p.lastTeamName ?? ""}
                              width={18}
                              height={18}
                              className="object-contain opacity-70"
                              title={`Último time: ${p.lastTeamName ?? ""}`}
                            />
                          ) : (
                            p.lastTeamShortName && (
                              <span className="text-[10px] text-muted-foreground/50">
                                {p.lastTeamShortName}
                              </span>
                            )
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-accent/20">
                  <span className="relative h-10 w-10 rounded-lg overflow-hidden bg-accent/40 border border-border/40 shrink-0 flex items-center justify-center">
                    {selectedPlayer.photoUrl ? (
                      <Image
                        src={selectedPlayer.photoUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">
                      {selectedPlayer.nickname}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {selectedPlayer.name}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setSelectedPlayerId(null)}
                  >
                    Trocar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamId">Time</Label>
                    <Select
                      value={teamId || "none"}
                      onValueChange={handleTeamChange}
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
                      type="number"
                      min={1}
                      max={99}
                      value={isAvulso ? "" : number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="-"
                      disabled={isAvulso}
                    />
                  </div>
                </div>

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
                    type="submit"
                    disabled={pending || (!isAvulso && !number)}
                  >
                    {pending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
