"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface ScrambleTextProps {
  text: string;
  className?: string;
  speed?: number;
  charset?: string;
}

const DEFAULT_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*<>[]{}";

export function ScrambleText({
  text,
  className = "",
  speed = 30,
  charset = DEFAULT_CHARSET,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const [displayed, setDisplayed] = useState(text.replace(/[^ ]/g, " "));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const chars = text.split("");
    const totalChars = chars.length;
    const revealOrder: number[] = [];

    // Build reveal order (left to right with slight randomness)
    for (let i = 0; i < totalChars; i++) {
      revealOrder.push(i);
    }

    let revealed = 0;
    let tick = 0;
    const revealEvery = 2; // reveal one char every N ticks

    const interval = setInterval(() => {
      tick++;

      const result = chars.map((char, i) => {
        if (char === " ") return " ";
        if (i < revealed) return char;
        // Scramble unrevealed characters
        return charset[Math.floor(Math.random() * charset.length)];
      });

      if (tick % revealEvery === 0) {
        revealed++;
      }

      setDisplayed(result.join(""));

      if (revealed >= totalChars) {
        setDisplayed(text);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isInView, text, speed, charset]);

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  );
}
