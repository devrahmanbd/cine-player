// Copyright (C) 2017-2023 Smart code 203358507
/* global describe, test, expect */

const { progressPercent } = require('./useLocalLibrary');

describe('progressPercent', () => {
    test('returns 0 for empty progress', () => {
        expect(progressPercent(0, 100)).toBe(0);
    });

    test('computes rounded percentage', () => {
        expect(progressPercent(10, 100)).toBe(10);
        expect(progressPercent(50, 100)).toBe(50);
        expect(progressPercent(1, 3)).toBe(33);
        expect(progressPercent(2, 3)).toBe(67);
    });

    test('guards zero duration with max(duration,1)', () => {
        expect(progressPercent(0, 0)).toBe(0);
    });

    test('clamps above 100', () => {
        expect(progressPercent(150, 100)).toBe(100);
        expect(progressPercent(5, 0)).toBe(100);
    });

    test('clamps invalid input to 0', () => {
        expect(progressPercent(-5, 100)).toBe(0);
        expect(progressPercent(NaN, 100)).toBe(0);
        expect(progressPercent(10, -5)).toBe(100);
    });
});
