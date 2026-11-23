"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSystemSettings } from "@/app/admin/configuracoes/actions";
import {
  SYSTEM_LOGO_SRC,
  type SponsorBrand,
  type SystemBrand,
  resolveLogoSrc,
} from "@/lib/brand";
import { API_URL } from "@/lib/api";

type Props = {
  initial: SystemBrand;
};

function newSponsorId() {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </section>
  );
}

export function SystemSettingsForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadingSponsorId, setUploadingSponsorId] = useState<string | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const sponsorFileRef = useRef<HTMLInputElement>(null);
  const sponsorUploadTarget = useRef<string | null>(null);

  const [siteName, setSiteName] = useState(initial.siteName);
  const [tagline, setTagline] = useState(initial.tagline);
  const [description, setDescription] = useState(initial.description ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail ?? "");
  const [footerText, setFooterText] = useState(initial.footerText ?? "");
  const [masterLabel, setMasterLabel] = useState(initial.masterLabel);
  const [sponsors, setSponsors] = useState<SponsorBrand[]>(
    initial.sponsors ?? [],
  );

  const previewSrc = resolveLogoSrc({ logoUrl });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/storage/system-logo`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `Upload ${res.status}`,
        );
      }
      const data = (await res.json()) as { url: string };
      setLogoUrl(data.url);
      toast.success("Logo enviada — salve para publicar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSponsorUpload(file: File, sponsorId: string) {
    setUploadingSponsorId(sponsorId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/api/storage/sponsor-logo`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `Upload ${res.status}`,
        );
      }
      const data = (await res.json()) as { url: string };
      setSponsors((list) =>
        list.map((s) =>
          s.id === sponsorId ? { ...s, imageUrl: data.url } : s,
        ),
      );
      toast.success("Imagem do patrocinador enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploadingSponsorId(null);
      sponsorUploadTarget.current = null;
      if (sponsorFileRef.current) sponsorFileRef.current.value = "";
    }
  }

  function handleSave() {
    if (!siteName.trim()) {
      toast.error("Nome do site é obrigatório");
      return;
    }
    for (const s of sponsors) {
      if (!s.name.trim() || !s.imageUrl.trim()) {
        toast.error("Cada patrocinador precisa de nome e imagem");
        return;
      }
    }
    startTransition(async () => {
      const result = await saveSystemSettings({
        siteName: siteName.trim(),
        tagline: tagline.trim() || "Plataforma de campeonatos",
        description: description.trim(),
        logoUrl,
        supportEmail: supportEmail.trim(),
        footerText: footerText.trim(),
        masterLabel: masterLabel.trim() || "Master",
        sponsors: sponsors.map((s) => ({
          ...s,
          name: s.name.trim(),
          imageUrl: s.imageUrl.trim(),
          linkUrl: s.linkUrl?.trim() || null,
        })),
      });
      if (result.success && result.data) {
        setSiteName(result.data.siteName);
        setTagline(result.data.tagline);
        setDescription(result.data.description ?? "");
        setLogoUrl(result.data.logoUrl);
        setSupportEmail(result.data.supportEmail ?? "");
        setFooterText(result.data.footerText ?? "");
        setMasterLabel(result.data.masterLabel);
        setSponsors(result.data.sponsors ?? []);
        toast.success("Configurações salvas");
      } else {
        toast.error(result.error ?? "Erro ao salvar");
      }
    });
  }

  const saveDisabled =
    pending || uploading || Boolean(uploadingSponsorId);

  const saveButton = (
    <Button onClick={handleSave} disabled={saveDisabled} size="sm">
      <Save className="h-4 w-4 mr-1.5" />
      {pending ? "Salvando…" : "Salvar"}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Identidade pública, patrocinadores e rótulos do painel.
        </p>
        {saveButton}
      </div>

      <Section
        title="Marca"
        description="Logo e nome usados no site público, login e painel Master."
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Prévia da logo"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-xl object-contain ring-1 ring-border/60 bg-background"
          />
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading || pending}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              {uploading ? "Enviando…" : "Trocar logo"}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => setLogoUrl(null)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Usar logo padrão
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Padrão: {SYSTEM_LOGO_SRC}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="siteName">Nome do site</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="SFL"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Plataforma de campeonatos"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição (SEO / sobre)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Texto curto sobre a plataforma"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Patrocinadores"
        description="Aparecem na home. Imagem + link opcional ao clicar."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              setSponsors((list) => [
                ...list,
                {
                  id: newSponsorId(),
                  name: "",
                  imageUrl: "",
                  linkUrl: null,
                },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        }
      >
        <input
          ref={sponsorFileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const id = sponsorUploadTarget.current;
            if (f && id) void handleSponsorUpload(f, id);
          }}
        />

        {sponsors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhum patrocinador. O site usa os padrão até você salvar a lista.
          </div>
        ) : (
          <ul className="rounded-xl border border-border/40 bg-background/30 divide-y divide-border/40 overflow-hidden">
            {sponsors.map((s) => (
              <li key={s.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-muted/40 ring-1 ring-border/50 overflow-hidden shrink-0">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="max-h-12 max-w-[5.5rem] object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Sem imagem
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploadingSponsorId === s.id || pending}
                      onClick={() => {
                        sponsorUploadTarget.current = s.id;
                        sponsorFileRef.current?.click();
                      }}
                    >
                      <ImagePlus className="h-4 w-4 mr-1.5" />
                      {uploadingSponsorId === s.id ? "Enviando…" : "Imagem"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={pending}
                      onClick={() =>
                        setSponsors((list) =>
                          list.filter((x) => x.id !== s.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Remover
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input
                      value={s.name}
                      onChange={(e) =>
                        setSponsors((list) =>
                          list.map((x) =>
                            x.id === s.id
                              ? { ...x, name: e.target.value }
                              : x,
                          ),
                        )
                      }
                      placeholder="Nome do patrocinador"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Link (opcional)</Label>
                    <Input
                      value={s.linkUrl ?? ""}
                      onChange={(e) =>
                        setSponsors((list) =>
                          list.map((x) =>
                            x.id === s.id
                              ? {
                                  ...x,
                                  linkUrl: e.target.value || null,
                                }
                              : x,
                          ),
                        )
                      }
                      placeholder="https://…"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Site" description="Contato e rodapé públicos.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="supportEmail">E-mail de suporte</Label>
            <Input
              id="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="contato@exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="footerText">Texto extra do rodapé</Label>
            <Input
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Sistema"
        description="Rótulos do painel administrativo."
      >
        <div className="space-y-1.5 max-w-md">
          <Label htmlFor="masterLabel">Nome do painel Master</Label>
          <Input
            id="masterLabel"
            value={masterLabel}
            onChange={(e) => setMasterLabel(e.target.value)}
            placeholder="Master"
          />
        </div>
      </Section>

      <div className="flex justify-end pt-1">{saveButton}</div>
    </div>
  );
}
