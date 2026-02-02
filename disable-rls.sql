-- Disable RLS temporarily for easier development
-- You can enable it later with proper policies

ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "registrations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "form_templates" DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON "users";
DROP POLICY IF EXISTS "Anyone can view events" ON "events";
DROP POLICY IF EXISTS "Organizers can manage own events" ON "events";
DROP POLICY IF EXISTS "Anyone can view registrations" ON "registrations";
DROP POLICY IF EXISTS "Anyone can create registrations" ON "registrations";
