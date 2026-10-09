// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Admin-managed stream blocklist: plain-substring patterns served by
// GET /api/blocked-patterns ([{ id, pattern }]). Cached per page load with
// single-flight fetch (3s timeout). Fail-silent by design: callers get
// string[] and never break when the API is down. Matching stays
// substring-based; this module only transports literal text.
let cached = null;
let inflight = null;

async function fetchBlockedPatterns() {
    if (cached !== null) return cached;
    if (inflight !== null) return inflight;
    inflight = (async () => {
        try {
            const response = await fetch('/api/blocked-patterns', {
                signal: AbortSignal.timeout(3000),
            });
            if (!response.ok) return [];
            const body = await response.json();
            if (!Array.isArray(body)) return [];
            const patterns = [];
            for (const entry of body) {
                if (entry && typeof entry.pattern === 'string' && entry.pattern.length > 0) {
                    patterns.push(entry.pattern);
                }
            }
            return patterns;
        } catch {
            return [];
        }
    })();
    try {
        cached = await inflight;
    } finally {
        inflight = null;
    }
    return cached;
}

function clearBlockedPatternsCache() {
    cached = null;
    inflight = null;
}

module.exports = { fetchBlockedPatterns, clearBlockedPatternsCache };
