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

describe('admin users tab', () => {
    let db; let server; let base; let tmp; let adminCookie;
    let userId; let userCookie;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-admin-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'T' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;
        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        assert.equal(login.status, 200);
        adminCookie = login.headers.get('set-cookie').split(';')[0];
    });
    after(async () => { await new Promise((r) => server.close(r)); await db.close(); });
    const post = (p, body, ck) => fetch(`${base}${p}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(ck ? { cookie: ck } : {}) },
        body: JSON.stringify(body),
    });
    const put = (p, body, ck) => fetch(`${base}${p}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(ck ? { cookie: ck } : {}) },
        body: JSON.stringify(body),
    });
    it('gates list and update behind admin auth', async () => {
        assert.equal((await fetch(`${base}/api/admin/users`)).status, 401);
        assert.equal((await put('/api/admin/users/1', { disabled: true })).status, 401);
    });
    it('lists signed-up users without hashes', async () => {
        const res = await post('/api/users/signup', { email: 'Tab@Example.com', password: 's3cret-pass' });
        assert.equal(res.status, 200);
        userId = (await res.json()).id;
        await db.query('UPDATE users SET verified = 1 WHERE id = ?', [userId]);
        const login = await post('/api/users/login', { email: 'tab@example.com', password: 's3cret-pass' });
        assert.equal(login.status, 200);
        userCookie = login.headers.get('set-cookie').split(';')[0];
        const list = await fetch(`${base}/api/admin/users`, { headers: { cookie: adminCookie } });
        assert.equal(list.status, 200);
        const rows = await list.json();
        const found = rows.find((r) => r.id === userId);
        assert.ok(found, 'new user visible in admin list');
        assert.equal(found.email, 'tab@example.com');
        assert.ok('disabled' in found && 'created_at' in found);
        for (const row of rows) {
            assert.equal(row.password_hash, undefined);
            assert.equal(JSON.stringify(row).includes('hash'), false);
        }
    });
    it('disable blocks login (403) and revokes session (me 401)', async () => {
        const upd = await put(`/api/admin/users/${userId}`, { disabled: true }, adminCookie);
        assert.equal(upd.status, 200);
        assert.equal((await post('/api/users/login', { email: 'tab@example.com', password: 's3cret-pass' })).status, 403);
        assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie: userCookie } })).status, 401);
    });
    it('disable deletes session rows (no revival on re-enable)', async () => {
        const re = await put(`/api/admin/users/${userId}`, { disabled: false }, adminCookie);
        assert.equal(re.status, 200);
        assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie: userCookie } })).status, 401);
        const ok = await post('/api/users/login', { email: 'tab@example.com', password: 's3cret-pass' });
        assert.equal(ok.status, 200);
        userCookie = ok.headers.get('set-cookie').split(';')[0];
    });
    it('unknown id 404s; weak temp password rejected', async () => {
        assert.equal((await put('/api/admin/users/999999', { disabled: true }, adminCookie)).status, 404);
        assert.equal((await put(`/api/admin/users/${userId}`, { password: 'short' }, adminCookie)).status, 400);
    });
    it('temp password re-enables login with the new password', async () => {
        const upd = await put(`/api/admin/users/${userId}`, { disabled: false, password: 'n3w-temp-pass' }, adminCookie);
        assert.equal(upd.status, 200);
        assert.equal((await post('/api/users/login', { email: 'tab@example.com', password: 's3cret-pass' })).status, 401);
        const ok = await post('/api/users/login', { email: 'tab@example.com', password: 'n3w-temp-pass' });
        assert.equal(ok.status, 200);
        assert.equal((await fetch(`${base}/api/users/me`, { headers: { cookie: userCookie } })).status, 401);
    });
});
