// Copyright (C) 2026 stremio-linux fork. GPL-2.0.
// Boot-time streaming-server default: every visitor silently uses the
// same-origin proxied server (/streaming/) so the real backend address never
// appears client-side and no manual setup is needed. Only overrides
// localhost selections (respects anyone deliberately on a remote server).
// Fail-silent by design: boot must never break because of this.
function proxyStreamingUrl() {
    return `${window.location.origin}/streaming/`;
}

function isLocalhostUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i.test(String(url || ''));
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
        const current = ctx.profile && ctx.profile.settings && ctx.profile.settings.streamingServerUrl;
        if (current !== proxyUrl && isLocalhostUrl(current)) {
            const settings = (ctx.profile && ctx.profile.settings) || {};
            try {
                await core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'UpdateSettings',
                        args: { ...settings, streamingServerUrl: proxyUrl },
                    },
                });
            } catch {
                // Fail silent.
            }
        }
    } catch {
        // Fail silent: boot must never break because of streaming defaults.
    }
}

module.exports = { ensureDefaultStreamingServer, proxyStreamingUrl, isLocalhostUrl };
