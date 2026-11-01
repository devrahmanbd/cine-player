// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Dynamic XML sitemap generator delegating to dedicated SitemapEngine.
const { SitemapEngine, defaultEngine, escapeXml, formatDate, CACHE_TTL_MS, DEFAULT_TMDB_API_KEY } = require('./sitemapEngine');

async function generateSitemapXml({ db, host = 'cinemavilla.cc', tmdbApiKey, forceRefresh = false, format = 'flat' } = {}) {
    const engine = tmdbApiKey ? new SitemapEngine({ tmdbApiKey }) : defaultEngine;
    if (forceRefresh) {
        await engine.refreshAllSitemaps({ db, host });
    }
    const targetId = format === 'index' ? 'index' : 'all';
    return engine.getSitemap(targetId, { db, host, forceRefresh });
}

async function collectTmdbItems(tmdbApiKey) {
    const engine = tmdbApiKey ? new SitemapEngine({ tmdbApiKey }) : defaultEngine;
    const [daily, weekly] = await Promise.all([
        engine.crawlTmdbTrendingMovies({ timeWindow: 'day', maxPages: 2 }),
        engine.crawlTmdbTrendingMovies({ timeWindow: 'week', maxPages: 2 })
    ]);
    const map = new Map();
    for (const m of [...daily, ...weekly]) {
        if (m && m.tmdb_id && !map.has(m.tmdb_id)) {
            map.set(m.tmdb_id, {
                type: m.media_type || 'movie',
                id: m.imdb_id || `tmdb:${m.tmdb_id}`,
                releaseDate: m.release_date
            });
        }
    }
    return Array.from(map.values());
}

async function collectCinemetaItems() {
    return defaultEngine.collectCinemetaItems();
}

async function collectDatabaseItems(db) {
    return defaultEngine.collectDatabaseItems(db);
}

module.exports = {
    generateSitemapXml,
    collectTmdbItems,
    collectCinemetaItems,
    collectDatabaseItems,
    escapeXml,
    formatDate,
    CACHE_TTL_MS,
    DEFAULT_TMDB_API_KEY,
    SitemapEngine,
    defaultEngine
};
