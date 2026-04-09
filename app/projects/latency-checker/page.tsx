"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  computeStats,
  measureLatency,
  normalizeUrl,
  Sample,
  verdictFor,
  VERDICT_TIERS,
} from "./lib/measure";

const LAST_URL_KEY = "x45.latency-checker.last-url";
const SAMPLE_COUNT = 11; // 10 measured + 1 warmup

export default function LatencyCheckerPage() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTestedUrl, setLastTestedUrl] = useState<string | null>(null);

  // Hydrate last URL from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LAST_URL_KEY);
      if (stored) setInput(stored);
    } catch {
      /* noop */
    }
  }, []);

  const stats = useMemo(() => computeStats(samples), [samples]);
  const verdict = useMemo(() => verdictFor(stats.avg), [stats.avg]);

  const handleRun = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const url = normalizeUrl(input);
      if (!url) {
        setError("Invalid URL — try something like polymarket.com");
        return;
      }
      setError(null);
      setSamples([]);
      setRunning(true);
      setLastTestedUrl(url);

      try {
        window.localStorage.setItem(LAST_URL_KEY, input);
      } catch {
        /* noop */
      }

      const collected: Sample[] = [];
      try {
        await measureLatency(url, SAMPLE_COUNT, (sample) => {
          collected.push(sample);
          setSamples([...collected]);
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Measurement failed"
        );
      } finally {
        setRunning(false);
      }
    },
    [input]
  );

  const measuredSamples = samples.filter((s) => !s.isWarmup);
  const warmupSample = samples.find((s) => s.isWarmup);

  // For the sparkline
  const maxTotal = Math.max(
    1,
    ...measuredSamples.filter((s) => s.ok).map((s) => s.total)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
      <header className="mb-6 mt-2">
        <p className="text-[10px] font-mono text-[var(--accent)] tracking-widest uppercase mb-2">
          &gt; ./projects/latency-checker
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fg)]">
          Latency Checker
        </h1>
        <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl leading-relaxed">
          Measures how fast your browser can reach a server. Useful for
          figuring out if your VPS is close enough for HF / momentum
          trading. Runs from this device, not a proxy — what you see is
          what you&apos;d get if your bot lived here.
        </p>
      </header>

      <form onSubmit={handleRun} className="glass-card p-4 mb-4">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
          target url
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={input}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setInput(e.target.value)
            }
            placeholder="polymarket.com"
            disabled={running}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="url"
            className="flex-1 min-w-0 bg-transparent border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={running || !input.trim()}
            className="text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running
              ? `testing ${samples.length}/${SAMPLE_COUNT}…`
              : "test ⟶"}
          </button>
        </div>
        <p className="text-[10px] font-mono text-[var(--muted)] mt-2">
          Runs {SAMPLE_COUNT - 1} measured samples + 1 cold-start warmup
        </p>
        {error && (
          <p className="text-[10px] font-mono text-red-400 mt-2">{error}</p>
        )}
      </form>

      {/* Results */}
      {samples.length > 0 && (
        <div className="space-y-4">
          {/* Verdict */}
          {!running && stats.successCount > 0 && (
            <div
              className="glass-card p-5"
              style={{ borderColor: verdict.color }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
                    verdict
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: verdict.color }}
                  >
                    {verdict.label}
                  </p>
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    {verdict.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
                    average
                  </p>
                  <p
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: verdict.color }}
                  >
                    {stats.avg.toFixed(0)}
                    <span className="text-base ml-1 text-[var(--muted)]">
                      ms
                    </span>
                  </p>
                </div>
              </div>

              {/* Tier scale */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-1 text-[9px] font-mono">
                  {VERDICT_TIERS.map((tier) => {
                    const isActive = tier.id === verdict.id;
                    return (
                      <div
                        key={tier.id}
                        className="flex-1 text-center"
                        style={{
                          opacity: isActive ? 1 : 0.4,
                          color: tier.color,
                        }}
                      >
                        <div
                          className="h-1 rounded-full mb-1"
                          style={{ backgroundColor: tier.color }}
                        />
                        <div className="uppercase tracking-widest">
                          {tier.label}
                        </div>
                        <div className="text-[var(--muted)]">
                          {tier.upperBoundMs === Infinity
                            ? "∞"
                            : `≤${tier.upperBoundMs}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stats grid */}
          {stats.successCount > 0 && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
                &gt; stats ({stats.successCount} samples)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-[10px] font-mono">
                <Stat label="min" value={`${stats.min.toFixed(0)} ms`} />
                <Stat label="p50" value={`${stats.p50.toFixed(0)} ms`} />
                <Stat label="avg" value={`${stats.avg.toFixed(0)} ms`} />
                <Stat label="p95" value={`${stats.p95.toFixed(0)} ms`} />
                <Stat label="max" value={`${stats.max.toFixed(0)} ms`} />
                <Stat
                  label="jitter"
                  value={`±${stats.stddev.toFixed(0)} ms`}
                />
              </div>

              {/* Sparkline */}
              {measuredSamples.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                    samples
                  </p>
                  <div className="flex items-end gap-1 h-12">
                    {measuredSamples.map((sample) => {
                      const heightPct = sample.ok
                        ? Math.max(8, (sample.total / maxTotal) * 100)
                        : 100;
                      return (
                        <div
                          key={sample.index}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: sample.ok
                              ? verdict.color
                              : "#ef4444",
                            opacity: sample.ok ? 0.7 : 0.4,
                          }}
                          title={
                            sample.ok
                              ? `${sample.total.toFixed(0)} ms`
                              : sample.error ?? "failed"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warmup callout */}
          {warmupSample && warmupSample.ok && (
            <div className="text-[10px] font-mono text-[var(--muted)]">
              cold start: {warmupSample.total.toFixed(0)} ms (excluded
              from stats — DNS + TCP + TLS overhead)
            </div>
          )}

          {/* Detailed breakdown if available */}
          {measuredSamples.find(
            (s) => s.dns || s.connect || s.ttfb
          ) && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent)] mb-3">
                &gt; detailed breakdown (last sample)
              </p>
              <BreakdownStrip
                sample={measuredSamples[measuredSamples.length - 1]}
              />
              <p className="text-[10px] font-mono text-[var(--muted)] mt-2">
                Only available when the server sends{" "}
                <code className="text-[var(--fg)]">
                  Timing-Allow-Origin
                </code>
                . Otherwise, only total time is visible.
              </p>
            </div>
          )}

          {/* Failure case */}
          {stats.successCount === 0 && !running && (
            <div className="glass-card p-4 border-red-400/30">
              <p className="text-xs text-red-400 font-mono">
                All samples failed. Common causes:
              </p>
              <ul className="text-[10px] font-mono text-[var(--muted)] mt-2 space-y-1 list-disc list-inside">
                <li>URL is unreachable from your network</li>
                <li>Mixed-content blocking (http URL on https page)</li>
                <li>DNS resolution failed</li>
                <li>The server is hard-blocking your IP</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {!samples.length && lastTestedUrl === null && (
        <div className="glass-card p-6 text-center">
          <p className="text-xs font-mono text-[var(--muted)]">
            Enter a URL above and hit test. Try{" "}
            <code className="text-[var(--fg)]">polymarket.com</code> or your
            target API endpoint.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[var(--muted)] uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-[var(--fg)] tabular-nums text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function BreakdownStrip({ sample }: { sample: Sample | undefined }) {
  if (!sample) return null;
  const parts = [
    { label: "dns", value: sample.dns, color: "#06b6d4" },
    { label: "connect", value: sample.connect, color: "#a855f7" },
    { label: "tls", value: sample.tls, color: "#facc15" },
    { label: "ttfb", value: sample.ttfb, color: "#22c55e" },
    { label: "download", value: sample.download, color: "#fb923c" },
  ].filter((p) => p.value !== undefined && p.value > 0);

  if (parts.length === 0) return null;

  const total = parts.reduce((acc, p) => acc + (p.value ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden border border-[var(--border)]">
        {parts.map((p) => (
          <div
            key={p.label}
            style={{
              width: `${((p.value ?? 0) / total) * 100}%`,
              backgroundColor: p.color,
            }}
            title={`${p.label}: ${(p.value ?? 0).toFixed(1)} ms`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[var(--muted)] uppercase tracking-widest">
              {p.label}
            </span>
            <span className="text-[var(--fg)] tabular-nums ml-auto">
              {(p.value ?? 0).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
