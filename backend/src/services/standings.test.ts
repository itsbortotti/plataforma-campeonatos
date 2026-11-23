import { describe, expect, it } from "vitest";
import { parseTieBreakers } from "./competition-rules.js";

describe("tie breakers config", () => {
  it("usa padrão amador BR", () => {
    const tb = parseTieBreakers(undefined);
    expect(tb[0]).toBe("points");
    expect(tb).toContain("wins");
    expect(tb).toContain("headToHead");
  });
});

describe("standings math", () => {
  it("orders by points then wins then GD", () => {
    const rows = [
      { points: 10, won: 3, goalDifference: 1, goalsFor: 5, name: "A" },
      { points: 10, won: 2, goalDifference: 5, goalsFor: 8, name: "B" },
      { points: 12, won: 4, goalDifference: -2, goalsFor: 3, name: "C" },
    ];
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
    expect(rows.map((r) => r.name)).toEqual(["C", "A", "B"]);
  });
});
