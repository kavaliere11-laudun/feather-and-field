import sys, os, resource
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset
scn = reset()
import ffcam
N = int(os.environ.get('N', '36')); SMOOTH = os.environ.get('SMOOTH')
for i in range(N):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.5, location=((i % 6) - 3, (i // 6) - 3, 0.5))
    if SMOOTH: bpy.ops.object.shade_smooth()
ffcam.setup(scn, (0, 0, 0), 400, 300, samples=4)
scn.render.filepath = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/r/map/t.png'
bpy.ops.render.render(write_still=True)
print('PEAK', resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)
