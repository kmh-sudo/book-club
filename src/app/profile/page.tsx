"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ReadingSession, SessionMember } from "@/types/database";
import { SessionCard } from "@/components/SessionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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

        const sessionsList = (memberRows as unknown as { reading_sessions: ReadingSession }[])
          .filter((m) => m.reading_sessions)
          .map((m) => {
            const sess = m.reading_sessions;
            return {
              ...sess,
              userProgress: m as unknown as SessionMember,
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-stone-500 font-medium">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto my-16 text-center space-y-4 p-8 rounded-3xl">
        <User className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
        <p className="text-xs text-stone-500">
          Sign in to view and edit your profile and reading activity.
        </p>
        <Link href="/auth/login">
          <Button size="sm">Sign In</Button>
        </Link>
      </Card>
    );
  }

  const completedCount = joinedSessions.filter((s) => s.userProgress?.is_completed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      {/* Profile Header Card */}
      <Card className="p-6 sm:p-8 space-y-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md shadow-amber-500/20">
              {profile?.username?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
                {profile?.full_name || profile?.username || "Reader"}
              </h1>
              <p className="text-xs text-stone-500 font-medium">@{profile?.username || "reader"}</p>
              <p className="text-xs text-stone-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={saving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save"}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              title="Sign out"
              className="text-stone-400 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editable info or bio */}
        {isEditing ? (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
                Display Name
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-stone-500 mb-1">
                Bio
              </label>
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What kinds of books do you enjoy reading?"
                className="resize-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-stone-600 dark:text-stone-300 italic">
              {profile?.bio || "No bio added yet. Tell other readers about your favorite books!"}
            </p>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/60 dark:border-stone-700/60 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Circles</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {joinedSessions.length}
            </p>
          </div>

          <div className="p-4 bg-emerald-50/70 dark:bg-stone-800/60 border border-emerald-200/60 dark:border-stone-700/60 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Finished</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {completedCount}
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 dark:bg-stone-800/60 border border-rose-200/60 dark:border-stone-700/60 rounded-2xl col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Milestones</span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {joinedSessions.reduce((acc, curr) => acc + (curr.userProgress?.current_chapter || 0), 0)} chs
            </p>
          </div>
        </div>
      </Card>

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
                className="h-48 bg-stone-200/60 dark:bg-stone-800/60 animate-pulse rounded-3xl"
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
          <Card className="text-center py-12 px-4 border-dashed rounded-3xl bg-white/40 dark:bg-stone-900/40">
            <p className="text-xs text-stone-500 mb-3">
              You haven&apos;t joined any reading sessions yet.
            </p>
            <Link href="/">
              <Button size="sm">Explore Sessions</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
