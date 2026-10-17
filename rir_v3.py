"""Rhode Island Red hen v3: one blended body, hackle cape, rows of wing feathers, rounded tail fan, feathered thighs."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from ffbird import *

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]
RES = int(args[1]) if len(args) > 1 else 384

scn = reset()
BODY = (0.13, 0.015, 0.0045)
body_m = feather_mat('plumage', base=BODY, edge=(0.1, 0.011, 0.0035), scale=(6, 8, 6), bump=0.02, rough=0.6)
hackle_h = hair_mat('hacklehair', (0.09, 0.01, 0.003), 0.32, tip=(0.12, 0.014, 0.004))
soft_h = hair_mat('softedge', (0.11, 0.012, 0.0035), 0.35, tip=(0.14, 0.017, 0.005))
fluff_h = hair_mat('underfluff', (0.15, 0.025, 0.007), 0.4, tip=(0.19, 0.035, 0.009))
red = principled('comb', (0.6, 0.025, 0.02), 0.4, sss=0.35)
skin = principled('face', (0.5, 0.03, 0.025), 0.45, sss=0.3)
beak_m = principled('beak', (0.6, 0.42, 0.14), 0.32, coat=0.3)
leg_m = principled('leg', (0.62, 0.48, 0.24), 0.45)


def activate(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o


def fmat(name, base, tip, edge, L, W, tip_from=0.5):
    """Feather colour: base fading to tip colour along the length, darker towards the edges."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['Object'], sx.inputs[0])
    tf = N.new('ShaderNodeMapRange'); tf.inputs['From Min'].default_value = L * tip_from; tf.inputs['From Max'].default_value = L
    Lk(sx.outputs['X'], tf.inputs['Value'])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; Lk(sx.outputs['Y'], ab.inputs[0])
    ef = N.new('ShaderNodeMapRange'); ef.inputs['From Min'].default_value = W * 0.4; ef.inputs['From Max'].default_value = W * 0.5
    Lk(ab.outputs[0], ef.inputs['Value'])
    c1 = N.new('ShaderNodeMix'); c1.data_type = 'RGBA'; c1.inputs['A'].default_value = (*base, 1); c1.inputs['B'].default_value = (*tip, 1)
    Lk(tf.outputs['Result'], c1.inputs['Factor'])
    em = N.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = 0.55; Lk(ef.outputs['Result'], em.inputs[0])
    c2 = N.new('ShaderNodeMix'); c2.data_type = 'RGBA'; c2.inputs['B'].default_value = (*edge, 1)
    Lk(em.outputs[0], c2.inputs['Factor']); Lk(c1.outputs['Result'], c2.inputs['A'])
    oi = N.new('ShaderNodeObjectInfo')
    jr = N.new('ShaderNodeMapRange'); jr.inputs['To Min'].default_value = 0.85; jr.inputs['To Max'].default_value = 1.15; Lk(oi.outputs['Random'], jr.inputs['Value'])
    vm = N.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; Lk(c2.outputs['Result'], vm.inputs[0]); Lk(jr.outputs['Result'], vm.inputs['Scale'])
    Lk(vm.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.6; b.inputs['Specular IOR Level'].default_value = 0.3
    return m


def card(name, L, W, mat, curve=0.0, cup=0.15, n=18, tip=0.5):
    TIP = tip
    """Feather with a rounded tip, lying along +X, outer face +Z."""
    bm = bmesh.new(); rows = []
    for i in range(n + 1):
        t = i / n
        w = W * min(1, t / 0.15) ** 0.5 * (math.sqrt(max(0, 1 - ((t - TIP) / (1 - TIP)) ** 2)) if t > TIP else 1)
        w = max(w, 0.0008)
        x = t * L; z = curve * L * t * t
        rows.append([bm.verts.new((x, w / 2, z - cup * w)), bm.verts.new((x, 0, z)), bm.verts.new((x, -w / 2, z - cup * w))])
    for i in range(n):
        for j in range(2):
            bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.005
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(mat)
    return o


# ------------------------------------------------------------------ one blended body: torso, throat, neck and head
torso = ellipsoid('torso', (0, 0, 0.68), (0.49, 0.3, 0.32), None)
deform(torso, lambda p: (p.x, p.y, p.z + 0.06 * max(0, p.x) * (1 if p.z > 0.68 else 0.3)
                         + 0.2 * max(0, -p.x - 0.05) * (1 if p.z > 0.68 else 0.35)
                         - 0.05 * max(0, p.x) * (1 if p.z < 0.68 else 0)))
parts = [torso,
         ellipsoid('throat', (0.33, 0, 0.87), (0.19, 0.17, 0.18), None),
         ellipsoid('shoulders', (0.18, 0, 0.9), (0.2, 0.22, 0.12), None),
         ellipsoid('neck', (0.4, 0, 1.06), (0.12, 0.105, 0.25), None, rot=(0, math.radians(10), 0)),
         ellipsoid('head', (0.48, 0, 1.33), (0.08, 0.064, 0.07), None)]
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = torso; bpy.ops.object.join()
body = bpy.context.object; body.name = 'hen'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for mod_type, kw in (('REMESH', dict(mode='VOXEL', voxel_size=0.012)), ('SMOOTH', dict(factor=0.8, iterations=12))):
    m = body.modifiers.new(mod_type.lower(), mod_type)
    for k, v in kw.items(): setattr(m, k, v)
    activate(body); bpy.ops.object.modifier_apply(modifier=m.name)
bpy.ops.object.shade_smooth(); body.data.materials.append(body_m)

clamp01 = lambda v: max(0.0, min(1.0, v))
g_hackle = body.vertex_groups.new(name='hackle'); g_upper = body.vertex_groups.new(name='upper'); g_breast = body.vertex_groups.new(name='breast')
for v in body.data.vertices:
    x, y, z = v.co
    cape = clamp01((z - 0.8) / 0.12) * clamp01((x + 0.02) / 0.16)
    if z > 1.2: cape = 0.0                       # short feathers on the head itself
    g_hackle.add([v.index], cape, 'REPLACE')
    br = clamp01((v.normal.x - 0.45) / 0.25) * clamp01((z - 0.55) / 0.08) * clamp01((1.02 - z) / 0.06) * (1 - cape)   # front-facing breast only
    g_breast.add([v.index], br, 'REPLACE')
    g_upper.add([v.index], clamp01((z - 0.52) / 0.1) * clamp01((x + 0.38) / 0.12) * (clamp01((0.98 - z) / 0.08) if x > 0.12 else 1.0) * (1 - cape) * (1 - br), 'REPLACE')
# hackle cape: long fine feathers flowing down the neck and spreading over the shoulders
hair(body, hackle_h, 1500, 0.012, (-0.045, 0, -0.11), children=10, clump=0.75, rough=0.012, density_vgroup='hackle')
# soft edges only on the back, not a fringe along the belly
hair(body, soft_h, 1400, 0.011, (-0.06, 0, -0.01), children=8, clump=0.7, rough=0.012, density_vgroup='upper')
# breast feathers flow downwards, so they lie on the front of the bird instead of pointing into it
hair(body, soft_h, 900, 0.012, (-0.01, 0, -0.03), children=8, clump=0.8, rough=0.01, density_vgroup='breast')
# fluff only under the rear, below the tail
uf = ellipsoid('underfluff', (-0.26, 0, 0.51), (0.18, 0.17, 0.12), body_m)
hair(uf, fluff_h, 300, 0.016, (-0.035, 0, -0.01), children=10, clump=0.5, rough=0.025, curl=0.005)

# ------------------------------------------------------------------ head: oval red face, larger orange eye
ellipsoid('face', (0.52, 0, 1.318), (0.048, 0.062, 0.044), skin)
comb_single('comb', red, base_len=0.14, height=0.06, points=5, loc=(0.42, 0, 1.385))
for s in (1, -1):
    ellipsoid('wattle', (0.556, s * 0.014, 1.248), (0.02, 0.01, 0.038), red, seg=20)
    ellipsoid('lobe', (0.478, s * 0.064, 1.296), (0.015, 0.006, 0.019), red, seg=16)
    eye((0.532, s * 0.058, 1.336), (0.65, 0.2, 0.03), r=0.018)
beak('beak', beak_m, (0.578, 0, 1.318), length=0.075, radius=0.025, hook=0.017, tilt=8)

# ------------------------------------------------------------------ wings: soft swept-back wing, layered flight feathers beneath
wing_h = hair_mat('winghair', (0.11, 0.012, 0.0035), 0.3, tip=(0.035, 0.007, 0.004))
sec_m = fmat('secondaries', (0.1, 0.012, 0.0035), (0.02, 0.009, 0.005), (0.045, 0.01, 0.004), 0.36, 0.07, tip_from=0.5)
for s in (1, -1):
    w = ellipsoid('wing', (0.0, s * 0.262, 0.765), (0.29, 0.045, 0.13), body_m, rot=(0, math.radians(12), 0))
    hair(w, wing_h, 900, 0.01, (-0.1, 0, -0.012), children=8, clump=0.85, rough=0.01, radius=0.6, tip=0.2)
    for k in range(5):     # secondaries: each lower feather starts further back, so the edges step down and back
        z = 0.69 - k * 0.022; x = 0.06 - k * 0.03
        f = card('secondary', 0.36 - k * 0.014, 0.085, sec_m, curve=-0.03, cup=0.015, tip=0.72)
        yy = 0.262 + 0.03 * math.sqrt(max(0.0, 1 - (x / 0.3) ** 2))
        f.location = (x, s * (yy - k * 0.0015), z)
        f.rotation_euler = (s * math.pi / 2, math.radians(8 + k * 1.0), math.pi)

# ------------------------------------------------------------------ tail: tight overlapping fan, rounded tips, mahogany to black
tail_m = fmat('tail', (0.08, 0.011, 0.0035), (0.01, 0.009, 0.007), (0.03, 0.009, 0.005), 0.27, 0.1, tip_from=0.18)
cov_m = fmat('tailcovert', BODY, (0.05, 0.011, 0.005), (0.07, 0.013, 0.004), 0.16, 0.085, tip_from=0.4)
for s in (1, -1):
    for i in range(8):
        e = math.radians(40 + i * 5)
        f = card('tail', 0.27 - abs(i - 3.5) * 0.008, 0.1, tail_m, curve=-0.05, cup=0.1)
        f.location = (-0.42 - i * 0.004, s * (0.012 + i * 0.004), 0.94 + i * 0.004)
        f.rotation_euler = (math.radians(90), math.pi + e, s * math.radians(3 + i * 1.6))
    for i in range(5):   # coverts in body colour over the base of the tail
        e = math.radians(28 + i * 7)
        f = card('tailcovert', 0.16, 0.085, cov_m, curve=-0.04, cup=0.12)
        f.location = (-0.36 - i * 0.006, s * (0.05 + i * 0.006), 0.9 + i * 0.006)
        f.rotation_euler = (math.radians(90), math.pi + e, s * math.radians(6 + i * 2))
cush = ellipsoid('cushion', (-0.39, 0, 0.9), (0.12, 0.11, 0.11), body_m)
hair(cush, soft_h, 220, 0.03, (-0.05, 0, 0.0), children=10, clump=0.5, rough=0.03)

# ------------------------------------------------------------------ legs: thighs hidden in feathers, only the shank shows
for o in list(bpy.data.objects):
    o.location.z -= 0.13
LEGS = [(0.1, 0.075), (-0.04, -0.075)]
legs(leg_m, LEGS, hip_z=0.3, toe=0.14, radius=0.022)
for lx, ly in LEGS:
    th = ellipsoid('thigh', (lx - 0.02, ly * 1.15, 0.285), (0.09, 0.07, 0.085), body_m)
    hair(th, soft_h, 140, 0.008, (-0.03, 0, -0.012), children=8, clump=0.7, rough=0.012)

stage(scn, OUT, res=RES, ortho=1.72, center_z=0.66, cam_h=1.4)
