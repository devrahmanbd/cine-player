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
    it('signup validates, dedups, and sets a session cookie', async () => {
        assert.equal((await post('/api/users/signup', { email: 'bad', password: '12345678' })).status, 400);
        assert.equal((await post('/api/users/signup', { email: 'a@b.co', password: 'short' })).status, 400);
        const res = await post('/api/users/signup', { email: 'Ann@Example.com', password: 's3cret-pass' });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.email, 'ann@example.com');
        cookie = res.headers.get('set-cookie').split(';')[0];
        assert.match(cookie, /^user_session=[0-9a-f]{64}$/);
        assert.equal((await post('/api/users/signup', { email: 'ann@example.com', password: 'other-pass-1' })).status, 409);
    });
    it('login accepts good credentials and rejects bad ones identically', async () => {
        const ok = await post('/api/users/login', { email: 'ann@example.com', password: 's3cret-pass' });
        assert.equal(ok.status, 200);
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
});
