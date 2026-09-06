import type { NextConfig } from "next";

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_ASSETS = POSTHOG_HOST.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old index page duplicated the home page; the tools live there now.
      { source: "/projects", destination: "/#tools", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // PostHog goes through this domain so blockers do not eat it.
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
  },
  // PostHog endpoints end with a slash; do not redirect them.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
