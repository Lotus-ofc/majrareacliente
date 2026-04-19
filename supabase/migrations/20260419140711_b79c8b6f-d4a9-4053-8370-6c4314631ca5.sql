-- Create storage bucket for post media (images and videos)
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Public read access
create policy "Post media is publicly readable"
on storage.objects for select
using (bucket_id = 'post-media');

-- Admins can upload
create policy "Admins upload post media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admins can update
create policy "Admins update post media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'post-media'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admins can delete
create policy "Admins delete post media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-media'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);