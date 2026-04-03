"use client";

import { useEffect, useRef } from "react";

// ── Types ──
type CatState =
  | "idle"
  | "walk-right"
  | "walk-left"
  | "sit"
  | "sleep"
  | "jump"
  | "look"
  | "groom"
  | "run-right"
  | "run-left"
  | "eat";

interface Cat {
  x: number;
  y: number;
  state: CatState;
  frame: number;
  stateTime: number;
  stateDuration: number;
  targetX: number;
  targetY: number;
  jumpVy: number;
  jumpStartY: number;
  facingRight: boolean;
  blinkTimer: number;
  isBlinking: boolean;
  tailPhase: number;
  groomFrame: number;
  sleepZzz: number;
}

const SCALE = 1.2;
const CAT_W = 30 * SCALE;
const CAT_H = 28 * SCALE;
const GROUND_OFFSET = 40; // px from bottom of viewport
const WALK_SPEED = 1.2;
const RUN_SPEED = 3;

export function PageCat({
  isDark,
  positionRef,
  fedTrigger,
}: {
  isDark: boolean;
  positionRef?: React.MutableRefObject<{ x: number; y: number }>;
  fedTrigger?: number; // increment to trigger eat animation
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFedTrigger = useRef(0);
  const catRef = useRef<Cat>({
    x: 200,
    y: 0,
    state: "idle",
    frame: 0,
    stateTime: 0,
    stateDuration: 3,
    targetX: 200,
    targetY: 0,
    jumpVy: 0,
    jumpStartY: 0,
    facingRight: true,
    blinkTimer: 0,
    isBlinking: false,
    tailPhase: 0,
    groomFrame: 0,
    sleepZzz: 0,
  });
  const mouseRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const cat = catRef.current;
    cat.y = h - GROUND_OFFSET;
    cat.x = w * 0.3 + Math.random() * w * 0.4;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onScroll = () => {
      scrollRef.current = window.scrollY;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── State machine ──
    function pickNextState() {
      const roll = Math.random();
      const groundY = h - GROUND_OFFSET;

      // If sleeping, wake up slowly
      if (cat.state === "sleep") {
        cat.state = "idle";
        cat.stateDuration = 1 + Math.random() * 2;
        return;
      }

      if (roll < 0.25) {
        // Walk
        cat.state = Math.random() > 0.5 ? "walk-right" : "walk-left";
        cat.facingRight = cat.state === "walk-right";
        cat.stateDuration = 3 + Math.random() * 5;
      } else if (roll < 0.4) {
        // Jump to a platform or back to ground
        cat.state = "jump";
        const onGround = Math.abs(cat.y - groundY) < 5;
        if (onGround && Math.random() > 0.3) {
          // Jump up to a random ledge
          cat.targetY = groundY - 80 - Math.random() * 200;
          cat.targetX = cat.x + (Math.random() - 0.5) * 200;
        } else {
          // Jump back to ground
          cat.targetY = groundY;
          cat.targetX = cat.x + (Math.random() - 0.5) * 150;
        }
        cat.targetX = Math.max(CAT_W, Math.min(w - CAT_W, cat.targetX));
        cat.targetY = Math.max(100, cat.targetY);
        cat.jumpVy = -8 - Math.random() * 3;
        cat.jumpStartY = cat.y;
        cat.facingRight = cat.targetX > cat.x;
        cat.stateDuration = 2;
      } else if (roll < 0.55) {
        // Sit
        cat.state = "sit";
        cat.stateDuration = 3 + Math.random() * 4;
      } else if (roll < 0.65) {
        // Sleep (rare)
        cat.state = "sleep";
        cat.stateDuration = 5 + Math.random() * 6;
        cat.sleepZzz = 0;
      } else if (roll < 0.8) {
        // Look at cursor
        cat.state = "look";
        cat.stateDuration = 1.5 + Math.random() * 2;
      } else if (roll < 0.9) {
        // Groom
        cat.state = "groom";
        cat.stateDuration = 2 + Math.random() * 2;
        cat.groomFrame = 0;
      } else {
        // Run! (playful burst)
        cat.state = Math.random() > 0.5 ? "run-right" : "run-left";
        cat.facingRight = cat.state === "run-right";
        cat.stateDuration = 1.5 + Math.random() * 2;
      }

      cat.stateTime = 0;
    }

    // ── Draw cat ──
    function drawCat(time: number) {
      ctx.save();
      ctx.translate(cat.x, cat.y);
      if (!cat.facingRight) {
        ctx.scale(-1, 1);
      }

      const s = SCALE;
      const bodyColor = isDark ? "#c9cdd6" : "#3a3a3a";
      const darkDetail = isDark ? "#8a8f9a" : "#222222";
      const eyeWhite = isDark ? "#ffffff" : "#ffffff";
      const nose = isDark ? "#ffb0b0" : "#ff9090";
      const accentEye = isDark ? "#00ff41" : "#E8552E";

      // ── Tail ──
      cat.tailPhase += 0.06;
      const tailWag =
        cat.state === "sleep"
          ? Math.sin(cat.tailPhase * 0.3) * 3
          : cat.state === "run-right" || cat.state === "run-left"
          ? Math.sin(cat.tailPhase * 3) * 8
          : Math.sin(cat.tailPhase) * 5;

      ctx.beginPath();
      ctx.moveTo(-8 * s, -8 * s);
      ctx.bezierCurveTo(
        -16 * s, -12 * s + tailWag * s * 0.3,
        -20 * s, -20 * s + tailWag * s * 0.2,
        -18 * s + tailWag * s * 0.1, -24 * s + tailWag * s * 0.15
      );
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 2.5 * s;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Body ──
      ctx.beginPath();
      ctx.ellipse(0, -6 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();

      // ── Legs ──
      const isWalking =
        cat.state === "walk-right" ||
        cat.state === "walk-left" ||
        cat.state === "run-right" ||
        cat.state === "run-left";
      const legSpeed =
        cat.state === "run-right" || cat.state === "run-left" ? 12 : 6;
      const legSwing = isWalking ? Math.sin(time * legSpeed) * 3 * s : 0;
      const legY = 0;

      // Front legs
      ctx.fillStyle = darkDetail;
      ctx.fillRect(4 * s + legSwing, legY - 2 * s, 2.5 * s, 6 * s);
      ctx.fillRect(7 * s - legSwing, legY - 2 * s, 2.5 * s, 6 * s);
      // Back legs
      ctx.fillRect(-7 * s - legSwing, legY - 2 * s, 2.5 * s, 6 * s);
      ctx.fillRect(-4 * s + legSwing, legY - 2 * s, 2.5 * s, 6 * s);

      // Paws
      ctx.fillStyle = bodyColor;
      for (const px of [4 + legSwing / s, 7 - legSwing / s, -7 - legSwing / s, -4 + legSwing / s]) {
        ctx.beginPath();
        ctx.arc(px * s + 1.25 * s, legY + 4 * s, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Groom: lifted paw ──
      if (cat.state === "groom") {
        const groomCycle = Math.sin(time * 4);
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(3 * s, -16 * s + groomCycle * 2 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Head ──
      ctx.beginPath();
      ctx.arc(2 * s, -16 * s, 8 * s, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();

      // ── Ears ──
      ctx.beginPath();
      ctx.moveTo(-4 * s, -22 * s);
      ctx.lineTo(-1 * s, -28 * s);
      ctx.lineTo(2 * s, -22 * s);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      // Inner ear
      ctx.beginPath();
      ctx.moveTo(-3 * s, -22 * s);
      ctx.lineTo(-0.5 * s, -26.5 * s);
      ctx.lineTo(1 * s, -22 * s);
      ctx.fillStyle = nose;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(5 * s, -22 * s);
      ctx.lineTo(8 * s, -28 * s);
      ctx.lineTo(10 * s, -22 * s);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6 * s, -22 * s);
      ctx.lineTo(8 * s, -26.5 * s);
      ctx.lineTo(9.5 * s, -22 * s);
      ctx.fillStyle = nose;
      ctx.fill();

      // ── Eyes ──
      cat.blinkTimer += 0.016;
      if (!cat.isBlinking && cat.blinkTimer > 2.5 + Math.random() * 3) {
        cat.isBlinking = true;
        cat.blinkTimer = 0;
      }
      if (cat.isBlinking && cat.blinkTimer > 0.15) {
        cat.isBlinking = false;
        cat.blinkTimer = 0;
      }

      if (cat.state === "sleep") {
        // Closed eyes — two curved lines
        ctx.beginPath();
        ctx.arc(-1 * s, -17 * s, 2 * s, 0, Math.PI, false);
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(5 * s, -17 * s, 2 * s, 0, Math.PI, false);
        ctx.stroke();
      } else if (cat.state === "eat") {
        // Eyes drawn in the eat block above — skip here
      } else if (cat.isBlinking) {
        // Blink — horizontal lines
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-3 * s, -17 * s);
        ctx.lineTo(1 * s, -17 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3 * s, -17 * s);
        ctx.lineTo(7 * s, -17 * s);
        ctx.stroke();
      } else {
        // Open eyes — look toward mouse
        let lookX = 0;
        let lookY = 0;
        if (cat.state === "look") {
          const dx = mouseRef.current.x - cat.x;
          const dy = mouseRef.current.y - cat.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            lookX = (dx / dist) * 1.2 * s * (cat.facingRight ? 1 : -1);
            lookY = (dy / dist) * 1.2 * s;
          }
        }

        // Eye whites
        ctx.beginPath();
        ctx.ellipse(-1 * s, -17 * s, 2.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = eyeWhite;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5 * s, -17 * s, 2.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.ellipse(-1 * s + lookX, -17 * s + lookY, 1.3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fillStyle = accentEye;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(5 * s + lookX, -17 * s + lookY, 1.3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil glint
        ctx.beginPath();
        ctx.arc(-0.5 * s + lookX, -18 * s + lookY, 0.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5.5 * s + lookX, -18 * s + lookY, 0.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Nose ──
      ctx.beginPath();
      ctx.moveTo(2 * s, -14 * s);
      ctx.lineTo(1 * s, -12.5 * s);
      ctx.lineTo(3 * s, -12.5 * s);
      ctx.closePath();
      ctx.fillStyle = nose;
      ctx.fill();

      // ── Mouth ──
      ctx.beginPath();
      ctx.moveTo(2 * s, -12.5 * s);
      ctx.lineTo(0.5 * s, -11 * s);
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 0.8 * s;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2 * s, -12.5 * s);
      ctx.lineTo(3.5 * s, -11 * s);
      ctx.stroke();

      // ── Whiskers ──
      ctx.strokeStyle = isDark ? "#888" : "#999";
      ctx.lineWidth = 0.5 * s;
      for (const [ox, oy, ex, ey] of [
        [-4, -14, -12, -15],
        [-4, -13, -12, -12],
        [8, -14, 16, -15],
        [8, -13, 16, -12],
      ]) {
        ctx.beginPath();
        ctx.moveTo(ox * s, oy * s);
        ctx.lineTo(ex * s, ey * s);
        ctx.stroke();
      }

      // ── Eat: happy squint + fish ──
      if (cat.state === "eat") {
        const eatBounce = Math.sin(time * 8) * 1.5 * s;
        // Fish in mouth
        ctx.font = `${10 * s}px serif`;
        ctx.fillText("\uD83D\uDC1F", 8 * s, -10 * s + eatBounce);
        // Happy squint eyes (^  ^)
        ctx.strokeStyle = accentEye;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.arc(-1 * s, -17 * s, 2.5 * s, Math.PI + 0.3, -0.3, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(5 * s, -17 * s, 2.5 * s, Math.PI + 0.3, -0.3, false);
        ctx.stroke();
        // Blush
        ctx.fillStyle = "rgba(255, 150, 150, 0.35)";
        ctx.beginPath();
        ctx.ellipse(-4 * s, -14 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(8 * s, -14 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hearts floating up
        const heartY1 = -28 * s - cat.stateTime * 20;
        const heartY2 = -32 * s - cat.stateTime * 15;
        ctx.font = `${6 * s}px serif`;
        ctx.globalAlpha = Math.max(0, 1 - cat.stateTime * 0.6);
        ctx.fillText("\u2764\uFE0F", 12 * s + Math.sin(time * 3) * 3, heartY1);
        ctx.fillText("\u2764\uFE0F", -8 * s + Math.sin(time * 2.5) * 3, heartY2);
        ctx.globalAlpha = 1;
      }

      // ── Sleep Zzz ──
      if (cat.state === "sleep") {
        cat.sleepZzz += 0.02;
        const zFloat = Math.sin(cat.sleepZzz) * 3;
        ctx.font = `${8 * s}px monospace`;
        ctx.fillStyle = isDark ? "rgba(0,255,65,0.5)" : "rgba(232,85,46,0.5)";
        ctx.fillText("z", 10 * s, -24 * s + zFloat);
        ctx.font = `${6 * s}px monospace`;
        ctx.fillText("z", 15 * s, -28 * s - zFloat);
        ctx.font = `${4 * s}px monospace`;
        ctx.fillText("z", 18 * s, -30 * s + zFloat * 0.5);
      }

      ctx.restore();
    }

    // ── Main loop ──
    let time = 0;
    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, w, h);

      cat.stateTime += 0.016;
      const groundY = h - GROUND_OFFSET;

      // Update based on state
      switch (cat.state) {
        case "walk-right":
          cat.x += WALK_SPEED;
          if (cat.x > w - CAT_W) {
            cat.facingRight = false;
            cat.state = "walk-left";
          }
          break;
        case "walk-left":
          cat.x -= WALK_SPEED;
          if (cat.x < CAT_W) {
            cat.facingRight = true;
            cat.state = "walk-right";
          }
          break;
        case "run-right":
          cat.x += RUN_SPEED;
          if (cat.x > w - CAT_W) {
            cat.facingRight = false;
            cat.state = "run-left";
          }
          break;
        case "run-left":
          cat.x -= RUN_SPEED;
          if (cat.x < CAT_W) {
            cat.facingRight = true;
            cat.state = "run-right";
          }
          break;
        case "jump": {
          const jumpProgress = cat.stateTime / cat.stateDuration;
          if (jumpProgress < 1) {
            cat.x += ((cat.targetX - cat.x) * 0.03);
            // Parabolic arc
            const arcY =
              cat.jumpStartY +
              (cat.targetY - cat.jumpStartY) * jumpProgress +
              cat.jumpVy * Math.sin(jumpProgress * Math.PI) * 15;
            cat.y = arcY;
          } else {
            cat.y = cat.targetY;
            cat.state = "idle";
            cat.stateTime = 0;
            cat.stateDuration = 1 + Math.random() * 2;
          }
          break;
        }
        case "look": {
          // Face toward mouse
          const dx = mouseRef.current.x - cat.x;
          cat.facingRight = dx > 0;
          break;
        }
      }

      // Gravity when not on ground and not jumping
      if (cat.state !== "jump") {
        if (cat.y < groundY - 2) {
          // Gently fall if platform was scrolled away
          // (keep position — they're on a ledge)
        }
      }

      // Transition when state duration expires
      if (cat.stateTime >= cat.stateDuration && cat.state !== "jump") {
        pickNextState();
      }

      // Expose position
      if (positionRef) {
        positionRef.current = { x: cat.x, y: cat.y };
      }

      // Check for fed trigger
      if (fedTrigger && fedTrigger > lastFedTrigger.current) {
        lastFedTrigger.current = fedTrigger;
        cat.state = "eat";
        cat.stateTime = 0;
        cat.stateDuration = 2;
      }

      // React to mouse proximity — startle if very close (but not while eating)
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const distToMouse = Math.sqrt((mx - cat.x) ** 2 + (my - cat.y + 15) ** 2);
      if (
        distToMouse < 60 &&
        cat.state !== "run-right" &&
        cat.state !== "run-left" &&
        cat.state !== "jump" &&
        cat.state !== "eat"
      ) {
        cat.state = mx > cat.x ? "run-left" : "run-right";
        cat.facingRight = cat.state === "run-right";
        cat.stateDuration = 1.5 + Math.random();
        cat.stateTime = 0;
      }

      cat.frame++;
      drawCat(time);

      rafRef.current = requestAnimationFrame(animate);
    };

    // Start with a short idle
    cat.state = "idle";
    cat.stateDuration = 2;
    cat.stateTime = 0;
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isDark, fedTrigger, positionRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-20 pointer-events-none"
      aria-hidden="true"
    />
  );
}
