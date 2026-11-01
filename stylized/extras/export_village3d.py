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
import village3d, webglb
# the greenhouse's glass: its own 'glass' material (see-through in the browser: main.js makes decor.glb's 'glass' clear)
webglb.BUCKETS['glass'] = (0.12, 0.0); _bucket = webglb.bucket_of
def _bucket_glass(m):
    if m is not None and m.name.split('.')[0].replace('FF_', '').rstrip('_012') in ('ghglass',) or (m is not None and m.name.split('.')[0].startswith('FF_ghglass')):
        b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
        return 'glass', (list(b.inputs['Base Color'].default_value)[:3] if b else [0.85, 0.93, 0.9])
    return _bucket(m)
webglb.bucket_of = _bucket_glass
BUILD = {'farmhouse': (village3d.farmhouse, 22000), 'windmill': (village3d.windmill_dec, 26000), 'sails': (village3d.windmill_sails, 4000), 'bandstand': (village3d.bandstand_dec, 22000),
         'greenhouse': (village3d.greenhouse_dec, 24000),
         'statue': (village3d.statue_dec, 26000),
         'beehives': (village3d.beehives_dec, 16000),
         'flowers': (village3d.flowers_dec, 16000), 'birdbath': (village3d.birdbath_dec, 9000),
         'duckhouse': (village3d.duckhouse_dec, 9000),
         'bench': (village3d.bench_v, 3000), 'lamp_post': (village3d.lamp_post_v, 2500), 'well': (village3d.well_v, 9000),
         'egg_stall': (village3d.egg_stall_v, 9000), 'bridge': (village3d.bridge_v, 6000),
         'barrels': (village3d.barrels_v, 7000), 'wheelbarrow': (village3d.wheelbarrow_v, 6000), 'scarecrow': (village3d.scarecrow_v, 5000),
         'log_pile': (village3d.log_pile_v, 3000), 'dock': (village3d.dock_v, 5000),
         'hay_stack': (village3d.hay_stack_v, 4000), 'round_bale': (village3d.round_bale_v, 3000), 'flower_pots': (village3d.flower_pots_v, 4000),
         'planter': (village3d.planter_v, 5000), 'veg_patch': (lambda: village3d.veg_patch_v(2.6, 1.8, name='veg_patch'), 14000),
         'veg_patch_sq': (lambda: village3d.veg_patch_v(2.4, 2.4, name='veg_patch_sq'), 14000)}
names = []
for n in WANT:
    fn, budget = BUILD[n]; BUDGET[n] = budget; one(n, fn); names.append(n)
write_glb(os.path.join(OUT, 'village3d.glb'), names)
json.dump(dict(names=names, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'village3d.json'), 'w'), indent=1)
print('VILLAGE3D', json.dumps({n: STATS[n] for n in names}))
