import { apiGet } from "@/lib/api-server";
import {
  DEFAULT_BRAND,
  resolveSponsors,
  type SystemBrand,
} from "@/lib/brand";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SystemSettingsForm } from "@/components/admin/SystemSettingsForm";

export default async function ConfiguracoesPage() {
  const settings = await apiGet<SystemBrand>("/api/settings").catch(
    () => DEFAULT_BRAND,
  );
  const initial: SystemBrand = {
    ...DEFAULT_BRAND,
    ...settings,
    sponsors: resolveSponsors({
      sponsors: settings.sponsors ?? [],
    }),
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Configurações"
        description="Logo principal, nome da marca e preferências do site e do sistema."
      />
      <SystemSettingsForm initial={initial} />
    </div>
  );
}
