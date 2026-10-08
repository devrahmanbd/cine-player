#!/bin/sh
# Daily availability refresh (invoked by launchd; see README-FORK.md).
# Resolves homepage/trending titles against the enabled admin addons and
# caches availability so the Board hides titles with no working streams.
/usr/local/bin/docker compose -f /Users/rahman/Documents/stremio-linux/docker-compose.yml exec -T api node worker.js >> /Users/rahman/Library/Logs/io.linuxstream.availability.log 2>&1
