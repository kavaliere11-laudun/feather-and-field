"""Export just the peafowl (the peahen and the peacock, and their light versions) for splicing into flock.glb: export_birds.py's
own bake without redoing the others (the exporters don't make byte-identical models twice). The peacock's train fanned is a
morph target of the same mesh (breeds.FAN: the same feathers in the same order, raised in a fan), so the browser can show
him off: POSITION and NORMAL deltas, its weight 0 (trailing) .. 1 (fanned).
Usage: bl/bin/python stylized/extras/export_pea.py OUT   (writes OUT/flock.glb, OUT/flock.json; then splice_birds.py ... pea_)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else sys.argv[1]; os.makedirs(OUT, exist_ok=True)
src = open(os.path.join(HERE, 'export_birds.py')).read()
head = src[:src.index("LOW = {'h'")]
head = head.replace("    first = np.zeros(len(uniq), dtype=np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]\n",
                    "    first = np.zeros(len(uniq), dtype=np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]\n    LASTB.clear(); LASTB.update(P=P, N=N, first=first)\n")
head = head.replace("                  _FEAT=acc(pr['feat'].tobytes(), 5121, len(pos), 'VEC2', normalized=True))\n",
                    "                  _FEAT=acc(pr['feat'].tobytes(), 5121, len(pos), 'VEC2', normalized=True))\n"
                    "        tg = [dict(POSITION=acc(pr['fan'].tobytes(), 5126, len(pos), 'VEC3', min=[float(x) for x in pr['fan'].min(0)], max=[float(x) for x in pr['fan'].max(0)]), NORMAL=acc(pr['fann'].tobytes(), 5126, len(pos), 'VEC3'))] if 'fan' in pr else None\n")
head = head.replace("        meshes.append(dict(name=name, primitives=[dict(attributes=at, indices=a_idx, material=0)])); nodes.append(dict(name=name, mesh=len(meshes) - 1))",
                    "        prim = dict(attributes=at, indices=a_idx, material=0)\n        if tg: prim['targets'] = tg\n        meshes.append(dict(name=name, primitives=[prim], **(dict(weights=[0.0], extras=dict(targetNames=['fan'])) if tg else {}))); nodes.append(dict(name=name, mesh=len(meshes) - 1))")
assert 'LASTB.update' in head and "prim['targets']" in head
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_birds_head', '__file__': os.path.join(HERE, 'export_birds.py'), 'LASTB': {}}
exec(compile(head, 'export_birds_head', 'exec'), G)
breeds = G['breeds']; bake_bird = G['bake_bird']; fresh = G['fresh']; light = G['light']; MODELS = G['MODELS']; PIVOTS = G['PIVOTS']; STATS = G['STATS']
LASTB = G['LASTB']; np = G['np']
BUD = {'h': 3600, 'r': 4200}; LOWB = {'h': 1500, 'r': 2600}      # (the peacock's train feathers are kept whole: on top of these)
names = []
for sx in ('h', 'r'):
    for lo in (False, True):
        nm = 'pea_%s' % sx + ('_lo' if lo else '')
        breeds.FAN = False; fresh(); r = breeds.build('pea', sx, seed=3, lo=lo); light(1)
        bake_bird(nm, r, LOWB[sx] if lo else BUD[sx], *((20, 0.02) if lo else ())); names.append(nm)
        if sx == 'r':                                   # the fan: the same bake with the train raised, as a morph of this one
            P0, first = LASTB['P'], LASTB['first']; piv = dict(PIVOTS[nm]); st = dict(STATS[nm])
            breeds.FAN = True; fresh(); r = breeds.build('pea', sx, seed=3, lo=lo); light(1)
            bake_bird(nm + '_fantmp', r, LOWB[sx] if lo else BUD[sx], *((20, 0.02) if lo else ()))
            P1, N1 = LASTB['P'], LASTB['N']
            assert len(P1) == len(P0), ('the fan must have the same corners', len(P1), len(P0))
            pr = MODELS[nm][0]
            pr['fan'] = (P1[first] - P0[first]).astype(np.float32)
            nn = N1[first]; pr['fann'] = (nn - pr['nrm']).astype(np.float32)
            del MODELS[nm + '_fantmp']; PIVOTS.pop(nm + '_fantmp', None); STATS.pop(nm + '_fantmp', None); PIVOTS[nm] = piv; STATS[nm] = st
            moved = np.linalg.norm(pr['fan'], axis=1); print('FAN', nm, 'moved', int((moved > 1e-4).sum()), 'of', len(moved), 'max', round(float(moved.max()), 3))
breeds.FAN = False
G['write_bird_glb'](os.path.join(OUT, 'flock.glb'), names)
json.dump(dict(joints=G['JOINTS'], paint=breeds.PAINT, models={n: PIVOTS[n] for n in names}, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'flock.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
