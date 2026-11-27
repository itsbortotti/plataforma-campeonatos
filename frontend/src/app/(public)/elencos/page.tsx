import { redirect } from "next/navigation";
import { resolveDefaultCompetitionSlug } from "@/lib/competition-routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Elencos",
  description: "Elencos do campeonato em andamento na SFL.",
  path: "/elencos",
});

export default async function ElencosRedirectPage() {
  const slug = await resolveDefaultCompetitionSlug();
  if (!slug) redirect("/campeonatos");
  redirect(`/campeonato/${slug}/elencos`);
}
