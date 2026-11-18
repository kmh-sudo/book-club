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
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/10 bg-[#FAF8F5]/85 backdrop-blur-md dark:bg-[#141210]/85 dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/bclogo-icon.png"
            alt=""
            width={40}
            height={40}
            loading="eager"
            decoding="async"
            className="w-10 h-10 rounded-2xl object-cover shadow-md shadow-amber-600/25 group-hover:scale-105 group-hover:rotate-[-2deg] transition-all duration-300"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                BookClub
              </span>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-500">
              Read Together
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            href="/"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              pathname === "/"
                ? "bg-amber-100/80 text-amber-900 dark:bg-stone-800 dark:text-amber-400 shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/40 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Explore
          </Link>

          {user && (
            <Link href="/sessions/new">
              <Button size="sm" className="gap-1.5 shadow-md shadow-amber-600/20">
                <PlusCircle className="w-4 h-4" />
                <span>Create Session</span>
              </Button>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-amber-900/10 dark:border-stone-800">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-amber-100/50 dark:hover:bg-stone-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-amber-500 to-rose-400 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-stone-800 dark:text-stone-200 max-w-[110px] truncate">
                    {profile?.full_name || profile?.username || "Reader"}
                  </span>
                  <span className="block text-[10px] text-amber-600 font-medium">
                    @{profile?.username || "member"}
                  </span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                title="Sign out"
                className="hover:text-red-600 hover:bg-red-50 text-stone-400 dark:hover:bg-stone-800"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="shadow-md shadow-amber-600/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Header Quick Actions */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Link href="/sessions/new">
              <Button size="icon" className="h-9 w-9 rounded-xl shadow-sm">
                <PlusCircle className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-200/60 dark:border-stone-800 px-2 pt-2 pb-safe" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] font-medium rounded-xl transition-all ${
            pathname === "/"
              ? "text-amber-700 dark:text-amber-400 font-bold scale-105"
              : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>Explore</span>
        </Link>

        {user ? (
          <>
            <Link
              href="/sessions/new"
              className={`flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] font-medium rounded-xl transition-all ${
                pathname === "/sessions/new"
                  ? "text-amber-700 dark:text-amber-400 font-bold scale-105"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create</span>
            </Link>
            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] font-medium rounded-xl transition-all ${
                pathname === "/profile"
                  ? "text-amber-700 dark:text-amber-400 font-bold scale-105"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          </>
        ) : (
          <Link
            href="/auth/login"
            className={`flex flex-col items-center gap-1 py-1.5 px-3 text-[11px] font-medium rounded-xl transition-all ${
              pathname.startsWith("/auth")
                ? "text-amber-700 dark:text-amber-400 font-bold scale-105"
                : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
            }`}
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
