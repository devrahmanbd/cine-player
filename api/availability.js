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
        let total = 0;
        for (const base of bases) {
            try {
                const data = await fetchJson(`${base}/stream/${item.type}/${item.id}.json`, 8000);
                if (data && Array.isArray(data.streams)) total += data.streams.length;
            } catch {
                // One bad addon never aborts the item/batch.
            }
        }
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

module.exports = { manifestBase, fetchJson, resolveAvailability };
