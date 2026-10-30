"""Export just the call ducks' coop (the Floating House's five looks, its pop door, its yards) for splicing into coops.glb:
export_coops.py's own export (one(): built, baked; the roof's top and eave for the vane and the Christmas lights) without
redoing the others (the exporters don't make byte-identical models twice). Writes OUT/call.glb and OUT/call.json (tops,
lights, nests, blocks, pens, stats, the Christmas tree's spots and eave lights, the ducks' paths).
Usage: bl/bin/python stylized/extras/export_call.py OUT   (then: python3 stylized/extras/splice_coops.py ...)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
BUDGET.update({'house_call': 17000, 'box_call': 15000, 'shed_call': 17000, 'cosy_call': 21000, 'deluxe_call': 26000, 'popdoor_call': 900,
               'pen_t0_call': 4200, 'pen_t1_call': 4600, 'pen_t2_call': 5200, 'pen_t3_call': 8500, 'pen_t4_call': 11000})
names = []
one('house_call', coops.floating); names.append('house_call')
keep = dict(coops.NESTS['house_call']); keep_blocks = list(coops.BLOCKS.get('house_call', []))
for n_, fn in (('box_call', coops.box_call), ('shed_call', coops.shed_call), ('cosy_call', coops.cosy_call), ('deluxe_call', coops.deluxe_call)):
    one(n_, fn); names.append(n_)
assert coops.NESTS['house_call'] == keep, "the looks must keep the Floating House's nest"
coops.BLOCKS['house_call'] = keep_blocks
one('popdoor_call', lambda: coops.pop_slider('call')); names.append('popdoor_call')
for t in range(5): one('pen_t%d_call' % t, lambda t=t: coops.pen_tier(t, 'call')); names.append('pen_t%d_call' % t)
write_glb(os.path.join(OUT, 'call.glb'), names)
nest = dict(coops.NESTS['house_call']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_call', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'call': {t: dict(coops.pen_info(t, 'call'), play=coops.play_info(t, 'call')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'call') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_call': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'call': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths=coops.FLOAT_PATH),
          open(os.path.join(OUT, 'call.json'), 'w'), indent=1)
print('CALL', json.dumps({n: STATS[n] for n in names}))
