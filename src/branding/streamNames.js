// Copyright (C) 2026 stremio-linux fork. GPL-2.0.

function stripTrailingSizes(input) {
    let output = input;
    let previous = null;
    while (previous !== output) {
        previous = output;
        output = output.replace(/\s*\b\d+(\.\d+)?\s?(GB|MB|KB|TB)\b\s*$/i, '');
    }
    return output;
}

function maskStreamName(raw) {
    if (typeof raw !== 'string') {
        return raw;
    }

    let result = raw;

    const bracketMatch = /^\s*\[[^[\]]+\]\s*/.exec(result);
    const hadBracket = Boolean(bracketMatch);
    if (hadBracket) {
        result = result.slice(bracketMatch[0].length);
    }

    result = stripTrailingSizes(result);

    if (!hadBracket && /\s/.test(result.trim())) {
        result = result.replace(/^\s*[A-Za-z0-9._-]+\s+/, '');
        result = stripTrailingSizes(result);
    }

    result = result.replace(/\s+/g, ' ').trim();

    if (result === '') {
        return raw;
    }

    return result;
}

function maskStreamDescription(raw) {
    if (typeof raw !== 'string') {
        return raw;
    }

    if (raw === '') {
        return '';
    }

    let result = raw.replace(/\[[^[\]]*\]/g, ' ');
    result = result.replace(/(?:💾\s*)?\b\d+(\.\d+)?\s?(GB|MB|KB|TB)\b/gi, ' ');
    result = result.replace(/\s+/g, ' ').trim();

    if (result === '') {
        return maskStreamName(raw);
    }

    return result;
}

module.exports = { maskStreamName, maskStreamDescription, isPlayableStream };

// Promo/redirect cards some addons inject (donation, discord, …) carry an
// externalUrl and no playable url. Only real media servers stay listed.
// Hardened against future promo shapes: host denylist (R1), gated `donat`
// substring (R2), gated page-extension probe (R3), admin extraPatterns.
// Fail-open: magnet:? and unknown shapes without promo signals stay playable.
const PROMO_HOSTS = [
    'discord.gg',
    'discord.com',
    't.me',
    'telegram.me',
    'patreon.com',
    'buymeacoffee.com',
    'paypal.com',
    'ko-fi.com'
];

const PAGE_EXTENSION_RE = /\.(html?|php|aspx)(\?|#|$)/i;

function getHostname(raw) {
    try {
        return new URL(raw).hostname.toLowerCase();
    } catch (_ignored) {
        return null;
    }
}

function hasVideoSize(stream) {
    return Boolean(
        stream &&
        typeof stream === 'object' &&
        stream.behaviorHints &&
        typeof stream.behaviorHints === 'object' &&
        stream.behaviorHints.videoSize !== undefined &&
        stream.behaviorHints.videoSize !== null
    );
}

function textOf(value) {
    return typeof value === 'string' ? value : '';
}

function isPlayableStream(stream, extraPatterns = []) {
    if (!stream || typeof stream !== 'object') return false;
    // R0 (keep): externalUrl non-empty → not playable; missing/empty url → not playable.
    if (typeof stream.externalUrl === 'string' && stream.externalUrl.length > 0) return false;
    if (typeof stream.url !== 'string' || stream.url.length === 0) return false;
    // Array.prototype.filter passes (value, index, array); guard the optional param.
    if (!Array.isArray(extraPatterns)) extraPatterns = [];

    // R1: host denylist matched against `url + ' ' + (externalUrl || '')`,
    // lowercase, host-part only. Unparseable URLs skip this rule (fail-open).
    const hosts = [];
    const urlHost = getHostname(stream.url);
    if (urlHost !== null) hosts.push(urlHost);
    if (typeof stream.externalUrl === 'string' && stream.externalUrl.length > 0) {
        const extHost = getHostname(stream.externalUrl);
        if (extHost !== null) hosts.push(extHost);
    }
    for (const host of hosts) {
        for (const denied of PROMO_HOSTS) {
            if (host === denied || host.endsWith('.' + denied)) return false;
        }
    }

    const haystack = (
        textOf(stream.url) + ' ' + textOf(stream.name) + ' ' + textOf(stream.description)
    ).toLowerCase();

    // R2: `donat` substring, gated on missing behaviorHints.videoSize
    // (avoids false positives like documentaries about donations).
    if (!hasVideoSize(stream) && haystack.includes('donat')) return false;

    // R3: page-extension probe, ONLY in conjunction with
    // (has externalUrl OR lacks behaviorHints.videoSize). Standalone it
    // false-positives on legit season packs (testzip.php?id=... + videoSize).
    const hasExternalUrl = typeof stream.externalUrl === 'string' && stream.externalUrl.length > 0;
    let pageLike = false;
    const candidates = [stream.url, stream.externalUrl];
    for (const candidate of candidates) {
        if (typeof candidate !== 'string' || candidate.length === 0) continue;
        let pathPart = candidate;
        try {
            const parsed = new URL(candidate);
            pathPart = parsed.pathname + parsed.search + parsed.hash;
        } catch (_ignored) {
            pathPart = candidate;
        }
        if (PAGE_EXTENSION_RE.test(pathPart)) {
            pageLike = true;
            break;
        }
    }
    if (pageLike && (hasExternalUrl || !hasVideoSize(stream))) return false;

    // Admin-supplied substrings (case-insensitive) over url+name+description.
    for (const pattern of extraPatterns) {
        if (typeof pattern !== 'string' || pattern.length === 0) continue;
        if (haystack.includes(pattern.toLowerCase())) return false;
    }

    return true;
}
