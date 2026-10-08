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

module.exports = { maskStreamName };
