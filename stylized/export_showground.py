"""Export the show ground for the browser (showground.glb + showground.json), built by showground.py: the marquee
('show_tent': canvas, valance, poles, guy ropes and pegs, bunting), the trestle table with the six little show coops
('show_pens'), the sign board ('show_sign'), the judge's table ('show_jtable': the rosette box and his tea) and the
clipboard lying on it ('show_clipboard', hidden while he carries his own), and the four rosettes ('rosette_first',
'rosette_second', 'rosette_third', 'rosette_champion'), each with its origin at its pin.
Built facing -Y (glTF +Z): the browser turns it to face the player. showground.json: where things go (the coops ('pens'),
where a bird stands in each, where the judge and the farmer stand, each coop's rosette pin and card, the sign's rectangle
for its words, the footprints), in glTF axes, and the stats.
Usage: ../bl/bin/python export_showground.py [out_dir] [parts...]"""
import os, sys, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import showground as SG

INFO = {}


def one(name, fn):
    fresh(); SG._M.clear()
    out = fn()
    for o in list(bpy.context.scene.objects):                  # curves (the seams, the bunting's string): meshes
        if o.type in ('CURVE', 'META', 'SURFACE', 'FONT'):
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
    light(1, bevel_segments=1)
    bake_and_export(name)
    return out


PARTS = {'show_tent': SG.tent, 'show_pens': SG.pens, 'show_sign': SG.sign, 'show_jtable': SG.judge_table, 'show_clipboard': SG.clipboard}
for k in SG.ROSETTES: PARTS['rosette_' + k] = (lambda k=k: SG.rosette(k))
only = [a for a in sys.argv[2:] if not a.startswith('-')]
for name, fn in PARTS.items():
    if only and name not in only: continue
    INFO[name] = one(name, fn)
names = [n for n in PARTS if n in MODELS]
write_glb(os.path.join(OUT, 'showground.glb'), names)
P = SG.places(SG.sign_rect())
# each rosette: its pin at its origin (put the origin on a pen's 'pin'); its middle that far below and in front; its size
P['rosettes'] = {k: dict(pin=[0, 0, 0], centre=[0, -SG.ROS_DROP, 0.006], r=R['rings'][0][1], tail=R['tail']) for k, R in SG.ROSETTES.items()}
foot = [min(P['tent'][0], P['signFoot'][0]) - 0.0, P['tent'][1], max(P['tent'][2], P['judgeTable']['foot'][2]), max(P['signFoot'][3], P['judgeTable']['foot'][3])]
for x, z in P['pegs']: foot = [min(foot[0], x), min(foot[1], z), max(foot[2], x), max(foot[3], z)]
P['foot'] = [round(v, 3) for v in foot]
P['stats'] = {n: STATS[n] for n in names}
P['stats']['ground'] = sum(STATS[n]['tris'] for n in names if n.startswith('show_'))
json.dump(P, open(os.path.join(OUT, 'showground.json'), 'w'), indent=1)
print('STATS', json.dumps(P['stats']))
