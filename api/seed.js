// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Seed: schema + default brand + 10 Adsterra slots + admin (scrypt hash).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SLOT_KEYS = [
    'popunder',
    'socialbar',
    'native',
    'banner_728x90',
    'banner_468x60',
    'banner_300x250',
    'banner_160x600',
    'banner_160x300',
    'banner_320x50',
    'smartlink',
];

// User-supplied Adsterra snippets (issued for the approved domain).
const DEFAULT_CODES = {
    popunder: '<script data-cfasync="false" src="https://aarems.org/1/cf84ac078618f3eea9a1d09070edf8a8"></script>',
    socialbar: '<script data-cfasync="false" src="https://bancadeltempoidea.org/14/7cd8561936cbc7daec3da7e0bfb2f944"></script>',
    native: '<script async="async" data-cfasync="false" src="https://bancadeltempoidea.org/21/6b90d708990a702feabd4e7f1fd670a1"></script>\n<div id="container-6b90d708990a702feabd4e7f1fd670a1"></div>',
    banner_468x60: `<script>\n  atOptions = {\n    'key' : 'c6bedc1fd1907dc0cf16af7618769514',\n    'format' : 'iframe',\n    'height' : 60,\n    'width' : 468,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/c6bedc1fd1907dc0cf16af7618769514"></script>`,
    banner_300x250: `<script>\n  atOptions = {\n    'key' : '64491af9cee349057a6acaadc90c0581',\n    'format' : 'iframe',\n    'height' : 250,\n    'width' : 300,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/64491af9cee349057a6acaadc90c0581"></script>`,
    banner_160x600: `<script>\n  atOptions = {\n    'key' : '43147d3e4b34aaab2e5ae87f14e1fb9b',\n    'format' : 'iframe',\n    'height' : 600,\n    'width' : 160,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/43147d3e4b34aaab2e5ae87f14e1fb9b"></script>`,
    banner_160x300: `<script>\n  atOptions = {\n    'key' : '2ce0f5502991de160a917a257bd53b5f',\n    'format' : 'iframe',\n    'height' : 300,\n    'width' : 160,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/2ce0f5502991de160a917a257bd53b5f"></script>`,
    banner_320x50: `<script>\n  atOptions = {\n    'key' : '03c4ec6bde414379df04104482241ca8',\n    'format' : 'iframe',\n    'height' : 50,\n    'width' : 320,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/03c4ec6bde414379df04104482241ca8"></script>`,
    banner_728x90: `<script>\n  atOptions = {\n    'key' : '86289bed48d62b2e1f8a158fe935d4ac',\n    'format' : 'iframe',\n    'height' : 90,\n    'width' : 728,\n    'params' : {}\n  };\n</script>\n<script src="https://bancadeltempoidea.org/22/86289bed48d62b2e1f8a158fe935d4ac"></script>`,
    smartlink: 'https://directyp.org/4/1cc5cefd604de292f5efef7a5e835b4c',
};

// All units default OFF until the admin enables them from /admin.
// (Popunder/social scripts inject page-wide overlays; keep them off while
// the site itself is under test.)
const DEFAULT_ENABLED = {};

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const parts = String(stored).split(':');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const check = crypto.scryptSync(password, parts[0], 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(parts[1], 'hex'));
}

async function createSchema(db) {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    for (const statement of schema.split(';')) {
        if (statement.trim().length > 0) await db.query(statement);
    }
    // Idempotent migration for databases created before a column existed.
    try {
        await db.query('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0');
    } catch (error) {
        if (!/duplicate|already exists/i.test(error.message || '')) throw error;
    }
}

async function seedDefaults(db, { adminUser, adminPassword, siteName } = {}) {
    await createSchema(db);
    const brand = await db.query('SELECT id FROM branding WHERE id = 1');
    if (brand.length === 0) {
        await db.query(
            'INSERT INTO branding (id, site_name, updated_at) VALUES (1, ?, ?)',
            [siteName || 'LinuxStream', new Date().toISOString()]
        );
    }
    for (const key of SLOT_KEYS) {
        const existing = await db.query('SELECT slot_key FROM adslots WHERE slot_key = ?', [key]);
        if (existing.length === 0) {
            await db.query('INSERT INTO adslots (slot_key, enabled, code) VALUES (?, ?, ?)', [
                key,
                DEFAULT_ENABLED[key] || 0,
                DEFAULT_CODES[key] || '',
            ]);
        }
    }
    const adsSettings = await db.query('SELECT id FROM ads_settings WHERE id = 1');
    if (adsSettings.length === 0) {
        await db.query('INSERT INTO ads_settings (id, master_enabled) VALUES (1, 0)');
    }
    const admins = await db.query('SELECT id FROM admins WHERE username = ?', [adminUser || 'admin']);
    if (admins.length === 0) {
        await db.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
            adminUser || 'admin',
            hashPassword(adminPassword || 'changeme'),
        ]);
    }
}

if (require.main === module) {
    const { openDb } = require('./db');
    const db = openDb();
    seedDefaults(db, {
        adminUser: process.env.ADMIN_USER,
        adminPassword: process.env.ADMIN_PASSWORD,
        siteName: process.env.SITE_NAME,
    })
        .then(() => db.close())
        .then(() => console.log('seed ok'))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { createSchema, seedDefaults, hashPassword, verifyPassword, SLOT_KEYS, DEFAULT_CODES };
