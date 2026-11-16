"use client";

import Link from "next/link";
import { BookOpen, Users, Sparkles, CheckCircle2 } from "lucide-react";
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
      <Card className="h-full flex flex-col p-5 hover:shadow-xl hover:shadow-amber-900/5 hover:-translate-y-1 hover:border-amber-400/60 dark:hover:border-amber-600/60 transition-all duration-300 relative overflow-hidden bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm">
        {/* Decorative subtle gradient top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-400 via-amber-600 to-rose-400 opacity-80" />

        <div className="flex items-start gap-4">
          {/* Book Spine / Cover Mockup */}
          <div className="w-16 h-24 rounded-xl bg-linear-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 flex flex-col items-center justify-center p-2 text-center shadow-inner border border-amber-300/40 dark:border-stone-700 flex-shrink-0 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
            <BookOpen className="w-6 h-6 text-amber-800 dark:text-amber-400 mb-1" />
            <span className="text-[10px] font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-tighter truncate max-w-full">
              {session.total_chapters} Chs
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <Badge
                variant={session.status === "active" ? "success" : "secondary"}
                className="text-[10px] uppercase font-bold tracking-wider"
              >
                {session.status}
              </Badge>
              {session.userProgress?.is_completed && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Finished
                </Badge>
              )}
            </div>

            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
              {session.title}
            </h3>
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 truncate mb-2">
              by {session.author}
            </p>

            <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
              {session.description || "No session description provided."}
            </p>
          </div>
        </div>

        {/* Progress or Members Bar */}
        <div className="mt-auto pt-4 flex flex-col gap-2">
          {session.userProgress ? (
            <div className="space-y-1.5 bg-amber-50/50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-amber-100 dark:border-stone-800">
              <div className="flex justify-between items-center text-[11px] font-semibold text-stone-600 dark:text-stone-400">
                <span>Your reading progress</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  Ch. {session.userProgress.current_chapter}/{session.total_chapters} ({progressPercent}%)
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">
                  {session.memberCount || 1} {session.memberCount === 1 ? "reader" : "readers"}
                </span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold group-hover:underline flex items-center gap-1">
                Join circle <Sparkles className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
