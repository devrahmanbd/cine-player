// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Pure adblock-response decision logic (JSX-free so jest runs it without a
// babel transform). Modes: 'none' | 'notice' | 'wall'.
const GRACE_MS = 30 * 60 * 1000;
const FIRST_SEEN_KEY = 'lx_adblock_first_seen';

function readFirstSeen() {
    try {
        const raw = window.localStorage.getItem(FIRST_SEEN_KEY);
        const parsed = raw === null ? NaN : Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function writeFirstSeen(now) {
    try {
        window.localStorage.setItem(FIRST_SEEN_KEY, String(now));
    } catch {
        // Storage blocked: grace cannot persist (treated as expired).
    }
}

function resolveAdblockMode({ detected, authed, firstSeen, now }) {
    if (!detected) return 'none';
    if (authed && firstSeen !== null && now - firstSeen < GRACE_MS) return 'notice';
    return 'wall';
}

module.exports = { resolveAdblockMode, GRACE_MS, FIRST_SEEN_KEY, readFirstSeen, writeFirstSeen };
