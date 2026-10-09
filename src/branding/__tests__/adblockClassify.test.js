// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { classifyAdblock } = require('../adblockDetector');

describe('classifyAdblock', () => {
    test('clean when nothing fires and control passes', () => {
        expect(classifyAdblock({ bait: false, net: false, control: true })).toBe('clean');
    });

    test('bait only -> extension (cosmetic filtering)', () => {
        expect(classifyAdblock({ bait: true, net: false, control: true })).toBe('extension');
    });

    test('network only -> dns (no DOM changes: AdGuard Home / Pi-hole style)', () => {
        expect(classifyAdblock({ bait: false, net: true, control: true })).toBe('dns');
    });

    test('both fire -> both', () => {
        expect(classifyAdblock({ bait: true, net: true, control: true })).toBe('both');
    });

    test('control fails -> offline regardless of signals', () => {
        expect(classifyAdblock({ bait: false, net: false, control: false })).toBe('offline');
        expect(classifyAdblock({ bait: true, net: true, control: false })).toBe('offline');
    });
});
