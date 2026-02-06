-- Optimizing for 10 million users
-- Adding essential indexes for common query patterns

-- 1. Index for fetching registrations by event and status (common in admin panel)
CREATE INDEX IF NOT EXISTS "idx_registrations_event_id_status" ON "registrations" ("event_id", "status");

-- 2. Index for searching users/registrations by email (fast login/check-status)
CREATE INDEX IF NOT EXISTS "idx_registrations_email" ON "registrations" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");

-- 3. Index for events organized by a specific user (dashboard speed)
CREATE INDEX IF NOT EXISTS "idx_events_organizer_id" ON "events" ("organizer_id");

-- 4. Index for check-ins by registration (ticket verification speed)
CREATE INDEX IF NOT EXISTS "idx_check_ins_registration_id" ON "check_ins" ("registration_id");

-- 5. Index for created_at to speed up sorting and pagination
CREATE INDEX IF NOT EXISTS "idx_registrations_created_at" ON "registrations" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_events_created_at" ON "events" ("created_at" DESC);

-- Enable Postgres performance monitoring tools (Optional)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
