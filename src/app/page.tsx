"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember } from "@/types/database";
import { SessionCard } from "@/components/SessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  Search,
  PlusCircle,
  Sparkles,
  Flame,
  CheckCircle2,
  Database,
  ArrowRight,
  TrendingUp,
  Users,
  BookMarked,
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
        const { data: sessionData, error } = await supabase
          .from("reading_sessions")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          if (error.code === "PGRST205" || error.message?.includes("reading_sessions")) {
            setSchemaMissing(true);
          } else {
            console.error("Error loading sessions:", error);
          }
          setLoading(false);
          return;
        }

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

  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const myJoined = sessions.filter((s) => s.userProgress != null).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      {/* Missing Schema Banner */}
      {schemaMissing && (
        <Card className="p-5 border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/10 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Database className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-semibold text-sm">Supabase Tables Need Setup</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            The table{" "}
            <code className="px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/40 rounded font-mono text-xs">
              reading_sessions
            </code>{" "}
            was not found. Run the SQL in{" "}
            <code className="px-1.5 py-0.5 bg-amber-200/60 dark:bg-amber-900/40 rounded font-mono text-xs">
              supabase/schema.sql
            </code>{" "}
            to initialize the schema.
          </p>
          <a
            href="https://supabase.com/dashboard/project/vztoznhlclljtllrybjk/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Open Supabase SQL Editor
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </Card>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-200/50 dark:border-stone-800 shadow-lg shadow-amber-900/5">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-amber-50 via-[#FAF8F5] to-rose-50/50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-900" />
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-rose-400/10 rounded-full blur-2xl translate-y-1/2" />

        <div className="relative p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-5 text-center md:text-left">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-bold text-xs uppercase tracking-wider w-fit mx-auto md:mx-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Social Reading Circles
            </Badge>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Read Together.{" "}
              <span className="bg-linear-to-r from-amber-600 to-rose-500 bg-clip-text text-transparent">
                Chapter by Chapter.
              </span>
            </h1>

            <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto md:mx-0">
              Create or join a reading session, sync your reading progress with
              friends, and participate in spoiler-safe discussions.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <Link href={user ? "/sessions/new" : "/auth/register"}>
                <Button size="lg" className="gap-2 shadow-lg shadow-amber-600/25 rounded-2xl">
                  <PlusCircle className="w-4 h-4" />
                  <span>{user ? "Host a Session" : "Start Reading Free"}</span>
                </Button>
              </Link>
              {!user && (
                <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="rounded-2xl">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats + demo widget */}
          <div className="hidden md:flex flex-col gap-3 w-72 flex-shrink-0">
            {/* Demo progress card */}
            <div className="bg-white/90 dark:bg-stone-800/90 backdrop-blur-md border border-stone-200/80 dark:border-stone-700 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Active Session
                  </p>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif">
                    Atomic Habits
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    Progress
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold">Ch. 12 / 20</span>
                </div>
                <div className="h-2 w-full bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-amber-500 to-amber-400 rounded-full w-[60%] transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>4 members finished today</span>
              </div>
            </div>

            {/* Stats row */}
            {!loading && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{activeSessions}</p>
                  <p className="text-[11px] text-stone-500 font-medium">Active Sessions</p>
                </div>
                <div className="bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-rose-500">{myJoined}</p>
                  <p className="text-[11px] text-stone-500 font-medium">Joined by You</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Sessions Browser ── */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Reading Sessions
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Discover books and join a reading circle
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search title, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                filter === tab
                  ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400"
              }`}
            >
              {tab === "all" && <span>All Sessions</span>}
              {tab === "active" && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Active
                </span>
              )}
              {tab === "completed" && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 inline text-stone-400" />
                  Completed
                </span>
              )}
            </button>
          ))}
          {!loading && (
            <span className="ml-auto text-xs text-stone-400 font-medium">
              {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-52 bg-stone-200/50 dark:bg-stone-800/50 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-16 px-6 rounded-3xl border-dashed space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              {searchQuery ? (
                <Search className="w-7 h-7" />
              ) : (
                <BookOpen className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
                {searchQuery ? "No results found" : "No sessions yet"}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? `No books match "${searchQuery}". Try different keywords.`
                  : "No reading sessions created yet. Be the first to start a reading circle!"}
              </p>
            </div>
            {user && !searchQuery && (
              <Link href="/sessions/new">
                <Button size="sm" className="gap-2 mx-auto">
                  <PlusCircle className="w-4 h-4" />
                  <span>Create First Session</span>
                </Button>
              </Link>
            )}
          </Card>
        )}
      </section>

      {/* ── Features (non-authenticated only) ── */}
      {!user && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {[
            {
              icon: <BookMarked className="w-5 h-5" />,
              title: "Track Every Chapter",
              desc: "Log your progress chapter by chapter. Never lose your place again.",
            },
            {
              icon: <Users className="w-5 h-5" />,
              title: "Read With Friends",
              desc: "Join groups and read the same book simultaneously with your circle.",
            },
            {
              icon: <Sparkles className="w-5 h-5" />,
              title: "Spoiler-Safe Chats",
              desc: "Mark comments as spoilers to protect those who haven't caught up.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex gap-4 p-5 rounded-2xl bg-white/70 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-800 hover:border-amber-300/60 dark:hover:border-amber-700/50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif">
                  {f.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
