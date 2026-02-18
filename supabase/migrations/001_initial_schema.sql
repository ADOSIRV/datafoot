-- =============================================================
-- DataFoot – Initial Database Schema
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM ('admin', 'district', 'club_admin', 'coach', 'player');
CREATE TYPE player_position AS ENUM ('goalkeeper', 'defender', 'midfielder', 'forward', 'unknown');

-- =============================================================
-- CLUBS
-- =============================================================

CREATE TABLE clubs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  address     TEXT,
  city        TEXT,
  phone       TEXT,
  email       TEXT,
  district_id UUID,           -- optional direct FK; many-to-many via district_clubs
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- TEAMS
-- =============================================================

CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  category   TEXT,            -- e.g. U13, U15, Séniors
  season     TEXT,            -- e.g. 2024-2025
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- PROFILES  (linked to auth.users)
-- =============================================================

CREATE TABLE profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  role           user_role NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  phone          TEXT,
  avatar_url     TEXT,
  club_id        UUID REFERENCES clubs(id) ON DELETE SET NULL,
  team_id        UUID REFERENCES teams(id) ON DELETE SET NULL,
  district_id    UUID,        -- for district supervisors
  position       player_position DEFAULT 'unknown',
  date_of_birth  DATE,
  jersey_number  SMALLINT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- COACH ↔ TEAM  (many-to-many)
-- =============================================================

CREATE TABLE coach_teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, team_id)
);

-- =============================================================
-- DISTRICT ↔ CLUB  (many-to-many)
-- =============================================================

CREATE TABLE district_clubs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  district_id UUID NOT NULL,     -- profile.id with role=district
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(district_id, club_id)
);

-- =============================================================
-- PERFORMANCE SESSIONS
-- =============================================================

CREATE TABLE performance_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  right_foot   SMALLINT NOT NULL DEFAULT 0 CHECK (right_foot >= 0),
  left_foot    SMALLINT NOT NULL DEFAULT 0 CHECK (left_foot  >= 0),
  head         SMALLINT NOT NULL DEFAULT 0 CHECK (head       >= 0),
  total        SMALLINT GENERATED ALWAYS AS (right_foot + left_foot + head) STORED,
  comment      TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_synced    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_player     ON performance_sessions(player_id, session_date DESC);
CREATE INDEX idx_sessions_team       ON performance_sessions(team_id, session_date DESC);
CREATE INDEX idx_sessions_date       ON performance_sessions(session_date DESC);

-- =============================================================
-- APP SETTINGS  (singleton row)
-- =============================================================

CREATE TABLE app_settings (
  id                     TEXT PRIMARY KEY DEFAULT 'singleton',
  supabase_url           TEXT,
  supabase_anon_key      TEXT,
  smtp_host              TEXT,
  smtp_port              INTEGER DEFAULT 587,
  smtp_user              TEXT,
  smtp_password          TEXT,
  smtp_from_email        TEXT,
  smtp_from_name         TEXT DEFAULT 'DataFoot',
  monthly_report_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_report_day     SMALLINT NOT NULL DEFAULT 1,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

-- =============================================================
-- TRIGGERS – auto update_at
-- =============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON clubs            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON teams            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON performance_sessions FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON app_settings     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE clubs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_clubs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

-- Helper: get current profile id
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid();
$$;

-- ── profiles ──────────────────────────────────────────────────

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    current_user_role() IN ('admin', 'district', 'club_admin', 'coach')
    OR user_id = auth.uid()
  );

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (
    current_user_role() = 'admin'
    OR (current_user_role() = 'club_admin' AND club_id = (SELECT club_id FROM profiles WHERE user_id = auth.uid()))
    OR user_id = auth.uid()
  );

CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  USING (current_user_role() = 'admin');

-- ── clubs ─────────────────────────────────────────────────────

CREATE POLICY "clubs_select" ON clubs FOR SELECT USING (TRUE);

CREATE POLICY "clubs_insert" ON clubs FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "clubs_update" ON clubs FOR UPDATE
  USING (
    current_user_role() = 'admin'
    OR (current_user_role() = 'club_admin' AND id = (SELECT club_id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "clubs_delete" ON clubs FOR DELETE
  USING (current_user_role() = 'admin');

-- ── teams ─────────────────────────────────────────────────────

CREATE POLICY "teams_select" ON teams FOR SELECT USING (TRUE);

CREATE POLICY "teams_insert" ON teams FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'club_admin'));

CREATE POLICY "teams_update" ON teams FOR UPDATE
  USING (current_user_role() IN ('admin', 'club_admin'));

CREATE POLICY "teams_delete" ON teams FOR DELETE
  USING (current_user_role() IN ('admin', 'club_admin'));

-- ── coach_teams ───────────────────────────────────────────────

CREATE POLICY "coach_teams_select" ON coach_teams FOR SELECT USING (TRUE);

CREATE POLICY "coach_teams_insert" ON coach_teams FOR INSERT
  WITH CHECK (current_user_role() IN ('admin', 'club_admin'));

CREATE POLICY "coach_teams_delete" ON coach_teams FOR DELETE
  USING (current_user_role() IN ('admin', 'club_admin'));

-- ── district_clubs ────────────────────────────────────────────

CREATE POLICY "district_clubs_select" ON district_clubs FOR SELECT USING (TRUE);

CREATE POLICY "district_clubs_insert" ON district_clubs FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "district_clubs_delete" ON district_clubs FOR DELETE
  USING (current_user_role() = 'admin');

-- ── performance_sessions ──────────────────────────────────────

CREATE POLICY "sessions_select" ON performance_sessions FOR SELECT
  USING (
    current_user_role() IN ('admin', 'district')
    OR (current_user_role() = 'club_admin' AND
        team_id IN (SELECT id FROM teams WHERE club_id = (SELECT club_id FROM profiles WHERE user_id = auth.uid())))
    OR (current_user_role() = 'coach' AND
        team_id IN (SELECT team_id FROM coach_teams WHERE coach_id = current_profile_id()))
    OR player_id = current_profile_id()
  );

CREATE POLICY "sessions_insert" ON performance_sessions FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'club_admin')
    OR (current_user_role() = 'coach' AND
        team_id IN (SELECT team_id FROM coach_teams WHERE coach_id = current_profile_id()))
  );

CREATE POLICY "sessions_update" ON performance_sessions FOR UPDATE
  USING (
    current_user_role() = 'admin'
    OR coach_id = current_profile_id()
  );

CREATE POLICY "sessions_delete" ON performance_sessions FOR DELETE
  USING (
    current_user_role() = 'admin'
    OR coach_id = current_profile_id()
  );

-- ── app_settings ──────────────────────────────────────────────

CREATE POLICY "settings_select" ON app_settings FOR SELECT
  USING (current_user_role() = 'admin');

CREATE POLICY "settings_update" ON app_settings FOR ALL
  USING (current_user_role() = 'admin');
