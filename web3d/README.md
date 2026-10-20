# Feather & Field in 3D, in the browser (started 20 October 2026)

Audrey chose (20 Oct) to build the 3D version into the web game instead of Unity, so Claude can run, test and fix it on its own
(headless Chromium draws 3D here in software) and she previews at milestones.

- `src/main.js`: the 3D farm (three.js 0.170): the Unity farm's camera (orthographic, 42° down, 45° round), warm sun and sky light,
  the painted meadow, the coop with the big pen, both apple trees, grass and flowers in batches, birds that potter about and keep
  their distance (a port of HenWander), drag / pinch / scroll, tap a bird for her name.
- Performance on phones: lighter models; static shadows drawn once (birds get soft round shadows); grass, apples and eggs
  instanced; at most 2x pixel ratio; 30 fps when idle, 60 while touched, nothing in the background; quality steps down by itself
  (pixel ratio, shadow map, grass) when frames come late. `?q=0..3` fixes the quality, `?details` shows triangles and draws.
- `models/`: `farm.glb` and `birds.glb` from `stylized/export_web.py` (vertex colours, a few shared materials, glTF axes:
  three.js (x, y, z) = Blender (x, z, -y), birds face +z); `layout.json` from `stylized/web_layout.py` (farm_layout.NEW).
- Build: `npm install three@0.170.0 esbuild@0.24.0` then `./build.sh` (writes `dist/`).
- Test: serve `dist/` locally, `node shot.mjs URL out.png` (screenshot at 402x874) and `node interact.mjs URL` (tap, drag, scroll,
  pinch, zoom limits, quality steps, birds moving, no page errors).
- Live: the game's site, folder `3d/` (https://kavaliere11-laudun.github.io/feather-and-field/3d/). The game's normal deploy wipes the
  repo, so it must copy `web3d/dist/.` into `3d/` too until the 3D farm becomes part of the game itself.
