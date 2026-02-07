-- Global Scale App Database Schema
-- SQL for PostgreSQL

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'participant',
    bio TEXT,
    profile_image TEXT,
    push_token TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Music',
    location TEXT,
    address TEXT,
    latitude TEXT,
    longitude TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    price TEXT DEFAULT '0',
    price_packages JSONB DEFAULT '[]',
    requires_approval BOOLEAN DEFAULT FALSE,
    check_in_enabled BOOLEAN DEFAULT TRUE,
    form_fields JSONB DEFAULT '[]',
    public_link TEXT,
    cover_image TEXT,
    gallery JSONB DEFAULT '[]',
    hosted_by TEXT,
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    form_data JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    qr_code TEXT NOT NULL,
    ticket_link TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Check-Ins Table
CREATE TABLE IF NOT EXISTS check_ins (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id VARCHAR(255) NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    verifier_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Form Templates Table
CREATE TABLE IF NOT EXISTS form_templates (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fields JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. Follows Table
CREATE TABLE IF NOT EXISTS follows (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    related_id TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Broadcasts Table
CREATE TABLE IF NOT EXISTS broadcasts (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organizer_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 9. Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- 10. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
