"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { FileText, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobilePdfReaderProps {
  pdfUrl: string;
  bookTitle: string;
}

/** Fallback page ratio (A4 portrait) until page 1 has been measured. */
const FALLBACK_ASPECT = 1.414;
const MAX_PAGE_WIDTH = 1000;

interface MobilePdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  aspect: number;
  rootRef: RefObject<HTMLDivElement | null>;
}

/**
 * One page of the mobile reader. Only pages near the viewport get a canvas;
 * pages far away release their bitmap (kept as an empty reserved box) so long
 * books stay within mobile canvas-memory limits.
 */
const MobilePdfPage = memo(function MobilePdfPage({
  doc,
  pageNumber,
  width,
  aspect,
  rootRef,
}: MobilePdfPageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [renderedWidth, setRenderedWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setNear(entry.isIntersecting);
      },
      { root: rootRef.current, rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootRef]);

  useEffect(() => {
    if (!near) {
      setRenderedWidth(0);
      return;
    }
    if (!width || failed || renderedWidth === width) return;

    let cancelled = false;
    let renderTask: RenderTask | undefined;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const base = page.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width * dpr) / base.width });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (!cancelled) setRenderedWidth(width);
      } catch (err) {
        if (!cancelled && (err as { name?: string }).name !== "RenderingCancelledException") {
          console.error(`Failed to render PDF page ${pageNumber}:`, err);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [near, width, renderedWidth, failed, doc, pageNumber]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full bg-white shadow-sm ring-1 ring-line overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${Math.round(width * aspect)}px`,
        maxWidth: "100%",
      }}
    >
      {near && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-label={`Page ${pageNumber}`}
        />
      )}
      {renderedWidth !== width && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-ink/80">
          {failed ? `Page ${pageNumber} unavailable` : `Page ${pageNumber}`}
        </div>
      )}
    </div>
  );
});

/**
 * Inline PDF reader for small screens. Renders pages itself instead of using an
 * iframe, because mobile browsers do not expose a scrollable PDF viewport to
 * embedded documents. Desktop keeps the native viewer (see PdfViewer).
 */
export function MobilePdfReader({ pdfUrl, bookTitle }: MobilePdfReaderProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [aspect, setAspect] = useState(FALLBACK_ASPECT);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const pageOffsetsRef = useRef<number[]>([]);
  const currentPageRef = useRef(1);
  const scrollFrameRef = useRef(0);

  /* Load the document on the client only — pdf.js needs DOM APIs. */
  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | undefined;

    setDoc(null);
    setNumPages(0);
    setProgress(0);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const task = pdfjs.getDocument({ url: pdfUrl });
        loadingTask = task;
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (!cancelled && total) setProgress(Math.round((loaded / total) * 100));
        };

        const document = await task.promise;
        if (cancelled) return;

        const firstPage = await document.getPage(1);
        if (cancelled) return;
        const viewport = firstPage.getViewport({ scale: 1 });

        setAspect(viewport.height / viewport.width);
        setNumPages(document.numPages);
        setDoc(document);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load PDF for mobile reader:", err);
          setError(err instanceof Error ? err.message : "Could not load this PDF.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [pdfUrl]);

  /* Fit pages to the available width and re-fit on rotate/fullscreen. */
  const measure = useCallback(() => {
    const node = pagesRef.current ?? scrollRef.current;
    if (!node) return;
    const style = window.getComputedStyle(node);
    const available =
      node.clientWidth -
      (parseFloat(style.paddingLeft) || 0) -
      (parseFloat(style.paddingRight) || 0);
    if (available > 0) setWidth(Math.min(available, MAX_PAGE_WIDTH));
  }, []);

  /** Cache each page's offset inside the scroller so page tracking is O(distance), not O(DOM). */
  const measurePageOffsets = useCallback(() => {
    const scroller = scrollRef.current;
    const pages = pagesRef.current;
    if (!scroller || !pages) return;
    const scrollerTop = scroller.getBoundingClientRect().top;
    pageOffsetsRef.current = Array.from(pages.children).map((child) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      return rect.top - scrollerTop + scroller.scrollTop;
    });
  }, []);

  useEffect(() => {
    measure();
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure, doc]);

  /* Page boxes only change with the fitted width or the document itself. */
  useEffect(() => {
    measurePageOffsets();
  }, [width, numPages, aspect, measurePageOffsets]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const setPage = useCallback((page: number) => {
    currentPageRef.current = page;
    setCurrentPage(page);
    if (document.activeElement !== pageInputRef.current) {
      setPageInput(String(page));
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = 0;
      const scroller = scrollRef.current;
      const offsets = pageOffsetsRef.current;
      if (!scroller || offsets.length === 0) return;

      const y = scroller.scrollTop + 12;
      let index = 0;
      while (index + 1 < offsets.length && offsets[index + 1] <= y) index += 1;

      const page = index + 1;
      if (page !== currentPageRef.current) setPage(page);
    });
  }, [setPage]);

  const goToPage = useCallback(
    (target: number, behavior: ScrollBehavior = "smooth") => {
      if (!numPages) return;
      const page = Math.min(Math.max(target, 1), numPages);
      const scroller = scrollRef.current;
      const offset = pageOffsetsRef.current[page - 1];
      if (scroller && typeof offset === "number") {
        scroller.scrollTo({ top: Math.max(0, offset - 4), behavior });
      }
      setPage(page);
    },
    [numPages, setPage]
  );

  const handlePageSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) {
      const target = Math.min(Math.max(parsed, 1), numPages);
      // A hand-typed jump can span hundreds of pages — land immediately instead
      // of animating through the whole document.
      goToPage(target, "auto");
      // Reflect the clamped page even if the field keeps focus.
      setPageInput(String(target));
    } else {
      setPageInput(String(currentPageRef.current));
    }
    pageInputRef.current?.blur();
  };

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-sand/40">
        <FileText className="w-8 h-8 text-muted-ink" />
        <p className="text-xs text-muted-ink max-w-xs leading-relaxed">
          This PDF could not be displayed in the reader.
        </p>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Open PDF
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-sand/40">
      {/* Mobile page navigation — mirrors the page controls of the desktop
          native PDF viewer, which mobile browsers do not render inline. */}
      {doc && numPages > 0 && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-canvas/85 backdrop-blur border-b border-line flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="h-8 w-8 p-0 rounded-lg text-ink disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <form
            onSubmit={handlePageSubmit}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-ink"
          >
            <label htmlFor="mobile-page-number" className="sr-only">
              Page number
            </label>
            <input
              id="mobile-page-number"
              ref={pageInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={(e) => e.target.select()}
              onBlur={() => setPageInput(String(currentPageRef.current))}
              aria-label={`Page number, ${numPages} pages`}
              className="w-11 h-7 px-1 text-center text-xs font-bold text-ink bg-card border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            <span aria-live="polite">of {numPages}</span>
          </form>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            aria-label="Next page"
            className="h-8 w-8 p-0 rounded-lg text-ink disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        aria-label={`PDF for ${bookTitle}`}
      >
        {!doc ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-ink">
            <Loader2 className="w-6 h-6 animate-spin text-gold-ink" />
            <span className="text-[11px] font-medium">
              {progress > 0 ? `Loading PDF… ${progress}%` : "Loading PDF…"}
            </span>
          </div>
        ) : (
          <div ref={pagesRef} className="flex flex-col items-center gap-3 p-3">
            {width > 0 &&
              Array.from({ length: numPages }, (_, index) => (
                <MobilePdfPage
                  key={index}
                  doc={doc}
                  pageNumber={index + 1}
                  width={width}
                  aspect={aspect}
                  rootRef={scrollRef}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
