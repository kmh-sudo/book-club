-- ==============================================================================
-- Allow session creators to moderate (delete) comments in their sessions
-- Run this in the Supabase SQL Editor.
--
-- Before: only a comment's author could delete it.
-- After:  the author OR the creator of the session can delete it.
-- ==============================================================================

drop policy if exists "Authors can delete their comments" on public.comments;

create policy "Authors and session creators can delete comments" on public.comments
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.reading_sessions
      where reading_sessions.id = comments.session_id
      and reading_sessions.creator_id = auth.uid()
    )
  );
