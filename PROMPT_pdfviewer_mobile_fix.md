# Hand-off prompt: fix PDF preview scrolling on mobile only

Paste everything below this line into the code agent.

---

# Task: fix PDF preview scrolling on mobile (desktop must not change)

## Project

- App: Book Club (`book-club`), Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres/RLS/Auth/Storage).
- Read `AGENTS.md` first. This Next.js version differs from older docs — check `node_modules/next/dist/docs/` before writing Next-specific code.
- Verification tool: `npm run build` (no test framework in this repo).
- Do not commit or push.

## Current implementation

`src/components/PdfViewer.tsx` (client component, props `{ pdfUrl: string; bookTitle: string }`) renders a `Card` with:

- Header: book title, Download link, "Open in new tab" link, Fullscreen toggle (`fixed inset-4 z-50` when active).
- Body: `<div className="flex-1 w-full ... relative">` containing
  `<iframe src={`${pdfUrl}#toolbar=1&navpanes=0`} className="w-full h-full border-0" />`.
- Card height: `h-[600px]` below `lg`, `lg:h-[calc(100vh-280px)] lg:min-h-[500px] lg:max-h-[800px]` above.
- Used from `src/app/sessions/[id]/page.tsx` inside a `grid lg:grid-cols-12` layout (reader left/right column per breakpoint).

## Bug

On mobile the PDF preview cannot be scrolled — you only ever see the top of the document and cannot reach later pages.

**Scope of the problem: mobile only.**

- Desktop Chrome/Firefox/Safari: the reader scrolls correctly (verified by dispatching real wheel events at 1440×900: the PDF content moved, page `scrollY` stayed 0). Do not change desktop behavior.
- The responsive layout (card sizing, stacking, sidebar) and the outer page scroll work correctly. Do not redesign them.

So: **fix the mobile preview, leave desktop, layout, and scroll behavior exactly as they are.** Do not add features.

## Root cause (already diagnosed — confirm, don't re-litigate)

The viewer delegates the PDF to the browser's built-in PDF plugin through an `<iframe>`. That plugin gives the app no control over the PDF viewport, and mobile browsers do not provide a scrollable inline PDF viewport:

- iOS Safari shows a single static page inside the iframe frame; touch gestures do not scroll it.
- Android Chrome commonly replaces inline rendering with a download/redirect behavior.

Layout is not the cause: the iframe already fills its card, nothing overlays it, and the PDF response is embeddable (`content-type: application/pdf`, `accept-ranges: bytes`, `access-control-allow-origin: *`, no `content-disposition`).

## Required approach

Render the pages inside the app on mobile so scrolling no longer depends on the native viewer, while the desktop code path stays as it is today.

1. Keep the public API: `{ pdfUrl, bookTitle }`, same header actions, same fullscreen behavior, same card sizing classes.
2. Render the iframe exactly as now at the `lg` breakpoint and above. Mobile (`< lg`) must not depend on the iframe or the native PDF plugin.
3. For mobile, render the PDF with `pdfjs-dist` (add it as a dependency):
   - Import it dynamically **inside `useEffect`** — never at module scope, or SSR/build will fail on `DOMMatrix`/`document`.
   - Copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `public/` and set `GlobalWorkerOptions.workerSrc` to that path, so the worker loads in both `next dev` and `next start`. Verify the file returns 200 in production.
   - Put the pages in a real scroll container: `flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain`. Touch scrolling must work; a touch that starts on a page canvas must still scroll the container.
   - Fit pages to the container width (measure with `ResizeObserver`; subtract container padding; cap CSS width). Scale the backing canvas by `devicePixelRatio`, **clamped to 2** on mobile to bound memory.
   - Reserve each page's height from page 1's aspect ratio so scroll height is stable before pages load.
   - Render lazily: mount a canvas and call `page.render({ canvas, viewport })` only when the page is near the viewport (IntersectionObserver, a few hundred px rootMargin). A 100+ page book must never create 100+ canvases.
   - Cancel in-flight `RenderTask`s on unmount/width change and ignore `RenderingCancelledException`.
   - Re-render on width change (orientation change, fullscreen toggle) — a canvas sized for portrait must not be stretched to landscape.
   - Bound memory on long books: once a page is far outside the viewport, drop its canvas/bitmap (keep the reserved box). iOS Safari kills tabs that hold too many large canvases.
4. Loading and failure states: show load progress (percent from `task.onProgress`), and on failure show an inline message plus an "Open PDF" link to `pdfUrl` — never a blank frame.
5. Keep it dependency-light: only `pdfjs-dist`. No rewritten header, no new buttons, no new controls.

## Hard constraints

- **Do not change desktop behavior or appearance** (≥ `lg`). Screenshot/compare the desktop card before and after; the iframe path should be functionally identical.
- **No new features**: no zoom UI, no search, no thumbnails/sidebar, no page jump, no reading-position persistence, no annotations, no new Supabase columns/storage changes, no new API routes.
- Do not change `src/app/sessions/[id]/page.tsx` layout, the Supabase schema, or unrelated components.
- Do not "fix" this by hiding the reader, redirecting to a new tab, or forcing a download as the only mobile experience.

## Acceptance criteria

- [ ] On a 390×844 mobile viewport, touch scrolling moves through the whole PDF; the last page is reachable.
- [ ] The outer page does not scroll while a touch/drag is scrolling the reader (and vice versa: scrolling past the reader's end still scrolls the page).
- [ ] Rotating the device re-fits pages without stretching or blurring them.
- [ ] Fullscreen works on mobile and the reader still fills the screen.
- [ ] Desktop (≥ 1024px) renders and scrolls as before, with the same markup/behavior for that breakpoint.
- [ ] No page-per-canvas explosion on a long PDF; memory stays bounded when scrolling deep into a book.
- [ ] A failed load shows the fallback with a working "Open PDF" link.
- [ ] No console errors; worker request returns 200 in production.
- [ ] `npm run build` passes.

## Verification

```bash
npm install pdfjs-dist
npm run build
npx next start -p 3002      # check the worker path against the production build
```

Then open a real session that has a PDF (the session page is `/sessions/<id>`; any session card with "PDF Attached"):

1. Desktop 1440×900: wheel over the reader moves pages; `window.scrollY` stays 0. Compare against your starting state.
2. Mobile emulation 390×844: drag inside the reader — content moves; `window.scrollY` unchanged. Repeat for fullscreen.
3. Rotate to 844×390 and back; check sharpness and fit.
4. Scroll to the last pages of a long PDF; check DevTools memory / canvas count stays small.
5. Simulate a bad URL (or block the PDF request) and confirm the fallback link appears.

Emulation is not proof for this bug: if a real iPhone (Safari) or Android device is available, test there. State plainly in your report what was tested on real hardware vs. emulation.

## Report back

- Root cause confirmed (or corrected, with evidence).
- Files changed and the mobile/desktop split you chose.
- Before/after behavior at 390×844 and 1440×900, with the measurements you used (scrollTop, canvas count, console errors).
- Anything you could not verify (especially real-device results) and any follow-up risk.
