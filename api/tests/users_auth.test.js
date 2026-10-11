// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it, before, after */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('users auth', () => {
    let db; let server; let base; let tmp; let cookie;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-auth-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'T' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;
    });
    after(async () => { await new Promise((r) => server.close(r)); await db.close(); });
    const post = (p, body, ck) => fetch(`${base}${p}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(ck ? { cookie: ck } : {}) },
        body: JSON.stringify(body),
    });
    const verifyEmail = (email) => db.query('UPDATE users SET verified = 1 WHERE email = ?', [email]);
    it('signup validates, dedups, and sends a code without a session', async () => {
        assert.equal((await post('/api/users/signup', { email: 'bad', password: '12345678' })).status, 400);
        assert.equal((await post('/api/users/signup', { email: 'a@b.co', password: 'short' })).status, 400);
        const res = await post('/api/users/signup', { email: 'Ann@Example.com', password: 's3cret-pass' });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.email, 'ann@example.com');
        assert.equal(body.verified, false);
        assert.equal(res.headers.get('set-cookie'), null);
        assert.equal((await post('/api/users/signup', { email: 'ann@example.com', password: 'other-pass-1' })).status, 409);
        await verifyEmail('ann@example.com');
        const ok = await post('/api/users/login', { email: 'ann@example.com', password: 's3cret-pass' });
        assert.equal(ok.status, 200);
        cookie = ok.headers.get('set-cookie').split(';')[0];
        assert.match(cookie, /^user_session=[0-9a-f]{64}$/);
    });
    it('login rejects unverified accounts and bad credentials identically', async () => {
        await post('/api/users/signup', { email: 'fresh@example.com', password: 's3cret-pass' });
        assert.equal((await post('/api/users/login', { email: 'fresh@example.com', password: 's3cret-pass' })).status, 403);
        assert.equal((await post('/api/users/login', { email: 'ann@example.com', password: 'nope-nope-no' })).status, 401);
        assert.equal((await post('/api/users/login', { email: 'ghost@example.com', password: 'nope-nope-no' })).status, 401);
    });
    it('me gates on session; logout revokes', async () => {
        const anon = await fetch(`${base}/api/users/me`);
        assert.equal(anon.status, 401);
        const me = await fetch(`${base}/api/users/me`, { headers: { cookie } });
        assert.equal(me.status, 200);
        assert.equal((await me.json()).email, 'ann@example.com');
        assert.equal((await post('/api/users/logout', {}, cookie)).status, 200);
        assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie } })).status, 401);
    });
    it('me re-issues the cookie when the session slides, not otherwise', async () => {
        await post('/api/users/signup', { email: 'slide@example.com', password: 's3cret-pass' });
        await verifyEmail('slide@example.com');
        const res = await post('/api/users/login', { email: 'slide@example.com', password: 's3cret-pass' });
        assert.equal(res.status, 200);
        const raw = res.headers.get('set-cookie').split(';')[0];
        const token = raw.split('=')[1];
        const { sha256hex } = require('../users');
        const idRows = await db.query('SELECT id FROM users WHERE email = ?', ['slide@example.com']);
        const userId = idRows[0].id;
        // Fresh session: no slide, no Set-Cookie, exact body shape.
        const fresh = await fetch(`${base}/api/users/me`, { headers: { cookie: raw } });
        assert.equal(fresh.status, 200);
        assert.deepEqual(await fresh.json(), { id: userId, email: 'slide@example.com' });
        assert.equal(fresh.headers.get('set-cookie'), null);
        // Near-expiry session (<7d left): slide extends the row and re-issues the same token.
        await db.query('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', [
            new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            sha256hex(token),
        ]);
        const slid = await fetch(`${base}/api/users/me`, { headers: { cookie: raw } });
        assert.equal(slid.status, 200);
        const setCookie = slid.headers.get('set-cookie');
        assert.ok(setCookie, 'expected Set-Cookie on slide');
        assert.match(setCookie, new RegExp(`^user_session=${token}`));
        assert.match(setCookie, /Max-Age=2592000/);
        const rows = await db.query('SELECT expires_at FROM sessions WHERE token_hash = ?', [sha256hex(token)]);
        assert.ok(Date.parse(rows[0].expires_at) - Date.now() > 7 * 24 * 3600 * 1000, 'expiry extended past 7d');
    });
});
