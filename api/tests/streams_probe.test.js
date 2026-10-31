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

describe('streams-probe', () => {
    let db;
    let server;
    let base;
    let tmp;
    let mockMediaServer;
    let mockMediaBase;

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-probe-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;

        // Local mock HTTP server to simulate media endpoints
        mockMediaServer = http.createServer((req, res) => {
            if (req.url === '/video.mp4') {
                if (req.headers.range) {
                    res.writeHead(206, {
                        'content-type': 'video/mp4',
                        'content-range': 'bytes 0-0/1000',
                        'accept-ranges': 'bytes',
                        'content-length': '1',
                    });
                    res.end('x');
                } else {
                    res.writeHead(200, {
                        'content-type': 'video/mp4',
                        'accept-ranges': 'bytes',
                        'content-length': '1000',
                    });
                    res.end('x');
                }
                return;
            }

            if (req.url === '/landing.html') {
                res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
                res.end('<!doctype html><html>Download Page</html>');
                return;
            }

            if (req.url === '/forbidden') {
                res.writeHead(403, { 'content-type': 'text/plain' });
                res.end('Access Denied');
                return;
            }

            if (req.url === '/missing') {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end('{"error":"not found"}');
                return;
            }

            res.writeHead(500);
            res.end();
        });

        await new Promise((resolve) => mockMediaServer.listen(0, '127.0.0.1', resolve));
        const mockAddr = mockMediaServer.address();
        mockMediaBase = `http://127.0.0.1:${mockAddr.port}`;
    });

    after(async () => {
        await new Promise((resolve) => mockMediaServer.close(resolve));
        await new Promise((resolve) => server.close(resolve));
        await db.close();
    });

    it('returns empty results for empty or non-array urls', async () => {
        const res = await fetch(`${base}/api/streams/probe`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ urls: [] }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.deepEqual(data, { results: {} });
    });

    it('probes working, dead, and landing page URLs accurately', async () => {
        const videoUrl = `${mockMediaBase}/video.mp4`;
        const landingUrl = `${mockMediaBase}/landing.html`;
        const forbiddenUrl = `${mockMediaBase}/forbidden`;
        const missingUrl = `${mockMediaBase}/missing`;

        const res = await fetch(`${base}/api/streams/probe`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ urls: [videoUrl, landingUrl, forbiddenUrl, missingUrl] }),
        });
        assert.equal(res.status, 200);
        const data = await res.json();

        assert.ok(data.results[videoUrl]);
        assert.equal(data.results[videoUrl].alive, true);
        assert.equal(data.results[videoUrl].streamable, true);

        assert.ok(data.results[landingUrl]);
        assert.equal(data.results[landingUrl].alive, false);
        assert.equal(data.results[landingUrl].streamable, false);

        assert.ok(data.results[forbiddenUrl]);
        assert.equal(data.results[forbiddenUrl].alive, false);
        assert.equal(data.results[forbiddenUrl].streamable, false);
        assert.equal(data.results[forbiddenUrl].status, 403);

        assert.ok(data.results[missingUrl]);
        assert.equal(data.results[missingUrl].alive, false);
        assert.equal(data.results[missingUrl].streamable, false);
        assert.equal(data.results[missingUrl].status, 404);
    });

    it('caches probe results for fast repeat lookups', async () => {
        const videoUrl = `${mockMediaBase}/video.mp4`;
        const start = Date.now();
        const res = await fetch(`${base}/api/streams/probe`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ urls: [videoUrl] }),
        });
        const elapsed = Date.now() - start;
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.results[videoUrl].alive, true);
        // Repeat call from cache should be sub-50ms
        assert.ok(elapsed < 100);
    });
});
