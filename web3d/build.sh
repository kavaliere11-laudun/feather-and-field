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
# the game (release 1 of the new game play): the same page and code, as the game rather than the test village
sed -e "s/src=\"app.js\"/src=\"app.js?v=$BUST\"/" -e "s/<body>/<body class=\"game\">/" -e "s/<title>[^<]*<\/title>/<title>Feather \&amp; Field<\/title>/" -e "s/Loading the village…/Loading your farm…/" -e "s|<link rel=\"apple-touch-icon\" href=\"icon-180.png\">|&\n<link rel=\"manifest\" href=\"play.webmanifest\">|" index.html > dist/play.html
rm -rf dist/models && mkdir -p dist/models
cp models/plants.glb models/flock.glb models/flock.json models/coops.glb models/coops.json models/silkie_hair.jpg models/village.glb models/village.json models/layout.json models/meadow.jpg models/interiors.glb models/interiors.json models/beasts.glb models/beasts.json models/fauna.glb models/geese.glb models/geese.json models/farmer.glb models/farmer.json models/decor.glb models/decor.json models/fields.json models/showground.glb models/showground.json models/judge.glb models/judge.json dist/models/
rm -rf dist/fonts && cp -r fonts dist/fonts          # (the replay's title cards: IM Fell English, with its licence)
cp welcome.jpg dist/welcome.jpg                      # (the game's welcome picture: main.js ?poster, rendered by posterpic.mjs)
rm -rf dist/book && cp -r book dist/book             # (the Breed Book's pictures, one a breed: rendered by bookpics.mjs)
rm -rf dist/decor && cp -r decor dist/decor          # (the shop's pictures of the decorations: the 2D game's own, game2/img/decor)
cp icon-180.png icon-192.png icon-512.png play.webmanifest dist/     # (added to the Home Screen: the game opens full screen, the rooster as its icon)
echo "built: $(du -sh dist | cut -f1)"
