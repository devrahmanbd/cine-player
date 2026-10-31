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

describe('addons', () => {
    let db;
    let server;
    let base;
    let tmp;
    let manifestServer;
    let manifestBase;
    let cookie;

    const MANIFEST = { id: 'test.addon', name: 'Test', version: '1.0.0', resources: [] };

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-addons-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;

        manifestServer = http.createServer((req, res) => {
            if (req.url.endsWith('/manifest.json')) {
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify(MANIFEST));
            } else if (req.url === '/not-json') {
                res.writeHead(200, { 'content-type': 'text/html' });
                res.end('<html>not json</html>');
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

    it('rejects invalid manifest URL', async () => {
        const res = await fetch(`${base}/api/addons`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ manifest_url: 'http://127.0.0.1:1/nope.json' }),
        });
        assert.equal(res.status, 400);
    });

    it('rejects non-JSON manifest', async () => {
        const res = await fetch(`${base}/api/addons`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ manifest_url: `${manifestBase}/not-json` }),
        });
        assert.equal(res.status, 400);
    });

    it('stores valid manifest, enforces duplicates, toggles visibility, deletes', async () => {
        // POST valid
        const createdRes = await fetch(`${base}/api/addons`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ manifest_url: `${manifestBase}/manifest.json` }),
        });
        assert.equal(createdRes.status, 200);
        const created = await createdRes.json();
        assert.ok(created.id, 'has db id');
        assert.equal(created.manifest_url, `${manifestBase}/manifest.json`);
        assert.equal(created.name, 'Test');
        const addonId = created.id;

        // duplicate POST -> 409
        const dup = await fetch(`${base}/api/addons`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ manifest_url: `${manifestBase}/manifest.json` }),
        });
        assert.equal(dup.status, 409);

        // GET public shows it
        const list = await (await fetch(`${base}/api/addons`)).json();
        assert.equal(list.length, 1);
        assert.equal(list[0].manifest_url, `${manifestBase}/manifest.json`);
        assert.equal(list[0].name, 'Test');

        // PUT disable -> GET hides it
        const disabledRes = await fetch(`${base}/api/addons/${addonId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ enabled: false }),
        });
        assert.equal(disabledRes.status, 200);
        const hidden = await (await fetch(`${base}/api/addons`)).json();
        assert.equal(hidden.length, 0);

        // PUT bad id -> 404
        const badPut = await fetch(`${base}/api/addons/999999`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ enabled: true }),
        });
        assert.equal(badPut.status, 404);

        // unauthenticated POST/PUT/DELETE -> 401
        const noAuthPost = await fetch(`${base}/api/addons`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ manifest_url: `${manifestBase}/manifest.json` }),
        });
        assert.equal(noAuthPost.status, 401);
        const noAuthPut = await fetch(`${base}/api/addons/${addonId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ enabled: true }),
        });
        assert.equal(noAuthPut.status, 401);
        const noAuthDel = await fetch(`${base}/api/addons/${addonId}`, { method: 'DELETE' });
        assert.equal(noAuthDel.status, 401);

        // DELETE removes it
        const del = await fetch(`${base}/api/addons/${addonId}`, {
            method: 'DELETE',
            headers: { cookie },
        });
        assert.equal(del.status, 200);
        const afterDel = await (await fetch(`${base}/api/addons`)).json();
        assert.equal(afterDel.length, 0);

        // DELETE missing -> 404
        const delMissing = await fetch(`${base}/api/addons/${addonId}`, {
            method: 'DELETE',
            headers: { cookie },
        });
        assert.equal(delMissing.status, 404);
    });

    it('proxies manifests for enabled addons only (allowlisted, never open)', async () => {
        const created = await (
            await fetch(`${base}/api/addons`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ manifest_url: `${manifestBase}/manifest.json` }),
            })
        ).json();
        const addonId = created.id;

        // unknown URL -> 404 (not an open proxy)
        const evil = await fetch(
            `${base}/api/addons/manifest?url=${encodeURIComponent('https://evil.example/manifest.json')}`
        );
        assert.equal(evil.status, 404);

        // enabled -> 200 with manifest
        const proxied = await fetch(
            `${base}/api/addons/manifest?url=${encodeURIComponent(`${manifestBase}/manifest.json`)}`
        );
        assert.equal(proxied.status, 200);
        assert.equal((await proxied.json()).id, 'test.addon');

        // disabled -> 404
        await fetch(`${base}/api/addons/${addonId}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ enabled: false }),
        });
        const hidden = await fetch(
            `${base}/api/addons/manifest?url=${encodeURIComponent(`${manifestBase}/manifest.json`)}`
        );
        assert.equal(hidden.status, 404);
    });

    it('supports admin addons listing with rich metadata, preview, and manifest_url update', async () => {
        // Unauthenticated admin endpoints -> 401
        const noAuthAdminList = await fetch(`${base}/api/admin/addons`);
        assert.equal(noAuthAdminList.status, 401);
        const noAuthPreview = await fetch(`${base}/api/admin/addons/preview?url=${encodeURIComponent(`${manifestBase}/manifest.json`)}`);
        assert.equal(noAuthPreview.status, 401);

        // Preview route with valid manifest
        const previewRes = await fetch(
            `${base}/api/admin/addons/preview?url=${encodeURIComponent(`${manifestBase}/manifest.json`)}`,
            { headers: { cookie } }
        );
        assert.equal(previewRes.status, 200);
        const preview = await previewRes.json();
        assert.equal(preview.ok, true);
        assert.equal(preview.name, 'Test');
        assert.equal(preview.version, '1.0.0');

        // stremio:// URL normalization in POST
        const stremioUrl = manifestBase.replace(/^http:/, 'stremio:') + '/configured/manifest.json';
        const createdStremio = await (
            await fetch(`${base}/api/addons`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', cookie },
                body: JSON.stringify({ manifest_url: stremioUrl }),
            })
        ).json();
        assert.ok(createdStremio.id);
        assert.ok(createdStremio.manifest_url.startsWith('https://') || createdStremio.manifest_url.startsWith('http://'));

        // Admin list returns all addons with metadata, including disabled ones
        const adminList = await (
            await fetch(`${base}/api/admin/addons`, {
                headers: { cookie },
            })
        ).json();
        assert.ok(Array.isArray(adminList));
        assert.ok(adminList.length >= 1);
        const entry = adminList.find((a) => a.id === createdStremio.id);
        assert.ok(entry);
        assert.equal(entry.name, 'Test');
        assert.equal(entry.version, '1.0.0');
        assert.equal(entry.enabled, true);
        assert.equal(typeof entry.configurable, 'boolean');
        assert.equal(typeof entry.configurationRequired, 'boolean');

        // Update manifest_url via PUT
        const updatedRes = await fetch(`${base}/api/addons/${createdStremio.id}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', cookie },
            body: JSON.stringify({ manifest_url: `${manifestBase}/updated/manifest.json` }),
        });
        assert.equal(updatedRes.status, 200);
        const updated = await updatedRes.json();
        assert.equal(updated.manifest_url, `${manifestBase}/updated/manifest.json`);
    });
});
