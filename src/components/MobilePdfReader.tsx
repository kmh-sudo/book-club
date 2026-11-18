"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
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
function MobilePdfPage({ doc, pageNumber, width, aspect, rootRef }: MobilePdfPageProps) {
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
      className="relative w-full bg-white dark:bg-stone-800 shadow-sm ring-1 ring-stone-900/5 overflow-hidden"
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
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-stone-400">
          {failed ? `Page ${pageNumber} unavailable` : `Page ${pageNumber}`}
        </div>
      )}
    </div>
  );
}

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    measure();
    const node = scrollRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure, doc]);

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-stone-200/70 dark:bg-stone-950">
        <FileText className="w-8 h-8 text-stone-400" />
        <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
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
    <div
      ref={scrollRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-stone-200/70 dark:bg-stone-950"
      aria-label={`PDF for ${bookTitle}`}
    >
      {!doc ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-500">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
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
  );
}
