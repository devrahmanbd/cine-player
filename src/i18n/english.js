// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// English-only UI strings, frozen from the upstream translations bundle.
// Same shape as the removed 'stremio-translations' package (() => { lng: map })
// so every t() call site keeps working with zero changes. No other language
// is shipped; the UI language picker was removed and the app forces 'en-US'.
const enUS = require('./en.json');

function englishTranslations() {
    return {
        'en-US': enUS,
    };
}

module.exports = englishTranslations;
module.exports.default = englishTranslations;
