// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Runtime branding: fetched once at boot from /api/*, applied to
// document title, favicon and CSS variables. Fail-open with compiled defaults.
const React = require('react');
const PropTypes = require('prop-types');
const { injectSiteScripts, snapshotBody, purgeNonAppNodes, isAdminRoute } = require('./adInjector');
const { detectAdblock, watchAdblock, getAdblockKind } = require('./adblockDetector');
const { AdblockWall } = require('./AdblockWall');
const ErrorBoundary = require('../components/ErrorBoundary/ErrorBoundary');
const { resolveAdblockMode, readFirstSeen, writeFirstSeen, isActionableKind } = require('./adblockLogic');
const { syncManagedAddons } = require('./managedAddons');
const { ensureDefaultStreamingServer } = require('./defaultStreaming');
const { useCore } = require('stremio/core');

const DEFAULT_BRAND = {
    site_name: 'LinuxStream',
    tagline: 'Freedom to Stream',
    logo_url: '/brand/logo.svg',
    favicon_url: '/favicons/favicon.ico',
    theme: 'gnome-dark',
    accent: '#E95420',
};

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
    const [state, setState] = React.useState({ brand: DEFAULT_BRAND, ads: {}, ready: false });
    const [wallDismissed, setWallDismissed] = React.useState(false);
    const [adblockMode, setAdblockMode] = React.useState('none');
    useAdminAdGuard();
    const core = useCore();
    const managedSyncStarted = React.useRef(false);

    React.useEffect(() => {
        let cancelled = false;
        Promise.all([fetchJson('/api/branding', 3000), fetchJson('/api/adslots', 3000)])
            .then(([brand, slots]) => {
                if (cancelled) return;
                const nextBrand = { ...DEFAULT_BRAND, ...(brand || {}) };
                const ads = {};
                for (const slot of Array.isArray(slots) ? slots : []) {
                    if (!slot || typeof slot.slot_key !== 'string') continue;
                    ads[slot.slot_key] = {
                        enabled: slot.enabled === 1,
                        code: typeof slot.code === 'string' ? slot.code : '',
                    };
                }
                applyBrand(nextBrand);
                snapshotBody();
                injectSiteScripts(ads);
                setState({ brand: nextBrand, ads, ready: true });
                detectAdblock()
                    .then((detected) => {
                        if (cancelled || !detected) return;
                        // DNS/network-level blocks are not actionable in the
                        // browser — never wall those visitors.
                        if (!isActionableKind(getAdblockKind())) {
                            setAdblockMode('none');
                            return;
                        }
                        if (readFirstSeen() === null) writeFirstSeen(Date.now());
                        // Auth is read straight from core state (no model
                        // subscription hooks in this provider).
                        if (!core || !core.transport || !core.transport.getState) {
                            setAdblockMode('wall');
                            return;
                        }
                        core.transport
                            .getState('ctx')
                            .then((ctx) => {
                                if (cancelled) return;
                                const authed = !!(ctx && ctx.profile && ctx.profile.auth);
                                setAdblockMode(
                                    resolveAdblockMode({
                                        detected: true,
                                        authed,
                                        firstSeen: readFirstSeen(),
                                        now: Date.now(),
                                    })
                                );
                            })
                            .catch(() => {
                                if (!cancelled) setAdblockMode('wall');
                            });
                    })
                    .catch(() => false);
            })
            .catch(() => {
                if (cancelled) return;
                applyBrand(DEFAULT_BRAND);
                setState({ brand: DEFAULT_BRAND, ads: {}, ready: true });
            });
        return () => {
            cancelled = true;
        };
    }, []);

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
            if (!detected || !isActionableKind(getAdblockKind())) {
                setAdblockMode('none');
                return;
            }
            if (readFirstSeen() === null) writeFirstSeen(Date.now());
            if (!core || !core.transport || !core.transport.getState) {
                setAdblockMode('wall');
                return;
            }
            core.transport
                .getState('ctx')
                .then((ctx) => {
                    const authed = !!(ctx && ctx.profile && ctx.profile.auth);
                    setAdblockMode(
                        resolveAdblockMode({ detected: true, authed, firstSeen: readFirstSeen(), now: Date.now() })
                    );
                })
                .catch(() => setAdblockMode('wall'));
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
