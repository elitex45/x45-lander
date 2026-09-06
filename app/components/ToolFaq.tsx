import type { Tool } from "../lib/tools";

/** Visible questions and answers. The same text goes out as FAQPage JSON-LD. */
export function ToolFaq({ tool, className = "" }: { tool: Tool; className?: string }) {
  return (
    <section aria-labelledby={`faq-${tool.slug}`} className={className}>
      <h2 id={`faq-${tool.slug}`} className="text-lg font-semibold tracking-tight">
        Questions about {tool.name}
      </h2>
      <dl className="mt-4 divide-y divide-[var(--border)]">
        {tool.seo.faq.map((f) => (
          <div key={f.q} className="grid gap-2 py-4 sm:grid-cols-12 sm:gap-6">
            <dt className="text-[15px] font-medium sm:col-span-5">{f.q}</dt>
            <dd className="text-[14px] leading-relaxed text-[var(--muted)] sm:col-span-7">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
