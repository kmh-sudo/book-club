import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar, MobileNav } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Book Club — Read & Discuss Together",
  description:
    "Join book reading sessions, track your reading progress with friends, and discuss your thoughts in focused chapter threads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-amber-200 selection:text-amber-900 font-sans"
      >
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-16 md:pb-8">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
