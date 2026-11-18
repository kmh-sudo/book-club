"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { BookOpen, AlertCircle, ArrowLeft, Plus, Upload, CheckCircle2, ImagePlus } from "lucide-react";

export default function CreateSessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalChapters, setTotalChapters] = useState<number>(10);
  const [description, setDescription] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are supported.");
        setPdfFile(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("PDF size must be under 50MB.");
        setPdfFile(null);
        return;
      }
      setError(null);
      setPdfFile(file);
    }
  };

  const coverPreviewRef = useRef<string | null>(null);

  // Set the picked cover and swap its local preview, revoking the previous object URL.
  const applyCoverFile = (file: File | null, input?: HTMLInputElement) => {
    if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
    coverPreviewRef.current = file ? URL.createObjectURL(file) : null;
    setCoverFile(file);
    setCoverPreview(coverPreviewRef.current);
    if (!file && input) input.value = "";
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Cover image must be a JPG, PNG or WebP file.");
      applyCoverFile(null, e.target);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be under 5MB.");
      applyCoverFile(null, e.target);
      return;
    }

    setError(null);
    applyCoverFile(file);
  };

  // Release the last preview object URL when the form unmounts.
  useEffect(() => {
    return () => {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to create a reading session.");
      return;
    }

    if (totalChapters <= 0) {
      setError("Total chapters must be greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let uploadedPdfUrl: string | null = null;
      let uploadedCoverUrl: string | null = null;
      const sanitizedName = title.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);

      // 1. Upload cover image if selected
      if (coverFile) {
        setUploadStatus("Uploading cover image...");
        const coverExt =
          coverFile.type === "image/png" ? "png" : coverFile.type === "image/webp" ? "webp" : "jpg";
        const coverPath = `${user.id}/${Date.now()}-${sanitizedName}.${coverExt}`;

        const { error: coverUploadError } = await supabase.storage
          .from("book-cover-image")
          .upload(coverPath, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (coverUploadError) {
          // Storage errors here are usually project setup, not user error, so name the fix.
          const storageMessage = coverUploadError.message.toLowerCase();
          if (storageMessage.includes("bucket not found")) {
            throw new Error(
              "Could not upload the cover image: the 'book-cover-image' bucket does not exist. Run supabase/create_book_cover_bucket.sql in the Supabase SQL editor."
            );
          }
          if (storageMessage.includes("row-level security")) {
            throw new Error(
              "Could not upload the cover image: Supabase storage denied the upload (row-level security). The 'book-cover-image' bucket exists but its insert policy is missing — run supabase/create_book_cover_bucket.sql in the Supabase SQL editor."
            );
          }
          throw new Error(`Could not upload the cover image: ${coverUploadError.message}`);
        }

        const { data: coverUrlData } = supabase.storage
          .from("book-cover-image")
          .getPublicUrl(coverPath);

        if (!coverUrlData?.publicUrl) {
          throw new Error("Could not resolve the uploaded cover image URL.");
        }
        uploadedCoverUrl = coverUrlData.publicUrl;
      }

      // 2. Upload PDF if selected
      if (pdfFile) {
        setUploadStatus("Uploading PDF book...");
        const fileExt = "pdf";
        const filePath = `${user.id}/${Date.now()}-${sanitizedName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("session_pdfs")
          .upload(filePath, pdfFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.warn("Storage upload notice:", uploadError);
          // If storage bucket isn't set up yet, alert with fallback
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("session_pdfs")
            .getPublicUrl(filePath);
          uploadedPdfUrl = publicUrlData?.publicUrl || null;
        }
      }

      setUploadStatus("Creating reading session...");

      // 3. Insert reading session
      const { data: sessionData, error: sessionError } = await supabase
        .from("reading_sessions")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          author: author.trim(),
          total_chapters: totalChapters,
          description: description.trim() || null,
          target_end_date: targetEndDate || null,
          pdf_url: uploadedPdfUrl,
          cover_image_url: uploadedCoverUrl,
          status: "active",
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 4. Auto-join creator to session
      await supabase.from("session_members").insert({
        session_id: sessionData.id,
        user_id: user.id,
        current_chapter: 0,
        is_completed: false,
      });

      router.push(`/sessions/${sessionData.id}`);
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create session. Please try again.");
      }
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-stone-500 font-medium">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto my-16 p-8 text-center space-y-4 rounded-3xl">
        <BookOpen className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
        <p className="text-sm text-stone-500">
          You need to be signed in to host a reading session for fellow readers.
        </p>
        <Link href="/auth/login">
          <Button size="lg" className="rounded-xl">Sign In</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sessions
      </Link>

      <Card className="rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-amber-900/5">
        <div className="flex items-center gap-3.5 pb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
              Start a Reading Session
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Upload a book PDF, set chapter targets, and discuss with your book club
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Book Title *
              </label>
              <Input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Great Gatsby"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Author *
              </label>
              <Input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. F. Scott Fitzgerald"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Total Chapters *
              </label>
              <Input
                type="number"
                min={1}
                max={500}
                required
                value={totalChapters}
                onChange={(e) => setTotalChapters(parseInt(e.target.value) || 1)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                Target Finish Date (Optional)
              </label>
              <Input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Book Cover Upload Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Book Cover Image (Optional)
            </label>
            <div className="border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 hover:border-amber-400/80 transition-colors bg-[#FAF9F6] dark:bg-stone-900/50">
              <input
                type="file"
                id="cover-upload"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                className="hidden"
              />
              <label
                htmlFor="cover-upload"
                className="cursor-pointer flex items-center gap-4"
              >
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-linear-to-br from-amber-100 via-amber-200 to-amber-300 dark:from-stone-800 dark:via-stone-700 dark:to-stone-700 flex items-center justify-center flex-shrink-0 shadow-sm border border-amber-200/40 dark:border-stone-700">
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="Selected book cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-amber-800 dark:text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  {coverFile ? (
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{coverFile.name}</span>
                      <span className="text-xs text-stone-400 font-normal flex-shrink-0">
                        ({(coverFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="block text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                        Click to upload a cover image
                      </span>
                      <span className="block text-[11px] text-stone-400 mt-0.5">
                        JPG, PNG or WebP up to 5MB. Without one, sessions use the default book cover.
                      </span>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Book PDF Upload Section */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Book PDF File (Optional)
            </label>
            <div className="border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-6 text-center hover:border-amber-400/80 transition-colors bg-[#FAF9F6] dark:bg-stone-900/50">
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                onChange={handlePdfChange}
                className="hidden"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                {pdfFile ? (
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{pdfFile.name}</span>
                    <span className="text-xs text-stone-400 font-normal">
                      ({(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-stone-800 dark:text-amber-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                      Click to upload book PDF
                    </span>
                    <span className="text-[11px] text-stone-400">
                      PDF documents up to 50MB for members to read directly in the session
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Reading Goals & Overview
            </label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share what this book is about, reading pace (e.g. 2 chapters a week), or discussion expectations..."
              className="resize-none"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="w-full gap-2 shadow-md shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>
                {loading
                  ? uploadStatus || "Publishing Session..."
                  : "Create Reading Session"}
              </span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
