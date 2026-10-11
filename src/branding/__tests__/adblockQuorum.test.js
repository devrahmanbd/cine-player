// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { aggregateNetworkQuorum, classifyAdblock } = require('../adblockDetector');

describe('aggregateNetworkQuorum', () => {
    test('no failures -> false', () => {
        expect(aggregateNetworkQuorum([false, false, false, false, false, false, false, false, false])).toBe(false);
    });

    test('single slow probe alone -> false (no single-probe flip)', () => {
        const results = [false, false, false, false, false, false, false, false, false];
        results[0] = true;
        expect(aggregateNetworkQuorum(results)).toBe(false);
    });

    test('single family fully failed -> false (quorum needs two families)', () => {
        expect(aggregateNetworkQuorum([true, true, true, false, false, false, false, false, false])).toBe(false);
        expect(aggregateNetworkQuorum([false, false, false, false, false, false, true, true, true])).toBe(false);
    });

    test('two families each with one failed probe -> true', () => {
        expect(aggregateNetworkQuorum([true, false, false, true, false, false, false, false, false])).toBe(true);
        expect(aggregateNetworkQuorum([false, false, false, false, true, false, false, false, true])).toBe(true);
    });

    test('all three families fail -> true', () => {
        expect(aggregateNetworkQuorum([true, false, false, false, true, false, false, false, true])).toBe(true);
    });
});

describe('classifyAdblock stays green', () => {
    test('clean when nothing fires and control passes', () => {
        expect(classifyAdblock({ bait: false, net: false, control: true })).toBe('clean');
    });

    test('network only -> dns', () => {
        expect(classifyAdblock({ bait: false, net: true, control: true })).toBe('dns');
    });
});
