"use server";

import { revalidatePath } from "next/cache";
import { apiPut } from "@/lib/api-server";
import type { SponsorBrand, SystemBrand } from "@/lib/brand";

export async function saveSystemSettings(fields: {
  siteName: string;
  tagline: string;
  description: string;
  logoUrl: string | null;
  supportEmail: string;
  footerText: string;
  masterLabel: string;
  sponsors: SponsorBrand[];
}) {
  try {
    const data = await apiPut<SystemBrand>("/api/admin/settings", {
      siteName: fields.siteName,
      tagline: fields.tagline,
      description: fields.description || null,
      logoUrl: fields.logoUrl,
      supportEmail: fields.supportEmail || null,
      footerText: fields.footerText || null,
      masterLabel: fields.masterLabel,
      sponsors: fields.sponsors,
    });
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/configuracoes");
    return { success: true as const, data };
  } catch (e) {
    return {
      success: false as const,
      error: e instanceof Error ? e.message : "Erro",
      data: null,
    };
  }
}
