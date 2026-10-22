"""Export the coops for the browser (coops.glb + coops.json): the five houses (house_rir .. house_bra), the shared pen
(pen_base: yard, feeder, water, hay, sack; fence: posts and rails; fence_dx: the Deluxe pickets, rose arch, flowers and
bunting), the Deluxe weathervane (vane) and each house's sliding pop door, shut (popdoor_rir .. popdoor_bra). coops.json gives each house's roof top, where the vane stands, and its nest (window, seat, the way in, the ramp).
Usage: python export_coops.py [out_dir]"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import coops, coop, farm_layout
GLOW.update({'lamp', 'lanternred'})       # the lanterns light up at night
BUDGET.update({'house_rir': 13500, 'house_orp': 12500, 'house_leg': 17000, 'house_sil': 13500, 'house_bra': 14500,
               'pen_base': 5000, 'fence': 3500, 'fence_dx': 9000, 'vane': 900})
TOPS = {}


def top_of(name):
    """The highest point near the middle of the roof (not a chimney), in glTF axes."""
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); best = None
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh()
        for v in me.vertices:
            p = o.matrix_world @ v.co
            if abs(p.x) < 0.2 and abs(p.y) < 0.2 and (best is None or p.z > best.z + 0.01 or (p.z > best.z - 0.01 and abs(p.x) + abs(p.y) < abs(best.x) + abs(best.y))): best = p.copy()
    TOPS[name] = [round(best.x, 4), round(best.z, 4), round(-best.y, 4)]


def one(name, fn):
    fresh(); coops.reset_mats(); coop.PEN = dict(farm_layout.NEW['pen'])
    fn(); light(1, bevel_segments=1)
    for o in bpy.context.scene.objects:          # shingles: plain boxes (their bevels can't be seen from the game's camera)
        if o.name.startswith('sh'):
            for md in [m for m in o.modifiers if m.type == 'BEVEL']: o.modifiers.remove(md)
    if name.startswith('house_'): top_of(name)
    bake_and_export(name)


for k, fn in coops.HOUSES.items(): one('house_' + k, fn)
one('pen_base', coops.pen_base)
one('fence', coops.wood_fence)
one('fence_dx', coops.deluxe_fence)
one('vane', coops.weathervane)
for k in coops.HOUSES: BUDGET['popdoor_' + k] = 900; one('popdoor_' + k, lambda k=k: coops.pop_slider(k))       # the sliding pop doors
names = ['house_' + k for k in coops.HOUSES] + ['pen_base', 'fence', 'fence_dx', 'vane'] + ['popdoor_' + k for k in coops.HOUSES]
write_glb(os.path.join(OUT, 'coops.glb'), names)
for k, v in coops.NESTS.items(): v['block'] = coops.BLOCKS.get(k, [])          # what the birds walk round in front of each house
json.dump(dict(tops=TOPS, lights=coops.LIGHTS, nests=coops.NESTS, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'coops.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
