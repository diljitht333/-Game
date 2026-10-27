#!/usr/bin/env bash
# Builds the game as static offline files in ./www for Capacitor (Android).
set -e
rm -rf dist www
npx vite build
mkdir -p www
cp -r dist/client/. www/
rm -f www/_headers
node scripts/render-index.mjs
echo "✔ Android web bundle ready in ./www"
