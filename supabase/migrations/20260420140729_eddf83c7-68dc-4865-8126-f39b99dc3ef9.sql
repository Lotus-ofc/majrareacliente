-- Add pdf_path column to client_reports for AI extraction source
alter table public.client_reports
  add column if not exists pdf_path text;

-- Create private bucket for report PDFs
insert into storage.buckets (id, name, public)
values ('report-pdfs', 'report-pdfs', false)
on conflict (id) do nothing;

-- Admins can do everything on report-pdfs
create policy "Admins manage report pdfs"
on storage.objects for all
to authenticated
using (
  bucket_id = 'report-pdfs'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
)
with check (
  bucket_id = 'report-pdfs'
  and public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Clients can read their own PDFs (path layout: {client_id}/{source}.pdf)
create policy "Clients read own report pdfs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'report-pdfs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
