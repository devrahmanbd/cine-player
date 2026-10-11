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

// Uploader/site tags stripped as standalone tokens. Scoped to known
// release-host shapes (not substrings) so ordinary words survive.
const GROUP_TAGS_RE = /\b(4khdhub|hdhub|vegamovies|filemoon|hubcloud|pixeldrain|doodstream|streamtape|voe|mixdrop|uqload|lulustream|filelions|dropload|vidsrc|vidzee|vixsrc|frembed|cuevana|fsl|ettv|rarbg|yts|eztv)\b/gi;

// Bare hostnames/URLs (with or without scheme). The trailing lookahead keeps
// dotted filenames intact: "HDHub4u.Ms.mkv" survives (TLD must end the token),
// "RFX-4kHDHub.com)" and "Vegamovies.NL" do not. Never touches emails.
const HOST_RE = /(?:https?:\/\/|www\.)\S+|(?<![\w@])[\w-]+\.(?:com|net|org|io|dev|ist|guru|to|nl|ac|tv|cc|ms|club|online|site|top)(?::\d+)?(?:\/[^\s|)\],]*)?(?=[\s|)\],]|$)/gi;

function maskStreamDescription(raw) {
    if (typeof raw !== 'string') {
        return raw;
    }

    if (raw === '') {
        return '';
    }

    let result = raw.replace(/\[[^[\]]*\]/g, ' ');
    result = result.replace(/(?:💾\s*)?\b\d+(\.\d+)?\s?(GB|MB|KB|TB)\b/gi, ' ');
    result = result.replace(HOST_RE, ' ');
    // Parenthetical release groups go, bare years stay: "(2026)" survives,
    // "(WOU-4 Remux HDR DV | Hindi FSL | 4KHDHub" does not. Unclosed trailing
    // groups (common in addon data) are dropped the same way, years excepted.
    result = result.replace(/\([^()]*\)/g, (group) => (/^\(\d{4}\)$/.test(group.trim()) ? group : ' '));
    result = result.replace(/\((?!\d{4}\s*$)[^()]*$/, ' ');
    result = result.replace(GROUP_TAGS_RE, ' ');
    result = result.replace(/\s+/g, ' ').trim();
    result = result.replace(/^(?:[|\-:]\s*)+/, '').replace(/(?:\s*[|\-:])+$/, '');

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
    // R0 (keep): externalUrl non-empty → not playable; no playable source
    // (url, torrent infoHash, or YouTube id) → not playable.
    if (typeof stream.externalUrl === 'string' && stream.externalUrl.length > 0) return false;
    const hasSource =
        (typeof stream.url === 'string' && stream.url.length > 0) ||
        (typeof stream.infoHash === 'string' && stream.infoHash.length > 0) ||
        (typeof stream.ytId === 'string' && stream.ytId.length > 0);
    if (!hasSource) return false;
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
