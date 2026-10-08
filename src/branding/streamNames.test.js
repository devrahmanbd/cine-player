// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { maskStreamName } = require('./streamNames');

describe('maskStreamName', () => {
    test('strips leading bare brand and trailing size', () => {
        expect(maskStreamName('filmgaze Titanic 85GB')).toBe('Titanic');
    });

    test('strips leading bracket brand but keeps quality tokens', () => {
        expect(maskStreamName('[Filmgaze] Titanic 2160p')).toBe('Titanic 2160p');
    });

    test('strips trailing spaced size', () => {
        expect(maskStreamName('Titanic 1.2 GB')).toBe('Titanic');
    });

    test('leaves plain title untouched', () => {
        expect(maskStreamName('Titanic')).toBe('Titanic');
    });

    test('does not blank a size-only string', () => {
        expect(maskStreamName('85GB')).toBe('85GB');
    });

    test('passes non-strings through as-is', () => {
        expect(maskStreamName(null)).toBe(null);
        expect(maskStreamName(undefined)).toBe(undefined);
        expect(maskStreamName(123)).toBe(123);
    });
});
