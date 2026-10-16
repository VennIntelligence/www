-- Sign in with GitHub + account-level gate (worker/github.js, worker/githubSession.js).
-- The self-declared username becomes the OAuth-verified login; existing rows keep their value.
ALTER TABLE grant_applications RENAME COLUMN github_user TO github_login;
-- GitHub numeric account id from the signed session (NULL for rows submitted before OAuth).
ALTER TABLE grant_applications ADD COLUMN github_id INTEGER;
-- Gate snapshot at submit time; never shown to applicants, only on /admin/grants.
ALTER TABLE grant_applications ADD COLUMN repo_count INTEGER;  -- public, non-fork repos owned by the applicant
ALTER TABLE grant_applications ADD COLUMN avg_stars REAL;      -- average stars across those repos
ALTER TABLE grant_applications ADD COLUMN max_stars INTEGER;   -- best of those repos, or the org project repo if higher

CREATE INDEX IF NOT EXISTS idx_grant_applications_github_created ON grant_applications (github_id, created_at);
