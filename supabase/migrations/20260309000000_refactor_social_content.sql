-- Refactor: Replace social_posts with normalized social_content model
-- Content types are platform-agnostic; platform mapping is 1:N downstream

-- Drop old table
DROP POLICY IF EXISTS "service_full_access" ON social_posts;
DROP TABLE IF EXISTS social_posts;

-- 1. social_content: one row per content_type per job run
CREATE TABLE IF NOT EXISTS social_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_run_id UUID NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  post_date DATE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image_post', 'carousel', 'text', 'short')),
  should_post BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'posted', 'skipped')) DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_content_date ON social_content (post_date DESC);
CREATE INDEX IF NOT EXISTS idx_social_content_job_run ON social_content (job_run_id);
CREATE INDEX IF NOT EXISTS idx_social_content_type ON social_content (content_type);

-- 2. social_content_components: building blocks per content piece
CREATE TABLE IF NOT EXISTS social_content_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_content_id UUID NOT NULL REFERENCES social_content(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL CHECK (component_type IN ('caption', 'hook', 'cta', 'thread', 'video_script', 'image_prompt', 'hashtags')),
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_components_content ON social_content_components (social_content_id);
CREATE INDEX IF NOT EXISTS idx_social_components_type ON social_content_components (component_type);

-- 3. social_content_platforms: downstream platform mapping (1:N)
CREATE TABLE IF NOT EXISTS social_content_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_content_id UUID NOT NULL REFERENCES social_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'tiktok', 'youtube', 'facebook')),
  platform_status TEXT NOT NULL CHECK (platform_status IN ('pending', 'posted', 'skipped')) DEFAULT 'pending',
  posted_at TIMESTAMPTZ,
  post_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_platforms_content ON social_content_platforms (social_content_id);
CREATE INDEX IF NOT EXISTS idx_social_platforms_platform ON social_content_platforms (platform, platform_status);

-- RLS: Service-only access
ALTER TABLE social_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_content_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_content_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full_access" ON social_content FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON social_content_components FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_full_access" ON social_content_platforms FOR ALL TO service_role USING (true) WITH CHECK (true);
