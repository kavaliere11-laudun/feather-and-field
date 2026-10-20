"""Export the cosy-farm models for the browser 3D farm: lighter than the Unity ones (one bevel segment on planks, simpler
feathers and leaf puffs), each model one mesh with vertex colours and a few shared materials (matte, satin, gloss, metal),
so the phone draws each model in a handful of calls.
Writes two GLB files: farm.glb (coop and pen, path, trees, grass, flowers, apple) and birds.glb (hen, rooster, chick;
standing and pecking). Coordinates: glTF's (x, y, z) = Blender's (x, z, -y); birds face +z.
Usage: python export_web.py [out_dir]"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import chick
BUDGET.update({'hen_stand': 3000, 'hen_peck': 3000, 'rooster_stand': 3400, 'rooster_peck': 3400, 'chick_stand': 1500, 'chick_peck': 1500,
               'apple_tree': 16000, 'apple_tree_b': 16000, 'flower_daisy': 140})

# ---- birds, facing Blender -y (glTF +z)
for key, nm in (('rir_h', 'hen'), ('rir_r', 'rooster')):
    for pose in ('stand', 'peck'):
        fresh(); hen.build(key, (0, 0, 0), math.radians(-90), pose, seed=3); light(1)
        bake_and_export('%s_%s' % (nm, pose), max_faces=450)
for pose in ('stand', 'peck'):
    fresh(); chick._mats.clear(); chick.build((0, 0, 0), math.radians(-90), pose, seed=3); light(1)
    bake_and_export('chick_%s' % pose, max_faces=350)

# ---- the coop with the big pen: one bevel segment on every plank (a chamfer catches the light the same from the game's camera)
fresh(); coop.PEN = dict(farm_layout.NEW['pen']); coop.build((0, 0, 0), 0.0, seed=5, pen=True); light(1, bevel_segments=1)
for o in bpy.context.scene.objects:             # roof shingles: plain boxes (their bevels are too small to see from the game's camera)
    if o.name.startswith('sh'):
        for md in [m for m in o.modifiers if m.type == 'BEVEL']: o.modifiers.remove(md)
bake_and_export('coop')

# ---- apple trees: fewer faces on each leaf puff
for seed, nm in ((2, 'apple_tree'), (5, 'apple_tree_b')):
    fresh(); tree.build((0, 0, 0), seed=seed, scale=1.0)
    for o in bpy.context.scene.objects:
        if o.name.startswith('clump'):
            for md in o.modifiers:
                if md.type == 'SUBSURF': md.levels = md.render_levels = 1
    bake_and_export(nm, seed=seed, max_faces=320)

# ---- grass tufts (two-sided), flowers, the fallen apple
bmesh, link = g['bmesh'], g['link']
grass._cache.clear()
for i in range(3):
    fresh()
    me = grass.tuft_mesh('tuft', blades=6 + i, h=0.055 * (0.85 + 0.15 * i), seed=i)     # one-sided: the browser draws both sides
    me.materials.append(grass.blade_mat())
    link(bpy.data.objects.new('tuft', me))
    bake_and_export('grass_tuft_%d' % i)
for kind in ('daisy', 'butter', 'clover'):
    fresh(); grass.flower_obj(kind); bake_and_export('flower_' + kind)
fresh()
g['sphere']('fapple', 0.038, (0, 0, 0.034), (1, 1, 0.92), m=tree.M()['apple'], seg=12, rings=8)
g['cyl']('stalk', 0.004, 0.025, (0, 0, 0.075), m=tree.M()['stalk'], verts=5, bevel=0)
bake_and_export('apple')

# ---- the dirt path from the gate
fresh()
L = farm_layout.NEW
pts = [(x, y, 0) for x, y in farm_layout.path_points(L['gate'][1] + 0.05, L['pen']['box'][2])]
noise = g['noise']
me = bpy.data.meshes.new('path'); bm = bmesh.new(); rows = []
P = [Vector(p) for p in pts]
for i, p in enumerate(P):
    d = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized(); n = Vector((-d.y, d.x, 0))
    w = 0.31 * (1 + 0.12 * noise.noise(p * 1.7))
    rows.append((bm.verts.new(p - n * w + Vector((0, 0, 0.004))), bm.verts.new(p + n * w + Vector((0, 0, 0.004)))))
for i in range(len(rows) - 1):
    f = bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0])); f.normal_update()
    if f.normal.z < 0: f.normal_flip()
bm.to_mesh(me); bm.free()
po = link(bpy.data.objects.new('path', me)); g['setmat'](po, coop.dirt_mat())
for p in po.data.polygons: p.use_smooth = True
s_ = po.modifiers.new('sub', 'SUBSURF'); s_.levels = s_.render_levels = 1
bake_and_export('path')

write_glb(os.path.join(OUT, 'birds.glb'), ['hen_stand', 'hen_peck', 'rooster_stand', 'rooster_peck', 'chick_stand', 'chick_peck'])
write_glb(os.path.join(OUT, 'farm.glb'), ['coop', 'path', 'apple_tree', 'apple_tree_b', 'apple', 'grass_tuft_0', 'grass_tuft_1', 'grass_tuft_2',
                                          'flower_daisy', 'flower_butter', 'flower_clover'])
json.dump(STATS, open(os.path.join(OUT, 'stats.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
