"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  tailLength: number;
}

interface LightParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  opacity: number;
  hue: number; // warm hues: 15-45 (gold/amber/peach)
  driftOffset: number;
  driftSpeed: number;
}

export function StarField({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scrollRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();

    // ── Dark mode: stars ──
    const starCount = Math.min(300, Math.floor((w * h) / 5000));
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 3,
        z: Math.random(),
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 2 + 1,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    // ── Shooting stars pool ──
    const shootingStars: ShootingStar[] = [];
    let nextShootingStarTime = 2 + Math.random() * 4;

    const spawnShootingStar = () => {
      const startX = Math.random() * w * 0.8 + w * 0.1;
      const startY = Math.random() * h * 0.3;
      const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.15; // ~35-55 degrees down-right
      const speed = 8 + Math.random() * 6;

      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 50 + Math.random() * 40,
        size: 1.5 + Math.random() * 1.5,
        tailLength: 150 + Math.random() * 100,
      });
    };

    // ── Light mode: warm particles ──
    const particleCount = Math.min(120, Math.floor((w * h) / 12000));
    const lightParticles: LightParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      lightParticles.push({
        x: Math.random() * w,
        y: Math.random() * h * 3,
        vy: -(0.1 + Math.random() * 0.3), // float upward gently
        vx: 0,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.35 + 0.05,
        hue: 15 + Math.random() * 30, // gold to peach
        driftOffset: Math.random() * Math.PI * 2,
        driftSpeed: 0.3 + Math.random() * 0.5,
      });
    }

    // ── Moon properties ──
    const moonX = w * 0.78;
    const moonBaseY = h * 0.15;
    const moonRadius = Math.min(w, h) * 0.045;

    // Crater positions (relative to moon center, normalized -1 to 1)
    const craters = [
      { x: -0.3, y: -0.2, r: 0.18 },
      { x: 0.25, y: 0.15, r: 0.12 },
      { x: -0.1, y: 0.35, r: 0.15 },
      { x: 0.4, y: -0.3, r: 0.1 },
      { x: -0.35, y: 0.1, r: 0.08 },
    ];

    const onScroll = () => { scrollRef.current = window.scrollY; };
    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });

    let time = 0;

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      const scroll = scrollRef.current;
      const mx = (mouseRef.current.x / w - 0.5) * 2;
      const my = (mouseRef.current.y / h - 0.5) * 2;

      if (isDark) {
        // ════════ DARK MODE ════════

        // ── Draw stars ──
        for (const star of stars) {
          const parallax = 0.3 + star.z * 0.7;
          const mouseP = star.z * 8;

          let sx = star.x - mx * mouseP;
          let sy = star.y - scroll * parallax - my * mouseP;

          const totalH = h * 3;
          sy = ((sy % totalH) + totalH) % totalH - h;

          if (sy < -10 || sy > h + 10 || sx < -10 || sx > w + 10) continue;

          const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
          const alpha = star.opacity * twinkle;
          const size = star.size * (0.5 + star.z * 0.5);

          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();

          if (star.z > 0.7 && size > 1) {
            ctx.beginPath();
            ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.1})`;
            ctx.fill();
          }
        }

        // ── Draw moon ──
        const moonParallax = 0.05; // very slow — feels distant
        const moonMouseP = 3;
        const moonY = moonBaseY - scroll * moonParallax - my * moonMouseP;
        const moonXPos = moonX - mx * moonMouseP;

        // Outer glow
        const glowGrad = ctx.createRadialGradient(moonXPos, moonY, moonRadius * 0.8, moonXPos, moonY, moonRadius * 4);
        glowGrad.addColorStop(0, "rgba(200, 210, 230, 0.08)");
        glowGrad.addColorStop(0.5, "rgba(200, 210, 230, 0.03)");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(moonXPos - moonRadius * 4, moonY - moonRadius * 4, moonRadius * 8, moonRadius * 8);

        // Moon body
        ctx.beginPath();
        ctx.arc(moonXPos, moonY, moonRadius, 0, Math.PI * 2);
        const moonGrad = ctx.createRadialGradient(
          moonXPos - moonRadius * 0.2, moonY - moonRadius * 0.2, 0,
          moonXPos, moonY, moonRadius
        );
        moonGrad.addColorStop(0, "rgba(230, 235, 245, 0.95)");
        moonGrad.addColorStop(0.7, "rgba(200, 210, 230, 0.85)");
        moonGrad.addColorStop(1, "rgba(170, 185, 210, 0.75)");
        ctx.fillStyle = moonGrad;
        ctx.fill();

        // Craters
        for (const crater of craters) {
          const cx = moonXPos + crater.x * moonRadius;
          const cy = moonY + crater.y * moonRadius;
          const cr = crater.r * moonRadius;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(150, 165, 190, 0.3)";
          ctx.fill();
        }

        // Inner glow ring
        ctx.beginPath();
        ctx.arc(moonXPos, moonY, moonRadius * 1.15, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200, 215, 240, 0.12)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // ── Shooting stars ──
        nextShootingStarTime -= 0.016;
        if (nextShootingStarTime <= 0) {
          spawnShootingStar();
          nextShootingStarTime = 3 + Math.random() * 6;
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const ss = shootingStars[i];
          ss.x += ss.vx;
          ss.y += ss.vy;
          ss.life++;

          const progress = ss.life / ss.maxLife;
          const fade = progress < 0.1
            ? progress / 0.1
            : progress > 0.7
            ? 1 - (progress - 0.7) / 0.3
            : 1;

          if (ss.life >= ss.maxLife || ss.x > w + 50 || ss.y > h + 50) {
            shootingStars.splice(i, 1);
            continue;
          }

          // Draw long streaming tail as a tapered line
          const speed = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
          const dirX = ss.vx / speed;
          const dirY = ss.vy / speed;
          const tailLen = ss.tailLength * fade;

          // Gradient tail using multiple segments
          const segments = 24;
          for (let t = 0; t < segments; t++) {
            const t0 = t / segments;
            const t1 = (t + 1) / segments;
            const x0 = ss.x - dirX * tailLen * t0;
            const y0 = ss.y - dirY * tailLen * t0;
            const x1 = ss.x - dirX * tailLen * t1;
            const y1 = ss.y - dirY * tailLen * t1;
            const alpha = fade * (1 - t0) * 0.7;
            const width = ss.size * 2 * (1 - t0 * 0.9);

            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = width;
            ctx.lineCap = "round";
            ctx.stroke();
          }

          // Bright head
          ctx.beginPath();
          ctx.arc(ss.x, ss.y, ss.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.95})`;
          ctx.fill();

          // Head glow
          ctx.beginPath();
          ctx.arc(ss.x, ss.y, ss.size * 5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 220, 255, ${fade * 0.12})`;
          ctx.fill();
        }
      } else {
        // ════════ LIGHT MODE — golden hour particles ════════

        for (const p of lightParticles) {
          const parallax = 0.2 + (p.size / 4) * 0.5;
          const mouseP = (p.size / 4) * 5;

          let px = p.x + Math.sin(time * p.driftSpeed + p.driftOffset) * 20 - mx * mouseP;
          let py = p.y - scroll * parallax - my * mouseP + time * p.vy * 60;

          const totalH = h * 3;
          py = ((py % totalH) + totalH) % totalH - h;

          if (py < -20 || py > h + 20 || px < -20 || px > w + 20) continue;

          const twinkle = Math.sin(time * 1.5 + p.driftOffset) * 0.3 + 0.7;
          const alpha = p.opacity * twinkle;

          // Warm glow
          ctx.beginPath();
          ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha * 0.15})`;
          ctx.fill();

          // Core particle
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${alpha})`;
          ctx.fill();
        }

        // ── Sun glow (top-right, light mode) ──
        const sunX = w * 0.82;
        const sunY = h * 0.08 - scroll * 0.03;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.5);
        sunGrad.addColorStop(0, "rgba(255, 180, 80, 0.12)");
        sunGrad.addColorStop(0.3, "rgba(255, 140, 100, 0.06)");
        sunGrad.addColorStop(0.6, "rgba(255, 120, 140, 0.03)");
        sunGrad.addColorStop(1, "transparent");
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, w, h);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
