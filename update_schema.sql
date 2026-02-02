-- QR Ticket Manager - Schema Update
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_token" text;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" varchar NOT NULL,
    "title" text NOT NULL,
    "body" text NOT NULL,
    "type" text NOT NULL,
    "related_id" text,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Create follows table (needed for notifications when new events are posted)
CREATE TABLE IF NOT EXISTS "follows" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    "follower_id" varchar NOT NULL,
    "following_id" varchar NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Add constraints
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_follower_id_fkey";
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_following_id_fkey";
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- 5. Enable RLS for new tables
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;

-- 6. Add basic policies
CREATE POLICY "Users can view own notifications" ON "notifications" FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update own notifications" ON "notifications" FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Anyone can follow/unfollow" ON "follows" FOR ALL USING (true);
