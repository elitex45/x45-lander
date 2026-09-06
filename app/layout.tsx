import type { Metadata } from "next";
import Script from "next/script";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";
import { NO_FLASH_SCRIPT } from "./lib/theme";
import { SITE, siteJsonLd } from "./lib/seo";
import { JsonLd } from "./components/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s | elitex45" },
  description: SITE.description,
  keywords: ["free tools", "open source tools", "temp mail", "pomodoro timer", "markdown to pdf", "expense tracker", "clipboard manager mac", "tweet exporter", "elitex45"],
  authors: [{ name: SITE.author, url: SITE.url }],
  creator: SITE.author,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: "en_IN",
    images: [{ url: "/og.jpg", width: 1600, height: 840, alt: "elitex45: small tools for a slightly easier day." }],
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
        <JsonLd data={siteJsonLd()} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
