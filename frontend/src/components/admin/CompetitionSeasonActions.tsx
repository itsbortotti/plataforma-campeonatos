"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeasonDialog } from "./SeasonDialog";
import type { Competition, Team } from "@/lib/queries";

type Props = {
  competitionId: string;
  competitions: Competition[];
  teams: Team[];
};

export function CompetitionSeasonActions({
  competitionId,
  competitions,
  teams,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Nova temporada
      </Button>
      <SeasonDialog
        season={null}
        teams={teams}
        competitions={competitions}
        open={open}
        onOpenChange={setOpen}
        defaultCompetitionId={competitionId}
      />
    </>
  );
}
