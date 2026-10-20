"""The game's five coop styles in the cosy-farm look, plus the pen and its Deluxe dress, for the browser.
Every house has the Red Barn's footprint (1.24 x 0.88 m, front facing -y) with its little pop door and ramp at the same spot,
so the birds' yard is the same in every pen:
  Red Barn (Rhode Island Red)      coop.build(pen=False)
  Thatched Cottage (Buff Orpington) thatched()
  Stone Cottage (Cream Legbar)      stone()
  Pagoda Coop (Silkie)              pagoda()
  Timber Lodge (Light Brahma)       lodge()
The pen is split so every style shares it: pen_base() (the dirt yard, feeder, water, hay, sack, straw), wood_fence() (posts,
rails, the open gate) and deluxe_fence() (white pickets, a rose arch with lanterns, flower borders, bunting).
weathervane() is the Deluxe vane the browser sets on each roof's highest point.
Run directly for a close-up of all five: python coops.py [samples]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import coop
from coop import plank, straw_bits

W2, D2 = 0.62, 0.44
G = (1.5, 26, 26)
_m = {}


def C(name, hexc, rough=0.75, **kw):
    """A cached flat-ish material (the browser draws flat colours; var gives each piece its own shade)."""
    if name not in _m: _m[name] = mat(name, hexc, rough=rough, **kw)
    return _m[name]


def reset_mats():
    _m.clear(); coop._M.clear()


def prism_gable(x, z0, z1, half, thick, m, name='gable'):
    """A triangular gable end at x (ridge along x): base 2*half wide at z0, apex at z1."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = []
    for dx in (-thick / 2, thick / 2):
        vs.append([bm.verts.new((x + dx, -half, z0)), bm.verts.new((x + dx, half, z0)), bm.verts.new((x + dx, 0, z1))])
    bm.faces.new(vs[0]); bm.faces.new(vs[1][::-1])
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((vs[0][i], vs[1][i], vs[1][j], vs[0][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


def pop_door(objs, z0, trim, ramp_m, slat_m, length=None, steps=None):
    """The hens' little door at x=-0.31 on the front, and a ramp (or steps) down to the yard."""
    objs.append(box('hole', (0.2, 0.02, 0.24), (-0.31, -D2 + 0.005, z0 + 0.13), m=C('dark', '#2a1d16', rough=1.0), bevel=0.0))
    for (p, q) in [((-0.43, -D2 - 0.03, z0 + 0.26), (-0.19, -D2 - 0.03, z0 + 0.26)), ((-0.43, -D2 - 0.03, z0 + 0.01), (-0.43, -D2 - 0.03, z0 + 0.27)),
                   ((-0.19, -D2 - 0.03, z0 + 0.01), (-0.19, -D2 - 0.03, z0 + 0.27))]:
        objs.append(plank('ptrim', p, q, 0.045, 0.02, (0, -1, 0), trim, jitter=0.3))
    if steps:
        for i in range(steps):
            h = z0 * (steps - i) / steps
            objs.append(box('step', (0.34, 0.16, h), (-0.31, -D2 - 0.1 - i * 0.15, h / 2), m=steps_m(), bevel=0.012, segs=1, jitter=0.004))
        return
    L = length or max(0.3, z0 * 1.7)
    ra, rb = Vector((-0.31, -D2 - 0.05, z0 + 0.02)), Vector((-0.31, -D2 - 0.05 - L, 0.03))
    nrm0 = Vector((1, 0, 0)).cross((rb - ra).normalized())
    objs.append(plank('ramp', ra, rb, 0.2, 0.03, nrm0 if nrm0.z > 0 else -nrm0, ramp_m, jitter=0.3))
    nrm = Vector((1, 0, 0)).cross((rb - ra).normalized())
    if nrm.z < 0: nrm = -nrm
    for k in range(max(3, int(L / 0.14))):
        c = ra.lerp(rb, (k + 0.6) / (max(3, int(L / 0.14)) + 0.6)) + nrm * 0.022
        objs.append(plank('slat', c + Vector((-0.09, 0, 0)), c + Vector((0.09, 0, 0)), 0.022, 0.018, nrm, slat_m, jitter=1.5))


def steps_m(): return C('stepstone', '#a8a194', rough=0.85, var=0.12)


def shingle_roof(objs, eave, peak, m_roof, m_barge, m_ridge, over=0.16, gable_over=0.15, rows_gap=0.075, ridge_r=0.045, barge=True):
    """Two roof slopes of overlapping shingles (ridge along x), with bargeboards and a ridge cap (the Red Barn's roof)."""
    for sy in (-1, 1):
        e0 = Vector((0, sy * (D2 + over), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02))
        down = (e0 - r0); slope = down.length; dn = down.normalized()
        nrm = Vector((0, sy * (peak - eave + 0.08), D2 + over)).normalized()
        rows = int(slope / rows_gap)
        for r in range(rows + 1):
            t = 1 - r / rows
            base = r0 + down * t + nrm * (0.03 + 0.004 * (r % 2))
            n = 12; w = (2 * W2 + 2 * gable_over) / n; off = (w / 2) if r % 2 else 0
            for i in range(n + (1 if r % 2 else 0)):
                x = -W2 - gable_over + off + i * w - (w / 2 if r % 2 else 0) + w / 2
                if abs(x) > W2 + gable_over + 0.01: continue
                a = base + Vector((x, 0, 0)) - dn * 0.06; b = base + Vector((x, 0, 0)) + dn * 0.06
                objs.append(plank('sh', a, b, w * 0.94, 0.018, nrm, m_roof, jitter=1.4, bevel=0.006))
        if barge:
            for sx in (-1, 1):
                objs.append(plank('barge', r0 + Vector((sx * (W2 + gable_over + 0.02), 0, 0.05)), e0 + Vector((sx * (W2 + gable_over + 0.02), 0, 0)), 0.09, 0.03, (sx, 0, 0), m_barge, jitter=0.2))
    objs.append(cyl('ridgecap', ridge_r, 2 * W2 + 2 * gable_over + 0.06, (0, 0, peak + 0.06), (0, math.radians(90), 0), m_ridge, verts=14, bevel=0.0))


def window(objs, x, y, z, w, h, frame, glass, normal=(0, -1, 0), cross=True, box_flowers=None):
    """A little window on a wall facing `normal` (front: -y, side: +x)."""
    nx, ny = normal[0], normal[1]
    def at(u, v, d=0.0):                         # u along the wall, v up, d out of the wall
        if ny: return (x + u, y + ny * d, z + v)
        return (x + nx * d, y + u, z + v)
    size = (w, 0.02, h) if ny else (0.02, w, h)
    objs.append(box('glass', size, at(0, 0, 0.0), m=glass, bevel=0.0))
    t = 0.035
    for (u0, v0, u1, v1) in [(-w / 2 - t / 2, -h / 2, w / 2 + t / 2, -h / 2), (-w / 2 - t / 2, h / 2, w / 2 + t / 2, h / 2), (-w / 2, -h / 2, -w / 2, h / 2), (w / 2, -h / 2, w / 2, h / 2)]:
        objs.append(plank('wframe', at(u0, v0, 0.02), at(u1, v1, 0.02), t, 0.022, normal, frame, jitter=0.2, bevel=0.004))
    if cross:
        objs.append(plank('wbar', at(0, -h / 2, 0.022), at(0, h / 2, 0.022), 0.018, 0.015, normal, frame, jitter=0.1, bevel=0.003))
        objs.append(plank('wbar', at(-w / 2, 0, 0.022), at(w / 2, 0, 0.022), 0.018, 0.015, normal, frame, jitter=0.1, bevel=0.003))
    if box_flowers:
        bw = w + 0.06
        bsz = (bw, 0.09, 0.07) if ny else (0.09, bw, 0.07)
        objs.append(box('flowerbox', bsz, at(0, -h / 2 - 0.05, 0.05), m=box_flowers[0], bevel=0.008, segs=1))
        for k in range(7):
            u = -bw / 2 + 0.03 + k * (bw - 0.06) / 6
            objs.append(sphere('leafp', 0.03, at(u, -h / 2 + 0.0, 0.05), (1, 1, 0.8), m=C('fleaf', '#4f8a3a', rough=0.8), ico=1, disp=0.2, seed=k))
            objs.append(sphere('flower', 0.022, at(u + 0.01, -h / 2 + 0.025, 0.07), m=box_flowers[1 + k % (len(box_flowers) - 1)], ico=1))


def arched_door(objs, x, y, z0, w, h, door_m, frame_m, knob_m, normal=(0, -1, 0)):
    """A round-topped plank door on the front wall."""
    n = 4
    for i in range(n):
        u = -w / 2 + (i + 0.5) * w / n
        top = z0 + h - w / 2 + math.sqrt(max(0.0, (w / 2) ** 2 - u ** 2)) - 0.01
        objs.append(plank('door', (x + u, y - 0.01, z0 + 0.005), (x + u, y - 0.01, top), w / n * 0.95, 0.03, normal, door_m, jitter=0.3))
    for (p, q) in [((x - w / 2 - 0.02, y - 0.03, z0), (x - w / 2 - 0.02, y - 0.03, z0 + h - w / 2)), ((x + w / 2 + 0.02, y - 0.03, z0), (x + w / 2 + 0.02, y - 0.03, z0 + h - w / 2))]:
        objs.append(plank('dframe', p, q, 0.04, 0.025, normal, frame_m, jitter=0.2))
    for k in range(9):                            # the arch of the frame
        a0, a1 = math.pi * k / 9, math.pi * (k + 1) / 9
        r = w / 2 + 0.02
        objs.append(plank('darch', (x + math.cos(a0) * r, y - 0.03, z0 + h - w / 2 + math.sin(a0) * r), (x + math.cos(a1) * r, y - 0.03, z0 + h - w / 2 + math.sin(a1) * r), 0.04, 0.025, normal, frame_m, jitter=0.1, bevel=0.004))
    objs.append(sphere('knob', 0.016, (x + w / 2 - 0.05, y - 0.05, z0 + h * 0.45), m=knob_m, seg=10, rings=6))


def finish(objs, name):
    root = empty(name)
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return root


# ------------------------------------------------------------------ Thatched Cottage (Buff Orpington)
def thatched(seed=5):
    random.seed(seed); objs = []
    brick = C('brick', '#9b5239', rough=0.85, var=0.1); cream = C('limewash', '#f1e8d2', rough=0.8, var=0.02)
    oak = C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G)
    thatch = C('thatch', '#c7a866', rough=0.9, var=0.07, hue_var=0.01); thatch_d = C('thatch_d', '#a3864a', rough=0.9)
    green = C('greendoor', '#2f6a46', rough=0.6, var=0.06, grain=0.2, grain_scale=G); brass = C('brass', '#c99a3c', rough=0.3, metal=0.9)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    FL, EAVE, PEAK = 0.2, 0.9, 1.5
    objs.append(box('plinth', (2 * W2 + 0.08, 2 * D2 + 0.08, FL), (0, 0, FL / 2), m=brick, bevel=0.02, segs=2))
    for row in range(2):                           # brick courses on the plinth's front and side
        z = 0.05 + row * 0.09
        for i in range(9):
            x = -W2 + 0.07 + i * 0.14 + (0.07 if row else 0)
            if x > W2 - 0.02: continue
            objs.append(box('brick', (0.125, 0.02, 0.075), (x, -D2 - 0.045, z), m=brick, bevel=0.008, segs=1, jitter=0.002))
    objs.append(box('walls', (2 * W2, 2 * D2, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=cream, bevel=0.015, segs=2))
    for sx in (-1, 1): objs.append(prism_gable(sx * W2, EAVE - 0.01, PEAK - 0.08, D2, 0.03, cream))
    # timber frame on the front and the +x side
    for x in (-W2 + 0.02, -0.08, 0.36, W2 - 0.02):
        objs.append(plank('post', (x, -D2 - 0.015, FL + 0.01), (x, -D2 - 0.015, EAVE - 0.01), 0.05, 0.03, (0, -1, 0), oak, jitter=0.4))
    for z in (FL + 0.03, EAVE - 0.03):
        objs.append(plank('rail', (-W2, -D2 - 0.016, z), (W2, -D2 - 0.016, z), 0.05, 0.03, (0, -1, 0), oak, jitter=0.3))
    objs.append(plank('brace', (-W2 + 0.03, -D2 - 0.017, FL + 0.05), (-0.48, -D2 - 0.017, EAVE - 0.05), 0.045, 0.028, (0, -1, 0), oak, jitter=0.3))
    for sx in (-1, 1):
        for y in (-D2 + 0.02, 0.0, D2 - 0.02):
            objs.append(plank('spost', (sx * (W2 + 0.015), y, FL + 0.01), (sx * (W2 + 0.015), y, EAVE - 0.01), 0.05, 0.03, (sx, 0, 0), oak, jitter=0.4))
        for z in (FL + 0.03, EAVE - 0.03):
            objs.append(plank('srail', (sx * (W2 + 0.016), -D2, z), (sx * (W2 + 0.016), D2, z), 0.05, 0.03, (sx, 0, 0), oak, jitter=0.3))
        objs.append(plank('sbrace', (sx * (W2 + 0.017), 0.02, FL + 0.05), (sx * (W2 + 0.017), D2 - 0.04, EAVE - 0.05), 0.045, 0.028, (sx, 0, 0), oak, jitter=0.3))
    # thick soft thatch in two layers, a ridge roll with a scalloped band
    for sy in (-1, 1):
        for layer, (t0, t1, th, col) in enumerate(((0.0, 1.0, 0.15, thatch), (0.0, 0.55, 0.08, thatch))):
            e = Vector((0, sy * (D2 + 0.22), EAVE - 0.1)); r = Vector((0, 0, PEAK))
            a = r.lerp(e, t0); b = r.lerp(e, t1)
            nrm = Vector((0, sy * (PEAK - EAVE + 0.1), D2 + 0.22)).normalized()
            c = (a + b) / 2 + nrm * (th / 2 + (0.13 if layer else 0.0))
            L = (b - a).length
            o = box('thatch', (2 * W2 + 0.42 - layer * 0.04, L + 0.04, th), (0, 0, 0), m=col, bevel=0.06 if not layer else 0.035, segs=3)
            ang = math.atan2(PEAK - EAVE + 0.1, D2 + 0.22)
            o.rotation_euler = (-sy * ang, 0, 0); o.location = c
            objs.append(o)
    objs.append(cyl('ridgeroll', 0.1, 2 * W2 + 0.46, (0, 0, PEAK + 0.12), (0, math.radians(90), 0), thatch, verts=16, bevel=0.03))
    for sy in (-1, 1):                              # the scalloped band either side of the ridge
        for i in range(10):
            x = -W2 - 0.12 + i * (2 * W2 + 0.24) / 9
            objs.append(sphere('scallop', 0.07, (x, sy * 0.1, PEAK + 0.05), (1, 0.45, 0.8), (sy * 0.6, 0, 0), m=thatch_d, seg=12, rings=8))
    # brick chimney at the back, round-topped green door, windows with flower boxes, lavender by the door
    objs.append(box('chimney', (0.2, 0.2, 0.7), (-0.42, 0.2, PEAK - 0.1), m=brick, bevel=0.012, segs=1))
    objs.append(box('chimcap', (0.25, 0.25, 0.05), (-0.42, 0.2, PEAK + 0.26), m=C('brickdark', '#7e3f2b', rough=0.85), bevel=0.01, segs=1))
    objs.append(cyl('chimpot', 0.045, 0.1, (-0.42, 0.2, PEAK + 0.33), m=C('terra', '#b0603a', rough=0.8), verts=10, bevel=0.0))
    arched_door(objs, 0.15, -D2 - 0.005, FL, 0.28, 0.56, green, oak, brass)
    flw = [C('fbox', '#6d4a31', rough=0.85), C('fl_red', '#e2453c', rough=0.6), C('fl_pink', '#f08bb0', rough=0.6), C('fl_yel', '#f4c430', rough=0.6)]
    window(objs, 0.5, -D2 - 0.02, 0.6, 0.16, 0.16, oak, glass, box_flowers=flw)
    window(objs, W2 + 0.02, 0.0, 0.58, 0.22, 0.18, oak, glass, normal=(1, 0, 0), box_flowers=flw)
    objs.append(cyl('pot', 0.065, 0.14, (0.42, -D2 - 0.17, 0.07), m=C('terra', '#b0603a', rough=0.8), verts=14, r2=0.08, bevel=0.006))
    for k in range(9):
        a = k * 0.7
        objs.append(cyl('lav', 0.012, 0.16, (0.42 + 0.035 * math.cos(a), -D2 - 0.17 + 0.035 * math.sin(a), 0.22), m=C('lavender', '#7f5fb0', rough=0.7), verts=5, bevel=0.0))
    pop_door(objs, FL, oak, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), oak)
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 18, 0.0)
    return finish(objs, 'house_orp')


# ------------------------------------------------------------------ Stone Cottage (Cream Legbar)
def stone(seed=6):
    random.seed(seed); objs = []
    mortar = C('mortar', '#6f685e', rough=0.95)
    stones = [C('st%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))]
    slate = C('slate2', '#57657a', rough=0.65, var=0.12, hue_var=0.01); ridge = C('ridge2', '#46525f', rough=0.6)
    barge = C('barge2', '#3e4652', rough=0.7)
    blue = C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G); trim = C('trimw', '#efe9dc', rough=0.6)
    lint = C('lintel', '#d2c8b2', rough=0.85); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    EAVE, PEAK, FL = 0.86, 1.4, 0.18
    objs.append(box('core', (2 * W2 - 0.02, 2 * D2 - 0.02, EAVE), (0, 0, EAVE / 2), m=mortar, bevel=0.0))
    for sx in (-1, 1): objs.append(prism_gable(sx * (W2 - 0.01), EAVE - 0.01, PEAK - 0.06, D2 - 0.01, 0.03, mortar))
    holes = {'front': [(-0.44, -0.18, 0.0, FL + 0.3), (-0.02, 0.32, 0.0, 0.66)], 'right': [(-0.13, 0.13, 0.42, 0.68), (-0.11, 0.11, 0.96, 1.17)], 'left': [], 'back': []}
    def wall(side, length, place, top=lambda u: EAVE):
        z = 0.0; row = 0
        while z < PEAK:
            h = random.uniform(0.095, 0.125); u = -length / 2 - (0.07 if row % 2 else 0.0)
            while u < length / 2:
                w = random.uniform(0.15, 0.27); u1 = min(length / 2, u + w); um = (u + u1) / 2
                if u1 - u > 0.05 and z + h * 0.5 < top(um) and not any(a < um < b and c < z + h / 2 < d for (a, b, c, d) in holes[side]):
                    o = box('stone', (u1 - u - 0.014, 0.04, h - 0.014), (0, 0, 0), m=random.choice(stones), bevel=0.014, segs=1, jitter=0.003)
                    place(o, um, z + h / 2); objs.append(o)
                u = u1
            z += h; row += 1
    def front(o, u, v): o.location = (u, -D2 - 0.005, v)
    def back(o, u, v): o.location = (u, D2 + 0.005, v)
    def right(o, u, v): o.location = (W2 + 0.005, u, v); o.rotation_euler = (0, 0, math.radians(90))
    def left(o, u, v): o.location = (-W2 - 0.005, u, v); o.rotation_euler = (0, 0, math.radians(90))
    gtop = lambda u: EAVE + (PEAK - 0.08 - EAVE) * (1 - abs(u) / D2)
    wall('front', 2 * W2 + 0.04, front); wall('back', 2 * W2 + 0.04, back)
    wall('right', 2 * D2 + 0.04, right, gtop); wall('left', 2 * D2 + 0.04, left, gtop)
    shingle_roof(objs, EAVE, PEAK, slate, barge, ridge, over=0.13, gable_over=0.1)
    # stone chimney on the -x gable, blue arched door with a stone lintel, round window in the +x gable, side window
    for i in range(int((PEAK + 0.35) / 0.1)):
        objs.append(box('chst', (0.26, 0.24, 0.095), (-W2 - 0.12, 0.05, 0.05 + i * 0.1), m=random.choice(stones), bevel=0.012, segs=1, jitter=0.004))
    objs.append(cyl('chimpot', 0.05, 0.12, (-W2 - 0.12, 0.05, PEAK + 0.4), m=C('terra', '#b0603a', rough=0.8), verts=10, bevel=0.0))
    arched_door(objs, 0.15, -D2 - 0.01, 0.0, 0.3, 0.62, blue, trim, C('brass', '#c99a3c', rough=0.3, metal=0.9))
    objs.append(box('lintel', (0.44, 0.06, 0.07), (0.15, -D2 - 0.03, 0.7), m=lint, bevel=0.01, segs=1))
    objs.append(cyl('roundwin', 0.075, 0.02, (W2 + 0.03, 0, EAVE + 0.2), (0, math.radians(90), 0), m=glass, verts=20, bevel=0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.016, major_segments=24, minor_segments=8, location=(W2 + 0.04, 0, EAVE + 0.2), rotation=(0, math.radians(90), 0))
    t_ = bpy.context.object; setmat(t_, trim); [setattr(p, 'use_smooth', True) for p in t_.data.polygons]; objs.append(t_)
    window(objs, W2 + 0.04, 0.0, 0.55, 0.2, 0.2, trim, glass, normal=(1, 0, 0))
    # ivy up the front corner, a basket of blue eggs by the door
    ivy = [C('ivy1', '#3f6e30', rough=0.8), C('ivy2', '#55893d', rough=0.8)]
    for k in range(26):
        z = random.uniform(0.05, 0.95); x = -W2 + random.uniform(-0.02, 0.2) * (1.2 - z)
        objs.append(sphere('ivy', random.uniform(0.03, 0.05), (x, -D2 - 0.04, z), (1, 0.55, 1), m=random.choice(ivy), ico=1, disp=0.25, seed=k))
    objs.append(cyl('basket', 0.1, 0.1, (0.48, -D2 - 0.2, 0.05), m=C('wicker', '#a57a43', rough=0.9, var=0.05), verts=16, r2=0.12, bevel=0.01))
    for k in range(5):
        objs.append(sphere('blueegg', 0.028, (0.48 + 0.045 * math.cos(k * 1.3), -D2 - 0.2 + 0.045 * math.sin(k * 1.3), 0.115), (1, 1, 1.3), m=C('blueegg', '#9fcfc6', rough=0.45), seg=10, rings=7))
    pop_door(objs, FL, trim, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 18, 0.0)
    return finish(objs, 'house_leg')


# ------------------------------------------------------------------ Pagoda Coop (Silkie)
def curved_roof(objs, X, Y, z0, z1, top, up, m, m_hip, name='proof', thick=0.035):
    """A hipped roof with a gentle concave sweep and upturned corners (eave half-sizes X, Y at z0; top half-sizes at z1)."""
    tx, ty = top
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    N, V_ = 48, 7
    def rectp(t, hx, hy):                         # a point on a rectangle's outline, t in [0, 1)
        per = 4 * (hx + hy); d = t * per
        if d < 2 * hx: return Vector((-hx + d, -hy, 0)), min(d, 2 * hx - d)
        d -= 2 * hx
        if d < 2 * hy: return Vector((hx, -hy + d, 0)), min(d, 2 * hy - d)
        d -= 2 * hy
        if d < 2 * hx: return Vector((hx - d, hy, 0)), min(d, 2 * hx - d)
        d -= 2 * hx; return Vector((-hx, hy - d, 0)), min(d, 2 * hy - d)
    rings = []
    for j in range(V_ + 1):
        v = j / V_; ring = []
        for i in range(N):
            t = i / N
            pe, dc = rectp(t, X, Y); pt, _ = rectp(t, tx, ty)
            p = pe.lerp(pt, v)
            corner = max(0.0, 1 - dc / 0.32) ** 2
            p.z = z0 + (z1 - z0) * (v ** 0.62) + up * corner * (1 - v) ** 2
            ring.append(bm.verts.new(p))
        rings.append(ring)
    for j in range(V_):
        for i in range(N):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % N], rings[j + 1][(i + 1) % N], rings[j + 1][i]))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = thick; so.offset = -1
    objs.append(o)
    for sx in (-1, 1):                            # hip ridges from each corner up to the top
        for sy in (-1, 1):
            pts = []
            for j in range(V_ + 1):
                v = j / V_
                p = Vector((sx * X, sy * Y, 0)).lerp(Vector((sx * tx, sy * ty, 0)), v); p.z = z0 + (z1 - z0) * (v ** 0.62) + up * (1 - v) ** 2 + 0.02
                pts.append(p)
            for a, b in zip(pts, pts[1:]):
                objs.append(cyl('hip', 0.016, (b - a).length + 0.01, (a + b) / 2, (b - a).to_track_quat('Z', 'Y').to_euler(), m_hip, verts=8, bevel=0.0))
            tip = pts[0]
            objs.append(sphere('tip', 0.024, tip + Vector((0, 0, 0.01)), m=m_hip, seg=10, rings=6))


def pagoda(seed=7):
    random.seed(seed); objs = []
    white = C('plaster', '#f3eee2', rough=0.85); red = C('lacquer', '#b0312a', rough=0.4, coat=0.3)
    teal = C('teal', '#2f7d70', rough=0.55, var=0.03); teal_d = C('teal_d', '#1f5d54', rough=0.55)
    stone_ = C('pstone', '#a6a094', rough=0.9, var=0.08); dark = C('dark', '#2a1d16', rough=1.0)
    gold = C('gold', '#d4a640', rough=0.3, metal=0.9); paper = C('paper', '#f3e3bd', rough=0.8)
    FL, EAVE = 0.14, 0.74
    objs.append(box('plinth', (2 * W2 + 0.22, 2 * D2 + 0.22, FL), (0, 0, FL / 2), m=stone_, bevel=0.02, segs=2))
    for i in range(10):                            # paving stones on top of the plinth's front edge
        objs.append(box('pave', (0.13, 0.1, 0.02), (-W2 - 0.04 + i * 0.145, -D2 - 0.06, FL + 0.005), m=stone_, bevel=0.008, segs=1, jitter=0.003))
    objs.append(box('walls', (2 * W2, 2 * D2, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=white, bevel=0.012, segs=2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(cyl('pillar', 0.045, EAVE - FL + 0.04, (sx * (W2 + 0.01), sy * (D2 + 0.01), (EAVE + FL) / 2), m=red, verts=12, bevel=0.004))
    objs.append(cyl('pillar', 0.04, EAVE - FL, (-0.08, -D2 - 0.01, (EAVE + FL) / 2), m=red, verts=12, bevel=0.004))
    objs.append(box('beam', (2 * W2 + 0.12, 0.06, 0.06), (0, -D2 - 0.02, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    objs.append(box('beamb', (2 * W2 + 0.12, 0.06, 0.06), (0, D2 + 0.02, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    for sx in (-1, 1): objs.append(box('beams', (0.06, 2 * D2 + 0.12, 0.06), (sx * (W2 + 0.02), 0, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    # moon door and lattice windows
    objs.append(cyl('moon', 0.17, 0.02, (0.22, -D2 - 0.005, FL + 0.24), (math.radians(90), 0, 0), m=dark, verts=28, bevel=0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.02, major_segments=32, minor_segments=8, location=(0.22, -D2 - 0.02, FL + 0.24), rotation=(math.radians(90), 0, 0))
    t_ = bpy.context.object; setmat(t_, red); [setattr(p, 'use_smooth', True) for p in t_.data.polygons]; objs.append(t_)
    def lattice(x, y, z, w, h, normal):
        nx, ny = normal
        sz = (w, 0.02, h) if ny else (0.02, w, h)
        objs.append(box('paper', sz, (x, y, z), m=paper, bevel=0.0))
        for k in (-1, 0, 1):
            if ny:
                objs.append(box('lat', (0.012, 0.015, h), (x + k * w / 3, y + ny * 0.012, z), m=red, bevel=0.0))
                objs.append(box('lat', (w, 0.015, 0.012), (x, y + ny * 0.012, z + k * h / 3), m=red, bevel=0.0))
            else:
                objs.append(box('lat', (0.015, 0.012, h), (x + nx * 0.012, y + k * w / 3, z), m=red, bevel=0.0))
                objs.append(box('lat', (0.015, w, 0.012), (x + nx * 0.012, y, z + k * h / 3), m=red, bevel=0.0))
        frame = (w + 0.04, 0.025, h + 0.04) if ny else (0.025, w + 0.04, h + 0.04)
        objs.append(box('latf', frame, (x - nx * 0.004, y - ny * 0.004, z), m=red, bevel=0.004, segs=1))
    lattice(0.5, -D2 - 0.012, 0.47, 0.16, 0.18, (0, -1))
    lattice(W2 + 0.012, 0.0, 0.46, 0.26, 0.18, (1, 0))
    lattice(-W2 - 0.012, 0.0, 0.46, 0.26, 0.18, (-1, 0))
    # two sweeping teal roofs, the upper storey, a gold finial, a red paper lantern
    curved_roof(objs, W2 + 0.28, D2 + 0.26, EAVE + 0.02, 1.02, (0.33, 0.24), 0.15, teal, teal_d, 'roof1')
    objs.append(box('upper', (0.5, 0.36, 0.22), (0, 0, 1.11), m=white, bevel=0.01, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(cyl('pillar2', 0.028, 0.24, (sx * 0.26, sy * 0.19, 1.11), m=red, verts=10, bevel=0.003))
    lattice(0.0, -0.18 - 0.012, 1.11, 0.2, 0.12, (0, -1))
    curved_roof(objs, 0.42, 0.33, 1.21, 1.45, (0.05, 0.05), 0.11, teal, teal_d, 'roof2')
    objs.append(cyl('finial', 0.025, 0.14, (0, 0, 1.52), m=gold, verts=10, bevel=0.0))
    objs.append(sphere('finball', 0.04, (0, 0, 1.6), m=gold, seg=14, rings=8))
    objs.append(cyl('cord', 0.004, 0.1, (W2 + 0.2, -D2 - 0.2, EAVE - 0.0), m=dark, verts=5, bevel=0.0))
    objs.append(sphere('lantern', 0.065, (W2 + 0.2, -D2 - 0.2, EAVE - 0.12), (1, 1, 1.25), m=C('lanternred', '#dc4b2e', rough=0.5), seg=14, rings=10))
    for dz in (-0.075, 0.075):
        objs.append(cyl('lcap', 0.03, 0.02, (W2 + 0.2, -D2 - 0.2, EAVE - 0.12 + dz), m=gold, verts=10, bevel=0.0))
    pop_door(objs, FL, red, None, None, steps=2)
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 18, 0.0)
    return finish(objs, 'house_sil')


# ------------------------------------------------------------------ Timber Lodge (Light Brahma)
def lodge(seed=8):
    random.seed(seed); objs = []
    log = C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G); endg = C('endgrain', '#cfa268', rough=0.8, var=0.05)
    roof_m = C('greensh', '#4b7a48', rough=0.7, var=0.12, hue_var=0.01); ridge = C('greenridge', '#355a35', rough=0.7)
    barge = C('lodgebarge', '#6e4428', rough=0.8, grain=0.3, grain_scale=G)
    door_m = C('lodgedoor', '#6d4326', rough=0.75, var=0.08, grain=0.3, grain_scale=G); trim = C('lodgetrim', '#e8dcc0', rough=0.7)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    EAVE, PEAK, r = 0.88, 1.44, 0.055
    gaps = [(-0.44, -0.18, 0.24, 0.56), (0.0, 0.32, 0.0, 0.64), (0.41, 0.6, 0.38, 0.62)]          # pop door, door, window on the front
    z = r; row = 0
    while z < EAVE:
        for y in (-D2, D2):                       # logs along x (front and back); the front is cut round its door and window
            zz = z if row % 2 == 0 else z + r
            spans = [(-W2 - 0.1, W2 + 0.1)]
            if y < 0:
                for (a, b, c, d) in gaps:
                    if c < zz < d:
                        spans = [s for sp in spans for s in ((sp[0], min(sp[1], a)), (max(sp[0], b), sp[1])) if s[1] - s[0] > 0.04]
            for a, b in spans:
                objs.append(cyl('log', r, b - a, ((a + b) / 2, y, zz), (0, math.radians(90), 0), log, verts=10, bevel=0.0))
            for x in (-W2 - 0.1, W2 + 0.1):
                objs.append(cyl('end', r * 0.9, 0.012, (x + (0.008 if x > 0 else -0.008), y, zz), (0, math.radians(90), 0), endg, verts=10, bevel=0.0))
        for x in (-W2, W2):                       # logs along y (the sides), half a log higher
            zz = z + r if row % 2 == 0 else z
            if x > 0 and 0.38 < zz < 0.62:
                for a, b in ((-D2 - 0.1, -0.14), (0.14, D2 + 0.1)):
                    objs.append(cyl('log', r, b - a, (x, (a + b) / 2, zz), (math.radians(90), 0, 0), log, verts=10, bevel=0.0))
            else:
                objs.append(cyl('log', r, 2 * D2 + 0.2, (x, 0, zz), (math.radians(90), 0, 0), log, verts=10, bevel=0.0))
            for y in (-D2 - 0.1, D2 + 0.1):
                objs.append(cyl('end', r * 0.9, 0.012, (x, y + (0.008 if y > 0 else -0.008), zz), (math.radians(90), 0, 0), endg, verts=10, bevel=0.0))
        z += 2 * r; row += 1
    objs.append(box('core', (2 * W2 - 0.06, 2 * D2 - 0.06, EAVE), (0, 0, EAVE / 2), m=C('lodgeinside', '#3a2a1e', rough=1.0), bevel=0.0))
    for sx in (-1, 1):                            # plank gables
        n = 8
        for i in range(n):
            y = -D2 + (i + 0.5) * 2 * D2 / n
            top = EAVE + (PEAK - EAVE) * (1 - abs(y) / D2) - 0.03
            objs.append(plank('gable', (sx * W2, y, EAVE - 0.02), (sx * W2, y, top), 2 * D2 / n * 0.96, 0.03, (sx, 0, 0), barge, jitter=0.5))
    shingle_roof(objs, EAVE, PEAK, roof_m, barge, ridge, over=0.2, gable_over=0.2)
    # double plank door with Z braces, windows, a lantern post
    for dx in (0.08, 0.24):
        for k in range(2):
            u = dx - 0.04 + k * 0.08
            objs.append(plank('ldoor', (u, -D2 - 0.04, 0.02), (u, -D2 - 0.04, 0.62), 0.078, 0.03, (0, -1, 0), door_m, jitter=0.3))
        objs.append(plank('zb', (dx - 0.07, -D2 - 0.06, 0.12), (dx + 0.07, -D2 - 0.06, 0.52), 0.04, 0.02, (0, -1, 0), door_m, jitter=0.3))
        for zz in (0.12, 0.52):
            objs.append(plank('zh', (dx - 0.075, -D2 - 0.06, zz), (dx + 0.075, -D2 - 0.06, zz), 0.04, 0.02, (0, -1, 0), door_m, jitter=0.3))
    objs.append(plank('dlintel', (-0.03, -D2 - 0.05, 0.66), (0.35, -D2 - 0.05, 0.66), 0.06, 0.04, (0, -1, 0), barge, jitter=0.2))
    window(objs, 0.505, -D2 - 0.03, 0.5, 0.16, 0.2, trim, glass)
    window(objs, W2 + 0.03, 0.0, 0.5, 0.24, 0.2, trim, glass, normal=(1, 0, 0))
    objs.append(cyl('lpost', 0.022, 0.95, (0.5, -D2 - 0.28, 0.475), m=barge, verts=8, bevel=0.0))
    objs.append(box('larm', (0.14, 0.025, 0.025), (0.44, -D2 - 0.28, 0.92), m=iron, bevel=0.004, segs=1))
    objs.append(box('lantern', (0.07, 0.07, 0.09), (0.38, -D2 - 0.28, 0.85), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.006, segs=1))
    objs.append(box('lcap', (0.09, 0.09, 0.02), (0.38, -D2 - 0.28, 0.905), m=iron, bevel=0.004, segs=1))
    pop_door(objs, 0.26, trim, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    straw_bits(objs, (-0.31, -D2 - 0.04, 0.27), 0.08, 18, 0.0)
    return finish(objs, 'house_bra')


# ------------------------------------------------------------------ the pen, shared by every style
def pen_base():
    """The dirt yard with its feeder, water dish, hay bale, feed sack, pebbles and straw (coop.build_pen, without the fence)."""
    root = empty('pen_base'); m = coop.M()
    objs = coop.build_pen(root, m)
    for o in list(objs):
        if o.name.split('.')[0] in ('post', 'cap', 'rail', 'gate', 'gatev', 'gated'):
            bpy.data.objects.remove(o, do_unlink=True)
    return root


def wood_fence():
    """The pen's post-and-rail fence and its open gate (coop.build_pen's fence alone)."""
    root = empty('fence'); m = coop.M()
    objs = coop.build_pen(root, m)
    for o in list(objs):
        if o.name.split('.')[0] not in ('post', 'cap', 'rail', 'gate', 'gatev', 'gated'):
            bpy.data.objects.remove(o, do_unlink=True)
    return root


FLOWERS = ['#e2453c', '#f4c430', '#f08bb0', '#fbf6ee', '#9b6bd1', '#ff8c42']


def deluxe_fence(seed=9):
    """White pickets with pointed tops, a rose arch over the open gate with two lanterns, flowers along the outside of the
    front and left fences, and bunting from the corners up to the arch."""
    random.seed(seed); objs = []
    paint = C('picket', '#f6f2ea', rough=0.6, var=0.03)
    leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    rose = [C('rose1', '#e0567a', rough=0.5), C('rose2', '#c8283c', rough=0.5), C('rose3', '#f6b3c4', rough=0.5)]
    x0, x1, y0, y1 = coop.PEN['box']
    hinge, gc = coop.gate_span(); gw = abs(gc - hinge) * 2
    g0, g1 = min(hinge, gc + (gc - hinge)), max(hinge, gc + (gc - hinge))
    def run(a, b, skip=None):
        a, b = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); L = (b - a).length; n = max(1, round(L / 0.11)); d = (b - a).normalized()
        ang = math.atan2(d.y, d.x)
        for i in range(1, n):
            p = a.lerp(b, i / n)
            if skip and skip[0] - 0.03 < p.x < skip[1] + 0.03: continue
            objs.append(box('picket', (0.05, 0.022, 0.42), (p.x, p.y, 0.21), (0, 0, ang), m=paint, bevel=0.006, segs=1))
            objs.append(cyl('ptip', 0.032, 0.06, (p.x, p.y, 0.45), (0, 0, ang + math.pi / 4), m=paint, verts=4, r2=0.0, bevel=0.0))
        segs = [(a, Vector((skip[0], a.y, 0))), (Vector((skip[1], a.y, 0)), b)] if skip else [(a, b)]
        nrm = Vector((-d.y, d.x, 0))
        for z in (0.12, 0.3):
            for p, q in segs:
                objs.append(plank('prail', Vector((p.x, p.y, z)), Vector((q.x, q.y, z)), 0.045, 0.02, nrm, paint, jitter=0.2, bevel=0.004))
    run((x0, y0), (x1, y0), skip=(g0, g1)); run((x1, y0), (x1, y1)); run((x0, y0), (x0, y1)); run((x0, y1), (x1, y1))
    for (x, y) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1), (g0, y0), (g1, y0)):
        objs.append(box('cpost', (0.07, 0.07, 0.52), (x, y, 0.26), m=paint, bevel=0.01, segs=1))
        objs.append(sphere('cball', 0.04, (x, y, 0.55), m=paint, seg=12, rings=8))
    # the gate, open outwards on its hinge post (as the wooden one)
    ang = math.radians(-70); hingev = Vector((hinge, y0, 0)); d = Vector((-math.cos(ang), math.sin(ang), 0)).normalized() * (g1 - g0 - 0.05)
    nrm = Vector((-d.y, d.x, 0)).normalized()
    for k in range(6):
        p = hingev + d * ((k + 0.5) / 6)
        objs.append(box('gpicket', (0.045, 0.02, 0.38), (p.x, p.y, 0.21), (0, 0, math.atan2(d.y, d.x)), m=paint, bevel=0.005, segs=1))
    for z in (0.12, 0.3):
        objs.append(plank('grail', hingev + Vector((0, 0, z)), hingev + d + Vector((0, 0, z)), 0.045, 0.02, nrm, paint, jitter=0.2, bevel=0.004))
    # rose arch over the gateway
    cx, ra = (g0 + g1) / 2, (g1 - g0) / 2
    for x in (g0, g1): objs.append(box('archpost', (0.05, 0.05, 0.86), (x, y0, 0.43), m=paint, bevel=0.008, segs=1))
    for k in range(10):
        a0, a1 = math.pi * k / 10, math.pi * (k + 1) / 10
        objs.append(plank('arch', (cx + math.cos(a0) * ra, y0, 0.86 + math.sin(a0) * ra), (cx + math.cos(a1) * ra, y0, 0.86 + math.sin(a1) * ra), 0.045, 0.045, (0, -1, 0), paint, jitter=0.1, bevel=0.006))
    pts = [(x, y0, 0.12 + k * 0.1) for x in (g0, g1) for k in range(8)] + [(cx + math.cos(a) * ra, y0, 0.86 + math.sin(a) * ra) for a in [k / 9 * math.pi for k in range(10)]]
    for i, p in enumerate(pts):
        objs.append(sphere('rleaf', 0.05, (p[0] + random.uniform(-0.03, 0.03), p[1] + random.uniform(-0.04, 0.04), p[2]), (1, 0.8, 0.9), m=random.choice(leaf), ico=1, disp=0.25, seed=i))
        if random.random() < 0.75:
            objs.append(sphere('rose', 0.026, (p[0] + random.uniform(-0.04, 0.04), p[1] - 0.045, p[2] + random.uniform(-0.03, 0.03)), m=random.choice(rose), ico=1, disp=0.15, seed=i + 50))
    for x in (g0 - 0.08, g1 + 0.08):
        objs.append(box('lanternb', (0.07, 0.07, 0.1), (x, y0 - 0.05, 0.66), m=C('iron', '#26231f', rough=0.5, metal=0.6), bevel=0.006, segs=1))
        objs.append(box('lanterng', (0.076, 0.076, 0.065), (x, y0 - 0.05, 0.66), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.0))
        objs.append(cyl('lroof', 0.06, 0.05, (x, y0 - 0.05, 0.735), (0, 0, math.pi / 4), m=C('iron', '#26231f', rough=0.5, metal=0.6), verts=4, r2=0.0, bevel=0.0))
    # flowers along the outside of the front fence (both sides of the gate) and the left side
    def border(a, b, out):
        a, b = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); n = int((b - a).length / 0.05)
        for i in range(n):
            p = a.lerp(b, random.random()) + out * random.uniform(0.08, 0.2)
            if random.random() < 0.45: objs.append(sphere('bleaf', 0.05, (p.x, p.y, 0.04), (1, 1, 0.6), m=random.choice(leaf), ico=1, disp=0.25, seed=i))
            objs.append(sphere('bflower', 0.026, (p.x, p.y, 0.08 + random.uniform(0, 0.07)), m=C('dxf%d' % (i % 6), FLOWERS[i % 6], rough=0.5), ico=1))
    border((x0 + 0.1, y0), (g0 - 0.15, y0), Vector((0, -1, 0))); border((g1 + 0.15, y0), (x1 - 0.1, y0), Vector((0, -1, 0)))
    border((x0, y0 + 0.15), (x0, y1 - 0.15), Vector((-1, 0, 0)))
    # bunting from each front corner up to the arch
    cols = [C('fl_r', '#d8343a', rough=0.6), C('fl_y', '#f2c14e', rough=0.6), C('fl_b', '#3d6aa8', rough=0.6), C('fl_w', '#fbf6ee', rough=0.6), C('fl_g', '#4f9a4a', rough=0.6)]
    def bunting(a, b, sag=0.08):
        a, b = Vector(a), Vector(b); L = (b - a).length; n = max(4, int(L / 0.14))
        pts = [a.lerp(b, i / n) - Vector((0, 0, sag * 4 * (i / n) * (1 - i / n))) for i in range(n + 1)]
        for p, q in zip(pts, pts[1:]):
            objs.append(cyl('string', 0.005, (q - p).length, (p + q) / 2, (q - p).to_track_quat('Z', 'Y').to_euler(), C('string', '#efe6d2', rough=0.7), verts=5, bevel=0.0))
        dd = (b - a).normalized()
        for i in range(1, n):
            p, q = pts[i] - dd * 0.05, pts[i] + dd * 0.05
            me = bpy.data.meshes.new('flag'); bm = bmesh.new()
            vs = [bm.verts.new(p), bm.verts.new(q), bm.verts.new((p + q) / 2 - Vector((0, 0, 0.12)))]
            bm.faces.new(vs); bm.to_mesh(me); bm.free()
            f = link(bpy.data.objects.new('flag', me)); setmat(f, cols[i % len(cols)]); objs.append(f)
            so = f.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.004
    bunting((x0, y0 - 0.01, 0.56), (g0 - 0.02, y0 - 0.01, 0.88)); bunting((g1 + 0.02, y0 - 0.01, 0.88), (x1, y0 - 0.01, 0.56))
    return finish(objs, 'fence_dx')


def weathervane():
    """A gold cockerel on an arrow over N-S-E-W arms, standing on the origin (the browser sets it on a roof's top)."""
    objs = []; g = C('gold', '#d4a640', rough=0.3, metal=0.9)
    objs.append(cyl('vrod', 0.011, 0.36, (0, 0, 0.18), m=g, verts=8, bevel=0.0))
    for ang in (0, math.pi / 2):
        objs.append(box('varm', (0.26, 0.012, 0.012), (0, 0, 0.2), (0, 0, ang + math.pi / 4), m=g, bevel=0.0))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        objs.append(sphere('vball', 0.018, (math.cos(a) * 0.13, math.sin(a) * 0.13, 0.2), m=g, seg=8, rings=6))
    z = 0.38
    objs.append(sphere('vbody', 0.07, (0, 0, z), (1.3, 0.25, 0.8), m=g, seg=14, rings=8))
    objs.append(sphere('vhead', 0.035, (-0.08, 0, z + 0.06), (1, 0.3, 1), m=g, seg=10, rings=6))
    objs.append(sphere('vcomb', 0.02, (-0.085, 0, z + 0.1), (1.2, 0.25, 0.9), m=g, seg=8, rings=6))
    for k in range(3):
        o = sphere('vtail', 0.05, (0.08 + k * 0.012, 0, z + 0.04 + k * 0.025), (0.35, 0.2, 1.0), m=g, seg=8, rings=6); o.rotation_euler.y = math.radians(-25 + k * 10); objs.append(o)
    objs.append(box('varrow', (0.3, 0.008, 0.02), (0, 0, z - 0.09), m=g, bevel=0.0))
    objs.append(cyl('vpoint', 0.03, 0.06, (-0.17, 0, z - 0.09), (0, math.radians(-90), 0), m=g, verts=4, r2=0.0, bevel=0.0))
    return finish(objs, 'vane')


HOUSES = {'rir': lambda: coop.build((0, 0, 0), 0.0, seed=5, pen=False), 'orp': thatched, 'leg': stone, 'sil': pagoda, 'bra': lodge}


if __name__ == '__main__':          # all five houses in a row: python coops.py [samples]
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 24
    scn = reset()
    import farm_layout
    coop.PEN = dict(farm_layout.NEW['pen'])
    cyl('ground', 6.0, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    only = os.environ.get('ONLY', 'rir,orp,leg,sil,bra').split(',')
    for i, k in enumerate(only):
        r = HOUSES[k](); r.location = (i * 1.9 - (len(only) - 1) * 0.95, 0, 0)
    lighting(scn)
    camera(scn, (3.2, -6.5, 4.0), (0.0, 0, 0.6), lens=40)
    R = int(os.environ.get('RES', 1600)); render(scn, os.environ.get('NAME', 'coops_row'), R, int(R * 0.5), samples)
