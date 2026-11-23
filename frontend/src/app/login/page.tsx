import { redirect } from "next/navigation";

/** Login legado → escolha Master / Time. */
export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (next?.startsWith("/admin")) redirect("/master/login");
  if (next?.startsWith("/capitao")) redirect("/time/login");
  redirect("/master/login");
}
