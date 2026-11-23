import type { PenaltyKick } from "@/lib/queries";

export const REGULATION_KICKS = 5;

export interface ShootoutResolution {
  winnerId: string | null;
  /** true when a winner is mathematically determined */
  decided: boolean;
}

/**
 * Applies football penalty shootout rules:
 * 1. Regulation: 5 kicks per team. If it becomes mathematically impossible for
 *    a team to catch up, the shootout ends early.
 * 2. Sudden death: after both teams reach 5 kicks, compare scores when both
 *    teams have taken the same number of attempts. First team ahead wins.
 *
 * Only supports a 2-team shootout — returns undecided for any other count.
 */
export function resolveShootoutWinner(
  kicks: PenaltyKick[],
  tiedTeamIds: string[],
): ShootoutResolution {
  if (tiedTeamIds.length !== 2) {
    return { winnerId: null, decided: false };
  }

  const [aId, bId] = tiedTeamIds;
  const kicksA = kicks.filter((k) => k.teamId === aId);
  const kicksB = kicks.filter((k) => k.teamId === bId);
  const scoreA = kicksA.filter((k) => k.scored).length;
  const scoreB = kicksB.filter((k) => k.scored).length;
  const attemptsA = kicksA.length;
  const attemptsB = kicksB.length;

  // Regulation phase
  if (attemptsA < REGULATION_KICKS || attemptsB < REGULATION_KICKS) {
    const remainingA = Math.max(0, REGULATION_KICKS - attemptsA);
    const remainingB = Math.max(0, REGULATION_KICKS - attemptsB);
    if (scoreA + remainingA < scoreB) return { winnerId: bId, decided: true };
    if (scoreB + remainingB < scoreA) return { winnerId: aId, decided: true };
    return { winnerId: null, decided: false };
  }

  // Sudden death: compare only when both teams have the same number of kicks
  if (attemptsA !== attemptsB) return { winnerId: null, decided: false };
  if (scoreA === scoreB) return { winnerId: null, decided: false };
  return { winnerId: scoreA > scoreB ? aId : bId, decided: true };
}
