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
from coop import plank, straw_bits, pop_trim, POP_W, POP_H

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
    pop_trim(objs, z0, trim, D2)                  # a real opening: nest_window cuts it and lines the passage behind
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
    plinth = box('plinth', (2 * W2 + 0.08, 2 * D2 + 0.08, FL), (0, 0, FL / 2), m=brick, bevel=0.02, segs=2); objs.append(plinth)
    WX, NF = 0.415, 0.08                           # the nest window, low in the plinth (the thatch hides anything higher)
    for row in range(2):                           # brick courses on the plinth's front and side
        z = 0.05 + row * 0.09
        for i in range(9):
            x = -W2 + 0.07 + i * 0.14 + (0.07 if row else 0)
            if x > W2 - 0.02: continue
            if abs(x - WX) < WIN_W / 2 + 0.08 and z + 0.04 > NF + 0.04: continue
            objs.append(box('brick', (0.125, 0.02, 0.075), (x, -D2 - 0.045, z), m=brick, bevel=0.008, segs=1, jitter=0.002))
    walls = box('walls', (2 * W2, 2 * D2, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=cream, bevel=0.015, segs=2); objs.append(walls)
    for sx in (-1, 1): objs.append(prism_gable(sx * W2, EAVE - 0.01, PEAK - 0.08, D2, 0.03, cream))
    # timber frame on the front and the +x side
    for x in (-W2 + 0.02, 0.225, W2 - 0.02):
        objs.append(plank('post', (x, -D2 - 0.015, FL + 0.01), (x, -D2 - 0.015, EAVE - 0.01), 0.05, 0.03, (0, -1, 0), oak, jitter=0.4))
    for z in (FL + 0.03, EAVE - 0.03):
        spans = [(-W2, W2)] if z > 0.5 else [(-W2, -0.31 - POP_W / 2 - 0.045), (-0.31 + POP_W / 2 + 0.045, WX - WIN_W / 2 - 0.02), (WX + WIN_W / 2 + 0.02, W2)]
        for a, b in spans:
            objs.append(plank('rail', (a, -D2 - 0.016, z), (b, -D2 - 0.016, z), 0.05, 0.03, (0, -1, 0), oak, jitter=0.3))
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
    arched_door(objs, 0.045, -D2 - 0.005, FL, 0.24, 0.56, green, oak, brass)
    flw = [C('fbox', '#6d4a31', rough=0.85), C('fl_red', '#e2453c', rough=0.6), C('fl_pink', '#f08bb0', rough=0.6), C('fl_yel', '#f4c430', rough=0.6)]
    nest_window(objs, 'orp', FL, WX, oak, solids=[walls, plinth], nest_floor=NF, door='drop', door_m=oak)
    window(objs, W2 + 0.02, 0.0, 0.58, 0.22, 0.18, oak, glass, normal=(1, 0, 0), box_flowers=flw)
    LX = W2 + 0.06                                  # the lavender pot by the front corner, clear of the nest window and its door
    block('orp', LX, -D2 - 0.17, 0.13)
    objs.append(cyl('pot', 0.065, 0.14, (LX, -D2 - 0.17, 0.07), m=C('terra', '#b0603a', rough=0.8), verts=14, r2=0.08, bevel=0.006))
    for k in range(9):
        a = k * 0.7
        objs.append(cyl('lav', 0.012, 0.16, (LX + 0.035 * math.cos(a), -D2 - 0.17 + 0.035 * math.sin(a), 0.22), m=C('lavender', '#7f5fb0', rough=0.7), verts=5, bevel=0.0))
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
    core = box('core', (2 * W2 - 0.02, 2 * D2 - 0.02, EAVE), (0, 0, EAVE / 2), m=mortar, bevel=0.0); objs.append(core)
    for sx in (-1, 1): objs.append(prism_gable(sx * (W2 - 0.01), EAVE - 0.01, PEAK - 0.06, D2 - 0.01, 0.03, mortar))
    holes = {'front': [(-0.31 - POP_W / 2 - 0.04, -0.31 + POP_W / 2 + 0.04, 0.0, FL + POP_H + 0.05), (-0.11, 0.22, 0.0, 0.66), (0.44 - WIN_W / 2 - 0.02, 0.44 + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)], 'right': [(-0.13, 0.13, 0.42, 0.68), (-0.11, 0.11, 0.96, 1.17)], 'left': [], 'back': []}
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
    arched_door(objs, 0.055, -D2 - 0.01, 0.0, 0.26, 0.62, blue, trim, C('brass', '#c99a3c', rough=0.3, metal=0.9))
    objs.append(box('lintel', (0.38, 0.06, 0.07), (0.055, -D2 - 0.03, 0.7), m=lint, bevel=0.01, segs=1))
    nest_window(objs, 'leg', FL, 0.44, trim, solids=[core], door='drop', door_m=blue)
    objs.append(cyl('roundwin', 0.075, 0.02, (W2 + 0.03, 0, EAVE + 0.2), (0, math.radians(90), 0), m=glass, verts=20, bevel=0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.016, major_segments=24, minor_segments=8, location=(W2 + 0.04, 0, EAVE + 0.2), rotation=(0, math.radians(90), 0))
    t_ = bpy.context.object; setmat(t_, trim); [setattr(p, 'use_smooth', True) for p in t_.data.polygons]; objs.append(t_)
    window(objs, W2 + 0.04, 0.0, 0.55, 0.2, 0.2, trim, glass, normal=(1, 0, 0))
    # ivy up the front corner, a basket of blue eggs by the door
    ivy = [C('ivy1', '#3f6e30', rough=0.8), C('ivy2', '#55893d', rough=0.8)]
    for k in range(26):
        z = random.uniform(0.05, 0.95); x = -W2 + random.uniform(-0.02, 0.2) * (1.2 - z)
        objs.append(sphere('ivy', random.uniform(0.03, 0.05), (x, -D2 - 0.04, z), (1, 0.55, 1), m=random.choice(ivy), ico=1, disp=0.25, seed=k))
    BX, BY = W2 + 0.16, -D2 + 0.12                  # the basket of blue eggs by the side wall, clear of the nest door
    objs.append(cyl('basket', 0.1, 0.1, (BX, BY, 0.05), m=C('wicker', '#a57a43', rough=0.9, var=0.05), verts=16, r2=0.12, bevel=0.01))
    for k in range(5):
        objs.append(sphere('blueegg', 0.028, (BX + 0.045 * math.cos(k * 1.3), BY + 0.045 * math.sin(k * 1.3), 0.115), (1, 1, 1.3), m=C('blueegg', '#9fcfc6', rough=0.45), seg=10, rings=7))
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
    plinth = box('plinth', (2 * W2 + 0.22, 2 * D2 + 0.22, FL), (0, 0, FL / 2), m=stone_, bevel=0.02, segs=2); objs.append(plinth)
    for i in range(10):                            # paving stones on top of the plinth's front edge (not across the nest window)
        if abs(-W2 - 0.04 + i * 0.145 - 0.42) < WIN_W / 2 + 0.07: continue
        objs.append(box('pave', (0.13, 0.1, 0.02), (-W2 - 0.04 + i * 0.145, -D2 - 0.06, FL + 0.005), m=stone_, bevel=0.008, segs=1, jitter=0.003))
    walls = box('walls', (2 * W2, 2 * D2, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=white, bevel=0.012, segs=2); objs.append(walls)
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(cyl('pillar', 0.045, EAVE - FL + 0.04, (sx * (W2 + 0.01), sy * (D2 + 0.01), (EAVE + FL) / 2), m=red, verts=12, bevel=0.004))
    objs.append(box('beam', (2 * W2 + 0.12, 0.06, 0.06), (0, -D2 - 0.02, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    objs.append(box('beamb', (2 * W2 + 0.12, 0.06, 0.06), (0, D2 + 0.02, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    for sx in (-1, 1): objs.append(box('beams', (0.06, 2 * D2 + 0.12, 0.06), (sx * (W2 + 0.02), 0, EAVE - 0.02), m=red, bevel=0.008, segs=1))
    # moon door and lattice windows
    objs.append(cyl('moon', 0.16, 0.02, (0.085, -D2 - 0.005, FL + 0.23), (math.radians(90), 0, 0), m=dark, verts=28, bevel=0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.02, major_segments=32, minor_segments=8, location=(0.085, -D2 - 0.02, FL + 0.23), rotation=(math.radians(90), 0, 0))
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
    nest_window(objs, 'sil', FL, 0.42, red, ww=0.26, wh=0.3, solids=[walls, plinth], steps=2, nest_floor=0.06, door='lattice', door_m=red)
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
    block('sil', W2 + 0.2, -D2 - 0.2, 0.11); light_at('house_sil', W2 + 0.2, -D2 - 0.2, EAVE - 0.12)
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
    gaps = [(-0.31 - POP_W / 2 - 0.03, -0.31 + POP_W / 2 + 0.03, 0.24, 0.26 + POP_H + 0.05), (-0.09, 0.25, 0.0, 0.64), (0.44 - WIN_W / 2 - 0.03, 0.44 + WIN_W / 2 + 0.03, 0.2, 0.24 + WIN_H + 0.06)]   # pop door, door, nest window
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
    core = box('core', (2 * W2 - 0.06, 2 * D2 - 0.06, EAVE), (0, 0, EAVE / 2), m=C('lodgeinside', '#3a2a1e', rough=1.0), bevel=0.0); objs.append(core)
    for sx in (-1, 1):                            # plank gables
        n = 8
        for i in range(n):
            y = -D2 + (i + 0.5) * 2 * D2 / n
            top = EAVE + (PEAK - EAVE) * (1 - abs(y) / D2) - 0.03
            objs.append(plank('gable', (sx * W2, y, EAVE - 0.02), (sx * W2, y, top), 2 * D2 / n * 0.96, 0.03, (sx, 0, 0), barge, jitter=0.5))
    shingle_roof(objs, EAVE, PEAK, roof_m, barge, ridge, over=0.2, gable_over=0.2)
    # double plank door with Z braces, windows, a lantern post
    for dx in (0.0, 0.16):
        for k in range(2):
            u = dx - 0.04 + k * 0.08
            objs.append(plank('ldoor', (u, -D2 - 0.04, 0.02), (u, -D2 - 0.04, 0.62), 0.078, 0.03, (0, -1, 0), door_m, jitter=0.3))
        objs.append(plank('zb', (dx - 0.07, -D2 - 0.06, 0.12), (dx + 0.07, -D2 - 0.06, 0.52), 0.04, 0.02, (0, -1, 0), door_m, jitter=0.3))
        for zz in (0.12, 0.52):
            objs.append(plank('zh', (dx - 0.075, -D2 - 0.06, zz), (dx + 0.075, -D2 - 0.06, zz), 0.04, 0.02, (0, -1, 0), door_m, jitter=0.3))
    objs.append(plank('dlintel', (-0.1, -D2 - 0.05, 0.66), (0.26, -D2 - 0.05, 0.66), 0.06, 0.04, (0, -1, 0), barge, jitter=0.2))
    nest_window(objs, 'bra', 0.26, 0.44, trim, solids=[core], nest_floor=0.2, door='drop', door_m=door_m)
    window(objs, W2 + 0.03, 0.0, 0.5, 0.24, 0.2, trim, glass, normal=(1, 0, 0))
    block('bra', -0.62, -D2 - 0.28, 0.1)
    objs.append(cyl('lpost', 0.022, 0.95, (-0.62, -D2 - 0.28, 0.475), m=barge, verts=8, bevel=0.0))          # lantern post left of the ramp
    objs.append(box('larm', (0.14, 0.025, 0.025), (-0.56, -D2 - 0.28, 0.92), m=iron, bevel=0.004, segs=1))
    light_at('house_bra', -0.5, -D2 - 0.28, 0.85)
    objs.append(box('lantern', (0.07, 0.07, 0.09), (-0.5, -D2 - 0.28, 0.85), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.006, segs=1))
    objs.append(box('lcap', (0.09, 0.09, 0.02), (-0.5, -D2 - 0.28, 0.905), m=iron, bevel=0.004, segs=1))
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
        light_at('fence_dx', x, y0 - 0.05, 0.66)
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


def red_barn():
    """The Red Barn (coop.build) with its nests inside, behind a window right of the barn door."""
    wx, FL = 0.445, 0.40
    r = coop.build((0, 0, 0), 0.0, seed=5, pen=False, window=(wx - WIN_W / 2, wx + WIN_W / 2, FL + 0.05, FL + 0.05 + WIN_H))
    objs = []; nest_window(objs, 'rir', FL, wx, coop.M()['white'], hollow=True, ramp_len=0.67, door='drop', door_m=coop.M()['red'])
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = r; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return r


HOUSES = {'rir': red_barn, 'orp': thatched, 'leg': stone, 'sil': pagoda, 'bra': lodge}


def pop_slider(style):
    """The pop door's sliding door, shut: it fills the opening (POP_W x POP_H) and the browser slides it up out of sight by
    day (cut off at the opening's top, as if it ran up inside the wall). Boards with a Z brace in the house's colours (the
    pagoda: a red lattice over paper, like its nest screen), an iron ring to pull it by. At the origin: x across, bottom at
    z=0, the boards' front face at y=0, facing -y."""
    random.seed(31); objs = []; cm = coop.M()
    m, trim = {'rir': (cm['red'], cm['white']), 'orp': (C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G), C('oakdark', '#47301f', rough=0.8)),
               'leg': (C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G), C('trimw', '#efe9dc', rough=0.6)),
               'bra': (C('lodgedoor', '#6d4326', rough=0.75, var=0.08, grain=0.3, grain_scale=G), C('lodgetrim', '#e8dcc0', rough=0.7)),
               'sil': (C('lacquer', '#b0312a', rough=0.4, coat=0.3), None)}[style]
    iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    w, h, th = POP_W - 0.008, POP_H - 0.004, 0.022
    out = Vector((0, -1, 0))
    if style == 'sil':
        objs.append(box('pdpaper', (w - 0.03, 0.012, h - 0.03), (0, 0.008, h / 2), m=C('paper', '#f3e3bd', rough=0.8), bevel=0.0))
        for k in (1, 2):
            objs.append(plank('pdlat', (-w / 2 + w * k / 3, -0.002, 0.012), (-w / 2 + w * k / 3, -0.002, h - 0.012), 0.012, 0.012, out, m, jitter=0.1, bevel=0.0))
        for k in (1, 2, 3):
            objs.append(plank('pdlat', (-w / 2 + 0.012, -0.002, h * k / 4), (w / 2 - 0.012, -0.002, h * k / 4), 0.012, 0.012, out, m, jitter=0.1, bevel=0.0))
        for (a, b) in (((-w / 2, h - 0.012), (w / 2, h - 0.012)), ((-w / 2, 0.012), (w / 2, 0.012))):
            objs.append(plank('pdframe', (a[0], -0.004, a[1]), (b[0], -0.004, b[1]), 0.026, 0.022, out, m, jitter=0.1, bevel=0.004))
        for x in (-w / 2 + 0.013, w / 2 - 0.013):
            objs.append(plank('pdframe', (x, -0.004, 0.0), (x, -0.004, h), 0.026, 0.022, out, m, jitter=0.1, bevel=0.004))
    else:
        n = 3
        for k in range(n):                                    # boards running up the door
            x = -w / 2 + (k + 0.5) * w / n
            objs.append(plank('pdboard', (x, th / 2, 0.0), (x, th / 2, h), w / n * 0.95, th, out, m, jitter=0.6, bevel=0.004))
        for f in (0.16, 0.84):                                # two ledges across, a brace between them: the Z
            objs.append(plank('pdledge', (-w / 2 + 0.02, -0.009, h * f), (w / 2 - 0.02, -0.009, h * f), 0.04, 0.018, out, trim, jitter=0.3, bevel=0.004))
        objs.append(plank('pdbrace', (-w / 2 + 0.03, -0.008, h * 0.16), (w / 2 - 0.03, -0.008, h * 0.84), 0.034, 0.016, out, trim, jitter=0.3, bevel=0.004))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.022, minor_radius=0.0045, major_segments=12, minor_segments=5, location=(0, -0.03, h * 0.16 + 0.045), rotation=(math.radians(90), 0, 0))
    t_ = bpy.context.object; setmat(t_, iron); objs.append(t_)
    objs.append(box('pdplate', (0.03, 0.01, 0.022), (0, -0.022, h * 0.16 + 0.07), m=iron, bevel=0.002))
    return finish(objs, 'popdoor_' + style)

# ------------------------------------------------------------------ the nests: inside each house, seen through a little window
# A little open window low on the front wall, and behind it the nest: a straw-filled cubby inside the house, lined in dark
# wood. The cubby runs further left behind the wall, where the hen comes in from inside the house (she goes up the ramp and
# in at the pop door). Solid houses get the window and the cubby cut out of their walls (boolean cutters, hidden, not
# exported). NESTS records each house's nest for the browser (glTF axes: (x, y, z) = Blender (x, z, -y)).
NESTS = {}
SEAT = 0.19                               # she sits this far in from the front: all of her inside, her face at the window
WIN_W, WIN_H = 0.30, 0.40                 # the window's opening (kept under the roof's overhang, which hides what's above;
                                          # wide enough for a big hen to jump through)
BLOCKS = {}                               # per house: [x, z, r] circles in the yard the birds keep out of (glTF axes)
LIGHTS = {}                               # per model: where its lanterns are, [x, y, z] (glTF axes): they light up at night


def light_at(model, x, y, z):
    LIGHTS.setdefault(model, []).append([round(x, 3), round(z, 3), round(-y, 3)])


def block(house, x, y, r):
    """Something in front of a house the birds mustn't walk through (Blender x, y; radius r)."""
    BLOCKS.setdefault('house_' + house, []).append([round(x, 3), round(-y, 3), r])


def cutter(name, size, loc):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc
    o.hide_render = True; o.hide_set(True); o.display_type = 'WIRE'
    return o


def nest_window(objs, house, FL, wx, frame_m, solids=(), hollow=False, ramp_len=None, steps=None, lining_c='#3b2b20', nest_floor=None,
                door=None, door_m=None, ww=None, wh=None):
    """FL: the house's floor (the pop door); nest_floor: the nest's, lower where the roof's overhang would hide the window.
    door: the little nest door, open: 'drop' (hinged at the sill and let down: hanging against the wall below a high window,
    resting on the ground like a little ramp below a low one) or 'lattice' (a lattice screen slid up). Anything above the
    window would be hidden by the roof's overhang."""
    NF = FL if nest_floor is None else nest_floor
    WIN_W = ww or globals()['WIN_W']                                         # this house's window width
    WIN_H = wh or globals()['WIN_H']                                         # and height
    z0 = NF + 0.04; z1 = z0 + WIN_H; zc = max(z1 + 0.03, FL + 0.48)              # sill, top of the window, cubby ceiling
    cx0, cx1, cy0, cy1 = wx - 0.33, min(wx + 0.17, W2 - 0.02), -D2 + 0.035, -D2 + 0.44   # the cubby (left part behind the wall)
    px0, px1 = -0.31 - POP_W / 2, -0.31 + POP_W / 2                         # the pop door, and the passage from it to the nest
    hy1, hz1 = -D2 + 0.6, FL + POP_H + 0.03                                 # deep enough for her to turn round in
    for o in solids:                     # cut the window, the cubby, the pop door and the passage out of solid walls
        for c in (cutter('cut_win', (WIN_W, 0.24, WIN_H), (wx, -D2, (z0 + z1) / 2)),
                  cutter('cut_cubby', (cx1 - cx0, cy1 - cy0, zc - NF + 0.002), ((cx0 + cx1) / 2, (cy0 + cy1) / 2, (NF + zc) / 2)),
                  cutter('cut_pop', (POP_W, 0.24, POP_H), (-0.31, -D2, FL + POP_H / 2 + 0.001)),
                  cutter('cut_hall', (cx0 + 0.01 - px0, hy1 - cy0, hz1 - FL + 0.002), ((px0 + cx0 + 0.01) / 2, (cy0 + hy1) / 2, (FL + hz1) / 2))):
            md = o.modifiers.new('cut', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = c; md.solver = 'EXACT'
            o.modifiers.move(len(o.modifiers) - 1, 0)                        # cut first, then soften
    lining = C('nest_lining', lining_c, rough=0.95, var=0.06, grain=0.25, grain_scale=G)
    floor_m = C('nest_floor', '#7a5636', rough=0.9, var=0.08, grain=0.3, grain_scale=G)
    hall_m = C('hall_dark', '#1d1510', rough=1.0)                          # the passage inside: in shadow
    T = 0.02
    objs.append(box('nb_floor', (cx1 - cx0, cy1 - cy0, T), ((cx0 + cx1) / 2, (cy0 + cy1) / 2, NF + T / 2), m=floor_m, bevel=0.0))
    objs.append(box('nb_back', (cx1 - cx0, T, zc - NF), ((cx0 + cx1) / 2, cy1 - T / 2, (NF + zc) / 2), m=lining, bevel=0.0))
    objs.append(box('nb_ceil', (cx1 - cx0, cy1 - cy0, T), ((cx0 + cx1) / 2, (cy0 + cy1) / 2, zc - T / 2), m=lining, bevel=0.0))
    objs.append(box('nb_side', (T, cy1 - cy0, zc - NF), (cx1 - T / 2, (cy0 + cy1) / 2, (NF + zc) / 2), m=lining, bevel=0.0))
    # the cubby's left side has a dark doorway where the hen comes in along the passage from the pop door
    dy0, dy1, dz1 = -D2 + 0.09, -D2 + 0.4, FL + POP_H
    for (ya, yb, za, zb) in ((cy0, dy0, NF, zc), (dy1, cy1, NF, zc), (dy0, dy1, NF, FL), (dy0, dy1, dz1, zc)):
        if yb - ya > 0.005 and zb - za > 0.005:
            objs.append(box('nb_side', (T, yb - ya, zb - za), (cx0 + T / 2, (ya + yb) / 2, (za + zb) / 2), m=lining, bevel=0.0))
    if hollow:                                                             # a board front either side of the window, inside
        objs.append(box('nb_front', (wx - WIN_W / 2 - cx0, T, zc - NF), ((cx0 + wx - WIN_W / 2) / 2, cy0 + T / 2, (NF + zc) / 2), m=lining, bevel=0.0))
    # the passage: dark floor, back, ceiling and end, seen through the pop door
    hx0, hx1 = px0 - 0.01, cx0
    objs.append(box('hall', (hx1 - hx0, hy1 - cy0, T), ((hx0 + hx1) / 2, (cy0 + hy1) / 2, FL + T / 2), m=hall_m, bevel=0.0))
    objs.append(box('hall', (hx1 - hx0, T, hz1 - FL), ((hx0 + hx1) / 2, hy1 - T / 2, (FL + hz1) / 2), m=hall_m, bevel=0.0))
    objs.append(box('hall', (hx1 - hx0, hy1 - cy0, T), ((hx0 + hx1) / 2, (cy0 + hy1) / 2, hz1 - T / 2), m=hall_m, bevel=0.0))
    objs.append(box('hall', (T, hy1 - cy0, hz1 - FL), (hx0 + T / 2, (cy0 + hy1) / 2, (FL + hz1) / 2), m=hall_m, bevel=0.0))
    # the nest: a deep bed of straw over the whole floor, a soft rim of straw round the hollow where she sits, loose straws
    # everywhere, some poking up, some hanging over the sill, a few fallen on the ground below
    straw = coop.M()['straw']; sy_ = -D2 + 0.16                              # the hollow's centre, where she sits
    objs.append(sphere('nb_bed', 1.0, ((cx0 + cx1) / 2, (cy0 + cy1) / 2, NF + T), ((cx1 - cx0) / 2 * 0.98, (cy1 - cy0) / 2 * 0.98, 0.04), m=straw, ico=3, disp=0.3, seed=21))
    for k in range(13):
        a = k / 13 * math.tau + 0.2
        rx, ry = 0.16, 0.13
        x, y = wx + math.cos(a) * rx, sy_ + math.sin(a) * ry
        if y < -D2 + 0.02: y = -D2 + 0.02                                    # the front of the rim sits on the sill, lower
        front = y < sy_ - 0.06
        objs.append(sphere('nb_rim', 0.055, (x, y, NF + T + (0.03 if front else 0.045)), (1.25, 0.9, 0.55 if front else 0.75), (0, 0, a + 1.57), m=straw, ico=2, disp=0.35, seed=30 + k))
    straw_bits(objs, ((cx0 + cx1) / 2, (cy0 + cy1) / 2, 0), 0.2, 50, NF + 0.045)
    straw_bits(objs, (wx, sy_, 0), 0.17, 40, NF + 0.07)
    straw_bits(objs, (wx, -D2 - 0.035, 0), 0.11, 16, z0 - 0.002)
    for k in range(9):                                                     # straws hanging over the front of the sill
        x = wx + random.uniform(-WIN_W / 2 + 0.02, WIN_W / 2 - 0.02); L = random.uniform(0.05, 0.1)
        p = Vector((x, -D2 - 0.06, z0 - 0.004)); d = Vector((random.uniform(-0.3, 0.3), -0.35, -1.0)).normalized()
        objs.append(cyl('straw', 0.0025, L, p + d * L / 2, d.to_track_quat('Z', 'Y').to_euler(), straw, verts=5, bevel=0))
    straw_bits(objs, (wx, -D2 - 0.12, 0), 0.1, 12, 0.0)
    # the window: a frame round the opening and a sill
    t = 0.035
    for (u0, v0, u1, v1) in [(-WIN_W / 2 - t / 2, z1, WIN_W / 2 + t / 2, z1), (-WIN_W / 2, z0, -WIN_W / 2, z1), (WIN_W / 2, z0, WIN_W / 2, z1)]:
        objs.append(plank('nwframe', (wx + u0, -D2 - 0.022, v0), (wx + u1, -D2 - 0.022, v1), t, 0.026, (0, -1, 0), frame_m, jitter=0.2, bevel=0.004))
    objs.append(box('nwsill', (WIN_W + 0.09, 0.08, 0.03), (wx, -D2 - 0.02, z0 - 0.012), m=frame_m, bevel=0.006, segs=1))
    nest_door(objs, door, wx, z0, z1, door_m or frame_m, frame_m, WIN_W, WIN_H)
    if door == 'drop' and z0 - 0.074 < WIN_H + 0.04:                       # a let-down door lying on the ground: walk round it
        for dx in (-0.08, 0.08): block(house, wx + dx, -D2 - 0.28, 0.2)
    # for the browser (glTF axes): floor, window, the nest seat, the way in, the ramp
    L = ramp_len if ramp_len else (0.3 if steps else max(0.3, FL * 1.7))
    foot = D2 + 0.05 + (L if not steps else 0.1 + 0.15 * steps)
    NESTS['house_' + house] = dict(floor=round(NF, 3), house=round(FL, 3), win=[round(wx, 3), round(z0, 3), round(z1, 3), WIN_W], seat=[round(wx, 3), round(D2 - SEAT, 3)],
                                   inside=[round(cx0 + 0.12, 3), round(D2 - 0.2, 3)], pop=[-0.31, round(D2 + 0.03, 3)], foot=[-0.31, round(foot, 3)],
                                   bed=round(NF + T + 0.04, 3), door=door)


def nest_door(objs, kind, wx, z0, z1, m, trim, WIN_W, WIN_H):
    """The nest window's little door, open. Planks run across it; it is a little bigger than the opening."""
    if not kind: return
    w, h, th = WIN_W + (0.03 if kind == 'lattice' else 0.05), WIN_H + 0.04, 0.025
    iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    def panel(origin, along_w, along_h, out, lattice=False):
        """Planks (or a lattice) over a w x h panel from `origin`, spanning along_w and along_h (unit vectors), facing `out`."""
        if lattice:
            ctr = origin + along_w * (w / 2) + along_h * (h / 2)
            objs.append(box('ndpaper', (w - 0.03, 0.012, h - 0.03), ctr - out * 0.002, m=C('paper', '#f3e3bd', rough=0.8), bevel=0.0))
            for k in (1, 2):
                for (p, q, ww) in ((origin + along_w * (w * k / 3), origin + along_w * (w * k / 3) + along_h * h, 0.012), (origin + along_h * (h * k / 3), origin + along_h * (h * k / 3) + along_w * w, 0.012)):
                    objs.append(plank('ndlat', p + out * 0.008, q + out * 0.008, ww, 0.012, out, m, jitter=0.1, bevel=0.0))
            for (p, q) in ((origin, origin + along_w * w), (origin + along_h * h, origin + along_h * h + along_w * w), (origin, origin + along_h * h), (origin + along_w * w, origin + along_w * w + along_h * h)):
                objs.append(plank('ndframe', p + out * 0.006, q + out * 0.006, 0.03, 0.022, out, m, jitter=0.1, bevel=0.004))
            return
        n = 3
        for k in range(n):                                    # boards running up the panel
            c0 = origin + along_w * ((k + 0.5) * w / n)
            objs.append(plank('ndboard', c0, c0 + along_h * h, w / n * 0.95, th, out, m, jitter=0.6, bevel=0.004))
        for f in (0.18, 0.82):                                # two ledges across, a brace between them
            objs.append(plank('ndledge', origin + along_h * (h * f) + along_w * 0.02 + out * th, origin + along_h * (h * f) + along_w * (w - 0.02) + out * th, 0.035, 0.018, out, trim, jitter=0.3, bevel=0.004))
        objs.append(plank('ndbrace', origin + along_h * (h * 0.18) + along_w * 0.03 + out * th, origin + along_h * (h * 0.82) + along_w * (w - 0.03) + out * th, 0.03, 0.016, out, trim, jitter=0.3, bevel=0.004))
    x0 = wx - w / 2; yf = -D2 - 0.045
    if kind == 'drop':          # hinged at the sill and let down: it hangs against the wall, or rests on the ground as a ramp
        hz = z0 - 0.03 - 0.014
        s_ = min(0.995, hz / h); c_ = math.sqrt(1 - s_ * s_)
        d = Vector((0, -max(c_, 0.12), -s_)).normalized()                  # down the door, from the hinge
        out = Vector((0, -abs(d.z), abs(d.y))).normalized()               # its inner face, now facing up and out
        top = Vector((x0, yf - 0.02, z0 - 0.03))
        panel(top, Vector((1, 0, 0)), d, out)
        for x in (wx - w / 3, wx + w / 3):
            objs.append(cyl('ndhinge', 0.012, 0.05, (x, yf - 0.02, z0 - 0.03), (0, math.radians(90), 0), iron, verts=8, bevel=0.0))
    else:                       # a lattice screen slid up just above the opening
        base = Vector((x0, yf - 0.012, z1 - 0.01))
        panel(base, Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0)), lattice=True)


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


# ---- a new breed's coop as it first comes: rustic (Audrey's brief, 24 Oct 2026: coops start very rustic and are improved
# with game money). The same house, weathered: paint faded and peeling, a few boards replaced with bare ones, a board or
# two nailed over the cracks, the slates faded with some moss, a sheet of corrugated tin patching the roof, the trims gone
# grey. The pen's fence the same way: grey posts and rails, a little crooked.
RUSTIC = dict(red='#a45a49', redd='#8a4a3c', bare='#a8957b', white='#bdb6a5', slate='#646b6e', moss='#6b7452', ridge='#6d5a4a',
              wood='#93836f', darkwood='#5f5144', capwood='#7d6e5e', glass='#4a565c', tin='#c3c6c3', tin2='#a7acaa', rust='#a5683f')


def _rmat(key, rough=0.85, **kw):
    G = (1.5, 26, 26)
    return mat('r_' + key, RUSTIC[key], rough=rough, var=kw.pop('var', 0.1), grain=kw.pop('grain', 0.3), grain_scale=G, **kw)


def _weather(root, seed):
    """Swap each part's material for its weathered one (by the material's name)."""
    random.seed(seed)
    M_ = {k: _rmat(k) for k in ('red', 'redd', 'bare', 'white', 'wood', 'darkwood', 'capwood')}
    M_['slate'] = _rmat('slate', rough=0.8, grain=0.0, bump=0.15, bump_scale=50, var=0.14)
    M_['moss'] = _rmat('moss', rough=0.95, grain=0.0, bump=0.4, bump_scale=80, var=0.1)
    M_['ridge'] = _rmat('ridge', rough=0.8, grain=0.0)
    M_['glass'] = mat('r_glass', RUSTIC['glass'], rough=0.35, spec=0.4)
    objs = [o for o in root.children_recursive if o.type == 'MESH']
    for o in objs:
        for i, m in enumerate(o.data.materials):
            if m is None: continue
            n = m.name.split('.')[0]
            if n == 'barn_red':
                u = random.random(); o.data.materials[i] = M_['bare'] if u < 0.16 else M_['redd'] if u < 0.3 else M_['red']
            elif n == 'trim': o.data.materials[i] = M_['white']
            elif n == 'slate': o.data.materials[i] = M_['moss'] if random.random() < 0.05 else M_['slate']
            elif n in ('ridge', 'glass', 'wood', 'darkwood', 'capwood'): o.data.materials[i] = M_[n]
    return M_


def rustic_barn(seed=11):
    """The Red Barn as it first comes, rustic."""
    r = red_barn()
    M_ = _weather(r, seed)
    W2, D2, FL, EAVE, PEAK = 0.62, 0.44, 0.40, 1.02, 1.46
    objs = []
    bare = M_['bare']
    # boards nailed over the cracks: on the front left of the pop door, and along both gable ends
    objs.append(coop.plank('patch', (-0.605, -D2 - 0.04, 0.56), (-0.47, -D2 - 0.04, 0.71), 0.075, 0.02, (0, -1, 0), bare, jitter=0.6))
    for sx in (-1, 1):
        x = sx * (W2 + 0.04)
        objs.append(coop.plank('patch', (x, -0.3, 0.63), (x, 0.12, 0.66), 0.08, 0.02, (sx, 0, 0), bare, jitter=0.6))
        objs.append(coop.plank('patch', (x, 0.05, 0.83), (x, 0.3, 0.8), 0.07, 0.02, (sx, 0, 0), bare, jitter=0.6))
    # a sheet of corrugated tin over part of the front slope, with a few rust spots
    sy = -1
    e0 = Vector((0, sy * (D2 + 0.16), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02)); down = e0 - r0; dn = down.normalized()
    nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + 0.16)).normalized()
    tin = mat('r_tin', RUSTIC['tin'], rough=0.7, var=0.04); tin2 = mat('r_tin2', RUSTIC['tin2'], rough=0.7, var=0.04)     # (light and shade of the corrugations)
    rust = mat('r_rust', RUSTIC['rust'], rough=0.9)
    xa, xb, ta, tb = 0.08, 0.5, 0.3, 0.78
    n = 14
    for k in range(n):
        x = xa + (k + 0.5) * (xb - xa) / n
        a = r0 + down * ta + nrm * 0.056 + Vector((x, 0, 0)); b = r0 + down * tb + nrm * 0.056 + Vector((x, 0, 0))
        objs.append(coop.plank('tin', a, b, (xb - xa) / n * 1.01, 0.008, nrm, tin if k % 2 else tin2, jitter=0.0, bevel=0.0))
    for (x, t, s) in ((0.17, 0.62, 0.05), (0.38, 0.4, 0.035), (0.44, 0.7, 0.04)):
        c = r0 + down * t + nrm * 0.07 + Vector((x, 0, 0))
        objs.append(coop.plank('rust', c - dn * s / 2, c + dn * s / 2, s * 1.2, 0.004, nrm, rust, jitter=0.0, bevel=0.001))
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = r; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return r


def rustic_fence(seed=12):
    """The pen's fence as it first comes: grey weathered posts and rails, a little crooked."""
    root = wood_fence()
    M_ = _weather(root, seed)
    random.seed(seed)
    for o in root.children_recursive:
        if o.type != 'MESH': continue
        n = o.name.split('.')[0]
        if n == 'post': o.rotation_euler.x += math.radians(random.uniform(-3.5, 3.5)); o.rotation_euler.y += math.radians(random.uniform(-3.5, 3.5))
        elif n == 'rail': o.rotation_euler.rotate_axis('Z', math.radians(random.uniform(-1.2, 1.2)))
    return root
