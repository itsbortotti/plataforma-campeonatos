-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "site_name" TEXT NOT NULL DEFAULT 'SFL',
    "tagline" TEXT NOT NULL DEFAULT 'Plataforma de campeonatos',
    "description" TEXT DEFAULT 'Hub de campeonatos: classificação, calendário, elencos e estatísticas.',
    "logo_url" TEXT,
    "support_email" TEXT,
    "footer_text" TEXT,
    "master_label" TEXT NOT NULL DEFAULT 'Master',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "system_settings" ("id", "updated_at")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
