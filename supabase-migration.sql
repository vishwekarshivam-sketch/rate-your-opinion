-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/qyyqxqjmphbszbgutjlr/sql/new)
-- Creates the visits table for analytics tracking.

CREATE TABLE IF NOT EXISTS visits (
  id BIGSERIAL PRIMARY KEY,
  user_type TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anonymous inserts (for tracking) and selects (for dashboard)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_visits" ON visits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_visits" ON visits FOR SELECT TO anon USING (true);
