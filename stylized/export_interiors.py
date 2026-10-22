"""Export the inside of each coop style for the browser's night view (interiors.glb + interiors.json: perches, nest boxes,
the chicks' corner, the lantern, the window). Usage: python export_interiors.py [out_dir]"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import interiors, coop
GLOW.update({'lamp'}); SKIES.update({'nightsky'})          # the lantern and the night sky in the window glow of themselves
for k in interiors.STYLES: BUDGET['inside_' + k] = 14000


def one(name, fn):
    fresh(); interiors.reset_mats()
    fn(); light(1, bevel_segments=1)
    bake_and_export(name)


for k in interiors.STYLES: one('inside_' + k, lambda k=k: interiors.room(k))
names = ['inside_' + k for k in interiors.STYLES]
write_glb(os.path.join(OUT, 'interiors.glb'), names)
json.dump(dict(rooms=interiors.ROOMS, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'interiors.json'), 'w'), indent=1)
print('STATS', json.dumps({n: STATS[n] for n in names}))
