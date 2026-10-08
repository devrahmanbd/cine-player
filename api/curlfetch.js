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

module.exports = { curlJson, curlStatus, UA };
