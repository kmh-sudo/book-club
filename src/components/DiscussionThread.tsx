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
import {
  MessageSquare,
  Send,
  Eye,
  EyeOff,
  Bookmark,
  LogIn,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const ALLOWED_EMOJIS = ["👍", "❤️", "💡", "👏", "😮"] as const;

interface DiscussionThreadProps {
  sessionId: string;
  isMember: boolean;
  totalChapters: number;
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
    <Card className="p-6 sm:p-8 space-y-6 rounded-3xl">
      {/* Thread Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Session Discussion
            </h3>
            <p className="text-xs text-stone-500">
              Focused single thread for this book
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-semibold">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </Badge>
      </div>

      {/* Comment List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isSpoilerHidden = comment.is_spoiler && !revealedSpoilers[comment.id];

            return (
              <div
                key={comment.id}
                className="group relative bg-[#FAF9F6] dark:bg-stone-800/50 rounded-2xl p-4 sm:p-5 border border-stone-200/60 dark:border-stone-800 space-y-3 transition-colors hover:border-amber-300/40"
              >
                {/* Author Info & Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {comment.author?.username?.charAt(0) || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {comment.author?.full_name || comment.author?.username || "Reader"}
                        </span>
                        <span className="text-[10px] text-amber-600 font-medium">
                          @{comment.author?.username || "member"}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Chapter badge */}
                  {comment.chapter_reference && (
                    <Badge variant="secondary" className="gap-1 text-[11px] font-bold">
                      <Bookmark className="w-3 h-3 text-amber-600" />
                      <span>Chapter {comment.chapter_reference}</span>
                    </Badge>
                  )}
                </div>

                {/* Comment Content */}
                <div className="relative">
                  {comment.is_spoiler && (
                    <div className="mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSpoiler(comment.id)}
                        className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 h-auto p-0 hover:bg-transparent"
                      >
                        {isSpoilerHidden ? (
                          <>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>Contains spoiler (click to show)</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                            <span>Hide spoiler</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <p
                    className={`text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap ${
                      isSpoilerHidden ? "filter blur-sm select-none" : ""
                    }`}
                  >
                    {comment.content}
                  </p>
                </div>

                {/* Reactions Toolbar */}
                <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-stone-200/50 dark:border-stone-800/80">
                  {comment.reactions.map(({ emoji, count, hasReacted }) => (
                    <button
                      key={emoji}
                      onClick={() => handleToggleReaction(comment.id, emoji)}
                      disabled={!isMember}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        hasReacted
                          ? "bg-amber-100/90 border-amber-300 text-amber-900 dark:bg-amber-950/80 dark:border-amber-700 dark:text-amber-200 scale-105 shadow-sm"
                          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                      } ${!isMember ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-[11px] font-bold">{count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl">
            <p className="text-sm text-stone-500">
              No comments yet in this session. Be the first to start the conversation!
            </p>
          </div>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Composer Section */}
      <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
        {!user ? (
          <Card className="p-4 bg-amber-50/60 dark:bg-stone-800/60 border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Want to join the discussion?
              </p>
              <p className="text-xs text-stone-500">
                Sign in to post comments and react with other readers.
              </p>
            </div>
            <Link href="/auth/login">
              <Button size="sm" className="gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Button>
            </Link>
          </Card>
        ) : !isMember ? (
          <Card className="p-4 bg-amber-50/80 dark:bg-stone-800/60 border-amber-200 dark:border-stone-700 text-center space-y-1">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
              Join this reading session to join the discussion
            </p>
            <p className="text-xs text-stone-500">
              Click &quot;Join Reading Session&quot; above to post thoughts and react to comments.
            </p>
          </Card>
        ) : (
          <form onSubmit={handlePostComment} className="space-y-3">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Textarea
              rows={3}
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts, reactions, or chapter questions..."
              className="resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <select
                    value={chapterRef}
                    onChange={(e) => setChapterRef(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">General</option>
                    {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => (
                      <option key={ch} value={ch}>
                        Chapter {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Contains spoiler</span>
                </label>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={submitting || !newComment.trim()}
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "Posting..." : "Post"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
