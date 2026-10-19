"""Deluxe coops (things to buy): what the upgrade adds round any coop. A white picket fence, a rose arch with lanterns over
the gate, flower borders, a stepping-stone path to the door, potted bay trees, bunting and a golden weathervane.
The coop's own size comes from its bounding box, so the same extras fit every breed's coop. Used by overlay.py."""
import math, random
import bpy, bmesh
from mathutils import Vector
from ffbird import principled, ellipsoid
from ffscene import box, cyl


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


_M = {}
def M(name, hexc, rough=0.6, metal=0.0, emit=None, coat=0.0):
    if name in _M: return _M[name]
    m = principled(name, lin(hexc), rough, coat=coat)
    b = m.node_tree.nodes['Principled BSDF']
    if metal: b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*lin(emit[0]), 1); b.inputs['Emission Strength'].default_value = emit[1]
    _M[name] = m; return m

paint = lambda: M('dx_paint', '#f4f1ea', 0.5)
leaf = lambda: M('dx_leaf', '#3f7a2a', 0.65)
leaf2 = lambda: M('dx_leaf2', '#5c9a34', 0.65)
gold = lambda: M('dx_gold', '#f2c14e', 0.22, metal=1.0)
stone = lambda: M('dx_stone', '#a8a194', 0.85)
terra = lambda: M('dx_terra', '#b0603a', 0.8)
FLOWER_COLS = ['#e2453c', '#f4c430', '#f08bb0', '#fbf6ee', '#9b6bd1', '#ff8c42']


def ball(name, loc, r, m, scale=(1, 1, 1), seg=12):
    return ellipsoid(name, loc, (r * scale[0], r * scale[1], r * scale[2]), m, seg=seg)


def picket_fence(W, D, gate=0.7):
    """White pickets with pointed tops on two rails, square corner posts with ball caps, a gap for the gate at the front."""
    w, d = W / 2, D / 2; g0, g1 = -gate / 2 - 0.15, gate / 2 - 0.15
    def run(x0, y0, x1, y1, skip=None):
        L = math.hypot(x1 - x0, y1 - y0); n = max(1, round(L / 0.11)); ang = math.atan2(y1 - y0, x1 - x0)
        for i in range(1, n):
            t = i / n; px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            if skip and skip[0] - 0.02 < px < skip[1] + 0.02: continue
            box('picket', (px, py, 0.2), (0.05, 0.022, 0.4), paint(), rot=(0, 0, ang))
            bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.036, radius2=0, depth=0.06, location=(px, py, 0.43), rotation=(0, 0, ang + math.pi / 4))
            bpy.context.object.data.materials.append(paint())
        for z in (0.12, 0.3):
            segs = [(x0, skip[0]), (skip[1], x1)] if skip else [(x0, x1)]
            for a, b_ in segs:
                if skip: box('rail', ((a + b_) / 2, y0, z), (b_ - a, 0.02, 0.045), paint())
                else: box('rail', ((x0 + x1) / 2, (y0 + y1) / 2, z), (L, 0.02, 0.045), paint(), rot=(0, 0, ang))
    run(-w, -d, w, -d, skip=(g0, g1)); run(-w, d, w, d); run(-w, -d, -w, d); run(w, -d, w, d)
    for (x, y) in ((-w, -d), (w, -d), (-w, d), (w, d), (g0, -d), (g1, -d)):
        box('cpost', (x, y, 0.25), (0.07, 0.07, 0.5), paint(), bevel=0.008); ball('cap', (x, y, 0.52), 0.04, paint())
    return g0, g1


def rose_arch(g0, g1, y):
    """A white arch over the gate, covered in climbing roses, with a lantern hanging each side."""
    cx, r = (g0 + g1) / 2, (g1 - g0) / 2
    for x in (g0, g1): box('archpost', (x, y, 0.42), (0.045, 0.045, 0.84), paint())
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.022, location=(cx, y, 0.84), rotation=(math.pi / 2, 0, 0), major_segments=32, minor_segments=8)
    o = bpy.context.object; o.data.materials.append(paint())
    bm = bmesh.new(); bm.from_mesh(o.data)                     # keep the top half
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.01], context='VERTS'); bm.to_mesh(o.data); bm.free()
    random.seed(5)
    pts = [(x, y, z) for x in (g0, g1) for z in [0.15 + k * 0.1 for k in range(8)]] + [(cx + math.cos(a) * r, y, 0.84 + math.sin(a) * r) for a in [k / 10 * math.pi for k in range(11)]]
    for p in pts:
        ball('rleaf', (p[0] + random.uniform(-0.03, 0.03), p[1] + random.uniform(-0.04, 0.04), p[2]), 0.055, leaf() if random.random() < 0.6 else leaf2(), scale=(1, 0.8, 0.9))
        if random.random() < 0.75:
            ball('rose', (p[0] + random.uniform(-0.04, 0.04), p[1] - 0.04, p[2] + random.uniform(-0.03, 0.03)), 0.028, M('dx_rose', '#e0567a', 0.5) if random.random() < 0.6 else M('dx_rose2', '#c8283c', 0.5))
    for x in (g0 - 0.07, g1 + 0.07):                            # lanterns
        box('lanternb', (x, y - 0.05, 0.66), (0.07, 0.07, 0.1), M('dx_iron', '#22201e', 0.5, metal=0.5), bevel=0.006)
        box('lanterng', (x, y - 0.05, 0.66), (0.075, 0.075, 0.07), M('dx_lamp', '#ffd98a', 0.3, emit=('#ffcf70', 3.0)))
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.06, radius2=0.0, depth=0.05, location=(x, y - 0.05, 0.735), rotation=(0, 0, math.pi / 4))
        bpy.context.object.data.materials.append(M('dx_iron', '#22201e', 0.5, metal=0.5))


def flower_border(x0, x1, y, depth=0.18):
    random.seed(int((x0 + 5) * 100))
    n = int((x1 - x0) / 0.04)
    for i in range(n):
        x = random.uniform(x0, x1); yy = y + random.uniform(-depth / 2, depth / 2)
        if random.random() < 0.4: ball('bleaf', (x, yy, 0.05), 0.05, leaf2(), scale=(1, 1, 0.6))
        ball('bflower', (x, yy, 0.1 + random.uniform(0, 0.06)), 0.026, M('dx_fl' + str(i % 6), FLOWER_COLS[i % 6], 0.5))


def side_border(x, y0, y1, depth=0.2):
    """Flowers along the inside of a side fence (the one seen across the pen)."""
    random.seed(int((y0 + 5) * 77))
    for i in range(int((y1 - y0) / 0.035)):
        y = random.uniform(y0, y1); xx = x + random.uniform(-depth / 2, depth / 2)
        if random.random() < 0.45: ball('sleaf', (xx, y, 0.05), 0.055, leaf2(), scale=(1, 1, 0.6))
        ball('sflower', (xx, y, 0.1 + random.uniform(0, 0.08)), 0.028, M('dx_fl' + str(i % 6), FLOWER_COLS[i % 6], 0.5))


def coop_box(objs):
    bpy.context.view_layer.update()
    xs, ys, zs = [], [], []
    for o in objs:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            v = o.matrix_world @ Vector(c); xs.append(v.x); ys.append(v.y); zs.append(v.z)
    return min(xs), max(xs), min(ys), max(ys), max(zs)


def top_point(objs):
    """The coop's highest point (the ridge), for the weathervane."""
    best = None
    for o in objs:
        if o.type != 'MESH': continue
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            if best is None or p.z > best.z + 1e-4 or (abs(p.z - best.z) < 1e-4 and abs(p.x) + abs(p.y) < abs(best.x) + abs(best.y)): best = p
    return best


def weathervane(p):
    g = gold()
    cyl('vrod', (p.x, p.y, p.z + 0.17), 0.012, 0.34, g, v=8)
    for ang in (0, math.pi / 2):
        box('varm', (p.x, p.y, p.z + 0.2), (0.26, 0.012, 0.012), g, rot=(0, 0, ang + math.pi / 4))
    for (dx, dy) in ((0.13, 0), (-0.13, 0), (0, 0.13), (0, -0.13)):
        c, s = math.cos(math.pi / 4), math.sin(math.pi / 4)
        ball('vball', (p.x + dx * c - dy * s, p.y + dx * s + dy * c, p.z + 0.2), 0.018, g)
    z = p.z + 0.36                                              # a little cockerel on top, side-on to the camera
    ball('vbody', (p.x, p.y, z), 0.07, g, scale=(1.3, 0.25, 0.8), seg=16)
    ball('vhead', (p.x - 0.08, p.y, z + 0.06), 0.035, g, scale=(1, 0.3, 1), seg=12)
    ball('vcomb', (p.x - 0.085, p.y, z + 0.1), 0.02, g, scale=(1.2, 0.25, 0.9), seg=10)
    for k in range(3):
        ball('vtail', (p.x + 0.08 + k * 0.012, p.y, z + 0.04 + k * 0.025), 0.05, g, scale=(0.35, 0.2, 1.0), seg=10).rotation_euler.y = math.radians(-25 + k * 10)


def front_bunting(PW, PD, g0, g1):
    """Bunting along the front fence, from each corner post up to the rose arch."""
    bunting((-PW / 2, -PD / 2 - 0.01, 0.56), (g0 - 0.02, -PD / 2 - 0.01, 0.86), sag=0.08)
    bunting((g1 + 0.02, -PD / 2 - 0.01, 0.86), (PW / 2, -PD / 2 - 0.01, 0.56), sag=0.08)


def bunting(a, b, sag=0.12):
    """A string of little flags hanging between two points."""
    a, b = Vector(a), Vector(b); L = (b - a).length; n = max(4, int(L / 0.13))
    pts = [a.lerp(b, i / n) - Vector((0, 0, sag * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]
    cu = bpy.data.curves.new('bstring', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.007
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p.x, p.y, p.z, 1)
    o = bpy.data.objects.new('bstring', cu); bpy.context.collection.objects.link(o); o.data.materials.append(M('dx_string', '#efe6d2', 0.7))
    cols = ['#d8343a', '#f2c14e', '#3d6aa8', '#fbf6ee', '#4f9a4a']
    d = (b - a).normalized()
    for i in range(1, n):
        p, q = pts[i] - d * 0.055, pts[i] + d * 0.055
        me = bpy.data.meshes.new('flag'); bm = bmesh.new()
        vs = [bm.verts.new(p), bm.verts.new(q), bm.verts.new((p + q) / 2 - Vector((0, 0, 0.13)))]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
        f = bpy.data.objects.new('flag', me); bpy.context.collection.objects.link(f); f.data.materials.append(M('dx_flag' + str(i % 5), cols[i % 5], 0.6))


def extras(coop_objs, PW, PD, g0, g1):
    x0, x1, y0, y1, zt = coop_box(coop_objs)
    cx = (x0 + x1) / 2
    top = top_point(coop_objs)
    if top is not None: weathervane(top)
    rose_arch(g0, g1, -PD / 2)
    flower_border(-PW / 2 + 0.15, g0 - 0.1, -PD / 2 + 0.17); flower_border(g1 + 0.1, PW / 2 - 0.15, -PD / 2 + 0.17)
    side_border(-PW / 2 + 0.17, -PD / 2 + 0.3, PD / 2 - 0.3)
    door = Vector((cx, y0 - 0.12, 0)); gate = Vector(((g0 + g1) / 2, -PD / 2 + 0.2, 0))
    for k in range(6):                                          # stepping stones from the gate to the door
        t = k / 5; p = gate.lerp(door, t)
        cyl('step', (p.x + random.uniform(-0.03, 0.03), p.y, 0.012), 0.09 + random.uniform(-0.01, 0.015), 0.024, stone(), v=14)
    for sd in (-1, 1):                                          # bay trees in pots by the door
        px, py = cx + sd * min(0.45, (x1 - x0) / 2 - 0.05), y0 - 0.2
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.08, radius2=0.11, depth=0.18, location=(px, py, 0.09)); bpy.context.object.data.materials.append(terra())
        cyl('trunk', (px, py, 0.26), 0.012, 0.2, M('dx_trunk', '#5a3d24', 0.8), v=6)
        ball('bay', (px, py, 0.42), 0.12, leaf(), seg=16)
    front_bunting(PW, PD, g0, g1)
