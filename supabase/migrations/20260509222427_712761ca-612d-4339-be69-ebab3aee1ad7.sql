-- Add revision-request workflow on editorial posts
ALTER TABLE public.editorial_posts
  ADD COLUMN IF NOT EXISTS revision_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_note text;

CREATE INDEX IF NOT EXISTS editorial_posts_revision_idx
  ON public.editorial_posts (client_id) WHERE revision_requested = true;

-- Allow clients to flag a pending post for revision (with note)
DROP POLICY IF EXISTS "Clients request revision on own posts" ON public.editorial_posts;
CREATE POLICY "Clients request revision on own posts"
ON public.editorial_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id AND status = 'pending'::post_status)
WITH CHECK (auth.uid() = client_id AND status = 'pending'::post_status AND revision_requested = true);
