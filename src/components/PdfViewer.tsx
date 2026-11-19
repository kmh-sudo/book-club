"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { MobilePdfReader } from "@/components/MobilePdfReader";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  BookOpen,
} from "lucide-react";

interface PdfViewerProps {
  pdfUrl: string;
  bookTitle: string;
}

const DESKTOP_QUERY = "(min-width: 1024px)";

export function PdfViewer({ pdfUrl, bookTitle }: PdfViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Default to the desktop viewer so server-rendered markup and large screens
  // are unchanged; small screens switch to the in-app reader after hydration.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <Card
      className={`overflow-hidden rounded-card border-line shadow-md bg-card transition-all duration-300 flex flex-col ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-[600px] lg:h-[calc(100vh-280px)] lg:min-h-[500px] lg:max-h-[800px]"
      }`}
    >
      {/* PDF Header Controls */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-canvas/60 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sand text-gold-ink flex-shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-sm font-semibold text-ink truncate">
              {bookTitle} — Reader
            </h3>
            <span className="text-[11px] text-muted-ink/80 block truncate">
              Interactive PDF Document
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </a>

          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Open in new tab">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 px-2 text-xs"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reader"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Desktop: native viewer. Mobile: pages rendered in-app, because mobile
          browsers do not provide a scrollable PDF viewport inside an iframe. */}
      <div className="flex-1 min-h-0 w-full bg-sand/40 relative">
        {isDesktop ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={`PDF for ${bookTitle}`}
          />
        ) : (
          <MobilePdfReader pdfUrl={pdfUrl} bookTitle={bookTitle} />
        )}
      </div>
    </Card>
  );
}
