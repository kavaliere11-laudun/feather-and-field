"""A quick look at birds from breeds.py in Blender, without the browser: bl/bin/python stylized/extras/view_bird.py OUT BIRD...
(BIRD: breed_sex, e.g. pea_r pea_h; pea_r_fan: the peacock with his train fanned). YAWS=30,-40 the views, PITCH=20 down, ORTHO width."""
import sys, os, math
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, HERE)
from common import *
import breeds
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
out, birds = args[0], args[1:]
import common; common.OUT = os.path.dirname(out); out = os.path.basename(out)
scn = reset()
cyl('ground', 3.0, 0.02, (0, 0, -0.01), m=mat('grass_g', '#7fb45a', rough=0.9), verts=48, bevel=0.0)
for i, b in enumerate(birds):
    parts = b.split('_'); breeds.FAN = len(parts) > 2 and parts[2] == 'fan'
    r = breeds.build(parts[0], parts[1], seed=3)
    r.location = ((i - (len(birds) - 1) / 2) * float(os.environ.get('STEP', 0.9)), 0, 0)
    r.rotation_euler = (0, 0, math.radians(float(os.environ.get('TURN', 0))))
lighting(scn)
for k, yaw in enumerate([float(a) for a in os.environ.get('YAWS', '30,-40').split(',')]):
    p, y = math.radians(float(os.environ.get('PITCH', 20))), math.radians(yaw)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    t = Vector([float(a) for a in os.environ.get('AT', '0,0,0.4').split(',')]); camera(scn, t + d * 30, t, ortho=float(os.environ.get('ORTHO', 2.4)))
    render(scn, out + '_%d' % k, w=int(os.environ.get('W', 1100)), h=int(os.environ.get('H', 700)), samples=16)
