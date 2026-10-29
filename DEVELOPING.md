# Feather & Field — source and build pipeline

This `source` branch holds everything needed to change and rebuild the game. The `main` branch is the published web app only (GitHub Pages serves `main`); never commit source files to `main`.

- Live web app: https://kavaliere11-laudun.github.io/feather-and-field/ (Audrey plays it as a home-screen app on iPhone). Since 26 Oct 2026 the usual address is the 3D game (`web3d/`, see below); this 2D game is at `classic/`.
- Same game as a private Claude artifact: https://claude.ai/artifact/3s8uFYaDFst6BirdTjFwDo (uses a per-user database for cloud saves)
- Owner: Audrey (kavaliere11@gmail.com). Commits are made as `Audrey <kavaliere11@gmail.com>` with the Claude attribution lines.

## Setting up a new workspace

All scripts were written in one workspace and use this absolute folder:
`/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad`.
The quickest way to make them work unchanged is a symlink:

```bash
git clone --branch source --single-branch https://github.com/kavaliere11-laudun/feather-and-field ff-src
mkdir -p /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff
ln -s "$PWD/ff-src" /tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad
cd ff-src && mkdir -p logs
# Blender as a Python module (Blender 5.2.2, Python 3.13), only needed to re-render 3D:
uv venv bl --python 3.13 && uv pip install --python bl bpy
# the 2x map image is too big for git; rebuild it from its 12 strips:
python3 stitch_map.py r/map7 2x
```

(Better long-term: replace the hard-coded folder with the script's own folder. `build_pwa.py` already does this.)

Python needs Pillow and numpy. Playwright with Chromium is used for tests (`/opt/npm-tools/node_modules/` in the original workspace; adjust the `createRequire` path if needed).

## Files

- `ff.html`: the whole game (HTML, CSS, JS, English and French text in `I18N`). This is the file to edit.
- `game2/data.json`: sprite atlas data, made by `pack.py`. `game2/img/`: packed images (birds, map tiles, overlays, trees, props).
- `testhooks.js`: `window.__ffDebug` test API, added only to test builds.
- Blender scripts:
  - `hen2.py`: v2 adult birds for Rhode Island Red, Orpington, Legbar and Brahma.
  - `silkie_v2.py`: Silkies in 11 colours.
  - `chick_v2.py`: chicks.
  - `render_parts.py`: the farm map, rendered in strips from `r/map7/scene.blend`.
  - Overlays and props: `coops3.py`, `bridges3.py`, and others.
  - Bird poses: stand, walk0..7, peck, look, scratch, crow, turn1..3 (yaw −22.67/−45.33/−68), face1..3 (head turned to camera for close-ups), card.
- The farmer and things to buy:
  - `stylized/character/farmer.py` and `farmer_sprites.py` (in the workspace they sit in `sty/`): the farmer and every frame the game uses. `OUTFIT=market|garden|winter|rodeo|show` dresses the farmer in a bought outfit; `run_outfits.sh` renders every frame in every outfit, plus the portraits (about 50 minutes).
  - `farmer_pack.py`: packs them into `game2/img/atlas/farmer_<look>[_<outfit>].webp` and makes `game2/img/farmer/card_*.webp`.
  - `decor_sprites.py` (run with `STYLE=fv`, like the map): the eight decorations, seen from the map camera. The windmill's sails are a separate face-on picture.
  - `decor_pack.py`: packs them into `game2/img/atlas/decor.webp` (key `decor` in `data.json`) and makes the shop pictures `game2/img/decor/<id>.webp`.
  - Where each decoration stands on the farm, and the prices, are in `ff.html` (`DECOR`, `OUTFITS`).
  - Deluxe coops: `deluxe.py` (picket fence, rose arch, flowers, path, bunting, weathervane, sized from each coop's bounding box), rendered by `overlay.py` as kinds `<breed>_dx` and `fence_dx`. `run_dx.sh` renders all twelve pictures and converts them into `game2/img/ov/`.
- `nav_pack.py`: the farmer's walking grid (16-pixel cells: path or water), made from the map picture and stored in `data.json` as `nav`. The game adds pens, coops, the farmhouse, decorations and tree trunks itself, and finds routes with A* (`navRoute` in `ff.html`). Re-run it if the map is re-rendered.
- Resumable render scripts (they skip pictures already on disk): `render_turns.sh`, `render_chicks2.sh`, `render_faces.sh`, `render_map2x.sh`, `resume_v2.sh`.
- `r/`: render outputs that `pack.py` reads:
  - `spr2/`: v2 adult frames;
  - `chick2/`: chicks;
  - `spr/`: older cards;
  - `ov4/`: coop overlays;
  - `props4/`: props;
  - `map7/`: map strips plus `scene.blend`;
  - `icon/`: app icons;
  - `bridges7.json`.
- `audio/`: CC0 candidates for replacing the synthesised music and sounds. Previews sent to Audrey: `music-choices.mp3`, `sound-choices.mp3`. Music is from the SoundSafari CC0-1.0-Music corpus (FreePD, HoliznaCC0, TRG Banks); sounds are from lavenderdotpet/CC0-Public-Domain-Sounds. Waiting for her picks.

## Build and test

```bash
TEST=1 python3 build2.py        # game2/index.html with test hooks
bash srv.sh                     # serves game2 on :8766 and site on :8770
URL=http://localhost:8766/ node qa_ui.mjs r/qa          # screen-by-screen walkthrough (LANG=fr for French)
./qa_run.sh 30 1440             # simulated player: 30 game days, one visit a day; prints a progression table
```

Feature checks (each prints OK/BAD lines and page errors): `qa_pers.mjs` (personalities), `qa_farmer.mjs`, `qa_cuddle.mjs`, `qa_trust.mjs`, `qa_shop.mjs` (decorations and outfits), `qa_nav.mjs` (the farmer never walks through a pen), `qa_move_dx.mjs` (moving decorations, Deluxe coops).
Other walkthroughs: `qa_ux.mjs`, `qa_sale*.mjs`, `qa_move.mjs`, `qa_rename.mjs`, `qa_build.mjs`, `qa_filter.mjs`, `shot_live.mjs`. Test at 402×874, deviceScaleFactor 2, touch, in both `en-GB` and `fr-FR`.

Repacking images after renders:

```bash
MAPDIR=r/map7 OVDIR=r/ov4 PROPDIR=r/props4 BRIDGES=r/bridges7.json python3 pack.py   # full (slow, run in background)
BIRDS_ONLY=1 python3 pack.py                                                        # birds only
```

## Release

```bash
python3 build2.py               # release build (no test hooks)
python3 build_pwa.py            # writes site/ with service worker (hashed asset keys, caches named ffc-...)
# the 2D game is published in classic/ of main (the 3D game is at the top): with the 3D build in web3d/dist,
web3d/deploy.sh <clone of main> site     # replaces 3d/ and classic/, writes the top
# then in the clone: git add -A && git commit -m "…" && git push
```

Then publish `game2/index.html` to the artifact URL above with the Artifact tool. Read the artifact first in a new conversation. Images are already uploaded as artifact files; publish with `root=game2` and a `files` list only when images change.

Commit and push `source` after every change too, so the next session starts from the latest code.

## The 3D village (`web3d/`, started 20 Oct 2026)

The browser 3D version of the farm, being built in steps (see `web3d/README.md`, the full record, and the project doc
`claude/web3d.md`). Live test page: https://kavaliere11-laudun.github.io/feather-and-field/3d/

```bash
cd web3d
npm install three@0.170.0 esbuild@0.24.0      # once
./build.sh                                      # bundles src/ and copies models/ into dist/
./withserver.sh node foxtest.mjs                # serves dist/ on :8770 for the length of one test
```

If `npm install` can't reach the npm registry (a session whose network settings allow only GitHub), the same two
versions can be had from GitHub, and the build comes out identical:

```bash
# three.js 0.170.0 = the r170 tag (only the folders the build needs)
git clone --depth 1 --branch r170 --filter=blob:none --sparse https://github.com/mrdoob/three.js ../vendor/three-r170
(cd ../vendor/three-r170 && git sparse-checkout set --no-cone /package.json /build/ /src/ /examples/jsm/)
# esbuild 0.24.0 built from source with Go (its one library from GitHub's mirror of golang.org/x/sys)
git clone --depth 1 --branch v0.24.0 https://github.com/evanw/esbuild ../vendor/esbuild-0.24.0
git init -q ../vendor/sys && (cd ../vendor/sys && git remote add origin https://github.com/golang/sys && git fetch -q --filter=blob:none origin master && git checkout -q c0bba94af5f8)
(cd ../vendor/esbuild-0.24.0 && go mod edit -replace golang.org/x/sys=../sys && GOFLAGS=-mod=mod GOPROXY=off GOSUMDB=off go build -o esbuild ./cmd/esbuild)
mkdir -p node_modules/.bin && ln -sfn "$PWD/../vendor/three-r170" node_modules/three && ln -sfn "$PWD/../vendor/esbuild-0.24.0/esbuild" node_modules/.bin/esbuild
```

(A newer esbuild won't do: 0.25 and later refuse the build's `safari14` target for destructuring.)

- `web3d/src/main.js` (village, coops, birds' behaviour, day and night, inside view, doors, foxes' placement, the night
  visit's wiring), `birds.js` (bird painting, fur shells, rig, poses), `beasts.js` (foxes: fur, four-legged rig, play tasks,
  family schedule), `nightvisit.js` (the fox's night visit: the village grid and ways round, Rusty at the coop, the
  feathers, the farmer's torch).
- Models in `web3d/models/` come from the Blender scripts in `stylized/` (in the original workspace this folder was the
  scratchpad's `sty/`): `export_village.py`, `export_coops.py`, `export_birds.py`, `export_interiors.py`, `export_beasts.py`,
  `export_web.py`. Run them with the `bl` venv (`bl/bin/python stylized/export_beasts.py web3d/models`).
- Test page options: `?time=HH:MM`, `?daylapse=N` (a day in N minutes), `?coops=N`, `?q=0..3`, `?details`, `?lineup`,
  `?lineup=foxes`, `?foxes`, `?visit` (the fox's night visit now, at 23:30), `?visit=N` (to coop N), `?lang=fr`,
  `?poster` (the welcome picture's stage, `posterpic.mjs`), `?intro=1..4` (the onboarding pictures' stages, `intropics.mjs`).
- Tests are the `.mjs` files in `web3d/` (Playwright + headless Chromium, 402x874 phone size). `foxtest.mjs`, `visittest.mjs`,
  `doors.mjs`, `insideshot.mjs`, `interact.mjs`, `nesttap.mjs` and `bedtrace.mjs` are the main checks.
- The new game is `play.html` (built from `index.html` with `body.game`): `src/game.js` (its rules and the save, every
  field checked on load), `src/gameui.js` (its top bar, cards and welcome). It is played sideways first and checked both
  ways: `gametest.mjs` and `eggtest.mjs` take `LANG=fr` and `W=874 H=402` (sideways).
- Deploy: `./build.sh`, then `./deploy.sh <clone of main>` (it replaces `3d/` with `dist/` and writes the usual address's
  page from it, `site.mjs`; give the 2D game's `site/` as a second folder to replace `classic/` too), commit and push.
  Since the switch (release 1 step 12, 26 Oct 2026) the usual address is the 3D game and the 2D game is in `classic/`
  (see `web3d/README.md`, "the switch"; `switchtest.mjs` checks a phone that had the 2D game).
- `stylized/extras/`: small helper scripts kept for reference (farmer map sprites, the Silkie hair tile, face sheets).

## My account (release 7: the farm saved online, Firebase)

Optional, in Settings: sign in with Google and the farm is kept online too (Audrey, 29 Oct 2026: "Firebase, by Google",
"Google now, Apple later", "Optional, in Settings"; suggested once, a few days into a farm).

- `web3d/src/account.js`: keeping the phone's farm and the online one in step (who's newer, asking when both changed),
  the sign-in, sign-out and delete; `?account=fake` puts a pretend account in Firebase's place for the tests.
- `web3d/src/cloud.js`: the Firebase side (Google sign-in in a popup, Firestore "lite"), built on its own into
  `dist/cloud.js` and loaded only when needed. It needs the Firebase package: `npm install firebase` in `web3d/` (build.sh
  skips it, saying so, when it's missing).
- `web3d/src/firebase-config.js`: the project's web settings from the Firebase console (public by design: the rules are what
  protect the farms). `null` until the project exists: then nothing of the account shows anywhere.
- `web3d/firestore.rules`: the security rules, pasted into the console (Firestore Database, Rules). One document a player,
  `farms/<uid>`, readable and writable only by them; its fields checked; its number one more each time; a save at most
  every 2 seconds; nothing else in the database open to anyone.
- Tests: `accounttest.mjs` (the whole flow over four pretend phones, with the pretend account); `rulestest.mjs` (the
  rules, on the Firestore emulator: `java -jar cloud-firestore-emulator-*.jar --host=127.0.0.1 --port=8080`).

## Security (Audrey's standing request: "take security of the game into account")

- Saves are sanitised on load: types, clamped numbers, names stripped of markup.
- XP, feed and trophies are validated.
- Edited saves are flagged with a signature.
- If the clock goes backwards, the player gains nothing; time away is capped at 2 days.
- No secrets in this repo; keep it that way (the repo is public). The Firebase web settings are not secrets.
- My account: a farm coming from online goes through the same checks as any save; the rules keep each farm its owner's;
  the game never sees a password (Google's own window signs in).
