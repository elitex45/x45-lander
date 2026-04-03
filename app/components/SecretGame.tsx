"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GamePhase = "idle" | "fish-collected" | "blackout" | "authorized";

interface SecretGameProps {
  catPosition: React.MutableRefObject<{ x: number; y: number }>;
  onFeedCat: () => void;
  isDark: boolean;
}

// ── Synthesize a cat meow using Web Audio API ──
function playMeow() {
  try {
    const ctx = new AudioContext();

    // Main meow oscillator — frequency sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 2;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    // Meow frequency contour: rise then fall
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.15);
    osc.frequency.linearRampToValueAtTime(700, now + 0.3);
    osc.frequency.linearRampToValueAtTime(400, now + 0.5);

    // Amplitude envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.35);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);

    // Filter sweep for natural sound
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.15);
    filter.frequency.linearRampToValueAtTime(600, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.55);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1000, now);
    osc2.frequency.linearRampToValueAtTime(1800, now + 0.15);
    osc2.frequency.linearRampToValueAtTime(800, now + 0.5);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.04, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.5);
  } catch {
    // Audio not available — silent fail
  }
}

export function SecretGame({ catPosition, onFeedCat, isDark }: SecretGameProps) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [fishPos, setFishPos] = useState({ x: 0, y: 0 });
  const [fishVisible, setFishVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [passwordValue, setPasswordValue] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const torchRef = useRef<HTMLDivElement>(null);

  // Place fish at a random spot on initial mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFishPos({
        x: 100 + Math.random() * (window.innerWidth - 200),
        y: window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.3,
      });
    }, 5000); // appear after 5 seconds
    return () => clearTimeout(timeout);
  }, []);

  // Track mouse for torch and fish-following
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // Update torch position directly for performance
      if (torchRef.current) {
        torchRef.current.style.setProperty("--mx", `${e.clientX}px`);
        torchRef.current.style.setProperty("--my", `${e.clientY}px`);
      }
    };
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  // When fish is collected and mouse is near cat → feed
  useEffect(() => {
    if (phase !== "fish-collected") return;

    const check = setInterval(() => {
      const catPos = catPosition.current;
      const dist = Math.sqrt(
        (mousePos.x - catPos.x) ** 2 + (mousePos.y - catPos.y) ** 2
      );

      if (dist < 80) {
        // Feed the cat!
        onFeedCat();
        playMeow();

        // Small delay then blackout
        setTimeout(() => {
          setPhase("blackout");
        }, 1500);
      }
    }, 100);

    return () => clearInterval(check);
  }, [phase, mousePos, catPosition, onFeedCat]);

  // Focus hidden input when blackout starts
  useEffect(() => {
    if (phase === "blackout") {
      // Scroll to very bottom after transition
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 1500);
    }
  }, [phase]);

  const handleFishClick = useCallback(() => {
    if (phase === "idle") {
      setPhase("fish-collected");
    }
  }, [phase]);

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordValue.toLowerCase() === "car") {
        setShowAuth(true);
        setTimeout(() => {
          setPhase("authorized");
        }, 2000);
      } else {
        // Wrong password — shake
        const input = inputRef.current;
        if (input) {
          input.style.animation = "none";
          input.offsetHeight; // force reflow
          input.style.animation = "shake 0.4s ease";
        }
        setPasswordValue("");
      }
    },
    [passwordValue]
  );

  return (
    <>
      {/* ── Floating Fish ── */}
      <AnimatePresence>
        {phase === "idle" && fishVisible && fishPos.x > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -8, 0, 8, 0],
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 0.5 },
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
            onClick={handleFishClick}
            className="fixed z-30 cursor-grab active:cursor-grabbing select-none"
            style={{
              left: fishPos.x,
              top: fishPos.y,
              fontSize: "28px",
              filter: "drop-shadow(0 0 8px rgba(100, 200, 255, 0.4))",
            }}
            aria-label="Pick up fish"
            title="A wild fish appeared..."
          >
            🐟
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Fish following cursor ── */}
      <AnimatePresence>
        {phase === "fish-collected" && (
          <motion.div
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="fixed z-30 pointer-events-none select-none"
            style={{
              left: mousePos.x + 15,
              top: mousePos.y - 15,
              fontSize: "22px",
              filter: "drop-shadow(0 0 12px rgba(100, 200, 255, 0.6))",
            }}
          >
            🐟
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hint text when fish collected ── */}
      <AnimatePresence>
        {phase === "fish-collected" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 text-xs font-mono px-4 py-2 rounded-full"
            style={{
              background: isDark
                ? "rgba(0,0,0,0.7)"
                : "rgba(255,255,255,0.8)",
              color: "var(--accent)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--border)",
            }}
          >
            bring the fish to the cat...
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Blackout Overlay with Torch ── */}
      <AnimatePresence>
        {(phase === "blackout" || (phase === "authorized" && !showAuth)) && (
          <motion.div
            ref={torchRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100]"
            style={{
              background: "black",
              ["--mx" as string]: `${mousePos.x}px`,
              ["--my" as string]: `${mousePos.y}px`,
              maskImage:
                "radial-gradient(circle 120px at var(--mx) var(--my), transparent 60%, rgba(0,0,0,0.3) 80%, black 100%)",
              WebkitMaskImage:
                "radial-gradient(circle 120px at var(--mx) var(--my), transparent 60%, rgba(0,0,0,0.3) 80%, black 100%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Torch glow effect (soft light around cursor) ── */}
      <AnimatePresence>
        {phase === "blackout" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="fixed z-[99] pointer-events-none"
            style={{
              left: mousePos.x - 80,
              top: mousePos.y - 80,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,220,150,0.06) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Hidden Secret Input (below footer, only in blackout) ── */}
      {phase === "blackout" && (
        <div
          className="relative z-[101] flex flex-col items-center justify-center py-20"
          style={{ marginTop: "40px" }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <p
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "rgba(100, 255, 100, 0.5)" }}
            >
              [ classified terminal ]
            </p>
            <form onSubmit={handlePasswordSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="enter password..."
                autoComplete="off"
                spellCheck={false}
                className="bg-transparent border font-mono text-sm px-4 py-2 rounded-lg outline-none w-48 text-center"
                style={{
                  borderColor: "rgba(0, 255, 65, 0.3)",
                  color: "#00ff41",
                  caretColor: "#00ff41",
                  textShadow: "0 0 8px rgba(0,255,65,0.3)",
                }}
              />
              <button
                type="submit"
                className="font-mono text-xs px-3 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: "rgba(0, 255, 65, 0.3)",
                  color: "#00ff41",
                }}
              >
                &gt;
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Authorized Message ── */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.95)" }}
          >
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p
                  className="text-2xl font-mono font-bold mb-2"
                  style={{
                    color: "#00ff41",
                    textShadow:
                      "0 0 20px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.2)",
                  }}
                >
                  &gt; user authorized
                </p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-xs font-mono"
                  style={{ color: "rgba(0,255,65,0.4)" }}
                >
                  access level: classified
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="mt-8"
                >
                  <button
                    onClick={() => {
                      setPhase("idle");
                      setShowAuth(false);
                      setFishVisible(false);
                      setPasswordValue("");
                    }}
                    className="text-xs font-mono px-4 py-2 rounded border transition-all hover:bg-[rgba(0,255,65,0.1)]"
                    style={{
                      borderColor: "rgba(0,255,65,0.3)",
                      color: "rgba(0,255,65,0.6)",
                    }}
                  >
                    [ return ]
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shake animation for wrong password */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </>
  );
}
