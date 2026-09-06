import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { KIND_LABEL, TOOLS, type Tool } from "./tools";

// One share card design for every tool page. 1200x630, the size X,
// WhatsApp, Slack and friends all understand.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

// Light palette from globals.css, hard-coded because CSS vars do not
// exist inside the image renderer.
const C = {
  bg: "#f3f1ec",
  surface: "#fbfaf7",
  fg: "#191816",
  muted: "#6e6a63",
  border: "#e3dfd6",
  accent: "#c4470f",
  accentDim: "rgba(196,71,15,0.10)",
};

async function font(file: string) {
  return readFile(join(process.cwd(), "assets/fonts", file));
}

export function toolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Render the card for one tool. */
export async function toolCard(tool: Tool, path: string) {
  const [semi, regular, mono] = await Promise.all([
    font("Geist-SemiBold.ttf"),
    font("Geist-Regular.ttf"),
    font("GeistMono-Regular.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: C.bg,
          color: C.fg,
          fontFamily: "Geist",
          position: "relative",
        }}
      >
        {/* faint grid, like the site */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
            backgroundSize: "88px 88px",
            opacity: 0.6,
          }}
        />
        {/* warm glow top right */}
        <div
          style={{
            position: "absolute",
            top: -220,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${C.accentDim} 0%, rgba(196,71,15,0) 70%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "64px 72px",
          }}
        >
          {/* top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26 }}>
              <span style={{ fontWeight: 600 }}>elitex45</span>
              <span style={{ color: C.muted }}>/</span>
              <span style={{ fontFamily: "Geist Mono", color: C.muted, fontSize: 22 }}>tools</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 9999,
                border: `1.5px solid ${C.border}`,
                background: C.surface,
                fontFamily: "Geist Mono",
                fontSize: 20,
                color: C.muted,
              }}
            >
              {KIND_LABEL[tool.kind]}
            </div>
          </div>

          {/* title + blurb */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
            <div style={{ fontSize: 96, fontWeight: 600, letterSpacing: -4.5, lineHeight: 1.0 }}>
              {tool.name}
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.35, color: C.muted, fontWeight: 400 }}>
              {tool.desc}
            </div>
          </div>

          {/* bottom row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "Geist Mono",
                fontSize: 22,
                color: C.accent,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 9999, background: C.accent }} />
              x45.in{path}
            </div>
            <div style={{ fontSize: 22, color: C.muted }}>free · open source</div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: semi, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
