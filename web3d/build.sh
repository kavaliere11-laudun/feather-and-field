#!/bin/sh
# Build the 3D test farm into dist/: bundle the code (three.js included) and copy the page and models.
# Models come from the Blender scripts: python export_web.py web3d/models; python web_layout.py web3d/models/layout.json
set -e
cd "$(dirname "$0")"
mkdir -p dist
node_modules/.bin/esbuild src/main.js --bundle --minify --format=iife --target=es2019,safari14 --outfile=dist/app.js --log-level=warning
cp index.html dist/
rm -rf dist/models && mkdir -p dist/models
cp models/farm.glb models/birds.glb models/layout.json models/meadow.jpg dist/models/
echo "built: $(du -sh dist | cut -f1)"
