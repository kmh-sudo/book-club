# Task: show real book cover images in reading sessions

You are working in this repo (Next.js App Router + Supabase, client-side data access). Implement real book cover images: the creator uploads an image when creating a session, it is stored in the Supabase storage bucket `book-cover-image`, its public URL is saved to `reading_sessions.cover_image_url`, and that image is displayed wherever a session is shown. Today every session shows a drawn gradient placeholder ("mockup") because no code ever writes or reads `cover_image_url`.

Read this whole prompt before editing. Do not commit or push. Per this repo's `AGENTS.md`: this Next.js version may differ from what you know, so read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code, and do not remove the auto-generated Next rules block in `AGENTS.md`.

## Current state (verified)

- `public.reading_sessions.cover_image_url text` **already exists** (`supabase/schema.sql` line 48) and is typed in `src/types/database.ts` (`Row`, `Insert`, `Update`). No schema change is needed for the column.
- The column is **never written and never read**:
  - `src/app/sessions/new/page.tsx` produces the insert payload (around lines 97-110) with `creator_id, title, author, total_chapters, description, target_end_date, pdf_url, status`. No `cover_image_url`.
  - `src/components/SessionCard.tsx` lines 45-53 render a fixed gradient `div` with a `BookOpen` icon and "`{total_chapters} Ch`" — this is the placeholder shown on the home page and the profile page. `SessionCard` is used by `src/app/page.tsx` (line 315) and `src/app/profile/page.tsx` (line 276).
  - `src/app/sessions/[id]/page.tsx` lines 330-340 render the same kind of gradient placeholder in the session header (sizes `w-16 h-24 sm:w-20 sm:h-28`).
- The only storage bucket the app uses is `session_pdfs`, for PDFs: upload + `getPublicUrl` in `src/app/sessions/new/page.tsx` (lines ~68-91) and a host-side PDF upload in `src/app/sessions/[id]/page.tsx` (lines ~170-190). `supabase/create_pdf_bucket.sql` is the existing pattern for bucket + policies.
- The Supabase browser client comes from `createClient()` in `src/lib/supabase/client.ts`.
- The bucket the user has provisioned is named **`book-cover-image`** (singular, hyphenated). Do not invent a different name and do not reuse `session_pdfs` for covers.
- There is currently **no `/sessions/[id]/edit` page and no cover editing UI** anywhere. Covers are set **only when creating a session**; do not build an edit/replace-cover flow, a cropper, drag-and-drop, or an image-management page.

## Required work

### 1. Storage setup for `book-cover-image`

Add `supabase/create_book_cover_bucket.sql`, modelled on `supabase/create_pdf_bucket.sql`, and run it in the Supabase SQL editor of this project if you have access; otherwise hand it to the user with the exact dashboard link used in the existing SQL file. It must:

- upsert the bucket with `public = true`, a sensible `file_size_limit` (5 MB) and `allowed_mime_types` for `image/jpeg`, `image/png`, `image/webp` (use `on conflict (id) do update` so re-running fixes a private bucket);
- create policies on `storage.objects` for `bucket_id = 'book-cover-image'`: `select` for everyone (public read), `insert` for `auth.role() = 'authenticated'`, `update`/`delete` for `auth.uid() = owner`;
- use `drop policy if exists` before each `create policy` so the script is idempotent, and keep all statements scoped to `bucket_id = 'book-cover-image'` — do not touch `session_pdfs` policies.

The bucket must be public: `getPublicUrl()` only yields a renderable URL for a public bucket, and a private bucket returns 400/403 in an `<img>`.

### 2. Upload a cover in the create-session form

In `src/app/sessions/new/page.tsx`:

- Add `coverFile` state plus a file input for images (`accept="image/jpeg,image/png,image/webp"`), placed near the existing PDF upload block and styled consistently with it (`border-2 border-dashed ... rounded-2xl` pattern already in the file). Reuse the existing error banner for validation messages.
- Validate on change: MIME type must be jpeg/png/webp and size ≤ 5 MB; otherwise clear the file and show a clear error. Ignore empty selections.
- Show a local preview of the chosen image (`URL.createObjectURL`, revoked on change/unmount) so the host sees the actual cover before publishing. Keep it inside the existing fixed cover aspect box so the form does not jump.
- On submit, before the insert: upload to `book-cover-image` at `${user.id}/${Date.now()}-${slug}.${ext}` (slug derived from the trimmed title the same way the PDF path does it, `ext` from the mime type), `cacheControl: "3600"`, `upsert: false`. On success call `getPublicUrl(filePath)` and put the URL in the insert payload as `cover_image_url`. The index insert must include `cover_image_url: uploadedCoverUrl` (null when no file).
- If the cover upload fails, do **not** silently create the session with an unreachable cover and do not lose the typed form data: abort the submit with an error message that names the failure (keep the existing behaviour of not throwing away everything on storage errors where the PDF path tolerates failure — but the cover must never be stored as a broken URL). Do not change the PDF upload flow, its bucket, or its error handling.
- Update `uploadStatus` while uploading so the submit button text reflects it (e.g. "Uploading cover...") without replacing the existing PDF status messages.

### 3. Display the cover

Add one small shared presentational piece rather than duplicating logic: e.g. `src/components/BookCover.tsx` accepting `{ url: string | null; alt: string; className?: string; fallback: ReactNode }` — fixed-size wrapper supplied by the caller, image absolutely/full-size with `object-cover`, `loading="lazy"`, `decoding="async"`, `alt={alt}` (the book title), and an `onError` that flips to the fallback so a dead URL never leaves a blank/alt-text box. Keeping the wrapper's existing dimensions is required.

- `src/components/SessionCard.tsx`: when `session.cover_image_url` is present, replace the gradient mockup with the cover image in the same `w-14 h-20` box, preserving `rounded-xl`, border, shadow and the `group-hover:scale-105 group-hover:rotate-1` animation. When it is absent or fails, keep today's mockup exactly as it is.
- `src/app/sessions/[id]/page.tsx`: same for the header cover (`w-16 h-24 sm:w-20 sm:h-28`, `rounded-2xl`, shadow). Do not move, resize, or restyle the surrounding header, badges, title block, or the PDF reader.
- No cover may be shown in the PDF reader area, the discussion thread, or anywhere else. Do not add a lightbox, click-to-enlarge, or hover zoom beyond what the card already does.

Use a plain `<img>`: the project has no `next/image` usage and no `images.remotePatterns` in `next.config.ts`, and adding that config is out of scope. Do not add a `@next/next/no-img-element` disable comment unless the lint rule actually fires — if it does, leave the warning and report it rather than suppressing it.

## Hard constraints

- No new dependencies. No API routes. No new tables or columns. No changes to `reading_sessions` RLS.
- Do not touch `src/components/PdfViewer.tsx`, `src/components/MobilePdfReader.tsx`, `public/pdf.worker.min.*`, or the PDF upload/reading flow.
- No redesign: layouts, spacing, colours, typography, dark-mode classes and existing animations stay as they are; only the cover box contents change.
- Do not rename the bucket, do not read covers from `session_pdfs`, and do not hard-code the Supabase project URL — the public URL must come from `supabase.storage.from("book-cover-image").getPublicUrl(...)`.
- The existing placeholder is the fallback, not the default: it must only render when there is no usable cover.
- Leave the working tree uncommitted unless the user asks for a commit.

## Acceptance checklist

1. A session created with a cover has a non-null `cover_image_url` pointing at `.../storage/v1/object/public/book-cover-image/...`, and that URL returns HTTP 200 with `content-type: image/*` when fetched directly.
2. That cover appears on the home page card and the profile page card for that session, and in the session detail header, at the same box dimensions as the old placeholder, `object-cover` (no stretching), with the card hover animation still working.
3. A session created without a cover, and a session whose `cover_image_url` is a dead URL, both show the existing gradient mockup — no broken-image icon, no empty gap, no layout shift.
4. Validation blocks a PDF, an oversized image, and a `.heic`/other unsupported file with a readable error, and never uploads them.
5. Dark mode keeps the same borders/shadows around the cover; nothing overflows the card at 320 px and 1440 px width.
6. `npm run build` passes (there is no test framework in this repo).

## Verification you must actually perform

- Run `npm run build`, then serve the production build (`npx next start -p <free port>`) and check with a headless browser or by fetching pages.
- Confirm (1) and (2) end-to-end using a real upload, not a hand-inserted row: create a session with a small PNG/JPEG through the form, then inspect the row's `cover_image_url`, fetch that URL, and confirm `document.querySelectorAll('img')` shows it in the card and header with the expected rendered width/height.
- Confirm (3) by setting a session's `cover_image_url` to a 404 URL and reloading: the fallback must appear.
- If you cannot reach the Supabase project (missing keys), say so explicitly and stop at the SQL script plus code, rather than claiming runtime verification.
- Kill any servers/background processes you start.

## Report back

State: files changed, the SQL the user must run (if you could not run it), whether the bucket was public already, what you verified with real measurements (URL status, rendered sizes, fallback case) and what you could not verify. Call out any deviation from this prompt and why.
