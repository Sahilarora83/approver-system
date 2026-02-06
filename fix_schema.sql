-- Elite UI Update: Schema Migration
-- Run this in your Supabase SQL Editor to fix the "Something went wrong" error

-- 1. Add pricing and gallery columns to events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS price_packages JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';

-- 2. Ensure existing rows have the correct defaults (optional but recommended)
UPDATE events SET price_packages = '[]' WHERE price_packages IS NULL;
UPDATE events SET gallery = '[]' WHERE gallery IS NULL;

-- 3. Verify the changes
SELECT id, title, price_packages, gallery FROM events LIMIT 1;
