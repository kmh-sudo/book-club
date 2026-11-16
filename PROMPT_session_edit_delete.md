# Prompt for a code agent: host can edit/delete reading sessions, PDF stays immutable

## Context

Project: Book Club web app (`book-club`).
Stack: Next.js 16 App Router (React 19, TypeScript), Tailwind CSS v4, Supabase
(Postgres + RLS + Auth + Storage). Read `AGENTS.md` first — this Next.js version
has breaking changes, so check `node_modules/next/dist/docs/` before writing code.

Relevant files:

- `src/app/sessions/[id]/page.tsx` — session detail (header, join, PDF upload, discussion)
- `src/app/sessions/new/page.tsx` — create session form
- `src/app/sessions/[id]/edit/page.tsx` — edit form (baseline already exists; verify/extend it)
- `src/types/database.ts` — `ReadingSession`, `SessionMember`, etc.
- `supabase/schema.sql` — tables + RLS
- `supabase/create_pdf_bucket.sql` — `session_pdfs` storage bucket + policies
- UI primitives: `src/components/ui/{button,input,textarea,card,badge}.tsx`

## Task

Make reading sessions fully manageable by their creator ("host"):

1. **Edit** — the host can update their own session's details.
2. **Delete** — the host can delete their own session.
3. **The book PDF is immutable after creation** — the host must not be able to
   replace, re-upload, or remove it while editing.

Non-hosts (guests and other members) must never see edit/delete controls and
must not be able to perform either action.

## Required behavior

### Edit

- Route: `/sessions/[id]/edit`, client component, params typed as
  `Promise<{ id: string }>` and unwrapped with React's `use()` (Next 16 pattern
  already used in the detail page).
- Only the creator (`user.id === session.creator_id`) sees the form. Everyone
  else gets a "Host Only" card with a link back to the session.
- Editable fields: `title`, `author`, `total_chapters` (> 0), `description`,
  `target_end_date`, `status` (`active` | `completed` | `archived`).
- Validate client-side before writing: non-empty title/author, `total_chapters`
  an integer > 0.
- Update payload must **omit `pdf_url`** and set `updated_at`; scope the write
  with `.eq("id", session.id).eq("creator_id", user.id)`.
- Show a read-only "Book PDF File" row: "PDF attached / Locked" or
  "No PDF attached / Read-only". No file input, no remove button anywhere in
  the edit flow.
- On success, navigate back to `/sessions/[id]`; on failure, show the Supabase
  error message in an alert block (do not swallow it).
- Keep the existing upload affordance on the detail page available **only when
  `pdf_url` is null**; once a PDF exists it must not be changeable.

### Delete

- "Delete" button next to "Edit" in the detail page's top bar, visible only to
  the creator.
- Confirm first with a message that names the session and states that the PDF,
  comments, and reactions are removed and it cannot be undone.
- Delete the `reading_sessions` row scoped by `.eq("id", ...).eq("creator_id", user.id)`.
  `session_members`, `comments`, and `comment_reactions` cascade via FKs.
- Best-effort remove the PDF object from the `session_pdfs` bucket: derive the
  storage path from `session.pdf_url` (the segment after
  `/storage/v1/object/public/session_pdfs/`, URL-decoded, query string
  stripped). Log a warning if storage cleanup fails but still delete the row.
- Redirect to `/` and refresh after success; surface failures in an alert block.
- Disable the button and show a "Deleting…" label while in flight.

### Security / data

- RLS in `supabase/schema.sql` already permits creator `update` and `delete`
  (`auth.uid() = creator_id`); rely on it and keep the client-side `creator_id`
  filters so requests fail closed.
- Do not add a new migration unless a server-side guarantee is requested; if you
  do add one, also update `src/types/database.ts`.
- Match existing code style: `"use client"`, Tailwind utility classes, Lucide
  icons, `Card` / `Button` / `Input` / `Textarea`, amber/stone palette.

## Acceptance criteria

- [ ] Host sees Edit and Delete on `/sessions/[id]`; non-host sees neither.
- [ ] `/sessions/[id]/edit` loads pre-filled values and saves all editable fields.
- [ ] There is no way in the UI to replace or remove an existing session PDF.
- [ ] Saving an edit does not modify `pdf_url`.
- [ ] Delete removes the session, its members, comments, reactions, and the
      stored PDF object, then lands on `/`.
- [ ] Both actions show an error instead of failing silently.
- [ ] `npm run build` passes (TypeScript + all routes generated).

## Out of scope

Search/filter changes, realtime behavior, progress tracking, discussion UX,
restyling unrelated screens, new dependencies.

## Verification

```bash
npm run build
```

Then, on a running dev server, sign in as the host and confirm: edit → save →
reload shows updated values; replace/remove PDF is impossible; delete → session
and its PDF are gone and `/` no longer lists it. Sign in as a non-host and
confirm no controls appear and `/sessions/[id]/edit` shows the Host Only card.
