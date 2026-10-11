// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it, before, after */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../db');
const { seedDefaults } = require('../seed');
const { startServer } = require('../server');

describe('users library + progress', () => {
    let db; let server; let base; let tmp;
    let cookieA; let cookieB;
    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-users-library-'));
        process.env.DB_DRIVER = 'sqlite';
        process.env.DB_PATH = path.join(tmp, 'brand.db');
        db = openDb();
        await seedDefaults(db, { adminUser: 'root', adminPassword: 's3cret!', siteName: 'T' });
        const started = await startServer({ port: 0, db, uploadsDir: path.join(tmp, 'uploads') });
        server = started.server;
        base = `http://127.0.0.1:${started.port}`;
        const signup = (email) => fetch(`${base}/api/users/signup`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password: 's3cret-pass' }),
        });
        const login = (email) => fetch(`${base}/api/users/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password: 's3cret-pass' }),
        });
        // Simulate verified emails (dedicated verify flow is covered in users_verify.test.js).
        const resA = await signup('lib-a@example.com');
        assert.equal(resA.status, 200);
        await db.query('UPDATE users SET verified = 1 WHERE email = ?', ['lib-a@example.com']);
        cookieA = (await login('lib-a@example.com')).headers.get('set-cookie').split(';')[0];
        const resB = await signup('lib-b@example.com');
        assert.equal(resB.status, 200);
        await db.query('UPDATE users SET verified = 1 WHERE email = ?', ['lib-b@example.com']);
        cookieB = (await login('lib-b@example.com')).headers.get('set-cookie').split(';')[0];
    });
    after(async () => { await new Promise((r) => server.close(r)); await db.close(); });

    const get = (p, ck) => fetch(`${base}${p}`, { headers: ck ? { cookie: ck } : {} });
    const put = (p, body, ck) => fetch(`${base}${p}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(ck ? { cookie: ck } : {}) },
        body: JSON.stringify(body),
    });
    const del = (p, ck) => fetch(`${base}${p}`, {
        method: 'DELETE',
        headers: ck ? { cookie: ck } : {},
    });

    it('401s without a user session cookie', async () => {
        assert.equal((await get('/api/users/library')).status, 401);
        assert.equal((await put('/api/users/library', { type: 'movie', meta_id: 'tt1' })).status, 401);
        assert.equal((await del('/api/users/library/movie/tt1')).status, 401);
        assert.equal((await get('/api/users/progress')).status, 401);
        assert.equal((await put('/api/users/progress', { type: 'movie', meta_id: 'tt1', position: 0, duration: 10 })).status, 401);
    });

    it('library round-trips with per-user isolation', async () => {
        assert.deepEqual(await (await get('/api/users/library', cookieA)).json(), []);
        const created = await put('/api/users/library', { type: 'movie', meta_id: 'tt123' }, cookieA);
        assert.equal(created.status, 200);
        const item = await created.json();
        assert.equal(item.type, 'movie');
        assert.equal(item.meta_id, 'tt123');
        assert.ok(typeof item.added_at === 'string' && item.added_at.length > 0);

        // User B cannot see user A's rows.
        assert.deepEqual(await (await get('/api/users/library', cookieB)).json(), []);
        const listA = await (await get('/api/users/library', cookieA)).json();
        assert.equal(listA.length, 1);

        // Same keys for B are a separate row, not a conflict.
        assert.equal((await put('/api/users/library', { type: 'movie', meta_id: 'tt123' }, cookieB)).status, 200);
        assert.equal((await (await get('/api/users/library', cookieA)).json()).length, 1);
        assert.equal((await (await get('/api/users/library', cookieB)).json()).length, 1);

        // Upsert is idempotent for the same user.
        assert.equal((await put('/api/users/library', { type: 'movie', meta_id: 'tt123' }, cookieA)).status, 200);
        assert.equal((await (await get('/api/users/library', cookieA)).json()).length, 1);

        // Type filter.
        assert.equal((await put('/api/users/library', { type: 'series', meta_id: 'tt456' }, cookieA)).status, 200);
        const movies = await (await get('/api/users/library?type=movie', cookieA)).json();
        assert.ok(movies.every((r) => r.type === 'movie'));
        assert.ok(movies.some((r) => r.meta_id === 'tt123'));
        const series = await (await get('/api/users/library?type=series', cookieA)).json();
        assert.ok(series.every((r) => r.type === 'series'));
        assert.ok(series.some((r) => r.meta_id === 'tt456'));
    });

    it('library validates type enum and meta_id', async () => {
        assert.equal((await put('/api/users/library', { type: 'book', meta_id: 'tt1' }, cookieA)).status, 400);
        assert.equal((await put('/api/users/library', { type: 'movie', meta_id: 'bad id!' }, cookieA)).status, 400);
        assert.equal((await put('/api/users/library', { type: 'movie' }, cookieA)).status, 400);
        assert.equal((await put('/api/users/library', { meta_id: 'tt1' }, cookieA)).status, 400);
    });

    it('library delete is idempotent and cannot touch other users', async () => {
        assert.equal((await put('/api/users/library', { type: 'movie', meta_id: 'tt-only-a' }, cookieA)).status, 200);
        // B deleting A's unique id is a no-op for A (still 200, A's row survives).
        const cross = await del('/api/users/library/movie/tt-only-a', cookieB);
        assert.equal(cross.status, 200);
        assert.deepEqual(await cross.json(), { ok: true });
        const stillA = await (await get('/api/users/library?type=movie', cookieA)).json();
        assert.ok(stillA.some((r) => r.meta_id === 'tt-only-a'));

        const gone = await del('/api/users/library/movie/tt-only-a', cookieA);
        assert.equal(gone.status, 200);
        assert.deepEqual(await gone.json(), { ok: true });
        const afterA = await (await get('/api/users/library?type=movie', cookieA)).json();
        assert.ok(!afterA.some((r) => r.meta_id === 'tt-only-a'));
        // Idempotent second delete.
        assert.equal((await del('/api/users/library/movie/tt-only-a', cookieA)).status, 200);
        // B's own rows are untouched by A's delete.
        const stillB = await (await get('/api/users/library?type=movie', cookieB)).json();
        assert.ok(stillB.some((r) => r.meta_id === 'tt123'));
    });

    it('progress round-trips with per-user isolation', async () => {
        assert.deepEqual(await (await get('/api/users/progress', cookieA)).json(), []);
        const created = await put('/api/users/progress', {
            type: 'movie', meta_id: 'tt123', position: 10, duration: 100,
        }, cookieA);
        assert.equal(created.status, 200);
        const row = await created.json();
        assert.equal(row.type, 'movie');
        assert.equal(row.meta_id, 'tt123');
        assert.equal(row.position, 10);
        assert.equal(row.duration, 100);

        // User B cannot see user A's rows.
        assert.deepEqual(await (await get('/api/users/progress', cookieB)).json(), []);

        // Upsert updates the same row.
        const updated = await put('/api/users/progress', {
            type: 'movie', meta_id: 'tt123', position: 20, duration: 100,
        }, cookieA);
        assert.equal(updated.status, 200);
        assert.equal((await updated.json()).position, 20);

        // Series progress with season/episode.
        assert.equal((await put('/api/users/progress', {
            type: 'series', meta_id: 'tt456', season: 1, episode: 2, position: 5, duration: 50,
        }, cookieA)).status, 200);
        const series = await (await get('/api/users/progress?type=series', cookieA)).json();
        assert.equal(series.length, 1);
        assert.equal(series[0].season, 1);
        assert.equal(series[0].episode, 2);

        // Same keys for B are a separate row.
        assert.equal((await put('/api/users/progress', {
            type: 'movie', meta_id: 'tt123', position: 1, duration: 100,
        }, cookieB)).status, 200);
        const aMovies = await (await get('/api/users/progress?type=movie', cookieA)).json();
        assert.equal(aMovies[0].position, 20);
        const bMovies = await (await get('/api/users/progress?type=movie', cookieB)).json();
        assert.equal(bMovies[0].position, 1);
    });

    it('progress validates numbers and enums', async () => {
        const bad = [
            { type: 'movie', meta_id: 'tt1', position: -1, duration: 10 },
            { type: 'movie', meta_id: 'tt1', position: 0, duration: -5 },
            { type: 'book', meta_id: 'tt1', position: 0, duration: 10 },
            { type: 'movie', meta_id: 'bad id!', position: 0, duration: 10 },
            { type: 'movie', meta_id: 'tt1', duration: 10 },
            { type: 'movie', meta_id: 'tt1', position: 0 },
            { type: 'series', meta_id: 'tt1', season: -1, episode: 0, position: 0, duration: 10 },
        ];
        for (const body of bad) {
            assert.equal((await put('/api/users/progress', body, cookieA)).status, 400);
        }
    });
});
