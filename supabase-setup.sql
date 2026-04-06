-- ============================================
-- Voice Agent IaaS — Supabase Schema Setup
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  agent_count INTEGER DEFAULT 0,
  agent_limit INTEGER DEFAULT 10,
  is_lifetime BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. API Keys table (stores SHA-256 hashed keys only)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  key_preview TEXT NOT NULL,  -- Last 8 chars for display
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Agent Configs table
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  business_context TEXT NOT NULL,
  greeting TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  agent_name TEXT,
  external_id TEXT,
  ultravox_api_key TEXT,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Call Responses table (lead data from saveAnswers)
CREATE TABLE IF NOT EXISTS call_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id UUID REFERENCES agent_configs(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT,
  phone_number TEXT,
  responses JSONB DEFAULT '[]'::jsonb,
  call_id TEXT,
  call_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Atomic increment function (prevents race conditions on agent limit)
CREATE OR REPLACE FUNCTION increment_agent_count(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT agent_count INTO current_count
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE users
  SET agent_count = agent_count + 1
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- ============================================
-- QUICK TEST: Insert a test user + API key
-- ============================================
-- Uncomment the lines below to create a test user.
-- The API key plaintext is: test-api-key-12345
-- SHA-256 hash of "test-api-key-12345":

-- INSERT INTO users (id, email, is_active, agent_count)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', TRUE, 0);

-- INSERT INTO api_keys (user_id, key_hash, key_preview)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   -- SHA-256 of 'test-api-key-12345'
--   'e3b98a4da31a127d4bde6e43033f66ba274cab0eb7eb1c70ec41402bf6273dd8',
--   'key-12345'
-- );
