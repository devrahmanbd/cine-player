#!/bin/sh
# Daily availability refresh (invoked by launchd; see README-FORK.md).
# Resolves homepage/trending titles against the enabled admin addons and
# caches availability so the Board hides titles with no working streams.
# Runs against the native API database (Docker-independent).
# Log rotation (no sudo, no new deps): copytruncate-style so daemons
# holding the fd keep writing to the live file. Keeps 3 generations,
# gzips the oldest if gzip exists. Threshold: 5MB.
rotate_one() {
    f=$1
    [ -f "$f" ] || return 0
    size=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
    case $size in ''|*[!0-9]*) return 0;; esac
    [ "$size" -gt 5242880 ] || return 0
    rm -f "$f.3.gz" "$f.3"
    [ -f "$f.2" ] && mv -f "$f.2" "$f.3"
    [ -f "$f.1" ] && mv -f "$f.1" "$f.2"
    cp -p "$f" "$f.1" 2>/dev/null && :> "$f"
    if command -v gzip >/dev/null 2>&1; then
        [ -f "$f.3" ] && gzip -f "$f.3" 2>/dev/null || true
    fi
}
LOGDIR=/Users/rahman/Library/Logs
for _f in "$LOGDIR/io.linuxstream.web.out.log" "$LOGDIR/io.linuxstream.web.err.log" \
    "$LOGDIR/io.linuxstream.api.out.log" "$LOGDIR/io.linuxstream.api.err.log" \
    "$LOGDIR/io.linuxstream.server.out.log" "$LOGDIR/io.linuxstream.server.err.log" \
    "$LOGDIR/io.linuxstream.availability.log"; do
    rotate_one "$_f"
done
unset _f
DB_PATH=/Users/rahman/Documents/stremio-server/data/brand.db /opt/homebrew/bin/node /Users/rahman/Documents/stremio-linux/api/worker.js >> /Users/rahman/Library/Logs/io.linuxstream.availability.log 2>&1
