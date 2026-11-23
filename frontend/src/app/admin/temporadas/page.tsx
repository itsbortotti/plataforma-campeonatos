import { redirect } from "next/navigation";

/** Temporadas vivem dentro do campeonato (hub). */
export default async function TemporadasPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const { competition } = await searchParams;
  if (competition) {
    redirect(`/admin/campeonatos/${competition}`);
  }
  redirect("/admin/campeonatos");
}
