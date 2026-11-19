-- ==============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO CREATE THE BOOK COVER STORAGE BUCKET
-- Link: https://supabase.com/dashboard/project/vztoznhlclljtllrybjk/sql/new
--
-- Safe to re-run: it repairs the bucket settings and re-creates the policies.
-- The whole script is idempotent, so re-running it after an earlier failure is
-- the fastest fix for "new row violates row-level security policy" on upload.
-- ==============================================================================

-- 1. Ensure cover_image_url column exists in reading_sessions table
alter table public.reading_sessions
add column if not exists cover_image_url text;

-- 2. Create (or repair) the public 'book-cover-image' bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-cover-image',
  'book-cover-image',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[];

-- 3. Storage Row Level Security (RLS) Policies for 'book-cover-image'
-- Allow anyone to view book covers (public bucket)
drop policy if exists "Book covers are publicly accessible" on storage.objects;
create policy "Book covers are publicly accessible" on storage.objects
  for select to public
  using (bucket_id = 'book-cover-image');

-- Allow signed-in users to upload book covers
drop policy if exists "Authenticated users can upload book covers" on storage.objects;
create policy "Authenticated users can upload book covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'book-cover-image');

-- Allow uploaders to update their book covers
drop policy if exists "Users can update their own book covers" on storage.objects;
create policy "Users can update their own book covers" on storage.objects
  for update to authenticated
  using (bucket_id = 'book-cover-image' and auth.uid() = owner)
  with check (bucket_id = 'book-cover-image' and auth.uid() = owner);

-- Allow uploaders to delete their book covers
drop policy if exists "Users can delete their own book covers" on storage.objects;
create policy "Users can delete their own book covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'book-cover-image' and auth.uid() = owner);

-- 4. Verify: this should list four rows for 'book-cover-image'
select policyname, cmd, roles::text
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (qual like '%book-cover-image%' or with_check like '%book-cover-image%')
order by cmd;
