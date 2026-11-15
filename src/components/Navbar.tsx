"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BookOpen, PlusCircle, Compass, LogIn, LogOut, User } from "lucide-react";

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/10 bg-amber-50/80 backdrop-blur-md dark:bg-stone-900/80 dark:border-stone-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              BookClub
            </span>
            <span className="block text-[10px] uppercase font-semibold tracking-widest text-amber-600 dark:text-amber-500">
              Read Together
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/"
                ? "bg-amber-100 text-amber-900 dark:bg-stone-800 dark:text-amber-400"
                : "text-stone-600 hover:text-stone-900 hover:bg-amber-100/50 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800"
            }`}
          >
            Explore
          </Link>

          {user && (
            <Link
              href="/sessions/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Session</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-amber-900/10 dark:border-stone-800">
              <Link
                href="/profile"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-amber-100/50 dark:hover:bg-stone-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-stone-700 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                  {profile?.username?.charAt(0).toUpperCase() || (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 max-w-[120px] truncate">
                  {profile?.full_name || profile?.username || "Reader"}
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-stone-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-100/50 dark:text-stone-300 dark:hover:bg-stone-800 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 shadow-sm transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Header Quick Actions */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Link
              href="/sessions/new"
              className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-sm"
              aria-label="New Session"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="p-2 text-amber-800 dark:text-amber-400 hover:bg-amber-100/60 rounded-lg text-sm font-medium"
            >
              Log in
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-amber-900/10 dark:border-stone-800 px-4 py-2">
      <div className="flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
            pathname === "/"
              ? "text-amber-700 dark:text-amber-400 font-semibold"
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
              className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
                pathname === "/sessions/new"
                  ? "text-amber-700 dark:text-amber-400 font-semibold"
                  : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create</span>
            </Link>
            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
                pathname === "/profile"
                  ? "text-amber-700 dark:text-amber-400 font-semibold"
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
            className={`flex flex-col items-center gap-1 py-1 px-3 text-xs font-medium rounded-lg transition-colors ${
              pathname.startsWith("/auth")
                ? "text-amber-700 dark:text-amber-400 font-semibold"
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
