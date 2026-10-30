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
BUDGET.update({'house_rir': 13500, 'house_orp': 12500, 'house_leg': 17000, 'house_sil': 13500, 'house_bra': 14500, 'house_pol': 17000, 'sails_pol': 2600, 'house_aya': 17000, 'house_call': 17000,
               'pen_base': 5000, 'fence': 3500, 'fence_dx': 9000, 'vane': 900})
TOPS = {}


LEAN_TO = {'shed_rir'}                     # (a roof of one slope: its top is its high back edge, not its middle)


def top_of(name):
    """The highest point near the middle of the roof (not a chimney), in glTF axes."""
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); best = None
    wy = 1.5 if name in LEAN_TO else 0.2
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        me = o.evaluated_get(dg).to_mesh()
        for v in me.vertices:
            p = o.matrix_world @ v.co
            if abs(p.x) < 0.2 and abs(p.y) < wy and (best is None or p.z > best.z + 0.01 or (p.z > best.z - 0.01 and abs(p.x) + abs(p.y) < abs(best.x) + abs(best.y))): best = p.copy()
    TOPS[name] = [round(best.x, 4), round(best.z, 4), round(-best.y, 4)]


EAVES = {}
NOT_EAVES = {'lantern', 'lanternb', 'lanterng', 'lcap', 'larm', 'lroof', 'lpost', 'lchain', 'lamp', 'bhouse', 'broof', 'bhole', 'bperch',
             'dpole', 'dbox', 'droof', 'dledge', 'dhole', 'dgable', 'dove', 'dovehead', 'dovebeak', 'wsprig', 'wcone', 'wbow', 'wknot',
             'plant', 'pot', 'flower', 'leafp', 'hleaf', 'hydr', 'crown', 'apple', 'trunk', 'swbar'}      # (in front of a roof, not its eave)


def eave_of(name):
    """The Christmas dress's fairy lights along a house's front eave: rays straight down across the front of its roof find
    the eave's front edge at each x (a lantern or a pot in front left out: each point near its neighbours'), the bulbs
    hung under it in little swags (glTF axes; where the edge breaks, so does the string: a porch hood has its own)."""
    from mathutils import Vector
    import statistics
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); scn = bpy.context.scene
    W = coops.W2 + 0.1; N = 30; edge = []
    for i in range(N + 1):
        x = -W + i * 2 * W / N; e = None
        for j in range(100):
            y = -1.35 + j * 0.0135; z0 = 6.0
            for _ in range(6):                                     # (looking past a lantern, its post, a birdhouse, a dovecote...)
                hit, loc, nrm, idx, ob, mw = scn.ray_cast(dg, Vector((x, y, z0)), Vector((0, 0, -1)))
                if not (hit and ob and ob.name.split('.')[0] in NOT_EAVES): break
                z0 = loc.z - 0.002
            if hit and loc.z > 0.55 and nrm.z > 0.2: e = loc.copy(); break
        edge.append(e)
    keep = []
    for i, e in enumerate(edge):                                   # (each point near its neighbours: a lantern's top isn't an eave)
        near = [q for q in edge[max(0, i - 3):i + 4] if q is not None]
        if e is None or len(near) < 4: keep.append(None); continue
        my, mz = statistics.median(q.y for q in near), statistics.median(q.z for q in near)
        keep.append(e if abs(e.y - my) < 0.04 and abs(e.z - mz) < 0.05 else None)
    bulbs = []; run = []
    def flush():
        if len(run) < 3: return
        L = sum((b - a).length for a, b in zip(run, run[1:])); n = max(2, int(L / 0.065)); hooks = max(1, round(L / 0.24))
        for k in range(n + 1):
            u = k / n; d = u * L; acc = 0.0
            for a, b in zip(run, run[1:]):
                sl = (b - a).length
                if acc + sl >= d - 1e-9:
                    q = a.lerp(b, (d - acc) / sl if sl else 0); break
                acc += sl
            sw = 0.03 + 0.035 * math.sin(math.pi * ((u * hooks) % 1.0))
            bulbs.append([round(q.x, 3), round(q.z - sw, 3), round(-(q.y - 0.012), 3)])
    for i, e in enumerate(keep):
        if e is not None and run and (abs(e.z - run[-1].z) > 0.08 or abs(e.y - run[-1].y) > 0.08): flush(); run = []
        if e is None: flush(); run = []
        else: run.append(e)
    flush()
    EAVES[name] = bulbs


def one(name, fn):
    fresh(); coops.reset_mats(); coop.PEN = dict(farm_layout.NEW['pen'])
    fn(); light(1, bevel_segments=1)
    for o in bpy.context.scene.objects:          # shingles: plain boxes (their bevels can't be seen from the game's camera)
        if o.name.startswith('sh'):
            for md in [m for m in o.modifiers if m.type == 'BEVEL']: o.modifiers.remove(md)
    if name.startswith(('house_', 'rustic_', 'box_', 'shed_', 'cosy_', 'deluxe_')): top_of(name); eave_of(name)
    bake_and_export(name)


for k, fn in coops.HOUSES.items():
    if k not in coops.LATER: one('house_' + k, fn)                 # (release 7's new coops after the rest: the others' random bits as they were)
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
# the Pagoda's five looks (Rustic box_sil, Mended shed_sil, Snug house_sil, Cosy cosy_sil, Deluxe deluxe_sil: the browser tints
# each in its Silkie colour) and its own gardens
BUDGET.update({'box_sil': 15000, 'shed_sil': 15000, 'cosy_sil': 19500, 'deluxe_sil': 23500, 'pen_t0_sil': 4200, 'pen_t1_sil': 4600, 'pen_t3_sil': 8500, 'pen_t4_sil': 11000})
_keep = dict(coops.NESTS['house_sil'])
for n_, fn in (('box_sil', coops.box_sil), ('shed_sil', coops.shed_sil), ('cosy_sil', coops.cosy_sil), ('deluxe_sil', coops.deluxe_sil)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_sil'] == _keep, 'the looks must keep the Pagoda\'s nest'
for t in (0, 1, 3, 4): one('pen_t%d_sil' % t, lambda t=t: coops.pen_tier(t, 'sil')); LOOKS.append('pen_t%d_sil' % t)
# the Stone Cottage's five looks (Rustic box_leg, Mended shed_leg, Snug house_leg, Cosy cosy_leg, Deluxe deluxe_leg) and its own gardens
BUDGET.update({'box_leg': 16000, 'shed_leg': 19000, 'cosy_leg': 21000, 'deluxe_leg': 24000, 'pen_t0_leg': 4200, 'pen_t1_leg': 4600, 'pen_t3_leg': 8500, 'pen_t4_leg': 11000})
_keep = dict(coops.NESTS['house_leg'])
for n_, fn in (('box_leg', coops.box_leg), ('shed_leg', coops.shed_leg), ('cosy_leg', coops.cosy_leg), ('deluxe_leg', coops.deluxe_leg)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_leg'] == _keep, 'the looks must keep the Stone Cottage\'s nest'
for t in (0, 1, 3, 4): one('pen_t%d_leg' % t, lambda t=t: coops.pen_tier(t, 'leg')); LOOKS.append('pen_t%d_leg' % t)
# the Timber Lodge's five looks (Rustic box_bra, Mended shed_bra, Snug house_bra, Cosy cosy_bra, Deluxe deluxe_bra) and its own gardens
BUDGET.update({'box_bra': 17000, 'shed_bra': 17000, 'cosy_bra': 21000, 'deluxe_bra': 25000, 'pen_t0_bra': 4200, 'pen_t1_bra': 4600, 'pen_t3_bra': 8500, 'pen_t4_bra': 11000})
_keep = dict(coops.NESTS['house_bra'])
for n_, fn in (('box_bra', coops.box_bra), ('shed_bra', coops.shed_bra), ('cosy_bra', coops.cosy_bra), ('deluxe_bra', coops.deluxe_bra)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_bra'] == _keep, 'the looks must keep the Timber Lodge\'s nest'
for t in (0, 1, 3, 4): one('pen_t%d_bra' % t, lambda t=t: coops.pen_tier(t, 'bra')); LOOKS.append('pen_t%d_bra' % t)
# release 7: the Little Windmill (the Polish's coop) and its sails (their own model: the browser turns them at the hub,
# coops.json mills)
for k in coops.LATER: one('house_' + k, coops.HOUSES[k])
one('sails_pol', coops.mill_sails); LOOKS.append('sails_pol')
# its five looks (Rustic box_pol, Mended shed_pol, Snug house_pol, Cosy cosy_pol, Deluxe deluxe_pol), its other sails (the
# Mended's first bare pair, the Deluxe's bigger ones with red stocks) and its own gardens
BUDGET.update({'box_pol': 15000, 'shed_pol': 17000, 'cosy_pol': 21000, 'deluxe_pol': 25000, 'sails_pol_t1': 1400, 'sails_pol_dx': 2800,
               'pen_t0_pol': 4200, 'pen_t1_pol': 4600, 'pen_t3_pol': 9000, 'pen_t4_pol': 11500})
_keep = dict(coops.NESTS['house_pol'])
for n_, fn in (('box_pol', coops.box_pol), ('shed_pol', coops.shed_pol), ('cosy_pol', coops.cosy_pol), ('deluxe_pol', coops.deluxe_pol)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_pol'] == _keep, 'the looks must keep the Little Windmill\'s nest'
one('sails_pol_t1', lambda: coops.mill_sails(name='sails_pol_t1', canvas=(), broken=(1, 3), lat_c='#d8b886', stock_c='#cba872', R=0.6, width=0.18))
one('sails_pol_dx', lambda: coops.mill_sails(name='sails_pol_dx', stock_c='#9e3b2e', R=1.0, width=0.28)); LOOKS += ['sails_pol_t1', 'sails_pol_dx']
BUDGET['sails_pol_cosy'] = 2800; one('sails_pol_cosy', lambda: coops.mill_sails(name='sails_pol_cosy', stripe='#c8283c')); LOOKS.append('sails_pol_cosy')     # (the Cosy's striped canvas)
# the Javanese House's five looks (Rustic box_aya, Mended shed_aya, Snug house_aya, Cosy cosy_aya, Deluxe deluxe_aya) and its own gardens
BUDGET.update({'box_aya': 16000, 'shed_aya': 18000, 'cosy_aya': 22000, 'deluxe_aya': 25000, 'pen_t0_aya': 4200, 'pen_t1_aya': 4600, 'pen_t3_aya': 9500, 'pen_t4_aya': 12000})
_keep = dict(coops.NESTS['house_aya'])
for n_, fn in (('box_aya', coops.box_aya), ('shed_aya', coops.shed_aya), ('cosy_aya', coops.cosy_aya), ('deluxe_aya', coops.deluxe_aya)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_aya'] == _keep, 'the looks must keep the Javanese House\'s nest'
for t in (0, 1, 3, 4): one('pen_t%d_aya' % t, lambda t=t: coops.pen_tier(t, 'aya')); LOOKS.append('pen_t%d_aya' % t)
for t in (0, 1, 3, 4): one('pen_t%d_pol' % t, lambda t=t: coops.pen_tier(t, 'pol')); LOOKS.append('pen_t%d_pol' % t)
# the call ducks' Floating House (30 Oct 2026): its five looks (Rustic box_call, Mended shed_call, Snug house_call, Cosy
# cosy_call, Deluxe deluxe_call) and its own yards, the Snug's too (pen_t2_call: its pond where the shared yard has straw);
# coops.json paths: the Deluxe's way in over Monet's bridge. (stylized/extras/export_call.py exports just these to splice in)
BUDGET.update({'box_call': 15000, 'shed_call': 17000, 'cosy_call': 21000, 'deluxe_call': 26000, 'pen_t0_call': 4200, 'pen_t1_call': 4600,
               'pen_t2_call': 5200, 'pen_t3_call': 8500, 'pen_t4_call': 11000})
_keep = dict(coops.NESTS['house_call'])
for n_, fn in (('box_call', coops.box_call), ('shed_call', coops.shed_call), ('cosy_call', coops.cosy_call), ('deluxe_call', coops.deluxe_call)): one(n_, fn); LOOKS.append(n_)
assert coops.NESTS['house_call'] == _keep, "the looks must keep the Floating House's nest"
for t in range(5): one('pen_t%d_call' % t, lambda t=t: coops.pen_tier(t, 'call')); LOOKS.append('pen_t%d_call' % t)
# the Christmas dress (seasonal, release 4): each pen's garland, lights, bows and wreaths, the tree, the star on the roof
GLOWC.update({'xlight%d' % i for i in range(len(coops.XLIGHTS))}); GLOW.add('xm_star')
BUDGET.update({'xmas_fence_t%d' % t: 7000 for t in range(5)}); BUDGET.update({'xmas_tree': 3200, 'xmas_star': 300})
for t in range(5): one('xmas_fence_t%d' % t, lambda t=t: coops.xmas_fence(t)); LOOKS.append('xmas_fence_t%d' % t)
one('xmas_tree', coops.xmas_tree); one('xmas_star', coops.xmas_star); LOOKS += ['xmas_tree', 'xmas_star']
PENS = {k: {t: dict(coops.pen_info(t, k), play=coops.play_info(t, k)) for t in range(5)} for k in coops.PENS_BY}       # each breed's pens by look          # each look's pen for the birds (glTF axes)
names = LOOKS + ['house_' + k for k in coops.HOUSES] + ['pen_base', 'fence', 'fence_dx', 'vane', 'rustic_rir', 'fence_rustic'] + ['rustic_' + k for k in RUSTIC_K] + ['popdoor_' + k for k in coops.HOUSES]
write_glb(os.path.join(OUT, 'coops.glb'), names)
for k, v in coops.NESTS.items(): v['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get(k, []))]          # what the birds walk round in front of each house (once each: the rustic barn builds the Red Barn again)
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items()}      # (once each: a rustic house builds its house again)
DRESS = {'xmas': dict(tree_r=coops.XMAS_TREE_R, tree={k: {t: coops.xmas_tree_spot(t, k) for t in range(5)} for k in coops.PENS_BY}, lights=EAVES)}
print('XMAS LIGHTS', json.dumps({k: len(v) for k, v in EAVES.items()}))
print('XMAS TREES', json.dumps(DRESS['xmas']['tree']))
json.dump(dict(tops=TOPS, lights=lights, nests=coops.NESTS, mills=coops.MILLS, dress=DRESS, blocks={k: v for k, v in coops.BLOCKS.items() if not k.startswith('house_')}, pens=PENS, stats={n: STATS[n] for n in names}, paths=coops.FLOAT_PATH, **coops.float_info()), open(os.path.join(OUT, 'coops.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
