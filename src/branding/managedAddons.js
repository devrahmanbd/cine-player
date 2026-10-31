// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Boot-time install for admin-managed addons.
//
// Each visitor profile converges to include the set curated via
// GET /api/addons (enabled [{ id, manifest_url, name, position }]):
// managed addons missing locally are installed (manifest fetched from
// manifest_url, with same-origin proxy fallback). Install-only: removal is
// never attempted (core-protected builtins reject it with error toasts).
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

        for (const item of fetched) {
            const existingWithSameId = list.find((addon) => {
                const id = addon && addon.manifest && addon.manifest.id;
                return typeof id === 'string' && id === item.manifest.id;
            });

            // If already installed with identical transportUrl, nothing to update.
            if (existingWithSameId && existingWithSameId.transportUrl === item.transportUrl) {
                continue;
            }

            // If installed with an outdated or unconfigured URL (and not a protected builtin),
            // replace it with the new configured transportUrl.
            if (existingWithSameId && !(existingWithSameId.flags && existingWithSameId.flags.protected)) {
                try {
                    await dispatch(core, 'UninstallAddon', existingWithSameId);
                } catch {
                    // Fail silent on uninstall.
                }
            }

            try {
                await dispatch(core, 'InstallAddon', {
                    transportUrl: item.transportUrl,
                    manifest: item.manifest,
                });
            } catch {
                // Skip install failures silently; boot must never break.
            }
        }

        // NOTE: deliberately install-only. Uninstalling anything else hits
        // core-protected builtins (Cinemeta etc.) which reject with noisy
        // "Addon is protected" error toasts, while visitor-installed addons
        // can't exist (addon UI is hidden) — so removal can only harm.
    } catch {
        // Fail silent: boot must never break because of addon sync.
    }
}

module.exports = { syncManagedAddons };
