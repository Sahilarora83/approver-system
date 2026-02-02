-- QR Ticket Manager - Supabase Schema
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" text NOT NULL CONSTRAINT "users_email_key" UNIQUE,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Events table
CREATE TABLE IF NOT EXISTS "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizer_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"requires_approval" boolean DEFAULT false,
	"check_in_enabled" boolean DEFAULT true,
	"form_fields" jsonb DEFAULT '[]',
	"public_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Registrations table
CREATE TABLE IF NOT EXISTS "registrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_id" varchar NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"form_data" jsonb DEFAULT '{}',
	"status" text DEFAULT 'pending' NOT NULL,
	"qr_code" text NOT NULL,
	"ticket_link" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS "check_ins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"registration_id" varchar NOT NULL,
	"verifier_id" varchar,
	"type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

-- Form templates table
CREATE TABLE IF NOT EXISTS "form_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"organizer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"fields" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Session table (for express-session)
CREATE TABLE IF NOT EXISTS "session" (
	"sid" varchar PRIMARY KEY,
	"sess" json NOT NULL,
	"expire" timestamp NOT NULL
);

-- Foreign Key Constraints
ALTER TABLE "check_ins" DROP CONSTRAINT IF EXISTS "check_ins_registration_id_fkey";
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE;

ALTER TABLE "check_ins" DROP CONSTRAINT IF EXISTS "check_ins_verifier_id_fkey";
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_organizer_id_fkey";
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "form_templates" DROP CONSTRAINT IF EXISTS "form_templates_organizer_id_fkey";
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_event_id_fkey";
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;

ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_user_id_fkey";
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "check_ins_pkey" ON "check_ins" ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "events_pkey" ON "events" ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "form_templates_pkey" ON "form_templates" ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "registrations_pkey" ON "registrations" ("id");
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
CREATE UNIQUE INDEX IF NOT EXISTS "session_pkey" ON "session" ("sid");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_pkey" ON "users" ("id");

-- Enable Row Level Security (RLS) - Optional but recommended for Supabase
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_templates" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic - you can customize these)
-- Allow users to read their own data
CREATE POLICY "Users can view own profile" ON "users"
    FOR SELECT USING (auth.uid()::text = id);

-- Allow anyone to view events
CREATE POLICY "Anyone can view events" ON "events"
    FOR SELECT USING (true);

-- Allow organizers to manage their events
CREATE POLICY "Organizers can manage own events" ON "events"
    FOR ALL USING (auth.uid()::text = organizer_id);

-- Allow anyone to view registrations for public events
CREATE POLICY "Anyone can view registrations" ON "registrations"
    FOR SELECT USING (true);

-- Allow users to create registrations
CREATE POLICY "Anyone can create registrations" ON "registrations"
    FOR INSERT WITH CHECK (true);
