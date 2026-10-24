"""Export the eight decorations for the browser (decor.glb + decor.json), built by the 2D game's own Blender script
(decor_sprites.py, so they have the same shapes and colours as the farm map's pictures): the cottage flower bed, the bird
bath, the beehives, the duck house on its raft, the greenhouse, the windmill (its sails apart, to turn), the bandstand and
the golden cockerel on his plinth. Built unturned, facing -Y (glTF +Z): the browser turns them to face the player.
decor.json: the windmill's hub (where the sails turn), each one's footprint (for the village grid), the stats.
Usage: python export_decor.py [out_dir]"""
import os, sys, json, math
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE); sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(HERE, 'character'))
from webglb import *
from mathutils import Vector, Matrix
import random

# the 2D script's builders without its rendering (its source from its colours to just before the render loop), turned
# nowhere (group_turn does nothing here)
src = open(os.path.join(ROOT, 'decor_sprites.py')).read()
head = src[src.index('def lin(h):'):src.index('DECOR = {')]
D = {'__name__': 'decor_head', 'bpy': bpy, 'math': math, 'random': random, 'Vector': Vector, 'Matrix': Matrix, 'sys': sys, 'os': os, 'json': json}
exec('from ffbird import reset, principled, ellipsoid\nfrom ffscene import box, cyl, wood\n', D)
exec(compile(head, 'decor_sprites_head', 'exec'), D)
D['group_turn'] = lambda objs, deg=45.0, at=(0, 0, 0): None
WINDMILL_HUB = Vector((0, -1.32, 6.3))                 # (decor_sprites.windmill's hub before its 45-degree turn)

GLASS = {'glass'}
BUCKETS['glass'] = (0.12, 0.0)
_bucket = bucket_of
def bucket_glass(m):
    import re
    if m is not None and re.sub(r'_[012]$', '', re.sub(r'^FF_', '', m.name.split('.')[0])) in GLASS:
        b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        return 'glass', (list(b.inputs['Base Color'].default_value)[:3] if b else [0.9, 0.95, 0.93])
    return _bucket(m)
import webglb
webglb.bucket_of = bucket_glass

BUDGET.update({'flowers': 9000, 'birdbath': 2600, 'beehives': 4200, 'duckhouse': 1600, 'greenhouse': 4200, 'windmill': 4600,
               'sails': 1400, 'bandstand': 5200, 'statue': 12000})
FOOT = {}


def footprint(name):
    """How far it reaches on the ground (glTF x, z: min and max), for the village grid."""
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); lo = [9e9, 9e9]; hi = [-9e9, -9e9]
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh()
        for v in me.vertices:
            p = o.matrix_world @ v.co
            if p.z > 2.6: continue                       # (only what stands near the ground: not the windmill's cap)
            x, z = p.x, -p.y
            lo = [min(lo[0], x), min(lo[1], z)]; hi = [max(hi[0], x), max(hi[1], z)]
    FOOT[name] = [round(lo[0], 3), round(lo[1], 3), round(hi[0], 3), round(hi[1], 3)]


def one(name, fn):
    fresh(); D['_MT'].clear(); random.seed(sum(map(ord, name)))
    fn()
    for o in list(bpy.context.scene.objects):          # curves and the like (the cockerel): meshes
        if o.type in ('CURVE', 'META', 'SURFACE', 'FONT'):
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            try: bpy.ops.object.convert(target='MESH')
            except Exception as e: print('CONVERT', o.name, e)
    light(1, bevel_segments=1)
    if name != 'sails': footprint(name)
    bake_and_export(name)


B = {'flowers': D['flowers'], 'birdbath': D['birdbath'], 'beehives': D['beehives'], 'duckhouse': D['duckhouse'], 'greenhouse': D['greenhouse'],
     'windmill': D['windmill'], 'sails': D['sails'], 'bandstand': D['bandstand'], 'statue': D['statue']}
only = [a for a in sys.argv[2:] if not a.startswith('-')]
for name, fn in B.items():
    if only and name not in only: continue
    one(name, fn)
names = [n for n in B if n in MODELS]
write_glb(os.path.join(OUT, 'decor.glb'), names)
hub = [round(WINDMILL_HUB.x, 3), round(WINDMILL_HUB.z, 3), round(-WINDMILL_HUB.y, 3)]
json.dump(dict(hub=hub, foot=FOOT, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'decor.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
