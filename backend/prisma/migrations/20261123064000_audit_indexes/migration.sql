-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_entity_type_created_at_idx" ON "admin_audit_log"("entity_type", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_audit_log_user_email_idx" ON "admin_audit_log"("user_email");

-- Helpful search indexes for scale (100+ teams / users)
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_display_name_idx" ON "users"("display_name");
CREATE INDEX IF NOT EXISTS "teams_name_idx" ON "teams"("name");
CREATE INDEX IF NOT EXISTS "players_nickname_idx" ON "players"("nickname");
CREATE INDEX IF NOT EXISTS "players_name_idx" ON "players"("name");
