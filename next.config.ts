import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old index page duplicated the home page; the tools live there now.
      { source: "/projects", destination: "/#tools", permanent: true },
    ];
  },
};

export default nextConfig;
