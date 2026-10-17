"""Version 2 chick: the same fluffy chick, built on pivots so it can walk, peck, look, scratch and turn.
Usage: python chick_v2.py -- OUTDIR KIND POSES [RES]   (env FARM=1 for the farm camera)
KIND: rir orp leg bra, or sil_<colour>.  POSES: stand walk0..7 peck0..2 look1 look2 scratch0 scratch1 turn1..3
Writes OUTDIR/chick_<KIND>.png for stand, OUTDIR/chick_<KIND>_<pose>.png for the rest."""
import sys, math, os
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled, ellipsoid, hair, beak, legs, stage

args = sys.argv[sys.argv.index('--') + 1:]
OUTDIR, KIND, POSES = args[0], args[1], args[2].split(',')
RES = int(args[3]) if len(args) > 3 else 320
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
from mathutils import Vector
built = lambda: set(bpy.data.objects)
b0 = built()
body = ellipsoid('body', (0, 0, 0.2), (0.16, 0.13, 0.13), under)
hair(body, down, 900, 0.045 * L, (-0.02, 0, 0.0), children=14, rough=0.06, curl=0.008, clump=-0.1)
for s in (1, -1):
    w = ellipsoid('wingstub', (-0.01, s * 0.115, 0.22), (0.07, 0.025, 0.045), under, rot=(0, math.radians(15), 0))
    hair(w, down, 80, 0.02 * L, (-0.03, 0, -0.01), children=8, rough=0.04)
body_objs = built() - b0; b0 = built()
head = ellipsoid('head', (0.12, 0, 0.34), (0.085, 0.078, 0.08), under)
hair(head, down, 450, 0.03 * L, (0.0, 0, 0.0), children=12, rough=0.05, clump=-0.1)
if SIL:
    cr = ellipsoid('crest', (0.1, 0, 0.405), (0.05, 0.05, 0.035), under)
    hair(cr, down, 160, 0.03, (-0.01, 0, 0.02), children=10, rough=0.05)
eye_m = principled('eye', (0.005, 0.005, 0.005), 0.05, coat=1.0)
for s in (1, -1):
    ellipsoid('eye', (0.175, s * 0.055, 0.355), (0.016, 0.01, 0.017), eye_m, seg=16)
beak('beak', beak_m, (0.212, 0, 0.33), length=0.05, radius=0.014, hook=0.005, tilt=8)
head_objs = built() - b0
LEGS = {'L': (0.04, 0.04), 'R': (-0.02, -0.04)}; HIP = 0.12
leg_objs = {}
for sd, (lx, ly) in LEGS.items():
    b0 = built()
    legs(leg_m, [(lx, ly)], hip_z=HIP, toe=0.05, radius=0.009)
    if SIL or KIND == 'bra':
        f = ellipsoid('footfluff', (lx, ly * 1.2, 0.05), (0.018, 0.015, 0.04), under, seg=12)
        hair(f, down, 40, 0.012, (-0.01, 0, -0.01), children=8, rough=0.04)
    leg_objs[sd] = built() - b0


# ---------------------------------------------------------------- pivots: size (turning) > body (tilts) > head; legs swing from the hips
def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e); e.location = loc
    if parent: e.parent = parent
    bpy.context.view_layer.update(); return e


def attach(objs, e):
    bpy.context.view_layer.update(); inv = e.matrix_world.inverted()
    for o in objs:
        if o.parent is None: o.parent = e; o.matrix_parent_inverse = inv


size = empty('size', (0, 0, 0))
bodyp = empty('bodyp', (0, 0, HIP), size)
headp = empty('headp', (0.1, 0, 0.27 - HIP), bodyp)          # the neck, inside the down
hinge = {sd: empty('hip' + sd, (lx, ly, HIP), size) for sd, (lx, ly) in LEGS.items()}
attach(head_objs, headp); attach(body_objs, bodyp)
for sd in LEGS: attach(leg_objs[sd], hinge[sd])
REST = {e.name: e.location.copy() for e in [bodyp, headp] + list(hinge.values())}
TURN_DEG = {'turn1': -22.67, 'turn2': -45.33, 'turn3': -68.0}
LEG_LEN = HIP


def smooth(a, b, x):
    k = min(1.0, max(0.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)


def swing(sd, dx, lift=0.0):
    """Put a foot dx in front of (+) or behind (-) its hip, lifted a little."""
    hinge[sd].rotation_euler = (0, -math.asin(max(-0.9, min(0.9, dx / LEG_LEN))), 0)
    hinge[sd].location = REST['hip' + sd] + Vector((0, 0, lift))


def pose(name):
    for e in [bodyp, headp] + list(hinge.values()):
        e.location = REST[e.name].copy(); e.rotation_euler = (0, 0, 0)
    size.rotation_euler = (0, 0, math.radians(TURN_DEG.get(name, 0.0)))
    if name.startswith('walk'):          # quick little steps: bob, waddle, head darting forward
        ph = int(name[4:]) / 8
        bodyp.location.z += -0.004 + 0.007 * math.cos(4 * math.pi * (ph - 0.3))
        bodyp.rotation_euler = (math.radians(6 * math.sin(2 * math.pi * (ph - 0.05))), math.radians(5), 0)
        hb = (ph * 2 + 0.15) % 1.0
        dx = 0.014 - 0.028 * (hb / 0.68) if hb < 0.68 else -0.014 + 0.028 * smooth(0.68, 1.0, hb)
        headp.location.x += dx; headp.rotation_euler = (0, math.radians(-5), 0)
        for sd, off in (('L', 0.0), ('R', 0.5)):
            q = (ph + off) % 1.0
            if q < 0.62: swing(sd, 0.035 - 0.075 * (q / 0.62))
            else:
                k = (q - 0.62) / 0.38; swing(sd, -0.04 + 0.075 * smooth(0, 1, k), 0.025 * math.sin(math.pi * k) ** 0.8)
    elif name.startswith('peck'):
        k = int(name[4:]); bd, hd = [(14, 30), (30, 48), (18, 10)][k]
        bodyp.rotation_euler = (0, math.radians(bd), 0); headp.rotation_euler = (math.radians(-12 if k == 2 else 0), math.radians(hd), 0)
        swing('L', -0.015); swing('R', -0.02)
    elif name.startswith('look'):
        sdn = -1 if name == 'look1' else 1
        headp.rotation_euler = (math.radians(15 * sdn), math.radians(-4), math.radians(35 * sdn))
    elif name.startswith('scratch'):
        back = name == 'scratch1'
        bodyp.rotation_euler = (0, math.radians(14 if back else 9), 0); headp.rotation_euler = (0, math.radians(26 if back else 20), 0)
        swing('R', -0.06 if back else 0.04, 0.012 if back else 0.03)
    bpy.context.view_layer.update()


os.environ.setdefault('CAMX', '0.03')
first = True
import time
for name in POSES:
    pose(name)
    out = os.path.join(OUTDIR, 'chick_%s.png' % KIND if name == 'stand' else 'chick_%s_%s.png' % (KIND, name))
    t0 = time.time()
    if first:
        stage(scn, out, res=RES, ortho=0.9, center_z=0.22, cam_h=0.72, samples=int(os.environ.get('SAMPLES', 24))); first = False
    else:
        scn.render.filepath = out; bpy.ops.render.render(write_still=True)
    print('POSE', name, round(time.time() - t0, 1), flush=True)
print('CHICK2_DONE')
