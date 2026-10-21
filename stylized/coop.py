"""A stylized Red Barn coop with its pen, built plank by plank so it looks hand-made.
Run directly for a close-up: python coop.py [samples]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

_M = {}


def M():
    if _M: return _M
    G = (1.5, 26, 26)          # wood grain streaks run along each plank (its local X)
    _M.update(
        red=mat('barn_red', '#b8402d', rough=0.72, spec=0.2, var=0.09, hue_var=0.012, grain=0.22, grain_scale=G),
        white=mat('trim', '#f1e9d8', rough=0.6, spec=0.25, var=0.04, grain=0.12, grain_scale=G),
        roof=mat('slate', '#56677a', rough=0.65, spec=0.25, var=0.14, hue_var=0.01, bump=0.15, bump_scale=50),
        ridge=mat('ridge', '#46525f', rough=0.6, var=0.06),
        wood=mat('wood', '#a7744a', rough=0.75, var=0.13, hue_var=0.01, grain=0.38, grain_scale=G),
        darkwood=mat('darkwood', '#6d4a31', rough=0.8, var=0.1, grain=0.3, grain_scale=G),
        capwood=mat('capwood', '#8a5e3b', rough=0.8, var=0.1, bump=0.2, bump_scale=60),
        metal=mat('galv', '#b6bec3', rough=0.32, metal=0.85, var=0.04, bump=0.05, bump_scale=200),
        glass=mat('glass', '#2f4c66', rough=0.08, spec=0.9, coat=1.0, emission=('#ffcf7a', 0.0)),
        dirt=dirt_mat(),
        straw=mat('straw', '#e5c467', rough=0.7, var=0.18, hue_var=0.015, sss=0.1),
        hay=mat('hay', '#dcb758', rough=0.85, grain=0.35, grain_scale=(1, 40, 40), var=0.06),
        twine=mat('twine', '#8e6a3c', rough=0.9),
        water=mat('water', '#8fd2ec', rough=0.12, spec=0.5, coat=0.3),
        bowl=mat('bowl', '#3f7fb5', rough=0.35, spec=0.4),
        sack=mat('sack', '#d9c49a', rough=0.95, bump=0.3, bump_scale=120),
        grain_=mat('grainfeed', '#e0b25a', rough=0.8, bump=0.6, bump_scale=300),
    )
    return _M


def dirt_mat():
    """Packed earth: two browns in soft patches, worn darker near the middle, fine grit bump."""
    m = bpy.data.materials.new('dirt'); m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.95
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = 0.1
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 5
    L.new(tc.outputs['Object'], nz.inputs[0])
    cr = N.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
    el[0].position, el[0].color = 0.38, lin('#8a6440'); el[1].position, el[1].color = 0.62, lin('#b48d5f')
    L.new(nz.outputs['Fac'], cr.inputs[0]); L.new(cr.outputs['Color'], b.inputs['Base Color'])
    grit = N.new('ShaderNodeTexNoise'); grit.inputs['Scale'].default_value = 90; grit.inputs['Detail'].default_value = 2
    L.new(tc.outputs['Object'], grit.inputs[0])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.5; bp.inputs['Distance'].default_value = 0.004
    L.new(grit.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def plank(name, a, b, width, thick, normal, m, parent=None, jitter=0.6, bevel=0.008):
    """A board from point a to point b (its length), lying with its face towards `normal`."""
    a, b, n = Vector(a), Vector(b), Vector(normal).normalized()
    L = b - a; ln = L.length; X = L / ln
    T = (n - X * n.dot(X)).normalized(); W = X.cross(T)
    o = box(name, (ln, thick, width), (0, 0, 0), m=m, bevel=bevel, segs=2)
    R = Matrix((X, T, W)).transposed().to_4x4()
    j = Euler((math.radians(random.uniform(-jitter, jitter)), math.radians(random.uniform(-jitter, jitter)), math.radians(random.uniform(-jitter, jitter)))).to_matrix().to_4x4()
    o.matrix_world = Matrix.Translation((a + b) / 2) @ R @ j
    if parent:
        mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = parent.matrix_world @ mw if False else mw
    return o


def build(loc=(0, 0, 0), yaw=0.0, seed=5, pen=True, window=None):
    """window: (x0, x1, z0, z1), an opening left in the front boards (the nest window; coops.red_barn adds the rest)."""
    random.seed(seed); m = M()
    objs = []
    W2, D2 = 0.62, 0.44          # half width (x) and half depth (y) of the house
    FL, EAVE, PEAK = 0.40, 1.02, 1.46      # floor, eave and ridge heights
    # ---- legs and floor
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(box('leg', (0.075, 0.075, FL), (sx * (W2 - 0.05), sy * (D2 - 0.05), FL / 2), m=m['darkwood'], bevel=0.01))
    for i in range(7):
        y = -D2 + 0.06 + i * (2 * D2 - 0.12) / 6
        objs.append(plank('floor', (-W2 - 0.03, y, FL), (W2 + 0.03, y, FL), 0.13, 0.045, (0, 0, 1), m['wood']))
    # ---- walls: vertical boards in barn red
    BW = 0.105
    def wall_boards(x0, x1, y, out, top, door=None, win=None):
        n = int(round((x1 - x0) / BW)); w = (x1 - x0) / n
        for i in range(n):
            x = x0 + (i + 0.5) * w
            z1 = top(x)
            if door and door[0] < x < door[1]:
                objs.append(plank('wall', (x, y, door[2]), (x, y, z1), w * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
                continue
            if win and x - w / 2 < win[1] and x + w / 2 > win[0]:     # a board the window cuts: full beside it, under and over it
                xl, xr = x - w / 2, x + w / 2
                pieces = []
                if xl < win[0]: pieces.append((xl, win[0], FL + 0.02, z1))
                if xr > win[1]: pieces.append((win[1], xr, FL + 0.02, z1))
                a, b = max(xl, win[0]), min(xr, win[1])
                pieces += [(a, b, FL + 0.02, win[2]), (a, b, win[3], z1)]
                for (xa, xb, za, zb) in pieces:
                    if xb - xa > 0.012 and zb - za > 0.01:
                        objs.append(plank('wall', ((xa + xb) / 2, y, za), ((xa + xb) / 2, y, zb), (xb - xa) * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
                continue
            objs.append(plank('wall', (x, y, FL + 0.02), (x, y, z1), w * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
    # front (-y) and back (+y): straight tops at the eave
    wall_boards(-W2, W2, -D2, -1, lambda x: EAVE, door=(-0.42, -0.2, FL + 0.27), win=window)
    wall_boards(-W2, W2, D2, 1, lambda x: EAVE)
    # gable ends (+x and -x): boards follow the roof slope
    def gable(xw, out):
        n = int(round(2 * D2 / BW)); w = 2 * D2 / n
        for i in range(n):
            y = -D2 + (i + 0.5) * w
            top = EAVE + (PEAK - EAVE) * (1 - abs(y) / D2) - 0.02
            objs.append(plank('gable', (xw, y, FL + 0.02), (xw, y, top), w * 0.96, 0.03, (out, 0, 0), m['red'], jitter=0.4))
    gable(W2 + 0.015, 1); gable(-W2 - 0.015, -1)
    # white corner trims and eave boards
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(box('ctrim', (0.06, 0.06, EAVE - FL), (sx * (W2 + 0.02), sy * (D2 + 0.02), (EAVE + FL) / 2), m=m['white'], bevel=0.008))
    for sy in (-1, 1):
        objs.append(plank('etrim', (-W2 - 0.05, sy * (D2 + 0.035), EAVE - 0.03), (W2 + 0.05, sy * (D2 + 0.035), EAVE - 0.03), 0.06, 0.025, (0, sy, 0), m['white']))
        objs.append(plank('btrim', (-W2 - 0.05, sy * (D2 + 0.035), FL + 0.04), (W2 + 0.05, sy * (D2 + 0.035), FL + 0.04), 0.06, 0.025, (0, sy, 0), m['white']))
    # ---- big barn door on the front, white frame with the X brace
    dx0, dx1, dz0, dz1 = (-0.13, 0.29, FL + 0.06, EAVE - 0.1) if window else (0.0, 0.42, FL + 0.06, EAVE - 0.1)
    yd = -D2 - 0.03
    for i in range(4):
        x = dx0 + (i + 0.5) * (dx1 - dx0) / 4
        objs.append(plank('door', (x, yd, dz0), (x, yd, dz1), (dx1 - dx0) / 4 * 0.95, 0.025, (0, -1, 0), m['red'], jitter=0.3))
    yt = yd - 0.022
    for (p, q) in [((dx0, yt, dz0), (dx1, yt, dz0)), ((dx0, yt, dz1), (dx1, yt, dz1)), ((dx0, yt, dz0), (dx0, yt, dz1)), ((dx1, yt, dz0), (dx1, yt, dz1)),
                   ((dx0, yt - 0.004, dz0), (dx1, yt - 0.004, dz1)), ((dx1, yt - 0.008, dz0), (dx0, yt - 0.008, dz1))]:
        objs.append(plank('xtrim', p, q, 0.05, 0.022, (0, -1, 0), m['white'], jitter=0.2))
    objs.append(sphere('handle', 0.016, (dx0 + 0.06, yt - 0.03, (dz0 + dz1) / 2), m=m['metal'], seg=12, rings=8))
    # ---- chicken pop door, dark opening with a white surround
    objs.append(box('hole', (0.2, 0.02, 0.24), (-0.31, -D2 + 0.005, FL + 0.14), m=mat('dark', '#2a1d16', rough=1.0), bevel=0.0))
    for (p, q) in [((-0.43, -D2 - 0.03, FL + 0.27), (-0.19, -D2 - 0.03, FL + 0.27)), ((-0.43, -D2 - 0.03, FL + 0.02), (-0.43, -D2 - 0.03, FL + 0.28)),
                   ((-0.19, -D2 - 0.03, FL + 0.02), (-0.19, -D2 - 0.03, FL + 0.28))]:
        objs.append(plank('ptrim', p, q, 0.045, 0.02, (0, -1, 0), m['white'], jitter=0.3))
    # ---- ramp down to the ground with little cross slats
    ra, rb = Vector((-0.31, -D2 - 0.05, FL + 0.02)), Vector((-0.31, -D2 - 0.72, 0.03))
    objs.append(plank('ramp', ra, rb, 0.2, 0.03, (0, -0.5, 0.86), m['wood'], jitter=0.3))
    nrm = Vector((0, -0.5, 0.86)).normalized()
    for k in range(5):
        c = ra.lerp(rb, (k + 0.6) / 5.6) + nrm * 0.022
        objs.append(plank('slat', c + Vector((-0.09, 0, 0)), c + Vector((0.09, 0, 0)), 0.022, 0.018, nrm, m['darkwood'], jitter=1.5))
    # ---- roof: rows of slate shingles, staggered, with a ridge cap and white bargeboards
    def roof_side(sy):
        e0 = Vector((0, sy * (D2 + 0.16), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02))
        down = (e0 - r0); slope = down.length; dn = down.normalized()
        nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + 0.16)).normalized()
        rows = int(slope / 0.075)
        for r in range(rows + 1):
            t = 1 - r / rows
            base = r0 + down * t + nrm * (0.03 + 0.004 * (r % 2))
            n = 12; w = (2 * W2 + 0.3) / n; off = (w / 2) if r % 2 else 0
            for i in range(n + (1 if r % 2 else 0)):
                x = -W2 - 0.15 + off + i * w - (w / 2 if r % 2 else 0) + w / 2
                if abs(x) > W2 + 0.16: continue
                a = base + Vector((x, 0, 0)) - dn * 0.06; b = base + Vector((x, 0, 0)) + dn * 0.06
                objs.append(plank('sh', a, b, w * 0.94, 0.018, nrm, m['roof'], jitter=1.4, bevel=0.006))
        # bargeboards
        for sx in (-1, 1):
            objs.append(plank('barge', r0 + Vector((sx * (W2 + 0.17), 0, 0.05)) + nrm * 0.0, e0 + Vector((sx * (W2 + 0.17), 0, 0)), 0.09, 0.03, (sx, 0, 0), m['white'], jitter=0.2))
    roof_side(-1); roof_side(1)
    objs.append(cyl('ridgecap', 0.045, 2 * W2 + 0.36, (0, 0, PEAK + 0.06), (0, math.radians(90), 0), m['ridge'], verts=14, bevel=0.0))
    # ---- round window in the +x gable
    wx = W2 + 0.04; wz = EAVE + 0.12
    ring = bpy.data.meshes.new('ring'); bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, segments=40, radius=0.1)
    bm.to_mesh(ring); bm.free()
    tor = bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.022, major_segments=40, minor_segments=12, location=(wx, 0, wz), rotation=(0, math.radians(90), 0))
    t_ = bpy.context.object; setmat(t_, m['white']); [setattr(p, 'use_smooth', True) for p in t_.data.polygons]; objs.append(t_)
    objs.append(cyl('pane', 0.098, 0.01, (wx - 0.008, 0, wz), (0, math.radians(90), 0), m['glass'], verts=32, bevel=0.0))
    objs.append(box('mull1', (0.012, 0.2, 0.016), (wx + 0.004, 0, wz), m=m['white'], bevel=0.003))
    objs.append(box('mull2', (0.012, 0.016, 0.2), (wx + 0.004, 0, wz), m=m['white'], bevel=0.003))
    # ---- nest box on the +x side, with a sloping lid (not when the nests are inside, behind the window)
    nx = W2 + 0.03
    if not window:
        objs.append(box('nest', (0.26, 0.5, 0.24), (nx + 0.13, 0.0, FL + 0.2), m=m['red'], bevel=0.012))
        lid = box('lid', (0.32, 0.58, 0.035), (nx + 0.15, 0.0, FL + 0.345), (0, math.radians(18), 0), m=m['roof'], bevel=0.01); objs.append(lid)
        for yy in (-0.255, 0.255):
            objs.append(box('ntrim', (0.27, 0.03, 0.035), (nx + 0.13, yy, FL + 0.095), m=m['white'], bevel=0.006))
            objs.append(box('ntrim', (0.035, 0.03, 0.24), (nx + 0.245, yy, FL + 0.2), m=m['white'], bevel=0.006))
        objs.append(box('nprop', (0.04, 0.04, 0.2), (nx + 0.2, 0, FL - 0.06), (0, math.radians(30), 0), m=m['darkwood'], bevel=0.008))
    # ---- straw peeking out of the pop door and under the house
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.03), 0.09, 25, 0.0)
    root = empty('coop', loc, (0, 0, yaw))
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = mw
    if pen: build_pen(root, m)
    return root


def straw_bits(objs, c, r, n, z0):
    m = M()
    for i in range(n):
        a = random.uniform(0, math.tau); d = random.uniform(0, r)
        p = Vector(c) + Vector((math.cos(a) * d, math.sin(a) * d, z0 + 0.004))
        dirn = Vector((math.cos(random.uniform(0, 6.3)), math.sin(random.uniform(0, 6.3)), random.uniform(-0.05, 0.12))).normalized()
        L = random.uniform(0.04, 0.09)
        objs.append(cyl('straw', 0.0025, L, p, dirn.to_track_quat('Z', 'Y').to_euler(), m['straw'], verts=5, bevel=0))


# The pen's size and where its things stand (Blender metres; the house is at the origin, its front faces -y).
# SMALL_PEN is the first version (Oct 2026); export_unity.py may set PEN before building.
SMALL_PEN = dict(box=(-1.25, 1.35, -1.9, 0.75), gate=2, feeder=(0.75, -1.25), dish=(0.25, -1.55), hay=(-0.85, -1.45), hay_rot=12,
                 straw=((-0.85, -1.45, 0.4, 70), (-0.3, -1.05, 0.35, 40), (0.55, -0.55, 0.5, 40)), sack=(0.95, 0.15))
PEN = dict(SMALL_PEN)


def gate_span():
    """Where the gate is on the front fence: (hinge x, opening's centre x)."""
    x0, x1 = PEN['box'][0], PEN['box'][1]
    n = max(1, int((x1 - x0) / 0.55)); g = PEN['gate']
    return x0 + (g + 1) * (x1 - x0) / n, x0 + (g + 0.5) * (x1 - x0) / n


def build_pen(root, m):
    """A fenced dirt yard in front of the house, with a feeder, water dish, hay bale and feed sack."""
    objs = []
    x0, x1, y0, y1 = PEN['box']
    # dirt yard: a slightly raised, wobbly-edged pad
    me = bpy.data.meshes.new('yard'); bm = bmesh.new()
    pts = []
    N = 64
    for i in range(N):
        a = i / N * math.tau
        rx, ry = (x1 - x0) / 2 - 0.08, (y1 - y0) / 2 - 0.08
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        k = 1 + 0.04 * noise.noise(Vector((math.cos(a) * 2, math.sin(a) * 2, 0.5)))
        sq = 1 / max(abs(math.cos(a)) ** 4 + abs(math.sin(a)) ** 4, 1e-6) ** 0.25          # squircle
        pts.append(bm.verts.new((cx + math.cos(a) * rx * sq * k, cy + math.sin(a) * ry * sq * k, -0.01)))
    f = bm.faces.new(pts)
    if f.normal.z < 0: f.normal_flip()
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[v for v in ex['geom'] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, 0.025))
    bmesh.ops.delete(bm, geom=[f], context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    yard = link(bpy.data.objects.new('yard', me)); setmat(yard, m['dirt'])
    sb = yard.modifiers.new('bev', 'BEVEL'); sb.width = 0.02; sb.segments = 3
    objs.append(yard)
    # fence: posts with two rails, natural wood, a gap for the gate
    placed = []
    def run(a, b, gate=None):
        a, b = Vector(a), Vector(b); L = (b - a).length; n = max(1, int(L / 0.55)); posts = [a.lerp(b, i / n) for i in range(n + 1)]
        for p in posts:
            if any((p - q).length < 0.05 for q in placed): continue          # corners: one post, not two in the same spot
            placed.append(p.copy())
            objs.append(box('post', (0.07, 0.07, 0.5), (p.x, p.y, 0.25), (0, 0, random.uniform(-0.1, 0.1)), m=m['wood'], bevel=0.012, jitter=0.004))
            objs.append(box('cap', (0.085, 0.085, 0.03), (p.x, p.y, 0.505), m=m['capwood'], bevel=0.01))
        for z in (0.2, 0.4):
            for i in range(n):
                p, q = posts[i], posts[i + 1]
                if gate and gate[0] <= i < gate[1]: continue
                d = (q - p).normalized(); nrm = Vector((-d.y, d.x, 0))
                objs.append(plank('rail', Vector((p.x, p.y, z)), Vector((q.x, q.y, z)), 0.07, 0.03, nrm, m['wood'], jitter=1.2))
    run((x0, y0), (x1, y0), gate=(PEN['gate'], PEN['gate'] + 1)); run((x1, y0), (x1, y1)); run((x0, y0), (x0, y1)); run((x0, y1), (x1, y1))
    # the gate, swung open outwards on its hinge post
    gx = gate_span()[0]; ang = math.radians(-70)
    hinge = Vector((gx, y0, 0)); d = Vector((-math.cos(ang), math.sin(ang), 0)).normalized() * 0.6
    nrm = Vector((-d.y, d.x, 0)).normalized()
    for z in (0.14, 0.3, 0.44):
        objs.append(plank('gate', hinge + Vector((0, 0, z)) + d.normalized() * 0.04, hinge + d + Vector((0, 0, z)), 0.06, 0.03, nrm, m['wood'], jitter=0.8))
    for t_ in (0.12, 0.95):
        p = hinge + d * t_
        objs.append(plank('gatev', p + Vector((0, 0, 0.1)), p + Vector((0, 0, 0.48)), 0.06, 0.03, nrm, m['wood'], jitter=0.5))
    objs.append(plank('gated', hinge + d * 0.12 + Vector((0, 0, 0.14)), hinge + d * 0.95 + Vector((0, 0, 0.44)), 0.05, 0.028, nrm, m['wood'], jitter=0.5))
    # galvanised feeder: tray, tube and cone hat
    fx, fy = PEN['feeder']
    objs.append(cyl('tray', 0.16, 0.05, (fx, fy, 0.03), m=m['metal'], verts=28, bevel=0.01))
    objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
    objs.append(cyl('tube', 0.09, 0.32, (fx, fy, 0.2), m=m['metal'], verts=24, bevel=0.01))
    objs.append(cyl('hat', 0.12, 0.08, (fx, fy, 0.4), m=m['metal'], verts=24, r2=0.02, bevel=0.01))
    for z in (0.12, 0.28):
        objs.append(cyl('band', 0.093, 0.015, (fx, fy, z), m=mat('band', '#9aa3a8', rough=0.3, metal=0.9), verts=24, bevel=0.003))
    # water dish
    wx, wy = PEN['dish']
    bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.028, major_segments=36, minor_segments=12, location=(wx, wy, 0.045))
    rim = bpy.context.object; setmat(rim, m['bowl']); [setattr(p, 'use_smooth', True) for p in rim.data.polygons]; objs.append(rim)
    objs.append(cyl('dishbase', 0.16, 0.03, (wx, wy, 0.02), m=m['bowl'], verts=32, bevel=0.008))
    objs.append(cyl('water', 0.135, 0.008, (wx, wy, 0.05), m=m['water'], verts=32, bevel=0.0))
    # hay bale with twine, a little loose hay
    hx, hy = PEN['hay']; hr = math.radians(PEN['hay_rot'])
    hb = box('bale', (0.55, 0.32, 0.3), (hx, hy, 0.15), (0, 0, hr), m=m['hay'], bevel=0.04, segs=4, jitter=0.006); objs.append(hb)
    for k in (-0.14, 0.14):
        objs.append(box('twine', (0.025, 0.335, 0.305), (hx + k * math.cos(hr), hy + k * math.sin(hr), 0.15), (0, 0, hr), m=m['twine'], bevel=0.005))
    for sx, sy, sr, sn in PEN['straw']:
        straw_bits(objs, (sx, sy, 0), sr, sn, 0.016)
    peb = mat('ypebble', '#b9b1a3', rough=0.8, var=0.2)
    for i in range(28):
        x, y = random.uniform(x0 + 0.15, x1 - 0.15), random.uniform(y0 + 0.15, y1 - 0.15)
        r = random.uniform(0.012, 0.028)
        objs.append(sphere('ypeb', r, (x, y, 0.015 + r * 0.1), (1.2, 1.0, 0.5), (0, 0, random.uniform(0, 6)), peb, ico=2, disp=0.25, seed=i + 40))
    # feed sack slumped by the house
    kx, ky = PEN['sack']
    sk = sphere('sack', 0.16, (kx, ky, 0.17), (0.85, 0.7, 1.1), (0, math.radians(-8), math.radians(20)), m['sack'], ico=3, disp=0.12, seed=3)
    objs.append(sk)
    objs.append(sphere('sacktop', 0.06, (kx, ky, 0.36), (1.2, 0.8, 0.6), m=m['sack'], ico=2, disp=0.2, seed=4))
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return objs


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 64
    scn = reset()
    import grass, hen
    PEN = (-1.3, -1.95, 1.4, 0.8)
    grass.field(scn, size=16.0, density=330, seed=8, tuft_h=0.05, avoid=lambda x, y: PEN[0] < x < PEN[2] and PEN[1] < y < PEN[3])
    build((0, 0, 0), 0.0)
    hen.build('rir_h', (0.2, -1.05, 0.015), math.radians(-60), 'stand', seed=3)
    hen.build('rir_h', (0.62, -1.0, 0.015), math.radians(200), 'peck', seed=4)
    hen.build('rir_h', (-0.55, -0.85, 0.015), math.radians(-20), 'look', seed=5)
    lighting(scn)
    camera(scn, (4.0, -4.4, 4.3), (0.05, -0.5, 0.35), lens=50)
    R = int(os.environ.get('RES', 1400)); render(scn, 'coop_closeup', R, int(R * 0.8), samples)
