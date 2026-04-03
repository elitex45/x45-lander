import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Guru — On-chain intelligence builder",
  description:
    "Co-founder @zerufinance. Building at the intersection of crypto and AI — wallet reputation scoring, on-chain behavioral analysis, agent identity.",
  openGraph: {
    title: "Guru — On-chain intelligence builder",
    description:
      "Co-founder @zerufinance. Building at the intersection of crypto and AI.",
    url: "https://x45.in",
    siteName: "Guru",
  },
  twitter: {
    card: "summary",
    site: "@elitex45",
    creator: "@elitex45",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}