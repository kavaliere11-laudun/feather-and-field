# The shop's picture of the Christmas dress (web3d/decor/xmas.webp): its little tree with presents before a bit of fence in
# its garland, lights and bows, on a transparent background. bl/bin/python stylized/xmas_pic.py OUT_DIR
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import common, coops, coop, farm_layout
from mathutils import Vector
out = sys.argv[-1]; common.OUT = out
reset(); coops.reset_mats(); coop.PEN = dict(farm_layout.NEW['pen'])
m = coop.M(); objs = []
for i, x in enumerate((-0.55, 0.0, 0.55)):                       # three posts and their rails
    objs.append(box('post', (0.07, 0.07, 0.5), (x, 0.25, 0.25), m=m['wood'], bevel=0.012))
    objs.append(box('cap', (0.085, 0.085, 0.03), (x, 0.25, 0.505), m=m['capwood'], bevel=0.01))
for z in (0.2, 0.4):
    objs.append(coop.plank('rail', Vector((-0.6, 0.25, z)), Vector((0.6, 0.25, z)), 0.07, 0.03, (0, -1, 0), m['wood'], jitter=0.5))
coops._garland(objs, [(-0.55, 0.25, 0.53), (0.0, 0.25, 0.53), (0.55, 0.25, 0.53)], 0.07, coops._xbulbs(), seed=3)
for x in (-0.55, 0.0, 0.55): coops._bow(objs, x, 0.205, 0.5, 0, -1, 1.2)
coops.xmas_tree()
scn = bpy.context.scene; lighting(scn)
p, y = math.radians(30.0), math.radians(25.0)
d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
t = Vector((0.0, 0.05, 0.38)); camera(scn, t + d * 60, t, ortho=1.45)
render(scn, 'xmas', w=740, h=600, samples=48, transparent=True)
