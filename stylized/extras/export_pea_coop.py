"""Export just the peafowl's coop (the Garden Pavilion's five looks, its pop door, its gardens) for splicing into coops.glb:
export_coops.py's own export (one(): built, baked; the roof's top and eave for the vane and the Christmas lights) without
redoing the others (the exporters don't make byte-identical models twice). Writes OUT/pea.glb and OUT/pea.json (tops,
lights, nests, blocks, pens, stats, the Christmas tree's spots and eave lights).
Usage: bl/bin/python stylized/extras/export_pea_coop.py OUT   (then: python3 stylized/extras/splice_coops.py ...)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
BUDGET.update({'house_pea': 17000, 'box_pea': 16000, 'shed_pea': 18000, 'cosy_pea': 22000, 'deluxe_pea': 26000, 'popdoor_pea': 900,
               'pen_t0_pea': 4200, 'pen_t1_pea': 4600, 'pen_t3_pea': 9500, 'pen_t4_pea': 12000})
names = []
one('house_pea', coops.pavilion); names.append('house_pea')
keep = dict(coops.NESTS['house_pea']); keep_blocks = list(coops.BLOCKS.get('house_pea', []))
for n_, fn in (('box_pea', coops.box_pea), ('shed_pea', coops.shed_pea), ('cosy_pea', coops.cosy_pea), ('deluxe_pea', coops.deluxe_pea)):
    one(n_, fn); names.append(n_)
assert coops.NESTS['house_pea'] == keep, "the looks must keep the Garden Pavilion's nest"
coops.BLOCKS['house_pea'] = keep_blocks
one('popdoor_pea', lambda: coops.pop_slider('pea')); names.append('popdoor_pea')
for t in (0, 1, 3, 4): one('pen_t%d_pea' % t, lambda t=t: coops.pen_tier(t, 'pea')); names.append('pen_t%d_pea' % t)
BUDGET.update({'fence_t0_pea': 3000, 'fence_t1_pea': 3800})
for t in (0, 1): one('fence_t%d_pea' % t, lambda t=t: coops.fence_tier(t, bk='pea')); names.append('fence_t%d_pea' % t)      # (its bigger Rustic and Mended yards' fences)
write_glb(os.path.join(OUT, 'pea.glb'), names)
nest = dict(coops.NESTS['house_pea']); nest['block'] = [list(t) for t in dict.fromkeys(tuple(x) for x in coops.BLOCKS.get('house_pea', []))]
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
pens = {'pea': {t: dict(coops.pen_info(t, 'pea'), play=coops.play_info(t, 'pea')) for t in range(5)}}
tree = {t: coops.xmas_tree_spot(t, 'pea') for t in range(5)}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={'house_pea': nest},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names and not k.startswith('house_')}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={'pea': tree}, xmas_lights={k: v for k, v in G['EAVES'].items() if k in names}, paths={}),
          open(os.path.join(OUT, 'pea.json'), 'w'), indent=1)
print('PEA', json.dumps({n: STATS[n] for n in names}))
