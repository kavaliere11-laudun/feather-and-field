"""Rhode Island Red hen, high quality: continuous body covered in real feathers. Usage: python rir_hq.py -- OUT.png RES SAMPLES"""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector
from ffbird import reset, principled, ellipsoid, hair_mat, hair, comb_single, beak, stage, deform
from fffeather import feather_mesh, feather_shader, instance_feathers

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; RES = int(args[1]) if len(args) > 1 else 512; SAMPLES = int(args[2]) if len(args) > 2 else 40
scn = reset()


def activate(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o


def apply_mod(o, mod):
    activate(o); bpy.ops.object.modifier_apply(modifier=mod.name)


def fleshy(name, col, sss=0.45, bump=0.6, scale=90):
    m = principled(name, col, 0.38, sss=sss)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 6
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale * 0.6
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'ADD'
    nt.links.new(nz.outputs['Fac'], mx.inputs[0]); nt.links.new(vo.outputs['Distance'], mx.inputs[1])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.004
    nt.links.new(mx.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Subsurface Radius'].default_value = (0.6, 0.12, 0.08); b.inputs['Subsurface Scale'].default_value = 0.02
    return m


def scaly(name, col):
    m = principled(name, col, 0.45)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (90, 90, 45)
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], vo.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*[c * 0.45 for c in col], 1); rp.color_ramp.elements[1].position = 0.12; rp.color_ramp.elements[1].color = (*col, 1)
    nt.links.new(vo.outputs['Distance'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.7; bp.inputs['Distance'].default_value = 0.003
    nt.links.new(vo.outputs['Distance'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


# ------------------------------------------------------------------ continuous body (one remeshed shape)
under = principled('under', (0.1, 0.022, 0.007), 0.85)
parts = [
    ellipsoid('body', (-0.02, 0, 0.57), (0.53, 0.28, 0.26), None),
    ellipsoid('back', (-0.12, 0, 0.7), (0.36, 0.22, 0.12), None),
    ellipsoid('breast', (0.17, 0, 0.55), (0.28, 0.25, 0.255), None),
    ellipsoid('rump', (-0.33, 0, 0.69), (0.17, 0.14, 0.13), None),
    ellipsoid('belly', (-0.05, 0, 0.39), (0.3, 0.22, 0.16), None),
    ellipsoid('neck', (0.29, 0, 0.86), (0.125, 0.11, 0.22), None, rot=(0, math.radians(24), 0)),
    ellipsoid('head', (0.425, 0, 1.1), (0.078, 0.064, 0.07), None),
]
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
body = bpy.context.object; body.name = 'hen'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
r = body.modifiers.new('remesh', 'REMESH'); r.mode = 'VOXEL'; r.voxel_size = 0.011; apply_mod(body, r)
sm = body.modifiers.new('smooth', 'SMOOTH'); sm.factor = 0.9; sm.iterations = 18; apply_mod(body, sm)
bpy.ops.object.shade_smooth(); body.data.materials.append(under)


def region(x, y, z):
    if ((x - 0.468) / 0.05) ** 2 + ((z - 1.093) / 0.04) ** 2 < 1 and abs(y) > 0.015: return 'face'
    if z > 1.02 and x > 0.32: return 'head'
    if x > 0.06 and z > 0.73: return 'hackle'
    if x > 0.12 and z <= 0.73: return 'breast'
    if x < -0.22 and z > 0.6: return 'tailbase'
    return 'body'


groups = {n: body.vertex_groups.new(name=n) for n in ('body', 'breast', 'hackle', 'head', 'tailbase')}
for v in body.data.vertices:
    g = region(*v.co)
    if g in groups: groups[g].add([v.index], 1.0, 'REPLACE')

f_body = feather_mesh('f_body', 0.095, 0.07, 'contour', cup=0.28, curve=0.04)
f_body.data.materials.append(feather_shader('m_body', base=(0.15, 0.032, 0.009), edge=(0.055, 0.012, 0.005), rachis=(0.09, 0.02, 0.007), jitter=0.16, sheen=0.0))
f_hackle = feather_mesh('f_hackle', 0.15, 0.028, 'lance', cup=0.12, curve=0.07)
f_hackle.data.materials.append(feather_shader('m_hackle', base=(0.24, 0.058, 0.014), edge=(0.15, 0.033, 0.009), tip=(0.08, 0.017, 0.006), jitter=0.14, sheen=0.0, barbs=80))
f_head = feather_mesh('f_head', 0.032, 0.02, 'lance', cup=0.15, curve=0.05)
f_head.data.materials.append(feather_shader('m_head', base=(0.2, 0.046, 0.012), edge=(0.12, 0.026, 0.008), jitter=0.12, sheen=0.0, barbs=120))
f_tcov = feather_mesh('f_tcov', 0.17, 0.075, 'contour', cup=0.2, curve=0.06)
f_tcov.data.materials.append(feather_shader('m_tcov', base=(0.07, 0.016, 0.006), edge=(0.015, 0.008, 0.005), tip=(0.012, 0.01, 0.008), jitter=0.12, sheen=0.08, coat=0.3, coat_tint=(0.4, 0.75, 0.5)))

instance_feathers(body, [
    dict(group='body', proto=f_body, dist=0.024, dens=6000, flow=(-1, 0, -0.3), scale=(0.85, 1.15), tilt=0.035, jitter=0.15),
    dict(group='breast', proto=f_body, dist=0.022, dens=7000, flow=(0.15, 0, -1), scale=(0.8, 1.05), tilt=0.03, jitter=0.15, seed=9),
    dict(group='hackle', proto=f_hackle, dist=0.012, dens=25000, flow=(-0.35, 0, -1), scale=(0.85, 1.15), tilt=0.03, jitter=0.1),
    dict(group='head', proto=f_head, dist=0.0065, dens=80000, flow=(-1, 0, 0.1), scale=(0.8, 1.1), tilt=0.05, jitter=0.15),
    dict(group='tailbase', proto=f_tcov, dist=0.026, dens=5000, flow=(-1, 0, 0.75), scale=(0.9, 1.2), tilt=0.12, jitter=0.12),
])

# ------------------------------------------------------------------ wings: coverts over a folded wing, flight feathers beneath
f_cov = feather_mesh('f_cov', 0.1, 0.075, 'contour', cup=0.18, curve=0.03)
f_cov.data.materials.append(feather_shader('m_cov', base=(0.14, 0.03, 0.009), edge=(0.05, 0.011, 0.005), rachis=(0.08, 0.018, 0.006), jitter=0.15, sheen=0.0))
flight_m = feather_shader('m_flight', base=(0.12, 0.027, 0.009), edge=(0.035, 0.01, 0.005), side_col=(0.018, 0.009, 0.006), rachis=(0.06, 0.03, 0.015), jitter=0.1, sheen=0.0, barbs=70)
for s in (1, -1):
    w = ellipsoid('wing', (-0.06, s * 0.262, 0.64), (0.31, 0.05, 0.14), under, rot=(0, math.radians(8), 0))
    g = w.vertex_groups.new(name='all'); g.add(list(range(len(w.data.vertices))), 1.0, 'REPLACE')
    instance_feathers(w, [dict(group='all', proto=f_cov, dist=0.026, dens=5000, flow=(-1, 0, -0.12), scale=(0.85, 1.2), tilt=0.04, jitter=0.1, seed=3 + s)])
    for i in range(9):
        L = 0.24 + 0.04 * math.sin(math.pi * i / 8)
        f = feather_mesh('flight', L, 0.07, 'flight', cup=-0.12, curve=-0.03)
        f.location = (0.04 - i * 0.028, s * (0.27 + 0.002 * i), 0.585 - i * 0.003)
        a = math.radians(10 - i * 0.8)
        f.rotation_euler = (-s * math.pi / 2, math.pi - a, s * math.radians(2))
        f.data.materials.append(flight_m)

# ------------------------------------------------------------------ tail: two tented fans of glossy black-green feathers
tail_m = feather_shader('m_tail', base=(0.008, 0.009, 0.007), edge=(0.003, 0.003, 0.003), rachis=(0.015, 0.015, 0.012), jitter=0.1, sheen=0.0, coat=0.25, coat_tint=(0.35, 0.8, 0.55), barbs=60)
for s in (1, -1):
    for i in range(7):
        e = math.radians(34 + i * 6)
        f = feather_mesh('tail', 0.38 - abs(i - 3) * 0.02, 0.09, 'flight', cup=-0.1, curve=-0.04)
        f.location = (-0.36 - i * 0.008, s * (0.018 + i * 0.006), 0.76 + i * 0.006)
        f.rotation_euler = (-s * math.pi / 2, math.pi + e, s * math.radians(4 + i * 2.2))
        f.data.materials.append(tail_m)

# ------------------------------------------------------------------ head: bare red face, real eye, two-part beak, fleshy comb and wattles
red = fleshy('comb', (0.5, 0.022, 0.018))
face = fleshy('face', (0.42, 0.03, 0.025), bump=0.4, scale=140)
ellipsoid('face', (0.462, 0, 1.093), (0.046, 0.058, 0.04), face)
comb_single('comb', red, base_len=0.15, height=0.07, points=5, loc=(0.352, 0, 1.15), thick=0.016)
for s in (1, -1):
    w = ellipsoid('wattle', (0.49, s * 0.011, 1.03), (0.02, 0.008, 0.042), red, seg=32)
    deform(w, lambda p, s=s: (p.x - 0.25 * (p.z - 1.03) * (1 if p.z < 1.03 else 0), p.y, p.z))   # droop forward-down like a drop
    w.rotation_euler = (s * math.radians(-4), 0, 0)
    ellipsoid('lobe', (0.43, s * 0.06, 1.067), (0.013, 0.006, 0.017), red, seg=24)
    # eye: amber iris, black pupil, clear cornea, skin eyelid ring
    ex, ey, ez = 0.47, s * 0.054, 1.115
    iris = principled('iris', (0.62, 0.26, 0.03), 0.3)
    nt = iris.node_tree; vo = nt.nodes.new('ShaderNodeTexNoise'); vo.inputs['Scale'].default_value = 400
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 0.5
    mx.inputs['A'].default_value = (0.62, 0.26, 0.03, 1); nt.links.new(vo.outputs['Color'], mx.inputs['B'])
    nt.links.new(mx.outputs['Result'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    ellipsoid('iris', (ex, ey, ez), (0.0125, 0.005, 0.0125), iris, seg=24)
    ellipsoid('pupil', (ex + 0.001, ey + s * 0.0034, ez), (0.006, 0.0025, 0.006), principled('pupil', (0.004, 0.004, 0.004), 0.1), seg=20)
    cornea = principled('cornea', (1, 1, 1), 0.0); cb = cornea.node_tree.nodes['Principled BSDF']
    cb.inputs['Transmission Weight'].default_value = 1.0; cb.inputs['IOR'].default_value = 1.376
    ellipsoid('cornea', (ex, ey + s * 0.0015, ez), (0.0138, 0.0062, 0.0138), cornea, seg=24)
    bpy.ops.mesh.primitive_torus_add(location=(ex, ey + s * 0.0005, ez), rotation=(math.pi / 2, 0, 0), major_radius=0.0138, minor_radius=0.0019, major_segments=32, minor_segments=10)
    bpy.context.object.data.materials.append(face); bpy.ops.object.shade_smooth()
    # nostril
    ellipsoid('nostril', (0.527, s * 0.0118, 1.106), (0.0065, 0.0018, 0.0022), principled('nostril', (0.3, 0.19, 0.07), 0.6), seg=12)
beak_m = principled('beak', (0.58, 0.38, 0.13), 0.28, coat=0.35)
bt = beak_m.node_tree; gr = bt.nodes.new('ShaderNodeTexGradient'); tc = bt.nodes.new('ShaderNodeTexCoord')
bt.links.new(tc.outputs['Generated'], gr.inputs['Vector'])
rp = bt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (0.62, 0.42, 0.15, 1); rp.color_ramp.elements[1].color = (0.42, 0.25, 0.08, 1)
bt.links.new(gr.outputs['Fac'], rp.inputs['Fac']); bt.links.new(rp.outputs['Color'], bt.nodes['Principled BSDF'].inputs['Base Color'])
beak('upperbeak', beak_m, (0.523, 0, 1.104), length=0.078, radius=0.024, hook=0.02, tilt=6)
lb = beak('lowerbeak', beak_m, (0.517, 0, 1.088), length=0.06, radius=0.016, hook=0.004, tilt=2)
lb.scale = (1, 0.9, 0.7)

# ------------------------------------------------------------------ legs: scaled shanks, jointed toes, claws; feathered thighs
leg_m = scaly('legs', (0.7, 0.44, 0.04))
claw_m = principled('claw', (0.45, 0.36, 0.22), 0.35, coat=0.3)
for lx, ly in [(0.1, 0.085), (-0.04, -0.085)]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.029, depth=0.28, location=(lx, ly, 0.17))
    o = bpy.context.object; o.data.materials.append(leg_m); bpy.ops.object.shade_smooth()
    o.modifiers.new('sub', 'SUBSURF').levels = 1
    for (ang, L) in [(0, 0.13), (30, 0.11), (-30, 0.11), (180, 0.055)]:
        a = math.radians(ang); dx, dy = math.cos(a), math.sin(a)
        bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.015, radius2=0.008, depth=L, location=(lx + dx * L / 2, ly + dy * L / 2, 0.016), rotation=(0, math.radians(90), a))
        t = bpy.context.object; t.data.materials.append(leg_m); bpy.ops.object.shade_smooth()
        t.modifiers.new('sub', 'SUBSURF').levels = 1
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.0075, depth=0.026, location=(lx + dx * (L + 0.01), ly + dy * (L + 0.01), 0.011), rotation=(0, math.radians(100), a))
        bpy.context.object.data.materials.append(claw_m); bpy.ops.object.shade_smooth()
    # feathered thigh
    th = ellipsoid('thigh', (lx - 0.01, ly * 0.9, 0.33), (0.08, 0.065, 0.1), under)
    gth = th.vertex_groups.new(name='all'); gth.add(list(range(len(th.data.vertices))), 1.0, 'REPLACE')
    instance_feathers(th, [dict(group='all', proto=f_body, dist=0.022, dens=8000, flow=(-0.4, 0, -1), scale=(0.55, 0.75), tilt=0.15, jitter=0.25, seed=7)])

import os
if os.environ.get('HEAD'):
    stage(scn, OUT, res=RES, ortho=0.46, center_z=1.08, cam_h=1.08 + 0.74, samples=SAMPLES)
else:
    stage(scn, OUT, res=RES, ortho=1.72, center_z=0.66, cam_h=1.4, samples=SAMPLES)
