// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it, before, after */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { createSchema, hashPassword, verifyPassword } = require('../seed');

describe('users schema', () => {
    let db;
    let tmp;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-schema-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await createSchema(db);
    });
    after(async () => { await db.close(); });
    it('creates the five tables and hashes verify', async () => {
        for (const t of ['users', 'sessions', 'otp_codes', 'library_items', 'progress']) {
            const rows = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${t}'`);
            assert.equal(rows.length, 1, `missing table ${t}`);
        }
        const hash = hashPassword('s3cret-pass');
        assert.equal(verifyPassword('s3cret-pass', hash), true);
        assert.equal(verifyPassword('wrong', hash), false);
    });
});
