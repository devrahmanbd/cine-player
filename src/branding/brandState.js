// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Pure branding decision logic — no DOM, no React, fully unit-testable.
//
// Why this exists: branding is fetched once at boot with a short timeout. On a
// slow connection that fetch can abort, and the site would otherwise fall back
// to the compiled-in defaults ("LinuxStream") even though the operator has
// rebranded. We persist the last good brand to localStorage and seed from it,
// so a failed/slow fetch never regresses the visible brand.

// Every field the API may serve, and its compiled-in default. The API's own
// BRAND_COLUMNS list is the source of truth for field names.
const BRAND_FIELDS = ['site_name', 'tagline', 'logo_url', 'favicon_url', 'theme', 'accent'];

// Merge a served (or cached) brand over defaults. Only accepts non-empty
// strings of a sane length for known fields — anything else is ignored so a
// malformed payload can never blank or break the brand.
function mergeBrand(defaults, brand) {
    const out = { ...defaults };
    if (brand === null || typeof brand !== 'object' || Array.isArray(brand)) {
        return out;
    }
    for (const field of BRAND_FIELDS) {
        const value = brand[field];
        if (typeof value === 'string' && value.trim().length > 0 && value.length <= 500) {
            out[field] = value;
        }
    }
    return out;
}

// A cached brand is only worth seeding from if it actually carries a usable
// site_name (the one field that must never regress to the old identity).
function canUseCachedBrand(brand) {
    return (
        brand !== null &&
        typeof brand === 'object' &&
        !Array.isArray(brand) &&
        typeof brand.site_name === 'string' &&
        brand.site_name.trim().length > 0
    );
}

module.exports = { BRAND_FIELDS, mergeBrand, canUseCachedBrand };
