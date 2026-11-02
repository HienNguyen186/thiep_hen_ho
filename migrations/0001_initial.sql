CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  viewed INTEGER NOT NULL DEFAULT 0 CHECK (viewed IN (0, 1)),
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS responses_created_at ON responses (created_at, id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits (expires_at);
