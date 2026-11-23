import { redirect } from "next/navigation";

/** Renomeado para /admin/auditoria. */
export default function AuditRedirectPage() {
  redirect("/admin/auditoria");
}
