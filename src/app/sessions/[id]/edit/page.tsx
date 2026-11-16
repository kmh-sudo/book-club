"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  AlertCircle,
  ArrowLeft,
  Save,
  FileText,
  Lock,
} from "lucide-react";

const STATUS_OPTIONS: ReadingSession["status"][] = [
  "active",
  "completed",
  "archived",
];

export default function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalChapters, setTotalChapters] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [status, setStatus] = useState<ReadingSession["status"]>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      const { data, error: loadError } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (loadError) {
        console.error("Failed to load session:", loadError);
        setError("Could not load this reading session.");
      } else if (data) {
        setSession(data);
        setTitle(data.title);
        setAuthor(data.author);
        setTotalChapters(data.total_chapters);
        setDescription(data.description || "");
        setTargetEndDate(data.target_end_date || "");
        setStatus(data.status);
      }
      setLoading(false);
    }

    loadSession();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) return;
    if (user.id !== session.creator_id) {
      setError("Only the host of this session can edit it.");
      return;
    }
    if (!title.trim() || !author.trim()) {
      setError("Book title and author are required.");
      return;
    }
    if (!Number.isFinite(totalChapters) || totalChapters <= 0) {
      setError("Total chapters must be greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // pdf_url is intentionally omitted: the book PDF is immutable after creation.
      const { error: updateError } = await supabase
        .from("reading_sessions")
        .update({
          title: title.trim(),
          author: author.trim(),
          total_chapters: totalChapters,
          description: description.trim() || null,
          target_end_date: targetEndDate || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .eq("creator_id", user.id);

      if (updateError) throw updateError;

      router.push(`/sessions/${session.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center text-sm text-stone-500 font-medium">
        Loading session…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <Card className="p-10 rounded-3xl text-center space-y-4">
          <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Session Not Found</h2>
          <p className="text-sm text-stone-500">
            {error || "This reading session may have been removed."}
          </p>
          <Link href="/">
            <Button size="sm">Back to Explore</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!user || user.id !== session.creator_id) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <Card className="p-10 rounded-3xl text-center space-y-4">
          <Lock className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Host Only</h2>
          <p className="text-sm text-stone-500">
            Only the host who created this session can edit its details.
          </p>
          <Link href={`/sessions/${session.id}`}>
            <Button size="sm">Back to Session</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/sessions/${session.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to session
      </Link>

      <Card className="rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-amber-900/5">
        <div className="flex items-center gap-3.5 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Edit Reading Session
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Update the book details, chapter target, and session status
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
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
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Author *
              </label>
              <Input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Total Chapters *
              </label>
              <Input
                type="number"
                min={1}
                max={500}
                required
                value={totalChapters}
                onChange={(e) => setTotalChapters(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Target Finish Date
              </label>
              <Input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Session Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ReadingSession["status"])
              }
              className="flex h-10 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-900 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:border-amber-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* PDF is read-only after creation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Book PDF File
            </label>
            <div className="flex items-center gap-2.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
              {session.pdf_url ? (
                <>
                  <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    PDF attached
                  </span>
                  <span className="flex items-center gap-1 ml-auto whitespace-nowrap">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span>No PDF attached to this session.</span>
                  <span className="flex items-center gap-1 ml-auto whitespace-nowrap">
                    <Lock className="w-3 h-3" />
                    Read-only
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              The book PDF can’t be replaced or removed after the session is
              created.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Reading Goals & Overview
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share what this book is about, reading pace, or discussion expectations…"
              className="resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="flex-1 gap-2 shadow-md shadow-amber-600/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving Changes…" : "Save Changes"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => router.push(`/sessions/${session.id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
