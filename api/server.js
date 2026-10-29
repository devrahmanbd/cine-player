// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Zero-dependency branding API (except optional mysql2 when DB_DRIVER=mysql):
// health, branding, adslots, admin auth, uploads.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb } = require('./db');
const { createSchema, seedDefaults, hashPassword, verifyPassword, SLOT_KEYS } = require('./seed');
const { normalizeEmail, validEmail, validPassword, newToken, sha256hex, takeToken, otpCode } = require('./users');
const { resolveAvailability } = require('./availability');
const { curlJson } = require('./curlfetch');
const { sendMail } = require('./smtp');

const BRAND_COLUMNS = ['site_name', 'tagline', 'logo_url', 'favicon_url', 'theme', 'accent'];
const UPLOAD_EXTS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function parseCookies(header) {
    const out = {};
    for (const part of String(header || '').split(';')) {
        const index = part.indexOf('=');
        if (index > 0) out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    }
    return out;
}

function readJson(request, limit) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        request.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                reject(Object.assign(new Error('payload too large'), { status: 413 }));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on('end', () => {
            if (chunks.length === 0) return resolve({});
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
                reject(Object.assign(new Error('invalid json'), { status: 400 }));
            }
        });
        request.on('error', reject);
    });
}

function send(response, status, body, headers = {}) {
    const payload = JSON.stringify(body);
    response.writeHead(status, {
        'content-type': 'application/json',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
        'x-frame-options': 'SAMEORIGIN',
        ...headers,
    });
    response.end(payload);
}

async function fetchManifest(manifestUrl) {
    let parsed;
    try {
        parsed = new URL(manifestUrl);
    } catch {
        throw Object.assign(new Error('bad manifest_url'), { status: 400 });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw Object.assign(new Error('bad manifest_url'), { status: 400 });
    }
    let manifest;
    try {
        manifest = await curlJson(manifestUrl, 8000);
    } catch {
        throw Object.assign(new Error('bad manifest'), { status: 400 });
    }
    if (!manifest || typeof manifest.id !== 'string' || typeof manifest.name !== 'string') {
        throw Object.assign(new Error('bad manifest'), { status: 400 });
    }
    return manifest;
}

function parseAddonId(pathname) {
    const match = /^\/api\/addons\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    const id = Number(match[1]);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

function parseBlockedPatternId(pathname) {
    const match = /^\/api\/blocked-patterns\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    const id = Number(match[1]);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

function parseAdminUserId(pathname) {
    const match = /^\/api\/admin\/users\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    const id = Number(match[1]);
    if (!Number.isInteger(id) || id <= 0) return null;
    return id;
}

function parseLibraryItem(pathname) {
    const match = /^\/api\/users\/library\/([^/]+)\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    return { type: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
}

function parseProgressItem(pathname) {
    const match = /^\/api\/users\/progress\/([^/]+)\/([^/]+)$/.exec(pathname);
    if (!match) return null;
    return { type: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
}

const LIBRARY_TYPES = ['movie', 'series'];
const META_ID_RE = /^[A-Za-z0-9:_-]+$/;

function validPositionNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function userSessionCookie(token) {
    return `user_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`;
}

const USER_SESSION_TTL_MS = 30 * 24 * 3600 * 1000;
const USER_SESSION_SLIDE_MS = 7 * 24 * 3600 * 1000;

// Cookie session lookup: unexpired sessions row joined to an enabled user.
// Returns { id, email, slid, token } or null. Never throws.
// slid is true when the expiry was extended; token is the raw cookie token
// so callers (GET /api/users/me) can re-issue Set-Cookie on a slide.
async function userSession(request, db) {
    try {
        const token = parseCookies(request.headers.cookie).user_session || '';
        if (!/^[0-9a-f]{64}$/.test(token)) return null;
        const tokenHash = sha256hex(token);
        const rows = await db.query(
            'SELECT sessions.expires_at AS expires_at, users.id AS id, users.email AS email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND users.disabled = 0',
            [tokenHash]
        );
        if (rows.length === 0) return null;
        const expires = Date.parse(rows[0].expires_at);
        if (!Number.isFinite(expires) || expires <= Date.now()) {
            await db.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
            return null;
        }
        let slid = false;
        if (expires - Date.now() < USER_SESSION_SLIDE_MS) {
            await db.query('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', [
                new Date(Date.now() + USER_SESSION_TTL_MS).toISOString(),
                tokenHash,
            ]);
            slid = true;
        }
        return { id: rows[0].id, email: rows[0].email, slid, token };
    } catch {
        return null;
    }
}

async function brandSiteName(db) {
    try {
        const brand = await db.query('SELECT site_name FROM branding WHERE id = 1');
        if (brand.length > 0 && typeof brand[0].site_name === 'string' && brand[0].site_name) {
            return brand[0].site_name;
        }
    } catch {
        // Fall through with the default site name.
    }
    return 'Site';
}

// Invalidates prior codes, mints a fresh 10-minute OTP, returns the code.
async function mintOtpCode(db, email) {
    await db.query('UPDATE otp_codes SET consumed = 1 WHERE email = ? AND consumed = 0', [email]);
    const code = otpCode();
    const now = new Date();
    await db.query(
        'INSERT INTO otp_codes (email, code_hash, expires_at, attempts, consumed, created_at) VALUES (?, ?, ?, 0, 0, ?)',
        [email, hashPassword(code), new Date(now.getTime() + 10 * 60 * 1000).toISOString(), now.toISOString()]
    );
    return code;
}

// Sends the OTP mail; kind is 'verify' (signup) or 'password' (reset).
// Returns true when accepted, false on mail failure (logged, never throws).
async function mailOtpCode(db, email, code, kind) {
    const site = await brandSiteName(db);
    const subject = kind === 'verify' ? `${site} verification code` : `${site} password code`;
    const text =
        kind === 'verify'
            ? `Your ${site} verification code is ${code}. It expires in 10 minutes.`
            : `Your ${site} password code is ${code}. It expires in 10 minutes.`;
    try {
        await sendMail({ to: email, subject, text });
        return true;
    } catch (error) {
        console.error('otp mail failed', error && error.message ? error.message : error);
        return false;
    }
}

// Shared newest-code check for verify endpoints. Returns { row } or { status, error }.
async function checkOtpCode(db, email, code) {
    const rows = await db.query(
        'SELECT id, code_hash, expires_at, attempts FROM otp_codes WHERE email = ? AND consumed = 0 ORDER BY id DESC LIMIT 1',
        [email]
    );
    if (rows.length === 0) return { status: 401, error: 'invalid code' };
    const row = rows[0];
    const expires = Date.parse(row.expires_at);
    if (Number(row.attempts) >= 5) {
        if (!Number.isFinite(expires) || expires <= Date.now()) {
            return { status: 401, error: 'invalid code' };
        }
        return { status: 429, error: 'rate limited' };
    }
    if (!Number.isFinite(expires) || expires <= Date.now()) {
        await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
        return { status: 401, error: 'invalid code' };
    }
    let ok = false;
    try {
        ok = verifyPassword(code, row.code_hash);
    } catch {
        ok = false;
    }
    if (!ok) {
        await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [row.id]);
        return { status: 401, error: 'invalid code' };
    }
    return { row };
}

function startServer({ port = 3001, host = process.env.BIND_HOST || '127.0.0.1', db, uploadsDir } = {}) {
    const sessions = new Map();
    // Single-instance sessions: in-memory Map (restart logs admins out).
    // Past 1 replica needs sticky sessions or a shared store.
    // Per-key fixed-window limiters for user auth (same takeToken helper).
    const signupLimits = new Map();
    const loginEmailLimits = new Map();
    const loginIpLimits = new Map();
    const otpRequestEmailLimits = new Map();
    const otpRequestIpLimits = new Map();
    const newsletterIpLimits = new Map();
    const verifyEmailLimits = new Map();
    const verifyIpLimits = new Map();
    const availabilityLimits = new Map();
    const addonsLimits = new Map();
    const addonManifestLimits = new Map();
    const uploads = uploadsDir || process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
    fs.mkdirSync(uploads, { recursive: true });

    const server = http.createServer(async (request, response) => {
        try {
            const url = new URL(request.url, 'http://localhost');
            const cookies = parseCookies(request.headers.cookie);
            const session = sessions.get(cookies.bl_session);
            const authed = !!session && session.expires > Date.now();

            if (request.method === 'GET' && url.pathname === '/api/health') {
                return send(response, 200, { ok: true });
            }

            if (request.method === 'GET' && url.pathname === '/api/branding') {
                const rows = await db.query('SELECT * FROM branding WHERE id = 1');
                if (rows.length === 0) return send(response, 404, { error: 'not seeded' });
                return send(response, 200, rows[0]);
            }

            if (request.method === 'PUT' && url.pathname === '/api/branding') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 256 * 1024);
                const sets = [];
                const params = [];
                for (const column of BRAND_COLUMNS) {
                    if (typeof body[column] === 'string' && body[column].length <= 500) {
                        sets.push(`${column} = ?`);
                        params.push(body[column]);
                    }
                }
                if (sets.length === 0) return send(response, 400, { error: 'nothing to update' });
                sets.push('updated_at = ?');
                params.push(new Date().toISOString());
                params.push(1);
                await db.query(`UPDATE branding SET ${sets.join(', ')} WHERE id = ?`, params);
                const rows = await db.query('SELECT * FROM branding WHERE id = 1');
                return send(response, 200, rows[0]);
            }

            if (request.method === 'GET' && url.pathname === '/api/adslots') {
                const rows = await db.query('SELECT slot_key, enabled, code FROM adslots');
                const settings = await db.query('SELECT master_enabled FROM ads_settings WHERE id = 1');
                return send(response, 200, {
                    master: (settings[0] && settings[0].master_enabled) || 0,
                    slots: rows,
                });
            }

            if (request.method === 'PUT' && url.pathname === '/api/adslots') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 256 * 1024);
                if (Object.prototype.hasOwnProperty.call(body, 'master')) {
                    const master = body.master ? 1 : 0;
                    await db.query('UPDATE ads_settings SET master_enabled = ? WHERE id = 1', [master]);
                    return send(response, 200, { master });
                }
                if (!SLOT_KEYS.includes(body.slot_key)) return send(response, 400, { error: 'unknown slot' });
                if (typeof body.code !== 'string' || body.code.length > 20000) {
                    return send(response, 400, { error: 'bad code' });
                }
                const enabled = body.enabled ? 1 : 0;
                await db.query('UPDATE adslots SET enabled = ?, code = ? WHERE slot_key = ?', [
                    enabled,
                    body.code,
                    body.slot_key,
                ]);
                return send(response, 200, { slot_key: body.slot_key, enabled, code: body.code });
            }

            if (request.method === 'GET' && url.pathname === '/api/addons') {
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                if (!takeToken(addonsLimits, ip, 120, 60 * 1000)) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const rows = await db.query(
                    'SELECT id, manifest_url, name, position FROM addons WHERE enabled = 1 ORDER BY position ASC, id ASC'
                );
                return send(response, 200, rows);
            }

            // Public manifest proxy: some addon hosts bot-wall browsers (403)
            // while serving server-side fetches fine. The requested URL must be
            // an enabled admin addon (allowlist) — never an open proxy.
            if (request.method === 'GET' && url.pathname === '/api/addons/manifest') {
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                if (!takeToken(addonManifestLimits, ip, 120, 60 * 1000)) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const target = url.searchParams.get('url') || '';
                const allowed = await db.query(
                    'SELECT id FROM addons WHERE manifest_url = ? AND enabled = 1',
                    [target]
                );
                if (allowed.length === 0) return send(response, 404, { error: 'unknown addon' });
                let manifest;
                try {
                    manifest = await fetchManifest(target);
                } catch (error) {
                    return send(response, error.status || 400, { error: error.message || 'bad manifest' });
                }
                return send(response, 200, manifest);
            }

            if (request.method === 'POST' && url.pathname === '/api/addons') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 64 * 1024);
                if (typeof body.manifest_url !== 'string' || body.manifest_url.length === 0) {
                    return send(response, 400, { error: 'bad manifest_url' });
                }
                const existing = await db.query('SELECT id FROM addons WHERE manifest_url = ?', [
                    body.manifest_url,
                ]);
                if (existing.length > 0) return send(response, 409, { error: 'already exists' });
                let manifest;
                try {
                    manifest = await fetchManifest(body.manifest_url);
                } catch (error) {
                    return send(response, error.status || 400, { error: error.message || 'bad manifest' });
                }
                try {
                    await db.query('INSERT INTO addons (manifest_url, name, enabled, position) VALUES (?, ?, 1, 0)', [
                        body.manifest_url,
                        manifest.name,
                    ]);
                } catch (error) {
                    if (/UNIQUE|unique|duplicate|ER_DUP_ENTRY/i.test(error.message || '')) {
                        return send(response, 409, { error: 'already exists' });
                    }
                    throw error;
                }
                const rows = await db.query(
                    'SELECT id, manifest_url, name, position FROM addons WHERE manifest_url = ?',
                    [body.manifest_url]
                );
                return send(response, 200, rows[0]);
            }

            if (request.method === 'PUT' && url.pathname.startsWith('/api/addons/')) {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const addonId = parseAddonId(url.pathname);
                if (addonId === null) return send(response, 404, { error: 'not found' });
                const body = await readJson(request, 64 * 1024);
                const sets = [];
                const params = [];
                if ('enabled' in body) {
                    if (typeof body.enabled !== 'boolean') return send(response, 400, { error: 'bad enabled' });
                    sets.push('enabled = ?');
                    params.push(body.enabled ? 1 : 0);
                }
                if ('position' in body) {
                    if (typeof body.position !== 'number' || !Number.isFinite(body.position)) {
                        return send(response, 400, { error: 'bad position' });
                    }
                    sets.push('position = ?');
                    params.push(Math.trunc(body.position));
                }
                if (sets.length === 0) return send(response, 400, { error: 'nothing to update' });
                const found = await db.query('SELECT id FROM addons WHERE id = ?', [addonId]);
                if (found.length === 0) return send(response, 404, { error: 'not found' });
                params.push(addonId);
                await db.query(`UPDATE addons SET ${sets.join(', ')} WHERE id = ?`, params);
                const rows = await db.query(
                    'SELECT id, manifest_url, name, enabled, position FROM addons WHERE id = ?',
                    [addonId]
                );
                return send(response, 200, rows[0]);
            }

            if (request.method === 'DELETE' && url.pathname.startsWith('/api/addons/')) {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const addonId = parseAddonId(url.pathname);
                if (addonId === null) return send(response, 404, { error: 'not found' });
                const found = await db.query('SELECT id FROM addons WHERE id = ?', [addonId]);
                if (found.length === 0) return send(response, 404, { error: 'not found' });
                await db.query('DELETE FROM addons WHERE id = ?', [addonId]);
                return send(response, 200, { ok: true });
            }

            if (request.method === 'GET' && url.pathname === '/api/blocked-patterns') {
                const rows = await db.query('SELECT id, pattern FROM blocked_patterns ORDER BY id ASC');
                return send(response, 200, rows);
            }

            if (request.method === 'POST' && url.pathname === '/api/blocked-patterns') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 64 * 1024);
                const pattern = typeof body.pattern === 'string' ? body.pattern.trim() : '';
                if (pattern.length < 2 || pattern.length > 120) {
                    return send(response, 400, { error: 'bad pattern' });
                }
                const existing = await db.query('SELECT id FROM blocked_patterns WHERE pattern = ?', [
                    pattern,
                ]);
                if (existing.length > 0) return send(response, 409, { error: 'already exists' });
                try {
                    await db.query('INSERT INTO blocked_patterns (pattern, created_at) VALUES (?, ?)', [
                        pattern,
                        new Date().toISOString(),
                    ]);
                } catch (error) {
                    if (/UNIQUE|unique|duplicate|ER_DUP_ENTRY/i.test(error.message || '')) {
                        return send(response, 409, { error: 'already exists' });
                    }
                    throw error;
                }
                const rows = await db.query('SELECT id, pattern FROM blocked_patterns WHERE pattern = ?', [
                    pattern,
                ]);
                return send(response, 200, rows[0]);
            }

            if (request.method === 'DELETE' && url.pathname.startsWith('/api/blocked-patterns/')) {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const patternId = parseBlockedPatternId(url.pathname);
                if (patternId === null) return send(response, 404, { error: 'not found' });
                const found = await db.query('SELECT id FROM blocked_patterns WHERE id = ?', [patternId]);
                if (found.length === 0) return send(response, 404, { error: 'not found' });
                await db.query('DELETE FROM blocked_patterns WHERE id = ?', [patternId]);
                return send(response, 200, { ok: true });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/signup') {
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                if (!takeToken(signupLimits, ip, 10, 3600 * 1000)) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const body = await readJson(request, 64 * 1024);
                const email = normalizeEmail(body.email);
                if (!validEmail(email) || !validPassword(body.password)) {
                    return send(response, 400, { error: 'bad input' });
                }
                const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                if (existing.length > 0) return send(response, 409, { error: 'email taken' });
                let userId;
                try {
                    const info = await db.query(
                        'INSERT INTO users (email, password_hash, disabled, verified, created_at) VALUES (?, ?, 0, 0, ?)',
                        [email, hashPassword(body.password), new Date().toISOString()]
                    );
                    userId = Number(info && (info.lastInsertRowid ?? info.insertId));
                } catch (error) {
                    if (/UNIQUE|unique|duplicate|ER_DUP_ENTRY/i.test(error.message || '')) {
                        return send(response, 409, { error: 'email taken' });
                    }
                    throw error;
                }
                if (!Number.isInteger(userId) || userId <= 0) {
                    const rows = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                    if (rows.length === 0) return send(response, 500, { error: 'server error' });
                    userId = rows[0].id;
                }
                // No session until the email is verified: mint a code and mail
                // it. mailed=false (mail down) leaves the account usable via
                // POST /api/users/verify/request retry — never a 503 here
                // since the account itself was created.
                const code = await mintOtpCode(db, email);
                const mailed = await mailOtpCode(db, email, code, 'verify');
                return send(response, 200, { id: userId, email, verified: false, mailed });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/login') {
                const body = await readJson(request, 64 * 1024);
                const email = normalizeEmail(body.email);
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                const emailOk = takeToken(loginEmailLimits, email || 'unknown', 20, 3600 * 1000);
                const ipOk = takeToken(loginIpLimits, ip, 20, 3600 * 1000);
                if (!emailOk || !ipOk) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const rows = await db.query('SELECT id, email, password_hash, disabled, verified FROM users WHERE email = ?', [
                    email,
                ]);
                if (rows.length === 0 || !verifyPassword(body.password || '', rows[0].password_hash)) {
                    return send(response, 401, { error: 'invalid credentials' });
                }
                if (Number(rows[0].disabled) !== 0) return send(response, 403, { error: 'disabled' });
                if (Number(rows[0].verified) !== 1) return send(response, 403, { error: 'unverified' });
                const token = newToken();
                await db.query(
                    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
                    [
                        sha256hex(token),
                        rows[0].id,
                        new Date(Date.now() + USER_SESSION_TTL_MS).toISOString(),
                        new Date().toISOString(),
                    ]
                );
                return send(
                    response,
                    200,
                    { id: rows[0].id, email: rows[0].email },
                    { 'set-cookie': userSessionCookie(token) }
                );
            }

            if (request.method === 'POST' && url.pathname === '/api/users/logout') {
                const token = parseCookies(request.headers.cookie).user_session || '';
                if (/^[0-9a-f]{64}$/.test(token)) {
                    await db.query('DELETE FROM sessions WHERE token_hash = ?', [sha256hex(token)]);
                }
                return send(response, 200, { ok: true }, { 'set-cookie': 'user_session=; HttpOnly; Path=/; Max-Age=0' });
            }

            if (request.method === 'GET' && url.pathname === '/api/users/me') {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const body = { id: me.id, email: me.email };
                if (me.slid) return send(response, 200, body, { 'set-cookie': userSessionCookie(me.token) });
                return send(response, 200, body);
            }

            if (request.method === 'GET' && url.pathname === '/api/users/library') {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const filter = url.searchParams.get('type');
                if (filter !== null && !LIBRARY_TYPES.includes(filter)) {
                    return send(response, 400, { error: 'bad type' });
                }
                const rows = filter === null
                    ? await db.query(
                        'SELECT type, meta_id, added_at FROM library_items WHERE user_id = ? ORDER BY type ASC, meta_id ASC',
                        [me.id]
                    )
                    : await db.query(
                        'SELECT type, meta_id, added_at FROM library_items WHERE user_id = ? AND type = ? ORDER BY type ASC, meta_id ASC',
                        [me.id, filter]
                    );
                return send(response, 200, rows);
            }

            if (request.method === 'PUT' && url.pathname === '/api/users/library') {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 64 * 1024);
                if (!LIBRARY_TYPES.includes(body.type)) return send(response, 400, { error: 'bad type' });
                if (typeof body.meta_id !== 'string' || !META_ID_RE.test(body.meta_id)) {
                    return send(response, 400, { error: 'bad meta_id' });
                }
                const now = new Date().toISOString();
                const existing = await db.query(
                    'SELECT type FROM library_items WHERE user_id = ? AND type = ? AND meta_id = ?',
                    [me.id, body.type, body.meta_id]
                );
                if (existing.length === 0) {
                    await db.query(
                        'INSERT INTO library_items (user_id, type, meta_id, added_at) VALUES (?, ?, ?, ?)',
                        [me.id, body.type, body.meta_id, now]
                    );
                } else {
                    await db.query(
                        'UPDATE library_items SET added_at = ? WHERE user_id = ? AND type = ? AND meta_id = ?',
                        [now, me.id, body.type, body.meta_id]
                    );
                }
                const rows = await db.query(
                    'SELECT type, meta_id, added_at FROM library_items WHERE user_id = ? AND type = ? AND meta_id = ?',
                    [me.id, body.type, body.meta_id]
                );
                return send(response, 200, rows[0]);
            }

            if (request.method === 'DELETE' && url.pathname.startsWith('/api/users/library/')) {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const target = parseLibraryItem(url.pathname);
                if (target === null) return send(response, 404, { error: 'not found' });
                if (!LIBRARY_TYPES.includes(target.type)) return send(response, 400, { error: 'bad type' });
                if (!META_ID_RE.test(target.id)) return send(response, 400, { error: 'bad meta_id' });
                await db.query('DELETE FROM library_items WHERE user_id = ? AND type = ? AND meta_id = ?', [
                    me.id,
                    target.type,
                    target.id,
                ]);
                return send(response, 200, { ok: true });
            }

            if (request.method === 'GET' && url.pathname === '/api/users/progress') {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const filter = url.searchParams.get('type');
                if (filter !== null && !LIBRARY_TYPES.includes(filter)) {
                    return send(response, 400, { error: 'bad type' });
                }
                const rows = filter === null
                    ? await db.query(
                        'SELECT type, meta_id, season, episode, position, duration, updated_at FROM progress WHERE user_id = ? ORDER BY type ASC, meta_id ASC',
                        [me.id]
                    )
                    : await db.query(
                        'SELECT type, meta_id, season, episode, position, duration, updated_at FROM progress WHERE user_id = ? AND type = ? ORDER BY type ASC, meta_id ASC',
                        [me.id, filter]
                    );
                return send(response, 200, rows);
            }

            if (request.method === 'PUT' && url.pathname === '/api/users/progress') {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 64 * 1024);
                if (!LIBRARY_TYPES.includes(body.type)) return send(response, 400, { error: 'bad type' });
                if (typeof body.meta_id !== 'string' || !META_ID_RE.test(body.meta_id)) {
                    return send(response, 400, { error: 'bad meta_id' });
                }
                if (!validPositionNumber(body.position) || !validPositionNumber(body.duration)) {
                    return send(response, 400, { error: 'bad position' });
                }
                const season = body.season === undefined || body.season === null ? null : body.season;
                const episode = body.episode === undefined || body.episode === null ? null : body.episode;
                if (season !== null && !validPositionNumber(season)) {
                    return send(response, 400, { error: 'bad season' });
                }
                if (episode !== null && !validPositionNumber(episode)) {
                    return send(response, 400, { error: 'bad episode' });
                }
                const now = new Date().toISOString();
                const existing = await db.query(
                    'SELECT type FROM progress WHERE user_id = ? AND type = ? AND meta_id = ?',
                    [me.id, body.type, body.meta_id]
                );
                if (existing.length === 0) {
                    await db.query(
                        'INSERT INTO progress (user_id, type, meta_id, season, episode, position, duration, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [me.id, body.type, body.meta_id, season, episode, body.position, body.duration, now]
                    );
                } else {
                    await db.query(
                        'UPDATE progress SET season = ?, episode = ?, position = ?, duration = ?, updated_at = ? WHERE user_id = ? AND type = ? AND meta_id = ?',
                        [season, episode, body.position, body.duration, now, me.id, body.type, body.meta_id]
                    );
                }
                const rows = await db.query(
                    'SELECT type, meta_id, season, episode, position, duration, updated_at FROM progress WHERE user_id = ? AND type = ? AND meta_id = ?',
                    [me.id, body.type, body.meta_id]
                );
                return send(response, 200, rows[0]);
            }

            if (request.method === 'DELETE' && url.pathname.startsWith('/api/users/progress/')) {
                const me = await userSession(request, db);
                if (!me) return send(response, 401, { error: 'unauthorized' });
                const target = parseProgressItem(url.pathname);
                if (target === null) return send(response, 404, { error: 'not found' });
                if (!LIBRARY_TYPES.includes(target.type)) return send(response, 400, { error: 'bad type' });
                if (!META_ID_RE.test(target.id)) return send(response, 400, { error: 'bad meta_id' });
                await db.query('DELETE FROM progress WHERE user_id = ? AND type = ? AND meta_id = ?', [
                    me.id,
                    target.type,
                    target.id,
                ]);
                return send(response, 200, { ok: true });
            }

            // Newsletter: optional email collection for domain-move notices.
            // No account, no OTP — just store the address. Idempotent per email.
            if (request.method === 'POST' && url.pathname === '/api/newsletter') {
                const body = await readJson(request, 8 * 1024);
                const email = normalizeEmail(body.email);
                if (!validEmail(email)) return send(response, 400, { error: 'bad input' });
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                if (!takeToken(newsletterIpLimits, ip, 10, 3600 * 1000)) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const source = typeof body.source === 'string' && body.source.length <= 32 ? body.source : 'popup';
                await db.query(
                    'INSERT OR IGNORE INTO newsletter_emails (email, source, created_at) VALUES (?, ?, ?)',
                    [email, source, new Date().toISOString()]
                );
                return send(response, 200, { ok: true });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/password/otp/request') {
                const body = await readJson(request, 64 * 1024);
                const email = normalizeEmail(body.email);
                if (!validEmail(email)) return send(response, 400, { error: 'bad input' });
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                const otpEmailOk = takeToken(otpRequestEmailLimits, email, 5, 3600 * 1000);
                const otpIpOk = takeToken(otpRequestIpLimits, ip, 20, 3600 * 1000);
                if (!otpEmailOk || !otpIpOk) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const users = await db.query('SELECT id, disabled FROM users WHERE email = ?', [email]);
                if (users.length === 0 || Number(users[0].disabled) !== 0) {
                    return send(response, 200, { ok: true });
                }
                const code = await mintOtpCode(db, email);
                if (!(await mailOtpCode(db, email, code, 'password'))) {
                    return send(response, 503, { error: 'mail failed' });
                }
                return send(response, 200, { ok: true });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/password/otp/verify') {
                const body = await readJson(request, 64 * 1024);
                if (!validPassword(body.password)) return send(response, 400, { error: 'bad input' });
                const email = normalizeEmail(body.email);
                const code = typeof body.code === 'string' ? body.code.trim() : '';
                if (!validEmail(email) || code.length === 0) {
                    return send(response, 401, { error: 'invalid code' });
                }
                const checked = await checkOtpCode(db, email, code);
                if (!checked.row) return send(response, checked.status, { error: checked.error });
                const users = await db.query('SELECT id, disabled FROM users WHERE email = ?', [email]);
                if (users.length === 0 || Number(users[0].disabled) !== 0) {
                    return send(response, 401, { error: 'invalid code' });
                }
                await db.query('UPDATE users SET password_hash = ?, verified = 1 WHERE id = ?', [
                    hashPassword(body.password),
                    users[0].id,
                ]);
                await db.query('UPDATE otp_codes SET consumed = 1 WHERE email = ? AND consumed = 0', [email]);
                await db.query('DELETE FROM sessions WHERE user_id = ?', [users[0].id]);
                return send(response, 200, { ok: true });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/verify/request') {
                const body = await readJson(request, 64 * 1024);
                const email = normalizeEmail(body.email);
                if (!validEmail(email)) return send(response, 400, { error: 'bad input' });
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                const emailOk = takeToken(verifyEmailLimits, email, 5, 3600 * 1000);
                const ipOk = takeToken(verifyIpLimits, ip, 20, 3600 * 1000);
                if (!emailOk || !ipOk) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const users = await db.query('SELECT id, disabled, verified FROM users WHERE email = ?', [email]);
                if (users.length === 0 || Number(users[0].disabled) !== 0 || Number(users[0].verified) === 1) {
                    return send(response, 200, { ok: true });
                }
                const code = await mintOtpCode(db, email);
                if (!(await mailOtpCode(db, email, code, 'verify'))) {
                    return send(response, 503, { error: 'mail failed' });
                }
                return send(response, 200, { ok: true });
            }

            if (request.method === 'POST' && url.pathname === '/api/users/verify') {
                const body = await readJson(request, 64 * 1024);
                const email = normalizeEmail(body.email);
                const code = typeof body.code === 'string' ? body.code.trim() : '';
                if (!validEmail(email) || code.length === 0) {
                    return send(response, 401, { error: 'invalid code' });
                }
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                const emailOk = takeToken(verifyEmailLimits, email, 20, 3600 * 1000);
                const ipOk = takeToken(verifyIpLimits, ip, 20, 3600 * 1000);
                if (!emailOk || !ipOk) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const checked = await checkOtpCode(db, email, code);
                if (!checked.row) return send(response, checked.status, { error: checked.error });
                const users = await db.query('SELECT id, email, disabled FROM users WHERE email = ?', [email]);
                if (users.length === 0 || Number(users[0].disabled) !== 0) {
                    return send(response, 401, { error: 'invalid code' });
                }
                await db.query('UPDATE users SET verified = 1 WHERE id = ?', [users[0].id]);
                await db.query('UPDATE otp_codes SET consumed = 1 WHERE email = ? AND consumed = 0', [email]);
                const token = newToken();
                await db.query(
                    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
                    [
                        sha256hex(token),
                        users[0].id,
                        new Date(Date.now() + USER_SESSION_TTL_MS).toISOString(),
                        new Date().toISOString(),
                    ]
                );
                return send(response, 200, { id: users[0].id, email: users[0].email }, { 'set-cookie': userSessionCookie(token) });
            }

            if (request.method === 'POST' && url.pathname === '/api/admin/login') {
                const body = await readJson(request, 64 * 1024);
                const rows = await db.query('SELECT * FROM admins WHERE username = ?', [body.username || '']);
                if (rows.length === 0 || !verifyPassword(body.password || '', rows[0].password_hash)) {
                    return send(response, 401, { error: 'invalid credentials' });
                }
                const token = crypto.randomBytes(32).toString('hex');
                sessions.set(token, { username: rows[0].username, expires: Date.now() + 12 * 3600 * 1000 });
                return send(response, 200, { ok: true }, { 'set-cookie': `bl_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200` });
            }

            if (request.method === 'GET' && url.pathname === '/api/admin/me') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                return send(response, 200, { username: session.username });
            }

            if (request.method === 'POST' && url.pathname === '/api/admin/logout') {                sessions.delete(cookies.bl_session);
                return send(response, 200, { ok: true }, { 'set-cookie': 'bl_session=; HttpOnly; Path=/; Max-Age=0' });
            }

            if (request.method === 'GET' && url.pathname === '/api/admin/users') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const rows = await db.query(
                    'SELECT id, email, disabled, created_at FROM users ORDER BY id ASC'
                );
                return send(
                    response,
                    200,
                    rows.map((row) => ({
                        id: row.id,
                        email: row.email,
                        disabled: Number(row.disabled),
                        created_at: row.created_at,
                    }))
                );
            }

            if (request.method === 'PUT' && url.pathname.startsWith('/api/admin/users/')) {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const userId = parseAdminUserId(url.pathname);
                if (userId === null) return send(response, 404, { error: 'not found' });
                const body = await readJson(request, 64 * 1024);
                const sets = [];
                const params = [];
                let revokeSessions = false;
                if ('disabled' in body) {
                    if (typeof body.disabled !== 'boolean') {
                        return send(response, 400, { error: 'bad disabled' });
                    }
                    sets.push('disabled = ?');
                    params.push(body.disabled ? 1 : 0);
                    if (body.disabled === true) revokeSessions = true;
                }
                if ('password' in body) {
                    if (!validPassword(body.password)) return send(response, 400, { error: 'bad input' });
                    sets.push('password_hash = ?');
                    params.push(hashPassword(body.password));
                    // Operator-set password verifies identity out-of-band.
                    sets.push('verified = 1');
                    revokeSessions = true;
                }
                if (sets.length === 0) return send(response, 400, { error: 'nothing to update' });
                const found = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
                if (found.length === 0) return send(response, 404, { error: 'not found' });
                params.push(userId);
                await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
                if (revokeSessions) {
                    await db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
                }
                const rows = await db.query(
                    'SELECT id, email, disabled, created_at FROM users WHERE id = ?',
                    [userId]
                );
                const row = rows[0];
                return send(response, 200, {
                    id: row.id,
                    email: row.email,
                    disabled: Number(row.disabled),
                    created_at: row.created_at,
                });
            }

            if (request.method === 'POST' && url.pathname === '/api/uploads') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 4 * 1024 * 1024);
                const ext = path.extname(String(body.filename || '')).toLowerCase();
                if (!UPLOAD_EXTS[ext]) return send(response, 400, { error: 'bad extension' });
                const buffer = Buffer.from(String(body.data || ''), 'base64');
                if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
                    return send(response, 400, { error: 'bad size' });
                }
                const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
                fs.writeFileSync(path.join(uploads, name), buffer);
                return send(response, 200, { url: `/brand/${name}` });
            }

            if (request.method === 'GET' && url.pathname.startsWith('/brand/')) {
                const name = path.basename(url.pathname);
                const ext = path.extname(name).toLowerCase();
                if (!UPLOAD_EXTS[ext]) return send(response, 404, { error: 'not found' });
                // Uploaded file first, permanent repo-bundled default second:
                // the logo slot can never 404 even if uploads are wiped.
                const bundled = path.join(__dirname, '..', 'assets', 'brand', name);
                const file = fs.existsSync(path.join(uploads, name)) ? path.join(uploads, name) : bundled;
                if (!fs.existsSync(file)) return send(response, 404, { error: 'not found' });
                response.writeHead(200, { 'content-type': UPLOAD_EXTS[ext] });
                return fs.createReadStream(file).pipe(response);
            }

            if (request.method === 'GET' && url.pathname === '/api/availability') {
                const ip = (request.socket && request.socket.remoteAddress) || 'unknown';
                if (!takeToken(availabilityLimits, ip, 120, 60 * 1000)) {
                    return send(response, 429, { error: 'rate limited' });
                }
                const raw = url.searchParams.get('keys') || '';
                const parts = String(raw)
                    .split(',')
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                const uniq = [...new Set(parts.filter((k) => /^(movie|series):[A-Za-z0-9_-]+$/.test(k)))].slice(0, 200);
                if (uniq.length === 0) return send(response, 200, {});
                const placeholders = uniq.map(() => '?').join(',');
                const rows = await db.query(
                    `SELECT meta_key, available, streams, checked_at FROM availability WHERE meta_key IN (${placeholders})`,
                    uniq
                );
                const out = {};
                for (const row of rows) {
                    out[row.meta_key] = {
                        available: Number(row.available),
                        streams: Number(row.streams),
                        checked_at: row.checked_at,
                    };
                }
                return send(response, 200, out);
            }

            if (request.method === 'POST' && url.pathname === '/api/availability/refresh') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 256 * 1024);
                const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
                const result = await resolveAvailability(db, items);
                return send(response, 200, result);
            }

            return send(response, 404, { error: 'not found' });
        } catch (error) {
            const status = error.status || 500;
            if (status >= 500) {
                console.error('api error', error && error.message ? error.message : error);
                return send(response, 500, { error: 'server error' });
            }
            return send(response, status, { error: error.message || 'server error' });
        }
    });

    return new Promise((resolve) => {
        server.listen(port, host, () => resolve({ server, port: server.address().port, host }));
    });
}

if (require.main === module) {
    const db = openDb();
    seedDefaults(db, {
        adminUser: process.env.ADMIN_USER,
        adminPassword: process.env.ADMIN_PASSWORD,
        siteName: process.env.SITE_NAME,
    })
        .then(() => startServer({ port: Number(process.env.PORT || 3001), host: process.env.BIND_HOST || '127.0.0.1', db }))
        .then(({ port, host }) => console.log(`api listening on ${host}:${port}`))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { startServer, verifyPassword, userSession };
