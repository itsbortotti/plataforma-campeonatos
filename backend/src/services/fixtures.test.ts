import { describe, expect, it } from "vitest";
import { generateKnockoutBracket, generateRoundRobin } from "./fixtures.js";

describe("generateRoundRobin", () => {
  it("gera n-1 rodadas para n times pares", () => {
    const ids = ["a", "b", "c", "d"];
    const rounds = generateRoundRobin(ids);
    expect(rounds).toHaveLength(3);
    const fixtures = rounds.flatMap((r) => r.fixtures);
    expect(fixtures).toHaveLength(6);
    for (const round of rounds) {
      const seen = new Set(
        round.fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]),
      );
      expect(seen.size).toBe(4);
    }
  });

  it("lida com número ímpar (bye)", () => {
    const rounds = generateRoundRobin(["a", "b", "c"]);
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round.fixtures).toHaveLength(1);
    }
  });

  it("dobra para ida e volta", () => {
    const rounds = generateRoundRobin(["a", "b", "c", "d"], { double: true });
    expect(rounds).toHaveLength(6);
  });
});

describe("generateKnockoutBracket", () => {
  it("cria chave com potência de 2", () => {
    const bracket = generateKnockoutBracket(["a", "b", "c", "d"]);
    expect(bracket[0]?.fixtures).toHaveLength(2);
    expect(bracket.at(-1)?.knockoutLabel).toBe("Final");
  });
});
