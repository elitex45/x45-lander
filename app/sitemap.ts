import type { MetadataRoute } from "next";
import { SITE } from "./lib/seo";
import { isExternal, TOOLS } from "./lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
  ];
  for (const t of TOOLS) {
    pages.push({ url: `${SITE.url}/tools/${t.slug}`, lastModified: new Date(t.added), changeFrequency: "monthly", priority: 0.8 });
    if (!isExternal(t.href)) {
      pages.push({ url: SITE.url + t.href, lastModified: new Date(t.added), changeFrequency: "monthly", priority: 0.9 });
    }
  }
  pages.push({ url: `${SITE.url}/projects/temp-mail/api`, lastModified: now, changeFrequency: "monthly", priority: 0.7 });
  return pages;
}
