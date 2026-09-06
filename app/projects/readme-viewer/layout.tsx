import type { Metadata } from "next";

const title = "README viewer — elitex45";
const description = "Write Markdown, see the document, export a clean PDF.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "elitex45 workshop", url: "/projects/readme-viewer" },
  twitter: { card: "summary_large_image", title, description },
};

export default function ReadmeViewerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
