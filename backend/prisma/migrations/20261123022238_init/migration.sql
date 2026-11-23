-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "HighlightSlot" AS ENUM ('mvp', 'second', 'third', 'respect');

-- CreateEnum
CREATE TYPE "LineupStatus" AS ENUM ('starter', 'substitute');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('goal', 'own_goal', 'penalty_goal', 'penalty_miss', 'yellow_card', 'red_card', 'substitution', 'half_time', 'second_half', 'full_time', 'save', 'tackle', 'key_pass', 'shot', 'foul_suffered', 'penalty_save');

-- CreateEnum
CREATE TYPE "MatchHalf" AS ENUM ('first', 'second', 'extra_first', 'extra_second', 'penalties');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'lineups_set', 'live', 'halftime', 'finished', 'postponed');

-- CreateEnum
CREATE TYPE "OfficialRole" AS ENUM ('referee', 'assistant_1', 'assistant_2', 'narrator');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_sub" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL,
    "secondary_color" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "champion_team_id" UUID,
    "decided_by_penalties" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL,
    "photo_url" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_rosters" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID,
    "player_id" UUID NOT NULL,
    "number" INTEGER,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "youtube_url" TEXT,
    "venue" TEXT NOT NULL DEFAULT '',
    "home_formation" TEXT,
    "away_formation" TEXT,
    "first_half_duration" INTEGER,
    "second_half_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_timer" (
    "match_id" UUID NOT NULL,
    "current_half" "MatchHalf" NOT NULL DEFAULT 'first',
    "elapsed_seconds" INTEGER NOT NULL DEFAULT 0,
    "half_started_at" TIMESTAMP(3),
    "is_running" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_timer_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID,
    "player_id" UUID,
    "assist_player_id" UUID,
    "player_in_id" UUID,
    "type" "MatchEventType" NOT NULL,
    "elapsed_seconds" INTEGER NOT NULL,
    "description" TEXT,
    "youtube_timestamp_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineups" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "shirt_number" INTEGER NOT NULL,
    "status" "LineupStatus" NOT NULL,
    "position_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_officials" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "role" "OfficialRole" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "match_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_player_ratings" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "calculated_rating" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_player_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_highlights" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "slot" "HighlightSlot" NOT NULL,
    "given_by_team_id" UUID NOT NULL,
    "given_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_shootout" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "scored" BOOLEAN NOT NULL,
    "shoot_order" INTEGER NOT NULL,

    CONSTRAINT "penalty_shootout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "description" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "players_user_id_idx" ON "players"("user_id");

-- CreateIndex
CREATE INDEX "players_email_idx" ON "players"("email");

-- CreateIndex
CREATE INDEX "season_rosters_season_id_team_id_idx" ON "season_rosters"("season_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "season_rosters_season_id_player_id_key" ON "season_rosters"("season_id", "player_id");

-- CreateIndex
CREATE INDEX "matches_season_id_round_idx" ON "matches"("season_id", "round");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "match_events_match_id_idx" ON "match_events"("match_id");

-- CreateIndex
CREATE INDEX "match_lineups_match_id_team_id_idx" ON "match_lineups"("match_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineups_match_id_player_id_key" ON "match_lineups"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_officials_match_id_role_key" ON "match_officials"("match_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "match_player_ratings_match_id_player_id_key" ON "match_player_ratings"("match_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_highlights_match_id_given_by_team_id_slot_key" ON "match_highlights"("match_id", "given_by_team_id", "slot");

-- CreateIndex
CREATE INDEX "penalty_shootout_match_id_idx" ON "penalty_shootout"("match_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_champion_team_id_fkey" FOREIGN KEY ("champion_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rosters" ADD CONSTRAINT "season_rosters_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rosters" ADD CONSTRAINT "season_rosters_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_rosters" ADD CONSTRAINT "season_rosters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_timer" ADD CONSTRAINT "match_timer_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_assist_player_id_fkey" FOREIGN KEY ("assist_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_in_id_fkey" FOREIGN KEY ("player_in_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_officials" ADD CONSTRAINT "match_officials_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_player_ratings" ADD CONSTRAINT "match_player_ratings_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_player_ratings" ADD CONSTRAINT "match_player_ratings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_player_ratings" ADD CONSTRAINT "match_player_ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_highlights" ADD CONSTRAINT "match_highlights_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_highlights" ADD CONSTRAINT "match_highlights_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_highlights" ADD CONSTRAINT "match_highlights_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_highlights" ADD CONSTRAINT "match_highlights_given_by_team_id_fkey" FOREIGN KEY ("given_by_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_highlights" ADD CONSTRAINT "match_highlights_given_by_user_id_fkey" FOREIGN KEY ("given_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_shootout" ADD CONSTRAINT "penalty_shootout_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_shootout" ADD CONSTRAINT "penalty_shootout_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_shootout" ADD CONSTRAINT "penalty_shootout_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
