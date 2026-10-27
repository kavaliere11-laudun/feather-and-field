"""Export the coops for the browser (coops.glb + coops.json): the five houses (house_rir .. house_bra) and each as it first
comes, rustic (rustic_rir .. rustic_bra, with the pen's rustic fence, fence_rustic), the shared pen
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
GLOW.update({'lamp', 'lanternred', 'rw_lamp', 'rw_lanternred', 'autoled'})       # the lanterns light up at night (the rustic coops' too)
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
    if name.startswith(('house_', 'rustic_', 'box_', 'shed_', 'cosy_', 'deluxe_')): top_of(name)
    bake_and_export(name)


for k, fn in coops.HOUSES.items(): one('house_' + k, fn)
one('pen_base', coops.pen_base)
one('fence', coops.wood_fence)
one('fence_dx', coops.deluxe_fence)
one('vane', coops.weathervane)
BUDGET.update({'rustic_rir': 14500, 'fence_rustic': 3500})
one('rustic_rir', coops.rustic_barn)                     # a new breed's coop as it first comes (rustic)
one('fence_rustic', coops.rustic_fence)
RUSTIC_K = ['orp', 'leg', 'sil', 'bra']                  # the other breeds' coops as they first come (release 1 step 6)
BUDGET.update({'rustic_orp': 13500, 'rustic_leg': 18000, 'rustic_sil': 14500, 'rustic_bra': 15500})
for k in RUSTIC_K: one('rustic_' + k, lambda k=k: coops.rustic_house(k))
for k in coops.HOUSES: BUDGET['popdoor_' + k] = 900; one('popdoor_' + k, lambda k=k: coops.pop_slider(k))       # the sliding pop doors
# release 4: the Red Barn's five looks (coops.py): Rustic box_rir in pen_t0 + fence_t0, Mended shed_rir (pen_t1, fence_t1),
# Snug house_rir (pen_base, fence), Cosy cosy_rir (pen_t3, fence_t3), Deluxe deluxe_rir (pen_t4, fence_t4: white pickets, roses)
BUDGET.update({'box_rir': 14000, 'shed_rir': 12500, 'cosy_rir': 17000, 'deluxe_rir': 18500, 'pen_t0': 4200, 'pen_t1': 4600, 'pen_t3': 8000,
               'pen_t4': 10500, 'fence_t0': 2600, 'fence_t1': 3300, 'fence_t3': 6500, 'fence_t4': 10500})
_keep = dict(coops.NESTS['house_rir'])
one('box_rir', coops.box_barn); one('shed_rir', coops.shed_barn); one('cosy_rir', coops.cosy_barn); one('deluxe_rir', coops.deluxe_barn)
LOOKS = ['box_rir', 'shed_rir', 'cosy_rir', 'deluxe_rir']
for t in (0, 1, 3, 4):
    one('pen_t%d' % t, lambda t=t: coops.pen_tier(t)); one('fence_t%d' % t, lambda t=t: coops.fence_tier(t)); LOOKS += ['pen_t%d' % t, 'fence_t%d' % t]
assert coops.NESTS['house_rir'] == _keep, 'the looks must keep the barn\'s nest'
BUDGET.update({'swing_seat': 600, 'cabbage': 900})
one('swing_seat', coops.swing_seat); one('cabbage', coops.cabbage); LOOKS += ['swing_seat', 'cabbage']        # (the moving play things)
# the Thatched Cottage's five looks (Rustic box_orp, Mended shed_orp, Snug house_orp, Cosy cosy_orp, Deluxe deluxe_orp) in the same pens
BUDGET.update({'box_orp': 15000, 'shed_orp': 14000, 'cosy_orp': 18500, 'deluxe_orp': 20000})
_keep = dict(coops.NESTS['house_orp'])
for n_, fn in (('box_orp', coops.box_orp), ('shed_orp', coops.shed_orp), ('cosy_orp', coops.cosy_orp), ('deluxe_orp', coops.deluxe_orp)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_orp'] == _keep, 'the looks must keep the cottage\'s nest'
BUDGET.update({'pen_t0_orp': 4200, 'pen_t1_orp': 4600, 'pen_t3_orp': 8500, 'pen_t4_orp': 10500})
for t in (0, 1, 3, 4): one('pen_t%d_orp' % t, lambda t=t: coops.pen_tier(t, 'orp')); LOOKS.append('pen_t%d_orp' % t)      # (its own garden)
PENS = {k: {t: dict(coops.pen_info(t, k), play=coops.play_info(t, k)) for t in range(5)} for k in coops.PENS_BY}       # each breed's pens by look          # each look's pen for the birds (glTF axes)
names = LOOKS + ['house_' + k for k in coops.HOUSES] + ['pen_base', 'fence', 'fence_dx', 'vane', 'rustic_rir', 'fence_rustic'] + ['rustic_' + k for k in RUSTIC_K] + ['popdoor_' + k for k in coops.HOUSES]
write_glb(os.path.join(OUT, 'coops.glb'), names)
for k, v in coops.NESTS.items(): v['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get(k, []))]          # what the birds walk round in front of each house (once each: the rustic barn builds the Red Barn again)
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items()}      # (once each: a rustic house builds its house again)
json.dump(dict(tops=TOPS, lights=lights, nests=coops.NESTS, blocks={k: v for k, v in coops.BLOCKS.items() if not k.startswith('house_')}, pens=PENS, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'coops.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
