"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Season } from "@/lib/queries";

interface Props {
  seasons: Season[];
  currentSeasonId: string;
}

type Group = {
  key: string;
  label: string;
  seasons: Season[];
};

export function SeasonSelector({ seasons, currentSeasonId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("season") ?? currentSeasonId;

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const s of seasons) {
      const key = s.competitionId ?? "sem-campeonato";
      const label = s.competitionName ?? "Campeonato";
      const g = map.get(key) ?? { key, label, seasons: [] };
      g.seasons.push(s);
      map.set(key, g);
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      seasons: [...g.seasons].sort(
        (a, b) => b.year - a.year || a.name.localeCompare(b.name),
      ),
    }));
  }, [seasons]);

  const selectedSeason = seasons.find((s) => s.id === selected);
  const triggerLabel = selectedSeason
    ? selectedSeason.competitionName
      ? `${selectedSeason.competitionName} · ${selectedSeason.name}`
      : selectedSeason.name
    : "Temporada";

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === currentSeasonId) {
      params.delete("season");
    } else {
      params.set("season", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const items = seasons.map((s) => ({
    value: s.id,
    label: s.competitionName
      ? `${s.competitionName} · ${s.name}${s.isCurrent ? " (atual)" : ""}`
      : `${s.name}${s.isCurrent ? " (atual)" : ""}`,
  }));

  return (
    <Select value={selected} onValueChange={handleChange} items={items}>
      <SelectTrigger
        className="w-[min(100%,280px)] h-8 text-xs font-medium"
        title="Escopo: campeonato → temporada"
      >
        <SelectValue placeholder="Campeonato · Temporada">
          {triggerLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g.key}>
            <SelectLabel className="text-[10px] uppercase tracking-wider">
              {g.label}
            </SelectLabel>
            {g.seasons.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.isCurrent ? " (atual)" : ""}
                {typeof s.matchCount === "number"
                  ? ` · ${s.matchCount} partida${s.matchCount === 1 ? "" : "s"}`
                  : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
