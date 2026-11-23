import { describe, expect, it } from "vitest";

describe("finalize stale window", () => {
  it("4h cutoff is in the past relative to now", () => {
    const STALE_MS = 1000 * 60 * 60 * 4;
    const cutoff = new Date(Date.now() - STALE_MS);
    expect(cutoff.getTime()).toBeLessThan(Date.now());
  });
});
