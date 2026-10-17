"""Feather & Field, Silkie v2: the approved fluffy Silkie look on the v2 skeleton, so Silkies walk, peck, look about,
scratch and sit on the nest like the other breeds. Same camera and sizes as the v1 sprites.

Usage: python silkie_v2.py -- OUTDIR COLOUR SEX POSES [RES]       (env FARM=1 for the farm camera)
  writes OUTDIR/<pose>_sil_<colour>_<sex>.png"""
import sys, os, math, random, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector, Matrix, Quaternion
from ffbird import reset, principled, ellipsoid, hair, beak, eye, stage

args = sys.argv[sys.argv.index('--') + 1:]
OUTDIR, COLOUR, SEX, POSES = args[0], args[1], args[2], args[3].split(',')
RES = int(args[4]) if len(args) > 4 else 512
os.makedirs(OUTDIR, exist_ok=True)
R = SEX == 'r'
scn = reset()
random.seed(3)
clamp01 = lambda v: max(0.0, min(1.0, v))
smooth = lambda a, b, v: (lambda t: t * t * (3 - 2 * t))(clamp01((v - a) / (b - a)))
SK = 1.8          # the approved Silkie look uses full-length hair


def shair(o, m, count, normal, align=(0, 0, 0), **kw):
    return hair(o, m, count, normal * SK, tuple(a * SK for a in align), **kw)


# ====================================================================== colours (as approved for v1)
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
ROO_CAPE = {
    'partridge': ((0.2, 0.045, 0.01), (0.36, 0.12, 0.022)),
    'grey': ((0.5, 0.51, 0.52), (0.62, 0.63, 0.64)),
    'red': ((0.3, 0.05, 0.012), (0.42, 0.1, 0.02)),
    'buff': ((0.6, 0.3, 0.06), (0.7, 0.4, 0.1)),
}
COL, TIP, PAT = PAL[COLOUR]
if R and COLOUR == 'partridge':
    COL, TIP = (0.02, 0.02, 0.022), (0.03, 0.035, 0.04)
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
    if pat and pat[0] == 'patch':
        tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = pat[2]; nz.inputs['Detail'].default_value = 3
        Lk(tc.outputs['Object'], nz.inputs['Vector'])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = pat[3]; Lk(nz.outputs['Fac'], gt.inputs[0])
        pm = N.new('ShaderNodeMix'); pm.data_type = 'RGBA'; pm.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], pm.inputs['Factor']); Lk(last, pm.inputs['A']); last = pm.outputs['Result']
    if pat and pat[0] == 'bars':
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
skin = principled('skin', (0.035, 0.028, 0.05), 0.4, sss=0.1)
beak_m = principled('beak', (0.16, 0.17, 0.24), 0.3, coat=0.3)
comb_m = principled('comb', (0.09, 0.02, 0.05), 0.4, sss=0.2)
lobe_m = principled('lobe', (0.05, 0.22, 0.28), 0.3, coat=0.3)
leg_m = principled('leg', (0.09, 0.1, 0.15), 0.45)

# ====================================================================== one soft body (so the whole bird can bend), fluff grown from regions of it
r_ = 0.04 if R else 0.0; hz = 0.05 if R else 0.0
HX, HZ = 0.44, 1.2 + hz
parts = [
    ellipsoid('body', (0, 0, 0.62), (0.46, 0.32 if R else 0.34, 0.31 if R else 0.32), None),
    ellipsoid('neck', (0.27, 0, 0.96 + r_), (0.15, 0.14, 0.23 + r_), None, rot=(0, math.radians(24), 0)),
    ellipsoid('head', (HX, 0, HZ), (0.09, 0.074, 0.08), None),
    ellipsoid('crest', (0.4 - (0.03 if R else 0), 0, 1.29 + hz), (0.13, 0.125, 0.095), None),
    ellipsoid('tail', (-0.38, 0, 0.8 + r_), (0.19, 0.12, 0.1), None, rot=(0, math.radians(-30 if not R else -42), 0)),
    ellipsoid('thighL', (0.03, 0.1, 0.42), (0.1, 0.08, 0.1), None),
    ellipsoid('thighR', (0.03, -0.1, 0.42), (0.1, 0.08, 0.1), None),
]
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
body = bpy.context.object; body.name = 'silkie'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for v in body.data.vertices:       # the approved shape: chest up, rump lower
    p = v.co
    p.z += 0.1 * max(0, p.x) * (1 if p.z > 0.62 else 0.4) * smooth(1.0, 0.85, p.z) - 0.06 * max(0, -p.x) * (1 if p.z < 0.62 else 0)
for typ, kw in (('REMESH', dict(mode='VOXEL', voxel_size=0.014)), ('SMOOTH', dict(factor=0.8, iterations=10))):
    m = body.modifiers.new(typ.lower(), typ)
    for k, v in kw.items(): setattr(m, k, v)
    bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth(); body.data.materials.append(under)

# regions: which fluff grows where
G = {n: body.vertex_groups.new(name=n) for n in ('fluff', 'cape', 'crest', 'wing', 'tailf', 'muff')}
for v in body.data.vertices:
    p = v.co
    face = smooth(HX - 0.01, HX + 0.04, p.x) * smooth(HZ + 0.05, HZ - 0.02, p.z) * smooth(HZ - 0.12, HZ - 0.06, p.z)
    crest = smooth(1.2 + hz, 1.26 + hz, p.z) * smooth(0.26, 0.32, p.x) * (1 - face)
    muff = smooth(HX - 0.02, HX + 0.03, p.x) * smooth(HZ - 0.03, HZ - 0.07, p.z) * smooth(HZ - 0.16, HZ - 0.1, p.z)
    cape = smooth(0.8, 0.92, p.z) * smooth(0.12, 0.2, p.x) * (1 - crest) * (1 - face) * (1 - muff)
    tailf = smooth(-0.34, -0.42, p.x) * smooth(0.78, 0.86, p.z)
    wing = smooth(0.2, 0.26, abs(p.y)) * smooth(0.5, 0.58, p.z) * smooth(0.86, 0.78, p.z) * smooth(0.22, 0.1, p.x) * (1 - tailf)
    fl = max(0.0, 1 - cape - crest - tailf - face - muff) * (1 - 0.6 * wing)
    for name, w in (('fluff', fl), ('cape', cape), ('crest', crest), ('wing', wing), ('tailf', tailf), ('muff', muff)):
        G[name].add([v.index], clamp01(w), 'REPLACE')

shair(body, fluff, 1600, 0.105, (-0.07, 0, -0.05), children=14, curl=0.022, clump=-0.1, rough=0.08, density_vgroup='fluff')
shair(body, cape_h, 560, 0.08, (-0.05, 0, -0.09), children=14, curl=0.015, rough=0.06, density_vgroup='cape')
if R: shair(body, cape_h, 380, 0.07, (-0.1, 0, -0.15), children=12, clump=0.35, rough=0.07, curl=0.02, density_vgroup='cape')
shair(body, wingh, 420, 0.035, (-0.13, 0, -0.015), children=14, clump=0.6, rough=0.035, curl=0.008, density_vgroup='wing')
shair(body, fluff, 320, 0.045 + (0.02 if R else 0), (-0.08, 0, 0.05 if R else 0.035), children=16, clump=0.25 if not R else 0.45, rough=0.08, curl=0.02, density_vgroup='tailf')
if R: shair(body, fluff, 560, 0.07, (-0.09, 0, 0.0), children=14, curl=0.015, clump=0.4, rough=0.06, density_vgroup='crest')
else: shair(body, fluff, 560, 0.1, (-0.03, 0, 0.02), children=14, curl=0.02, rough=0.07, density_vgroup='crest')
shair(body, fluff, 200, 0.05, (0.01, 0, -0.03), children=10, curl=0.01, rough=0.05, density_vgroup='muff')

# ====================================================================== face: dark skin, slate beak, turquoise ear lobes, mulberry walnut comb
head_parts = [ellipsoid('face', (HX + 0.03, 0, HZ - 0.005), (0.06, 0.07, 0.06), skin)]
head_parts.append(beak('beak', beak_m, (HX + 0.095, 0, HZ - 0.01), length=0.09, radius=0.03, hook=0.02, tilt=10))
for s in (1, -1):
    head_parts.append(eye((HX + 0.052, s * 0.058, HZ + 0.022), (0.07, 0.035, 0.02), r=0.02))
    head_parts.append(ellipsoid('lobe', (HX - 0.01, s * 0.072, HZ - 0.035), (0.016, 0.007, 0.019) if not R else (0.02, 0.008, 0.024), lobe_m, seg=16))
    if R: head_parts.append(ellipsoid('wattle', (HX + 0.075, s * 0.012, HZ - 0.08), (0.016, 0.01, 0.026), comb_m, seg=16))
head_parts.append(ellipsoid('comb', (HX + 0.05, 0, HZ + 0.065), (0.044, 0.036, 0.03) if R else (0.028, 0.024, 0.018), comb_m, seg=16))
for o in list(bpy.data.objects):
    if o.name.startswith('pupil') and o not in head_parts: head_parts.append(o)

# ====================================================================== skeleton (same bones and poses as the other breeds)
arm_d = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm_d); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
EB = arm_d.edit_bones


def bone(name, h, t, parent=None, deform=True):
    b = EB.new(name); b.head = h; b.tail = t; b.use_deform = deform
    if parent: b.parent = EB[parent]
    return b


bone('root', (0, 0, 0), (0, 0, 0.2), deform=False)
bone('body', (-0.16, 0, 0.6), (0.2, 0, 0.7), 'root')
bone('neck1', (0.18, 0, 0.82 + r_), (0.3, 0, 1.0 + r_), 'body')
bone('neck2', (0.3, 0, 1.0 + r_), (0.39, 0, 1.13 + hz), 'neck1')
bone('head', (0.39, 0, 1.13 + hz), (0.53, 0, 1.2 + hz), 'neck2')
bone('tail', (-0.28, 0, 0.78 + r_), (-0.46, 0, 0.95 + r_), 'body')
for s, sd in ((1, 'L'), (-1, 'R')):
    bone('thigh.' + sd, (0.04, s * 0.09, 0.44), (-0.03, s * 0.09, 0.23), 'body')
    bone('shank.' + sd, (-0.03, s * 0.09, 0.23), (0.02, s * 0.09, 0.03), 'thigh.' + sd)
bpy.ops.object.mode_set(mode='OBJECT')
body.parent = rig; bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# the fluff must follow the bent body: put the armature first in the modifier stack
bpy.context.view_layer.objects.active = body
arm_mod = [m for m in body.modifiers if m.type == 'ARMATURE'][0]
bpy.ops.object.modifier_move_to_index(modifier=arm_mod.name, index=0)
for o in head_parts:
    if o.parent is None:
        mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = 'head'; o.matrix_world = mw

# legs: slate shanks, five toes, fluffy feathered feet
targets, legobjs = {}, []
for s, sd in ((1, 'L'), (-1, 'R')):
    tgt = bpy.data.objects.new('foot.' + sd, None); bpy.context.collection.objects.link(tgt)
    tgt.location = (0.02, s * 0.09, 0.03); targets[sd] = tgt
    pb = rig.pose.bones['shank.' + sd]
    ik = pb.constraints.new('IK'); ik.target = tgt; ik.chain_count = 2
    pole = bpy.data.objects.new('pole.' + sd, None); bpy.context.collection.objects.link(pole); pole.location = (-0.6, s * 0.09, 0.32)
    ik.pole_target = pole
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.024, depth=0.22, location=(0, 0, 0))
    sk = bpy.context.object; sk.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legobjs.append(sk)
    a_, b_ = Vector((-0.03, s * 0.09, 0.24)), Vector((0.02, s * 0.09, 0.03))
    sk.matrix_world = Matrix.Translation((a_ + b_) / 2) @ (b_ - a_).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    mw = sk.matrix_world.copy(); sk.parent = rig; sk.parent_type = 'BONE'; sk.parent_bone = 'shank.' + sd; sk.matrix_world = mw
    ff = ellipsoid('footfluff', (-0.01, s * 0.1, 0.12), (0.03, 0.03, 0.08), under, seg=16)       # feathered shanks
    shair(ff, fluff, 90, 0.035, (-0.03, 0, -0.02), children=10, rough=0.05)
    mw = ff.matrix_world.copy(); ff.parent = rig; ff.parent_type = 'BONE'; ff.parent_bone = 'shank.' + sd; ff.matrix_world = mw; legobjs.append(ff)
    for ang, L in [(0, 0.12), (30, 0.1), (-30, 0.1), (172, 0.05), (188, 0.045)]:       # Silkies have five toes
        a = math.radians(ang)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.013, radius2=0.006, depth=L, location=(0.02 + math.cos(a) * L / 2, s * 0.09 + math.sin(a) * L / 2, 0.012), rotation=(0, math.radians(90), a))
        t = bpy.context.object; t.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legobjs.append(t)
        mw = t.matrix_world.copy(); t.parent = tgt; t.matrix_world = mw

# ====================================================================== poses (as the other breeds)
PITCH, ROLL, YAWV = Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))


def turn(pb, axis, deg):
    rest = pb.bone.matrix_local.to_3x3()
    pb.rotation_quaternion = Quaternion((rest.inverted() @ axis).normalized(), math.radians(deg)) @ pb.rotation_quaternion


def shift(pb, v):
    pb.location = pb.bone.matrix_local.to_3x3().inverted() @ Vector(v)


headtgt = bpy.data.objects.new('headtgt', None); bpy.context.collection.objects.link(headtgt)
hik = rig.pose.bones['neck2'].constraints.new('IK'); hik.target = headtgt; hik.chain_count = 2; hik.influence = 0.0
HEAD_TIP = rig.data.bones['neck2'].tail_local.copy()
WALK_N = 8


def pose(name):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    for sd, s in (('L', 1), ('R', -1)):
        targets[sd].location = (0.02, s * 0.09, 0.03); targets[sd].rotation_euler = (0, 0, 0); targets[sd].scale = (1, 1, 1)
    hik.influence = 0.0; rig.data.bones['head'].use_inherit_rotation = True
    B = rig.pose.bones
    for o in legobjs: o.hide_render = name == 'sit'
    if name.startswith('walk'):
        ph = int(name[4:]) / WALK_N
        shift(B['body'], (0, 0, -0.01 + 0.01 * math.cos(4 * math.pi * (ph - 0.3))))
        lean = -5 * math.sin(2 * math.pi * (ph - 0.05))            # a Silkie waddles a little more
        turn(B['body'], ROLL, lean); turn(B['body'], PITCH, 3); turn(B['body'], YAWV, 2.5 * math.sin(2 * math.pi * ph))
        turn(B['tail'], ROLL, -lean * 1.2)
        hb = (ph * 2 + 0.15) % 1.0
        dx = 0.05 - 0.1 * (hb / 0.68) if hb < 0.68 else -0.05 + 0.1 * smooth(0.68, 1.0, hb)
        headtgt.location = HEAD_TIP + Vector((dx, 0, -0.006 if hb >= 0.68 else 0.0)); hik.influence = 1.0
        rig.data.bones['head'].use_inherit_rotation = False; turn(B['head'], PITCH, 8)
        for sd, s, off in (('L', 1, 0.0), ('R', -1, 0.5)):
            q = (ph + off) % 1.0
            if q < 0.62: x = 0.1 - 0.22 * (q / 0.62); z = 0.03; curl = 0.0; pitch = 0.0
            else:
                k = (q - 0.62) / 0.38; x = -0.12 + 0.22 * smooth(0, 1, k); z = 0.03 + 0.1 * math.sin(math.pi * k) ** 0.8
                curl = math.sin(math.pi * min(1.0, k * 1.25)); pitch = 0.9 * math.sin(math.pi * k) - 0.15 * smooth(0.75, 1.0, k)
            targets[sd].location = (x + 0.02, s * 0.09, z); targets[sd].rotation_euler = (0, pitch, 0); targets[sd].scale = (1 - 0.45 * curl, 1 - 0.5 * curl, 1)
    elif name.startswith('peck'):
        k = int(name[4:])
        body_, n1, n2, hd = [(14, 26, 30, 14), (30, 50, 30, 24), (18, 30, 26, 4)][k]
        turn(B['body'], PITCH, body_); turn(B['neck1'], PITCH, n1); turn(B['neck2'], PITCH, n2); turn(B['head'], PITCH, hd)
        if k == 2: turn(B['head'], ROLL, -14); turn(B['head'], YAWV, -12)
    elif name.startswith('look'):
        side = -1 if name == 'look1' else 1
        turn(B['neck2'], YAWV, 14 * side); turn(B['head'], YAWV, 34 * side); turn(B['head'], ROLL, 16 * side)
        turn(B['neck1'], PITCH, -5 if side < 0 else 4)
    elif name.startswith('scratch'):
        back = name == 'scratch1'
        turn(B['body'], PITCH, 9 if back else 6); turn(B['neck1'], PITCH, 22); turn(B['neck2'], PITCH, 10); turn(B['head'], PITCH, 20)
        shift(B['body'], (0, 0, -0.02))
        targets['R'].location = (-0.16, -0.1, 0.035) if back else (0.11, -0.09, 0.065)
        targets['R'].rotation_euler = (0, -0.35 if back else 0.5, 0)
    elif name == 'sit':
        shift(B['body'], (0, 0, -0.17)); B['body'].scale = (1.05, 1.0, 1.05); turn(B['neck1'], PITCH, -6)
        for sd, s in (('L', 1), ('R', -1)): targets[sd].location = (0.0, s * 0.09, 0.14)
    elif name == 'crow':
        turn(B['body'], PITCH, -16); turn(B['neck1'], PITCH, -14); turn(B['neck2'], PITCH, -20); turn(B['head'], PITCH, -30)
    bpy.context.view_layer.update()


size = bpy.data.objects.new('size', None); bpy.context.collection.objects.link(size)
for o in [rig, headtgt] + list(targets.values()) + [bpy.data.objects['pole.L'], bpy.data.objects['pole.R']]:
    o.parent = size
size.scale = (0.86,) * 3          # Silkies are a small breed

os.environ.setdefault('CAMX', '-0.12' if R else '0.08')
first = True
for name in POSES:
    pose('stand' if name == 'card' else name)
    out = os.path.join(OUTDIR, '%s_sil_%s_%s.png' % (name, COLOUR, SEX))
    t0 = time.time()
    if first:
        stage(scn, out, res=RES, ortho=2.4 if R else 2.05, samples=int(os.environ.get('SAMPLES', 32)), center_z=0.86 if R else 0.8, cam_h=1.6 if R else 1.55)
        first = False
    else:
        scn.render.filepath = out; bpy.ops.render.render(write_still=True)
    print('POSE', name, round(time.time() - t0, 1), flush=True)
print('SILKIE2_DONE')
