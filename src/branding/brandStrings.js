// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Runtime copy rebrand: rewrites the upstream brand word inside loaded i18n
// translation VALUES (keys untouched) so every label follows the admin's
// site_name with no rebuild. Pure + fail-open; callers never break.
//
// Safety rules (do not relax):
// - Only the capitalized standalone word `Stremio` is replaced. Lowercase
//   hits are emails/domains/icon names (office@stremio.com, web.stremio.com,
//   stremio-circle) and all-caps hits don't exist as values — both pass
//   through untouched.
// - Strings containing '://' are never rewritten (link targets stay valid).
// - Rewrites always derive from PRISTINE originals, so renaming the site
//   twice (A -> B -> C) never compounds (B's name is never re-matched,
//   and switching back restores exact originals).
const WORD_RE = /\bStremio\b/g;

function rebrandValue(value, siteName) {
    if (typeof value !== 'string' || value.length === 0) return value;
    if (typeof siteName !== 'string' || siteName.length === 0) return value;
    if (value.indexOf('://') !== -1) return value;
    if (value.indexOf('Stremio') === -1) return value;
    return value.replace(WORD_RE, siteName);
}

// Largest i18next bundle depth is plain key->string, but walk nested
// objects/arrays anyway (plurals, nested ns) — strings only, keys intact.
const originals = new Map();

function rebrandNode(node, siteName, path) {
    if (typeof node === 'string') {
        if (!originals.has(path)) originals.set(path, node);
        return rebrandValue(originals.get(path), siteName);
    }
    if (Array.isArray(node)) {
        let changed = false;
        const out = node.map((item, index) => {
            const next = rebrandNode(item, siteName, `${path}[${index}]`);
            if (next !== item) changed = true;
            return next;
        });
        return changed ? out : node;
    }
    if (node !== null && typeof node === 'object') {
        let changed = false;
        const out = { ...node };
        for (const key of Object.keys(node)) {
            const next = rebrandNode(node[key], siteName, `${path}.${key}`);
            if (next !== node[key]) {
                out[key] = next;
                changed = true;
            }
        }
        return changed ? out : node;
    }
    return node;
}

// Applies siteName across every loaded i18next bundle (all languages).
// Returns the number of strings rewritten. Mutates bundle objects in place
// (same refs i18next already serves) and never throws.
function applySiteNameToStore(store, siteName) {
    try {
        if (!store || typeof store !== 'object') return 0;
        if (typeof siteName !== 'string' || siteName.length === 0) return 0;
        let count = 0;
        for (const lng of Object.keys(store)) {
            const nss = store[lng];
            if (!nss || typeof nss !== 'object') continue;
            for (const ns of Object.keys(nss)) {
                const bundle = nss[ns];
                if (!bundle || typeof bundle !== 'object') continue;
                for (const key of Object.keys(bundle)) {
                    const next = rebrandNode(bundle[key], siteName, `${lng}.${ns}.${key}`);
                    if (next !== bundle[key]) {
                        bundle[key] = next;
                        count += 1;
                    }
                }
            }
        }
        return count;
    } catch {
        return 0;
    }
}

function clearRebrandCache() {
    originals.clear();
}

module.exports = { rebrandValue, applySiteNameToStore, clearRebrandCache };
