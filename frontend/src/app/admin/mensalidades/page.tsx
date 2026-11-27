import { apiGet } from "@/lib/api-server";
import { ApiError } from "@/lib/api-error";
import { getCurrentSeason } from "@/lib/queries";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  MensalidadesPanel,
  type BillingOverview,
} from "@/components/admin/MensalidadesPanel";

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export default async function MensalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; season?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentMonth();
  const currentSeason = params.season ? null : await getCurrentSeason(null);
  const seasonId = params.season ?? currentSeason?.id ?? "";
  const query = new URLSearchParams({ month });
  if (seasonId) query.set("season", seasonId);

  let overview: BillingOverview | null = null;
  let error: string | null = null;
  try {
    overview = await apiGet<BillingOverview>(
      `/api/admin/billing/overview?${query.toString()}`,
    );
  } catch (err) {
    error =
      err instanceof ApiError
        ? err.message
        : "Não foi possível carregar as mensalidades.";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mensalidades"
        description="Quem pagou, quem está pendente ou atrasado, com o link de cada fatura para o WhatsApp."
      />
      {error || !overview ? (
        <p className="text-sm text-destructive">{error ?? "Sem dados."}</p>
      ) : (
        <MensalidadesPanel overview={overview} seasonId={seasonId} />
      )}
    </div>
  );
}
