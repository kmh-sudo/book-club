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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      {/* Missing Schema Banner */}
      {schemaMissing && (
        <Card className="p-6 border-amber-300 dark:border-amber-900/60 bg-amber-500/10 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Database className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-semibold text-sm">Supabase Tables Need Setup</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            The database table <code className="px-1.5 py-0.5 bg-amber-200/50 rounded font-mono text-xs">reading_sessions</code> was not found on your Supabase project. To initialize the schema, run the SQL script in <code className="px-1.5 py-0.5 bg-amber-200/50 rounded font-mono text-xs">supabase/schema.sql</code>.
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
        </Card>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500/15 via-rose-500/10 to-amber-200/20 border border-amber-200/60 dark:border-stone-800 p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
        <div className="max-w-xl space-y-4">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Social Reading Circles
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
            Read Together. <br />
            <span className="bg-linear-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
              Track Chapter by Chapter.
            </span>
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed max-w-lg">
            Create or join a reading session, sync your reading progress with friends, and participate in spoiler-safe, focused single-thread discussions.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <Link href={user ? "/sessions/new" : "/auth/register"}>
              <Button size="lg" className="gap-2 shadow-lg shadow-amber-600/25">
                <PlusCircle className="w-4 h-4" />
                <span>{user ? "Host Reading Session" : "Start Reading Free"}</span>
              </Button>
            </Link>
            {!user && (
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Hero Visual Widget */}
        <div className="hidden md:flex flex-col gap-3.5 max-w-xs w-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-md p-5 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Community Goal
              </p>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Atomic Habits
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                Current Milestone
              </span>
              <span className="text-amber-700 font-bold">Ch. 12/20</span>
            </div>
            <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-amber-500 to-amber-600 rounded-full w-[60%]" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-xs text-stone-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>4 members finished reading today</span>
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
              Discover books and sync your reading journey
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search title, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {(["all", "active", "completed"] as const).map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab)}
              className="capitalize text-xs rounded-xl"
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid of Sessions */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 bg-stone-200/60 dark:bg-stone-800/60 animate-pulse rounded-3xl"
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
        <Card className="text-center py-16 px-4 rounded-3xl border-dashed space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
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
            <Link href="/sessions/new">
              <Button size="sm" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Create First Session</span>
              </Button>
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
