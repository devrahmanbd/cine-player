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

describe('addons import & export', () => {
    let db;
    let server;
    let base;
    let tmp;
    let manifestServer;
    let manifestBase;
    let cookie;

    const MANIFEST_1 = { id: 'community.torrentio', name: 'Torrentio RD', version: '1.0.0', resources: ['stream'] };
    const MANIFEST_2 = { id: 'community.cyberflix', name: 'Cyberflix Catalog', version: '1.4.0', resources: ['catalog'] };

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-addons-io-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;

        manifestServer = http.createServer((req, res) => {
            if (req.url.includes('/torrentio/manifest.json')) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify(MANIFEST_1));
            } else if (req.url.includes('/cyberflix/manifest.json')) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify(MANIFEST_2));
            } else {
                res.writeHead(404, { 'content-type': 'text/plain' });
                res.end('nope');
            }
        });
        await new Promise((resolve) => manifestServer.listen(0, '127.0.0.1', resolve));
        manifestBase = `http://127.0.0.1:${manifestServer.address().port}`;

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

    it('requires auth for export and import', async () => {
        const exp = await fetch(`${base}/api/admin/addons/export`);
        assert.equal(exp.status, 401);

        const imp = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ addons: [] }),
        });
        assert.equal(imp.status, 401);
    });

    it('rejects empty import payload', async () => {
        const imp = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ addons: [] }),
        });
        assert.equal(imp.status, 400);
    });

    it('imports addons in merge mode with custom configuration and API keys', async () => {
        const complexUrl1 = `${manifestBase}/torrentio/providers=yts,eztv|realdebrid=MY_SECRET_RD_TOKEN/manifest.json`;
        const complexUrl2 = `${manifestBase}/cyberflix/configure`; // Tests automatic conversion from /configure

        const payload = {
            mode: 'merge',
            addons: [
                {
                    manifest_url: complexUrl1,
                    name: 'Torrentio RD Custom',
                    enabled: true,
                    position: 1,
                },
                {
                    transportUrl: complexUrl2, // Stremio key name
                    enabled: false,
                    position: 2,
                },
            ],
        };

        const res = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify(payload),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.total, 2);
        assert.equal(data.imported, 2);
        assert.equal(data.failed, 0);

        // Verify with export
        const exportRes = await fetch(`${base}/api/admin/addons/export`, {
            headers: { cookie },
        });
        assert.equal(exportRes.status, 200);
        const exportData = await exportRes.json();
        assert.equal(exportData.total, 2);
        assert.equal(exportData.addons[0].manifest_url, complexUrl1);
        assert.equal(exportData.addons[0].name, 'Torrentio RD Custom');
        assert.equal(exportData.addons[0].enabled, true);
        assert.equal(exportData.addons[1].manifest_url, `${manifestBase}/cyberflix/manifest.json`);
        assert.equal(exportData.addons[1].enabled, false);
    });

    it('updates existing addons without losing configurations on subsequent merge import', async () => {
        const complexUrl1 = `${manifestBase}/torrentio/providers=yts,eztv|realdebrid=MY_SECRET_RD_TOKEN/manifest.json`;
        const payload = {
            mode: 'merge',
            enableAll: true,
            addons: [
                {
                    manifest_url: complexUrl1,
                    name: 'Torrentio RD Updated Name',
                    position: 5,
                },
            ],
        };

        const res = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify(payload),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.updated, 1);
        assert.equal(data.imported, 0);

        const exportRes = await fetch(`${base}/api/admin/addons/export`, { headers: { cookie } });
        const exportData = await exportRes.json();
        const updated = exportData.addons.find((a) => a.manifest_url === complexUrl1);
        assert.ok(updated);
        assert.equal(updated.name, 'Torrentio RD Updated Name');
        assert.equal(updated.position, 5);
        assert.equal(updated.enabled, true);
    });

    it('imports raw newline-separated text containing stremio:// and https:// URLs', async () => {
        const rawText = `
        stremio://127.0.0.1:${manifestServer.address().port}/torrentio/manifest.json
        ${manifestBase}/cyberflix/manifest.json
        https://nonexistent-addon.local/token=123/manifest.json
        `;

        const res = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ raw: rawText, mode: 'merge' }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.total, 3);
        // Nonexistent addon gets a fallback manifest and is not dropped
        assert.equal(data.failed, 0);
    });

    it('replaces all addons cleanly when mode is replace', async () => {
        const replacePayload = {
            mode: 'replace',
            addons: [
                {
                    manifest_url: `${manifestBase}/torrentio/manifest.json`,
                    name: 'Only Torrentio',
                    enabled: true,
                    position: 0,
                },
            ],
        };

        const res = await fetch(`${base}/api/admin/addons/import`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify(replacePayload),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.imported, 1);

        const exportRes = await fetch(`${base}/api/admin/addons/export`, { headers: { cookie } });
        const exportData = await exportRes.json();
        assert.equal(exportData.total, 1);
        assert.equal(exportData.addons[0].name, 'Only Torrentio');
    });
});
