// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const fs = require('node:fs');

let mysql;
try {
    mysql = require('mysql2/promise');
} catch (_) {
    // If mysql2 is not installed, fail softly
}

const DEFAULT_TIDB_HOST = 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const DEFAULT_TIDB_PORT = 4000;
const DEFAULT_TIDB_USER = '2AhDjYHX8mp5pHx.root';
const DEFAULT_TIDB_PASSWORD = 'v7pnZ2MMwCEqfXV8';
const DEFAULT_TIDB_DATABASE = 'emails';

let pool = null;
let initialized = false;
let initializingPromise = null;

function getTidbConfig(customConfig = {}) {
    if (process.env.TIDB_DISABLE === '1' || process.env.TIDB_DISABLE === 'true') {
        return null;
    }
    const isRunningInTests =
        process.env.NODE_ENV === 'test' ||
        (Array.isArray(process.execArgv) && process.execArgv.includes('--test')) ||
        (Array.isArray(process.argv) && process.argv.some((a) => typeof a === 'string' && a.includes('.test.')));

    // In local unit test runs without explicit testConfig or env, don't auto-connect to avoid offline network dependencies
    if (
        isRunningInTests &&
        !process.env.TIDB_HOST &&
        !process.env.TEST_TIDB &&
        Object.keys(customConfig).length === 0
    ) {
        return null;
    }

    const host = customConfig.host || process.env.TIDB_HOST || DEFAULT_TIDB_HOST;
    const port = Number(customConfig.port || process.env.TIDB_PORT || DEFAULT_TIDB_PORT);
    const user = customConfig.user || process.env.TIDB_USER || DEFAULT_TIDB_USER;
    const password = customConfig.password || process.env.TIDB_PASSWORD || DEFAULT_TIDB_PASSWORD;
    let database = customConfig.database || process.env.TIDB_DATABASE || DEFAULT_TIDB_DATABASE;
    if (database === 'sys') database = DEFAULT_TIDB_DATABASE;

    if (!host || !user) return null;

    const ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    const caCandidates = [
        customConfig.ca,
        process.env.TIDB_CA,
        '/etc/ssl/certs/ca-certificates.crt', // Debian / Ubuntu / Alpine
        '/etc/pki/tls/certs/ca-bundle.crt',  // CentOS / RHEL / Fedora
        '/etc/ssl/cert.pem',                 // macOS / FreeBSD
        '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
    ];

    for (const caPath of caCandidates) {
        if (caPath && typeof caPath === 'string' && fs.existsSync(caPath)) {
            try {
                ssl.ca = fs.readFileSync(caPath);
                break;
            } catch (_) {}
        }
    }

    return {
        host,
        port,
        user,
        password,
        database,
        ssl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
    };
}

async function initTidb(customConfig = {}) {
    if (!mysql) return false;
    const config = getTidbConfig(customConfig);
    if (!config) return false;

    if (pool && initialized) return true;

    if (initializingPromise) return initializingPromise;

    initializingPromise = (async () => {
        try {
            if (!pool) {
                try {
                    pool = mysql.createPool(config);
                    await pool.query('SELECT 1');
                } catch (connectErr) {
                    if (connectErr.code === 'ER_BAD_DB_ERROR') {
                        const tempConfig = { ...config };
                        delete tempConfig.database;
                        const tempConn = await mysql.createConnection(tempConfig);
                        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
                        await tempConn.end();
                        pool = mysql.createPool(config);
                    } else {
                        throw connectErr;
                    }
                }
            }
            // Create table if not exists
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS newsletter_emails (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    source VARCHAR(255) NOT NULL,
                    created_at VARCHAR(64) NOT NULL,
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `;
            await pool.query(createTableSql);
            initialized = true;
            return true;
        } catch (err) {
            console.error('TiDB connection/init error:', err.message);
            return false;
        } finally {
            initializingPromise = null;
        }
    })();

    return initializingPromise;
}

function isAvailable() {
    return !!(pool && initialized);
}

async function ensureConnected() {
    if (!mysql) return false;
    if (pool && initialized) return true;
    return await initTidb();
}

async function saveEmail({ email, source }) {
    if (!mysql) return false;
    const ready = await ensureConnected();
    if (!ready || !pool) return false;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanSource = String(source || '').trim().slice(0, 255) || 'unknown';
    const createdAt = new Date().toISOString();

    try {
        // Insert or ignore if duplicate
        await pool.query(
            'INSERT IGNORE INTO newsletter_emails (email, source, created_at) VALUES (?, ?, ?)',
            [cleanEmail, cleanSource, createdAt]
        );

        // If email was already present and source domain is new, append domain to source
        if (cleanSource && cleanSource !== 'popup') {
            await pool.query(
                `UPDATE newsletter_emails 
                 SET source = CONCAT(source, ',', ?) 
                 WHERE email = ? AND INSTR(source, ?) = 0`,
                [cleanSource, cleanEmail, cleanSource]
            );
        }
        return true;
    } catch (err) {
        console.error('TiDB saveEmail error:', err.message);
        return false;
    }
}

async function getSubscribers({ limit = 300 } = {}) {
    if (!mysql) return null;
    const ready = await ensureConnected();
    if (!ready || !pool) return null;

    try {
        const [rows] = await pool.query(
            'SELECT id, email, source, created_at FROM newsletter_emails ORDER BY id DESC'
        );

        const breakdown = {};
        for (const r of rows) {
            const domains = String(r.source || 'unknown').split(',');
            for (const d of domains) {
                const key = d.trim() || 'unknown';
                breakdown[key] = (breakdown[key] || 0) + 1;
            }
        }

        return {
            total: rows.length,
            breakdown,
            subscribers: rows.slice(0, limit),
        };
    } catch (err) {
        console.error('TiDB getSubscribers error:', err.message);
        return null;
    }
}

async function getAllSubscribersForExport() {
    if (!mysql) return null;
    const ready = await ensureConnected();
    if (!ready || !pool) return null;

    try {
        const [rows] = await pool.query(
            'SELECT id, email, source, created_at FROM newsletter_emails ORDER BY id ASC'
        );
        return rows;
    } catch (err) {
        console.error('TiDB getAllSubscribersForExport error:', err.message);
        return null;
    }
}

async function close() {
    if (pool) {
        try {
            await pool.end();
        } catch (_) {}
        pool = null;
        initialized = false;
    }
}

module.exports = {
    initTidb,
    isAvailable,
    saveEmail,
    getSubscribers,
    getAllSubscribersForExport,
    close,
};
