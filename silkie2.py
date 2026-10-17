import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import *

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
COL = tuple(float(x) for x in args[1:4])
TIP = tuple(float(x) for x in args[4:7]) if len(args) >= 7 else COL
RES = int(args[7]) if len(args) >= 8 else 384

scn = reset()
dim = lambda c, k: tuple(min(1, x * k) for x in c)
fluff = hair_mat('fluff', COL, 0.38, tip=TIP)
wingh = hair_mat('wingfluff', dim(COL, 0.7), 0.3, tip=dim(TIP, 0.85))
under = principled('under', dim(COL, 0.75), 0.9)
skin = principled('skin', (0.035, 0.028, 0.05), 0.4, sss=0.1)
beak_m = principled('beak', (0.16, 0.17, 0.24), 0.3, coat=0.3)
comb_m = principled('comb', (0.09, 0.02, 0.05), 0.4, sss=0.2)
lobe_m = principled('lobe', (0.05, 0.22, 0.28), 0.3, coat=0.3)
leg_m = principled('leg', (0.09, 0.1, 0.15), 0.45)

# body: deep, round breast; back slopes up into the tail
body = ellipsoid('body', (0, 0, 0.62), (0.46, 0.34, 0.32), under)
deform(body, lambda p: (p.x, p.y, p.z + 0.1 * max(0, p.x) * (1 if p.z > 0.62 else 0.4) - 0.06 * max(0, -p.x) * (1 if p.z < 0.62 else 0)))
hair(body, fluff, 1400, 0.12, (-0.07, 0, -0.05), children=14, curl=0.022, clump=-0.1, rough=0.08)

# longer neck rising from the breast
neck = ellipsoid('neck', (0.27, 0, 0.96), (0.15, 0.14, 0.23), under, rot=(0, math.radians(24), 0))
hair(neck, fluff, 560, 0.08, (-0.05, 0, -0.09), children=14, curl=0.015, rough=0.06)

# wings: swept-back fluff, slightly darker so they read as a separate shape
for side in (1, -1):
    w = ellipsoid('wing', (-0.05, side * 0.3, 0.68), (0.33, 0.07, 0.17), under, rot=(0, math.radians(12), 0))
    hair(w, wingh, 420, 0.035, (-0.13, 0, -0.015), children=14, clump=0.6, rough=0.035, curl=0.008)

# tail: an upward plume, not a ball
# tail: a tapering, upswept cone of fluff so the silhouette comes to a point
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.12, radius2=0.015, depth=0.42, location=(-0.36, 0, 0.9), rotation=(0, math.radians(-52), 0))
tail = bpy.context.object; tail.name = 'tail'
mod = tail.modifiers.new('sub', 'SUBSURF'); mod.levels = 2
bpy.ops.object.modifier_apply(modifier='sub'); bpy.ops.object.shade_smooth(); tail.data.materials.append(under)
hair(tail, fluff, 700, 0.05, (-0.08, 0, 0.07), children=16, clump=0.25, rough=0.08, curl=0.02)

# head: bare mulberry face, hooked slate beak, dark eyes half hidden by the crest
ellipsoid('head', (0.44, 0, 1.2), (0.09, 0.074, 0.08), skin)
beak('beak', beak_m, (0.535, 0, 1.19), length=0.09, radius=0.03, hook=0.02, tilt=10)
for s in (1, -1):
    eye((0.492, s * 0.058, 1.222), (0.07, 0.035, 0.02), r=0.02)
    ellipsoid('lobe', (0.43, s * 0.072, 1.165), (0.016, 0.007, 0.019), lobe_m, seg=16)
ellipsoid('comb', (0.49, 0, 1.265), (0.028, 0.024, 0.018), comb_m, seg=16)
crest = ellipsoid('crest', (0.4, 0, 1.29), (0.13, 0.125, 0.095), under)
hair(crest, fluff, 560, 0.1, (-0.03, 0, 0.02), children=14, curl=0.02, rough=0.07)
muff = ellipsoid('muff', (0.47, 0, 1.13), (0.06, 0.08, 0.045), under)
hair(muff, fluff, 200, 0.05, (0.01, 0, -0.03), children=10, curl=0.01, rough=0.05)

# legs and feathered feet
legs(leg_m, [(0.1, 0.09), (-0.04, -0.09)], hip_z=0.4, toe=0.11, radius=0.024)
for lx, y in [(0.1, 0.09), (-0.04, -0.09)]:
    f = ellipsoid('footfluff', (lx - 0.015, y, 0.12), (0.03, 0.03, 0.08), under, seg=16)
    hair(f, fluff, 90, 0.035, (-0.03, 0, -0.02), children=10, rough=0.05)

stage(scn, OUT, res=RES, ortho=1.72, center_z=0.72, cam_h=1.5)
