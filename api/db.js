// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Driver abstraction: SQLite (default, node:sqlite) or MySQL (mysql2, dynamic require).
// Portable interface: query(sql, params) -> rows array for SELECT, info object otherwise.
function openDb() {
    const driver = process.env.DB_DRIVER || 'sqlite';
    if (driver === 'mysql') {
        const mysql = require('mysql2/promise');
        const pool = mysql.createPool(process.env.MYSQL_DSN);
        return {
            driver,
            query: async (sql, params = []) => {
                const [rows] = await pool.query(sql, params);
                return rows;
            },
            close: async () => pool.end(),
        };
    }
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(process.env.DB_PATH || './data/brand.db');
    return {
        driver: 'sqlite',
        query: (sql, params = []) => {
            const statement = db.prepare(sql);
            if (/^\s*SELECT/i.test(sql)) return statement.all(...params);
            return statement.run(...params);
        },
        close: () => db.close(),
    };
}

module.exports = { openDb };
