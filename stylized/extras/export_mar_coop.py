"""Export just the Black Copper Marans' coop (the French Farmhouse's five looks, its pop door, its gardens) for splicing into
coops.glb (21 Nov 2026, the breed into the game at level 21; made as export_sus_coop.py was): export_coops.py's own export (one(): built, baked; the roof's
top and eave for the vane and the Christmas lights) without redoing the others (the exporters don't make byte-identical
models twice). Writes OUT/mar.glb and OUT/mar.json (tops, lights, nests, blocks, pens, stats, the Christmas tree's spots and
eave lights).
Usage: bl/bin/python stylized/extras/export_mar_coop.py OUT
  then: python3 stylized/extras/splice_coops.py web3d/models/coops.glb web3d/models/coops.json OUT/mar.glb OUT/mar.json \
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
BUDGET.update({'house_mar': 17500, 'box_mar': 15000, 'shed_mar': 15500, 'cosy_mar': 21500, 'deluxe_mar': 24500, 'popdoor_mar': 900,
               'pen_t0_mar': 4200, 'pen_t1_mar': 4600, 'pen_t3_mar': 9500, 'pen_t4_mar': 13000})
names = []
one('house_mar', lambda: coops.marans(2)); names.append('house_mar')
keep = dict(coops.NESTS['house_mar'])
for look, n_ in ((0, 'box_mar'), (1, 'shed_mar'), (3, 'cosy_mar'), (4, 'deluxe_mar')):
    one(n_, lambda look=look, n_=n_: coops.marans(look, name=n_)); names.append(n_)
    coops.NESTS['house_mar'] = dict(keep)               # (every look writes the same nest under house_mar: the Snug's kept)
# (the birds keep round everything any look has in front: the Rustic's cart wheel, the pergola's posts, the letter box)
one('popdoor_mar', lambda: coops.pop_slider('mar')); names.append('popdoor_mar')
for t in (0, 1, 3, 4): one('pen_t%d_mar' % t, lambda t=t: coops.pen_tier(t, 'mar')); names.append('pen_t%d_mar' % t)
write_glb(os.path.join(OUT, 'mar.glb'), names)
nest = dict(coops.NESTS['house_mar']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_mar', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'mar': {t: dict(coops.pen_info(t, 'mar'), play=coops.play_info(t, 'mar')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'mar') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_mar': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'mar': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths={}),
          open(os.path.join(OUT, 'mar.json'), 'w'), indent=1)
print('MAR', json.dumps({n: STATS[n] for n in names}))
print('NEST', json.dumps(nest))
