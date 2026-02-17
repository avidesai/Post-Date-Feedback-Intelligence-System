// sqlite schema for the feedback intelligence system
// kept simple - vectors stored as individual columns for easy querying

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    bio TEXT DEFAULT '',
    stated_conversation REAL NOT NULL DEFAULT 0.5,
    stated_emotional REAL NOT NULL DEFAULT 0.5,
    stated_interests REAL NOT NULL DEFAULT 0.5,
    stated_chemistry REAL NOT NULL DEFAULT 0.5,
    stated_values REAL NOT NULL DEFAULT 0.5,
    revealed_conversation REAL NOT NULL DEFAULT 0.5,
    revealed_emotional REAL NOT NULL DEFAULT 0.5,
    revealed_interests REAL NOT NULL DEFAULT 0.5,
    revealed_chemistry REAL NOT NULL DEFAULT 0.5,
    revealed_values REAL NOT NULL DEFAULT 0.5,
    quality_conversation REAL NOT NULL DEFAULT 0.5,
    quality_emotional REAL NOT NULL DEFAULT 0.5,
    quality_interests REAL NOT NULL DEFAULT 0.5,
    quality_chemistry REAL NOT NULL DEFAULT 0.5,
    quality_values REAL NOT NULL DEFAULT 0.5,
    feedback_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dates (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL REFERENCES users(id),
    user_b_id TEXT NOT NULL REFERENCES users(id),
    venue_name TEXT,
    venue_place_id TEXT,
    venue_noise_level TEXT,
    venue_price_level INTEGER,
    venue_ambiance TEXT,
    date_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    date_id TEXT NOT NULL REFERENCES dates(id),
    from_user_id TEXT NOT NULL REFERENCES users(id),
    about_user_id TEXT NOT NULL REFERENCES users(id),
    overall_rating REAL NOT NULL DEFAULT 0.5,
    conversation_score REAL NOT NULL DEFAULT 0.5,
    emotional_score REAL NOT NULL DEFAULT 0.5,
    interests_score REAL NOT NULL DEFAULT 0.5,
    chemistry_score REAL NOT NULL DEFAULT 0.5,
    values_score REAL NOT NULL DEFAULT 0.5,
    best_part TEXT,
    worst_part TEXT,
    chemistry_text TEXT,
    dimension_snippets TEXT,
    raw_text TEXT,
    llm_extracted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS compatibility_scores (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL REFERENCES users(id),
    user_b_id TEXT NOT NULL REFERENCES users(id),
    score REAL NOT NULL,
    a_to_b_score REAL NOT NULL,
    b_to_a_score REAL NOT NULL,
    dimension_scores TEXT NOT NULL DEFAULT '{}',
    computed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS preference_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    stated_vector TEXT NOT NULL DEFAULT '[]',
    revealed_vector TEXT NOT NULL DEFAULT '[]',
    quality_vector TEXT NOT NULL DEFAULT '[]',
    divergence_score REAL NOT NULL DEFAULT 0,
    feedback_count INTEGER NOT NULL DEFAULT 0,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_dates_user_a ON dates(user_a_id);
  CREATE INDEX IF NOT EXISTS idx_dates_user_b ON dates(user_b_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(date_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_from ON feedback(from_user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_about ON feedback(about_user_id);
  CREATE INDEX IF NOT EXISTS idx_compat_users ON compatibility_scores(user_a_id, user_b_id);
  CREATE INDEX IF NOT EXISTS idx_pref_history_user ON preference_history(user_id);
`;
