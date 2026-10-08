// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { resolveAdblockMode, GRACE_MS } = require('../adblockLogic');

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
