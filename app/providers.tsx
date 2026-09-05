"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "./lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* reducedMotion="user" makes every framer animation respect the OS setting. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
