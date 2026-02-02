-- Add social_links column to events table to store Instagram, Twitter etc.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "social_links" JSONB DEFAULT '{}'::jsonb;
