import type { MetadataRoute } from "next";
import { SITE } from "./lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everyone, including AI crawlers, may read the pages. Mail data is behind tokens anyway.
      { userAgent: "*", allow: "/", disallow: ["/api/temp-mail/inbox", "/api/temp-mail/wait", "/ingest/"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
