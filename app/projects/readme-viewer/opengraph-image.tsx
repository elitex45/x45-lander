import { OG_SIZE, OG_TYPE, toolBySlug, toolCard } from "../../lib/og";

export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return toolCard(toolBySlug("readme-viewer")!, "/projects/readme-viewer");
}
