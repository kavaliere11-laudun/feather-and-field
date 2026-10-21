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
- Second pass (21 Oct, Audrey: "a little bit better with the quality of the silkies feathers", then the other breeds):
  - Silkie hair: 16 shells, finer strands that gather into tufts (locks) towards their tips with a gentle wave, combed a little
    back and down so strands read as streaks, locks lighter in the middle and darker where they part, a soft glow where light
    grazes the fluff. Soft-edged strands (alpha to coverage) were tried and dropped: they tinted the birds green (fixed and
    back on since 09:34, see Hair locks below).
  - Feathered breeds: a pattern drawn on each feather, chosen per vertex (attributes featherPattern, featherMode): bars across
    the feather (Legbar), a dark centre with light edges (the Brahma's cape and a rooster's saddle), or darker towards the
    base (everyone else, gently on light plumage); a quill and fine barbs; long hackle feathers down the neck; fluffier
    underside and thighs. A per-pixel relief (bump) was tried and dropped: the feather edges made dark dashes.
- Third pass (21 Oct, Audrey from her iPhone: Silkie feathers "become like dots" when zooming, the eyes are "weird", roosters
  should have "very nice almost majestic" tails):
  - Strands come in four fixed sizes by zoom so they don't shimmer while zooming. 50/75/105/150 per metre made blobs on her
    iPhone ("a blurry effect"); now 70/105/150/210 (about 2.5 screen pixels) with the Silkie hair combed down (comb 0.8,
    clump 0.6), so strands lie along the body and read as streaks of hair instead of dots seen end-on.
  - Eyes (`breeds.natural_eye`): smaller, set into a patch of bare red facial skin, amber iris, a flush round pupil, a thin lid
    and a catch-light (Silkies keep their small dark eyes, chicks their bead eyes).
  - Tails from curved, tapering feathers (`breeds.feather`): hens a fan of main tail feathers; roosters add six lesser sickles
    a side, the two great sickles arching up and falling behind, short coverts, and saddle hackles lying along the back
    (new paint region 11, saddle). Long feathers are glossy with a sheen (green-black on dark tails), feather mode 5.
  - Eyes and tail feathers are marked `keep` so the exporter never simplifies them; budgets: hens 3000, roosters 3800,
    Silkies 2300/2600, light versions 1200/1500 (their tails have fewer, simpler feathers).
- Bird budgets lowered (hens 2300, roosters 2600, chicks 1000 triangles) since the shells multiply them (raised again in the
  third pass for the eyes and tails).
- Painted fluff (21 Oct, Audrey chose option 4 of 4: paint real feather detail on, with a light fluffy edge): Silkies and chicks
  wear a seamless tile of fluffy hair (`models/silkie_hair.jpg`, painted by `stylized/hair_paint.py`: about 500 locks of fine
  wavy strands, darker roots and bright curling tips over a dark undercoat, drawn with wrap-round so it repeats without seams).
  The shader maps it round the body from three sides (strands fall down the sides and back over the top; 5 cm tile on Silkies,
  2.2 cm on chicks) and tints it with the bird's colours; the fluff shells now show only round the outline (and short near the
  body), so there is no speckle across the middle. Mipmapped, so it looks the same at every zoom and on every phone. A Blender
  render of particle hair (`hair_tile.py`, not kept) took 7 minutes and came out too straight, with a seam.
- Hair locks (21 Oct 09:34, Audrey: "I cannot really see a change"): the 5 cm tile's strands were a fraction of a screen pixel,
  so they averaged away and the outline shells (a hard-cut mosaic on her iPhone) were all she saw. Now:
  - The tile is drawn at the size the hair is seen: 12 cm wide (Silkies; 3.5 cm on chicks), about 130 locks in three layers,
    each lock about 1 cm wide and 4-8 cm long, 7-11 strands of 2.4-3.4 mm that gather to a curling tip, staggered tapered roots.
    Two channels: red = how light (dark partings, darker roots, each lock a little lighter or darker), green = how far the
    hair stands out (top layer highest, a lock's middle higher than its edges). JPEG 4:4:4 so the channels stay apart.
  - Silkies and chicks: every fluff layer keeps only the hair that reaches that far out (`locks` in the FUR spec, a negative
    size in furStyle.w marks it), so the locks stand up in 3D right across the body, darker deeper in; the strand dots and
    the outline-only rule are gone for them. Sampled a little sharper (mip bias -0.75).
  - Soft edges on by default wherever antialiasing is on (quality 1-2): alpha to coverage, with the birds' alpha writes
    masked off (`colorMask` in onBeforeRender/onAfterRender). That mask was the fix for the green tint: the partial alpha
    reached the canvas, so the page showed through. `?hard` turns soft edges off to compare.
- Silkies like the 2D game's (21 Oct 09:47, Audrey in Safari: the locks "kinda reverted to sheep wool style"). The target
  is the 2D game's Silkie (`assets/sil_*.webp`): a smooth body, fine hair lying one way, a soft fuzzy edge.
  - `stylized/breeds.py` silkie(): no metaball bumps any more on the body, tail, crest or cheeks (they made a lumpy cloud,
    the fleece look); one smooth body with a fuller cushion behind, a smooth tail cushion, a round pompom crest, smooth
    cheek muffs; the wings a little larger and lying on the sides.
  - The tile (`hair_paint.py`): fine silky strands (1.3-2 mm) in soft, loosely gathered locks, three layers over a mid-dark
    undercoat; green is now each strand's own length (no raised lock middles, so no lumps).
  - The shader fades hair into air over a range that widens with distance (`ramp`, from the tile's pixels per screen
    pixel), so at the line-up zoom the outer layers become a see-through halo (with soft edges on) instead of a hard rim.
    Gentler shading (0.5-1.22), mip bias -0.5.
- More fur (21 Oct 09:55, Audrey: "Thats better! We need to increase the fur effect please", 46 fps): Silkie hair half as
  long again (body 4.8 cm, crest 5, tail 5.2, wings 4, legs 2.6) in 22 shells, standing out more (comb 0.65), shorter round
  the face (`face: 0.45`, by head weight) so the face stays clear; stronger strand shading (0.42-1.28); sharper sampling (mip
  bias -1) and a narrower fade (`ramp` 0.05 + 0.05 per mip level), so single strands and wisps show at the edge.
- Even more fur (21 Oct 10:11, Audrey: "Thats going towards the right direction can we increase more the fur effect",
  45 fps): Silkie hair body 6.2 cm, crest 6, tail 6.6, wings 5, legs 3.2, in 26 shells, standing out more (comb 0.5). The
  tile gains a fourth, sparse layer of stray strands that reach furthest out (green 1.0), making wisps round the edge.
  Hair is short right round the face (`face: 0.7`, by distance from a point just in front of the head centre, `headc`,
  for body and crest hair), so the long crest and cheeks don't bury the eyes; less extra fluff underneath (`under: 0.35`
  instead of 0.9) so the feet still show.
- Zoomed out (21 Oct 11:05, Audrey: "All good when zoomed in, wool effect when zoomed out", 46 fps close, 27 fps far):
  zoomed out, only the first (inner) layers were drawn, so far Silkies shrank to smooth blobs (crest, body and tail balls).
  Now, for painted hair (Silkies, chicks), the drawn layers are spread over the hair's full length (`furSpan` = 1 / shown,
  in the vertex shader), so far birds keep their fuzzy outline; the locks' light and dark even out with distance (towards
  0.93 from tile mip level 2.5 to 5). Far out, 0.27 of the layers instead of 0.34 (at least 2 per bird) to help the frame rate.
- Still woolly at middle distance (21 Oct 11:25, Audrey: "Could be better still quote wooly", screenshot at 30 fps, visibly
  lower resolution). Two causes:
  - The tile's smaller copies (mipmaps) average the hair length, so further away the fluff layers saw only the average
    length and the long strands vanished: smooth blobs. The tile now also carries length squared (blue); the mipmaps average
    both, so the shader knows the spread of lengths at any distance and keeps the share of strands reaching each layer
    (`far` coverage: mean ± 1.73 standard deviations as a uniform spread). Close up (tile mip level below 2.5) the old soft
    cut stays (`near`), blended over levels 2.5-4, so the close-up look she approved is unchanged. Far evening-out of the
    shading reduced (0.35 from level 3 to 5.5).
  - A slow zoomed-out view stepped the quality down (resolution 2x to 1.5x and below) for the rest of the visit. Now
    `stepUp()` brings it back once the view is clearly lighter (zoomed in to under 0.7 of the size where it got slow), at
    most 4 times a visit; `stepup.mjs` checks it (late frames faked). Far light models draw 0.2 of the layers.
  - `tricount.mjs` prints triangles and draws on the line-up at six zooms: 540k close, 800k at the line-up zoom (Silkies'
    26 shells), 276k far.

## Movement (21 Oct 12:19, Audrey: "This is really good. When should we review the fluidity of the chicken moves? Eg: the legs when they jump, the tail should also move a bit")

- The hop (`hopCurve` in `src/birds.js`, 0.8 s, `hopT` 0..1): a crouch (body down, legs folded forward), the push off with the
  body tipping back and wings lifting, legs tucked up and back in the air, reaching forward before landing, a small squash
  and settle. The height is on the root bone now (12 cm, chicks 7 cm), and the bird's round shadow shrinks while she's up.
- The tail on a damped spring per bird (natural frequency about 2 Hz, damping 0.43, so it overshoots a little): it sways with
  each step, swings out against turns (`turn`, rad/s, smoothed in main.js), lifts to balance a peck or a scratch, dips as
  she takes off and flicks up on landing.
- The head-bob: walking, the head moves back against the body for 68% of each step (holding nearly still in the air), then
  darts forward with a small dip (3 cm, by bird size).
- A feather shake (`ruffle` act, 0.75 s, picked now and then while standing): fast body roll, head shake, wings out, tail wag.
- Quality: a frame counts as late only below 25 a second (it was below 37 while touched, which stepped her phone down to
  quality 4 of 4 though it was still smooth).
- Tests: `clip.mjs WHAT frames fps size dx dz out` renders line-up frames stepped exactly (hop, walk, or an action);
  `make_gif.py` stitches them. The page has `__farm.hop()` (every bird hops, as if tapped).
- Audrey (12:23): "Love it !" Step 2 done.

## Step 3: a living farm (started 21 Oct)

Order, one live piece at a time: (1) wind and the wheat field's stages, (2) day and night, (3) ducks and frogs on the pond,
(4) the farmer, (5) the decorations.

- Wind (21 Oct 12:28): `addWind(material, amp)` in `src/main.js` bends a plant by its height above the ground, squared
  (roots stay put), in gusts 3.5 m long rolling with the wind at about 1 m/s, stronger and calmer over half a minute, with a
  quicker flutter. Done in the vertex shader (project_vertex replaced, works with instancing), one clock `WIND.time`; batches
  take `wind:` (grass and flowers 1.2, wheat 0.3, bushes 0.05, trees 0.006 to 0.007); materials shared with other models are
  cloned first. Shadows don't sway (they are only redrawn when the view moves).
- The wheat field's stages, as in the game (`fieldStage()`: soil, sprouts, growing, ripe): ploughed furrows (8 rounded
  ridges), first shoots (40% of the plants, 30% tall, light green, furrows showing), growing (55% tall, green), ripe (golden
  with two ears a stalk). Each plant has a slight shade of its own. `setWheat(stage)`; `?wheat=` picks one; in the test
  page a tap on the field shows the next stage with a label. Tests: `fieldshot.mjs` (the four stages), `windclip.mjs`
  (frames of the wind).
- `build.sh` stamps each build with its London time (`__BUILD__`); the details pill (tap it) shows it as "version ...", so
  Audrey can check her phone has the latest.
- Measured at phone size (10 coops): 165-360k triangles of which birds 45-80k; a Silkie pen close up 320k (birds 150k).
- Tests for heavy views: `still.mjs` / `stillat.mjs` draw once and screenshot (the test browser is too slow to keep drawing
  fur), `views.mjs` counts triangles per view (birds separately), `rtime.mjs` times one frame. The page has `__farm.pause(on)`
  and `__farm.draw()` for them.

- Live: the game's site, folder `3d/` (https://kavaliere11-laudun.github.io/feather-and-field/3d/). The game's normal deploy wipes the
  repo, so it must copy `web3d/dist/.` into `3d/` too until the 3D village becomes part of the game itself.
