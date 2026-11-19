"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        if (
          signInError.message.toLowerCase().includes("invalid login credentials") ||
          signInError.status === 400
        ) {
          setError(
            "Invalid email or password. If you haven't verified your email yet, please check your inbox or confirm your account in Supabase."
          );
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-sand/50 blur-3xl pointer-events-none"
      />
      <Card className="relative w-full max-w-md p-7 sm:p-9 shadow-[0_2px_4px_rgba(38,59,63,0.04),0_40px_80px_-48px_rgba(38,59,63,0.5)]">
        <div className="text-center mb-8">
          <img
            src="/bclogo-icon.png"
            alt="BookClub"
            width={64}
            height={64}
            className="inline-block w-16 h-16 rounded-full ring-1 ring-line shadow-sm mb-4"
          />
          <p className="type-label text-gold-ink mb-2">Read Together</p>
          <h1 className="type-h1 text-[28px] text-ink">Welcome Back</h1>
          <p className="type-small text-muted-ink mt-2">
            Sign in to access your reading sessions and discussions
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-danger/10 border border-danger/25 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-danger">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block type-label text-muted-ink mb-1.5">
              Email Address
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block type-label text-muted-ink mb-1.5">
              Password
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full gap-2 mt-2"
          >
            <span>{loading ? "Signing in..." : "Sign In"}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        <p className="mt-8 text-center type-small text-muted-ink">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/auth/register"
            className="text-gold-ink font-bold hover:underline"
          >
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
