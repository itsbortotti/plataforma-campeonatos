"use client";

import { useCallback } from "react";
import {
  TeamLineupEditor,
  type LineupEntry,
} from "@/components/lineup/TeamLineupEditor";
import { saveCaptainLineup } from "./actions";
import type { Team, Player, MatchLineupPlayer } from "@/lib/queries";

interface Props {
  readonly team: Team;
  readonly roster: Player[];
  readonly existing: MatchLineupPlayer[] | null;
  readonly formation?: string | null;
  readonly matchId: string;
  readonly readOnly: boolean;
  readonly hideTeamHeader?: boolean;
}

export function CaptainLineupClient({
  team,
  roster,
  existing,
  formation,
  matchId,
  readOnly,
  hideTeamHeader,
}: Props) {
  const handleSave = useCallback(
    (entries: LineupEntry[], fm?: string | null) =>
      saveCaptainLineup(matchId, entries, fm ?? null),
    [matchId],
  );

  return (
    <TeamLineupEditor
      team={team}
      roster={roster}
      existing={existing}
      formation={formation}
      onSave={handleSave}
      readOnly={readOnly}
      hideTeamHeader={hideTeamHeader}
    />
  );
}
