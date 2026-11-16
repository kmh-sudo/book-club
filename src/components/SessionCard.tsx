"use client";

import Link from "next/link";
import { BookOpen, Users, Sparkles, CheckCircle2, FileText } from "lucide-react";
import { ReadingSession, Profile } from "@/types/database";
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
      <Card className="h-full flex flex-col p-5 hover:shadow-xl hover:shadow-amber-900/8 hover:-translate-y-1 hover:border-amber-300/60 dark:hover:border-amber-600/50 transition-all duration-300 relative overflow-hidden bg-white dark:bg-stone-900">
        {/* Top accent stripe */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-400 via-amber-500 to-rose-400 opacity-80" />

        {/* PDF badge (top right) */}
        {session.pdf_url && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200/60 dark:border-amber-800/50">
              <FileText className="w-2.5 h-2.5" />
              PDF
            </span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Book Cover Mockup */}
          <div className="w-14 h-20 rounded-xl bg-linear-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-stone-800 dark:via-stone-700 dark:to-stone-700 flex flex-col items-center justify-center p-2 text-center shadow-sm border border-amber-200/40 dark:border-stone-700 flex-shrink-0 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
            <BookOpen className="w-5 h-5 text-amber-800 dark:text-amber-400 mb-1" />
            <span className="text-[9px] font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-tight">
              {session.total_chapters} Ch
            </span>
          </div>

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
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  Finished
                </Badge>
              )}
            </div>

            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
              {session.title}
            </h3>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 truncate mt-0.5">
              by {session.author}
            </p>

            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed mt-2">
              {session.description || "No session description provided."}
            </p>
          </div>
        </div>

        {/* Footer: Progress or Members */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          {session.userProgress ? (
            <div className="space-y-1.5 bg-amber-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-amber-100/80 dark:border-stone-700/60">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-stone-500">Your progress</span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  Ch. {session.userProgress.current_chapter}/{session.total_chapters} · {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium">
                  {session.memberCount || 0}{" "}
                  {(session.memberCount || 0) === 1 ? "reader" : "readers"}
                </span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                Join circle <Sparkles className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
