import { Suspense } from "react";
import { apiGet } from "@/lib/api-server";
import { AuditLog, type AuditEntry } from "@/components/admin/AuditLog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  buildListQuery,
  parseListSearchParams,
  type Paginated,
} from "@/lib/pagination";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, pageSize, q } = parseListSearchParams(sp);
  const qs = buildListQuery({ page, pageSize, q });

  const data = await apiGet<Paginated<AuditEntry>>(
    `/api/admin/audit?${qs}`,
  ).catch(
    () =>
      ({
        items: [],
        total: 0,
        page: 1,
        pageSize,
        pageCount: 1,
        hasNext: false,
        hasPrev: false,
      }) satisfies Paginated<AuditEntry>,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Auditoria"
        description="Histórico das ações administrativas — lista paginada."
      />
      <Suspense fallback={null}>
        <AuditLog
          entries={data.items}
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          pageSize={data.pageSize}
        />
      </Suspense>
    </div>
  );
}
