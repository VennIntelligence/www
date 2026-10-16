-- One row per GitHub account that completed "Sign in with GitHub" on /apply, whether or not it applied.
-- Upserted by worker/githubSession.js on every successful OAuth callback. No OAuth token is stored.
CREATE TABLE IF NOT EXISTS github_logins (
  github_id   INTEGER PRIMARY KEY,   -- GitHub numeric account id (stable across renames)
  login       TEXT    NOT NULL,      -- latest login seen
  avatar_url  TEXT,
  -- gate snapshot at the latest sign-in (kept from the previous one if GitHub could not be read)
  repo_count  INTEGER,               -- public, non-fork repos owned
  avg_stars   REAL,                  -- average stars across those repos
  max_stars   INTEGER,               -- stars of the most-starred owned repo
  eligible    INTEGER,               -- 1 / 0: full account gate, owned repos only
  login_count INTEGER NOT NULL DEFAULT 1,
  first_seen  INTEGER NOT NULL,      -- unix epoch milliseconds
  last_seen   INTEGER NOT NULL       -- unix epoch milliseconds
);

CREATE INDEX IF NOT EXISTS idx_github_logins_last_seen ON github_logins (last_seen);
