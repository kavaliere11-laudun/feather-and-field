# Feather & Field in 3D, in the browser (started 20 October 2026)

Audrey chose (20 Oct) to build the 3D version into the web game instead of Unity, so Claude can run, test and fix it on its own
(headless Chromium draws 3D here in software) and she previews at milestones. Plan: (1) the village in 3D, (2) coops and birds,
(3) a living farm, (4) into the game, then the App Store wrap (Capacitor).

## Step 1: the village (done 20 Oct)

- `src/main.js`: the whole village in 3D, same layout as the 2D map: paths and streams as ribbons, the pond, the farmhouse, egg
  stall, pasture, woods, orchard, decorations, fields, bridges and dock, 40 plots (coops, empty plots, plots for sale), grass and
  flowers. The Unity farm's camera (orthographic, 42° down, 45° round), warm sun and sky light. Birds per coop potter about and keep
  their distance (a port of HenWander); only coops in view are animated. Drag / pinch / scroll, tap a bird for her name.
  `?coops=N` (0-40, default 10 since step 2) fills that many plots with coops (40 is the stress test).
- Wheat: golden instanced stalks with ears on the wheat field (growing stages come in step 3).
- `src/farm_single.js`: the earlier single-farm test (not built any more, kept for reference; it needs the old farm.glb and
  birds.glb, which `stylized/export_web.py` still writes).
- Performance on phones: lighter models (hen 3000 triangles, rooster 3400, chick 1500, coop 21k); static parts batched in
  12 m tiles (grass in 6 m tiles, hidden when zoomed far out); every bird's soft round shadow in one batch; shadows drawn only
  round the view and redrawn when the view moves; at most 2x pixel ratio; 30 fps when idle, 60 while touched; quality steps down
  by itself when frames come late. `?q=0..3` fixes the quality, `?details` shows triangles and draws.
  Measured at phone size: 80-200k triangles and 50-85 draws in normal views; 370k / 130 draws with 40 coops in view.
- `models/`: `village.glb` from `stylized/export_village.py` (the 2D map's Blender builders drawn in flat colours, via
  `stylized/webglb.py`); `village.json` from `stylized/village_layout.py`; `plants.glb` (grass tufts and flowers) from
  `stylized/export_web.py`; `layout.json` (the pen) from `stylized/web_layout.py`. glTF axes: three.js (x, y, z) = Blender
  (x, z, -y); birds face +z.
- Build: `npm install three@0.170.0 esbuild@0.24.0` then `./build.sh` (writes `dist/`).
- Tests (serve `dist/` on port 8770): `shot.mjs` (screenshot at 402x874), `interact.mjs` (tap, drag, scroll, pinch, zoom limits,
  quality steps, birds moving, no page errors), `overlap.mjs` (birds keep apart), `census.mjs` (triangles per object),
  `tour.mjs` and `tour2.mjs` (screenshots and costs round the village; tour2 with 40 coops), `close.mjs` (hens at full zoom).

## Step 2: coops and birds (done 20 Oct)

- Coops (`stylized/coops.py`, exported by `stylized/export_coops.py` to `coops.glb` + `coops.json`): the five styles in the cosy
  look, all on the Red Barn's footprint with the pop door and ramp in the same place, so the yard is the same in every pen:
  Red Barn (Rhode Island Red), Thatched Cottage (Buff Orpington), Stone Cottage (Cream Legbar), Timber Lodge (Light Brahma),
  Pagoda Coop (Silkie). The pen is split so every style shares it: `pen_base` (yard, feeder, water, hay, sack, straw), `fence`
  (posts and rails) and `fence_dx` (Deluxe: white pickets, rose arch with lanterns, flowers outside the fence, bunting); `vane`
  is the Deluxe weathervane, set on each roof's top (`coops.json` tops). Houses are 8-15k triangles. Coops are batched by model.
  In the test page, plot i gets breed i mod 5; plots 5-9 (and 15-19, ...) are Deluxe.
- Birds (`stylized/breeds.py`, exported by `stylized/export_birds.py` to `flock.glb` + `flock.json`): Rhode Island Red, Buff
  Orpington (round, fluffy rear, pink legs), Cream Legbar (sleek, crest), Light Brahma (big, pea comb, feathered legs) and Silkie
  (a soft cloud of fluff, pompom crest, dark face, turquoise earlobes, five toes, feathered legs), as hens and roosters, and one
  chick model for every breed. Each model has bone weights (root, body, head, wings, tail, legs; the neck bends smoothly) and a
  paint region per vertex; `flock.json` has the bone pivots. Every model also has a light version (`_lo`, about 900 triangles)
  that birds wear when the view is zoomed out past 5.5.
- `src/birds.js`: paints each breed (and the 11 Silkie colours, with splash, paint, cuckoo and partridge patterns; chicks per
  breed, Legbar and partridge chicks with chipmunk stripes) onto the shared models, builds each bird as one skinned mesh (one
  draw), and poses the bones: walking (legs stepping, body bob, head bob), pecking, looking round with a head tilt, scratching
  (kicks back, then pecks), stretching the wings, resting (sits down, legs tucked), crowing (roosters, flap first). In
  `src/main.js` a bird picks what to do while standing, walks on after each action, and chicks keep near their mum. A tap: a hop
  and a flap (a rooster may crow) and a label with name and breed (or Silkie colour).
- `?lineup` shows every breed (hen, rooster, chick) and every Silkie colour in rows on open grass beside the village.
- Measured at phone size: 100-240k triangles and 55-125 draws in normal views; 330-360k / 160-175 draws with 40 coops.
- More tests: `anim.mjs` (line-up birds mid-action, stepped exactly), `lineshot.mjs` (the whole line-up in a wide window),
  `strip.mjs` (a coop's birds 0.1 s apart), `coops_tour.mjs` (every coop style, plain and Deluxe), `penclose.mjs` (one pen's birds
  close up). The test page has `__farm.freeze(on)`, `__farm.step(dt, n)` and `__farm.act(type, seconds)` for these.

## Fur and feathers (21 Oct, after Audrey: "too abstract", Silkies "look like sheep", feathers "almost like hair")

- `src/birds.js` grows fur with shells: each bird's geometry holds its body plus up to 12 copies of its plumage pushed out along
  the normals (attributes furT, furLen); the bird material's shader keeps only small dots in each layer (one strand per cell
  of a 3D grid in rest-pose space, tapering outwards, random lengths), darker at the roots. Still one draw per bird, skinned.
  - Silkies: long hair-like fluff (3 cm, 12 shells, a little droop); their Blender body is now smaller and smoother
    (`stylized/breeds.py`) so the hair makes the shape.
  - Chicks: soft down (9 mm, 8 shells).
  - The other breeds: a short layer (1.1 cm; Orpingtons 1.6 cm) combed back and down (down the neck near the head), over a
    feather texture drawn per pixel: rows of overlapping rounded feathers like roof tiles (attributes featherSize, featherHead).
  - Fewer shells and coarser strands when zoomed out (`setFurDetail`, from pixels per metre; the quality levels cap it too).
- Bird budgets lowered (hens 2300, roosters 2600, chicks 1000 triangles) since the shells multiply them.
- Measured at phone size (10 coops): 165-360k triangles of which birds 45-80k; a Silkie pen close up 320k (birds 150k).
- Tests for heavy views: `still.mjs` / `stillat.mjs` draw once and screenshot (the test browser is too slow to keep drawing
  fur), `views.mjs` counts triangles per view (birds separately), `rtime.mjs` times one frame. The page has `__farm.pause(on)`
  and `__farm.draw()` for them.

- Live: the game's site, folder `3d/` (https://kavaliere11-laudun.github.io/feather-and-field/3d/). The game's normal deploy wipes the
  repo, so it must copy `web3d/dist/.` into `3d/` too until the 3D village becomes part of the game itself.
