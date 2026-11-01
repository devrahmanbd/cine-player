// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { SitemapEngine, escapeXml, formatDate } = require('../sitemapEngine');
const { createSchema } = require('../seed');

function createTestDb() {
    const db = new DatabaseSync(':memory:');
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

test('sitemapEngine: escapeXml and formatDate helpers', () => {
    assert.equal(escapeXml('<script>"alert(1)" & \'test\'</script>'), '&lt;script&gt;&quot;alert(1)&quot; &amp; &apos;test&apos;&lt;/script&gt;');
    assert.equal(escapeXml(undefined), '');
    assert.match(formatDate(), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(formatDate('2025-11-05T12:00:00Z'), '2025-11-05');
});

test('sitemapEngine: formatUrlEntry with and without image metadata', () => {
    const engine = new SitemapEngine();
    const entryWithoutImage = engine.formatUrlEntry({
        loc: 'https://cinemavilla.cc/movie/tt0111161',
        lastmod: '1994-09-22',
        changefreq: 'weekly',
        priority: '0.9'
    });
    assert.ok(entryWithoutImage.includes('<loc>https://cinemavilla.cc/movie/tt0111161</loc>'));
    assert.ok(entryWithoutImage.includes('<lastmod>1994-09-22</lastmod>'));
    assert.ok(entryWithoutImage.includes('<priority>0.9</priority>'));
    assert.ok(!entryWithoutImage.includes('<image:image>'));

    const entryWithImage = engine.formatUrlEntry({
        loc: 'https://cinemavilla.cc/movie/tt0111161',
        lastmod: '1994-09-22',
        changefreq: 'weekly',
        priority: '0.9',
        image: {
            loc: 'https://image.tmdb.org/t/p/w500/test.jpg',
            title: 'Shawshank Redemption & Classic'
        }
    });
    assert.ok(entryWithImage.includes('<image:image>'));
    assert.ok(entryWithImage.includes('<image:loc>https://image.tmdb.org/t/p/w500/test.jpg</image:loc>'));
    assert.ok(entryWithImage.includes('<image:title>Shawshank Redemption &amp; Classic</image:title>'));
});

test('sitemapEngine: buildSitemapIndex formats valid XML sitemapindex', () => {
    const engine = new SitemapEngine();
    const indexXml = engine.buildSitemapIndex([
        { loc: 'https://cinemavilla.cc/sitemaps/trending-movies.xml', lastmod: '2026-11-01' },
        { loc: 'https://cinemavilla.cc/sitemaps/popular-movies.xml', lastmod: '2026-11-01' },
        { loc: 'https://cinemavilla.cc/sitemaps/catalog.xml', lastmod: '2026-11-01' }
    ]);
    assert.ok(indexXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(indexXml.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
    assert.ok(indexXml.includes('<loc>https://cinemavilla.cc/sitemaps/trending-movies.xml</loc>'));
    assert.ok(indexXml.includes('<lastmod>2026-11-01</lastmod>'));
    assert.ok(indexXml.endsWith('</sitemapindex>\n'));
});

test('sitemapEngine: refreshAllSitemaps caches to SQLite and memory', async () => {
    const db = createTestDb();
    await createSchema(db);

    // Seed mock availability
    await db.query('INSERT INTO availability (meta_key, available, streams, checked_at) VALUES (?, 1, 5, ?)', [
        'movie:tt0111161',
        '2026-11-01'
    ]);

    const engine = new SitemapEngine();
    const { sitemaps, stats } = await engine.refreshAllSitemaps({ db, host: 'cinemavilla.cc' });

    assert.ok(sitemaps['index']);
    assert.ok(sitemaps['trending-movies']);
    assert.ok(sitemaps['popular-movies']);
    assert.ok(sitemaps['trending-series']);
    assert.ok(sitemaps['catalog']);
    assert.ok(sitemaps['all']);

    assert.ok(stats.trending_movies > 0, 'trending movies should be indexed');
    assert.ok(stats.total_unique_urls > 0, 'total unique URLs should be > 0');

    // Verify stored in SQLite sitemaps_cache
    const rows = await db.query('SELECT sitemap_id, url_count FROM sitemaps_cache');
    assert.ok(rows.length >= 6);

    // Fast retrieval check from getSitemap
    const retrievedIndex = await engine.getSitemap('index', { db, host: 'cinemavilla.cc' });
    assert.equal(retrievedIndex, sitemaps['index'].xml);

    const retrievedTrending = await engine.getSitemap('trending-movies', { db, host: 'cinemavilla.cc' });
    assert.equal(retrievedTrending, sitemaps['trending-movies'].xml);
    assert.ok(retrievedTrending.includes('https://cinemavilla.cc/movie/'));

    // Check stats retrieval
    const retrievedStats = await engine.getStats({ db });
    assert.equal(retrievedStats.trending_movies, stats.trending_movies);

    db.close();
});
