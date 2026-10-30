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
- Bedtime: late in the evening the coop birds go in for the night, each at her own time (hens between 22:00 and 22:40,
  chicks just after their mum, the rooster last at 22:45; Audrey, 22 Oct 7:24: people can't play if the hens are in bed
  from 20:00, so "Bedtime between 22:00 and 22:45"): to the foot of the ramp, up it, ducking in at the pop door, and out of sight
  just inside (`goToBed()`, `roostStep()`, `sleepNow()`: hidden, no shadow, can't be tapped, left out of the jostling). In
  the morning they come out again (the rooster first at 6:00, with a crow; the hens between 6:05 and 6:40: `wakeUp()`),
  down the ramp to a free spot in the yard. If the page opens at night they're already in bed. No laying from a quarter of an
  hour before a hen's bedtime.
- Seeing it by day: `?time=21:30` fixes the hour; `?daylapse=3` runs a whole day in 3 minutes (from `?time` if given,
  otherwise from 6:00). Automated tests (a script-driven browser, `navigator.webdriver`) see 12:30 unless they ask, so they
  don't depend on the clock. The page has `__farm.setHour(h)` and `__farm.day`.
- Tests: `dayshot.mjs [hours] [size] [out]` (the same view at several hours, `LX`/`LZ`), `dayclip.mjs PLOT FROM TO RATE FPS
  SIZE OUT` (frames of a coop with the clock run fast), `bedtrace.mjs [rate]` (how many birds of each coop are out, on
  their way, in bed: all in by 23:00, all out by 6:45, nobody stuck). `withserver.sh CMD` serves `dist/` just for the length
  of a test.

- Live: the game's site, folder `3d/` (https://kavaliere11-laudun.github.io/feather-and-field/3d/). The game's normal deploy wipes the
  repo, so it must copy `web3d/dist/.` into `3d/` too until the 3D village becomes part of the game itself.

## Inside the coops at night (22 Oct, Audrey chose "Look inside sleeping coops", "Night activities", bedtime 22:00-22:45)

- At night, tap a coop with birds in bed and you're inside: a little room in that coop's own style (`stylized/interiors.py`,
  exported by `stylized/export_interiors.py` to `models/interiors.glb` and `interiors.json`): raw barn boards (Red Barn),
  whitewash and oak beams (Thatched Cottage), stone (Stone Cottage), logs (Timber Lodge), plaster and red lacquer (Pagoda);
  a plank or plastered ceiling on joists, a beam across the open front, floor boards under deep straw, a ladder perch with
  two bars, two nest boxes, the chicks' hollow in the straw, the pop door on the left wall (its panel a separate model,
  `inside_pop`, sliding up in tall guides to show the night outside), a moonlit window (round in the pagoda), a galvanised
  feeder, a red drinker, a hay bale, and a lantern turned low hanging over the nest boxes. 6.8k-12.9k triangles each.
- The birds: up to three hens along the lower bar and the rooster and the other hens on the top bar in the gaps between them,
  so every one shows (any more bed down in the straw in front), the chicks curled up in their corner. Asleep: sitting low and
  fluffed up, breathing slowly, head turned back into the back feathers (`sleep` in `Rig.pose`), eyes shut (`Rig.sleepy()`:
  the sleepers wear a copy of the bird material with `#define EYES_SHUT`; each eye's vertices are found when a breed is
  painted (`eyeSpots()`: unpainted, on the head, amber, black or white) and an amber eye becomes a small dome of red lid in
  its ring, a bead eye sinks into the head). Now and then a "z" floats up.
- Tap a bird and she wakes for a cuddle: eyes open, a shake of the feathers, little hearts, her name with "sleepy", then she
  dozes off again. Tap a nest box to collect the eggs ("Collected 4 eggs"). On a phone held upright about a metre of the room
  shows, so a sideways drag looks along it (from the perch to the nest boxes; a hint says so the first time), the view
  turning up to 34 degrees towards the side wall at either end (the pop door and window on the left); a wide screen sees it all. "Back to the farm" (or the morning) brings you out; everyone is still in bed.
- How: a separate scene and camera (`inside` in `src/main.js`: `openInside()`, `closeInside()`, `updateInside()`,
  `insideTap()`, `insideFrameCamera()`); the birds are lent to it and given back. Labels stay on screen and clear of the title.
- Tests: `insideshot.mjs [out] [hour]` (every coop: inside with everyone asleep, a cuddle, a drag to the nest boxes, eggs
  collected, back out), `insidedbg.mjs COOP OUT [x y dist yaw]` (a close look), `insideclip.mjs PLOT FPS OUT` (frames of a
  visit for a video).

## The coop doors at night (22 Oct, the first of Audrey's night activities)

- Each house's pop door has a sliding door (`popdoor_<style>` in `coops.glb`, `pop_slider()` in `stylized/coops.py`, about
  430 triangles): three boards with a Z brace in the house's colours (red with a white Z on the Red Barn, oak on the thatched
  cottage, blue with a white Z on the stone cottage, brown with a cream Z on the lodge; the pagoda's a red lattice over
  paper, like its nest screen) and an iron ring to pull it by. By day it is up out of sight: the browser draws it cut off at
  the opening's top (`doorShader()`: a per-door slide, `doorSlide`, and anything above the opening discarded), as if it ran up
  inside the wall, so the houses look exactly as before. All of a style's doors are one batch, drawn only when one is down.
- At night, once every bird of a coop is in bed, a badge over its door (a little door with a moon) asks for it to be shut:
  tap the door or the badge and it slides down ("Door shut. Sleep well!"). Before everyone's in: "Not everyone's in yet:
  Rupert is still out" (names); by day: "The door stays open in the daytime".
- In the morning the birds wait inside while it's shut, and the badge shows a sun: tap and it slides up ("Good morning! Door
  open"), and out they come as usual. If nobody opens it, it opens by itself at 7:30, so they're never stuck in.
- Inside the coop the same door is on the left wall: up (the night showing through) or down, and a tap on it shuts or opens
  it too. In the morning with it shut you stay inside ("Morning! Tap the pop door to let them out."); open it and everyone
  gets up.
- Later (the fox): a coop left open at night is the one the fox visits.
- Tests: `doors.mjs [out]` (every coop: the moon badge at 23:00, a tap shuts the door; at 6:36 everyone waits with a sun
  badge; a tap opens it and they come out; it opens by itself at 7:30; by day a tap leaves it open; at 22:15 "Not
  everyone's in yet"; inside, the door up, a tap shuts it; no page errors), `insidepan.mjs [out]` (both ends of the inside
  view and the badge), `doorclip.mjs PLOT FPS OUT` (frames of an evening and a morning at one coop). The page has
  `__farm.doorTap(plot)`, `setDoor(plot, open)`, `doors`.

## The fox family (22 Oct, Audrey: the fox "as a proper character of the game")

- Audrey (22 Oct 08:55): the fox is a proper character; sometimes he attacks the chickens, sometimes he just plays in the
  fields with other foxes and his babies. He never kills a chicken; instead a frightened hen sometimes decides to leave the
  farm (rare), and she can come back, though it isn't guaranteed. Protection: stay up at night and send the farmer when you
  see the fox, or keep a couple of geese or a dog (proper characters too; she chose: either guards the whole farm). After a
  night attack, a funny replay in the morning. Order (her choice): the fox family first, then the night visit and sending the
  farmer, then geese and the dog, then the morning replay; the rules (how often, hens leaving, buying geese or a dog) join the
  game with step 4.
- Models (`stylized/beasts.py`, exported by `stylized/export_beasts.py` to `models/beasts.glb` + `beasts.json`): a red fox
  (about 0.55 m to the top of the head, 2,800 triangles) and a cub (a little over half the size, bigger head, shorter legs
  and muzzle, bigger eyes, browner, 1,800), from smooth metaball shapes; bones root, hips, chest, neck, head, three in the
  brush and two in each leg (weights worked out by the exporter, the leg tops and tail root joined to the body); the coat's
  pattern painted per vertex (darker back, white bib, belly, cheeks and tail tip, black socks, ear tips and ear backs).
  `models/fauna.glb`: the den (a grassy bank under the edge of the wood with a dark round entrance, a fan of dug earth,
  roots and stones).
- `src/beasts.js`: the foxes wear the birds' fur (the same material and shell builder, `addFur`, 12 layers; body 3.4 cm,
  brush 6.8 cm, face, ears and legs short; the cubs 2.7 cm and fluffier: less combed, longer underneath). `Quad` poses a four-legged body from a few numbers: a trot (diagonal pairs)
  blending into a bounding gallop, crouch, sit, lie (brush curled round), play bow, rearing up to box, the pounce in the
  air, nose-down in the grass, on its back kicking, a scratch, a shake, a head tilt, the brush on a spring.
- The family (`FoxFamily`): Rusty (the dad), Fennel (the mum) and three cubs, Sorrel, Nutkin and Tumble. Every 10-20
  minutes by day they come up out of the den one by one and play in the meadow for 5-7 minutes, then go back in. The cubs
  chase each other round the meadow and tumble over at the end, wrestle (rearing up and boxing, then one on its back
  kicking), chase their own tails until they're dizzy, chase a butterfly and land nose-first in the grass, stalk and
  pounce on their mum's tail, trip head over heels, play-bow; Rusty listens for mice (head tilted one way, then the other),
  springs up and dives nose-first into the grass, stays stuck a moment with his brush waving, pops out, shakes and sits
  looking puzzled; he also plays dead on his back while the cubs bounce round him; Fennel sits and watches, grooms, lies
  down, and pounces now and then. Tap a fox: its name, a hop and a play bow. "Foxes" at the top (shown while they're
  out) takes the view to them. `?foxes` brings them out at once and keeps them out. At night they stay in (for now).
- 22 Oct 09:50, Audrey: "Good first version of the fox but they are clipping quite a lot with each other and with their
  home", the video "a bit blurry", and "Can I have a line up view of the foxes too? Want to make sure they look nice and
  fluffy!" So:
  - Bodies: each fox is three circles on the ground (chest, hips, head) along its heading (head nearer when sitting or
    rearing); overlaps between foxes are pushed apart six times a frame, and they're pushed out of the den's bank, the
    bushes and the tree trunks round the meadow (`collide()`); a fox up against a bush or the den doesn't get pushed into
    it, the other one gives way. Only two foxes playing together (wrestling, chasing, a cub pouncing on mum's tail, cubs
    bouncing round dad) may touch a little. Meadow spots are picked clear of the bushes; a cub only chases its tail with
    room to spin; the follower in a chase keeps a body length behind.
  - The den: they come out of the entrance itself, low and crouched, rising onto the dug earth, and go in the same way,
    sinking as they go through; they walk to a spot in front of it first (close enough with others in the way).
  - Which way the brush lifts was the wrong way round in some poses (sitting, lying, the bow, rearing, crouching, in the
    air): now it curls on the ground when sitting and lying, and goes up for a play bow.
  - Fluffier (see above). `?lineup=foxes`: the family in four short rows for a phone held upright: Rusty and Fennel, the
    three cubs, then Rusty sitting and Fennel lying down, and the cubs in a play bow, on its back kicking and up on its
    hind legs; they breathe, look round and wag; tap one for its name.
  - Videos at twice the resolution (`DPR=2` for `foxclip.mjs`).
- Tests: `foxtest.mjs` (out with ?foxes, all five in the meadow, a minute of play, three minutes checked every half second
  for bodies through each other or through the den, a bush or a trunk, the button, a tap, home again, in at night, no
  page errors), `foxline.mjs [out] [hour]` (the line-up and close-ups), `foxpose.mjs [out] [fox] [heading]` (every pose close up), `foxshot.mjs`, `foxclip.mjs SECONDS FPS
  OUT [size]` (frames following the family). The page has `__farm.foxes()`.

## The fox's night visit (22 Oct, the next piece in Audrey's order: "the fox's night visit to a coop (a coop left open is the one it goes for) and sending the farmer when you see him")

- Late at night (23:00-4:30) Rusty slips out of the den alone (`src/nightvisit.js`, `NightVisit`; the family's `nextTask`
  and `tapped` hand him over while he's out) and trots off to a coop whose birds are all in bed: one with its pop door
  left open if there is one (nearer ones likelier), otherwise a shut one. In the test page: a first visit 2-4 minutes
  into a night, then every 15-30 minutes; `?visit` starts one at once (at 23:30 unless `?time` says) and another 25 s
  after each, `?visit=N` sends him to coop N; automated tests only get one with `?visit`. How often, and what a fright
  does to the hens, join the game with step 4.
- The way there (`NavGrid`, 25 cm cells over the village, A* then straightened with a margin either side): round tree
  trunks, bushes, rocks, every prop and building (by its model's box, not the bridges, dock, wheat field or mushrooms),
  every pen and plot, the den, the pond and the streams. The footbridges are crossings: their rails block, and a link
  joins their two ends, so he lines up and walks straight along the middle, rising and falling with the arched deck
  (`groundY`, the deck's height measured from the bridge model). He trots, and slinks low and slow for his last 3 m.
- At the pen he leaps the fence from whichever side is quickest to reach (left, right or front: a crouch, a spring, a
  soft landing), crosses the yard round the feeder, water, hay and anything in front of the house (a small grid in the
  pen's own frame, `penPath`), and creeps up the ramp (lifted to its height and tipped to its slope, `lean`) until his
  nose is at the pop door. The door's moon badge hides while he's there, so he stays in view.
  - Door open: a sniff and a hopeful wag, then the hens' flurry: feathers in the breed's colour burst out of the pop door
    and the nest window and flutter down, "!" marks over the house, "Squawk! Squawk!"; a peck on the nose (a little star),
    he hops back down the ramp, turns round to face you and sneezes, a feather stuck on his nose, sits puzzled, tries once
    more, gets pecked again and trots home (over the fence, along his way, into the den).
  - Door shut: he sniffs along it, scratches at it ("The door is shut!"), sits back puzzled with a "?" and tries one more
    open coop if there is one, or goes home.
  - The fox never harms a hen. While he's on the ramp the door can't be shut on his nose ("Rusty's nose is in the way!"),
    and the coop he's visiting can't be gone into ("Rusty the fox is at the door!").
- While he's out the "Foxes" button turns red, "Fox!", and takes the view to him, and "Send the farmer" shows at the
  bottom. The farmer himself comes later (with the farmer piece), so for now it's his torch you see in the dark (`Torch`):
  a glow bobbing at hand height down the paths from the farmhouse at 2.1 m/s (the same grid finds his way), its beam a soft
  fan on the ground swinging with his steps. About 3 m from Rusty with a clear line, it shines on him: "Shoo! Off you go,
  Rusty!", a "!" over Rusty, a jump of surprise (on the ramp he slides down first), and he runs home (a trot round sharp
  bends, so he doesn't swing wide); the torch goes back to the farmhouse and fades. Hints: "Rusty the fox has slipped
  out of his den…", "The farmer is on his way with his torch…", and when he's home "Rusty ran home. The hens can go back
  to sleep." / "Rusty went home with a feather on his nose." / "Rusty went home: the doors were shut."
- Texts: English, and French with `?lang=fr` (only this visit's texts so far; the rest of the page is still English until
  step 4).
- Tests: `visittest.mjs` (an open door at coop 5: there, pecked twice, home; shut doors: scratched, home; the farmer sent:
  shooed, home, the torch gone; a visit to each of the 10 coops with the farmer sent on half of them at different
  moments, on the way, at the door and on the ramp; every half second his way is checked against the grid (bridges
  allowed) and, in the pen, against the feeder, water and hay; the buttons; no visit by day; no page errors),
  `visitclip.mjs PLOT SECONDS FPS OUT [size] [farmerAt] [shut]` (frames following him), `visitshot.mjs OUT [plot]`
  (pictures: the feather, the shoo, a shut door; `LANG=fr`), `visitvideo.mjs OUT [plot] [fps]` (the video: out of the
  den, a cut to the coop, the farmer tapped; `OUT_taps.json` says where the tap was). The page has `__farm.visit()`
  (`start(plot)`, `sendFarmer()`, `log`) and `__farm.onBridge(x, z)`.

## The foxes rebuilt (22 Oct evening, Audrey: "the fox is still clipping with objects. Also his jumping and other moves are not super natural", then on the line-up: "The details of the eyes are missing, as well as the ears they could be better. The movement of the body is not fluid, the legs are not folding, the tail is a bit too straight. I'd say the fur is good just slightly blurry"; and she loved the feather staying on his nose)

- The model (`stylized/beasts.py`, `export_beasts.py`; `beasts.JOINTS` now 21 bones):
  - Eyes: almond-shaped, set into the skull where a ray from the head's middle meets its surface (`surface()`), looking
    forward and a little out with the outer corner raised; a dark rim (an ellipsoid just behind the iris, so only its edge
    shows), an amber iris (the cubs' darker), a slit pupil (the cubs' round) and a catch-light standing a hair proud of it.
    The head's colouring adds a dark ring round each eye and the fox's tear line down the side of the muzzle (pivots
    `eyeL`, `eyeR`). The face (front of the head above the cheeks) gets short fur (region crest) so the eyes stay clear;
    the cheeks' ruff and the back of the head keep the long coat.
  - Ears: cupped rounded triangles (`ear_shell()`), bigger and more upright: the back (coat, black above an orange base,
    black tip), a dark hollow inside, and a pale strip of fluff along each inner edge (region down, 1.8 cm). Built as
    separate pieces so the colours can't smear. (Painted by numbers first, the hollow ended up hidden in the head's fur
    and the ear looked grey.)
  - Legs: three bones each: front shoulder `FLu`, elbow `FLl` (behind the shoulder), wrist `FLw`; hind hip `HLu`, knee
    `HLk` (forward), hock `HLl`; the paw's toe pivot `FLp`/`HLp`. Weights along the chain, blended at the joints.
  - The brush: four bones (`tail1`..`tail4`), rising from the hips, arching down and back, the white tip turning up.
  - Budgets 4,300 triangles (fox) and 3,400 (cub), the eyes and ears kept whole.
- The movement (`src/beasts.js` `Quad`):
  - Feet are placed and the legs reach them (`reach()`: two-bone reach for the upper bones, elbow back and knee forward,
    the last bone pointing as asked): standing, every step, crouching, sitting, lying down, the play bow and landing fold
    the legs by themselves, the feet staying on the ground. A step: on the ground and moving back as fast as the body goes
    forward (no sliding), then lifted, the paw curled back, and swung forward (the trot's diagonal pairs blending into the
    gallop). Sitting: the hind feet come forward under the body with the long foot laid flat; lying: front paws out in
    front, hind legs folded under. Legs in the air are posed joint by joint: rearing up, the leap (front legs folded up
    going over, then reaching for the ground; hind legs pushing off, then tucked, `airPh`), nose-down after a dive, kicking
    on his back, the scratch.
  - On a slope (a ramp, a bridge's deck) the ground under each pair of feet (`groundF`, `groundH`, where the tipped body
    puts them) and its steepness (`slopeF`, `slopeH`) come from the visit, and the paws stand on it, laid along it.
  - The spine bends into turns, the head stays steady at a gallop; turning on the spot the feet step round.
  - The brush: each part follows the one before it a moment later (springs, `tY`), so it sways in a wave, trails along a
    turn, hangs lower at a trot and lifts when excited; it curls round when sitting or lying, on either side (`curl`).
  - The fur: the painted hair drawn a little larger on the foxes (locks 0.11, cubs 0.075; Silkies untouched), crisper.
- The night visit (`src/nightvisit.js`):
  - The jump: gathering low, a parabola 0.7 m high, nose up then down, legs as above, a landing that folds the legs. The
    spots outside and inside the fence are about a metre from it, so his nose and brush clear it.
  - At the door only his nose and muzzle go in, head low, so his ears stay outside under the top of the doorway; head down
    as he nears it on the ramp.
  - Up to the ramp from straight behind it (no turning on the spot with his brush sweeping round); the yard's grid keeps him
    off the fence and round the ramp's sides.
  - In the yard he lifts his brush clear of whatever it would brush past (hay bale, feeder, water dish, ramp, fence:
    `brush()` looks where it is and where it's swinging to); sitting down to sneeze he picks, of a few ways facing the
    player, the one where his brush curls onto clear ground, stepping aside first if he must (`sitSpot()`).
  - `visitcheck.mjs [plots] [farmerAt]`: every other frame of a visit, his posed body (every third point, skinned) in the pen's
    frame against the fence (2 cm from its line, below its top), the house's walls (except through the pop door), the
    ramp's plank, and the hay bale (30 cm), feeder (44 cm) and water dish (7.5 cm). Before: up to 12% of frames touching
    something at a coop (nose and brush through the fence, ears into the wall, paws into the ramp, brush through the hay).
    After, at all 10 coops: none through the fence or the house; 66 frames in about 14,000 (0.5%) where the brush tip
    grazes the hay bale or the water dish for a moment, or a toe tip the edge of a ramp.
  - `foxhead.mjs OUT [who] [size]`: close-ups of a fox's head at four angles.

## The den, smoother moves and faces (22 Oct night, Audrey: "The fox is clipping when it goes out of his house. Everything is better but I think you can take it further by removing clipping, improving the fluidity of the moves to make it natural, and improve the face and facial expressions please")

- The den (`stylized/beasts.py` `den()`, `DEN_TUNNEL`): a bigger bank (about 1.9 x 1.5 m, 75 cm high) with a real tunnel cut
  into it (a boolean of a tilted cylinder, 60 cm wide and high, its floor at the ground at the mouth and lower at the back),
  dark inside. The ring of earth round the mouth is gone (the foxes' legs went through its lower half); the dug earth in
  front is flatter; the roots lie on the bank (each point dropped onto it with a ray) and go into the ground where the bank
  meets it, down its sides, none across the entrance; the stones sit at the sides. 3,000 triangles.
- Coming out and going in (`src/beasts.js` `FoxFamily.emergeTask()`, `inTask()`): each fox starts deep in the tunnel,
  crouched low with its ears back and head down, darker the deeper in (`Quad.shade()`, the coops' indoor shading in the
  den's frame), and walks out, rising as it clears the mouth, ears coming up, eyes wide, trotting off once its head is out.
  In single file: no fox appears until the one before is clear of where it will be, and one coming up close behind waits a
  moment (`occupied()`: any other fox's body or brush on the tunnel's line). Going home, one fox at a time heads for the
  doorway (round to the front first, never across the bank's side); the rest wait in their own spots beside the bank
  (`waitSpot()`, the nearest free one), sit and watch the mouth, and follow one by one, close behind but never into the one
  in front. The tunnel is long enough that a fox is fully inside when it appears and disappears.
  - `denclip.mjs [rounds]`: every other frame of the family coming out and going home, every second point of each fox's
    posed body against the den's earth (mapped as 2 cm columns of the surfaces a ray down meets): none in the bank near the
    mouth; deeper in (dark, behind the bank) only the brush tip behind the tunnel's end and the ears touching its roof at
    the back.
  - `denfilm.mjs OUT [size] [every]`: a strip of pictures of them coming out and going in, close up.
- Smoother moves (`src/beasts.js`):
  - Turning eases in and settles (an angular speed that builds up and slows down, `Fox.turnTo()`); speeding up and slowing
    down are gradual, slowing to arrive unless more of the way follows (`moveTo(..., through)`; paths go through their
    middle points without stopping).
  - The legs' gait comes from how fast the fox really moves, whatever moves it (walk, trot, gallop blended by speed; the
    stride matched to the distance covered so the feet never slide); turning on the spot, the feet step round.
  - Leaning into a turn at a trot or a run, on flat ground.
  - The brush is kept off the ground (crouching low, slinking): lifted at its root just enough; held low and straight with
    the tip curving up when crouched.
  - On a ramp or a bridge each foot finds the ground where it is in its stride (`groundAt`), so a front foot on the ramp's
    edge doesn't sink into it while the other is still on the grass.
  - Foxes keep apart with their fur counted (wider when lying or rolled over), and a fox steps off another's brush
    (`circles()` now has the brush, out behind or curled round to the side; brush against brush is let be).
- The face (`beasts.py` joints `jaw`, `earL`, `earR`, `blinkL`, `blinkR`; `export_beasts.py` paints the inside of the mouth):
  - Ears: pricked forward (alert, curious, slinking up), flattened back and out (frightened, squeezing in, running flat out,
    the yelp, a yawn), one each way (puzzled, dizzy), swivelling to a sound (`earLTw`/`earRTw`) and towards where he looks.
  - Eyes: a blink every few seconds, narrowed (sly, grooming), screwed shut (diving in the grass, the shake, the yelp, the
    sneeze, playing dead), half shut dozing, wide (alert, a pounce, startled by the torch); one opening for a peek (`winkL`).
  - Mouth: the jaw opens (up to about 50 degrees) on a dark mouth with a pink tongue (the roof of the mouth under the muzzle
    is painted dark and furless; the jaw's top is the dark floor), with a dark lip line: panting after a run, the play
    grin, play bites when wrestling, a big yawn before dozing off, the snap at a butterfly, "Yip!" when pecked, the
    "ah... ah... choo!", tongue lolling when playing dead, a sniff at the door.
  - In the night visit: sly and intent creeping up (ears forward, eyes narrowed), eager up the ramp, sniffing and hopeful at
    the door, wide-eyed shock at the flurry, the yelp, sorry for himself walking off, the sneeze, puzzled (one ear up, one
    back), ears flat and panting running home, startled by the torch.
  - `faces.mjs OUT [who] [size] [angle]`: the faces as the player sees them at the closest zoom on a phone, cropped round
    the head (neutral, alert, sly, yelp, yawn, play, puzzled, dozing).
- `visitcheck.mjs` after this: none through the fence or the house at any of the 10 coops; 45 frames in about 15,000
  (0.3%, was 0.5%) where the brush tip grazes the hay bale or the water dish, or a toe the edge of a ramp.
- `foxtest.mjs` counts brush touches apart (up to 0.6 of the circles' overlap: fur brushing fur), taps whichever fox stands
  clearest on screen, and allows 30 s for all five to go home one at a time.
- The back legs (22 Oct 21:10, Audrey: "The back legs of the fox are weird"): they read as round drumsticks hanging under
  the body, folding like a frog as they swung forward and going straight as a stick when pushing off. Now: a slimmer thigh
  with a broad flat haunch that is part of the body's outline, the hock higher (12.5 cm) and a longer straight foot below
  it; a hind foot lifts less and folds less as it swings (the hock flexes, the paw stays low), the heel comes up first at
  the end of each step, the hind knee never quite straightens, and steps are shorter creeping low (`Fox.update` stride).
  `visitcheck` after: 39 frames in about 15,000 touching (brush tips on the hay, the dish or the fence for a moment).
- Then (21:22, Audrey: "The angle of the back leg is not correct it's currently towards the inside but it should be the
  other way around"): the bend you saw pointed forwards (the knee, low under the belly). Now the knee sits high in the
  haunch and below the body the leg angles back to the hock (14 cm up, 10 cm behind the knee) before the foot comes down
  to the paw: the visible bend points backwards, as on a dog. `visitcheck` 37 frames; `denclip` none near the mouth;
  `foxtest` taps a fox that no other fox's tap sphere covers.
- Then (21:27, "The 2 first ones are still wrong": the first two moments of the walk): there the hind foot had just come
  down well forward of the hip, so the shin stood upright under a forward knee. Now the knee is tucked higher in the haunch
  (6.5 cm below the hip) above a longer shin, and a hind foot comes down about under the hip and pushes off well behind it
  (a front foot reaches forward and leaves under the shoulder; the steps' range shifted, `dz += amp * (front ? 0.3 :
  -0.5)`), so the hock points back at every moment. Checked in a true side view with the joints drawn on.

## The pounce and the bumping (22 Oct 21:43, Audrey: "When the fox jumps it falls on his head. Also the foxes keep bumping into each others that's a bug")

- The mouse pounce (`mousePounce()`): no more nose-first into the grass (a nose-dive of 75 degrees and more). Now a high arc
  with the legs as in the fence jump (`airPh`), nose up off the ground and level by the landing, coming down on the front
  paws, pinning the grass (the play bow's front: paws forward and flat), nose down between them sniffing, ears pricked,
  the brush up and waving; then up, the shake, the puzzled look. He doesn't spring if another fox is where he'd land
  (waits crouched, gives up after 2 s). The cubs' pounce on mum's brush and the snap at the butterfly land the same way.
  `pounceTask()` starts one (for pictures).
- Bumping: the foxes only kept apart by being pushed once they touched (`collide()`), so they walked into each other all
  the time: 430-710 frames a minute with two foxes not playing together pushed apart. Now a fox sees another in its way in
  good time and bends its path round it, slowing or waiting if it's right in front (`moveTo()`), giving foxes at play
  (wrestling, rolling, chasing...) more room; strolling to a spot where a fox already stands, near enough is there (never
  at the den's doorway). One cub after the butterfly at a time, and one at mum's brush. A play bow reaches further forward.
  Now 25-45 frames a minute with a push (`bumps.mjs`), mostly a brush against a fox bowing to play or one passing a chase.
- `foxtest.mjs` counts the bumps (pairs pushed apart, per minute; up to 100). The butterfly flies the same way every time
  (it started at a random point), so play is the same from one run to the next, apart from the real time the page runs
  before a check pauses it.
- On his back (22 Oct 22:08, Audrey: "Sorted ! Now just when the fox puts himself on his back it's a bit odd his neck
  should be aligned straight with his back"): rolled over, the neck kept its standing angle (rising 52 degrees from the
  chest), so upside down the head was bent down into the grass. Now, as he rolls, the neck comes down level with the
  spine and the head turns back so the nose points straight on (`rolled`: neck +0.85, head -0.75), with only a little turn
  of the head left (looking about, tilting) while he's on his back. Playing dead, the cubs on their backs wrestling and
  the roll all use it.

## The geese: their look (22 Oct night, Audrey: "Start now, use what you learnt from the previous animals you created: clipping, fluidity, natural movements, details of the feathers. The geese can be funny creatures")

- Two characters: Gertrude, a big white Embden goose (the boss: blue eyes, orange bill with a pale nail), and Hector, a grey
  Toulouse gander (longer and lower, a paunch, a dewlap under his bill, dark eyes with an orange ring; dark head and neck,
  grey back and wings with pale-edged feathers, pale breast, white belly and under the tail). He follows her and copies
  her, a beat late (the behaviour comes next). About 0.8 m to the top of the head (Hector a little lower).
- Model (`stylized/geese.py`, exported by `stylized/export_geese.py` to `models/geese.glb` + `geese.json`): the body and the
  long S-shaped neck in one smooth shape; the head; the bill (upper bill with nostrils and nail, lower bill on the jaw with a
  pink tongue, the mouth dark inside); eyes with a ring; the folded wings (a smooth panel of coverts on each upper flank,
  the long flight feathers lying back over the rump); the open wings (a slim arm, three rows of coverts like roof tiles,
  nine secondaries, eight fanned primaries, all modelled feathers); a short tail fan; the feathered thighs, the orange
  shank (the heel's bend points back) and the webbed foot (three toes, the web scalloped between them, claws). 21 bones:
  body; neck1..neck4 and head; jaw; blinkL/R; wingL/R (folded) and wingLo/Ro (open); tail; per leg the hip (thigh), the
  heel (legLk) and the foot (legLf). About 11,600 triangles each before the fluff.
- The feathers: everything about them decided by the exporter per vertex: the colour, the pattern drawn on each feather
  (Hector's grey with a pale edge, Gertrude's white a shade darker where the next one overlaps, a soft sheen on the long
  ones), and the neck's own lattice: the rows of small feathers follow the curved neck (`_GN`: across, forward of the
  neck's line, how far up it), the body's rows go back along the body round its middle. The birds' feather drawing
  (`birds.js`, `GOOSE`) draws them softer than a hen's (the rows a gentle texture), with a slight fluff over them.
  (A goose material of its own, `gooseMaterial()`; `addFur` now keeps any extra attributes. WebGL allows 16 attributes per
  vertex: the body's lattice uses the rest position, only the neck's comes as its own attribute.)
- `src/geese.js` `GooseRig`: the waddle (feet placed on the ground and the legs reaching them, the body rolling onto each
  foot, the neck swaying against it so the head stays steady), the neck's shapes (tall, honking with the bill up, stretched
  out low to hiss and charge, grazing, preening round to one side, tucked away asleep), the neck reaching so the bill's tip
  comes to a chosen point (`neckTo()`: each joint turned a little at a time, the head first: grazing at a spot, preening a
  wing, the bill tucked into the back feathers asleep), the bill opening, the eyes blinking, the folded wings lifting and
  the open ones growing from the shoulder and flapping, the tail wagging on a spring, sitting down.
- `?lineup=geese`: both geese in a row of poses (standing, walking, honking, grazing, preening, flapping, hissing,
  asleep). `geeseshot.mjs OUT [size]`: each goose in each pose, close up and framed on her own.
- Second look (22 Oct 22:55, Audrey: "That's quite good. Feathers need improvement, the wings needs work to be more
  realistic. Overall I don't instantly guess these are geese maybe the beak can be reviewed. Do not forget the eyes"):
  - The bill: a goose's big wedge (`bill_loft()`: a smooth loft of cross-sections), deep at the base where it meets the
    face, its top running on from the forehead and sloping to a broad rounded tip with a pale nail; the lower bill under it,
    a thin dark line between; small oval nostrils. The head longer with a flat crown; the neck thicker and even; Hector's
    neck shorter (`neck=0.86`) and his dewlap smaller. Gertrude carries her breast high (`stance`), Hector level.
  - The eyes: bigger, standing proud of the head's soft feathers, a clear iris (Gertrude's pale blue, Hector's dark brown),
    a round pupil, a bright catch-light, a ring of bare skin (Hector's orange).
  - The feathers: small and fine on the breast and belly, broad on the flanks and back (`featherSize` by where they are);
    the neck's and head's much smaller (velvety) with the furrows a goose's neck has (ridges running down it, in the
    drawing); the head feathered like the neck.
  - The folded wings: real feathers lying on the smooth bed of coverts, following its curve (`panel_feather()`): a row of
    greater coverts, nine secondaries and tertials whose tips make the wing's scalloped lower and back edge, the pointed
    primaries over the rump.
  - The open wings: the arm out and a little forward to the wrist, the hand angling back (its own bone, `wingLh`/`wingRh`:
    folded back while the wing opens, and following the arm a moment later when flapping), three rows of coverts tucked
    under a smooth leading edge, ten secondaries, nine long pointed primaries, the wing arched (feathers curving down).
- Third look (23 Oct 09:11, Audrey, from her iPhone: "Why do all of them have a wing out? Wings are missing feathers as
  they have empty parts. The feet are not connected to the right part of the leg. The number 6 the wings are turning like a
  windmill that's not ok. Can the eye be a bit bigger and they need a tail. Remember they need to have a fun personality"):
  - The wing out, the loose feet, the missing tail and the windmill were her phone keeping last night's goose model and
    using it with the new code (the bones numbered differently: the open wing followed the folded one, the tail and legs
    followed the wrong bones). Reproduced here exactly. Now every published version asks for its own files: `build.sh` stamps
    `app.js?v=...` in the page and the code adds the same `?v=` to every model it loads (`BUST`); `initGeese` warns if the
    model's bones don't match the code.
  - The folded wings lie snug on the body (`onbody()`/`lay()` in `geese.py`: everything placed by casting onto the body
    and raised off it a little): a smooth bed of coverts blending into the body at its edges, a row of greater coverts,
    secondaries and tertials lying back flat (their tips the scalloped lower and back edge), the primaries coming out from
    under them and crossing over the rump. (The tertials were raised too far, which drew a dark line along the back.)
  - The open wings are whole: a smooth leading edge (`tube()`), a thin bed behind it on the arm and the hand (`sheet()`),
    two rows of coverts, 13 broad overlapping secondaries (the inner ones longer, turned in to meet the body), the hand's
    coverts and 10 primaries fanned from pointing back to pointing out, each overlapping the next (`wing_feather()`: lying in
    the wing's plane).
  - The flap: most of the beat above level (as a goose stretching), about two beats a second, the hand following the arm
    a moment later and folding back a little on each upstroke (no more spinning). `cloak`: wings held half open, raised at
    the wrist with the hand folded back down (hissing, puffing up big).
  - A real tail: ten broad stiff feathers in a fan tipped up and cupped, sticking out from a stern-shaped back end (the
    belly curving up under it, the back sloping down to it); it wags on its spring and lifts when she's excited (`tailUp`
    lifted it the wrong way before).
  - Bigger eyes (a fifth bigger); thicker shanks; broader, darker webs between the toes.
  - About 14,000 triangles each.
  - Personality, in the line-up (each goose on her own clock, Hector a beat behind Gertrude, copying her): standing, she
    turns to give you a good look with one eye, head tilted (`tilt`), does a double take, nods and waggles her tail;
    honking, a breath in, chest out and three honks with the wings lifted, then a pleased waggle; grazing, she pops up with
    a start to check round, then back down; preening, then a big shake of every feather and a look as if to say "what?";
    the wing-flap stretch up on her toes, then a shake; hissing, the head swaying like a snake; asleep, she peeks now and
    then. Tap a goose: she turns to look at you and honks twice, then waggles her tail; her name and breed show (French with
    `?lang=fr`: "oie d'Embden", "jars de Toulouse").
  - Tools: `gphone.mjs` (the line-up at phone size), `goosepose.mjs OUT kind 'POSE' views size` (one goose in a set pose
    from any side: game, side, right, front, back, top, az:el; CLEAN=1 hides the rest of the village, DY moves the view up or
    down, NP tries other neck shapes), `geesefilm.mjs OUT poses` (frames of each move with both geese, pose:cycle:start:secs),
    `geesetap.mjs` (tap test, both languages).
- The shake (23 Oct 10:57, Audrey: "Much better. When they shake, the feet should not move, just the body"): the legs
  only bent in their own side view, so when the body rolled the feet swung with it (about 10 cm and tilted 12 degrees). Now
  each hip also swings the leg out to the side as far as the foot is from under it (`legL/R` turn 'ZYX', the side swing
  last), and each foot is set flat and facing her way whatever the body does: planted feet stay put (half a millimetre)
  through a shake and the waddle's roll. `shakefeet.mjs` measures it.

## The geese on the farm (23 Oct, Audrey on the shake fix: "Yes all goog")

- Gertrude and Hector live round the pond in the middle of the village (`GeeseFlock` in `src/geese.js`, built by
  `buildGeese()` in `main.js`; `?geese` starts the view on them). They walk the village grid (the same `NavGrid` as the
  fox's night visit, now one shared grid, `navGrid()`), round bushes, benches and lamp posts, never into the pond on foot.
- Their places (`places()`): the grass round the pond, in the parts the two streams cut it into (`regions()`: cells
  reached from each other without a footbridge): a goose strolls only on her own side; to get to the other side she
  swims across. 38 ways into the water from the bank (clear of the dock and the streams' mouths), 60 spots to stroll to,
  and their bed: two places side by side a little back from the water, with room all round, marked on the grid so the fox
  goes round them.
- Gertrude decides (`nextLead()`): a stroll a few metres off (then a look round), grazing (nibbling, now and then up with
  a start to check round, a couple of steps on to fresh grass), a swim (wading in, gliding to a few places, dabbling with
  her bill in the water, out again, possibly on the other side, a shake and a preen), a drink at the edge (bill dipped,
  head raised to swallow), preening one wing then a shake, a rest sitting down (sometimes dozing, head tucked), a
  wing-flap stretch, a honk. She calls Hector with a honk if he's more than 4.5 m away.
- Hector (`follow()`): in her footsteps a little behind (her trail, so never through anything), hurrying when she gets
  ahead, running with his wings out flapping if he's left far behind; when she stops he comes up beside her, faces her way
  and does what she does, a beat late (`ACT`: each pose by seconds into it). His own moments: something catches his eye
  (he stares, head tilted, and honks at it); cheeky, he edges over to nibble right under her bill: she turns and hisses,
  wings half raised, and he backs off and stands there looking sheepish.
- In the water (`wetAt()`): lower and lower as they wade in, then floating (the water hides the feet, still paddling),
  gliding level with a gentle bob, the tail up; rings spread on the water round them. Shadows on land only.
- Their bodies never pass through each other (each body two round parts, breast and rump, eased apart), and they steer
  round each other in good time.
- Night (21:30-6:15): to bed (swimming over if it's across a stream), sitting side by side, heads tucked in, peeking now
  and then. Morning: up with a wing-flap stretch and a honk, Hector a moment later. (Guarding comes next.)
- Tap a goose on the farm: she turns to you and honks, her name shows (French with `?lang=fr`).
- Tests: `geeseday.mjs [minutes] [hour]` (never on a blocked cell of the grid or into the dock, Hector never far, bodies
  never closer than 0.28 m, a varied day; it counts the moments: in 20 minutes 3-6 hisses at Hector, 6-9 distractions,
  calls, swims, drinks, rests); `geesenight.mjs` (in bed within 5 minutes of bedtime, side by side, heads tucked; up with a
  stretch and a honk); `geesefarm.mjs` (frames following them; UNTIL=swim/scold, WET, BED, HOUR).

## The geese guard the farm at night (23 Oct, Audrey: "Perfect carry on")

- When Rusty is out on a night visit, the geese wake (`watchFor()` in `GeeseFlock`): a goose sleeps lightly, so she hears
  him within 14 m, or the hens squawking at any coop (his first peck at an open door), or wakes a while (35 s) after he's
  slipped out. "!" over them and a message: "The geese have heard Rusty! They're raising the alarm…" (French: "Les oies ont
  entendu Rusty ! Elles donnent l'alerte…").
- Gertrude (`guardTask()`): up on her feet, neck stretched tall, honking the alarm with her wings lifted; then a charge
  (1.25 m/s: neck stretched out low, wings out and beating, bill open, hissing) along her way round everything to him,
  replanned as he moves (while he's somewhere she can't reach, in a pen, the nearest place round him she can; never a
  straight line through things; over the footbridges if need be, up and over their decks). On him (1.7 m, or at the fence
  of the pen he's in) she stops and hisses with her wings raised: Rusty jumps in surprise, facing her, and runs home
  (`NightVisit.chasedBy()`, his flight as when the farmer's torch finds him, over the fence if he's in the pen). She goes
  after him a few steps, then a triumphant honk and a wing-flap stretch, walks back to bed and settles down again. Hector
  wakes a moment later, honks with her and charges along behind her. The night ends with "The geese chased Rusty all the
  way home!" ("Les oies ont chassé Rusty jusque chez lui !").
- The geese never run into Rusty (they give him 0.85 m when steering and step aside if he runs at them) and steering round
  each other never takes them into anything.
- `?noguard`: they sleep through it (the fox's own tests use it: visittest, visitcheck, visitvideo, visitshot).
- Tests: `geeseguard.mjs [coops]` (for each coop: the geese wake, Rusty goes home chased, never into anything (brushing the
  margin round a pen counted apart, under 3 s), never into Rusty, asleep in bed again after); `geeseguardfilm.mjs OUT
  coop secs fps` (the view on Gertrude and Rusty).
- The victory parade (23 Oct 12:56, Audrey: "After they chased the fox, the geese needs to be super proud and parade"):
  after seeing him off, Gertrude gives a victory honk with her chest puffed out, then a lap of honour (`lapOfHonour()`:
  three quarters of a little circle from where she stands, clear of everything) strutting with short high steps, chest out
  and up (`proud` in the pose: the body tipped back, the folded wings held a little out, a jaunty bob of the head with each
  step, more sway), bill in the air, tail high and wagging, honking now and then; Hector marches behind her just as proud.
  Then a ta-da: wings flung wide and beating, a great honk, the tail waggling, Hector beside her doing the same a beat
  later; then they strut off home. A message: "Victory! The geese are so proud of themselves, they're parading round the
  farm." ("Victoire ! Les oies sont si fières d'elles qu'elles paradent dans la ferme.").

## Biscuit the farm dog: his look (23 Oct, Audrey: "Go ahead with the dog", choosing a Border Collie, and "People should be able to choose the name of the dog, the default can be biscuit")

- The model (`stylized/beasts.py` `fox('collie')`, exported with the foxes by `stylized/export_beasts.py ../web3d/models` into
  `models/beasts.glb`; 7200 triangles): a Border Collie on the fox's frame and bones (same 26 joints, so every fox move works
  for him), 1.08 times a fox's size, longer and a little sturdier legs, a deeper chest and a level back, a strong neck, a
  broad rounded skull with a clear stop and a blunter muzzle, round brown eyes (a little bigger than a fox's) with a catch
  light, semi-pricked ears set wide on the skull with their tips folding forward, a long low plumed tail.
- His coat (`export_beasts.py`, `dog`): black with a narrow white blaze up between the eyes widening over the muzzle, the
  eyes and cheeks kept black round them, white muzzle, chin and throat, a full white collar, white chest, belly and socks
  (front legs from the elbow, hind from the hock), a white tail tip; the ears black, darker pink-grey inside. Fur
  (`FUR.collie` in `beasts.js`): a long silky coat with a thick ruff round the neck and chest, feathering down the legs, a
  plumed tail; short on the face so the eyes stay clear.
- He carries his head up, alert (a fox holds his lower); not when bowing, lying with his chin down or on his back.
- His name: Biscuit, unless the player chooses another. Tap him: his label ("Biscuit · Border Collie", French "Biscuit ·
  border collie") and a "Rename Biscuit" button ("Renommer Biscuit") for 6 s; it opens a little card ("Your dog's name" /
  "Le nom de votre chien", Save / Enregistrer, Cancel / Annuler); saving shows "Your dog is called …" ("Votre chien
  s'appelle …"). Security: the name goes through `cleanName()`, the game's own name check (no control characters or `<` `>`,
  spaces tidied, at most 20 letters, empty means Biscuit), on saving and again on loading; it's kept in this browser only
  (`localStorage` `ff3d.dogName`, read and written in try/catch, so private browsing still works for the visit) and only
  ever shown as plain text (`textContent`). When the dog joins the game's save, the same check goes in the save's checks.
- `?lineup=dog`: six of him in a few poses for a close look (standing, sitting, a play bow, lying down, happy (wagging,
  grinning, a tilt of the head), trotting round a little ring). Tap one: a hop and a play bow.
- Tests: `dogname.mjs [OUT]` (the name: tap, rename, the checks, kept after a reload, no pop-ups; LANG=fr), `dogshot.mjs
  OUT which heading size steps` (close pictures, HEAD=1 on his face), `dogfilm.mjs OUT secs fps [which]`.
- Fur and eyes (23 Oct 15:38, Audrey on her iPhone: "Looks good! Review the blurry fur and the eyes please they need to be
  more expressive"):
  - The coat: his strands drawn sharp (`crisp` in `FUR.collie`: in the painted-hair shader a narrower soft edge, kept to
    further away; stored as a negative `furStyle.x`, which the Silkies, foxes and chicks never have, so they're unchanged),
    bigger locks of hair (`locks` 0.32: strands a couple of screen pixels wide instead of a haze), 16 layers, a slightly
    lifted black (`#2b282a`) so the locks' light and shade show; short hair over the face (`face` 0.75, `faceR` 1.3) and
    kept clear round the eyes (`eyeClear`, `addFur`'s new `eyes`). `?dogfur=locks:0.4,crisp:0.9` tries other numbers
    (numbers and known keys only).
  - The eyes: bigger (1.27 times), fuller (less sunk into the skull), a warmer lighter brown, a big round pupil, a big
    catch-light and a small second one; the face's model given more triangles (`o['dec']`).
  - Eyelids: two new joints, `lidL` and `lidR` (`beasts.JOINTS`, the dog only; the foxes have the joints but nothing on
    them): each upper lid is part of a dome round the eye (`beasts.eyelid()`), round in its up-down section so turning it
    about the eye's across axis slides its edge over the eye without the lid moving off the face (`LID_OPEN` 70°,
    `LID_SHUT` -75°). The browser (`Quad.pose`, `this.lids`) closes them for blinks, squints and winks (instead of
    squashing the eye), and sets them by his mood from what he's doing: a little lowered when relaxed, more when happy
    (grinning) or intent (crouched: the inner corners down, the stare), the inner corners raised when interested (ears
    forward), pleading (lying with his chin down) or worried (ears back), one up and one down when puzzled (head tilted);
    `lidSoft` and `lidTilt` let a task set them. The line-up's first dog shows six faces in turn (`MOODS`: look,
    puzzled, happy, pleading, intent, sleepy); `dogmoods.mjs OUT` takes a close picture of each.

## Biscuit's day on the farm (23 Oct 17:00, Audrey on his eyes and coat: "Go on all good")

- His kennel (`stylized/beasts.py kennel()`, exported with the den into `models/fauna.glb`; `KENNEL` in both files gives
  its sizes): honey-coloured planks with grooves, a white trim up the corners and round the arched doorway, a terracotta
  roof like the farmhouse's with a ridge cap, a cream board over the door; his food bowl (kibble) and water bowl, blue
  enamel with white rims, beside it. In front of the farmhouse, left of the path, its door turned to the path
  (`main.js KENNEL_AT`). His name is written on the board (`dog.js nameBoard()`: text drawn on a little picture, so any
  name is only ever text) and changes when he's renamed. The village grid blocks the kennel and the bowls.
- `src/dog.js` `FarmDog`: Biscuit is the foxes' animal (`beasts.js` now shares `Fox` and its moves: one body, gait, face
  and set of moves for all of them), with his own day:
  - Bedtime 21:30 (before the hens), up at 6:15 (after the rooster). At bedtime he trots home, goes in through the doorway
    head down, turns round inside, lies down with a yawn and sleeps with his chin on his paws at the door, eyes shut, a
    "z" floating up now and then. In the morning: eyes open, a yawn, out he comes, a long stretch with a yawn, a shake,
    a look round.
  - By day, something different each time (never the same twice running), weighted by the time of day: his rounds (to two
    coops, where he sits outside the front fence watching the hens with his ears up and his tail sweeping, and one of the
    farm's corners for a long sniff; trotting there, nose down along the way now and then); a nap in front of his kennel
    (round on the spot, lies down, dozes 15-35 s, an ear twitching, then a yawn, a stretch and a shake; more after
    lunch); breakfast (first thing) and a meal now and then: crunching at his food bowl, a lick of the lips, lapping at the
    water; his ball (picks it up, tosses it with a flick of the head somewhere with room, watches it go crouched and
    wagging, runs after it, pounces on it with a play bow and picks it up again, two or three times; then carries it home,
    drops it in its place and lies down by it); playing (a tail chase, a roll in the grass, or zoomies round a loop flat
    out, ears back, grinning, then a play bow and a pant); sitting and watching the farm; and the geese (below).
  - The geese: he trots up to 3 m from Gertrude, then creeps in low with the herding stare (crouched, ears up, eyelids set
    intent, tail down); 1.5 m off he freezes, staring... and Gertrude has had enough: she turns on him, hisses with her
    wings up and honks, Hector honks along (`GeeseFlock.teasedBy()`). He bounces back ("oh!"), gives her a play bow and
    zooms off happily. If she wanders off first, he just sits and watches. The geese steer round him as they do round
    Rusty, and a goose in his way steps aside; he never goes through them.
  - Getting about: along the village grid (`NavGrid`, as Rusty), over the footbridges' decks, easing off round sharp bends
    so he doesn't swing wide into things; straight lines only in and out of his kennel and between his bowls.
  - The ball: red rubber with a white band, held in his mouth on his jaw bone while he carries it; when it flies it falls,
    bounces, rolls to a stop and comes off whatever it hits (never into anything).
  - Tap him: he turns to you, hops, play-bows and sits grinning and wagging, with the "Rename" button; asleep, one eye opens
    and his tail thumps.
  - `?dog` starts the view on him. `__farm.dog()` for the tests (`force`: what he does next).
- Tests: `dogday.mjs [minutes] [hour]` (never into anything outside his own kennel and bowls, never through a goose, his
  ball never into anything or far from home, a varied day, asleep in his kennel at night, up by day; HOUR2/AT set the clock
  partway, for the morning), `dogfarmfilm.mjs OUT secs fps hour [what] [skip]` (the view following him; HOUR2/AT, GEESE=1),
  `spotshot.mjs OUT x z size hour` (a still of any spot).
- Fixes (23 Oct 18:13 and 18:18, Audrey: "When he picks the ball he needs to literally grab it with his mouth, currently he
  barely moves his neck down. When he shakes, the legs need to stay on the floor. Same as the geese", then a screenshot of
  his head through his kennel's roof):
  - Grabbing: a reach for the mouth (`Quad.mouthTo()`, `s.reach`/`s.reachAt`; `mouthSpot()` is the point between his jaws,
    where the ball sits when he carries it): his shoulders go down and forward, the elbows bending (the chest bone lowered
    and tipped), and the neck and head bend down until his open mouth is round the ball; the jaws close on it and his head
    comes up with it. Also for eating and drinking (his mouth in the bowl). (The neck and head's limit was wrong: a joint
    over its limit went back to where it started instead of stopping there; the same slip is in the geese's `neckTo()`,
    left alone as their look is approved and their limits are rarely reached.)
  - The shake (and leaning into turns): the feet stay planted (`Quad.pose`): the rocking body's roll is undone for each foot
    on the ground, and the leg swung out sideways at the shoulder or hip to reach it (the upper leg bones turn in the order
    'ZYX', so the swing comes after the leg's bend), the knees a little bent to give room; each paw moves under a
    centimetre standing (half a centimetre is breathing), under two sitting. The foxes have it too. Test: `dogshake.mjs`.
  - The kennel is roomier (1.24 x 1.12 m, walls 0.68, ridge 1.12, a taller doorway) and he keeps under its roof: through
    the doorway and inside he ducks (`ducking()`: the same shoulders-down as the grab, head down, ears back), turns round
    low and curled the way he's turning, easing to the far side as his head comes round; lies down further in. Test:
    `kennelclip.mjs` (bedtime, the night and the morning: his nose, the top of his head, ear tips, back and tail tip never
    through the walls or roof; anything of him behind the front wall is inside or in the doorway).
- Tests: `dogclose.mjs OUT grab|shake frames per` (close films side on).

## The team effort at night (23 Oct 19:30, Audrey chose "Team effort" for who chases the fox, then "Perfect, next")

- The geese hear Rusty first and honk the alarm (as before). Biscuit wakes at their honking (a moment after), or when
  Rusty comes within 9 m of his kennel, or the hens squawk, or 45 s after Rusty's out (so with no geese he still goes):
  eyes open, head up, ears up, "Woof!" (a speech bubble, French "Ouaf !"); out of his kennel ducking under the doorway; a
  bark at the door and off flat out to Rusty along the village grid (replanned as Rusty moves; while Rusty's in a pen, the
  nearest place round it he can reach), barking. Whoever gets to Rusty first (2.4 m for Biscuit, 1.7 for Gertrude) sends
  him running home (`NightVisit.chasedBy(x, z, who)`); Biscuit chases him all the way home, barking, never catching him
  (at least 0.95 m, keeping about 2 m behind), while the geese charge along behind a little way. At the edge of the wood
  (3 m from the den) he stands planted, tail high and wagging, barking after him; then runs back to the geese.
- If Biscuit is up first (Rusty's visit near his kennel), the geese wake to his barking and come too: they hear him while
  he's barking at Rusty and Rusty is out (even already running), honk the alarm and charge after them. If they all wake at
  the same moment, one message for both.
- Somewhere you can see it: once Rusty's seen off, if the geese are behind a tree's crown or the farmhouse from the
  game's view, or there's no room for a lap of honour (by the pond, among things), they hurry, chests out and honking, to
  the nearest open spot in full view within 10 m (`GeeseFlock.paradeSpot()`, stage 'gather'; `inView(x, z)` in main.js:
  nothing tall between the spot, give or take a couple of metres, and the camera, which looks down at 42 degrees from
  the +x +z side). The same with or without Biscuit. Hector never gets scolded in the middle of it (a scolding
  could cut her guard short).
- The geese wait for him (`guardTask` stage 'await': chests out, honking now and then, looking his way, up to 50 s), then
  the victory parade together: Gertrude's victory honk and lap of honour with Hector, Biscuit prancing round them with a
  jaunty trot, head high, tail wagging, grinning; at their ta-da he play-bows at them, barks, hops and barks again. Then
  they all go back to bed (Biscuit trots home into his kennel).
- Messages (the dog's name as the player chose it, only ever shown as text): "{dog} has heard Rusty! Woof! He's off after
  him…" (first) or "{dog} is up too, barking! He's off after Rusty…" (after the geese); "The geese have heard {dog}
  barking! They're coming too, honking…" (the geese after him); "The geese and {dog} have heard Rusty! Honking and
  barking, they're off after him…" (together); the night ends "The geese and {dog}
  chased Rusty all the way home!" (or "{dog} chased Rusty all the way home!" without the geese), and "Victory! The geese and
  {dog} are so proud of themselves, they're parading round the farm." French: "{dog} a entendu Rusty ! Ouaf ! Il file
  après lui…", "{dog} est réveillé aussi, il aboie ! Il file après Rusty…", "Les oies ont entendu {dog} aboyer ! Elles
  arrivent aussi en cacardant…", "Les oies et {dog} ont entendu Rusty ! En cacardant et en aboyant, ils filent après
  lui…", "Les oies et {dog} ont chassé Rusty jusque chez
  lui !", "{dog} a chassé Rusty jusque chez lui !", "Victoire ! Les oies et {dog} sont si fiers d'eux qu'ils paradent dans
  la ferme." (`NightVisit.helpers`: who was out after him.)
- Tap him while he's busy seeing Rusty off: just a "Woof!". `?noguard`: the geese and Biscuit both sleep through it (the
  fox's own tests).
- In the game a player may have only the geese or only Biscuit: that one does it (both work alone here too: `?nodog`,
  Biscuit sleeps through it, as on a farm with only the geese; `?nogeese`, the geese sleep through it).
- Tests: `teamguard.mjs [coops]` (for each coop: the geese and Biscuit out, Rusty home seen off by them all, Biscuit never
  into anything, into Rusty or through a goose, the parade together, everyone asleep again after; NOGEESE=1: Biscuit
  alone; and the parade in full view), `geeseguard.mjs` (now the geese alone, `?nodog`; also the parade in full view), `teamfilm.mjs OUT coop secs fps` (FROM=alarm, wake or
  parade; the view keeps whoever's in the story in the picture; CAM=geese follows the geese; CUT=1 films each moment for
  a few seconds and skips the rest, for a short video, or CUT='{"back/await": 6}' only the moments given; the message at the top held for 4.5 s of the farm's time).

## The morning replay of last night's fox visit (23 Oct 21:04, Audrey: "Carry on"; she chose "Old silent film" and "A button to tap")

- In the morning a "🎞 Last night" button (French "🎞 La nuit dernière") sits at the bottom of the screen; tap it and last
  night's visit plays again as an old silent film (`src/replay.js`, `Replay`). In the game it shows the morning after a
  night with a visit; this test page offers one every morning (6:00-12:00) until it's been watched that day: last night's
  visit if the page saw one (`lastNight`: the coop, its door open or shut, the time, the coop's hen), otherwise the one Rusty
  would have made (a coop left open first, the nearer the den the likelier, a time between 11 pm and 2:30 am). The day it
  was watched is kept in the browser (`ff3d.replaySeen`, only ever a "YYYY-MM-DD" date, checked when read). `?replay` shows
  the button at any hour (`?replay=N`: coop N; `&shut`: its door was shut). Skip any time.
- The cast: the night is played again with a Rusty, geese and Biscuit of its own (built the first time, like the farm's
  own: `buildReplayCast()`; `FoxFamily` with `only: 'dad'`; geese and dog with `wakeOn`, so they wake when the film says),
  put back to bed before each showing (`NightVisit.reset()`, `GeeseFlock.reset()`, `FarmDog.reset()`). Meanwhile the farm's
  own hens, foxes, geese and dog are hidden and paused, the light is the night's (`DAY.override`), the visited coop's door
  is as it was; afterwards everything is put back exactly (the view too). Whoever the farm has takes part (`?nodog`,
  `?nogeese`, `?noguard` as on the farm).
- The director (`plan()`): title cards between the scenes, the dull bits skipped behind them; travelling sped up (as old
  films did: the approach a little, the chase nearly twice as fast, the lap of honour twice); the peck in slow motion (a
  third of the speed, from the sniff to the leap back); the view framed on whoever's in the scene, worked out for a phone
  held upright. The story, by what the farm has:
  - "Last night, on the farm…" · Rusty out of the den · "11:41 pm. Rusty had a plan." · the jump over the fence and up
    the ramp · "Nothing could possibly go wrong." · the flurry and the peck (slow motion), the feather on his nose, the
    sneeze · "He had not planned for Willow." (the coop's Brave, else its Rebel, else its first hen) — or, at a shut door,
    the scratching and the "?" · "The door was shut. He had not planned for that."
  - With guards: Rusty puzzled · "But someone had heard everything…" · the geese honking the alarm · Biscuit waking and
    out of his kennel · the race · "Run, Rusty, run!" · the chase · Biscuit barking at the edge of the wood · "The heroes of
    the night." (Biscuit alone: "The hero of the night.") · the parade.
  - Without: his second try, home at a trot · "Rusty went home… with a feather on his nose." (or "…empty-handed, and very
    puzzled.") · into the den.
  - An iris closing, then "The End" · "Everyone is safe and sound." About 40 to 60 seconds.
  - French: "La nuit dernière, à la ferme…", "23 h 41. Rusty avait un plan.", "Rien ne pouvait mal tourner.", "Il n'avait
    pas prévu Willow.", "La porte était fermée. Ça, il ne l'avait pas prévu.", "Mais quelqu'un avait tout entendu…",
    "Cours, Rusty, cours !", "Les héros de la nuit." / "Le héros de la nuit.", "Rusty est rentré chez lui… avec une plume sur
    le nez.", "Rusty est rentré bredouille, et très perplexe.", "Fin", "Tout le monde est sain et sauf.", "Passer".
- The old film look: the picture sepia and brighter (a CSS filter on the canvas), at 16 pictures a second, with grain, a
  flicker, scratches, a vignette and a little gate weave (a few DOM layers over it, `#film`); the cards black with a double
  cream frame and fleurons, in IM Fell English italic (old printing types, SIL Open Font License, kept with the page in
  `fonts/` as small WOFF files with its licence; Google Fonts isn't needed). The game's buttons, hints and labels are hidden
  while it plays; taps and drags do nothing but Skip. The quality isn't stepped down for the film's 16 pictures a second.
- Tests: `replaytest.mjs [cases]` (team, teamshut, dog, geese, none, noneshut; `LANG=fr`: the button and its words; the
  cards in the story's order for that farm; the visit as it should go; to "The End" in under 75 s; no page errors; the
  farm's own, the light and the doors put back exactly; the cast hidden, the button gone), `replayfilm.mjs OUT [every]
  [extra]` (pictures at phone size, as the player sees it). `__farm.replay()`, `startReplay`, `replayRecord`, `replayTick`.

## The pond: moving water (23 Oct 22:43, Audrey: "Perfect next": ducks, frogs and moving water on the pond)

- The pond and the streams move, in the water's own shader (`waterShader()` in main.js, no textures):
  - The pond: little wind ripples drifting across it (six travelling waves from 30 cm to 3 m long, each its own way, the
    shorter ones stronger where the breeze ruffles the water: patches of chop and calmer patches drifting over it, and the
    rows bent so they aren't neat); each ripple's side facing the player a shade lighter and the far side darker, the
    brightest faces crisp; little sparkles of light here and there that twinkle on and off by day (fading out at night);
    deeper blue in the middle, lighter in the shallows, and a bright wet line where it meets the bank, lapping.
  - The streams: flowing from their first point to their last (the west one into the pond, the other out of it), faster
    in the middle, with ripples and pale streaks carried downstream and a little white water along the banks (`ribbon()`
    gives the stream water a `flow` attribute: metres along, -1..1 across, its way).
  - The colour is worked out after the ripples' normals, before the light (at `emissivemap_fragment`); the night colours
    apply as before. One clock, `WATER_T` (`__farm.water(t)` for tests); `WATER_DAY` fades the sparkles at night.
- Tests: `waterclip.mjs OUT x z [size] [secs] [fps] [hour]` (frames of the water moving, the clock stepped exactly).

## The pond: the frogs (24 Oct, the second piece of the pond)

- Five frogs live round the pond (`src/pond.js`, as the game's art plan has it: "Frogs sit at the water's edge, hop along
  it, dive in and pop up elsewhere (tap one to make it jump)"). Each is built in the page from rounded shapes (no model
  file), about 17 cm long (larger than life, like the 2D game's frog, so it reads on a phone): a plump pear-shaped body, a
  broad head, big golden eyes bulging up out of it with a black pupil lying across and a catch-light, lids that blink, a
  pale throat that puffs into a balloon when it croaks, small front legs with four fingers, long folded hind legs with
  five webbed toes; green with dark blotches and a golden line down each side of the back, a cream belly, barred legs, a
  brown ear disc behind each eye, a dark mouth line and nostrils. The eyes, the blotches and the lines are drawn per pixel
  in the frog's own shader (from where on the eye or the back each point is), so their edges stay smooth close up; the
  rest is coloured per point. Each part hangs rigid on a bone (`Frog`), so a frog is one draw; its pose comes from a few
  numbers (`P`: the hind legs stretched out, the front legs reaching, the body's pitch, the throat, the lids, the head
  turned and nodding, how high in the water), each leg's bones aimed so its joints lie where the pose wants them.
- Their life (`FrogPond`): on the bank at the water's edge they sit facing the water, breathing (the throat fluttering),
  blinking, looking about, now and then croaking ("Ribbit!", French "Croâ !", over their heads; one to three croaks),
  hopping along the bank to a spot with room (never onto another frog's spot or one it's heading for, never across the
  dock or where a stream comes in), and diving in: a leap out over the water, a splash (rings and droplets), under it
  goes, and a few seconds later it pops up somewhere else with a plop; it floats with only its eyes and the top of its
  head out, paddles about (little rings behind it), swims to the bank and hops out. By night (21:30-6:00) they croak much
  more and move less. A goose, Biscuit or Rusty coming near: in they jump (one already in the water dives and comes up
  elsewhere). Tap one: its label ("Frog", "Grenouille") and it jumps in with a "Ribbit!".
- `?frogs` starts the view on them; `?lineup=frogs` shows six in their poses (sitting, croaking, looking about, leaping,
  blinking, swimming). They're hidden while the morning replay plays.
- Tests: `frogtest.mjs` (4 minutes by day and 3 by night, every frame: each frog on the bank at the edge, in the water, or
  mid-hop; never on or under the dock; never two on one spot; all they do happens; more croaking at night; a goose coming
  close; a real tap on the screen; `LANG=fr`), `frogfilm.mjs OUT [secs] [fps] [hour] [frog] [size]` (frames following a
  frog; `PLAN=2:croak,6:hopAlong,11:dive,30:tap` arranges what it does when), `frogshot.mjs OUT [hour] [secs]` (the
  line-up). (`waterclip.mjs` and `frogfilm.mjs` step the farm in 1/30 s steps.)

## The pond: the mallards' look (24 Oct, the third piece of the pond; first their look, as with the geese)

- Rocco the drake and Daisy the duck (names offered to Audrey for change), built with the geese's own pipeline
  (`stylized/geese.py` `mallard_m`, `mallard_f`; `export_geese.py` paints them; both kinds go in `models/geese.glb` with
  the geese) and posed by the same rig (`GooseRig`), so all the geese's moves work for them: smaller (S 0.6), a low
  boat-shaped body, a short neck, a round head and a broad flat bill (yellow for him, orange with a dark saddle for her),
  orange webbed feet. The drake: bottle-green head with a sheen, a narrow white collar, chestnut breast, pale grey flanks,
  grey-brown back, black rump with the two black curled feathers over a white tail. The duck: warm brown, each feather
  dark brown in the middle with a tan edge, paler underneath, pale outer tail feathers (so her tail shows when she
  up-ends), a buff head with a dark crown and a dark line through the eye. Both with the blue patch on the wing (the speculum). Their feathers are drawn smaller (x0.62) and their fluff
  shorter (`DUCK_FUR`).
- Up-ending (`upend` in the rig's pose, 0..1): tipped forward (1.2 rad), sunk so only the back end shows, the tail cocked
  up, the feet kicking at the surface either side, bobbing a little (`window.__UP` overrides the numbers for tuning).
- `?lineup=ducks`: both in eight poses (looking about, the waddle, a quack, preening, a wing-flap, swimming, up-ending,
  asleep). `?lineup=ducks&call`: the call ducks (30 Oct) the same. `duckpose.mjs OUTDIR [who,..] [secs]` takes close-ups of chosen ones (`VARS` tries `__UP` settings).

## The pond: the ducks' life (24 Oct, Audrey chose the names Rocco, Daisy and Dot)

- `src/ducks.js`: `DuckFlock`, Rocco the drake and two ducks, Daisy and Dot (the same duck model; Dot named in the code),
  drawn and posed by the geese's code (`Goose`, `GooseRig`; the pond's shape, its ways in and out and swimming clear of
  the dock are shared with the geese in `PondBirds`). Their poses are in `DACT` (sized for a duck); their tasks in `DK`.
- By day they live on the water. Rocco leads: short hops over the pond (now and then right across it), a quack first
  sometimes, then a good while feeding where he stops: dabbling, drifting along dabbling, up-ending. Daisy follows in his
  wake and Dot in hers (each along the trail of the one ahead, about half a metre behind, hurrying, or pattering over the
  water with her wings going if she's far behind; never waiting behind for long: she goes round). When the one ahead
  stops, each does her own things nearby (dabbling, up-ending, preening, floating, quacking), moving a little away first
  if she's too close to another. Rocco also preens, rises up on the water and flaps, and takes a splashy bath (splashes
  from the frogs' pond's effects).
- Daisy is the chatterbox (quacks most, three at a time), Dot the curious one: a frog's splash or croak within 3 m
  (`FrogPond` calls `heard`) and she paddles over for a look, head tilted, then hurries to catch up.
- Now and then (not within 140 s of the last) a rest on the bank: the nearest resting place clear of the geese (three
  spots side by side 0.36 m apart, each with its own way in; never by the geese's bed, the dock or the streams), each in
  by her own way, a shake, a preen, a nap with heads tucked in; when Rocco gets up they all do, a stretch, and back into
  the water. A goose, Biscuit or Rusty within 1.3 m while they're ashore: up they get and hurry into the water quacking.
- Dusk (21:15): out to their raft in the middle of the pond (as far from the dock and streams as can be), asleep afloat,
  heads tucked in, drifting about a little round their places; morning (6:20): awake one after another, a stretch and
  a quack. Tap one: she turns to you and quacks, "Quack!" ("Coin coin !" in French) over her head; her label "Rocco ·
  mallard drake" / "canard colvert", "Daisy · mallard duck" / "cane colvert".
- Never through each other or a goose (two round parts each; the one behind in the line gives way, one asleep stays
  put), never onto the dock or out of the water while swimming (`keepIn`), never into anything on the bank; a duck
  blocked for 4 s gives up on that and does something else (`unstick`). The geese steer round them (`others`), the frogs
  jump in when they come close.
- Wakes: behind each swimming duck a V of two thin lines spreading from her breast, drawn from where she's been in the
  last 1.5 s (so it curves after her), fading; all three in one draw, added onto the water's colour (dimmer at night).
  Faint rings now and then round one afloat, and as she goes under and comes up (`Ripples`, one instanced draw).
- `?ducks` starts the view on them. They're hidden while the morning replay plays.
- Tests: `ducktest.mjs [minutes]` (12 minutes by day, every tenth of a second: never on the dock, into anything on the
  bank, through each other or a goose, never stuck; afloat only on the water; the followers keeping up; all they do; a
  rest with all three ashore and back together; a goose coming close; dusk and the raft; the morning; a real tap;
  `LANG=fr`), `ducktrack.mjs OUT.json [hour] [mins]` (their tracks, for a picture from above), `duckfilm.mjs OUT [secs]
  [fps] [hour] [who] [size]` (frames keeping all three in view; `PLAN=0:far,13:tap1,17:bath`, `START`, `NIGHT`).

## The farmer, step 1: the look (24 Oct, Audrey chose "The farmer (Recommended)" after the ducks)

- Both looks, Arthur (`m`) and Rosie (`f`), from the 2D game's own Blender model (`stylized/character/farmer.py`), so they
  match the game's sprites: straw hat (blue band; red ribbon and a daisy for her), checked shirt with rolled sleeves,
  denim dungarees with brass buttons and a pocket, wellies (green; yellow for her), his short beard, her plait.
- `stylized/export_farmer.py` builds each with every joint at rest (arms and legs straight down, hands open), each part
  rigid on its joint (42 bones), one mesh each (about 26,000 triangles: the big round shapes simplified part by part, the
  face's little parts kept). The face is made to move: each upper and lower eyelid is a half sphere on its own bone, turned
  open or shut; the iris, pupil and catch-lights on an eye bone; the brows on brow bones; every mouth shape (smile, grin,
  talk, shout, worried, frown) on its own bone, one shown at a time. Torch and pail hang on the hands, hidden until
  wanted. The checked shirt is drawn per pixel from each point's place on its part (`_CLOTH`, as the Blender material);
  the blush is a weight (`_BLUSH`) so it can deepen. `farmer.glb` + `farmer.json` (bones, the shirt's colours).
- `src/farmer.js`: `FarmerRig` (posed from farmer.py's `POSES` and `FACE`, same degrees and axes), `Farmer` (eases from pose
  to pose, a walk or run on top, blinking, looking about), `FarmerLineup`. In 3D the hat sits pushed back on the head
  (20 degrees) so the face shows from the game's camera above, and the eyes look up a little, at the player.
- `?lineup=farmer` (`&set=1`: looking about, waving hello, telling off, worried; `&set=2`: walking, running with the torch,
  feeding with the pail, crouched for a cuddle; `&set=3`: their faces close, through every expression).
  `hatshot.mjs` takes pictures of the line-up (`VARS`: per picture the hat's tilt, a face close-up, the eyes' gaze).

## The farmer, step 2: the farmer's day on the farm (24 Oct, Audrey on the look: "Yes all good")

- `src/farmlife.js`: `FarmLife`, the farmer out on the farm (`?farmer`: Arthur; `?farmer=f`: Rosie; in the game the
  player's own choice and name). Out of the farmhouse door in the morning (6:24, fading in at the door; before 8:30 a big
  stretch first) with "Good morning, girls!" and a wave; then round the farm: to a coop to stand at its fence, hands on
  hips, watching the hens (sometimes a wave and "Hello, girls!", the 2D game's own line); to a corner of the farm (a bench,
  the well, the stall) for a look about; to the pond to watch the ducks (sometimes "Hello, ducks!"); to Biscuit's kennel
  if he's at home: Biscuit trots over and sits in front of where the farmer stops (on the player's side, a little round,
  so both faces show), ears up and tail going, and gets a crouch and a pat ("Good boy, Biscuit!" with the dog's name as
  the player chose it), answering with his hello (`FarmDog.awaitPat`; if he's gone off meanwhile, just a look about); to
  the porch for a rest; a wave and "Hello!" when the player's looking. Somewhere not just
  visited, and one of the nearer places: a stroll, not a march. From 21:12 (and before 6:42) the torch is lit in his
  hand, its beam on the ground ahead. At 22:36 "Goodnight, girls!", a wave, and in through the door (fading out); indoors
  all night. A page opened by day: he comes out with "Hello, girls!".
- He keeps to the paths: the village grid (`NavGrid` in `nightvisit.js`) now has costs (grass 3.2, the paths 1), the
  way found with them, and a bend cut straight only when it costs no more than going round (`find(..., useCost)`).
  About 70% of his walking is on the paths. Every place he goes is one that can be got to: `reach(x, z)` marks every cell
  walkable from the farmhouse door (a free cell can be shut in, like a pen's yard), `nearestIn` picks within it; a coop
  whose front is shut in (two coops facing each other round a shared yard) gets a place at an open side. Biscuit's
  places by the coops and round the farm follow the same rule.
- He steers round the geese, the ducks on the bank and Biscuit, waiting a moment if one's right in front; if he's right on
  one, it steps aside (or he steps back if it has no room). The geese, ducks and frogs treat him as one of the farm's
  animals to walk round or hop away from.
- The night visit: "Send the farmer" (now "Send Arthur" / "Envoyer Arthur", the name in the visit's messages) brings the
  farmer out of the farmhouse door with the torch lit, running (a worried face) to Rusty, shining it on him with a stern
  face and a telling-off ("Shoo! Off you go, Rusty!"), then walking home: "Goodnight, girls!" at the door and in.
- Everything said is in a little bubble over the head, in English or French ("Coucou, les filles !", "Bonjour, les
  filles !", "Bonne nuit, les filles !", "Coucou !", "Brave chien, Biscuit !", "Bonjour, les canards !"). Tap the farmer:
  the label ("Arthur · farmer", "Arthur · fermier", "Rose · fermière"), a wave and "Hello!". Nothing new is saved.
- The farmer's skin is refreshed right before each draw (`onBeforeRender`): three.js counts a shadow redraw as the
  frame's refresh, so the picture just after one showed the last frame's pose, a step behind the torch's glow.
- `farmertest.mjs` (`LANG=fr`, `LOOK=f`): a 10-minute day checked every tenth of a second (never in anything, only free
  ground, a footbridge or the door; never through a goose, a duck or Biscuit; mostly on the paths; never stuck; a way to
  every place he goes; all the farmer does), bedtime, indoors all night, the morning, a real tap, and a night visit (out of the door with the torch,
  to Rusty, "Shoo!", home and in). `farmertrack.mjs` plots the way taken; `farmerfilm.mjs` films him (`PLAN`: at a
  moment the hour, what he does next, or whom the view follows; `SEND`: the night visit; `OFF`, `FOLLOW`: the framing);
  `farmersmoke.mjs` a quick look at a few moments.

## The farmer, step 3: feeding and cuddles in the pens (24 Oct, Audrey chose "Feeding and cuddles (Recommended)")

- Tap a hen (or the rooster, or a chick) by day: under her label, two buttons, the 2D game's own words: "♥ Cuddle" /
  "♥ Faire un câlin" and "Fill the feeder" / "Remplir la mangeoire" ("{farmer} is on the way…" / "{farmer} arrive…").
  In the game, what a cuddle or a full feeder does is the game's; this is the show of it.
- `farmlife.js visitPen`: the farmer goes to the pen (hurrying, along the paths, with the pail for the feeder), in
  through its open gate (round the water dish), and:
  - **Fill the feeder:** tips the pail into the feeder (its corn rising to the top), walks to the back of the yard, turns
    to face the player and throws four handfuls of corn ("Dinner time!" / "À table !"); the hens rush over (the glutton
    first) and peck it up grain by grain, a little crowd round him; he watches them a moment.
  - **Cuddle:** crouches at the back of the yard facing the player; she hurries over and settles in front of him, a
    little to his right; he leans down and strokes her, eyes shut, "There, there…" / "Là, là…", hearts floating up
    from her; then he stands.
  - Then out by the gate again. If he's coming out of the door, going in, or already in a pen, straight after; never at
    night. A hen he's been sent to doesn't go off to lay meanwhile, and no hen starts laying while he's in the pen; if
    she can't come after all, he just gets up again.
- `main.js penSpec`: the pen's places, in its own frame: just inside the gate, a step on clear of the water dish, in
  front of the feeder; and of three places at the back of the yard (with where the corn goes, or where the hen settles)
  the one facing the player best. While he's in the pen the birds keep out of his way (a few quick steps if he comes
  within 0.42 m; never closer than 0.33 m, pushed round him if squeezed against the feeder); the corn never lands at
  his feet. `penvisit.js Corn`: the grains (one batch per pen) flying in little arcs from his hand, lying on the ground,
  pecked up. Hearts: little sprites floating up (as the song's notes).
- The pail: the 2D model has it standing on the ground at the farmer's feet; now it hangs from his left hand, the
  handle in his fist, carried steady while he walks (`carry` pose; the `feed` pose's left hand round the handle).
- The village grid: a plot's margin no longer closes a path running through it (two plots corner to corner had shut four
  coops' gates in), only the plot itself. The farmer never steps from free ground into anything (he slides along a
  corner, or waits; onto a footbridge, and into a pen only by its gate), and finds his way again if held up. Rusty can
  now come in over the front fence of those four coops too, so his paths across a pen leave a little more room at the
  bends (`NavGrid.room`).
- `pentest.mjs` (`LANG=fr`; coops to try): a real tap on a hen and her buttons; at every coop the feeder filled and a
  cuddle, checked every tenth of a second (into a pen only by its gate, inside only on the yard's free ground, never in
  the feeder, the water or the hay; no bird ever inside him; every grain pecked up; the hen settles; the pen as it was).
  `farmerfilm.mjs` takes `pen-6-fill-1`, `pen-4-cuddle-2`, `tap-6-1`, `look-6`, `zoom-1.5` in its `PLAN`.

## The decorations, step 1: on the farm (24 Oct, Audrey chose "The decorations (Recommended)")

- The eight the 2D game sells ("Decorate your farm"), from its own Blender script (`decor_sprites.py`), so they're the same
  shapes and colours as on the farm map: the cottage flower bed, the bird bath (a blue tit on the rim), the beehives
  (three white hives, lavender), the duck house on its raft, the greenhouse (white frames, glass, tomatoes inside), the
  windmill (its sails turning in the wind, one turn in about 14 s), the bandstand and the golden cockerel on his plinth.
  `stylized/export_decor.py` builds them unturned (the 2D script turns them for its camera) and writes `decor.glb`
  (glass as its own see-through material) and `decor.json` (the windmill's hub, each one's footprint).
- `main.js placeDecor`: each starts where the 2D game puts it (the flower bed by the farmhouse, the bird bath between it
  and the vegetable patch, the beehives and the windmill by the wheat field, the greenhouse next to the sunflowers, the
  golden cockerel and the bandstand on the green either side of the pond: the 2D game has the cockerel north and the
  bandstand south, but from here the tall bandstand in front would hide the pond, so the cockerel stands in front and
  the bandstand behind), on the nearest open grass that fits it
  (never on a path, a plot, the pond, a stream, under a tree or bush, on the wheat field or another prop; round ones
  by their circle), turned to face the player; the duck house floats on the pond at the end away from the dock. They
  join the village's props: drawn in its batches, and on the village grid, so the farmer, Biscuit, the geese and Rusty
  walk round them; the geese, the ducks and the frogs swim round the duck house's raft. The farmer stops by them on his
  rounds. Tap one: its name, in English or French. In the game they're bought, and can be moved (step 4).
- The geese and ducks on the grass never step from free ground into anything either (as the farmer: straight on, or
  sliding along it, or a moment's wait; into the water by their ways as before): with the decorations in, a goose now
  and then brushed a bush's edge for a few seconds (the old "occasional geeseday blocked cell").
- `decortest.mjs` (`LANG=fr`): all eight placed, turned to the player, on the village grid, the sails turning, a real
  tap on each and its name. `decorshot.mjs`: a picture of each where it stands.

## The decorations, step 2: life round them (24 Oct, Audrey chose "Life round them (Recommended)")

- The ducks use their house (`ducks.js setHouse`, given the duck house's frame by `main.js`): on its raft and up its
  ramp they walk, dry (the deck at its own height, the ramp sloping down into the water, wet again at its foot). At dusk
  they swim over and wait their turn by the foot of the ramp; one at a time (Dot, then Daisy, then Rocco) up the ramp,
  across the deck to the door and in, to sleep inside (hidden, no shadow). In the morning out again one at a time
  (Rocco first), down the ramp into the water, a stretch and a quack, and off; one still on her way in when morning
  comes just stretches and quacks where she is. Without the duck house (`?nodecor`) they sleep afloat in the middle as
  before.
- `decorlife.js` (`DecorLife`, from `main.js buildDecor`, ticked with the sails; `?nolife` leaves it out): each
  decoration's life in its own frame, drawn a little bigger than life so it shows from the game's camera, with the night
  colours:
  - the beehives: 14 bees out of the hives' slots to the lavender in front, a hover at a flower or two, back in (or into
    another hive), on curving flights; striped bodies, wings a blur;
  - the cottage flower bed: four butterflies (white, yellow, orange, blue) fluttering from flower to flower, settling
    with the wings slowly opening and closing, now and then a little wander out and back;
  - the bird bath (its own blue tit sits on the rim): a robin and a chaffinch drop in by turns, mostly on the far side of
    the rim facing you, a look round and a sip, a hop into the water for a splashy bath (drops flying), back on the rim
    for a shake of the feathers, and off; back every 6-18 s;
  - the golden cockerel: a sparkle of sun on him every 2-5 s;
  - the bandstand: music notes (purple, blue, green, navy, edged in cream) floating up over its roof of an evening
    (17:30-21:30), and a little tune (4.5 s of notes) when it's tapped, with its name.
  The bees, butterflies and birds are out by day only (6:30-20:00): the bees go home, the birds fly off. No sounds yet
  (they come with the game's sounds).
- `decortest.mjs` (`LANG=fr`) now also checks the life: by day the bees out and back and never far from the hives and
  lavender, four butterflies never far from the bed, the robin and the chaffinch each having a bath, the cockerel
  glinting, no music by day until a real tap on the bandstand and then a tune, music of an evening, and at night the
  bees in, no butterflies, birds, glints or music. `ducktest.mjs`: with the house, all three in by dusk and staying in,
  out in the morning and back in the water. `lifefilm.mjs`: the film of it all.
- Found on the way: a duck whose way to the house was blocked both straight and by the pond's middle swam into the dock
  and stuck there (and was then put on along her way, into the house from metres off): the ducks' `swimVia` now goes
  round by the shortest way through points round the pond (`route`), and a duck stuck on her way home gets a new way.
  And a hen who jumps in or out at the nest window waits while the farmer is in the pen near her take-off spot
  (pentest saw one leap past him at two coops).

## The game, release 1 step 1: a new farm (24 Oct 2026, Audrey: "Let's go")

Audrey's brief (24 Oct) changed the game play: the plan is the project doc `claude/game-plan-v2.md`. She chose to start
fresh, hens raising their own chicks, about a year to the top level for a once-a-day player, and to build it straight
into the 3D game. Release 1, "Your forever flock, in 3D", comes in small live steps; this is the first.

- **The game's own page:** `play.html` (the same page and code as the test village, built with `body.game`:
  `build.sh`). `/3d/` stays the test village with everything in it; `/3d/play.html` is the game. In the game the geese,
  the dog and the decorations are bought, so a new farm has none of them yet (`HAS_GEESE`, `HAS_DOG`, `HAS_DECOR`), the
  fox doesn't visit before the geese can be bought, the wheat field is ploughed and waits (sowing comes later), the test
  page's own buttons and hints are hidden.
- **`game.js`:** the farm and its rules so far.
  - The farm: coins (100 to start), XP (the level always comes from the XP, never from the save; a first curve, the
    year-long balance comes with step 9), the language, the farmer (him or her, and a name), the patches of land owned
    (the village's 40 plots; the first is plot 0, the 2D game's start), the coops (a breed, how far it's been done up:
    0 rustic to 4 Deluxe, its patch, a name) and the birds.
  - The forever trio: a rooster and two hens with three different personalities, never a good mum rooster. The first
    trio meets the game's characters at once: a Brave rooster, a Good mum and a Rebel. Each bird: name, personality,
    since when, experience (stars, 0 to 5) and trust (0 to 15 cuddles: Shy, Friendly, Trusting, Best friend).
  - Saved on the phone (`localStorage`, `ff3d.farm`) with a seal. Every load is checked: wrong types dropped, numbers
    clamped, names cleaned of code, a coop only on land owned, a trio at most per coop (one rooster, two hens, of the
    coop's breed), only hens good mums. A farm changed outside the game loads checked and is flagged in Settings.
  - Every word in English and French (the phone's language to start, then the player's choice).
- **`gameui.js`:** the game's screens in the 2D game's look: the top bar (level with its ring, coins, Settings), sheets
  that slide up: the welcome over the loading farm (language, him or her, a name, "Start my farm"), a bird's card (name,
  breed, hen or rooster, "In your flock for good", personality with its icon and what she's like, experience stars,
  trust hearts, her coop and since when), the level, the coins, Settings (language, "Start a new farm" with a second tap
  to confirm, a warning when the farm was changed outside the game, the version). Names are always set as text.
- **`main.js`:** the farm drawn from the save: the player's coops on their patches with their own birds (names and
  personalities from the save), nothing on land not yet owned (and the farmer can walk there). Tap a bird: her card, and
  the view glides over so she shows above it; tap the grass: the card goes. The coop doors' messages and the inside of a
  coop at night now have French too (for the test page as well).
- **The rustic coop** (`stylized/coops.py rustic_barn`, `rustic_fence`; `export_coops.py`: `rustic_rir`,
  `fence_rustic`): a new breed's coop as it first comes. The Red Barn weathered: the red faded and patchy, some boards
  replaced with bare ones, boards nailed over the cracks on the front and both ends, the trims gone grey, the slates
  faded with a little moss, a sheet of corrugated tin with rust spots patching the roof; the pen's fence grey and a
  little crooked. Same shape as the Red Barn, so the nest, the pop door and the inside are the same.
- **`gametest.mjs`** (`LANG=fr` for a French phone): a fresh phone through the welcome (him or her, a name with code in
  it), the farm (level 1, 100 coins, the rustic Red Barn and the trio, nothing else), a real tap on each bird and her card
  in the language, the same farm after a reload, a save changed outside the game (a fourth bird, a rooster good mum,
  code in a name, a level typed in, XP as text: all checked, and flagged), the trio in bed at night and the inside view's
  title, Settings: the other language, and a new farm.

## The game's welcome picture (24 Oct 2026, Audrey: "I'd like the first welcome screen a bit more appealing, probably an image that would represent the game with a farmer, few chickens from different breeds, the geese the dog. All of them together and interacting needs to be funny")

- `main.js ?poster` (with `&coops=0&time=10:30`): its own little stage out past the village (as the line-ups), nobody
  else about. Breakfast at the Red Barn: the farmer throws the corn (grains in the air from his hand, more on the
  ground) with a buff Silkie sitting on his hat, and looks up at her, grinning; a Buff Orpington, a Light Brahma, a
  white and a black Silkie and a Cream Legbar peck it up; the Rhode Island Red rooster crows from the top of a round
  bale; Gertrude hisses, wings out, at Biscuit, who answers with a delighted play bow (tail up and going, grinning), a
  yellow Silkie chick riding on his back; Hector honks his support behind her. Round them a wheelbarrow of pumpkins,
  flower pots, an apple tree, bushes, grass and flowers. `beasts.js PosterDog` (Biscuit alone, posed), `geese.js` shares
  its line-up poses (`LINE`), `farmer.js Farmer`.
- `posterpic.mjs`: shoots it through a perspective camera (`__farm.posterShot`) at three times phone size; saved as
  `web3d/welcome.jpg` (1206 x 1320, quality 84, 135 KB), copied with the page by `build.sh`.
- Audrey (18:41, a close-up of the hens round the pail): "This part is too messy". Tidied: the hens in an open ring round
  the corn, each with room of her own (a Cream Legbar, a Buff Orpington, a Light Brahma, a white and a black Silkie),
  pecking out of step; the corn in a little heap in the middle and a few grains in the air, never across a bird; Biscuit
  and Gertrude behind them on the right, clear of them, with room between his nose and her bill; Hector further back by
  the wheelbarrow. The picture is taller than the space it fills (1206 x 1500) so on any phone only grass is cut off,
  never anyone; it fades in once loaded.
- Audrey (18:50): "The dog back legs are not really touching the floor. The 5 chickens eating need a bit more action
  they are boring. This image might end up being the cover of the game so I want top quality output." Done:
  - Biscuit's bow: the body tipped forward also lifted his hips, so his hind legs (fully stretched) ended 8 cm short of
    the grass. `PosterDog` now lets the body down (`A.lift = -0.105`) as it tips (`A.pitch = 0.3`): all four paws on
    the ground (measured on the skinned mesh: front -0.008, hind 0.002).
  - The hens, each doing something: the Orpington and the Brahma in a tug of war over a worm, leaning back, wings half
    out (the worm held bill to bill: `billTip(b)`, the frontmost point the head bone carries); the Cream Legbar leaping
    in, legs tucked, wings at full spread (`A.t` held at the open moment of the beat); the black Silkie side-on to the
    corn heap, kicking the grains out behind her; the white Silkie jumping up to catch a grain the farmer has just
    thrown, beak up.
  - Quality: rendered at six times phone size (2412 x 3000) and shrunk to 1206 x 1500 for smooth edges and fur, saved at
    quality 88 with full colour (250 KB). The big render can be made again any time for a store cover.
- Audrey (19:13, her iPhone, Safari and the Claude app's browser): "Still the green bar at the top. Other games are using a
  transparent effect so the screen really looks bigger and full screen" and "The visible part of the image on the screenshot
  is not the best one might need a little resize or a different option depending on screen size (responsive game)". Done:
  - The strip under the clock: iOS 26 Safari ignores `theme-color` and paints it in the background colour of a fixed
    element at the top (else the page's): it was the hero's flat green. The hero is now the whole screen with a dark
    green background (`#4a7530`) and the picture's top fades from exactly that colour, so the strip and the picture are
    one. A web page can't hide Safari's own bars; added to the Home Screen (web-app meta, `play.webmanifest`, the rooster
    icon `icon-180/192/512.png`) the game opens full screen, the picture running under the clock (`.standalone`: only a
    light shade there).
  - The picture fitted to the screen: one wide picture (3300 x 1500, the scene with grass to spare, more on the right)
    and `GameUI.fitHero()`: `HERO.key` (the farmer to the Legbar, the Silkie on his hat to the hens' feet) as big as it
    fits in the open space (under the name, above the sheet; beside the card sideways; clear of a notch), centred there,
    the picture always covering the screen behind; again on any resize, turn or change of the sheet. Sideways
    (`(orientation: landscape) and (min-aspect-ratio: 5/4)`) the welcome is a card on the right; on short screens held
    upright it is a little tighter; on a tablet its lines stay a readable width. Checked at 402x874, 402x700, 375x667,
    874x402, 932x430, 820x1180, 1280x800 and 1920x1080 in both languages: everyone in view, Start on screen, no scrolling.
- `gameui.js hero()`: the picture across the top of the screen behind the welcome sheet, "Feather & Field" and a line
  under it ("A flock to love for good" / "Une basse-cour à aimer pour toujours") over a soft shade; gone once the
  farm starts.


## The game, release 1 step 2: sideways first (24 Oct 2026, Audrey: "We should plan for the game to be played landscape mode I think by default"; she chose "Sideways first (Recommended)")

The game is designed for a phone held sideways first; upright still works (a website on iPhone can't lock the phone
sideways; the App Store app can, if she wants). Every step from here is built sideways first and checked both ways
(`gametest.mjs` takes `W=874 H=402`).
- `main.js`: held sideways (`sideways()`: wider than 1.25 times its height) the farm comes closer (`SIDE_K` 0.7 on the
  view and on how near and far a pinch goes), so it fills the shorter height as it fills the width upright; turning the
  phone swaps it over (`resize()`). A bird's card sideways: the view glides so she stands in the middle of the space
  beside the card (`openBirdCard`).
- `index.html`: sideways (`(orientation: landscape) and (min-aspect-ratio: 5/4)`) every sheet (a bird's card, the
  level, the coins, the settings) is a card on the right under the top bar, as tall as it needs (scrolling if it must),
  sliding in from the side; the hint hides while a card is open (`body.gopen`). The welcome is its own card, centred on
  the right, beside the picture.
- Audrey (19:51, her iPhone sideways in Safari, its bars and a row of tabs leaving 874 x 293): "Sideways welcome image
  doesn't work": the card ran off the bottom (no Start) and the picture, too small to cover the screen and keep the scene
  beside the card, was pushed right under it. Now: sideways the picture need only reach under the card's edge (round the
  card the hero's own grass-green shows); on short screens the card is tighter, Start stays in sight at the bottom
  (sticky) and below 320 px high the welcome's sentence makes way so every choice shows. Safari paints its bars in the
  page's own colour (not the hero's, it turned out): while the welcome is up the page is the picture's top green
  (`html.gwelcoming`), the farm's grass green after. Checked at 874x293, 844x300, 932x330, 874x402 and upright.
- Audrey (19:57): "The white goose position in front of the dog is odd. I like it's pose but should not be almost
  touching the dog like that". Gertrude moved back and Biscuit a little the other way (a good beak's length between her
  bill and his nose); the picture rendered again and `HERO.key` widened to her tail. Her screenshots showed Safari's
  bars still the old light green: the hero now has a solid background colour as well as its gradient (Safari reads a
  fixed layer's background colour, as it does the welcome sheet's at the bottom).

## The game, release 1 step 3: eggs and the feeder (24 Oct 2026, Audrey: "Ok next step")

Designed sideways first, checked both ways, English and French. The rules are in `game.js` (starting values; the year-long
balance is step 11), the farm shows them (`main.js`, "the game's eggs and feed"), the cards are `gameui.js`.
- **Laying:** each hen lays twice a day on the phone's own clock, once in the morning (7:30-11:30) and once in the
  afternoon (13:00-19:00), at times of her own that change from day to day (`layTimes`: a hash of her id and the date).
  She lays while her coop's feeder has food and its nest has room (12 eggs, `NEST_MAX`). A new farm's good mum lays a
  first egg 75 seconds in (until 21:30; later, the next morning at 7:20): "Fern has laid your first egg! Tap the nest to
  collect it." A farm from before this step gets its good mum's first egg the same way.
- **Seen on the farm:** once a second the lays that are due (`game.dueLays`). A hen whose time has just come walks in
  and lays (the walk, the nest, the song Audrey approved); the egg is saved when it's in the straw (`gameLaid`). One who
  can't go yet (busy, held by her card, the nest taken, the page out of view) has two and a half minutes, then her egg
  is simply there, as for a lay while the game was shut. Away from the game the eggs of the last two days are there
  when you come back (`CATCH_UP`); a clock put back gives nothing.
- **Collecting:** a bubble over the coop shows the eggs waiting; tap it or the nest window: the eggs fly up to the
  coins, which count up with a little bounce, "4 eggs sold · +24 coins" (6 coins an egg for the Rhode Island Red,
  `EGG_PRICE`; 2 XP an egg). Inside the coop at night the nest boxes sell them too. A full nest: "The nest is full:
  collect the eggs so your hens can lay again".
- **The feeder:** its grain goes down as the trio eats (a unit a bird a day; full is two days); "Feed low" under a
  quarter, "Feeder empty" (no grain; no laying). Tap the feeder or its bubble: its card (how full, how long it lasts,
  "Fill it · 12 coins"). The save fills at once; by day the farmer brings the pail, pours it (the grain rises as he
  does) and scatters corn for the hens; at night it's simply filled. Short of coins: "Fill what you can"; no coins and
  nothing in it: free kitchen scraps (a unit), so the hens can always go on laying. 2 coins a unit, 4 XP a full fill.
- **The hen's card:** "Eggs: Lays about 2 eggs a day, 6 coins each."
- Audrey (21:14): "There is clipping with the farmer seed bucket". Measured (`pailAt`: the pail's middle, from the rig):
  he poured standing half a metre off with the pail at his side, 0.36 from the feeder and into a hen; scattering, it was
  0.29 off the feeder; walking out it passed 0.17 from its middle, through its tube; hens came 0.04 from it. Now: he
  pours from round the feeder, the side where he faces you most (`POUR`: where the tipped pail is in his own frame), the
  pail just over the tray, clear of the tube and hat (0.25 at the closest); he scatters from a step further off (0.34)
  and walks out round the far side of the yard (`CLEAR`, 0.38); the hens keep out of the pail (0.27, the rooster's
  tail 0.34, `penStep`) without ever being pushed into him (`free(x, z, 'pail')`). pentest and farmertest pass.
- **Messages:** sideways the game's messages run along the bottom (at the top they sat over the coop's egg bubble), and
  each lasts by the farm's own time.
- **The save:** each coop's `eggs` (0-12), `feed` (0 to full) and `fedAt` (never ahead of now), each hen's `laid`
  (never ahead of now) and the farm's `first` egg, all checked on every load. A farm saved before this step loads with
  an empty nest and a full feeder and is not flagged (`fits`: fields the save didn't have yet don't count as an edit).
- `eggtest.mjs` (`LANG=fr`, `W=874 H=402`): a fake clock from 10:00; the first egg walked in and laid, collected; two
  and three days away; the feeder's card and filling it with the farmer; a full nest; a reload; a clock put back; a
  save changed outside the game.

## The game, release 1 step 4: chicks (24 Oct 2026, Audrey: "Next step")

Designed sideways first, checked both ways, English and French. Rules in `game.js` (`broodTick`, starting values), the
farm following the save in `main.js` ("broody hens and chicks"), the cards in `gameui.js`.
- **Going broody:** each morning at 7 each hen may go broody (a good mum 35% a day, the others 12%; a hash of her id
  and the date, so the same every time), if her coop has no brood, had one more than a day ago, the farm is past its
  first day and the feeder has food. A brood: 2 or 3 chicks to come, a good mum's 3 or 4.
- **Sitting:** a day on the nest (`SIT_MS`), laying nothing for sale (her lays then don't come back afterwards). With
  the game open she walks in and settles on the nest (the laying walk Audrey approved, never leaping in at the window);
  otherwise she's simply there (`sitNow`). A bubble by the coop counts down ("🐣 24 h"); her card: "Sitting on 3 eggs:
  they hatch in about 24 hours." She counts as in for the night (the door shuts on her), and inside the coop at night
  she's on a nest box, awake. The other hen's eggs still come (straight into the nest while it's taken).
- **Hatching:** the next morning at 7 (a hatch in the night waits for morning): she rises, comes out down the ramp and
  her chicks pop up round her (`hatchOut`); "3 chicks have hatched! Lulu is a mum." Loaded later, they're round her.
  They keep near her (the test village's chicks' ways), go to bed with her and grow (to half as big again).
  A chick's card: "Rhode Island Red · Lulu's chick. Grows up in about 2 days, then goes to a new farm: +22 coins."
- **Grown and gone:** two days later, at 11 (`GROW_MS`): their coins (22 each for the Rhode Island Red, `CHICK_PRICE`;
  6 XP each, 4 for the hatching) and "Lulu's 3 chicks have grown up and gone to a new farm · +66 coins". With the game
  open by day the farmer comes into the pen ("Off to your new home, little ones!"), crouches while they gather round
  him, then walks out of the gate with them following in a line, and once out of the pen they're off down the lane
  (`leaveStep`, the farmer's trail); otherwise they're simply gone. Then she lays again.
- **The save:** each coop's `brood` (one of its own hens, start never ahead of now, 1-4 chicks, hatched only once its
  time has come), `lastBrood`, `checked` (the last morning looked at), all checked on load; a farm from before this step
  starts with none. Nothing new to buy or tap: it's all the hens' own doing.
- `chicktest.mjs`: see the next section (it now follows the brood to the end).

## Young hens and roosters, the farewell, congratulations (24 Oct 2026, 23:40, Audrey: "When the chicks are leaving the other chickens are celebrating them and the chicks are happy. Actually we should see them turning chickens and leaving the farm. The farmer doesn't need to enter the coop it can stay outside and is also celebrating. We should have somewhere the detail "congratulations, lulu's babies turned adult into xxxx (give ratings) and Money. What do you think? In the logic that the chickens from the coop gains experience and produce better and better babies ?")

Agreed with her: chicks for the first day, then young hens and roosters; a farewell at the gate with everyone
celebrating; a congratulations card with each one's rating and coins; the parents gain experience, so their next broods
rate higher and sell for more. Replaces the farmer leading the chicks out of the pen (step 4).
- **The rules (`game.js`):** at hatching each youngster gets its sex and rating (`kidsOf`, kept in the brood's `kids`):
  1 + the mum's and the rooster's stars averaged (+0.4 for a good mum), a little luck either way (a hash of the brood),
  1 to 5 stars, so first broods are 1-2 stars. Price `kidPrice`: the breed's chick price × (0.6 + 0.2 × stars), so 5 stars
  sell for twice 1 star (Rhode Island Red: 18 to 35 coins). XP: 6 + 2 a star each. When they go: the mum +60 experience,
  the rooster +30 (`EXP_MUM`, `EXP_DAD`; 100 a star). The news goes in the save (`news`: the coop, mum, rooster, each
  youngster's sex, stars and coins, the totals, when, seen), at most 6 kept.
- **Young hens and roosters:** a day after hatching (`YOUNG_MS`, 7:00 the next morning) each chick turns into a young
  hen or rooster where she stands (`turnYoung`): her breed's own hen or rooster, 62% of full size, growing to 85% by
  the time they go; with the game open a pop and a heart, and "Lulu's chicks are turning into young hens and roosters!".
  Their own ways now (not at mum's heels); the young roosters crow. A young one's card: "Young hen · Rhode Island Red ·
  Lulu's daughter: off to a new farm in about 28 hours. Her rating comes when she leaves." A chick's card: "A young hen
  or rooster in about 24 hours." The mum's card says which.
- **The farewell (`chicksGo`, `gateOf`, `tickFarewell`; the farmer's `cheerAt` in `farmlife.js`):** grown, at 11 two
  days after hatching, with the game open by day: "Lulu's youngsters are off to a new farm!", the view glides to the
  gate; they line up just inside it (clear of the water dish) facing out, and the farmer hurries over to stand outside
  it, beside the way out on the far side from the player, and calls "Off you go, and good luck!" then cheers (both arms
  up, a wave, in turn). The party (4.6 s): the youngsters hop and flap with hearts over them, the hens flap and hop, the
  rooster crows, their mum sings. Then out of the gate one by one (nearest first), past him and off down the lane. (Half a
  minute's wait for him at most; a minute for it all.) Otherwise, they're simply gone.
- **All the way off the farm (25 Oct 08:20, Audrey: "Instead of them disappearing after the coop door we need to see
  them walking until outside of the farm please. The rest is perfect"):** out of the gate they trot in a line (0.7 m/s,
  never into the one ahead) along the way off the farm (`farmExit`: the cheapest way, paths preferred as the farmer
  walks, over a footbridge if need be, to just past the farm's edge, beyond the trees along it; worked out once for each
  coop), taking a few steps more as they go. From the first coop it's 17 m, about 30 s, up the path past the bales,
  between the vegetable patch and the well and out through the trees at the back. The farmer stands by the gate, clear of
  their way (the far side from the player if their way leaves room there), and watches them all the way: he faces them
  lined up at the gate and turns to follow them as they go (`cheerAt`'s watch), cheering till they're all on their way,
  then goes about his day. The card once the last one's gone (two and a half minutes at most for it all).
- **The view stays put (25 Oct 09:14, Audrey: "The farmer is not looking at the chickens anymore to say goodbye that's
  odd" and "the camera should not follow the chickens, the user can it they want manually but the camera doesn't move by
  itself"):** no glide to the gate when it starts and no following; the player can drag along with them if they like.
- **Congratulations (`showNews`, `gameUI.congratsCard`):** once the farewell's over, or a moment after the farm opens for
  a brood that grew up while it was shut ("While you were away, Lulu's babies grew up"): "🎉 Congratulations! Lulu's
  babies have grown up", a row for each (🐔 Young hen or 🐓 Young rooster, its stars, +coins), the total "+76 coins ·
  +34 XP", "Lulu and Percy gain experience: their next chicks will be even better." and "Lovely!". Closing it marks the
  news seen and counts the coins up. One at a time, never over another card. Sideways the card takes the full height
  (the level and coins pills hidden behind it till it's closed) and "Lovely!" stays in sight at the bottom.
- **The save:** `brood.kids` (at most 4: sex h or r, stars 1-5) and `news` (only for birds on the farm; at most 4
  youngsters, stars 1-5, coins at most 1000 each, totals at most 4000) checked on load.
- `chicktest.mjs` (`LANG=fr`, `W=874 H=402`): a fake clock from the 24th: no brood on the first day; the morning one
  goes broody she walks in and sits; a reload: sitting at once; the next morning they hatch and she brings them out; a
  chick's card; a reload: round her; a day on: young hens and roosters (the news, a young one's card, her card); a
  reload: still young; grown: the coins and the news, the farewell (the farmer to the gate, the party, out one by one),
  gone; the card (ratings, coins, totals); "Lovely!": seen, the parents' experience up, no card after a reload; she lays
  again; grown while away: the card says so; news and a brood changed outside the game. All pass both ways, both
  languages.

## The game, release 1 step 5: levels and land (25 Oct 2026, Audrey: "Cool next")

First built as the village's 40 plots sold one at a time (Audrey chose "One at a time, in order"); she then said (10:18):
"that's not how I imagined it. For me it's a full piece of land not just a patch for the coop. Baring in mind people will
have choice to put their coops where they want so no predefined places. Ask questions". Her answers: "Fields with
natural borders", "Wild meadow, fenced off", coops placed by "Drag anywhere, clears the way", and "One each level". Then
(10:33): a level that brings a new coop pops up a card offering to place it now (its three chickens with it); otherwise
it waits somewhere easy to reach with a red dot. Two live steps: the fields (this one), then placing coops.
- **Level-ups:** the XP (eggs, chicks) fills the ring as before (`xpFor`: 60 XP for level 2, 257 for 3, 607 for 4...).
  A new level: its card once ("🎉 Level 2! Your farm is growing.", the number big in a golden ring, "New at this level:
  a new field is for sale: 100 coins", "See the field", which glides the view there: the player's tap), after any
  congratulations card, never over another card; several levels at once: one card, the latest. The level card (tap the
  level) also says how much land is yours and what the next level brings ("At level 3: a new field for sale").
- **The fields (`fields.py` -> `models/fields.json`):** the farm inside its bounds, less its lanes (the plots' little
  gate paths left out: no set places any more, and in the game they're no longer drawn), the streams and the pond with
  their banks, split into 30 fields: the lanes and the water are their natural borders, and the open stretches between
  are shared out evenly by growing fields from seeds over the ground (geodesic, never across a lane or the water; a few
  rounds of moving each seed to its field's middle). The home field (the first coop and the farmhouse, 147 m²) is the
  farm's from the start; the rest (50-170 m², a coop or two each) come up for sale in order: always one touching your
  land or just over a lane from it, the nearest to home first. Saved as a quarter-metre grid (run-length rows) and each
  field's borders as simplified lines saying what's over them (another field, a lane, water, the farm's edge).
- **On the farm (`main.js` "levels and land"):** your land is the mown farm; the wild meadow has a warm tint over the
  ground (a picture of the fields, soft-edged), long grass (the village's grass tufts, taller and fuller, each spot's own
  so it stays put as fields are bought) and wildflowers; fenced off with a rustic post-and-rail fence (posts about every
  1.5 m along smoothed lines, two rails) wherever it meets your land or a lane (not between two wild fields, the woods or
  the water). The farmer keeps to your land and the lanes (the fence, and the meadow's edge with the woods, are in the
  walking grid, made again in place when a field's bought). The next field, once your level allows it: a painted FOR
  SALE / À VENDRE sign just inside its fence where it meets your land, on clear ground, not under a tree, near your first
  coop; stakes with red ribbons along its borders with the rest of the meadow; a bubble ("🪧 For sale · 100"). Tap it or
  the field: its card ("A field: wild meadow with room for a coop or two..." and "Buy for 100 coins", or "Not enough
  coins yet"). Bought: the coins counted down, its long grass shrinks away as it's cut, the tint goes, the fence moves out
  round your land, "The new field is yours!". A tap on the rest of the meadow: "Wild meadow · for sale at level 6".
  Prices `landPrice`: 100 coins for the second field, 120, 140... up to 10,000 for the thirtieth (100 × 100^((k−1)/28)).
- **The save:** `land` (the fields owned: only the first in order, at most one a level, anything else put right and
  flagged; a farm from the plots version keeps as many as it had) and `lvSeen` (the last level whose card was shown, at
  most the level; a farm from before this step owes no card). Where the coops stand: the next section.
- `landtest.mjs` (`LANG=fr`, `W=874 H=402`): a new farm (the home field, the meadow fenced with its long grass, nothing
  for sale, what level 2 brings, a tap on the meadow); level 2 (its card once, the bar, the sign, stakes and bubble; a
  reload: no card again); not enough coins; bought (coins, the field's long grass gone, the fence moved, the farmer can
  walk there now and couldn't before); level 4 at once (one card, the next field at 120); a reload; a save changed
  outside (fields in order, one a level, the card mark); a farm from before this step.

## The game, release 1 step 5b: coops where you like (25 Oct 2026, Audrey: "Drag anywhere, clears the way")

Audrey (25 Oct): "people will have choice to put their coops where they want so no predefined places", and for placing
she chose "Drag anywhere, clears the way". Then: a level that brings a new coop pops up a card offering to place it now
(its three chickens with it); otherwise it waits somewhere easy to reach with a red dot. This step is placing and moving
(the one coop a farm has so far); the new coops and their store come with the new breeds (step 6).
- **Where a coop stands** (`game.js`: `x`, `z`, `deg` on each coop; `HOME_COOP`): its middle on the farm, on a
  quarter-metre grid, facing one of four ways. A new farm's first coop stands where the village's first plot was, in the
  home field. A farm from before this step (`plot: 0`) keeps its coop there, not flagged.
- **Its card:** tap a coop by day (its house or its pen, not a bird, the nest window, the pop door or the feeder): its
  name, breed (rustic), who lives there ("Albert, Peggy and Fern live here."), "Put it anywhere on your land. Trees,
  bushes and rocks in the way are cleared." and "Move this coop". At night a tap still takes you inside.
- **Moving it** (`main.js` "coops where you like"): the view glides back a little to show room round it, the coop in
  the middle of the farm above the bar (the player's tap); the coop is drawn on its own while it moves, with its outline on the ground (green where it can go, red where it
  can't, an arrow out of its gate) and a bar along the bottom: what the spot's like ("Drag the coop, or tap where it
  should go.", "A good spot!", "A good spot! What's in the way will be cleared.", or why not: "Only on your own land.",
  "Not on a lane or in the water.", "Not enough room here.", "Too close to another coop.", "Its gate would be shut in
  here.") and ↻ Turn (a quarter turn), Cancel, ✓ Put it here (only when the spot's good). A finger on the coop carries it
  (a finger elsewhere still moves the view, two pinch); carried to the screen's edge, the view goes along; a tap
  elsewhere puts it there. Its hens come along in their pen; once it's still a moment no grass shows through its pen.
- **Where it can go** (`coopSpot`): every point of the coop and its pen on fields you own (right up to a lane's edge;
  the ground just outside its gate may open onto a lane), clear of the buildings and props (the farmhouse and its
  garden, the way out of its front door, the well, the vegetable patches, bales, lamp posts...) and of other coops; its
  gate must open onto the farm (checked with the walking grid as it would be). The home field alone has little room (the
  farmhouse takes much of it); each field bought gives more.
- **Put down:** saved; the trees, bushes and rocks in its way (and their crowns over it) shrink away in a puff of leaves
  or dust and are gone for good (`cleared`: their ids, t12, b40, r3); its old spot grows grass again (the village's plots
  had none: in the game they're grassed over like round them, `fillPlotGaps`); the walking grid, its lantern's pool of
  light at night, its pop door, the grass, flowers and pebbles round it all follow. "The coop is in its new place!" Not
  while the farmer's in a pen (or on his way to one), a farewell is on, or Rusty's about ("Not just now: try again in a
  moment."); youngsters due to leave wait till it's down.
- **The save:** each coop's `x`, `z` (numbers on the quarter-metre, within the farm's reach) and `deg` (0, 90, 180,
  270); `cleared` (ids, each once). On every load the farm checks each coop stands where a coop can (else it's moved to
  the nearest good spot to home) and clears what's under it; a save changed outside the game is flagged as before.
- `movetest.mjs` (`LANG=fr`, `W=874 H=402`): the home spot; a tap on the coop: its card; moving (the bar, a finger
  carries it, the wild meadow, a lane and the farmhouse each say why and can't be chosen); Cancel; not while the farmer's
  busy; level 2 and the next field: moved there (bushes to clear), turned, put down (saved, cleared for good, no grass in
  its pen, the farmer can get to its gate, its old spot open); a reload; a save changed outside (a coop on the wild
  meadow: flagged, put back on your land); a farm from before this step.

## The game, release 1 step 6: new breeds by level (25 Oct 2026, Audrey: "Perfect, next")

Audrey (25 Oct): "when people reach a level where they unlock a coop. They get notify that they have it with it 3
chickens and can place it whenever they want. Probably a pop up offers to do it right now. Otherwise it needs to be
stored somewhere easy with a little red dot on it to say notifications".
- **The breeds by level** (`game.js` `BREED_LEVEL`, from `claude/game-plan-v2.md`): the Rhode Island Reds from the start,
  the Buff Orpingtons at level 5, the Silkies (the white trio) at 6, the Cream Legbars at 11, the Light Brahmas at 17; each
  a forever trio (a rooster and two hens, three personalities, names not yet on the farm) with its own rustic coop. The
  other Silkie colours come with release 2.
- **At its level:** the level card says so ("New breed: Buff Orpington! A rooster and two hens, yours for good, with their
  own coop. Put it anywhere on your land.", and the field for sale if there is one), with "Place their coop now" and
  "Later" always in sight at its bottom ("It waits for you in Your coops (the little barn up top).").
- **Your coops:** a little barn in the top bar, with a red dot while a new breed's coop is waiting. Its sheet: each
  waiting breed ("New!", "Place it"), each coop on the farm (its name, breed, rustic, "Move"), and what's next ("At level
  6: Silkie"). Also the way to move a coop at night, when a tap on it takes you inside.
- **Placing it:** the coop and its trio appear at the nearest spot to the middle of the view where a coop can stand
  (facing you, best with nothing to clear), and are moved like any coop (drag, tap, Turn, the green or red outline).
  Cancel and it's back in Your coops; put down, it's on the farm for good: its feeder full, its hens laying from then on,
  "Welcome, Gus, Juniper and Dotty!". No room on your land: "No room on your land for another coop yet: buy the next
  field." Until it's placed nothing of it is saved (the trio is made when it's put down).
- **The farmer and a coop put down:** if it lands where he's walking he steps out of its way (to the nearest open ground,
  in its puff), and thinks again about where he was going with the farm as it is now (`clearWalkers`).
- **The rustic coops** (`stylized/coops.py` `rustic_house`; `export_coops.py`: `rustic_orp`, `rustic_leg`, `rustic_sil`,
  `rustic_bra`): each house built again with every colour weathered (faded, greyer, rougher) and touches of its own: the
  Thatched Cottage's posts gone grey, moss and gaps in its thatch, boards on its walls; the Stone Cottage's slates with
  moss and a patch of tin, boards across its side window; the Pagoda's lacquer faded, torn paper in its lattice, boards on
  its walls; the Timber Lodge's logs gone grey, moss on its shingles, a patch of tin, a boarded window. All with the
  shared rustic fence. Their lanterns still light up at night. (coops.glb 2.5 to 3.8 MB.)
- **The save:** a breed's coop only once its level has come, and one of each (anything else dropped and flagged); a
  placed coop's trio as any other birds.
- `breedtest.mjs` (`LANG=fr`, `W=874 H=402`): a new farm (nothing waiting, Your coops); level 5 (the card, its buttons in
  sight; Later: the red dot; Your coops: Place it; Cancel; put down: the trio, the rustic house, a full feeder, the coop
  card); a reload; level 6 from its card (the white Silkies, the rustic Pagoda); a save changed outside.

## The game, release 1 step 7: experience stars, cuddles and trust (25 Oct 2026, Audrey: "Very good, carry on")

From the plan (`claude/game-plan-v2.md`): each bird earns up to 5 stars with time on the farm and the love you give it;
the 2D game's cuddles and trust carried over (game-design-v1.md) and made the farm's own.
- **Cuddles:** "♥ Cuddle" near the top of a bird's card (by day; at night "Cuddles in the morning: Arthur is asleep."). It
  counts at once (rules first, as in the 2D game): the bird is happy for 6 hours (the card then says "♥ Happy after a
  cuddle: 5 hours left" instead of the button), and while her trust is still growing, a cuddle's worth of trust and 8
  experience. The card closes and the farmer comes into the pen, crouches and strokes her, hearts floating up ("Arthur
  gives Clover a cuddle ♥"); he isn't needed for it to count (out after Rusty, or she's busy laying: it still counts).
- **Trust** (0 to 15 cuddles, as in the 2D game): Shy, Friendly at 3 ("Clover is getting friendly with Arthur."),
  Trusting at 8 ("Clover trusts Arthur now, and comes to the fence to say hello."), Best friend at 15 ("Clover and Arthur
  are best friends! +20 XP"). The card: the three hearts, "2 more cuddles to “Friendly”", what it does. Trusting and best
  friend birds come to greet the farmer: when he stops to look at their coop over the fence they trot to the front fence
  (`greetFarmer`), stand facing him, a heart over each, then go back to what they were doing.
- **Experience** (`game.js` `expOf`, `stars`): 100 a star, up to 5. It comes with time on the farm (5 a day, up to 250: two
  and a half stars over 50 days), cuddles (8 each while trust grows: up to 120) and raising chicks (the mum 60 a brood,
  the rooster 30). The card: the stars, a bar to the next one, how they come ("Stars come with time on the farm, cuddles
  and raising chicks.") and what they do ("Each star makes her eggs a coin dearer. The more stars, the better her
  chicks."). A star earned while you watch (a cuddle, a brood, a new day): "★ Clover has earned a new star!" and a little
  burst of hearts over her.
- **What stars do:** each egg sells for a coin more for each star of the hen who laid it (the coop keeps the eggs' star
  bonus, `bonus`, so a nest of eggs from different hens is paid right); the chicks rate higher (already: `kidsOf`).
- **The save:** each bird's `happy` (till when, at most 6 hours on) and `trust` (0 to 15) as before; each coop's egg
  `bonus` (at most five a egg in its nest). The stars always come from the save's experience and how long the bird's been
  on the farm, never stored.
- **A proper cuddle** (25 Oct, Audrey: "Please see the clipping. Also the cuddle is not super interactive as the farmer
  does not even really touch the chicken. Could you do a proper cuddle ?"): he crouches, she comes round to his front
  (`Bird.comeForCuddle`: from behind him, by points wide of his feet, never through him; the last little steps up to him
  in her 'cuddle' act; whoever sits where she'll be gets up and off, `shooFrom`, and the others make way for her in
  `separate`), then he picks her up in both hands (`farmer.js` pose `scoop`), stands with her held to his chest (`hold`:
  his left arm under her, his right hand stroking her back, `W.hug`), her eyes shut, hearts floating up, "There, there…",
  and crouches to put her back down where she stood (`penSpec` `lift`: her place from the ground to his arms, `letGo`).
  The others keep clear of him (`fb` 0.42), and when he walks their way they step aside off his path instead of being
  herded along in front of him (`penStep`, `farmer.dir`).
- `cuddletest.mjs` (`LANG=fr`, `W=874 H=402`): the card's button; a cuddle (counted, the card, the farmer's visit: she
  comes round to his front, he picks her up and holds her with her eyes shut, puts her down, no bird walks into him); no
  second one while happy; 6 hours on; Friendly, Trusting, Best friend (+20 XP), trust stopping at 15; a star from a cuddle;
  stars from time; eggs a coin dearer a star; at night; the greeting at the fence; a reload; a save changed outside.

## The game, release 1 step 8: the Breed Book (25 Oct 2026)

From the plan (`claude/game-plan-v2.md`): "a book on the farmhouse shelf with a page for each breed and each Silkie
colour: its picture, found or not yet; how to get it; its eggs and its coop". For now the five breeds of release 1; the
other Silkie colours (release 2) and the fish (release 5) get their pages when they come ("More pages to come.").
- **Opening it:** tap the farmhouse, by day or night (`main.js` `farmhouseAt`: its model's box, checked after the birds
  and the coops, before the land behind it), or "📖 Breed Book" at the bottom of Your coops.
- **The book** (`gameui.js` `bookSheet`, `game.js` `bookPages`): "Breed Book" / "Livre des races", "1 of 5 breeds found",
  then a page for each breed in level order: Rhode Island Red, Buff Orpington, White Silkie, Cream Legbar, Light Brahma.
  Each page: its picture; its name; found (its coop on the farm): "On your farm: Rupert, Henrietta and Mabel" (the
  rooster first); not yet: "Comes at level 5" and the picture a dark silhouette, or once its level has come "Their coop
  is waiting for you in Your coops" with "Place it"; its eggs, a little egg in the farm's own colour for them ("Brown
  eggs · 6 coins an egg, plus a coin for each star of the hen"; light brown, cream-tinted, blue, light brown; 6 to 9
  coins from `EGG_PRICE`); its coop ("Red Barn, rustic to start"). Upright a taller sheet (the hint hidden while it's
  open); sideways the card on the right, a little wider than the others (fewer lines). Names set as text, never HTML.
- **The pictures** (`book/<breed>.webp`, 320 x 320, 18 to 28 KB each, copied by `build.sh`): `bookpics.mjs` stands each
  breed's rooster and hen from the test page's line-up (`index.html?lineup`; the Silkies the white ones) together on
  their own, the hen in front, both turned to the left and looking round at you; shoots them through a long lens on black
  and on white and cuts them out from the two (soft fur edges and their soft shadow see-through), crops round them and
  shrinks them. The birds are only stood and posed for it; no model or look changes (the Silkies as they are).
  `./withserver.sh node bookpics.mjs` makes them again (`PREVIEW=folder` for PNG previews, found and not).
- **The save:** nothing new. Found or not comes from the coops on the farm, the levels from the XP.
- `booktest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder` for pictures): a real tap on the farmhouse (the book, "1 of 5",
  the pages in order with their pictures, the Reds' trio named, the others "level N" as silhouettes, eggs, coops, "More
  pages to come", all in sight); closed, nothing saved; Your coops' button; at night; level 5 (the Orpingtons waiting,
  "Place it" from the book, placed: "2 of 5", their trio named); a name with code in it shown as text.


## The game, release 1 step 9a: shows, the rules and the screens (25 Oct 2026, Audrey: "Shows (Recommended)")

Step 9 brings across from the game she plays now, one piece at a time; Audrey chose shows first, a "Show day on the farm"
(a white show tent on the green, the farmer carrying the bird there, the judge, the rosettes pinned: step 9b) and the
judging "Hours later" (enter today, the show day the next time you open the game after judging time). This first part is
the rules, the Shows sheet and the results; the show day itself comes next.
- **The shows** (`game.js` `SHOWS`, `openShows`): each day at 7:00 a Village show opens (from level 4 a County show too,
  from level 9 the National Poultry Championship), open for a day and judged the next morning at 7:00. Their names from the
  2D game ("Bramley Cross Village Show" / "Concours de Bramley Cross", "Weald County Show" / "Concours régional du Weald",
  "National Poultry Championship" / "Championnat national avicole"). The Village and the National: any breed; the County,
  about two days in five, one breed only. Entry 10, 40, 150 coins; prizes 60/30/15, 250/120/60, 1000/500/250 coins (and
  12/6/3, 40/20/10, 100/50/25 XP, 2 XP for taking part). Starting values: the balance is step 11.
- **The judging** (`showScore`, `showTick`): a bird's score is 50 + 9 a star (her experience, as stars to the decimal, on
  the judging morning) + 2 a trust level (calm in the judge's hands), a Diva's 8% more, and the luck of the day (up to 10
  either way, from the show and the bird); against the day's other entries (5, 7, 9; each a score round 52, 66, 80, the same
  for every player, from the show's own numbers). 1st, 2nd and 3rd: a rosette for her card (kept for good) and the prizes;
  a win at the County or the National makes her a champion ("🏆 County champion" by her name). Her chance of a rosette
  (`showChance`): worked out over the luck of the day, each of the others beating her with the chance their spread gives
  (slim under 15%, fair under 40%, good under 70%, great): a new bird about 1 in 3 at the Village, half with full trust.
- **One bird a show, a show at a time for each bird.** The fee when she's entered; the results whenever the farm next
  looks after 7:00 (the coins and XP in, then "🏆 Show results": each bird's place, her rosette, "+60 coins · +14 XP",
  "Lovely!"; a bird that didn't place: "Time on the farm and cuddles will help.").
- **The screens** (`gameui.js`): a rosette in the top bar (a red dot when today's show is open and you haven't looked yet,
  or results are waiting); the Shows sheet: each show (its name, who may enter, "Results at 7:00, in 21 hours", the
  prizes), your best bird for it with her chance and "Enter Reginald · 10" (quieter when her chance is slim; "Not enough
  coins: the entry is 40"), "Choose another bird" (each with its chance), a bird entered ("Reginald is entered: results at
  7:00, in 21 hours"), the locked ones ("From level 4"), how shows work. A bird's card: her rosettes by show and place, a
  champion, the show she's in. The level card at 4 and 9 says which show comes.
- **The save:** `shows.in` (a show open when she was entered, of a tier the level allows, the breed it's for, one a show,
  a show at a time for each bird), `shows.res` (the results still to be seen, each as the show's own numbers make it, the
  prize checked), `shows.seen` (the day the sheet was looked at), each bird's `ros` (9 counts: at most a show a day since she
  came). A little slack for a phone taken across time zones. Anything else is dropped and the farm flagged.
- `showtest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): a fresh farm (the rosette and its dot; the sheet: the Village
  show, the best bird and her chance, Enter on screen, the County and National locked; the dot gone); entered (the fee, a
  word, the sheet and her card say so; no second bird in it); a reload; the next morning (the results card, 1st, the
  prize and XP, her rosette on her card; seen, not again); level 4 (its card brings the County show; not enough coins); a
  save changed outside (an entry before its show, a bird not there, 40 rosettes in a day, a prize of 5000).

## The show ground and the judge (25 Oct 2026, for release 1 step 9: Audrey chose a "show day on the farm")

When a show's results come, a white show tent stands on the farm, the farmer carries the player's bird there, a judge looks
at each bird in its little show coop and pins the rosettes. These are its pieces and a test view; the show's rules, screens
and save (`game.js`, `gameui.js`) and the scene's choreography (`main.js`) are written separately.
- **The show ground** (`stylized/showground.py`, `stylized/export_showground.py` writes `showground.glb` + `showground.json`):
  a white marquee 4.4 x 2.3 m (eaves 2.35 m, two peaks 3.2 m with a gold knob and a pennant each), open along the side
  that faces the player, a scalloped valance with a red trim, seams on its canvas, its front canvas rolled up, wooden poles,
  guy ropes with runners and pegs (the front ones running out sideways and back, clear of the open front), bunting along the
  front; inside, a trestle table under a green pleated cloth with six little show coops in a row; a sign board on two posts
  with a little roof (its words are drawn by the browser); the judge's folding table (his clipboard, the rosette box, a cup
  of tea). The rosettes: 1st red, 2nd blue, 3rd yellow (17 cm across, 230 triangles), the champion's red, white and blue
  with three longer tails (22 cm, 374 triangles), each built round its pin. Meshes: `show_tent` 9,936 triangles,
  `show_pens` 4,568, `show_sign` 432, `show_jtable` 848, `show_clipboard` 100 (the one on his table, hidden while he carries
  his own): 15,884 in all; 507 KB.
- **The little show coops** (25 Oct 2026, Audrey: "the chickens should not be in a cage it has a bad connotation. So either
  an open nest, or some individual small coops"; they replace the first show pens): six tiny wooden houses side by
  side on the table, each in its own soft colour (cream, sage, pale blue, butter yellow, blush, lavender), open at the front
  with nothing across the opening, so the bird inside shows whole from the game's view: board walls at the back and sides
  (each board a shade of the colour, a darker backing between the back boards), a pitched roof (33 degrees) of three
  courses of lapped shingles a side in a deeper shade of the coop's colour, a white ridge cap, white barge boards along the
  front edge of the roof, a white gable piece under the ridge with a heart cut out of it, a little pennant on the ridge
  (blue, red, yellow, blue, green, yellow), corner boards in the coop's colour either side of the opening, a white front
  board under it (where the rosette is pinned), a straw floor with loose straws (a couple over the front board), and the
  coop's card hanging on a string under the eave at the left. Inside 0.54 m wide, 0.93 deep, 0.89 high to the eaves and
  1.08 to the ridge (a Light Brahma rooster, 0.71 m tall and 0.8 long with his tail, stands with 7 cm either side and 2 cm
  behind his tail); 1.16 m tall on the table (1.25 to the pennant's tip), 0.67 m from one to the next. The row stands
  0.15 m inside the tent's open front (the pens were 0.38), so the coops' fronts, gables and roofs show under the valance
  from the game's view; the footprint of the whole show ground is unchanged. About 660 triangles a coop.
- **`showground.json`** (the show ground's own frame: x across, y up, z towards the player; turned 45 degrees it faces the
  game's camera, as the decorations): for each coop (`pens`) its middle (`x`) and `front` (z), where its bird stands
  (`bird`: x, y on the straw, z: 0.37 m in, a touch left of the middle) and turns (`birdYaw`, a little to the right), its
  `room` (inside: wide, deep, high to the eaves), its rosette `pin` (on the white board under the opening, in the middle: the
  rosette hangs over the table's cloth, never in front of the bird), its `card`, its `door` (the opening's middle, where the
  farmer lifts the bird in), where the judge stands to peer in (`judge`, `judgeYaw`: at her) and to pin its rosette (`pinAt`,
  `pinYaw`), where the farmer stands to put a bird in (`farmer`, `farmerYaw`); `floor`, `top` (the coops' eaves), `sill`,
  `ridge`, `eave`, `valance`; footprints: `tent`, `table`, `signFoot`,
  `judgeTable` (with where the judge stands behind it, facing the player), the guy ropes' `pegs` and the whole `foot` (for
  placing it on open grass: x -3.55..3.22, z -2.1..1.94); the open strip in front of the coops (`aisle`) and the `entrance`;
  the sign's face (`sign`: its middle, size and normal, for its words); each rosette's `pin` (its origin), middle and size.
- **The judge** (`stylized/character/farmer.py`, look `j`): an older gentleman, so he reads at once as the show's judge from
  the game's view, next to Arthur's beard and straw hat and Rosie's plait: silver hair, a big white moustache, bushy white
  brows, little round glasses, a brown felt hat with a dark green band and a pheasant feather, an olive tweed jacket (its
  check drawn per pixel, as the farmers' shirts) with lapels, buttons, pocket flaps and a mustard handkerchief, a cream
  shirt and a red tie, grey trousers, brown leather boots. On the farmers' own body and face rig, his clipboard (left hand)
  and pencil (right hand) hidden until wanted. `export_farmer.py web3d/models j` writes his own `judge.glb` (817 KB,
  25,788 triangles) + `judge.json` (the farmers' 42 bones, plus his clipboard's and pencil's; where a held thing goes in his
  hand: `info.j.hold`); `farmer.glb` is untouched (Arthur and Rosie the same to the vertex, checked against the old script).
- `src/farmer.js`: `addLook()` adds the judge after `initFarmer()`, then `new Farmer(parent, 'j', ...)` drives him like
  Arthur and Rosie (walks, blinks, looks, mouths); props `clipboard` and `pencil`. New poses: `judge_look` (leaning in to
  peer into a coop, hands clasped behind his back), `judge_write` (the clipboard flat on his left forearm, writing),
  `judge_pin` (reaching out with a rosette to the board under a coop's opening), `clap`, `judge_carry` (his clipboard up
  against his chest, for walking); a new face, `peer` (eyes narrowed, weighing a bird up).
- `src/showground.js`: `loadShow(loadGLB, loadJSON)` (once, when a show is on); `ShowGround(parent, { x, z, deg, grade })`:
  the pieces placed, `pen(i)` (coop i's places in the world), `pin(i, kind)` (a rosette on coop i), `hold(judge, kind)` (a
  rosette in his right hand, by its pin), `reachPin(judge, i)` (moves him so the rosette in his hand is at coop i's pin; then
  `pin(i, held)` hands it over), `clipboard(on)` (the one on his table), `sign(title, line)` (its words, in the player's
  language, with a little rosette either side of the line).
- **`?lineup=show`** (test page): the show ground on open grass beside the village, the line-up's own birds in the coops (a
  Rhode Island Red, a Buff Orpington, a white Silkie, a Cream Legbar, a Light Brahma hen and rooster), the four rosettes
  pinned, the judge going through his poses in turn (every 3.5 s: looking into a coop, writing, pinning a rosette, clapping,
  holding his clipboard, walking along the coops), Arthur standing by, hands on hips. `&pose=judge_write` (or `walk`) holds
  one, `&pen=N` puts him at coop N, `&lang=fr` the French sign ("Concours avicole"). In `main.js`: the import, `'show'` in the
  line-up list, the line that makes it, its view, its tick and its place in `clampView` (six lines).
- `showgroundtest.mjs` (`LANG=fr`, `W`, `H`): the coops, a bird of each breed inside her coop on the straw, the rosettes,
  the judge's every pose (the clipboard and pencil when wanted, the rosette held and brought to within a centimetre of the
  coop's pin, the walk), a real tap on a bird in a coop, no page errors. `showshot.mjs` takes pictures (`SHOTS`: views, poses, close-ups).


## The game, release 1 step 9b: the show day (25 Oct 2026, Audrey: "Show day on the farm (Recommended)", "Hours later (Recommended)")

The judging's morning, the results in and the farm free, by day (7:00 to 21:00 on the phone's clock): "🎀 Show day! The
results of the Bramley Cross Village Show are in: the judge is looking at the birds." with "Watch the judging" and "Just
the results" (`gameui.js` `showDayCard`). At night, or with a farewell on or the farmer in a pen, the results card as
before. Several shows judged at once: the scene shows the grandest (National, County, Village), the card has them all.
- **The show field** (`main.js` `showSpot`): the farm itself has no room for a 7 x 4 m tent (the home field holds the
  farmhouse and the first coop; the fields beyond are wild meadow), so the show is on the village's show field, open grass
  just past the farm's edge on the side of the first coop, at its height up the screen (or past the farm's front), clear
  of the lanes, the water, the props and the trees. Watching takes the view there (the player's tap: the view never moves
  by itself), the whole tent across the screen upright or sideways (the view free of the farm's bounds meanwhile), and
  back to where it was once the results card is closed.
- **The scene** (`src/showday.js` `ShowDay`, from the show ground and the judge of `showground.js`): the white tent with
  its sign ("Village Show" and the town, "Concours de village"), the other five entries already in their little coops
  (any breed, hens and roosters, Silkies of six colours), her coop one of the six. The farmer (the player's own look) comes
  up from the front holding her in his arms (the cuddle's hold), lifts her in at her coop's open front onto the straw and
  steps back by the sign, hands on hips ("Arthur brings Clover to the show…"). Meanwhile the judge takes his clipboard
  from his table, waits at the first coop, then goes along them all peering in and writing ("The judge looks at every
  bird…"); at hers she hops and flaps. Back at his table he fetches the rosettes ("And now, the rosettes!") and pins them
  on the coops' fronts, third, second, first (the champion's rosette for a County or National winner); hers if she
  placed, hearts floating up over her and the farmer cheering (arms up, a wave). Then everyone claps and the results card
  comes up over it. About 35 seconds; "Skip ⏭" at the bottom right jumps to the end, every rosette pinned. Meanwhile the
  farm's own farmer and her bird are away at the show (hidden), and taps on the farm do nothing; closed, the tent's gone
  and they're home.
- Nothing new is saved: the result is the game's (`showTick`), the scene only shows it (the places of the others' rosettes
  and the other entries from the show and bird, the same each time).
- `showdaytest.mjs` (`LANG=fr`, `W=402 H=874`, `SHOTS=folder`): the next morning "Show day!"; Watch: the tent, the view on
  it with the whole tent on screen, Skip, the other entries, the farmer and her bird away; a tap on the farm does nothing;
  she's put in her coop on the straw; three rosettes pinned (hers too), the results card; closed: the tent gone, the farmer
  and her bird home, the view back; at night the results straight away; Skip: straight to the end. `showtest.mjs` takes
  "Just the results".

## The game, release 1 step 9c: daily jobs (25 Oct 2026, Audrey: "Daily jobs (Recommended)")

The 2D game's farm jobs made the new game's own (`game.js` `JOBS`, `jobsFor`, `job`, `claimJob`; `gameui.js`
`jobsSheet`).
- **Three a day** on the phone's calendar, new at midnight: the first always an easy one (collect eggs, or give cuddles),
  the other two different ones of collect eggs, give cuddles, fill a feeder, enter a bird in a show (more kinds as the
  wheat field and the decorations come). The day's jobs are the same for that day and level (from the day's own numbers).
  Targets grow a little with the level the day's jobs were set at: eggs 4 + 2 a level (at most 30), cuddles 1 + one every
  three levels (at most 6). Reward: 15 + 5 a level coins and 5 + the level XP each (level 1: +20 coins · +6 XP).
- **Counted where they happen:** eggs collected (the nest, its bubble, a nest box inside at night), a cuddle that counts
  (not while she's still happy from the last), a feeder filled, a bird entered in a show. A job done: "Job done: Give a
  cuddle! Collect your reward in Today's jobs." said once what was done has been said (`hintNext`).
- **Today's jobs:** a clipboard in the top bar, with a dot for a new day's jobs not looked at yet, and the number of
  rewards ready to collect. Its sheet: each job (its icon, what to do, a bar, "1 / 1 · +20 coins · +6 XP", "Collect" once
  done, then "Done ✓"), "New jobs every day at midnight."
- **The save:** `jobs` (the day, the level they were set at, each job's progress and whether it's paid): a day not ahead
  of today, a level the farm has had, the jobs that day's numbers give, done at most to the target, paid only once done.
- `jobtest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): the clipboard and its dot; the sheet (three different, the
  first easy, progress and reward; the dot gone); doing them (each counted, the word, the number 3); Collect (coins and XP,
  Done ✓, the number down, not twice); a reload; midnight (new jobs, the dot); a save changed outside (more than the
  target, paid before done, tomorrow's jobs, a level the farm hasn't had).

## The game, release 1 step 9d: decorations (25 Oct 2026, Audrey: "Decorations and outfits (Recommended)")

The 2D game's "Decorate your farm" made the new game's own (`game.js` `DECOR`, `buyDecor`, `moveDecor`; `gameui.js`
`shopSheet`, `decorCard`; `main.js` the decorations on the farm, after `clearAway`).
- **The shop:** tap your coins at the top. The 2D game's eight, each with its picture (`decor/`, the 2D game's own, the
  same Blender models as the 3D ones), what it brings ("Butterflies come to it."), its price and XP, and "Buy and place";
  one its level hasn't come for greyed with "Comes at level 13"; not enough coins: "Not enough coins yet"; one on the farm:
  "On your farm" and Move. Levels and prices (starting values, the balance is step 11): flower bed 3 / 400, bird bath 4 /
  800, beehives 6 / 1,800, duck house 8 / 3,000, greenhouse 10 / 6,000, windmill 13 / 12,000, bandstand 16 / 20,000,
  golden cockerel 20 / 40,000; XP a fiftieth of the price. A new level's card says which come with it.
- **Placing one:** it appears at the nearest good spot to the view (best with nothing to clear, and never shutting off the
  way to a coop's gate), with its outline on the ground (green, red where it can't go) and the move bar without Turn (they
  always face you, as in the village): drag it, or tap where it should go; "Put it here" buys it then ("New on the farm:
  Cottage flower bed! +8 XP"); Cancel costs nothing. Anywhere on your own land: never on a lane or in the water ("Not on a
  lane or in the water."), off your land ("Only on your own land."), over a building, a coop (or just outside its gate) or
  another decoration ("Not enough room here."), or shutting off a coop ("It would block the way to a coop."). Trees,
  bushes and rocks in the way are cleared in their puff, for good (the save's `cleared`).
- **On the farm:** each is its own copy (not batched: they come and go and move), in everyone's way (the walking grid, and
  the coops' spots), no grass, flowers or pebbles through it (`underCoop` covers them too); the farmer stops by them on
  his rounds; the life round them is the village's (`decorlife.js`: bees, butterflies, the bath's birds, the cockerel's
  glints, the bandstand's music, a tune when tapped; the windmill's sails turn). Tap one: its card, Move (moved like
  placing it, "Cottage flower bed: moved!"). A tap goes to whichever is in front, a decoration or a coop's house.
- **The duck house** goes straight onto the pond where the village has it ("Buy · 3,000"), the view to it, and the ducks
  sleep in it from that night (`duckFlock.setHouse`, its raft kept clear by whoever swims).
- **Outfits** (the shop's second shelf, "Outfits"; the 2D game's six, made in 3D by `farmer.js`, see "The farmer's outfits"
  below): Classic from the start, Market day at level 5 (1,200), Garden party 9 (3,500), Winter woollies 12 (6,000), Rodeo
  15 (10,000), Show day 18 (16,000); XP a fiftieth of the price. Each with the 2D game's picture of your own farmer
  (`outfits/`), what it is, and "Buy and wear", "Wear", "Wearing" or the level it comes at. Bought: worn at once, the shop
  closes and the view goes to the farmer ("Arthur tries on the Market day outfit! +24 XP"). The farmer wears it on the farm
  from the moment the farm opens (`dressFarmer`: the outfit's hat and bits loaded only when worn) and on show day. A new
  level's card says which outfit comes with it. The save: `farmer.outfits` (known ones, once each, from their level) and
  `farmer.outfit` (one bought, else the classic); both only once one's bought.
- **The save:** `decor` ({ id, x, z } on the quarter-metre; the duck house just { id }): each known one once, only from its
  level, a spot on the map; the farm then makes sure each stands where one can (a spot that's no good any more: the
  nearest good one).
- `dectest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): the shop (eight, pictures loaded, five to buy, three greyed);
  Buy and place (the spot, green, no Turn, nothing paid); off your land (red, why); Cancel (nothing paid or there); Put it
  here (paid, saved, in the grid's way, no grass, the word, its butterflies); tapped (its card, Move); moved; the bird
  bath, the beehives and the duck house (the ducks' house); a reload; a save changed outside (one twice, one not known,
  one before its level, a spot off the map); the outfits (six, pictures, the classic worn, two to buy; Buy and wear: paid,
  worn on the farm, the word; the classic again; a reload; a save changed outside: one not known, one before its level, one
  worn not bought). `decshow.mjs OUTDIR`: all eight on a level-20 farm, a picture of each. `decfilm.mjs OUTDIR`: a film.

## The farmer's outfits (25 Oct 2026, for the game's shop)

The 2D game's six outfits, each a hat and a shirt, for Arthur and Rosie: Classic (the straw hat and checked shirt, the
farmer as made), Market day (`market`: tweed flat cap, blue check), Garden party (`garden`: flowery sun hat, yellow
gingham), Winter woollies (`winter`: red bobble hat, green jumper), Rodeo (`rodeo`: cowboy hat, chambray shirt, red
neckerchief), Show day (`show`: top hat, white shirt, prize rosette). The shop, the prices and the save are the game's
(`game.js`, `gameui.js`); these are the clothes. The judge keeps his tweeds.
- **The files** (`stylized/export_farmer.py web3d/models outfits`, or `outfits=market,show`): one for each outfit,
  `models/outfit_<id>.glb` + `.json`, loaded only when someone wears it, holding only what the outfit changes, from the 2D
  game's own Blender model (`farmer.py`'s `OUTFITS`): its hat (everything on the hat's bone), the rosette or the neckerchief
  on the chest, and for Rosie under the cap, the bobble hat, the cowboy hat and the top hat, her hair over the top of her
  head (`farmer.py hair_top`: her hair was made for under the straw hat's deep crown, and the 2D top hat showed bare scalp).
  One mesh for both looks where they're the same shape (the sun hat's brim droops like each look's own straw hat). The hat
  bands are kept as made (simplified, their edges came out frayed). 80 to 226 KB an outfit (`farmer.glb` is 1.6 MB);
  1,284 to 3,486 triangles, and 1,200 more for Rosie's hair. Every part is on the farmers' own 42 bones (checked against
  `farmer.json` when exported), so every pose and face, the torch and the pail work the same in every outfit. The json:
  the meshes for each look, the bones whose Classic parts it hides (`hide`: the straw hat), the shirt (`check` with its
  three colours and how fine, 135 or the gingham's 230; `plain`; `knit`), and Rosie's plait ribbon's new colour where the
  hat band's differs (the 2D game ties them: pink with the sun hat, brown with the cowboy hat, red with the top hat).
- **`src/farmer.js`**: `await loadOutfit(id, loadGLB, loadJSON)` (main.js's own loaders; once per outfit, shared by every
  farmer), then `farmer.wear(id)` on a `Farmer` or a `FarmerRig` (`FarmLife.wear(id)` for the farm's own farmer), and
  `farmer.wear(null)` for Classic again (the very same mesh and colours as before). `wear` answers false and changes
  nothing for an outfit not loaded, one that doesn't exist, or the judge; `farmer.outfit` is what's worn; `OUTFIT_IDS` the
  five. Dressed, a look is one mesh again (still one draw): the farmer's own with the straw hat's parts left out, the
  outfit's added, the ribbon recoloured, made once for each look and outfit. The shirt's colours, its check and the knit are
  the material's own (uniforms), drawn per pixel as the checked shirt; the jumper has little knitted Vs in columns, fading
  out far off. Each hat sits its own way (`HAT_SIT`): pushed back so the face shows from the game's view, as the straw hat,
  the flat cap and the top hat less (the cap's back would dip into Rosie's hair; the top hat stands up).
- **`?lineup=farmer&set=4`** (or `&outfits`): the five outfits, one row each, Arthur and Rosie side by side, all in the
  same mood, a new one every 4 s (looking about, waving, walking, the torch, feeding, a cuddle, telling off, worried);
  `&mood=wave` holds one, `&pose=stretch` any of `POSES`; `&outfit=rodeo` just that one in four moods at once (looking
  about, waving, walking, the torch); `&wear=rodeo` dresses sets 1 to 3 in it (set 3: the faces close). In `main.js` one
  line after the line-up is made: `if (farmerLineup) await farmerLineup.dress(loadGLB, loadJSON);`.
- `outfittest.mjs` (`fr`, `W`, `H`): set 4 loads the five outfits and nothing else, each farmer in his row's outfit (the
  straw hat gone, the outfit's hat on its bone, Rosie's hair, the shirt's colours and check, the ribbon), every pose and
  face held in every outfit with the torch and the pail, back to Classic and dressed again, one farmer's outfit never
  changing another's, an outfit not loaded changing nothing; Classic loads no outfit; `&outfit=rodeo` only the rodeo's.

## The game, release 1 step 9e: the wheat field and honey (25 Oct 2026, Audrey: "The wheat field (Recommended)", "On your land from the start (Recommended)", then "Bees are great idea, let’s make sure the farmer can harvest the honey and sell it !")

The 2D game's wheat field (Audrey's own idea) made the new game's own, and honey from the beehives (`game.js` `WHEAT`,
`HONEY`, `sowWheat`, `harvestWheat`, `collectHoney`; `gameui.js` `wheatSheet`; `main.js` after the decorations; the
farmer's `workAt` in `farmlife.js`).
- **The field** is yours from the start: a new farm (or a save from before) gets it on its own land a little way out from
  the farmhouse on the side that faces you, either way round (`settleDecor`); the village's own field further out is gone
  from the game. It's drawn in its own frame (`wheat(null, w, d, parent)`: the bed and the wheat in four stages, swaying),
  everyone walks over it, nothing grows through it, and it's moved like a decoration (its card: "Move the field"), with
  Turn (45° or 135°).
- **Its sign** (a bubble at its front): "🌾 Sow", "🌱 3 h 59 min", "🌾 Harvest". Tap the field: its card (how it's
  growing, a bar and the time left, what it gives, the grain in store, Sow · 20 coins, Move the field); a ripe field is
  harvested at once.
- **Sowing** (20 coins): ripe 4 hours later; ploughed for the first tenth, the first shoots till 45%, tall and green, then
  golden. **Harvesting**: 20 grain into store (at most 120) and 12 XP (30 till the balance, step 11). Both count straight away (the save); by day the
  farmer hurries over (the middle of its edge most towards you), "Grow tall and golden!" with the pail, scattering four
  handfuls of seed; or "What a harvest!", crouched and cutting with straw flying, then a golden puff, hooray, and "Wheat
  harvested: +20 grain for the feeders · +12 XP". The field shows the change once he's done (`FIELD.hold`); at night,
  or with nobody about, it simply is. A safety: done anyway after 100 s.
- **The grain** fills the feeders before coins (a unit of grain a unit of feed): the feeder's card says "Your grain from
  the wheat field: 24 (used first)" and "Fill it with your grain (free)" or "Fill it · 4 coins + your grain".
- **Honey:** the beehives fill a jar every 8 hours, up to 6 (`HONEY`; the shop says so). A honey pot "🍯 2" over the hives;
  tap it (or the hives): the farmer goes to the hives ("Thank you, bees!"), bends and lifts out a frame of honey (a wooden
  frame with golden comb, between his hands), turns to show it, and the jars fly to the coins: "2 jars of honey sold ·
  +30 coins" (15 coins and 3 XP a jar). No honey yet: the hives' card says when the next jar comes.
- **The save:** `wheat` ({ x, z, deg 45/135, ripe: 0 or when it's ripe, never further ahead than it takes to grow }),
  `grain` (0-120), `honey` ({ n 0-6, at never ahead of now }, only with the beehives).
- `wheattest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): the field on your land, the sign, its card; sowing (the
  coins, the farmer there scattering, then sown); the stages over 4 hours; harvesting (at once in the save, the farmer
  cutting, the grain and XP); the feeder filled from the grain; the field moved and turned; the honey (two jars after 16
  hours, the pot, the farmer and the frame, the jars sold); a reload; a save changed outside (ripe too late, grain past
  the store, honey past the hives, honey without hives).

## The game, release 1 step 9f: the welcome-back summary (25 Oct 2026, Audrey: "Welcome-back summary (Recommended)")

The 2D game's "While you were away" made the new game's own (`game.js` `awaySummary`, `lastSeen`; `gameui.js` `awayCard`;
`main.js` `showNews`, `collectAll`).
- **When:** the farm opened after an hour or more away (the save's `lastSeen`, kept to the minute while the farm is
  open), or the page shown again after an hour or more put away (the phone locked, another app). It comes first, before
  the other cards (congratulations, show results, a new level), a moment after the farm opens. Nothing waiting: no card.
- **What:** "While you were away", "You were away 9 h 12 min." ("2 days 3 h"; more than two days: "your hens laid for the
  last two"), then a line each with its picture: the eggs waiting in the nests (🥚), full nests (🪺, in red), chicks
  hatched (🐣 "Lulu hatched 3 chicks"), broods grown up (🎉 "their card is next"), honey in the hives (🍯), the wheat ripe
  (🌾) or growing (🌱 "ripe in 1 h 20 min"), a feeder empty (in red) or low, show results in (🎀 "they're next"), the
  day's jobs (📋 new, or rewards to collect).
- **Buttons:** "Collect all eggs (8)": every nest's eggs fly to the coins at once from their bubbles, sold ("8 eggs sold
  · +48 coins"); "Off to the farm".
- **The save:** `lastSeen` (never ahead of now).
- `awaytest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): a fresh farm (none); back after 9 hours (the card, how long,
  the eggs, honey, ripe wheat, the empty feeder); Collect all eggs (sold, the word); the page back after two hours (again);
  back after 20 minutes (none); a last-seen time ahead of now (checked, flagged).

## The game, release 1 step 9g: the farm code (25 Oct 2026, the last of step 9)

The 2D game's farm code made the new game's own (`game.js` `makeFarmCode`, `readFarmCode`, `farmCode`, `loadCode`;
`gameui.js` `settings`).
- **Settings → 🔑 Your farm code:** "Copy your farm code and keep it somewhere safe (Notes is fine). Paste it here on
  another phone, or after clearing Safari, to carry on where you left off." "Copy my farm code" copies it (on iPhone the
  clipboard is handed a promise of the code straight from the tap) and shows it too, to select by hand if copying isn't
  allowed. A box to paste a code into, and "Load this farm" (a second tap: "Tap again to replace this farm"): the page
  opens the farm, "Farm loaded: level 6. Welcome back!" (and the welcome-back summary, if it's been a while).
- **The code:** the save as the phone keeps it (the farm and its seal), gzipped where the phone can (`FF3-`, else plain
  `FF2-`), base64. A pasted one is read (prefix, size, characters, unpacked, a farm the save check accepts), written as it
  came, and checked when the farm opens like any save: one edited by hand is flagged, its names cleaned. A broken one:
  "That farm code doesn't work. Copy it again, all of it." One from the first game (`FF0-`/`FF1-`): "That code is from the
  first Feather & Field: this new farm starts fresh." (Audrey chose a fresh start.)
- `codetest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): the card; Copy (copied, shown, the word); the farm changed,
  the code loaded (as it was, the word, not flagged); a broken code; a first-game code; one edited by hand (flagged, names
  cleaned).

## The game, release 1 step 10: the first day (25 Oct 2026, Audrey: "Scenes from the 3D farm (Recommended)")

Onboarding for new players (`gameui.js` `introCards`; `game.js` `GUIDE`, `guideDid`, `guideSkip`; `main.js` the first
day, after the wheat field and honey).
- **The pictures:** on a new farm, once it's open, four cards one at a time, each a picture made from the game's own farm
  (`intro/1-4.webp`, see "The onboarding pictures"), a title and a line or two: "Your forever flock", "Eggs and chicks",
  "Land and new breeds", "Shows, honey and more"; dots, Next (or a swipe), "Let's go!" on the last, Skip.
- **The guide:** then a little card ("First day · 1 of 5", along the bottom upright, top left sideways) saying what to do,
  and a bouncing yellow arrow over where to tap (under it, pointing up, for the top bar): collect the first egg (it's laid
  a little over a minute in: "Your first egg is on its way" till then); give a hen a cuddle (the arrow over a hen, then
  over ♥ Cuddle in her card); sow the wheat field (its sign, then Sow); Today's jobs; the shop (the coins). Each done:
  "Well done! +10 coins"; the last: "Your first day is done! +40 coins. A new field comes at level 2." Something off
  screen: "Show me" brings the view to it (the player's tap: the view never moves by itself). Skip: no more guide.
  Hidden while a card is open (unless the arrow points into it), while something's being moved, inside a coop and on
  show day; the other cards (a level, news) wait for the pictures.
- **The save:** `guide` ({ step 0-5, done }); a farm from before: done. The tests' pages (`?q=`) leave the first day out
  unless asked (`&firstday`), so they play as before.
- `firstdaytest.mjs` (`LANG=fr`, `W=874 H=402`, `SHOTS=folder`): the pictures; each step with its arrow and coins ("Show
  me" for the wheat); the end and the bonus; a reload; Skip and Skip; a guide past its end (checked, flagged).

## The onboarding pictures (25 Oct 2026, Audrey chose "Scenes from the 3D farm")

Four pictures for a new player's first screens, made from the game's own 3D models in the spirit of the welcome picture:
each a little scene on its own stage out past the village, bright late-morning light (10:30), soft shadows, grass and
flowers round it, everyone doing something lively and kind. `web3d/intro/1.webp` to `4.webp` (1200 x 900, 4:3, 50 to
120 KB), copied with the page by `build.sh`; nothing in the game shows them yet.
1. **"Your forever flock"**: the rustic Red Barn with its Rhode Island Red trio; Arthur crouched beside one hen, stroking
   her back (the cuddle's `pet`, the arms the other way round so she sits on the open side), her eyes shut, hearts
   floating up from her; the rooster chest out (`proud`) by the barn; the other hen trotting over, her head on one side.
2. **"Eggs and chicks"**: a Rhode Island Red mum settled low, her near wing spread over a chick sheltering under it; a
   chick hopping for joy, one pecking, one peering at a straw nest of four brown eggs; the Red Barn behind.
3. **"Land and new breeds"**: the wild meadow beyond the land's fence (its warm tint, long tawny grass and wildflowers,
   as `syncLand` draws them) with the FOR SALE sign just inside it and red-ribbon stakes running back along the field's
   border; mown farm grass this side; the Buff Orpingtons just arrived at their Thatched Cottage (rustic): the rooster
   crowing, a hen leaping with her wings out, the other trotting up. The sign has words, so this one is also made in
   French: `3-fr.webp` ("À VENDRE").
4. **"Shows, honey and more"**: inside the show tent, the judge turned towards us pinning the first prize's red rosette on
   a Light Brahma in her little blue show coop (hearts over her), the white Silkie and the others in their coops either
   side; Arthur beside her holding up a frame of honey from his hives, two bees after it.
- **`main.js ?intro=1..4`** (test page only: the game ignores it): the stage, its cast and nobody else (no farmer of the
  village, no geese, dog or decorations); the test village itself is hidden while it's on, only the ground and the stage
  show. `src/intro.js` builds each scene from the game's own pieces: `Bird` posed through the `posterPose` hook (every
  pose field set each frame, so nothing the bird does by herself shows), `Farmer` and its poses (the judge's arm and
  Arthur's stroking hand set in the pose's `anim`), the coops' models (`rustic_rir`, `rustic_orp`), `ShowGround`
  (`loadShow`, a rosette pinned with `pin`), the land's fence (`buildFence`), sign (`saleBoard`, its words from
  `game.js gameText`) and stakes (`saleStakes`), the hearts (`spawnHeart`, now returning its pool entry so a scene can
  place them the same each time), the honey frame (`honeyFrame`). `saleBoard`, `saleStakes` and `honeyFrame` were taken
  out of `saleSign` and `tickHoneyFrame` unchanged, so the game's sign and frame are the very same (`landtest.mjs`,
  `wheattest.mjs` and `gametest.mjs` pass). Each scene's stage and camera are turned together (`TURNS`, -50 degrees,
  the show -72) so the sun comes from in front and to the left: faces lit, shadows falling away behind.
- **Made again with** `./withserver.sh node intropics.mjs` (writes `intro/`; `ONLY=1,3` just those, `PNG=folder` keeps the
  full-size shots, `CAM='{"dist": 3}'` looks from elsewhere for checking): each scene shot through `__farm.posterShot` and
  its own camera (`intro.js` `cam`) at 600 x 450 css px x 4 (2400 x 1800), posed for 3 seconds from a fresh start
  (`restart`, no blinking), shrunk to 1200 x 900 and saved as WebP (quality 85, full colour) by Python's PIL. About
  20 seconds a picture.
- **For the picture only** (nothing in the game changed): the bees are drawn as the hives' bees but 2.5 times their size
  (the game's are 2 cm, a dot at phone size); the nest's eggs are a quarter bigger than the nest box's; the coop behind
  Arthur in the show is left empty (a bird there peeked out round his head); in picture 2 the barn's roof is cut by the
  top edge (with the camera low enough for the chicks to read, the roof is at the camera's own height).

## The game, release 1 step 11: the balance (26 Oct 2026, Audrey's pace: "about a year to the top level for a once-a-day player")

`balsim.mjs [days] [profile] [farms]`: simulated players through the game's own rules (`src/game.js` on a fake clock, no
page). Three kinds of player: once a day (19:00), twice (8:00 and 19:00), often (every 3 hours, 8:00 to 23:00), each doing
everything a keen player would at each visit: the eggs and the honey, the feeders (grain first), sowing and harvesting the
wheat, a cuddle for every bird, the best bird in every open show (when her chance of a rosette is fair), the jobs, the
next field when it can, a new breed's coop, decorations and outfits once they leave enough for the next field and feed.
It prints the level on days 7, 30, 90, 180 and 365, the day each level comes, the coins, birds, coops and fields, where
the coins and the XP came from, and what they went on.
- **First run (the numbers as built):** a once-a-day player reached level 30 on day 256, with 355,000 coins at a year;
  the shows gave half the XP (52,000) and most of the coins (426,000 in a year: the National's 1,000 coins a win every
  day); the wheat's grain fed every hen (no feed bought).
- **Changed:** the shows' prizes and XP: Village 40 / 20 / 10 coins and 5 / 3 / 1 XP (was 60 / 30 / 15, 12 / 6 / 3);
  County 120 / 60 / 30 and 15 / 8 / 4 (was 250 / 120 / 60, 40 / 20 / 10), fee 30 (was 40); National 300 / 150 / 75 and
  35 / 18 / 9 (was 1,000 / 500 / 250, 100 / 50 / 25), fee 100 (was 150). A harvest gives 20 grain (was 30). A show result
  saved before keeps what it said (not flagged: `SHOWS_25OCT`).
- **Now (3 farms each):** once a day: level 13 on day 90, 20 on day 176, 29.7 at a year; twice a day: level 30 on day
  337; every 3 hours: day 314. New breeds: the Buff Orpingtons (level 5) in 3 weeks, the white Silkies (6) in a month,
  the Cream Legbars (11) in 10 weeks, the Light Brahmas (17) in 4 and a half months. Coins at a year: about 88,000 (left
  for release 4's coop upgrades and seasonal coops); a year's earnings: shows 148,000, jobs 76,000, eggs 56,000, chicks
  29,000, honey 15,000. All eight decorations by level 20, the outfits by 18. The wheat still feeds a daily player's hens.

## The game, release 1 step 12: the switch (26 Oct 2026, Audrey: "Switch now")

The 3D game is the game at the usual address (https://kavaliere11-laudun.github.io/feather-and-field/); the first game
(2D) moved to `classic/`. Published with `./deploy.sh <clone of main> [<the first game's site/>]` (after `./build.sh`):
- `3d/` is `dist/` as before (`3d/play.html` still opens the game; `3d/` is still the village's test page).
- `site.mjs` writes the top: `index.html` is `play.html` with `<base href="3d/">` (every file the page and its code ask
  for comes from `3d/`; the code only reads `location.search` and reloads, so nothing else changes) and the top's
  `manifest.webmanifest` (same id `./` as the first game's, so the Home Screen app stays the same app, the rooster icon);
  `sw.js` retires the first game's offline worker there (deletes its `ff-...` caches, unregisters itself). The game also
  does that itself when it opens (`retireOldCache` in `main.js`: only the worker at the site's top, only `ff-...` caches).
- `classic/` is the first game's `site/` (`build2.py`, then `build_pwa.py`): its own worker, scoped to `classic/`, its
  caches named `ffc-...`. Its Settings has "The new Feather & Field" and "Open the new game" (`ff.html`, only on the
  website's `classic/`, not in the Claude artifact).
- The saves are in the phone's storage for the site (`ff3d.farm` for the 3D game, `feather-field-save-v1` for the first
  game) and are never touched by the switch. When the first game's farm is on the phone, the 3D welcome says so under the
  picture's tagline ("Your farm from the first game is safe in Settings.", French "Votre ferme du premier jeu est dans les
  Réglages."; the welcome card itself unchanged, so it still fits sideways) and Settings has "The first Feather & Field" with
  "Open the first game". An iPhone Home Screen app keeps its own storage, apart from Safari's: the farm there is the one
  played from the icon.
- `switchtest.mjs <old site> <new site>` serves both copies under `/feather-and-field/` as GitHub Pages does: a phone that
  played the first game (its worker, a farm "Audrey"), then the site switched: the 3D welcome at the usual address with the
  old worker still there, every file found, the old worker and caches gone, the first game's farm untouched; a new 3D
  farm; Settings' card opens `classic/` with "Audrey"'s farm and its own worker; its "Open the new game" comes back; a new
  phone sees neither line nor card. English upright and sideways, French both ways.

## The balance, again: playing more often rewarded (26 Oct 2026, Audrey: "people playing multiple times a day should be rewarded a bit more", then "A bit quicker (Recommended)")

The year's graph showed the three kinds of player almost together (twice a day only a month quicker): eggs, honey, shows
and jobs all come on a daily clock, so only the wheat rewarded coming back. Now (`FRESH` in `src/game.js`):
- **Fresh eggs:** an egg collected within 3 hours of being laid earns 4 XP more (an egg is 1 XP, was 2; 3 more since release
  2 step 1, below). The nest keeps
  when each of its eggs was laid (`lt` on each coop, saved: whole times, none ahead of now, no more than its eggs, checked
  and flagged otherwise). While fresh eggs are waiting, the coop's egg bubble has a sparkle (✨); collected: "6 eggs sold ·
  +42 coins · 4 fresh: +22 XP" ("4 tout frais").
- **Cuddles:** each cuddle earns 1 XP (once the bird's happy glow from the last one has worn off, 6 hours): "+1 XP" after
  "Arthur gives Clover a cuddle ♥".
- **Jobs:** 3 + level XP each (was 5 + level), so a once-a-day player still takes about a year.
- **Now (`balsim.mjs`, 6 farms each):** once a day: level 30 on day 357 (was about 365); twice a day: day 300, about 10
  months (was 337); every 3 hours: day 244, about 8 months (was 314). New breeds for a once-a-day player as before (3
  weeks, a month, 10 weeks, 4 and a half months); twice a day 17, 23, 58 and 112 days.
- On the way: the words at the top (`#hint`) are as wide as they need, up to the screen's width; centred from the middle
  of the screen they used to wrap at half its width ("4 eggs sold · +24 / coins").

## Release 2, step 1: the Silkie colours by level (26 Oct 2026, Audrey: "Silkie colours next (Recommended)", "Roof in its colour (Recommended)")

game-plan-v2.md §4: five more Silkie colours come with levels, each a forever trio with its own Pagoda Coop: Black at
level 8, Buff 13, Blue 15, Partridge 20, Grey 23 (the White ones at 6, as before). The Silkies' look is unchanged: these
are the colours the birds already had (`SILKIE` in `birds.js`).
- **Lines:** each colour is a line of the Silkie breed, keyed `sil_<colour>` on its coop and birds (the white ones keep
  `sil`, so saves from before are the same): `BREED_INFO` (names: "Black Silkie", "Poule soie noire"; `kind`: "Silkie"
  for the shows; `col`: the colour's word), `BREED_LEVEL`, and `baseBreed()` / `silColour()` in `game.js`. Eggs, chicks,
  the house and the shows go by the breed (`baseBreed`): a Silkies-only County show takes any colour, and the County's
  breed of the day still comes from the five breeds (`SHOW_BREED_LEVEL`), so a day's show is what it was. One coop a line;
  a line's coop only from its level (checked on load, flagged otherwise).
- **The level card and Your coops:** "New Silkie colour: Black!" ("Nouvelle couleur de poule soie : noire !"), "Place
  their coop now"; "At level 8: Black Silkie". A bird's card: "Black Silkie · Hen". The white ones are "White Silkie"
  now (the shows still say "Silkies only").
- **The coops:** the same pagoda in its colour (`tintSilkieCoops` in `main.js`): first a touch (frames, door, round window,
  pop door, the roof's trim), then, Audrey's choice from pictures of both, the roof too, so each coop shows from the
  farm's view (the White Silkies' keeps its green roof and red). Made once from the model's own vertex colours, before
  they're richened (`house_sil@black`, `rustic_sil@black` faded as the rustic's own, `popdoor_sil@black`); the coops'
  batches and the pop doors go by the coloured model (`tintOf`).
- **The Breed Book:** ten pages in level order; the five colours' pictures made by `bookpics.mjs` from each colour's pair
  in the line-up (`ONLY=sil_black,...` makes just those).
- **The balance** (`balsim.mjs`, now with `BAL='{"chick":3}'` to try other values; `XPV` in `game.js`): the five more trios
  (30 birds by level 23) brought level 30 to day 282 for a once-a-day player. Now: a grown chick 3 XP and 1 a star (was 6
  and 2), a brood hatched 2 (was 4), a feeder filled 2 (was 4), a fresh egg 3 more (was 4), a job 3.5 + 0.3 a level (was
  3 + 1). Level 30 on day 373 once a day, 296 twice a day (10 months), 229 every 3 hours (7 and a half months); for a
  once-a-day player the Orpingtons in 3 and a half weeks, the White Silkies in 5, Black 7, Legbars 11, Buff 14, Blue 18,
  Brahmas 21, Partridge 27, Grey 34. About 159,000 coins at a year.
- `silktest.mjs` (new; English upright, French sideways): level 7's Your coops, level 8's card, placing the black coop
  (its model, its trio's colours), a black hen's card, the Breed Book's ten pages, a County show, a reload, a changed save.
  breedtest and eggtest updated (the white ones' name, a fresh egg's XP).

## Release 2, step 2: rare babies (26 Oct 2026, Audrey: "Every month or two (Recommended)", "When it's grown (Recommended)")

game-plan-v2.md §4: five rare Silkie colours come only from breeding: Paint from the White Silkies, Lavender from Black,
Red from Buff, Splash from Blue, Cuckoo from Partridge or Grey (`RARE_FROM`, `RARE_LINES` in `game.js`; their names in
`BREED_INFO`, French "pie", "lavande", "rouge", "splash", "coucou"). The Silkies' look is unchanged: these are colours
the birds already had.
- **The luck:** each chick of a Silkie coop has a chance of its rare colour, 1.8% plus 0.4% for each star of her mum and
  dad (`RARE`; at most 5.8%), decided when she hatches from the brood's own numbers (`kidsOf`), as the rest of her is.
  `balsim.mjs`: about one rare baby every month and a half from each Silkie coop for a once-a-day player, the first
  around day 70; 35 in the first year.
- **On the farm:** she hatches in her own colour ("3 chicks have hatched, and one is a rare Paint Silkie! ✨"), with a
  little golden sparkle now and then; her card says "✨ A rare Paint Silkie chick" (as a young hen or rooster, too).
- **Grown:** her brothers and sisters go to a new farm as before; she stays in the pen, waiting for your choice
  (`data.rare`): the congratulations card shows her ("✨ Paint Silkie", her stars) with **Keep** and **Sell · 500** (400
  coins and 50 a star, `rarePrice`); a tap on her, or Your coops (its red dot), offers the same. Kept: a name and a
  personality of her own, her stars as a youngster to start, and she goes to **the basket by the farmhouse fire**
  (`data.basket`) with a heart: "Percy is snug in the basket by the farmhouse fire." Your coops lists the basket ("Their
  own coop comes soon": the next step). Sold: the coins.
- **A trio at most** of each rare colour (a rooster and two hens, counting the basket, those waiting and, later, their
  coop): one more is sold for you, its coins with its brothers' and sisters' ("Your Paint Silkie trio is complete: this
  one is sold for you").
- **Save checks:** a chick's rare colour only its own coop's and only where its luck could have given it (the most a
  chance can be); those waiting from a Silkie coop of the colour they come from; the basket only rare colours; the trio's
  limits; names cleaned; times never ahead of now. Changed outside: checked and flagged.
- `raretest.mjs` (new; English upright, French sideways): a brood whose luck gives a rare chick, her colour and card, the
  congratulations card's Keep and Sell, her waiting in the pen, the basket, Sell from Your coops, a complete trio, a reload,
  a changed save.

## Release 2, step 3: the rare colours' own coops (26 Oct 2026, Audrey: "Buy it, 2,500 coins (Recommended)")

- **Their coop:** once one of a rare colour is in the basket by the fire, Your coops offers "Build their coop · 2,500"
  ("Their coop: 2,500 coins" until you have them; `RARE.coop`, `rareCoops()`, `placeable()`). Placed like any coop: a
  rustic Pagoda in the rare colour (`SIL_TINT`: Paint a white roof with black frames, Lavender, Red, Splash pale blue-grey,
  Cuckoo slate), the coins paid when it's put down, and the colour's birds move in from the basket with their time on the
  farm kept ("Welcome home, Paddy and Pip!"). A rare one kept later goes straight into her colour's coop ("Ginger has
  joined Pagoda Coop.").
- **A rare pair's chicks** are all their colour: the trio's missing hen or rooster waits for your choice as before; the
  rest are sold for you, for less than a rare one from the other Silkies (`RARE.bred`, 40%: 200 to 300 coins), and a rare
  pair goes broody half as often (`RARE.broody`).
- **The Breed Book:** fifteen pages, the rare colours last: found once one is yours (in the basket or her coop), else
  "Rare: hatched by a Black Silkie" ("Rare : naît d’une Poule soie noire"; the Cuckoo ones by a Partridge or a Grey); their
  pictures by `bookpics.mjs` (`ONLY=sil_paint,...`).
- **Silkies lay about an egg a day** (one window of two: `dueLays`), as real ones do ("Silkies are better mums than
  layers", on a Silkie hen's card): with eleven of the fifteen coops Silkies, the late game was too quick.
- **The balance** (`balsim.mjs` now builds the rare coops too, and keeps every rare baby it can): 44 birds and 15 coops by
  the end; a fresh egg 2 more (was 3), a chick half a star more (was 1). Level 30 on day 365 once a day, 296 twice a day,
  243 every 3 hours. About 200,000 coins at a year.
- **Save checks:** a rare colour's coop only from level 6, one each; its chicks all its colour; one waiting from its own
  coop or the Silkie colour it comes from.
- `rarecooptest.mjs` (new; English upright, French sideways): the basket's build button (too dear, then not), building the
  Paint coop, a Silkie hen's laying, the Breed Book's fifteen pages, a brood of the pair, keeping their third hen, a reload,
  a changed save. booktest and silktest updated (fifteen pages), eggtest (a fresh egg's XP).

## Release 3, step 1: the geese to buy (26 Oct 2026, Audrey: "The guardians (Recommended)")

- **The shop** is now "The farm shop" ("La boutique de la ferme") with three shelves: Decorations, Animals (Animaux),
  Outfits. On Animals: Gertrude and Hector, the geese, from level 4 (`ANIMALS` in game.js: 1,200 coins, +24 XP, a fiftieth
  of the price like the decorations), with their picture (`decor/geese.webp`, made by `animalpics.mjs` from the geese
  line-up: Gertrude looking round at you, Hector flapping his wings, cut out as the Breed Book's pictures). Not enough
  coins: "Not enough coins yet"; bought: "✓ At the pond" and "See them" (the view to them). The level-4 card says "New to
  buy: Gertrude and Hector, the geese" ("Nouveau à acheter : Gertrude et Hector, les oies").
- **Bought:** they come swimming over the pond from a little way out, come ashore on their side of it with a shake, a honk
  and a wing-flap stretch and look round (`GeeseFlock.arrive()`); the view goes to where they come ashore (the player's
  tap); "Gertrude and Hector have come to live by the pond! +24 XP", then "Tap a goose to say hello." Then their life as on
  the village page: grazing, strolling, swims, drinks, preening, rests, Hector following and getting told off, bed by the
  water at night. The pond's two fields (10 and 14) are wild meadow until levels 11 and 15, so the meadow's fence along
  the lane keeps them there, round the pond. A tap: "Gertrude · Embden goose" ("Gertrude · oie d'Embden"; the geese's
  labels now follow the game's language, `setGooseLang`).
- **The walking grid made again** (a field bought, a coop or a decoration placed): their places are worked out again where
  one can walk, their bed kept unless something's on it now (`GeeseFlock.renav()`).
- **Their bed, for everyone (the village page too):** it was meant to be where there's room all round, but the pond's own
  margin on the grid counted as "something in the way", so no spot ever had room and the bed fell back to one beside the
  stream's mouth, where they brushed the stream's edge going to bed. Now the pond doesn't count: their bed is on a
  bank away from the dock and the streams, the two places side by side facing the water.
- **Hector out of the water after her:** when she stops on the grass he follows her trail out, and only stands beside her
  on the grass (he used to be left standing in the shallows).
- **The ducks after a night's sleep** don't take a nap on the bank straight away (`restedAt` set when they wake): they head
  off over the water (ducktest now always sees them down into the water in the morning).
- **Save checks:** `animals` only known animals, each from its level, when it came never ahead of now; anything else is
  dropped and the farm flagged.
- `geesebuy.mjs` (new; English upright, French sideways): level 3 (none, the shelf says level 4), the level-4 card, too
  few coins, buying (coins, XP, the arrival, the message), forty seconds and four minutes of their day (never on anything,
  on land only on the pond's two fields or its bank, Hector never far), a tap, the shelf's See them, a reload, bedtime, two
  changed saves. dectest updated (the shop's title). `geesebuyfilm.mjs OUT [fps]`: the film (the shop, buying, the
  arrival, a tap on Gertrude).

## Release 3, step 2: the dog to buy (26 Oct 2026, the guardians' second piece; his name as Audrey asked on 23 Oct: "People should be able to choose the name of the dog, the default can be biscuit")

- **On the Animals shelf** from level 9: "Biscuit, the farm dog" ("Biscuit, le chien de la ferme"), 4,000 coins, +80 XP
  (`ANIMALS.dog`), with his picture (`decor/dog.webp`: `animalpics.mjs`, `ONLY=dog`: Biscuit pleased to see you in front of
  a copy of the village's kennel, his name over the door). The level-9 card says "New to buy: Biscuit, the farm dog".
- **"Buy and place · 4,000":** his kennel is placed like a decoration (`startDecor('kennel')`: the green or red outline on
  the ground round it, his bowls and the grass in front of his door, `DECOR_INFO.foot.kennel`; drag it or tap where it
  goes; only on your land, not on a lane, with room; what's in the way cleared), always turned the way the village's
  faces, its door to you a little to the right (`KENNEL_DEG`). "Put it here": paid for then; out he comes in front of his
  door with a hop and a play bow at you (the view to him: the player's tap), "Biscuit has come to live on your farm! +80
  XP", and a moment later the card for his name opens ("Your dog's name", Biscuit ready to keep or change). Saved: "Your
  dog is called …", his label, the board over his door and the shelf all say it.
- **On the shelf once he's yours:** "✓ On your farm", See him (the view to him), Move his kennel (the same placing; he's
  back at it once it's down, "Pepper's kennel: moved!"), Rename. A tap on the kennel opens the shelf; a tap on him: his
  name and "Rename …" for a few seconds, as on the village page.
- **His day** is the village page's (`FarmDog`, `makeDog()`): rounds to the coops, naps, meals, his ball, play, watching
  the farm, the farmer's pat at his door; asleep in his kennel at night. The kennel and bowls are in everyone's way on the
  walking grid (`kennelNav()`: as saved, or where it's being put). He only creeps up on the geese if he can get to them
  (the pond's fields are fenced off until they're yours; `geeseTask`), and never when there are none.
- **Language:** the dog's and the foxes' labels follow the game's language (`setBeastLang`; the foxes' are now in French
  too: "renardeau", "renard roux, le papa", "renarde, la maman").
- **Save checks:** the dog only from level 9; his name checked as any name (no `< > & " \` { } [ ] =`, spaces tidied, at
  most 20 letters, empty: Biscuit), his kennel on the quarter-metre; a kennel that can't stand where it is any more is put
  at the nearest good spot when the farm opens (`settleDecor`).
- **The balance:** `balsim.mjs` buys the geese and the dog too (5,200 coins): still level 30 in about a year once a day.
- `dogbuy.mjs` (new; English upright, French sideways): level 8 (none, the shelf says level 9), the level-9 card, too few
  coins, placing the kennel, buying, his name, the shelf, four minutes of his day (never into anything outside his own
  kennel), moving his kennel, a tap on it, a reload, the night, two changed saves.

## Release 3, step 3: Rusty's night visits in the game (26 Oct 2026, Audrey: "He takes the nest's eggs (Recommended)", "About twice a week (Recommended)")

- **When:** from level 4, on about two nights in seven (`FOX.chance`, the night's own luck from its date, the same on
  every phone: `foxNight`), at a time between 11 pm and 2:30 am (`foxAt`). A night is the evening's date (`nightKey`: a
  time before noon belongs to the night before). The level-4 card says so: "From now on Rusty the fox may come at night
  for the eggs: shut the coops' doors, or get the geese."
- **Where:** a coop whose pop door was left open if there is one (the night's luck picks which), else a shut one.
- **What happens** (`Game.foxResolve`): the eggs laid before he came go into the nests first; then a shut door: he
  scratches at it and goes home; an open door with the geese or the dog on the farm (bought before he came): they hear
  him and chase him home; an open door with no guards: he takes the nest's eggs (none there: the hen pecks his nose).
  No bird is ever hurt.
- **The doors** are kept in the save for the night (`coop.shut`, the night's key): the moon over a door at bedtime shuts
  it as before, now remembered; a farm opened at night shows them shut; in the morning they open as before.
- **The nights the farm was shut** (`foxTick`): each night gone by is checked once (the last two days' only), and the
  last visit kept (`fox.last`). In the morning a card: "🦊 Last night on the farm" and what happened in words ("Rusty the
  fox found the door of Fern's coop open and took 3 eggs from the nest. The hens are fine, just a little ruffled."; "…but
  the doors were shut. He went home empty-handed."; "…but the geese heard him and chased him all the way home!"; the dog,
  the geese and the dog; French with "d'Ivy" / "de Willow"), a tip when the eggs went ("To keep the eggs safe, shut the
  coops' doors at night (tap the moon over each door), or get the geese (the shop, Animals)."), "🎞 Watch it" and OK.
  The "🎞 Last night" button stays till it's been watched, until the next evening.
- **The film** (replay.js) is that night's: its coop, its door, its time, its hen, and only the guards who chased him
  (the cast made again when that changes). The eggs' story: "Rusty had a plan." … "Nothing could possibly go wrong." …
  in slow motion his head in at the pop door and out with an egg … "This time, nothing went wrong." … he turns to show
  it off … "Rusty went home… with the eggs." … "The End" · "The hens are safe and sound. The eggs, not so much."
- **The egg** (nightvisit.js `grab`, `takeEgg`, `backDown`, `showOff`): the hens' flurry, his head pushes in at the pop
  door, and he comes out with an egg in his jaws (the breed's egg colour, a little glow so it shows in the dark), hops
  back down the ramp pleased with himself, turns round to show it off (ears up, wagging, eyes narrowed), and trots home
  with it in his mouth (his jaws a little open round it whatever he's doing), "Rusty has taken the eggs!", "Rusty went home
  with the eggs."
- **The farm open at his time** (`foxLiveTick`): his visit is played on the farm (the farm's own `NightVisit`), "Send
  Arthur" as on the village page; the eggs go from the nest the moment he takes them; what happened is kept as already
  seen (no card in the morning). With guards on the farm he never takes eggs.
- **The fences:** the wild meadow's fences kept Rusty out (no way to the coops). He now finds his way on the farm's grid
  without them (`navWild`) and leaps each fence where his way crosses it (`NightVisit.walk`: to a spot 0.8 m short of
  it, his pen-fence leap square over it, on from the far side). The geese live behind the pond's fence until those
  fields are yours, so in the game the guards' alarm is enough: once they're up honking or out barking (`guardAlarm`),
  he hears them and runs for home wherever they are; if they get to him they chase him as before.
- **Save checks:** `fox.seen` a night not ahead of now; `fox.last` a night he could have come, at his time (a time zone's
  slack), a coop of the farm's, chased only by animals the farm has, eggs only from an open door nobody guarded and at
  most a nest's; `coop.shut` a night not ahead of now. Anything else is dropped and the farm flagged.
- **Also:** after buying the dog the view goes to him, and the card for his name comes a moment later.
- `foxvisit.mjs` (new; English upright, French sideways): level 3 (no visits), the level-4 card, a night with the eggs
  taken (the card, the tip, the film with the egg, the button gone), a night played on the open farm (an egg in his
  mouth, the nest emptied, nothing to tell after), a night with the doors shut (kept in the save, shut after a reload), a
  night with the geese (the card, the film), two changed saves. `foxfilm.mjs OUT [every]`: the morning card and the film
  (NIGHT=geese: a night the geese chased him). `balsim.mjs` now has Rusty's visits too: about 107 a year, and a player who
  collects the eggs in the evening loses none.

## Release 3, step 4: Gertrude and Hector's squabbles (26 Oct 2026, from the plan Audrey chose: "Gertrude and Hector are in love, but they squabble now and then (over a snail, a puddle, the best spot), then make up")

- **Now and then** (every 3 to 7 minutes of their day, when they're both on the grass, calm and close: `GeeseFlock.squabble`)
  something on the grass a little ahead of Gertrude catches their eye: a snail (a little one built in the page: a brown
  shell with a pale swirl, a cream body, eyes on stalks, crawling slowly), a puddle (rainwater: a small round of sky-blue
  water), or just the best spot.
- **The squabble** (`duetTask`, one stage for both at once): Gertrude walks to her side of it, then Hector to his (round her), 1.2 m
  apart (far enough that their necks never cross), side-on to you when there's room (the flock's `across`: the way across
  the screen), going round it rather than over it; a long look at it, then at each other; a tussle (necks out low, wings up, bills open
  and jabbing at each other, hissing, 2.6 s); one of them wins (either one) and steps up to it: eats the snail, drinks
  from the puddle, or sits down in the spot, while the other steps back, turns away and sulks.
- **Making up:** the one who sulked comes back beside the winner (across the screen from her when there's room; a spot's
  winner settles in it half facing you); they turn to each other, necks curved, heads tilted, a
  soft honk, and three hearts float up between them (the hens' hearts, `spawnHeart`). After a squabble over the spot they
  rest there side by side. The puddle soaks away afterwards.
- Bedtime, Rusty, Biscuit's teasing or anything else that comes up ends it at once (`endDuet`).
- Fixed on the way (found by running the day many times): a way out of the pond whose walk up the bank brushed a rock by
  the edge (the ways now check the whole walk, `clearBank`: 29 ways, were 33); after a reload, Hector could be put a step
  behind her on the far side of the pond's fence (he's now put on clear grass on her side). geesebuy's "come ashore" check
  now asks that both were up on the grass a moment (she may be drinking at the edge by then).
- `geesesquabblefilm.mjs OUT [kinds]`: a film of them.
- `geesesquabble.mjs [kinds]` (new, each kind twice by default): each kind on the test page (the stages in order, never walking over it on the way, the
  snail eaten, the puddle soaking away, three hearts; every frame never on anything, never into each other or the water; back to their day after), and
  one coming on its own. geeseday still passes.

## Release 3, step 5: the geese's trust (26 Oct 2026; the plan: "The geese don't like the farmer at first. They hiss and chase him (he runs, his hat flies off). Visit them regularly and little by little they trust him, until they let him cuddle them"; Audrey: "A gate in their fence", "About a week", and for their trust "Cuddles, hearts, a little XP", "They greet him", "Braver guards")

- **The gates** (main.js `pondGates`, `gateMesh`, `cutGates`): while the pond's fields are wild meadow, once the geese are on
  the farm, a wooden gate in the fence of each (fields 10 and 14), where it's nearest the bank they come and go by, on
  clear ground both sides with the lane outside (the farmer runs off along it): two posts, a leaf of two rails, two stiles
  and a brace, hinged on one post. The fence's rails stop at its posts (the fence's lines are cut there); on the grid it
  stays shut, so the geese, Biscuit and Rusty never use it; the farmer goes through it as into a pen (`pen`). It swings
  open into their field as he goes in and shuts behind him; geese in the reach of its leaf step clear.
- **Their card** (gameui.js `geeseCard`): a tap on a goose: "Gertrude and Hector, the geese", Embden goose and Toulouse
  gander, their trust (hearts and Cross / Wary / Curious / Friends, Fâchés / Méfiants / Curieux / Amis), what it means, the
  days of visits to the next ("A visit counts once a day", or "Today's visit has counted: come back tomorrow"), and "Visit
  them" (friends: "♥ Cuddle", or how long they're happy after one; at night, visits in the morning).
- **A visit** (game.js `visitGeese`, `geeseTrust`, `GEESE_TRUST`): counts once a day on the phone's calendar (+3 XP):
  Wary from the 3rd day's, Curious from the 5th, Friends from the 7th (+20 XP more, and that visit is their first cuddle);
  friends, a cuddle counts once every 6 hours (+1 XP, and today's job "Give a cuddle"). Saved as `animals.geese.trust`,
  `day`, `happy`, each checked when the farm opens (no more than a visit a day since they came, a day between their
  coming and now, trust only with a day, happy only for friends and at most 6 hours on); a changed save is flagged.
- **The show** (farmlife.js `visitGeese`, geese.js `visit`, main.js `startGeeseVisit`): the farmer goes to the gate on
  their side of the pond, opens it and goes in. Cross: they come over and square up to him a couple of metres off, necks
  low and hissing; "Hello, you two!" and a wave, and they charge; "Whoa!", he runs for the gate (it shuts behind him), his
  hat knocked off on the way and landing on the lane; they parade by the gate with a victory honk; he gets his hat back,
  puts it on, "Maybe tomorrow…". Wary: a hiss from well back, a long hard look; "Some corn for you!", three handfuls
  thrown towards them, and he steps back by the gate; they come round him, well clear, for the corn. Curious: a handful at
  his feet, a crouch; they come and eat by him (a step clear), Gertrude looks up at him, head on one side, a soft honk
  ("There you are!"). Friends: they come to meet him; a crouch, Gertrude up to him, Hector beside her, he strokes her neck
  ("There, there…"), their eyes shut happily, hearts. Corn lies on the grass till they peck it up (`cornThrow`). The
  pond's fields bought (no fence): he walks straight over to them (`openSpots`). The hat comes off and goes back on through
  the hat's joint (farmer.js `hatWorld`, `hatHome`).
- **Friends greet him:** now and then the farmer stops by their gate to say hello, and they hurry over to it with a honk
  (`geeseFence`, `greetGeese`, geese.js `greetAt`). **Braver guards:** they hear Rusty sooner and he gives up sooner
  (`brave`: the alarm 0.8 s, was 1.6).
- `geesetrust.mjs` (new; LANG=fr with Rosie): the gates, a real tap and the card, a visit at each level day by day (what
  they do, nobody through the fence or on anything, the geese never out of their field, the hat), same-day visits, a
  cuddle every 6 hours, the hello at the gate, braver guards, five changed saves. `geesetrustfilm.mjs OUT [parts]`: a film.

## Release 4, step 1: the Red Barn's five looks (26-27 Oct 2026; Audrey: "Coops to work on (Recommended)", "Red Barn first", "Look nicer and help a little", "300 / 1,000 / 3,000 / 8,000"; on the first try: "They are all far too similar. Be creative, the size of the parc around the coop perhaps"; then the Deluxe: "the water pot can become a fountain. Instead of the extension the coop can have a second floor? And change the material of the roof to something more noble", "Copper, gone green"; the play things: "Starting at the cosy one, add a swing in their garden that they can perch on. Come with ideas like this cute fun that they interact with", all four ideas; "a weird egg on its right? Its garden looks too messy and busy. We can probably get rid of the perchoir. The send bath should be bigger … Use the left space next to the coop. Also the seed dispenser should look different for the deluxe"; "For the cosy revert the old send bath")

- **The looks** (stylized/coops.py, release 4 block; export_coops.py): the pen grows with each and each building is its own.
  Rustic `box_rir` (the old crate: grey boards, two faded red ones, a tin roof with a brick and a stone on it, bricks and
  a stump for legs) in `pen_t0` (a tiny yard, a tin basin, no hay) and `fence_t0` (rails down, posts leaning); Mended
  `shed_rir` (a lean-to of new boards half painted red, a felt roof, the paint tin and brush) in `pen_t1` and `fence_t1`
  (new pale rails and posts among the grey); Snug `house_rir` in `pen_base` and `fence`; Cosy `cosy_rir` (sage trim, a
  porch with a bench and a hanging lantern, a window box, a lantern by the hens' door, flower pots, stepping stones to the
  gate) in `pen_t3` (grass tufts, the half-barrel sand bath) and `fence_t3` (painted sage, white caps, flowers along the
  front); Deluxe `deluxe_rir` (a storey taller: a belt of trim, a hayloft door with a hoist, windows upstairs with flowers,
  a green copper roof with standing seams, a cupola with the vane on top; `noble_roof`: copper, cedar or fish-scale, the
  first chosen) in `pen_t4` (a stone fountain, an eight-sided feeder with a copper roof, a sandbox with a beach umbrella,
  bucket and spade beside the barn; the hay behind the barn) and `fence_t4` (the Deluxe pickets, roses and bunting). From
  Cosy, the automatic door's box over the hens' door (a green light) and a little solar panel on the roof. Every look has
  the same floor, pop door, nest window and ramp (`nest_window`, asserted), so the hens come, go and lay the same way.
  `PENS` per look: the pen's box, gate, feeder, water, hay and sack; coops.json `pens` (`pen_info`, `play_info`).
- **Their pens for the birds** (main.js `tierPen`, `penOf`): each coop's own yard, obstacles, feeder, gate and start spots
  (the Snug pen's fitted into the yard), from coops.json; every use of the pen goes through `penOf(plot)` (the birds,
  the corn, the farmer's spots, the gate, the greeting, the chicks' farewell); the night visits through `NightVisit.pen`
  (its fence, its grid, Rusty's ways in, a metre off its own fence).
- **The play things** (play.js, coops.py `PLAY`): Cosy: a swing (its perch `swing_seat` swings), the half-barrel sand bath,
  a cabbage on a string (`cabbage`, it swings and spins); Deluxe: the swing, the sandbox, the cabbage and a rainbow
  xylophone. Now and then a grown bird goes to a free one (`wantPlay`): up onto the swing's perch, a turn to face out, a
  ride (she keeps it going), a hop down; into the sand, down low, wriggling and kicking it up in puffs, rests, out and a
  big shake; pecks at the cabbage; pecks at the xylophone, a note floating up in the bar's colour. Not by night, not while
  the farmer's in the pen; a bird at play is busy. `playtest.mjs` (each, in both pens), `playfilm.mjs` (a film).
- `barnlooks.mjs`: the test page's `?looks=N` in turn and a sheet of the five (ONLY, SIZE, OX, OZ, W, H, TIME).

## Release 4, step 2: upgrades in the game (27 Oct 2026; Audrey: "Yes, put them in the game")

- **The upgrade** (game.js `COOP_LOOKS`, `UPGRADE`, `coopNext`, `upgradeCoop`; gameui.js `coopCard`; main.js `tryUpgrade`,
  `retier`): a coop's card says its look (Red Barn · Rustic) and what's next: "Upgrade to Mended", what it brings, what it
  does, "Upgrade · 300 coins" (not enough: says so). Tapped: its bigger pen where it stands if there's room (`coopSpot`
  with the next look's footprint), else "Its bigger pen needs more room here: move the coop first"; the price paid, a
  little XP (8, 20, 45, 100), what's in the way cleared for good; the coop in its new look there and then (`retier`: its
  house, pen and fence, its birds' yard, play things, feeder, lanterns, the grid and grass). Not while the farmer's in its
  pen. Prices 300, 1,000, 3,000, 8,000.
- **What each look does** (`lookOf`, `lookLays`, `kidsOf`, `cuddle`): Rustic misses the afternoon egg one day in three,
  Mended one in six, Snug two a day, Cosy an evening egg too one day in four, Deluxe one in two; the chicks' ratings a
  little lower (Rustic, Mended) or higher (Cosy, Deluxe); a cuddle counts again after 5 hours (Cosy) or 4 (Deluxe), else
  6. Only the Red Barn so far (`UPGRADES`): the other coops keep their looks and a Snug coop's ways till theirs are made.
- **The farms from before**: their coops become Snug (load(), once, marked `cv: 1`: not counted as an edit); a new farm's
  Red Barn comes Rustic. A coop's footprint by its look (`footOf`, `apronOf`): placing, moving, the decorations, the grass.
- `upgradetest.mjs` (new; LANG=fr): a new farm's Rustic barn and its card, each upgrade from the card (no room: move it
  first), the looks, the birds free in their pens, the gate reachable, the play things, a reload, a farm from before.
- **The automatic doors** (Audrey: "starting at cosy the coop door are automatic. They close automatically but sometimes,
  rarely, it doesn't work and that's when [Rusty] comes", "About once a month"; game.js `AUTO_DOOR`, `autoDoor`,
  `doorStuck`, `shutFor`, `foxComes`; main.js `tickDoors`): a Cosy or Deluxe coop's pop door shuts itself once they're
  all in (by 22:48 at the latest; no moon to tap) and opens at 6:00. About one night in thirty (by the coop and the night)
  it sticks open: with the farm open, a hint says so and its moon shows, to shut it by hand; that night Rusty comes for it
  even when he wouldn't have, and finds it open unless it was shut by hand. The morning's card starts "An automatic door
  stuck open last night." (saved with the visit as `stuck`, checked: only on a night that coop's door could have stuck).
- `doortest.mjs` (new; LANG=fr): a Cosy barn's door on a night it works, in the morning, on a night it sticks (the hint,
  the moon, Rusty's visit, shut by hand), a night it sticks with the farm shut (the card), a reload. `looktest.mjs` (new,
  no browser): each look's eggs, chicks and cuddles, the doors' nights, the upgrades' prices and XP.
- Balance (`balsim.mjs`, which now buys the upgrades): the same pace as before (once a day level 29 at a year, twice a
  day level 30 on day 296, every 3 hours day 244); the Red Barn Deluxe around day 110.

## Release 4, step 3: the Thatched Cottage's five looks (27 Oct 2026; Audrey: "The other four coops (Recommended)", one at a time, shown first; then "All good, just try not to get the same configuration of the toys/ accessories for each coop")

- **The looks** (stylized/coops.py `box_orp`, `shed_orp`, `thatched`, `cosy_orp` with `_cottage_bits`, `deluxe_orp`):
  Rustic, a hut of straw bales (twine round each), an old board roof under a ragged heap of straw and a patched tarpaulin,
  a rope over it with a brick hanging at each end, a cracked pot of dry stems where the lavender will be. Mended, a little
  wattle hut (hazel rods woven between stakes) on a few courses of brick, daubed with clay on the left of its front and the
  backs of its sides (lumps of clay along the edge), the rest still bare, a thin roof of new thatch with hazel spars, a
  bucket of daub with a trowel in it. Snug, the cottage. Cosy, the cottage with hollyhocks along its gables, a climbing rose
  at its corner, a window with flowers on its left gable and a rose arch over a bench there (a watering can), a lantern by
  the hens' door, the automatic door's box and its solar panel on the thatch, a doorstep and mat, pots by the ramp, stepping
  stones. Deluxe, `thatched(eave=1.1, peak=1.85)`: a storey taller, limewashed Suffolk pink, a rail at the upstairs floor,
  windows upstairs in both gables with flowers, two eyebrow windows in the front thatch (`_dprism`: a half-round hood of
  thatch over a little dormer), a decorated ridge (a band of paler straw cut into points, crossed hazel rods pinning it), a
  straw pheasant on the ridge, a knot of straw in the middle for the vane, a second chimney pot; the cosy touches but no
  arch (its sand pit is there). Every look keeps the cottage's nest: the same floor (0.2), pop door, nest window (low, its
  door let down onto the ground), short ramp (`NESTS['house_orp']` asserted in export), and something where the lavender
  pot stands (the birds walk round it in every look).
- **Its own gardens** (`PENS_BY['orp']`, `PLAY_BY['orp']`; the same pens, fences and gates as the Red Barn's, their things
  elsewhere and in other styles): an enamel basin (blue rim) in the small pens, the feeder and water on the other sides;
  Cosy: the swing of hazel poles on the right, a tin bath of sand at the front left (`tin_bath`), the cabbage hanging from a
  hazel tripod (`cabbage_tripod`) by the house's left corner, the hay behind the arch; Deluxe: a round sand pit edged with
  bricks under a thatched parasol beside the right gable (`sand_pit`), a stone trough with a cast-iron pump for water
  (coop.py `trough`), a feeder with a little thatched roof (`feeder_style='cottage'`), the xylophone on the right, the swing
  at the front right. coops.json `pens[breed][t]`; models `pen_t0_orp` .. `pen_t4_orp` (the Red Barn's keep their names).
  main.js `tierPen(breed, t)`, `pensOf`, `penKey` (footprints and aprons by breed and look); play.js: a round sand bath of
  any size (`dust.r`).
- **In the game** (game.js `LOOKS_CV = { rir: 1, orp: 2 }`, `CV`, `UPGRADES` from it): the cottage's upgrades and its
  texts (`up_orp_*`, English and French). A farm from before a breed's looks has that breed's coops Snug (load(), once;
  `cv` 1 to 2 checked, not counted as an edit): a farm from the Red Barn's looks has its Thatched Cottages Snug (a rustic
  one gets the cottage, the same eggs as before), its barn as it was. main.js `hasLooks`: a breed's looks in the game only
  once it's in `UPGRADES` (on the test page's `?looks` as soon as its models are made).
- Tests: `upgradetest.mjs` `BREED=orp` (a Thatched Cottage placed, first in the save: each upgrade, moved where its pen
  fits and its gate opens onto the farm, the reload, a farm from before), `playtest.mjs` `BREED=orp` (the tin bath, the sand
  pit), `looktest.mjs` (the cottage's upgrades; loading farms from before each breed's looks), `barnlooks.mjs` `BREED`,
  `NTH` (a breed's second coop on the test page, turned the other way), `SHIFT` (the view along the screen's up; main.js
  `lookFree`: past the map's edge, for pictures).

## Release 4, step 4: the Pagoda's five looks (27 Oct 2026; Audrey: "Yes, five looks too (Recommended)", each in its Silkie colour, the Silkies themselves unchanged; then "It's perfect and so adorable I love it")

- **The looks** (stylized/coops.py `box_sil`, `shed_sil`, `pagoda`, `cosy_sil` with `_pagoda_bits`, `deluxe_sil`): Rustic,
  a shelter of bamboo poles and old reed mats (their reeds and cords drawn on, one corner torn), a sagging mat roof over a
  ridge pole weighed with stones, an old torn paper lantern on a bamboo pole where the Pagoda's lantern hangs, the nest's
  lattice faded. Mended, a little hut of bamboo canes on a stone base, a roof of halved bamboo in rows, its left posts and
  half its front beam lacquered in its colour (the pot of lacquer and the brush beside it), a new paper window, a paper
  lantern on a pole. Snug, the Pagoda. Cosy, the Pagoda with a cherry tree in blossom by its left side (`cherry_tree`,
  petals on the ground), a stone lantern (`stone_lantern`, lit at night), a second paper lantern at the other front corner,
  azaleas along its base, the automatic door's box and its solar panel on the lower roof, glazed pots of little pines by
  the steps, flat stepping stones. Deluxe, `pagoda(tiers=3)`: a third storey and roof, a tall gold finial with rings,
  little gold bells at the two lower roofs' corners, the cherry tree on its right; the cosy touches. Every look keeps the
  Pagoda's nest (`NESTS['house_sil']` asserted: the floor 0.14, two steps, the low window with its lattice slid up).
- **Its gardens**: a clay bowl for water in the small pens, a celadon one in the Cosy; Cosy: a swing under a little red
  torii (`torii_swing`), a big glazed bowl of sand (`sand_bowl`, a round sand bath), the cabbage from a bamboo pole
  (`cabbage_bamboo`); Deluxe: a zen garden of raked sand with three mossy stones (`zen_garden`, a box sand bath), a koi pond
  with lily pads, two koi and a bamboo spout for water (coop.py `koi_pond`), a feeder of dark lacquered wood under a little
  curved roof (`feeder_style='pagoda'`), a bamboo xylophone (`bamboo_xylophone`), the torii swing.
- **In its Silkie colour** (main.js `SIL_FROM`, `SIL_MODELS`, `keepSilkieColours`, `tintedPart`, `inColour`): each Pagoda
  model's own colours (its lacquer, trim and roof; the rustic hints faded) swapped for the colour's, now made the first
  time a coop of that colour needs one (it used to make every colour's at the start), matching colours within a few steps
  (the roofs' shades vary a little). Test hook `tintCoop` and `pagodacolours.mjs` (each look in a few colours).
- **In the game**: `LOOKS_CV.sil = 3` (every Silkie colour's Pagoda, the rare ones too); `up_sil_*` in English and French;
  farms from before have their Pagodas Snug. Tests: `upgradetest.mjs BREED=sil` (both ways), `playtest.mjs BREED=sil` (the
  sand bowl, the zen garden), `looktest.mjs`. Balance (`balsim.mjs`): with every Silkie coop upgradable the game is a
  little quicker (once a day level 30 on day 338, twice a day 283, every 3 hours 235); to look at again once all five coops
  have their looks.

## Release 4, step 5: the Stone Cottage's five looks (27 Oct 2026; Audrey: "The other four coops", one at a time, shown first; then "Perfect go ahead")

- **The looks** (stylized/coops.py `box_leg`, `shed_leg`, `stone`, `cosy_leg` with `_stone_bits`, `deluxe_leg`): Rustic, a
  hut of dry-stone walls (`_drystone`), its front an old blue door laid on its side with holes cut for the hens (the hint:
  the cottage's blue door), a roof of a few big old slates on two planks (one slipped off, lying by the wall), moss and
  stones on it. Mended, a little stone hut newly pointed, its front slope slated half way (bare battens above, a stack of
  slates by its gable), a new pine door, a pot of blue paint. Snug, the Stone Cottage (`stone()` now takes the eave, the
  peak and the name). Cosy, the cottage with its window frames duck-egg blue, wisteria hanging along the front eave, a
  window box of red geraniums, a white dovecote on a pole with two doves (`dovecote`), a lantern by the hens' door, blue
  hydrangeas in pots by the ramp, the automatic door's box and its solar panel, square flagstones to the gate. Deluxe, a
  storey taller: two stone dormers in the slates, a slated porch hood over the blue door on stone brackets, stone balls
  on the gables, a chimney at each end, a window in the left gable; the cosy touches. Every look keeps the cottage's nest
  (`NESTS['house_leg']` asserted: the floor 0.18, the ramp, the nest window with its door let down).
- **Its gardens**: an old stone sink for water in the small pens (coop.py `stone_sink`), a stone bowl in the Cosy; Cosy: a
  swing from the low branch of an old apple tree (`tree_swing`, the trunk kept clear), a wheelbarrow full of sand
  (`wheelbarrow`, a box sand bath), the cabbage from an iron shepherd's crook (`cabbage_crook`); Deluxe: a little blue
  rowing boat full of sand (`sand_boat`), a water butt dripping into a stone basin (coop.py `water_butt`), a feeder like a
  tiny stone house with a slate roof (`feeder_style='stonehouse'`), the apple-tree swing, the crook, the xylophone.
- **In the game**: `LOOKS_CV.leg = 4` (`CV` 4); `up_leg_*` in English and French; farms from before have their Stone
  Cottages Snug. Tests: `upgradetest.mjs BREED=leg` (both ways), `playtest.mjs BREED=leg` (the wheelbarrow, the boat),
  `looktest.mjs`. Released together with the Pagoda (step 4). Balance (`balsim.mjs`, now with the Stone Cottage's
  upgrade days): once a day level 30 on day 337, twice a day 283, every 3 hours 235 (the Stone Cottage's Mended comes
  around day 85, its Deluxe around day 186); to look at again once all five coops have their looks.

## Release 4, step 6: the Timber Lodge's five looks (27 Oct 2026; Audrey: "The other four coops", one at a time, shown first; then "Perfect, put it in")

- **The looks** (stylized/coops.py `box_bra`, `shed_bra`, `lodge`, `cosy_bra` with `_lodge_bits`, `deluxe_bra`): Rustic, a
  woodpile hut: split firewood stacked for its sides (outside the walls, clear of the hens' door and the nest window) and
  its back, rough bark-edged slab boards for its front on an old log, a roof of bark sheets on three poles under fir
  boughs, two logs on top to hold them down, a chopping stump where the lodge's lantern post stands (the hint: the
  lodge's logs and green roof). Mended, a little cabin of new peeled logs (`_log_walls`, the lodge's way), chinked white
  on its left so far (its inside white there, dark on the right; the bucket of chinking and a trowel where the lantern
  post will be), a roof of rough slab boards of uneven widths, bark up on some, held down with stones, a new plank door,
  fresh logs stacked by its right side (the birds walk round them). Snug, the Timber Lodge (`lodge()` now takes the
  eave, the peak and the name). Cosy, the lodge with a woodpile under a little roof of green shingles against its left
  side, a wreath of pine and cones with a red bow on its door, a red birdhouse on the lantern post, a mossy stump with red
  toadstools and ferns in a hollow log either side of the foot of the ramp, the automatic door's box and its solar panel,
  rounds of log for stepping stones to the gate. Deluxe, a storey taller: a dormer up the front slope (boards, a window,
  crossed logs at its peak, its own shingles), crossed logs at the gables' peaks, a window with green shutters in the
  right gable, a tall chimney of river stones against the left gable, a hood of green shingles over the door on log
  brackets with a lantern hanging from it (lit at night), a carved wooden bear sitting by the front right corner; the
  cosy touches (the woodpile in front of the chimney). Every look keeps the lodge's nest (`NESTS['house_bra']` asserted:
  the floor 0.26, the nest's 0.2, the ramp, the nest window with its door let down).
- **Its gardens**: a turned wooden bowl for water in the small pens, a copper one in the Cosy; Cosy: a swing on two log
  posts with sawn ends (`log_swing`, beside the lodge on its right; its posts kept clear), a big half log hollowed and
  full of sand (`sand_log`, coop.py `half_log`, lying along the yard: a box sand bath), the cabbage from a crooked branch
  stood in an old stump (`cabbage_stump`); Deluxe: a crib of logs notched at its corners, full of sand, cones on it, a
  young pine at its back corner (`sand_crib`), water from a split-log flume on crossed sticks into a hollow log (coop.py
  `log_flume`), a feeder like a tiny log cabin with a green roof (`feeder_style='cabin'`), a xylophone of round branches
  painted in rainbow colours on two little logs, played with a pine-cone stick (`log_xylophone`), the log swing, the
  stump. The five coops' gardens all differ (Audrey: "try not to get the same configuration of the toys/ accessories for
  each coop").
- **In the game**: `LOOKS_CV.bra = 5` (`CV` 5): every coop has its looks now; `up_bra_*` in English and French; farms from
  before have their Timber Lodges Snug. Tests: `upgradetest.mjs BREED=bra` (both ways), `playtest.mjs BREED=bra` (the half
  log, the crib), `looktest.mjs` (a breed without looks: none now). Balance (`balsim.mjs`, with the lodge's upgrade
  days): unchanged, once a day level 30 on day 337, twice a day 283, every 3 hours 236 (the lodge's Mended around day
  153 once a day, its Deluxe around day 235). A quick look at a model in Blender, without the browser:
  `stylized/view_model.py` (`YAWS`, `PITCH`, `AT`, `ORTHO`).

## Release 4, step 7: the Christmas dress (27 Oct 2026; Audrey, on seasonal coops: "We will need both as some of them can be paid content (the ones fully reworked) but that can come when the time is right, no need to plan too far in advance. The next one will be Christmas and should only be a dress for any coop", "In season, kept forever (Recommended)", "1,500 coins (Recommended)"; then "Perfect, put it in", "1 Dec to 6 Jan (Recommended)")

- **What it is**: a dress for any coop in any look (stylized/coops.py "the Christmas dress"): a garland of fir along the top
  of its pen's fence (front and sides, sagging from post to post) with little bulbs in red, gold, green, blue and white,
  a red bow on each post (`_garland`, `_bow`, `xmas_fence(t)`: `xmas_fence_t0`..`t4`, one for each pen size, the same for
  every breed); a wreath with berries and a bow on each gate post (the Deluxe: one hung under its rose arch); a little
  Christmas tree in a red pot with baubles, a string of lights, a gold star and three presents (`xmas_tree`), where
  there's room in front of the house (`xmas_tree_spot`: clear of the feeder, the water, the hay, the play things, the
  house's blocks, the ramp and the way to the gate, as near a front corner as it can; smaller in the tiny Rustic pens:
  coops.json `dress.xmas.tree[breed][look]` = [x, z, size]); a lit gold star on the roof's top (`xmas_star`, at
  `tops`; on a Deluxe above its weathervane); fairy lights along the front eave of every house in every look
  (export_coops.py `eave_of`: rays straight down across the front of its roof find its front edge, a lantern or a pot
  in front left out by comparing each point with its neighbours, the bulbs hung under it in little swags; coops.json
  `dress.xmas.lights[house]`; main.js `xmasLights` makes them once per house, in turn red, gold, green, blue, white).
  At night every bulb glows in its own colour (webglb.py `GLOWC`, the 'glowc' bucket; main.js `lightUp`: its own
  colour, not the lanterns' warm one) and the tree casts a little pool of light. The shop's picture
  (`decor/xmas.webp`) from `stylized/xmas_pic.py`.
- **The rules** (game.js `DRESSES`, `inSeason`, `buyDress`, `dressCoop`): on sale from 1 December to 6 January (both days
  in, on the phone's calendar) on the farm shop's fourth shelf, Seasons ("Saisons"), for 1,500 coins (+30 XP); out of
  its season the shelf says when it's on sale. Bought, it's yours for good ("Yours for good: dress a coop from its
  card"): a coop's card has "🎄 Put on the Christmas dress" (or "Take off the Christmas dress"), any time of year; put
  on, the coop is dressed there and then (`dressCoop` in main.js: `retier`, its birds walking round the tree). Won too:
  a first place at the County show or the National Championship judged in its season gives it (once), "And a prize on
  top: the Christmas dress!" on the results.
- **The save**: `dresses` (known ones, once each), a coop's `dress` (only one owned), a result's `dress` (only a County or
  National first place judged in its season, and owned); anything else flagged and dropped; a farm from before the
  dresses has none, unflagged.
- **Tests**: `dressrules.mjs` (no browser: the season's days, the price and XP, kept for good, the save, the shows' prize)
  and `dresstest.mjs` (EN upright, FR sideways: the shelf, bought, the coop's card, dressed (its parts), its birds clear
  of the tree, in a Cosy look, a reload, off and on, out of season); `geesebuy.mjs` (the shop's four shelves).
  Pictures: `barnlooks.mjs DRESS=xmas`.

## Small fixes (27 Oct 2026; Audrey, on the list of eight small fixes: "Yes")

- **Rosie's plait** (character/farmer.py `PLAIT`): down her front, inside her right shoulder, instead of over the top of
  her arm and through her sleeve (checked in Blender: clear of her arms and her chest standing, and with her head turned
  as in the line-up's look; pictures with `rosieshot.mjs`).
- **The shirt's edge** (farmer.py `_farmer_torso`, export_farmer.py `bake`): the torso is cut along the waist and the bib's
  edges before the denim is given, and where one colour meets another is kept as made when it's simplified, so a plain
  shirt (the show's white, the rodeo's chambray) meets the dungarees in a clean line, not a jagged one.
- **The Red Barn's nest window** (coop.py `wall_boards`; coops.py `BARN_EAVE`, `BARN_PEAK`, coop.py `OVER_FRONT`): since 21
  Oct a whole board had been laid over every opening of a boarded wall (the window and the hens' door showed only a
  sliver); fixed, and the barn's walls a little taller and its front overhang shorter, so its nest and straw show from
  the game's view in every look.
- **A hen going to bed while you're inside** (main.js `insideArrive`, `arriveStep`): she comes in through the pop hole,
  walks across the straw and hops onto a free perch spot (a chick to its corner), instead of waiting outside until you
  leave. Test: `insidebed.mjs`.
- **The Deluxe's rose arch and Rusty**: checked from the game's camera at every Deluxe coop (rays from the camera to Rusty
  at its ramp): since the Deluxe gardens grew in release 4 nothing hides him; no change.
- **The Christmas star** (coops.py `xmas_star`: a second star crossed with the first, so it shows from every side;
  export_coops.py `LEAN_TO`: on the Mended Red Barn's one-slope roof it stands on the high back edge, not half in the roof).
- **The Christmas lights along the whole eave** (export_coops.py `NOT_EAVES`: the rays pass a lantern, a bird box, a pot or
  a plant in front of a roof instead of stopping there): the Cosy Timber Lodge's lights now reach its left end, past the
  lantern post.
- **A lighter first load** (`slim.mjs`, run by build.sh; main.js `unslim`): the still models (coops, village, interiors,
  decor, showground, fauna) keep each mesh's corners as 16-bit whole numbers on a grid fitted to it and its normals as
  bytes (KHR_mesh_quantization), turned back into ordinary numbers as they load, so everything after sees the very same
  models (to within a twentieth of a millimetre on a coop). The coops file 15.3 → 10.5 MB, about 6 MB off the first load.

## Release 5, step 1: fishing at the pond (28 Oct 2026; Audrey: "Release 5: fishing (Recommended)"; on the fish shown: "Perfect, carry on"; the legendary ones: "Photo, then let go", "and on top of that each time the farmer fishes a new breed of fish he is happy and does a little celebration")

- **The fish** (`src/fish.js`, built in code like the frogs: no model file): fourteen species, seven in each water,
  four common, two rare, one legendary with a name. Pond: rudd, roach, perch, tench; the golden tench and the koi; Big
  Bertha, the giant mirror carp. River (step 2): minnow, gudgeon, dace, chub; the brown trout and the grayling; Old
  Snapjaw, the pike. A body lofted nose to tail from rings (each species its own depth, hump, width, mouth up or under,
  a pike's long flat snout), thin fins as little fans (forked, notched, square or rounded tails, the perch's spiny
  dorsal with its black spot, the grayling's sail, the trout's and grayling's adipose fin), eyes with their own iris
  colours and a catch-light, a smiling mouth line, barbels on the tench, the carp, the koi and the gudgeon. The body's
  colours and marks drawn per pixel (crisp close up): countershading, scales, a gill line, the perch's bars, the
  trout's black and red spots with pale rings, the pike's pale beans, the koi's patches, Big Bertha's mirror plates. It
  swims in place (a wave down to the tail; a curl). `?lineup=fish` shows all fourteen; `fishpics.mjs` takes a picture
  of each (`BACKDROP=1`: on cream, for the cards: `fishcards.py` makes `fish/<id>.webp`, see-through round the fish).
- **The rules** (game.js `FISHING`, `FISH_RULES`, `castWorm`, `landFish`, `buyWorms`): the pond from level 3, the river
  from level 8. A worm a cast: found by the chickens who love the farmer (below: "Worms from the chickens"; at first,
  four came free each morning), or from tins (10 for 60 coins, on the dock's card). A cast decides the fish there and then, by weight (roach 30, rudd 26, perch 20, tench
  14, the golden tench 4.5, the koi 4, Big Bertha 1.5 in each hundred), its size within its sizes (most of them
  smallish). Landed: sold live to the village aquarium shop (its price a little more the bigger it is: rudd 9, roach 8,
  perch 11, tench 14, golden tench 70, koi 90), 1 XP (2 for a tench, 6 for a rare one), +10 XP for a fish new to you;
  a legendary one has its photo taken and goes back into the water (the village paper buys the photo: 300 coins for Big
  Bertha, 400 for Old Snapjaw; 25 XP); the count and the biggest of each kept. Balance (`balsim.mjs`, the chickens asked
  for their worms and up to 8 fished each morning): once a day level 30 on day 312 (327 with four free worms a day, 337
  before fishing), twice a day 269, every 3 hours 220; fishing about 45,000 coins in a year, against eggs 123,000 and
  chicks 128,000: it pays, but it can't replace the hens.
- **The save**: `fish` (made the first time it's used): the worms (at most 999), and each fish caught (known fish only,
  from a water the level has opened): [how many, the biggest in cm, within its sizes]; anything else flagged and put
  right. A farm from before fishing has none, unflagged; one saved while worms came free each morning (`day`, `free`, at
  most four): checked as it was, then those left kept as worms.
- **The dock** (main.js `dockInfo`): the pond's dock, its bank end and its far end, its deck's height (the farmer walks
  up on it: `groundY`); tap it for its card (`gameUI.dockCard`): the pond's seven fish (those caught in colour), the
  worms, Go fishing, a tin of worms. The pond lies in two wild fields at first, so while the dock's field is wild meadow
  it has a gate in its fence (`dockGate`, as the geese's gates: where the way in to the dock is shortest from a place the
  farmer can get to; a geese's gate on that field does instead), opening as he goes in, shut behind him on his way out.
  At level 3 the level's card says "Fishing at the pond: tap its dock", with "Show me the pond" (the view over to it:
  never by itself).
- **The fishing** (`src/fishing.js`; farmlife.js `fishAt`): he hurries to the dock (through its gate), out to its end,
  where his old cane rod (farmer.js `makeRod`: a cork grip, a little reel, the cane in three lengths that bend) lies on
  the boards by a zinc bucket of water (both there from level 3); he crouches and picks the rod up; the worms and Stop
  along the bottom. A tap on the water casts there (as near as the rod
  reaches): drawn back over his shoulder and swung, the float flies out on its line (a thin ribbon turned to the
  camera) and lands with a ring. "Watch the float": it bobs, a nibble or two, then it's pulled under with a splash and a
  "!" over it: tap now (a tap before: "Too soon!", the fish wary a moment more; too slow: "Too late: it got away with
  the worm"). Then the reel: a gauge, the line's pull with a green part to keep it in (smaller for a rare fish, smaller
  still for a legendary one) and how far the fish has come; holding reels in (the pull rising), letting go eases off;
  the fish pulls in surges (harder the rarer and bigger). In the green it comes in, quicker while reeling; held too hard
  for too long the line snaps ("Too hard"), too slack it slips the hook ("Too slack"). Its shadow comes in under the
  water, weaving, rings where it splashes. Landed: out of the water on the line, swinging up in front of him ("Got
  one!"); he takes it off the hook in his left hand, crouches and lays the rod down on the boards with his right, stands
  and cradles it on both palms (resting on them, never through them), turns round to show you; a fish new to you: on
  his left palm, a hop and his right fist punched in the air ("A new fish!"). Its card (`gameUI.fishCard`): its
  picture, its name and size, new to your book or your biggest yet, sold live (or a legendary one's photo), the coins
  and XP, how many caught; Keep fishing (with the worms left) or Stop. Then he turns to the bucket, crouches and lowers
  it in: it slips off his palms head first into the water with a little splash (back to a size the bucket holds as it
  goes: it's larger than life in his hands, to read on a phone); a legendary one: he turns to the water, crouches at the edge and lets her
  slip back in. Keep fishing: he picks the rod up again. Stop: the rod left lying on the dock by the bucket, back along
  the dock and away. Night falling (22:15): he winds in and goes home; Rusty: put away. (Audrey, 28 Oct, on the first
  version: the fish went through his hands, the rod just vanished, the fish flew into the bucket: now it's all done by
  hand; and the reel's winding and the hooray's hop and pumped fist now really move: a task's own movement, `want.anim`,
  is passed on to the rig. `fishclose.mjs` takes close-up pictures of each moment, straight off the canvas.)
- **Tests**: `fishrules.mjs` (no browser: the levels, the worms, the draw, landing, the save) and `fishtest.mjs` (EN
  upright, FR sideways: the dock's card at levels 2 and 3, the level card's look at the pond, the walk out through the
  gate, a cast, too soon, the bite, the reel, the new fish's hooray and card, paid, keep, a bite missed, the line
  snapped, slipped off, Big Bertha's photo and release, the last worm, Stop and the walk back, a reload, the evening;
  the rod and bucket on the dock, picked up, laid down to unhook, the fish resting on his hands, into the bucket).
  `fishfilm.mjs` makes a short film of it.

## Worms from the chickens (28 Oct 2026; Audrey: "How do you get the worms? I thought that would be cute if the chickens get them to the farmer up to 3 a day per chicken if the chicken loves the farmer and the farmer goes and asks for it"; then "Replace them", "1, 2 or 3 by love", "One visit, all her worms")

- **The rules** (game.js `FISHING.byTrust`, `wormsOf`, `wormsGiven`, `askWorms`): no more free worms each morning. Once
  fishing is open (level 3), each chicken (hen or rooster) finds worms for the farmer every day, by how much she loves
  him: Shy none, Friendly 1, Trusting 2, Best friend 3. Asked (her card), all of today's go into the bag at once (at most
  999); once a day each. Tins of ten stay on the dock's card.
- **Her card** (`gameUI.birdCard`): "🪱 Ask for worms · 🪱 2" under the cuddle; asked today: "found worms for Arthur
  today. More tomorrow!"; shy: "still shy: no worms for Arthur yet. Cuddles help."; at night, in the morning. Her trust
  card says how many each level finds. The dock's card and the level-3 card say where worms come from ("Your chickens
  who love Arthur find worms every day: tap one and ask"); no worms: "No worms left" said once (it was twice).
- **The visit** (main.js `gameWorms`, farmlife.js `penTask` 'worms', `penSpec` `callHen(b, true)`, `dig`): the farmer
  into the pen, crouched, his hand held out low, palm up (farmer.js poses `cup`, `cupL`); she comes and stands beside
  his hand, side on to him so you see her beak (to his right, or his left if that's where there's room and a way,
  else in front of him); for each worm two kicks back, her beak down to the ground, up with a worm wriggling in it, then
  dropped into his palm, where they wait side by side; "Thank you, my lovely!" ("Thanks, old chap!" to a rooster), a
  heart; his hand closes round them, he stands and puts them in the pocket on his bib (`pocket`, `pocketL`). A hen who
  can't find a way through to him (stuck behind him by the fence, say) flutters over, wings going (this helps cuddles
  too).
- **The save**: each bird's `worm`: the day she last found worms for him (never ahead of today; anything else flagged
  and dropped).
- **Tests**: `fishrules.mjs` (the worms by trust, once a day, the bag, the old free worms kept, the save), `wormtest.mjs`
  (EN upright, FR sideways: the cards at levels 2 and 3, shy, friendly, asked, the visit watched: her beak, his palm,
  his pocket, nothing left lying about; the rooster's three; the dock's card; the next day; the night; a reload);
  `wormclose.mjs` takes pictures of each moment (VIEW=game: from the game's camera).

## Release 5, step 2: the river and the Book's fish pages (28 Oct 2026; Audrey, on the fixed catch: "Perfect, carry on")

- **The river** (main.js `riverInfo`, `riverRig`, `riverRoute`, `riverCast`, `riverDrift`; fishing.js with `bucketAt`,
  `rodRest`, `castTo`, `drift`): from level 8, fished from the footbridge on the west stream (the one at -15.2, -7.0).
  From level 8 his second rod lies along the bridge's deck on his right (its grip by his foot, down the arch's slope,
  resting on it) and a bucket stands by his left foot. Tap the footbridge for its card (the river's seven fish: minnow,
  gudgeon, dace, chub, the brown trout and the grayling, and Old Snapjaw the pike; the worms; Go fishing; a tin). He
  walks onto it from its end nearer the farm, to the middle of its downstream side, up on the arch, and picks the rod
  up, facing down the stream. A tap on the water downstream casts there: on the stream, in its banks, 0.9 to 3.6 m down
  from the bridge (a tap upstream or off the water: nothing); the float then drifts down with the current (0.09 m a
  second, as far as the line lets it, a little over 4 m). The bite, the reel and the catch as at the pond; Old Snapjaw
  goes back into the river from the bridge. The level-8 card: "Fishing in the river: tap its footbridge", with "Show me
  the river". FISHERS holds each water's fishing (each its own rod and bucket); FISHING the one he's at.
- **The footbridges' decks** (`bridgeDecks`): measured on the model with fresh matrices, and with a few rays across the
  deck at each step (one between two planks found no deck: the farmer dipped 4 cm in the middle of the bridge).
- **The Breed Book's fish pages** (`gameUI.fishPages`): from level 3 the Book has two tabs, Breeds and Fish. Fish: "2 of
  14 fish caught", the pond's seven and the river's: each its picture (dark till you've caught one), its name, how rare
  (Common, ✦ Rare, ✦✦ Legendary), caught (how many, your biggest) or not yet (or from which level), its sizes and about
  what it sells for (a legendary one: its photo's price).
- **Tests**: `rivertest.mjs` (EN upright, FR sideways: the footbridge's card at levels 7 and 8, the level card's look at
  the river, the rod and bucket, the walk out, the cast on the stream and the drift, a river fish landed and its card,
  into the bucket, Old Snapjaw back into the river, Stop, a reload, the Book's fish pages); `fishclose.mjs` and
  `fishfilm.mjs` with WATER=river.

## Release 6, step 1: turning the farm (28 Oct 2026; Audrey: next "Release 6: turn the farm (Recommended)")

- **The turn** (main.js `turnView`, `view.az`, `setViewDir`): two fingers turning on the screen turn the farm with them, the
  same way and as far, round the middle of the screen (the ground seen slanting, a spot under a finger goes round on an
  ellipse, not quite under the finger). It only starts once the fingers have turned 8 degrees between them, so a pinch
  that hardly turns just zooms. `VIEW_DIR` (the way to the camera, 42 degrees down) follows `view.az`, and everything
  that faces the player follows it (the farmer turning to you, a hen whose card is open, the geese, the dog; they already
  asked where the camera was). It never turns by itself; on a computer, keys Q and E turn it 12 degrees.
- **The compass** (`#compass`, `compassShow`): once the view's turned more than 3 degrees, a round compass at the top right
  under the bar, its needle pointing the usual way up (measured on the screen, so it stays true however it's turned). A
  tap turns the view back to the usual one, smoothly (a third of a second, longer for a bigger turn); fingers on the
  screen stop it. Hidden inside a coop and under a card.
- **Films and the show**: the morning replay and the show day play from the usual view (they were framed for it), and
  the player's own turn comes back after.
- **Tests**: `viewtest.mjs` (EN upright, FR sideways: the usual view; two fingers turning; a pinch that hardly turns; the
  compass and its label; it stays turned; a drag while turned; a hen tapped while turned turns to you; keys; all the way
  round, pictures each quarter; the compass back); `viewfilm.mjs` makes a short film of it.

## Release 6, steps 2 and 3: everything seen from all sides, the backs finished (28 Oct 2026)

- **The tour** (`sidetour.mjs`): each kind of thing in the village, each decoration and each breed's coop in each look,
  seen close from the usual side and turned a quarter, a half and three quarters round (four pictures in a strip; `MODELS=`
  just some). The coops (built whole in Blender), the well, the bandstand, the greenhouse, the windmill, the bridges, the
  dock and the small things were already finished all round.
- **The farmhouse** (`ffland.farmhouse`): its back was a blank wall. Now the kitchen door (dark green, a brass knob, a stone
  step), two windows (flowers under one), a gutter and drainpipe, a water butt at the corner; a window in the far gable
  above the logs; a round attic window in each gable. Its gable windows were a solid frame plate over the glass (a
  blank pale square, cream on cream in the sun): now glass with a frame and cross in front, as the front's
  (`sidewindow`). The back windows glow at night with the others. (The house stands at the village's corner, its back to
  the woods: the walking grid behind it is a little wider, nothing on the way.)
- **The duck house** (`decor_sprites.duckhouse`): a white-rimmed round window at the back and in each side.

## The pond's secret: the salmon and the froglet (28 Oct 2026; Audrey: "A salmon and a frog are in love ... no need to mention it anywhere, the salmon cannot be fished")

- **The lily pads** (pond.js `padGeometry`, `FrogPond.pads`): four round leaves out on the pond, notched, darker veins, a
  paler rim, a little domed, bobbing and turning slowly; a pink water lily open on one; placed clear of the dock, the
  stream mouths and where a duck house floats. The biggest is the froglet's.
- **The froglet** (`FrogPond.her`, the first of the five frogs, a little smaller): from the water she often swims to her
  pad and climbs onto it (`toPad`); there she sits a good while, looks about, croaks, and later hops off with a splash
  (`offPad`, startled off it too). The frogs' test allows her on her pad.
- **Their moment** (`FrogPond.love`, `tickLove`, `lovePlan`, `salmonStep`, `loveRun`; the salmon in fish.js `SECRET`, in
  no water's catch, never in the Book): now and then (first 2½ to 6 minutes in, then 5 to 12 minutes apart; when its time
  has come it waits until all's right), by day and evening (6:30 to 21:30), when she sits on her pad or on the bank,
  nobody near her, nobody fishing the pond, and the pond on the screen (not zoomed far out): from the bank she hops to
  the water's very edge; she turns to face him (side on to you if she can); his shadow glides in under the water; up
  comes his head in front of her, rings spreading; they gaze at each other, little hearts rising between them, her eyes
  gone dreamy, her throat fluttering, his cheeks blushing (the fish material's `blush`); they lean in and kiss, his nose
  at her mouth, her eyes shut, a burst of hearts; he sinks back with a ring and glides away, and she watches him go, one
  more heart. Their hearts are their own (no one else's counted). Never mentioned, nothing won, no news. A tap on her
  doesn't spoil it; someone coming near does (he's gone at once, she jumps in), and it comes again sooner.
- **Tests**: `lovetest.mjs` (the pads, from the bank and from her pad, a tap, someone near, by itself when its time comes,
  not at night, not off the screen, not in the catch; close pictures); `lovefilm.mjs` films it (and a close version).

## Release 7, step 1: every screen, full screen, sideways (28 Oct 2026; Audrey's list before the stores: "how does the game show on iPhones, Samsungs, and all sort of other phones, as well as tablet, very important. The game should just go full screen no more green bar or anything. Also we might want to consider the game by default sideway"; then "Every screen, full screen (Recommended)", "Sideway for phones and tablets")

- **Every phone and tablet** (`screens.mjs`): fourteen of them, each upright and sideways (iPhone SE, mini, 16, 16 Pro,
  Pro Max; Galaxy S24, a Pixel or Galaxy A, a small old Android, a Galaxy Fold shut and open; iPad mini, iPad, iPad Pro
  13, Galaxy Tab): the welcome, the farm, a hen's card, the shop, the Breed Book, a picture of each and checks (the bar's
  buttons all on the screen and apart, a card's head, close button and buttons on the screen, no sideways scrolling).
  The phones were right. Tablets (any screen at least 700 by 700): the bar, the cards and the buttons a third bigger
  (`zoom: 1.3`: they were phone-sized, the writing small), a card held upright no wider than reads well (540) in the
  middle instead of edge to edge, the welcome's title clear of its card sideways. The narrowest phones (under 356 wide,
  a Fold shut): the bar a little tighter, so the settings button isn't cut off.
- **Full screen** (Audrey: the green bar, in Safari and in the Home Screen app): the farm's picture sized by the page
  (`#farm` fills the screen; `resize()` reads its real size, again on turning, on the visual viewport changing and by a
  ResizeObserver) instead of the window's reported inner size, which an iPhone's Home Screen app can give short of the
  screen just after turning, leaving a strip of the page's green. The browser's bars (Safari's, Chrome's) take the
  farm's own colours (`tintBars`: every second and a half, a few points along the top and bottom edges of the picture
  just drawn: the theme colour from the top, the page's colour from the bottom), not the welcome's dark green; the
  welcome keeps its own. A website can't hide Safari's bars on an iPhone; the stores' app will have none. Then Audrey's
  screenshot of the Home Screen app: a flat light-green strip under the clock, the game starting below it. That's Apple's
  bug since iOS 26.1 (WebKit bug 301994, still open on 26.5 and the iOS 27 beta): a Home Screen web app can no longer draw
  under the clock, whatever the page asks for. iOS paints the strip in the page's colour as it opens (it was the loading
  screen's light green). So the page's own green is now the farm's top edge, deep grass under trees (`#557230`: the page,
  the loading screen's top, the welcome's top and its shading, the theme colour, both manifests), and `tintBars` gives the
  page the top's colour too: the strip runs on into the picture instead of standing out.
- **Sideways** (Audrey: "Sideway for phones and tablets"): a website can't turn the screen round itself, so a phone or
  tablet held upright gets a gentle tip once a visit, at the top when the farm is open with nothing else up ("Best
  played sideways: turn your phone" / "tablet", "Plus agréable à l'horizontale : tournez votre téléphone" / "tablette",
  a little phone turning): gone at a tap, once it's turned, when a card opens, or after seven seconds. The Home Screen
  app on Android asked to stay sideways (`play.webmanifest` and the usual address's manifest: `orientation: landscape`;
  an iPhone's ignores it). The stores' app will lock phones and tablets sideways. (The tests' own browser never sees
  the tip, so it can't get in their way; `?turntip` shows it there.)
- **Tests**: `screens.mjs`, `turntest.mjs` (the tip on a phone and a tablet, turned, not again, a card, the bars'
  colour, the manifest; both languages).


## Release 7, step 2: the music (28 Oct 2026; Audrey: the sound "very ai generated" last time; "Free recordings only"; the music "Now and then"; her tracks "Musics 2 and 4")

- **Real music only, free and clear**: Audrey's two picks from a preview of fifteen public-domain tracks: Komiku's
  "Champ de tournesol" (Free Music Archive and the Internet Archive both list it as CC0 1.0) and Rafael Krux's "Happy
  Whistling Ukulele" (FreePD, CC0 1.0). `audio/` holds them, evened out to the same gentle loudness (-18 LUFS, 128 kbps
  MP3s, about 2 MB each), with `audio/CREDITS.txt`. The candidates and the licence checks are in the source's
  `audio/CANDIDATES.md`.
- **Now and then** (`src/sound.js`): a phone only lets a page make sound after a tap, so it waits for the first one
  (the welcome's Play, or any tap on the farm). A few seconds later one of the two tracks fades in. When it ends there
  are 2½ to 5 minutes of just the farm, then the other track. It's softer at dawn and of an evening; at night it fades
  away and no new track starts until morning. When the game is put away (another app, the phone locked) it stops and
  picks up where it was on coming back. The page's audio session is "ambient": a phone on silent keeps the game silent,
  as other games do, and the game plays alongside the phone's own music or a podcast instead of stopping it. The
  music streams from its file through one `<audio>` (a whole track decoded would take about 45 MB of the phone's
  memory), fed into Web Audio for its volume, which a phone ignores on an `<audio>`.
- **Settings**: Music, On / Off (Musique, Oui / Non), with a note: "Now and then, by day and of an evening. With your
  phone on silent, the game is silent too." Off fades it away at once. It's kept in the farm (`data.music: false`, only
  when off; anything else in a save is dropped by `checkFarm`), so it travels with the farm code.
- **Tests**: `soundtest.mjs`, in a browser that, like a phone, only plays after a tap. Silent before the first tap; a
  track a few seconds after it, really sounding (an analyser on the game's own output); then a quiet spell and the other
  track; softer of an evening; gone at night, none new; back in the morning; paused when put away; Settings On / Off,
  kept after a reload; a save with the music typed in wrong is checked. Run in English upright and French sideways. The
  tests' own browser hears nothing unless it asks (`?sound`).
- **Next** (Audrey's recordings): her own hens for the everyday chatting. The voices are taken out of her videos, and
  37 short clucks are kept and cleaned. Then the rest of the farm's sounds from the free recordings she picks.

## Release 7, step 3: Audrey's own hens chatting (29 Oct 2026; Audrey, on her three videos: "Try these but you will need to remove the human voice"; on the first try, "Her clucks sound a bit cut/edited"; on take 2: "The version 2 is good. The background noises are natural")

- **Her own hens** (her three videos of her Silkies and a barred hen): only the sound, every voice taken out. The
  voice was found with a voice detector (Silero VAD, run with onnxruntime) and by leaving out every long sound (words
  are longer than a cluck), each with a margin round it. A bump of the phone was left out too. The first try was 37
  single clucks shuffled into a new scene, each cut tight, cleaned to dead silence and set to the same volume, and it
  sounded edited. Take 2, the one she liked, keeps her real moments whole and in the order they happened: seven
  voice-free stretches of 1 to 14 seconds, gently cleaned (some of the garden's air, birds and insects left in, the
  rumble cut), soft fades. `audio/hens/hen1-7.mp3`, mono, 376 KB in all. The work files (her videos, the scripts
  `passages.py` and `make_clucks.py`) stay out of the public repository, because her voice is in the videos.
- **In the game** (`sound.js` `tickHens`, `main.js` `henHeard`): one of her moments after another, with little pauses
  (1½ to 6 s), never the same one twice running. They come from the coop nearest the middle of the view whose birds
  are up: louder as the view comes close, softer zoomed out (and almost nothing far away), from its side of the screen.
  None at night, with the birds in bed.
- **Settings**: Sounds, On / Off (Sons, Oui / Non), beside Music; off, the hens stop and the music carries on. It's
  kept in the farm (`data.sounds: false`, checked like the music). The note: "The music comes now and then, by day and
  of an evening. With your phone on silent, the game is silent too."
- **Tests**: `soundtest.mjs` now also checks her hens: close to the coop, clear; zoomed out and away, much softer; one
  moment after another; none with the birds in bed; Sounds Off and On.
- "Hens worried" (BigSoundBank) is for mummy hens, when a hen is broody or has chicks (Audrey: "that's the sound they
  make to talk to their baby. Keep it for mummy hens"), once she sends it.

## Release 7, step 4: the farm's sounds (29 Oct 2026; Audrey: "Can you download these sounds yourself?", then she allowed bigsoundbank.com for the session; on the twelve: "All good, put them in")

- **Twelve real recordings** from BigSoundBank (Joseph Sardin, CC0; `audio/CREDITS.txt`), checked for voices (none) and
  cut by the source's `audio/farm_clips.py` into `audio/farm/` (2.7 MB, with `farm.json`):
  - one-shots: five egg songs, two crows, two flurries, four mummy hens, four chicks, five quacks, five woofs. Mono,
    evened out to -17 to -24 LUFS, with soft ends.
  - beds: dawn, day, evening, night and the pond. 45-second loops whose ends are faded into their starts, at -22 LUFS,
    with the rumble cut; the day's steady cricket whistle is made gentler. They're decoded at 22 kHz to use half the
    memory.
- **Where each is heard** (`sound.js` `play`, `tickBeds`; `main.js` `heardAt`, `farmSound`): from where it happens, as
  loud as the view is near it and from its side of the screen, some carrying further than others:
  - a hen's egg song as she sings it. Each personality has her own part of "Hen lays #1", and her head bobs, beak wide
    on each ba-KAWK, and the notes over her head follow the recording's own clucks (`SONG_CLIP`, sound or not);
  - the rooster's cock-a-doodle-doo whenever he crows (one every 15 seconds at most);
  - the henhouse in a flurry when the fox looks in or takes an egg (`nightvisit.js`);
  - Biscuit's woof when he barks at the fox, bounces off Gertrude's hiss, or pounces on his ball (`dog.js` `woof`);
  - the ducks' quacks with their quacking (`ducks.js`);
  - at a coop with a brood, among her own hens' chatting: a mummy hen talking to her chicks (the "Hens worried"
    recording: Audrey, "Keep it for mummy hens"), and the chicks peeping once they're out.
- **Under it all**, crossfading by the hour: dawn's birds (from 5, full 6 to 8:30), the day's crickets and birds (full
  9:30 to 18), the evening's last birds (full 19 to 21) and the night's insects (from 22). The pond's frogs and water
  near the pond. Sounds Off silences all of it, and the music carries on.
- **Tests**: `soundtest.mjs` also checks that all eleven kinds and five beds are loaded; each hour's bed, the others
  silent; the pond near and far; the rooster's crow and a hen's egg song heard when they happen; a woof, a quack and a
  flurry; Sounds Off.
- **The geese and a bee** (29 Oct, once Audrey allowed www.nps.gov): the US National Park Service's "Canada Geese" and
  "Bee" (public domain, credited), cut into three honks and two buzzes (`audio/farm/honk1-3`, `buzz1-2`). A goose honks
  as her bill opens on a honk (not more than one every 2½ seconds; `geese.js`), so on a tap, a proud honk, the ta-da, an
  alarm. A bee buzzes past the hives now and then while the bees are out (`main.js` `spotsHeard`, `sound.js` `tickSpots`).
  Their hiss has no recording yet, so it stays silent.

## Release 7, step 5: German, Spanish, Portuguese and Italian (29 Oct 2026; Audrey: "which languages should I add", then "Go for your recommendation but I will not have any native speaker reviewing it")

- **The machinery** (`src/lang.js`): six languages (`LANGS`), their names and number/date formats (`LOCALE`), and the
  packs (`src/lang/<code>.js`), each with:
  - `text` and `textF`: game.js's words by key;
  - `words`: every [English, French] pair by its id;
  - `pers`: the personalities as [hen, rooster].

  How the code reaches the words:
  - English and French stay written in the code, side by side. Each table of pairs is registered with an id prefix
    (`register('say', FARMER_TEXT)`), so `tr(lang, 'say.hi')` finds a pair's word in any language.
  - game.js keeps `t(key, vars, sexF)`. `TEXT[lang]` comes from the pack, and a missing word falls back to English.
  - `ordinal()` gives each language's 1st / 1er / 1. / 1.º / 1ª.
  - `andList()` joins names ("Clover e Ivy" in Spanish).

  Choosing the language:
  - A new phone starts in its own language if the game speaks it (`phoneLang`). The test pages take `?lang=de`.
  - A save's language is checked: one the game doesn't speak becomes English.
  - The welcome and Settings list the languages as chips while there are three or fewer, and as a list (the phone's own
    picker) once there are more.
  - The third onboarding picture's sale sign is rendered in each language (`intropics.mjs` with `LANGS=de,es,pt,it`).
- **The words** (`lang/`):
  - `catalogue.mjs` lists every word from the game itself into `catalogue.json`: 815 entries, about 5,000 English
    words, with the French beside each, the 14 that change for a hen or a woman marked, and the personalities as
    [hen, rooster] pairs.
  - `BRIEF.md` is the translators' brief: tone, the forms of address (du, tú, você, tu), typography, names kept,
    breeds and fish by their usual local names, short buttons.
  - Each language was translated by Claude (`lang/<code>.json`). With no native speaker to check it, each then had an
    independent second reading (`REVIEW.md`, `review/<code>.json`), which back-translated every entry and flagged
    anything wrong, unnatural, inconsistent or too long. German had 21 fixes, Spanish 15, Italian 15 and Portuguese 6,
    applied by `apply_review.py`.
  - `node lang/catalogue.mjs pack <code>` turns a translation into its pack, checking every entry is there and every
    placeholder is kept.
  - Key words in each:
    - German: Stall, Gehege, Kuscheln, Vertrauen, Rassenbuch, Geflügelschauen; Rhodeländer, Seidenhuhn.
    - Spanish: gallinero, corral, mimo, Libro de razas; Sedosa.
    - Portuguese: galinheiro, cercado, carinho, Livro das raças; Sedosa.
    - Italian: pollaio, recinto, coccola, Libro delle razze; Moroseta.
- **Adding a language later** (Japanese next):
  1. Add its code to `LANGS`, `LANG_NAME` and `LOCALE`.
  2. Translate `catalogue.json` with `BRIEF.md`, give it a second reading, then pack it.
  3. Render its onboarding picture.
  4. Run `langtest.mjs` and `screens.mjs` in it.
- **Tests**:
  - `langtest.mjs` (`LANGS=de,es,pt,it`) checks each language from a new phone: the welcome in it, every card (a hen,
    the coop, the shop, the Breed Book, the level, the coops, the shows, Settings) with no English sentence left and
    nothing off the card, the list in Settings, and a save with an unknown language.
  - `screens.mjs` with `LANG=de` (or es, pt, it) checks the small phones and a tablet.
  - `gametest.mjs` now switches language with the list.

## Release 7, step 6: My account (29 Oct 2026; Audrey: "Next step should be my account"; "Firebase, by Google (Recommended)", "Google now, Apple later (Recommended)", "Optional, in Settings (Recommended)")

- **What it is.** Optional: in Settings, "Sign in with Google" and the farm is kept online as well as on the phone, so
  it isn't lost with a phone or a cleared Safari, and plays on another phone. Suggested once, three days into a farm (a
  card with "Sign in with Google" and "Not now"; the saved field `acctAsk`, checked). A new phone's welcome has "Have a
  farm saved online? Sign in". Sign in with Apple comes with the stores' app (Apple asks for it when Google is offered).
- **How** (`src/account.js`): the farm goes online exactly as the phone keeps it (the farm and its seal, as a farm code),
  one document a player (`farms/<account>`), numbered one more each save, with the level, coins and when the farm was
  started to tell two farms apart. When the farm opens, comes back on screen, or the player signs in:
  - nothing online yet: this phone's farm goes up;
  - online as this phone left it: this phone's goes up if it changed;
  - online newer and nothing new here since: the online farm comes (the page opens it, "Farm loaded");
  - no farm here (a new phone): the online farm comes;
  - a different farm on each, both changed: "Which farm to keep?", each with the farmer's name, level, coins and when
    last played; no ✕ (left open, it's asked again later).
  While playing a change goes up 45 seconds later, at once when the game's put away. No connection: the card says so
  and it goes up later. "Start a new farm" while signed in replaces the online one too (the button says "here and
  online"). Sign out keeps the farm on the phone. Delete my account: two taps, Google asks who it is again, then the
  farm online and the account are deleted; the farm stays on the phone.
- **Firebase** (`src/cloud.js`, built on its own into `dist/cloud.js` and loaded only when needed): Google's sign-in in
  its own window (a popup: the redirect way breaks on Safari for a site on github.io), Firestore "lite" (plain requests).
  `src/firebase-config.js` holds the project's web settings (public by design); `null` until Audrey's project exists,
  so nothing of the account shows yet in the published game. Needs the Firebase package (`npm install firebase`;
  blocked here on 29 Oct: Audrey asked to allow registry.npmjs.org).
- **Security** (her standing rule): `firestore.rules`: only the owner reads, writes or deletes their farm; nobody lists
  farms; every field's type and size checked (the farm under 900 KB, no extra fields); the number exactly one more each
  save (two phones can't overwrite each other unseen); the server's own time; a save at most every 2 seconds; nothing
  else in the database open to anyone. A farm coming back goes through the same checks as any save or farm code
  (`checkFarm`); one that doesn't pass is never taken (this phone's goes up in its place). No password ever reaches the
  game. Tested by `rulestest.mjs` on the Firestore emulator (to run once the emulator can be fetched).
- **Words**: 30 new texts in English and French; German, Spanish, Portuguese and Italian translated, then given an
  independent second reading (3, 0, 1 and 0 fixes; German uses Google's own "Über Google anmelden").
- **Tests**: `accounttest.mjs` with the pretend account (`?account=fake`, its "online" farms kept by the test and shared
  by four pretend phones): signing in puts the farm online; a new phone's welcome brings it; a phone coming back takes
  the newer farm; both changed (one offline meanwhile) asks, and each answer does what it says; a phone with its own farm
  signing in is asked; a spoilt online farm is never taken; the closed Google window; sign out; delete; a new farm while
  signed in; the suggestion once, not after a reload; `acctAsk` checked.

## Release 7, the new breeds' coops: the Little Windmill (29 Oct 2026; Audrey: "A little windmill (Recommended)" for the Polish; on its everyday look: "Yes, do the other looks (Recommended)")

- **The Little Windmill** (stylized/coops.py `windmill`, `mill_sails`; the Polish came from the Netherlands): a brick ground
  floor with the hens' pop door and ramp, a little arched green door and the nest window in front (the shared footprint
  and nest: `NESTS['house_pol']`, floor 0.2, window at 0.36, its door let down), a skirt of slates round its top, a white
  weatherboarded smock tower on eight corner posts, a dark boat-shaped cap, a millstone and sacks of flour by its right side,
  a lantern on a post. Its sails are their own model (`sails_pol`: four lattice sails with canvas on red-brown stocks) the
  browser turns slowly counter-clockwise at the hub (coops.json `mills`; main.js `addSails`, `tickSails`; slower by night;
  no shadow, as the shadows are drawn only when the view moves on). Exported after the other coops (`coops.LATER`) so
  their random bits stay as they were. Test page: `?coopbreeds=pol` (just those breeds' coops), `&coops=1`, `&looks=N`;
  barnlooks.mjs `EXTRA`.
- **Its five looks** (`box_pol`, `shed_pol`, `house_pol`, `cosy_pol` with `_mill_bits`, `deluxe_pol`): Rustic, the stump of
  an old mill broken off unevenly (`mill_bricks` `top`, `missing`), moss, old boards across its top under a broken old sail
  and a sack, bricks on them, fallen bricks, an old millstone half sunk; Mended, the brick rebuilt (new among the old), a
  felt skirt, a stubby tower of new pine boards, the lowest painted white so far, a cap of wooden shingles, a first pair of
  bare sails turning (`sails_pol_t1`), a ladder, a pot of white paint, a pallet of new bricks; Snug, the windmill; Cosy,
  tulip beds along its sides, blue-and-white Delft pots of tulips by the ramp, a pair of yellow clogs on a doorstep, a window
  box of geraniums on the tower, the automatic door's box and its solar panel, a path of red bricks to the gate; Deluxe
  (`DX_MILL`), a taller tower with a gallery round it on brackets (white rail), green-and-white striped shutters, a fantail
  at the back of its cap, bigger sails with red stocks (`sails_pol_dx`); the cosy touches. main.js `TIER_LOOK.pol`.
- **Its gardens** (`PENS_BY['pol']`, `PLAY_BY['pol']`): a terracotta bowl in the small pens, a Delft one in the Cosy;
  Cosy: a swing on Dutch-green A frames with tulip tops (`dutch_swing`), a giant wooden clog full of sand (`sand_clog`), the
  cabbage from the arm of a white post with a toy windmill on top (`cabbage_mill`); Deluxe: a sandbox faced with Delft
  tiles with a toy boat (`sand_delft`), a little canal with a white drawbridge for water (coop.py `canal`), a feeder like a
  tiny windmill (`feeder_style='mill'`), a xylophone of tulip-coloured bars (`tulip_xylophone`), the swing and the post.
- Five looks sent (a sheet with the phone on its side, a closer Cosy and Deluxe). Audrey: "Small changes", then (21:59)
  "windmeal 3, 4 and 5 are too similar". Redone (live 22:30), the Snug as it was: the Cosy painted Dutch green with white
  posts and frames, its skirt and cap of red pantiles, red-and-white striped sails (`COSY_PAL`, `sails_pol_cosy`:
  `mill_sails` `stripe`); the Deluxe cream with Delft-blue posts, frames, door and shutters, its skirt and cap of green
  copper with a gold knob (`DX_PAL`), the gallery, and a little miller's house against its left side (`miller_house`: brick,
  a stepped Dutch gable with white copings and a gold finial, a window with blue shutters and tulips, a round window, a
  roof of red pantiles, a chimney; the birds walk round it). The solar panel now on top of the lantern post (on the steep
  skirt it stood up like a card). Sent again.
- Audrey (22:12): "Remove the little house on the left of the deluxe coop please": the miller's house taken off (the tulip
  bed on that side back); the Deluxe is the cream and Delft-blue mill with its copper cap, gold knob and gallery.
- Audrey (22:17): the windmill done, "Yes crack on".

## Release 7, the Javanese House (29 Oct 2026; Audrey: "A Javanese house (Recommended)" for the Ayam Cemani)

- **The Javanese House** (stylized/coops.py `joglo`, `JOGLO`, `JG`, `hip_tier`; the Ayam Cemani comes from Java): a joglo on
  a plinth of dark volcanic stone (a step up to its doors), walls of teak boards up from the floor (0.24: `NESTS['house_aya']`,
  the nest window at 0.42, its carved shutter let down), a band of carving in gold along the top of the front, carved
  double doors with gold diamonds, a roof of terracotta tiles in two tiers (a wide low skirt from the eaves, a beam at the
  break, then the steep crown up to a short ridge; the tiles' ribs down each face, courses across, a rounded cap down each
  hip), curled ridge ends with gold tips and a gold point in the middle, teak posts on stone pads at its front corners, side
  windows with grilles, a brass lantern hanging from the eave, a big terracotta water jar with a lid and a coconut dipper.
  First with deep eaves all round; from the game's camera they hid the doors and the carving, so the eaves went up (0.96)
  and the front overhang down to 0.1. Exported after the others (`coops.LATER`). Test page `?coopbreeds=aya&coops=1&looks=2`.
  Its everyday look sent.
- Audrey (22:25), on its everyday look: "Yes". **Its five looks** (`box_aya`, `shed_aya`, `house_aya`, `cosy_aya` with
  `_joglo_bits`, `deluxe_aya`; each clearly its own, after the windmill's "3, 4 and 5 are too similar"): Rustic, a hut of
  salvaged planks of every colour on piles of stones, a roof of rusty corrugated tin sheets under a palm frond, stones on it,
  an old carved panel with gold left in its carving leaning on its side (the hint), a cracked old jar; Mended, walls of new
  woven bamboo (a checker of two shades) on a low stone base, bamboo poles at its corners, a hipped roof of battens half laid
  with new clay tiles, stacks of tiles waiting; Snug, the joglo; Cosy (`COSY_JG`), green-glazed tiles, a frangipani in flower
  by its left side (`frangipani`), a banana plant at its back right, orchids in clay pots by the ramp, the automatic door's
  box and its solar panel on the roof's skirt, flat river stones to the gate; Deluxe (`DX_JG`, `DX_JOGLO`), taller, cream
  walls, red posts with gold rings, a third tier of roof, black-glazed tiles with gold hips and beams (`joglo` `pal`, `brk2`),
  two red-and-gold ceremonial umbrellas (payung) at its front; the cosy touches. main.js `TIER_LOOK.aya`.
- **Its gardens** (`PENS_BY['aya']`, `PLAY_BY['aya']`): a coconut-shell bowl in the small pens, a brass one in the Cosy;
  Cosy: a swing between two teak posts under a little roof of clay tiles (`joglo_swing`), a big round woven bamboo tray of
  sand (`sand_tampah`, a round sand bath), the cabbage from the arm of a post with a slit drum hanging on it
  (`cabbage_kentongan`); Deluxe: a sand pit edged with carved stone in two steps with little stupas at its corners
  (`sand_candi`), a padasan for water (coop.py `padasan`: a clay jar on a stand, a bamboo spout into a stone basin), a feeder
  like a tiny teak house with a black-and-gold roof (`feeder_style='joglo'`), a little gamelan of bronze bars on a red case
  (`gamelan`), the swing and the post. The new breeds' yards seeded before they're made (`pen_tier`: `LATER`), so nothing
  made before them changes them.
- Five looks sent.

## Release 7, the new breeds in the game (29 Oct 2026; Audrey: "Let's go")

- **The Polish at level 26, the Ayam Cemani at level 29** (`game.js` `BREED_LEVEL`): the level's card says "New breed:
  Polish!" (or Ayam Cemani), "Place their coop now" / "Later"; their coop comes Rustic like every new breed's and goes up
  Mended, Snug, Cosy, Deluxe for 300 / 1,000 / 3,000 / 8,000 coins (`up_pol_*`, `up_aya_*`: what each brings, in six
  languages). Eggs: the Polish white, 9 coins; the Ayam Cemani cream, 10 (`EGG_PRICE`, `egg_pol`, `egg_aya`); chicks 30 and 34
  (`CHICK_PRICE`). `LOOKS_CV` 1 for both (their farms are after the looks: always five).
- **Names**: Polish / Padoue / Paduaner / Polaca / Polonesa / Padovana; Ayam Cemani everywhere. The coops: Little Windmill /
  Petit moulin / Kleine Windmühle / Molinito / Moinhozinho / Piccolo mulino; Javanese House / Maison javanaise / Javanisches
  Haus / Casa javanesa / Casa Javanesa / Casa giavanese (`BREED_INFO`; `lang/*.json`, catalogue 860 entries).
- **The Breed Book**: 17 pages (`book/pol.webp`, `book/aya.webp` from `bookpics.mjs`), in level order between the Grey
  Silkie and the rare Silkies.
- **Shows**: Polish and Ayam Cemani rivals (`showday.js` `RIVALS`); a show's breed of the day can be one of them from
  30 Oct (`SHOW_BREED_LEVEL_7`, `SHOW_7_FROM`: shows already drawn keep their breed).
- **Saves**: nothing new saved (a coop's breed is checked against `BREED_LEVEL` as before: a Polish coop before level 26 is
  flagged).
- **The Javanese House's Cosy swing** moved to (-1.4, -1.95): a hen getting off it landed just outside the yard.
- **Balance** (`balsim.mjs 365 all 3`): level 30 comes 1 to 3 days earlier; the windmill's Deluxe around day 241-261, the
  Javanese House's around day 247-300.
- **Tests**: booktest and silktest (17 breeds, levels 26 and 29), upgradetest `BREED=pol` (English upright) and `BREED=aya`
  (French sideways), playtest with `EXTRA`, breedtest, gametest both ways, langtest (de, es, pt, it), eggtest, chicktest,
  movetest, visittest, doors, codetest: all pass. Pictures (the level's card, the coop placed, the Book page; the five looks
  upgrading) sent.

## The Light Brahma redone from Audrey's photos (29-30 Oct 2026; Audrey: "I will give you some brama chicken photos and when you'll be done I want you to review the design of the existing brama. Use all that you learned from the previous chickens")

- Her four photos (a rooster three-quarters, a rooster side on, two hens from behind, a hen three-quarters) against ours at the
  same angles: ours had a striped collar ring round a long thin neck, a slim egg of a body with feathers drawn like scales, a
  hen's tail sticking out like a black fan, a rooster's tail too long, bare legs with a puff at the feet, a grey stub for wing
  tips. Told her the list first, then:
- **Shape** (`stylized/breeds.py` `bra`, `brahma=True`): a smaller head (`head_s` 0.9, the head empty scaled) held lower on a
  short thick neck; a hackle cape flaring over the shoulders; a broader body (`body` 1.36, 0.95, 0.98); fluffy trousers down to
  the hocks; a big soft cushion rising to the tail; a hen's tail short, narrow and turned to face back (`tail_len` 0.95,
  `tail_up_h` 6, `tail_spread` 0.5, `tail_twist` 62), a rooster's short and upright (`sickle_len` 0.62, `tail_up` 22), longer
  saddle hackles; a tiny low pea comb, red lobes, an orange-red eye, a horn beak, a beetle brow over each eye (`brow`);
  thicker shanks; a thick feathered boot and broad feathers lying down the outside of each shank in two rows like shingles,
  flaring out lower down, and a fringe along the outer and middle toes (`brahma_legs`; budgets +500, light +150:
  `export_birds.py BRA_EXTRA`).
- **Painting** (`src/birds.js`): the cape (`stripes`, feather mode 3 + the black's width): from the nape down over the
  shoulders, the throat and breast white; long narrow hackle feathers hanging down, each black down its middle with a white
  edge all round, a hen's heavy (`capeW` 0.44), a rooster's finer (0.22); each feather wholly in the cape or not, so its edge is
  ragged feather by feather; its lattice laid round a line leaning up the neck (no point where it gathers at the nape) and parted
  at the white throat. Soft white plumage (mode 8: the feathers' shading softened 70%, the overlap shade 0.05), a fluffier
  fur layer (`FUR.bra`: 2.4 cm, more underneath); black flight feathers and tail; and the black of the folded wing's flight
  feathers drawn as a line along the side under the wing (the wing itself sinks into a Brahma's fluff: pushing it out made it
  poke through the coop walls when a hen leapt out of the nest window). No new vertex attribute: the birds' shader is at the
  graphics chip's limit (one more, tried first, broke the inside-the-coop shader: "Too many attributes").
- **Only the Brahma's models changed**: `export_birds.py` doesn't make byte-identical models twice, so the new `bra_*` models
  were spliced into the flock in use (`stylized/extras/splice_birds.py`), every other bird byte for byte as before (the
  Silkies untouched). Breed Book picture redone (`book/bra.webp`). The welcome picture and onboarding picture 4 still show the
  old Brahma, small (redone, the new hen faced straight at the camera in picture 4 and her cape hardly showed): to redo if
  Audrey wants.
- Checks: laycheck (Brahma: diva 4 samples, 1.5 cm; rebel 2.9-3.8 cm, as before: 1.3 and 3.6; a longer tail first poked
  through the wall above the pop door), insideshot, gametest both ways, booktest, visittest, nesttap: pass. A before/after
  sheet with her photos sent.

## The arrivals' new order (30 Oct 2026; Audrey: "we might have too many silkies, I love them but not sure all the players will. Let's remove the blue, the grey, the red and see where we are after that in term of chickens arrivals"; then "come with a proposal where the ayam is relatively early in the game and the peacock is last", "Keep the Cream Legbar", the peacock "Yes, at level 30", the Splash "From the Buff", "Ayam at level 10")

- Before (08:36), "For a good entertaining game, how many breeds should I have": about 12 forever trios for the first year
  (one new arrival every few weeks; 36 named birds already; the phone's limits), then 2 to 4 new ones a year after level 30,
  15 to 20 in all, each clearly different. She then thought of replacing the Legbar (a call duck with its new eggs, a
  peacock whose dropped feathers sell, a third idea cut off) and of a new order; she kept the Legbar in the end.
- **The order** (`game.js BREED_LEVEL`): Rhode Island Red 1, Buff Orpington 5, White Silkie 7, Ayam Cemani 10, Buff Silkie 12,
  Cream Legbar 15, Black Silkie 18, Light Brahma 21, Partridge Silkie 24, Polish 27; the peacock at 30 (to build). From the
  White Silkie on a Silkie colour and another breed in turn, light and dark birds alternating, the most special last. For a
  once-a-day player a new arrival every 3 to 7 weeks.
- **No more Blue or Grey Silkies, nor the rare Red**: a farm that has them keeps them (forever birds never leave): a coop is
  good once its level has come by either order (`BREED_LEVEL_29OCT`, `breedCame`); their Book pages show on a farm that has
  them; a Blue coop still hatches Splash, a Grey one Cuckoo, a Red pair Red. They never wait in Your coops. The Splash now from
  the Buff (`RARE_FROM`; `rareFrom` takes the old too, so a Red on its way from a Buff coop is kept). The Breed Book: 14 pages
  (the 10 by level, Paint, Lavender, Splash, Cuckoo); the pictures of the others kept for farms that have them.
- Shows: the County show's breed of the day from the new levels from 31 Oct (`SHOW_BREED_LEVEL_8`; today's as drawn); no Blue
  or Grey among the rivals on show day (`showday.js`).
- Prices: the Ayam Cemani, now early, eggs 8 and chicks 28 (were 10, 34); the Polish, now the last, 10 and 34 (were 9, 30).
- Balance (`balsim.mjs 365 all 3`): level 30 on day 340 once a day (was 311; 41 birds at the end, was 50), 285 twice a day
  (266), 235 every few hours (217): nearer her "about a year" than before.
- **Then her own order** (30 Oct 10:04, Audrey, happy with the Brahma: "Is the duck gone? I still want it"; the call ducks had
  never been in: they were the Legbar's replacement she didn't take. Asked where they go, she wrote the order herself): Rhode
  Island Red 1, Buff Orpington 3, White Silkie 5, Ayam Cemani 7, **call ducks 10** (to build, first: "[No preference]" on
  ducks or peacock first, so the ducks, the earlier), Buff Silkie 12, Cream Legbar 15, Polish 18, Partridge Silkie 21, Light
  Brahma 24, Black Silkie 27, **the peacock 30** (to build). `BREED_LEVEL` and `SHOW_BREED_LEVEL_8` so (no show drawn yet with
  the morning's); the morning's order needs nothing kept (each of its levels at or after the lower of the order before it and
  this one). Prices: the Polish back to 9 and 30. Balance: level 30 on day 336 once a day, 281 twice, 226 every few hours.
  Tests: booktest (the Orpingtons waiting at 3, the Silkies at 5), breedtest (the Orpingtons at 3, the Silkies at 5, five
  fields for room), silktest (the Black Silkies at 27).
- Tests: booktest (14 pages, the new levels), breedtest (the Silkies at 7), silktest (the Buff Silkies at 12; a farm from
  before keeps its Blue and Black Silkies, unflagged, their pages, the Splash from the Buff or the Blue), raretest,
  rarecooptest (14 pages, the Cuckoo from the Partridge); gametest, firstdaytest, showtest, showdaytest, showgroundtest,
  jobtest, landtest, chicktest, eggtest, awaytest, codetest, accounttest, langtest, dectest, playtest, upgradetest (Ayam,
  Polish), looktest: pass.

## The call ducks' look (30 Oct 2026; Audrey: "call duck (new type of eggs!)", "Is the duck gone? I still want it", then "ok carry on"; her four photos of white call ducks)

- Two new models in the geese file (`stylized/geese.py` `GEESE['call_m']` Pip the drake, `GEESE['call_f']` Puddle the
  duck; `export_geese.py` exports them white like the Embden, 12000 and 11800 triangles): little plump white ducks, a full
  round breast, a body a little longer than a mallard's for its size (`BL` 0.88), a rounded head held up on a short thick
  neck that slims under it (`neck` 0.44, `neck_rs`), the head a third bigger for the bird (`head_k` 1.32, a fourth ball so
  the face runs into the bill), a broad orange wedge of a bill, deep where it meets the face (`bill_k` 1.4, its own
  profile and lower bill), a small dark eye; the drake's curl over his tail. The goose neck's furrows kept off their heads
  (`gn.z` + 0.35).
- Smooth white, as in her photos (`geese.js`): their body feathers in a soft mode of their own (7: the feathers' rows only
  a faint texture, 85% softened, the overlap shadow at 40%; `birds.js`, the Brahma's mode 8 unchanged, no chicken uses 7),
  broader drawn feathers (0.8 of a goose's) and a shorter fluff (`CALL_FUR`).
- Spliced into the geese model in use with `stylized/extras/splice_glb.py` (named models replaced or appended; the export
  isn't byte-for-byte the same twice, so the geese and mallards stay exactly as they were).
- `?lineup=ducks&call`: the two in the eight poses (all work: looking about, the waddle, a quack, preening, wings, swimming,
  up-ending, asleep).
- First tries: a round ball of a head on a short neck and a little stubby bill (cute, but a duckling; next to her photos
  the neck too short, the bill too small); then a longer neck and a bigger wedge bill, smooth feathers instead of the
  goose's knitted look. Picture sent next to her photos. ducktest, gametest: pass.
- Audrey (30 Oct 11:23): "can you make is a touch smaller it needs to be cute. the rest is good": both an eighth smaller
  (`S` 0.42 for Pip, 0.4 for Puddle; were 0.48, 0.46), live 30 Oct; the poses all still work.
- Audrey (30 Oct 11:31): "what can you do to make the ducks cuter?"; she chose all four: "Rounder head, chubby cheeks
  (Recommended)", "Shorter, stubbier bill", "Bigger, sparkly eyes", "Cute moves". **Cuter** (live 30 Oct): the head half
  as big again for the bird (`head_k` 1.5) with a high round forehead and chubby cheeks (two more balls), on a shorter,
  thicker neck (`neck` 0.36, `neck_rs`); a short stubby bill, still broad (`bill_k` 1.02); the eyes 30% bigger (were 10%),
  a little lower and more forward, with a bigger catch-light and a second little sparkle low on the other side. The moves
  (`geese.js`): a happy head bob (`bob` in the rig's pose, quick nods pumping the head up and down), a bigger, quicker tail
  wiggle with a wiggle of the rump (`wag`, call ducks only), a tap on one: a quack, then the bob and the wiggle; walking
  round in a little line is the mallards' following, for their pen. `?lineup=ducks&call` has two more rows: the bob then
  the wiggle (`DUCK_LINE.bob`), and the two waddling round a little oval one behind the other (`parade`). A short film sent
  (`cutefilm.mjs` in the session's scratch: the bob, the wiggle from behind, the parade).
- Behind them, a dark fold showed: the drake's curl (white, but curled so it caught no light) left out for the call drake,
  the tail held up perkily (call ducks), and nothing of theirs ever darker than 42% of its colour (mode 7 in `birds.js`'s
  light: white all over, never dark in a fold or under the tail); the head bob a little bigger.
- **The Floating House, a first look** (`stylized/coops.py` `floating`, `FLOAT`, `FLOAT_PAL`, `pond`, `pond_pts`, `flat_poly`,
  `life_ring`; Blender pictures, not yet in the game): a pond where a house stands in the other pens (an oval a little
  wobbly, 1.96 by 1.4 m, light blue with a darker band at its edge, stones round it, reeds and bulrushes at its back corners
  and right side, water lilies, two in flower), and on it a raft (three logs, a deck of boards, a sagging rope rail on little
  posts round its back and sides) carrying the house: duck-egg blue weatherboards, white corner boards and bargeboards, a
  roof of coral shingles, a brass-rimmed porthole in each side, a red-and-white life ring on its left, a yellow pennant on
  a mast at the ridge's right end, pots of yellow and white flowers and a lantern at the deck's front corners. The house
  and raft drawn at 0.72 of a hen's house (`k`: a duck's size, the water showing all round); the nest window (no door) and
  the ducks' door as every coop's, the gangplank from their door straight over the deck and the water to the bank in front
  (`ramp` 0.87 before the scaling: its foot on the bank, a gap in the stones there), so `NESTS['house_call']` (scaled the
  same) has them come, go and lay as the hens do; the pond kept to by `BLOCKS` (the gangplank's line left free).
- Audrey (30 Oct): their home: "Floating house (Recommended)" (a little wooden house on a raft in the middle of their pond,
  a ramp up to it).
- Audrey (30 Oct 12:24): "hold on the ducks need to have a 5 steps house like the chickens please I only see one?". **Its five
  looks** (`floating(look=0..4)`, `box_call`, `shed_call`, `house_call`, `cosy_call`, `deluxe_call`; `FLOAT_LOOK` their
  colours, `FLOAT_POND` their ponds; Blender pictures, each clearly its own): Rustic, an old grey shack (a few bare boards,
  two gone on its right, a square hole boarded across in each side) under rusty corrugated tin (`tin_roof`), on a raft of
  grey planks (two gone) over two old blue barrels, an old bucket and a coil of rope, in a smaller murky green pond with a
  stone here and there and more reeds; Mended, new pine boards, the lower rows painted duck-egg blue so far, a pot of paint
  and its brush, a stack of new boards, a ladder against its right side, roofing felt with new coral shingles on the lower
  half of the front and a bundle waiting (`felt_roof`), white-rimmed portholes, a clean pond, its stones laid along the left
  so far and a pile waiting on the bank; Snug, the Floating House; Cosy, buttercup yellow under teal shingles, a red
  pennant, bunting along the rope rail, teal flower boxes under the portholes, three pots, the automatic door's box and
  its solar panel, more lilies in flower, a little red rowing boat with its oars moored beside the raft (`rowing_boat`);
  Deluxe, white walls and navy trim under red shingles, a navy pennant, a white rail round the deck, a ship's wheel on its
  right side, a brass bell on a post, a little lighthouse at the raft's back left (red and white bands, a gallery, its lamp
  lit at night: `lighthouse`, `LIGHTS`), a bigger pond edged with pale cobbles and a fountain (`fountain`). The gangplank,
  the doors and the nest the same in all five (`NESTS['house_call']`). The pond's `BLOCKS` per look (the model's name).
  The five sent together.
- Audrey (30 Oct): "add a balloon toy so the ducks play. make the pond pond of the deluxe wider and create bigger difference
  between 3 and 4 please". A beach ball floating on the pond from the Snug (`beach_ball`: six panels red, yellow and blue,
  white caps; to be its own model the ducks nudge about); the Deluxe's pond much wider (3.16 m across, `FLOAT_POND[4]`, the
  fountain out at its right); the Cosy now a little houseboat: its raft a red hull with a white band, flat at the stern and
  pointed at the bow out to the right, the bow's deck boarded (`houseboat_hull`), a curved roof of teal boards with white
  arched ends (`barrel_roof`, the gables under its curve), a stovepipe, the solar panel on the curve. Sent again.
- Audrey (30 Oct): "No ball level 3, add Lily pad level 5, also for level 5 add a nice bridge like the one in money painting".
  The ball from the Cosy; the Deluxe's pond covered in water lilies (34 pads, a third in flower, pink and white, none under
  the raft or the gangplank) and a footbridge like Monet's at Giverny (`monet_bridge`: a gentle green arch of wood over the
  right of the pond from the front bank to the back, a deck of boards across, a railing each side, capped posts at its
  ends), the fountain moved to the pond's left. Sent again.
- Audrey (30 Oct): "No the bridge replace the existing path": the Deluxe's Monet bridge is now its way in, in place of the
  gangplank: from the ducks' door (its sill) over the deck's edge and the water down to the bank where the gangplank's foot
  is, a little green arch with its railings (`monet_bridge` built at the pond's scale; `FLOAT_PATH['deluxe_call']`: the
  ducks' way over it, points in glTF axes, for their walk); the bridge across the pond's right gone, the fountain back on
  the right. Sent again.
- Audrey (30 Oct): "Yes, put them in (Recommended)". **The Floating House in the game, step 1: on the test page** (live 30 Oct,
  `?coopbreeds=call&looks=N`, N 0..4): its five looks (`box_call`, `shed_call`, `house_call`, `cosy_call`, `deluxe_call`),
  its pop door (`popdoor_call`, the ducks' coral, drawn at the house's size: `NESTS.house_call.scale` 0.72 and `wall`, its
  front wall: main.js `popAt`, the door's badge and tag spots by them), its own yards (`pen_t0_call` .. `pen_t4_call`, the
  Snug's too: `coops.PENS_BY['call']` with a [2], `pen_layout`; main.js `tierPen` for the call ducks' Snug); `TIER_LOOK.call`,
  its looks always (`hasLooks`), no weathervane on its Deluxe (the lighthouse and the pennant), `STYLE_NAMES.call` Floating
  House, its eggs a pale green-blue (`EGG_COLOUR.call`), no hens in it (`makePlot`: the ducks' own life to come). Exported on
  their own (`stylized/extras/export_call.py`: export_coops.py's `one()` for just these) and spliced into coops.glb/json
  (`stylized/extras/splice_coops.py`: every other model byte for byte, each mesh's primitives with their materials matched
  by name; the json's tops, lights, nests, blocks, pens, stats, the Christmas tree's spots and eave lights, and `paths`, the
  Deluxe's way over the bridge); `export_coops.py` makes them too in a full export. Tests: gametest, upgradetest, looktest,
  doortest (its farm now marked as already offered My account: the suggestion's card came first and the morning's door
  card waited behind it; the game's right, the test's setup was out of date): pass.
- **The call ducks' life in their pen** (test page, `?coopbreeds=call&looks=N`; `src/callpen.js` `CallPen`, made for each call
  ducks' coop by main.js `addCallDucks`): Pip the drake, Puddle and Pebble (the Goose rig, their own models) in the coop's
  frame. By day each in turn waddles about the yard (grazing, preening, a rest, a happy bob), swims on the pond round the
  raft (in from the bank, dabbling, up-ending, a splashy bath, preening and floating, then out with a shake), and in the
  Cosy and the Deluxe plays with the beach ball (now the browser's: `beachBall`, six panels, floating and bobbing; she
  comes round behind it, a nudge with the breast sends it gliding off over the water, slowing, off the pond's edge, the
  raft and the gangplank, spinning as it goes; a happy bob after); now and then Pip leads them round the yard in a little
  line, each on the trail of the one ahead (`parade`, `followTask`); once a day each duck (not Pip) goes up the gangplank
  and in, sits in the nest at the window a while (her face in it), a proud quack, an egg (the test page's nest count), and
  out and down again (`layTask`). At dusk (20:45) they go up one by one, the ducks first, Pip last, and sleep inside; in
  the morning, once the door's open, out one by one, down the plank, a stretch and a quack (`goBed`, `getUp`). Their own
  little world: the pond (coops.json `ponds` per look: its middle, half-widths, the water's height; `stylized/coops.py
  float_info`), the gangplank (the nest's pop and foot; the Deluxe's bridge from `paths`), the raft and the house (kept
  clear: a wall for their steering, `nav`; swims round its corners, `viaCorner`), the yard (the fence's box, the feeder, the
  water, the hay; the hens' ramp spots left out), their ways round the pond on the bank (`bankRing`, `landWay`), the
  ring of swimming spots split by the gangplank into its two sides (`makeRing`), the plank itself one behind the other
  (`rampTask`). A tap: a quack, the head bob and the wiggle. The Cosy's pond made wider (1.2: room for the ball at its side,
  `FLOAT_POND[3]`, `FLOAT_BALL`); the eggs drawn the house's size (`showEggs`: `G.scale`).
- **The call ducks in the game, at level 10** (30 Oct; Audrey: "Yes, put them in", then "Carry on"): `game.js`
  `BREED_INFO.call` (`duck: true`; "Call duck", "Floating House"; `isDuck`), `BREED_LEVEL.call = 10`, 10 coins an egg
  (`EGG_PRICE`), their trio a drake and two ducks with their own names (`DRAKE_NAMES`, `DUCK_NAMES`: Pip, Puddle, Dimple...).
  Level 10's card and Your coops: "New breed: Call duck!", "A drake and two ducks, yours for good, with their own house on a
  pond" (`trio_body_duck`, a duck 🦆); placed: the rustic Floating House with its pond, the five looks by its upgrades as
  the hens' (`TIER_LOOK.call`, `hasLooks`: always). In their pen (`addCallDucks`: the save's three, the drake first,
  `CallPen` `o.birds`): their game names; they lay when the game says (`dueLays`, `birdOf`; `CallPen.canLay` / `layNow`:
  by day, on the yard, one at a time, up the gangplank into the nest; `o.game` stops their own laying), the egg into the
  save and the straw (`gameLaid`); a pale green duck egg (`EGG_COLOUR.call`). A tap: her card ("Call duck · Duck" or
  "Drake", "the better her ducklings"); she stops where she is and faces you (`holdBird` → `CallPen.hold`); Cuddle: hearts
  over her, she turns to you, a happy bob and a quack (`cuddled`; no farmer visit for them); worms: the same bob; trusting
  ones come to the front of their yard to say hello to the farmer when he stops by (`greet`, a heart). The feeder's card:
  "Your ducks lay while there's food in it" (`feed_how_duck`). An upgrade makes the pen again round the same three
  (`retier` → `addCallDucks`). Not for them (yet): the shows (poultry shows: `canEnter`, `showBirds`), Rusty (their house
  is out on a pond: `foxCoop`), broods (`broodTick`: ducklings are the next step). The Breed Book: their page after the
  Ayam Cemani ("1 of 15 breeds found"; `bookPages` from both orders), their picture `book/call.webp` (bookpics.mjs
  `ONLY=call`: the duck line-up's pair, the `book` pose), "a coin for each star of the duck" (`book_price_duck`). All
  their words in the six languages (lang/*.json, packed). The save's checks as for every breed: a call coop before level
  10 is flagged. Tests: **calltest.mjs** (level 9 to 10, placing, the pen, a tap and her card, cuddle, a lay, the feeder,
  the book, the Snug look, no shows, a reload, a coop put in from outside), booktest and silktest (15 pages).
- **No clipping with the ball, nor with each other** (30 Oct; Audrey, with a still from the film: "clipping with the
  ball"): each duck's body seen from above is a capsule (callpen.js `CAP`: from just in front of the tail to the breast,
  0.062 to each side, measured off the models: tail to bill tip -0.136 to 0.161). Every frame (`CallPen.apart`) two ducks
  touching are moved apart, half each (all of it the other if one can't go: the raft, the gangplank, the pond's edge, the
  yard; else a little to one side, `shoveOut`); a duck touching the ball bumps it on (it drifts off, `bump`), and where the
  ball can't go (the raft, the edge) she gives way. She comes up to the ball only to touch it with her breast (`NUDGE`),
  then a little push on with it. Afloat, her whole body (tail, middle, breast) is kept clear of the raft and the gangplank
  (`keepOff`, and every push checked the same way, `okAt`); the Deluxe's bridge counted as wide as it is with its
  railings (`plankW`: 0.135 each side, the gangplank's 0.1), and the ball kept well clear of it (0.16 more: from above,
  its tall arched railings would otherwise seem to cut into the ball behind them). Not in the house or on the plank (one behind the other there
  already). A soak of the Snug, the Cosy and the Deluxe over 400 s each: no duck in the ball, in another, in the raft or
  the bridge, not once.
- **Squabbles over the ball, and the ball out on the yard** (30 Oct; Audrey: "sometimes the ducks will 'argue' to play
  with the ball. Sometimes they will send the ball out of the pond and will need to get out to roll it back in"). Two at
  the ball (playing, or one swimming near it), now and then (`ARGUE` 55%, then not again for 25 s): `argueOrNudge` turns
  both to a squabble (`argueTask`): they swim up to each other and quack in turn, heads stretched out and bobbing, wings a
  little up, a little nearer on each word (the other sitting up, indignant); after five seconds one gives in (a huff, nose
  in the air, a tail wiggle, and she swims off to the far side of her arc and won't play for 40 s, `sulk`), the other bobs
  happily and plays on. All talk: `apart` keeps them a duck's width apart. A nudge is now and then a big kick
  (`BIG_KICK` 20%, by day): she rears up with a flap and a whack (`KICK` 1 m/s) and watches it go with her head on one side,
  but only where it would land well (`landsWell`: the ball's own physics run ahead, `ballStep`: it must get over the
  bank, stop on the yard without hitting anything, in front of the house or at its sides where you see it, not behind it,
  with room behind it and a clear way straight back down into the water, away from the gangplank). The ball's three places (`zoneAt`): afloat, up over the bank's stones (a little hop; the bank
  slopes back down into the water), rolling on the yard (more friction, off the fence and what's in the yard, `things`).
  Once it lies still on the yard, the one who kicked it (if free, else the nearest) fetches it (`fetchTask`): out onto
  the bank near it (not right by it) with a shake, over to its side by the bank's ways (not through it), round behind
  it, then rolls it the shortest way back down into the water (the pond edge's normal, `inward`) with her breast, head
  bobbing, a little roll on each push, going round it again if it veers off; a last push into the water, a happy bob and a
  quack. About a quarter of a minute from the kick to the ball afloat again. At
  night it waits on the yard for the morning. If twice nobody can manage it, it rolls back by itself (`roll`). Each nudge
  now picks a way to send the ball that she's nearly behind already (not round the ball in a narrow bit of water).
- Next: ducklings (a duck sitting, fluffy yellow ducklings following her on land and water), then the peacock at 30.
, duck eggs (a new kind), ducklings, life in their
  pen, arriving at level 10 (names in the six languages, a Breed Book page, the save's checks, tests).
