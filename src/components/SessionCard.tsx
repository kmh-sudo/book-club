"use client";

import Link from "next/link";
import { BookOpen, Users, Sparkles, CheckCircle2, FileText } from "lucide-react";
import { ReadingSession, Profile } from "@/types/database";
import { BookCover } from "@/components/BookCover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SessionCardProps {
  session: ReadingSession & {
    creator?: Profile;
    memberCount?: number;
    userProgress?: { current_chapter: number; is_completed: boolean } | null;
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const progressPercent = session.userProgress
    ? Math.min(
        100,
        Math.round(
          (session.userProgress.current_chapter / session.total_chapters) * 100
        )
      )
    : 0;

  return (
    <Link href={`/sessions/${session.id}`} className="block group">
      <Card className="h-full flex flex-col p-5 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_2px_4px_rgba(38,59,63,0.04),0_24px_48px_-28px_rgba(38,59,63,0.4)] transition-all duration-300 relative overflow-hidden">
        {/* PDF badge */}
        {session.pdf_url && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sand text-sand-ink text-[10px] font-bold tracking-wide border border-gold/30">
              <FileText className="w-2.5 h-2.5" />
              PDF
            </span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Book cover */}
          <BookCover
            url={session.cover_image_url}
            alt={`${session.title} cover`}
            className="w-14 h-20 rounded-lg bg-linear-to-br from-cream-deep via-sand to-[#dcc5a4] flex flex-col items-center justify-center p-2 text-center shadow-sm ring-1 ring-line flex-shrink-0 group-hover:-rotate-1 transition-all duration-300"
          >
            <BookOpen className="w-5 h-5 text-teal mb-1" />
            <span className="text-[9px] font-bold text-teal uppercase tracking-tight">
              {session.total_chapters} Ch
            </span>
          </BookCover>

          {/* Info */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge
                variant={session.status === "active" ? "success" : "secondary"}
                className="text-[10px] uppercase font-bold tracking-wider"
              >
                {session.status}
              </Badge>
              {session.userProgress?.is_completed && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <CheckCircle2 className="w-2.5 h-2.5 text-sage" />
                  Finished
                </Badge>
              )}
            </div>

            <h3 className="font-serif text-[17px] font-semibold leading-snug text-ink group-hover:text-gold-ink transition-colors line-clamp-1">
              {session.title}
            </h3>
            <p className="text-xs font-medium text-muted-ink truncate mt-0.5">
              by {session.author}
            </p>

            <p className="text-xs text-muted-ink/90 line-clamp-2 leading-relaxed mt-2">
              {session.description || "No session description provided."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4">
          {session.userProgress ? (
            <div className="space-y-1.5 bg-sand/40 p-2.5 rounded-xl border border-line/70">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-muted-ink">
                  Your progress
                </span>
                <span className="text-[11px] font-bold text-ink">
                  Ch. {session.userProgress.current_chapter}/{session.total_chapters} · {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t border-line/70">
              <div className="flex items-center gap-1.5 text-xs text-muted-ink">
                <Users className="w-3.5 h-3.5 text-gold-ink" />
                <span className="font-medium">
                  {session.memberCount || 0}{" "}
                  {(session.memberCount || 0) === 1 ? "reader" : "readers"}
                </span>
              </div>
              <span className="text-[11px] text-gold-ink font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Join circle <Sparkles className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
