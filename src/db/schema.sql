-- ============================================================
-- STEM Problem Game — PostgreSQL Schema
-- Source: GDD §8.1 (Event Schema), §8.2 (Server Architecture)
-- ============================================================

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fast text search on labels

-- ─────────────────────────────────────────────
-- Enumerations
-- ─────────────────────────────────────────────
CREATE TYPE domain_type AS ENUM (
  'physics', 'chemistry', 'mathematics', 'biology', 'engineering'
);

CREATE TYPE difficulty_type AS ENUM (
  'beginner', 'intermediate', 'advanced', 'expert'
);

CREATE TYPE platform_type AS ENUM ('web', 'ios', 'android');

CREATE TYPE game_outcome AS ENUM ('win', 'stuck');

CREATE TYPE hint_tier AS ENUM ('1', '2', '3');

-- ─────────────────────────────────────────────
-- Identity table (admin-only access)
-- Separates PII from analytics (GDD §8.4)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT NOT NULL UNIQUE,
  name               TEXT,
  role               TEXT NOT NULL DEFAULT 'student',  -- 'student' | 'instructor' | 'researcher'
  cohort_id          UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,  -- soft delete for GDPR right-to-erasure
  consent_given_at   TIMESTAMPTZ,  -- GDPR consent decision timestamp, set on first login (accept or refuse)
  analytics_consent  BOOLEAN       -- true = accepted, false = refused, null = not yet decided
);

-- ─────────────────────────────────────────────
-- Problems  (GDD §9.1)
-- ─────────────────────────────────────────────
CREATE TABLE problems (
  id              TEXT PRIMARY KEY,            -- e.g. "p-kinematics-01"
  domain          domain_type NOT NULL,
  difficulty      difficulty_type NOT NULL,
  title_en        TEXT NOT NULL,
  title_fr        TEXT NOT NULL,
  variables       JSONB NOT NULL,              -- Variable[]
  formulas        JSONB NOT NULL,              -- Formula[]
  hypotheses      TEXT[] NOT NULL,             -- variable IDs
  conclusions     TEXT[] NOT NULL,             -- variable IDs
  optimal_steps   INTEGER NOT NULL,
  solvable        BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX problems_domain_idx ON problems (domain);
CREATE INDEX problems_difficulty_idx ON problems (difficulty);

-- ─────────────────────────────────────────────
-- Raw event log  (GDD §8.2 — append-only)
-- ─────────────────────────────────────────────
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,                   -- pseudonymous (never name/email)
  problem_id  TEXT REFERENCES problems(id),
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL,
  platform    platform_type,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition by month for query performance
-- (in production, use declarative partitioning)
CREATE INDEX events_user_idx      ON events (user_id);
CREATE INDEX events_type_idx      ON events (event_type);
CREATE INDEX events_received_idx  ON events (received_at DESC);
CREATE INDEX events_problem_idx   ON events (problem_id);

-- ─────────────────────────────────────────────
-- Sessions  (one row per problem attempt)
-- ─────────────────────────────────────────────
CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  problem_id            TEXT NOT NULL REFERENCES problems(id),
  platform              platform_type NOT NULL,
  outcome               game_outcome,
  total_steps           INTEGER,
  optimal_steps         INTEGER,
  time_elapsed_seconds  NUMERIC(8,2),
  hints_used            INTEGER DEFAULT 0,
  final_score           INTEGER,
  step_efficiency_ratio NUMERIC(5,4),          -- optimal / actual, 0–1
  activation_path       TEXT[],                -- ordered formula IDs
  started_at            TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ
);

CREATE INDEX sessions_user_idx     ON sessions (user_id);
CREATE INDEX sessions_problem_idx  ON sessions (problem_id);
CREATE INDEX sessions_started_idx  ON sessions (started_at DESC);

-- ─────────────────────────────────────────────
-- Aggregates (GDD §8.3 — nightly batch jobs)
-- ─────────────────────────────────────────────

-- Per-student per-domain aggregate (refreshed nightly)
CREATE TABLE student_domain_stats (
  user_id             UUID NOT NULL,
  domain              domain_type NOT NULL,
  problems_attempted  INTEGER NOT NULL DEFAULT 0,
  problems_completed  INTEGER NOT NULL DEFAULT 0,
  total_sessions      INTEGER NOT NULL DEFAULT 0,
  avg_score           NUMERIC(7,2),
  avg_efficiency      NUMERIC(5,4),            -- mean step_efficiency_ratio
  avg_hints_per_prob  NUMERIC(5,2),
  completion_rate     NUMERIC(5,4),            -- completed / attempted
  last_played_at      TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, domain)
);

-- Per-problem aggregate (refreshed nightly)
CREATE TABLE problem_stats (
  problem_id          TEXT PRIMARY KEY REFERENCES problems(id),
  total_attempts      INTEGER NOT NULL DEFAULT 0,
  total_completions   INTEGER NOT NULL DEFAULT 0,
  completion_rate     NUMERIC(5,4),
  avg_score           NUMERIC(7,2),
  avg_steps           NUMERIC(6,2),
  avg_time_seconds    NUMERIC(8,2),
  avg_hints           NUMERIC(5,2),
  p50_efficiency      NUMERIC(5,4),            -- median efficiency ratio
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Cohorts (class groups managed by instructors)
-- ─────────────────────────────────────────────
CREATE TABLE cohorts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  instructor_id        UUID NOT NULL REFERENCES users(id),
  score_config         JSONB,                  -- ScoreConfig overrides
  -- Shown on the student-facing LeaderboardPanel only when true (GDD §6.4)
  leaderboard_enabled  BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT users_cohort_fk
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- Leaderboard view  (GDD §6.4)
-- Read by the frontend; never exposes emails
-- ─────────────────────────────────────────────
CREATE VIEW cohort_leaderboard AS
  SELECT
    s.user_id,
    u.name AS display_name,
    u.cohort_id,
    SUM(s.final_score)          AS total_score,
    COUNT(*)                    AS sessions_played,
    ROUND(AVG(s.step_efficiency_ratio)::NUMERIC, 3) AS avg_efficiency,
    RANK() OVER (
      PARTITION BY u.cohort_id ORDER BY SUM(s.final_score) DESC
    )                            AS rank
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.outcome = 'win'
    AND u.deleted_at IS NULL
  GROUP BY s.user_id, u.name, u.cohort_id;

-- ─────────────────────────────────────────────
-- GDPR right-to-erasure helper  (GDD §8.4)
-- Anonymises a user's PII without deleting analytics rows
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anonymise_user(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE users SET
    email      = 'deleted-' || p_user_id || '@anonymised',
    name       = 'Deleted User',
    deleted_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
