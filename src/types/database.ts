export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reading_sessions: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          author: string;
          total_chapters: number;
          description: string | null;
          cover_image_url: string | null;
          pdf_url: string | null;
          status: "active" | "completed" | "archived";
          start_date: string;
          target_end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          author: string;
          total_chapters: number;
          description?: string | null;
          cover_image_url?: string | null;
          pdf_url?: string | null;
          status?: "active" | "completed" | "archived";
          start_date?: string;
          target_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          title?: string;
          author?: string;
          total_chapters?: number;
          description?: string | null;
          cover_image_url?: string | null;
          pdf_url?: string | null;
          status?: "active" | "completed" | "archived";
          start_date?: string;
          target_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      session_members: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          current_chapter: number;
          is_completed: boolean;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          current_chapter?: number;
          is_completed?: boolean;
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          current_chapter?: number;
          is_completed?: boolean;
          joined_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          content: string;
          chapter_reference: number | null;
          is_spoiler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          content: string;
          chapter_reference?: number | null;
          is_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          content?: string;
          chapter_reference?: number | null;
          is_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comment_reactions: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ReadingSession = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type SessionMember = Database["public"]["Tables"]["session_members"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CommentReaction = Database["public"]["Tables"]["comment_reactions"]["Row"];

export interface SessionWithMeta extends ReadingSession {
  creator?: Profile;
  member_count?: number;
  user_progress?: SessionMember | null;
}

export interface CommentWithDetails extends Comment {
  author?: Profile;
  reactions?: {
    emoji: string;
    count: number;
    user_has_reacted: boolean;
  }[];
}
