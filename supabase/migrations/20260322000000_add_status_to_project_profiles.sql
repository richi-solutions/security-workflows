-- Add status column to project_profiles for public-facing product status.
-- Used by richi.richi.solutions to display product badges (Live, Beta, Coming Soon).

ALTER TABLE project_profiles
ADD COLUMN status TEXT NOT NULL DEFAULT 'beta'
CHECK (status IN ('live', 'beta', 'coming_soon'));

-- Set initial statuses
UPDATE project_profiles SET status = 'live' WHERE repo_name = 'moviemind.richi.solutions';
UPDATE project_profiles SET status = 'beta' WHERE repo_name = 'memobot.richi.solutions';
UPDATE project_profiles SET status = 'coming_soon' WHERE repo_name = 'hookr.richi.solutions';
UPDATE project_profiles SET status = 'beta' WHERE repo_name = 'ventura.richi.solutions';
UPDATE project_profiles SET status = 'beta' WHERE repo_name = 'media.richi.solutions';
UPDATE project_profiles SET status = 'beta' WHERE repo_name = 'padel-league.richi.solutions';
