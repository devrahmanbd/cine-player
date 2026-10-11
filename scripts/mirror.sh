#!/bin/sh
# Copyright (C) 2026 stremio-linux fork. GPL-2.0.
# Mirror this stack for a new brand/domain in one command.
# Generates .env.<domain> from .env.prod.example, prints next steps (does not boot anything).
#
# Usage:
#   sh scripts/mirror.sh <domain>
#   sh scripts/mirror.sh --help
set -eu

PROG='mirror.sh'
PLACEHOLDER='CHANGE-ME-generate-a-strong-password-with-openssl-rand-base64-24'

usage() {
    cat <<USAGE
Usage: $PROG <domain>

Generate .env.<domain> from .env.prod.example for a new mirror domain
and print the exact next steps (DNS, build, compose up, Adsterra, /admin).

  <domain>   lowercase FQDN, e.g. example.com (refuses empty/localhost)

Options:
  -h, --help   show this help and exit

Generated file: .env.<domain> (repo root, mode 600) with SITE_DOMAIN set
and ADMIN_PASSWORD left as a placeholder you MUST fill:
  openssl rand -base64 24
Re-running $PROG fails loudly while the placeholder is still present.

Next steps are printed, never executed. Brand strings stay as-is
(src/index.html + manifest.json: LinuxStream; api/seed.js DEFAULT_CODES
are domain-bound) until you re-paste codes + logo in /#/admin.
USAGE
}

die() {
    printf '%s: error: %s\n' "$PROG" "$1" >&2
    exit "${2:-1}"
}

need_help=0
domain=''

case "${1:-}" in
    '' ) usage >&2; die "missing <domain> argument" 2 ;;
    -h|--help ) usage; exit 0 ;;
    -* ) usage >&2; die "unknown option: $1" 2 ;;
    * ) domain="$1" ;;
esac

if [ $# -gt 1 ]; then
    usage >&2
    die "too many arguments (expected exactly one <domain>)" 2
fi

# Refuse empty (already handled) and localhost variants.
case "$domain" in
    localhost|localhost.*|*.localhost|*.localhost.*)
        die "refusing reserved host: $domain (need a public FQDN)" 2
        ;;
esac

# Must be lowercase (explicit class: [A-Z] range is locale-dependent).
if printf '%s' "$domain" | LC_ALL=C grep -q '[ABCDEFGHIJKLMNOPQRSTUVWXYZ]'; then
    die "invalid domain '$domain': must be lowercase" 2
fi

# Lowercase hostname/FQDN: labels of alnum+hyphen, at least one dot.
if ! printf '%s' "$domain" | LC_ALL=C grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'; then
    die "invalid domain '$domain': want lowercase FQDN like example.com" 2
fi

if [ "${#domain}" -gt 253 ]; then
    die "invalid domain '$domain': longer than 253 chars" 2
fi

# Each DNS label must be 1-63 chars (POSIX loop, no bashisms).
old_ifs="$IFS"
IFS='.'
set -f
for label in $domain; do
    if [ "${#label}" -gt 63 ]; then
        IFS="$old_ifs"
        set +f
        die "invalid domain '$domain': label '$label' longer than 63 chars" 2
    fi
done
set +f
IFS="$old_ifs"

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TEMPLATE="$ROOT/.env.prod.example"
TARGET="$ROOT/.env.$domain"

if [ ! -f "$TEMPLATE" ]; then
    die "template not found: $TEMPLATE" 1
fi

if [ -f "$TARGET" ]; then
    if grep -q "$PLACEHOLDER" "$TARGET" 2>/dev/null; then
        die "ADMIN_PASSWORD still placeholder in $TARGET — fill it first (openssl rand -base64 24), then re-run" 1
    fi
    printf '%s: exists (configured): %s\n' "$PROG" "$TARGET"
else
    tmp="$TARGET.tmp.$$"
    trap 'rm -f "$tmp"' EXIT INT TERM HUP
    sed -e "s/^SITE_DOMAIN=.*/SITE_DOMAIN=$domain/" \
        -e "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$PLACEHOLDER/" \
        "$TEMPLATE" > "$tmp"
    mv "$tmp" "$TARGET"
    trap - EXIT INT TERM HUP
    chmod 600 "$TARGET"
    printf '%s: wrote %s (mode 600)\n' "$PROG" "$TARGET"
    printf '%s: ACTION REQUIRED: set ADMIN_PASSWORD in %s with: openssl rand -base64 24\n' "$PROG" "$TARGET"
fi

cat <<NEXT

Mirror next steps for $domain (copy/paste; nothing was executed):

  1. DNS A record (registrar panel):
       $domain -> <VPS public IPv4>   (second A for www if needed)

  2. Fill the admin password (script refuses to proceed while placeholder remains):
       openssl rand -base64 24
       # paste into: .env.$domain  (ADMIN_PASSWORD=...)

  3. Build the static bundle:
       npm run build

  4. Boot with this mirror's env file:
       docker compose --env-file .env.$domain -f docker-compose.yml -f docker-compose.prod.yml up -d --build
       docker compose --env-file .env.$domain -f docker-compose.yml -f docker-compose.prod.yml ps
       docker compose --env-file .env.$domain -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy

  5. Adsterra re-approval (codes are domain-bound, see api/seed.js DEFAULT_CODES):
       get $domain approved in the Adsterra dashboard; old codes render blank.

  6. Re-add addons + logo/brand via admin (nothing is copied automatically):
       https://$domain/#/admin
       - paste the $domain-approved Adsterra codes
       - re-add each addon manifest URL, re-upload logo
       - (code defaults stay LinuxStream in src/index.html + manifest.json
         until replaced via /admin or a rebrand + rebuild)

  7. Verify (see README-PROD.md section 3 + scripts/deploy-check.sh):
       curl -sSI https://$domain | head -20
       curl -sS https://$domain/api/health   # expect {"ok":true}
       npm run deploy
NEXT
