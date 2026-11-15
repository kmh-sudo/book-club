"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember } from "@/types/database";
import { SessionCard } from "@/components/SessionCard";
import {
  User,
  BookOpen,
  CheckCircle2,
  LogOut,
  Edit2,
  Check,
  Trophy,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joinedSessions, setJoinedSessions] = useState<
    (ReadingSession & {
      memberCount?: number;
      userProgress?: SessionMember | null;
    })[]
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    async function loadUserSessions() {
      if (!user) return;
      setLoadingSessions(true);

      try {
        const { data: memberRows } = await supabase
          .from("session_members")
          .select("*, reading_sessions(*)")
          .eq("user_id", user.id);

        if (!memberRows) {
          setJoinedSessions([]);
          return;
        }

        const sessionsList = memberRows
          .filter((m) => m.reading_sessions)
          .map((m) => {
            const sess = m.reading_sessions as unknown as ReadingSession;
            return {
              ...sess,
              userProgress: m as SessionMember,
            };
          });

        setJoinedSessions(sessionsList);
      } catch (err) {
        console.error("Error loading user sessions:", err);
      } finally {
        setLoadingSessions(false);
      }
    }

    if (user) {
      loadUserSessions();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      await refreshProfile();
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-stone-500">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4 p-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl">
        <User className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
        <p className="text-xs text-stone-500">
          Sign in to view and edit your profile and reading activity.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-semibold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const completedCount = joinedSessions.filter((s) => s.userProgress?.is_completed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md shadow-amber-500/20">
              {profile?.username?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                {profile?.full_name || profile?.username || "Reader"}
              </h1>
              <p className="text-xs text-stone-500">@{profile?.username || "reader"}</p>
              <p className="text-xs text-stone-400 mt-1">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            )}

            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-stone-800 rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editable info or bio */}
        {isEditing ? (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
                Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What kinds of books do you enjoy reading?"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-stone-600 dark:text-stone-300 italic">
              {profile?.bio || "No bio added yet."}
            </p>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200/60 dark:border-stone-700/60 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Active Circles</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {joinedSessions.length}
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 dark:bg-stone-800/60 border border-emerald-200/60 dark:border-stone-700/60 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Completed</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {completedCount}
            </p>
          </div>

          <div className="p-4 bg-rose-50/60 dark:bg-stone-800/60 border border-rose-200/60 dark:border-stone-700/60 rounded-2xl col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Milestones</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {joinedSessions.reduce((acc, curr) => acc + (curr.userProgress?.current_chapter || 0), 0)} chs
            </p>
          </div>
        </div>
      </div>

      {/* User's Reading Sessions List */}
      <div className="space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
          My Reading Sessions
        </h2>

        {loadingSessions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-stone-200/60 dark:bg-stone-800/60 animate-pulse rounded-2xl"
              />
            ))}
          </div>
        ) : joinedSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {joinedSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-3xl bg-white/40 dark:bg-stone-900/40">
            <p className="text-xs text-stone-500 mb-3">
              You haven&apos;t joined any reading sessions yet.
            </p>
            <Link
              href="/"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm inline-block"
            >
              Explore Sessions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
