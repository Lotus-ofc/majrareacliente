-- 1) Consolidate the three conflicting client UPDATE policies on editorial_posts
--    into a single policy. Column-level restrictions remain enforced by the
--    guard_client_post_update trigger, eliminating the OR-logic ambiguity.
DROP POLICY IF EXISTS "Clients approve own pending posts" ON public.editorial_posts;
DROP POLICY IF EXISTS "Clients propose caption changes" ON public.editorial_posts;
DROP POLICY IF EXISTS "Clients request revision on own posts" ON public.editorial_posts;

CREATE POLICY "Clients update own posts (restricted by trigger)"
ON public.editorial_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- 2) Allow agency staff (agency_admin) to manage report PDFs for clients in
--    their own agency. PDF paths are stored as "<client_id>/...".
CREATE POLICY "Agency staff manage agency report pdfs"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'report-pdfs'
  AND has_role(auth.uid(), 'agency_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.agency_id = get_user_agency_id(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'report-pdfs'
  AND has_role(auth.uid(), 'agency_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND p.agency_id = get_user_agency_id(auth.uid())
  )
);

-- 3) Remove the broad public SELECT (listing) policy on the public post-media
--    bucket. Files remain viewable via their public URLs; this only stops the
--    REST API from listing/enumerating every object in the bucket.
DROP POLICY IF EXISTS "Post media is publicly readable" ON storage.objects;