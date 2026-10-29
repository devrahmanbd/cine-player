// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { getSmartlink } = require('../adInjector');

const URL = 'https://directyp.org/example-offer';

describe('getSmartlink', () => {
    test('enabled + https code -> trimmed url', () => {
        expect(getSmartlink({ smartlink: { enabled: true, code: URL } })).toBe(URL);
    });

    test('disabled -> null', () => {
        expect(getSmartlink({ smartlink: { enabled: false, code: URL } })).toBe(null);
    });

    test('http:// (non-https) -> null', () => {
        expect(getSmartlink({ smartlink: { enabled: true, code: 'http://example.org/x' } })).toBe(null);
    });

    test('missing slot / empty code -> null', () => {
        expect(getSmartlink({})).toBe(null);
        expect(getSmartlink({ smartlink: { enabled: true, code: '' } })).toBe(null);
        expect(getSmartlink({ smartlink: { enabled: true, code: '   ' } })).toBe(null);
    });

    test('code with surrounding whitespace -> trimmed url returned', () => {
        expect(getSmartlink({ smartlink: { enabled: true, code: `  ${URL}\n` } })).toBe(URL);
    });
});
