"""Export just the Lavender Araucana's coop (the Mountain Hut's five looks, its pop door, its gardens) for splicing into
coops.glb (21 Nov 2026, the breed onto the collector's shelf; made as export_sus_coop.py was): export_coops.py's own export (one(): built, baked; the roof's
top and eave for the vane and the Christmas lights) without redoing the others (the exporters don't make byte-identical
models twice). Writes OUT/ara.glb and OUT/ara.json (tops, lights, nests, blocks, pens, stats, the Christmas tree's spots and
eave lights).
Usage: bl/bin/python stylized/extras/export_ara_coop.py OUT
  then: python3 stylized/extras/splice_coops.py web3d/models/coops.glb web3d/models/coops.json OUT/ara.glb OUT/ara.json \
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
BUDGET.update({'house_ara': 16500, 'box_ara': 14000, 'shed_ara': 15000, 'cosy_ara': 20000, 'deluxe_ara': 24000, 'popdoor_ara': 900,
               'pen_t0_ara': 4200, 'pen_t1_ara': 4600, 'pen_t3_ara': 9500, 'pen_t4_ara': 13000})
names = []
one('house_ara', lambda: coops.andes(2)); names.append('house_ara')
keep = dict(coops.NESTS['house_ara'])
for look, n_ in ((0, 'box_ara'), (1, 'shed_ara'), (3, 'cosy_ara'), (4, 'deluxe_ara')):
    one(n_, lambda look=look, n_=n_: coops.andes(look, name=n_)); names.append(n_)
    coops.NESTS['house_ara'] = dict(keep)               # (every look writes the same nest under house_ara: the Snug's kept)
# (the birds keep round everything any look has in front: the Rustic's blanket, the veranda's posts, the monkey puzzle)
one('popdoor_ara', lambda: coops.pop_slider('ara')); names.append('popdoor_ara')
for t in (0, 1, 3, 4): one('pen_t%d_ara' % t, lambda t=t: coops.pen_tier(t, 'ara')); names.append('pen_t%d_ara' % t)
write_glb(os.path.join(OUT, 'ara.glb'), names)
nest = dict(coops.NESTS['house_ara']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_ara', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'ara': {t: dict(coops.pen_info(t, 'ara'), play=coops.play_info(t, 'ara')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'ara') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_ara': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'ara': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths={}),
          open(os.path.join(OUT, 'ara.json'), 'w'), indent=1)
print('ARA', json.dumps({n: STATS[n] for n in names}))
print('NEST', json.dumps(nest))
