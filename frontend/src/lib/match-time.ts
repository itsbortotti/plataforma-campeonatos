/**
 * Converts elapsed seconds to the football-style minute displayed on screen.
 * 0s -> 0', 1-60s -> 1', 61-120s -> 2', etc.
 */
export function elapsedToDisplayMinute(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.ceil(seconds / 60);
}

/** Formats elapsed seconds as "MM:SS" for clock display. */
export function formatElapsedClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
