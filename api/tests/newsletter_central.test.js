// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('newsletter centralized & admin export', () => {
    let db;
    let server;
    let base;
    let tmp;
    let authCookie;
    let centralServer;
    let centralBase;
    const relayedEvents = [];

    before(async () => {
        // Mock central server
        centralServer = http.createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
                if (req.url === '/api/newsletter' && req.method === 'POST') {
                    try {
                        relayedEvents.push({
                            body: JSON.parse(body),
                            headers: req.headers,
                        });
                    } catch (_) {}
                    res.writeHead(200, { 'content-type': 'application/json' });
                    return res.end(JSON.stringify({ ok: true }));
                }
                res.writeHead(404);
                res.end();
            });
        });
        await new Promise((resolve) => centralServer.listen(0, '127.0.0.1', resolve));
        const centralPort = centralServer.address().port;
        centralBase = `http://127.0.0.1:${centralPort}`;

        process.env.CENTRAL_NEWSLETTER_URL = `${centralBase}/api/newsletter`;
        process.env.CENTRAL_EMAIL_SECRET = 'central-secret-123';

        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-nl-central-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'DJMaza' });

        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;

        const login = await fetch(`${base}/api/admin/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'root', password: 's3cret!' }),
        });
        authCookie = login.headers.get('set-cookie').split(';')[0];
    });

    after(async () => {
        delete process.env.CENTRAL_NEWSLETTER_URL;
        delete process.env.CENTRAL_EMAIL_SECRET;
        if (server) await new Promise((resolve) => server.close(resolve));
        if (centralServer) await new Promise((resolve) => centralServer.close(resolve));
        if (db) await db.close();
    });

    it('requires admin authentication for admin newsletter routes', async () => {
        const listRes = await fetch(`${base}/api/admin/newsletter`);
        assert.equal(listRes.status, 401);

        const exportRes = await fetch(`${base}/api/admin/newsletter/export`);
        assert.equal(exportRes.status, 401);
    });

    it('records subscribers with domain tagging and relays to central server', async () => {
        const subRes = await fetch(`${base}/api/newsletter`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-forwarded-host': 'djmaza.cc',
            },
            body: JSON.stringify({ email: 'user1@djmaza.cc', source: 'popup' }),
        });
        assert.equal(subRes.status, 200);

        // Wait brief moment for async relay fetch
        await new Promise((resolve) => setTimeout(resolve, 150));

        assert.equal(relayedEvents.length, 1);
        assert.equal(relayedEvents[0].body.email, 'user1@djmaza.cc');
        assert.equal(relayedEvents[0].body.source, 'djmaza.cc');
        assert.equal(relayedEvents[0].body._relayed, true);
        assert.equal(relayedEvents[0].headers['x-central-secret'], 'central-secret-123');

        // Add second subscriber directly with custom domain source
        await fetch(`${base}/api/newsletter`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'user2@cinemavilla.cc', source: 'cinemavilla.cc' }),
        });
    });

    it('returns breakdown and subscribers list in GET /api/admin/newsletter', async () => {
        const res = await fetch(`${base}/api/admin/newsletter`, {
            headers: { cookie: authCookie },
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.total, 2);
        assert.equal(data.breakdown['djmaza.cc'], 1);
        assert.equal(data.breakdown['cinemavilla.cc'], 1);
        assert.equal(data.subscribers.length, 2);
    });

    it('exports subscribers as CSV in GET /api/admin/newsletter/export', async () => {
        const res = await fetch(`${base}/api/admin/newsletter/export`, {
            headers: { cookie: authCookie },
        });
        assert.equal(res.status, 200);
        assert.ok(res.headers.get('content-type').includes('text/csv'));
        assert.ok(res.headers.get('content-disposition').includes('newsletter-subscribers.csv'));

        const text = await res.text();
        const lines = text.trim().split('\n');
        assert.equal(lines[0], 'id,email,source,created_at');
        assert.ok(lines.some((l) => l.includes('user1@djmaza.cc') && l.includes('djmaza.cc')));
        assert.ok(lines.some((l) => l.includes('user2@cinemavilla.cc') && l.includes('cinemavilla.cc')));
    });
});
