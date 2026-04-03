"use client";

import { motion } from "framer-motion";

interface CharacterStaggerProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "h1" | "p" | "span";
}

export function CharacterStagger({
  text,
  className = "",
  delay = 0,
  stagger = 0.035,
  as: Tag = "span",
}: CharacterStaggerProps) {
  const chars = text.split("");

  return (
    <Tag className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={`${i}-${char}`}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.5,
            delay: delay + i * stagger,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="inline-block"
          style={{ whiteSpace: char === " " ? "pre" : undefined }}
        >
          {char}
        </motion.span>
      ))}
    </Tag>
  );
}
