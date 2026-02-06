-- QR Ticket Manager - Production Supabase Schema
-- Run this in Supabase SQL Editor to initialize or update your database

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Users table (Enhanced)
CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "name" text NOT NULL,
    "role" text DEFAULT 'participant' NOT NULL,
    "bio" text,
    "profile_image" text,
    "push_token" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Events table (Enhanced for Production)
CREATE TABLE IF NOT EXISTS "events" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizer_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "title" text NOT NULL,
    "description" text,
    "category" text DEFAULT 'Music',
    "location" text,
    "address" text,
    "latitude" text,
    "longitude" text,
    "price" text DEFAULT '0',
    "start_date" timestamp NOT NULL,
    "end_date" timestamp,
    "requires_approval" boolean DEFAULT false,
    "check_in_enabled" boolean DEFAULT true,
    "form_fields" jsonb DEFAULT '[]',
    "public_link" text UNIQUE,
    "cover_image" text,
    "hosted_by" text,
    "social_links" jsonb DEFAULT '{}',
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Registrations table
CREATE TABLE IF NOT EXISTS "registrations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    "user_id" varchar REFERENCES users(id) ON DELETE SET NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "form_data" jsonb DEFAULT '{}',
    "status" text DEFAULT 'pending' NOT NULL,
    "qr_code" text NOT NULL UNIQUE,
    "ticket_link" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Check-ins table
CREATE TABLE IF NOT EXISTS "check_ins" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "registration_id" varchar NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    "verifier_id" varchar REFERENCES users(id) ON DELETE SET NULL,
    "type" text NOT NULL, -- 'check_in' or 'check_out'
    "timestamp" timestamp DEFAULT now() NOT NULL
);

-- 6. Follows table
CREATE TABLE IF NOT EXISTS "follows" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "follower_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "following_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("follower_id", "following_id")
);

-- 7. Favorites table
CREATE TABLE IF NOT EXISTS "favorites" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "event_id" varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    UNIQUE("user_id", "event_id")
);

-- 8. Reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    "userId" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "rating" integer NOT NULL CHECK (rating >= 0 AND rating <= 5),
    "comment" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 9. Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "title" text NOT NULL,
    "body" text NOT NULL,
    "type" text NOT NULL, -- 'registration', 'follow', 'broadcast', etc.
    "related_id" text,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 10. Broadcasts table
CREATE TABLE IF NOT EXISTS "broadcasts" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id" varchar NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    "organizer_id" varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "title" text,
    "message" text NOT NULL,
    "sent_at" timestamp DEFAULT now() NOT NULL
);

-- 11. Session table (for express-session compatibility)
CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar PRIMARY KEY,
    "sess" json NOT NULL,
    "expire" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 12. Optimized Indexes for Production
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_event ON reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- 13. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 14. Robust RLS Policies
-- Public Access
DROP POLICY IF EXISTS "Public Events View" ON events;
CREATE POLICY "Public Events View" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Reviews View" ON reviews;
CREATE POLICY "Public Reviews View" ON reviews FOR SELECT USING (true);

-- User Own Data
DROP POLICY IF EXISTS "Users can manage own profile" ON users;
CREATE POLICY "Users can manage own profile" ON users FOR ALL USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can view own registrations" ON registrations;
CREATE POLICY "Users can view own registrations" ON registrations FOR SELECT USING (auth.uid()::text = user_id OR email = (SELECT email FROM users WHERE id = auth.uid()::text));

DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites" ON favorites FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage own follows" ON follows;
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (auth.uid()::text = follower_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);

-- Organizer Access
DROP POLICY IF EXISTS "Organizers manage own events" ON events;
CREATE POLICY "Organizers manage own events" ON events FOR ALL USING (auth.uid()::text = organizer_id);

DROP POLICY IF EXISTS "Organizers view event registrations" ON registrations;
CREATE POLICY "Organizers view event registrations" ON registrations FOR SELECT USING (
    EXISTS (SELECT 1 FROM events WHERE events.id = registrations.event_id AND events.organizer_id = auth.uid()::text)
);
