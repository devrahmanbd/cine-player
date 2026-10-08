// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { maskStreamName, maskStreamDescription } = require('./streamNames');

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

describe('maskStreamDescription', () => {
    test('strips bracket tags and size but keeps title and 1080p', () => {
        const input = '[PixelDrain] [💾 6.68 GB] The Shawshank Redemption (1994) REMASTERED 1080p x265';
        const out = maskStreamDescription(input);
        expect(out).toBe('The Shawshank Redemption (1994) REMASTERED 1080p x265');
        expect(out).not.toMatch(/PixelDrain/);
        expect(out).not.toMatch(/GB/i);
        expect(out).toMatch(/1080p/);
    });

    test('leaves plain title unchanged', () => {
        expect(maskStreamDescription('Just a title')).toBe('Just a title');
    });

    test('returns empty for empty input', () => {
        expect(maskStreamDescription('')).toBe('');
    });

    test('passes non-strings through as-is', () => {
        expect(maskStreamDescription(null)).toBe(null);
        expect(maskStreamDescription(undefined)).toBe(undefined);
        expect(maskStreamDescription(123)).toBe(123);
    });

    test('removes standalone size with emoji prefix', () => {
        expect(maskStreamDescription('Dune Part Two 💾 2.5 GB 2160p')).toBe('Dune Part Two 2160p');
    });

    test('collapses whitespace and newlines to single spaces', () => {
        expect(maskStreamDescription('Title\n  with   \n newline')).toBe('Title with newline');
    });

    test('never returns blank for non-empty bracket-only input', () => {
        const out = maskStreamDescription('[Lonely]');
        expect(typeof out).toBe('string');
        expect(out.length).toBeGreaterThan(0);
    });
});
