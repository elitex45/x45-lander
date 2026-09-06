import { notFound } from "next/navigation";
import { OG_SIZE, OG_TYPE, toolBySlug, toolCard } from "../../lib/og";
import { TOOLS } from "../../lib/tools";

export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) notFound();
  return toolCard(tool, `/tools/${tool.slug}`);
}
