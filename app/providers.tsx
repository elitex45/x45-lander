"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import { ThemeProvider } from "./lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* reducedMotion="user" makes every framer animation respect the OS setting. */}
      {/* LazyMotion + m.* ships only the animation features we use, not the whole library. */}
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </ThemeProvider>
  );
}
