/**
 * Gera confrontos de pontos corridos (método do círculo / rodízio).
 * Retorna rodadas com pares [home, away] (ids).
 */
export function generateRoundRobin(
  teamIds: string[],
  opts?: { double?: boolean },
): Array<{ round: number; fixtures: Array<{ homeTeamId: string; awayTeamId: string }> }> {
  const ids = [...teamIds];
  if (ids.length < 2) return [];

  const bye = "__BYE__";
  if (ids.length % 2 === 1) ids.push(bye);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arranged = [...ids];
  const result: Array<{
    round: number;
    fixtures: Array<{ homeTeamId: string; awayTeamId: string }>;
  }> = [];

  for (let r = 0; r < rounds; r++) {
    const fixtures: Array<{ homeTeamId: string; awayTeamId: string }> = [];
    for (let i = 0; i < half; i++) {
      const home = arranged[i]!;
      const away = arranged[n - 1 - i]!;
      if (home === bye || away === bye) continue;
      // Alterna mando para equilibrar
      if (r % 2 === 0) fixtures.push({ homeTeamId: home, awayTeamId: away });
      else fixtures.push({ homeTeamId: away, awayTeamId: home });
    }
    result.push({ round: r + 1, fixtures });
    // Rotaciona mantendo o primeiro fixo
    const fixed = arranged[0]!;
    const rest = arranged.slice(1);
    rest.unshift(rest.pop()!);
    arranged.splice(0, arranged.length, fixed, ...rest);
  }

  if (opts?.double) {
    const second = result.map((round) => ({
      round: round.round + rounds,
      fixtures: round.fixtures.map((f) => ({
        homeTeamId: f.awayTeamId,
        awayTeamId: f.homeTeamId,
      })),
    }));
    return [...result, ...second];
  }

  return result;
}

/** Chave de mata-mata simples (potência de 2; byes se necessário). */
export function generateKnockoutBracket(teamIds: string[]): Array<{
  round: number;
  knockoutLabel: string;
  fixtures: Array<{ homeTeamId: string | null; awayTeamId: string | null }>;
}> {
  const labels = ["Final", "Semifinal", "Quartas", "Oitavas", "16-avos"];
  let size = 1;
  while (size < teamIds.length) size *= 2;
  const padded: Array<string | null> = [...teamIds];
  while (padded.length < size) padded.push(null);

  const rounds: Array<{
    round: number;
    knockoutLabel: string;
    fixtures: Array<{ homeTeamId: string | null; awayTeamId: string | null }>;
  }> = [];

  let current = padded;
  let roundNum = 1;
  while (current.length >= 2) {
    const pairCount = current.length / 2;
    const labelIdx = Math.min(
      labels.length - 1,
      Math.round(Math.log2(current.length)) - 1,
    );
    const fixtures: Array<{ homeTeamId: string | null; awayTeamId: string | null }> =
      [];
    for (let i = 0; i < pairCount; i++) {
      fixtures.push({
        homeTeamId: current[i * 2] ?? null,
        awayTeamId: current[i * 2 + 1] ?? null,
      });
    }
    rounds.push({
      round: roundNum,
      knockoutLabel: labels[Math.max(0, labelIdx)] ?? `Rodada ${roundNum}`,
      fixtures,
    });
    // Próxima rodada: placeholders (preenchidos depois pelos resultados)
    current = Array.from({ length: pairCount }, () => null);
    roundNum += 1;
    if (pairCount === 1) break;
  }

  return rounds;
}
