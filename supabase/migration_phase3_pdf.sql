-- ==============================================================================
-- Migration: Add PDF support and Storage Bucket for Book Club
-- ==============================================================================

-- 1. Add pdf_url column to reading_sessions
alter table public.reading_sessions 
add column if not exists pdf_url text;

-- 2. Create 'session_pdfs' storage bucket for uploaded book PDFs
insert into storage.buckets (id, name, public)
values ('session_pdfs', 'session_pdfs', true)
on conflict (id) do nothing;

-- 3. Storage Policies for 'session_pdfs'
create policy "PDF files are publicly accessible" on storage.objects
  for select using (bucket_id = 'session_pdfs');

create policy "Authenticated users can upload session PDFs" on storage.objects
  for insert with check (
    bucket_id = 'session_pdfs' and auth.role() = 'authenticated'
  );

create policy "Users can update their own session PDFs" on storage.objects
  for update using (
    bucket_id = 'session_pdfs' and auth.uid() = owner
  );

create policy "Users can delete their own session PDFs" on storage.objects
  for delete using (
    bucket_id = 'session_pdfs' and auth.uid() = owner
  );
