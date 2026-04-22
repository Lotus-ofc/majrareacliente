-- Add scheduled time and caption-change approval workflow
ALTER TABLE public.editorial_posts
  ADD COLUMN IF NOT EXISTS scheduled_time time NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS pending_caption text,
  ADD COLUMN IF NOT EXISTS caption_change_status text NOT NULL DEFAULT 'none';

-- caption_change_status valid values: 'none' | 'pending' | 'rejected'
-- (when admin approves: pending_caption -> caption, status reset to 'none')

-- Allow clients to propose a caption change on their own posts
-- (separate policy from the existing approve policy, which is restricted to status transitions)
DROP POLICY IF EXISTS "Clients propose caption changes" ON public.editorial_posts;
CREATE POLICY "Clients propose caption changes"
ON public.editorial_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND caption_change_status = 'pending'
);
