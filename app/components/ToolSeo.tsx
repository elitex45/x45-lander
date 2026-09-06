import { toolBySlug, toolJsonLd } from "../lib/seo";
import { JsonLd } from "./JsonLd";
import { ToolFaq } from "./ToolFaq";

/** Drop-in for a project page: JSON-LD plus the visible FAQ. */
export function ToolSeo({ slug, path, faq = true }: { slug: string; path: string; faq?: boolean }) {
  const tool = toolBySlug(slug);
  if (!tool) return null;
  return (
    <>
      <JsonLd data={toolJsonLd(tool, path)} />
      {faq && (
        <div className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
          <hr className="rule" />
          <ToolFaq tool={tool} className="pt-10" />
        </div>
      )}
    </>
  );
}
