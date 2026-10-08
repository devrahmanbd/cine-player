// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Hardcoded adblock detector (uBlock Origin / AdGuard / AdBlock Plus,
// EasyList-family lists). Multi-vector bait technique:
//
//  1. CSS bait — off-screen divs carrying class names that EasyList and
//     uBlock cosmetic filters hide (adsbox, pub_300x250, ad-banner, ...).
//     After a tick, hidden/collapsed/removed nodes prove a cosmetic filter.
//  2. Removal bait — some blockers strip bait nodes from the DOM entirely;
//     a missing node is also a positive.
//
// Deliberately NOT used: script/fetch probes to ad-network URLs (noisy,
// rots as filter lists update, and EasyList's anti-adblock list specifically
// targets detector-looking requests). No bait id/class below may contain
// detector-ish words ("detect", "adblock") — those get hidden by
// anti-anti-adblock rules and would false-positive.
//
// Result is cached per page load: `detectAdblock()` resolves boolean,
// sets `document.documentElement.dataset.adblock = '1' | '0'` for CSS hooks
// and stores `window.__LX_ADBLOCK__`. No UI wall here — callers decide.
const BAITS = [
    { cls: 'adsbox', style: 'width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;' },
    { cls: 'pub_300x250 pub_300x250m pub_728x90', style: 'width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;' },
    { cls: 'text-ad textAd ad-banner ad-container', style: 'width:2px;height:2px;position:absolute;left:-9999px;top:-9999px;' },
];

let cached = null;

function isBaitBlocked(node) {
    if (!node || !node.parentNode) return true;
    if (!node.isConnected) return true;
    try {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    } catch {
        return false;
    }
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && node.offsetParent === null) return true;
    return false;
}

function detectAdblock({ timeoutMs = 400 } = {}) {
    if (cached !== null) return Promise.resolve(cached);
    return new Promise((resolve) => {
        let nodes = [];
        try {
            nodes = BAITS.map((bait) => {
                const node = document.createElement('div');
                node.setAttribute('class', bait.cls);
                node.setAttribute('style', bait.style);
                node.setAttribute('aria-hidden', 'true');
                document.body.appendChild(node);
                return node;
            });
        } catch {
            resolve(false);
            return;
        }
        setTimeout(() => {
            let detected = false;
            try {
                detected = nodes.some((node) => isBaitBlocked(node));
            } catch {
                detected = false;
            }
            for (const node of nodes) {
                try {
                    if (node.parentNode) node.parentNode.removeChild(node);
                } catch {
                    // Already removed (itself a positive, already counted).
                }
            }
            cached = detected;
            try {
                document.documentElement.dataset.adblock = detected ? '1' : '0';
                window.__LX_ADBLOCK__ = detected;
            } catch {
                // Non-fatal.
            }
            resolve(detected);
        }, timeoutMs);
    });
}

function getAdblockStatus() {
    return cached;
}

module.exports = { detectAdblock, getAdblockStatus };
