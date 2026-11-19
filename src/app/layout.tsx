import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar, MobileNav } from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next"

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "BookClub — Read & Discuss Together",
  description:
    "Join book reading sessions, track your reading progress with friends, and discuss your thoughts in focused chapter threads.",

  openGraph: {
    title: 'BookClub — Read & Discuss Together',
    description: 'Join book reading sessions, track your reading progress with friends, and discuss your thoughts in focused chapter threads.',
    url: '/',
    siteName: 'BookClub',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BookClub Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Analytics />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-canvas text-ink selection:bg-sand selection:text-teal">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-10">{children}</main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
