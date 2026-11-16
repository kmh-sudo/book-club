import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar, MobileNav } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BookClub — Read & Discuss Together",
  description:
    "Join book reading sessions, track your reading progress with friends, and discuss your thoughts in focused chapter threads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-[#141210] text-stone-900 dark:text-stone-100 selection:bg-amber-200 selection:text-amber-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-10">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
