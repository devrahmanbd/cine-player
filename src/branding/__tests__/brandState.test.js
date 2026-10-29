// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { canUseCachedBrand, mergeBrand } = require('../brandState');

describe('brandState.mergeBrand', () => {
    const DEFAULTS = {
        site_name: 'LinuxStream',
        tagline: 'Freedom to Stream',
        logo_url: '/brand/logo.svg',
        favicon_url: '/favicons/favicon.ico',
        theme: 'gnome-dark',
        accent: '#E95420',
    };

    test('overlays every served field over defaults', () => {
        const served = {
            site_name: 'CinemaVilla',
            tagline: 'Stream Whatever You Dream',
            logo_url: '/brand/1793260657227-864a1e9a.png',
            favicon_url: '/brand/1793260657227-864a1e9a.png',
            theme: 'gnome-dark',
            accent: '#337BFF',
        };
        expect(mergeBrand(DEFAULTS, served)).toEqual(served);
    });

    test('partial payload fills the rest from defaults', () => {
        const merged = mergeBrand(DEFAULTS, { site_name: 'CinemaVilla' });
        expect(merged.site_name).toBe('CinemaVilla');
        expect(merged.tagline).toBe('Freedom to Stream');
        expect(merged.accent).toBe('#E95420');
    });

    test('null / non-object payload returns defaults untouched', () => {
        expect(mergeBrand(DEFAULTS, null)).toEqual(DEFAULTS);
        expect(mergeBrand(DEFAULTS, undefined)).toEqual(DEFAULTS);
        expect(mergeBrand(DEFAULTS, 'nope')).toEqual(DEFAULTS);
    });

    test('non-string and absurdly long field values are dropped', () => {
        const merged = mergeBrand(DEFAULTS, {
            site_name: 42,
            tagline: { evil: true },
            accent: '#337BFF'.repeat(200),
            theme: 'gnome-dark',
        });
        expect(merged.site_name).toBe('LinuxStream');
        expect(merged.tagline).toBe('Freedom to Stream');
        expect(merged.accent).toBe('#E95420');
        expect(merged.theme).toBe('gnome-dark');
    });

    test('empty-string values do not wipe defaults', () => {
        const merged = mergeBrand(DEFAULTS, { site_name: '', logo_url: '' });
        expect(merged.site_name).toBe('LinuxStream');
        expect(merged.logo_url).toBe('/brand/logo.svg');
    });
});

describe('brandState.canUseCachedBrand', () => {
    test('a full cached brand is usable', () => {
        expect(canUseCachedBrand({
            site_name: 'CinemaVilla',
            tagline: 'Stream Whatever You Dream',
            logo_url: '/brand/x.png',
            favicon_url: '/brand/x.png',
            theme: 'gnome-dark',
            accent: '#337BFF',
        })).toBe(true);
    });

    test('garbage is not usable', () => {
        expect(canUseCachedBrand(null)).toBe(false);
        expect(canUseCachedBrand({})).toBe(false);
        expect(canUseCachedBrand({ site_name: 42 })).toBe(false);
        expect(canUseCachedBrand('str')).toBe(false);
        expect(canUseCachedBrand([])).toBe(false);
    });

    test('a cached brand missing site_name is not usable', () => {
        expect(canUseCachedBrand({ tagline: 'x', logo_url: '/brand/x.png', favicon_url: '/brand/x.png', theme: 'gnome-dark', accent: '#337BFF' })).toBe(false);
    });
});
