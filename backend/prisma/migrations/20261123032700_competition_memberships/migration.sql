-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'league_admin', 'team_staff', 'captain');

-- CreateTable competitions
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateTable user_memberships
CREATE TABLE "user_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "competition_id" UUID NOT NULL,
    "team_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);

-- Add competition_id to seasons (nullable first)
ALTER TABLE "seasons" ADD COLUMN "competition_id" UUID;

-- Backfill default competition
INSERT INTO "competitions" ("id", "slug", "name", "description", "is_active", "created_at", "updated_at")
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'sfl',
  'Super Football League',
  'Campeonato principal SFL',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

UPDATE "seasons"
SET "competition_id" = 'a0000000-0000-4000-8000-000000000001'
WHERE "competition_id" IS NULL;

ALTER TABLE "seasons" ALTER COLUMN "competition_id" SET NOT NULL;

-- FKs and indexes
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_fkey"
  FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "seasons_competition_id_is_current_idx" ON "seasons"("competition_id", "is_current");

ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_competition_id_fkey"
  FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "user_memberships_user_id_role_competition_id_team_id_key"
  ON "user_memberships"("user_id", "role", "competition_id", "team_id");
CREATE INDEX "user_memberships_competition_id_role_idx" ON "user_memberships"("competition_id", "role");
CREATE INDEX "user_memberships_user_id_idx" ON "user_memberships"("user_id");
