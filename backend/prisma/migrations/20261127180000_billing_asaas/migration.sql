-- Mensalidades Asaas. Somente aditiva: tabelas novas e uma coluna com default.

ALTER TABLE "card_resets"
ADD COLUMN "clears_pending" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "BillingMethod" AS ENUM ('CREDIT_CARD', 'PIX', 'BOLETO');

CREATE TYPE "PlayerBillingStatus" AS ENUM ('none', 'current', 'pending', 'overdue', 'inactive');

CREATE TYPE "BillingChargeKind" AS ENUM ('subscription', 'suspension_fine');

CREATE TYPE "BillingChargeStatus" AS ENUM ('pending', 'confirmed', 'received', 'overdue', 'refunded', 'canceled');

CREATE TABLE "billing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "monthly_amount_cents" INTEGER NOT NULL DEFAULT 6000,
    "due_day" INTEGER NOT NULL DEFAULT 10,
    "fine_type" TEXT NOT NULL DEFAULT 'FIXED',
    "fine_fixed_cents" INTEGER NOT NULL DEFAULT 1000,
    "fine_percent_bps" INTEGER NOT NULL DEFAULT 0,
    "interest_percent_bps" INTEGER NOT NULL DEFAULT 0,
    "suspension_buyout_enabled" BOOLEAN NOT NULL DEFAULT false,
    "suspension_fine_cents" INTEGER NOT NULL DEFAULT 1500,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "player_billings" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "asaas_customer_id" TEXT,
    "asaas_subscription_id" TEXT,
    "billing_type" "BillingMethod",
    "status" "PlayerBillingStatus" NOT NULL DEFAULT 'none',
    "cpf" TEXT,
    "mobile_phone" TEXT,
    "card_last4" TEXT,
    "card_brand" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_billings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_billings_player_id_key" ON "player_billings"("player_id");
CREATE UNIQUE INDEX "player_billings_asaas_customer_id_key" ON "player_billings"("asaas_customer_id");
CREATE UNIQUE INDEX "player_billings_asaas_subscription_id_key" ON "player_billings"("asaas_subscription_id");

ALTER TABLE "player_billings"
ADD CONSTRAINT "player_billings_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_charges" (
    "id" UUID NOT NULL,
    "player_billing_id" UUID NOT NULL,
    "asaas_payment_id" TEXT NOT NULL,
    "kind" "BillingChargeKind" NOT NULL,
    "reference_month" TEXT,
    "value_cents" INTEGER NOT NULL,
    "status" "BillingChargeStatus" NOT NULL DEFAULT 'pending',
    "billing_type" TEXT,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMP(3),
    "invoice_url" TEXT,
    "bank_slip_url" TEXT,
    "external_reference" TEXT,
    "season_id" UUID,
    "card_reset_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_charges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_charges_asaas_payment_id_key" ON "billing_charges"("asaas_payment_id");
CREATE UNIQUE INDEX "billing_charges_card_reset_id_key" ON "billing_charges"("card_reset_id");
CREATE INDEX "billing_charges_reference_month_status_idx" ON "billing_charges"("reference_month", "status");
CREATE INDEX "billing_charges_player_billing_id_reference_month_idx" ON "billing_charges"("player_billing_id", "reference_month");
CREATE INDEX "billing_charges_kind_status_idx" ON "billing_charges"("kind", "status");

ALTER TABLE "billing_charges"
ADD CONSTRAINT "billing_charges_player_billing_id_fkey"
FOREIGN KEY ("player_billing_id") REFERENCES "player_billings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_charges"
ADD CONSTRAINT "billing_charges_card_reset_id_fkey"
FOREIGN KEY ("card_reset_id") REFERENCES "card_resets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "asaas_webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payment_id" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asaas_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "asaas_webhook_events_payment_id_idx" ON "asaas_webhook_events"("payment_id");
