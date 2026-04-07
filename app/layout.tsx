import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
import { NO_FLASH_SCRIPT } from "./lib/theme";

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
        {/* Set the theme class before React hydrates to prevent FOUC.
            next/script with strategy="beforeInteractive" injects this
            outside React's render tree, which avoids the React 19 warning
            about <script> tags inside React components. */}
        <Script
          id="theme-no-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}