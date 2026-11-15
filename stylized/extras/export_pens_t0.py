"""Export just the Rustic yards (pen_t0, its fence, its Christmas fence, each breed's own pen_t0_<k>) for splicing into
coops.glb (15 Nov 2026: the Rustic yard made as big as the Mended's), with their pens' info (the Christmas trees keep their spots: they stood inside the smaller yard).
Usage: bl/bin/python stylized/extras/export_pens_t0.py OUT   (then: python3 stylized/extras/splice_coops.py ...)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
coops = G['coops']; one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
KS = ('orp', 'sil', 'leg', 'bra', 'pol', 'aya', 'call')
BUDGET.update({'pen_t0': 4200, 'fence_t0': 3300, 'xmas_fence_t0': 7000}); BUDGET.update({'pen_t0_' + k: 4200 for k in KS})
G['GLOWC'].update({'xlight%d' % i for i in range(len(coops.XLIGHTS))})
names = ['pen_t0', 'fence_t0', 'xmas_fence_t0'] + ['pen_t0_' + k for k in KS]
one('pen_t0', lambda: coops.pen_tier(0)); one('fence_t0', lambda: coops.fence_tier(0)); one('xmas_fence_t0', lambda: coops.xmas_fence(0))
for k in KS: one('pen_t0_' + k, lambda k=k: coops.pen_tier(0, k))
write_glb(os.path.join(OUT, 'pens.glb'), names)
BK = ('rir',) + KS
pens = {k: {t: dict(coops.pen_info(t, k), play=coops.play_info(t, k)) for t in range(5)} for k in BK}
json.dump(dict(names=names, tops={}, lights={}, nests={}, blocks={}, pens=pens, stats={n: STATS[n] for n in names},
               xmas_tree={}, xmas_lights={}, paths={}),
          open(os.path.join(OUT, 'pens.json'), 'w'), indent=1)
print('PENS', json.dumps({n: STATS[n] for n in names}))
