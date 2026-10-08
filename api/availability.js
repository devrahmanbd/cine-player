// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Shared availability resolver: used by server.js refresh route and worker.js.
// Zero-dep (global fetch, db.js abstraction).
function manifestBase(manifestUrl) {
    if (typeof manifestUrl !== 'string' || manifestUrl.length === 0) return null;
    let base = manifestUrl.trim();
    if (base.endsWith('/manifest.json')) base = base.slice(0, -'/manifest.json'.length);
    base = base.replace(/\/+$/, '');
    if (base.length === 0) return null;
    try {
        const parsed = new URL(base);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    } catch {
        return null;
    }
    return base;
}

async function fetchJson(url, timeoutMs) {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`bad status ${response.status}`);
    return response.json();
}

const PROBE_TIMEOUT_MS = 8000;
const PROBE_MAX_URLS = 5;
const PROBE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Liveness probe: a listed stream counts only if its file responds.
// HEAD first (cheap); hosts rejecting HEAD (405/501) fall back to a
// single-byte ranged GET. Accept 200/206. Anything else (404, expired
// signatures, timeouts, non-http) = dead.
async function probeStreamUrl(url) {
    if (typeof url !== 'string') return false;
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const headers = { 'user-agent': PROBE_UA };
    try {
        const head = await fetch(url, { method: 'HEAD', headers, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
        if (head.status === 200 || head.status === 206) return true;
        if (head.status !== 405 && head.status !== 501) return false;
    } catch {
        return false;
    }
    try {
        const ranged = await fetch(url, {
            headers: { ...headers, range: 'bytes=0-0' },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        return ranged.status === 200 || ranged.status === 206;
    } catch {
        return false;
    }
}

async function countAliveUrls(urls) {
    const sample = [];
    const seen = new Set();
    for (const url of urls) {
        if (typeof url !== 'string' || seen.has(url)) continue;
        seen.add(url);
        sample.push(url);
        if (sample.length >= PROBE_MAX_URLS) break;
    }
    const results = await Promise.all(sample.map((url) => probeStreamUrl(url)));
    return results.filter(Boolean).length;
}

async function resolveAvailability(db, items) {
    const valid = [];
    const seen = new Set();
    for (const item of Array.isArray(items) ? items : []) {
        if (!item || typeof item.type !== 'string' || typeof item.id !== 'string') continue;
        if (item.type !== 'movie' && item.type !== 'series') continue;
        if (!/^[A-Za-z0-9_-]+$/.test(item.id)) continue;
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        valid.push({ type: item.type, id: item.id, key });
    }
    const addonRows = await db.query('SELECT manifest_url FROM addons WHERE enabled = 1');
    const bases = [];
    for (const row of addonRows || []) {
        const base = manifestBase(row.manifest_url);
        if (base) bases.push(base);
    }
    let availableCount = 0;
    for (const item of valid) {
        const candidates = [];
        for (const base of bases) {
            try {
                const data = await fetchJson(`${base}/stream/${item.type}/${item.id}.json`, 8000);
                if (data && Array.isArray(data.streams)) {
                    for (const stream of data.streams) {
                        if (stream && typeof stream.url === 'string') candidates.push(stream.url);
                    }
                }
            } catch {
                // One bad addon never aborts the item/batch.
            }
        }
        const total = await countAliveUrls(candidates);
        const now = new Date().toISOString();
        const avail = total > 0 ? 1 : 0;
        if (avail) availableCount += 1;
        const existing = await db.query('SELECT meta_key FROM availability WHERE meta_key = ?', [item.key]);
        if (existing.length === 0) {
            await db.query('INSERT INTO availability (meta_key, available, streams, checked_at) VALUES (?, ?, ?, ?)', [
                item.key,
                avail,
                total,
                now,
            ]);
        } else {
            await db.query('UPDATE availability SET available = ?, streams = ?, checked_at = ? WHERE meta_key = ?', [
                avail,
                total,
                now,
                item.key,
            ]);
        }
    }
    return { checked: valid.length, available: availableCount };
}

module.exports = { manifestBase, fetchJson, probeStreamUrl, countAliveUrls, resolveAvailability };
