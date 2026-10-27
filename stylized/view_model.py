# A quick look at one coops.py model in Blender, without the browser: bl/bin/python stylized/view_model.py NAME OUT
# (OUT a path without .png; YAWS=45,-30,120 the views round it, PITCH=42 down, AT=x,y,z what it looks at, ORTHO=3.0 the width)
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import coops, coop, farm_layout
from mathutils import Vector
name, out = sys.argv[-2], sys.argv[-1]
import common; common.OUT = os.path.dirname(out); out = os.path.basename(out)
if os.environ.get('OVER'): coop.OVER_FRONT = float(os.environ['OVER'])          # (the barn's front overhang, to compare)
reset(); coops.reset_mats(); coop.PEN = dict(farm_layout.NEW['pen'])
ALIAS = {'box_rir': 'box_barn', 'shed_rir': 'shed_barn', 'cosy_rir': 'cosy_barn', 'deluxe_rir': 'deluxe_barn'}       # (the Red Barn's looks' own names)
(coops.HOUSES[name[6:]] if name.startswith('house_') else getattr(coops, ALIAS.get(name, name)))()
scn = bpy.context.scene; lighting(scn)
for k, yaw in enumerate([float(a) for a in os.environ.get('YAWS', '45,-30,120').split(',')]):
    p, y = math.radians(float(os.environ.get('PITCH', 42))), math.radians(yaw)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    t = Vector([float(a) for a in os.environ.get('AT', '0,-0.2,0.9').split(',')]); camera(scn, t + d * 60, t, ortho=float(os.environ.get('ORTHO', 3.0)))
    render(scn, out + '_%d' % k, w=700, h=700, samples=12)
