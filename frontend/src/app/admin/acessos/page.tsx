import { redirect } from "next/navigation";

/** Renomeado para Perfis de acesso. */
export default function AcessosRedirectPage() {
  redirect("/admin/perfis");
}
