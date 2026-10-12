#!/bin/sh
# Controlled local stress test — loopback only.
# Usage: sh scripts/stress.sh [--force] [base_override]
# Defaults: web http://127.0.0.1:8080, api http://127.0.0.1:3001, stream http://127.0.0.1:11470
set -eu
WEB_BASE="${WEB_BASE:-http://127.0.0.1:8080}"
API_BASE="${API_BASE:-http://127.0.0.1:3001}"
STREAM_BASE="${STREAM_BASE:-http://127.0.0.1:11470}"
MAXC=50
FORCE=0
OVERRIDE=""
for arg in "$@"; do
    case "$arg" in
        --force) FORCE=1 ;;
        *) OVERRIDE="$arg" ;;
    esac
done
if [ -n "$OVERRIDE" ]; then
    WEB_BASE="$OVERRIDE"
    API_BASE="$OVERRIDE"
    STREAM_BASE="$OVERRIDE"
fi
is_loopback() {
    case "$1" in
        *://127.0.0.1*|*://localhost*|*://\[::1\]*) return 0 ;;
        *) return 1 ;;
    esac
}
for base in "$WEB_BASE" "$API_BASE" "$STREAM_BASE"; do
    if ! is_loopback "$base"; then
        if [ "$FORCE" -eq 1 ]; then
            echo "WARN: non-loopback target allowed via --force: $base"
        else
            echo "REFUSE: non-loopback target: $base (use --force to override)" >&2
            exit 1
        fi
    fi
done
if ! command -v ab >/dev/null 2>&1; then
    echo "BLOCKED: ab not found" >&2
    exit 1
fi
run_ab() {
    label="$1"; url="$2"; n="$3"; c="$4"
    if [ "$c" -gt "$MAXC" ]; then
        echo "REFUSE: concurrency $c exceeds cap $MAXC" >&2
        exit 1
    fi
    echo "--- $label: $url (n=$n c=$c) ---"
    tmp="$(mktemp)"
    if ! ab -n "$n" -c "$c" -s 10 "$url" >"$tmp" 2>&1; then
        echo "ab exit non-zero, output tail:"
        tail -n 20 "$tmp"
    fi
    rps="$(grep 'Requests per second' "$tmp" | awk '{print $4}' || true)"
    failed="$(grep 'Failed requests' "$tmp" | awk '{print $3}' || true)"
    p50="$(grep -E '^ *50%' "$tmp" | awk '{print $2}' || true)"
    p95="$(grep -E '^ *95%' "$tmp" | awk '{print $2}' || true)"
    echo "result: label=$label rps=${rps:-?}/s p50=${p50:-?}ms p95=${p95:-?}ms failed=${failed:-?}"
    rm -f "$tmp"
}
echo "== warmup (curl --max-time 10) =="
curl -sf -o /dev/null --max-time 10 "$WEB_BASE/" && echo "warmup web /: ok" || echo "warmup web /: FAIL"
curl -sf -o /dev/null --max-time 10 "$API_BASE/api/health" && echo "warmup api health: ok" || echo "warmup api health: FAIL"
echo "== phase ab n=500 c=10 =="
run_ab "web-root" "$WEB_BASE/" 500 10
run_ab "api-health" "$API_BASE/api/health" 500 10
run_ab "api-branding" "$API_BASE/api/branding" 500 10
echo "== phase ab n=200 c=5 =="
run_ab "api-addons" "$API_BASE/api/addons" 200 5
run_ab "api-blocked" "$API_BASE/api/blocked-patterns" 200 5
echo "--- hls-fake: $STREAM_BASE/hlsv2/fakeid123/master.m3u8 (max-time 10) ---"
hls_out="$(curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 10 "$STREAM_BASE/hlsv2/fakeid123/master.m3u8" || true)"
echo "result: label=hls-fake http_time=$hls_out (expect fast 4xx/5xx, not hang)"
echo "== done =="
