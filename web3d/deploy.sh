#!/bin/sh
# Publish the game (run ./build.sh first): ./deploy.sh <clone of main> [<the first game's site/>]
# In the clone: the 3d/ folder becomes dist/; the usual address's page and files are made from it (site.mjs); with a
# second folder (the first game's site/, made by build_pwa.py), classic/ becomes that. Then look, commit and push by hand
# (git -C <clone> add -A && git -C <clone> commit -m "..." && git -C <clone> push).
set -e
cd "$(dirname "$0")"
M="$1"
[ -n "$M" ] && [ -d "$M" ] || { echo "usage: ./deploy.sh <clone of main> [<the first game's site/>]"; exit 1; }
[ -f dist/play.html ] || { echo "build first: ./build.sh"; exit 1; }
rm -rf "$M/3d" && mkdir -p "$M/3d" && cp -r dist/. "$M/3d/"
if [ -n "$2" ]; then
  [ -f "$2/index.html" ] && [ -f "$2/sw.js" ] || { echo "not the first game's site: $2"; exit 1; }
  rm -rf "$M/classic" && mkdir -p "$M/classic" && cp -r "$2/." "$M/classic/"
fi
rm -rf "$M/img" "$M/icons"        # (the first game's files, at the top until the switch: in classic/ since)
node site.mjs "$M"
