// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('newsletter', () => {
    let db;
    let server;
    let base;
    let tmp;

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-nl-'));
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

    const post = (payload) =>
        fetch(`${base}/api/newsletter`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
        });

    it('rejects invalid emails', async () => {
        const res = await post({ email: 'not-an-email' });
        assert.equal(res.status, 400);
    });

    it('accepts, normalizes, and dedupes', async () => {
        const first = await post({ email: '  Fan@Example.COM ', source: 'popup' });
        assert.equal(first.status, 200);
        assert.deepEqual(await first.json(), { ok: true });
        const again = await post({ email: 'fan@example.com' });
        assert.equal(again.status, 200);
        const rows = await db.query('SELECT email, source FROM newsletter_emails');
        assert.equal(rows.length, 1);
        assert.equal(rows[0].email, 'fan@example.com');
        assert.equal(rows[0].source, 'popup');
    });

    it('stores distinct addresses', async () => {
        const res = await post({ email: 'second@example.org' });
        assert.equal(res.status, 200);
        const rows = await db.query('SELECT COUNT(*) AS n FROM newsletter_emails');
        assert.equal(Number(rows[0].n), 2);
    });
});
