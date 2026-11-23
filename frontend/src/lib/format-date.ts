/** Formata data de partida/API (ISO completo ou YYYY-MM-DD) sem "Invalid Date". */
export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
  },
): string {
  if (!dateStr) return "—";
  const day = dateStr.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? new Date(`${day}T12:00:00`)
    : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", options);
}
