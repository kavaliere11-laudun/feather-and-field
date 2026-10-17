"""A day-old chick for any breed or Silkie colour. Usage: python chick.py -- OUT.png RES KIND   (env FARM=1 for the farm camera)
KIND: rir orp leg bra, or sil_<colour>"""
import sys, math, os
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled, ellipsoid, hair, beak, legs, stage

args = sys.argv[sys.argv.index('--') + 1:]
OUT, RES, KIND = args[0], int(args[1]), args[2]
WALK = {'walk1': 1, 'walk2': 2}.get(args[3] if len(args) > 3 else '', 0)
SIL = KIND.startswith('sil_')
scn = reset()

# down colour, tip colour, pattern
CH = {
    'rir': ((0.42, 0.17, 0.045), (0.55, 0.26, 0.08), ('back', (0.22, 0.07, 0.02))),
    'orp': ((0.7, 0.48, 0.1), (0.82, 0.62, 0.2), None),
    'leg': ((0.36, 0.23, 0.1), (0.46, 0.31, 0.15), ('stripes', (0.06, 0.04, 0.022), (0.62, 0.5, 0.3))),
    'bra': ((0.74, 0.66, 0.4), (0.82, 0.76, 0.52), ('back', (0.36, 0.33, 0.28))),
    'sil_white': ((0.78, 0.7, 0.42), (0.86, 0.8, 0.56), None),
    'sil_black': ((0.025, 0.025, 0.03), (0.06, 0.06, 0.07), None),
    'sil_blue': ((0.1, 0.12, 0.15), (0.18, 0.2, 0.24), None),
    'sil_splash': ((0.6, 0.62, 0.65), (0.7, 0.72, 0.75), ('patch', (0.1, 0.12, 0.15))),
    'sil_buff': ((0.62, 0.38, 0.1), (0.72, 0.48, 0.16), None),
    'sil_partridge': ((0.32, 0.2, 0.08), (0.42, 0.28, 0.12), ('stripes', (0.05, 0.03, 0.018), (0.55, 0.42, 0.24))),
    'sil_grey': ((0.3, 0.31, 0.33), (0.4, 0.41, 0.43), None),
    'sil_lavender': ((0.38, 0.35, 0.4), (0.48, 0.45, 0.5), None),
    'sil_cuckoo': ((0.12, 0.12, 0.13), (0.22, 0.22, 0.24), ('back', (0.06, 0.06, 0.065))),
    'sil_red': ((0.34, 0.08, 0.025), (0.44, 0.13, 0.04), None),
    'sil_paint': ((0.86, 0.84, 0.8), (0.92, 0.9, 0.86), ('patch', (0.02, 0.02, 0.024))),
}
COL, TIP, PAT = CH[KIND]


def down_mat(name, col, tip, pat):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes; Lk = nt.links.new
    out = N.new('ShaderNodeOutputMaterial'); h = N.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = 0.45; h.inputs['Radial Roughness'].default_value = 0.8; h.inputs['Coat'].default_value = 0.08
    info = N.new('ShaderNodeHairInfo'); tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['Object'], sx.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = (*col, 1); mix.inputs['B'].default_value = (*tip, 1)
    Lk(info.outputs['Intercept'], mix.inputs['Factor']); last = mix.outputs['Result']
    if pat and pat[0] in ('back', 'stripes'):
        up = N.new('ShaderNodeMapRange'); up.inputs['From Min'].default_value = 0.02; up.inputs['From Max'].default_value = 0.08; Lk(sx.outputs['Z'], up.inputs['Value'])
        if pat[0] == 'back':
            fac = up.outputs['Result']
        else:   # chipmunk stripes: a dark band down the middle, pale bands either side
            ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; Lk(sx.outputs['Y'], ab.inputs[0])
            pale = N.new('ShaderNodeMath'); pale.operation = 'LESS_THAN'; pale.inputs[1].default_value = 0.06; Lk(ab.outputs[0], pale.inputs[0])
            pm = N.new('ShaderNodeMath'); pm.operation = 'MULTIPLY'; Lk(pale.outputs[0], pm.inputs[0]); Lk(up.outputs['Result'], pm.inputs[1])
            pmix = N.new('ShaderNodeMix'); pmix.data_type = 'RGBA'; pmix.inputs['B'].default_value = (*pat[2], 1)
            Lk(pm.outputs[0], pmix.inputs['Factor']); Lk(last, pmix.inputs['A']); last = pmix.outputs['Result']
            dark = N.new('ShaderNodeMath'); dark.operation = 'LESS_THAN'; dark.inputs[1].default_value = 0.025; Lk(ab.outputs[0], dark.inputs[0])
            fm = N.new('ShaderNodeMath'); fm.operation = 'MULTIPLY'; Lk(dark.outputs[0], fm.inputs[0]); Lk(up.outputs['Result'], fm.inputs[1])
            fac = fm.outputs[0]
        dm = N.new('ShaderNodeMix'); dm.data_type = 'RGBA'; dm.inputs['B'].default_value = (*pat[1], 1)
        Lk(fac, dm.inputs['Factor']); Lk(last, dm.inputs['A']); last = dm.outputs['Result']
    if pat and pat[0] == 'patch':
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 14; Lk(tc.outputs['Object'], nz.inputs['Vector'])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.57; Lk(nz.outputs['Fac'], gt.inputs[0])
        pm = N.new('ShaderNodeMix'); pm.data_type = 'RGBA'; pm.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], pm.inputs['Factor']); Lk(last, pm.inputs['A']); last = pm.outputs['Result']
    Lk(last, h.inputs['Color']); Lk(h.outputs[0], out.inputs['Surface'])
    return m


down = down_mat('down', COL, TIP, PAT)
under = principled('under', tuple(c * 0.8 for c in COL), 0.9)
beak_m = principled('beak', (0.16, 0.17, 0.24) if SIL else (0.72, 0.55, 0.25), 0.35)
leg_m = principled('leg', (0.12, 0.13, 0.18) if SIL else (0.8, 0.62, 0.3), 0.45)
L = 1.0 if not SIL else 1.12      # Silkie chicks: extra fluffy
body = ellipsoid('body', (0, 0, 0.2), (0.16, 0.13, 0.13), under)
hair(body, down, 900, 0.045 * L, (-0.02, 0, 0.0), children=14, rough=0.06, curl=0.008, clump=-0.1)
head = ellipsoid('head', (0.12, 0, 0.34), (0.085, 0.078, 0.08), under)
hair(head, down, 450, 0.03 * L, (0.0, 0, 0.0), children=12, rough=0.05, clump=-0.1)
if SIL:
    cr = ellipsoid('crest', (0.1, 0, 0.405), (0.05, 0.05, 0.035), under)
    hair(cr, down, 160, 0.03, (-0.01, 0, 0.02), children=10, rough=0.05)
for s in (1, -1):
    w = ellipsoid('wingstub', (-0.01, s * 0.115, 0.22), (0.07, 0.025, 0.045), under, rot=(0, math.radians(15), 0))
    hair(w, down, 80, 0.02 * L, (-0.03, 0, -0.01), children=8, rough=0.04)
    e = ellipsoid('eye', (0.175, s * 0.055, 0.355), (0.016, 0.01, 0.017), principled('eye', (0.005, 0.005, 0.005), 0.05, coat=1.0), seg=16)
beak('beak', beak_m, (0.205, 0, 0.33), length=0.04, radius=0.014, hook=0.005, tilt=8)
before_legs = set(bpy.data.objects)
legs(leg_m, [(0.04, 0.04), (-0.02, -0.04)], hip_z=0.12, toe=0.05, radius=0.009)
if SIL or KIND == 'bra':
    for lx, ly in [(0.04, 0.04), (-0.02, -0.04)]:
        f = ellipsoid('footfluff', (lx, ly * 1.2, 0.05), (0.018, 0.015, 0.04), under, seg=12)
        hair(f, down, 40, 0.012, (-0.01, 0, -0.01), children=8, rough=0.04)
if WALK:
    from ffbird import stride
    stride([o for o in bpy.data.objects if o not in before_legs], [(0.04, 0.04), (-0.02, -0.04)], 0.12, WALK, fwd_deg=28, back_deg=18, lift=0.02)
os.environ.setdefault('CAMX', '0.03')
stage(scn, OUT, res=RES, ortho=0.9, center_z=0.22, cam_h=0.72)
