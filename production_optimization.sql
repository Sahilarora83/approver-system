-- PRODUCTION DATABASE OPTIMIZATION SCRIPT
-- Purpose: Optimize database for 10M+ users, fast search, and data integrity.

-- 1. EXTENSIONS
-- Required for spatial queries and full-text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. INDEXES FOR FAST RETRIEVAL (CORE INFRASTRUCTURE)
-- Optimized for reading feed, searching, and filtering

-- Search optimization (Trigram index for ILIKE performance on large datasets)
CREATE INDEX IF NOT EXISTS idx_events_search_title ON events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_search_description ON events USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_search_location ON events USING gin (location gin_trgm_ops);

-- Filter optimization
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events (organizer_id);

-- Registration speed (Critical for high-traffic events)
CREATE INDEX IF NOT EXISTS idx_registrations_event_user ON registrations (event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations (status);

-- Social & Notifications (Optimized for active users)
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows (follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read) WHERE (read = false);
CREATE INDEX IF NOT EXISTS idx_favorites_user_event ON favorites (user_id, event_id);

-- 3. DATA INTEGRITY & PERFOMANCE CONSTRAINTS
-- Prevent duplicate entries safely

-- Unique follow constraint
ALTER TABLE follows ADD CONSTRAINT unique_user_follow UNIQUE (follower_id, following_id);

-- Unique favorite constraint
ALTER TABLE favorites ADD CONSTRAINT unique_user_favorite UNIQUE (userId, eventId);

-- 4. VIEW OPTIMIZATION (DENORMALIZATION FOR SPEED)
-- Pre-calculate registration counts for the Discovery Feed to avoid expensive joins
CREATE OR REPLACE VIEW event_stats AS
SELECT 
    event_id,
    COUNT(*) as total_registrations,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_registrations
FROM registrations
GROUP BY event_id;

-- 5. VACUUM AND ANALYZE
-- Rebuild statistics for the query planner
ANALYZE events;
ANALYZE registrations;
ANALYZE users;
ANALYZE follows;
ANALYZE favorites;
ANALYZE notifications;
