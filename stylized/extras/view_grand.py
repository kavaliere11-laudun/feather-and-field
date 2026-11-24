# A quick look at one grand decoration in Blender, without the browser: bl/bin/python stylized/extras/view_grand.py NAME OUT
# (OUT a path without .png; YAWS=45,-30,160 the views round it, PITCH=38 down, AT=x,y,z what it looks at, ORTHO=4.2 the width)
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from common import *
import coops, grand
from mathutils import Vector
name, out = sys.argv[-2], sys.argv[-1]
import common; common.OUT = os.path.dirname(out); out = os.path.basename(out)
reset(); coops.reset_mats()
grand.GRAND[name]()
# a lawn under it, as on the farm
g = bpy.data.meshes.new('lawn'); import bmesh; bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=48, radius=9); bm.to_mesh(g); bm.free()
lo = link(bpy.data.objects.new('lawn', g)); lo.location = (0, 0, -0.005); setmat(lo, mat('lawn', '#8fb851', rough=0.95, var=0.04))
scn = bpy.context.scene; lighting(scn)
for k, yaw in enumerate([float(a) for a in os.environ.get('YAWS', '45,-30,160').split(',')]):
    p, y = math.radians(float(os.environ.get('PITCH', 38))), math.radians(yaw)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    t = Vector([float(a) for a in os.environ.get('AT', '0,0,0.7').split(',')]); camera(scn, t + d * 60, t, ortho=float(os.environ.get('ORTHO', 4.2)))
    render(scn, out + '_%d' % k, w=800, h=800, samples=int(os.environ.get('SAMPLES', 16)))
