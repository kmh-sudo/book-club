-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE THE PDF STORAGE BUCKET
-- Link: https://supabase.com/dashboard/project/vztoznhlclljtllrybjk/sql/new
-- ==============================================================================

-- 1. Ensure pdf_url column exists in reading_sessions table
alter table public.reading_sessions 
add column if not exists pdf_url text;

-- 2. Create 'session_pdfs' public bucket in Supabase storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session_pdfs',
  'session_pdfs',
  true,
  52428800, -- 50MB limit
  array['application/pdf']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf'];

-- 3. Storage Row Level Security (RLS) Policies
-- Allow anyone to view and download session PDFs
drop policy if exists "Session PDFs are publicly accessible" on storage.objects;
create policy "Session PDFs are publicly accessible" on storage.objects
  for select using (bucket_id = 'session_pdfs');

-- Allow authenticated users to upload session PDFs
drop policy if exists "Authenticated users can upload session PDFs" on storage.objects;
create policy "Authenticated users can upload session PDFs" on storage.objects
  for insert with check (
    bucket_id = 'session_pdfs' and auth.role() = 'authenticated'
  );

-- Allow uploaders to update their session PDFs
drop policy if exists "Users can update their session PDFs" on storage.objects;
create policy "Users can update their session PDFs" on storage.objects
  for update using (
    bucket_id = 'session_pdfs' and auth.uid() = owner
  );

-- Allow uploaders to delete their session PDFs
drop policy if exists "Users can delete their session PDFs" on storage.objects;
create policy "Users can delete their session PDFs" on storage.objects
  for delete using (
    bucket_id = 'session_pdfs' and auth.uid() = owner
  );
