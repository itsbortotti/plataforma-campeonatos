import type { Metadata } from "next";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Timer,
  Trophy,
  Goal,
  HandHelping,
  RectangleVertical,
  Ban,
  ShieldAlert,
  AlertTriangle,
  Gauge,
  ArrowDownRight,
  Minus,
  Sparkles,
  ChevronRight,
  Scale,
  Zap,
  Award,
  Medal,
  Star,
  Handshake,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Como funciona o Rating | SFL",
  description:
    "Entenda como as notas dos jogadores da SFL são calculadas a cada partida.",
};

const ratingScale = [
  { value: "10", bg: "bg-blue-600", label: "Perfeito" },
  { value: "9", bg: "bg-blue-500", label: "" },
  { value: "8", bg: "bg-emerald-500", label: "Excelente" },
  { value: "7", bg: "bg-emerald-600", label: "" },
  { value: "6", bg: "bg-amber-500", label: "Normal" },
  { value: "5", bg: "bg-orange-500", label: "" },
  { value: "4", bg: "bg-red-500", label: "Ruim" },
  { value: "3", bg: "bg-red-700", label: "" },
] as const;

function RatingBadge({
  value,
  size = "lg",
}: {
  value: string;
  size?: "sm" | "lg" | "xl";
}) {
  const num = parseFloat(value);
  const bg =
    num >= 8
      ? "bg-blue-600"
      : num >= 7
        ? "bg-emerald-600"
        : num >= 6
          ? "bg-amber-500"
          : num >= 5
            ? "bg-orange-500"
            : "bg-red-500";
  const px =
    size === "xl"
      ? "px-5 py-3 text-3xl rounded-xl"
      : size === "lg"
        ? "px-3 py-1.5 text-lg rounded-lg"
        : "px-1.5 py-0.5 text-xs rounded-md";
  return (
    <span
      className={`${bg} ${px} text-white font-black tabular-nums inline-block shadow-lg`}
    >
      {value}
    </span>
  );
}

function EventRow({
  icon: Icon,
  label,
  value,
  positive,
  note,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  positive?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/60 shrink-0 group-hover:bg-muted transition-colors">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm">{label}</span>
      {note && (
        <span className="text-[10px] text-muted-foreground hidden sm:block">
          {note}
        </span>
      )}
      <span
        className={`font-mono text-sm font-bold tabular-nums ${
          positive === true
            ? "text-emerald-500"
            : positive === false
              ? "text-red-400"
              : "text-muted-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const positionRows = [
  { key: "GOL", label: "Goleiro", gol: "1.5x", assist: "1.0x", cs: "1.5x", color: "bg-yellow-500" },
  { key: "ZAG", label: "Zagueiro", gol: "1.3x", assist: "1.2x", cs: "1.2x", color: "bg-blue-500" },
  { key: "LAT", label: "Lateral", gol: "1.2x", assist: "1.2x", cs: "1.0x", color: "bg-cyan-500" },
  { key: "VOL", label: "Volante", gol: "1.2x", assist: "1.0x", cs: "0.8x", color: "bg-violet-500" },
  { key: "MEI", label: "Meia", gol: "1.1x", assist: "1.1x", cs: "—", color: "bg-emerald-500" },
  { key: "ATA", label: "Atacante", gol: "1.0x", assist: "0.8x", cs: "—", color: "bg-red-500" },
] as const;

export default function RatingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative border-b border-border/30 overflow-hidden">
        <div className="absolute inset-0 hero-split" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/6 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-20">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-primary opacity-30" />
            <Badge
              variant="outline"
              className="border-primary/30 text-primary uppercase tracking-widest text-[10px] font-bold"
            >
              Sistema de Avaliação
            </Badge>
            <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-primary opacity-30" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-center mb-4">
            Como as notas são calculadas
          </h1>
          <p className="text-muted-foreground text-center max-w-lg mx-auto text-sm leading-relaxed mb-10">
            Cada jogador recebe uma nota de <strong className="text-foreground">3.0</strong> a{" "}
            <strong className="text-foreground">10.0</strong> baseada na performance individual,
            resultado do time e importância das ações na partida.
          </p>

          {/* Rating scale bar */}
          <div className="flex justify-center">
            <div className="flex gap-1.5 sm:gap-2">
              {ratingScale.map((r) => (
                <div key={r.value} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`${r.bg} w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md`}
                  >
                    {r.value}
                  </div>
                  {r.label && (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                      {r.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        {/* Step 1: Base */}
        <div className="grid gap-6 md:grid-cols-[1fr_2fr] items-start">
          <Card className="noise border-border/40">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/20 flex items-center justify-center">
                <span className="text-3xl font-black text-amber-400 tabular-nums">
                  6.0
                </span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Passo 1
                </p>
                <h2 className="text-lg font-bold tracking-tight">Nota Base</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Todo jogador que entra em campo começa com{" "}
                <strong className="text-amber-400">6.0</strong>. A partir daí,
                cada ação soma ou subtrai pontos.
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Events */}
          <Card className="noise border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Passo 2
                </p>
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-1">
                Eventos da Partida
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ações individuais somam ou subtraem da nota base.
              </p>

              <div className="grid sm:grid-cols-2 gap-x-8">
                {/* Positive */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Somam pontos
                  </p>
                  <div className="divide-y divide-border/30">
                    <EventRow icon={Goal} label="Gol" value="+1.0" positive />
                    <EventRow icon={Goal} label="Gol de pênalti" value="+0.7" positive />
                    <EventRow icon={HandHelping} label="Assistência" value="+0.5" positive />
                  </div>
                </div>

                {/* Negative */}
                <div className="mt-4 sm:mt-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" />
                    Subtraem pontos
                  </p>
                  <div className="divide-y divide-border/30">
                    <EventRow
                      icon={Ban}
                      label="Pênalti perdido"
                      value="-0.5"
                      positive={false}
                    />
                    <EventRow
                      icon={AlertTriangle}
                      label="Gol contra"
                      value="-1.0"
                      positive={false}
                    />
                    <EventRow
                      icon={RectangleVertical}
                      label="Cartão amarelo"
                      value="-0.5"
                      positive={false}
                    />
                    <EventRow
                      icon={RectangleVertical}
                      label="Cartão vermelho"
                      value="-3.0"
                      positive={false}
                    />
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Trophy className="w-3 h-3" />
                      Resultado do time
                    </p>
                    <div className="divide-y divide-border/30">
                      <EventRow icon={TrendingUp} label="Vitória" value="+0.2" positive />
                      <EventRow icon={TrendingDown} label="Derrota" value="-0.2" positive={false} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 3: Highlights (post-match) */}
        <Card className="noise border-border/40">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Passo 3
            </p>
            <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Destaques pós-jogo
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Após cada partida, o capitão escolhe até 3 destaques do próprio
              time e 1 jogador adversário que merece reconhecimento.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Escolhas do próprio capitão
                </p>
                <div className="divide-y divide-border/30">
                  <EventRow icon={Award} label="MVP do time" value="+0.8" positive />
                  <EventRow icon={Medal} label="2º destaque" value="+0.5" positive />
                  <EventRow icon={Star} label="3º destaque" value="+0.3" positive />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-2 flex items-center gap-1.5">
                  <Handshake className="w-3 h-3" />
                  Escolha do capitão rival
                </p>
                <div className="divide-y divide-border/30">
                  <EventRow
                    icon={Handshake}
                    label="Respeito do rival"
                    value="+0.4"
                    positive
                    note="1 jogador do time adversário"
                  />
                </div>
                <div className="mt-3 p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-[11px] text-muted-foreground leading-relaxed">
                  Acumula com o destaque do próprio time. Um jogador pode ser
                  MVP do seu time <strong className="text-foreground">e</strong>{" "}
                  receber Respeito do rival no mesmo jogo.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Goal importance + Defense */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="noise border-border/40">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Passo 4
              </p>
              <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-500" />
                Importância do Gol
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Gols em momentos decisivos recebem bônus extra.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Abriu o placar", value: "+0.2", desc: "Primeiro gol da partida" },
                  { label: "Empatou", value: "+0.2", desc: "Deixou tudo igual" },
                  { label: "Virou / Desempatou", value: "+0.3", desc: "Colocou o time na frente" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/30"
                  >
                    <span className="text-lg font-black text-emerald-500 tabular-nums w-12 text-center shrink-0">
                      {item.value}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="noise border-border/40">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Passo 5
              </p>
              <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-500" />
                Defesa e Goleiro
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Bônus para quem mantém o zero e penalidades por gols sofridos.
              </p>

              <div className="divide-y divide-border/30 mb-4">
                <EventRow
                  icon={ShieldCheck}
                  label="Clean sheet"
                  value="+0.5"
                  positive
                  note="GOL, ZAG, LAT"
                />
                <EventRow
                  icon={ArrowDownRight}
                  label="Gol sofrido"
                  value="-0.15"
                  positive={false}
                  note="por gol"
                />
                <EventRow
                  icon={ShieldCheck}
                  label="Pênalti defendido"
                  value="+0.4"
                  positive
                  note="goleiro"
                />
                <EventRow
                  icon={Minus}
                  label="Pênalti perdido (adv.)"
                  value="+0.1"
                  positive
                  note="goleiro"
                />
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Obs:</strong> Clean sheet só vale
                para GOL, ZAG e LAT. Gols sofridos só contam enquanto o jogador
                estava em campo.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 6: Position weights */}
        <Card className="noise border-border/40">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Passo 6
            </p>
            <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-violet-500" />
              Peso por Posição
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Quanto mais rara a ação para a posição, maior o multiplicador.
              Gol de zagueiro vale mais que gol de atacante.
            </p>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Posição
                    </th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Gol
                    </th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Assist
                    </th>
                    <th className="text-center py-2.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Clean Sheet
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positionRows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${row.color}`} />
                          <span className="font-semibold text-xs">{row.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {row.key}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-mono font-bold tabular-nums">
                        {row.gol}
                      </td>
                      <td className="text-center py-3 px-3 font-mono font-bold tabular-nums">
                        {row.assist}
                      </td>
                      <td className="text-center py-3 px-3 font-mono font-bold tabular-nums text-muted-foreground">
                        {row.cs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Step 7: Efficiency */}
        <Card className="noise border-border/40">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Passo 7
            </p>
            <h2 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2">
              <Timer className="w-4 h-4 text-cyan-500" />
              Multiplicador de Eficiência
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Quem joga menos tempo e contribui recebe um pequeno bônus. A
              fórmula considera a proporção de tempo em campo.
            </p>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/30 mb-6">
              <div className="text-center">
                <span className="font-mono text-xs text-muted-foreground">
                  multiplicador ={" "}
                </span>
                <span className="font-mono text-sm font-bold">
                  1 + (1 - minutos / duração) x 0.3
                </span>
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-1.5">
                Máximo: <strong className="text-cyan-500">1.35x</strong> &bull; Aplicado a gols e
                assistências
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[
                { time: "85'", mult: "1.00x", highlight: false },
                { time: "60'", mult: "1.09x", highlight: false },
                { time: "45'", mult: "1.14x", highlight: false },
                { time: "30'", mult: "1.19x", highlight: true },
                { time: "15'", mult: "1.25x", highlight: true },
              ].map((item) => (
                <div
                  key={item.time}
                  className={`text-center p-3 rounded-lg border transition-colors ${
                    item.highlight
                      ? "bg-cyan-500/10 border-cyan-500/20"
                      : "bg-muted/30 border-border/30"
                  }`}
                >
                  <span className="block text-[10px] text-muted-foreground font-medium mb-1">
                    {item.time}
                  </span>
                  <span
                    className={`block font-mono font-bold text-sm tabular-nums ${
                      item.highlight ? "text-cyan-500" : ""
                    }`}
                  >
                    {item.mult}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Example */}
        <Card className="noise border-primary/20">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Exemplo Prático
              </p>
            </div>
            <h2 className="text-lg font-bold tracking-tight mb-1">
              Atacante titular — partida inteira
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Fez <strong className="text-foreground">1 gol</strong> (abriu o
              placar) e{" "}
              <strong className="text-foreground">1 assistência</strong>. Time
              venceu. Foi eleito <strong className="text-amber-400">MVP</strong>{" "}
              pelo capitão e recebeu{" "}
              <strong className="text-teal-300">Respeito</strong> do capitão
              rival.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-1 w-full">
                <div className="space-y-0 divide-y divide-border/20">
                  {[
                    { label: "Nota base", val: "6.00", color: "" },
                    { label: "Gol (1.0 x 1.0 ATA)", val: "+1.00", color: "text-emerald-500" },
                    { label: "Abriu o placar", val: "+0.20", color: "text-emerald-500" },
                    { label: "Assistência (0.5 x 0.8 ATA)", val: "+0.40", color: "text-emerald-500" },
                    { label: "Vitória", val: "+0.20", color: "text-emerald-500" },
                    { label: "MVP do time", val: "+0.80", color: "text-emerald-500" },
                    { label: "Respeito do rival", val: "+0.40", color: "text-emerald-500" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between py-2 px-3 text-sm hover:bg-muted/30 rounded transition-colors"
                    >
                      <span className="text-muted-foreground font-mono text-xs">
                        {row.label}
                      </span>
                      <span className={`font-mono font-bold tabular-nums text-xs ${row.color}`}>
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between py-3 px-3 mt-2 border-t-2 border-primary/20 rounded">
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-primary" />
                    Nota Final
                  </span>
                  <span className="font-mono font-bold tabular-nums text-sm">
                    9.00
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-3 sm:pt-8 sm:pr-4">
                <RatingBadge value="9.0" size="xl" />
                <span className="text-[10px] text-muted-foreground">
                  arredondado
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
