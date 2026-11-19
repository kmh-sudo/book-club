"use client";

import { useState, type ReactNode } from "react";

interface BookCoverProps {
  url: string | null;
  alt: string;
  /** Classes for the cover box. Its dimensions must stay fixed. */
  className?: string;
  /** Placeholder shown when there is no cover or the image fails to load. */
  children: ReactNode;
}

export function BookCover({ url, alt, className = "", children }: BookCoverProps) {
  // Track which URL failed so a newly uploaded cover gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showImage = Boolean(url) && failedUrl !== url;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!showImage && children}
      {showImage && (
        <img
          src={url as string}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(url)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
