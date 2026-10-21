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
- Slimmer feathered breeds (21 Oct 13:49, Audrey after seeing them move: "the silkies are perfect but the other breeds are a
  bit bulky. Can you improve the body shape and the feathers definition"):
  - `stylized/breeds.py` feathered(): narrower, lower bodies (e.g. RIR body radii 1.42/0.8/0.84 x 0.12, was 1.45/0.92/0.9 x
    0.125; similar for the others), smaller breast, a longer neck with the head higher (0.455 m, was 0.415), and the whole
    body raised on longer legs (`lift`: 3.5-4.5 cm, added to the shank). Slightly larger wings.
  - `src/birds.js`: feathers 20% larger (body 3.1 cm), each with a crisp anti-aliased edge line, a lighter rim just inside
    it and the soft shadow of the feathers lying over it (a second pass over the neighbouring cells in front); barbs a
    little stronger, faded out when finer than a pixel. The fuzz over the feathers is shorter (hens 6 mm in 4 shells,
    Orpingtons 11 mm in 5) with less extra fluff underneath (`under` 0.5 / 0.6).
  - Audrey also noted the pond's ducks, frogs and water are missing or still: they're step 3's pieces 3 (ducks and frogs,
    moving water).
- Feather detail (21 Oct 14:06, Audrey: "That's much better ! Can you give a bit more love to the details of the feathers"):
  - Modelled feathers carry feather coordinates: `stylized/breeds.py` ribbon() writes a UV layer `feat` (u across 0.05..0.95,
    v root to tip) and `feat_uv()` does the same for paddle feathers (wing primaries, Legbar crest); `export_birds.py` exports
    it as `_FEAT` (normalised VEC2) and keeps vertices apart by it. The browser packs it with the folded wing's position
    (0.02 at the shoulder .. 1 at the back, from each model's wing z-range) into one attribute, `featherUV` (vec3), so the bird
    material stays at 14 vertex attributes.
  - Body feathers (`featherLocal()`): rounder with a slight point (hackles long, narrow and pointed), soft rather than
    outlined (edge line 0.8, the overlap shadow wider and stronger, the tip lighter), a pale quill, barbs (30 per feather
    radius, faded below a pixel), a softly ragged edge, and on some feathers a split vane. The folded wing: coverts at
    0.72 size over the front half, then a band of flight feathers 3x as long with a shadow where the coverts end.
  - Modelled feathers: a pale quill, slanting barbs (48 along each), darker towards the edges with a light edge line, and
    occasional gaps in the vane.
  - The short fuzz over the feathered breeds is drawn only round the outline (facing < 0.5): across the body it made a
    grainy speckle.
  - `clip.mjs` takes `CLEAN=1` (hides the labels) and `PORT=` (e.g. an older build served on 8771, for before/after).
- Resting legs and line-up feathers (21 Oct 16:28, Audrey: "When the chicken lays her legs are under her folded so not
  visible" and "I don't really see a difference on the feathers on the line up view", 49-59 fps):
  - Resting (`sit`): the leg bones go down with the body (0.78 of the shank) and shrink to 12% as they fold, so the legs
    disappear under her instead of sticking out.
  - Feathers when small on screen (`boost`, from the lattice's pixels per feather, full below 12 px, none above 40): darker
    overlap shadows and edges, stronger per-feather shade differences, and the darker-base pattern (mode 4) up to 1.8x,
    keeping the average brightness, so the rows of feathers still read at the line-up zoom.
  - Body feathers 0.82x on the breast to 1.22x over the back.
  - The feathered breeds' shells no longer draw fuzz strands: round the outline (facing < 0.45) they hold each feather's
    tip, lifted a little (hens 9 mm, Orpingtons 12 mm, 4-5 layers), so the outline is feathery. Across the body that washed
    the pattern out, so it's outline only.
  - `phoneshot.mjs` also takes `PORT=`.
- Barbs (21 Oct 17:04, Audrey: "a chicken feather is not fluffy like the silkies but is composed of very thin 'hair' that's
  all together build the feather. I'd like that to be reflected in the design a bit more"; and "Do not edit silkies just the
  other breeds"; Silkies and chicks untouched):
  - `barbs(u, count, seed)` in the bird shader: each barb a fine bright strand with a thin dark gap, a little lighter or
    darker than its neighbours. The number drawn is what fits at about 3.2 screen pixels each (capped at the real-ish
    count), dropping by halves as the feather gets smaller and blended between the two levels (seeded per level, so no
    jumps), and none below 3-7 strands; so the vanes read as strands at the line-up zoom and show every barb close up.
  - Body feathers: u = along x 0.42 - |across| x 0.5 (a V meeting at the quill, slanting to the tip), up to 120, shading
    +/-17% from the visible middle to the tip; barb ends rough up the feather's edge (t +/- 0.035 near the edge).
  - Modelled feathers: u = along - |across| x 0.06, up to 260 over the feather, +/-20%.
- A slight fluff on the feathered breeds (21 Oct 17:17, Audrey: "perhaps what we need is a slight fluffy effect on the other
  breeds too (do not edit silkies)"); the Silkie and chick code paths are untouched (checked: the Silkie rows render the
  same apart from the usual frame-to-frame noise):
  - The hen/orp FUR specs gain `fluff: 0.06` (the painted hair tile at 6 cm, marked by a negative furStyle.z so it can't
    collide with the Silkies' negative furStyle.w), longer layers (hens body 1.6 cm, Orpingtons 2.2 cm, 5-6 shells),
    `under` 1.5 / 1.8 (much fluffier underneath and round the thighs), comb 0.9 / 0.75.
  - In the feather block, each outer layer keeps the hair that reaches that far out (the same near/far coverage as the
    Silkies, from the tile's green and blue), shortened to 0.75 where seen face-on; shaded 0.76-1.14 by the hair's lightness.
    The layers spread over the full length when fewer are drawn (furSpan), like the Silkies. The lifted-feather-tip outline
    from 16:28 is replaced by this.

## Egg laying (21 Oct 18:23, Audrey: "Perfect! Carry on. The chickens should lay in their little house. We should see them setting in the nest for the duration of the laying. And of course when they are done, they are happy, they sing and parade a little, depending on their personalities")

- 21 Oct evening, Audrey: "I had in mind the nest to be inside of the little house / coop not on the side" and "The coop
  can have little windows opened on the nests". The side nest box of 18:23 is gone: each house has its nest inside, behind
  a little open window in its front wall, to the right of the people door.
- The nest (`stylized/coops.py` `nest_window()`, called by each house builder): hidden cube cutters (boolean DIFFERENCE,
  skipped by the exporter) open the window (`WIN_W` 0.26 x `WIN_H` 0.3) and a cubby behind it in the house's walls and
  plinth; a lining (floor, back, ceiling, sides), a straw mound with loose straws, and a frame (top, sides, sill) in the
  house's trim colour. Doors, posts, lanterns and pots moved to make room (the people door is a little to the left on
  most houses). The Red Barn's boards are cut round the window (`coop.py` `wall_boards(win=)`); its old side box is only
  built without a window. Nest floors sit low enough for the window to show under the roof overhangs (thatched 0.08,
  pagoda 0.06, lodge 0.2, Red Barn and stone on the house floor).
- `coops.json` `nests` (per house, glTF axes): `floor` (the nest's), `house` (the house floor), `win` [x, bottom, top,
  width], `seat` [x, z], `inside` [x, z], `pop` [x, z] (the little door at the top of the ramp), `foot` [x, z].
- `src/main.js`: `nestOf(plot)` reads them; eggs per coop in an InstancedMesh of 6 slots (`NEST_SLOTS`) on the straw
  behind the seat, coloured per breed (`EGG_COLOUR`), the newest popping in; two to start with. Tapping the nest window
  collects them ("Collected 3 eggs"; "Ivy is laying…" while a hen sits; "No eggs yet"); the label stands over the window.
- 21 Oct 19:12, Audrey (from the video): "The chickens looks too big to fit in the coop door. Also the chicken overlays the
  coop. Also the chicken should move her neck forward in order to enter the coop. The little nest is cute, for it to be more
  realistic, add a little opened door, either that slides, or that opens up. Can depends on the coop style. Also, depending
  on the personality of the chicken, the chicken can either behave and use the ladder to enter the coop or jump in the nest
  directly. Make the nest a bit more cosy with more hay". So:
  - The pop door was a dark panel painted on the wall, 20 x 24 cm, so a hen going in looked pasted over the wall. It is now
    a real opening, 30 x 40 cm (`coop.POP_W`, `POP_H`; the Brahma and Orpington are 25-26 cm wide), cut through the walls
    (cutters `cut_pop` and `cut_hall`) with a dark passage behind it (`hall`: floor, back, ceiling, end) running along to
    the nest; the cubby's left side has a dark doorway where the passage comes in. The Red Barn's boards are cut round it
    (`wall_boards(holes=)`) and its bottom trim stops at it. `coop.pop_trim()` frames it on every house. People doors moved
    or narrowed to make room (barn door from x -0.09; thatched door at 0.05, 25 cm; stone door at 0.055, 26 cm; pagoda moon
    door at 0.085, radius 0.16; lodge door leaves at 0 and 0.16).
  - Inside, a hen is in the shade: a laying hen wears her own copy of the bird material (`Rig.indoor(box)`, `#define
    INDOOR`), which darkens whatever part of her is inside the house's box (`HOUSE_LO`/`HOUSE_HI` in the pen frame, front at
    `D2` = 0.44) the deeper in it is (to 38% at 24 cm): she goes into the shadow of the pop door and sits in the half light
    of the nest with her face bright at the window. Kept in step with the soft-edge setting (`syncIndoor`).
  - Ducking (`duck` pose input in `src/birds.js`): crouched and level, neck stretched forward (head +7.5 cm, -10 cm), tail
    down; used from when her head reaches the pop door until she's through (`atPop()` in `layStep`), both ways, and in the air
    when leaping.
  - The nest window's little door, open (`nest_door()` in `stylized/coops.py`). Anything above the window is hidden by the
    roofs' overhangs from the game's camera (a flap propped up and doors slid up were tried: only their sticks showed), so
    the doors open downwards: the Red Barn's (high window) hangs against the wall below the window, red with a white Z; on
    the thatched (oak), stone (blue, with a white Z) and lodge (brown, cream Z) houses the let-down door rests on the ground
    like a little ramp. The pagoda's is a red lattice screen slid up above the window (its roof is high enough to show it).
    The stone cottage's basket of blue eggs moved beside the side wall and the thatched cottage's lavender pot a little right.
  - Cosier nest: a deep bed of straw over the whole cubby floor, a rim of 13 straw lumps round the hollow where she sits
    (lower at the front, on the sill), 90 loose straws inside, 16 on the sill, 9 hanging over its edge, 12 fallen on the ground.
    Eggs are nestled in the bed (`nests.bed` in coops.json). House budgets raised to fit (Red Barn 13.5k, thatched 12.5k,
    stone 17k, pagoda 13.5k, lodge 14.5k triangles).
  - Jumpers (`JUMPERS`: the Rebel and the Brave): they walk to a spot in the yard in front of the nest window (`launch`), turn
    to face it, crouch and leap straight in with wings beating (`leap()`: 1 s, the arc just clearing the sill where she
    crosses the wall, her shadow staying on the ground), turn round by their left where there's room, shuffle onto the seat;
    after laying they leap out of the window to the yard and sing there. The Diva, Good mum and Glutton behave and take the
    ramp and the pop door.
- 21 Oct 20:15, Audrey (screenshot of the sitting Orpington at the thatched cottage): "The chicken is clipping through the
  objects". She sat 8 cm in from the front with her breast and shoulders through the window frame and the wall. So:
  - She sits further in (`SEAT` = 17 cm from the front, `nests.seat`), sunk into the straw (seat height = nest floor +
    0.5 cm): all of her is inside the cubby, her face just at the window (the window's top hides anything deeper and
    higher). The straw hollow is centred on her. Eggs lie in front of her seat, under her breast (`NEST_SLOTS`, 3-14 cm
    from the window), where they show once she's gone.
  - Nest windows 30 cm wide (`WIN_W`; the pagoda's stays 26 cm, its Silkies are small and its moon door close), so a big
    hen fits through when she jumps. Red Barn window at x 0.445, barn door to 0.24; thatched door 24 cm at 0.045, its
    middle post at 0.225.
  - Birds walk round what stands in front of their house: `nests.block` in coops.json (`block()` in `stylized/coops.py`:
    a let-down door lying on the ground, the thatched cottage's lavender pot, the pagoda's lantern, the lodge's lantern
    post), checked by `Bird.free()` via `inBlock()`. And they keep their beak and breast out of walls, fences and those
    things: a step is taken only if the point 22 cm ahead (scaled by size) is inside the yard (plus 12 cm) and clear of the
    blocks (`clearAhead()`, in the free walk, `stepToward` and parade sidesteps; not for a hen on her way to lay).
    `clipcheck.mjs [minutes]` simulates the pens and counts beaks in a house's front wall and birds in a block: 4 minutes,
    about 15,000 samples, 2 beaks a couple of centimetres in, none in a block.
  - Jumpers take off further out (51 cm from the front, clear of a let-down door) and land there after.
- 21 Oct 20:36, Audrey (frame from the video): "See the head of the chicken in the wall still clipping !" (her head came out
  through the thatched cottage's side wall as she walked onto the nest). `laycheck.mjs [pers ...]` now measures this: a visit
  at each coop, 30 samples a second, a third of her body's own vertices (posed, `getVertexPosition`) checked against the
  house: anything crossing the front wall must do so through the nest window or the pop door, nothing through the side walls,
  nothing through the cubby's right side. It found her head and tail going through walls whenever she turned inside (on
  arriving at the nest, getting off it, at the pop door), her standing head above the window, and a jumper's tail and wings
  over and beside the window. So:
  - Inside, she never turns where there isn't room: along the passage (`hall`) to beside the nest (`pre`, 20 cm left of the
    seat), then a turn in step with a sideways shuffle (`swing()`: the yaw follows the move, not her own turn rate) to stand
    behind the seat (`stand`, 30 cm in, where standing her head is still inside); she moves forward onto the seat only once
    she's most of the way down (`onNest()`, following her sit amount), and backs off it as she gets up; getting off, the
    same shuffle the other way (her tail kept inside the cubby).
  - The passage is 60 cm deep, so she turns round 30 cm inside the pop door; leaving, she turns towards the door from 11 cm
    to its right. She ducks from 36 cm inside the door; ducking presses her tail down harder.
  - Pop doors 46 cm tall (`POP_H`), nest windows 40 cm (`WIN_H`; the pagoda's 30 x 26), the cubby 2 cm wider on the right and the seat 19 cm in (`SEAT`); the
    windows' tops sit under the roofs' overhangs, so they look no different from the game's camera.
  - Jumpers: a route round the feeder and the rest to the take-off spot (`plan()`; if it can't be reached they take the
    ramp); the leap's arc is worked out with the hop's own lift at that moment (`leap()`), and goes lower for a low window;
    in the air she's long and flat (`stretch` pose: head out and low, tail pressed down) and folds her wings to go through
    the window (and no nose-up on take-off); inside she lands 40 cm in, then turns round by her left while shuffling over
    that way.
  - `laycheck.mjs` after the fixes, all five personalities at all five coops: ramp hens 0-4 samples a visit touching by
    1-2 cm (a foot on the pop door's threshold); jumpers 0-2 samples, the Brahma 3-4 (her tail brushing the window's top for
    a tenth of a second as she lands). Before: 20-130 samples a visit, up to 36 cm.
- Each coop hen has a personality (the game's five: `PERS_IDS`, spread across each pen) shown in her label, and `layIn`
  (first lay 6-76 s after loading, then every 4-8 minutes; one hen in the nest box at a time).
- `startLaying(sit)` / `layStep(dt)` (phases go, in, turn, settle, sit, rise, out, sing): across the yard to the foot of
  the ramp, up it and in at the little door (ducking), along inside to the nest (`walkPath`: scripted points with heights),
  turn to face out of the window and settle low on the straw (`brood` pose: body and head lowered so her face shows at the
  window), sit 30-45 s with a shuffle now and then (legs folded away), rise (the egg appears in the straw), back the way
  she came, down the ramp, sing in the yard. About 8 s each way inside, where she is hidden. The song (`SONG`: seconds and loudness per personality):
  "buk buk buk buk ba-KAWK" cycles of 1.5 s, the head darting forward on each buk and thrown up for the KAWK, standing tall,
  with quaver notes rising over her head (`spawnNote`, sprites, bigger for the KAWK). The rooster joins in with a crow
  about half the time (`answerIn`). Laying hens are skipped by `separate()` while in the box and aren't disturbed by taps.
- `celebrate()` by personality, then back to normal life: Diva: a slow strut round the yard (pace 0.55, `proud` pose:
  chest out, head high, tail up, high steps) then a shake; Brave: a brisk patrol round the yard edge stopping to look about,
  ending at the gate with a flap; Glutton: straight to the feeder and 4.5 s of pecking; Rebel: a hop and a flap, a dash
  (pace 1.9) to the farthest free corner and a flap; Good mum: a contented shake, then to her chicks.
- Routes (`route`, `nextLeg()`, `plan()`): points are moved to the nearest free spot, legs blocked by the feeder, water or
  hay get a detour point or are left out, a parading hen steps round anything in the way and never waits long, and a leg
  times out after 8 s.
- Pose (`src/birds.js`): `sing`, `cluck`, `kawk`, `proud`, `brood` inputs.
- Tests: `layclip.mjs PLOT PERS SIT frames fps size out [dx dz]` (frames of one hen laying, with the phase of each frame in
  out_phases.json; `VW`/`VH`, `COOPS`; the other birds of the pen are moved off the ramp and away from the window and stay
  put, `CLEAR=0` leaves them be), `laytrace.mjs PLOT PERS SIT seconds` (her position and state every half second);
  the page has `__farm.layNow(i, sit)`, `layAs(i, pers, sit)`, `noLaying()`, `nestOf`, `showEggs`. Ten simulated
  minutes: 3-8 eggs per coop. `layclip.mjs` can centre on a raised point (`LX`, `LZ`, `LH` in the pen frame).
  `nesttap.mjs` taps each coop's nest window and checks the eggs are collected. `coopfronts.mjs [size] [out]` pictures each
  house's front with the birds moved aside (`LX`, `LZ`, `LH` to centre); `sitshot.mjs [size] [out] [pers]` a hen sitting at
  each window, then the eggs once she's gone.
- `build.sh` stamps each build with its London time (`__BUILD__`); the details pill (tap it) shows it as "version ...", so
  Audrey can check her phone has the latest.
- Measured at phone size (10 coops): 165-360k triangles of which birds 45-80k; a Silkie pen close up 320k (birds 150k).
- Tests for heavy views: `still.mjs` / `stillat.mjs` draw once and screenshot (the test browser is too slow to keep drawing
  fur), `views.mjs` counts triangles per view (birds separately), `rtime.mjs` times one frame. The page has `__farm.pause(on)`
  and `__farm.draw()` for them.

## Day and night (21 Oct 22:30, Audrey: "Start")

- As in the game, the light follows the player's own clock (day 7:00-18:00, dusk 18:00-21:00, night 21:00-7:00): a warm
  orange from about 17:30, deep blue from about 20:30, brightening again between 6:00 and 7:30. `DAY_KEYS` in
  `src/main.js`: per hour, the sun's colour, strength, height and how far round from midday it is, the sky and ground light
  (hemisphere) and their strength, the colour round the village and how lit the lamps are; `applyDaylight(hour)` blends the
  two keys either side (smoothly) every quarter second. Midday (12:30) is exactly the look approved before. The sun rises
  low on one side (-72 degrees round, 3 degrees up at 6:20) and sets on the other (+70, 2 degrees up at 20:10) with long
  shadows; at night the moon gives a soft blue light from high up. Shadows are redrawn when the light has moved 0.6 degrees
  (every few minutes in real time).
- Night colours (`nightGrade()`, one line added to every material's shader, also to materials made later: the laying hens'
  own, the song's notes): by moonlight colours grey towards a moonlit blue (60% at night), so the grass and roofs don't stay
  bright green and red.
- Lamps: the exporter keeps glowing materials apart (`stylized/webglb.py` buckets `glow` and `window`, set per export:
  village `GLOW = {'dlamp'}` for the lamp posts round the green, `WINDOWS = {'glass'}` for the farmhouse's windows; coops
  `GLOW = {'lamp', 'lanternred'}` for the lodge's lantern, the Deluxe arch's two lanterns and the pagoda's red paper lantern).
  `lightUp()` gives those materials a warm light of their own as night falls (lamps 2.4 x, windows 1.25 x), and
  `lampPools` lays a soft warm disc of light on the ground under each lamp post (1.25 m) and coop lantern (0.75 m; their
  places in `coops.json` `lights`, from `light_at()` in `stylized/coops.py`), drawn added on top, only at night.
- Bedtime: at dusk the coop birds go in for the night, each at her own time (hens between 20:00 and 20:40, chicks just
  after their mum, the rooster last at 20:45): to the foot of the ramp, up it, ducking in at the pop door, and out of sight
  just inside (`goToBed()`, `roostStep()`, `sleepNow()`: hidden, no shadow, can't be tapped, left out of the jostling). In
  the morning they come out again (the rooster first at 6:20, with a crow; the hens between 6:30 and 7:05: `wakeUp()`),
  down the ramp to a free spot in the yard. If the page opens at night they're already in bed. No laying from a quarter of an
  hour before a hen's bedtime.
- Seeing it by day: `?time=21:30` fixes the hour; `?daylapse=3` runs a whole day in 3 minutes (from `?time` if given,
  otherwise from 6:00). Automated tests (a script-driven browser, `navigator.webdriver`) see 12:30 unless they ask, so they
  don't depend on the clock. The page has `__farm.setHour(h)` and `__farm.day`.
- Tests: `dayshot.mjs [hours] [size] [out]` (the same view at several hours, `LX`/`LZ`), `dayclip.mjs PLOT FROM TO RATE FPS
  SIZE OUT` (frames of a coop with the clock run fast), `bedtrace.mjs [rate]` (how many birds of each coop are out, on
  their way, in bed: all in by 21:00, all out by 7:15, nobody stuck). `withserver.sh CMD` serves `dist/` just for the length
  of a test.

- Live: the game's site, folder `3d/` (https://kavaliere11-laudun.github.io/feather-and-field/3d/). The game's normal deploy wipes the
  repo, so it must copy `web3d/dist/.` into `3d/` too until the 3D village becomes part of the game itself.
