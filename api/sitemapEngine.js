// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Dedicated Sitemap Creation Engine: indexes trending movies from TMDB,
// partitions sitemaps (index, trending-movies, popular-movies, series, catalog),
// resolves IDs, attaches image metadata, and caches in SQLite and memory.

const { curlJson } = require('./curlfetch');

const DEFAULT_TMDB_API_KEY = 'cfe422613b250f702980a3bbf9e90716';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const memoryCache = new Map();

function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function formatDate(dateInput) {
    try {
        const d = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
        return d.toISOString().slice(0, 10);
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

class SitemapEngine {
    constructor({ tmdbApiKey = process.env.TMDB_API_KEY || DEFAULT_TMDB_API_KEY } = {}) {
        this.tmdbApiKey = tmdbApiKey;
    }

    getTmdbKey() {
        return this.tmdbApiKey || process.env.TMDB_API_KEY || DEFAULT_TMDB_API_KEY;
    }

    async crawlTmdbTrendingMovies({ timeWindow = 'week', maxPages = 5, db = null } = {}) {
        const key = this.getTmdbKey();
        if (!key) return [];
        const items = [];
        const nowIso = new Date().toISOString();

        for (let page = 1; page <= maxPages; page++) {
            try {
                const url = `https://api.themoviedb.org/3/trending/movie/${timeWindow}?api_key=${encodeURIComponent(key)}&page=${page}`;
                const data = await curlJson(url, 8000);
                if (!data || !Array.isArray(data.results) || data.results.length === 0) break;

                for (const row of data.results) {
                    if (!row || !row.id) continue;
                    const item = {
                        media_type: 'movie',
                        tmdb_id: row.id,
                        imdb_id: '',
                        title: row.title || row.original_title || '',
                        release_date: row.release_date || '',
                        poster_path: row.poster_path || '',
                        backdrop_path: row.backdrop_path || '',
                        popularity: Number(row.popularity) || 0,
                        vote_average: Number(row.vote_average) || 0,
                        trending_window: timeWindow,
                        updated_at: nowIso
                    };
                    items.push(item);

                    if (db && typeof db.query === 'function') {
                        try {
                            await db.query(
                                `INSERT INTO tmdb_trending_cache 
                                (media_type, tmdb_id, imdb_id, title, release_date, poster_path, backdrop_path, popularity, vote_average, trending_window, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(media_type, tmdb_id, trending_window) DO UPDATE SET
                                title = excluded.title,
                                release_date = excluded.release_date,
                                poster_path = excluded.poster_path,
                                backdrop_path = excluded.backdrop_path,
                                popularity = excluded.popularity,
                                vote_average = excluded.vote_average,
                                updated_at = excluded.updated_at`,
                                [
                                    item.media_type, item.tmdb_id, item.imdb_id, item.title,
                                    item.release_date, item.poster_path, item.backdrop_path,
                                    item.popularity, item.vote_average, item.trending_window, item.updated_at
                                ]
                            );
                        } catch (_) {
                            // Non-fatal if DB insert fails
                        }
                    }
                }
            } catch (_) {
                break;
            }
        }
        return items;
    }

    async crawlTmdbPopularMovies({ maxPages = 3 } = {}) {
        const key = this.getTmdbKey();
        if (!key) return [];
        const items = [];
        for (let page = 1; page <= maxPages; page++) {
            try {
                const url = `https://api.themoviedb.org/3/movie/popular?api_key=${encodeURIComponent(key)}&page=${page}`;
                const data = await curlJson(url, 8000);
                if (!data || !Array.isArray(data.results)) break;
                for (const row of data.results) {
                    if (row && row.id) {
                        items.push({
                            media_type: 'movie',
                            tmdb_id: row.id,
                            title: row.title || '',
                            release_date: row.release_date || '',
                            poster_path: row.poster_path || '',
                            popularity: Number(row.popularity) || 0
                        });
                    }
                }
            } catch (_) {
                break;
            }
        }
        return items;
    }

    async crawlTmdbTrendingTv({ timeWindow = 'week', maxPages = 3 } = {}) {
        const key = this.getTmdbKey();
        if (!key) return [];
        const items = [];
        for (let page = 1; page <= maxPages; page++) {
            try {
                const url = `https://api.themoviedb.org/3/trending/tv/${timeWindow}?api_key=${encodeURIComponent(key)}&page=${page}`;
                const data = await curlJson(url, 8000);
                if (!data || !Array.isArray(data.results)) break;
                for (const row of data.results) {
                    if (row && row.id) {
                        items.push({
                            media_type: 'series',
                            tmdb_id: row.id,
                            title: row.name || row.original_name || '',
                            release_date: row.first_air_date || '',
                            poster_path: row.poster_path || '',
                            popularity: Number(row.popularity) || 0
                        });
                    }
                }
            } catch (_) {
                break;
            }
        }
        return items;
    }

    async resolveImdbId(mediaType, tmdbId, db = null) {
        if (!tmdbId) return '';
        if (db && typeof db.query === 'function') {
            try {
                const cached = await db.query(
                    'SELECT imdb_id FROM tmdb_trending_cache WHERE media_type = ? AND tmdb_id = ? AND imdb_id != "" LIMIT 1',
                    [mediaType, tmdbId]
                );
                if (cached && cached.length > 0 && cached[0].imdb_id) {
                    return cached[0].imdb_id;
                }
            } catch (_) {}
        }

        const key = this.getTmdbKey();
        if (!key) return '';
        try {
            const endpoint = mediaType === 'series' ? 'tv' : 'movie';
            const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/external_ids?api_key=${encodeURIComponent(key)}`;
            const res = await curlJson(url, 5000);
            const imdbId = res && typeof res.imdb_id === 'string' && /^tt\d+$/.test(res.imdb_id) ? res.imdb_id : '';
            if (imdbId && db && typeof db.query === 'function') {
                try {
                    await db.query(
                        'UPDATE tmdb_trending_cache SET imdb_id = ? WHERE media_type = ? AND tmdb_id = ?',
                        [imdbId, mediaType, tmdbId]
                    );
                } catch (_) {}
            }
            return imdbId;
        } catch (_) {
            return '';
        }
    }

    async collectCinemetaItems() {
        const items = [];
        const catalogs = [
            { type: 'movie', url: 'https://v3-cinemeta.strem.io/catalog/movie/top.json' },
            { type: 'movie', url: 'https://v3-cinemeta.strem.io/catalog/movie/imdbRating.json' },
            { type: 'series', url: 'https://v3-cinemeta.strem.io/catalog/series/top.json' },
            { type: 'series', url: 'https://v3-cinemeta.strem.io/catalog/series/imdbRating.json' }
        ];
        for (const cat of catalogs) {
            try {
                const data = await curlJson(cat.url, 10000);
                const metas = data && Array.isArray(data.metas) ? data.metas : [];
                for (const m of metas) {
                    if (m && typeof m.id === 'string' && /^[A-Za-z0-9:_-]+$/.test(m.id)) {
                        items.push({
                            type: cat.type,
                            id: m.id,
                            title: m.name || '',
                            releaseDate: m.released || m.year,
                            poster: m.poster || ''
                        });
                    }
                }
            } catch (_) {}
        }
        return items;
    }

    async collectDatabaseItems(db) {
        if (!db || typeof db.query !== 'function') return [];
        try {
            const rows = await db.query('SELECT meta_key, checked_at FROM availability');
            const items = [];
            for (const row of rows || []) {
                if (!row || typeof row.meta_key !== 'string') continue;
                const parts = row.meta_key.split(':');
                if (parts.length >= 2) {
                    const type = parts[0] === 'series' ? 'series' : 'movie';
                    const id = parts.slice(1).join(':');
                    items.push({
                        type,
                        id,
                        releaseDate: row.checked_at
                    });
                }
            }
            return items;
        } catch {
            return [];
        }
    }

    formatUrlEntry({ loc, lastmod, changefreq = 'weekly', priority = '0.8', image = null }) {
        let entry = '  <url>\n';
        entry += `    <loc>${escapeXml(loc)}</loc>\n`;
        if (lastmod) {
            entry += `    <lastmod>${escapeXml(formatDate(lastmod))}</lastmod>\n`;
        }
        entry += `    <changefreq>${escapeXml(changefreq)}</changefreq>\n`;
        entry += `    <priority>${escapeXml(priority)}</priority>\n`;
        if (image && image.loc) {
            entry += '    <image:image>\n';
            entry += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
            if (image.title) {
                entry += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
            }
            entry += '    </image:image>\n';
        }
        entry += '  </url>\n';
        return entry;
    }

    buildUrlset(urlEntries) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
        for (const entry of urlEntries) {
            xml += this.formatUrlEntry(entry);
        }
        xml += '</urlset>\n';
        return xml;
    }

    buildSitemapIndex(subSitemaps) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        for (const sub of subSitemaps) {
            xml += '  <sitemap>\n';
            xml += `    <loc>${escapeXml(sub.loc)}</loc>\n`;
            if (sub.lastmod) {
                xml += `    <lastmod>${escapeXml(formatDate(sub.lastmod))}</lastmod>\n`;
            }
            xml += '  </sitemap>\n';
        }
        xml += '</sitemapindex>\n';
        return xml;
    }

    async refreshAllSitemaps({ db = null, host = 'cinemavilla.cc' } = {}) {
        const today = formatDate();

        // 1. Crawl TMDB Trending Movies & Popular in parallel
        const [trendingDaily, trendingWeekly, popularMovies, trendingTv] = await Promise.all([
            this.crawlTmdbTrendingMovies({ timeWindow: 'day', maxPages: 3, db }),
            this.crawlTmdbTrendingMovies({ timeWindow: 'week', maxPages: 4, db }),
            this.crawlTmdbPopularMovies({ maxPages: 2 }),
            this.crawlTmdbTrendingTv({ timeWindow: 'week', maxPages: 2 })
        ]);

        // Merge trending movies deduplicated
        const trendingMoviesMap = new Map();
        for (const m of [...trendingDaily, ...trendingWeekly]) {
            if (m && m.tmdb_id && !trendingMoviesMap.has(m.tmdb_id)) {
                trendingMoviesMap.set(m.tmdb_id, m);
            }
        }
        const trendingMoviesList = Array.from(trendingMoviesMap.values());

        // Resolve IMDB IDs concurrently for top trending movies to ensure canonical IMDB routing
        const topToResolve = trendingMoviesList.slice(0, 25);
        await Promise.all(topToResolve.map(async (m) => {
            if (!m.imdb_id) {
                m.imdb_id = await this.resolveImdbId('movie', m.tmdb_id, db);
            }
        }));

        // 2. Crawl Cinemeta & Database
        const [cinemetaList, dbList] = await Promise.all([
            this.collectCinemetaItems(),
            this.collectDatabaseItems(db)
        ]);

        // Build Dedicated: trending-movies.xml
        const trendingMovieEntries = [];
        for (const m of trendingMoviesList) {
            const idPart = m.imdb_id || `tmdb:${m.tmdb_id}`;
            const imageObj = m.poster_path ? {
                loc: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                title: m.title
            } : null;
            trendingMovieEntries.push({
                loc: `https://${host}/movie/${encodeURIComponent(idPart)}`,
                lastmod: m.release_date || today,
                changefreq: 'daily',
                priority: '0.9',
                image: imageObj
            });
        }
        const trendingMoviesXml = this.buildUrlset(trendingMovieEntries);

        // Build Dedicated: popular-movies.xml
        const popularMovieEntries = [];
        const seenPop = new Set();
        for (const m of popularMovies) {
            if (seenPop.has(m.tmdb_id)) continue;
            seenPop.add(m.tmdb_id);
            const imageObj = m.poster_path ? {
                loc: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                title: m.title
            } : null;
            popularMovieEntries.push({
                loc: `https://${host}/movie/tmdb:${encodeURIComponent(m.tmdb_id)}`,
                lastmod: m.release_date || today,
                changefreq: 'weekly',
                priority: '0.8',
                image: imageObj
            });
        }
        const popularMoviesXml = this.buildUrlset(popularMovieEntries);

        // Build Dedicated: trending-series.xml
        const trendingSeriesEntries = [];
        const seenTv = new Set();
        for (const s of trendingTv) {
            if (seenTv.has(s.tmdb_id)) continue;
            seenTv.add(s.tmdb_id);
            const imageObj = s.poster_path ? {
                loc: `https://image.tmdb.org/t/p/w500${s.poster_path}`,
                title: s.title
            } : null;
            trendingSeriesEntries.push({
                loc: `https://${host}/series/tmdb:${encodeURIComponent(s.tmdb_id)}`,
                lastmod: s.release_date || today,
                changefreq: 'weekly',
                priority: '0.8',
                image: imageObj
            });
        }
        const trendingSeriesXml = this.buildUrlset(trendingSeriesEntries);

        // Build Dedicated: catalog.xml
        const catalogEntries = [];
        const seenCatalog = new Set();
        for (const item of [...dbList, ...cinemetaList]) {
            if (!item || !item.type || !item.id) continue;
            const key = `${item.type}:${item.id}`;
            if (seenCatalog.has(key)) continue;
            seenCatalog.add(key);
            const route = item.type === 'series' ? 'series' : 'movie';
            catalogEntries.push({
                loc: `https://${host}/${route}/${encodeURIComponent(item.id)}`,
                lastmod: item.releaseDate || today,
                changefreq: 'weekly',
                priority: '0.8',
                image: item.poster ? { loc: item.poster, title: item.title } : null
            });
        }
        const catalogXml = this.buildUrlset(catalogEntries);

        // Build Unified: all.xml
        const unifiedEntries = [
            { loc: `https://${host}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
            { loc: `https://${host}/#/discover`, lastmod: today, changefreq: 'daily', priority: '0.9' },
            ...trendingMovieEntries,
            ...popularMovieEntries,
            ...trendingSeriesEntries,
            ...catalogEntries
        ];
        // Deduplicate unified entries by loc
        const seenLocs = new Set();
        const deduplicatedUnified = [];
        for (const entry of unifiedEntries) {
            if (!seenLocs.has(entry.loc)) {
                seenLocs.add(entry.loc);
                deduplicatedUnified.push(entry);
            }
        }
        const unifiedXml = this.buildUrlset(deduplicatedUnified);

        // Build Sitemap Index: index.xml
        const subSitemaps = [
            { loc: `https://${host}/sitemaps/trending-movies.xml`, lastmod: today },
            { loc: `https://${host}/sitemaps/popular-movies.xml`, lastmod: today },
            { loc: `https://${host}/sitemaps/trending-series.xml`, lastmod: today },
            { loc: `https://${host}/sitemaps/catalog.xml`, lastmod: today }
        ];
        const indexXml = this.buildSitemapIndex(subSitemaps);

        const sitemaps = {
            'index': { xml: indexXml, count: subSitemaps.length },
            'trending-movies': { xml: trendingMoviesXml, count: trendingMovieEntries.length },
            'popular-movies': { xml: popularMoviesXml, count: popularMovieEntries.length },
            'trending-series': { xml: trendingSeriesXml, count: trendingSeriesEntries.length },
            'catalog': { xml: catalogXml, count: catalogEntries.length },
            'all': { xml: unifiedXml, count: deduplicatedUnified.length }
        };

        const now = Date.now();
        const nowIso = new Date().toISOString();
        const stats = {
            trending_movies: trendingMovieEntries.length,
            popular_movies: popularMovieEntries.length,
            trending_series: trendingSeriesEntries.length,
            catalog_items: catalogEntries.length,
            total_unique_urls: deduplicatedUnified.length,
            generated_at: nowIso
        };

        for (const [sitemapId, data] of Object.entries(sitemaps)) {
            memoryCache.set(sitemapId, {
                xml: data.xml,
                count: data.count,
                timestamp: now,
                stats
            });

            if (db && typeof db.query === 'function') {
                try {
                    await db.query(
                        `INSERT INTO sitemaps_cache (sitemap_id, xml_content, url_count, source_stats, updated_at)
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(sitemap_id) DO UPDATE SET
                         xml_content = excluded.xml_content,
                         url_count = excluded.url_count,
                         source_stats = excluded.source_stats,
                         updated_at = excluded.updated_at`,
                        [sitemapId, data.xml, data.count, JSON.stringify(stats), nowIso]
                    );
                } catch (_) {}
            }
        }

        return { sitemaps, stats };
    }

    async getSitemap(sitemapId = 'all', { db = null, host = 'cinemavilla.cc', forceRefresh = false } = {}) {
        const now = Date.now();
        const cached = memoryCache.get(sitemapId);
        if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
            return cached.xml;
        }

        if (!forceRefresh && db && typeof db.query === 'function') {
            try {
                const rows = await db.query(
                    'SELECT xml_content, url_count, source_stats, updated_at FROM sitemaps_cache WHERE sitemap_id = ?',
                    [sitemapId]
                );
                if (rows && rows.length > 0 && rows[0].xml_content) {
                    const row = rows[0];
                    memoryCache.set(sitemapId, {
                        xml: row.xml_content,
                        count: row.url_count,
                        timestamp: now,
                        stats: JSON.parse(row.source_stats || '{}')
                    });
                    return row.xml_content;
                }
            } catch (_) {}
        }

        const { sitemaps } = await this.refreshAllSitemaps({ db, host });
        return sitemaps[sitemapId] ? sitemaps[sitemapId].xml : sitemaps['all'].xml;
    }

    async getStats({ db = null } = {}) {
        const cached = memoryCache.get('index');
        if (cached && cached.stats) return cached.stats;

        if (db && typeof db.query === 'function') {
            try {
                const rows = await db.query(
                    'SELECT source_stats FROM sitemaps_cache WHERE sitemap_id = "index"'
                );
                if (rows && rows.length > 0 && rows[0].source_stats) {
                    return JSON.parse(rows[0].source_stats);
                }
            } catch (_) {}
        }
        return {
            status: 'not_generated_yet',
            generated_at: null
        };
    }
}

const defaultEngine = new SitemapEngine();

module.exports = {
    SitemapEngine,
    defaultEngine,
    escapeXml,
    formatDate,
    DEFAULT_TMDB_API_KEY,
    CACHE_TTL_MS
};
