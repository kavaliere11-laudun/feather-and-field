"""Export just the Speckled Sussex's coop (the Village Cottage's five looks, its pop door, its gardens) for splicing into
coops.glb (21 Nov 2026, the breed into the game at level 12): export_coops.py's own export (one(): built, baked; the roof's
top and eave for the vane and the Christmas lights) without redoing the others (the exporters don't make byte-identical
models twice). Writes OUT/sus.glb and OUT/sus.json (tops, lights, nests, blocks, pens, stats, the Christmas tree's spots and
eave lights).
Usage: bl/bin/python stylized/extras/export_sus_coop.py OUT
  then: python3 stylized/extras/splice_coops.py web3d/models/coops.glb web3d/models/coops.json OUT/sus.glb OUT/sus.json \
        web3d/models/coops.glb web3d/models/coops.json"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
BUDGET.update({'house_sus': 17000, 'box_sus': 15000, 'shed_sus': 16000, 'cosy_sus': 20000, 'deluxe_sus': 24000, 'popdoor_sus': 900,
               'pen_t0_sus': 4200, 'pen_t1_sus': 4600, 'pen_t3_sus': 9500, 'pen_t4_sus': 12500})
names = []
one('house_sus', lambda: coops.sussex(2)); names.append('house_sus')
keep = dict(coops.NESTS['house_sus'])
for look, n_ in ((0, 'box_sus'), (1, 'shed_sus'), (3, 'cosy_sus'), (4, 'deluxe_sus')):
    one(n_, lambda look=look, n_=n_: coops.sussex(look, name=n_)); names.append(n_)
    coops.NESTS['house_sus'] = dict(keep)               # (every look writes the same nest under house_sus: the Snug's kept)
# (the birds keep round everything any look has in front: the Rustic's tarpaulin, the porch's posts, the pillar box)
one('popdoor_sus', lambda: coops.pop_slider('sus')); names.append('popdoor_sus')
for t in (0, 1, 3, 4): one('pen_t%d_sus' % t, lambda t=t: coops.pen_tier(t, 'sus')); names.append('pen_t%d_sus' % t)
write_glb(os.path.join(OUT, 'sus.glb'), names)
nest = dict(coops.NESTS['house_sus']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_sus', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'sus': {t: dict(coops.pen_info(t, 'sus'), play=coops.play_info(t, 'sus')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'sus') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_sus': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'sus': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths={}),
          open(os.path.join(OUT, 'sus.json'), 'w'), indent=1)
print('SUS', json.dumps({n: STATS[n] for n in names}))
print('NEST', json.dumps(nest))
