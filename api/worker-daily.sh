#!/bin/sh
# Daily availability refresh (invoked by launchd; see README-FORK.md).
# Resolves homepage/trending titles against the enabled admin addons and
# caches availability so the Board hides titles with no working streams.
# Runs against the native API database (Docker-independent).
DB_PATH=/Users/rahman/Documents/stremio-server/data/brand.db /opt/homebrew/bin/node /Users/rahman/Documents/stremio-linux/api/worker.js >> /Users/rahman/Library/Logs/io.linuxstream.availability.log 2>&1
