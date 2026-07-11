-- Supabase auth stub for non-Supabase PostgreSQL environments
-- This creates a minimal compatible auth schema for migration testing only.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID,
    email TEXT,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    invited_at TIMESTAMP WITH TIME ZONE,
    confirmation_token TEXT,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    recovery_token TEXT,
    recovery_sent_at TIMESTAMP WITH TIME ZONE,
    email_change_token_new TEXT,
    email_change TEXT,
    email_change_sent_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    phone TEXT,
    phone_confirmed_at TIMESTAMP WITH TIME ZONE,
    phone_change TEXT,
    phone_change_token TEXT,
    phone_change_sent_at TIMESTAMP WITH TIME ZONE,
    email_change_token_current TEXT,
    email_change_confirm_status SMALLINT DEFAULT 0,
    banned_until TIMESTAMP WITH TIME ZONE,
    reauthentication_token TEXT,
    reauthentication_sent_at TIMESTAMP WITH TIME ZONE,
    is_sso_user BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL
);

-- Stub for auth.uid() which returns the current authenticated user's ID
-- In a real Supabase environment this is provided by the JWT auth system.
-- For testing, we create a placeholder function.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT null::uuid;
$$;
