"""Export a themed coop building (13 Nov 2026: coops.py's themed buildings, the winter one first) for splicing into
coops.glb: export_coops.py's own export (one(): built, baked; the roof's top) without redoing the others. Writes
OUT/theme.glb and OUT/theme.json (tops, lights, blocks, stats). Each must keep its breed's nest exactly (checked).
Usage: bl/bin/python stylized/extras/export_theme.py OUT [name,name]   (then: python3 stylized/extras/splice_coops.py ...)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
WANT = sys.argv[2].split(',') if len(sys.argv) > 2 else None
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
G['GLOW'].update({'wc_glow'})                             # (the chalet's windows glow at night, with its lantern)
THEMES = {'theme_winter_rir': (lambda: coops.winter_chalet(name='theme_winter_rir', house='rir', FL=0.40, wx=0.445, ramp=0.67), 16000, 'rir')}
NEST0 = json.load(open(os.path.join(HERE, '..', 'web3d', 'models', 'coops.json')))['nests']
names = []
for n, (fn, budget, house) in THEMES.items():
    if WANT and n not in WANT: continue
    BUDGET[n] = budget; one(n, fn); names.append(n)
    was = {k: v for k, v in NEST0['house_' + house].items() if k != 'block'}
    assert coops.NESTS['house_' + house] == was, ('the themed building must keep its breed\'s nest', n, coops.NESTS['house_' + house], was)
write_glb(os.path.join(OUT, 'theme.glb'), names)
lights = {k: [list(t) for t in dict.fromkeys(tuple(x) for x in v)] for k, v in coops.LIGHTS.items() if k in names}
json.dump(dict(names=names, tops={k: v for k, v in G['TOPS'].items() if k in names}, lights=lights, nests={},
               blocks={k: v for k, v in coops.BLOCKS.items() if k in names}, pens={}, stats={n: STATS[n] for n in names}, paths={}, xmas_tree={}, xmas_lights={}),
          open(os.path.join(OUT, 'theme.json'), 'w'), indent=1)
print('THEME', json.dumps({n: STATS[n] for n in names}))
