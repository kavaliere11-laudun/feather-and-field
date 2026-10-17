# Feather & Field — source and build pipeline

This `source` branch holds everything needed to change and rebuild the game. The `main` branch is the published web app only (GitHub Pages serves `main`); never commit source files to `main`.

- Live web app: https://kavaliere11-laudun.github.io/feather-and-field/ (Audrey plays it as a home-screen app on iPhone)
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

Other walkthroughs: `qa_ux.mjs`, `qa_sale*.mjs`, `qa_move.mjs`, `qa_rename.mjs`, `qa_build.mjs`, `qa_filter.mjs`, `shot_live.mjs`. Test at 402×874, deviceScaleFactor 2, touch, in both `en-GB` and `fr-FR`.

Repacking images after renders:

```bash
MAPDIR=r/map7 OVDIR=r/ov4 PROPDIR=r/props4 BRIDGES=r/bridges7.json python3 pack.py   # full (slow, run in background)
BIRDS_ONLY=1 python3 pack.py                                                        # birds only
```

## Release

```bash
python3 build2.py               # release build (no test hooks)
python3 build_pwa.py            # writes site/ with service worker (hashed asset keys)
# in a clone of main:
git rm -rq . && cp -r <src>/site/. . && git add -A && git commit -m "…" && git push
```

Then publish `game2/index.html` to the artifact URL above with the Artifact tool. Read the artifact first in a new conversation. Images are already uploaded as artifact files; publish with `root=game2` and a `files` list only when images change.

Commit and push `source` after every change too, so the next session starts from the latest code.

## Security (Audrey's standing request: "take security of the game into account")

- Saves are sanitised on load: types, clamped numbers, names stripped of markup.
- XP, feed and trophies are validated.
- Edited saves are flagged with a signature.
- If the clock goes backwards, the player gains nothing; time away is capped at 2 days.
- No secrets in this repo; keep it that way (the repo is public).
