"""Export the village's rebuilt models (stylized/village3d.py: the farmhouse; then the decorations) with the coops' own
export (export_coops.py's head: built, lit, baked), for splicing into village.glb or decor.glb (splice_named.py).
Usage: bl/bin/python stylized/extras/export_village3d.py OUT name[,name]   (writes OUT/village3d.glb and OUT/village3d.json)"""
import os, sys, json
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
WANT = sys.argv[2].split(',') if len(sys.argv) > 2 else ['farmhouse']
src = open(os.path.join(HERE, 'export_coops.py')).read()
head = src[:src.index('for k, fn in coops.HOUSES.items():')]
sys.argv = [sys.argv[0], OUT]
G = {'__name__': 'export_coops_head', '__file__': os.path.join(HERE, 'export_coops.py')}
exec(compile(head, 'export_coops_head', 'exec'), G)
one = G['one']; BUDGET = G['BUDGET']; STATS = G['STATS']; write_glb = G['write_glb']
G['WINDOWS'].update({'glass'}); G['GLOW'].update({'lamp'})      # (the farmhouse's windows glow at night, its lantern lights up)
import village3d
BUILD = {'farmhouse': (village3d.farmhouse, 22000), 'windmill': (village3d.windmill_dec, 26000), 'sails': (village3d.windmill_sails, 4000)}
names = []
for n in WANT:
    fn, budget = BUILD[n]; BUDGET[n] = budget; one(n, fn); names.append(n)
write_glb(os.path.join(OUT, 'village3d.glb'), names)
json.dump(dict(names=names, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'village3d.json'), 'w'), indent=1)
print('VILLAGE3D', json.dumps({n: STATS[n] for n in names}))
