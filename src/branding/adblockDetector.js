// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Hardcoded adblock detector (uBlock Origin incl. Lite, AdGuard extension,
// AdGuard Home / DNS-level blockers, AdBlock Plus — EasyList-family lists).
//
// Signals:
//  1. CSS bait — off-screen divs with class names AND ids taken from
//     EasyList/AdGuard-Base GENERIC cosmetic rules (apply everywhere, no
//     per-site exceptions needed). Hidden/collapsed/removed nodes prove a
//     cosmetic filter. Re-checked at 150ms and 1500ms to catch delayed
//     procedural filters.
//  2. Network probes — triple-redundant (script onerror + image onerror +
//     fetch), all against ad domains present in BOTH extension lists and
//     DNS filters (googlesyndication, doubleclick, amazon-adsystem).
//     DNS-level blockers (AdGuard Home/Pi-hole) cause NO dom changes, so
//     this is the only vector that sees them.
//  3. Control probe — same-origin pixel. If it fails too, the verdict is
//     'offline', never 'blocked' (no false positives on dead networks).
//
// Classification: { kind: 'clean' | 'extension' | 'dns' | 'both' | 'offline' }
//   bait hidden + net ok      -> extension (cosmetic-only)
//   bait visible + net fails  -> dns (network-level, DOM untouched)
//   both fire                 -> both
// Never branch on error STRINGS (all failures surface as opaque TypeError);
// branch on the bait-vs-network matrix + a control probe instead.
//
// Neutral naming throughout (no "adblock"/"detect" in ids, classes, or
// file-level markers visible to cosmetic filters) — anti-adblock lists
// specifically hunt detector-looking selectors.
const BAIT_CLASSES = [
    'adsbox',
    'pub_300x250 pub_300x250m pub_728x90',
    'text-ad textAd text_ads advertisement',
    'ad-banner ad-container ad-slot sponsored',
    'addbanner banner-ads banner_ads afs_ads',
];

const BAIT_IDS = ['adsbox', 'pub_300x250', 'ad-banner', 'advert-banner-container', 'BannerBox'];

const BAIT_STYLE = 'position:absolute;left:-9999px;top:-9999px;';

const NET_PROBES = [
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://googleads.g.doubleclick.net/pagead/js/adsbygoogle.js',
    'https://c.amazon-adsystem.com/aax2/apstag.js',
];

let cached = null;
let cachedKind = null;
let watchTimer = null;
let watchHandler = null;

function isBaitBlocked(node) {
    if (!node || !node.parentNode) return true;
    if (!node.isConnected) return true;
    try {
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
        if (node.offsetHeight === 0 && node.clientHeight === 0) {
            const rect = node.getBoundingClientRect();
            if ((rect.width === 0 && rect.height === 0) || node.offsetParent === null) return true;
        }
    } catch {
        return false;
    }
    return false;
}

function plantBaits() {
    const nodes = [];
    const plant = (tag, attr, value, size) => {
        const node = document.createElement(tag);
        node.setAttribute(attr, value);
        node.setAttribute('style', `${BAIT_STYLE}width:${size[0]}px;height:${size[1]}px;`);
        node.setAttribute('aria-hidden', 'true');
        document.body.appendChild(node);
        nodes.push(node);
    };
    for (const cls of BAIT_CLASSES) plant('div', 'class', cls, [1, 1]);
    for (const id of BAIT_IDS) {
        const node = document.createElement('div');
        node.setAttribute('id', id);
        node.setAttribute('style', `${BAIT_STYLE}width:1px;height:1px;`);
        node.setAttribute('aria-hidden', 'true');
        document.body.appendChild(node);
        nodes.push(node);
    }
    const unit = document.createElement('div');
    unit.setAttribute('class', 'sponsored');
    unit.setAttribute('style', `${BAIT_STYLE}width:300px;height:250px;`);
    unit.setAttribute('aria-hidden', 'true');
    document.body.appendChild(unit);
    nodes.push(unit);
    return nodes;
}

function clearBaits(nodes) {
    for (const node of nodes) {
        try {
            if (node.parentNode) node.parentNode.removeChild(node);
        } catch {
            // Already removed (itself a positive, already counted).
        }
    }
}

function runCssBaits() {
    return new Promise((resolve) => {
        let nodes = [];
        try {
            nodes = plantBaits();
        } catch {
            resolve(false);
            return;
        }
        const check = (done) => {
            let detected = false;
            try {
                detected = nodes.some((node) => isBaitBlocked(node));
            } catch {
                detected = false;
            }
            if (detected || done) {
                clearBaits(nodes);
                resolve(detected);
                return;
            }
            setTimeout(() => check(true), 1350);
        };
        setTimeout(() => check(false), 150);
    });
}

function probeScript(url, timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (blocked) => {
            if (settled) return;
            settled = true;
            try {
                if (script.parentNode) script.parentNode.removeChild(script);
            } catch {
                // Ignore cleanup failures.
            }
            resolve(blocked);
        };
        const script = document.createElement('script');
        script.onload = () => done(false);
        script.onerror = () => done(true);
        setTimeout(() => done(true), timeoutMs);
        script.src = url;
        document.head.appendChild(script);
    });
}

function probeImage(url, timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (blocked) => {
            if (settled) return;
            settled = true;
            try {
                if (img.parentNode) img.parentNode.removeChild(img);
            } catch {
                // Ignore cleanup failures.
            }
            resolve(blocked);
        };
        const img = new Image();
        img.onload = () => done(false);
        img.onerror = () => done(true);
        setTimeout(() => done(true), timeoutMs);
        img.src = url;
    });
}

function probeFetch(url, timeoutMs) {
    return fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) })
        .then(() => false)
        .catch(() => true);
}

// Pure quorum aggregation (unit-tested): flat per-probe results (3 redundant
// probes per NET_PROBES entry, in job order) -> net boolean. A family counts
// as failed if any of its 3 probes fails; net=true only when >= 2 of the 3
// host families fail, so a single slow probe alone cannot flip the verdict.
function aggregateNetworkQuorum(results) {
    let familiesFailed = 0;
    for (let i = 0; i < NET_PROBES.length; i++) {
        if (results.slice(i * 3, i * 3 + 3).some(Boolean)) familiesFailed += 1;
    }
    return familiesFailed >= 2;
}

function runNetworkProbes(timeoutMs) {
    const jobs = [];
    // Probe scripts can throw at load (hostile stubs that ReferenceError on
    // execution). Swallow ONLY errors thrown by our own probe URLs while the
    // probe window is open; everything else passes through untouched.
    const suppress = (event) => {
        try {
            const file = event && event.filename ? String(event.filename) : '';
            if (file !== '' && NET_PROBES.some((url) => file === url || file.startsWith(url))) {
                event.preventDefault();
                return true;
            }
        } catch {
            // Never break error reporting.
        }
        return false;
    };
    window.addEventListener('error', suppress, true);
    const release = () => {
        try {
            window.removeEventListener('error', suppress, true);
        } catch {
            // Already gone.
        }
    };
    for (const url of NET_PROBES) {
        jobs.push(probeScript(url, timeoutMs));
        jobs.push(probeImage(url, timeoutMs));
        jobs.push(probeFetch(url, timeoutMs));
    }
    return Promise.all(jobs).then((results) => {
        release();
        return aggregateNetworkQuorum(results);
    });
}

function runControlProbe(timeoutMs) {
    return fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
    })
        .then((response) => response.ok)
        .catch(() => false);
}

// Pure classifier (unit-tested): bait/net/control booleans -> kind.
function classifyAdblock({ bait, net, control }) {
    if (!control) return 'offline';
    if (bait && net) return 'both';
    if (bait) return 'extension';
    if (net) return 'dns';
    return 'clean';
}

function publish(kind) {
    cached = kind !== 'clean' && kind !== 'offline';
    cachedKind = kind;
    try {
        document.documentElement.dataset.lxGate = kind;
        window.__LX_ADBLOCK__ = cached;
        window.__LX_ADBLOCK_KIND__ = kind;
    } catch {
        // Non-fatal.
    }
    return cached;
}

function detectAdblock({ cssTimeoutMs = 1600, netTimeoutMs = 3500 } = {}) {
    if (cached !== null) return Promise.resolve(cached);
    return Promise.all([runCssBaits(cssTimeoutMs), runNetworkProbes(netTimeoutMs), runControlProbe(netTimeoutMs)]).then(
        ([bait, net, control]) => publish(classifyAdblock({ bait, net, control }))
    );
}

function getAdblockStatus() {
    return cached;
}

function getAdblockKind() {
    return cachedKind;
}

function watchAdblock(callback, { intervalMs = 60000 } = {}) {
    if (typeof callback !== 'function') return () => undefined;
    stopWatch();
    const check = () => {
        cached = null;
        cachedKind = null;
        detectAdblock()
            .then((detected) => callback(detected))
            .catch(() => undefined);
    };
    const onHashChange = () => check();
    window.addEventListener('hashchange', onHashChange);
    watchTimer = setInterval(check, intervalMs);
    watchHandler = onHashChange;
    return () => stopWatch();
}

function stopWatch() {
    if (watchTimer !== null) {
        clearInterval(watchTimer);
        watchTimer = null;
    }
    if (watchHandler !== null) {
        window.removeEventListener('hashchange', watchHandler);
        watchHandler = null;
    }
}

module.exports = { detectAdblock, getAdblockStatus, getAdblockKind, watchAdblock, classifyAdblock, aggregateNetworkQuorum };
