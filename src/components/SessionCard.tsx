"use client";

import Link from "next/link";
import { BookOpen, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { ReadingSession, Profile } from "@/types/database";

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
    <Link
      href={`/sessions/${session.id}`}
      className="group flex flex-col bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 p-5 hover:shadow-lg hover:shadow-amber-900/5 hover:border-amber-400/50 dark:hover:border-amber-600/50 transition-all duration-300 relative overflow-hidden"
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-600 to-rose-400 opacity-80" />

      <div className="flex items-start gap-4">
        {/* Book Spine / Cover Mockup */}
        <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 dark:from-stone-800 dark:to-stone-700 flex flex-col items-center justify-center p-2 text-center shadow-inner border border-amber-300/40 dark:border-stone-600 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
          <BookOpen className="w-6 h-6 text-amber-700 dark:text-amber-400 mb-1" />
          <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-tighter truncate max-w-full">
            {session.total_chapters} Chs
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                session.status === "active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {session.status}
            </span>
            {session.userProgress?.is_completed && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <CheckCircle2 className="w-3 h-3 text-amber-600" />
                Finished
              </span>
            )}
          </div>

          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
            {session.title}
          </h3>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 truncate mb-2">
            by {session.author}
          </p>

          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
            {session.description || "No session description provided."}
          </p>
        </div>
      </div>

      {/* Progress or Members Bar */}
      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex flex-col gap-2">
        {session.userProgress ? (
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
              <span>Your progress</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {session.userProgress.current_chapter}/{session.total_chapters} ch ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {session.memberCount || 1} {session.memberCount === 1 ? "reader" : "readers"}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium group-hover:underline flex items-center gap-1">
              Join discussion <Sparkles className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
