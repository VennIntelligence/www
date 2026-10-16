-- Grant applications submitted through /apply (written by worker/grants.js).
CREATE TABLE IF NOT EXISTS grant_applications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      INTEGER NOT NULL,              -- unix epoch milliseconds
  status          TEXT    NOT NULL DEFAULT 'new',
  name            TEXT    NOT NULL,
  email           TEXT    NOT NULL,              -- stored lower-cased
  applicant_type  TEXT    NOT NULL,              -- 'researcher' | 'startup'
  github_user     TEXT    NOT NULL,
  repo_url        TEXT    NOT NULL,              -- canonical https://github.com/{owner}/{repo}
  result          TEXT    NOT NULL,
  grant_use       TEXT    NOT NULL,
  amount_usd      INTEGER NOT NULL,
  video_url       TEXT,
  referrer        TEXT,
  ip_hash         TEXT    NOT NULL,              -- SHA-256 of the client IP, never the raw IP
  -- verification snapshot taken at submit time
  repo_stars      INTEGER,
  repo_forks      INTEGER,
  repo_description TEXT,
  repo_pushed_at  TEXT,
  github_relation TEXT,                          -- 'owner' | 'contributor'
  video_title     TEXT
);

CREATE INDEX IF NOT EXISTS idx_grant_applications_email_created ON grant_applications (email, created_at);
CREATE INDEX IF NOT EXISTS idx_grant_applications_ip_created ON grant_applications (ip_hash, created_at);
