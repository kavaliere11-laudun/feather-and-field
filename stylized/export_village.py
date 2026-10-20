"""Export the village's models for the browser 3D farm (village.glb): the farmhouse, egg stall, pasture, empty and
for-sale plots, decorations, fields, bridge and dock (from the 2D map's Blender builders, now drawn in flat colours),
plus cosy-style woods trees, an orchard tree, bushes and rocks. One mesh per model, vertex colours, a few materials.
Usage: python export_village.py [out_dir]"""
import os, sys, math, random
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
sys.path.append(ROOT)                    # the 2D map's builders (ffland, ffdecor, coops3, ffscene, ffbird)
import ffland, ffdecor, coops3
from ffbird import principled
from ffscene import box, wood

common = g                                # the cosy helpers (sphere, mat, ...) from the Unity exporter's head
BUDGET.update({
    'farmhouse': 4500, 'egg_stall': 2600, 'pasture': 3000, 'pasture_shelter': 2400, 'plot_empty': 700, 'plot_sale': 3200,
    'hay_stack': 900, 'round_bale': 700, 'barrels': 900, 'wheelbarrow': 900, 'planter': 1200, 'flower_pots': 1200, 'lamp_post': 600,
    'well': 1500, 'veg_patch': 3500, 'veg_patch_sq': 3500, 'picket_fence': 900, 'scarecrow': 900, 'log_pile': 900, 'bench': 500,
    'dock': 900, 'mushrooms': 600, 'wheat_field': 7000, 'sunflowers': 6000, 'bridge': 1600,
    'tree_a': 9000, 'tree_b': 9000, 'tree_c': 9000, 'tree_apple': 9000, 'bush_a': 500, 'bush_b': 500, 'rock_a': 120, 'rock_b': 120,
})


def clear():
    """Remove every object but keep the materials: the 2D map's builders made theirs once, when they were loaded."""
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0: bpy.data.meshes.remove(me)


def one(name, fn, levels=1, bevel=1):
    clear(); random.seed(7); fn(); light(levels, bevel_segments=bevel)
    bake_and_export(name)


def blank_sign(x, y):
    post = wood('signpost', (0.22, 0.13, 0.065))
    board = wood('signboard', (0.5, 0.34, 0.17), scale=(1, 1, 20))
    box('signpost', (x, y, 0.38), (0.06, 0.06, 0.76), post)
    box('sign', (x, y - 0.035, 0.66), (0.62, 0.04, 0.32), board, bevel=0.015)


def overgrown():
    """A plot not yet bought: brambles, long grass and wildflowers behind a sign (as the 2D map's)."""
    random.seed(11)
    for k in range(9):
        x, y = random.uniform(-1.4, 1.4), random.uniform(-1.1, 1.1)
        ffland.bush(x, y, random.uniform(0.28, 0.45))
    berry = principled('berry', (0.15, 0.01, 0.05), 0.3, coat=0.5)
    for k in range(30):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.025, location=(random.uniform(-1.4, 1.4), random.uniform(-1.1, 1.1), random.uniform(0.15, 0.5)))
        bpy.context.object.data.materials.append(berry)
    ffland.flowers(0.2, -0.3, 0.8, 30, [(0.85, 0.82, 0.75), (0.8, 0.6, 0.05)])
    ffland.rock(1.1, -0.9, 0.16)
    blank_sign(-0.9, -1.3)


def cosy_bush(seed):
    random.seed(seed)
    lm = tree.leaf_mat('bush%d' % seed)
    for k in range(4 + seed % 2):
        a = random.uniform(0, math.tau); d = random.uniform(0.05, 0.22)
        r = random.uniform(0.18, 0.28)
        common['sphere']('puff', r, (math.cos(a) * d, math.sin(a) * d, r * 0.75 + random.uniform(0, 0.08)), (1, 1, 0.85),
                         m=lm, ico=2, disp=0.18, seed=seed * 10 + k)


def cosy_rock(seed):
    m = common['mat']('rock%d' % seed, '#9a958a', rough=0.85)
    common['sphere']('rock', 0.15, (0, 0, 0.06), (1.2, 1.0, 0.65), m=m, ico=1, disp=0.3, seed=seed)


# ---- buildings and the pasture
one('farmhouse', ffland.farmhouse)
one('egg_stall', ffland.egg_stall)
one('pasture', lambda: ffland.pen_fence(6.0, 4.6, gate=0.9))
one('pasture_shelter', coops3.pasture_shelter)
# ---- plots: empty (staked out, ready to build) and for sale (overgrown)
one('plot_empty', lambda: ffland.build_plot(3.0, 2.4))
one('plot_sale', overgrown)
# ---- decorations, fields, bridge and dock
for name, fn in [('hay_stack', ffdecor.hay_stack), ('round_bale', ffdecor.round_bale), ('barrels', ffdecor.barrels), ('wheelbarrow', ffdecor.wheelbarrow),
                 ('planter', ffdecor.planter), ('flower_pots', ffdecor.flower_pots), ('lamp_post', ffdecor.lamp_post), ('well', ffdecor.well),
                 ('veg_patch', lambda: ffdecor.veg_patch(2.6, 1.8)), ('veg_patch_sq', lambda: ffdecor.veg_patch(2.4, 2.4)),
                 ('picket_fence', lambda: ffdecor.picket_fence(2.0)), ('scarecrow', ffdecor.scarecrow), ('log_pile', ffdecor.log_pile),
                 ('bench', ffdecor.bench), ('dock', lambda: ffdecor.dock(1.8)), ('mushrooms', ffdecor.mushrooms),
                 ('wheat_field', lambda: ffdecor.wheat_field(4.4, 2.4)), ('sunflowers', lambda: ffdecor.sunflowers(3.8, 1.8)),
                 ('bridge', lambda: ffdecor.bridge(1.9, 0.8))]:
    one(name, fn)
# ---- cosy trees for the woods and the green (no apples), an orchard tree, bushes and rocks
for name, seed in (('tree_a', 3), ('tree_b', 4), ('tree_c', 6)):
    clear(); tree.build((0, 0, 0), seed=seed, scale=1.0, apples=0)
    for o in bpy.context.scene.objects:
        for md in o.modifiers:
            if md.type == 'SUBSURF': md.levels = md.render_levels = 1
    bake_and_export(name, seed=seed, max_faces=260)
clear(); tree.build((0, 0, 0), seed=5, scale=1.0, apples=18)
for o in bpy.context.scene.objects:
    for md in o.modifiers:
        if md.type == 'SUBSURF': md.levels = md.render_levels = 1
bake_and_export('tree_apple', seed=5, max_faces=260)
for name, seed in (('bush_a', 1), ('bush_b', 2)):
    clear(); cosy_bush(seed); bake_and_export(name)
for name, seed in (('rock_a', 1), ('rock_b', 2)):
    clear(); cosy_rock(seed); bake_and_export(name)

names = list(MODELS)
write_glb(os.path.join(OUT, 'village.glb'), names)
json.dump(STATS, open(os.path.join(OUT, 'village_stats.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
