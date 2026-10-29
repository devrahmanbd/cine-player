// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('server', () => {
    let db;
    let server;
    let base;
    let tmp;

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;
    });

    after(async () => {
        await new Promise((resolve) => server.close(resolve));
        await db.close();
    });

    it('health + public branding + adslots', async () => {
        const health = await (await fetch(`${base}/api/health`)).json();
        assert.equal(health.ok, true);
        const brand = await (await fetch(`${base}/api/branding`)).json();
        assert.equal(brand.site_name, 'TestStream');
        const adslots = await (await fetch(`${base}/api/adslots`)).json();
        assert.equal(adslots.master, 0);
        assert.equal(adslots.slots.length, 10);
    });

    it('ad slots master toggle requires auth', async () => {
        const denied = await fetch(`${base}/api/adslots`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ master: 1 }),
        });
        assert.equal(denied.status, 401);
    });

    it('master toggle round-trips and stays numeric', async () => {
        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const on = await (
            await fetch(`${base}/api/adslots`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ master: 1 }),
            })
        ).json();
        assert.equal(on.master, 1);
        assert.equal(typeof on.master, 'number');
        const seen = await (await fetch(`${base}/api/adslots`)).json();
        assert.equal(seen.master, 1);
        const off = await (
            await fetch(`${base}/api/adslots`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ master: 0 }),
            })
        ).json();
        assert.equal(off.master, 0);
        const seenOff = await (await fetch(`${base}/api/adslots`)).json();
        assert.equal(seenOff.master, 0);
    });

    it('adTypes map matches the seeded slot keys', () => {
        const { SLOT_KEYS } = require('../seed');
        const { AD_TYPES } = require('../../src/branding/adTypes');
        const union = AD_TYPES.flatMap((t) => t.slots).sort();
        assert.deepEqual(union, [...SLOT_KEYS].sort());
    });

    it('gates writes behind login', async () => {
        const denied = await fetch(`${base}/api/branding`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ site_name: 'Hacked' }),
        });
        assert.equal(denied.status, 401);

        const badLogin = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 'wrong' }),
        });
        assert.equal(badLogin.status, 401);

        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie').split(';')[0];

        const me = await (
            await fetch(`${base}/api/admin/me`, { headers: { cookie } })
        ).json();
        assert.equal(me.username, 'root');

        const updated = await (
            await fetch(`${base}/api/branding`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ site_name: 'Renamed', evil: 'drop table' }),
            })
        ).json();
        assert.equal(updated.site_name, 'Renamed');
        assert.equal(updated.evil, undefined);

        const slot = await (
            await fetch(`${base}/api/adslots`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ slot_key: 'nope', enabled: 1, code: 'x' }),
            })
        );
        assert.equal(slot.status, 400);
    });

    it('rejects bad uploads', async () => {
        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const badExt = await fetch(`${base}/api/uploads`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({}),
        });
        assert.equal(badExt.status, 400);
        const bad = await (
            await fetch(`${base}/api/uploads`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ filename: 'x.exe', data: Buffer.from('hi').toString('base64') }),
            })
        );
        assert.equal(bad.status, 400);
        const good = await (
            await fetch(`${base}/api/uploads`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ filename: 'logo.png', data: Buffer.from('fakepng').toString('base64') }),
            })
        ).json();
        assert.match(good.url, /^\/brand\/.+\.png$/);
    });

    it('serves bundled brand defaults when uploads are missing (logo never 404s)', async () => {
        const res = await fetch(`${base}/brand/logo.svg`);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /svg/);
        const missing = await fetch(`${base}/brand/no-such-file.png`);
        assert.equal(missing.status, 404);
    });
});
