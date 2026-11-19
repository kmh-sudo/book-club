-- ==============================================================================
-- Book Club Web App - Database Migration Script
-- Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Automatic Profile Creation on User Sign Up (Trigger)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Reading Sessions Table
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  author text not null,
  total_chapters int not null check (total_chapters > 0),
  description text,
  cover_image_url text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  start_date date default current_date not null,
  target_end_date date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Session Members & Reading Progress Table
create table if not exists public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.reading_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  current_chapter int not null default 0 check (current_chapter >= 0),
  is_completed boolean not null default false,
  joined_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(session_id, user_id)
);

-- Automatically auto-join the creator to the reading session upon creation
create or replace function public.handle_new_reading_session()
returns trigger as $$
begin
  insert into public.session_members (session_id, user_id, current_chapter, is_completed)
  values (new.id, new.creator_id, 0, false)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_reading_session_created on public.reading_sessions;
create trigger on_reading_session_created
  after insert on public.reading_sessions
  for each row execute function public.handle_new_reading_session();

-- 6. Discussion Comments (Single Thread per Session)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.reading_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  chapter_reference int check (chapter_reference > 0),
  is_spoiler boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 7. Comment Reactions Table (Fixed Curated Emojis: 👍, ❤️, 💡, 👏, 😮)
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null check (emoji in ('👍', '❤️', '💡', '👏', '😮')),
  created_at timestamptz default now() not null,
  unique(comment_id, user_id, emoji)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reactions enable row level security;

-- Profiles Policies
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Reading Sessions Policies
create policy "Reading sessions are viewable by everyone" on public.reading_sessions
  for select using (true);

create policy "Authenticated users can create reading sessions" on public.reading_sessions
  for insert with check (auth.uid() = creator_id);

create policy "Creators can update their reading sessions" on public.reading_sessions
  for update using (auth.uid() = creator_id);

create policy "Creators can delete their reading sessions" on public.reading_sessions
  for delete using (auth.uid() = creator_id);

-- Session Members Policies
create policy "Session members are viewable by everyone" on public.session_members
  for select using (true);

create policy "Authenticated users can join sessions" on public.session_members
  for insert with check (auth.uid() = user_id);

create policy "Members can update their own progress" on public.session_members
  for update using (auth.uid() = user_id);

create policy "Members can leave sessions" on public.session_members
  for delete using (auth.uid() = user_id);

-- Comments Policies
create policy "Comments are viewable by everyone" on public.comments
  for select using (true);

create policy "Session members can post comments" on public.comments
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.session_members
      where session_members.session_id = comments.session_id
      and session_members.user_id = auth.uid()
    )
  );

create policy "Authors can update their comments" on public.comments
  for update using (auth.uid() = user_id);

create policy "Authors and session creators can delete comments" on public.comments
  for delete using (
    auth.uid() = user_id or
    exists (
      select 1 from public.reading_sessions
      where reading_sessions.id = comments.session_id
      and reading_sessions.creator_id = auth.uid()
    )
  );

-- Comment Reactions Policies
create policy "Comment reactions are viewable by everyone" on public.comment_reactions
  for select using (true);

create policy "Session members can react to comments" on public.comment_reactions
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.comments
      join public.session_members on session_members.session_id = comments.session_id
      where comments.id = comment_reactions.comment_id
      and session_members.user_id = auth.uid()
    )
  );

create policy "Users can remove their own reactions" on public.comment_reactions
  for delete using (auth.uid() = user_id);

-- Enable Realtime for comments and reactions
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.comment_reactions;
alter publication supabase_realtime add table public.session_members;
