// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Runtime branding: fetched once at boot from /api/*, applied to
// document title, favicon and CSS variables. Fail-open with compiled defaults.
const React = require('react');
const PropTypes = require('prop-types');
const { injectSiteScripts, snapshotBody, purgeNonAppNodes, isAdminRoute } = require('./adInjector');
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

function applyBrand(brand) {
    document.title = `${brand.site_name} - ${brand.tagline}`;
    let icon = document.querySelector('link[rel="icon"]');
    if (icon) icon.setAttribute('href', brand.favicon_url);
    document.documentElement.style.setProperty('--brand-accent', brand.accent);
    document.documentElement.dataset.brandTheme = brand.theme;
}

const BrandingProvider = ({ children }) => {
    const [state, setState] = React.useState({ brand: DEFAULT_BRAND, ads: {}, ready: false });
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

    return <BrandingContext.Provider value={state}>{children}</BrandingContext.Provider>;
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
