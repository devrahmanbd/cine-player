#!/usr/bin/env bash
# LinuxStream player — shared-host deploy (cPanel jailshell / container friendly).
# Node via nvm, pm2 for processes, system ffmpeg. No root, no Docker, no cron.
# Run from any dir:  bash deploy-shared-host.sh
set -euo pipefail

APP_BASE="$HOME/apps"
PLAYER_DIR="$APP_BASE/stremio-linux"
SERVER_DIR="$APP_BASE/stremio-server"
DATA_DIR="$APP_BASE/data"
ECO="$APP_BASE/player-ecosystem.config.js"
SITE_NAME="${SITE_NAME:-ExtraMovies}"

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo "== [1/6] toolchain =="
node -v; npm -v; pm2 -v >/dev/null && echo "pm2 ok"
command -v ffmpeg >/dev/null && echo "ffmpeg $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')" || echo "WARN: no system ffmpeg (engine will try bundled fallback)"

echo "== [2/6] code =="
mkdir -p "$APP_BASE" "$DATA_DIR/uploads"
git -C "$PLAYER_DIR" pull -q --ff-only
git -C "$SERVER_DIR" pull -q --ff-only
echo "player=$(git -C "$PLAYER_DIR" rev-parse --short HEAD) server=$(git -C "$SERVER_DIR" rev-parse --short HEAD)"

echo "== [3/6] build web bundle =="
if [ "${SKIP_WEB_BUILD:-0}" = 1 ]; then
    test -f "$PLAYER_DIR/build/index.html" && echo "SKIP_WEB_BUILD=1 — using uploaded bundle $(du -sh "$PLAYER_DIR/build" | cut -f1)" || { echo "SKIP_WEB_BUILD set but no build/ present"; exit 1; }
else
    cd "$PLAYER_DIR"
    corepack enable 2>/dev/null || true
    pnpm install --frozen-lockfile --silent
    # Shared containers often OOM webpack's 31 default terser workers (32 cores reported).
    NODE_OPTIONS="--max-old-space-size=1024" pnpm run build >/dev/null \
      || { test -f build/index.html && echo "WARN: in-container build failed — keeping previous bundle" || { echo "BUILD_FAIL and no previous bundle"; exit 1; }; }
    test -f "$PLAYER_DIR/build/index.html" && echo "BUILD_OK $(du -sh "$PLAYER_DIR/build" | cut -f1)"
fi

echo "== [4/6] api deps =="
cd "$PLAYER_DIR/api"
npm install --omit=dev --no-audit --no-fund --silent

echo "== [5/6] pm2 ecosystem =="
if [ ! -f "$ECO" ]; then
    umask 077
    ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/' | head -c 28)"
    cat > "$ECO" <<EOF
module.exports = {
    apps: [
        {
            name: 'player-api',
            script: 'server.js',
            cwd: '$PLAYER_DIR/api',
            env: {
                PORT: 3001,
                BIND_HOST: '127.0.0.1',
                DB_DRIVER: 'sqlite',
                DB_PATH: '$DATA_DIR/brand.db',
                UPLOADS_DIR: '$DATA_DIR/uploads',
                ADMIN_USER: 'admin',
                ADMIN_PASSWORD: '$ADMIN_PASSWORD',
                SITE_NAME: '$SITE_NAME'
            }
        },
        {
            name: 'player-engine',
            script: 'server.js',
            cwd: '$SERVER_DIR',
            env: { NO_HTTPS_SERVER: '1', NO_CORS: '1' }
        },
        {
            name: 'player-web',
            script: 'native-web.js',
            cwd: '$SERVER_DIR',
            env: { BUILD_DIR: '$PLAYER_DIR/build' }
        },
        {
            name: 'player-worker',
            script: 'worker.js',
            cwd: '$PLAYER_DIR/api',
            autorestart: false,
            cron_restart: '17 4 * * *',
            env: { DB_DRIVER: 'sqlite', DB_PATH: '$DATA_DIR/brand.db', UPLOADS_DIR: '$DATA_DIR/uploads' }
        }
    ]
};
EOF
    echo "ecosystem created (admin creds inside $ECO — never commit/share this file)"
else
    echo "ecosystem exists — keeping existing credentials"
fi

echo "== [6/6] restart + health =="
pm2 start "$ECO" --update-env 2>/dev/null || true
pm2 save --force >/dev/null 2>&1 || true
sleep 3
ok=0
for i in $(seq 1 10); do
    if curl -fsS -m 3 http://127.0.0.1:8080/ >/dev/null 2>&1 \
       && curl -fsS -m 3 http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
        ok=1; break
    fi
    sleep 2
done
[ "$ok" = 1 ] || { echo "HEALTH_FAIL"; pm2 logs --lines 15 --nostream; exit 1; }
curl -fsS -m 3 http://127.0.0.1:3001/api/health; echo
curl -s -m 5 -o /dev/null -w 'engine fake-stream http=%{http_code}\n' http://127.0.0.1:11470/hlsv2/fakeid/master.m3u8 || true

# watchdog: no cron on this host — a nohup loop revives pm2 if the daemon dies
WD="$APP_BASE/watchdog.sh"
if ! pgrep -f "bash $WD" >/dev/null 2>&1; then
    cat > "$WD" <<'EOF'
#!/usr/bin/env bash
# Revives pm2 (and thus all player processes) and the Cloudflare tunnel if they die. No cron needed.
while true; do
    export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" 2>/dev/null
    pm2 ping >/dev/null 2>&1 || { pm2 resurrect >/dev/null 2>&1; }
    pgrep -x cloudflared >/dev/null 2>&1 || { nohup "$HOME/apps/bin/cloudflared" tunnel --url http://127.0.0.1:8080 > "$HOME/apps/cf-tunnel.log" 2>&1 & }
    sleep 280
done
EOF
    nohup bash "$WD" >/dev/null 2>&1 &
    disown || true
    echo "watchdog started (pid $!)"
fi

echo "DEPLOY_OK  web=:8080 api=:3001 engine=:11470 (loopback)  https://$(curl -s -m 3 ifconfig.me || echo '<ip>:8080')"
