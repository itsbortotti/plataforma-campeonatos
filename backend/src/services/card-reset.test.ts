import { describe, expect, it } from "vitest";
import { applyCardReset, type CardCountState } from "./card-reset.js";

function state(partial: Partial<CardCountState> = {}): CardCountState {
  return {
    yellow: 3,
    pending: 1,
    reason: "yellow_accumulation",
    ...partial,
  };
}

describe("applyCardReset", () => {
  it("zera só os amarelos quando a compra da suspensão está desligada", () => {
    const st = state();
    applyCardReset(st, { clearsPending: false });
    expect(st.yellow).toBe(0);
    expect(st.pending).toBe(1);
    expect(st.reason).toBe("yellow_accumulation");
  });

  it("encerra a suspensão pendente quando a multa foi paga e a regra está ligada", () => {
    const st = state({ pending: 2, reason: "red_card" });
    applyCardReset(st, { clearsPending: true });
    expect(st.yellow).toBe(0);
    expect(st.pending).toBe(0);
    expect(st.reason).toBeNull();
  });
});
