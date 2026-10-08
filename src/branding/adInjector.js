// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// One-shot injection of site-wide ad scripts (popunder in <head>, social bar
// before </body>). Idempotent per session via data-adslot markers; silent when
// the slot is disabled, empty, or blocked.
function scriptSrcFromCode(code) {
    const match = /<script[^>]+src=["']([^"']+)["']/i.exec(code || '');
    return match ? match[1] : null;
}

function injectOnce(slotKey, target, src) {
    if (!src || document.querySelector(`script[data-adslot="${slotKey}"]`)) return;
    const script = document.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-adslot', slotKey);
    target.appendChild(script);
}

function injectSiteScripts(ads = {}) {
    try {
        const popunder = ads.popunder;
        if (popunder && popunder.enabled) {
            injectOnce('popunder', document.head, scriptSrcFromCode(popunder.code));
        }
        const socialbar = ads.socialbar;
        if (socialbar && socialbar.enabled) {
            injectOnce('socialbar', document.body, scriptSrcFromCode(socialbar.code));
        }
    } catch {
        // Adblock or CSP: fail silent, never break the app.
    }
}

function getSmartlink(ads = {}) {
    const slot = ads.smartlink;
    if (slot && slot.enabled && /^https:\/\//.test(slot.code.trim())) return slot.code.trim();
    return null;
}

module.exports = { injectSiteScripts, getSmartlink, scriptSrcFromCode };
