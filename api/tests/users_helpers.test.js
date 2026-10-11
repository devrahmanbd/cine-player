// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, it */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail, validEmail, validPassword, newToken, sha256hex, otpCode, takeToken } = require('../users');

describe('users helpers', () => {
    it('normalizes and validates email', () => {
        assert.equal(normalizeEmail('  Ann@Example.COM '), 'ann@example.com');
        assert.equal(validEmail('ann@example.com'), true);
        assert.equal(validEmail('not-an-email'), false);
        assert.equal(validEmail('a@b'), false);
    });
    it('enforces password floor', () => {
        assert.equal(validPassword('12345678'), true);
        assert.equal(validPassword('short'), false);
        assert.equal(validPassword(''), false);
    });
    it('mints unique tokens and 6-digit codes', () => {
        assert.equal(newToken().length, 64);
        assert.notEqual(newToken(), newToken());
        assert.match(otpCode(), /^[0-9]{6}$/);
        assert.equal(sha256hex('x').length, 64);
    });
    it('rate-limits by bucket', () => {
        const map = new Map();
        assert.equal(takeToken(map, 'a@b.c', 3, 60000), true);
        assert.equal(takeToken(map, 'a@b.c', 3, 60000), true);
        assert.equal(takeToken(map, 'a@b.c', 3, 60000), true);
        assert.equal(takeToken(map, 'a@b.c', 3, 60000), false);
        assert.equal(takeToken(map, 'other@b.c', 3, 60000), true);
    });
});
