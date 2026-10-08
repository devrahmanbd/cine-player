// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Boot-time exact-set enforcement for admin-managed addons.
//
// Each visitor profile must converge to exactly the set curated via
// GET /api/addons (enabled [{ id, manifest_url, name, position }]):
// managed addons missing locally are installed (manifest fetched from
// manifest_url), installed addons outside the managed set are removed.
// Fail-silent by design: boot must never break because of addon sync.

async function fetchManifest(url, timeoutMs) {
    const direct = await fetchJsonManifest(url, timeoutMs);
    if (direct !== null) return direct;
    // Addon hosts sometimes bot-wall browsers (403) while serving
    // server-side fetches fine — fall back to our allowlisted proxy.
    try {
        const proxied = await fetch(
            `/api/addons/manifest?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(timeoutMs) }
        );
        if (!proxied.ok) return null;
        const manifest = await proxied.json();
        if (!manifest || typeof manifest.id !== 'string') return null;
        return manifest;
    } catch {
        return null;
    }
}

async function fetchJsonManifest(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const manifest = await response.json();
        if (!manifest || typeof manifest.id !== 'string') return null;
        return manifest;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function readInstalledAddons(core) {
    try {
        const ctx = await core.transport.getState('ctx');
        const addons = ctx && ctx.profile && ctx.profile.addons;
        if (Array.isArray(addons)) return addons;
    } catch {
        // Fall through to the installed_addons model below.
    }
    try {
        const installed = await core.transport.getState('installed_addons');
        if (installed && Array.isArray(installed.catalog)) return installed.catalog;
    } catch {
        // No readable addon state; treat as empty so boot continues.
    }
    return [];
}

function dispatch(core, action, addon) {
    return core.transport.dispatch({
        action: 'Ctx',
        args: {
            action: action,
            args: addon,
        }
    });
}

async function syncManagedAddons(core, managed) {
    try {
        if (!core || !core.transport || !Array.isArray(managed)) return;
        // Empty list means "not configured yet" — never wipe a visitor's
        // addons on a fresh deploy. Enforcement starts at >= 1 entry.
        if (managed.length === 0) return;
        const installed = await readInstalledAddons(core);
        const list = Array.isArray(installed) ? installed : [];

        const managedUrls = new Set();
        for (const entry of managed) {
            if (entry && typeof entry.manifest_url === 'string' && entry.manifest_url.length > 0) {
                managedUrls.add(entry.manifest_url);
            }
        }

        const fetched = [];
        for (const url of managedUrls) {
            const manifest = await fetchManifest(url, 5000);
            if (manifest !== null) fetched.push({ transportUrl: url, manifest: manifest });
        }
        const managedIds = new Set(fetched.map((item) => item.manifest.id));

        const isManaged = (addon) => {
            if (!addon || typeof addon.transportUrl !== 'string') return false;
            if (managedUrls.has(addon.transportUrl)) return true;
            const id = addon.manifest && addon.manifest.id;
            return typeof id === 'string' && managedIds.has(id);
        };
        const isInstalled = (transportUrl, manifestId) => {
            return list.some((addon) => {
                if (!addon) return false;
                if (addon.transportUrl === transportUrl) return true;
                const id = addon.manifest && addon.manifest.id;
                return typeof id === 'string' && id === manifestId;
            });
        };

        for (const item of fetched) {
            if (isInstalled(item.transportUrl, item.manifest.id)) continue;
            try {
                await dispatch(core, 'InstallAddon', {
                    transportUrl: item.transportUrl,
                    manifest: item.manifest,
                });
            } catch {
                // Skip install failures silently; boot must never break.
            }
        }

        for (const addon of list) {
            if (isManaged(addon)) continue;
            try {
                await dispatch(core, 'UninstallAddon', addon);
            } catch {
                // Skip uninstall failures silently; boot must never break.
            }
        }
    } catch {
        // Fail silent: boot must never break because of addon sync.
    }
}

module.exports = { syncManagedAddons };
