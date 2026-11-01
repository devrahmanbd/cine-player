// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// curl-based fetching: addon/file hosts bot-wall Node's TLS fingerprint
// (403s) while serving curl fine. All server-side outbound reads go here.
const { execFile } = require('node:child_process');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_BYTES = 8 * 1024 * 1024;

function runCurl(args, timeoutMs) {
    return new Promise((resolve, reject) => {
        execFile('curl', ['-sS', '--location', '--max-time', String(Math.ceil(timeoutMs / 1000)), '-A', UA, ...args], {
            timeout: timeoutMs + 2000,
            maxBuffer: MAX_BYTES + 1024,
        }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`curl failed: ${(stderr || error.message).trim().slice(0, 200)}`));
                return;
            }
            resolve(stdout);
        });
    });
}

async function curlJson(url, timeoutMs) {
    const out = await runCurl(['--fail', '--max-filesize', String(MAX_BYTES), url], timeoutMs);
    return JSON.parse(out);
}

async function curlStatus(url, { range = false, timeoutMs = 8000 } = {}) {
    const args = ['-o', '/dev/null', '-w', '%{http_code}', '--max-filesize', '1'];
    if (range) args.push('--range', '0-0');
    else args.push('-I');
    args.push(url);
    const out = await runCurl(args, timeoutMs);
    return Number(String(out).trim());
}

function extractFirstM3u8Uri(body) {
    if (typeof body !== 'string') return null;
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        return trimmed;
    }
    const mediaMatch = /#EXT-X-MEDIA:[^\r\n]*URI="([^"]+)"/i.exec(body);
    if (mediaMatch) return mediaMatch[1];
    return null;
}

async function curlProbeStream(url, { timeoutMs = 2500, depth = 0 } = {}) {
    if (typeof url !== 'string') return { alive: false, streamable: false, status: 0 };
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { alive: false, streamable: false, status: 0 };
        }
    } catch {
        return { alive: false, streamable: false, status: 0 };
    }

    const args = [
        '--range', '0-0',
        '-D', '-',
        '-o', '/dev/null',
        '-w', '\n__PROBE__:%{http_code}:%{content_type}',
        url,
    ];

    try {
        const output = await runCurl(args, timeoutMs);
        const markerIndex = output.lastIndexOf('\n__PROBE__:');
        const metaLine = markerIndex !== -1 ? output.slice(markerIndex + 11).trim() : '';
        const headersText = markerIndex !== -1 ? output.slice(0, markerIndex) : output;

        const [codeStr, contentTypeRaw] = metaLine.split(':');
        const status = Number(codeStr) || 0;
        const contentType = (contentTypeRaw || '').toLowerCase().trim();

        const is2xx = status === 200 || status === 206;
        if (!is2xx) {
            return { alive: false, streamable: false, status };
        }

        if (
            contentType.includes('text/html') ||
            contentType.includes('application/xhtml+xml') ||
            contentType.includes('application/json')
        ) {
            return { alive: false, streamable: false, status, contentType };
        }

        const isM3u8 = contentType.includes('mpegurl') || /\.(m3u8)(\?|#|$)/i.test(url);
        if (isM3u8 && depth < 2) {
            try {
                const playlistText = await runCurl(['--max-filesize', '65536', url], Math.min(timeoutMs, 2000));
                if (playlistText.includes('#EXTM3U')) {
                    const childUri = extractFirstM3u8Uri(playlistText);
                    if (childUri) {
                        const childUrl = new URL(childUri, url).href;
                        const childProbe = await curlProbeStream(childUrl, {
                            timeoutMs: Math.max(1000, timeoutMs - 500),
                            depth: depth + 1,
                        });
                        if (!childProbe.alive || !childProbe.streamable) {
                            return {
                                alive: false,
                                streamable: false,
                                status: childProbe.status || 502,
                                contentType,
                            };
                        }
                    }
                }
            } catch {
                return { alive: false, streamable: false, status: 0 };
            }
        }

        const lowerHeaders = headersText.toLowerCase();
        const hasRangeHeader = lowerHeaders.includes('accept-ranges: bytes') || lowerHeaders.includes('content-range:');
        const isVideoType = contentType.startsWith('video/') ||
            contentType.startsWith('audio/') ||
            contentType.includes('mpegurl') ||
            contentType.includes('matroska') ||
            contentType.includes('dash+xml');

        const isMediaExt = /\.(mp4|mkv|m3u8|webm|ts|avi|mov)(\?|#|$)/i.test(url);
        const streamable = status === 206 || hasRangeHeader || isVideoType || isMediaExt;

        return {
            alive: true,
            streamable,
            status,
            contentType,
        };
    } catch {
        return { alive: false, streamable: false, status: 0 };
    }
}

module.exports = { curlJson, curlStatus, curlProbeStream, UA };
