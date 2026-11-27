"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiPost, apiPut } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type MonthStatus = "paid" | "pending" | "overdue" | "refunded" | "none";
export type BillingMethod = "CREDIT_CARD" | "PIX" | "BOLETO";

export type BillingOverview = {
  configured: boolean;
  environment: "sandbox" | "production" | null;
  month: string;
  today: string;
  seasonId: string | null;
  settings: {
    monthlyAmountCents: number;
    dueDay: number;
    fineType: "FIXED" | "PERCENTAGE";
    fineFixedCents: number;
    finePercentBps: number;
    interestPercentBps: number;
    suspensionBuyoutEnabled: boolean;
    suspensionFineCents: number;
  };
  summary: {
    paid: number;
    pending: number;
    overdue: number;
    none: number;
    refunded: number;
    expectedCents: number;
    receivedCents: number;
  };
  players: Array<{
    playerId: string;
    name: string;
    nickname: string;
    teamName: string | null;
    billingType: BillingMethod | null;
    accountStatus: string;
    hasSubscription: boolean;
    cpfMasked: string | null;
    cardLast4: string | null;
    cardBrand: string | null;
    monthStatus: MonthStatus;
    charge: null | {
      valueCents: number;
      dueDate: string;
      invoiceUrl: string | null;
      bankSlipUrl: string | null;
      status: string;
      paidAt: string | null;
    };
    suspensionCharge: null | {
      valueCents: number;
      dueDate: string;
      invoiceUrl: string | null;
      status: string;
      buyoutApplied: boolean;
    };
  }>;
};

const STATUS_LABEL: Record<MonthStatus, string> = {
  paid: "Em dia",
  pending: "Pendente",
  overdue: "Atrasado",
  refunded: "Estornado",
  none: "Sem cobrança",
};

const METHOD_LABEL: Record<BillingMethod, string> = {
  CREDIT_CARD: "Cartão",
  PIX: "Pix",
  BOLETO: "Boleto",
};

type Filter = "all" | MonthStatus;

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
}

function formatDay(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function reaisToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function bpsToInput(bps: number) {
  return (bps / 100).toFixed(2).replace(".", ",");
}

function inputToBps(value: string) {
  return reaisToCents(value);
}

export function MensalidadesPanel({
  overview,
  seasonId,
}: {
  overview: BillingOverview;
  seasonId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [subscribeFor, setSubscribeFor] = useState<BillingOverview["players"][number] | null>(null);
  const [fineFor, setFineFor] = useState<BillingOverview["players"][number] | null>(null);

  const players = useMemo(() => {
    const text = query.trim().toLowerCase();
    return overview.players.filter((player) => {
      if (filter !== "all" && player.monthStatus !== filter) return false;
      if (!text) return true;
      return (
        player.name.toLowerCase().includes(text) ||
        player.nickname.toLowerCase().includes(text) ||
        (player.teamName ?? "").toLowerCase().includes(text)
      );
    });
  }, [overview.players, filter, query]);

  function changeMonth(month: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("month", month);
    if (seasonId) params.set("season", seasonId);
    router.push(`/admin/mensalidades?${params.toString()}`);
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da cobrança copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="space-y-6">
      {!overview.configured ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Asaas desativado neste servidor. O site continua no ar. Para cobrar,
          defina <code>ASAAS_API_KEY</code>, <code>ASAAS_WEBHOOK_TOKEN</code> e{" "}
          <code>ASAAS_ENV</code> (<code>sandbox</code> ou <code>production</code>) no
          serviço da API no Render e faça um novo deploy.
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ambiente Asaas:{" "}
          <strong>{overview.environment === "production" ? "produção" : "sandbox"}</strong>
          . Cartão recorrente: o jogador cadastra o cartão na primeira fatura e o
          Asaas cobra os meses seguintes. Pix e boleto geram um link novo todo mês.
        </p>
      )}

      <SettingsForm
        overview={overview}
        busy={busy === "settings"}
        onSave={(body) =>
          run("settings", async () => {
            const result = await apiPut<{ applied: number; failed: number }>(
              "/api/admin/billing/settings",
              body,
            );
            toast.success(
              body.applyToActive
                ? `Regras salvas. Assinaturas atualizadas: ${result.applied}. Falhas: ${result.failed}.`
                : "Regras de mensalidade salvas.",
            );
          })
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Em dia" value={String(overview.summary.paid)} />
        <SummaryCard label="Pendentes" value={String(overview.summary.pending)} />
        <SummaryCard label="Atrasados" value={String(overview.summary.overdue)} />
        <SummaryCard
          label="Recebido no mês"
          value={`${formatBRL(overview.summary.receivedCents)} / ${formatBRL(overview.summary.expectedCents)}`}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="billing-month">Mês</Label>
          <Input
            id="billing-month"
            type="month"
            value={overview.month}
            onChange={(event) => changeMonth(event.target.value)}
          />
        </div>
        <div className="space-y-1 min-w-48 flex-1">
          <Label htmlFor="billing-search">Jogador</Label>
          <Input
            id="billing-search"
            value={query}
            placeholder="Nome, apelido ou time"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "Todos"],
              ["paid", "Em dia"],
              ["pending", "Pendentes"],
              ["overdue", "Atrasados"],
              ["none", "Sem cobrança"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!overview.configured || busy === "sync"}
          onClick={() =>
            run("sync", async () => {
              const result = await apiPost<{
                subscriptions: number;
                payments: number;
                failed: number;
              }>("/api/admin/billing/sync");
              toast.success(
                `Sincronizado: ${result.payments} fatura(s) em ${result.subscriptions} assinatura(s).`,
              );
            })
          }
        >
          <RefreshCw />
          Sincronizar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {monthLabel(overview.month)} · {players.length} jogador(es)
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jogador</TableHead>
            <TableHead>Forma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Cobrança</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                Nenhum jogador neste filtro.
              </TableCell>
            </TableRow>
          ) : (
            players.map((player) => {
              const url = player.charge?.invoiceUrl;
              const whatsapp = url
                ? `https://wa.me/?text=${encodeURIComponent(
                    `Fala, ${player.nickname}! Segue a mensalidade da SFL (${monthLabel(overview.month)}): ${url}`,
                  )}`
                : null;
              return (
                <TableRow key={player.playerId}>
                  <TableCell>
                    <div className="font-medium">{player.nickname}</div>
                    <div className="text-xs text-muted-foreground">
                      {player.name}
                      {player.teamName ? ` · ${player.teamName}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.billingType ? METHOD_LABEL[player.billingType] : "—"}
                    {player.cardLast4 ? (
                      <div className="text-xs text-muted-foreground">
                        {player.cardBrand ?? "Cartão"} •••• {player.cardLast4}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={player.monthStatus} />
                    {player.suspensionCharge ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Multa{" "}
                        {player.suspensionCharge.buyoutApplied
                          ? "paga e suspensão liberada"
                          : player.suspensionCharge.status === "received" ||
                              player.suspensionCharge.status === "confirmed"
                            ? "paga, sem liberar (regra desligada na hora)"
                            : "em aberto"}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {player.charge ? formatBRL(player.charge.valueCents) : "—"}
                  </TableCell>
                  <TableCell>
                    {player.charge ? formatDay(player.charge.dueDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!url}
                        onClick={() => url && copyLink(url)}
                      >
                        <Copy />
                        Copiar link
                      </Button>
                      {whatsapp ? (
                        <a
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                          href={whatsapp}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!overview.configured || busy === player.playerId}
                        onClick={() => setSubscribeFor(player)}
                      >
                        {player.hasSubscription ? "Trocar forma" : "Assinatura"}
                      </Button>
                      {player.hasSubscription ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy === player.playerId}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Cancelar a assinatura de ${player.nickname}? Faturas já geradas continuam no Asaas.`,
                              )
                            ) {
                              return;
                            }
                            void run(player.playerId, async () => {
                              await apiDelete(
                                `/api/admin/billing/players/${player.playerId}/subscription`,
                              );
                              toast.success("Assinatura cancelada.");
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={
                          !overview.configured ||
                          !overview.settings.suspensionBuyoutEnabled ||
                          !seasonId ||
                          busy === `fine-${player.playerId}`
                        }
                        title={
                          overview.settings.suspensionBuyoutEnabled
                            ? "Gera o Pix da multa de suspensão"
                            : "Regra desligada. Ative em Regras da mensalidade."
                        }
                        onClick={() => setFineFor(player)}
                      >
                        Multa R$
                        {(overview.settings.suspensionFineCents / 100)
                          .toFixed(0)
                          .replace(".", ",")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <SubscribeDialog
        key={subscribeFor?.playerId ?? "assinatura"}
        player={subscribeFor}
        disabled={!overview.configured}
        onOpenChange={(open) => {
          if (!open) setSubscribeFor(null);
        }}
        onSubmit={(body) => {
          if (!subscribeFor) return;
          void run(subscribeFor.playerId, async () => {
            await apiPost(
              `/api/admin/billing/players/${subscribeFor.playerId}/subscription`,
              body,
            );
            toast.success(
              subscribeFor.hasSubscription
                ? "Forma de pagamento atualizada."
                : "Assinatura criada. Copie o link da fatura para o WhatsApp.",
            );
            setSubscribeFor(null);
          });
        }}
      />

      <FineDialog
        key={fineFor?.playerId ?? "multa"}
        player={fineFor}
        seasonId={seasonId}
        amount={formatBRL(overview.settings.suspensionFineCents)}
        onOpenChange={(open) => {
          if (!open) setFineFor(null);
        }}
        onSubmit={(body) => {
          if (!fineFor) return;
          void run(`fine-${fineFor.playerId}`, async () => {
            const result = await apiPost<{
              reused: boolean;
              invoiceUrl: string | null;
            }>(`/api/admin/billing/players/${fineFor.playerId}/suspension-fine`, body);
            if (result.invoiceUrl) await copyLink(result.invoiceUrl);
            toast.success(
              result.reused
                ? "Já existia uma multa em aberto. O link foi copiado."
                : "Cobrança da multa criada e o link foi copiado.",
            );
            setFineFor(null);
          });
        }}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonthStatus }) {
  const variant =
    status === "paid"
      ? "default"
      : status === "overdue"
        ? "destructive"
        : status === "pending"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

function SettingsForm({
  overview,
  busy,
  onSave,
}: {
  overview: BillingOverview;
  busy: boolean;
  onSave: (
    body: BillingOverview["settings"] & { applyToActive?: boolean },
  ) => void;
}) {
  const settings = overview.settings;
  const [amount, setAmount] = useState(centsToInput(settings.monthlyAmountCents));
  const [dueDay, setDueDay] = useState(String(settings.dueDay));
  const [fineType, setFineType] = useState(settings.fineType);
  const [fineFixed, setFineFixed] = useState(centsToInput(settings.fineFixedCents));
  const [finePercent, setFinePercent] = useState(bpsToInput(settings.finePercentBps));
  const [interest, setInterest] = useState(bpsToInput(settings.interestPercentBps));
  const [buyout, setBuyout] = useState(settings.suspensionBuyoutEnabled);
  const [buyoutAmount, setBuyoutAmount] = useState(
    centsToInput(settings.suspensionFineCents),
  );
  const [applyToActive, setApplyToActive] = useState(false);

  return (
    <form
      className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          monthlyAmountCents: reaisToCents(amount),
          dueDay: Number(dueDay),
          fineType,
          fineFixedCents: reaisToCents(fineFixed),
          finePercentBps: inputToBps(finePercent),
          interestPercentBps: inputToBps(interest),
          suspensionBuyoutEnabled: buyout,
          suspensionFineCents: reaisToCents(buyoutAmount),
          applyToActive,
        });
      }}
    >
      <div>
        <h2 className="font-semibold">Regras da mensalidade</h2>
        <p className="text-sm text-muted-foreground">
          Padrão da SFL: R$ 60, com multa fixa de R$ 10 (fica R$ 70 depois do
          vencimento). A compra da suspensão nasce desligada.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Mensalidade (R$)" id="fee-amount">
          <Input id="fee-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Dia do vencimento" id="fee-day">
          <Input
            id="fee-day"
            type="number"
            min={1}
            max={28}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </Field>
        <Field label="Tipo da multa" id="fee-fine-type">
          <select
            id="fee-fine-type"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={fineType}
            onChange={(e) => setFineType(e.target.value as "FIXED" | "PERCENTAGE")}
          >
            <option value="FIXED">Valor fixo (R$)</option>
            <option value="PERCENTAGE">Percentual (%)</option>
          </select>
        </Field>
        {fineType === "FIXED" ? (
          <Field label="Multa por atraso (R$)" id="fee-fine">
            <Input id="fee-fine" value={fineFixed} onChange={(e) => setFineFixed(e.target.value)} />
          </Field>
        ) : (
          <Field label="Multa por atraso (%)" id="fee-fine-pct">
            <Input
              id="fee-fine-pct"
              value={finePercent}
              onChange={(e) => setFinePercent(e.target.value)}
            />
          </Field>
        )}
        <Field label="Juros ao mês (%)" id="fee-interest">
          <Input id="fee-interest" value={interest} onChange={(e) => setInterest(e.target.value)} />
        </Field>
        <Field label="Multa da suspensão (R$)" id="fee-buyout">
          <Input
            id="fee-buyout"
            value={buyoutAmount}
            onChange={(e) => setBuyoutAmount(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={buyout} onCheckedChange={(value) => setBuyout(value === true)} />
        <span>
          Permitir pagar a multa em vez de cumprir a suspensão. Desligado por
          padrão: o pagamento só libera o jogador quando esta opção está marcada
          no momento em que o Asaas confirma.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={applyToActive}
          disabled={!overview.configured}
          onCheckedChange={(value) => setApplyToActive(value === true)}
        />
        <span>
          Aplicar valor, multa e juros nas assinaturas que já existem (também nas
          faturas ainda em aberto).
        </span>
      </label>
      <Button type="submit" disabled={busy}>
        Salvar regras
      </Button>
    </form>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SubscribeDialog({
  player,
  disabled,
  onOpenChange,
  onSubmit,
}: {
  player: BillingOverview["players"][number] | null;
  disabled: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: {
    billingType: BillingMethod;
    cpf?: string;
    mobilePhone?: string;
  }) => void;
}) {
  const [billingType, setBillingType] = useState<BillingMethod>(
    player?.billingType ?? "PIX",
  );
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const needsCpf = !player?.cpfMasked;

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {player?.hasSubscription ? "Trocar forma" : "Criar assinatura"}{" "}
            {player ? `· ${player.nickname}` : ""}
          </DialogTitle>
          <DialogDescription>
            O cartão é cadastrado na página do Asaas, pelo link da primeira
            fatura. A SFL não guarda número de cartão.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              billingType,
              cpf: cpf || undefined,
              mobilePhone: phone || undefined,
            });
          }}
        >
          <Field label="Como o jogador paga" id="sub-method">
            <select
              id="sub-method"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value as BillingMethod)}
            >
              <option value="CREDIT_CARD">Cartão recorrente</option>
              <option value="PIX">Pix</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </Field>
          <Field label="CPF" id="sub-cpf">
            <Input
              id="sub-cpf"
              inputMode="numeric"
              autoComplete="off"
              placeholder={player?.cpfMasked ?? "000.000.000-00"}
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required={needsCpf}
            />
          </Field>
          <Field label="Celular (opcional)" id="sub-phone">
            <Input
              id="sub-phone"
              inputMode="tel"
              placeholder="11999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={disabled}>
            Gerar no Asaas
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FineDialog({
  player,
  seasonId,
  amount,
  onOpenChange,
  onSubmit,
}: {
  player: BillingOverview["players"][number] | null;
  seasonId: string;
  amount: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: { seasonId: string; billingType: "PIX"; cpf?: string }) => void;
}) {
  const [cpf, setCpf] = useState("");
  const needsCpf = !player?.cpfMasked;

  return (
    <Dialog open={Boolean(player)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Multa de suspensão · {player?.nickname}</DialogTitle>
          <DialogDescription>
            Cobrança avulsa de {amount} no Pix. O jogador só é liberado se a
            regra estiver ligada quando o pagamento for confirmado.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              seasonId,
              billingType: "PIX",
              cpf: needsCpf ? cpf : undefined,
            });
          }}
        >
          {needsCpf ? (
            <Field label="CPF" id="fine-cpf">
              <Input
                id="fine-cpf"
                inputMode="numeric"
                autoComplete="off"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
              />
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              CPF já cadastrado ({player?.cpfMasked}).
            </p>
          )}
          <Button type="submit" disabled={!seasonId}>
            Gerar Pix e copiar link
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
