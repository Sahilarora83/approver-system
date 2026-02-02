-- Add new columns for Event details to match Luma style
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "cover_image" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "hosted_by" text;
-- hosted_by can store "Name, Name2" or check if JSONB is better. For now text is flexible.
