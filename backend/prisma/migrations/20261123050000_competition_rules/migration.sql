-- CreateEnum
CREATE TYPE "CompetitionFormat" AS ENUM ('league', 'knockout', 'groups_knockout');
CREATE TYPE "MatchPhase" AS ENUM ('league', 'group', 'knockout');

-- AlterEnum MatchStatus
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'awarded';
ALTER TYPE "MatchStatus" ADD VALUE IF NOT EXISTS 'abandoned';

-- AlterTable competitions
ALTER TABLE "competitions"
  ADD COLUMN IF NOT EXISTS "format" "CompetitionFormat" NOT NULL DEFAULT 'league',
  ADD COLUMN IF NOT EXISTS "tie_breakers" JSONB NOT NULL DEFAULT '["points","wins","goalDifference","goalsFor","headToHead","name"]',
  ADD COLUMN IF NOT EXISTS "points_win" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "points_draw" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "yellow_card_limit" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "red_suspension_games" INTEGER NOT NULL DEFAULT 1;

-- AlterTable seasons
ALTER TABLE "seasons"
  ADD COLUMN IF NOT EXISTS "format" "CompetitionFormat",
  ADD COLUMN IF NOT EXISTS "starts_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "ends_at" TIMESTAMP(3);

-- AlterTable matches
ALTER TABLE "matches"
  ADD COLUMN IF NOT EXISTS "phase" "MatchPhase" NOT NULL DEFAULT 'league',
  ADD COLUMN IF NOT EXISTS "group_name" TEXT,
  ADD COLUMN IF NOT EXISTS "knockout_label" TEXT,
  ADD COLUMN IF NOT EXISTS "leg" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_walkover" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "awarded_to_team_id" UUID;

CREATE INDEX IF NOT EXISTS "matches_season_id_phase_idx" ON "matches"("season_id", "phase");

ALTER TABLE "matches"
  ADD CONSTRAINT "matches_awarded_to_team_id_fkey"
  FOREIGN KEY ("awarded_to_team_id") REFERENCES "teams"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Card resets
CREATE TABLE IF NOT EXISTS "card_resets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "season_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "yellow_cleared" INTEGER NOT NULL DEFAULT 0,
  "red_cleared" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_resets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "card_resets_season_id_player_id_idx" ON "card_resets"("season_id", "player_id");

ALTER TABLE "card_resets"
  ADD CONSTRAINT "card_resets_season_id_fkey"
  FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_resets"
  ADD CONSTRAINT "card_resets_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
