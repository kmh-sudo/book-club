"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Trophy, Minus, Plus } from "lucide-react";

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
          particleCount: 150,
          spread: 80,
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
    <Card className="p-5 sm:p-6 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border-amber-200/80 dark:border-stone-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            Your Reading Progress
          </span>
          <p className="text-base font-bold text-stone-900 dark:text-stone-100">
            Chapter {currentChapter} of {totalChapters} ({percentage}%)
          </p>
        </div>
        {currentChapter >= totalChapters ? (
          <Badge variant="default" className="gap-1.5 px-3 py-1 font-bold text-xs bg-amber-600 animate-bounce">
            <Trophy className="w-3.5 h-3.5" />
            Book Completed!
          </Badge>
        ) : (
          <span className="text-xs font-semibold text-stone-500">
            {totalChapters - currentChapter} chapters remaining
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <Progress value={percentage} className="h-2.5" />

      {/* Quick Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUpdate(currentChapter - 1)}
          disabled={saving || currentChapter <= 0}
          className="rounded-xl gap-1"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>-1 Ch</span>
        </Button>

        <Button
          size="sm"
          onClick={() => handleUpdate(currentChapter + 1)}
          disabled={saving || currentChapter >= totalChapters}
          className="rounded-xl gap-1 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+1 Chapter</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </Button>

        {currentChapter < totalChapters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdate(totalChapters)}
            disabled={saving}
            className="ml-auto rounded-xl gap-1 text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Finished</span>
          </Button>
        )}
      </div>
    </Card>
  );
}
