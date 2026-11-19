"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Compass,
  LogIn,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/bclogo-icon.png"
            alt=""
            width={40}
            height={40}
            loading="eager"
            decoding="async"
            className="w-10 h-10 rounded-full object-cover ring-1 ring-line shadow-sm shadow-teal/10 group-hover:ring-gold/60 group-hover:-rotate-2 transition-all duration-300"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-[22px] font-semibold leading-none tracking-tight text-ink">
                BookClub
              </span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-gold" />
            </div>
            <span className="mt-1 block type-label text-[10px] tracking-[0.2em] text-gold-ink">
              Read Together
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/"
            className={`relative px-3.5 py-2 rounded-full text-xs font-semibold tracking-wide transition-colors ${
              pathname === "/"
                ? "text-ink bg-sand/70"
                : "text-muted-ink hover:text-ink hover:bg-sand/40"
            }`}
          >
            Explore
            {pathname === "/" && (
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-0.5 w-4 rounded-full bg-gold" />
            )}
          </Link>

          {user && (
            <Link href="/sessions/new">
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Create Session</span>
              </Button>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-line">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-sand/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-teal text-cream flex items-center justify-center font-semibold text-xs ring-1 ring-gold/30">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-ink max-w-[110px] truncate">
                    {profile?.full_name || profile?.username || "Reader"}
                  </span>
                  <span className="block text-[10px] text-gold-ink font-medium">
                    @{profile?.username || "member"}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                title="Sign out"
                className="hover:text-danger"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ml-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Link href="/sessions/new">
              <Button size="icon" className="h-9 w-9">
                <PlusCircle className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="text-xs">
                Log in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] rounded-xl transition-colors ${
      active
        ? "text-gold-ink font-bold"
        : "text-muted-ink font-medium hover:text-ink"
    }`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-card/95 backdrop-blur-lg px-2 pt-2 pb-safe"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around">
        <Link href="/" className={itemClass(pathname === "/")}>
          <Compass className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {user ? (
          <>
            <Link
              href="/sessions/new"
              className={itemClass(pathname === "/sessions/new")}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create</span>
            </Link>
            <Link href="/profile" className={itemClass(pathname === "/profile")}>
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <Link
            href="/auth/login"
            className={itemClass(pathname.startsWith("/auth"))}
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
