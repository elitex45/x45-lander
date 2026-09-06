import type { Metadata } from "next";
import { KIND_LABEL, TOOLS, type Tool } from "./tools";

export const SITE = {
  url: "https://www.x45.in",
  name: "elitex45 workshop",
  author: "elitex45",
  github: "https://github.com/elitex45",
  title: "elitex45: Free Open Source Tools for a Slightly Easier Day",
  description:
    "Small free open source tools that do one job well: temp mail, a Pomodoro timer, Markdown to PDF, a private expense tracker and more. No accounts.",
};

const KIND_CATEGORY: Record<Tool["kind"], string> = {
  web: "WebApplication",
  extension: "BrowserApplication",
  mac: "DesktopApplication",
  cli: "DeveloperApplication",
};
const KIND_OS: Record<Tool["kind"], string> = {
  web: "Any",
  extension: "Chrome, Brave, Edge",
  mac: "macOS 14+",
  cli: "macOS, Linux",
};

export function toolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}

/** Metadata for a tool, used by both /tools/[slug] and /projects/* pages. */
export function toolMetadata(tool: Tool, path: string): Metadata {
  const { title, description, keywords } = tool.seo;
  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE.name, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** JSON-LD: the tool as a software application, its FAQ, and the breadcrumb. */
export function toolJsonLd(tool: Tool, path: string) {
  const url = SITE.url + path;
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      description: tool.seo.description,
      url,
      applicationCategory: KIND_CATEGORY[tool.kind],
      operatingSystem: KIND_OS[tool.kind],
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      codeRepository: tool.repo,
      license: "https://opensource.org/licenses/MIT",
      datePublished: tool.added,
      author: { "@type": "Person", name: SITE.author, url: SITE.url },
      featureList: tool.details.join(" "),
      keywords: tool.seo.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.seo.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "elitex45", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Tools", item: SITE.url + "/#tools" },
        { "@type": "ListItem", position: 3, name: tool.name, item: url },
      ],
    },
  ];
}

/** JSON-LD for the home page: the site, its author, and the list of tools. */
export function siteJsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: SITE.url,
      description: SITE.description,
      author: { "@type": "Person", name: SITE.author, url: SITE.url, sameAs: [SITE.github] },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Tools by elitex45",
      itemListElement: TOOLS.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: t.name,
        description: t.desc,
        url: `${SITE.url}/tools/${t.slug}`,
      })),
    },
  ];
}

export const kindLabel = (t: Tool) => KIND_LABEL[t.kind];
