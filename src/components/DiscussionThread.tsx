"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Comment, CommentReaction, Profile } from "@/types/database";
import { formatTimeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Bookmark,
  LogIn,
  AlertCircle,
  Trophy,
} from "lucide-react";
import Link from "next/link";

const ALLOWED_EMOJIS = ["👍", "❤️", "💡", "👏", "😮"] as const;

interface DiscussionThreadProps {
  sessionId: string;
  isMember: boolean;
  totalChapters: number;
  memberProgressMap?: Record<string, { current_chapter: number; is_completed: boolean }>;
}

interface EnrichedComment extends Comment {
  author?: Profile;
  reactions: {
    emoji: string;
    count: number;
    hasReacted: boolean;
  }[];
}

export function DiscussionThread({
  sessionId,
  isMember,
  totalChapters,
  memberProgressMap = {},
}: DiscussionThreadProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [comments, setComments] = useState<EnrichedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [chapterRef, setChapterRef] = useState<string>("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`
          *,
          author:profiles(*)
        `)
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const commentIds = (commentsData || []).map((c: Comment) => c.id);
      let reactionsData: CommentReaction[] = [];

      if (commentIds.length > 0) {
        const { data: reacts } = await supabase
          .from("comment_reactions")
          .select("*")
          .in("comment_id", commentIds);
        reactionsData = (reacts as CommentReaction[]) || [];
      }

      const formatted: EnrichedComment[] = ((commentsData || []) as (Comment & { author?: Profile })[]).map((c) => {
        const commentReactions = reactionsData.filter((r) => r.comment_id === c.id);

        const reactions = ALLOWED_EMOJIS.map((emoji) => {
          const match = commentReactions.filter((r) => r.emoji === emoji);
          const hasReacted = user ? match.some((r) => r.user_id === user.id) : false;
          return {
            emoji,
            count: match.length,
            hasReacted,
          };
        });

        return {
          ...c,
          reactions,
        };
      });

      setComments(formatted);
    } catch (err) {
      console.error("Error loading discussion comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();

    const commentChannel = supabase
      .channel(`discussion-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          loadComments();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_reactions",
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
    };
  }, [sessionId, user]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isMember) return;
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const parsedChapter = chapterRef ? parseInt(chapterRef, 10) : null;

      const { error: postError } = await supabase.from("comments").insert({
        session_id: sessionId,
        user_id: user.id,
        content: newComment.trim(),
        chapter_reference: parsedChapter && parsedChapter > 0 ? parsedChapter : null,
        is_spoiler: isSpoiler,
      });

      if (postError) throw postError;

      setNewComment("");
      setChapterRef("");
      setIsSpoiler(false);
      await loadComments();

      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to post comment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    if (!user) return;
    if (!isMember) {
      alert("Please join this reading session first to react to comments!");
      return;
    }

    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;

    const reactionState = comment.reactions.find((r) => r.emoji === emoji);
    const hasReacted = reactionState?.hasReacted;

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        return {
          ...c,
          reactions: c.reactions.map((r) => {
            if (r.emoji !== emoji) return r;
            return {
              ...r,
              count: hasReacted ? r.count - 1 : r.count + 1,
              hasReacted: !hasReacted,
            };
          }),
        };
      })
    );

    try {
      if (hasReacted) {
        await supabase
          .from("comment_reactions")
          .delete()
          .match({ comment_id: commentId, user_id: user.id, emoji });
      } else {
        await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });
      }
    } catch (err) {
      console.error("Reaction failed:", err);
      loadComments();
    }
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="flex flex-col h-[750px] p-5 sm:p-6 rounded-3xl border-stone-200/90 dark:border-stone-800 shadow-sm bg-white/90 dark:bg-stone-900/90 backdrop-blur-md">
      {/* Thread Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Session Discussion
            </h3>
            <p className="text-[11px] text-stone-500">
              Live thoughts & chapter reactions
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5">
          {comments.length}
        </Badge>
      </div>

      {/* Comment List (Scrollable Area) */}
      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isSpoilerHidden = comment.is_spoiler && !revealedSpoilers[comment.id];
            const authorProgress = memberProgressMap[comment.user_id];
            const authorPercent = authorProgress
              ? Math.min(100, Math.round((authorProgress.current_chapter / totalChapters) * 100))
              : 0;

            return (
              <div
                key={comment.id}
                className="group relative bg-[#FAF9F6] dark:bg-stone-800/50 rounded-2xl p-3.5 sm:p-4 border border-stone-200/70 dark:border-stone-800 space-y-2.5 transition-all hover:border-amber-300/50 shadow-2xs"
              >
                {/* Author Info & Progress Bar Inline */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-linear-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-[10px] uppercase flex-shrink-0 shadow-xs">
                        {comment.author?.username?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            {comment.author?.full_name || comment.author?.username || "Reader"}
                          </span>
                          <span className="text-[10px] text-amber-600 font-medium">
                            @{comment.author?.username || "member"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {comment.chapter_reference && (
                        <Badge variant="secondary" className="gap-0.5 text-[10px] font-bold px-1.5 py-0">
                          <Bookmark className="w-2.5 h-2.5 text-amber-600" />
                          <span>Ch. {comment.chapter_reference}</span>
                        </Badge>
                      )}
                      <span className="text-[10px] text-stone-400">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* User Reading Progress Bar Inside Comment */}
                  {authorProgress && (
                    <div className="flex items-center gap-2 bg-white/70 dark:bg-stone-900/60 px-2 py-1 rounded-lg border border-stone-200/50 dark:border-stone-800">
                      <span className="text-[10px] font-semibold text-stone-500 whitespace-nowrap">
                        Reader Progress:
                      </span>
                      <div className="flex-1">
                        <Progress value={authorPercent} className="h-1.5" />
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap flex items-center gap-1">
                        {authorProgress.is_completed ? (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" /> Finished
                          </span>
                        ) : (
                          `Ch. ${authorProgress.current_chapter}/${totalChapters}`
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Comment Text Content */}
                <div className="relative pt-0.5">
                  {comment.is_spoiler && (
                    <div className="mb-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSpoiler(comment.id)}
                        className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 h-auto p-0 hover:bg-transparent"
                      >
                        {isSpoilerHidden ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            <span>Contains spoiler (click to show)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            <span>Hide spoiler</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <p
                    className={`text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap ${
                      isSpoilerHidden ? "filter blur-sm select-none" : ""
                    }`}
                  >
                    {comment.content}
                  </p>
                </div>

                {/* Reactions Toolbar */}
                <div className="pt-1.5 flex flex-wrap items-center gap-1 border-t border-stone-200/50 dark:border-stone-800/80">
                  {comment.reactions.map(({ emoji, count, hasReacted }) => (
                    <button
                      key={emoji}
                      onClick={() => handleToggleReaction(comment.id, emoji)}
                      disabled={!isMember}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                        hasReacted
                          ? "bg-amber-100/90 border-amber-300 text-amber-900 dark:bg-amber-950/80 dark:border-amber-700 dark:text-amber-200 scale-105 shadow-xs"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                      } ${!isMember ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
            <p className="text-xs text-stone-500">
              No comments yet in this session. Start the conversation below!
            </p>
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Composer Section */}
      <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
        {!user ? (
          <Card className="p-3 bg-amber-50/60 dark:bg-stone-800/60 border-amber-200/60 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Sign in to post comments & react
            </p>
            <Link href="/auth/login">
              <Button size="sm" className="h-7 text-xs px-2.5">
                <LogIn className="w-3 h-3 mr-1" />
                Sign In
              </Button>
            </Link>
          </Card>
        ) : !isMember ? (
          <Card className="p-3 bg-amber-50/80 dark:bg-stone-800/60 border-amber-200 text-center">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Join this session to post comments & discuss
            </p>
          </Card>
        ) : (
          <form onSubmit={handlePostComment} className="space-y-2.5">
            {error && (
              <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Textarea
              rows={2}
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share thoughts, quotes, or questions..."
              className="resize-none text-xs sm:text-sm py-2 px-3 rounded-xl min-h-[60px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400">
                  <Bookmark className="w-3 h-3 text-amber-600" />
                  <select
                    value={chapterRef}
                    onChange={(e) => setChapterRef(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-[11px] text-stone-700 dark:text-stone-300 focus:outline-none"
                  >
                    <option value="">General</option>
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        Ch. {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                  />
                  <span>Spoiler</span>
                </label>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={submitting || !newComment.trim()}
                className="h-8 px-3 text-xs gap-1 shadow-sm"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? "Posting..." : "Post"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
