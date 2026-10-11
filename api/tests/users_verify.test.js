// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it, before, after */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults, hashPassword } = require('../seed');
const { startServer } = require('../server');

describe('users verify', () => {
    let db; let server; let base; let tmp;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-verify-'));
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
    const signup = (email) => post('/api/users/signup', { email, password: 's3cret-pass' });
    const knownCode = async (email, code) => {
        await db.query('UPDATE otp_codes SET consumed = 1 WHERE email = ? AND consumed = 0', [email]);
        const now = new Date();
        await db.query(
            'INSERT INTO otp_codes (email, code_hash, expires_at, attempts, consumed, created_at) VALUES (?, ?, ?, 0, 0, ?)',
            [email, hashPassword(code), new Date(now.getTime() + 10 * 60 * 1000).toISOString(), now.toISOString()]
        );
    };
    it('verify/request is oracle-free; verify rejects bad codes and locks', async () => {
        assert.equal((await post('/api/users/verify/request', { email: 'bad' })).status, 400);
        assert.equal((await post('/api/users/verify/request', { email: 'ghost@example.com' })).status, 200);
        await signup('lock-v@example.com');
        assert.equal((await post('/api/users/verify', { email: 'lock-v@example.com', code: 'nope' })).status, 401);
        await knownCode('lock-v@example.com', '111111');
        for (let i = 0; i < 5; i++) {
            assert.equal((await post('/api/users/verify', { email: 'lock-v@example.com', code: '000000' })).status, 401);
        }
        assert.equal((await post('/api/users/verify', { email: 'lock-v@example.com', code: '000000' })).status, 429);
    });
    it('right code verifies, starts a session, and enables login', async () => {
        await signup('happy-v@example.com');
        assert.equal((await post('/api/users/login', { email: 'happy-v@example.com', password: 's3cret-pass' })).status, 403);
        await knownCode('happy-v@example.com', '222222');
        const res = await post('/api/users/verify', { email: 'happy-v@example.com', code: '222222' });
        assert.equal(res.status, 200);
        assert.equal((await res.json()).email, 'happy-v@example.com');
        const cookie = res.headers.get('set-cookie').split(';')[0];
        assert.match(cookie, /^user_session=[0-9a-f]{64}$/);
        assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie } })).status, 200);
        const again = await post('/api/users/login', { email: 'happy-v@example.com', password: 's3cret-pass' });
        assert.equal(again.status, 200);
        assert.equal((await post('/api/users/verify', { email: 'happy-v@example.com', code: '222222' })).status, 401);
    });
});
