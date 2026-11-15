"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, AlertCircle, ArrowLeft, Plus } from "lucide-react";

export default function CreateSessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalChapters, setTotalChapters] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a reading session.");
      return;
    }

    if (totalChapters <= 0) {
      setError("Total chapters must be greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create reading session
      const { data: sessionData, error: sessionError } = await supabase
        .from("reading_sessions")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          author: author.trim(),
          total_chapters: totalChapters,
          description: description.trim() || null,
          target_end_date: targetEndDate || null,
          status: "active",
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // 2. Add creator to session_members with 0 chapters
      await supabase.from("session_members").insert({
        session_id: sessionData.id,
        user_id: user.id,
        current_chapter: 0,
        is_completed: false,
      });

      router.push(`/sessions/${sessionData.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create session. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-sm text-stone-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl text-center space-y-4">
        <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
        <p className="text-sm text-stone-500">
          You need to be signed in to create and host a reading session.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sessions
      </Link>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xl shadow-amber-900/5 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Start a Reading Session
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Set up a book circle for fellow readers to join your journey
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Project Hail Mary"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Author *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Andy Weir"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Total Chapters *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={totalChapters}
                onChange={(e) => setTotalChapters(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Target Finish Date (Optional)
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Reading Goals & Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share what this book is about, reading pace (e.g. 2 chapters a week), or expectations..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Publishing Session..." : "Create Reading Session"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
