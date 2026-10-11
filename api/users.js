// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Pure auth helpers (no I/O): shared by routes and tests.
const crypto = require('node:crypto');

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validEmail(email) {
    if (typeof email !== 'string') return false;
    const v = email.trim();
    if (v.length < 5 || v.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validPassword(pw) {
    return typeof pw === 'string' && pw.length >= 8 && pw.length <= 200;
}

function newToken() {
    return crypto.randomBytes(32).toString('hex');
}

function sha256hex(s) {
    return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function otpCode() {
    return String(crypto.randomInt(100000, 1000000));
}

// Fixed-window per-key limiter over a caller-owned Map.
// Returns true when the attempt is allowed.
function takeToken(map, key, limit, windowMs) {
    const now = Date.now();
    const hit = map.get(key);
    if (!hit || hit.resetAt <= now) {
        map.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (hit.count >= limit) return false;
    hit.count += 1;
    return true;
}

module.exports = { normalizeEmail, validEmail, validPassword, newToken, sha256hex, otpCode, takeToken };
