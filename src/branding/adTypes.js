// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Pure ad-type map for the admin picker: groups the 10 adslots into the five
// Adsterra format types (popunder, social bar, native, banners, smartlink).
// JSX-free and dependency-free so jest and the api test suite can both
// require it (node-safe CJS).
//
// Input contract: `slots` here is the ARRAY shape from `GET /api/adslots`
// (each entry { slot_key, enabled: 0|1, code }) — i.e. the admin panel's
// cfg.slots — NOT BrandingContext's boolean-coerced ads map. enabled is
// compared strictly (`=== 1`) so the wrong shape fails loudly (all-off)
// instead of silently half-working.
const AD_TYPES = [
    { key: 'popunder', slots: ['popunder'] },
    { key: 'socialbar', slots: ['socialbar'] },
    { key: 'native', slots: ['native'] },
    {
        key: 'banners',
        slots: ['banner_728x90', 'banner_468x60', 'banner_300x250', 'banner_160x600', 'banner_160x300', 'banner_320x50'],
    },
    { key: 'smartlink', slots: ['smartlink'] },
];

function findType(typeKey) {
    return AD_TYPES.find((t) => t.key === typeKey) || null;
}

// A type reads "on" when at least one of its slots is enabled.
function typeActive(slots, typeKey) {
    const type = findType(typeKey);
    if (!type) return false;
    return type.slots.some((key) => {
        const slot = slots.find((s) => s.slot_key === key);
        return !!(slot && slot.enabled === 1);
    });
}

// Toggling sets EVERY slot in the group to the same fresh value, so a mixed
// group is normalized on the first click.
function togglePlan(slots, typeKey) {
    const type = findType(typeKey);
    if (!type) return {};
    const active = typeActive(slots, typeKey);
    return Object.fromEntries(type.slots.map((key) => [key, active ? 0 : 1]));
}

module.exports = { AD_TYPES, typeActive, togglePlan };
