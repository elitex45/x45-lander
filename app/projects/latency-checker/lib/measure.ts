// Pure latency measurement helpers.
//
// Browsers can't do raw ICMP ping, but we can approximate it with
// `fetch()` in `no-cors` mode + `performance.now()` round-trip timing.
// no-cors lets us hit any URL (since we don't read the response body),
// so we don't need the target server to set CORS headers.
//
// For servers that DO set `Timing-Allow-Origin: *`, we can also
// extract a detailed DNS / TCP / TLS / TTFB breakdown via the Resource
// Timing API. Most servers don't, so we fall back to total time only.

export type Sample = {
  index: number;
  total: number;
  // Optional detailed breakdown (only when Timing-Allow-Origin allows)
  dns?: number;
  connect?: number;
  tls?: number;
  ttfb?: number;
  download?: number;
  ok: boolean;
  isWarmup: boolean;
  error?: string;
};

export type LatencyStats = {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  stddev: number;
  successCount: number;
  totalCount: number;
};

export type Verdict = "colocated" | "near" | "medium" | "far" | "unusable";

export type VerdictMeta = {
  id: Verdict;
  label: string;
  description: string;
  color: string;
  upperBoundMs: number;
};

// Tier thresholds tuned for HF / momentum trading. The colocated tier
// is what you get from a VPS in the same datacenter region as the
// target server (e.g. us-east-1 → AWS Northern Virginia). Anything
// above ~250ms is on a different continent and unusable for racing.
export const VERDICT_TIERS: VerdictMeta[] = [
  {
    id: "colocated",
    label: "Colocated",
    description: "Same region — viable for HF / racing",
    color: "#22c55e",
    upperBoundMs: 30,
  },
  {
    id: "near",
    label: "Near",
    description: "Same continent — fine for momentum, marginal for HF",
    color: "#84cc16",
    upperBoundMs: 100,
  },
  {
    id: "medium",
    label: "Medium",
    description: "Cross-continent — too slow for racing, fine for swing",
    color: "#facc15",
    upperBoundMs: 250,
  },
  {
    id: "far",
    label: "Far",
    description: "Globally distant — only useful for slow-moving markets",
    color: "#fb923c",
    upperBoundMs: 500,
  },
  {
    id: "unusable",
    label: "Unusable",
    description: "Too far for any latency-sensitive trading",
    color: "#ef4444",
    upperBoundMs: Infinity,
  },
];

export function verdictFor(avgMs: number): VerdictMeta {
  for (const tier of VERDICT_TIERS) {
    if (avgMs <= tier.upperBoundMs) return tier;
  }
  return VERDICT_TIERS[VERDICT_TIERS.length - 1];
}

// Normalize whatever the user typed into a URL we can fetch. Accepts
// "polymarket.com", "https://polymarket.com", "polymarket.com/api/foo".
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).toString();
    } catch {
      return null;
    }
  }
  try {
    return new URL("https://" + trimmed).toString();
  } catch {
    return null;
  }
}

// Cache-bust query param so the browser hits the network every sample.
function cacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_lat=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function singleSample(
  baseUrl: string,
  index: number,
  isWarmup: boolean
): Promise<Sample> {
  const url = cacheBust(baseUrl);

  // Clear stale entries so getEntriesByName() finds OUR entry.
  try {
    performance.clearResourceTimings();
  } catch {
    /* not all browsers support this */
  }

  const start = performance.now();

  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
      redirect: "follow",
    });
    const total = performance.now() - start;

    // Try to get detailed timing breakdown — only works if the target
    // server set Timing-Allow-Origin (most don't).
    const sample: Sample = { index, total, ok: true, isWarmup };
    try {
      const entries = performance.getEntriesByName(
        url
      ) as PerformanceResourceTiming[];
      if (entries.length > 0) {
        const e = entries[0];
        // Only include the breakdown if it's actually populated. For
        // cross-origin opaque responses, these are mostly 0.
        if (e.domainLookupEnd > 0 && e.domainLookupStart > 0) {
          sample.dns = Math.max(0, e.domainLookupEnd - e.domainLookupStart);
        }
        if (e.connectEnd > 0 && e.connectStart > 0) {
          sample.connect = Math.max(0, e.connectEnd - e.connectStart);
        }
        if (e.secureConnectionStart > 0 && e.connectEnd > 0) {
          sample.tls = Math.max(0, e.connectEnd - e.secureConnectionStart);
        }
        if (e.responseStart > 0 && e.requestStart > 0) {
          sample.ttfb = Math.max(0, e.responseStart - e.requestStart);
        }
        if (e.responseEnd > 0 && e.responseStart > 0) {
          sample.download = Math.max(0, e.responseEnd - e.responseStart);
        }
      }
    } catch {
      /* Resource Timing API not available */
    }
    return sample;
  } catch (err) {
    const total = performance.now() - start;
    return {
      index,
      total,
      ok: false,
      isWarmup,
      error: err instanceof Error ? err.message : "request failed",
    };
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run N samples sequentially. The first sample is marked as a warmup
// and dropped from stats — first connections include DNS lookup, TCP
// setup, and TLS handshake which are amortized over subsequent
// HTTP/2 keepalive requests. HF trading uses warmed connections,
// so the warmed numbers are what matter.
export async function measureLatency(
  url: string,
  sampleCount: number,
  onSample?: (sample: Sample) => void
): Promise<Sample[]> {
  const out: Sample[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const isWarmup = i === 0;
    const sample = await singleSample(url, i, isWarmup);
    out.push(sample);
    onSample?.(sample);
    // 100ms between samples — fast enough to feel snappy, loose
    // enough not to saturate the target server.
    if (i < sampleCount - 1) await sleep(100);
  }
  return out;
}

// Compute stats over the non-warmup successful samples.
export function computeStats(samples: Sample[]): LatencyStats {
  const valid = samples
    .filter((s) => s.ok && !s.isWarmup)
    .map((s) => s.total)
    .sort((a, b) => a - b);

  if (valid.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      p50: 0,
      p95: 0,
      stddev: 0,
      successCount: 0,
      totalCount: samples.length,
    };
  }

  const sum = valid.reduce((acc, n) => acc + n, 0);
  const avg = sum / valid.length;
  const variance =
    valid.reduce((acc, n) => acc + (n - avg) ** 2, 0) / valid.length;
  const stddev = Math.sqrt(variance);

  const percentile = (p: number): number => {
    if (valid.length === 0) return 0;
    const idx = Math.min(
      valid.length - 1,
      Math.floor((p / 100) * valid.length)
    );
    return valid[idx];
  };

  return {
    min: valid[0],
    max: valid[valid.length - 1],
    avg,
    p50: percentile(50),
    p95: percentile(95),
    stddev,
    successCount: samples.filter((s) => s.ok).length,
    totalCount: samples.length,
  };
}
