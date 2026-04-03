"use client";

import { useEffect, useRef } from "react";

export function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let x = -500;
    let y = -500;
    let currentX = -500;
    let currentY = -500;
    let raf: number;

    const onMouse = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    const animate = () => {
      // Smooth follow with lerp
      currentX += (x - currentX) * 0.08;
      currentY += (y - currentY) * 0.08;
      el.style.left = `${currentX}px`;
      el.style.top = `${currentY}px`;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={glowRef} className="cursor-glow hidden md:block" aria-hidden="true" />;
}
