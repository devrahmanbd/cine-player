#!/bin/sh
# Copyright (C) 2026 stremio-linux fork. GPL-2.0.
# One-shot production deploy: single VPS + Caddy + automatic HTTPS.
#
# Usage:
#   sh scripts/deploy.sh [--env-file .env] [--profile mysql] [--skip-build] [--check-only]
#
# Steps: prerequisites -> env validation -> DNS check -> build ->
# compose up -> wait api healthy -> wait HTTPS+cert -> verify chain.
# Never prints secrets. Idempotent: safe to re-run (rebuilds + rechecks).
set -e

ENV_FILE=".env"
PROFILE=""
SKIP_BUILD=0
CHECK_ONLY=0

usage() {
    echo "usage: sh scripts/deploy.sh [--env-file FILE] [--profile mysql] [--skip-build] [--check-only]"
    echo "  --env-file   env file with SITE_DOMAIN, ADMIN_PASSWORD, ... (default: .env)"
    echo "  --profile    extra compose profile (e.g. mysql)"
    echo "  --skip-build skip npm run build (reuse ./build)"
    echo "  --check-only run prerequisites + env + DNS checks only, change nothing"
}

while [ $# -gt 0 ]; do
    case "$1" in
        --env-file) ENV_FILE="$2"; shift 2 ;;
        --profile) PROFILE="--profile $2"; shift 2 ;;
        --skip-build) SKIP_BUILD=1; shift ;;
        --check-only) CHECK_ONLY=1; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "unknown flag: $1" >&2; usage >&2; exit 2 ;;
    esac
done

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml $PROFILE"

fail() { echo "deploy: ERROR: $1" >&2; exit 1; }
info() { echo "deploy: $1"; }

# --- 0. prerequisites -------------------------------------------------------
command -v docker >/dev/null 2>&1 || fail "docker not found (https://docs.docker.com/engine/install/)"
docker compose version >/dev/null 2>&1 || fail "'docker compose' plugin not found"
if [ "$SKIP_BUILD" -eq 0 ]; then
    command -v npm >/dev/null 2>&1 || fail "npm not found (needed for build; or pass --skip-build)"
fi

# --- 1. env file ------------------------------------------------------------
[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found (copy .env.prod.example and fill it in)"
# shellcheck disable=SC1090
set -a
. "./$ENV_FILE"
set +a
[ -n "$SITE_DOMAIN" ] || fail "SITE_DOMAIN is empty in $ENV_FILE"
case "$SITE_DOMAIN" in
    *[!a-zA-Z0-9.-]*|""|.*|*..*) fail "SITE_DOMAIN '$SITE_DOMAIN' is not a valid hostname" ;;
esac
case "$SITE_DOMAIN" in
    localhost|*.local|*.internal|*.test|*.lan) fail "SITE_DOMAIN '$SITE_DOMAIN' is not a public domain" ;;
esac
if [ -z "$ADMIN_PASSWORD" ]; then
    fail "ADMIN_PASSWORD is empty in $ENV_FILE"
fi
case "$ADMIN_PASSWORD" in
    changeme|CHANGE-ME*|*CHANGE-ME*|password|admin|123456*)
        fail "ADMIN_PASSWORD in $ENV_FILE is still a placeholder — set a strong one"
        ;;
esac
info "env ok ($ENV_FILE, domain $SITE_DOMAIN)"

# --- 2. DNS -----------------------------------------------------------------
VPS_IP=$(curl -s --max-time 15 https://api.ipify.org || true)
DNS_IP=""
if command -v dig >/dev/null 2>&1; then
    DNS_IP=$(dig +short "$SITE_DOMAIN" | tail -n 1)
elif command -v nslookup >/dev/null 2>&1; then
    DNS_IP=$(nslookup "$SITE_DOMAIN" 2>/dev/null | awk '/^Address: /{print $2}' | tail -n 1)
fi
if [ -n "$DNS_IP" ] && [ -n "$VPS_IP" ] && [ "$DNS_IP" != "$VPS_IP" ]; then
    fail "DNS $SITE_DOMAIN -> $DNS_IP but this host is $VPS_IP (fix the A record, then re-run)"
fi
if [ -z "$DNS_IP" ]; then
    info "warning: could not resolve $SITE_DOMAIN (continuing; Let's Encrypt needs it soon)"
else
    info "DNS ok ($SITE_DOMAIN -> $DNS_IP)"
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
    info "check-only: all green, nothing changed"
    exit 0
fi

# --- 3. build ---------------------------------------------------------------
if [ "$SKIP_BUILD" -eq 0 ]; then
    info "building web bundle..."
    npm run build
else
    [ -f build/index.html ] || fail "./build/index.html missing (run without --skip-build once)"
    info "reusing ./build"
fi

# --- 4. compose up ----------------------------------------------------------
info "starting stack..."
# shellcheck disable=SC2086
$COMPOSE up -d --build

# --- 5. api healthy (internal) ----------------------------------------------
info "waiting for api..."
i=0
until $COMPOSE exec -T web wget -qO- http://api:3001/api/health 2>/dev/null | grep -q '"ok":true'; do
    i=$((i + 1))
    if [ "$i" -ge 24 ]; then
        $COMPOSE logs --tail=30 api >&2
        fail "api unhealthy after ~120s (logs above)"
    fi
    sleep 5
done
info "api healthy"

# --- 6. public HTTPS + cert -------------------------------------------------
info "waiting for https://$SITE_DOMAIN (first boot issues a cert, ~30-120s)..."
i=0
until curl -sf --max-time 15 "https://$SITE_DOMAIN/api/health" 2>/dev/null | grep -q '"ok":true'; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        $COMPOSE logs --tail=30 caddy >&2
        fail "public chain unhealthy after ~5min (caddy logs above; check DNS + ports 80/443)"
    fi
    sleep 5
done
info "public chain healthy (cert ok, app 200, api ok)"

# --- 7. report --------------------------------------------------------------
echo "deploy: DONE — https://$SITE_DOMAIN (admin: https://$SITE_DOMAIN/#/admin)"
echo "deploy: next: add addon manifests + logo + ad codes at /#/admin (Adsterra codes are domain-bound)"
