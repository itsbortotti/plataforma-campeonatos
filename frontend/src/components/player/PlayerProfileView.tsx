import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Award,
  Flag,
  Goal,
  HandHelping,
  RectangleVertical,
  Repeat,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamBadge } from "@/components/TeamBadge";
import type {
  PlayerCareerTotals,
  PlayerMatchAppearance,
  PlayerProfile,
  PlayerSeasonEntry,
} from "@/lib/queries";
import type { Position } from "@/types";
import { formatDate } from "@/lib/format-date";

const positionLabel: Record<Position, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

const positionColor: Record<Position, string> = {
  GOL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ZAG: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LAT: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  VOL: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  MEI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ATA: "bg-red-500/20 text-red-400 border-red-500/30",
};

function goalRatio(goals: number, matches: number): string {
  if (matches === 0) return "-";
  return (goals / matches).toFixed(2).replace(".", ",");
}

function formatRating(rating: number | null): string {
  if (rating == null) return "-";
  return rating.toFixed(1).replace(".", ",");
}

function ratingColor(rating: number): string {
  if (rating >= 8.0) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (rating >= 7.0) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (rating >= 6.0) return "bg-muted text-foreground border-border/40";
  if (rating >= 5.0) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
  return "bg-red-500/20 text-red-400 border-red-500/40";
}

function ratingSolidColor(rating: number): string {
  if (rating >= 8.0) return "bg-blue-600";
  if (rating >= 7.0) return "bg-emerald-600";
  if (rating >= 6.0) return "bg-amber-500";
  if (rating >= 5.0) return "bg-orange-500";
  return "bg-red-500";
}

interface BackLink {
  href: string;
  label: string;
}

interface Props {
  profile: PlayerProfile;
  backLink?: BackLink | null;
  actionSlot?: ReactNode;
}

export function PlayerProfileView({ profile, backLink, actionSlot }: Props) {
  const position = profile.position as Position;
  const current = profile.currentSeason;
  const currentStats =
    current && profile.seasons.find((s) => s.seasonId === current.seasonId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {backLink && (
        <Link
          href={backLink.href}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLink.label}
        </Link>
      )}

      <PlayerHero
        profile={profile}
        position={position}
        actionSlot={actionSlot}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <StatsCard
          title="Temporada Atual"
          subtitle={current ? `${current.seasonName} • ${current.year}` : "-"}
          empty={!currentStats}
          emptyMessage="Jogador não está em nenhum elenco na temporada atual."
          stats={currentStats ? toStatList(currentStats) : []}
        />
        <StatsCard
          title="Carreira"
          subtitle={`${profile.seasons.length} ${
            profile.seasons.length === 1 ? "temporada" : "temporadas"
          }`}
          empty={profile.career.matchesPlayed === 0}
          emptyMessage="Sem jogos disputados até o momento."
          stats={careerToStatList(profile.career)}
        />
      </div>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Histórico por temporada
        </h2>
        <SeasonsHistoryTable seasons={profile.seasons} />
      </section>

      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Últimos jogos
        </h2>
        <RecentMatchesList
          matches={profile.recentMatches}
          playerId={profile.id}
        />
      </section>
    </div>
  );
}

function toStatList(s: PlayerSeasonEntry): Stat[] {
  return [
    {
      icon: Award,
      label: "Nota média",
      value: formatRating(s.averageRating ?? null),
      accent:
        s.averageRating != null
          ? "text-[var(--color-gold)]"
          : "text-muted-foreground",
    },
    {
      icon: Goal,
      label: "Gols",
      value: s.goals,
      accent: "text-[var(--color-gold)]",
    },
    { icon: HandHelping, label: "Assistências", value: s.assists },
    { icon: Flag, label: "Jogos", value: s.matchesPlayed ?? s.matches },
    { icon: Star, label: "Titular", value: s.starts ?? 0 },
    {
      icon: RectangleVertical,
      label: "Amarelos",
      value: s.yellowCards,
      accent: "text-yellow-400",
    },
    {
      icon: RectangleVertical,
      label: "Vermelhos",
      value: s.redCards,
      accent: "text-red-500",
    },
  ];
}

function careerToStatList(c: PlayerCareerTotals): Stat[] {
  return [
    {
      icon: Award,
      label: "Nota média",
      value: formatRating(c.averageRating ?? null),
      accent:
        c.averageRating != null
          ? "text-[var(--color-gold)]"
          : "text-muted-foreground",
    },
    {
      icon: Goal,
      label: "Gols",
      value: c.goals,
      accent: "text-[var(--color-gold)]",
    },
    { icon: HandHelping, label: "Assistências", value: c.assists },
    { icon: Flag, label: "Jogos", value: c.matchesPlayed ?? c.matches },
    { icon: Star, label: "Titular", value: c.starts ?? 0 },
    { icon: Repeat, label: "Entrou", value: c.substitutionsIn ?? 0 },
    {
      icon: RectangleVertical,
      label: "Amarelos",
      value: c.yellowCards,
      accent: "text-yellow-400",
    },
    {
      icon: RectangleVertical,
      label: "Vermelhos",
      value: c.redCards,
      accent: "text-red-500",
    },
    {
      icon: Award,
      label: "Gols/jogo",
      value: goalRatio(c.goals, c.matchesPlayed ?? c.matches),
    },
  ];
}

function PlayerHero({
  profile,
  position,
  actionSlot,
}: {
  profile: PlayerProfile;
  position: Position;
  actionSlot?: ReactNode;
}) {
  const team = profile.currentSeason?.team ?? null;
  const accent = team?.primaryColor ?? "#525252";

  return (
    <Card
      className="overflow-hidden py-0 gap-0 border-border/40"
      style={{
        background: `linear-gradient(135deg, ${accent}20 0%, transparent 60%)`,
      }}
    >
      <CardContent className="px-6 py-6">
        <div className="flex items-start gap-6 flex-wrap">
          <div
            className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accent}40 0%, ${accent}10 100%)`,
              boxShadow: `0 4px 24px ${accent}30`,
            }}
          >
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt={profile.nickname}
                fill
                className="object-cover"
                sizes="112px"
                unoptimized
              />
            ) : (
              <User className="h-12 w-12 text-foreground/30" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {positionLabel[position] ?? position}
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                {profile.nickname}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.name}</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] border ${positionColor[position] ?? ""}`}
              >
                {position}
              </Badge>
              {profile.currentSeason?.isCaptain && (
                <Badge className="text-[10px] bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                  Capitão
                </Badge>
              )}
              {profile.currentSeason && team && (
                <Link
                  href="/elencos"
                  className="flex items-center gap-2 rounded-lg bg-card/60 border border-border/40 px-3 py-1.5 hover:bg-card transition-colors"
                >
                  <TeamBadge
                    name={team.name}
                    shortName={team.shortName}
                    primaryColor={team.primaryColor}
                    logoUrl={team.logoUrl}
                    size="sm"
                  />
                  <span className="text-sm font-semibold">{team.name}</span>
                  <span
                    className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded text-[10px] font-black text-white"
                    style={{ background: team.primaryColor }}
                  >
                    {profile.currentSeason.number}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0 ml-auto">
            {profile.career.averageRating != null && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`${ratingSolidColor(profile.career.averageRating)} text-white font-black tabular-nums px-3 py-1.5 text-xl rounded-lg shadow-md leading-none`}
                >
                  {formatRating(profile.career.averageRating)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Nota
                </span>
              </div>
            )}
            {actionSlot}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: string;
}

function StatsCard({
  title,
  subtitle,
  stats,
  empty,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  stats: Stat[];
  empty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm py-4">
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-foreground/80 mt-0.5">{subtitle}</p>
          )}
        </div>

        {empty ? (
          <p className="text-sm text-muted-foreground/70 italic py-6">
            {emptyMessage ?? "Sem dados disponíveis."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-lg bg-background/40 border border-border/30 p-3 flex flex-col items-start gap-1"
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${s.accent ?? "text-muted-foreground"}`}
                  />
                  <span className="text-xl font-black tabular-nums leading-none">
                    {s.value}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeasonsHistoryTable({ seasons }: { seasons: PlayerSeasonEntry[] }) {
  if (seasons.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/40 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Jogador ainda não participou de nenhuma temporada.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/40 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider">
              Temporada
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider">
              Time
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-12 text-center">
              Nº
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              Jogos
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              Titular
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-16 text-center">
              Nota
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              G
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              A
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              CA
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider w-14 text-center">
              CV
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seasons.map((s) => (
            <TableRow
              key={s.seasonId}
              className="border-border/30 hover:bg-accent/30"
            >
              <TableCell className="font-semibold">
                <span className="flex items-center gap-2">
                  {s.seasonName}
                  {s.isCurrent && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0">
                      Atual
                    </Badge>
                  )}
                  {s.isCaptain && (
                    <Badge className="bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 text-[9px] px-1.5 py-0">
                      Capitão
                    </Badge>
                  )}
                </span>
              </TableCell>
              <TableCell>
                {s.team ? (
                  <span className="flex items-center gap-2">
                    <TeamBadge
                      name={s.team.name}
                      shortName={s.team.shortName}
                      primaryColor={s.team.primaryColor}
                      logoUrl={s.team.logoUrl}
                      size="sm"
                    />
                    <span className="text-sm">{s.team.shortName}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums text-muted-foreground">
                {s.number ?? "-"}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {s.matchesPlayed}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {s.starts}
              </TableCell>
              <TableCell className="text-center">
                {s.averageRating != null ? (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-black tabular-nums px-1.5 py-0 ${ratingColor(s.averageRating)}`}
                  >
                    {formatRating(s.averageRating)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center tabular-nums font-bold">
                {s.goals}
              </TableCell>
              <TableCell className="text-center tabular-nums font-bold">
                {s.assists}
              </TableCell>
              <TableCell className="text-center tabular-nums text-yellow-400">
                {s.yellowCards || ""}
              </TableCell>
              <TableCell className="text-center tabular-nums text-red-500">
                {s.redCards || ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentMatchesList({
  matches,
  playerId,
}: {
  matches: PlayerMatchAppearance[];
  playerId: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-card/40 py-10 text-center">
        <p className="text-sm text-muted-foreground">Sem jogos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((m) => {
        const isHome = m.playerTeam?.id === m.homeTeam.id;
        const playerScore = isHome ? m.homeScore : m.awayScore;
        const opponentScore = isHome ? m.awayScore : m.homeScore;
        const scoreKnown = m.homeScore != null && m.awayScore != null;
        const result = !scoreKnown
          ? "-"
          : playerScore! > opponentScore!
            ? "V"
            : playerScore! < opponentScore!
              ? "D"
              : "E";
        const resultColor =
          result === "V"
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : result === "D"
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : result === "E"
                ? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                : "bg-muted text-muted-foreground border-border/40";

        const opponent = isHome ? m.awayTeam : m.homeTeam;

        return (
          <Link
            key={`${m.matchId}-${playerId}`}
            href={`/partida/${m.matchId}`}
            className="block"
          >
            <div className="flex items-center gap-3 rounded-lg bg-card border border-border/40 px-4 py-3 hover:border-border transition-colors">
              <Badge
                variant="secondary"
                className="text-[10px] font-bold shrink-0 w-8 justify-center"
              >
                R{m.round}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums w-16 shrink-0">
                {formatDate(m.date)}
              </span>
              {m.playerTeam && (
                <TeamBadge
                  name={m.playerTeam.name}
                  shortName={m.playerTeam.shortName}
                  primaryColor={m.playerTeam.primaryColor}
                  logoUrl={m.playerTeam.logoUrl}
                  size="sm"
                />
              )}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">
                  vs
                </span>
                <TeamBadge
                  name={opponent.name}
                  shortName={opponent.shortName}
                  primaryColor={opponent.primaryColor}
                  logoUrl={opponent.logoUrl}
                  size="sm"
                />
                <span className="text-sm font-semibold truncate">
                  {opponent.shortName}
                </span>
              </div>

              <span className="tabular-nums font-black text-sm px-2">
                {scoreKnown ? `${playerScore} - ${opponentScore}` : "-"}
              </span>

              <Badge
                variant="outline"
                className={`text-[10px] border w-6 justify-center ${resultColor}`}
                title={
                  result === "V"
                    ? "Vitória"
                    : result === "D"
                      ? "Derrota"
                      : result === "E"
                        ? "Empate"
                        : undefined
                }
              >
                {result}
              </Badge>

              <div className="flex items-center gap-1 shrink-0">
                {m.rating != null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-black tabular-nums ${ratingColor(m.rating)}`}
                    title="Nota"
                  >
                    {formatRating(m.rating)}
                  </Badge>
                )}
                {m.goals > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/30"
                    title="Gols"
                  >
                    {m.goals}G
                  </Badge>
                )}
                {m.assists > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-border/50"
                    title="Assistências"
                  >
                    {m.assists}A
                  </Badge>
                )}
                {m.yellowCards > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    title="Amarelos"
                  >
                    {m.yellowCards > 1 ? `${m.yellowCards}CA` : "CA"}
                  </Badge>
                )}
                {m.redCards > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30"
                    title="Vermelho"
                  >
                    CV
                  </Badge>
                )}
                {!m.wasStarter && m.cameOnAsSub && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-border/40 text-muted-foreground"
                    title="Entrou no segundo tempo / durante o jogo"
                  >
                    sub
                  </Badge>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
