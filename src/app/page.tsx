"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember } from "@/types/database";
import { SessionCard } from "@/components/SessionCard";
import {
  BookOpen,
  Search,
  PlusCircle,
  Sparkles,
  Flame,
  CheckCircle2,
  Database,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [sessions, setSessions] = useState<
    (ReadingSession & {
      memberCount?: number;
      userProgress?: { current_chapter: number; is_completed: boolean } | null;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [schemaMissing, setSchemaMissing] = useState(false);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      setSchemaMissing(false);
      try {
        // Fetch sessions
        const { data: sessionData, error } = await supabase
          .from("reading_sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          // Check for missing table error (PGRST205)
          if (error.code === "PGRST205" || error.message?.includes("reading_sessions")) {
            setSchemaMissing(true);
          } else {
            console.error("Error loading sessions:", error);
          }
          setLoading(false);
          return;
        }

        // Fetch counts and member progress
        const sessionIds = (sessionData || []).map((s: ReadingSession) => s.id);
        if (sessionIds.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const { data: membersData } = await supabase
          .from("session_members")
          .select("session_id, user_id, current_chapter, is_completed")
          .in("session_id", sessionIds);

        const memberMap: Record<string, number> = {};
        const userProgressMap: Record<string, SessionMember> = {};

        ((membersData || []) as SessionMember[]).forEach((m) => {
          memberMap[m.session_id] = (memberMap[m.session_id] || 0) + 1;
          if (user && m.user_id === user.id) {
            userProgressMap[m.session_id] = m;
          }
        });

        const enriched = (sessionData || []).map((s: ReadingSession) => ({
          ...s,
          memberCount: memberMap[s.id] || 0,
          userProgress: userProgressMap[s.id] || null,
        }));

        setSessions(enriched);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [user]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "active") return s.status === "active";
    if (filter === "completed") return s.status === "completed";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      {/* Missing Schema Banner */}
      {schemaMissing && (
        <div className="p-5 sm:p-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl space-y-3">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Database className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-semibold text-sm">Supabase Tables Need Setup</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            The database table <code className="px-1.5 py-0.5 bg-amber-200/50 rounded font-mono text-xs">reading_sessions</code> was not found on your Supabase project. To initialize the database schema, run the script provided in <code className="px-1.5 py-0.5 bg-amber-200/50 rounded font-mono text-xs">supabase/schema.sql</code> in your Supabase SQL Editor.
          </p>
          <div className="pt-1">
            <a
              href="https://supabase.com/dashboard/project/vztoznhlclljtllrybjk/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Open Supabase SQL Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-amber-200/20 border border-amber-200/60 dark:border-stone-800 p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Social Reading Circles
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
            Read Books. <br />
            <span className="text-amber-600 dark:text-amber-500">
              Track Chapter by Chapter.
            </span>
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
            Create or join a reading session, update your current milestone, and
            take part in engaging, spoiler-safe discussions in a single focused thread.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <Link
              href={user ? "/sessions/new" : "/auth/register"}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md shadow-amber-600/20 hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{user ? "Host a Reading Session" : "Join Book Club"}</span>
            </Link>
            {!user && (
              <Link
                href="/auth/login"
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 font-medium text-sm transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Hero Visual Banner */}
        <div className="hidden md:flex flex-col gap-3 max-w-xs w-full bg-white/70 dark:bg-stone-900/70 backdrop-blur-md p-5 rounded-2xl border border-white/60 dark:border-stone-800 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">
                Community Goal
              </p>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Synchronized Chapters
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium text-stone-600 dark:text-stone-400">
              <span>Atomic Habits</span>
              <span className="text-amber-600 font-bold">Ch. 12/20</span>
            </div>
            <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[60%]" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-stone-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>5 readers currently on Chapter 12</span>
          </div>
        </div>
      </section>

      {/* Sessions Browser Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Active Reading Sessions
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Explore books currently being read by the community
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === tab
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Sessions */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 bg-stone-200/60 dark:bg-stone-800/60 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-white/60 dark:bg-stone-900/60 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
              No sessions found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No books match "${searchQuery}". Try different keywords.`
                : "No reading sessions created yet. Be the first one to start a reading circle!"}
            </p>
          </div>
          {user && (
            <Link
              href="/sessions/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Session
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
