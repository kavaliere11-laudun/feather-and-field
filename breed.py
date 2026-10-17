"""One adjustable chicken model for every breed and both sexes.
Usage: python breed.py -- OUT.png RES BREED SEX     (BREED: rir orp leg bra · SEX: h r · env FARM=1 for the farm camera)"""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector
from ffbird import reset, principled, ellipsoid, deform, hair, comb_single, beak, eye, feather_mat, stage

args = sys.argv[sys.argv.index('--') + 1:]
OUT, RES, BREED, SEX = args[0], int(args[1]), args[2], args[3]
POSE = args[4] if len(args) > 4 else ''
PECK = POSE == 'peck'
WALK = {'walk1': 1, 'walk2': 2}.get(POSE, 0)
PECK_A, PECK_PX, PECK_PZ = math.radians(82), 0.26, 0.84
R = SEX == 'r'
scn = reset()
clamp01 = lambda v: max(0.0, min(1.0, v))

# ====================================================================== breed settings
BASE = dict(
    S=1.0, tilt=0.0, drop=0.13, torso=(0.49, 0.3, 0.32), front_lift=0.06, rear_rise=0.2, hdx=0.0, hdz=0.0,
    body=(0.13, 0.015, 0.0045), body_edge=(0.1, 0.011, 0.0035),
    hackle=((0.09, 0.01, 0.003), (0.12, 0.014, 0.004)), soft=((0.11, 0.012, 0.0035), (0.14, 0.017, 0.005)), breast=None,
    fluff=((0.15, 0.025, 0.007), (0.19, 0.035, 0.009)), wing=((0.11, 0.012, 0.0035), (0.035, 0.007, 0.004)),
    sec=((0.1, 0.012, 0.0035), (0.02, 0.009, 0.005), (0.045, 0.01, 0.004)),
    tail=((0.08, 0.011, 0.0035), (0.01, 0.009, 0.007), (0.03, 0.009, 0.005), 0.18), tail_coat=None,
    saddle=None, sickle=((0.006, 0.008, 0.007), (0.3, 0.9, 0.55)),
    leg=(0.62, 0.48, 0.24), beak=(0.6, 0.42, 0.14), comb=(0.6, 0.025, 0.02), lobe=None, eye=(0.65, 0.2, 0.03),
    hackle_pat=None, saddle_pat=None, soft_pat=None, tail_pat=None,
    tail_n=8, tail_e0=40, tail_de=5, tail_L=0.27, tail_W=0.1,
    fluffy=1.0, under_scale=1.0, cushion_scale=1.0, hip=0.3, leg_r=0.022, toe=0.14, thigh=1.0, feathered_legs=False,
    comb_type='single', crest=False,
)
HEN = {
    'rir': dict(),
    'orp': dict(S=1.06, torso=(0.47, 0.36, 0.35), front_lift=0.04, rear_rise=0.12, hdx=-0.03, hdz=-0.06,
                body=(0.4, 0.15, 0.03), body_edge=(0.33, 0.12, 0.024),
                hackle=((0.42, 0.16, 0.03), (0.5, 0.21, 0.04)), soft=((0.38, 0.14, 0.028), (0.46, 0.18, 0.035)),
                fluff=((0.42, 0.16, 0.032), (0.5, 0.21, 0.042)), wing=((0.36, 0.13, 0.026), (0.3, 0.11, 0.022)),
                sec=((0.36, 0.13, 0.026), (0.28, 0.1, 0.02), (0.3, 0.11, 0.022)),
                tail=((0.36, 0.13, 0.026), (0.27, 0.1, 0.02), (0.3, 0.11, 0.022), 0.5),
                leg=(0.78, 0.62, 0.52), beak=(0.78, 0.66, 0.48), eye=(0.6, 0.18, 0.04),
                tail_n=7, tail_e0=26, tail_de=5, tail_L=0.2, tail_W=0.1, fluffy=1.5, under_scale=1.35, cushion_scale=1.35,
                hip=0.27, thigh=1.25),
    'leg': dict(S=0.92, torso=(0.47, 0.27, 0.29), front_lift=0.08, rear_rise=0.22, hdz=0.04, tilt=4,
                body=(0.13, 0.11, 0.09), body_edge=(0.09, 0.075, 0.06),
                hackle=((0.5, 0.45, 0.34), (0.6, 0.55, 0.42)), hackle_pat=('bars', (0.16, 0.15, 0.13), 22),
                soft=((0.15, 0.13, 0.1), (0.2, 0.17, 0.13)), soft_pat=('bars', (0.07, 0.065, 0.055), 18),
                breast=((0.36, 0.13, 0.06), (0.42, 0.17, 0.08)),
                fluff=((0.32, 0.29, 0.25), (0.4, 0.37, 0.32)), wing=((0.15, 0.13, 0.1), (0.08, 0.07, 0.06)),
                sec=((0.14, 0.12, 0.1), (0.06, 0.055, 0.05), (0.08, 0.07, 0.06)),
                tail=((0.12, 0.11, 0.09), (0.05, 0.045, 0.04), (0.07, 0.06, 0.05), 0.3), tail_pat=('bars', (0.04, 0.04, 0.035), 26),
                leg=(0.62, 0.46, 0.08), beak=(0.62, 0.5, 0.2), lobe=(0.78, 0.76, 0.7), eye=(0.65, 0.3, 0.05),
                tail_e0=46, tail_L=0.26, tail_W=0.085, crest=True),
    'bra': dict(S=1.12, tilt=7, torso=(0.5, 0.32, 0.36), front_lift=0.08, rear_rise=0.16, hdz=0.07, hdx=0.02,
                body=(0.72, 0.71, 0.68), body_edge=(0.6, 0.59, 0.56),
                hackle=((0.75, 0.74, 0.71), (0.8, 0.79, 0.76)), hackle_pat=('random', (0.012, 0.012, 0.014), 0.42),
                soft=((0.72, 0.71, 0.68), (0.8, 0.79, 0.76)), fluff=((0.78, 0.77, 0.74), (0.85, 0.84, 0.81)),
                wing=((0.72, 0.71, 0.68), (0.6, 0.59, 0.56)),
                sec=((0.7, 0.69, 0.66), (0.03, 0.03, 0.032), (0.4, 0.4, 0.38)),
                tail=((0.015, 0.015, 0.017), (0.008, 0.008, 0.01), (0.012, 0.012, 0.014), 0.3), tail_coat=(0.35, 0.8, 0.55),
                leg=(0.66, 0.5, 0.12), beak=(0.7, 0.56, 0.26), eye=(0.62, 0.26, 0.04),
                tail_n=7, tail_e0=44, tail_L=0.22, tail_W=0.1, fluffy=1.3, under_scale=1.25, hip=0.32, thigh=1.2,
                feathered_legs=True, comb_type='pea'),
}
ROOSTER = {
    'rir': dict(tilt=10, drop=0.08, hdz=0.08, torso=(0.48, 0.29, 0.31), body=(0.12, 0.012, 0.0035),
                hackle=((0.2, 0.02, 0.004), (0.3, 0.042, 0.007)), saddle=((0.19, 0.019, 0.004), (0.28, 0.04, 0.007)),
                wing=((0.2, 0.022, 0.005), (0.02, 0.008, 0.005)), tail=((0.008, 0.01, 0.009), (0.005, 0.006, 0.006), (0.008, 0.01, 0.009), 0.1),
                tail_coat=(0.3, 0.9, 0.55), sec=((0.03, 0.012, 0.006), (0.01, 0.008, 0.006), (0.02, 0.01, 0.006)),
                hip=0.36, leg_r=0.026),
    'orp': dict(tilt=6, drop=0.1, hdz=-0.01, hackle=((0.5, 0.2, 0.035), (0.58, 0.26, 0.05)), saddle=((0.48, 0.19, 0.034), (0.56, 0.25, 0.048)),
                sickle=((0.34, 0.12, 0.024), (1.0, 0.8, 0.5)), hip=0.3),
    'leg': dict(tilt=10, drop=0.08, hdz=0.1, body=(0.2, 0.2, 0.19), body_edge=(0.12, 0.12, 0.115),
                hackle=((0.62, 0.55, 0.38), (0.72, 0.65, 0.46)), saddle=((0.6, 0.53, 0.37), (0.7, 0.63, 0.45)), saddle_pat=('bars', (0.2, 0.18, 0.14), 20),
                soft=((0.24, 0.24, 0.23), (0.32, 0.32, 0.3)), soft_pat=('bars', (0.06, 0.06, 0.058), 18), breast=None,
                wing=((0.24, 0.24, 0.23), (0.12, 0.12, 0.115)), sickle=((0.35, 0.35, 0.33), (1, 1, 1)), hip=0.36),
    'bra': dict(tilt=12, drop=0.1, hdz=0.12, saddle=((0.75, 0.74, 0.71), (0.8, 0.79, 0.76)), saddle_pat=('random', (0.012, 0.012, 0.014), 0.45),
                sickle=((0.01, 0.012, 0.012), (0.3, 0.85, 0.55)), hip=0.36),
}
C = dict(BASE); C.update(HEN[BREED])
if R: C.update(ROOSTER[BREED])
if C['breast'] is None: C['breast'] = C['soft']
if C['lobe'] is None: C['lobe'] = C['comb']


# ====================================================================== materials and shapes
def hmat(name, col, tip, pat=None):
    """Hair colour with optional barring along each strand or a random two-colour mix (striped hackles)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes; Lk = nt.links.new
    out = N.new('ShaderNodeOutputMaterial'); h = N.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = 0.32; h.inputs['Radial Roughness'].default_value = 0.7; h.inputs['Coat'].default_value = 0.12
    info = N.new('ShaderNodeHairInfo')
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = (*col, 1); mix.inputs['B'].default_value = (*tip, 1)
    Lk(info.outputs['Intercept'], mix.inputs['Factor']); last = mix.outputs['Result']
    if pat and pat[0] == 'bars':
        mt = N.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = pat[2]; Lk(info.outputs['Intercept'], mt.inputs[0])
        sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'; Lk(mt.outputs[0], sn.inputs[0])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.1; Lk(sn.outputs[0], gt.inputs[0])
        bm_ = N.new('ShaderNodeMix'); bm_.data_type = 'RGBA'; bm_.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], bm_.inputs['Factor']); Lk(last, bm_.inputs['A']); last = bm_.outputs['Result']
    if pat and pat[0] == 'random':
        lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = pat[2]; Lk(info.outputs['Random'], lt.inputs[0])
        # the dark strands stay pale at the tip, like a black feather with a white edge
        tipw = N.new('ShaderNodeMath'); tipw.operation = 'LESS_THAN'; tipw.inputs[1].default_value = 0.85; Lk(info.outputs['Intercept'], tipw.inputs[0])
        both = N.new('ShaderNodeMath'); both.operation = 'MULTIPLY'; Lk(lt.outputs[0], both.inputs[0]); Lk(tipw.outputs[0], both.inputs[1])
        rm = N.new('ShaderNodeMix'); rm.data_type = 'RGBA'; rm.inputs['B'].default_value = (*pat[1], 1)
        Lk(both.outputs[0], rm.inputs['Factor']); Lk(last, rm.inputs['A']); last = rm.outputs['Result']
    Lk(last, h.inputs['Color']); Lk(h.outputs[0], out.inputs['Surface'])
    return m


def fmat(name, base, tip, edge, L, W, tip_from=0.5, pat=None, coat=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['Object'], sx.inputs[0])
    tf = N.new('ShaderNodeMapRange'); tf.inputs['From Min'].default_value = L * tip_from; tf.inputs['From Max'].default_value = L
    Lk(sx.outputs['X'], tf.inputs['Value'])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; Lk(sx.outputs['Y'], ab.inputs[0])
    ef = N.new('ShaderNodeMapRange'); ef.inputs['From Min'].default_value = W * 0.4; ef.inputs['From Max'].default_value = W * 0.5
    Lk(ab.outputs[0], ef.inputs['Value'])
    c1 = N.new('ShaderNodeMix'); c1.data_type = 'RGBA'; c1.inputs['A'].default_value = (*base, 1); c1.inputs['B'].default_value = (*tip, 1)
    Lk(tf.outputs['Result'], c1.inputs['Factor']); last = c1.outputs['Result']
    if pat and pat[0] == 'bars':
        mt = N.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = pat[2] / L * 1.2; Lk(sx.outputs['X'], mt.inputs[0])
        sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'; Lk(mt.outputs[0], sn.inputs[0])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.1; Lk(sn.outputs[0], gt.inputs[0])
        bm_ = N.new('ShaderNodeMix'); bm_.data_type = 'RGBA'; bm_.inputs['B'].default_value = (*pat[1], 1)
        Lk(gt.outputs[0], bm_.inputs['Factor']); Lk(last, bm_.inputs['A']); last = bm_.outputs['Result']
    em = N.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = 0.55; Lk(ef.outputs['Result'], em.inputs[0])
    c2 = N.new('ShaderNodeMix'); c2.data_type = 'RGBA'; c2.inputs['B'].default_value = (*edge, 1)
    Lk(em.outputs[0], c2.inputs['Factor']); Lk(last, c2.inputs['A'])
    oi = N.new('ShaderNodeObjectInfo')
    jr = N.new('ShaderNodeMapRange'); jr.inputs['To Min'].default_value = 0.88; jr.inputs['To Max'].default_value = 1.12; Lk(oi.outputs['Random'], jr.inputs['Value'])
    vm = N.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; Lk(c2.outputs['Result'], vm.inputs[0]); Lk(jr.outputs['Result'], vm.inputs['Scale'])
    Lk(vm.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.55; b.inputs['Specular IOR Level'].default_value = 0.3
    if coat:
        b.inputs['Coat Weight'].default_value = 0.5; b.inputs['Coat Tint'].default_value = (*coat, 1); b.inputs['Coat Roughness'].default_value = 0.2
    return m


def card(name, L, W, mat, curve=0.0, cup=0.15, n=18, tip=0.5):
    """Feather with a rounded tip, lying along +X, outer face +Z."""
    bm = bmesh.new(); rows = []
    for i in range(n + 1):
        t = i / n
        w = W * min(1, t / 0.15) ** 0.5 * (math.sqrt(max(0, 1 - ((t - tip) / (1 - tip)) ** 2)) if t > tip else 1)
        w = max(w, 0.0008); x = t * L; z = curve * L * t * t
        rows.append([bm.verts.new((x, w / 2, z - cup * w)), bm.verts.new((x, 0, z)), bm.verts.new((x, -w / 2, z - cup * w))])
    for i in range(n):
        for j in range(2):
            bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.005
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(mat); return o


def sickle(name, L, W, a0, k, mat, n=30):
    """A long arching tail feather, flat in the side plane: rises at angle a0 and bends over by curvature k."""
    bm = bmesh.new(); px = pz = 0.0; a = a0; ds = L / n; rows = []
    for i in range(n + 1):
        t = i / n
        w = max(0.001, W * min(1, t / 0.12) ** 0.5 * (1 - t ** 3) ** 0.6)
        nx, nz = -math.sin(a), math.cos(a)
        rows.append((bm.verts.new((px + nx * w / 2, 0, pz + nz * w / 2)), bm.verts.new((px - nx * w / 2, 0, pz - nz * w / 2))))
        px += math.cos(a) * ds; pz += math.sin(a) * ds; a -= k * ds
    for i in range(n):
        bm.faces.new((rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.004
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(mat); return o


def activate(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o


# ====================================================================== body
BODY = C['body']; F = C['fluffy']; sx, sy, sz = C['torso']; hdx, hdz = C['hdx'], C['hdz']
body_m = feather_mat('plumage', base=BODY, edge=C['body_edge'], scale=(6, 8, 6), bump=0.02, rough=0.6)
hackle_h = hmat('hackle', *C['hackle'], pat=C['hackle_pat'])
soft_h = hmat('soft', *C['soft'], pat=C['soft_pat'])
breast_h = hmat('breast', *C['breast'], pat=C['soft_pat'] if C['breast'] is C['soft'] else None)
fluff_h = hmat('fluff', *C['fluff'])
red = principled('comb', C['comb'], 0.4, sss=0.35)
skin = principled('face', tuple(c * 0.85 for c in C['comb']), 0.45, sss=0.3)
lobe_m = principled('lobe', C['lobe'], 0.35, sss=0.2)
beak_m = principled('beak', C['beak'], 0.32, coat=0.3)
leg_m = principled('leg', C['leg'], 0.45)

torso = ellipsoid('torso', (0, 0, 0.68), (sx, sy, sz), None)
fl, rr = C['front_lift'], C['rear_rise']
deform(torso, lambda p: (p.x, p.y, p.z + fl * max(0, p.x) * (1 if p.z > 0.68 else 0.3)
                         + rr * max(0, -p.x - 0.05) * (1 if p.z > 0.68 else 0.35)
                         - 0.05 * max(0, p.x) * (1 if p.z < 0.68 else 0)))
HX, HZ = 0.48 + hdx, 1.33 + hdz
parts = [torso,
         ellipsoid('throat', (0.33, 0, 0.87), (0.19, 0.17 * sy / 0.3, 0.18), None),
         ellipsoid('shoulders', (0.18, 0, 0.9), (0.2, 0.22 * sy / 0.3, 0.12), None),
         ellipsoid('neck', (0.4 + hdx * 0.6, 0, 1.06 + hdz * 0.5), (0.12 * (1.08 if R else 1), 0.105 * (1.08 if R else 1), 0.25 + hdz * 0.5), None, rot=(0, math.radians(10), 0)),
         ellipsoid('head', (HX, 0, HZ), (0.08, 0.064, 0.07), None)]
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = torso; bpy.ops.object.join()
body = bpy.context.object; body.name = 'bird'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for mod_type, kw in (('REMESH', dict(mode='VOXEL', voxel_size=0.012)), ('SMOOTH', dict(factor=0.8, iterations=12))):
    m = body.modifiers.new(mod_type.lower(), mod_type)
    for k, v in kw.items(): setattr(m, k, v)
    activate(body); bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth(); body.data.materials.append(body_m)
orig = [v.co.copy() for v in body.data.vertices]


def swing_xz(x, z, a):
    dx, dz = x - PECK_PX, z - PECK_PZ
    return PECK_PX + dx * math.cos(a) + dz * math.sin(a), PECK_PZ - dx * math.sin(a) + dz * math.cos(a)


if PECK:   # bend the neck down: full swing at the head, none at the shoulders
    for v in body.data.vertices:
        x, y, z = v.co
        w = clamp01((z - 0.84) / 0.2) * clamp01((x - 0.14) / 0.12)
        w = w * w * (3 - 2 * w)
        v.co.x, v.co.z = swing_xz(x, z, PECK_A * w)
    body.data.update()

groups = {n: body.vertex_groups.new(name=n) for n in ('hackle', 'upper', 'breast', 'saddle')}
cape_top = HZ - (0.07 if BREED == 'bra' else 0.13)
for v in body.data.vertices:
    x, y, z = orig[v.index]
    cape = clamp01((z - 0.8) / 0.12) * clamp01((x + 0.02) / 0.16)
    if R: cape *= 1 - 0.85 * clamp01((v.normal.x - 0.15) / 0.35)   # long hackles on the back and sides, not hanging off the throat
    if z > cape_top: cape = 0.0
    saddle = clamp01((-x - 0.02) / 0.1) * clamp01((z - 0.86) / 0.06) if R else 0.0
    br = clamp01((v.normal.x - 0.45) / 0.25) * clamp01((z - 0.55) / 0.08) * clamp01((1.02 - z) / 0.06) * (1 - cape)
    up = clamp01((z - 0.52) / 0.1) * clamp01((x + 0.38) / 0.12) * (clamp01((0.98 - z) / 0.08) if x > 0.12 else 1.0) * (1 - cape) * (1 - br) * (1 - saddle)
    groups['hackle'].add([v.index], cape, 'REPLACE'); groups['breast'].add([v.index], br, 'REPLACE')
    groups['upper'].add([v.index], up, 'REPLACE'); groups['saddle'].add([v.index], saddle, 'REPLACE')

if R:   # a rooster's hackle is longer and glossier and falls over the shoulders
    hair(body, hackle_h, 1800, 0.014, (-0.05, 0, -0.17), children=10, clump=0.8, rough=0.012, density_vgroup='hackle')
    sad_h = hmat('saddle', *C['saddle'], pat=C['saddle_pat'])
    hair(body, sad_h, 900, 0.014, (-0.12, 0, -0.1), children=10, clump=0.8, rough=0.012, density_vgroup='saddle')
else:
    hair(body, hackle_h, 1500, 0.012, (-0.045, 0, -0.11), children=10, clump=0.75, rough=0.012, density_vgroup='hackle')
hair(body, soft_h, 1400, 0.011 * F, (-0.06, 0, -0.01), children=8, clump=0.7, rough=0.012, density_vgroup='upper')
hair(body, breast_h, 900, 0.012 * F, (-0.01, 0, -0.03), children=8, clump=0.8, rough=0.01, density_vgroup='breast')
us = C['under_scale']
uf = ellipsoid('underfluff', (-0.26, 0, 0.51), (0.18 * us, 0.17 * us, 0.12 * us), body_m)
hair(uf, fluff_h, 300, 0.016 * F, (-0.035, 0, -0.01), children=10, clump=0.5, rough=0.025, curl=0.005)

# ====================================================================== head
before_head = set(bpy.data.objects)
dx, dz = hdx, hdz
ellipsoid('face', (0.52 + dx, 0, 1.318 + dz), (0.048, 0.062, 0.044), skin)
if C['comb_type'] == 'pea':
    for i in range(3):
        ellipsoid('pea', (0.47 + dx + i * 0.025, 0, 1.39 + dz - i * 0.006), (0.018, 0.018 if i == 1 else 0.012, 0.012 + (0.006 if R else 0)), red, seg=16)
elif R:
    comb_single('comb', red, base_len=0.2, height=0.12, points=6, loc=(0.38 + dx, 0, 1.385 + dz), thick=0.02)
elif BREED == 'leg':
    comb_single('comb', red, base_len=0.12, height=0.05, points=5, loc=(0.44 + dx, 0, 1.385 + dz))
else:
    comb_single('comb', red, base_len=0.14, height=0.06, points=5, loc=(0.42 + dx, 0, 1.385 + dz))
wat = (0.026, 0.011, 0.062) if R else (0.02, 0.01, 0.038)
if C['comb_type'] == 'pea': wat = (0.016, 0.009, 0.026)
for s in (1, -1):
    ellipsoid('wattle', (0.556 + dx, s * 0.014, 1.29 + dz - wat[2] * 1.1), wat, red, seg=20)
    ellipsoid('lobe', (0.478 + dx, s * 0.064, 1.296 + dz), (0.017, 0.007, 0.022) if R else (0.015, 0.006, 0.019), lobe_m, seg=16)
    eye((0.532 + dx, s * 0.058, 1.336 + dz), C['eye'], r=0.018)
beak('beak', beak_m, (0.578 + dx, 0, 1.318 + dz), length=0.075, radius=0.025, hook=0.017, tilt=8)
if C['crest']:   # Cream Legbar: a small swept-back crest behind the comb
    cr = ellipsoid('crest', (0.43 + dx, 0, 1.392 + dz), (0.05, 0.042, 0.03), body_m)
    hair(cr, hmat('crest', *C['hackle'], pat=C['hackle_pat']), 180, 0.006, (-0.06, 0, 0.004), children=8, clump=0.75, rough=0.012)

if PECK:
    for o in [o for o in bpy.data.objects if o not in before_head and o.parent is None]:
        o.location.x, o.location.z = swing_xz(o.location.x, o.location.z, PECK_A)
        o.rotation_euler.y += PECK_A

# ====================================================================== wings
wing_h = hmat('wing', *C['wing'], pat=C['soft_pat'])
sec_m = fmat('secondaries', *C['sec'], 0.36, 0.07, tip_from=0.5)
for s in (1, -1):
    w = ellipsoid('wing', (0.0, s * (sy - 0.038), 0.765), (0.29, 0.045, 0.13), body_m, rot=(0, math.radians(12), 0))
    hair(w, wing_h, 900, 0.01, (-0.1, 0, -0.012), children=8, clump=0.85, rough=0.01, radius=0.6, tip=0.2)
    for k in range(5):
        z = 0.69 - k * 0.022; x = 0.06 - k * 0.03
        f = card('secondary', 0.36 - k * 0.014, 0.085, sec_m, curve=-0.03, cup=0.015, tip=0.72)
        yy = (sy - 0.038) + 0.03 * math.sqrt(max(0.0, 1 - (x / 0.3) ** 2))
        f.location = (x, s * (yy - k * 0.0015), z)
        f.rotation_euler = (s * math.pi / 2, math.radians(8 + k * 1.0), math.pi)

# ====================================================================== tail
tb, tt, te, tfrom = C['tail']
tail_m = fmat('tail', tb, tt, te, C['tail_L'], C['tail_W'], tip_from=tfrom, pat=C['tail_pat'], coat=C['tail_coat'])
cov_m = fmat('tailcovert', BODY, tuple(c * 0.6 for c in BODY), C['body_edge'], 0.16, 0.085, tip_from=0.4, pat=C['tail_pat'])
tx, tz = -0.42, 0.94 + (rr - 0.2) * 0.4
e0, de = C['tail_e0'] + (6 if R else 0), C['tail_de']
for s in (1, -1):
    for i in range(C['tail_n']):
        f = card('tail', C['tail_L'] * (0.95 if R else 1) - abs(i - 3.5) * 0.008, C['tail_W'] * (0.85 if R else 1), tail_m, curve=-0.05, cup=0.1)
        f.location = (tx - i * 0.004, s * (0.012 + i * 0.004), tz + i * 0.004)
        f.rotation_euler = (math.radians(90), math.pi + math.radians(e0 + i * de), s * math.radians(3 + i * 1.6))
    if not R:
        for i in range(5):
            f = card('tailcovert', 0.16, 0.085, cov_m, curve=-0.04, cup=0.12)
            f.location = (tx + 0.06 - i * 0.006, s * (0.05 + i * 0.006), tz - 0.04 + i * 0.006)
            f.rotation_euler = (math.radians(90), math.pi + math.radians(e0 - 12 + i * 7), s * math.radians(6 + i * 2))
if R:   # sickles: long arching feathers over the tail
    sk_col, sk_coat = C['sickle']
    sk_pat = C['saddle_pat'] if (C['saddle_pat'] and C['saddle_pat'][0] == 'bars') else C['tail_pat']
    sk_m = fmat('sickle', sk_col, tuple(c * 0.7 for c in sk_col), tuple(c * 0.8 for c in sk_col), 0.55, 0.05, tip_from=0.6, pat=sk_pat, coat=sk_coat)
    for s in (1, -1):
        for j, (L, W, a0, k, zr) in enumerate([(0.86, 0.07, 88, 2.3, 3), (0.76, 0.066, 84, 2.45, 7), (0.64, 0.06, 78, 2.7, 11), (0.52, 0.055, 70, 3.0, 15), (0.42, 0.05, 62, 3.4, 19)]):
            sk = sickle('sickle', L * (0.8 if BREED in ('orp', 'bra') else 1), W, math.radians(a0), k, sk_m)
            sk.location = (tx + 0.07 + j * 0.012, s * (0.012 + j * 0.007), tz - 0.02 - j * 0.02)
            sk.rotation_euler = (0, 0, math.pi + s * math.radians(zr))
cs = C['cushion_scale']
cush = ellipsoid('cushion', (-0.39, 0, 0.9 + (rr - 0.2) * 0.4), (0.12 * cs, 0.11 * cs, 0.11 * cs), body_m)
hair(cush, soft_h, 220, 0.03 * F, (-0.05, 0, 0.0), children=10, clump=0.5, rough=0.03)

# ====================================================================== posture, size and legs
upper = list(bpy.data.objects)
pivot = bpy.data.objects.new('pivot', None); bpy.context.collection.objects.link(pivot); pivot.location = (0, 0, 0.55)
bpy.context.view_layer.update()
for o in upper:
    o.parent = pivot; o.matrix_parent_inverse = pivot.matrix_world.inverted()
pivot.rotation_euler = (0, -math.radians(C['tilt'] - (20 if PECK else 0)), 0); pivot.location.z = 0.55 - C['drop']
LEGS = [(0.1, 0.075), (-0.04, -0.075)]
hip = C['hip'] + (0.13 - C['drop'])
legparts = []
for lx, ly in LEGS:
    bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=C['leg_r'], depth=hip, location=(lx, ly, hip / 2))
    o = bpy.context.object; o.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legparts.append(o)
    for ang, L in [(0, C['toe']), (30, C['toe'] * 0.8), (-30, C['toe'] * 0.8), (180, C['toe'] * 0.42)]:
        a = math.radians(ang)
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=C['leg_r'] * 0.62, radius2=C['leg_r'] * 0.38, depth=L, location=(lx + math.cos(a) * L / 2, ly + math.sin(a) * L / 2, 0.014), rotation=(0, math.radians(90), a))
        t = bpy.context.object; t.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legparts.append(t)
    th_s = C['thigh']
    th = ellipsoid('thigh', (lx - 0.02, ly * 1.15, hip - 0.015), (0.09 * th_s, 0.07 * th_s, 0.085 * th_s), body_m)
    hair(th, soft_h, 140, 0.008 * F, (-0.03, 0, -0.012), children=8, clump=0.7, rough=0.012); legparts.append(th)
    if C['feathered_legs']:   # Brahma: feathers down the outside of the leg and on the outer toes
        sh = ellipsoid('shankfeathers', (lx - 0.005, ly * 1.25, hip * 0.45), (0.035, 0.03, hip * 0.42), body_m)
        hair(sh, soft_h, 220, 0.02, (-0.02, 0.02 * (1 if ly > 0 else -1), -0.04), children=8, clump=0.6, rough=0.02)
        ft = ellipsoid('footfeathers', (lx + 0.03, ly * 1.35, 0.03), (0.06, 0.03, 0.025), body_m)
        hair(ft, soft_h, 120, 0.02, (0.03, 0.02 * (1 if ly > 0 else -1), -0.01), children=8, clump=0.6, rough=0.02)
        legparts += [sh, ft]
if WALK:
    from ffbird import stride
    legparts = stride(legparts, LEGS, hip, WALK)
size = bpy.data.objects.new('size', None); bpy.context.collection.objects.link(size)
for o in [pivot] + legparts:
    o.parent = size
size.scale = (C['S'],) * 3

import os
ORTHO = 2.4 if R else 2.05      # roosters need a wider shot for the tail; sprites are rescaled by this later
os.environ.setdefault('CAMX', '-0.12' if R else '0.08')
stage(scn, OUT, res=RES, ortho=ORTHO, center_z=0.86 if R else 0.8, cam_h=1.6 if R else 1.55)
