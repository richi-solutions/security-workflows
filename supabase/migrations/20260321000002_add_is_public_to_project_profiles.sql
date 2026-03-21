-- Add is_public flag to project_profiles for filtering internal tools.
-- Defaults to true so new repos are visible to n8n by default.
-- Internal repos set public: false in project.yaml to opt out.

ALTER TABLE project_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_project_profiles_public ON project_profiles (is_public) WHERE is_public = true;
