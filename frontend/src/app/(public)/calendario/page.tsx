import { redirect } from "next/navigation";
import { resolveDefaultCompetitionSlug } from "@/lib/competition-routes";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Calendário",
  description: "Agenda de jogos do campeonato em andamento na SFL.",
  path: "/calendario",
});

export default async function CalendarioRedirectPage() {
  const slug = await resolveDefaultCompetitionSlug();
  if (!slug) redirect("/campeonatos");
  redirect(`/campeonato/${slug}/calendario`);
}
