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
  | "eat"
  | "cuddle";

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

const SCALE = 1.35;
const CAT_W = 30 * SCALE;
const CAT_H = 28 * SCALE;
const GROUND_OFFSET = 40; // px from bottom of viewport
const WALK_SPEED = 1.2;
const RUN_SPEED = 3;

export function PageCat({
  isDark,
  positionRef,
  fedTrigger,
  friendly,
}: {
  isDark: boolean;
  positionRef?: React.MutableRefObject<{ x: number; y: number }>;
  fedTrigger?: number;
  friendly?: boolean;
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
    // Reduced motion: no walking cat. It still exists, it just sits.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#2ee59d";
    const accentAlpha = (alpha: number) =>
      `color-mix(in srgb, ${accent} ${Math.round(alpha * 100)}%, transparent)`;

    // Draw at device resolution so the cat stays crisp on retina screens.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const fit = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const cat = catRef.current;
    cat.y = h - GROUND_OFFSET;
    cat.x = w * 0.3 + Math.random() * w * 0.4;

    const resize = () => {
      const wasOnGround = Math.abs(cat.y - (h - GROUND_OFFSET)) < 5;
      fit();
      // Keep the cat on screen and on the ground when the window changes.
      const groundY = h - GROUND_OFFSET;
      cat.x = Math.max(CAT_W, Math.min(w - CAT_W, cat.x));
      if (wasOnGround || cat.y > groundY) cat.y = groundY;
      // Resizing wipes the canvas. With no animation loop, redraw by hand.
      if (reduceMotion) drawCat(0);
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
    // Chibi proportions: big round head, puffy body, stubby paws.
    // Origin is between the paws on the ground; the cat faces right.
    function drawCat(time: number) {
      ctx.save();
      ctx.translate(cat.x, cat.y);
      if (!cat.facingRight) {
        ctx.scale(-1, 1);
      }

      const s = SCALE;
      const bodyColor = isDark ? "#ebe4d8" : "#7b716a";
      const bellyColor = isDark ? "#f9f5ee" : "#d9d0c6";
      const darkDetail = isDark ? "#4a423b" : "#2b2622";
      const nose = "#f4a6b0";
      const blush = "rgba(255, 140, 150, 0.35)";
      const accentEye = accent;

      const isMoving =
        cat.state === "walk-right" ||
        cat.state === "walk-left" ||
        cat.state === "run-right" ||
        cat.state === "run-left";
      const isRunning = cat.state === "run-right" || cat.state === "run-left";
      const sleeping = cat.state === "sleep";
      const happy = cat.state === "eat" || cat.state === "cuddle";
      // Idle breathing: the whole puff swells a little.
      const breathe = sleeping ? Math.sin(time * 1.5) * 0.6 : Math.sin(time * 2.5) * 0.35;
      // Walk bounce
      const bounce = isMoving ? Math.abs(Math.sin(time * (isRunning ? 12 : 6))) * 1.2 : 0;

      const puff = (x: number, y: number, r: number, color: string) => {
        ctx.beginPath();
        ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };

      // ── Shadow ──
      ctx.beginPath();
      ctx.ellipse(1 * s, 1.5 * s, 13 * s, 2.5 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "rgba(0,0,0,0.35)" : "rgba(30,20,10,0.14)";
      ctx.fill();

      ctx.translate(0, -bounce * s);

      // ── Tail: thick, fluffy, curls up behind ──
      cat.tailPhase += 0.05;
      const tailWag = sleeping
        ? Math.sin(cat.tailPhase * 0.3) * 2
        : isRunning
        ? Math.sin(cat.tailPhase * 3) * 7
        : Math.sin(cat.tailPhase) * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-9 * s, -8 * s);
      ctx.bezierCurveTo(
        -19 * s, -9 * s + tailWag * s * 0.3,
        -22 * s, -19 * s + tailWag * s * 0.4,
        -16 * s + tailWag * s * 0.2, -25 * s + tailWag * s * 0.3
      );
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 5.5 * s;
      ctx.stroke();
      // Lighter fluffy tip
      puff(-16 + tailWag * 0.2, -25 + tailWag * 0.3, 3.4, bellyColor);

      // ── Back legs (stubby, rounded) ──
      const legSpeed = isRunning ? 12 : 6;
      const swing = isMoving ? Math.sin(time * legSpeed) * 2.5 : 0;
      const legRect = (x: number, y: number, w2: number, h2: number, color: string) => {
        ctx.beginPath();
        ctx.roundRect(x * s, y * s, w2 * s, h2 * s, 2.5 * s);
        ctx.fillStyle = color;
        ctx.fill();
      };
      legRect(-9 - swing, -7, 5.5, 8, darkDetail);
      legRect(6 + swing, -7, 5.5, 8, darkDetail);

      // ── Body: an ellipse plus a ring of puffs so the edge looks like fur ──
      const bw = 13 + breathe;
      const bh = 10 + breathe * 0.6;
      ctx.beginPath();
      ctx.ellipse(0, -10 * s, bw * s, bh * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7; // along the belly edge
        puff(Math.cos(a) * (bw - 1.5), -10 + Math.sin(a) * (bh - 1), 3, bodyColor);
      }

      // ── Front legs ──
      legRect(-3 + swing, -6, 5.5, 8, bodyColor);
      legRect(2.5 - swing, -6, 5.5, 8, bodyColor);
      // Toe beans
      for (const px of [-3 + swing, 2.5 - swing]) {
        puff(px + 2.75, 1, 1.6, bellyColor);
      }
      // Back paws peeking
      for (const px of [-9 - swing, 6 + swing]) {
        puff(px + 2.75, 1, 1.6, bellyColor);
      }

      // ── Belly ──
      ctx.beginPath();
      ctx.ellipse(2 * s, -8 * s, 8 * s, 5.5 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = bellyColor;
      ctx.fill();

      // ── Groom: lifted paw ──
      if (cat.state === "groom") {
        const groomCycle = Math.sin(time * 4);
        puff(7, -19 + groomCycle * 2, 3.5, bodyColor);
        puff(7, -19 + groomCycle * 2, 1.4, bellyColor);
      }

      // ── Head: big round, with fluffy cheeks ──
      const hx = 3;
      const hy = -23 + breathe * 0.3;
      const hr = 12;
      // Ears (behind head)
      const ear = (bx: number, tipX: number, tipY: number, ex: number) => {
        ctx.beginPath();
        ctx.moveTo(bx * s, (hy - 6) * s);
        ctx.quadraticCurveTo(((bx + tipX) / 2 - 0.5) * s, (tipY + 2) * s, tipX * s, tipY * s);
        ctx.quadraticCurveTo(((tipX + ex) / 2 + 0.5) * s, (tipY + 2) * s, ex * s, (hy - 5) * s);
        ctx.closePath();
        ctx.fillStyle = bodyColor;
        ctx.fill();
        // inner ear
        ctx.beginPath();
        ctx.moveTo((bx + 1.5) * s, (hy - 7) * s);
        ctx.quadraticCurveTo(((bx + tipX) / 2) * s, (tipY + 3.5) * s, tipX * s, (tipY + 2.5) * s);
        ctx.quadraticCurveTo(((tipX + ex) / 2) * s, (tipY + 3.5) * s, (ex - 1.5) * s, (hy - 6.5) * s);
        ctx.closePath();
        ctx.fillStyle = nose;
        ctx.fill();
      };
      const earFlick = Math.sin(time * 0.7) > 0.97 ? -1.5 : 0;
      ear(hx - 10, hx - 8, hy - 18 + earFlick, hx - 2);
      ear(hx + 3, hx + 9, hy - 18, hx + 11);

      // Cheek fluff
      puff(hx - 10, hy + 3, 6, bodyColor);
      puff(hx + 10, hy + 3, 6, bodyColor);
      puff(hx - 7, hy + 7, 5, bodyColor);
      puff(hx + 7, hy + 7, 5, bodyColor);
      // Head
      puff(hx, hy, hr, bodyColor);
      // Muzzle
      ctx.beginPath();
      ctx.ellipse(hx * s, (hy + 5) * s, 6.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = bellyColor;
      ctx.fill();
      // Forehead tuft
      puff(hx - 1, hy - 10, 2.2, bellyColor);
      puff(hx + 1.5, hy - 10.5, 1.8, bellyColor);

      // ── Blush (always, it is a cute cat) ──
      ctx.fillStyle = blush;
      ctx.beginPath();
      ctx.ellipse((hx - 8) * s, (hy + 4) * s, 3 * s, 1.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse((hx + 8) * s, (hy + 4) * s, 3 * s, 1.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Eyes ──
      const eyL = hx - 4.5;
      const eyR = hx + 4.5;
      const eyY = hy - 1;
      cat.blinkTimer += 0.016;
      if (!cat.isBlinking && cat.blinkTimer > 2.5 + Math.random() * 3) {
        cat.isBlinking = true;
        cat.blinkTimer = 0;
      }
      if (cat.isBlinking && cat.blinkTimer > 0.15) {
        cat.isBlinking = false;
        cat.blinkTimer = 0;
      }

      const closedEyes = (curveUp: boolean) => {
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.4 * s;
        ctx.lineCap = "round";
        for (const ex of [eyL, eyR]) {
          ctx.beginPath();
          if (curveUp) {
            // happy ^ ^
            ctx.arc(ex * s, (eyY + 1) * s, 2.6 * s, Math.PI + 0.35, -0.35, false);
          } else {
            // sleepy u u
            ctx.arc(ex * s, (eyY - 0.5) * s, 2.4 * s, 0.35, Math.PI - 0.35, false);
          }
          ctx.stroke();
        }
      };

      if (sleeping) {
        closedEyes(false);
      } else if (happy) {
        closedEyes(true);
      } else if (cat.isBlinking) {
        ctx.strokeStyle = darkDetail;
        ctx.lineWidth = 1.4 * s;
        for (const ex of [eyL, eyR]) {
          ctx.beginPath();
          ctx.moveTo((ex - 2.5) * s, eyY * s);
          ctx.lineTo((ex + 2.5) * s, eyY * s);
          ctx.stroke();
        }
      } else {
        // Big sparkly eyes that follow the cursor a little.
        let lookX = 0;
        let lookY = 0;
        if (cat.state === "look") {
          const dx = mouseRef.current.x - cat.x;
          const dy = mouseRef.current.y - cat.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            lookX = (dx / dist) * 1 * (cat.facingRight ? 1 : -1);
            lookY = (dy / dist) * 1;
          }
        }
        for (const ex of [eyL, eyR]) {
          // white
          ctx.beginPath();
          ctx.ellipse(ex * s, eyY * s, 3.4 * s, 4 * s, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          // iris
          ctx.beginPath();
          ctx.ellipse((ex + lookX) * s, (eyY + lookY) * s, 2.6 * s, 3.1 * s, 0, 0, Math.PI * 2);
          ctx.fillStyle = accentEye;
          ctx.fill();
          // pupil
          ctx.beginPath();
          ctx.ellipse((ex + lookX) * s, (eyY + lookY + 0.3) * s, 1.5 * s, 2.1 * s, 0, 0, Math.PI * 2);
          ctx.fillStyle = darkDetail;
          ctx.fill();
          // glints
          puff(ex + lookX - 1, eyY + lookY - 1.6, 1, "#ffffff");
          puff(ex + lookX + 1.2, eyY + lookY + 1.4, 0.5, "#ffffff");
        }
      }

      // ── Nose ──
      ctx.beginPath();
      ctx.moveTo((hx - 1.4) * s, (hy + 3.6) * s);
      ctx.lineTo((hx + 1.4) * s, (hy + 3.6) * s);
      ctx.quadraticCurveTo((hx + 0.6) * s, (hy + 5.4) * s, hx * s, (hy + 5.4) * s);
      ctx.quadraticCurveTo((hx - 0.6) * s, (hy + 5.4) * s, (hx - 1.4) * s, (hy + 3.6) * s);
      ctx.fillStyle = nose;
      ctx.fill();

      // ── Mouth: a tiny "w" ──
      ctx.strokeStyle = darkDetail;
      ctx.lineWidth = 0.9 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx * s, (hy + 5.4) * s);
      ctx.lineTo(hx * s, (hy + 6.4) * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc((hx - 1.6) * s, (hy + 6.2) * s, 1.6 * s, 0.1, Math.PI - 0.4, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc((hx + 1.6) * s, (hy + 6.2) * s, 1.6 * s, 0.4, Math.PI - 0.1, false);
      ctx.stroke();

      // ── Whiskers ──
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.45)" : "rgba(43,38,34,0.4)";
      ctx.lineWidth = 0.6 * s;
      for (const [ox, oy, ex, ey] of [
        [-7, 3, -18, 1],
        [-7, 4.5, -18, 5],
        [-7, 6, -17, 8.5],
        [7, 3, 18, 1],
        [7, 4.5, 18, 5],
        [7, 6, 17, 8.5],
      ]) {
        ctx.beginPath();
        ctx.moveTo((hx + ox) * s, (hy + oy) * s);
        ctx.lineTo((hx + ex) * s, (hy + ey) * s);
        ctx.stroke();
      }

      // ── Eat: fish + hearts ──
      if (cat.state === "eat") {
        const eatBounce = Math.sin(time * 8) * 1.5 * s;
        ctx.font = `${10 * s}px serif`;
        ctx.fillText("🐟", (hx + 8) * s, (hy + 9) * s + eatBounce);
        const heartY1 = (hy - 14) * s - cat.stateTime * 20;
        const heartY2 = (hy - 18) * s - cat.stateTime * 15;
        ctx.font = `${6 * s}px serif`;
        ctx.globalAlpha = Math.max(0, 1 - cat.stateTime * 0.6);
        ctx.fillText("❤️", (hx + 12) * s + Math.sin(time * 3) * 3, heartY1);
        ctx.fillText("❤️", (hx - 14) * s + Math.sin(time * 2.5) * 3, heartY2);
        ctx.globalAlpha = 1;
      }

      // ── Cuddle: purring ──
      if (cat.state === "cuddle") {
        const heartPhase = time * 1.5;
        const h1y = (hy - 15) * s + Math.sin(heartPhase) * 4 * s;
        const h2y = (hy - 19) * s + Math.sin(heartPhase + 1) * 4 * s;
        ctx.font = `${5 * s}px serif`;
        ctx.globalAlpha = 0.5 + Math.sin(heartPhase) * 0.3;
        ctx.fillText("❤️", (hx + 12) * s + Math.sin(heartPhase * 0.7) * 3, h1y);
        ctx.globalAlpha = 0.4 + Math.sin(heartPhase + 2) * 0.3;
        ctx.fillText("❤️", (hx - 16) * s + Math.sin(heartPhase * 0.5) * 3, h2y);
        ctx.globalAlpha = 1;
        ctx.font = `${4 * s}px monospace`;
        ctx.fillStyle = accentAlpha(0.3);
        ctx.globalAlpha = 0.3 + Math.sin(time * 3) * 0.2;
        ctx.fillText("prr~", (hx + 14) * s, (hy - 4) * s);
        ctx.globalAlpha = 1;
      }

      // ── Sleep Zzz ──
      if (sleeping) {
        cat.sleepZzz += 0.02;
        const zFloat = Math.sin(cat.sleepZzz) * 3;
        ctx.fillStyle = accentAlpha(0.5);
        ctx.font = `${8 * s}px monospace`;
        ctx.fillText("z", (hx + 12) * s, (hy - 8) * s + zFloat);
        ctx.font = `${6 * s}px monospace`;
        ctx.fillText("z", (hx + 17) * s, (hy - 13) * s - zFloat);
        ctx.font = `${4 * s}px monospace`;
        ctx.fillText("z", (hx + 20) * s, (hy - 16) * s + zFloat * 0.5);
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

      // React to mouse proximity
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const distToMouse = Math.sqrt((mx - cat.x) ** 2 + (my - cat.y + 15) ** 2);

      if (friendly) {
        // Friendly mode: cuddle when cursor is near
        if (
          distToMouse < 80 &&
          cat.state !== "eat" &&
          cat.state !== "cuddle"
        ) {
          cat.state = "cuddle";
          cat.facingRight = mx > cat.x;
          cat.stateTime = 0;
          cat.stateDuration = 999; // stay cuddly as long as cursor is near
        } else if (distToMouse >= 100 && cat.state === "cuddle") {
          // Cursor left — go back to normal but stay chill
          cat.state = "idle";
          cat.stateTime = 0;
          cat.stateDuration = 2 + Math.random() * 2;
        }
      } else {
        // Normal mode: startle if very close
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
      }

      cat.frame++;
      drawCat(time);

      rafRef.current = requestAnimationFrame(animate);
    };

    // Start with a short idle
    cat.state = "idle";
    cat.stateDuration = 2;
    cat.stateTime = 0;

    if (reduceMotion) {
      // Draw once, sitting, and stop.
      cat.state = "sit";
      drawCat(0);
    } else {
      animate();
    }

    // Pause the loop while the tab is hidden; resume when it comes back.
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        cancelAnimationFrame(rafRef.current);
        animate();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isDark, fedTrigger, positionRef, friendly]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-20 pointer-events-none"
      aria-hidden="true"
    />
  );
}
