"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, ChevronRight, Trophy } from "lucide-react";

interface ProgressUpdaterProps {
  sessionId: string;
  userId: string;
  totalChapters: number;
  initialChapter: number;
  isCompleted: boolean;
  onUpdate: (newChapter: number, completed: boolean) => void;
}

export function ProgressUpdater({
  sessionId,
  userId,
  totalChapters,
  initialChapter,
  isCompleted,
  onUpdate,
}: ProgressUpdaterProps) {
  const supabase = createClient();
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (targetChapter: number) => {
    const validChapter = Math.max(0, Math.min(totalChapters, targetChapter));
    const completed = validChapter >= totalChapters;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("session_members")
        .update({
          current_chapter: validChapter,
          is_completed: completed,
          updated_at: new Date().toISOString(),
        })
        .match({ session_id: sessionId, user_id: userId });

      if (error) throw error;

      setCurrentChapter(validChapter);
      onUpdate(validChapter, completed);

      if (completed && !isCompleted) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error("Failed to update reading progress:", err);
    } finally {
      setSaving(false);
    }
  };

  const percentage = Math.round((currentChapter / totalChapters) * 100);

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-200/80 dark:border-stone-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            Your Reading Progress
          </span>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            Chapter {currentChapter} of {totalChapters} ({percentage}%)
          </p>
        </div>
        {currentChapter >= totalChapters ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-bold shadow-sm animate-bounce">
            <Trophy className="w-3.5 h-3.5" />
            Completed!
          </div>
        ) : (
          <span className="text-xs text-stone-500">
            {totalChapters - currentChapter} chapters left
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-amber-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Quick Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => handleUpdate(currentChapter - 1)}
          disabled={saving || currentChapter <= 0}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 disabled:opacity-40 transition-colors"
        >
          -1 Ch
        </button>

        <button
          onClick={() => handleUpdate(currentChapter + 1)}
          disabled={saving || currentChapter >= totalChapters}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 shadow-sm transition-colors flex items-center gap-1"
        >
          <span>+1 Chapter</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {currentChapter < totalChapters && (
          <button
            onClick={() => handleUpdate(totalChapters)}
            disabled={saving}
            className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Finished Book</span>
          </button>
        )}
      </div>
    </div>
  );
}
