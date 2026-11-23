import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Play } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { getSeasons, getTeams } from "@/lib/queries";
import type { Competition } from "@/lib/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CompetitionSeasonActions } from "@/components/admin/CompetitionSeasonActions";

export default async function CampeonatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [competitions, seasons, teams] = await Promise.all([
    apiGet<Competition[]>("/api/competitions?all=1").catch(
      () => [] as Competition[],
    ),
    getSeasons(null),
    getTeams(null),
  ]);

  const competition = competitions.find((c) => c.id === id);
  if (!competition) notFound();

  const compSeasons = seasons
    .filter((s) => s.competitionId === id)
    .sort((a, b) => b.year - a.year);

  const formatLabel =
    competition.format === "knockout"
      ? "Mata-mata"
      : competition.format === "groups_knockout"
        ? "Grupos + mata-mata"
        : "Pontos corridos";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/admin/campeonatos"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todos os campeonatos
        </Link>
        <AdminPageHeader
          title={competition.name}
          description={`${formatLabel}${competition.isActive ? " · ativo" : " · inativo"}. Escolha a temporada para operar partidas e elenco no escopo do topo.`}
        />
      </div>

      <section className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-black tracking-tight">Temporadas</h2>
          <CompetitionSeasonActions
            competitionId={competition.id}
            competitions={[competition]}
            teams={teams}
          />
        </div>

        <div className="p-4 sm:p-5">
        {compSeasons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-6 py-10 text-sm text-muted-foreground text-center">
            Nenhuma temporada. Crie a primeira para gerar partidas.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {compSeasons.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/40 bg-background/30 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.year}
                      {typeof s.matchCount === "number"
                        ? ` · ${s.matchCount} partida${s.matchCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {s.isCurrent ? (
                    <Badge variant="default">Atual</Badge>
                  ) : (
                    <Badge variant="secondary">Arquivo</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin?season=${s.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Entrar
                  </Link>
                  <Link
                    href={`/admin/partidas?season=${s.id}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "gap-1.5",
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Partidas
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
