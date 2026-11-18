"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember, Profile } from "@/types/database";
import { ProgressUpdater } from "@/components/ProgressUpdater";
import { DiscussionThread } from "@/components/DiscussionThread";
import { PdfViewer } from "@/components/PdfViewer";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  Calendar,
  ArrowLeft,
  UserPlus,
  LogOut,
  FileText,
  Upload,
  Users,
  Crown,
  Pencil,
  Trash2,
} from "lucide-react";

interface MemberWithProfile extends SessionMember {
  profile?: Profile;
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [session, setSession] = useState<ReadingSession | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [userMembership, setUserMembership] = useState<SessionMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSessionDetails = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      const { data: hostData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.creator_id)
        .single();
      setHost(hostData);

      const { data: membersData } = await supabase
        .from("session_members")
        .select(`*, profile:profiles(*)`)
        .eq("session_id", id)
        .order("current_chapter", { ascending: false });

      const memberList = (membersData as unknown as MemberWithProfile[]) || [];
      setMembers(memberList);

      if (user) {
        const currentMem = memberList.find((m) => m.user_id === user.id) || null;
        setUserMembership(currentMem);
      }
    } catch (err) {
      console.error("Failed to load session details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionDetails();

    const memberChannel = supabase
      .channel(`members-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_members",
          filter: `session_id=eq.${id}`,
        },
        () => {
          loadSessionDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberChannel);
    };
  }, [id, user]);

  const handleJoinSession = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setJoining(true);
    try {
      const { error } = await supabase.from("session_members").insert({
        session_id: id,
        user_id: user.id,
        current_chapter: 0,
        is_completed: false,
      });
      if (error) throw error;
      await loadSessionDetails();
    } catch (err) {
      console.error("Error joining session:", err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!user || !userMembership) return;
    if (confirm("Are you sure you want to leave this reading session?")) {
      try {
        await supabase
          .from("session_members")
          .delete()
          .match({ session_id: id, user_id: user.id });
        await loadSessionDetails();
      } catch (err) {
        console.error("Error leaving session:", err);
      }
    }
  };

  const storagePathFromUrl = (url: string | null, bucket: string) => {
    if (!url) return null;
    const marker = `/object/public/${bucket}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
  };

  const handleDeleteSession = async () => {
    if (!session || !user || user.id !== session.creator_id || deleting) return;

    if (
      !confirm(
        `Delete "${session.title}"? Its discussion thread and member progress will be removed. This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      const { error: deleteError } = await supabase
        .from("reading_sessions")
        .delete()
        .eq("id", session.id);

      if (deleteError) throw deleteError;

      // Best effort: drop this session's uploaded files, ignoring storage failures.
      const files = [
        { bucket: "session_pdfs", path: storagePathFromUrl(session.pdf_url, "session_pdfs") },
        {
          bucket: "book-cover-image",
          path: storagePathFromUrl(session.cover_image_url, "book-cover-image"),
        },
      ].filter((file): file is { bucket: string; path: string } => Boolean(file.path));

      if (files.length > 0) {
        await Promise.allSettled(
          files.map((file) => supabase.storage.from(file.bucket).remove([file.path]))
        );
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Error deleting session:", err);
      setActionError(
        err instanceof Error ? err.message : "Failed to delete the session. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !session || user.id !== session.creator_id) return;

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("PDF must be under 50 MB.");
      return;
    }

    setUploadingPdf(true);
    setUploadError(null);

    try {
      const sanitizedName = session.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 30);
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}.pdf`;

      const { error: uploadErr } = await supabase.storage
        .from("session_pdfs")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("session_pdfs")
        .getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from("reading_sessions")
        .update({ pdf_url: publicUrlData?.publicUrl })
        .eq("id", session.id);

      if (updateErr) throw updateErr;

      await loadSessionDetails();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        if (
          err.message.includes("Bucket not found") ||
          (err as { statusCode?: string }).statusCode === "404"
        ) {
          setUploadError(
            "Storage bucket 'session_pdfs' does not exist yet. Run the SQL in supabase/create_pdf_bucket.sql in the Supabase SQL Editor first."
          );
        } else {
          setUploadError(err.message);
        }
      } else {
        setUploadError("Upload failed. Make sure the session_pdfs bucket is created.");
      }
    } finally {
      setUploadingPdf(false);
    }
  };

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-500 font-medium">Loading reading session…</p>
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

  const isCreator = user && user.id === session.creator_id;

  const memberProgressMap: Record<
    string,
    { current_chapter: number; is_completed: boolean }
  > = {};
  members.forEach((m) => {
    memberProgressMap[m.user_id] = {
      current_chapter: m.current_chapter,
      is_completed: m.is_completed,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5">
      {/* ── Top Nav Bar ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sessions
        </Link>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isCreator && (
            <>
              <Link href={`/sessions/${session.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-600" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteSession}
                disabled={deleting}
                className="gap-1.5 text-xs rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </>
          )}

          {/* Creator PDF Upload if no PDF yet */}
          {isCreator && !session.pdf_url && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={uploadingPdf}
                className="gap-1.5 text-xs rounded-xl"
              >
                <span>
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  {uploadingPdf ? "Uploading…" : "Upload Book PDF"}
                </span>
              </Button>
            </label>
          )}

          {!userMembership ? (
            <Button
              onClick={handleJoinSession}
              disabled={joining}
              size="sm"
              className="gap-1.5 text-xs rounded-xl shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {joining ? "Joining…" : "Join Session"}
            </Button>
          ) : (
            !isCreator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveSession}
                className="text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Leave
              </Button>
            )
          )}
        </div>
      </div>

      {/* Session Action Error */}
      {actionError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl leading-relaxed">
          ⚠️ {actionError}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs rounded-xl leading-relaxed">
          ⚠️ {uploadError}
        </div>
      )}

      {/* ── Session Header Card ── */}
      <Card className="relative overflow-hidden p-5 sm:p-7 rounded-3xl border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm shadow-sm">
        {/* Top accent stripe */}
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-amber-400 via-amber-500 to-rose-400" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pt-1">
          {/* Book cover + info */}
          <div className="flex items-start gap-4">
            <BookCover
              url={session.cover_image_url}
              alt={`${session.title} cover`}
              className="w-16 h-24 sm:w-20 sm:h-28 rounded-2xl bg-linear-to-br from-amber-200 via-amber-300 to-amber-500 dark:from-stone-700 dark:to-stone-600 flex flex-col items-center justify-center p-2.5 text-center shadow-md flex-shrink-0"
            >
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-amber-950 dark:text-amber-200 mb-1" />
              <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-950 dark:text-amber-100 uppercase tracking-tighter leading-tight">
                {session.total_chapters} Chs
              </span>
            </BookCover>

            <div className="min-w-0">
              {/* Status + PDF badge */}
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge
                  variant={session.status === "active" ? "success" : "secondary"}
                  className="uppercase font-bold text-[10px] tracking-wider"
                >
                  {session.status}
                </Badge>
                {session.pdf_url && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
                  >
                    <FileText className="w-3 h-3 text-amber-600" />
                    PDF Attached
                  </Badge>
                )}
                {isCreator && (
                  <Badge
                    variant="secondary"
                    className="gap-1 text-[10px] font-bold text-violet-800 bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300"
                  >
                    <Crown className="w-3 h-3" />
                    Host
                  </Badge>
                )}
              </div>

              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
                {session.title}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400 mt-0.5">
                by {session.author}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-linear-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white font-bold text-[9px]">
                    {host?.username?.charAt(0).toUpperCase() || "H"}
                  </div>
                  <span>
                    Hosted by{" "}
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      {host?.full_name || host?.username || "Host"}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </span>
                </span>
                {session.target_end_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Target: {session.target_end_date}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Updater (for joined members) */}
          {userMembership && user && (
            <div className="w-full md:w-80 flex-shrink-0">
              <ProgressUpdater
                sessionId={session.id}
                userId={user.id}
                totalChapters={session.total_chapters}
                initialChapter={userMembership.current_chapter}
                isCompleted={userMembership.is_completed}
                onUpdate={(newCh, completed) => {
                  setUserMembership((prev) =>
                    prev ? { ...prev, current_chapter: newCh, is_completed: completed } : null
                  );
                }}
              />
            </div>
          )}
        </div>

        {session.description && (
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            {session.description}
          </p>
        )}
      </Card>

      {/* ── Members Leaderboard strip ── */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap flex-shrink-0">
            Readers:
          </span>
          {members.map((m) => {
            const pct = Math.round(
              (m.current_chapter / session.total_chapters) * 100
            );
            return (
              <div
                key={m.user_id}
                title={`${m.profile?.full_name || m.profile?.username || "Reader"} — Ch. ${m.current_chapter}/${session.total_chapters}`}
                className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full px-2.5 py-1 text-[11px] font-medium text-stone-700 dark:text-stone-300"
              >
                <div className="w-5 h-5 rounded-full bg-linear-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                  {m.profile?.username?.charAt(0).toUpperCase() || "R"}
                </div>
                <span className="max-w-[80px] truncate">
                  {m.profile?.username || "Reader"}
                </span>
                <span className="text-amber-600 font-bold">{pct}%</span>
                {m.is_completed && <span className="text-emerald-500">✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main Content: PDF + Discussion ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: PDF Viewer */}
        <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1">
          {session.pdf_url ? (
            <PdfViewer pdfUrl={session.pdf_url} bookTitle={session.title} />
          ) : (
            <Card className="rounded-3xl border-dashed bg-white/60 dark:bg-stone-900/60 flex flex-col items-center justify-center text-center p-10 sm:p-14 space-y-5 min-h-[380px]">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  No PDF Book Yet
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                  {isCreator
                    ? "Upload the book PDF so members can read it directly here, alongside the discussion."
                    : "The host hasn't uploaded a PDF copy yet. You can still track chapters and join the discussion!"}
                </p>
              </div>

              {isCreator && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    className="hidden"
                  />
                  <Button size="sm" asChild disabled={uploadingPdf} className="gap-2 shadow-md shadow-amber-600/20">
                    <span>
                      <Upload className="w-4 h-4" />
                      {uploadingPdf ? "Uploading…" : "Upload Session PDF"}
                    </span>
                  </Button>
                </label>
              )}
            </Card>
          )}
        </div>

        {/* Right: Discussion Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2">
          <DiscussionThread
            sessionId={session.id}
            isMember={!!userMembership}
            totalChapters={session.total_chapters}
            memberProgressMap={memberProgressMap}
          />
        </div>
      </div>
    </div>
  );
}
