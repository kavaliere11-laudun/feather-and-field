"""Silkie, any colour, hen or rooster, standing or pecking. Same camera and scale as breed.py.
Usage: python silkie3.py -- OUT.png RES COLOUR SEX [peck]     (env FARM=1 for the farm camera)"""
import sys, math, os
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled, ellipsoid, deform, hair, beak, eye, legs, stage
SK = 1.8      # the approved Silkie look was made with full-length hair (before HAIR_K shortened the other breeds)
def shair(o, m, count, normal, align=(0, 0, 0), **kw):
    return hair(o, m, count, normal * SK, tuple(a * SK for a in align), **kw)

args = sys.argv[sys.argv.index('--') + 1:]
OUT, RES, COLOUR, SEX = args[0], int(args[1]), args[2], args[3]
POSE = args[4] if len(args) > 4 else ''
PECK = POSE == 'peck'
WALK = {'walk1': 1, 'walk2': 2}.get(POSE, 0)
R = SEX == 'r'
scn = reset()

# colour, tip colour, pattern; roosters may override hackle/saddle colours
PAL = {
    'white':     ((0.9, 0.88, 0.84), (0.95, 0.94, 0.9), None),
    'black':     ((0.018, 0.018, 0.022), (0.03, 0.04, 0.06), None),
    'buff':      ((0.5, 0.24, 0.05), (0.62, 0.33, 0.08), None),
    'partridge': ((0.13, 0.06, 0.022), (0.035, 0.018, 0.008), None),
    'blue':      ((0.055, 0.075, 0.1), (0.09, 0.11, 0.14), None),
    'grey':      ((0.14, 0.145, 0.155), (0.2, 0.21, 0.22), None),
    'lavender':  ((0.2, 0.18, 0.22), (0.28, 0.26, 0.3), None),
    'red':       ((0.2, 0.028, 0.01), (0.28, 0.05, 0.015), None),
    'splash':    ((0.62, 0.64, 0.67), (0.72, 0.74, 0.77), ('patch', (0.07, 0.09, 0.12), 5.0, 0.56)),
    'paint':     ((0.88, 0.86, 0.82), (0.93, 0.92, 0.88), ('patch', (0.015, 0.015, 0.018), 4.5, 0.58)),
    'cuckoo':    ((0.03, 0.031, 0.035), (0.05, 0.052, 0.058), ('bars', (0.34, 0.35, 0.37), 14.0)),
}
ROO_CAPE = {   # a rooster's neck and saddle colour, where it differs from the body
    'partridge': ((0.2, 0.045, 0.01), (0.36, 0.12, 0.022)),
    'grey': ((0.5, 0.51, 0.52), (0.62, 0.63, 0.64)),
    'red': ((0.3, 0.05, 0.012), (0.42, 0.1, 0.02)),
    'buff': ((0.6, 0.3, 0.06), (0.7, 0.4, 0.1)),
}
COL, TIP, PAT = PAL[COLOUR]
if R and COLOUR == 'partridge':
    COL, TIP = (0.02, 0.02, 0.022), (0.03, 0.035, 0.04)      # partridge rooster: black body, gold-red cape
CAPE = ROO_CAPE.get(COLOUR, (COL, TIP)) if R else (COL, TIP)
dim = lambda c, k: tuple(min(1, x * k) for x in c)


def hmat(name, col, tip, pat=None, rough=0.38):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes; Lk = nt.links.new
    out = N.new('ShaderNodeOutputMaterial'); h = N.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = rough; h.inputs['Radial Roughness'].default_value = 0.7; h.inputs['Coat'].default_value = 0.12
    info = N.new('ShaderNodeHairInfo')
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = (*col, 1); mix.inputs['B'].default_value = (*tip, 1)
    Lk(info.outputs['Intercept'], mix.inputs['Factor']); last = mix.outputs['Result']
    if pat and pat[0] == 'patch':      # Splash and Paint: irregular patches of a second colour
        tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = pat[2]; nz.inputs['Detail'].default_value = 3
        Lk(tc.outputs['Object'], nz.inputs['Vector'])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = pat[3]; Lk(nz.outputs['Fac'], gt.inputs[0])
        pm = N.new('ShaderNodeMix'); pm.data_type = 'RGBA'; pm.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], pm.inputs['Factor']); Lk(last, pm.inputs['A']); last = pm.outputs['Result']
    if pat and pat[0] == 'bars':       # Cuckoo: wavy dark bands across the whole bird
        tc = N.new('ShaderNodeTexCoord'); wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'
        wv.inputs['Scale'].default_value = pat[2]; wv.inputs['Distortion'].default_value = 7.0; wv.inputs['Detail'].default_value = 2.0
        Lk(tc.outputs['Object'], wv.inputs['Vector'])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5; Lk(wv.outputs['Fac'], gt.inputs[0])
        bm = N.new('ShaderNodeMix'); bm.data_type = 'RGBA'; bm.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], bm.inputs['Factor']); Lk(last, bm.inputs['A']); last = bm.outputs['Result']
    Lk(last, h.inputs['Color']); Lk(h.outputs[0], out.inputs['Surface'])
    return m


fluff = hmat('fluff', COL, TIP, PAT)
cape_h = hmat('cape', *CAPE, PAT)
wingh = hmat('wingfluff', dim(COL, 0.7), dim(TIP, 0.85), PAT, rough=0.3)
under = principled('under', dim(COL, 0.9), 0.9)
cape_u = principled('cape_under', dim(CAPE[0], 0.9), 0.9)
skin = principled('skin', (0.035, 0.028, 0.05), 0.4, sss=0.1)
beak_m = principled('beak', (0.16, 0.17, 0.24), 0.3, coat=0.3)
comb_m = principled('comb', (0.09, 0.02, 0.05), 0.4, sss=0.2)
lobe_m = principled('lobe', (0.05, 0.22, 0.28), 0.3, coat=0.3)
leg_m = principled('leg', (0.09, 0.1, 0.15), 0.45)

# ---------------------------------------------------------------- body (as approved), rooster a little taller and leaner
body = ellipsoid('body', (0, 0, 0.62), (0.46, 0.32 if R else 0.34, 0.31 if R else 0.32), under)
deform(body, lambda p: (p.x, p.y, p.z + 0.1 * max(0, p.x) * (1 if p.z > 0.62 else 0.4) - 0.06 * max(0, -p.x) * (1 if p.z < 0.62 else 0)))
shair(body, fluff, 1400, 0.12, (-0.07, 0, -0.05), children=14, curl=0.022, clump=-0.1, rough=0.08)
neck_parts, head_parts = [], []
neck = ellipsoid('neck', (0.27, 0, 0.96 + (0.04 if R else 0)), (0.15, 0.14, 0.23 + (0.04 if R else 0)), cape_u, rot=(0, math.radians(24), 0))
if R:   # rooster: a fluffy ruff underneath, with soft hackle streamers flowing over the shoulders
    shair(neck, cape_h, 520, 0.08, (-0.05, 0, -0.09), children=14, curl=0.015, rough=0.06)
    shair(neck, cape_h, 380, 0.07, (-0.1, 0, -0.15), children=12, clump=0.35, rough=0.07, curl=0.02)
else:
    shair(neck, cape_h, 560, 0.08, (-0.05, 0, -0.09), children=14, curl=0.015, rough=0.06)
neck_parts.append(neck)
for side in (1, -1):
    w = ellipsoid('wing', (-0.05, side * 0.3, 0.68), (0.33, 0.07, 0.17), under, rot=(0, math.radians(12), 0))
    shair(w, wingh, 420, 0.035, (-0.13, 0, -0.015), children=14, clump=0.6, rough=0.035, curl=0.008)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.12, radius2=0.015, depth=0.42 + (0.1 if R else 0), location=(-0.36, 0, 0.9 + (0.04 if R else 0)), rotation=(0, math.radians(-58 if R else -52), 0))
tail = bpy.context.object; tail.name = 'tail'
mod = tail.modifiers.new('sub', 'SUBSURF'); mod.levels = 2
bpy.ops.object.modifier_apply(modifier='sub'); bpy.ops.object.shade_smooth(); tail.data.materials.append(under)
shair(tail, fluff, 700, 0.05 + (0.02 if R else 0), (-0.08, 0, 0.09 if R else 0.07), children=16, clump=0.25 if not R else 0.45, rough=0.08, curl=0.02)
if R:   # saddle streamers over the back towards the tail
    sd = ellipsoid('saddle', (-0.22, 0, 0.86), (0.18, 0.2, 0.08), under)
    shair(sd, cape_h, 380, 0.05, (-0.12, 0, -0.1), children=14, clump=0.35, rough=0.07, curl=0.02)

# ---------------------------------------------------------------- head
before = set(bpy.data.objects)
hz = 0.05 if R else 0.0
ellipsoid('head', (0.44, 0, 1.2 + hz), (0.09, 0.074, 0.08), skin)
beak('beak', beak_m, (0.535, 0, 1.19 + hz), length=0.09, radius=0.03, hook=0.02, tilt=10)
for s in (1, -1):
    eye((0.492, s * 0.058, 1.222 + hz), (0.07, 0.035, 0.02), r=0.02)
    ellipsoid('lobe', (0.43, s * 0.072, 1.165 + hz), (0.016, 0.007, 0.019) if not R else (0.02, 0.008, 0.024), lobe_m, seg=16)
    if R: ellipsoid('wattle', (0.515, s * 0.012, 1.12 + hz), (0.016, 0.01, 0.026), comb_m, seg=16)
ellipsoid('comb', (0.49, 0, 1.265 + hz), (0.044, 0.036, 0.03) if R else (0.028, 0.024, 0.018), comb_m, seg=16)
crest = ellipsoid('crest', (0.4 - (0.03 if R else 0), 0, 1.29 + hz), (0.13, 0.125, 0.095), under)
if R:   # rooster crest: swept back, with streamers
    shair(crest, fluff, 560, 0.07, (-0.09, 0, 0.0), children=14, curl=0.015, clump=0.4, rough=0.06)
else:
    shair(crest, fluff, 560, 0.1, (-0.03, 0, 0.02), children=14, curl=0.02, rough=0.07)
muff = ellipsoid('muff', (0.47, 0, 1.13 + hz), (0.06, 0.08, 0.045), under)
shair(muff, fluff, 200, 0.05, (0.01, 0, -0.03), children=10, curl=0.01, rough=0.05)
head_parts = [o for o in bpy.data.objects if o not in before]

if PECK:   # neck swings down and forward, head goes to the ground
    px, pz = 0.2, 0.86
    def swing(o, a):
        dx, dz = o.location.x - px, o.location.z - pz
        o.location.x = px + dx * math.cos(a) + dz * math.sin(a); o.location.z = pz - dx * math.sin(a) + dz * math.cos(a)
        o.rotation_euler.y += a
    for o in neck_parts: swing(o, math.radians(45))
    for o in head_parts:
        if o.parent is None: swing(o, math.radians(95))

# ---------------------------------------------------------------- legs, posture and size (same pipeline as breed.py)
upper = list(bpy.data.objects)
pivot = bpy.data.objects.new('pivot', None); bpy.context.collection.objects.link(pivot); pivot.location = (0, 0, 0.45)
bpy.context.view_layer.update()
for o in upper:
    if o.parent is None:
        o.parent = pivot; o.matrix_parent_inverse = pivot.matrix_world.inverted()
tilt = (6 if R else 0) - (24 if PECK else 0)
pivot.rotation_euler = (0, -math.radians(tilt), 0)
if R: pivot.location.z = 0.49
before_legs = set(bpy.data.objects)
hip = 0.44 if R else 0.4
legs(leg_m, [(0.1, 0.09), (-0.04, -0.09)], hip_z=hip, toe=0.11, radius=0.024)
for lx, y in [(0.1, 0.09), (-0.04, -0.09)]:
    f = ellipsoid('footfluff', (lx - 0.015, y, 0.12), (0.03, 0.03, 0.08), under, seg=16)
    shair(f, fluff, 90, 0.035, (-0.03, 0, -0.02), children=10, rough=0.05)
legparts = [o for o in bpy.data.objects if o not in before_legs]
if WALK:
    from ffbird import stride
    legparts = stride(legparts, [(0.1, 0.09), (-0.04, -0.09)], hip, WALK)
size = bpy.data.objects.new('size', None); bpy.context.collection.objects.link(size)
for o in [pivot] + legparts:
    if o.parent is None: o.parent = size
size.scale = (0.86,) * 3          # Silkies are a small breed

ORTHO = 2.4 if R else 2.05
os.environ.setdefault('CAMX', '-0.12' if R else '0.08')
stage(scn, OUT, res=RES, ortho=ORTHO, center_z=0.86 if R else 0.8, cam_h=1.6 if R else 1.55)
