// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('availability', () => {
    let db;
    let server;
    let base;
    let tmp;
    let manifestServer;
    let manifestBase;
    let cookie;

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-avail-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });

        manifestServer = http.createServer((req, res) => {
            if (req.url === '/manifest.json') {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({
                    id: 'test.streams',
                    name: 'TestStreams',
                    version: '1.0.0',
                    resources: ['stream', 'catalog'],
                    types: ['movie'],
                    catalogs: [{ type: 'movie', id: 'top' }],
                }));
            } else if (req.url === '/stream/movie/tt111.json') {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ streams: [{ url: `${manifestBase}/alive` }, { url: `${manifestBase}/dead` }] }));
            } else if (req.url === '/stream/movie/tt222.json') {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ streams: [] }));
            } else if (req.url === '/stream/movie/tt333.json') {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ streams: [{ url: `${manifestBase}/dead` }] }));
            } else if (req.url.startsWith('/stream/')) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ streams: [] }));
            } else if (req.url === '/alive') {
                res.writeHead(200, { 'content-type': 'video/mp4' });
                res.end('fake-bytes');
            } else if (req.url === '/dead') {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: 'gone' }));
            } else if (req.url === '/catalog/movie/top.json') {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ metas: [{ id: 'tt111', type: 'movie' }, { id: 'tt222', type: 'movie' }] }));
            } else {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ streams: [] }));
            }
        });
        await new Promise((resolve) => manifestServer.listen(0, '127.0.0.1', resolve));
        manifestBase = `http://127.0.0.1:${manifestServer.address().port}`;

        // Seed addon directly (enabled).
        await db.query('INSERT INTO addons (manifest_url, name, enabled, position) VALUES (?, ?, 1, 0)', [
            `${manifestBase}/manifest.json`,
            'TestStreams',
        ]);

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
        await new Promise((resolve) => manifestServer.close(resolve));
        await new Promise((resolve) => server.close(resolve));
        await db.close();
    });

    it('refresh marks available by probed liveness, not listed count', async () => {
        const res = await fetch(`${base}/api/availability/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({
                items: [{ type: 'movie', id: 'tt111' }, { type: 'movie', id: 'tt222' }, { type: 'movie', id: 'tt333' }],
            }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.checked, 3);
        assert.equal(body.available, 1);

        const rows = await db.query('SELECT meta_key, available, streams FROM availability ORDER BY meta_key');
        const byKey = Object.fromEntries(rows.map((r) => [r.meta_key, r]));
        assert.equal(byKey['movie:tt111'].available, 1);
        assert.equal(byKey['movie:tt111'].streams, 1);
        assert.equal(byKey['movie:tt222'].available, 0);
        assert.equal(byKey['movie:tt222'].streams, 0);
        assert.equal(byKey['movie:tt333'].available, 0);
        assert.equal(byKey['movie:tt333'].streams, 0);
    });

    it('GET batch returns map and omits unknown keys, skips invalid format', async () => {
        const res = await fetch(`${base}/api/availability?keys=movie:tt111,movie:tt222,movie:tt999,badkey,series:!!`);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.ok(body['movie:tt111'], 'has tt111');
        assert.equal(body['movie:tt111'].available, 1);
        assert.equal(body['movie:tt111'].streams, 1);
        assert.ok(typeof body['movie:tt111'].checked_at === 'string');
        assert.ok(body['movie:tt222'], 'has tt222');
        assert.equal(body['movie:tt999'], undefined, 'omits unknown keys');
        assert.equal(body['badkey'], undefined, 'skips invalid format');
        assert.equal(body['series:!!'], undefined, 'skips invalid format');
    });

    it('unauthenticated refresh -> 401', async () => {
        const res = await fetch(`${base}/api/availability/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items: [{ type: 'movie', id: 'tt111' }] }),
        });
        assert.equal(res.status, 401);
    });

    it('caps >200 items', async () => {
        const items = [];
        for (let i = 0; i < 250; i++) items.push({ type: 'movie', id: `tt900${i}` });
        const res = await fetch(`${base}/api/availability/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ items }),
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.checked, 200);
    });

    it('addon outage preserves existing rows instead of blanking titles', async () => {
        await db.query(
            "INSERT INTO availability (meta_key, available, streams, checked_at) VALUES ('movie:tt000', 1, 3, '2026-10-08T00:00:00.000Z')"
        );
        await db.query('DELETE FROM addons');
        const res = await fetch(`${base}/api/availability/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ items: [{ type: 'movie', id: 'tt000' }] }),
        });
        assert.equal(res.status, 200);
        const outage = await res.json();
        assert.equal(outage.checked, 0);
        assert.equal(outage.skipped, 1);
        const rows = await db.query('SELECT available, streams, checked_at FROM availability WHERE meta_key = ?', [
            'movie:tt000',
        ]);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].available, 1);
        assert.equal(rows[0].streams, 3);
        assert.equal(rows[0].checked_at, '2026-10-08T00:00:00.000Z');
    });
});
