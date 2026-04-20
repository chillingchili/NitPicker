-- Migration 003: SR tables (topic_sr_state, question_performance, exam_sessions)
-- Creates spaced repetition tracking tables with RLS policies scoped to user_id.

-- 1. topic_sr_state: Per-topic SR parameters
CREATE TABLE IF NOT EXISTS topic_sr_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  easiness_factor float NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  repetitions int NOT NULL DEFAULT 0,
  next_review_date date NOT NULL,
  last_review_date date NOT NULL,
  UNIQUE (user_id, topic)
);

ALTER TABLE topic_sr_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own SR state"
  ON topic_sr_state
  USING (auth.uid() = user_id);

-- 2. question_performance: Per-question correct/incorrect counts
CREATE TABLE IF NOT EXISTS question_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id text NOT NULL,
  correct_count int NOT NULL DEFAULT 0,
  incorrect_count int NOT NULL DEFAULT 0,
  confidence float,
  last_answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

ALTER TABLE question_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own question performance"
  ON question_performance
  USING (auth.uid() = user_id);

-- 3. exam_sessions: Structured exam session history
CREATE TABLE IF NOT EXISTS exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL,
  settings jsonb NOT NULL,
  score int NOT NULL,
  total_questions int NOT NULL,
  correct_answers int NOT NULL,
  duration_seconds int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own exam sessions"
  ON exam_sessions
  USING (auth.uid() = user_id);
