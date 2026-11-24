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
sys.path.insert(0, os.path.join(HERE, 'character'))
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
         'veg_patch_sq': (lambda: village3d.veg_patch_v(2.4, 2.4, name='veg_patch_sq'), 14000),
         'bush_a': (lambda: village3d.bush_v(141, 'bush_a'), 4600), 'bush_b': (lambda: village3d.bush_v(148, 'bush_b', flowers=True), 5600),      # (more detail, 6 Nov 2026: were 700, 900)
         'apple_tub': (village3d.apple_tub_v, 7000),      # (the Glutton's apple tree in its tub, 6 Nov 2026)
         'rock_a': (lambda: village3d.rock_v(1, 'rock_a'), 220), 'rock_b': (lambda: village3d.rock_v(2, 'rock_b'), 220),
         'picket_fence': (village3d.picket_fence_v, 1500), 'mushrooms': (village3d.mushrooms_v, 1500), 'sunflowers': (village3d.sunflowers_v, 22000),
         'pasture': (village3d.pasture_v, 6000), 'pasture_shelter': (village3d.pasture_shelter_v, 6000),
         'kennel': (lambda: __import__('beasts').kennel(), 7000),
         'garden': (village3d.garden_v, 14000)}      # (the vegetable garden, 7 Nov 2026: its beds; their signs and crops below)
for _k in ('carrot', 'straw', 'pump', 'lettuce', 'peas', 'corn', 'beet', 'sunf'):      # (the last five: 15 Nov 2026, web3d/models/garden2.glb)
    BUILD['garden_sign_' + _k] = ((lambda k=_k: village3d.garden_sign_v(k, 'garden_sign_' + k)), 1500)
    for _s, _b in ((1, 4000), (2, 9000), (3, 12000)):
        BUILD['garden_%s_%d' % (_k, _s)] = ((lambda k=_k, s=_s: village3d.garden_crop_v(k, s, 'garden_%s_%d' % (k, s))), _b)
BUILD.update({'garden_yard': (village3d.garden_yard_v, 30000), 'potting_shed': (village3d.potting_shed_v, 6000), 'garden_wild': (village3d.garden_wild_v, 2500), 'lock_sign': (lambda: village3d.lock_sign_v(s=1.6), 400), 'garden_ready': (village3d.garden_ready_v, 600), 'garden_free': (village3d.garden_free_v, 200), 'field_ready': (lambda: village3d.garden_ready_v('field_ready', 1.7, -1.5), 600), 'field_free': (lambda: village3d.garden_free_v('field_free', 1.8, -1.45), 200), 'field_wild': (village3d.field_wild_v, 4000)})      # (the kitchen garden's fixed place, 16 Nov 2026)
import grand      # (the grand decorations, 24 Nov 2026: levels 41 to 49; the fountain's water in two parts of its own, moved in the browser)
BUILD.update({'fountain': (lambda: grand.fountain_dec(part='stone'), 30000), 'fountain_pool': (lambda: grand.fountain_dec(part='pool'), 4000),
              'fountain_fall': (lambda: grand.fountain_dec(part='fall'), 4000), 'rose_arbour': (grand.rose_arbour_dec, 40000), 'dovecote': (grand.dovecote_dec, 40000), 'tractor': (grand.tractor_dec, 40000), 'orchard': (grand.orchard_dec, 40000),
              'tree_house': (lambda: grand.tree_house_dec(part='house'), 40000), 'tree_house_swing': (lambda: grand.tree_house_dec(part='swing', name='tree_house_swing'), 1000),
              'hot_air_balloon': (lambda: grand.hot_air_balloon_dec(part='ground'), 6000), 'hot_air_balloon_float': (lambda: grand.hot_air_balloon_dec(part='float', name='hot_air_balloon_float'), 30000), 'hot_air_balloon_flag': (lambda: grand.hot_air_balloon_dec(part='flag', name='hot_air_balloon_flag'), 100)})
names = []
for n in WANT:
    fn, budget = BUILD[n]; BUDGET[n] = budget; one(n, fn); names.append(n)
write_glb(os.path.join(OUT, 'village3d.glb'), names)
json.dump(dict(names=names, stats={n: STATS[n] for n in names}), open(os.path.join(OUT, 'village3d.json'), 'w'), indent=1)
print('VILLAGE3D', json.dumps({n: STATS[n] for n in names}))
