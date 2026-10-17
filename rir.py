import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import *

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
RES = int(args[1]) if len(args) > 1 else 384

scn = reset()
body_m = feather_mat('plumage', base=(0.155, 0.031, 0.009), edge=(0.11, 0.022, 0.007), light=(0.2, 0.042, 0.012), scale=(6, 8, 6), bump=0.04, rough=0.6)
hackle_m = feather_mat('hackle', base=(0.17, 0.034, 0.01), edge=(0.07, 0.014, 0.005), light=(0.24, 0.05, 0.014), scale=(16, 16, 24), bump=0.1)
wing_m = feather_mat('wing', base=(0.2, 0.045, 0.015), edge=(0.05, 0.012, 0.005), light=(0.3, 0.08, 0.025), scale=(16, 30, 30), bump=0.5)
tailf = principled('tailfeather', (0.02, 0.012, 0.009), 0.35, coat=0.4)
_nt = tailf.node_tree; _tc = _nt.nodes.new('ShaderNodeTexCoord'); _sx = _nt.nodes.new('ShaderNodeSeparateXYZ')
_nt.links.new(_tc.outputs['Object'], _sx.inputs[0])
_mr = _nt.nodes.new('ShaderNodeMapRange'); _mr.inputs['From Min'].default_value = 0.05; _mr.inputs['From Max'].default_value = 0.34
_nt.links.new(_sx.outputs['X'], _mr.inputs['Value'])
_mx = _nt.nodes.new('ShaderNodeMix'); _mx.data_type = 'RGBA'; _mx.inputs['A'].default_value = (0.14, 0.03, 0.009, 1); _mx.inputs['B'].default_value = (0.012, 0.01, 0.008, 1)
_nt.links.new(_mr.outputs['Result'], _mx.inputs['Factor']); _nt.links.new(_mx.outputs['Result'], _nt.nodes['Principled BSDF'].inputs['Base Color'])
primary = principled('primary', (0.05, 0.015, 0.008), 0.45)
hackle_h = hair_mat('hacklehair', (0.1, 0.02, 0.006), 0.32, tip=(0.15, 0.03, 0.009))
soft_h = hair_mat('softedge', (0.15, 0.031, 0.009), 0.35, tip=(0.2, 0.045, 0.013))
fluff_h = hair_mat('underfluff', (0.2, 0.05, 0.014), 0.4, tip=(0.26, 0.075, 0.02))
red = principled('comb', (0.6, 0.025, 0.02), 0.4, sss=0.35)
beak_m = principled('beak', (0.6, 0.42, 0.14), 0.32, coat=0.3)
leg_m = principled('leg', (0.62, 0.48, 0.24), 0.45)

# body: long, flat-backed "brick" shape typical of the breed
body = ellipsoid('body', (0, 0, 0.68), (0.49, 0.3, 0.32), body_m)
deform(body, lambda p: (p.x, p.y, p.z + 0.06 * max(0, p.x) * (1 if p.z > 0.68 else 0.3)
                        + 0.2 * max(0, -p.x - 0.05) * (1 if p.z > 0.68 else 0.35)
                        - 0.05 * max(0, p.x) * (1 if p.z < 0.68 else 0)))
under = ellipsoid('underfluff', (-0.22, 0, 0.5), (0.2, 0.2, 0.15), body_m)
hair(under, fluff_h, 420, 0.04, (-0.03, 0, -0.03), children=10, clump=0.3, rough=0.04, curl=0.008)
hair(body, soft_h, 600, 0.014, (-0.05, 0, -0.02), children=8, clump=0.7, rough=0.015)

# neck with flowing hackle feathers
ellipsoid('throat', (0.33, 0, 0.87), (0.18, 0.16, 0.17), body_m)
neck = ellipsoid('neck', (0.39, 0, 1.05), (0.125, 0.11, 0.26), hackle_m, rot=(0, math.radians(10), 0))
hair(neck, hackle_h, 750, 0.02, (-0.04, 0, -0.12), children=10, clump=0.7, rough=0.02)

# head
ellipsoid('head', (0.47, 0, 1.33), (0.072, 0.062, 0.068), hackle_m)
ellipsoid('face', (0.507, 0, 1.322), (0.044, 0.058, 0.042), red)
comb_single('comb', red, base_len=0.13, height=0.055, points=5, loc=(0.415, 0, 1.385))
for s in (1, -1):
    ellipsoid('wattle', (0.54, s * 0.013, 1.255), (0.018, 0.009, 0.034), red, seg=20)
    ellipsoid('lobe', (0.468, s * 0.06, 1.3), (0.014, 0.006, 0.018), red, seg=16)
    eye((0.518, s * 0.052, 1.342), (0.6, 0.15, 0.025), r=0.015)
beak('beak', beak_m, (0.56, 0, 1.322), length=0.072, radius=0.024, hook=0.016, tilt=8)

# wings: layered feathers swept back, darker towards the tips
wing_h = hair_mat('winghair', (0.2, 0.045, 0.014), 0.3, tip=(0.05, 0.013, 0.006))
for s_ in (1, -1):
    w = ellipsoid('wing', (-0.05, s_ * 0.265, 0.75), (0.31, 0.05, 0.15), wing_m, rot=(0, math.radians(14), 0))
    hair(w, wing_h, 700, 0.012, (-0.1, 0, -0.012), children=8, clump=0.85, rough=0.01, radius=0.6, tip=0.2)

# tail: two tented fans of dark, glossy feathers raised at about 45 degrees
for s_ in (1, -1):
    for i in range(6):
        e = math.radians(48 + i * 7)
        f = feather_card('tail', 0.3 - abs(i - 2.5) * 0.015, 0.11, tailf, curve=-0.08)
        f.location = (-0.42, s_ * (0.02 + i * 0.005), 0.97)
        f.rotation_euler = (math.radians(90), math.pi + e, s_ * math.radians(4 + i * 2))
# fluffy cushion at the tail base
cush = ellipsoid('cushion', (-0.4, 0, 0.92), (0.13, 0.12, 0.12), body_m)
hair(cush, soft_h, 300, 0.04, (-0.06, 0, 0.0), children=10, clump=0.5, rough=0.03)

for o in list(bpy.data.objects):
    o.location.z -= 0.13
legs(leg_m, [(0.1, 0.08), (-0.04, -0.08)], hip_z=0.36, toe=0.14, radius=0.024)
stage(scn, OUT, res=RES, ortho=1.72, center_z=0.66, cam_h=1.4)
