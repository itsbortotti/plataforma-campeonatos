import { redirect } from "next/navigation";
import { resolveDefaultCompetitionSlug } from "@/lib/competition-routes";

export default async function CalendarioRedirectPage() {
  const slug = await resolveDefaultCompetitionSlug();
  if (!slug) redirect("/campeonatos");
  redirect(`/campeonato/${slug}/calendario`);
}
