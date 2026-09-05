import { ArrowUpRightIcon, GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "../../components/SiteNav";
import { isExternal, KIND_LABEL, TOOLS } from "../../lib/tools";

/** One page per tool, so a single tool can be shared by link. */
export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) return {};
  const title = `${tool.name}. ${KIND_LABEL[tool.kind]} by elitex45.`;
  return {
    title,
    description: tool.desc,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: {
      title,
      description: tool.desc,
      url: `/tools/${tool.slug}`,
      siteName: "elitex45 workshop",
      images: [{ url: "/og.jpg", width: 1600, height: 840, alt: tool.name }],
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS.find((t) => t.slug === slug);
  if (!tool) notFound();

  const external = isExternal(tool.href);
  const others = TOOLS.filter((t) => t.slug !== tool.slug);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="lamp" aria-hidden="true" />
      <SiteNav current={tool.slug} />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid gap-10 pt-10 lg:grid-cols-12 lg:gap-8 lg:pt-16">
          <div className="flex flex-col justify-center lg:col-span-5 lg:pr-6">
            <p className="font-mono text-xs text-[var(--muted)]">
              {KIND_LABEL[tool.kind]}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.02] tracking-tighter sm:text-5xl">
              {tool.name}
            </h1>
            <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              {tool.desc}
            </p>

            <ul className="mt-8 space-y-3 text-[15px] leading-relaxed text-[var(--fg)]">
              {tool.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span
                    className="mt-[0.7em] h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {external ? (
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--fg)] px-5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                >
                  <GithubLogoIcon size={16} weight="bold" aria-hidden="true" />
                  {tool.cta}
                </a>
              ) : (
                <>
                  <Link
                    href={tool.href}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--fg)] px-5 text-sm font-medium text-[var(--bg)] transition-transform hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                  >
                    {tool.cta}
                    <ArrowUpRightIcon size={16} weight="bold" aria-hidden="true" />
                  </Link>
                  <a
                    href={tool.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-5 text-sm font-medium text-[var(--fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                  >
                    <GithubLogoIcon size={16} weight="bold" aria-hidden="true" />
                    Source
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="tool-card min-h-[380px]">
              <div className="tool-preview" aria-hidden="true">
                {tool.preview ?? (
                  <div className="flex h-full items-center justify-center font-mono text-xs text-[var(--muted)]">
                    {KIND_LABEL[tool.kind]}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 font-mono text-[11px] text-[var(--muted)]">
                preview
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 border-t border-[var(--border)] pt-10">
          <div className="mb-6 flex items-end justify-between gap-6">
            <h2 className="text-lg font-semibold tracking-tight">Other tools</h2>
            <Link
              href="/#tools"
              className="font-mono text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
            >
              all tools
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  className="tool-card group block px-4 py-3 transition-colors"
                >
                  <p className="text-sm font-semibold tracking-tight">{t.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                    {KIND_LABEL[t.kind]}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
