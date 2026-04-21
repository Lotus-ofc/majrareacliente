
-- Add post type enum
DO $$ BEGIN
  CREATE TYPE public.post_format AS ENUM ('single', 'carousel', 'reel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add columns to editorial_posts
ALTER TABLE public.editorial_posts
  ADD COLUMN IF NOT EXISTS post_format public.post_format NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill media_urls from image_url for existing rows
UPDATE public.editorial_posts
SET media_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND (media_urls IS NULL OR media_urls = '[]'::jsonb);
