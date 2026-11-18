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
      <div className="max-w-xl mx-auto px-4 py-16 text-center type-small text-muted-ink font-medium">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto my-16 text-center space-y-4 p-8">
        <div className="w-12 h-12 rounded-full bg-sand/70 text-teal flex items-center justify-center mx-auto">
          <User className="w-5 h-5" />
        </div>
        <h2 className="type-h2 text-[24px] text-ink">Sign In Required</h2>
        <p className="type-small text-muted-ink">
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-10">
      {/* Profile Header Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-line">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-teal text-cream flex items-center justify-center font-serif font-semibold text-2xl uppercase ring-2 ring-gold/40">
              {profile?.username?.charAt(0) || "U"}
            </div>
            <div>
              <h1 className="type-h2 text-ink">
                {profile?.full_name || profile?.username || "Reader"}
              </h1>
              <p className="text-xs text-gold-ink font-semibold mt-0.5">@{profile?.username || "reader"}</p>
              <p className="text-xs text-muted-ink/80 mt-0.5">{user.email}</p>
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
                className="gap-1.5 bg-sage hover:opacity-90"
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
              className="hover:text-danger"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editable info or bio */}
        {isEditing ? (
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block type-label text-muted-ink mb-1">
                Display Name
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block type-label text-muted-ink mb-1">
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
            <p className="type-small text-muted-ink italic leading-relaxed">
              {profile?.bio || "No bio added yet. Tell other readers about your favorite books!"}
            </p>
          </div>
        )}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-sand/40 border border-line/80 rounded-2xl">
            <div className="flex items-center gap-2 text-gold-ink mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="type-label text-[10px]">Active Circles</span>
            </div>
            <p className="text-3xl font-serif font-semibold text-ink leading-tight">
              {joinedSessions.length}
            </p>
          </div>

          <div className="p-4 bg-sage-soft border border-sage/25 rounded-2xl">
            <div className="flex items-center gap-2 text-sage mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="type-label text-[10px]">Finished</span>
            </div>
            <p className="text-3xl font-serif font-semibold text-ink leading-tight">
              {completedCount}
            </p>
          </div>

          <div className="p-4 bg-card border border-line/80 rounded-2xl col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-gold-ink mb-1">
              <Trophy className="w-4 h-4" />
              <span className="type-label text-[10px]">Milestones</span>
            </div>
            <p className="text-3xl font-serif font-semibold text-ink leading-tight">
              {joinedSessions.reduce((acc, curr) => acc + (curr.userProgress?.current_chapter || 0), 0)} chs
            </p>
          </div>
        </div>
      </Card>

      {/* User's Reading Sessions List */}
      <div className="space-y-4">
        <h2 className="type-h2 text-ink">
          My Reading Sessions
        </h2>

        {loadingSessions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 bg-sand/50 animate-pulse rounded-card"
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
          <Card className="text-center py-12 px-4 border-dashed bg-card/60">
            <p className="type-small text-muted-ink mb-3">
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
