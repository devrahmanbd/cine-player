#!/bin/sh
# Deploy guard: rebuild at HEAD and verify the served bundle matches it.
# Usage: npm run deploy  (assumes the static host serves ./build live)
set -e
npm run build
HEAD=$(git rev-parse HEAD)
SERVED=$(curl -s http://127.0.0.1:8080/ | grep -oE '[a-z0-9]{21,}/scripts/main.js' | head -n 1 | cut -d/ -f1)
if [ "${HEAD#"$SERVED"}" != "$HEAD" ] && [ -n "$SERVED" ]; then
    case "$HEAD" in
        "$SERVED"*) echo "deployed: $SERVED == HEAD" ;;
        *) echo "STALE: served $SERVED != HEAD $HEAD" ; exit 1 ;;
    esac
else
    echo "STALE: served $SERVED != HEAD $HEAD"
    exit 1
fi
curl -sf -o /dev/null --max-time 10 http://127.0.0.1:8080/api/health && echo "api: ok"
