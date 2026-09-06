import type { Metadata } from "next";
import { toolBySlug, toolMetadata } from "../../lib/seo";
import { ToolSeo } from "../../components/ToolSeo";


export const metadata: Metadata = toolMetadata(toolBySlug("readme-viewer")!, "/projects/readme-viewer");

export default function ReadmeViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolSeo slug="readme-viewer" path="/projects/readme-viewer" />
    </>
  );
}
