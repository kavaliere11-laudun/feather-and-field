"""Export the cosy-farm assets for Unity: one FBX per asset (modifiers applied, joined, Unity axes, metres),
flat colour materials named FF_* (three shades for anything that had per-plank variation), and palette/layout JSON
that the Unity setup script reads.  Usage: python export_unity.py"""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import addon_utils
addon_utils.enable('io_scene_fbx', default_set=True)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'unity', 'FeatherField')
MOD = os.path.join(ROOT, 'Models'); DATA = os.path.join(ROOT, 'Data')
for d in (MOD, DATA): os.makedirs(d, exist_ok=True)
PALETTE = {}          # name -> dict(color=[r,g,b] sRGB, smoothness, metallic)
STATS = {}


def to_srgb(c):
    return [round(12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055, 4) for x in c[:3]]


def flat_info(m):
    """A representative flat colour (linear), roughness, metallic and per-object variation for a node material."""
    nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
    col = None
    for n in nt.nodes:
        if n.type == 'RGB': col = list(n.outputs[0].default_value); break
    if col is None:
        for n in nt.nodes:
            if n.type == 'VALTORGB': col = list(n.color_ramp.evaluate(0.6)); break
    if col is None and b: col = list(b.inputs['Base Color'].default_value)
    rough = b.inputs['Roughness'].default_value if b else 0.7
    metal = b.inputs['Metallic'].default_value if b else 0.0
    var = 0.0
    for n in nt.nodes:
        if n.type == 'HUE_SAT':
            for l in nt.links:
                if l.to_node == n and l.to_socket.name == 'Value' and l.from_node.type == 'MAP_RANGE':
                    var = l.from_node.inputs['To Max'].default_value - 1.0
    return col, rough, metal, var


_ff = {}


def ff_mat(src, shade):
    """Flat export material for source material `src`, shade 0..2 (darker, base, lighter)."""
    base = src.name.split('.')[0]
    col, rough, metal, var = flat_info(src)
    if var <= 0.001: shade = 1
    name = 'FF_%s_%d' % (base, shade) if var > 0.001 else 'FF_%s' % base
    if name in _ff: return _ff[name]
    k = [1 - var * 0.9, 1.0, 1 + var * 0.9][shade]
    c = [min(1.0, x * k) for x in col[:3]]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']; bs.inputs['Base Color'].default_value = c + [1.0]
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    m.diffuse_color = c + [1.0]
    PALETTE[name] = dict(name=name, color=to_srgb(c), smoothness=round(max(0.0, min(0.9, (1 - rough) * 0.75)), 3), metallic=round(metal, 3))
    _ff[name] = m; return m


def bake_and_export(name, roots=None, seed=1, max_faces=0):
    """Apply modifiers, swap in flat materials, join every mesh in the scene into one object and export it."""
    random.seed(seed)
    src = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get()]
    if max_faces:            # game-weight: simplify any dense part (bodies, leaf puffs) down to about max_faces
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        for o in src:
            nf = len(o.evaluated_get(dg).data.polygons)
            if nf > max_faces:
                dm = o.modifiers.new('decimate', 'DECIMATE'); dm.ratio = max_faces / nf; dm.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    anchor = bpy.data.objects.new(name, bpy.data.meshes.new(name)); bpy.context.scene.collection.objects.link(anchor)
    news = [anchor]          # an empty mesh at the origin: everything joins into its (identity) space
    for o in src:
        ev = o.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
        shade = random.randint(0, 2)
        for i, m in enumerate(me.materials):
            if m is not None: me.materials[i] = ff_mat(m, shade)
        n = bpy.data.objects.new(name + '_part', me); bpy.context.scene.collection.objects.link(n)
        n.matrix_world = o.matrix_world.copy()
        news.append(n)
    for o in src: bpy.data.objects.remove(o)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH': bpy.data.objects.remove(o)
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in news: o.select_set(True)
    bpy.context.view_layer.objects.active = news[0]
    if len(news) > 1: bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active; ob.name = name; ob.data.name = name
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    STATS[name] = dict(tris=tris, materials=len(ob.data.materials))
    export([ob], name)
    return ob


def export(objs, name):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.fbx(filepath=os.path.join(MOD, name + '.fbx'), use_selection=True, object_types={'MESH'},
                             apply_scale_options='FBX_SCALE_ALL', axis_forward='-Z', axis_up='Y', bake_space_transform=True,
                             use_mesh_modifiers=True, mesh_smooth_type='OFF', add_leaf_bones=False, use_custom_props=False,
                             path_mode='AUTO', embed_textures=False, use_tspace=False)
    print('EXPORTED', name, STATS.get(name))


import hen, coop, tree, grass


def fresh():
    """Empty scene and forget every cached material (they belonged to the old scene)."""
    reset(); _ff.clear(); hen._mats.clear(); coop._M.clear(); tree._M.clear(); grass._cache.clear()

# ---- birds: facing Blender -Y, which becomes Unity's forward (+Z)
for key, nm in (('rir_h', 'hen'), ('rir_r', 'rooster')):
    for pose in ('stand', 'peck'):
        fresh()
        hen.build(key, (0, 0, 0), math.radians(-90), pose, seed=3)
        for o in bpy.context.scene.objects:          # game weight: feathers one subdivision level, spheres simpler
            for md in o.modifiers:
                if md.type == 'SUBSURF': md.levels = md.render_levels = 1
        bake_and_export('%s_%s' % (nm, pose), max_faces=1600)

# ---- coop with its pen (yard, fence, gate, feeder, dish, hay, sack, straw)
fresh()
coop.build((0, 0, 0), 0.0, seed=5, pen=True)
bake_and_export('coop')

# ---- apple tree (lighter on polygons than the close-up: one subdivision level on the puffs)
for seed, nm in ((2, 'apple_tree'), (5, 'apple_tree_b')):
    fresh()
    r = tree.build((0, 0, 0), seed=seed, scale=1.0)
    for o in bpy.context.scene.objects:
        if o.name.startswith('clump'):
            for md in o.modifiers:
                if md.type == 'SUBSURF': md.levels = md.render_levels = 1
    bake_and_export(nm, seed=seed, max_faces=900)

# ---- small scatter props: grass tufts, flowers, a fallen apple, a pebble (each its own FBX, origin at its base)
grass._cache.clear()
for i in range(3):
    fresh()
    me = grass.tuft_mesh('tuft', blades=6 + i, h=0.055 * (0.85 + 0.15 * i), seed=i)
    bm = bmesh.new(); bm.from_mesh(me)
    back = bmesh.ops.duplicate(bm, geom=bm.faces[:])['geom']
    bmesh.ops.reverse_faces(bm, faces=[f for f in back if isinstance(f, bmesh.types.BMFace)])
    bm.to_mesh(me); bm.free()
    me.materials.append(grass.blade_mat())
    o = link(bpy.data.objects.new('tuft', me))
    bake_and_export('grass_tuft_%d' % i)
for kind in ('daisy', 'butter', 'clover'):
    fresh()
    grass.flower_obj(kind)
    bake_and_export('flower_' + kind)
fresh()
sphere('fapple', 0.038, (0, 0, 0.034), (1, 1, 0.92), m=tree.M()['apple'], seg=16, rings=10)
cyl('stalk', 0.004, 0.025, (0, 0, 0.075), m=tree.M()['stalk'], verts=5, bevel=0)
bake_and_export('apple')

# ---- the dirt path from the pen gate (same curve as the farm scene)
fresh()
import importlib
GX = -1.25 + 2.5 * 2.6 / 4 + 0.05
pts = [(GX + 0.55 * math.sin(t * 3.0) - 1.6 * t * t, -1.98 - t * 4.2, 0) for t in (i / 39 for i in range(40))]
_d = (Vector(pts[-1]) - Vector(pts[-2])).normalized()
pts += [tuple(Vector(pts[-1]) + _d * 0.25 * (k + 1)) for k in range(40)]
me = bpy.data.meshes.new('path'); bm = bmesh.new(); rows = []
P = [Vector(p) for p in pts]
for i, p in enumerate(P):
    d = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized(); n = Vector((-d.y, d.x, 0))
    w = 0.31 * (1 + 0.12 * noise.noise(p * 1.7))
    rows.append((bm.verts.new(p - n * w + Vector((0, 0, 0.004))), bm.verts.new(p + n * w + Vector((0, 0, 0.004)))))
for i in range(len(rows) - 1):
    f = bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    f.normal_update()
    if f.normal.z < 0: f.normal_flip()          # single-sided strip: must face up for Unity
bm.to_mesh(me); bm.free()
po = link(bpy.data.objects.new('path', me)); setmat(po, coop.dirt_mat())
for p in po.data.polygons: p.use_smooth = True
s_ = po.modifiers.new('sub', 'SUBSURF'); s_.levels = s_.render_levels = 2
bake_and_export('path')

# meadow colour for the Unity ground plane
mm = bpy.data.materials.new('meadow_flat'); mm.use_nodes = True
PALETTE['FF_meadow'] = dict(name='FF_meadow', color=to_srgb(lin('#86b553')), smoothness=0.05, metallic=0.0)
PALETTE['FF_meadow_dark'] = dict(name='FF_meadow_dark', color=to_srgb(lin('#73a347')), smoothness=0.05, metallic=0.0)

# ---- data for the Unity side: palette and layout, all converted to Unity coordinates (x, y, z) = (-bx, bz, -by)
def U(x, y, z=0.0): return [round(-x, 4), round(z, 4), round(-y, 4)]
json.dump({'materials': sorted(PALETTE.values(), key=lambda e: e['name'])}, open(os.path.join(DATA, 'palette.json'), 'w'), indent=1)
flat = lambda L: [v for item in L for v in item]           # Unity's JsonUtility can't read nested lists
layout = {
    'path': flat([U(p[0], p[1]) for p in pts]),
    'pen': {'min': [-1.4, 0, -0.8], 'max': [1.3, 0, 1.95]},
    'yard': {'min': [-1.15, 0, 0.6], 'max': [1.05, 0, 1.75]},
    'yardObstacles': flat([U(-0.85, -1.45) + [0.38], U(0.75, -1.25) + [0.22], U(0.25, -1.55) + [0.22], U(-0.31, -0.75) + [0.18], U(-0.31, -1.0) + [0.16], U(0.95, 0.15) + [0.2]]),
    'trees': [{'model': 'apple_tree', 'pos': U(-2.0, 1.15), 'scale': 1.25, 'yaw': 20}, {'model': 'apple_tree_b', 'pos': U(2.6, 1.6), 'scale': 1.0, 'yaw': 200}],
    'hens': [{'model': 'hen', 'pos': U(0.2, -1.05, 0.015), 'yaw': 30, 'area': 'yard'}, {'model': 'hen', 'pos': U(0.62, -1.0, 0.015), 'yaw': 160, 'area': 'yard'},
             {'model': 'hen', 'pos': U(-0.6, -0.8, 0.015), 'yaw': 250, 'area': 'yard'}, {'model': 'rooster', 'pos': U(-0.05, -0.55, 0.015), 'yaw': 300, 'area': 'yard'},
             {'model': 'hen', 'pos': U(-1.55, 0.45), 'yaw': 90, 'area': 'tree'}],
    'camera': {'target': U(-0.15, -0.1, 0.3), 'pitch': 42.0, 'yaw': 135.0, 'orthoSize': 4.0},
    'sun': {'dir': [-0.55, -0.72, -0.62], 'color': to_srgb(lin('#fff1dc')), 'intensity': 1.9},
}
json.dump(layout, open(os.path.join(DATA, 'layout.json'), 'w'), indent=1)
json.dump(STATS, open(os.path.join(DATA, 'stats.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
