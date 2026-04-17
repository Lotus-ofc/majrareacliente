ALTER TABLE public.client_reports
ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.client_reports
ALTER COLUMN iframe_url DROP NOT NULL,
ALTER COLUMN iframe_url SET DEFAULT '';