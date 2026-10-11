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

describe('users otp reset', () => {
    let db; let server; let base; let tmp;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-otp-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        delete process.env.SMTP_FROM;
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
    const signup = (email, password) => post('/api/users/signup', { email, password });

    it('request contract: 503 on smtp failure, 200 oracle-free for ghosts, 400 for bad shapes', async () => {
        await signup('otp-req@example.com', 'old-password-1');
        // No SMTP_FROM in this harness, so sendMail throws for the real user:
        // spec contract is 503 with a generic oracle-free body.
        const ok = await post('/api/users/password/otp/request', { email: 'otp-req@example.com' });
        assert.equal(ok.status, 503);
        assert.deepEqual(await ok.json(), { error: 'mail failed' });
        const ghost = await post('/api/users/password/otp/request', { email: 'ghost-otp@example.com' });
        assert.equal(ghost.status, 200);
        assert.deepEqual(await ghost.json(), { ok: true });
        assert.equal((await post('/api/users/password/otp/request', { email: 'bad' })).status, 400);
        assert.equal((await post('/api/users/password/otp/request', {})).status, 400);
    });

    it('smtp failure is 503 with the same generic body for every address', async () => {
        await signup('otp-smtp-a@example.com', 'old-password-1');
        await signup('otp-smtp-b@example.com', 'old-password-1');
        const a = await post('/api/users/password/otp/request', { email: 'otp-smtp-a@example.com' });
        const b = await post('/api/users/password/otp/request', { email: 'otp-smtp-b@example.com' });
        assert.equal(a.status, 503);
        assert.equal(b.status, 503);
        assert.deepEqual(await a.json(), { error: 'mail failed' });
        assert.deepEqual(await b.json(), { error: 'mail failed' });
    });

    it('rejects wrong codes identically and locks after 5', async () => {
        await signup('otp-lock@example.com', 'old-password-1');
        await post('/api/users/password/otp/request', { email: 'otp-lock@example.com' });
        for (let i = 0; i < 5; i++) {
            const res = await post('/api/users/password/otp/verify', {
                email: 'otp-lock@example.com',
                code: '000000',
                password: 'new-password-1',
            });
            assert.equal(res.status, 401, `wrong attempt ${i + 1} should be 401`);
        }
        const locked = await post('/api/users/password/otp/verify', {
            email: 'otp-lock@example.com',
            code: '000000',
            password: 'new-password-1',
        });
        assert.equal(locked.status, 429);
        const ghost = await post('/api/users/password/otp/verify', {
            email: 'ghost-otp@example.com',
            code: '000000',
            password: 'new-password-1',
        });
        assert.equal(ghost.status, 401);
    });

    it('expired codes fail closed', async () => {
        await signup('otp-exp@example.com', 'old-password-1');
        const now = new Date().toISOString();
        await db.query(
            'INSERT INTO otp_codes (email, code_hash, expires_at, attempts, consumed, created_at) VALUES (?, ?, ?, 0, 0, ?)',
            ['otp-exp@example.com', hashPassword('123456'), new Date(Date.now() - 1000).toISOString(), now]
        );
        const res = await post('/api/users/password/otp/verify', {
            email: 'otp-exp@example.com',
            code: '123456',
            password: 'new-password-1',
        });
        assert.equal(res.status, 401);
    });

    it('accepts the right code, resets password, revokes sessions', async () => {
        await signup('otp-happy@example.com', 'old-password-1');
        const login = await post('/api/users/login', { email: 'otp-happy@example.com', password: 'old-password-1' });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const now = new Date().toISOString();
        await db.query(
            'INSERT INTO otp_codes (email, code_hash, expires_at, attempts, consumed, created_at) VALUES (?, ?, ?, 0, 0, ?)',
            ['otp-happy@example.com', hashPassword('123456'), new Date(Date.now() + 10 * 60 * 1000).toISOString(), now]
        );
        const verify = await post('/api/users/password/otp/verify', {
            email: 'otp-happy@example.com',
            code: '123456',
            password: 'new-password-1',
        });
        assert.equal(verify.status, 200);
        assert.deepEqual(await verify.json(), { ok: true });
        const relogin = await post('/api/users/login', { email: 'otp-happy@example.com', password: 'new-password-1' });
        assert.equal(relogin.status, 200);
        const oldpw = await post('/api/users/login', { email: 'otp-happy@example.com', password: 'old-password-1' });
        assert.equal(oldpw.status, 401);
        const me = await fetch(`${base}/api/users/me`, { headers: { cookie } });
        assert.equal(me.status, 401);
    });
});
