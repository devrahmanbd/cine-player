// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateSitemapXml, escapeXml, formatDate, collectDatabaseItems } = require('../sitemap');

test('sitemap: escapeXml escapes special characters', () => {
    assert.equal(escapeXml('hello & <world> "test" \'ok\''), 'hello &amp; &lt;world&gt; &quot;test&quot; &apos;ok&apos;');
    assert.equal(escapeXml(null), '');
});

test('sitemap: formatDate produces YYYY-MM-DD', () => {
    const formatted = formatDate('2026-05-14T10:00:00Z');
    assert.equal(formatted, '2026-05-14');
    const invalid = formatDate('not-a-date');
    assert.match(invalid, /^\d{4}-\d{2}-\d{2}$/);
});

test('sitemap: collectDatabaseItems parses availability rows', async () => {
    const mockDb = {
        query: async () => [
            { meta_key: 'movie:tt1234567', checked_at: '2026-01-01T00:00:00Z' },
            { meta_key: 'series:tt7654321', checked_at: '2026-02-01T00:00:00Z' }
        ]
    };
    const items = await collectDatabaseItems(mockDb);
    assert.equal(items.length, 2);
    assert.deepEqual(items[0], { type: 'movie', id: 'tt1234567', releaseDate: '2026-01-01T00:00:00Z' });
    assert.deepEqual(items[1], { type: 'series', id: 'tt7654321', releaseDate: '2026-02-01T00:00:00Z' });
});

test('sitemap: generateSitemapXml produces valid XML urlset with movies and series', async () => {
    const mockDb = {
        query: async () => [
            { meta_key: 'movie:tt0343314', checked_at: '2026-03-01T00:00:00Z' },
            { meta_key: 'series:tt0903747', checked_at: '2026-03-02T00:00:00Z' }
        ]
    };
    const xml = await generateSitemapXml({ db: mockDb, host: 'cinemavilla.cc', forceRefresh: true });
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
    assert.ok(xml.includes('<loc>https://cinemavilla.cc/</loc>'));
    assert.ok(xml.includes('<loc>https://cinemavilla.cc/movie/tt0343314</loc>'));
    assert.ok(xml.includes('<loc>https://cinemavilla.cc/series/tt0903747</loc>'));
    assert.ok(xml.endsWith('</urlset>\n'));
});
