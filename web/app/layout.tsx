import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VibeTogether — Listen Together. Anywhere.",
  description:
    "Real-time synchronized Spotify listening rooms. Share a song, share a moment, with friends across the world.",
  openGraph: {
    title: "VibeTogether",
    description: "Listen Together. Anywhere.",
    type: "website",
  },
  metadataBase: new URL("http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#06070C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans antialiased text-white selection:bg-neon-green/30">
        {children}
      </body>
    </html>
  );
}
