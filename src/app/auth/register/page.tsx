"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data?.session) {
        router.push("/");
        router.refresh();
      } else {
        setRegisteredSuccess(true);
      }
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
          <h1 className="type-h1 text-[28px] text-ink">Join the Club</h1>
          <p className="type-small text-muted-ink mt-2">
            Read with peers, share perspectives, and reach your goals
          </p>
        </div>

        {registeredSuccess ? (
          <div className="p-5 bg-sage-soft border border-sage/30 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-sage mx-auto" />
            <h2 className="font-serif text-lg font-semibold text-ink">
              Account Created!
            </h2>
            <p className="type-small text-muted-ink leading-relaxed">
              If email verification is enabled on your project, please check your inbox to confirm, then sign in.
            </p>
            <Link href="/auth/login" className="inline-block pt-1">
              <Button size="sm">Go to Sign In</Button>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3.5 bg-danger/10 border border-danger/25 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-danger">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block type-label text-muted-ink mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block type-label text-muted-ink mb-1.5">
                  Username
                </label>
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="janereads"
                />
              </div>

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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full gap-2 mt-2"
              >
                <span>{loading ? "Creating Account..." : "Create Account"}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <p className="mt-8 text-center type-small text-muted-ink">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-gold-ink font-bold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
