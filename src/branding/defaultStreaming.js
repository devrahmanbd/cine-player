// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Boot-time streaming-server default: every visitor silently uses the
// same-origin proxied server (/streaming/) so the real backend address never
// appears client-side and no manual setup is needed. Only overrides
// localhost selections (respects anyone deliberately on a remote server).
// Fail-silent by design: boot must never break because of this.
function proxyStreamingUrl() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return `${window.location.origin}/streaming/`;
    }
    return 'http://127.0.0.1:11470/';
}

function isLocalhostUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(String(url || ''));
}

function sanitizeProfileLocalStorage() {
    try {
        if (typeof window === 'undefined' || !window.localStorage || !window.location || !window.location.origin) {
            return;
        }
        const proxyUrl = proxyStreamingUrl();
        const raw = window.localStorage.getItem('profile');
        if (!raw) return;
        const profile = JSON.parse(raw);
        if (!profile || typeof profile !== 'object') return;
        let changed = false;

        if (!profile.settings || typeof profile.settings !== 'object') {
            profile.settings = {};
        }
        if (!profile.settings.streamingServerUrl || isLocalhostUrl(profile.settings.streamingServerUrl)) {
            profile.settings.streamingServerUrl = proxyUrl;
            changed = true;
        }

        if (Array.isArray(profile.addons)) {
            profile.addons.forEach((addon) => {
                if (addon && addon.manifest && addon.manifest.id === 'org.stremio.local') {
                    if (isLocalhostUrl(addon.transportUrl)) {
                        addon.transportUrl = `${proxyUrl}local-addon/manifest.json`;
                        changed = true;
                    }
                }
            });
        }

        if (changed) {
            window.localStorage.setItem('profile', JSON.stringify(profile));
        }
    } catch {
        // Fail silent: storage errors must not crash boot.
    }
}

async function ensureDefaultStreamingServer(core) {
    try {
        if (!core || !core.transport) return;
        const proxyUrl = proxyStreamingUrl();
        const ctx = await core.transport.getState('ctx');
        if (!ctx) return;
        const urls = Array.isArray(ctx.streamingServerUrls) ? ctx.streamingServerUrls : [];
        const known = urls.some((entry) => entry && entry.url === proxyUrl);
        if (!known) {
            try {
                await core.transport.dispatch({
                    action: 'Ctx',
                    args: { action: 'AddServerUrl', args: proxyUrl },
                });
            } catch {
                // Fall through to selection attempt below.
            }
        }
        let urlChanged = false;
        const current = ctx.profile && ctx.profile.settings && ctx.profile.settings.streamingServerUrl;
        if (current !== proxyUrl && (isLocalhostUrl(current) || !current)) {
            const settings = (ctx.profile && ctx.profile.settings) || {};
            try {
                await core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'UpdateSettings',
                        args: { ...settings, streamingServerUrl: proxyUrl },
                    },
                });
                urlChanged = true;
            } catch {
                // Fail silent.
            }
        }
        try {
            const streamingServer = await core.transport.getState('streaming_server');
            const isErr = !streamingServer || !streamingServer.settings || streamingServer.settings.type === 'Err';
            const selectedWrong = streamingServer && streamingServer.selected && streamingServer.selected.transportUrl !== proxyUrl && isLocalhostUrl(streamingServer.selected.transportUrl);
            if (urlChanged || isErr || selectedWrong) {
                await core.transport.dispatch({
                    action: 'StreamingServer',
                    args: { action: 'Reload' },
                });
            }
        } catch {
            // Fail silent.
        }
    } catch {
        // Fail silent: boot must never break because of streaming defaults.
    }
}

module.exports = {
    ensureDefaultStreamingServer,
    proxyStreamingUrl,
    isLocalhostUrl,
    sanitizeProfileLocalStorage,
};
