// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults, SLOT_KEYS } = require('../seed');

describe('seed', () => {
    let db;
    let dbFile;

    before(() => {
        dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'brand-')), 'brand.db');
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = dbFile;
        db = openDb();
    });

    after(() => {
        db.close();
    });

    it('creates 1 branding row, 10 adslot rows, 1 admin', async () => {
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const brand = await db.query('SELECT * FROM branding WHERE id = 1');
        assert.equal(brand.length, 1);
        assert.equal(brand[0].site_name, 'TestStream');
        const slots = await db.query('SELECT slot_key, enabled, code FROM adslots');
        assert.equal(slots.length, 10);
        assert.deepEqual(
            slots.map((s) => s.slot_key).sort(),
            [...SLOT_KEYS].sort()
        );
        for (const slot of slots) {
            assert.ok(slot.code.length > 0, `${slot.slot_key} has seeded code`);
        }
        const popunder = slots.find((s) => s.slot_key === 'popunder');
        assert.equal(popunder.enabled, 1);
        const banner = slots.find((s) => s.slot_key === 'banner_728x90');
        assert.equal(banner.enabled, 0);
        const admins = await db.query('SELECT username, password_hash FROM admins');
        assert.equal(admins.length, 1);
        assert.equal(admins[0].username, 'root');
        assert.match(admins[0].password_hash, /^[0-9a-f]+:[0-9a-f]+$/);
    });

    it('is idempotent on re-run', async () => {
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'TestStream' });
        const slots = await db.query('SELECT slot_key FROM adslots');
        assert.equal(slots.length, 10);
        const admins = await db.query('SELECT id FROM admins');
        assert.equal(admins.length, 1);
    });
});
