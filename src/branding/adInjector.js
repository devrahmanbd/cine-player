// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// One-shot injection of site-wide ad scripts (popunder in <head>, social bar
// before </body>). Idempotent per session via data-adslot markers; silent when
// the slot is disabled, empty, or blocked.
function scriptSrcFromCode(code) {
    const match = /<script[^>]+src=["']([^"']+)["']/i.exec(code || '');
    return match ? match[1] : null;
}

// Ads must never cover the admin tool UI (ad scripts inject full-page
// transparent overlays that swallow all clicks). /admin is always ad-free.
function isAdminRoute() {
    return /^#\/admin(\/|$)/.test(window.location.hash || '');
}

let bodySnapshot = null;
function snapshotBody() {
    bodySnapshot = new Set(Array.from(document.body.children));
}

// Remove everything ad scripts appended to <body> after boot snapshot:
// their overlay anchors/iframes/divs. #app and boot children are kept.
function purgeNonAppNodes() {
    if (bodySnapshot === null) return;
    for (const node of Array.from(document.body.children)) {
        if (node.id !== 'app' && !bodySnapshot.has(node)) node.remove();
    }
}

function injectOnce(slotKey, target, make) {
    if (document.querySelector(`script[data-adslot="${slotKey}"]`)) return;
    const script = document.createElement('script');
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute('data-adslot', slotKey);
    script.async = true;
    script.onerror = () => script.remove();
    make(script);
    target.appendChild(script);
}

function injectSiteScripts(ads = {}) {
    if (isAdminRoute()) return;
    try {
        const popunder = ads.popunder;
        if (popunder && popunder.enabled && typeof popunder.code === 'string' && popunder.code) {
            const src = scriptSrcFromCode(popunder.code);
            if (src) injectOnce('popunder', document.head, (s) => s.setAttribute('src', src));
            else injectOnce('popunder', document.head, (s) => { s.text = popunder.code; });
        }
        const socialbar = ads.socialbar;
        if (socialbar && socialbar.enabled && typeof socialbar.code === 'string' && socialbar.code) {
            const src = scriptSrcFromCode(socialbar.code);
            if (src) injectOnce('socialbar', document.body, (s) => s.setAttribute('src', src));
            else injectOnce('socialbar', document.body, (s) => { s.text = socialbar.code; });
        }
    } catch {
        // Adblock or CSP: fail silent, never break the app.
    }
}

function getSmartlink(ads = {}) {
    const slot = ads.smartlink;
    const raw = String((slot && slot.code) || '').trim();
    if (slot && slot.enabled && /^https:\/\//.test(raw)) return raw;
    return null;
}

module.exports = { injectSiteScripts, getSmartlink, scriptSrcFromCode, isAdminRoute, snapshotBody, purgeNonAppNodes };
