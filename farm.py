"""One continuous, natural farm landscape: pens set into rolling grass, dirt paths, pond, trees.
Usage: python farm.py -- OUT.png RES [ORTHO]"""
import sys, math, random, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector, Matrix
from ffbird import reset, principled
from ffscene import box, cyl, wood, red_barn, pagoda, props, shingles, planks_mat

args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; RES = int(args[1]) if len(args) > 1 else 600
ORTHO = float(args[2]) if len(args) > 2 else 15.0
RESY = int(args[3]) if len(args) > 3 else RES
TX = float(args[4]) if len(args) > 4 else -0.3
TY = float(args[5]) if len(args) > 5 else 0.6
random.seed(7)
scn = reset()

# ---------------------------------------------------------------- layout (metres)
PENS = [  # (centre x, y, width, depth, rotation deg, kind)
    (-3.2, 1.0, 3.6, 3.0, 8, 'barn'),
    (2.3, 2.9, 3.4, 2.9, -10, 'pagoda'),
]
PLOT = (2.7, -1.9, 3.0, 2.4, -6)                     # empty plot ready to build
POND = (-2.7, -3.1, 1.8, 1.05, 20)                   # centre x, y, radius x, radius y, rotation
PATHS = [
    [(0.3, -12), (0.4, -7), (-0.1, -4.2), (-0.4, -2.0), (0.0, -0.3), (0.5, 1.4), (0.9, 3.6), (0.6, 6.5), (0.2, 12)],
    [(-0.3, -0.9), (-1.4, -0.75), (-2.4, -0.55), (-3.1, -0.45)],
    [(0.55, 1.5), (1.3, 1.45), (1.9, 1.5)],
    [(-0.25, -1.6), (0.5, -1.8), (1.2, -1.85)],
    [(0.75, 2.9), (-0.7, 3.2), (-2.1, 3.35), (-3.3, 3.45)],
    [(0.15, -4.4), (0.9, -4.5)],
]
HOUSE = (-3.6, 4.5, -4)     # farmhouse centre x, y, rotation
STALL = (1.55, -4.45, 18)   # egg stall by the main path


def rot2(x, y, deg):
    a = math.radians(deg); return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


def to_local(px, py, cx, cy, deg):
    return rot2(px - cx, py - cy, -deg)


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def smooth(e0, e1, x):
    t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)


def vnoise(x, y):
    return (math.sin(x * 1.7 + math.sin(y * 0.9)) + math.sin(y * 1.3 + math.sin(x * 1.1) * 1.5) + math.sin((x + y) * 0.7)) / 3


# ---------------------------------------------------------------- terrain
def terrain():
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=260, y_subdivisions=260, size=34)
    g = bpy.context.object; g.name = 'ground'; me = g.data
    dirt = me.color_attributes.new(name='dirt', type='FLOAT_COLOR', domain='POINT')
    vg = g.vertex_groups.new(name='grass')
    for v in me.vertices:
        x, y = v.co.x, v.co.y
        r = math.hypot(x * 0.9, y)
        v.co.z = 0.9 * smooth(8.5, 15, r) * (0.6 + 0.4 * vnoise(x * 0.4, y * 0.4)) + 0.04 * smooth(6, 9, r) * vnoise(x * 2, y * 2)
        w = 0.0
        for path in PATHS:
            d = min(seg_dist((x, y), path[i], path[i + 1]) for i in range(len(path) - 1))
            w = max(w, 1 - smooth(0.26, 0.5 + 0.08 * vnoise(x * 3, y * 3), d))
        for cx, cy, W, D, deg, kind in PENS:
            u, t = to_local(x, y, cx, cy, deg)
            if abs(u) < W / 2 - 0.05 and abs(t) < D / 2 - 0.05:
                edge = min(W / 2 - abs(u), D / 2 - abs(t))
                trod = 0.45 + 0.3 * vnoise(x * 2.5, y * 2.5) + 0.35 * (1 - smooth(0, 1.2, math.hypot(u + 0.4, t + 0.1)))
                w = max(w, min(1, trod) * smooth(0.0, 0.35, edge))
        u, t = to_local(x, y, PLOT[0], PLOT[1], PLOT[4])
        if abs(u) < PLOT[2] / 2 and abs(t) < PLOT[3] / 2:
            w = max(w, 0.85 * smooth(0, 0.25, min(PLOT[2] / 2 - abs(u), PLOT[3] / 2 - abs(t))))
        u, t = to_local(x, y, POND[0], POND[1], POND[4])
        pr = math.hypot(u / POND[2], t / POND[3])
        if pr < 1.0:
            v.co.z -= 0.12 * (1 - pr * pr) + 0.01
        w = max(w, 0.85 * (1 - smooth(1.0, 1.28, pr)))
        dirt.data[v.index].color = (w, w, w, 1)
        dens = (1 - w) * (1 - smooth(9, 11.5, r))
        if pr < 1.05: dens = 0
        vg.add([v.index], max(0.0, dens), 'REPLACE')
    me.update()
    for p in me.polygons: p.use_smooth = True
    # ground material: two grass tones and two earth tones mixed by the painted 'dirt' weight
    m = bpy.data.materials.new('ground'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'dirt'
    big = nt.nodes.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.35; big.inputs['Detail'].default_value = 4
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 9; fine.inputs['Detail'].default_value = 10
    for n in (big, fine): nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    gr = nt.nodes.new('ShaderNodeValToRGB')
    gr.color_ramp.elements[0].color = (0.05, 0.11, 0.02, 1); gr.color_ramp.elements[1].color = (0.16, 0.26, 0.05, 1)
    nt.links.new(big.outputs['Fac'], gr.inputs['Fac'])
    er = nt.nodes.new('ShaderNodeValToRGB')
    er.color_ramp.elements[0].color = (0.13, 0.08, 0.04, 1); er.color_ramp.elements[1].color = (0.36, 0.25, 0.14, 1)
    nt.links.new(fine.outputs['Fac'], er.inputs['Fac'])
    # break up the boundary with noise so paths and pens fade naturally into grass
    mixf = nt.nodes.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'
    nt.links.new(fine.outputs['Fac'], mixf.inputs[0]); mixf.inputs[1].default_value = 0.5
    nt.links.new(at.outputs['Fac'], mixf.inputs[2])
    rmp = nt.nodes.new('ShaderNodeMapRange'); rmp.inputs['From Min'].default_value = 0.55; rmp.inputs['From Max'].default_value = 0.85
    nt.links.new(mixf.outputs[0], rmp.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
    nt.links.new(rmp.outputs['Result'], mx.inputs['Factor']); nt.links.new(gr.outputs['Color'], mx.inputs['A']); nt.links.new(er.outputs['Color'], mx.inputs['B'])
    nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35
    nt.links.new(fine.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    # grass blades
    gm = bpy.data.materials.new('grass'); gm.use_nodes = True
    gb = gm.node_tree.nodes['Principled BSDF']
    gi = gm.node_tree.nodes.new('ShaderNodeHairInfo'); rmpg = gm.node_tree.nodes.new('ShaderNodeValToRGB')
    rmpg.color_ramp.elements[0].color = (0.03, 0.07, 0.012, 1); rmpg.color_ramp.elements[1].color = (0.24, 0.36, 0.06, 1)
    gm.node_tree.links.new(gi.outputs['Intercept'], rmpg.inputs['Fac']); gm.node_tree.links.new(rmpg.outputs['Color'], gb.inputs['Base Color'])
    gb.inputs['Roughness'].default_value = 0.55
    me.materials.append(gm)
    mod = g.modifiers.new('grass', 'PARTICLE_SYSTEM'); ps = mod.particle_system; s = ps.settings
    s.type = 'HAIR'; s.count = 110000; s.hair_length = 0.08; s.use_advanced_hair = True
    s.normal_factor = 0.085 * 0.33; s.factor_random = 0.03; s.material = 2
    s.roughness_2 = 0.03; s.roughness_endpoint = 0.025
    s.root_radius = 0.7; s.tip_radius = 0.0; s.radius_scale = 0.01; s.render_step = 2
    s.child_type = 'INTERPOLATED'; s.rendered_child_count = 3; s.child_radius = 0.25
    ps.vertex_group_density = 'grass'
    return g


def ground_z(x, y):
    r = math.hypot(x * 0.9, y)
    return 0.9 * smooth(8.5, 15, r) * (0.6 + 0.4 * vnoise(x * 0.4, y * 0.4)) + 0.04 * smooth(6, 9, r) * vnoise(x * 2, y * 2)


# ---------------------------------------------------------------- nature
leaf_mats = []
def leaf_mat(seed):
    m = bpy.data.materials.new('leaves'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6; nz.inputs['Detail'].default_value = 8
    nz.noise_dimensions = '4D'
    [i for i in nz.inputs if i.name == 'W'][0].default_value = seed
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    base = random.choice([(0.045, 0.14, 0.015), (0.065, 0.16, 0.02), (0.09, 0.15, 0.02)])
    rp.color_ramp.elements[0].color = (*[c * 0.3 for c in base], 1); rp.color_ramp.elements[1].color = (*[c * 2.4 for c in base], 1)
    nt.links.new(nz.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 1.0; bp.inputs['Distance'].default_value = 0.04
    v2 = nt.nodes.new('ShaderNodeTexVoronoi'); v2.inputs['Scale'].default_value = 14
    v3 = nt.nodes.new('ShaderNodeTexVoronoi'); v3.inputs['Scale'].default_value = 45
    for v_ in (v2, v3): nt.links.new(tc.outputs['Object'], v_.inputs['Vector'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(v2.outputs['Distance'], add.inputs[0]); nt.links.new(v3.outputs['Distance'], add.inputs[1])
    nt.links.new(add.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    ao = nt.nodes.new('ShaderNodeMix'); ao.data_type = 'RGBA'; ao.blend_type = 'MULTIPLY'
    nt.links.new(v2.outputs['Distance'], ao.inputs['Factor'])
    nt.links.new(rp.outputs['Color'], ao.inputs['B']); ao.inputs['A'].default_value = (0.22, 0.42, 0.12, 1)
    mixa = nt.nodes.new('ShaderNodeMix'); mixa.data_type = 'RGBA'; mixa.inputs['Factor'].default_value = 0.35
    nt.links.new(rp.outputs['Color'], mixa.inputs['A']); nt.links.new(ao.outputs['Result'], mixa.inputs['B'])
    nt.links.new(mixa.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.65
    b.inputs['Subsurface Weight'].default_value = 0.15; b.inputs['Subsurface Radius'].default_value = (0.2, 0.4, 0.1)
    return m


cloud_tex = bpy.data.textures.new('clouds', 'CLOUDS'); cloud_tex.noise_scale = 0.28; cloud_tex.noise_depth = 2
bark = wood('bark', (0.09, 0.06, 0.04), scale=(3, 3, 0.4), rough=0.9, dark=0.5)


leafy_tex = bpy.data.textures.new('leafy', 'CLOUDS'); leafy_tex.noise_scale = 0.06; leafy_tex.noise_depth = 1


def blob(loc, radius, mat, squash=1.0, strength=0.32, sub=3, leafy=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=radius, location=loc)
    o = bpy.context.object; o.scale = (1, 1, squash)
    d = o.modifiers.new('d', 'DISPLACE'); d.texture = cloud_tex; d.strength = strength * radius * 1.3; d.texture_coords = 'GLOBAL'
    o.modifiers.new('s', 'SUBSURF').levels = 1
    if leafy:
        d2 = o.modifiers.new('leaf', 'DISPLACE'); d2.texture = leafy_tex; d2.strength = 0.06; d2.texture_coords = 'GLOBAL'; d2.mid_level = 0.3
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat); return o


def tree(x, y, h=3.2, r=1.25):
    z0 = ground_z(x, y)
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.16 * h / 3, radius2=0.07 * h / 3, depth=h * 0.62, location=(x, y, z0 + h * 0.31))
    t = bpy.context.object; t.data.materials.append(bark); bpy.ops.object.shade_smooth()
    m = leaf_mat(random.random() * 10)
    blob((x, y, z0 + h * 0.74), r * 0.85, m, 0.85)
    for k in range(7):
        a = k * 2.4 + random.random(); rr = r * (0.45 + random.random() * 0.3)
        blob((x + math.cos(a) * r * 0.6, y + math.sin(a) * r * 0.6, z0 + h * (0.5 + random.random() * 0.4)), r * (0.42 + random.random() * 0.18), m, 0.9)


def bush(x, y, r=0.45):
    z0 = ground_z(x, y); m = leaf_mat(random.random() * 10)
    for _ in range(3):
        blob((x + random.uniform(-r, r) * 0.5, y + random.uniform(-r, r) * 0.5, z0 + r * 0.45), r * random.uniform(0.6, 0.9), m, 0.75)


def scatter_spheres(name, color, points, radius, emit=0.0):
    bm = bmesh.new()
    for (x, y, z) in points:
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=radius, matrix=Matrix.Translation((x, y, z)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    mat = principled(name, color, 0.5, sss=0.2); o.data.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return o


def flowers(cx, cy, spread, n, colors):
    for col in colors:
        pts = []
        for _ in range(n):
            x = cx + random.gauss(0, spread); y = cy + random.gauss(0, spread * 0.7)
            pts.append((x, y, ground_z(x, y) + 0.09 + random.random() * 0.03))
        scatter_spheres('flowers', col, pts, 0.028)


def rock(x, y, s):
    m = principled('rock', (0.22, 0.21, 0.19), 0.85)
    o = blob((x, y, ground_z(x, y) + s * 0.15), s, m, 0.55, 0.5, 2, leafy=False)


def pond():
    cx, cy, rx, ry, deg = POND
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=1, fill_type='NGON', location=(cx, cy, -0.035))
    o = bpy.context.object; o.scale = (rx * 1.02, ry * 1.02, 1); o.rotation_euler = (0, 0, math.radians(deg))
    w = principled('water', (0.012, 0.05, 0.06), 0.04, coat=0.8)
    w.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.9
    o.data.materials.append(w)
    # reeds and lily pads
    reed = principled('reed', (0.1, 0.16, 0.04), 0.6)
    for i in range(26):
        a = math.radians(150 + random.uniform(-40, 50)); k = random.uniform(0.92, 1.08)
        ux, uy = math.cos(a) * rx * k, math.sin(a) * ry * k
        x, y = rot2(ux, uy, deg); x += cx; y += cy
        h = random.uniform(0.35, 0.6)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.012, radius2=0.0, depth=h, location=(x, y, h / 2 - 0.03), rotation=(random.uniform(-.15, .15), random.uniform(-.15, .15), 0))
        bpy.context.object.data.materials.append(reed)
        if i % 4 == 0:
            cyl('cattail', (x, y, h - 0.06), 0.02, 0.09, principled('cattail', (0.12, 0.06, 0.025), 0.8))
    pad = principled('pad', (0.06, 0.16, 0.03), 0.5)
    for (ux, uy) in [(0.5, 0.2), (0.7, -0.25), (-0.2, -0.45), (0.1, 0.5)]:
        x, y = rot2(ux * rx * 0.6, uy * ry * 0.9, deg)
        cyl('pad', (cx + x, cy + y, -0.025), random.uniform(0.07, 0.11), 0.006, pad, v=20)


# ---------------------------------------------------------------- pens, plots and props
fence_wood = wood('fence', (0.22, 0.13, 0.065))
straw = wood('straw', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)


def group(objs, loc, deg):
    e = bpy.data.objects.new('grp', None); bpy.context.collection.objects.link(e)
    e.location = loc; e.rotation_euler = (0, 0, math.radians(deg))
    for o in objs: o.parent = e
    return e


def build(fn, loc, deg):
    before = set(bpy.data.objects); fn(); new = [o for o in bpy.data.objects if o not in before]
    return group(new, loc, deg)


def pen_fence(W, D, gate=0.7, h=0.36, step=0.38):
    def run(x0, y0, x1, y1, skip=None):
        L = math.hypot(x1 - x0, y1 - y0); n = max(1, round(L / step))
        ang = math.atan2(y1 - y0, x1 - x0)
        for i in range(n + 1):
            t = i / n; px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            if skip and skip[0] < px < skip[1] and abs(py - y0) < 0.01: continue
            box('post', (px, py, h / 2), (0.055, 0.055, h + random.uniform(-0.03, 0.03)), fence_wood, rot=(random.uniform(-.05, .05), random.uniform(-.05, .05), ang), bevel=0.01)
        for z in (0.15, 0.29):
            if skip:
                for a, b_ in ((x0, skip[0]), (skip[1], x1)):
                    l = b_ - a; box('rail', ((a + b_) / 2, y0, z), (l, 0.028, 0.045), fence_wood)
            else:
                box('rail', ((x0 + x1) / 2, (y0 + y1) / 2, z), (L, 0.028, 0.045), fence_wood, rot=(0, 0, ang))
    w, d = W / 2, D / 2
    run(-w, -d, w, -d, skip=(-gate / 2 - 0.15, gate / 2 - 0.15))
    run(-w, d, w, d); run(-w, -d, -w, d); run(w, -d, w, d)


def barn_pen():
    red_barn(); props()
    for (x, y) in [(-1.45, 0.2), (-1.45, -0.15)]:
        box('bale', (x, y, 0.13), (0.3, 0.5, 0.26), straw, bevel=0.03)


def farmhouse():
    """Whitewashed farmhouse with a clay-tile roof, chimney, flower boxes and a porch."""
    plaster = principled('plaster', (0.74, 0.7, 0.6), 0.9)
    tiles = shingles('claytiles', (0.32, 0.1, 0.05), rows=16)
    stone = principled('stone', (0.36, 0.33, 0.29), 0.9)
    trim = principled('trim', (0.82, 0.8, 0.74), 0.6)
    glass = principled('glass', (0.03, 0.05, 0.07), 0.08, coat=0.6)
    door_m = planks_mat('door', (0.05, 0.14, 0.08), n_per_m=14)
    timber = wood('beam', (0.16, 0.09, 0.05))
    X, Y, zb, ze, zr, over = 1.15, 0.8, 0.0, 1.15, 1.9, 0.18
    box('plinth', (0, 0, 0.06), (2 * X + 0.08, 2 * Y + 0.08, 0.12), stone)
    box('walls', (0, 0, ze / 2), (2 * X, 2 * Y, ze), plaster)
    # gable ends (triangles) on the short sides
    for sx in (-1, 1):
        bm = bmesh.new()
        vs = [bm.verts.new(p_) for p_ in [(sx * X, -Y, ze), (sx * X, Y, ze), (sx * X, 0, zr)]]
        bm.faces.new(vs); me = bpy.data.meshes.new('gable'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('gable', me); bpy.context.collection.objects.link(o)
        o.modifiers.new('s', 'SOLIDIFY').thickness = 0.05; o.data.materials.append(plaster)
    # roof: ridge along x, planes sloping to the front and back
    for sy in (-1, 1):
        bm = bmesh.new()
        a = bm.verts.new((-X - over, 0, zr)); b = bm.verts.new((X + over, 0, zr))
        c = bm.verts.new((X + over, sy * (Y + over), ze - over * 0.9)); d = bm.verts.new((-X - over, sy * (Y + over), ze - over * 0.9))
        bm.faces.new((a, b, c, d) if sy < 0 else (d, c, b, a))
        me = bpy.data.meshes.new('roof'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o)
        uv = me.uv_layers.new()
        for loop in me.loops:
            co = me.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (co.x, math.hypot(co.y, co.z - zr))
        o.modifiers.new('s', 'SOLIDIFY').thickness = 0.07; o.data.materials.append(tiles)
    box('ridge', (0, 0, zr + 0.02), (2 * X + 2 * over, 0.12, 0.08), tiles)
    box('chimney', (0.7, 0.25, zr + 0.1), (0.3, 0.3, 0.8), stone)
    box('pot', (0.7, 0.25, zr + 0.53), (0.18, 0.18, 0.1), principled('pot', (0.35, 0.14, 0.07), 0.7))
    # front (-y): door with a little porch, windows with flower boxes
    box('door', (0, -Y - 0.02, 0.48), (0.42, 0.04, 0.84), door_m)
    box('doorframe', (0, -Y - 0.035, 0.9), (0.5, 0.03, 0.06), trim)
    for sx in (-1, 1):
        box('porchpost', (sx * 0.32, -Y - 0.38, 0.5), (0.06, 0.06, 1.0), timber)
    box('porchroof', (0, -Y - 0.22, 1.02), (0.9, 0.55, 0.05), tiles, rot=(math.radians(-14), 0, 0))
    box('step', (0, -Y - 0.2, 0.05), (0.7, 0.35, 0.1), stone)
    flowers_m = [principled('fl1', (0.8, 0.12, 0.15), 0.6, sss=0.2), principled('fl2', (0.85, 0.55, 0.65), 0.6, sss=0.2)]
    for wx in (-0.75, 0.75):
        box('win', (wx, -Y - 0.02, 0.62), (0.44, 0.03, 0.42), glass)
        box('winframe_h', (wx, -Y - 0.04, 0.62), (0.48, 0.02, 0.04), trim); box('winframe_v', (wx, -Y - 0.04, 0.62), (0.04, 0.02, 0.46), trim)
        for dz in (-0.23, 0.23): box('winframe', (wx, -Y - 0.04, 0.62 + dz), (0.5, 0.025, 0.04), trim)
        box('flowerbox', (wx, -Y - 0.1, 0.36), (0.5, 0.14, 0.1), timber)
        for k in range(8):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.04, location=(wx - 0.21 + k * 0.06, -Y - 0.1 + random.uniform(-.03, .03), 0.44 + random.uniform(0, 0.04)))
            bpy.context.object.data.materials.append(flowers_m[k % 2])
    for wx in (-0.75, 0.75):  # windows on the visible right gable too
        pass
    box('sidewin', (X + 0.02, 0.0, 0.62), (0.03, 0.4, 0.4), glass)
    box('sidewinframe', (X + 0.035, 0.0, 0.62), (0.02, 0.46, 0.46), trim)
    # firewood stack and a bench
    for i in range(3):
        for j in range(4 - i):
            cyl('log', (-X - 0.25, -0.5 + j * 0.13 + i * 0.065, 0.07 + i * 0.12), 0.06, 0.5, timber, rot=(0, math.radians(90), 0), v=10)
    box('bench', (0.62, -Y - 0.32, 0.22), (0.5, 0.18, 0.04), timber)


def egg_stall():
    """Little roadside stall selling eggs, with a striped awning."""
    timber = wood('stallwood', (0.3, 0.18, 0.09))
    m = bpy.data.materials.new('awning'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_profile = 'SAW'
    wv.inputs['Scale'].default_value = 2.2; wv.inputs['Distortion'].default_value = 0
    nt.links.new(tc.outputs['Object'], wv.inputs['Vector'])
    gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5
    nt.links.new(wv.outputs['Fac'], gt.inputs[0])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
    mx.inputs['A'].default_value = (0.82, 0.8, 0.72, 1); mx.inputs['B'].default_value = (0.5, 0.05, 0.035, 1)
    nt.links.new(gt.outputs[0], mx.inputs['Factor']); nt.links.new(mx.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.8
    W, D = 0.9, 0.5
    for sx in (-1, 1):
        box('post', (sx * W / 2, -D / 2 + 0.02, 0.6), (0.05, 0.05, 1.2), timber)
        box('post', (sx * W / 2, D / 2, 0.75), (0.05, 0.05, 1.5), timber)
    box('counter', (0, 0, 0.45), (W + 0.08, D + 0.04, 0.06), timber)
    box('front', (0, -D / 2, 0.24), (W, 0.03, 0.42), planks_mat('stallfront', (0.36, 0.22, 0.11), n_per_m=10))
    box('awning', (0, -0.02, 1.36), (W + 0.3, D + 0.45, 0.02), m, rot=(math.radians(-16), 0, 0))
    box('signboard', (0, -D / 2 - 0.02, 1.12), (0.6, 0.02, 0.16), principled('board', (0.78, 0.74, 0.62), 0.8))
    # crates of brown, cream and blue eggs
    eggcols = [(0.42, 0.2, 0.08), (0.8, 0.74, 0.62), (0.4, 0.62, 0.58)]
    for k, ex in enumerate((-0.28, 0.0, 0.28)):
        box('crate', (ex, -0.02, 0.52), (0.24, 0.3, 0.08), timber)
        em = principled('egg%d' % k, eggcols[k], 0.45)
        for i in range(3):
            for j in range(4):
                bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.028, location=(ex - 0.07 + i * 0.07, -0.12 + j * 0.07, 0.58))
                o = bpy.context.object; o.scale = (1, 1, 1.3); o.data.materials.append(em); bpy.ops.object.shade_smooth()
    box('stool', (0.6, -0.45, 0.2), (0.25, 0.25, 0.4), timber)


def build_plot():
    stake = principled('stake', (0.3, 0.22, 0.12), 0.8)
    W, D = PLOT[2], PLOT[3]
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('stake', (sx * W / 2, sy * D / 2, 0.15), (0.04, 0.04, 0.3), stake)
    tape = principled('string', (0.75, 0.68, 0.5), 0.7)
    for (a, b_) in [((-1, -1), (1, -1)), ((-1, 1), (1, 1)), ((-1, -1), (-1, 1)), ((1, -1), (1, 1))]:
        x0, y0 = a[0] * W / 2, a[1] * D / 2; x1, y1 = b_[0] * W / 2, b_[1] * D / 2
        L = math.hypot(x1 - x0, y1 - y0)
        box('string', ((x0 + x1) / 2, (y0 + y1) / 2, 0.24), (L if y0 == y1 else 0.008, 0.008 if y0 == y1 else L, 0.008), tape)
    # sign post and a stack of timber, ready to build
    box('signpost', (-W / 2 + 0.35, -D / 2 + 0.05, 0.35), (0.06, 0.06, 0.7), fence_wood)
    box('sign', (-W / 2 + 0.35, -D / 2 + 0.02, 0.62), (0.55, 0.04, 0.3), wood('signboard', (0.42, 0.28, 0.14), scale=(1, 1, 20)), bevel=0.015)
    timber = wood('timber', (0.48, 0.33, 0.18), scale=(1, 30, 1))
    for i in range(4):
        box('plank', (0.5, 0.3, 0.04 + i * 0.05), (1.3, 0.16, 0.045), timber, rot=(0, 0, math.radians(12 + i * 2)))


terrain()
for cx, cy, W, D, deg, kind in PENS:
    if kind == 'barn':
        build(barn_pen, (cx + 0.2, cy, 0), deg)
    else:
        build(pagoda, (cx + 0.1, cy, 0), deg)
    build(lambda W=W, D=D: pen_fence(W, D), (cx, cy, 0), deg)
build(build_plot, (PLOT[0], PLOT[1], 0), PLOT[4])
pond()
build(farmhouse, (HOUSE[0], HOUSE[1], 0), HOUSE[2])
build(egg_stall, (STALL[0], STALL[1], 0), STALL[2])

# trees ring the farm; bushes and flowers soften the edges
for (x, y, h, r) in [(-7.2, 4.8, 3.6, 1.4), (-8.6, 0.8, 3.2, 1.25), (-6.4, -6.5, 3.4, 1.3), (-2.0, 7.8, 3.8, 1.45), (2.8, 8.2, 3.3, 1.3),
                     (6.6, 6.4, 3.5, 1.35), (7.6, 2.0, 3.0, 1.2), (-9.5, -3.5, 3.6, 1.4), (-4.6, 8.8, 3.0, 1.2), (8.8, 7.8, 3.2, 1.3), (-10.5, 5.5, 3.4, 1.3)]:
    tree(x, y, h, r)
for (x, y, r) in [(-5.6, 2.6, 0.45), (-5.4, -1.2, 0.4), (4.7, 4.9, 0.45), (4.9, 0.2, 0.4), (-1.2, -5.3, 0.35), (-4.4, -4.4, 0.38),
                  (5.0, -3.6, 0.42), (1.9, 5.6, 0.36), (-0.9, 4.6, 0.32), (6.2, -1.2, 0.38)]:
    bush(x, y, r)
for (x, y, s) in [(-1.6, -2.4, 0.16), (-3.9, -2.2, 0.12), (-1.9, -4.0, 0.2), (1.4, 0.4, 0.1), (4.4, -0.2, 0.14), (-5.3, 0.4, 0.12)]:
    rock(x, y, s)
flowers(-4.3, -3.6, 0.55, 40, [(0.85, 0.82, 0.75), (0.8, 0.6, 0.05)])
flowers(-1.3, -2.9, 0.35, 25, [(0.55, 0.25, 0.7), (0.85, 0.82, 0.75)])
flowers(4.2, 4.6, 0.5, 35, [(0.85, 0.3, 0.4), (0.8, 0.6, 0.05)])
flowers(-6.1, 3.0, 0.6, 35, [(0.85, 0.82, 0.75), (0.55, 0.25, 0.7)])
flowers(5.2, -2.6, 0.5, 30, [(0.8, 0.6, 0.05), (0.85, 0.82, 0.75)])
flowers(2.9, -5.3, 0.45, 25, [(0.85, 0.3, 0.4), (0.85, 0.82, 0.75)])

# ---------------------------------------------------------------- camera and light: three-quarter view, warm afternoon sun
target = Vector((TX, TY, 0))
pitch = math.radians(42); yaw = math.radians(45)
d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
bpy.ops.object.camera_add(location=target + d * 30)
cam = bpy.context.object; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
cam.data.type = 'ORTHO'; cam.data.ortho_scale = ORTHO; cam.data.clip_end = 100; scn.camera = cam
bpy.ops.object.light_add(type='SUN')
sun = bpy.context.object; sd = Vector((-0.55, 0.45, 0.7)).normalized()
sun.rotation_euler = (-sd).to_track_quat('-Z', 'Y').to_euler()
sun.data.energy = 4.2; sun.data.angle = math.radians(3); sun.data.color = (1.0, 0.93, 0.82)
w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.7, 0.95, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.85
scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = 28
scn.cycles.use_denoising = True; scn.cycles.max_bounces = 4
scn.render.threads_mode = 'FIXED'; scn.render.threads = 2
scn.render.resolution_x = RES; scn.render.resolution_y = RESY
scn.render.filepath = OUT
scn.view_settings.view_transform = 'AgX'; scn.view_settings.look = 'AgX - Medium High Contrast'
t = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t, 1))
