// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect, beforeEach */

const { rebrandValue, applySiteNameToStore, clearRebrandCache } = require('./brandStrings');

describe('rebrandValue', () => {
    test('replaces the capitalized brand word', () => {
        expect(rebrandValue('I agree with the Stremio', 'LinuxStream')).toBe('I agree with the LinuxStream');
    });
    test('leaves URLs, emails and lowercase hits intact', () => {
        expect(rebrandValue('open web.stremio.com', 'X')).toBe('open web.stremio.com');
        expect(rebrandValue('contact office@stremio.com', 'X')).toBe('contact office@stremio.com');
        expect(rebrandValue('What is stremio?', 'X')).toBe('What is stremio?');
        expect(rebrandValue('https://a.b/Stremio/x', 'X')).toBe('https://a.b/Stremio/x');
    });
    test('pass-through for non-strings and empty site names', () => {
        expect(rebrandValue(null, 'X')).toBe(null);
        expect(rebrandValue('Stremio', '')).toBe('Stremio');
        expect(rebrandValue('plain copy', 'X')).toBe('plain copy');
    });
});

describe('applySiteNameToStore', () => {
    beforeEach(() => clearRebrandCache());
    test('rewrites all bundles and re-derives from originals on rename', () => {
        const store = {
            'en-US': { translation: { A: 'Use Stremio here', B: 'untouched' } },
            fr: { translation: { A: 'Utiliser Stremio ici' } },
        };
        expect(applySiteNameToStore(store, 'One')).toBe(2);
        expect(store['en-US'].translation.A).toBe('Use One here');
        expect(store.fr.translation.A).toBe('Utiliser One ici');
        expect(applySiteNameToStore(store, 'Two')).toBe(2);
        expect(store['en-US'].translation.A).toBe('Use Two here');
        expect(applySiteNameToStore(store, 'Two')).toBe(0);
    });
    test('never throws on hostile input', () => {
        expect(applySiteNameToStore(null, 'X')).toBe(0);
        expect(applySiteNameToStore({}, '')).toBe(0);
    });
});
