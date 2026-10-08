// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Zero-dependency branding API (except optional mysql2 when DB_DRIVER=mysql):
// health, branding, adslots, admin auth, uploads.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb } = require('./db');
const { createSchema, seedDefaults, SLOT_KEYS } = require('./seed');

const BRAND_COLUMNS = ['site_name', 'tagline', 'logo_url', 'favicon_url', 'theme', 'accent'];
const UPLOAD_EXTS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function verifyPassword(password, stored) {
    const [salt, hash] = String(stored).split(':');
    if (!salt || !hash) return false;
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

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
    response.writeHead(status, { 'content-type': 'application/json', ...headers });
    response.end(payload);
}

const MANIFEST_MAX_BYTES = 256 * 1024;

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
    let response;
    try {
        response = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) });
    } catch {
        throw Object.assign(new Error('bad manifest'), { status: 400 });
    }
    if (!response.ok) {
        throw Object.assign(new Error('bad manifest'), { status: 400 });
    }
    const lengthHeader = response.headers.get('content-length');
    if (lengthHeader && Number(lengthHeader) > MANIFEST_MAX_BYTES) {
        try {
            await response.arrayBuffer();
        } catch {}
        throw Object.assign(new Error('manifest too large'), { status: 400 });
    }
    let buffer;
    try {
        buffer = Buffer.from(await response.arrayBuffer());
    } catch {
        throw Object.assign(new Error('bad manifest'), { status: 400 });
    }
    if (buffer.length > MANIFEST_MAX_BYTES) {
        throw Object.assign(new Error('manifest too large'), { status: 400 });
    }
    let manifest;
    try {
        manifest = JSON.parse(buffer.toString('utf8'));
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

function startServer({ port = 3001, db, uploadsDir } = {}) {
    const sessions = new Map();
    // Single-instance sessions: in-memory Map (restart logs admins out).
    // Past 1 replica needs sticky sessions or a shared store.
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
                return send(response, 200, rows);
            }

            if (request.method === 'PUT' && url.pathname === '/api/adslots') {
                if (!authed) return send(response, 401, { error: 'unauthorized' });
                const body = await readJson(request, 256 * 1024);
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
                const rows = await db.query(
                    'SELECT id, manifest_url, name, position FROM addons WHERE enabled = 1 ORDER BY position ASC, id ASC'
                );
                return send(response, 200, rows);
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
                const file = path.join(uploads, name);
                if (!fs.existsSync(file)) return send(response, 404, { error: 'not found' });
                response.writeHead(200, { 'content-type': UPLOAD_EXTS[ext] });
                return fs.createReadStream(file).pipe(response);
            }

            return send(response, 404, { error: 'not found' });
        } catch (error) {
            return send(response, error.status || 500, { error: error.message || 'server error' });
        }
    });

    return new Promise((resolve) => {
        server.listen(port, () => resolve({ server, port: server.address().port }));
    });
}

if (require.main === module) {
    const db = openDb();
    seedDefaults(db, {
        adminUser: process.env.ADMIN_USER,
        adminPassword: process.env.ADMIN_PASSWORD,
        siteName: process.env.SITE_NAME,
    })
        .then(() => startServer({ port: Number(process.env.PORT || 3001), db }))
        .then(({ port }) => console.log(`api listening on ${port}`))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { startServer, verifyPassword };
