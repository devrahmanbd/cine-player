# Shared-Host Deployment (cPanel jailshell / container)

Player stack on shared hosting with **only Node + ffmpeg** — no root, no Docker, no cron.
Live since 2026-10-28 on `cinemavi1@65.181.116.46` (AlexHost container, Ubuntu 24.04).

## Architecture

```
public HTTPS          loopback (127.0.0.1)
Cloudflare tunnel ──▶ native-web :8080 ──▶ api    :3001   (SQLite, rate limits, OTP auth)
 (cloudflared,          (static SPA        └▶ engine :11470  (transmux, system ffmpeg)
  outbound-only)          + proxy)
```

Everything binds loopback except native-web; the only ingress is the outbound
Cloudflare tunnel — the container exposes **no public ports** (8080 firewalled).

## Layout (server)

```
~/apps/stremio-linux/     player repo (development branch) + build/ SPA bundle
~/apps/stremio-server/    engine repo (development branch): server.js + native-web.js
~/apps/data/brand.db      SQLite DB + uploads/
~/apps/player-ecosystem.config.js   PM2 apps — CONTAINS ADMIN PASSWORD, never commit
~/apps/watchdog.sh        no-cron watchdog: revives pm2 + tunnel every ~5min
~/apps/cf-tunnel.log      cloudflared log (tunnel URL is in here)
```

## PM2 apps

| name | script | port | notes |
|---|---|---|---|
| player-api | api/server.js | 3001 lo | `DB_PATH`, `UPLOADS_DIR`, `SITE_NAME`, admin creds from eco file |
| player-engine | cine-server/server.js | 11470 lo | `NO_HTTPS_SERVER=1` (no :12470), system ffmpeg 6.1.1 |
| player-web | native-web.js | 8080 | `BUILD_DIR` env; SPA fallback to index.html |
| player-worker | api/worker.js | — | one-shot; `cron_restart` 04:17 daily via pm2 (no system cron) |

## Deploy (idempotent)

```bash
ssh -p 22 cinemavi1@65.181.116.46
bash ~/deploy-shared-host.sh                    # full: pull + build + restart
SKIP_WEB_BUILD=1 bash ~/deploy-shared-host.sh   # skip webpack (see OOM note)
```

Update flow from a dev machine:

```bash
# 1. push repos,  2. upload prebuilt SPA (container OOMs webpack):
cd stremio-linux && npm run build
tar czf - -C build . | ssh -p 22 cinemavi1@65.181.116.46 'tar xzf - -C ~/apps/stremio-linux/build'
# 3. redeploy
ssh -p 22 cinemavi1@65.181.116.46 'SKIP_WEB_BUILD=1 bash ~/deploy-shared-host.sh'
```

### OOM note (why build/upload instead of building on-server)

The container reports **32 CPUs**; webpack's Terser spawns ~31 workers → OOM
kill (exit 137) at ~37%. Build the SPA on a dev machine or CI and upload, or
cap with `NODE_OPTIONS=--max-old-space-size=1024` (slower, may still OOM).

### SSH gotcha

`pkill -f <pattern>` matches the *calling shell's own argv* — any command text
containing the pattern kills itself (exit 255). Use exact names (`pkill -x
cloudflared`) or bracket regex (`pgrep -f 'watch[d]og'`) and keep the pattern
out of every other argument of the same command.

## Tunnel & domain

- Quick tunnel (current): URL changes on every restart; check
  `grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' ~/apps/cf-tunnel.log`
- Watchdog restarts it automatically if it dies.
- **Custom domain**: create a named tunnel (`cloudflared tunnel create linuxstream`,
  route DNS CNAME `watch.extramovies.org` → `<uuid>.cfargotunnel.com` at
  cloudman.one), then point the watchdog/deploy at the named tunnel so the URL
  stays fixed. Alternative: panel Apache vhost reverse-proxy to 127.0.0.1:8080.

## Recovery after container restart

Everything dies with the container. One command revives it all:

```bash
bash ~/deploy-shared-host.sh   # pm2 resurrects from save; watchdog+ tunnel restart
```

(Or SSH-login once — nothing auto-starts without panel cron; add a panel cron
entry `*/5 * * * * bash ~/deploy-shared-host.sh`-style revive if the panel has cron.)
