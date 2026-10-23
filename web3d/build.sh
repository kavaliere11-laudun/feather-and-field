#!/bin/sh
# Build the 3D village into dist/: bundle the code (three.js included) and copy the page and models.
# Models come from the Blender scripts: python export_web.py web3d/models; python web_layout.py web3d/models/layout.json
set -e
cd "$(dirname "$0")"
mkdir -p dist
STAMP="$(TZ=Europe/London date '+%-d %b %H:%M')"
BUST="$(date +%s)"                 # each version asks for its own files (a phone keeping an old model with new code mixes them up)
node_modules/.bin/esbuild src/main.js --bundle --minify --format=iife --target=es2019,safari14 --outfile=dist/app.js --log-level=warning --define:__BUILD__="\"$STAMP\"" --define:__BUST__="\"$BUST\""
sed "s/src=\"app.js\"/src=\"app.js?v=$BUST\"/" index.html > dist/index.html
rm -rf dist/models && mkdir -p dist/models
cp models/plants.glb models/flock.glb models/flock.json models/coops.glb models/coops.json models/silkie_hair.jpg models/village.glb models/village.json models/layout.json models/meadow.jpg models/interiors.glb models/interiors.json models/beasts.glb models/beasts.json models/fauna.glb models/geese.glb models/geese.json dist/models/
rm -rf dist/fonts && cp -r fonts dist/fonts          # (the replay's title cards: IM Fell English, with its licence)
echo "built: $(du -sh dist | cut -f1)"
