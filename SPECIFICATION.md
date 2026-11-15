# Project Specification: Book Club Web App

## 1. Executive Summary & Vision
The **Book Club** web application is a fully responsive, modern community platform where book lovers can create reading sessions, track reading milestones together, discuss books in dedicated single-thread forums, and react to peers' contributions in real time.

---

## 2. Technology Stack

- **Frontend Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling & UI Components:** Tailwind CSS, shadcn/ui, Lucide React icons
- **Backend & Database:** Supabase (PostgreSQL with Row Level Security)
- **Authentication:** Supabase Auth (Email/Password with optional OAuth)
- **Realtime Collaboration:** Supabase Realtime (Live comment updates and reaction counters)
- **State & Data Fetching:** React Server Components (RSC) + `@tanstack/react-query` or Supabase Client Hooks

---

## 3. User Roles & Permissions

1. **Guest / Unauthenticated User:**
   - Browse public reading sessions, book details, and read public discussion threads.
   - Prompted to register/log in to participate.
2. **Authenticated Member:**
   - **Profile:** Manage avatar, display name, and bio.
   - **Session Creation:** Create new reading sessions (Book Title, Author, Total Chapters, Target Completion Date, Description).
   - **Join Session:** Join active reading sessions to track personal progress.
   - **Progress Tracking:** Update current chapter progress (e.g., Chapter 4 of 24) with visual progress bars.
   - **Discussion:** Post comments in the session thread once joined.
   - **Reactions:** React to comments using a curated emoji set (`👍`, `❤️`, `💡`, `👏`, `😮`).
   - **Session Host Privileges:** Edit session details or mark session as completed/archived.

---

## 4. System Architecture & Database Schema (Supabase)

```sql
-- 1. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Reading Sessions Table
create table public.reading_sessions (
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

-- 3. Session Members & Progress
create table public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.reading_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  current_chapter int not null default 0 check (current_chapter >= 0),
  is_completed boolean not null default false,
  joined_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(session_id, user_id)
);

-- 4. Discussion Comments (Single Thread per Session)
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.reading_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  chapter_reference int check (chapter_reference > 0),
  is_spoiler boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Comment Reactions (Fixed Emoji Set)
create table public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  emoji text not null check (emoji in ('👍', '❤️', '💡', '👏', '😮')),
  created_at timestamptz default now() not null,
  unique(comment_id, user_id, emoji)
);
```

### Row Level Security (RLS) Policy Blueprint
- **`reading_sessions`**: `SELECT` is public (`true`); `INSERT`/`UPDATE` restricted to authenticated creator.
- **`session_members`**: `SELECT` is public; `INSERT`/`UPDATE` allowed for the authenticated user matching `user_id`.
- **`comments`**:
  - `SELECT`: Publicly visible to all.
  - `INSERT`: Restricted to authenticated users who exist in `session_members` for that `session_id`.
  - `UPDATE`/`DELETE`: Restricted to comment author (`user_id = auth.uid()`).
- **`comment_reactions`**:
  - `SELECT`: Publicly visible.
  - `INSERT`/`DELETE`: Restricted to authenticated users who are members of that session.

---

## 5. Screen Breakdown & Responsive UI

### 1. Home / Explore (`/`)
- Hero section explaining the platform with primary CTA ("Join a Club" or "Start Reading").
- Grid / Card list of active reading sessions:
  - Book title, author, cover, participant count, and average club progress.
- Search & filter bar (by title, author, status).

### 2. Session Detail (`/sessions/[id]`)
- **Book Overview Header:** Title, author, host info, timeline, and description.
- **Action Area:** "Join Session" button (or "Update Chapter" slider/modal for joined members).
- **Roster & Progress Section:**
  - Visual progress bar for each participant showing chapter count and % completed.
  - Completion badge when a member finishes all chapters.
- **Single Thread Discussion Feed:**
  - Real-time comment stream.
  - Chapter badge tags (e.g. `Chapter 3 Discussion`) and optional spoiler blur.
  - Reaction toolbar on each comment with active counters for `👍`, `❤️`, `💡`, `👏`, `😮`.
  - Rich comment composer at the bottom for joined members (read-only notice with "Join to participate" for guests).

### 3. Create Session (`/sessions/new`)
- Form with validation (Title, Author, Total Chapters, Cover Image URL / File, Target End Date, Description).

### 4. User Profile & Dashboard (`/profile` & `/dashboard`)
- Summary of joined sessions, reading streak/statistics, and personal active sessions.

---

## 6. Implementation Roadmap

- **Phase 1: Project Setup & Supabase Config**
  - Next.js 15 scaffolding with Tailwind CSS and shadcn/ui.
  - Supabase client initialization, database migrations, and RLS policies setup.
- **Phase 2: Authentication & Profile Management**
  - Sign up, login, session persistence, and profile edit screen.
- **Phase 3: Sessions & Progress Tracker**
  - CRUD operations for reading sessions.
  - Member join/leave logic and interactive chapter progress slider/stepper.
- **Phase 4: Discussion Thread & Reactions (Realtime)**
  - Comment posting, spoiler masking, and live Supabase Realtime channel subscriptions.
  - Emoji reaction toggles with instant optimistic UI feedback.
- **Phase 5: Polish & Responsive Optimization**
  - Mobile bottom navigation bar, touch-friendly reaction controls, and end-to-end testing.
