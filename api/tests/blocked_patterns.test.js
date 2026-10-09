// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('blocked-patterns', () => {
    let db;
    let server;
    let base;
    let tmp;
    let cookie;

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-blocked-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;

        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        assert.equal(login.status, 200);
        cookie = login.headers.get('set-cookie').split(';')[0];
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
        await db.close();
    });

    it('public GET returns empty list initially', async () => {
        const res = await fetch(`${base}/api/blocked-patterns`);
        assert.equal(res.status, 200);
        const list = await res.json();
        assert.ok(Array.isArray(list));
        assert.equal(list.length, 0);
    });

    it('rejects unauthenticated POST/DELETE with 401', async () => {
        const post = await fetch(`${base}/api/blocked-patterns`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pattern: 'promo' }),
        });
        assert.equal(post.status, 401);
        const del = await fetch(`${base}/api/blocked-patterns/1`, { method: 'DELETE' });
        assert.equal(del.status, 401);
    });

    it('rejects bad input with 400', async () => {
        const cases = [
            {},
            { pattern: '' },
            { pattern: ' ' },
            { pattern: 'x' },
            { pattern: 'x'.repeat(121) },
            { pattern: 123 },
        ];
        for (const body of cases) {
            const res = await fetch(`${base}/api/blocked-patterns`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify(body),
            });
            assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
        }
    });

    it('CRUD round-trip, duplicate 409, delete 404', async () => {
        const createdRes = await fetch(`${base}/api/blocked-patterns`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ pattern: '  promo-link  ' }),
        });
        assert.equal(createdRes.status, 200);
        const created = await createdRes.json();
        assert.ok(created.id);
        assert.equal(created.pattern, 'promo-link');

        const dup = await fetch(`${base}/api/blocked-patterns`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ pattern: 'promo-link' }),
        });
        assert.equal(dup.status, 409);

        const list = await (await fetch(`${base}/api/blocked-patterns`)).json();
        assert.equal(list.length, 1);
        assert.equal(list[0].pattern, 'promo-link');

        const del = await fetch(`${base}/api/blocked-patterns/${created.id}`, {
            method: 'DELETE',
            headers: { cookie },
        });
        assert.equal(del.status, 200);

        const afterDel = await (await fetch(`${base}/api/blocked-patterns`)).json();
        assert.equal(afterDel.length, 0);

        const delMissing = await fetch(`${base}/api/blocked-patterns/${created.id}`, {
            method: 'DELETE',
            headers: { cookie },
        });
        assert.equal(delMissing.status, 404);
    });
});
