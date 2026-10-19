"""Export the cosy chick (stand and peck) to the Unity pack, adding its colours to Data/palette.json.
Uses the helpers of export_unity.py without re-exporting everything else.  Usage: python export_chick.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'export_unity.py')).read()
head = src[:src.index('# ---- birds:')]
g = {'__file__': os.path.join(HERE, 'export_unity.py'), '__name__': 'export_helpers'}
exec(compile(head, 'export_unity_head', 'exec'), g)
import chick
for pose in ('stand', 'peck'):
    g['reset'](); g['_ff'].clear(); chick._mats.clear()
    chick.build((0, 0, 0), g['math'].radians(-90), pose, seed=3)          # facing Blender -Y: Unity's forward
    for o in g['bpy'].context.scene.objects:
        for md in o.modifiers:
            if md.type == 'SUBSURF': md.levels = md.render_levels = 1
    g['bake_and_export']('chick_%s' % pose, max_faces=1400)
pal_path = os.path.join(g['DATA'], 'palette.json')
pal = json.load(open(pal_path))
have = {m['name']: m for m in pal['materials']}
have.update(g['PALETTE'])
pal['materials'] = sorted(have.values(), key=lambda e: e['name'])
json.dump(pal, open(pal_path, 'w'), indent=1)
print('PALETTE', sorted(g['PALETTE']))
