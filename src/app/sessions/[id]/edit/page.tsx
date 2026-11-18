"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, ArrowLeft, Save } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalChapters, setTotalChapters] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      const { data, error: loadError } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (loadError || !data) {
        console.error("Failed to load session:", loadError);
        setLoading(false);
        return;
      }

      setSession(data);
      setTitle(data.title);
      setAuthor(data.author);
      setTotalChapters(data.total_chapters);
      setDescription(data.description || "");
      setTargetEndDate(data.target_end_date || "");
      setLoading(false);
    };

    loadSession();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session || user.id !== session.creator_id) return;

    if (totalChapters <= 0) {
      setError("Total chapters must be greater than 0.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("reading_sessions")
        .update({
          title: title.trim(),
          author: author.trim(),
          total_chapters: totalChapters,
          description: description.trim() || null,
          target_end_date: targetEndDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (updateError) throw updateError;

      router.push(`/sessions/${session.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update the session. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-500 font-medium">Loading session…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 text-center px-4">
        <Card className="p-10 rounded-3xl space-y-4">
          <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-serif text-2xl font-bold">Session Not Found</h2>
          <p className="text-sm text-stone-500">
            This reading session may have been removed or does not exist.
          </p>
          <Link href="/">
            <Button size="sm">Back to Explore</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <Card className="p-8 text-center space-y-4 rounded-3xl">
          <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
          <p className="text-sm text-stone-500">
            You need to be signed in to edit this reading session.
          </p>
          <Link href="/auth/login">
            <Button size="sm">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (user.id !== session.creator_id) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <Card className="p-8 text-center space-y-4 rounded-3xl">
          <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="font-serif text-xl font-bold">Only the host can edit</h2>
          <p className="text-sm text-stone-500">
            This session belongs to another reader. You can still read and discuss it
            with the club.
          </p>
          <Link href={`/sessions/${session.id}`}>
            <Button size="sm">Back to session</Button>
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
              Update the book details and reading targets for your club
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
                placeholder="e.g. The Great Gatsby"
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
                placeholder="e.g. F. Scott Fitzgerald"
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
                Target Finish Date (Optional)
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
              Reading Goals & Overview
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share what this book is about, reading pace (e.g. 2 chapters a week), or discussion expectations..."
              className="resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="w-full sm:flex-1 gap-2 shadow-md shadow-amber-600/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving changes…" : "Save Changes"}</span>
            </Button>
            <Link href={`/sessions/${session.id}`} className="sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={saving}
                className="w-full"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
