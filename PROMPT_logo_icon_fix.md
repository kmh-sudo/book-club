# Task: make the BookClub favicon and navbar logo actually show the BookClub logo

You are working in this repo (Next.js App Router, Tailwind CSS v4, Supabase, no test framework).
The user added `public/bclogo1.png` (the BookClub emblem: gold circular badge, "READ TOGETHER", two readers, "BOOKCLUB", "Curated Reads, Shared Worlds") and expected it to appear as the browser-tab icon and as the logo in the navbar. Neither shows the logo today. Fix both, and only both.

Read this whole prompt before editing. Do not commit or push. Per this repo's `AGENTS.md`: this Next.js version may differ from what you know, so read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (for this task: `01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` and `01-app/03-api-reference/04-functions/generate-metadata.md`), and do not remove the auto-generated Next rules block in `AGENTS.md`.

## Verified current state

Run these yourself before editing; they are the facts this prompt is based on.

1. `src/app/layout.tsx` lines 10-21:
   - `metadata.icons = { icon: "/bclogo1.png" }`.
   - `openGraph.images[0].url = './bclogo1.png'` (relative, with the comment "Must be an absolute URL") and `width: 1200, height: 630`.
   - No `metadataBase` is exported. The dev log at `.next/dev/logs/next-development.log` contains:
     `⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000"`.
     So in production the OG image resolves to `http://localhost:3000/bclogo1.png` — a broken social preview.
2. `src/app/favicon.ico` exists. It is the **Next.js default "N" icon** (48x48 ICO, committed in `048949e`). Because it is a file-convention icon, Next emits its own tag **in addition to** the metadata one. `curl -s localhost:3000/ | grep -o '<link rel="icon"[^>]*>'` returns two:
   - `<link rel="icon" href="/favicon.ico?favicon.<hash>.ico" sizes="48x48" type="image/x-icon"/>` (the Next "N", emitted first, with a real declared size)
   - `<link rel="icon" href="/bclogo1.png"/>` (your logo, no `sizes`, 578x432)
   Chrome scores candidates by fit to the tab size; the sized 48x48 ICO wins over an unsized 578x432 non-square PNG, so the tab keeps showing the Next.js "N". `/bclogo1.png` itself returns `200 image/png`, and it **is** reachable — the problem is not the path.
3. `favicon.ico` in the **repo root** (not `public/`, not `app/`) is untracked and is **byte-identical to `public/bclogo1.png`** (`md5 d286e40e52be9a3870155245045409ba` for both) — i.e. a PNG renamed to `.ico`. It is never served and is a landmine: if someone copies it to `public/` it will be served as `image/x-icon` with PNG content. It is dead weight from a failed attempt, not a working asset.
4. `public/bclogo1.png` is a valid PNG, 578x432 (4:3, not square), 180 KB, with the gold badge artwork and a light cream background.
5. `src/components/Navbar.tsx` lines 21-27 do **not** use any image at all. The "logo" is a gradient `div` (`w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-600 to-amber-500`) containing a Lucide `<BookOpen />`, next to the text "BookClub" / "Read Together". So the navbar logo "does not work" because it was never wired to the photo, not because the image fails to load.
6. `next.config.ts` has no `images` config and the repo has no `next/image` usage. Do not add image optimisation config.

## Root causes (state these in your report)

- The tab icon is a **duplicate-icon conflict**: default `app/favicon.ico` (Next "N") plus a metadata `icon` link. The convention ICO wins in Chrome.
- `bclogo1.png` is **non-square and large**, so even if it won it would be squashed into a 16x16 tab slot.
- The OG image is **relative with no `metadataBase`**, so it only works in dev.
- The navbar has **no `<img>`**; it renders a Lucide icon.

## Required work

### 1. Create proper square icon assets from the existing logo

Do not add new artwork and do not invent a different logo. Derive everything from `public/bclogo1.png` with a local tool (e.g. `sips`, ImageMagick, or a tiny Node script using an already-installed package — do not add npm dependencies).

- The badge is a circle roughly spanning x≈66-510, y≈30-402 in the 578x432 source; crop to a **square around the circular emblem** (centred on the badge, including the gold ring, excluding the cream margin as far as possible), then resize. Verify the result by opening/viewing the generated files, not by assuming.
- Produce:
  - `src/app/icon.png` — square, 512x512 (PNG).
  - `src/app/apple-icon.png` — square, 180x180 (PNG, opaque background; iOS does not like transparency).
  - Replace `src/app/favicon.ico` with a **real ICO** containing 16x16, 32x32 and 48x48 frames rendered from the same square crop. If your local toolchain cannot write a true multi-size ICO, it is acceptable to delete `src/app/favicon.ico` entirely and rely on `icon.png` — but then say so in the report. Never leave the Next.js "N" in place and never ship a PNG renamed to `.ico`.
- Delete the stray untracked `favicon.ico` at the repo root (`git status` shows it as `?? favicon.ico`). It is a mislabeled duplicate and is referenced nowhere.
- Do not delete or modify `public/bclogo1.png`; other social/OG use still points at it.

### 2. Remove the duplicate/conflicting icon metadata

In `src/app/layout.tsx`, remove `icons: { icon: "/bclogo1.png" }` from the `metadata` export and let the file conventions in `app/` emit the icon links (the Next docs explicitly recommend the file-based API for icons). After this there must be **exactly one** icon tag family in `<head>`, not two competing ones.

Keep `title`, `description`, `openGraph.title/description/siteName/locale/type` unchanged.

### 3. Fix the Open Graph image metadata while you are in that export

This is part of "metadata icon photo does not work" — the social preview is also broken.

- Add `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")` to the exported metadata, and document the env var in one line of the report (do not create/commit a `.env` file).
- Point `openGraph.url` at that base instead of the placeholder `https://myapp.com`.
- Make the OG image absolute (`/og-image.png` style path is fine once `metadataBase` is set) and make its declared dimensions **match the real file**. Prefer generating `public/og-image.png` at exactly 1200x630 (the logo badge centred on the site's cream background `#FAF8F5`) and declaring 1200x630. If you decide not to generate one, then point at `/bclogo1.png` and declare its true `578x432` — do not keep 1200x630 for a 578x432 file.
- Keep the alt text.

### 4. Use the logo image in the navbar

In `src/components/Navbar.tsx`, in the brand `<Link href="/">`:

- Replace the gradient `div` + `<BookOpen />` with the logo image, keeping the **same 40x40 footprint, `rounded-2xl`, shadow, and the `group-hover:scale-105 group-hover:rotate-[-2deg]` animation**.
- Use the square asset you generated (e.g. `src/app/icon.png` copied to `public/` as `bclogo-icon.png`, referenced as `/bclogo-icon.png`) — prefer a `public/` asset so the navbar and favicon cannot drift, but do not duplicate the bytes more than once. Use a plain `<img>` with explicit `width={40} height={40}`, `alt=""` (the adjacent text already names the site, so an empty alt avoids double-announcing "BookClub"), `loading="eager"`, `decoding="async"`, and `object-cover` inside the square box.
- Because the source logo has a cream background, `object-cover` on the square crop is what makes it sit as a neat badge; check it against the sticky header background (`bg-[#FAF8F5]/85`, dark `dark:bg-[#141210]/85`) and add only a border/ring if the edge visibly clips — do not restyle the header, the text block, or the nav links.
- Leave the "BookClub" / "Read Together" text block exactly as it is. The full logo (with its own "BOOKCLUB" wordmark and tagline) is illegible at 40px, so the navbar shows the square emblem plus the existing text, not the whole 578x432 image.
- Do not touch `MobileNav`, the user avatar logic, or any other part of `Navbar.tsx`.

If the user later wants the full wordmark in the header instead of the emblem + text, that is a separate change — do not do it now.

## Hard constraints

- No new dependencies. No API routes, no SQL, no Supabase changes.
- Do not touch `src/components/PdfViewer.tsx`, `src/components/MobilePdfReader.tsx`, `BookCover.tsx`, the session pages, or `public/pdf.worker.min.mjs`.
- Do not add `next/image`, `images.remotePatterns`, or `sharp`.
- Do not restyle or resize the header, nav links, hero, or typography; only the brand image box changes.
- Keep the working tree uncommitted unless the user asks for a commit.
- Note: a dev server is currently running on port 3000 (PID 17835). Adding `src/app/favicon.ico` / `src/app/icon.png` may require restarting it; kill only the server you start, and leave the user's existing one alone unless you restarted it deliberately (say so if you did).

## Acceptance checklist

1. `curl -s localhost:<port>/ | grep -o '<link rel="icon"[^>]*>'` returns **one** icon tag (or one `icon.png` + one `apple-touch-icon`), and it points at your new asset — the Next.js `/favicon.ico?favicon.<hash>.ico` "N" tag is gone.
2. `curl -sI localhost:<port>/favicon.ico` (if you kept an ICO) returns `image/x-icon` and the bytes are a real ICO (`file` says "MS Windows icon resource" or similar), not PNG data; `/icon.png` returns `200 image/png` and `file` reports a 512x512 PNG.
3. Opening `/favicon.ico` as an image shows the BookClub emblem, and it reads legibly at 16x16 (the ring and the two-reader mark are still distinguishable; the tiny tagline is not expected to survive).
4. The navbar brand renders the emblem image: in the DOM, `document.querySelector('header a[href="/"] img')` exists with `naturalWidth === 40 * devicePixelRatio`-scale source (i.e. `naturalWidth >= 40`) and `complete === true`; the Lucide `BookOpen` SVG is no longer there; the header height is still `h-16` and the text block is unchanged.
5. The OG tags contain an **absolute** URL on the configured base and dimensions that match the actual file (`curl` the URL and check the response is an image of that size).
6. `npm run build` passes.
7. No 404s in the console/network for the new assets on `/` at 320 px and 1440 px width.

## Verification you must actually perform

- Run `npm run build`, then `npx next start -p <free port>` and `curl` the rendered `<head>` and each asset URL, checking status, `content-type`, and real pixel dimensions (use `file`/`sips`/ImageMagick on the downloaded bytes).
- Start from a **fresh browser profile or incognito** when judging the tab icon; Chrome caches favicons aggressively and a normal reload will keep showing the old "N" even after the fix. Do not report "still broken" without an incognito check or a cache-busting profile.
- Confirm the navbar `<img>` actually loads (naturalWidth > 0) in the production build, not just that the markup exists.
- If you cannot do a visual tab check, say so and rely on the emitted-link + served-file evidence; do not claim you saw the tab icon if you did not.
- Kill any server you start.

## Report back

State: files added/removed/changed; whether you kept a real `favicon.ico` or removed it in favour of `icon.png`; the exact crop coordinates/sizes used; whether the OG image was generated or re-declared at true size; the env var the user must set for `metadataBase`; the `<head>` output you verified (paste the icon and og:image tags); the byte/mime/pixel checks; and anything you could not verify.
