// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const tidb = require('../tidb');

describe('TiDB Cloud MySQL newsletter integration', () => {
    const testConfig = {
        host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
        port: Number(process.env.TIDB_PORT || 4000),
        user: process.env.TIDB_USER || '2AhDjYHX8mp5pHx.root',
        password: process.env.TIDB_PASSWORD || 'v7pnZ2MMwCEqfXV8',
        database: process.env.TIDB_DATABASE || 'emails',
    };

    const testEmail1 = `test-tidb-${Date.now()}@example.com`;
    const testEmail2 = `test-tidb2-${Date.now()}@example.com`;

    before(async () => {
        const ok = await tidb.initTidb(testConfig);
        assert.equal(ok, true, 'TiDB initialization should succeed');
    });

    after(async () => {
        // Clean up test rows
        if (tidb.isAvailable()) {
            const mysql = require('mysql2/promise');
            const pool = mysql.createPool({
                ...testConfig,
                ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
            });
            await pool.query('DELETE FROM newsletter_emails WHERE email IN (?, ?)', [testEmail1, testEmail2]);
            await pool.end();
        }
        await tidb.close();
    });

    it('reports available after initialization', () => {
        assert.equal(tidb.isAvailable(), true);
    });

    it('saves email with domain source', async () => {
        const saved = await tidb.saveEmail({ email: testEmail1, source: 'djmaza.cc' });
        assert.equal(saved, true);
    });

    it('appends domain on subsequent subscription from another domain', async () => {
        const savedAgain = await tidb.saveEmail({ email: testEmail1, source: 'cinemavilla.cc' });
        assert.equal(savedAgain, true);

        const data = await tidb.getSubscribers({ limit: 50 });
        assert.ok(data);
        const match = data.subscribers.find((s) => s.email === testEmail1);
        assert.ok(match, 'test email should be present');
        assert.ok(match.source.includes('djmaza.cc'), 'source should include djmaza.cc');
        assert.ok(match.source.includes('cinemavilla.cc'), 'source should include cinemavilla.cc');
    });

    it('saves distinct email and calculates breakdown', async () => {
        await tidb.saveEmail({ email: testEmail2, source: 'djmaza.cc' });

        const data = await tidb.getSubscribers({ limit: 50 });
        assert.ok(data.total >= 2);
        assert.ok(data.breakdown['djmaza.cc'] >= 2);
    });

    it('retrieves rows for CSV export', async () => {
        const rows = await tidb.getAllSubscribersForExport();
        assert.ok(Array.isArray(rows));
        assert.ok(rows.some((r) => r.email === testEmail1));
        assert.ok(rows.some((r) => r.email === testEmail2));
    });
});
