-- Add preview_image_url column for product card screenshots.
-- Images are stored in the project-assets bucket, served as public URLs.

ALTER TABLE project_profiles
ADD COLUMN preview_image_url TEXT;

-- Set preview URLs (public bucket, no auth needed)
UPDATE project_profiles SET preview_image_url = 'https://bsdfgvgqyzspkyswlaqs.supabase.co/storage/v1/object/public/project-assets/moviemind.richi.solutions/preview.png' WHERE repo_name = 'moviemind.richi.solutions';
UPDATE project_profiles SET preview_image_url = 'https://bsdfgvgqyzspkyswlaqs.supabase.co/storage/v1/object/public/project-assets/memobot.richi.solutions/preview.png' WHERE repo_name = 'memobot.richi.solutions';
UPDATE project_profiles SET preview_image_url = 'https://bsdfgvgqyzspkyswlaqs.supabase.co/storage/v1/object/public/project-assets/hookr.richi.solutions/preview.png' WHERE repo_name = 'hookr.richi.solutions';
UPDATE project_profiles SET preview_image_url = 'https://bsdfgvgqyzspkyswlaqs.supabase.co/storage/v1/object/public/project-assets/ventura.richi.solutions/preview.png' WHERE repo_name = 'ventura.richi.solutions';
UPDATE project_profiles SET preview_image_url = 'https://bsdfgvgqyzspkyswlaqs.supabase.co/storage/v1/object/public/project-assets/media.richi.solutions/preview.png' WHERE repo_name = 'media.richi.solutions';
