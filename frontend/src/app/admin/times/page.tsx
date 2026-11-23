import { Suspense } from "react";
import { apiGet } from "@/lib/api-server";
import { TeamsTable } from "@/components/admin/TeamsTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Team } from "@/lib/queries";
import {
  buildListQuery,
  parseListSearchParams,
  type Paginated,
} from "@/lib/pagination";

export default async function TimesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { page, pageSize, q } = parseListSearchParams(sp);
  const qs = buildListQuery({ page, pageSize, q });

  const data = await apiGet<Paginated<Team>>(`/api/admin/teams?${qs}`).catch(
    () =>
      ({
        items: [],
        total: 0,
        page: 1,
        pageSize,
        pageCount: 1,
        hasNext: false,
        hasPrev: false,
      }) satisfies Paginated<Team>,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Times"
        description="Cadastro dos clubes — lista paginada para ligas com muitos times."
      />
      <Suspense fallback={null}>
        <TeamsTable
          teams={data.items}
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          pageSize={data.pageSize}
        />
      </Suspense>
    </div>
  );
}
