#!/usr/bin/env node
// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Daily availability worker: refreshes availability cache from Cinemeta top
// catalogs + enabled addon catalogs. Zero-dep (db.js, availability.js, fetch).
const { openDb } = require('./db');
const { createSchema } = require('./seed');
const { resolveAvailability, manifestBase, fetchJson } = require('./availability');

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io/catalog';

async function collectCinemetaItems() {
    const out = [];
    for (const type of ['movie', 'series']) {
        try {
            const data = await fetchJson(`${CINEMETA_BASE}/${type}/top.json`, 15000);
            const metas = data && Array.isArray(data.metas) ? data.metas : [];
            for (const meta of metas.slice(0, 50)) {
                if (!meta || typeof meta.id !== 'string') continue;
                if (!/^[A-Za-z0-9_-]+$/.test(meta.id)) continue;
                out.push({ type, id: meta.id });
            }
        } catch (error) {
            console.log(`cinemeta ${type} failed: ${error.message || error}`);
        }
    }
    return out;
}

async function collectAddonItems(db) {
    const out = [];
    const rows = await db.query('SELECT manifest_url FROM addons WHERE enabled = 1');
    for (const row of rows || []) {
        const base = manifestBase(row.manifest_url);
        if (!base) continue;
        let manifest;
        try {
            manifest = await fetchJson(row.manifest_url, 10000);
        } catch (error) {
            console.log(`manifest failed ${base}: ${error.message || error}`);
            continue;
        }
        const catalogs = manifest && Array.isArray(manifest.catalogs) ? manifest.catalogs : [];
        const firstMovie = catalogs.find((c) => c && c.type === 'movie' && typeof c.id === 'string');
        const firstSeries = catalogs.find((c) => c && c.type === 'series' && typeof c.id === 'string');
        const targets = [];
        if (firstMovie) targets.push(firstMovie);
        if (firstSeries && firstSeries !== firstMovie) targets.push(firstSeries);
        for (const catalog of targets) {
            try {
                const data = await fetchJson(`${base}/catalog/${catalog.type}/${catalog.id}.json`, 15000);
                const metas = data && Array.isArray(data.metas) ? data.metas : [];
                for (const meta of metas.slice(0, 100)) {
                    if (!meta || typeof meta.id !== 'string') continue;
                    if (!/^[A-Za-z0-9_-]+$/.test(meta.id)) continue;
                    const type = meta.type === 'movie' || meta.type === 'series' ? meta.type : catalog.type;
                    if (type !== 'movie' && type !== 'series') continue;
                    out.push({ type, id: meta.id });
                }
            } catch (error) {
                console.log(`catalog failed ${base} ${catalog.type}/${catalog.id}: ${error.message || error}`);
            }
        }
    }
    return out;
}

async function main() {
    let db;
    try {
        db = openDb();
    } catch (error) {
        console.error(`worker db open failed: ${error.message || error}`);
        process.exit(1);
    }
    try {
        await createSchema(db);
    } catch (error) {
        console.error(`worker schema failed: ${error.message || error}`);
        process.exit(1);
    }
    let cinemeta = [];
    let addonItems = [];
    try {
        cinemeta = await collectCinemetaItems();
    } catch (error) {
        console.log(`cinemeta collection failed: ${error.message || error}`);
        cinemeta = [];
    }
    try {
        addonItems = await collectAddonItems(db);
    } catch (error) {
        console.error(`worker addon collection db failure: ${error.message || error}`);
        try {
            await db.close();
        } catch {}
        process.exit(1);
    }
    const seen = new Set();
    const items = [];
    for (const item of [...cinemeta, ...addonItems]) {
        const key = `${item.type}:${item.id}`;
        if (seen.has(key)) continue;
        if (!/^(movie|series):[A-Za-z0-9_-]+$/.test(key)) continue;
        seen.add(key);
        items.push(item);
    }
    console.log(`worker: cinemeta=${cinemeta.length} addon=${addonItems.length} total=${items.length}`);
    if (items.length === 0) {
        console.log('worker: nothing to check');
        await db.close();
        return;
    }
    try {
        const result = await resolveAvailability(db, items);
        console.log(`worker: checked=${result.checked} available=${result.available}`);
        await db.close();
    } catch (error) {
        console.error(`worker resolve failed: ${error.message || error}`);
        try {
            await db.close();
        } catch {}
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { collectCinemetaItems, collectAddonItems, main };
