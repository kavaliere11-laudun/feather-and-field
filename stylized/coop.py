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


POP_W, POP_H = 0.30, 0.46                 # the hens' pop door: wide and tall enough for a big hen ducking through


def pop_trim(objs, z0, trim, D2, x=-0.31):
    """The frame round the pop door's opening (x, from z0 up)."""
    a, b, t = x - POP_W / 2 - 0.0225, x + POP_W / 2 + 0.0225, z0 + POP_H + 0.0225
    for (p, q) in [((a - 0.0225, -D2 - 0.03, t), (b + 0.0225, -D2 - 0.03, t)), ((a, -D2 - 0.03, z0 + 0.01), (a, -D2 - 0.03, t)),
                   ((b, -D2 - 0.03, z0 + 0.01), (b, -D2 - 0.03, t))]:
        objs.append(plank('ptrim', p, q, 0.045, 0.02, (0, -1, 0), trim, jitter=0.3))


OVER_FRONT = 0.1                          # the Red Barn's roof over its front (0.16 behind; Audrey's polish list, 27 Oct: from some
                                          # sides its roof hid most of the nest window)


def build(loc=(0, 0, 0), yaw=0.0, seed=5, pen=True, window=None, eave=1.02, peak=1.46, roof=None):
    """window: (x0, x1, z0, z1), an opening left in the front boards (the nest window; coops.red_barn adds the rest).
    eave, peak: taller for a second floor (the barn door stays its height); roof: fn(objs, W2, D2, EAVE, PEAK) instead of
    the slates (release 4's Deluxe)."""
    random.seed(seed); m = M()
    objs = []
    W2, D2 = 0.62, 0.44          # half width (x) and half depth (y) of the house
    FL, EAVE, PEAK = 0.40, eave, peak      # floor, eave and ridge heights
    # ---- legs and floor
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(box('leg', (0.075, 0.075, FL), (sx * (W2 - 0.05), sy * (D2 - 0.05), FL / 2), m=m['darkwood'], bevel=0.01))
    for i in range(7):
        y = -D2 + 0.06 + i * (2 * D2 - 0.12) / 6
        objs.append(plank('floor', (-W2 - 0.03, y, FL), (W2 + 0.03, y, FL), 0.13, 0.045, (0, 0, 1), m['wood']))
    # ---- walls: vertical boards in barn red
    BW = 0.105
    def wall_boards(x0, x1, y, out, top, holes=()):
        n = int(round((x1 - x0) / BW)); w = (x1 - x0) / n
        for i in range(n):
            x = x0 + (i + 0.5) * w
            z1 = top(x)
            xl, xr = x - w / 2, x + w / 2
            cut = [h for h in holes if xl < h[1] and xr > h[0]]
            if not cut:
                objs.append(plank('wall', (x, y, FL + 0.02), (x, y, z1), w * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
                continue
            # a board an opening cuts: the part beside it full height, under and over it
            pieces = []; h = cut[0]
            if xl < h[0]: pieces.append((xl, h[0], FL + 0.02, z1))
            if xr > h[1]: pieces.append((h[1], xr, FL + 0.02, z1))
            a, b = max(xl, h[0]), min(xr, h[1])
            pieces += [(a, b, FL + 0.02, h[2]), (a, b, h[3], z1)]
            for (xa, xb, za, zb) in pieces:
                if xb - xa > 0.012 and zb - za > 0.01:
                    objs.append(plank('wall', ((xa + xb) / 2, y, za), ((xa + xb) / 2, y, zb), (xb - xa) * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
            continue                                        # (not a whole board over the opening too: the window and the hens' door open)
            objs.append(plank('wall', (x, y, FL + 0.02), (x, y, z1), w * 0.96, 0.03, (0, out, 0), m['red'], jitter=0.4))
    # front (-y) and back (+y): straight tops at the eave
    POP = (-0.31 - POP_W / 2, -0.31 + POP_W / 2, FL, FL + POP_H) if window else (-0.42, -0.2, FL, FL + 0.27)   # the hens' pop door
    wall_boards(-W2, W2, -D2, -1, lambda x: EAVE, holes=[POP] + ([window] if window else []))
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
        spans = [(-W2 - 0.05, W2 + 0.05)]
        if sy < 0 and window:                   # the front's bottom trim stops at the pop door and the nest window
            spans = [(-W2 - 0.05, POP[0] - 0.045), (POP[1] + 0.045, window[0] - 0.02), (window[1] + 0.02, W2 + 0.05)]
        for a, b in spans:
            objs.append(plank('btrim', (a, sy * (D2 + 0.035), FL + 0.04), (b, sy * (D2 + 0.035), FL + 0.04), 0.06, 0.025, (0, sy, 0), m['white']))
    # ---- big barn door on the front, white frame with the X brace
    dx0, dx1, dz0, dz1 = (-0.09, 0.24, FL + 0.06, min(EAVE, 1.02) - 0.1) if window else (0.0, 0.42, FL + 0.06, min(EAVE, 1.02) - 0.1)
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
    if window: pop_trim(objs, FL, m['white'], D2)   # a real opening (coops.nest_window lines the passage behind it)
    else:
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
        ov = OVER_FRONT if sy < 0 else 0.16                # (the front's overhang shorter: the nest window under it in sight)
        e0 = Vector((0, sy * (D2 + ov), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02))
        down = (e0 - r0); slope = down.length; dn = down.normalized()
        nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + ov)).normalized()
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
    if roof: roof(objs, W2, D2, EAVE, PEAK)
    else:
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


def fountain(objs, x, y, m):
    """A little stone fountain the hens can drink from: a low basin, a pedestal, a bowl spilling over into it."""
    stone = mat('fstone', '#ddd5c4', rough=0.8, var=0.06, bump=0.12, bump_scale=60); stone2 = mat('fstone2', '#c9bfac', rough=0.8, var=0.06)
    objs.append(cyl('fbasin', 0.3, 0.12, (x, y, 0.06), m=stone, verts=12, bevel=0.012))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.285, minor_radius=0.03, major_segments=24, minor_segments=8, location=(x, y, 0.12))
    rim = bpy.context.object; setmat(rim, stone2); objs.append(rim)
    objs.append(cyl('fwater', 0.262, 0.01, (x, y, 0.118), m=m['water'], verts=24, bevel=0.0))
    objs.append(cyl('fped', 0.05, 0.32, (x, y, 0.27), m=stone2, verts=10, bevel=0.008))
    objs.append(cyl('fbowl', 0.06, 0.07, (x, y, 0.45), m=stone, verts=12, r2=0.14, bevel=0.008))
    objs.append(cyl('fwater2', 0.125, 0.008, (x, y, 0.481), m=m['water'], verts=16, bevel=0.0))
    objs.append(cyl('fstem', 0.022, 0.08, (x, y, 0.52), m=stone2, verts=8, bevel=0.0))
    objs.append(sphere('ftop', 0.035, (x, y, 0.575), m=stone, seg=10, rings=6))
    for k in range(8):                                     # water spilling over the bowl's rim into the basin
        a = k / 8 * math.tau + 0.2; c, s_ = math.cos(a), math.sin(a)
        pts = [Vector((x + c * (0.14 + 0.07 * t * t ** 0.3 + 0.02 * t), y + s_ * (0.14 + 0.07 * t * t ** 0.3 + 0.02 * t), 0.485 - 0.36 * t * t)) for t in (0.0, 0.35, 0.7, 1.0)]
        for p, q in zip(pts, pts[1:]):
            objs.append(cyl('fspill', 0.009, (q - p).length, (p + q) / 2, (q - p).to_track_quat('Z', 'Y').to_euler(), m['water'], verts=5, bevel=0.0))


def trough(objs, x, y, m):
    """An old stone trough with a cast-iron pump at its end, a drip from the spout."""
    stone = mat('ftrough', '#a9a396', rough=0.85, var=0.06, bump=0.15, bump_scale=60); iron = mat('fpump', '#2f4a3c', rough=0.45, metal=0.5)
    L, Wd, H, T = 0.56, 0.28, 0.17, 0.045
    x = x - 0.05                                           # (trough and pump about the middle of its spot)
    objs.append(box('trough', (L, Wd, H - 0.05), (x, y, (H - 0.05) / 2), m=stone, bevel=0.015, segs=2, jitter=0.003))
    for (sx_, sy_, lx, ly) in ((0, 1, L, T), (0, -1, L, T), (1, 0, T, Wd - 2 * T), (-1, 0, T, Wd - 2 * T)):      # its sides, the water between
        objs.append(box('trough', (lx, ly, 0.06), (x + sx_ * (L - T) / 2, y + sy_ * (Wd - T) / 2, H - 0.03), m=stone, bevel=0.012, segs=2, jitter=0.003))
    objs.append(box('twater', (L - 2 * T + 0.01, Wd - 2 * T + 0.01, 0.01), (x, y, H - 0.03), m=m['water'], bevel=0.0))
    px = x + L / 2 + 0.07
    objs.append(box('pbase', (0.12, 0.12, 0.05), (px, y, 0.025), m=stone, bevel=0.008, segs=1))
    objs.append(cyl('pbody', 0.042, 0.46, (px, y, 0.28), m=iron, verts=12, bevel=0.006))
    objs.append(cyl('pcap', 0.05, 0.04, (px, y, 0.53), m=iron, verts=12, r2=0.03, bevel=0.004))
    objs.append(sphere('pknob', 0.02, (px, y, 0.56), m=iron, seg=8, rings=5))
    objs.append(cyl('pspout', 0.016, 0.13, (px - 0.07, y, 0.37), (0, math.radians(-100), 0), m=iron, verts=8, bevel=0.0))
    objs.append(cyl('phandle', 0.01, 0.28, (px + 0.1, y, 0.56), (0, math.radians(-60), 0), m=iron, verts=6, bevel=0.0))
    objs.append(cyl('pdrip', 0.007, 0.2, (px - 0.135, y, 0.24), m=m['water'], verts=5, bevel=0.0))


def koi_pond(objs, x, y, m):
    """A little koi pond edged with rounded stones, lily pads, two koi, a bamboo spout trickling into it."""
    stone = mat('fkstone', '#9a958a', rough=0.85, var=0.1); stone2 = mat('fkstone2', '#86817a', rough=0.85, var=0.1)
    R = 0.4
    objs.append(cyl('kbed', R, 0.02, (x, y, 0.01), m=mat('fkbed', '#3e5a55', rough=0.9), verts=24, bevel=0.0))
    objs.append(cyl('kwater', R - 0.01, 0.01, (x, y, 0.045), m=m['water'], verts=24, bevel=0.0))
    for k in range(14):
        a = k / 14 * math.tau + random.uniform(-0.08, 0.08); rr = random.uniform(0.05, 0.075)
        objs.append(sphere('kstone', rr, (x + math.cos(a) * (R + 0.02), y + math.sin(a) * (R + 0.02), 0.04), (1.25, 1, 0.75), (0, 0, a), m=stone if k % 3 else stone2, ico=2, disp=0.25, seed=k + 3))
    pad = mat('fkpad', '#4f8a3a', rough=0.7, var=0.08)
    for k, (dx, dy, r_) in enumerate(((-0.12, 0.14, 0.06), (0.15, 0.05, 0.05), (-0.02, -0.18, 0.045))):
        objs.append(cyl('kpad', r_, 0.006, (x + dx, y + dy, 0.052), (0, 0, k), m=pad, verts=12, bevel=0.0))
    objs.append(sphere('kflower', 0.02, (x - 0.12, y + 0.14, 0.065), (1, 1, 0.7), m=mat('fkflower', '#f3a6c0', rough=0.6), ico=1))
    for k, (dx, dy, a, col) in enumerate(((0.05, -0.05, 0.6, '#f08a2c'), (-0.15, -0.02, 2.4, '#f4efe4'))):
        objs.append(sphere('koi', 0.05, (x + dx, y + dy, 0.04), (1.0, 0.38, 0.22), (0, 0, a), m=mat('fkoi%d' % k, col, rough=0.5), seg=10, rings=6))
        objs.append(cyl('koitail', 0.022, 0.035, (x + dx - math.cos(a) * 0.06, y + dy - math.sin(a) * 0.06, 0.04), (0, math.radians(90), a), m=mat('fkoi%d' % k, col, rough=0.5), verts=3, r2=0.0, bevel=0.0))
    bam = mat('fkbam', '#bba96b', rough=0.8, var=0.06); node = mat('fknode', '#8d7b45', rough=0.8)
    sx, sy = x + R * 0.55, y + R * 0.75                        # the spout at its back, on two crossed canes
    for d in (-1, 1):
        objs.append(cyl('kstand', 0.014, 0.3, (sx + d * 0.04, sy, 0.15), (0, math.radians(15 * d), 0), m=bam, verts=6, bevel=0.0))
    a_, b_ = Vector((sx + 0.06, sy + 0.04, 0.27)), Vector((sx - 0.12, sy - 0.12, 0.2))
    objs.append(cyl('kspout', 0.022, (b_ - a_).length, (a_ + b_) / 2, (b_ - a_).normalized().to_track_quat('Z', 'Y').to_euler(), m=bam, verts=8, bevel=0.0))
    objs.append(cyl('knode', 0.025, 0.01, a_.lerp(b_, 0.5), (b_ - a_).normalized().to_track_quat('Z', 'Y').to_euler(), m=node, verts=8, bevel=0.0))
    objs.append(cyl('ktrickle', 0.006, 0.15, (b_.x - 0.01, b_.y - 0.01, 0.125), m=m['water'], verts=5, bevel=0.0))


def stone_sink(objs, x, y, m):
    """An old stone sink set on the ground for water."""
    stone = mat('fsink', '#a8a194', rough=0.85, var=0.06, bump=0.15, bump_scale=60)
    L, Wd, H, T = 0.34, 0.26, 0.12, 0.04
    objs.append(box('sink', (L, Wd, H - 0.04), (x, y, (H - 0.04) / 2), m=stone, bevel=0.012, segs=2, jitter=0.002))
    for (sx_, sy_, lx, ly) in ((0, 1, L, T), (0, -1, L, T), (1, 0, T, Wd - 2 * T), (-1, 0, T, Wd - 2 * T)):
        objs.append(box('sink', (lx, ly, 0.05), (x + sx_ * (L - T) / 2, y + sy_ * (Wd - T) / 2, H - 0.025), m=stone, bevel=0.01, segs=2, jitter=0.002))
    objs.append(box('swater', (L - 2 * T + 0.01, Wd - 2 * T + 0.01, 0.01), (x, y, H - 0.03), m=m['water'], bevel=0.0))
    objs.append(sphere('smoss', 0.03, (x - L / 2 + 0.02, y + Wd / 2 - 0.02, H), (1.4, 1, 0.4), m=mat('fsmoss', '#6b7a46', rough=0.95), ico=1, disp=0.3, seed=3))


def water_butt(objs, x, y, m):
    """A water butt (an oak barrel on a stone stand) behind a low stone basin, its brass tap dripping into it."""
    oak = mat('fbutt', '#7a5536', rough=0.8, var=0.1, grain=0.3, grain_scale=(1.5, 26, 26)); iron = mat('fbiron', '#2b2824', rough=0.5, metal=0.6)
    stone = mat('fsink', '#a8a194', rough=0.85, var=0.06, bump=0.15, bump_scale=60); brass = mat('fbrass', '#c99a3c', rough=0.3, metal=0.9)
    bx, by = x, y + 0.17
    objs.append(box('bstand', (0.3, 0.3, 0.1), (bx, by, 0.05), m=stone, bevel=0.01, segs=1))
    objs.append(cyl('butt', 0.13, 0.38, (bx, by, 0.29), m=oak, verts=16, bevel=0.01))
    for z in (0.15, 0.43): objs.append(cyl('bhoop', 0.134, 0.02, (bx, by, z), m=iron, verts=16, bevel=0.0))
    objs.append(cyl('blid', 0.125, 0.015, (bx, by, 0.485), m=oak, verts=16, bevel=0.003))
    objs.append(cyl('btap', 0.01, 0.07, (bx, by - 0.16, 0.16), (math.radians(90), 0, 0), m=brass, verts=6, bevel=0.0))
    objs.append(cyl('basin', 0.15, 0.07, (x, y - 0.06, 0.035), m=stone, verts=16, bevel=0.008))
    objs.append(cyl('bwater', 0.125, 0.01, (x, y - 0.06, 0.068), m=m['water'], verts=16, bevel=0.0))
    objs.append(cyl('bdrip', 0.005, 0.08, (bx, by - 0.2, 0.11), m=m['water'], verts=5, bevel=0.0))


def half_log(objs, name, x, y, zc, R, L, axis, m, end_m):
    """A half log lying along x or y, its round side down (its middle at height zc), hollowed: open on top, its sawn ends
    closed with end grain (a trough for water, a bath of sand)."""
    def at(u, a, r):                                       # u along the log, a round it (pi..2pi: its lower half), r out
        c, s_ = math.cos(a), math.sin(a)
        return (x + u, y + r * c, zc + r * s_) if axis == 'x' else (x + r * c, y + u, zc + r * s_)
    segs = 12; me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = [[bm.verts.new(at(u, math.pi + math.pi * k / segs, R)) for k in range(segs + 1)] for u in (-L / 2, L / 2)]
    for k in range(segs): bm.faces.new((rings[0][k], rings[0][k + 1], rings[1][k + 1], rings[1][k]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.035; so.offset = 0; objs.append(o)
    for u in (-L / 2, L / 2):                              # its ends: half discs of end grain
        me = bpy.data.meshes.new(name + 'end'); bm = bmesh.new()
        bm.faces.new([bm.verts.new(at(u, math.pi + math.pi * k / segs, R + 0.018)) for k in range(segs + 1)]); bm.normal_update(); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new(name + 'end', me)); setmat(o, end_m); so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.02; so.offset = 0; objs.append(o)


def log_flume(objs, x, y, m):
    """A hollow half log full of water, a split-log flume on crossed sticks trickling into it from behind."""
    log = mat('fflog', '#8d5b34', rough=0.8, var=0.08, grain=0.3, grain_scale=(1.5, 26, 26)); endg = mat('ffend', '#cfa268', rough=0.8)
    bark = mat('ffbark', '#5e4a3a', rough=0.85, var=0.08)
    L, R, zc = 0.62, 0.15, 0.15
    half_log(objs, 'ftrough', x, y, zc, R, L, 'x', log, endg)
    objs.append(box('fwater', (L - 0.03, 2 * R - 0.04, 0.01), (x, y, zc - 0.02), m=m['water'], bevel=0.0))
    a, b = Vector((x + 0.16, y + 0.5, 0.46)), Vector((x + 0.1, y + 0.06, 0.22))     # the flume, from behind, its water along it
    nrm = Vector((0, -(a.z - b.z), (a.y - b.y))).normalized()    # (up off its slope)
    objs.append(plank('flume', a, b, 0.09, 0.025, nrm, bark, jitter=0.4))
    objs.append(plank('flumew', a + nrm * 0.016, b + nrm * 0.016, 0.05, 0.006, nrm, m['water'], jitter=0.0, bevel=0.0))
    for sx in (-1, 1):                                     # crossed sticks holding it up
        p, q = Vector((x + 0.16 + sx * 0.13, y + 0.36, 0.0)), Vector((x + 0.16 - sx * 0.05, y + 0.36, 0.43))
        objs.append(cyl('fstick', 0.014, (q - p).length, (p + q) / 2, (q - p).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=6, bevel=0.0))
    objs.append(cyl('ftrickle', 0.006, 0.1, (b.x, b.y - 0.03, zc + 0.03), m=m['water'], verts=5, bevel=0.0))


def canal(objs, x, y, m):
    """A little canal edged with bricks along x (the Deluxe windmill's water, release 7), a white drawbridge over its middle:
    a deck on low brick piers, two white posts with a beam across their tops and chains down to the deck."""
    L, W = 0.92, 0.34
    bricks = [mat('fc_brick%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#b0624a', '#a35a43', '#bd7056'))]
    white = mat('fc_white', '#f2ede2', rough=0.6, var=0.03); iron = mat('fc_iron', '#2b2824', rough=0.5, metal=0.6)
    objs.append(box('cbed', (L, W, 0.02), (x, y, 0.02), m=mat('fc_bed', '#3f5a52', rough=0.9), bevel=0.0))
    objs.append(box('cwater', (L - 0.02, W - 0.02, 0.01), (x, y, 0.055), m=m['water'], bevel=0.0))
    k = 0
    for sy in (-1, 1):                                     # its brick edges, along it and across its ends
        u = -L / 2 - 0.05
        while u < L / 2 + 0.05:
            w = min(0.13, L / 2 + 0.05 - u)
            objs.append(box('cbrick', (w - 0.01, 0.07, 0.07), (x + u + w / 2, y + sy * (W / 2 + 0.035), 0.035), m=bricks[k % 3], bevel=0.008, segs=1, jitter=0.002)); u += w; k += 1
    for sx in (-1, 1):
        for j in range(3):
            objs.append(box('cbrick', (0.07, W / 3 - 0.01, 0.07), (x + sx * (L / 2 + 0.035), y - W / 3 + j * W / 3, 0.035), m=bricks[(k + j) % 3], bevel=0.008, segs=1, jitter=0.002))
    for sy in (-1, 1):                                     # the bridge's piers, its deck across, its posts, beam and chains
        objs.append(box('cpier', (0.16, 0.09, 0.1), (x, y + sy * (W / 2 + 0.07), 0.05), m=bricks[1], bevel=0.008, segs=1))
    for j in range(5):
        objs.append(plank('cdeck', (x - 0.075 + j * 0.0375, y - W / 2 - 0.07, 0.112), (x - 0.075 + j * 0.0375, y + W / 2 + 0.07, 0.112), 0.034, 0.018, (0, 0, 1), white, jitter=0.3, bevel=0.003))
    for sx in (-1, 1):
        objs.append(box('cpost', (0.03, 0.03, 0.34), (x + sx * 0.09, y + W / 2 + 0.07, 0.27), m=white, bevel=0.005, segs=1))
        objs.append(cyl('cchain', 0.004, 0.33, (x + sx * 0.09, y + 0.06, 0.28), (math.radians(-62), 0, 0), m=iron, verts=4, bevel=0.0))
    objs.append(box('cbeam', (0.24, 0.035, 0.03), (x, y + W / 2 + 0.07, 0.45), m=white, bevel=0.005, segs=1))
    objs.append(box('ccounter', (0.03, 0.34, 0.03), (x, y + W / 2 + 0.07 + 0.12, 0.45), m=white, bevel=0.005, segs=1))


def padasan(objs, x, y, m):
    """A padasan (the Deluxe Javanese house's water, release 7): a big clay jar on a stone stand behind a carved stone basin,
    water trickling from a bamboo spout in its side down into the basin."""
    clay = mat('fp_clay', '#b8643c', rough=0.75, var=0.04); stone = mat('fp_stone', '#77736b', rough=0.9, var=0.06)
    bamboo = mat('fp_bamboo', '#c9b56e', rough=0.6); gold = mat('fp_gold', '#c9a24a', rough=0.35, metal=0.7)
    jx, jy = x, y + 0.2
    objs.append(box('pstand', (0.3, 0.3, 0.14), (jx, jy, 0.07), m=stone, bevel=0.012, segs=1))
    objs.append(sphere('pjar', 0.15, (jx, jy, 0.3), (1, 1, 1.1), m=clay, seg=16, rings=10))
    objs.append(cyl('pneck', 0.075, 0.08, (jx, jy, 0.47), m=clay, verts=14, r2=0.09, bevel=0.005))
    objs.append(cyl('pband', 0.152, 0.02, (jx, jy, 0.33), m=gold, verts=16, bevel=0.0))
    objs.append(cyl('pspout', 0.014, 0.16, (jx, jy - 0.2, 0.26), (math.radians(80), 0, 0), m=bamboo, verts=6, bevel=0.0))
    objs.append(cyl('pbasin', 0.16, 0.08, (x, y - 0.08, 0.04), (0, 0, math.pi / 8), m=stone, verts=8, bevel=0.01))
    objs.append(cyl('pwater', 0.135, 0.01, (x, y - 0.08, 0.078), m=m['water'], verts=16, bevel=0.0))
    objs.append(cyl('ptrickle', 0.005, 0.15, (jx, jy - 0.28, 0.17), m=m['water'], verts=5, bevel=0.0))


def hauz(objs, x, y, m):
    """A hauz (the Deluxe Garden Pavilion's water, 31 Oct): a little eight-sided pool of white marble, a carved lotus in its
    middle with a jet of water rising from it and falling back."""
    marble = mat('fd_pmarble', '#f7f4ee', rough=0.35, spec=0.5, var=0.02); marble2 = mat('fd_pmarble2', '#ebe6dc', rough=0.4, var=0.02)
    pink = mat('fd_plotus', '#f2c9cf', rough=0.5)
    objs.append(cyl('hbasin', 0.31, 0.1, (x, y, 0.05), (0, 0, math.pi / 8), m=marble2, verts=8, bevel=0.01))
    objs.append(cyl('hrim', 0.33, 0.03, (x, y, 0.1), (0, 0, math.pi / 8), m=marble, verts=8, r2=0.32, bevel=0.004))
    objs.append(cyl('hwater', 0.28, 0.01, (x, y, 0.104), (0, 0, math.pi / 8), m=m['water'], verts=8, bevel=0.0))
    for k in range(8):                                     # the lotus
        a = k / 8 * math.tau
        objs.append(sphere('hpetal', 0.04, (x + math.cos(a) * 0.04, y + math.sin(a) * 0.04, 0.125), (1.3, 0.55, 0.7), (0, math.radians(30), a), m=pink, seg=8, rings=5))
    objs.append(cyl('hjet', 0.008, 0.14, (x, y, 0.19), m=m['water'], verts=6, r2=0.004, bevel=0.0))
    for k in range(6):                                     # falling back
        a = k / 6 * math.tau
        pts = [Vector((x + math.cos(a) * (0.01 + 0.07 * t), y + math.sin(a) * (0.01 + 0.07 * t), 0.26 - 0.15 * t * t)) for t in (0.0, 0.4, 0.75, 1.0)]
        for p, q in zip(pts, pts[1:]):
            objs.append(cyl('hspill', 0.005, (q - p).length, (p + q) / 2, (q - p).to_track_quat('Z', 'Y').to_euler(), m['water'], verts=4, bevel=0.0))


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
    # galvanised feeder: tray, tube and cone hat (the Deluxe's: Audrey, 27 Oct: "the seed dispenser should look different
    # for the deluxe please": an eight-sided cream hopper with windows of grain, a green copper roof like the barn's and a
    # gold ball on top, over a copper tray; the tray and its grain where the browser's grain sits)
    fx, fy = PEN['feeder']
    if PEN.get('feeder_style') == 'stonehouse':             # (the Deluxe stone cottage's: a tiny stone house with a slate roof)
        st = mat('fd_stone', '#a59b88', rough=0.85, var=0.06); slate = mat('fd_slate', '#57657a', rough=0.65, var=0.08); trimw = mat('fd_trim', '#9ec9c2', rough=0.55)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), m=st, verts=20, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(box('fbody', (0.17, 0.15, 0.24), (fx, fy, 0.18), m=st, bevel=0.008, segs=1))
        objs.append(box('fwin', (0.08, 0.004, 0.08), (fx, fy - 0.076, 0.22), m=m['grain_'], bevel=0.0))
        objs.append(box('fwinf', (0.095, 0.006, 0.095), (fx, fy - 0.074, 0.22), m=trimw, bevel=0.0))
        for sx in (-1, 1):
            a, b = Vector((fx, fy, 0.39)), Vector((fx + sx * 0.12, fy, 0.29))
            objs.append(plank('froof', (a + b) / 2 + Vector((0, -0.11, 0)), (a + b) / 2 + Vector((0, 0.11, 0)), (b - a).length + 0.02, 0.02, Vector((sx * 0.1, 0, 0.12)).normalized(), slate, jitter=0.0, bevel=0.004))
        for yy in (fy - 0.075, fy + 0.075):
            me = bpy.data.meshes.new('fgable'); bm = bmesh.new()
            vs = [bm.verts.new(v) for v in ((fx - 0.085, yy, 0.3), (fx + 0.085, yy, 0.3), (fx, yy, 0.38))]; bm.faces.new(vs); bm.normal_update(); bm.to_mesh(me); bm.free()
            o = link(bpy.data.objects.new('fgable', me)); setmat(o, st); objs.append(o)
        objs.append(box('fchim', (0.035, 0.035, 0.08), (fx + 0.05, fy + 0.03, 0.4), m=st, bevel=0.004, segs=1))
    elif PEN.get('feeder_style') == 'cabin':                  # (the Deluxe lodge's: a tiny log cabin with a green shingle roof)
        log = mat('fd_log', '#8d5b34', rough=0.8, var=0.08); endg = mat('fd_endg', '#cfa268', rough=0.8); green = mat('fd_green', '#4b7a48', rough=0.7, var=0.06)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), m=log, verts=20, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        for k in range(5):                                  # its walls: little logs crossing at the corners
            z = 0.075 + k * 0.048
            for sy in (-1, 1): objs.append(cyl('flog', 0.022, 0.22, (fx, fy + sy * 0.07, z), (0, math.radians(90), 0), m=log, verts=8, bevel=0.0))
            for sx in (-1, 1): objs.append(cyl('flog', 0.022, 0.19, (fx + sx * 0.085, fy, z + 0.024), (math.radians(90), 0, 0), m=log, verts=8, bevel=0.0))
            for sx in (-1, 1): objs.append(cyl('fend', 0.019, 0.006, (fx + sx * 0.112, fy - 0.07, z), (0, math.radians(90), 0), m=endg, verts=8, bevel=0.0))
        objs.append(box('fwin', (0.07, 0.006, 0.07), (fx, fy - 0.093, 0.2), m=m['grain_'], bevel=0.0))
        objs.append(box('fwinf', (0.085, 0.004, 0.085), (fx, fy - 0.091, 0.2), m=endg, bevel=0.0))
        for sx in (-1, 1):
            a, b = Vector((fx, fy, 0.42)), Vector((fx + sx * 0.15, fy, 0.3))
            objs.append(plank('froof', (a + b) / 2 + Vector((0, -0.13, 0)), (a + b) / 2 + Vector((0, 0.13, 0)), (b - a).length + 0.02, 0.02, Vector((sx * 0.12, 0, 0.15)).normalized(), green, jitter=0.0, bevel=0.004))
        for yy in (fy - 0.07, fy + 0.07):
            me = bpy.data.meshes.new('fgable'); bm = bmesh.new()
            vs = [bm.verts.new(v) for v in ((fx - 0.1, yy, 0.31), (fx + 0.1, yy, 0.31), (fx, yy, 0.4))]; bm.faces.new(vs); bm.normal_update(); bm.to_mesh(me); bm.free()
            o = link(bpy.data.objects.new('fgable', me)); setmat(o, log); so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.02; objs.append(o)
    elif PEN.get('feeder_style') == 'pagoda':                 # (the Deluxe Pagoda's: dark lacquered wood, a little curved roof, a bronze knob)
        ink = mat('fd_ink', '#2e2622', rough=0.45, coat=0.3, var=0.04); bronze = mat('fd_bronze', '#9c7a3c', rough=0.35, metal=0.8)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), (0, 0, math.pi / 6), m=ink, verts=6, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('fbody', 0.08, 0.27, (fx, fy, 0.215), (0, 0, math.pi / 6), m=ink, verts=6, bevel=0.006))
        for z in (0.12, 0.31): objs.append(cyl('fband', 0.086, 0.018, (fx, fy, z), (0, 0, math.pi / 6), m=bronze, verts=6, bevel=0.0))
        me = bpy.data.meshes.new('froof'); bm = bmesh.new(); rings = []
        for j in range(6):                                  # its roof: four sides sweeping out to upturned corners
            v = j / 5; ring = []
            for i in range(16):
                a = i / 16 * math.tau + math.pi / 4; c_, s_ = math.cos(a), math.sin(a); sq = 1 / max(abs(c_), abs(s_))
                rr = (0.17 * (1 - v) + 0.015 * v) * sq; corner = (abs(abs(c_) - abs(s_)) < 0.2) * (1 - v) ** 2
                ring.append(bm.verts.new((fx + c_ * rr, fy + s_ * rr, 0.37 + 0.12 * v ** 0.6 + 0.04 * corner)))
            rings.append(ring)
        for j in range(5):
            for i in range(16): bm.faces.new((rings[j][i], rings[j][(i + 1) % 16], rings[j + 1][(i + 1) % 16], rings[j + 1][i]))
        bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for f in bm.faces:
            if f.normal.z < 0: f.normal_flip()
        bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('froof', me)); setmat(o, ink); so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.02; so.offset = -1; objs.append(o)
        objs.append(sphere('fball', 0.025, (fx, fy, 0.51), m=bronze, seg=10, rings=6))
    elif PEN.get('feeder_style') == 'cottage':                # (the Deluxe cottage's: a little barrel hopper under a cap of thatch)
        oak = mat('fd_oak', '#7a5536', rough=0.8, var=0.1, grain=0.3, grain_scale=(1.5, 26, 26)); iron = mat('fd_iron', '#2b2824', rough=0.5, metal=0.6)
        thatch = mat('fd_thatch', '#c7a866', rough=0.9, var=0.07)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), m=oak, verts=20, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('fbody', 0.085, 0.27, (fx, fy, 0.215), m=oak, verts=14, r2=0.075, bevel=0.008))
        for z in (0.12, 0.31): objs.append(cyl('fhoop', 0.088 - (z - 0.12) * 0.05, 0.016, (fx, fy, z), m=iron, verts=14, bevel=0.0))
        objs.append(cyl('froof', 0.15, 0.14, (fx, fy, 0.42), m=thatch, verts=14, r2=0.015, bevel=0.012))
        objs.append(cyl('ffringe', 0.155, 0.035, (fx, fy, 0.36), m=thatch, verts=14, r2=0.15, bevel=0.006))
        objs.append(sphere('fball', 0.025, (fx, fy, 0.5), m=thatch, seg=10, rings=6))
    elif PEN.get('feeder_style') == 'mill':                   # (the Deluxe windmill's: a tiny white windmill with a dark cap and four little sails, release 7)
        white = mat('fd_millw', '#f2ede2', rough=0.7, var=0.03); cap = mat('fd_millcap', '#454c57', rough=0.65, var=0.06)
        brick = mat('fd_millbrick', '#b0624a', rough=0.85, var=0.06); sailw = mat('fd_millsail', '#ece0c4', rough=0.9); stock = mat('fd_millstock', '#6b4029', rough=0.7)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), (0, 0, math.pi / 8), m=brick, verts=8, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('fbody', 0.085, 0.27, (fx, fy, 0.2), (0, 0, math.pi / 8), m=white, verts=8, r2=0.062, bevel=0.005))
        objs.append(box('fwin', (0.06, 0.006, 0.07), (fx, fy - 0.075, 0.2), m=m['grain_'], bevel=0.0))
        me = bpy.data.meshes.new('fcap'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('fcap', me)); setmat(o, cap); o.location = (fx, fy, 0.335); o.scale = (0.075, 0.09, 0.08); [setattr(p_, 'use_smooth', True) for p_ in o.data.polygons]; objs.append(o)
        hub = Vector((fx, fy - 0.1, 0.37))
        objs.append(cyl('fhub', 0.014, 0.03, tuple(hub), (math.radians(90), 0, 0), m=stock, verts=8, bevel=0.0))
        for k in range(4):
            a = math.radians(20 + k * 90); d = Vector((math.cos(a), 0, math.sin(a))); q = Vector((-math.sin(a), 0, math.cos(a)))
            objs.append(plank('fstock', hub + d * 0.01, hub + d * 0.15, 0.012, 0.01, (0, -1, 0), stock, jitter=0.0, bevel=0.0))
            c = hub + d * 0.095 + q * 0.025 + Vector((0, 0.004, 0))
            objs.append(plank('fsail', c - d * 0.05, c + d * 0.05, 0.04, 0.004, (0, -1, 0), sailw, jitter=0.0, bevel=0.0))
    elif PEN.get('feeder_style') == 'joglo':                  # (the Deluxe Javanese house's: a tiny teak house under a black-and-gold roof, release 7)
        teak = mat('fd_jteak', '#8a5a33', rough=0.8, var=0.06); black = mat('fd_jblack', '#2b2a2e', rough=0.45, spec=0.55, coat=0.4); gold = mat('fd_jgold', '#c9a24a', rough=0.35, metal=0.7)
        objs.append(cyl('tray', 0.165, 0.05, (fx, fy, 0.03), (0, 0, math.pi / 4), m=mat('fd_jstone', '#6b675f', rough=0.9), verts=4, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(box('fbody', (0.15, 0.13, 0.22), (fx, fy, 0.17), m=teak, bevel=0.006, segs=1))
        objs.append(box('fwin', (0.07, 0.006, 0.08), (fx, fy - 0.066, 0.19), m=m['grain_'], bevel=0.0))
        objs.append(box('fband', (0.16, 0.14, 0.018), (fx, fy, 0.27), m=gold, bevel=0.003, segs=1))
        objs.append(cyl('froof', 0.17, 0.08, (fx, fy, 0.32), (0, 0, math.pi / 4), m=black, verts=4, r2=0.07, bevel=0.004))
        objs.append(cyl('froof2', 0.075, 0.12, (fx, fy, 0.42), (0, 0, math.pi / 4), m=black, verts=4, r2=0.0, bevel=0.0))
        objs.append(sphere('fball', 0.02, (fx, fy, 0.49), m=gold, seg=8, rings=5))
    elif PEN.get('feeder_style') == 'chhatri':                # (the Deluxe Garden Pavilion's: a tiny marble kiosk, jali windows of grain, a white dome and a gold finial)
        marble = mat('fd_pmarble', '#f7f4ee', rough=0.35, spec=0.5, var=0.02); marble2 = mat('fd_pmarble2', '#ebe6dc', rough=0.4, var=0.02)
        gold = mat('fd_pgold', '#d1a640', rough=0.3, metal=0.75)
        objs.append(cyl('tray', 0.17, 0.05, (fx, fy, 0.03), (0, 0, math.pi / 8), m=marble2, verts=8, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('fbody', 0.08, 0.2, (fx, fy, 0.16), (0, 0, math.pi / 8), m=marble, verts=8, bevel=0.004))
        for k in range(4):                                  # windows of grain on four faces, behind little posts
            a = k * math.pi / 2; c, s_ = math.cos(a), math.sin(a)
            objs.append(plank('fwin', (fx + c * 0.075, fy + s_ * 0.075, 0.1), (fx + c * 0.075, fy + s_ * 0.075, 0.22), 0.05, 0.01, (c, s_, 0), m['grain_'], jitter=0.0, bevel=0.0))
            for sd in (-1, 1): objs.append(cyl('fpost', 0.007, 0.13, (fx + c * 0.084 - s_ * sd * 0.03, fy + s_ * 0.084 + c * sd * 0.03, 0.16), m=marble2, verts=5, bevel=0.0))
        objs.append(cyl('fband', 0.095, 0.03, (fx, fy, 0.275), (0, 0, math.pi / 8), m=marble2, verts=8, bevel=0.004))
        T_ = (0, .1, .25, .42, .58, .72, .84, .93, 1.0); Rk = (.9, 1.05, 1.12, 1.05, .85, .6, .35, .15, .01)
        prof = [(max(0.075 * r, 0.003), 0.29 + 0.15 * t) for t, r in zip(T_, Rk)]
        for (ra, za), (rb, zb) in zip(prof, prof[1:]):
            objs.append(cyl('fdome', ra, zb - za, (fx, fy, (za + zb) / 2), m=marble, verts=14, r2=rb, bevel=0.0))
        objs.append(sphere('fball', 0.016, (fx, fy, 0.45), m=gold, seg=8, rings=5))
        objs.append(cyl('fspike', 0.006, 0.05, (fx, fy, 0.48), m=gold, verts=5, r2=0.0, bevel=0.0))
    elif PEN.get('feeder_style') == 'deluxe':
        cu = mat('fd_cu', '#5c9a86', rough=0.42, spec=0.45, metal=0.25, var=0.06); cu2 = mat('fd_cu2', '#77b29e', rough=0.42, spec=0.45, metal=0.25, var=0.06)
        cream = mat('fd_cream', '#f1e9d8', rough=0.6, var=0.04, grain=0.12, grain_scale=(1.5, 26, 26)); gold = mat('fd_gold', '#d4a640', rough=0.3, metal=0.9)
        objs.append(cyl('tray', 0.17, 0.05, (fx, fy, 0.03), (0, 0, math.pi / 8), m=cu, verts=8, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('fbase', 0.1, 0.04, (fx, fy, 0.075), (0, 0, math.pi / 8), m=cu2, verts=8, bevel=0.005))
        objs.append(cyl('fbody', 0.088, 0.25, (fx, fy, 0.215), (0, 0, math.pi / 8), m=cream, verts=8, bevel=0.006))
        for k in range(4):                                  # windows on four faces, the grain showing through
            a = k * math.pi / 2; c, s_ = math.cos(a), math.sin(a)
            objs.append(plank('fwin', (fx + c * 0.083, fy + s_ * 0.083, 0.15), (fx + c * 0.083, fy + s_ * 0.083, 0.29), 0.05, 0.01, (c, s_, 0), m['grain_'], jitter=0.0, bevel=0.0))
            for (z0, z1) in ((0.143, 0.143), (0.297, 0.297)):
                objs.append(plank('fwinf', (fx + c * 0.087 - s_ * 0.03, fy + s_ * 0.087 + c * 0.03, z0), (fx + c * 0.087 + s_ * 0.03, fy + s_ * 0.087 - c * 0.03, z1), 0.012, 0.008, (c, s_, 0), cu2, jitter=0.0, bevel=0.0))
        objs.append(cyl('fband', 0.098, 0.025, (fx, fy, 0.34), (0, 0, math.pi / 8), m=cu2, verts=8, bevel=0.004))
        objs.append(cyl('froof', 0.13, 0.13, (fx, fy, 0.415), (0, 0, math.pi / 8), m=cu, verts=8, r2=0.0, bevel=0.0))
        objs.append(sphere('fball', 0.022, (fx, fy, 0.49), m=gold, seg=10, rings=6))
    else:
        objs.append(cyl('tray', 0.16, 0.05, (fx, fy, 0.03), m=m['metal'], verts=28, bevel=0.01))
        objs.append(cyl('grain', 0.14, 0.01, (fx, fy, 0.052), m=m['grain_'], verts=28, bevel=0.0))
        objs.append(cyl('tube', 0.09, 0.32, (fx, fy, 0.2), m=m['metal'], verts=24, bevel=0.01))
        objs.append(cyl('hat', 0.12, 0.08, (fx, fy, 0.4), m=m['metal'], verts=24, r2=0.02, bevel=0.01))
        for z in (0.12, 0.28):
            objs.append(cyl('band', 0.093, 0.015, (fx, fy, z), m=mat('band', '#9aa3a8', rough=0.3, metal=0.9), verts=24, bevel=0.003))
    # water dish (a fountain in the Deluxe pen: Audrey, 27 Oct: "the water pot can become a fountain")
    wx, wy = PEN['dish']
    if PEN.get('fountain'): fountain(objs, wx, wy, m)
    elif PEN.get('water') == 'trough': trough(objs, wx, wy, m)
    elif PEN.get('water') == 'pond': koi_pond(objs, wx, wy, m)
    elif PEN.get('water') == 'sink': stone_sink(objs, wx, wy, m)
    elif PEN.get('water') == 'butt': water_butt(objs, wx, wy, m)
    elif PEN.get('water') == 'flume': log_flume(objs, wx, wy, m)
    elif PEN.get('water') == 'canal': canal(objs, wx, wy, m)
    elif PEN.get('water') == 'padasan': padasan(objs, wx, wy, m)
    elif PEN.get('water') == 'hauz': hauz(objs, wx, wy, m)
    else:
      bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.028, major_segments=36, minor_segments=12, location=(wx, wy, 0.045))
      rim = bpy.context.object; setmat(rim, m['bowl']); [setattr(p, 'use_smooth', True) for p in rim.data.polygons]; objs.append(rim)
      objs.append(cyl('dishbase', 0.16, 0.03, (wx, wy, 0.02), m=m['bowl'], verts=32, bevel=0.008))
      objs.append(cyl('water', 0.135, 0.008, (wx, wy, 0.05), m=m['water'], verts=32, bevel=0.0))
    # hay bale with twine, a little loose hay (none in the smallest pens: release 4's looks)
    for hx, hy, hrd in ([(PEN['hay'][0], PEN['hay'][1], PEN['hay_rot'])] if PEN.get('hay') else []) + list(PEN.get('bales', [])):
        hr = math.radians(hrd)
        hb = box('bale', (0.55, 0.32, 0.3), (hx, hy, 0.15), (0, 0, hr), m=m['hay'], bevel=0.04, segs=4, jitter=0.006); objs.append(hb)
        for k in (-0.14, 0.14):
            objs.append(box('twine', (0.025, 0.335, 0.305), (hx + k * math.cos(hr), hy + k * math.sin(hr), 0.15), (0, 0, hr), m=m['twine'], bevel=0.005))
    for sx, sy, sr, sn in PEN['straw']:
        straw_bits(objs, (sx, sy, 0), sr, sn, 0.016)
    peb = mat('ypebble', '#b9b1a3', rough=0.8, var=0.2)
    for i in range(PEN.get('pebbles', 28)):
        x, y = random.uniform(x0 + 0.15, x1 - 0.15), random.uniform(y0 + 0.15, y1 - 0.15)
        r = random.uniform(0.012, 0.028)
        objs.append(sphere('ypeb', r, (x, y, 0.015 + r * 0.1), (1.2, 1.0, 0.5), (0, 0, random.uniform(0, 6)), peb, ico=2, disp=0.25, seed=i + 40))
    # feed sack slumped by the house
    if PEN.get('sack'):
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
