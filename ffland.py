"""Landscape pieces shared by the farm map and the coop overlays (extracted from farm.py)."""
import sys, math, random
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector, Matrix
from ffbird import principled
from ffscene import box, cyl, wood, red_barn, pagoda, props, shingles, planks_mat

GROUND = {'fn': lambda x, y: 0.0}
BLOB_RENDER_LEVELS = 1
def ground_z(x, y):
    return GROUND['fn'](x, y)


def rot2(x, y, deg):
    a = math.radians(deg); return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)

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
    ss = o.modifiers.new('s', 'SUBSURF'); ss.levels = 1; ss.render_levels = BLOB_RENDER_LEVELS
    if leafy:
        d2 = o.modifiers.new('leaf', 'DISPLACE'); d2.texture = leafy_tex; d2.strength = 0.06; d2.texture_coords = 'GLOBAL'; d2.mid_level = 0.3
    bpy.context.view_layer.objects.active = o
    for m_ in list(o.modifiers):      # bake the shape now: evaluating these at render time uses far too much memory
        bpy.ops.object.modifier_apply(modifier=m_.name)
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


def pond(P):
    cx, cy, rx, ry, deg = P
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=1, fill_type='NGON', location=(cx, cy, -0.035))
    o = bpy.context.object; o.scale = (rx * 1.02, ry * 1.02, 1); o.rotation_euler = (0, 0, math.radians(deg))
    w = principled('water', (0.012, 0.05, 0.06), 0.04, coat=0.8)
    w.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.9
    import os
    if os.environ.get('STYLE') == 'fv':     # less sky glare: a deeper, bluer pond under the brighter sky
        w = principled('water', (0.012, 0.075, 0.1), 0.03, coat=0.0)
        w.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.3
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


def sidewindow(X, y, z, sx, glass, trim):
    """A window in a gable end (x = sx * X), as the front's: the glass, then its frame and cross in front of it (a solid
    frame plate over the glass showed as a blank pale square, the glass lost behind it)."""
    box('sidewin', (sx * (X + 0.02), y, z), (0.03, 0.4, 0.4), glass)
    box('sidewinframe_h', (sx * (X + 0.04), y, z), (0.02, 0.44, 0.04), trim); box('sidewinframe_v', (sx * (X + 0.04), y, z), (0.02, 0.04, 0.44), trim)
    for d in (-0.22, 0.22):
        box('sidewinframe', (sx * (X + 0.04), y, z + d), (0.025, 0.48, 0.04), trim)
        box('sidewinframe', (sx * (X + 0.04), y + d, z), (0.025, 0.04, 0.48), trim)


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
    sidewindow(X, 0.0, 0.62, 1, glass, trim)
    # firewood stack and a bench
    for i in range(3):
        for j in range(4 - i):
            cyl('log', (-X - 0.25, -0.5 + j * 0.13 + i * 0.065, 0.07 + i * 0.12), 0.06, 0.5, timber, rot=(0, math.radians(90), 0), v=10)
    box('bench', (0.62, -Y - 0.32, 0.22), (0.5, 0.18, 0.04), timber)
    # ---- the back and the far gable (release 6, the farm turned all the way round: they show now): the kitchen door
    # with its step, two windows (flowers under one), a window in the far gable above the logs, a round attic window in
    # each gable, a drainpipe and a water butt at the back corner
    box('backdoor', (-0.5, Y + 0.02, 0.44), (0.38, 0.04, 0.76), door_m)
    box('backdoorframe', (-0.5, Y + 0.035, 0.84), (0.46, 0.03, 0.06), trim)
    box('backstep', (-0.5, Y + 0.16, 0.05), (0.56, 0.28, 0.1), stone)
    box('backknob', (-0.36, Y + 0.05, 0.44), (0.04, 0.03, 0.04), trim)
    for wx in (0.15, 0.75):
        box('win', (wx, Y + 0.02, 0.62), (0.44, 0.03, 0.42), glass)
        box('winframe_h', (wx, Y + 0.04, 0.62), (0.48, 0.02, 0.04), trim); box('winframe_v', (wx, Y + 0.04, 0.62), (0.04, 0.02, 0.46), trim)
        for dz in (-0.23, 0.23): box('winframe', (wx, Y + 0.04, 0.62 + dz), (0.5, 0.025, 0.04), trim)
    box('flowerbox', (0.15, Y + 0.1, 0.36), (0.5, 0.14, 0.1), timber)
    for k in range(7):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.04, location=(0.15 - 0.18 + k * 0.06, Y + 0.1 + random.uniform(-.03, .03), 0.44 + random.uniform(0, 0.04)))
        bpy.context.object.data.materials.append(flowers_m[(k + 1) % 2])
    sidewindow(X, 0.3, 0.68, -1, glass, trim)
    for sx in (-1, 1):
        cyl('atticframe', (sx * (X + 0.03), 0, 1.4), 0.15, 0.03, trim, rot=(0, math.radians(90), 0), v=14)
        cyl('attic', (sx * (X + 0.045), 0, 1.4), 0.115, 0.03, glass, rot=(0, math.radians(90), 0), v=14)
    pipe = principled('pipe', (0.2, 0.2, 0.2), 0.5)
    box('gutter', (0, Y + over - 0.04, 0.93), (2 * X + 0.2, 0.06, 0.05), pipe)
    cyl('drainpipe', (X - 0.05, Y + 0.05, 0.52), 0.03, 0.84, pipe, v=8)
    box('drainbend', (X - 0.05, Y + 0.05 + (over - 0.09) / 2, 0.93), (0.05, over - 0.09 + 0.05, 0.05), pipe)
    cyl('waterbutt', (X - 0.12, Y + 0.24, 0.2), 0.15, 0.36, timber, v=14)
    cyl('butthoop', (X - 0.12, Y + 0.24, 0.3), 0.155, 0.03, pipe, v=14)
    cyl('butthoop', (X - 0.12, Y + 0.24, 0.1), 0.155, 0.03, pipe, v=14)
    cyl('buttwater', (X - 0.12, Y + 0.24, 0.375), 0.13, 0.01, principled('buttwater', (0.08, 0.16, 0.2), 0.1, coat=0.5), v=14)


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


def build_plot(W=3.0, D=2.4):
    stake = principled('stake', (0.3, 0.22, 0.12), 0.8)
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

