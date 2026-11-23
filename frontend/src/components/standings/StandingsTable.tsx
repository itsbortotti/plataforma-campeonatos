"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamBadge } from "@/components/TeamBadge";
import { useLiveStandings } from "@/lib/useLiveStandings";
import type { StandingsEntry } from "@/lib/queries";
import { ShareStandingsButton } from "./ShareStandingsImage";

interface Props {
  seasonId: string;
  initialStandings: StandingsEntry[];
  seasonLabel?: string;
}

export function StandingsTable({ seasonId, initialStandings, seasonLabel }: Props) {
  const standings = useLiveStandings(seasonId, initialStandings);

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="border-border/40 hover:bg-transparent">
          <TableHead className="w-8 text-[10px] uppercase tracking-wider">
            #
          </TableHead>
          <TableHead className="text-[10px] uppercase tracking-wider">
            Time
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider">
            J
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider">
            V
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider">
            E
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider">
            D
          </TableHead>
          <TableHead className="hidden sm:table-cell text-center text-[10px] uppercase tracking-wider">
            GP
          </TableHead>
          <TableHead className="hidden sm:table-cell text-center text-[10px] uppercase tracking-wider">
            GC
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider">
            SG
          </TableHead>
          <TableHead className="text-center text-[10px] uppercase tracking-wider font-bold">
            Pts
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((row, idx) => {
          const team = row.team;
          return (
            <TableRow
              key={row.teamId}
              className="border-border/30 hover:bg-accent/30"
            >
              <TableCell>
                <span
                  className="font-black text-sm"
                  style={{
                    color: idx === 0 ? "var(--color-gold)" : undefined,
                  }}
                >
                  {idx + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <TeamBadge
                    name={team.name}
                    shortName={team.shortName}
                    primaryColor={team.primaryColor}
                    logoUrl={team.logoUrl}
                    size="sm"
                  />
                  <span className="font-semibold">{team.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {row.played}
              </TableCell>
              <TableCell className="text-center">{row.won}</TableCell>
              <TableCell className="text-center text-muted-foreground">
                {row.drawn}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {row.lost}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-center">
                {row.goalsFor}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-center text-muted-foreground">
                {row.goalsAgainst}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={
                    row.goalDifference > 0
                      ? "text-emerald-400"
                      : row.goalDifference < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }
                >
                  {row.goalDifference > 0
                    ? `+${row.goalDifference}`
                    : row.goalDifference}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span
                  className="font-black text-lg"
                  style={{
                    color: idx === 0 ? "var(--color-gold)" : undefined,
                  }}
                >
                  {row.points}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    {seasonLabel && standings.length > 0 && (
      <div className="flex justify-center pt-4">
        <ShareStandingsButton standings={standings} seasonLabel={seasonLabel} />
      </div>
    )}
    </>
  );
}
