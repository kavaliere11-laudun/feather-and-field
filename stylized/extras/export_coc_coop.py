"""Export just the Partridge Cochin's coop (the Round Yurt's five looks, its pop door, its gardens) for splicing into
coops.glb (21 Nov 2026, the breed onto the collector's shelf; made as export_sus_coop.py was): export_coops.py's own export (one(): built, baked; the roof's
top and eave for the vane and the Christmas lights) without redoing the others (the exporters don't make byte-identical
models twice). Writes OUT/coc.glb and OUT/coc.json (tops, lights, nests, blocks, pens, stats, the Christmas tree's spots and
eave lights).
Usage: bl/bin/python stylized/extras/export_coc_coop.py OUT
  then: python3 stylized/extras/splice_coops.py web3d/models/coops.glb web3d/models/coops.json OUT/coc.glb OUT/coc.json \
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
BUDGET.update({'house_coc': 12000, 'box_coc': 10000, 'shed_coc': 11000, 'cosy_coc': 15000, 'deluxe_coc': 18000, 'popdoor_coc': 900,
               'pen_t0_coc': 4200, 'pen_t1_coc': 4600, 'pen_t3_coc': 9500, 'pen_t4_coc': 13000})
names = []
one('house_coc', lambda: coops.yurt(2)); names.append('house_coc')
keep = dict(coops.NESTS['house_coc'])
for look, n_ in ((0, 'box_coc'), (1, 'shed_coc'), (3, 'cosy_coc'), (4, 'deluxe_coc')):
    one(n_, lambda look=look, n_=n_: coops.yurt(look, name=n_)); names.append(n_)
    coops.NESTS['house_coc'] = dict(keep)               # (every look writes the same nest under house_coc: the Snug's kept)
# (the birds keep round everything any look has in front: the Rustic's ropes, the carpet's lanterns, the line of cloths)
one('popdoor_coc', lambda: coops.pop_slider('coc')); names.append('popdoor_coc')
for t in (0, 1, 3, 4): one('pen_t%d_coc' % t, lambda t=t: coops.pen_tier(t, 'coc')); names.append('pen_t%d_coc' % t)
write_glb(os.path.join(OUT, 'coc.glb'), names)
nest = dict(coops.NESTS['house_coc']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_coc', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'coc': {t: dict(coops.pen_info(t, 'coc'), play=coops.play_info(t, 'coc')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'coc') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_coc': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'coc': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths={}),
          open(os.path.join(OUT, 'coc.json'), 'w'), indent=1)
print('COC', json.dumps({n: STATS[n] for n in names}))
print('NEST', json.dumps(nest))
