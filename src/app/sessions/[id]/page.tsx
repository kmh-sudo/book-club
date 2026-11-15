"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember, Profile } from "@/types/database";
import { ProgressUpdater } from "@/components/ProgressUpdater";
import { DiscussionThread } from "@/components/DiscussionThread";
import {
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  ArrowLeft,
  UserPlus,
  LogOut,
  Trophy,
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

  const loadSessionDetails = async () => {
    try {
      // 1. Session Info
      const { data: sessionData, error: sessionError } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // 2. Host Profile
      const { data: hostData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.creator_id)
        .single();
      setHost(hostData);

      // 3. Members & Progress
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

    // Realtime listener for member progress changes
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-500">Loading book session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl">
        <h2 className="font-serif text-2xl font-bold">Session Not Found</h2>
        <p className="text-xs text-stone-500">
          This reading session may have been removed or does not exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to all sessions
      </Link>

      {/* Main Book Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-start gap-4">
            <div className="w-20 h-28 rounded-xl bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 dark:from-stone-800 dark:to-stone-700 flex flex-col items-center justify-center p-3 text-center shadow-md flex-shrink-0">
              <BookOpen className="w-8 h-8 text-amber-900 dark:text-amber-200 mb-1" />
              <span className="text-[11px] font-bold text-amber-950 dark:text-amber-100 uppercase tracking-tighter">
                {session.total_chapters} Chs
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {session.status}
                </span>
                {session.target_end_date && (
                  <span className="flex items-center gap-1 text-[11px] text-stone-500">
                    <Calendar className="w-3 h-3" />
                    Target: {session.target_end_date}
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                {session.title}
              </h1>
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400 mt-0.5">
                by {session.author}
              </p>

              <div className="flex items-center gap-2 mt-3 text-xs text-stone-500">
                <span>Hosted by</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {host?.full_name || host?.username || "Host"}
                </span>
              </div>
            </div>
          </div>

          {/* Join / Leave Controls */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!userMembership ? (
              <button
                onClick={handleJoinSession}
                disabled={joining}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold rounded-xl text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{joining ? "Joining..." : "Join Reading Session"}</span>
              </button>
            ) : (
              <button
                onClick={handleLeaveSession}
                className="px-3 py-2 text-stone-400 hover:text-red-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Description / Reading notes */}
        {session.description && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Session Overview & Goals
            </h4>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
              {session.description}
            </p>
          </div>
        )}

        {/* Member Reading Progress Component */}
        {userMembership && user && (
          <div className="pt-2">
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

      {/* Grid: Reading Roster & Discussion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Participants Progress Roster (1 Column) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                  Readers Roster
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                {members.length} {members.length === 1 ? "Member" : "Members"}
              </span>
            </div>

            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {members.map((mem) => {
                const percent = Math.min(
                  100,
                  Math.round((mem.current_chapter / session.total_chapters) * 100)
                );
                const isMe = user && mem.user_id === user.id;

                return (
                  <div
                    key={mem.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isMe
                        ? "bg-amber-50/60 dark:bg-stone-800 border-amber-200 dark:border-stone-700"
                        : "bg-stone-50/50 dark:bg-stone-800/40 border-stone-100 dark:border-stone-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-stone-700 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0">
                          {mem.profile?.username?.charAt(0) || "R"}
                        </div>
                        <span className="text-xs font-semibold truncate text-stone-800 dark:text-stone-200">
                          {mem.profile?.full_name || mem.profile?.username || "Reader"}
                          {isMe && " (You)"}
                        </span>
                      </div>
                      {mem.is_completed ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Trophy className="w-3 h-3" /> Finished
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-stone-500">
                          Ch. {mem.current_chapter}/{session.total_chapters}
                        </span>
                      )}
                    </div>

                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          mem.is_completed ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Single-Thread Discussion Feed (2 Columns) */}
        <div className="lg:col-span-2">
          <DiscussionThread
            sessionId={session.id}
            isMember={!!userMembership}
            totalChapters={session.total_chapters}
          />
        </div>
      </div>
    </div>
  );
}
