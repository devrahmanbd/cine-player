// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
/* global describe, test, expect */

const { maskStreamName, maskStreamDescription, isPlayableStream } = require('./streamNames');

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

describe('isPlayableStream', () => {
    test('keeps real media urls', () => {
        expect(isPlayableStream({ url: 'https://cdn.example/f.mkv' })).toBe(true);
        expect(isPlayableStream({ url: 'magnet:?xt=abc' })).toBe(true);
    });

    test('drops promo cards with externalUrl (donation, discord)', () => {
        expect(isPlayableStream({ name: 'Donation needed.', externalUrl: 'http://example.com/donation.html' })).toBe(false);
        expect(isPlayableStream({ name: 'Join the Discord server', externalUrl: 'https://discord.gg/x' })).toBe(false);
    });

    test('drops url-less and invalid entries', () => {
        expect(isPlayableStream({ name: 'No url here' })).toBe(false);
        expect(isPlayableStream({})).toBe(false);
        expect(isPlayableStream(null)).toBe(false);
        expect(isPlayableStream('https://cdn.example/f.mkv')).toBe(false);
    });

    test('accepts torrent and youtube sources without http url', () => {
        expect(isPlayableStream({ infoHash: 'abc123' })).toBe(true);
        expect(isPlayableStream({ ytId: 'dQw4w9WgXcQ' })).toBe(true);
        expect(isPlayableStream({ infoHash: 'abc123', externalUrl: 'https://evil.example/x' })).toBe(false);
    });

    test('R1 blocks discord.gg host in url even with videoSize', () => {
        expect(isPlayableStream({
            url: 'https://discord.gg/invite123',
            behaviorHints: { videoSize: 1234 }
        })).toBe(false);
    });

    test('R1 blocks t.me host in url', () => {
        expect(isPlayableStream({ url: 'https://t.me/somechannel' })).toBe(false);
    });

    test('R1 blocks patreon.com subdomain host in url', () => {
        expect(isPlayableStream({ url: 'https://www.patreon.com/creator' })).toBe(false);
    });

    test('R1 ignores unparseable url (fail-open, no block)', () => {
        expect(isPlayableStream({ url: 'not a url discord.gg' })).toBe(true);
    });

    test('R2 blocks donat mention without videoSize', () => {
        expect(isPlayableStream({
            url: 'https://cdn.example/movie.mkv',
            name: 'Please donate to keep us alive'
        })).toBe(false);
    });

    test('R2 allows donat documentary with videoSize (gated)', () => {
        expect(isPlayableStream({
            url: 'https://cdn.example/movie.mkv',
            name: 'Documentary about donations',
            behaviorHints: { videoSize: 987654 }
        })).toBe(true);
    });

    test('R3 allows legit season pack testzip.php with videoSize', () => {
        expect(isPlayableStream({
            url: 'https://cdn.example/testzip.php?id=abc123',
            behaviorHints: { videoSize: 456789 }
        })).toBe(true);
    });

    test('R3 blocks page-like url without videoSize', () => {
        expect(isPlayableStream({
            url: 'https://cdn.example/testzip.php?id=abc123'
        })).toBe(false);
    });

    test('R3 blocks donation.html url paired with externalUrl', () => {
        expect(isPlayableStream({
            url: 'https://cdn.example/donation.html',
            externalUrl: 'https://cdn.example/donation.html'
        })).toBe(false);
    });

    test('extraPatterns custom substring blocks matching entry', () => {
        expect(isPlayableStream(
            { url: 'https://cdn.example/movie.mkv', name: 'My-Promo Release' },
            ['my-promo']
        )).toBe(false);
    });

    test('extraPatterns non-matching entry stays playable', () => {
        expect(isPlayableStream(
            { url: 'https://cdn.example/movie.mkv', name: 'Clean Release' },
            ['my-promo']
        )).toBe(true);
    });

    test('magnet and unknown future CDN shapes stay playable (fail-open)', () => {
        expect(isPlayableStream({ url: 'magnet:?xt=urn:btih:abc123' })).toBe(true);
        expect(isPlayableStream({ url: 'https://future-cdn.example/stream/xyz?token=1' })).toBe(true);
    });

    test('blocks non-http/https/magnet protocols (intent, custom schemes)', () => {
        expect(isPlayableStream({ url: 'intent://play#Intent;package=com.player' })).toBe(false);
        expect(isPlayableStream({ url: 'vlc://http://example.com/stream' })).toBe(false);
        expect(isPlayableStream({ url: 'javascript:alert(1)' })).toBe(false);
    });
});

describe('maskStreamDescription host/group stripping', () => {
    test('strips release-group parens but keeps the year', () => {
        const out = maskStreamDescription('Backrooms (2026) 2160p UHD BluRay (WOU-4 Remux HDR DV | Hindi FSL | 4KHDHub');
        expect(out).toMatch(/Backrooms \(2026\) 2160p/);
        expect(out).not.toMatch(/WOU-4|4KHDHub/);
    });

    test('strips hostnames and site tags', () => {
        const out = maskStreamDescription('Backrooms.2026.1080p.BluRay REMUX AVC (RFX-4kHDHub.com).mkv Hindi FSL | 4KHDHub');
        expect(out).not.toMatch(/4kHDHub\.com|4KHDHub|FSL/i);
        expect(out).toMatch(/Backrooms/);
    });

    test('strips bare URLs', () => {
        expect(maskStreamDescription('Title https://example.com/x 1080p')).toBe('Title 1080p');
    });
});
