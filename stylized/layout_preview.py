"""Preview a farm layout from the Unity game's camera (orthographic, 42 degrees down, 45 round, portrait phone).
Builds the coop procedurally (so a new pen size can be tried) and brings in the exported FBX birds and trees.
Usage: python layout_preview.py old|new [samples]"""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import addon_utils
addon_utils.enable('io_scene_fbx', default_set=True)
import coop

HERE = os.path.dirname(os.path.abspath(__file__))
MOD = os.environ.get('MODDIR') or os.path.join(HERE, 'unity', 'FeatherField', 'Models')
mode = sys.argv[1] if len(sys.argv) > 1 else 'new'
samples = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 24
sys.path.insert(0, HERE)
import farm_layout as FL
L = FL.OLD if mode == 'old' else FL.NEW

scn = reset()
lighting(scn)
g = bpy.data.materials.new('meadow'); g.use_nodes = True
g.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = lin('#86b553'); g.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); setmat(bpy.context.object, g)

coop.PEN = dict(L['pen'])
FBX = '--fbx' in sys.argv          # check the exported coop and path instead of building them
if not FBX: coop.build((0, 0, 0), 0.0, seed=5, pen=True)


def imp(name, loc, yaw_deg=0.0, scale=1.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(MOD, name + '.fbx'), axis_forward='-Z', axis_up='Y')
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.parent is None:          # keep the importer's axis fix, then turn, scale and place
            o.matrix_world = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(math.radians(yaw_deg), 4, 'Z') @ Matrix.Scale(scale, 4) @ o.matrix_world
    return new


if FBX:
    imp('coop', (0, 0, 0)); imp('path', (0, 0, 0))
for t in L['trees']:
    imp(t['model'], (t['pos'][0], t['pos'][1], 0), t['yaw'], t['scale'])
red = mat('marker', '#e0302a', rough=0.5)
for i, (x, y) in enumerate(L.get('yard_birds', [])):
    imp('rooster_stand' if i == 3 else 'hen_stand', (x, y, 0.015), random.uniform(0, 360))
for x, y in L.get('tree_birds', []) + L.get('glutton', []):
    imp('hen_stand', (x, y, 0), 200)
for x, y in L.get('chicks', []):
    imp('chick_stand', (x, y, 0.015), 30)
for x, y, z in L.get('apples', []):
    sphere('apple', 0.045, (x, y, z), m=red, seg=12, rings=8)
gold = mat('marker2', '#f0a860', rough=0.4)
for x, y in L.get('eggs', []):
    sphere('egg', 0.045, (x, y, 0.05), (0.8, 0.8, 1.0), m=gold, seg=12, rings=8)
for x, y in ([] if FBX else L.get('path_pts', [])):
    cyl('pathdot', 0.3, 0.004, (x, y, 0.003), m=mat('pathm', '#b98d58', rough=0.9), verts=16, bevel=0)

tgt = L['target']
game_camera(scn, (tgt[0], tgt[1], tgt[2]), L['ortho'] * 2)
render(scn, 'layout_' + mode + ('_fbx' if FBX else ''), 603, 1311, samples)
