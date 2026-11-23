"use client";

import type { ReactNode } from "react";
import { ClipboardList, Star, Users } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Props {
  pendingCount: number;
  liveCount?: number;
  highlightsPendingCount: number;
  playersCount: number;
  jogadores: ReactNode;
  partidas: ReactNode;
  destaques: ReactNode;
}

export function CaptainTabs({
  pendingCount,
  liveCount = 0,
  highlightsPendingCount,
  playersCount,
  jogadores,
  partidas,
  destaques,
}: Props) {
  return (
    <Tabs
      defaultValue={liveCount > 0 ? "partidas" : "jogadores"}
      className="gap-6"
    >
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="jogadores" className="gap-2">
          <Users className="h-3.5 w-3.5" />
          Jogadores
          {playersCount > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {playersCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="partidas" className="gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Partidas
          {pendingCount > 0 && (
            <span
              className={`text-[10px] font-black tabular-nums ${
                liveCount > 0 ? "text-red-500" : "text-amber-500"
              }`}
            >
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="destaques" className="gap-2">
          <Star className="h-3.5 w-3.5" />
          Destaques
          {highlightsPendingCount > 0 && (
            <span className="text-[10px] font-black text-amber-500 tabular-nums">
              {highlightsPendingCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="jogadores">{jogadores}</TabsContent>
      <TabsContent value="partidas">{partidas}</TabsContent>
      <TabsContent value="destaques">{destaques}</TabsContent>
    </Tabs>
  );
}
