import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import *

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
RES = int(args[1]) if len(args) > 1 else 384

scn = reset()
body_m = feather_mat('plumage', base=(0.24, 0.055, 0.018), edge=(0.07, 0.016, 0.006), light=(0.33, 0.085, 0.025), scale=(8, 11, 8), bump=0.12)
hackle_m = feather_mat('hackle', base=(0.26, 0.06, 0.016), edge=(0.12, 0.028, 0.008), light=(0.36, 0.1, 0.025), scale=(14, 14, 20), bump=0.1)
wing_m = feather_mat('wing', base=(0.2, 0.045, 0.015), edge=(0.05, 0.012, 0.005), light=(0.3, 0.08, 0.025), scale=(16, 30, 30), bump=0.5)
tailf = principled('tailfeather', (0.02, 0.012, 0.009), 0.3, coat=0.7)
primary = principled('primary', (0.05, 0.015, 0.008), 0.45)
hackle_h = hair_mat('hacklehair', (0.2, 0.045, 0.012), 0.3, tip=(0.34, 0.085, 0.02))
soft_h = hair_mat('softedge', (0.22, 0.05, 0.016), 0.35, tip=(0.3, 0.08, 0.02))
red = principled('comb', (0.55, 0.03, 0.025), 0.42, sss=0.35)
beak_m = principled('beak', (0.6, 0.42, 0.14), 0.32, coat=0.3)
leg_m = principled('leg', (0.72, 0.48, 0.08), 0.4)

# body: long, flat-backed "brick" shape typical of the breed
body = ellipsoid('body', (0, 0, 0.68), (0.5, 0.3, 0.3), body_m)
deform(body, lambda p: (p.x, p.y, p.z + 0.08 * max(0, p.x) * (1 if p.z > 0.68 else 0.5)
                        + 0.1 * max(0, -p.x - 0.1) * (1 if p.z > 0.68 else 0)
                        - 0.04 * max(0, -p.x) * (1 if p.z < 0.68 else 0)))
hair(body, soft_h, 700, 0.022, (-0.05, 0, -0.02), children=8, clump=0.6, rough=0.02)

# neck with flowing hackle feathers
neck = ellipsoid('neck', (0.3, 0, 1.0), (0.155, 0.135, 0.24), hackle_m, rot=(0, math.radians(22), 0))
hair(neck, hackle_h, 650, 0.025, (-0.05, 0, -0.12), children=10, clump=0.7, rough=0.02)

# head
ellipsoid('head', (0.42, 0, 1.24), (0.085, 0.072, 0.08), hackle_m)
ellipsoid('face', (0.465, 0, 1.232), (0.05, 0.068, 0.05), red)
comb_single('comb', red, base_len=0.15, height=0.065, points=5, loc=(0.36, 0, 1.3))
for s in (1, -1):
    ellipsoid('wattle', (0.5, s * 0.016, 1.15), (0.022, 0.011, 0.04), red, seg=20)
    ellipsoid('lobe', (0.415, s * 0.072, 1.2), (0.02, 0.008, 0.024), red, seg=16)
    eye((0.478, s * 0.06, 1.255), (0.62, 0.24, 0.03), r=0.017)
beak('beak', beak_m, (0.525, 0, 1.235), length=0.08, radius=0.027, hook=0.016, tilt=8)

# wings: layered feathers swept back, darker towards the tips
wing_h = hair_mat('winghair', (0.2, 0.045, 0.014), 0.3, tip=(0.05, 0.013, 0.006))
for s_ in (1, -1):
    w = ellipsoid('wing', (-0.03, s_ * 0.26, 0.73), (0.32, 0.05, 0.15), wing_m, rot=(0, math.radians(10), 0))
    hair(w, wing_h, 700, 0.012, (-0.1, 0, -0.012), children=8, clump=0.85, rough=0.01, radius=0.6, tip=0.2)

# tail: two tented fans of dark, glossy feathers raised at about 45 degrees
for s_ in (1, -1):
    for i in range(7):
        e = math.radians(28 + i * 8)
        f = feather_card('tail', 0.4 - abs(i - 3) * 0.025, 0.09, tailf, curve=-0.1)
        f.location = (-0.38, s_ * (0.025 + i * 0.005), 0.9)
        f.rotation_euler = (math.radians(90), math.pi + e, s_ * math.radians(5 + i * 2))
# fluffy cushion at the tail base
cush = ellipsoid('cushion', (-0.36, 0, 0.84), (0.14, 0.13, 0.12), body_m)
hair(cush, soft_h, 300, 0.04, (-0.06, 0, 0.0), children=10, clump=0.5, rough=0.03)

for o in list(bpy.data.objects):
    o.location.z -= 0.13
legs(leg_m, [(0.1, 0.085), (-0.04, -0.085)], hip_z=0.36, toe=0.12, radius=0.03)
stage(scn, OUT, res=RES, ortho=1.72, center_z=0.66, cam_h=1.4)
