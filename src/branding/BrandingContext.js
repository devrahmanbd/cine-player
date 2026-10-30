// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Runtime branding: fetched once at boot from /api/*, applied to
// document title, favicon and CSS variables. Fail-open with compiled defaults.
const React = require('react');
const PropTypes = require('prop-types');
const { injectSiteScripts, snapshotBody, purgeNonAppNodes, isAdminRoute } = require('./adInjector');
const { detectAdblock, watchAdblock, getAdblockKind } = require('./adblockDetector');
const { AdblockWall } = require('./AdblockWall');
const ErrorBoundary = require('../components/ErrorBoundary/ErrorBoundary');
const { resolveWallMode, readFirstSeen, writeFirstSeen, isActionableKind } = require('./adblockLogic');
const { syncManagedAddons } = require('./managedAddons');
const { ensureDefaultStreamingServer } = require('./defaultStreaming');
const { useCore } = require('stremio/core');
const { canUseCachedBrand, mergeBrand, BRAND_FIELDS } = require('./brandState');

const DEFAULT_BRAND = {
    site_name: 'LinuxStream',
    tagline: 'Freedom to Stream',
    logo_url: '/brand/logo.svg',
    favicon_url: '/favicons/favicon.ico',
    theme: 'gnome-dark',
    accent: '#E95420',
};

// Last-good brand persisted so a slow/failed boot fetch never regresses the
// visible identity to the compiled-in defaults.
const BRAND_CACHE_KEY = 'branding-cache-v1';

function readCachedBrand() {
    try {
        const raw = window.localStorage.getItem(BRAND_CACHE_KEY);
        if (!raw) return DEFAULT_BRAND;
        const parsed = JSON.parse(raw);
        if (!canUseCachedBrand(parsed)) return DEFAULT_BRAND;
        return mergeBrand(DEFAULT_BRAND, parsed);
    } catch {
        return DEFAULT_BRAND;
    }
}

function writeCachedBrand(brand) {
    try {
        window.localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(brand));
    } catch {
        // Private mode etc. — caching is best-effort.
    }
}

const BrandingContext = React.createContext({ brand: DEFAULT_BRAND, ads: {}, ready: false });

async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

const { applySiteNameToStore } = require('./brandStrings');

function applyBrand(brand) {
    document.title = `${brand.site_name} - ${brand.tagline}`;
    let icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.setAttribute('href', brand.favicon_url);
    document.documentElement.style.setProperty('--brand-accent', brand.accent);
    document.documentElement.dataset.brandTheme = brand.theme;
    // Runtime copy rebrand: every upstream "Stremio" label follows the
    // admin site_name. Fail-open — branding must never break the app.
    try {
        const i18n = require('i18next');
        if (i18n && i18n.store && i18n.store.data) {
            const rewritten = applySiteNameToStore(i18n.store.data, brand.site_name);
            if (rewritten > 0 && typeof i18n.changeLanguage === 'function') {
                i18n.changeLanguage(i18n.language).catch(() => undefined);
            }
        }
    } catch {
        // Non-fatal: labels keep upstream wording.
    }
}

const BrandingProvider = ({ children }) => {
    const [state, setState] = React.useState(() => ({
        brand: readCachedBrand(),
        ads: {},
        ready: false,
    }));
    // Snapshot the boot-time brand so the mount effect stays dependency-free.
    const bootBrand = React.useRef(state.brand);
    // Master ads switch from /api/adslots. Starts 0 (ads off) so any adblock
    // verdict firing before the boot fetch resolves cannot flash a wall while
    // the ads state is still unknown.
    const adMasterRef = React.useRef(0);
    const [wallDismissed, setWallDismissed] = React.useState(false);
    const [adblockMode, setAdblockMode] = React.useState('none');
    useAdminAdGuard();
    const core = useCore();
    const managedSyncStarted = React.useRef(false);

    // Re-fetch branding when the tab becomes visible again, so an admin save
    // shows up without a hard reload. Throttled to at most one check / 15s.
    const lastRefresh = React.useRef(0);
    React.useEffect(() => {
        const refresh = () => {
            if (document.visibilityState !== 'visible') return;
            const now = Date.now();
            if (now - lastRefresh.current < 15000) return;
            lastRefresh.current = now;
            fetchJson('/api/branding', 8000).then((brand) => {
                if (!canUseCachedBrand(brand)) return;
                const nextBrand = mergeBrand(DEFAULT_BRAND, brand);
                writeCachedBrand(nextBrand);
                applyBrand(nextBrand);
                // Functional form: only update `brand`, never clobber `ads`.
                setState((prev) => {
                    if (prev.brand.site_name === nextBrand.site_name
                        && prev.brand.tagline === nextBrand.tagline
                        && prev.brand.logo_url === nextBrand.logo_url
                        && prev.brand.favicon_url === nextBrand.favicon_url
                        && prev.brand.accent === nextBrand.accent
                        && prev.brand.theme === nextBrand.theme) {
                        return prev;
                    }
                    return { ...prev, brand: nextBrand };
                });
            });
        };
        document.addEventListener('visibilitychange', refresh);
        return () => document.removeEventListener('visibilitychange', refresh);
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        // Show the cached brand immediately; the network fetch refreshes it.
        if (bootBrand.current !== DEFAULT_BRAND) applyBrand(bootBrand.current);
        Promise.all([fetchJson('/api/branding', 8000), fetchJson('/api/adslots', 8000)])
            .then(([brand, adPayload]) => {
                if (cancelled) return;
                // A null/failed adslots payload must not skip the brand apply;
                // ads simply stay off (master defaults to 0).
                const { master = 0, slots = [] } = adPayload || {};
                // A null/failed brand payload must NOT wipe a good cached one.
                const nextBrand = canUseCachedBrand(brand) ? mergeBrand(DEFAULT_BRAND, brand) : bootBrand.current;
                const built = {};
                for (const slot of Array.isArray(slots) ? slots : []) {
                    if (!slot || typeof slot.slot_key !== 'string') continue;
                    built[slot.slot_key] = {
                        enabled: slot.enabled === 1,
                        code: typeof slot.code === 'string' ? slot.code : '',
                    };
                }
                // One kill point: master off → ads = {} so script injection,
                // every AdSlot and the smartlink CTA all go dark together.
                const ads = master === 1 ? built : {};
                adMasterRef.current = master;
                applyBrand(nextBrand);
                snapshotBody();
                injectSiteScripts(ads);
                writeCachedBrand(nextBrand);
                setState({ brand: nextBrand, ads, ready: true });
                detectAdblock()
                    .then((detected) => {
                        if (cancelled || !detected) return;
                        const adsEnabled = adMasterRef.current === 1;
                        // No ads running, or a DNS/network-level block (not
                        // fixable in-browser) — never wall those visitors.
                        if (!adsEnabled || !isActionableKind(getAdblockKind())) {
                            setAdblockMode('none');
                            return;
                        }
                        if (readFirstSeen() === null) writeFirstSeen(Date.now());
                        // Auth is read straight from core state (no model
                        // subscription hooks in this provider).
                        if (!core || !core.transport || !core.transport.getState) {
                            setAdblockMode(
                                resolveWallMode({
                                    adsEnabled,
                                    detected: true,
                                    actionable: true,
                                    transportOk: false,
                                    authed: false,
                                    firstSeen: readFirstSeen(),
                                    now: Date.now(),
                                })
                            );
                            return;
                        }
                        core.transport
                            .getState('ctx')
                            .then((ctx) => {
                                if (cancelled) return;
                                const authed = !!(ctx && ctx.profile && ctx.profile.auth);
                                setAdblockMode(
                                    resolveWallMode({
                                        adsEnabled,
                                        detected: true,
                                        actionable: true,
                                        transportOk: true,
                                        authed,
                                        firstSeen: readFirstSeen(),
                                        now: Date.now(),
                                    })
                                );
                            })
                            .catch(() => {
                                if (!cancelled) {
                                    setAdblockMode(
                                        resolveWallMode({
                                            adsEnabled,
                                            detected: true,
                                            actionable: true,
                                            transportOk: false,
                                            authed: false,
                                            firstSeen: readFirstSeen(),
                                            now: Date.now(),
                                        })
                                    );
                                }
                            });
                    })
                    .catch(() => false);
            })
            .catch(() => {
                if (cancelled) return;
                // Keep whatever brand is already showing (cached or compiled);
                // a network hiccup must never blank or revert the identity.
                setState((prev) => ({ ...prev, ready: true }));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (core && core.transport) {
            ensureDefaultStreamingServer(core);
        }
    }, [core]);

    React.useEffect(() => {
        if (!state.ready || managedSyncStarted.current) return;
        managedSyncStarted.current = true;
        let cancelled = false;
        let retryTimer = null;
        fetchJson('/api/addons', 3000).then((managed) => {
            if (cancelled || !Array.isArray(managed)) return;
            const attempt = (isRetry) => {
                if (cancelled) return;
                if (!core || !core.transport) {
                    if (!isRetry) {
                        retryTimer = setTimeout(() => attempt(true), 5000);
                    }
                    return;
                }
                syncManagedAddons(core, managed);
                ensureDefaultStreamingServer(core);
            };
            attempt(false);
        });
        return () => {
            cancelled = true;
            if (retryTimer !== null) clearTimeout(retryTimer);
        };
    }, [core, state.ready]);

    const applyAdblockVerdict = React.useCallback(
        (detected) => {
            const adsEnabled = adMasterRef.current === 1;
            if (!adsEnabled || !detected || !isActionableKind(getAdblockKind())) {
                setAdblockMode('none');
                return;
            }
            if (readFirstSeen() === null) writeFirstSeen(Date.now());
            if (!core || !core.transport || !core.transport.getState) {
                setAdblockMode(
                    resolveWallMode({
                        adsEnabled,
                        detected: true,
                        actionable: true,
                        transportOk: false,
                        authed: false,
                        firstSeen: readFirstSeen(),
                        now: Date.now(),
                    })
                );
                return;
            }
            core.transport
                .getState('ctx')
                .then((ctx) => {
                    const authed = !!(ctx && ctx.profile && ctx.profile.auth);
                    setAdblockMode(
                        resolveWallMode({
                            adsEnabled,
                            detected: true,
                            actionable: true,
                            transportOk: true,
                            authed,
                            firstSeen: readFirstSeen(),
                            now: Date.now(),
                        })
                    );
                })
                .catch(() =>
                    setAdblockMode(
                        resolveWallMode({
                            adsEnabled,
                            detected: true,
                            actionable: true,
                            transportOk: false,
                            authed: false,
                            firstSeen: readFirstSeen(),
                            now: Date.now(),
                        })
                    )
                );
        },
        [core]
    );

    // Live re-checks: wall appears if a blocker is enabled mid-session,
    // clears if it is disabled.
    React.useEffect(() => watchAdblock(applyAdblockVerdict), [applyAdblockVerdict]);

    // Re-evaluate once the signup grace expires while the notice is up.
    // (Grace only shrinks, so the single transition is notice -> wall.)
    React.useEffect(() => {
        if (adblockMode !== 'notice' || wallDismissed) return undefined;
        const firstSeen = readFirstSeen();
        const remaining = firstSeen === null ? 0 : 30 * 60 * 1000 - (Date.now() - firstSeen);
        if (!(remaining > 0)) {
            setAdblockMode('wall');
            return undefined;
        }
        const timer = setTimeout(() => setAdblockMode('wall'), remaining + 1000);
        return () => clearTimeout(timer);
    }, [adblockMode, wallDismissed]);

    return (
        <BrandingContext.Provider value={state}>
            <AdblockWall mode={wallDismissed && adblockMode === 'notice' ? 'none' : adblockMode} onDismiss={() => setWallDismissed(true)} />
            <ErrorBoundary name="brand-children">{children}</ErrorBoundary>
        </BrandingContext.Provider>
    );
};

function useAdminAdGuard() {
    React.useEffect(() => {
        const onHashChange = () => {
            if (isAdminRoute()) purgeNonAppNodes();
        };
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
}

BrandingProvider.propTypes = {
    children: PropTypes.node,
};

function useBranding() {
    return React.useContext(BrandingContext);
}

module.exports = { BrandingProvider, useBranding, DEFAULT_BRAND };
