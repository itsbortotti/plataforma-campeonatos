import { redirect } from "next/navigation";
import { resolveDefaultCompetitionSlug } from "@/lib/competition-routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Classificação",
  description: "Tabela de pontos do campeonato em andamento na SFL.",
  path: "/classificacao",
});

export default async function ClassificacaoRedirectPage() {
  const slug = await resolveDefaultCompetitionSlug();
  if (!slug) redirect("/campeonatos");
  redirect(`/campeonato/${slug}/classificacao`);
}
