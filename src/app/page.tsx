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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
      {/* Missing Schema Banner */}
      {schemaMissing && (
        <Card className="p-5 border-gold/50 bg-sand/40 space-y-3">
          <div className="flex items-center gap-2.5 text-ink">
            <Database className="w-5 h-5 flex-shrink-0 text-gold-ink" />
            <h3 className="font-semibold text-sm">Supabase Tables Need Setup</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-ink leading-relaxed">
            The table{" "}
            <code className="px-1.5 py-0.5 bg-canvas rounded font-mono text-xs text-ink">
              reading_sessions
            </code>{" "}
            was not found. Run the SQL in{" "}
            <code className="px-1.5 py-0.5 bg-canvas rounded font-mono text-xs text-ink">
              supabase/schema.sql
            </code>{" "}
            to initialize the schema.
          </p>
          <a
            href="https://supabase.com/dashboard/project/vztoznhlclljtllrybjk/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-ink rounded-full text-xs font-semibold shadow-sm hover:bg-teal-deep transition-colors"
          >
            Open Supabase SQL Editor
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </Card>
      )}

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-teal text-cream shadow-[0_1px_2px_rgba(27,45,48,0.2),0_40px_80px_-50px_rgba(27,45,48,0.8)]">
        {/* Warm light + arch motif from the logo */}
        <div className="absolute -top-28 -right-16 w-96 h-96 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div
          aria-hidden
          className="hidden md:block absolute right-16 bottom-0 h-64 w-52 rounded-t-full border border-gold/20 bg-cream/[0.03] pointer-events-none"
        />
        <Sparkles
          aria-hidden
          className="absolute left-1/2 top-10 w-4 h-4 text-gold/40 hidden lg:block"
        />

        <div className="relative p-8 sm:p-12 lg:p-14 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-6 text-center md:text-left">
            <Badge className="gap-1.5 px-3.5 py-1.5 bg-gold/15 text-cream border border-gold/30 type-label w-fit mx-auto md:mx-0">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              Social Reading Circles
            </Badge>

            <h1 className="type-display">
              Read Together.{" "}
              <em className="not-italic">
                <span className="italic text-gold">Chapter by Chapter.</span>
              </em>
            </h1>

            <p className="text-cream/70 type-body max-w-lg mx-auto md:mx-0">
              Create or join a reading session, sync your reading progress with
              friends, and participate in spoiler-safe discussions.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              <Link
                href={user ? "/sessions/new" : "/auth/register"}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-gold text-teal-deep hover:bg-gold-hover shadow-lg shadow-black/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{user ? "Host a Session" : "Start Reading Free"}</span>
                </Button>
              </Link>
              {!user && (
                <Link href="/auth/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-cream/25 bg-cream/5 text-cream hover:bg-cream/10 hover:border-cream/40"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Currently reading card */}
          <div className="hidden md:flex flex-col gap-3 w-72 flex-shrink-0">
            <div className="bg-cream text-teal rounded-2xl p-5 shadow-xl shadow-black/20 space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cream-deep text-teal">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="type-label text-[10px] text-[#8a5a2e]">
                    Active Session
                  </p>
                  <p className="text-sm font-serif font-semibold text-teal">
                    Atomic Habits
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-teal/70">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-gold-ink" />
                    Progress
                  </span>
                  <span className="text-teal font-bold">Ch. 12 / 20</span>
                </div>
                <div className="h-2 w-full bg-cream-deep rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-gold to-[#b9834f] rounded-full w-[60%]" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-teal/60">
                <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                <span>4 members finished today</span>
              </div>
            </div>

            {!loading && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-cream/15 bg-cream/[0.06] p-3 text-center">
                  <p className="text-2xl font-serif font-semibold text-gold">
                    {activeSessions}
                  </p>
                  <p className="type-label text-[9px] text-cream/60 mt-0.5">
                    Active Sessions
                  </p>
                </div>
                <div className="rounded-2xl border border-cream/15 bg-cream/[0.06] p-3 text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">
                    {myJoined}
                  </p>
                  <p className="type-label text-[9px] text-cream/60 mt-0.5">
                    Joined by You
                  </p>
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
            <h2 className="type-h2 text-ink">Reading Sessions</h2>
            <p className="type-small text-muted-ink mt-1">
              Discover books and join a reading circle
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-ink absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search title, author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "active", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border ${
                filter === tab
                  ? "bg-primary border-primary text-primary-ink shadow-sm"
                  : "bg-card border-line text-muted-ink hover:border-gold/60 hover:text-ink"
              }`}
            >
              {tab === "all" && <span>All Sessions</span>}
              {tab === "active" && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
                  Active
                </span>
              )}
              {tab === "completed" && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 inline" />
                  Completed
                </span>
              )}
            </button>
          ))}
          {!loading && (
            <span className="ml-auto type-small text-muted-ink/80">
              {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-52 bg-sand/50 animate-pulse rounded-card"
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
          <Card className="text-center py-16 px-6 border-dashed space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-sand/70 text-teal flex items-center justify-center mx-auto">
              {searchQuery ? (
                <Search className="w-7 h-7" />
              ) : (
                <BookOpen className="w-7 h-7" />
              )}
            </div>
            <div>
              <h3 className="type-h3 text-ink">
                {searchQuery ? "No results found" : "No sessions yet"}
              </h3>
              <p className="type-small text-muted-ink max-w-sm mx-auto mt-1">
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

      {/* ── Features ── */}
      {!user && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
              className="flex gap-4 p-5 rounded-card bg-card/70 border border-line/80 hover:border-gold/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-teal text-gold flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="type-h3 text-[17px] text-ink">{f.title}</h3>
                <p className="type-small text-muted-ink mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
