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
  CheckCircle2,
  Users,
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
        .select(`
          *,
          profile:profiles(*)
        `)
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !session || user.id !== session.creator_id) return;

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    setUploadingPdf(true);
    setUploadError(null);

    try {
      const fileExt = "pdf";
      const sanitizedName = session.title.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("session_pdfs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from("session_pdfs")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      // Update session record
      const { error: updateErr } = await supabase
        .from("reading_sessions")
        .update({ pdf_url: publicUrl })
        .eq("id", session.id);

      if (updateErr) throw updateErr;

      await loadSessionDetails();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Failed to upload PDF. Please ensure session_pdfs storage bucket is created.");
      }
    } finally {
      setUploadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-500 font-medium">Loading reading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Card className="max-w-md mx-auto my-16 text-center space-y-4 p-8 rounded-3xl">
        <h2 className="font-serif text-2xl font-bold">Session Not Found</h2>
        <p className="text-xs text-stone-500">
          This reading session may have been removed or does not exist.
        </p>
        <Link href="/">
          <Button size="sm">Back to Explore</Button>
        </Link>
      </Card>
    );
  }

  const isCreator = user && user.id === session.creator_id;

  // Build a fast lookup map of user progress for comments
  const memberProgressMap: Record<string, { current_chapter: number; is_completed: boolean }> = {};
  members.forEach((m) => {
    memberProgressMap[m.user_id] = {
      current_chapter: m.current_chapter,
      is_completed: m.is_completed,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* Top Header Row with Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all sessions
        </Link>

        <div className="flex items-center gap-2">
          {/* Creator PDF Upload Option if not uploaded yet */}
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
                className="gap-1.5 text-xs rounded-xl shadow-xs"
              >
                <span>
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  {uploadingPdf ? "Uploading PDF..." : "Upload Book PDF"}
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
              <span>{joining ? "Joining..." : "Join Session"}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveSession}
              className="text-stone-400 hover:text-red-600 hover:bg-red-50 text-xs rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              <span>Leave</span>
            </Button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {uploadError}
        </div>
      )}

      {/* Book Session Header Banner */}
      <Card className="p-5 sm:p-7 space-y-4 rounded-3xl shadow-sm border-stone-200/90 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-2xl bg-linear-to-br from-amber-200 via-amber-300 to-amber-500 dark:from-stone-800 dark:to-stone-700 flex flex-col items-center justify-center p-2.5 text-center shadow-md flex-shrink-0">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-amber-950 dark:text-amber-200 mb-1" />
              <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-950 dark:text-amber-100 uppercase tracking-tighter">
                {session.total_chapters} Chs
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant={session.status === "active" ? "success" : "secondary"}
                  className="uppercase font-bold text-[10px]"
                >
                  {session.status}
                </Badge>
                {session.pdf_url && (
                  <Badge variant="secondary" className="gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300">
                    <FileText className="w-3 h-3 text-amber-600" />
                    PDF Book Attached
                  </Badge>
                )}
                {session.target_end_date && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                    <Calendar className="w-3 h-3" />
                    Target: {session.target_end_date}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                {session.title}
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 mt-0.5">
                by {session.author}
              </p>

              <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
                <span>Hosted by</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {host?.full_name || host?.username || "Host"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-600" />
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>

          {/* User's Progress Bar Widget */}
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
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed pt-2 border-t border-stone-100 dark:border-stone-800">
            {session.description}
          </p>
        )}
      </Card>

      {/* Main Content Layout: Side-by-Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive PDF Viewer */}
        <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1">
          {session.pdf_url ? (
            <PdfViewer pdfUrl={session.pdf_url} bookTitle={session.title} />
          ) : (
            <Card className="p-8 sm:p-12 text-center rounded-3xl border-dashed space-y-4 bg-white/70 dark:bg-stone-900/70 h-[450px] flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                  No PDF Book Uploaded Yet
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                  {isCreator
                    ? "As the creator of this session, you can upload the PDF book so members can read it directly here alongside discussions."
                    : "The host hasn't uploaded a PDF copy for this session yet. You can still track chapters and participate in the discussion!"}
                </p>
              </div>

              {isCreator && (
                <label className="cursor-pointer pt-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={uploadingPdf}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    asChild
                    disabled={uploadingPdf}
                    className="gap-2 rounded-xl shadow-md shadow-amber-600/20"
                  >
                    <span>
                      <Upload className="w-4 h-4" />
                      {uploadingPdf ? "Uploading..." : "Upload Session PDF"}
                    </span>
                  </Button>
                </label>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Session Discussion Sidebar with Inline Reader Progress */}
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
