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

// Only extension-type detections are actionable by the visitor (pause the
// extension for this site). DNS/network-level blocks (AdGuard Home, ISP
// filtering) cannot be fixed in-browser — walling those users just
// punishes people with no blocker installed. Fail open for them.
function isActionableKind(kind) {
    return kind === 'extension' || kind === 'both';
}

// Full adblock-verdict decision, one pure entry point for every call path
// (boot + live re-checks). The master ads switch gates the wall first: a
// site running zero ads must never demand a whitelist. With ads on, an
// undeterminable auth state (transport missing/failed) keeps today's
// fail-closed 'wall'; otherwise the existing grace/notice rules apply.
function resolveWallMode({ adsEnabled, detected, actionable, transportOk, authed, firstSeen, now }) {
    if (!adsEnabled) return 'none';
    if (!detected || !actionable) return 'none';
    if (!transportOk) return 'wall';
    return resolveAdblockMode({ detected: true, authed, firstSeen, now });
}

module.exports = { resolveAdblockMode, resolveWallMode, GRACE_MS, FIRST_SEEN_KEY, readFirstSeen, writeFirstSeen, isActionableKind };
