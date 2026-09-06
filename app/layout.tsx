import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
import { NO_FLASH_SCRIPT } from "./lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.x45.in"),
  title: "elitex45. Small tools for a slightly easier day.",
  description:
    "Free, open-source browser tools that do one job well: a focus timer, a Markdown to PDF viewer, and a private expense tracker.",
  twitter: { card: "summary_large_image" },
  openGraph: {
    title: "elitex45. Small tools for a slightly easier day.",
    description:
      "Free, open-source browser tools that do one job well. No accounts, no servers.",
    url: "https://www.x45.in",
    siteName: "elitex45 workshop",
    images: [
      {
        url: "/og.jpg",
        width: 1600,
        height: 840,
        alt: "elitex45: small tools for a slightly easier day.",
      },
    ],
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
