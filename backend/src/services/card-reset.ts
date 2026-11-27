export type SuspensionReason = "yellow_accumulation" | "red_card";

export type CardCountState = {
  yellow: number;
  pending: number;
  reason: SuspensionReason | null;
};

/**
 * Aplica um CardReset ao acumulado do jogador.
 * O padrão só zera os amarelos. `clearsPending` (compra da suspensão) também
 * encerra os jogos de suspensão que ainda não foram cumpridos.
 */
export function applyCardReset(
  st: CardCountState,
  reset: { clearsPending?: boolean },
): void {
  st.yellow = 0;
  if (reset.clearsPending) {
    st.pending = 0;
    st.reason = null;
  }
}
