-- Patrocinadores do site (JSON: [{ id, name, imageUrl, linkUrl }])
ALTER TABLE "system_settings"
ADD COLUMN IF NOT EXISTS "sponsors_json" JSONB;
