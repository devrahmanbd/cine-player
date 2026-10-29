// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { resolveAdblockMode, resolveWallMode, GRACE_MS, isActionableKind } = require('../adblockLogic');

const NOW = 1000000000000;

describe('resolveAdblockMode', () => {
    test('no detection -> none', () => {
        expect(resolveAdblockMode({ detected: false, authed: false, firstSeen: null, now: NOW })).toBe('none');
        expect(resolveAdblockMode({ detected: false, authed: true, firstSeen: NOW, now: NOW })).toBe('none');
    });

    test('anonymous + detected -> wall', () => {
        expect(resolveAdblockMode({ detected: true, authed: false, firstSeen: null, now: NOW })).toBe('wall');
        expect(resolveAdblockMode({ detected: true, authed: false, firstSeen: NOW, now: NOW })).toBe('wall');
    });

    test('signed-up within grace -> notice', () => {
        expect(
            resolveAdblockMode({ detected: true, authed: true, firstSeen: NOW - GRACE_MS + 60000, now: NOW })
        ).toBe('notice');
    });

    test('signed-up past grace -> wall', () => {
        expect(
            resolveAdblockMode({ detected: true, authed: true, firstSeen: NOW - GRACE_MS - 1000, now: NOW })
        ).toBe('wall');
    });

    test('signed-up, storage blocked (no firstSeen) -> wall', () => {
        expect(resolveAdblockMode({ detected: true, authed: true, firstSeen: null, now: NOW })).toBe('wall');
    });

    test('grace boundary is exclusive', () => {
        expect(
            resolveAdblockMode({ detected: true, authed: true, firstSeen: NOW - GRACE_MS, now: NOW })
        ).toBe('wall');
    });
});

describe('isActionableKind', () => {
    test('walls only extension-type detections', () => {
        expect(isActionableKind('extension')).toBe(true);
        expect(isActionableKind('both')).toBe(true);
        expect(isActionableKind('dns')).toBe(false);
        expect(isActionableKind('clean')).toBe(false);
        expect(isActionableKind('offline')).toBe(false);
        expect(isActionableKind(null)).toBe(false);
        expect(isActionableKind(undefined)).toBe(false);
    });
});

describe('resolveWallMode', () => {
    const base = { detected: true, actionable: true, transportOk: true, authed: false, firstSeen: NOW, now: NOW };

    test('ads off never walls, regardless of every other input', () => {
        for (const transportOk of [true, false]) {
            for (const authed of [true, false]) {
                expect(resolveWallMode({ ...base, adsEnabled: false, transportOk, authed })).toBe('none');
            }
        }
    });

    test('ads on, transport missing -> wall', () => {
        expect(resolveWallMode({ ...base, adsEnabled: true, transportOk: false, authed: false })).toBe('wall');
    });

    test('ads on, non-actionable detection -> none', () => {
        expect(resolveWallMode({ ...base, adsEnabled: true, actionable: false })).toBe('none');
    });

    test('delegation: authed + fresh grace -> notice; authed + stale grace -> wall; unauth -> wall', () => {
        expect(
            resolveWallMode({ ...base, adsEnabled: true, authed: true, firstSeen: NOW - 60 * 1000, now: NOW })
        ).toBe('notice');
        expect(
            resolveWallMode({ ...base, adsEnabled: true, authed: true, firstSeen: NOW - GRACE_MS - 1, now: NOW })
        ).toBe('wall');
        expect(resolveWallMode({ ...base, adsEnabled: true, authed: false })).toBe('wall');
    });
});
