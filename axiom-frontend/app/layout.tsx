import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Axiom Trade - Token Discovery Table",
  description: "Discover and trade tokens with real-time data, advanced filtering, and comprehensive analytics.",
  keywords: ["crypto", "tokens", "trading", "defi", "solana", "axiom"],
  authors: [{ name: "Axiom Trade" }],
  openGraph: {
    title: "Axiom Trade - Token Discovery Table",
    description: "Discover and trade tokens with real-time data, advanced filtering, and comprehensive analytics.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-backgroundPrimary text-textPrimary min-h-screen`}
      >
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
