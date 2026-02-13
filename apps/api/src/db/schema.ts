export const migrationSql = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_link_codes (
  request_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS analysis_requests (
  request_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  paragraph_count INTEGER NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  finished_at TEXT,
  error_code TEXT
);

CREATE TABLE IF NOT EXISTS api_usage_daily (
  user_id TEXT NOT NULL,
  ymd TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ymd)
);
`;
