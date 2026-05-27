import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lenzyii Anime - Watch Anime Online Free",
  description: "Lenzyii Anime - Streaming anime terbaru dan terlengkap dengan subtitle Indonesia. Nonton anime gratis, kualitas terbaik, update cepat.",
  keywords: ["Lenzyii Anime", "anime streaming", "nonton anime", "anime sub indo", "anime gratis", "watch anime online", "streaming anime", "anime 2025"],
  authors: [{ name: "Lenzyii Anime" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
  openGraph: {
    title: "Lenzyii Anime - Watch Anime Online Free",
    description: "Streaming anime terbaru dan terlengkap dengan subtitle Indonesia.",
    siteName: "Lenzyii Anime",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lenzyii Anime",
    description: "Streaming anime terbaru dan terlengkap.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: '#0a0a0f', color: '#e2e8f0', overflowX: 'hidden' }}
      >
        {children}
      </body>
    </html>
  );
}
