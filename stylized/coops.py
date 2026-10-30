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
def thatched(seed=5, eave=0.9, peak=1.5, name='house_orp'):
    """(eave, peak, name: the Deluxe look's taller cottage, release 4)"""
    random.seed(seed); objs = []
    brick = C('brick', '#9b5239', rough=0.85, var=0.1); cream = C('limewash', '#f1e8d2', rough=0.8, var=0.02)
    oak = C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G)
    thatch = C('thatch', '#c7a866', rough=0.9, var=0.07, hue_var=0.01); thatch_d = C('thatch_d', '#a3864a', rough=0.9)
    green = C('greendoor', '#2f6a46', rough=0.6, var=0.06, grain=0.2, grain_scale=G); brass = C('brass', '#c99a3c', rough=0.3, metal=0.9)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    FL, EAVE, PEAK = 0.2, eave, peak
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
    return finish(objs, name)


# ------------------------------------------------------------------ Stone Cottage (Cream Legbar)
def stone(seed=6, eave=0.86, peak=1.4, name='house_leg'):
    """(eave, peak, name: the Deluxe look's taller cottage, release 4)"""
    random.seed(seed); objs = []
    mortar = C('mortar', '#6f685e', rough=0.95)
    stones = [C('st%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))]
    slate = C('slate2', '#57657a', rough=0.65, var=0.12, hue_var=0.01); ridge = C('ridge2', '#46525f', rough=0.6)
    barge = C('barge2', '#3e4652', rough=0.7)
    blue = C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G); trim = C('trimw', '#efe9dc', rough=0.6)
    lint = C('lintel', '#d2c8b2', rough=0.85); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    EAVE, PEAK, FL = eave, peak, 0.18
    core = box('core', (2 * W2 - 0.02, 2 * D2 - 0.02, EAVE), (0, 0, EAVE / 2), m=mortar, bevel=0.0); objs.append(core)
    for sx in (-1, 1): objs.append(prism_gable(sx * (W2 - 0.01), EAVE - 0.01, PEAK - 0.06, D2 - 0.01, 0.03, mortar))
    holes = {'front': [(-0.31 - POP_W / 2 - 0.04, -0.31 + POP_W / 2 + 0.04, 0.0, FL + POP_H + 0.05), (-0.11, 0.22, 0.0, 0.66), (0.44 - WIN_W / 2 - 0.02, 0.44 + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)], 'right': [(-0.13, 0.13, 0.42, 0.68), (-0.11, 0.11, EAVE + 0.1, EAVE + 0.31)], 'left': [], 'back': []}
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
    return finish(objs, name)


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


def pagoda(seed=7, tiers=2, name='house_sil'):
    """(tiers=3, name: the Deluxe look's three-tiered pagoda, release 4)"""
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
    if tiers == 3:                                  # (the Deluxe: a third storey and roof, a tall gold finial with rings)
        curved_roof(objs, 0.42, 0.33, 1.21, 1.37, (0.24, 0.17), 0.11, teal, teal_d, 'roof2')
        objs.append(box('upper', (0.36, 0.26, 0.17), (0, 0, 1.45), m=white, bevel=0.01, segs=1))
        for sx in (-1, 1):
            for sy in (-1, 1):
                objs.append(cyl('pillar2', 0.022, 0.19, (sx * 0.19, sy * 0.14, 1.45), m=red, verts=10, bevel=0.003))
        lattice(0.0, -0.13 - 0.012, 1.45, 0.14, 0.09, (0, -1))
        curved_roof(objs, 0.33, 0.27, 1.53, 1.74, (0.04, 0.04), 0.09, teal, teal_d, 'roof3')
        objs.append(cyl('finial', 0.018, 0.34, (0, 0, 1.9), m=gold, verts=10, bevel=0.0))
        for k in range(5): objs.append(cyl('finring', 0.05 - k * 0.006, 0.014, (0, 0, 1.8 + k * 0.05), m=gold, verts=14, bevel=0.0))
        objs.append(sphere('finball', 0.035, (0, 0, 2.09), m=gold, seg=14, rings=8))
    else:
        curved_roof(objs, 0.42, 0.33, 1.21, 1.45, (0.05, 0.05), 0.11, teal, teal_d, 'roof2')
        objs.append(cyl('finial', 0.025, 0.14, (0, 0, 1.52), m=gold, verts=10, bevel=0.0))
        objs.append(sphere('finball', 0.04, (0, 0, 1.6), m=gold, seg=14, rings=8))
    objs.append(cyl('cord', 0.004, 0.1, (W2 + 0.2, -D2 - 0.2, EAVE - 0.0), m=dark, verts=5, bevel=0.0))
    block('sil', W2 + 0.2, -D2 - 0.2, 0.11); light_at(name, W2 + 0.2, -D2 - 0.2, EAVE - 0.12)
    objs.append(sphere('lantern', 0.065, (W2 + 0.2, -D2 - 0.2, EAVE - 0.12), (1, 1, 1.25), m=C('lanternred', '#dc4b2e', rough=0.5), seg=14, rings=10))
    for dz in (-0.075, 0.075):
        objs.append(cyl('lcap', 0.03, 0.02, (W2 + 0.2, -D2 - 0.2, EAVE - 0.12 + dz), m=gold, verts=10, bevel=0.0))
    pop_door(objs, FL, red, None, None, steps=2)
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 18, 0.0)
    return finish(objs, name)


# ------------------------------------------------------------------ Timber Lodge (Light Brahma)
def lodge(seed=8, eave=0.88, peak=1.44, name='house_bra', up=()):
    """(eave, peak, name: the Deluxe look's taller lodge, release 4; up: the x of each window upstairs in its front)"""
    random.seed(seed); objs = []
    log = C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G); endg = C('endgrain', '#cfa268', rough=0.8, var=0.05)
    roof_m = C('greensh', '#4b7a48', rough=0.7, var=0.12, hue_var=0.01); ridge = C('greenridge', '#355a35', rough=0.7)
    barge = C('lodgebarge', '#6e4428', rough=0.8, grain=0.3, grain_scale=G)
    door_m = C('lodgedoor', '#6d4326', rough=0.75, var=0.08, grain=0.3, grain_scale=G); trim = C('lodgetrim', '#e8dcc0', rough=0.7)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    EAVE, PEAK, r = eave, peak, 0.055
    gaps = [(-0.31 - POP_W / 2 - 0.03, -0.31 + POP_W / 2 + 0.03, 0.24, 0.26 + POP_H + 0.05), (-0.09, 0.25, 0.0, 0.64), (0.44 - WIN_W / 2 - 0.03, 0.44 + WIN_W / 2 + 0.03, 0.2, 0.24 + WIN_H + 0.06)]   # pop door, door, nest window
    gaps += [(x - 0.12, x + 0.12, 0.84, 1.1) for x in up]          # (the Deluxe's windows upstairs)
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
    light_at(name, -0.5, -D2 - 0.28, 0.85)
    objs.append(box('lantern', (0.07, 0.07, 0.09), (-0.5, -D2 - 0.28, 0.85), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.006, segs=1))
    objs.append(box('lcap', (0.09, 0.09, 0.02), (-0.5, -D2 - 0.28, 0.905), m=iron, bevel=0.004, segs=1))
    pop_door(objs, 0.26, trim, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    straw_bits(objs, (-0.31, -D2 - 0.04, 0.27), 0.08, 18, 0.0)
    for x in up: window(objs, x, -D2 - 0.03, 0.97, 0.2, 0.22, trim, glass)
    return finish(objs, name)


# ------------------------------------------------------------------ the Little Windmill (Polish, release 7: Audrey, 29 Oct:
# "A little windmill (Recommended)"; the Polish came from the Netherlands): a brick ground floor (the hens' house, its pop
# door, a little green door and the nest window in front), a skirt of slates round its top, a white weatherboarded smock
# tower rising from it, a dark boat-shaped cap; its sails are their own model (mill_sails) the browser turns slowly at the
# hub (coops.json mills)
MILL = dict(base=0.78, z0=0.94, z1=1.78, r0=0.46, r1=0.3, hub=1.94, hub_y=-0.56, sail=0.84, win=1.33, swin=1.12)
MILLS = {}                                        # per model: its sails' hub (glTF axes) and which sails


def mill_base_pts(out=0.0):
    """The ground floor's outline (Blender x, y; counter-clockwise from above, its wide flat front facing -y)."""
    P = [(-0.56, -D2), (0.56, -D2), (W2, -0.3), (W2, 0.22), (0.4, D2), (-0.4, D2), (-W2, 0.22), (-W2, -0.3)]
    if not out: return P
    res = []
    for i, (x, y) in enumerate(P):                 # pushed out along the average of its two edges' normals
        a, b = P[i - 1], P[(i + 1) % len(P)]
        n1 = Vector((y - a[1], -(x - a[0]), 0)).normalized(); n2 = Vector((b[1] - y, -(b[0] - x), 0)).normalized()
        n = (n1 + n2).normalized(); k = out / max(0.5, n.dot(n1))
        res.append((x + n.x * k, y + n.y * k))
    return res


def octa(r, flat_front=True):
    """A regular octagon of radius r (to its corners), its flat face to the front (-y), in the same order as mill_base_pts."""
    return [(r * math.cos(math.radians(a)), r * math.sin(math.radians(a))) for a in (-112.5, -67.5, -22.5, 22.5, 67.5, 112.5, 157.5, -157.5)]


def ring_mesh(name, ringA, zA, ringB, zB, m, cap_a=False, cap_b=False):
    """A band joining two rings of points (the same count, in order): a prism or a frustum, its ends closed if asked."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    A = [bm.verts.new((x, y, zA)) for x, y in ringA]; B = [bm.verts.new((x, y, zB)) for x, y in ringB]
    n = len(A)
    for i in range(n): bm.faces.new((A[i], A[(i + 1) % n], B[(i + 1) % n], B[i]))
    if cap_a: bm.faces.new(list(reversed(A)))
    if cap_b: bm.faces.new(B)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


def _face_frame(a, b):
    """For a wall from a to b (counter-clockwise): its direction along, its length and its outward normal (Blender x, y)."""
    d = Vector((b[0] - a[0], b[1] - a[1], 0)); L = d.length; d.normalize()
    return d, L, Vector((d.y, -d.x, 0))


def mill_bricks(objs, pts, z_top, holes, bricks, seed=3, top=None, missing=0.0):
    """Brick courses over each wall of the ground floor; the front's left round its pop door, door and nest window.
    top(i, u): a ragged top (the Rustic's broken stump: the highest a brick may reach on wall i at u along it); missing: the
    share of bricks fallen out."""
    rnd = random.Random(seed)
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        d, L, n = _face_frame(a, b)
        front = abs(n.y + 1) < 1e-3
        z = 0.0; row = 0
        while z < z_top - 0.02:
            h = min(0.085, z_top - z); u = -0.05 if row % 2 else 0.0
            while u < L:
                w = rnd.uniform(0.15, 0.22); u1 = min(L, u + w); u0 = max(0.0, u)
                if u1 - u0 > 0.05:
                    um = (u0 + u1) / 2; p = Vector((a[0], a[1], 0)) + d * um
                    if top and z + h / 2 > top(i, um): pass
                    elif missing and z > 0.1 and rnd.random() < missing: pass
                    elif not (front and any(x0 < p.x < x1 and z0 < z + h / 2 < z1 for (x0, x1, z0, z1) in holes)):
                        o = box('brick', (u1 - u0 - 0.012, 0.035, h - 0.012), (p.x + n.x * 0.012, p.y + n.y * 0.012, z + h / 2), (0, 0, math.atan2(d.y, d.x)),
                                m=rnd.choice(bricks), bevel=0.008, segs=1, jitter=0.002)
                        objs.append(o)
                u = u1
            z += h; row += 1


MILL_PAL = dict(board='#f2ede2', post='#dcd4c3', skirt='#454c57', skirtd='#353b45', cap='#454c57', capd='#353b45', trim='#efe9dc',
                door='#2f6a4f', knob='#5a3a26', gold=False)
# (Audrey, 29 Oct 21:59, on the five looks: "windmeal 3, 4 and 5 are too similar": the Cosy painted Dutch green with white
# trim, its skirt and cap of red pantiles, red-and-white striped sails; the Deluxe cream with Delft-blue trim, a cap and skirt
# of green copper, a gold knob, a gallery; its little miller's house beside it taken off again: Audrey, 22:12, "Remove the
# little house on the left of the deluxe coop please")
COSY_PAL = dict(MILL_PAL, board='#5f9468', post='#f4efe4', skirt='#c0603f', skirtd='#a14b31', cap='#c0603f', capd='#a14b31', trim='#f4efe4')
DX_PAL = dict(MILL_PAL, board='#f3e8d2', post='#2f5aa8', skirt='#5c9a86', skirtd='#4d8574', cap='#5c9a86', capd='#77b29e', trim='#f4efe4',
              door='#2f5aa8', knob='#d4a640', gold=True)


def windmill(seed=13, name='house_pol', M=None, sails='sails_pol', pal=None):
    """(name, M: the Deluxe look's taller mill, release 7: its own tower top, hub and sails; pal: its colours)"""
    random.seed(seed); objs = []
    M_ = dict(MILL, **(M or {})); FL = 0.2; WX = 0.36; P_ = dict(MILL_PAL, **(pal or {}))
    bricks = [C('mbrick%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#b0624a', '#a35a43', '#bd7056', '#97513e'))]
    mortar = C('mmortar', '#d6c8b0', rough=0.95)
    board = C('millboard', P_['board'], rough=0.7, var=0.03); post = C('millpost', P_['post'], rough=0.7)
    metal = dict(metal=0.25, spec=0.45) if P_['gold'] else {}                    # (the Deluxe's copper)
    slate = C('millslate', P_['skirt'], rough=0.55 if P_['gold'] else 0.65, var=0.1, hue_var=0.01, **metal); slated = C('millslated', P_['skirtd'], rough=0.65, **metal)
    capm = C('millcap', P_['cap'], rough=0.55 if P_['gold'] else 0.65, var=0.1, hue_var=0.01, **metal); capd = C('millcapd', P_['capd'], rough=0.65, **metal)
    green = C('milldoor', P_['door'], rough=0.55, var=0.05, grain=0.2, grain_scale=G); trim = C('trimw', P_['trim'], rough=0.6)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    shaft = C('millshaft', '#5a3a26', rough=0.7, grain=0.3, grain_scale=G)
    knob = C('millgold', P_['knob'], rough=0.3, metal=0.9) if P_['gold'] else shaft
    pts = mill_base_pts()
    # the ground floor: a solid core (the nest and the passage are cut from it) under brick courses
    core = ring_mesh('core', mill_base_pts(-0.012), 0.0, mill_base_pts(-0.012), M_['base'], mortar, cap_a=True, cap_b=True); objs.append(core)
    holes = [(-0.31 - POP_W / 2 - 0.04, -0.31 + POP_W / 2 + 0.04, 0.0, FL + POP_H + 0.05), (-0.135, 0.135, 0.0, 0.62),
             (WX - WIN_W / 2 - 0.02, WX + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)]
    mill_bricks(objs, pts, M_['base'], holes, bricks, seed)
    for i in range(len(pts)):                      # a white band along the top of the brick
        a, b = pts[i], pts[(i + 1) % len(pts)]; d, L, n = _face_frame(a, b)
        objs.append(plank('mband', (a[0] - d.x * 0.02 + n.x * 0.03, a[1] - d.y * 0.02 + n.y * 0.03, M_['base'] - 0.03), (b[0] + d.x * 0.02 + n.x * 0.03, b[1] + d.y * 0.02 + n.y * 0.03, M_['base'] - 0.03), 0.06, 0.03, n, trim, jitter=0.1))
    # a skirt of slates from the brick's top up to the tower
    outer = mill_base_pts(0.08); inner = octa(M_['r0'] + 0.03)
    objs.append(ring_mesh('skirt', outer, M_['base'] - 0.02, inner, M_['z0'] + 0.02, slated))
    for i in range(8):                             # its rows of slates
        for t in (0.08, 0.32, 0.56, 0.8):
            a = Vector((*outer[i], M_['base'] - 0.02)).lerp(Vector((*inner[i], M_['z0'] + 0.02)), t)
            b = Vector((*outer[(i + 1) % 8], M_['base'] - 0.02)).lerp(Vector((*inner[(i + 1) % 8], M_['z0'] + 0.02)), t)
            ia = Vector((*inner[i], M_['z0'])); oa = Vector((*outer[i], M_['base']))
            up = (ia - oa).normalized(); along = (b - a).normalized(); nrm = along.cross(up)
            if nrm.z < 0: nrm = -nrm
            objs.append(plank('sh', a + nrm * 0.012 - along * 0.01, b + nrm * 0.012 + along * 0.01, 0.075, 0.016, nrm, slate, jitter=0.8, bevel=0.004))
    # the smock tower: white weatherboards on its eight faces, a corner post at each corner
    Z0, Z1, R0, R1 = M_['z0'], M_['z1'], M_['r0'], M_['r1']
    objs.append(ring_mesh('tower', octa(R0 - 0.02), Z0 - 0.04, octa(R1 - 0.02), Z1, board, cap_b=True))
    rad = lambda z: R0 + (R1 - R0) * (z - Z0) / (Z1 - Z0)
    tilt = math.atan2((R0 - R1) * math.cos(math.radians(22.5)), Z1 - Z0)
    z = Z0; rows = 0
    while z < Z1 - 0.01:
        h = 0.06; zc = z + h / 2; R = rad(zc) + 0.004
        P = octa(R)
        for i in range(8):
            a, b = P[i], P[(i + 1) % 8]; d, L, n = _face_frame(a, b)
            nn = (n * math.cos(tilt) + Vector((0, 0, math.sin(tilt)))).normalized()
            objs.append(plank('mboard', (a[0] - d.x * 0.01, a[1] - d.y * 0.01, zc), (b[0] + d.x * 0.01, b[1] + d.y * 0.01, zc), h + 0.008, 0.014, nn, board, jitter=0.12, bevel=0.003))
        z += h; rows += 1
    for i, (x, y) in enumerate(octa(1.0)):
        objs.append(plank('mpost', (x * (R0 + 0.012), y * (R0 + 0.012), Z0 - 0.02), (x * (R1 + 0.012), y * (R1 + 0.012), Z1), 0.04, 0.03, (x, y, 0.15), post, jitter=0.1))
    fy = -rad(M_['win']) * math.cos(math.radians(22.5))
    window(objs, 0.0, fy - 0.03, M_['win'], 0.13, 0.17, trim, glass)
    for side in (1, -1):                           # little windows on its sides too
        x = side * (rad(M_['swin']) * math.cos(math.radians(22.5)) + 0.03)
        window(objs, x, 0.0, M_['swin'], 0.12, 0.15, trim, glass, normal=(side, 0, 0))
    # the cap: a dark boat-shaped dome on a curb, a knob on top, the windshaft out to the front
    objs.append(cyl('curb', R1 + 0.05, 0.05, (0, 0, Z1 + 0.02), m=shaft, verts=16, bevel=0.006))
    me = bpy.data.meshes.new('cap'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1.0)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(me); bm.free()
    capo = link(bpy.data.objects.new('cap', me)); setmat(capo, capm); capo.location = (0, 0.03, Z1 + 0.04); capo.scale = (R1 + 0.05, R1 + 0.12, 0.34)
    for p_ in capo.data.polygons: p_.use_smooth = True
    objs.append(capo)
    for k, t in enumerate((0.25, 0.55, 0.8)):      # courses of shingles on it
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.03, major_segments=24, minor_segments=4, location=(0, 0.03, Z1 + 0.04 + 0.34 * t))
        tr = bpy.context.object; tr.scale = ((R1 + 0.055) * math.sqrt(1 - t * t), (R1 + 0.125) * math.sqrt(1 - t * t), 0.6); setmat(tr, capd)
        for p_ in tr.data.polygons: p_.use_smooth = True
        objs.append(tr)
    objs.append(sphere('capknob', 0.04 if not P_['gold'] else 0.05, (0, 0.03, Z1 + 0.4), m=knob, seg=12, rings=8))
    objs.append(cyl('windshaft', 0.05, 0.36, (0, M_['hub_y'] + 0.2, M_['hub']), (math.radians(90), 0, 0), m=shaft, verts=12, bevel=0.004))
    # the hens' pop door and ramp, a little arched green door, the nest window, a lantern on a post
    arched_door(objs, 0.0, -D2 - 0.01, 0.0, 0.23, 0.58, green, trim, C('brass', '#c99a3c', rough=0.3, metal=0.9))
    nest_window(objs, 'pol', FL, WX, trim, solids=[core], door='drop', door_m=green)
    pop_door(objs, FL, trim, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 18, 0.0)
    block('pol', -0.66, -D2 - 0.26, 0.1)
    objs.append(cyl('lpost', 0.022, 0.95, (-0.66, -D2 - 0.26, 0.475), m=shaft, verts=8, bevel=0.0))
    objs.append(box('larm', (0.14, 0.025, 0.025), (-0.6, -D2 - 0.26, 0.92), m=iron, bevel=0.004, segs=1))
    light_at(name, -0.54, -D2 - 0.26, 0.85)
    objs.append(box('lantern', (0.07, 0.07, 0.09), (-0.54, -D2 - 0.26, 0.85), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.006, segs=1))
    objs.append(box('lcap', (0.09, 0.09, 0.02), (-0.54, -D2 - 0.26, 0.905), m=iron, bevel=0.004, segs=1))
    # a millstone leaning on its right wall and two sacks of flour (the hint: it grinds corn)
    stone_m = C('millstone', '#a39d93', rough=0.9, var=0.05)
    objs.append(cyl('millstone', 0.17, 0.07, (W2 + 0.06, -0.04, 0.17), (0, math.radians(78), 0), m=stone_m, verts=20, bevel=0.01))
    objs.append(cyl('millhole', 0.035, 0.08, (W2 + 0.065, -0.04, 0.17), (0, math.radians(78), 0), m=C('millhole', '#4d4740', rough=0.9), verts=10, bevel=0.0))
    sack = C('floursack', '#e9dfc9', rough=0.95, var=0.04)
    for k, (x, y) in enumerate(((W2 + 0.09, 0.2), (W2 + 0.05, 0.33))):
        objs.append(sphere('sack', 0.09, (x, y, 0.09), (0.9, 0.8, 1.15), m=sack, ico=2, disp=0.12, seed=k))
        objs.append(cyl('sacktie', 0.03, 0.03, (x, y, 0.2), m=sack, verts=8, r2=0.012, bevel=0.0))
    block('pol', W2 + 0.07, -0.04, 0.16); block('pol', W2 + 0.07, 0.26, 0.15)
    MILLS[name] = dict(hub=[0.0, round(M_['hub'], 3), round(-M_['hub_y'], 3)], sails=sails)
    return finish(objs, name)


def mill_sails(name='sails_pol', canvas=(0, 1, 2, 3), broken=(), stock_c='#6b4029', lat_c='#f2ede2', cloth_c='#ece0c4', R=None, width=0.24, stripe=None):
    """The windmill's four sails round their hub, at the origin facing -y (they turn about y, the browser's z): a stock for
    each, a lattice of bars along it on its trailing side, canvas spread over the lattice (canvas: which sails have it);
    broken: sails missing (the Rustic look's)."""
    random.seed(17); objs = []
    stock = C('sailstock', stock_c, rough=0.7, grain=0.3, grain_scale=G); lat = C('saillat', lat_c, rough=0.7, var=0.03)
    cloth = C('sailcloth', cloth_c, rough=0.95, var=0.03)
    R = R or MILL['sail']
    objs.append(cyl('hub', 0.075, 0.09, (0, 0.0, 0), (math.radians(90), 0, 0), m=stock, verts=14, bevel=0.01))
    objs.append(sphere('hubcap', 0.05, (0, -0.05, 0), (1, 0.6, 1), m=stock, seg=12, rings=8))
    for i in range(4):
        if i in broken: continue
        a = math.radians(i * 90 + 15)
        d = Vector((math.cos(a), 0, math.sin(a))); p = Vector((-math.sin(a), 0, math.cos(a)))       # along the sail; across (its trailing side)
        objs.append(plank('stock', d * 0.03 + Vector((0, -0.03, 0)), d * (R + 0.03) + Vector((0, -0.03, 0)), 0.05, 0.04, (0, -1, 0), stock, jitter=0.2))
        r0, r1, w = 0.2, R, width
        for off in (0.025, w):                     # the long laths
            objs.append(plank('lath', d * r0 + p * off + Vector((0, -0.05, 0)), d * r1 + p * off + Vector((0, -0.05, 0)), 0.02, 0.018, (0, -1, 0), lat, jitter=0.1, bevel=0.003))
        k = 0; r = r0
        while r <= r1 + 1e-6:                      # the bars across
            objs.append(plank('bar', d * r + Vector((0, -0.055, 0)), d * r + p * (w + 0.01) + Vector((0, -0.055, 0)), 0.016, 0.014, (0, -1, 0), lat, jitter=0.2, bevel=0.002))
            r += (r1 - r0) / 9; k += 1
        if i in canvas and stripe:                  # (the Cosy's: red-and-white striped canvas)
            band = C('sailstripe', stripe, rough=0.9, var=0.03); n = 5; seg_ = (r1 - r0 - 0.02) / n
            for k in range(n):
                c = d * (r0 + 0.01 + (k + 0.5) * seg_) + p * ((0.025 + w) / 2) + Vector((0, -0.035, 0))
                objs.append(box('cloth', (seg_ + 0.002, 0.006, w - 0.03), (c.x, c.y, c.z), (0, -a, 0), m=band if k % 2 == 0 else cloth, bevel=0.0))
        elif i in canvas:
            c = d * ((r0 + r1) / 2) + p * ((0.025 + w) / 2) + Vector((0, -0.035, 0))
            o = box('cloth', (r1 - r0 - 0.02, 0.006, w - 0.03), (c.x, c.y, c.z), (0, -a, 0), m=cloth, bevel=0.0); objs.append(o)
    return finish(objs, name)


# ------------------------------------------------------------------ the Javanese House (Ayam Cemani, release 7: Audrey, 29 Oct:
# "A Javanese house (Recommended)"; the Ayam Cemani comes from Java): a joglo on a raised plinth of dark volcanic stone, its
# walls of teak boards with a band of carving in gold along the top, carved double doors, a tall roof of terracotta tiles in
# two tiers (a wide low skirt, then a steep crown over the middle) with curled ends on its ridge, teak posts on stone pads at
# its front corners, a brass lantern hanging from the eave, a big terracotta water jar by its side.
JOGLO = dict(FL=0.24, WX=0.42, eave=0.96, brk=1.2, peak=1.9, over=0.2, front=0.1)      # (a short overhang in front: from the game's camera a deep one hid the doors and the carving)
JG = dict(teak='#8a5a33', teak2='#7a4c2a', teakd='#5e3a20', gold='#c9a24a', stone=('#77736b', '#6b675f', '#837e74'), tile='#b5502e',
          tile2='#a3462a', ridge='#8f3c24', jar='#b8643c', inside='#2e2018', brass='#b88a3a')


def _jg(key, i=None, rough=0.8, **kw):
    v = JG[key] if i is None else JG[key][i]
    return C('jg_' + key + ('' if i is None else str(i)), v, rough=rough, **kw)


def tile_rows(objs, a0, a1, b0, b1, rows, m, m2, width=0.07, lift=0.012):
    """Rows of tiles over a roof face whose lower edge runs a0..a1 and upper edge b0..b1 (each row a plank along the face)."""
    for k in range(rows):
        t = (k + 0.4) / rows
        a, b = a0.lerp(b0, t), a1.lerp(b1, t)
        if (b - a).length < 0.03: continue
        up = (b0.lerp(b1, 0.5) - a0.lerp(a1, 0.5)).normalized(); along = (b - a).normalized(); nrm = along.cross(up)
        if nrm.z < 0: nrm = -nrm
        objs.append(plank('sh', a + nrm * lift - along * 0.008, b + nrm * lift + along * 0.008, width, 0.016, nrm, m if k % 2 else m2, jitter=0.6, bevel=0.003))


def hip_tier(objs, name, outer, z0, inner, z1, m, m2, rows, hip=None, spacing=0.075):
    """One tier of a hipped roof of clay tiles: from a rectangle's outline at z0 up to a smaller one (or a ridge) at z1; the
    tiles' ribs running down each face, the courses across it, a rounded cap down each hip."""
    objs.append(ring_mesh(name, outer, z0, inner, z1, m))
    for i in range(4):
        a0, a1 = Vector((*outer[i], z0)), Vector((*outer[(i + 1) % 4], z0)); b0, b1 = Vector((*inner[i], z1)), Vector((*inner[(i + 1) % 4], z1))
        up = (b0.lerp(b1, 0.5) - a0.lerp(a1, 0.5)).normalized(); along = (a1 - a0).normalized(); nrm = along.cross(up)
        if nrm.z < 0: nrm = -nrm
        L = (a1 - a0).length; n = max(2, int(L / spacing))
        for k in range(1, n):                        # the ribs, down the slope
            t = k / n; p, q = a0.lerp(a1, t), b0.lerp(b1, t)
            if (q - p).length < 0.04: continue
            objs.append(cyl('trib', 0.011, (q - p).length, (p + q) / 2 + nrm * 0.009, (q - p).normalized().to_track_quat('Z', 'Y').to_euler(), m=m2, verts=5, bevel=0.0))
        for k in range(rows):                        # the courses, across it
            t = (k + 0.6) / (rows + 0.2); p, q = a0.lerp(b0, t), a1.lerp(b1, t)
            if (q - p).length < 0.04: continue
            objs.append(plank('tcourse', p + nrm * 0.016, q + nrm * 0.016, 0.018, 0.012, nrm, m2, jitter=0.2, bevel=0.0))
        objs.append(plank('tedge', a0 + nrm * 0.012 - up * 0.01, a1 + nrm * 0.012 - up * 0.01, 0.035, 0.022, nrm, m2, jitter=0.0, bevel=0.003))
    for i in range(4):                               # the hips
        p, q = Vector((*outer[i], z0)), Vector((*inner[i], z1))
        objs.append(cyl('thip', 0.022, (q - p).length + 0.03, (p + q) / 2 + Vector((0, 0, 0.018)), (q - p).normalized().to_track_quat('Z', 'Y').to_euler(), m=hip or m2, verts=8, bevel=0.0))


def joglo(seed=15, name='house_aya', J=None, pal=None):
    """(J: its sizes (the Deluxe's taller, a third tier of roof: brk2); pal: its colours (the Cosy's green-glazed tiles, the
    Deluxe's black and gold), release 7)"""
    random.seed(seed); objs = []
    J_ = dict(JOGLO, **(J or {})); FL, WX, EAVE, BRK, PEAK, OV, OF = J_['FL'], J_['WX'], J_['eave'], J_['brk'], J_['peak'], J_['over'], J_['front']
    P_ = dict(JG, **(pal or {})); glaze = dict(spec=0.55, coat=0.4) if P_.get('glazed') else {}
    mk = lambda key, **kw: C('jg_' + key, P_[key], **kw)
    teak, teak2, teakd = mk('teak', var=0.08, grain=0.35, grain_scale=G), mk('teak2', var=0.08, grain=0.35, grain_scale=G), mk('teakd', var=0.06, grain=0.3, grain_scale=G)
    gold = mk('gold', rough=0.35, metal=0.7); stones = [_jg('stone', i, rough=0.9, var=0.06) for i in range(3)]
    tile, tile2, ridge = mk('tile', rough=0.45 if glaze else 0.7, var=0.1, **glaze), mk('tile2', rough=0.45 if glaze else 0.7, var=0.08, **glaze), mk('ridge', rough=0.5 if glaze else 0.7, **glaze)
    hipm = gold if P_.get('goldhips') else ridge
    wall = [mk('wall', var=0.05, grain=0.2, grain_scale=G), mk('wall2', var=0.05, grain=0.2, grain_scale=G)] if P_.get('wall') else [teak, teak, teak2]
    postm = mk('post', rough=0.5, var=0.04) if P_.get('post') else teak2
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    # the plinth of dark stone the house stands on, a step up to its doors
    PX, PY = W2 + 0.06, D2 + 0.06
    objs.append(box('plinthcore', (2 * PX - 0.02, 2 * PY - 0.02, FL - 0.01), (0, 0, (FL - 0.01) / 2), m=stones[1], bevel=0.0))
    for (a, b, n) in (((-PX, -PY), (PX, -PY), (0, -1)), ((PX, -PY), (PX, PY), (1, 0)), ((-PX, PY), (-PX, -PY), (-1, 0))):
        A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); L = (B - A).length; d = (B - A).normalized()
        for row in range(2):
            u = -0.06 if row % 2 else 0.0
            while u < L:
                w = min(random.uniform(0.18, 0.28), L - max(u, 0)); u0 = max(u, 0.0); u1 = min(L, u + w)
                if u1 - u0 > 0.05:
                    c = A + d * ((u0 + u1) / 2) + Vector((n[0], n[1], 0)) * 0.012
                    objs.append(box('pstone', (u1 - u0 - 0.012 if n[1] else 0.03, 0.03 if n[1] else u1 - u0 - 0.012, FL / 2 - 0.012), (c.x, c.y, FL / 4 + row * FL / 2), m=random.choice(stones), bevel=0.008, segs=1, jitter=0.002))
                u += w
    objs.append(box('pstep', (0.34, 0.14, FL / 2), (0.03, -PY - 0.07, FL / 4), m=stones[2], bevel=0.01, segs=1))
    # the walls: a dark core (the nest and passage cut from it) under teak boards running up, cut round the doors and window
    core = box('core', (2 * W2 - 0.04, 2 * D2 - 0.04, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=_jg('inside', rough=1.0), bevel=0.0); objs.append(core)
    holes = [(-0.31 - POP_W / 2 - 0.02, -0.31 + POP_W / 2 + 0.02, FL + POP_H + 0.04), (-0.12, 0.18, FL + 0.6), (WX - WIN_W / 2 - 0.02, WX + WIN_W / 2 + 0.02, FL + 0.04 + WIN_H + 0.03)]
    def boards(u0, u1, place, front=False):
        n = max(2, round((u1 - u0) / 0.1)); w = (u1 - u0) / n
        for k in range(n):
            u = u0 + (k + 0.5) * w; z0 = FL
            for (h0, h1, top) in (holes if front else ()):
                if h0 - 0.01 < u < h1 + 0.01: z0 = top
            if EAVE - 0.02 - z0 > 0.03: place(u, z0, w, random.choice(wall))
    boards(-W2, W2, lambda u, z0, w, m: objs.append(plank('board', (u, -D2 - 0.012, z0), (u, -D2 - 0.012, EAVE - 0.02), w * 0.96, 0.024, (0, -1, 0), m, jitter=0.3)), front=True)
    boards(-W2, W2, lambda u, z0, w, m: objs.append(plank('board', (u, D2 + 0.012, z0), (u, D2 + 0.012, EAVE - 0.02), w * 0.96, 0.024, (0, 1, 0), m, jitter=0.3)))
    for sx in (-1, 1):
        boards(-D2, D2, lambda u, z0, w, m, sx=sx: objs.append(plank('board', (sx * (W2 + 0.012), u, z0), (sx * (W2 + 0.012), u, EAVE - 0.02), w * 0.96, 0.024, (sx, 0, 0), m, jitter=0.3)))
    # a band of carving in gold along the top of the front: a rail, little diamonds and leaves between
    zc = EAVE - 0.1
    objs.append(plank('carvrail', (-W2 - 0.02, -D2 - 0.035, zc - 0.06), (W2 + 0.02, -D2 - 0.035, zc - 0.06), 0.03, 0.02, (0, -1, 0), teakd, jitter=0.0))
    objs.append(plank('carvrail', (-W2 - 0.02, -D2 - 0.035, zc + 0.06), (W2 + 0.02, -D2 - 0.035, zc + 0.06), 0.03, 0.02, (0, -1, 0), teakd, jitter=0.0))
    for k in range(12):
        x = -W2 + 0.06 + k * (2 * W2 - 0.12) / 11
        objs.append(box('carving', (0.05, 0.012, 0.05), (x, -D2 - 0.04, zc), (0, math.radians(45), 0), m=gold, bevel=0.004, segs=1))
        if k < 11: objs.append(sphere('carvleaf', 0.022, (x + (2 * W2 - 0.12) / 22, -D2 - 0.038, zc), (1.4, 0.3, 0.6), m=teakd, seg=8, rings=5))
    # carved double doors of dark teak, a gold boss on each, a frame round them
    for sx in (-1, 1):
        cx = 0.03 + sx * 0.075
        objs.append(box('jdoor', (0.145, 0.03, 0.58), (cx, -D2 - 0.02, FL + 0.29), m=teakd, bevel=0.006, segs=1))
        for zz in (FL + 0.17, FL + 0.42):
            objs.append(box('jpanel', (0.1, 0.012, 0.16), (cx, -D2 - 0.04, zz), m=teak, bevel=0.004, segs=1))
            objs.append(box('jcarve', (0.035, 0.008, 0.035), (cx, -D2 - 0.048, zz), (0, math.radians(45), 0), m=gold, bevel=0.002, segs=1))
        objs.append(sphere('jboss', 0.012, (0.03 + sx * 0.02, -D2 - 0.045, FL + 0.3), m=gold, seg=8, rings=5))
    for (a, b) in (((-0.135, FL), (-0.135, FL + 0.62)), ((0.195, FL), (0.195, FL + 0.62)), ((-0.16, FL + 0.62), (0.22, FL + 0.62))):
        objs.append(plank('jframe', (a[0], -D2 - 0.03, a[1]), (b[0], -D2 - 0.03, b[1]), 0.045, 0.03, (0, -1, 0), teak2, jitter=0.1))
    # the roof: a wide low skirt of tiles from the eaves, then the steep crown over the middle up to a short ridge
    outer = [(-W2 - OV, -D2 - OF), (W2 + OV, -D2 - OF), (W2 + OV, D2 + OV), (-W2 - OV, D2 + OV)]
    mid = [(-0.44, -0.28), (0.44, -0.28), (0.44, 0.32), (-0.44, 0.32)]
    hip_tier(objs, 'skirtroof', outer, EAVE, mid, BRK, tile, tile2, 4, hip=hipm)
    objs.append(box('roofbreak', (0.9, 0.62, 0.05), (0, 0.02, BRK - 0.01), m=teakd if not P_.get('goldhips') else gold, bevel=0.006, segs=1))       # (a beam round the break)
    mid2 = [(-0.42, -0.26), (0.42, -0.26), (0.42, 0.3), (-0.42, 0.3)]; top = [(-0.17, 0.02), (0.17, 0.02), (0.17, 0.02), (-0.17, 0.02)]
    if J_.get('brk2'):                               # (the Deluxe: a middle tier, steeper, then the crown)
        mid3 = [(-0.3, -0.16), (0.3, -0.16), (0.3, 0.2), (-0.3, 0.2)]
        hip_tier(objs, 'midroof', mid2, BRK + 0.02, mid3, J_['brk2'], tile, tile2, 4, hip=hipm)
        objs.append(box('roofbreak2', (0.64, 0.4, 0.04), (0, 0.02, J_['brk2'] - 0.01), m=gold, bevel=0.005, segs=1))
        mid4 = [(-0.29, -0.15), (0.29, -0.15), (0.29, 0.19), (-0.29, 0.19)]
        hip_tier(objs, 'crownroof', mid4, J_['brk2'] + 0.02, top, PEAK, tile, tile2, 6, hip=hipm)
    else: hip_tier(objs, 'crownroof', mid2, BRK + 0.02, top, PEAK, tile, tile2, 8, hip=hipm)
    objs.append(cyl('jridge', 0.035, 0.42, (0, 0.02, PEAK + 0.02), (0, math.radians(90), 0), m=ridge, verts=10, bevel=0.0))
    for sx in (-1, 1):                               # its ends curled up, a gold tip on each
        p0 = Vector((sx * 0.2, 0.02, PEAK + 0.02)); p1 = Vector((sx * 0.3, 0.02, PEAK + 0.13))
        objs.append(cyl('jcurl', 0.03, (p1 - p0).length + 0.02, (p0 + p1) / 2, (p1 - p0).normalized().to_track_quat('Z', 'Y').to_euler(), m=ridge, verts=8, r2=0.018, bevel=0.0))
        objs.append(sphere('jtip', 0.022, tuple(p1 + Vector((sx * 0.01, 0, 0.012))), m=gold, seg=8, rings=5))
    objs.append(cyl('jmustaka', 0.03, 0.08, (0, 0.02, PEAK + 0.09), m=gold, verts=8, r2=0.008, bevel=0.0))
    for (a, b) in ((outer[0], outer[1]), (outer[1], outer[2]), (outer[3], outer[0])):     # a fascia board along the eaves
        objs.append(plank('fascia', (a[0], a[1], EAVE - 0.03), (b[0], b[1], EAVE - 0.03), 0.06, 0.025, (b[1] - a[1], -(b[0] - a[0]), 0), teakd, jitter=0.1))
    # teak posts on stone pads at the front corners, under the eaves
    for sx in (-1, 1):
        x, y = sx * (W2 + OV - 0.06), -D2 - OF + 0.03
        objs.append(cyl('umpak', 0.06, 0.07, (x, y, 0.035), m=stones[0], verts=8, r2=0.045, bevel=0.006))
        objs.append(cyl('soko', 0.032, EAVE - 0.08, (x, y, 0.07 + (EAVE - 0.08) / 2), m=postm, verts=8, bevel=0.0))
        if P_.get('post'): objs.append(cyl('sokogold', 0.036, 0.04, (x, y, EAVE - 0.06), m=gold, verts=8, bevel=0.0))
        objs.append(box('sokocap', (0.08, 0.08, 0.03), (x, y, EAVE - 0.01), m=teakd, bevel=0.004, segs=1))
        block('aya', x, y, 0.08)
    # the nest window (a carved shutter let down), the hens' door and ramp, side windows with carved grilles
    nest_window(objs, 'aya', FL, WX, teak2, solids=[core], door='drop', door_m=teakd)
    pop_door(objs, FL, teak2, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 16, 0.0)
    for sx in (-1, 1):
        x = sx * (W2 + 0.03)
        window(objs, x, 0.0, FL + 0.32, 0.2, 0.2, teakd, glass, normal=(sx, 0, 0), cross=False)
        for k in range(3):
            objs.append(box('grille', (0.01, 0.012, 0.2), (x + sx * 0.012, -0.07 + k * 0.07, FL + 0.32), m=teakd, bevel=0.0))
    # a brass lantern hanging from the eave at the front left, a big terracotta water jar by its right side with a dipper
    brass = _jg('brass', rough=0.35, metal=0.8); lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    lx, ly, lz = -0.62, -D2 - 0.17, 0.6
    objs.append(cyl('lchain', 0.004, EAVE - 0.04 - lz - 0.06, (lx, ly, (EAVE - 0.04 + lz + 0.06) / 2), m=iron, verts=5, bevel=0.0))
    objs.append(cyl('lanternb', 0.045, 0.1, (lx, ly, lz), m=brass, verts=6, r2=0.035, bevel=0.004))
    objs.append(cyl('lanterng', 0.038, 0.07, (lx, ly, lz), m=lamp, verts=6, bevel=0.0))
    objs.append(cyl('lroof', 0.055, 0.05, (lx, ly, lz + 0.07), m=brass, verts=6, r2=0.0, bevel=0.0))
    light_at(name, lx, ly, lz)
    jar = _jg('jar', rough=0.75, var=0.04); jx, jy = W2 + 0.2, -0.12
    objs.append(sphere('gentong', 0.14, (jx, jy, 0.14), (1, 1, 1.05), m=jar, seg=16, rings=10))
    objs.append(cyl('gentlip', 0.095, 0.04, (jx, jy, 0.285), m=jar, verts=16, bevel=0.006))
    objs.append(cyl('gentlid', 0.1, 0.02, (jx, jy, 0.31), m=teakd, verts=16, bevel=0.004))
    objs.append(sphere('dipper', 0.045, (jx + 0.02, jy - 0.02, 0.33), (1, 1, 0.5), m=C('coconut', '#5b3f28', rough=0.8), seg=10, rings=6))
    objs.append(cyl('dipperh', 0.007, 0.14, (jx + 0.08, jy - 0.06, 0.34), (0, math.radians(80), math.radians(-30)), m=teak2, verts=6, bevel=0.0))
    block('aya', jx, jy, 0.18)
    return finish(objs, name)


# ------------------------------------------------------------------ the pen, shared by every style
# ------------------------------------------------------------------ the Floating House (the call ducks, 30 Oct 2026: Audrey's
# "Floating house (Recommended)": a little wooden house on a raft in the middle of their pond, a ramp up to it). Its pond
# lies where a house stands in the other pens (the back of the pen, a little wider and deeper than a house), the raft
# floating in it; the ducks' gangplank runs straight from their little door down over the deck and the water to the bank
# in front (NESTS['house_call']: one long ramp, its foot on the bank), so they come and go and lay as the hens do. Duck-egg
# blue weatherboards with white trim, a roof of coral shingles, a porthole window, a life ring, a pennant on the ridge, a
# lantern at the raft's corner, pots of flowers on the deck; round the pond, stones, reeds and bulrushes, water lilies
FLOAT = dict(FL=0.24, WX=0.36, deck=0.1, eave=0.84, peak=1.36, water=0.032, pond=(0.0, -0.17, 0.98, 0.7), raft=(-0.78, 0.78, -0.6, 0.52), ramp=0.87, k=0.72)
# (k: the house and its raft drawn smaller than a hen's house, a duck's size, so the water shows all round it; the pond
# full size. ramp: the gangplank's length before that, so its foot lands on the bank)
FLOAT_PAL = dict(wall='#b6ddd5', wall2='#a6d2ca', trim='#fbf7ee', roof='#e07a5f', ridge='#c2604a', deck='#c9a47a', deck2='#b48f66',
                 log='#8a6440', door='#e07a5f', ring='#fbf7ee', ringr='#d9473a', flag='#f6c945', water='#7cc6dc', water2='#62b3cd')
# its five looks (each clearly its own): Rustic, an old grey shack with a rusty tin roof on a raft of barrels in a murky pond;
# Mended, new pine boards being painted, half a roof of new shingles over the felt, a clean pond, stones being laid; Snug,
# the Floating House; Cosy, buttercup yellow with a teal roof, bunting on its rail, flower boxes, the automatic door, a
# little rowing boat tied up beside it; Deluxe, white and navy with a red roof, a white rail, a ship's wheel, a little
# lighthouse at its back (its lamp lit at night), a pond edged with pale cobbles and a fountain
FLOAT_LOOK = {
    0: dict(wall='#9a948a', wall2='#8b857b', bare='#b3a58e', trim='#a59f94', roof='tin', ridge='#8b908e', deck='#8e877c', deck2='#7f786d',
            log='#6c6052', door='#8b857b', water='#7f9468', water2='#6b7d56'),
    1: dict(wall='#e2c591', wall2='#d8b882', paint='#b6ddd5', paint2='#a6d2ca', trim='#fbf7ee', roof='half', ridge='#4a4f55',
            deck='#e1c28e', deck2='#d5b37d', log='#a77d52', water='#8bc3c0', water2='#73afab'),
    2: {},
    3: dict(wall='#f5d67c', wall2='#efcb69', trim='#fbf7ee', roof='#3d8e9a', ridge='#2f7480', door='#3d8e9a', flag='#e2574c'),
    4: dict(wall='#f8f6f0', wall2='#eeebe3', trim='#2c4a7a', roof='#c9453b', ridge='#a5352d', door='#2c4a7a', flag='#2c4a7a',
            deck='#d9c19c', deck2='#ccb28b', water='#79c7e0', water2='#5fb3d0'),
}
FLOAT_PATH = {}                                                  # per look with its own way in: the ducks' way (points, glTF axes)
FLOAT_POND = {0: dict(pond=(0.0, -0.17, 0.92, 0.68)), 4: dict(pond=(0.0, -0.02, 1.58, 0.85))}      # (the Rustic's smaller, the Deluxe's much wider: its front where the gangplank lands)


def pond_pts(F, wob=0.05, n=40, out=0.0):
    """The pond's outline (Blender x, y): an oval a little wobbly, `out` further out."""
    cx, cy, a, b = F['pond']; P = []
    for i in range(n):
        t = 2 * math.pi * i / n
        k = 1 + wob * math.sin(3 * t + 0.7) + 0.6 * wob * math.cos(5 * t + 1.9)
        P.append((cx + (a * k + out) * math.cos(t), cy + (b * k + out) * math.sin(t)))
    return P


def flat_poly(name, pts, z, m):
    """A flat shape at height z (a fan from its middle)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    c = bm.verts.new((cx, cy, z)); vs = [bm.verts.new((x, y, z)) for x, y in pts]
    for i in range(len(vs)): bm.faces.new((c, vs[i], vs[(i + 1) % len(vs)]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    return o


def pond(objs, F, P, seed=3, look=2, name='house_call'):
    """The pond round a floating house: the water, a darker band at its edge, stones round it (the Rustic's few, the Mended's
    half laid, the Deluxe's pale cobbles), reeds and bulrushes, water lilies (none in the Rustic's murky water; more in flower
    in the Cosy's and the Deluxe's), the Cosy's rowing boat, the Deluxe's fountain; the birds keep out of it (BLOCKS) but for
    the gangplank's line."""
    random.seed(seed); sx = '_%d' % look
    water = C('pondwater' + sx, P['water'], rough=0.08 if look else 0.3, spec=0.6 if look else 0.3, coat=0.4 if look else 0.0)
    water2 = C('pondedge' + sx, P['water2'], rough=0.1 if look else 0.4, spec=0.5)
    objs.append(flat_poly('pondedge', pond_pts(F), F['water'] - 0.004, water2))
    objs.append(flat_poly('pond', pond_pts(F, out=-0.07), F['water'], water))
    cx, cy, a, b = F['pond']
    greys = [C('pstone%d' % i, h, rough=0.9, var=0.08) for i, h in enumerate(('#a7a299', '#8f8b84', '#b9b3a8', '#9a958c'))]
    if look == 4: greys = [C('pcobble%d' % i, h, rough=0.7, var=0.05) for i, h in enumerate(('#efe9dc', '#e3dccc', '#f4efe4', '#d9d1c0'))]
    ring = pond_pts(F, n=46 if look < 4 else 60, out=0.03)
    for i, (x, y) in enumerate(ring):
        if y < cy - b * 0.7 and abs(x + 0.31) < 0.16: continue                   # (the gangplank's foot on the bank: a gap)
        if look == 0 and i % 3: continue                                         # (the Rustic's: a stone here and there)
        if look == 1 and x > 0.1: continue                                       # (the Mended's: the left half laid so far)
        r = random.uniform(0.045, 0.075) if look < 4 else random.uniform(0.04, 0.055)
        objs.append(sphere('pstone', r, (x + random.uniform(-0.015, 0.015), y + random.uniform(-0.015, 0.015), r * 0.3), (1.2, 1.0, 0.6) if look < 4 else (1.3, 1.1, 0.55), m=greys[i % 4], ico=1, disp=0.25 if look < 4 else 0.08, seed=i))
    if look == 1:                                                                # a pile of stones waiting on the bank, front right
        for j in range(7):
            r = random.uniform(0.045, 0.065); x, y = 0.86 + random.uniform(-0.09, 0.09), cy - b - 0.16 + random.uniform(-0.06, 0.06)
            objs.append(sphere('pstone', r, (x, y, r * 0.35 + (0.05 if j > 4 else 0)), (1.2, 1.0, 0.6), m=greys[j % 4], ico=1, disp=0.25, seed=40 + j))
    reed = C('reed', '#5d8a3e', rough=0.8, var=0.12); reed2 = C('reed2', '#7a9a4a', rough=0.8, var=0.1); rush = C('bulrush', '#6b4527', rough=0.85)
    clumps = {0: [(-0.86, 0.42, 14), (0.84, 0.5, 12), (0.95, -0.15, 10), (-0.95, -0.3, 10), (0.4, 0.95, 9)], 1: [(-0.86, 0.42, 9), (0.84, 0.5, 9)],
              4: [(-0.9, 0.5, 9), (0.88, 0.62, 9)]}.get(look, [(-0.86, 0.42, 9), (0.84, 0.5, 9), (0.95, -0.15, 9)])
    for (u, v, nr) in clumps:
        x0, y0 = cx + a * u, cy + b * v
        for kk in range(nr):
            x, y = x0 + random.uniform(-0.07, 0.07), y0 + random.uniform(-0.06, 0.06); h = random.uniform(0.22, 0.42) * (1.15 if look == 0 else 1.0)
            tilt = (random.uniform(-0.18, 0.18), random.uniform(-0.18, 0.18), 0)
            objs.append(cyl('reed', 0.009, h, (x, y, F['water'] + h / 2), tilt, m=reed if kk % 2 else reed2, verts=5, r2=0.002, bevel=0.0))
            if kk % 4 == 0:
                objs.append(cyl('rush', 0.016, 0.07, (x + math.sin(tilt[1]) * h * 0.5, y - math.sin(tilt[0]) * h * 0.5, F['water'] + h * 0.98), tilt, m=rush, verts=8, bevel=0.0))
    pad = C('lilypad', '#5c9a45', rough=0.6, var=0.1); flower = C('lilyflower', '#f6c3d5', rough=0.6); heart = C('lilyheart', '#f4cf4a', rough=0.6)
    spots = [(-0.88, -0.42), (0.88, -0.36), (0.6, -0.76), (-0.68, 0.4), (0.92, 0.12), (-0.5, -0.74)]
    nl, nf = {0: (0, 0), 1: (1, 0), 2: (4, 2), 3: (6, 4), 4: (0, 0)}[look]
    if look == 4:                                        # (the Deluxe: water lilies all over, as in Monet's garden: Audrey, "add Lily pad level 5")
        white = C('lilywhite', '#fbf6ee', rough=0.6); n_ = 0
        for kk in range(400):
            if n_ >= 34: break
            u, v = random.uniform(-1, 1), random.uniform(-1, 1)
            if u * u + v * v > 0.72: continue
            x, y = cx + a * u, cy + b * v
            if abs(x) < 0.66 and -0.5 < y < 0.45: continue                       # (not under the raft)
            if abs(x + 0.22) < 0.14 and y < -0.3: continue                       # (nor under the gangplank)
            r = random.uniform(0.045, 0.085); n_ += 1
            objs.append(cyl('lilypad', r, 0.006, (x, y, F['water'] + 0.004), (0, 0, random.uniform(0, 6.28)), m=pad, verts=12, bevel=0.0))
            if n_ % 3 == 0:
                fm = flower if n_ % 2 else white
                for j in range(5):
                    a_ = j * 2 * math.pi / 5
                    objs.append(sphere('lilypetal', 0.02, (x + math.cos(a_) * 0.014, y + math.sin(a_) * 0.014, F['water'] + 0.02), (1.4, 0.7, 0.6), (0, 0.5, a_), m=fm, seg=8, rings=5))
                objs.append(sphere('lilyheart', 0.01, (x, y, F['water'] + 0.026), m=heart, seg=8, rings=5))
    for kk, (u, v) in enumerate(spots[:nl]):
        x, y = u * a / 0.98, cy + (v + 0.17) * b / 0.7; r = random.uniform(0.055, 0.08)
        objs.append(cyl('lilypad', r, 0.006, (x, y, F['water'] + 0.004), (0, 0, random.uniform(0, 6.28)), m=pad, verts=12, bevel=0.0))
        if kk < nf:
            for j in range(5):
                a_ = j * 2 * math.pi / 5
                objs.append(sphere('lilypetal', 0.02, (x + math.cos(a_) * 0.014, y + math.sin(a_) * 0.014, F['water'] + 0.02), (1.4, 0.7, 0.6), (0, 0.5, a_), m=flower, seg=8, rings=5))
            objs.append(sphere('lilyheart', 0.01, (x, y, F['water'] + 0.026), m=heart, seg=8, rings=5))
    if look == 3: rowing_boat(objs, -0.8, -0.26, F['water'])
    if look == 4: fountain(objs, 1.22, 0.28, F['water'], name)
    if look >= 3: beach_ball(objs, {3: (0.52, -0.68), 4: (0.66, -0.62)}[look], F['water'])      # (the ducks' toy, from the Cosy: Audrey, "No ball level 3")
    # the birds keep out of the water (in front of and beside the house; the gangplank's line left free)
    for i in range(32):
        t = 2 * math.pi * i / 32; x, y = cx + a * 0.8 * math.cos(t), cy + b * 0.8 * math.sin(t)
        if y < -D2 - 0.05 and abs(x + 0.31) < 0.24: continue
        if abs(x) < W2 + 0.05 and -D2 < y: continue                         # (under the house: it's the house)
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.2])


def monet_bridge(objs, x, ya, za, yb, zb, name, w=0.22, rise=0.12, hr=0.13, n=18):
    """The Deluxe's way in (Audrey: "a nice bridge like the one in money painting", then "the bridge replace the existing path":
    Monet's at Giverny): a little green arched footbridge of wood from the ducks' door over the deck's edge and the water
    down to the bank, in place of the gangplank; its deck of boards across, a railing each side (posts, a top rail and a
    middle one), taller posts with caps at its ends. (ya, za) to (yb, zb), rising `rise` over the straight line between."""
    green = C('monetgreen', '#5f9a6a', rough=0.6, var=0.04); green2 = C('monetgreen2', '#4f8a5b', rough=0.6, var=0.04)
    deckm = C('monetdeck', '#6aa676', rough=0.7, var=0.06, grain=0.3, grain_scale=G)
    L = yb - ya
    zf = lambda u: za + (zb - za) * u + rise * math.sin(math.pi * u) ** 0.85
    P = [(ya + L * i / n, zf(i / n)) for i in range(n + 1)]
    FLOAT_PATH[name] = [[round(x, 3), round(z, 3), round(-y, 3)] for y, z in P[::3] + ([P[-1]] if n % 3 else [])]      # (the ducks' way over it, glTF axes)
    for i in range(n):                                    # the deck: boards across, on a stringer each side
        (y0, z0), (y1, z1) = P[i], P[i + 1]; ym, zm = (y0 + y1) / 2, (z0 + z1) / 2
        nrm = Vector((0, -(z1 - z0), y1 - y0)).normalized()
        if nrm.z < 0: nrm = -nrm
        objs.append(plank('mdeck', (x - w / 2, ym, zm + 0.008), (x + w / 2, ym, zm + 0.008), math.hypot(y1 - y0, z1 - z0) * 0.9, 0.014, nrm, deckm, jitter=0.2, bevel=0.002))
        for sx in (-1, 1):
            objs.append(plank('mstring', (x + sx * w / 2, y0, z0 - 0.012), (x + sx * w / 2, y1, z1 - 0.012), 0.04, 0.022, (sx, 0, 0), green2, jitter=0.0, bevel=0.002))
    for sx in (-1, 1):                                    # the railings
        for i in range(0, n + 1, 2):
            y, z = P[i]; end = i in (0, n)
            hgt = hr * 1.35 if end else hr
            objs.append(box('mpost', (0.024 if end else 0.017, 0.024 if end else 0.017, hgt), (x + sx * (w / 2 + 0.008), y, z + hgt / 2), m=green, bevel=0.003, segs=1))
            if end: objs.append(box('mcap', (0.034, 0.034, 0.014), (x + sx * (w / 2 + 0.008), y, z + hgt + 0.007), m=green2, bevel=0.003, segs=1))
        for (dz, th) in ((hr * 0.94, 0.017), (hr * 0.5, 0.012)):
            for i in range(n):
                (y0, z0), (y1, z1) = P[i], P[i + 1]
                objs.append(plank('mrail', (x + sx * (w / 2 + 0.008), y0, z0 + dz), (x + sx * (w / 2 + 0.008), y1, z1 + dz), th, th, (0, 0, 1), green, jitter=0.0, bevel=0.002))


def rowing_boat(objs, x, y, wz):
    """The Cosy's little rowing boat moored in the pond beside the raft (along y): red outside, white inside, two seats, oars."""
    red = C('boatred', '#d24b3e', rough=0.6, var=0.04); white = C('boatwhite', '#f5f1e6', rough=0.65); wood = C('boatwood', '#a7744a', rough=0.75, grain=0.3, grain_scale=G)
    me = bpy.data.meshes.new('boat'); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=10, radius=1.0)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_outer=True)
    bm.to_mesh(me); bm.free()
    hull = link(bpy.data.objects.new('boathull', me)); setmat(hull, red); hull.location = (x, y, wz + 0.05); hull.scale = (0.085, 0.2, 0.075)
    for p_ in hull.data.polygons: p_.use_smooth = True
    objs.append(hull)
    objs.append(cyl('boatin', 0.08, 0.008, (x, y, wz + 0.046), m=white, verts=20, bevel=0.0)); objs[-1].scale = (1.0, 2.4, 1.0)
    for dy in (-0.07, 0.06):
        objs.append(box('boatseat', (0.15, 0.04, 0.012), (x, y + dy, wz + 0.05), m=wood, bevel=0.003, segs=1))
    for s in (-1, 1):
        objs.append(plank('oar', (x + s * 0.02, y - 0.12, wz + 0.058), (x + s * 0.035, y + 0.14, wz + 0.06), 0.012, 0.01, (0, 0, 1), wood, jitter=0.0, bevel=0.002))
        objs.append(box('oarblade', (0.03, 0.06, 0.006), (x + s * 0.036, y + 0.15, wz + 0.061), m=wood, bevel=0.002, segs=1))
    objs.append(plank('boatrope', (x + 0.06, y - 0.16, wz + 0.06), (x + 0.24, y - 0.2, wz + 0.1), 0.008, 0.008, (0, 0, 1), C('rope', '#d8c49a', rough=0.9), jitter=0.0, bevel=0.001))


def fountain(objs, x, y, wz, name):
    """The Deluxe's little fountain in the pond: a pale stone basin on a column, a small bowl above, water spilling."""
    stone = C('fountstone', '#ece6d8', rough=0.7, var=0.04); fw = C('fountwater', '#a9dcec', rough=0.05, spec=0.8, coat=0.6)
    objs.append(cyl('fcol', 0.035, 0.22, (x, y, wz + 0.11), m=stone, verts=12, bevel=0.004))
    objs.append(cyl('fbasin', 0.13, 0.04, (x, y, wz + 0.2), m=stone, verts=20, r2=0.1, bevel=0.006))
    objs.append(cyl('fbwater', 0.115, 0.01, (x, y, wz + 0.218), m=fw, verts=20, bevel=0.0))
    objs.append(cyl('fcol2', 0.02, 0.12, (x, y, wz + 0.28), m=stone, verts=10, bevel=0.003))
    objs.append(cyl('fbowl', 0.06, 0.03, (x, y, wz + 0.34), m=stone, verts=16, r2=0.045, bevel=0.004))
    objs.append(sphere('fspout', 0.022, (x, y, wz + 0.37), (1, 1, 1.6), m=fw, seg=10, rings=6))
    for j in range(8):                                    # water spilling over the bowl's rim and the basin's
        a_ = j * 2 * math.pi / 8
        objs.append(cyl('fspill', 0.006, 0.12, (x + math.cos(a_) * 0.062, y + math.sin(a_) * 0.062, wz + 0.28), m=fw, verts=5, bevel=0.0))
        objs.append(cyl('fspill', 0.006, 0.17, (x + math.cos(a_ + 0.4) * 0.128, y + math.sin(a_ + 0.4) * 0.128, wz + 0.11), m=fw, verts=5, bevel=0.0))


def beach_ball(objs, at, wz, r=0.085, name='ball'):
    """The ducks' toy (Audrey, 30 Oct: "add a balloon toy so the ducks play"): a beach ball floating on the pond, six bright
    panels, white caps."""
    x, y = at; cols = ['#e2453c', '#f4c430', '#3d8fd1', '#e2453c', '#f4c430', '#3d8fd1']
    for i in range(6):
        me = bpy.data.meshes.new('ballpanel'); bm = bmesh.new(); nu, nv = 5, 10; vs = []
        for a_ in range(nu + 1):
            lon = (i + a_ / nu) * 2 * math.pi / 6
            vs.append([bm.verts.new((x + r * math.sin(math.pi * b_ / nv) * math.cos(lon), y + r * math.sin(math.pi * b_ / nv) * math.sin(lon), wz + r * 0.8 + r * math.cos(math.pi * b_ / nv))) for b_ in range(nv + 1)])
        for a_ in range(nu):
            for b_ in range(nv): 
                q = (vs[a_][b_], vs[a_ + 1][b_], vs[a_ + 1][b_ + 1], vs[a_][b_ + 1])
                if len(set(q)) == 4:
                    try: bm.faces.new(q)
                    except ValueError: pass
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new(name + 'panel', me)); setmat(o, C('ballc_' + cols[i], cols[i], rough=0.35, spec=0.5)); objs.append(o)
        for p_ in o.data.polygons: p_.use_smooth = True
    for zz in (r * 1.8, -r * 0.2):
        objs.append(sphere(name + 'cap', r * 0.22, (x, y, wz + r * 0.8 + (r if zz > 0 else -r) * 0.98), (1, 1, 0.35), m=C('ballwhite', '#fbf6ee', rough=0.4), seg=10, rings=5))


def houseboat_hull(objs, x0, x1, y0, y1, DK, wl, red, white, deckm):
    """The Cosy's: the raft a little boat, a hull under its deck, flat at the stern (left), a pointed bow out to the right,
    red with a white band, the bow's deck boarded."""
    me = bpy.data.meshes.new('hull'); bm = bmesh.new(); yc = (y0 + y1) / 2
    top = [(x0 - 0.03, y0 - 0.04), (x1 - 0.05, y0 - 0.04), (x1 + 0.34, yc), (x1 - 0.05, y1 + 0.04), (x0 - 0.03, y1 + 0.04)]
    bot = [(x0 + 0.06, y0 + 0.08), (x1 - 0.1, y0 + 0.08), (x1 + 0.12, yc), (x1 - 0.1, y1 - 0.08), (x0 + 0.06, y1 - 0.08)]
    vt = [bm.verts.new((x, y, DK - 0.02)) for x, y in top]; vb = [bm.verts.new((x, y, wl - 0.08)) for x, y in bot]
    for i in range(5):
        j = (i + 1) % 5
        bm.faces.new((vt[i], vt[j], vb[j], vb[i]))
    bm.faces.new(vb[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    h = link(bpy.data.objects.new('hull', me)); setmat(h, red); objs.append(h)
    for i in range(4):                                    # the white band just under the deck
        a, b = Vector((*top[i], DK - 0.045)), Vector((*top[i + 1], DK - 0.045))
        d = (b - a).normalized(); n = Vector((d.y, -d.x, 0))
        objs.append(plank('hullband', a, b, 0.035, 0.012, n, white, jitter=0.0, bevel=0.002))
    me = bpy.data.meshes.new('bowdeck'); bm = bmesh.new()
    vs = [bm.verts.new((x, y, DK - 0.005)) for x, y in ((x1 - 0.02, y0 - 0.03), (x1 + 0.33, yc), (x1 - 0.02, y1 + 0.03))]
    bm.faces.new(vs); bm.to_mesh(me); bm.free()
    bd = link(bpy.data.objects.new('bowdeck', me)); setmat(bd, deckm); objs.append(bd)
    objs.append(cyl('bowpost', 0.02, 0.12, (x1 + 0.2, yc, DK + 0.06), m=white, verts=8, bevel=0.0))


def barrel_roof(objs, eave, Zr, m, m2, trim, over=0.16, go=0.13, n=14):
    """The Cosy's curved houseboat roof: boards along x over a half-ellipse (across y: D2 + over, up: Zr), white arched trim
    at its ends."""
    Y = D2 + over; z0 = eave - 0.06; L = 2 * W2 + 2 * go
    pts = [(Y * math.cos(math.pi * i / n), z0 + Zr * math.sin(math.pi * i / n)) for i in range(n + 1)]
    for i in range(n):
        (ya, za), (yb, zb) = pts[i], pts[i + 1]; ym, zm = (ya + yb) / 2, (za + zb) / 2
        th = math.pi * (i + 0.5) / n; nrm = Vector((0, math.cos(th) / Y, math.sin(th) / Zr)).normalized()
        w = math.hypot(yb - ya, zb - za)
        objs.append(plank('broof', (-L / 2, ym, zm), (L / 2, ym, zm), w * 1.04, 0.025, nrm, m if i % 2 else m2, jitter=0.2, bevel=0.004))
    for sx in (-1, 1):
        for i in range(n):
            (ya, za), (yb, zb) = pts[i], pts[i + 1]
            objs.append(plank('barch', (sx * (L / 2 + 0.01), ya, za), (sx * (L / 2 + 0.01), yb, zb), 0.05, 0.03, (sx, 0, 0), trim, jitter=0.0, bevel=0.004))


def life_ring(objs, x, y, z, normal, white, red):
    """A white life ring with four red bands, hanging on a wall facing `normal` (side: +-x)."""
    n = Vector(normal).normalized(); up = Vector((0, 0, 1)); u = up.cross(n).normalized()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.026, major_segments=24, minor_segments=8, location=(x, y, z))
    tr = bpy.context.object; tr.name = 'lifering'; tr.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); setmat(tr, white)
    for p_ in tr.data.polygons: p_.use_smooth = True
    objs.append(tr)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; c = Vector((x, y, z)) + (u * math.cos(a) + up * math.sin(a)) * 0.085
        tg = (-u * math.sin(a) + up * math.cos(a))
        o = cyl('ringband', 0.029, 0.035, tuple(c), m=red, verts=10, bevel=0.0); o.rotation_euler = tg.to_track_quat('Z', 'Y').to_euler(); objs.append(o)
    objs.append(cyl('ringrope', 0.006, 0.12, (x + n.x * 0.01, y + n.y * 0.01, z + 0.13), m=C('rope', '#d8c49a', rough=0.9), verts=6, bevel=0.0))


def _slope(sy, eave, peak, over):
    """A roof slope's top (r0), the way down it to the eave (down) and its outward normal (ridge along x)."""
    e0 = Vector((0, sy * (D2 + over), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02))
    return r0, e0 - r0, Vector((0, sy * (peak - eave + 0.08), D2 + over)).normalized()


def tin_roof(objs, eave, peak, over=0.16, go=0.13):
    """The Rustic's roof: old corrugated tin sheets over both slopes, a little crooked, rust coming through, a bent ridge strip."""
    tin = C('ftin', '#9fa4a2', rough=0.8, var=0.05); tin2 = C('ftin2', '#8b9190', rough=0.8, var=0.05); rust = C('frust', '#8e5d3e', rough=0.9)
    for sy in (-1, 1):
        r0, down, nrm = _slope(sy, eave, peak, over); n = 18
        for kk in range(n):
            x = -W2 - go + (kk + 0.5) * (2 * W2 + 2 * go) / n
            sag = 0.012 * math.sin(kk * 1.7)
            objs.append(plank('tin', r0 + nrm * 0.03 + Vector((x, 0, 0)), r0 + down * (1.0 + sag) + nrm * 0.03 + Vector((x, 0, 0)), (2 * W2 + 2 * go) / n * 1.02, 0.008, nrm, tin if kk % 2 else tin2, jitter=0.0, bevel=0.0))
        for (u, t, s) in ((-0.3, 0.55, 0.09), (0.35, 0.3, 0.06), (0.1, 0.82, 0.07)):
            c = r0 + down * t + nrm * 0.04 + Vector((u, 0, 0))
            objs.append(plank('rust', c - down.normalized() * s / 2, c + down.normalized() * s / 2, s * 1.4, 0.003, nrm, rust, jitter=0.0, bevel=0.001))
    objs.append(cyl('tinridge', 0.035, 2 * W2 + 2 * go + 0.04, (0, 0, peak + 0.05), (0, math.radians(90), 0), C('ftin3', '#7f8584', rough=0.8), verts=10, bevel=0.0))


def felt_roof(objs, eave, peak, m_roof, felt, ridge_m, over=0.16, go=0.13):
    """The Mended's roof: roofing felt over both slopes, new shingles laid on the lower half of the front so far, a bundle of
    them waiting on the felt."""
    for sy in (-1, 1):
        r0, down, nrm = _slope(sy, eave, peak, over)
        objs.append(plank('felt', r0 + nrm * 0.03, r0 + down + nrm * 0.03, 2 * W2 + 2 * go, 0.01, nrm, felt, jitter=0.0, bevel=0.0))
        if sy > 0: continue
        dn = down.normalized(); rows = int(down.length / 0.075)
        for r in range(rows + 1):
            t = 1 - r / rows
            if t < 0.5: continue
            base = r0 + down * t + nrm * (0.04 + 0.004 * (r % 2))
            n = 12; w = (2 * W2 + 2 * go) / n; off = (w / 2) if r % 2 else 0
            for i in range(n + (1 if r % 2 else 0)):
                x = -W2 - go + off + i * w - (w / 2 if r % 2 else 0) + w / 2
                if abs(x) > W2 + go + 0.01: continue
                objs.append(plank('sh', base + Vector((x, 0, 0)) - dn * 0.06, base + Vector((x, 0, 0)) + dn * 0.06, w * 0.94, 0.018, nrm, m_roof, jitter=1.4, bevel=0.006))
        c = r0 + down * 0.3 + nrm * 0.06 + Vector((0.25, 0, 0))                # (a bundle of shingles waiting)
        for j in range(4):
            objs.append(plank('shbundle', c + nrm * 0.018 * j - dn * 0.07, c + nrm * 0.018 * j + dn * 0.07, 0.2, 0.016, nrm, m_roof, jitter=0.6, bevel=0.004))
    objs.append(cyl('feltridge', 0.03, 2 * W2 + 2 * go + 0.04, (0, 0, peak + 0.05), (0, math.radians(90), 0), ridge_m, verts=10, bevel=0.0))


def lighthouse(objs, x, y, z0, name, white, red, glass, iron, lamp):
    """The Deluxe's little lighthouse at the back of the raft: a round tower in white and red bands, a gallery with a rail, a
    glass lamp room (its lamp lit at night), a red cap with a gold knob."""
    H = 1.5; r0, r1 = 0.17, 0.13; nb = 5
    for i in range(nb):
        za, zb = z0 + H * i / nb, z0 + H * (i + 1) / nb; ra, rb = r0 + (r1 - r0) * i / nb, r0 + (r1 - r0) * (i + 1) / nb
        objs.append(cyl('lhband', ra, zb - za + 0.002, (x, y, (za + zb) / 2), m=red if i % 2 else white, verts=20, r2=rb, bevel=0.0))
    objs.append(cyl('lhgallery', r1 + 0.06, 0.03, (x, y, z0 + H + 0.015), m=iron, verts=20, bevel=0.004))
    for j in range(12):
        a_ = j * 2 * math.pi / 12
        objs.append(cyl('lhrailpost', 0.006, 0.08, (x + math.cos(a_) * (r1 + 0.05), y + math.sin(a_) * (r1 + 0.05), z0 + H + 0.07), m=iron, verts=5, bevel=0.0))
    bpy.ops.mesh.primitive_torus_add(major_radius=r1 + 0.05, minor_radius=0.006, major_segments=24, minor_segments=4, location=(x, y, z0 + H + 0.11))
    objs.append(bpy.context.object); setmat(objs[-1], iron)
    objs.append(cyl('lhroom', r1 - 0.02, 0.16, (x, y, z0 + H + 0.11), m=glass, verts=16, bevel=0.0))
    objs.append(cyl('lhlamp', 0.05, 0.08, (x, y, z0 + H + 0.11), m=lamp, verts=12, bevel=0.0))
    light_at(name, x, y, z0 + H + 0.11)
    for j in range(6):
        a_ = j * 2 * math.pi / 6
        objs.append(cyl('lhmullion', 0.006, 0.16, (x + math.cos(a_) * (r1 - 0.02), y + math.sin(a_) * (r1 - 0.02), z0 + H + 0.11), m=red, verts=4, bevel=0.0))
    objs.append(cyl('lhcap', r1 + 0.02, 0.14, (x, y, z0 + H + 0.26), m=red, verts=20, r2=0.0, bevel=0.0))
    objs.append(sphere('lhknob', 0.025, (x, y, z0 + H + 0.34), m=C('fgold', '#d6ad4a', rough=0.3, metal=0.9), seg=10, rings=6))
    objs.append(box('lhdoor', (0.09, 0.02, 0.16), (x, y - r0 - 0.004, z0 + 0.08), m=C('fnavy', '#2c4a7a', rough=0.6), bevel=0.004, segs=1))


def bunting(objs, a, b, sag, cols, n=None):
    """A string of little flags from a to b, sagging in the middle."""
    a, b = Vector(a), Vector(b); L = (b - a).length; n = n or max(4, int(L / 0.07))
    line = C('rope', '#d8c49a', rough=0.9)
    pts = [a.lerp(b, i / n) - Vector((0, 0, sag * math.sin(math.pi * i / n))) for i in range(n + 1)]
    for p, q in zip(pts, pts[1:]): objs.append(plank('bline', p, q, 0.006, 0.006, (0, 0, 1), line, jitter=0.0, bevel=0.0))
    for i in range(n):
        p = pts[i].lerp(pts[i + 1], 0.5); d = (pts[i + 1] - pts[i]).normalized() * 0.026
        me = bpy.data.meshes.new('flag'); bm = bmesh.new()
        vs = [bm.verts.new(v) for v in (p - d, p + d, p + Vector((0, 0, -0.06)))]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
        fo = link(bpy.data.objects.new('bflag', me)); setmat(fo, C('bflag%d' % (i % len(cols)), cols[i % len(cols)], rough=0.7)); objs.append(fo)


def floating(seed=17, name='house_call', look=2, F=None):
    """The Floating House (look 0..4: Rustic, Mended, Snug, Cosy, Deluxe; name: its model's)."""
    random.seed(seed); objs = []; pobjs = []; t = look; sx = '_%d' % t
    F = dict(FLOAT, **FLOAT_POND.get(t, {}), **(F or {})); P = dict(FLOAT_PAL, **FLOAT_LOOK[t]); FL, WX, DK, EAVE, PEAK = F['FL'], F['WX'], F['deck'], F['eave'], F['peak']
    BZ = 0.46                                            # (the Cosy's curved roof: its height over the eaves)
    if t == 3: PEAK = EAVE - 0.06 + BZ
    k = F['k']; wl = F['water'] / k                      # (the house is drawn full size, then made k as big; wl: the water's level for it)
    LIGHTS.pop(name, None); BLOCKS.pop(name, None); before = set(bpy.data.objects)
    wall = C('fwall' + sx, P['wall'], rough=0.8 if t == 0 else 0.7, var=0.1 if t == 0 else 0.04, grain=0.3 if t < 2 else 0.0, grain_scale=G)
    wall2 = C('fwall2' + sx, P['wall2'], rough=0.8 if t == 0 else 0.7, var=0.1 if t == 0 else 0.04, grain=0.3 if t < 2 else 0.0, grain_scale=G)
    trim = C('ftrim' + sx, P['trim'], rough=0.6); ridge = C('fridge' + sx, P['ridge'], rough=0.7)
    deck = C('fdeck' + sx, P['deck'], rough=0.8, var=0.12, grain=0.35, grain_scale=G); deck2 = C('fdeck2' + sx, P['deck2'], rough=0.8, var=0.1, grain=0.35, grain_scale=G)
    log = C('flog' + sx, P['log'], rough=0.85, var=0.08, grain=0.3, grain_scale=G); door_m = C('fdoor' + sx, P.get('door', P['wall']), rough=0.6, var=0.05)
    glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    brass = C('brass', '#c99a3c', rough=0.3, metal=0.9); rope = C('rope', '#d8c49a', rough=0.9)
    lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    # the pond, and the raft floating in it: logs under a deck of boards (the Rustic's: two old barrels under grey planks)
    pond(pobjs, F, P, seed, t, name)
    x0, x1, y0, y1 = F['raft']
    if t == 0:
        for y in (y0 + 0.2, y1 - 0.2):
            objs.append(cyl('barrel', 0.13, x1 - x0 - 0.2, (0, y, wl + 0.02), (0, math.radians(90), 0), C('fbarrel', '#5d6f86', rough=0.7, var=0.1), verts=16, bevel=0.0))
            for xx in (-0.45, 0.0, 0.45):
                objs.append(cyl('barrelhoop', 0.134, 0.03, (xx, y, wl + 0.02), (0, math.radians(90), 0), C('frust', '#8e5d3e', rough=0.9), verts=16, bevel=0.0))
    elif t == 3:
        houseboat_hull(objs, x0, x1, y0, y1, DK, wl, C('fhull', '#c2453a', rough=0.55, var=0.03), C('fhullw', '#fbf7ee', rough=0.6), deck)
    else:
        for y in (y0 + 0.12, (y0 + y1) / 2, y1 - 0.12):
            objs.append(cyl('rlog', 0.06, x1 - x0 - 0.06, (0, y, wl + 0.01), (0, math.radians(90), 0), log, verts=12, bevel=0.0))
    n = int((y1 - y0) / 0.1); w = (y1 - y0) / n
    for i in range(n):
        y = y0 + (i + 0.5) * w
        if t == 0 and i in (2, 8): continue                                        # (two planks gone: the barrels show)
        xa, xb = (x0 + random.uniform(0, 0.08), x1 - random.uniform(0, 0.1)) if t == 0 else (x0, x1)
        objs.append(plank('rdeck', (xa, y, DK - 0.012), (xb, y, DK - 0.012 + (random.uniform(-0.01, 0.01) if t == 0 else 0)), w * (0.86 if t == 0 else 0.94), 0.024, (0, 0, 1), deck if i % 2 else deck2, jitter=0.8 if t == 0 else 0.4))
    for x in (x0 + 0.05, x1 - 0.05):                      # the battens across its ends
        objs.append(plank('rbatten', (x, y0 - 0.01, DK - 0.035), (x, y1 + 0.01, DK - 0.035), 0.06, 0.03, (1, 0, 0), log, jitter=0.2))
    posts = [(x0 + 0.04, y0 + 0.06), (x0 + 0.04, y1 - 0.04), (x1 - 0.04, y1 - 0.04), (x1 - 0.04, y0 + 0.06)]
    if t in (2, 3):                                      # a rope rail round its back and sides on little posts (the front open)
        for (x, y) in posts:
            objs.append(cyl('rpost', 0.02, 0.22, (x, y, DK + 0.11), m=log, verts=8, bevel=0.0))
            objs.append(sphere('rknob', 0.026, (x, y, DK + 0.225), m=log, seg=8, rings=5))
        for (a, b) in zip(posts, posts[1:]):
            for kr in range(6):                             # (sagging a little between the posts)
                t0, t1 = kr / 6, (kr + 1) / 6; za = DK + 0.19 - 0.035 * math.sin(math.pi * t0); zb = DK + 0.19 - 0.035 * math.sin(math.pi * t1)
                objs.append(plank('rrope', (a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, za), (a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, zb), 0.012, 0.012, (0, 0, 1), rope, jitter=0.0, bevel=0.002))
            if t == 3:                                      # (the Cosy's: bunting along it)
                bunting(objs, (a[0], a[1], DK + 0.2), (b[0], b[1], DK + 0.2), 0.035, ['#e2574c', '#f4c430', '#3d8e9a', '#fbf7ee', '#f08bb0'])
    if t == 4:                                           # the Deluxe's white rail: posts, a top rail and a middle one
        for (a, b) in zip(posts, posts[1:]):
            L = math.hypot(b[0] - a[0], b[1] - a[1]); np_ = max(2, int(L / 0.2))
            for j in range(np_ + 1):
                px, py = a[0] + (b[0] - a[0]) * j / np_, a[1] + (b[1] - a[1]) * j / np_
                objs.append(box('wrailpost', (0.03, 0.03, 0.22), (px, py, DK + 0.11), m=C('fwhite4', '#fbf8f1', rough=0.6), bevel=0.004, segs=1))
            for zz in (DK + 0.21, DK + 0.12):
                objs.append(plank('wrail', (a[0], a[1], zz), (b[0], b[1], zz), 0.03, 0.02, (0, 0, 1), C('fwhite4', '#fbf8f1', rough=0.6), jitter=0.0, bevel=0.003))
    # the house on the deck: weatherboards (cut round the ducks' door and the nest window), corner boards (the Rustic's: grey,
    # some bare, two gone; the Mended's: new pine, the lower rows painted so far)
    gaps = [(-0.31 - POP_W / 2 - 0.03, -0.31 + POP_W / 2 + 0.03, FL - 0.02, FL + POP_H + 0.05), (WX - WIN_W / 2 - 0.03, WX + WIN_W / 2 + 0.03, FL + 0.02, FL + 0.48)]
    bare = C('fbare', P.get('bare', '#b3a58e'), rough=0.85, var=0.1, grain=0.35, grain_scale=G)
    paint = C('fpaint' + sx, P.get('paint', P['wall']), rough=0.7, var=0.04); paint2 = C('fpaint2' + sx, P.get('paint2', P['wall2']), rough=0.7, var=0.04)
    def board_m(row, side):
        if t == 0: return bare if random.random() < 0.18 else (wall if row % 2 else wall2)
        if t == 1 and row < (5 if side in ('f', 'l') else 3): return paint if row % 2 else paint2
        return wall if row % 2 else wall2
    z = DK; row = 0; h = 0.07
    while z < EAVE - 0.01:
        zc = z + h / 2
        for y, sgn in ((-D2, -1), (D2, 1)):
            spans = [(-W2, W2)]
            if sgn < 0:
                for (a, b, c, d) in gaps:
                    if c < zc < d: spans = [s for sp in spans for s in ((sp[0], min(sp[1], a)), (max(sp[0], b), sp[1])) if s[1] - s[0] > 0.03]
            for a, b in spans:
                objs.append(plank('fboard', (a, y + sgn * 0.012, zc), (b, y + sgn * 0.012, zc), h + 0.008, 0.016, (0, sgn, 0.14), board_m(row, 'f' if sgn < 0 else 'b'), jitter=0.5 if t == 0 else 0.1, bevel=0.003))
        for x, sgn in ((-W2, -1), (W2, 1)):
            if t == 0 and sgn > 0 and row in (4, 7): continue                          # (two boards gone on its right)
            objs.append(plank('fboard', (x + sgn * 0.012, -D2, zc), (x + sgn * 0.012, D2, zc), h + 0.008, 0.016, (sgn, 0, 0.14), board_m(row, 'l' if sgn < 0 else 'r'), jitter=0.5 if t == 0 else 0.1, bevel=0.003))
        z += h; row += 1
    core = box('core', (2 * W2 - 0.03, 2 * D2 - 0.03, EAVE - DK), (0, 0, (EAVE + DK) / 2), m=C('finside', '#3a2e26', rough=1.0), bevel=0.0); objs.append(core)
    for sx_ in (-1, 1):
        for sy in (-1, 1):
            objs.append(plank('fcorner', (sx_ * (W2 + 0.02), sy * (D2 + 0.02), DK), (sx_ * (W2 + 0.02), sy * (D2 + 0.02), EAVE), 0.06, 0.03, (sx_, sy, 0), trim if t else wall2, jitter=0.1))
    # the gables and the roof (Rustic: rusty tin; Mended: felt, half shingled; the others: shingles in their colour)
    for sx_ in (-1, 1):
        ng = 8
        for i in range(ng):
            y = -D2 + (i + 0.5) * 2 * D2 / ng; top = EAVE + (PEAK - EAVE) * (1 - abs(y) / D2) - 0.03
            if t == 3: top = EAVE - 0.06 + BZ * math.sqrt(max(0.0, 1 - (abs(y) + D2 / ng / 2) ** 2 / (D2 + 0.16) ** 2)) - 0.02      # (under the Cosy's curved roof)
            gm = (bare if i % 3 == 0 else wall2) if t == 0 else wall2
            objs.append(plank('fgable', (sx_ * W2, y, EAVE - 0.02), (sx_ * W2, y, top), 2 * D2 / ng * 0.96, 0.03, (sx_, 0, 0), gm, jitter=0.8 if t == 0 else 0.4))
    roof_m = C('fshingle' + sx, P['roof'] if P['roof'] not in ('tin', 'half') else FLOAT_PAL['roof'], rough=0.7, var=0.1, hue_var=0.01)
    if t == 0: tin_roof(objs, EAVE, PEAK)
    elif t == 1: felt_roof(objs, EAVE, PEAK, roof_m, C('ffelt', '#4a4f55', rough=0.9, var=0.04), ridge)
    elif t == 3:
        barrel_roof(objs, EAVE, BZ, roof_m, C('fshingle3b', '#4a9ba7', rough=0.7, var=0.08), trim)
        objs.append(cyl('stovepipe', 0.035, 0.32, (-0.38, 0.22, EAVE - 0.06 + BZ * 0.85 + 0.12), m=C('fpipe', '#9ea4a6', rough=0.4, metal=0.7), verts=12, bevel=0.0))
        objs.append(cyl('pipecap', 0.06, 0.05, (-0.38, 0.22, EAVE - 0.06 + BZ * 0.85 + 0.3), m=C('fpipe', '#9ea4a6', rough=0.4, metal=0.7), verts=12, r2=0.02, bevel=0.0))
    else: shingle_roof(objs, EAVE, PEAK, roof_m, trim, ridge, over=0.16, gable_over=0.13)
    # the windows in its sides: a porthole each (the Rustic's: a square hole boarded across)
    for s in (-1, 1):
        zp = 0.52; xp = s * (W2 + 0.03)
        if t == 0:
            objs.append(box('fhole', (0.02, 0.14, 0.12), (xp - s * 0.01, 0.08, zp), m=C('finside', '#3a2e26', rough=1.0), bevel=0.0))
            _across(objs, xp + s * 0.005, 0.08, zp, 0.16, s)
            continue
        objs.append(cyl('porthole', 0.075, 0.02, (xp, 0.08, zp), (0, math.radians(90), 0), m=glass, verts=20, bevel=0.0))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.016, major_segments=20, minor_segments=6, location=(xp + s * 0.008, 0.08, zp))
        tr = bpy.context.object; tr.name = 'portrim'; tr.rotation_euler = (0, math.radians(90), 0); setmat(tr, trim if t == 1 else brass); objs.append(tr)
        if t == 3:                                       # (the Cosy's: a flower box under each)
            objs.append(box('flowerbox', (0.09, 0.2, 0.07), (xp + s * 0.04, 0.08, zp - 0.13), m=C('fbox3', '#3d8e9a', rough=0.6), bevel=0.008, segs=1))
            for j in range(6):
                u = -0.08 + j * 0.032
                objs.append(sphere('leafp', 0.03, (xp + s * 0.04, 0.08 + u, zp - 0.085), (1, 1, 0.8), m=C('fleaf', '#4f8a3a', rough=0.8), ico=1, disp=0.2, seed=j))
                fc = ('#e2574c', '#fbf6ee', '#f08bb0')[j % 3]
                objs.append(sphere('flower', 0.022, (xp + s * 0.05, 0.08 + u + 0.008, zp - 0.06), m=C('fflower_' + fc, fc, rough=0.6), ico=1))
    # the nest window and the ducks' door with their gangplank, straight down over the deck and the water to the bank
    nest_window(objs, 'call', FL, WX, trim, solids=[core], ramp_len=F['ramp'])
    rampw = C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G) if t else C('fdeck_0', P['deck'], rough=0.8, var=0.12, grain=0.35, grain_scale=G)
    if t == 4:                                            # (the Deluxe: Monet's bridge from the door to the bank, in its place)
        pop_trim(objs, FL, trim, D2)
        foot = -(D2 + 0.05 + F['ramp']) * k
        monet_bridge(pobjs, -0.31 * k, -(D2 + 0.03) * k, (FL + 0.012) * k, foot, 0.03, name)
    else: pop_door(objs, FL, trim, rampw, C('darkwood', '#6d4a31', rough=0.8), length=F['ramp'])
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 14, 0.0)
    if t >= 2:
        life_ring(objs, -W2 - 0.05, -0.18, 0.5, (-1, 0, 0), C('ringwhite', P['ring'], rough=0.6), C('ringred', P['ringr'], rough=0.6))
        objs.append(cyl('mast', 0.012, 0.36, (W2 + 0.04, 0, PEAK + 0.2), m=trim, verts=8, bevel=0.0))      # a pennant at the ridge's right end
        objs.append(sphere('mastknob', 0.02, (W2 + 0.04, 0, PEAK + 0.385), m=brass, seg=8, rings=5))
        me = bpy.data.meshes.new('pennant'); bm = bmesh.new()
        vs = [bm.verts.new(v) for v in ((W2 + 0.05, 0, PEAK + 0.36), (W2 + 0.05, 0, PEAK + 0.25), (W2 + 0.27, 0.03, PEAK + 0.31))]
        bm.faces.new(vs); bm.to_mesh(me); bm.free()
        pn = link(bpy.data.objects.new('pennant', me)); setmat(pn, C('pennant' + sx, P['flag'], rough=0.7)); objs.append(pn)
        lx, ly = x0 + 0.16, y0 + 0.08                    # a lantern on a post at the raft's front left corner
        objs.append(cyl('lpost', 0.022, 0.8, (lx, ly, DK + 0.4), m=log if t < 4 else C('fwhite4', '#fbf8f1', rough=0.6), verts=8, bevel=0.0))
        objs.append(box('larm', (0.12, 0.025, 0.025), (lx + 0.05, ly, DK + 0.77), m=iron, bevel=0.004, segs=1))
        light_at(name, lx + 0.1, ly, DK + 0.7)
        objs.append(box('lantern', (0.07, 0.07, 0.09), (lx + 0.1, ly, DK + 0.7), m=lamp, bevel=0.006, segs=1))
        objs.append(box('lcap', (0.09, 0.09, 0.02), (lx + 0.1, ly, DK + 0.755), m=iron, bevel=0.004, segs=1))
        pot = C('fpot', '#c8734a', rough=0.85, var=0.08)
        pots = [(x1 - 0.1, y0 + 0.1, 0.06), (x1 - 0.1, y0 + 0.27, 0.05)] + ([(x1 - 0.26, y0 + 0.09, 0.05)] if t >= 3 else [])
        for kp, (x, y, r) in enumerate(pots):
            objs.append(cyl('pot', r, r * 1.5, (x, y, DK + r * 0.75), m=pot, verts=12, r2=r * 0.78, bevel=0.004))
            objs.append(sphere('leafp', r * 0.95, (x, y, DK + r * 1.6), (1, 1, 0.75), m=C('fleaf', '#4f8a3a', rough=0.8), ico=1, disp=0.25, seed=kp))
            for j in range(5):
                a_ = j * 2 * math.pi / 5 + kp
                fc = ('#f4c430', '#fbf6ee', '#e2574c')[(j + kp) % 3] if t >= 3 else ('#f4c430', '#fbf6ee')[j % 2]
                objs.append(sphere('flower', 0.02, (x + math.cos(a_) * r * 0.6, y + math.sin(a_) * r * 0.6, DK + r * 1.95), m=C('fflower_' + fc, fc, rough=0.6), ico=1))
    if t == 0:                                            # an old bucket and a coil of rope on the deck
        objs.append(cyl('bucket', 0.07, 0.12, (x1 - 0.14, y0 + 0.14, DK + 0.06), m=C('fbucket', '#8e9492', rough=0.6, metal=0.5), verts=14, r2=0.055, bevel=0.003))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.014, major_segments=16, minor_segments=5, location=(x0 + 0.16, y1 - 0.15, DK + 0.014))
        objs.append(bpy.context.object); setmat(objs[-1], rope)
    if t == 1:                                            # a pot of paint and its brush, a stack of new boards, a ladder against its right side
        objs.append(cyl('paintpot', 0.06, 0.1, (x1 - 0.14, y0 + 0.13, DK + 0.05), m=C('fpaintpot', '#c4c9cc', rough=0.4, metal=0.5), verts=14, bevel=0.003))
        objs.append(cyl('paintin', 0.054, 0.01, (x1 - 0.14, y0 + 0.13, DK + 0.1), m=paint, verts=14, bevel=0.0))
        objs.append(plank('brush', (x1 - 0.17, y0 + 0.13, DK + 0.09), (x1 - 0.02, y0 + 0.1, DK + 0.14), 0.02, 0.012, (0, 0, 1), C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), jitter=0.0, bevel=0.003))
        for j in range(4):
            objs.append(plank('newboard', (x0 + 0.06, y1 - 0.16 + 0.002 * j, DK + 0.012 + 0.018 * j), (x0 + 0.5, y1 - 0.14, DK + 0.012 + 0.018 * j), 0.08, 0.016, (0, 0, 1), wall if j % 2 else wall2, jitter=0.5))
        lad = C('fladder', '#b8935f', rough=0.8, grain=0.3, grain_scale=G)
        for dy in (-0.12, 0.12):
            objs.append(plank('ladder', (W2 + 0.3, dy - 0.1, DK), (W2 + 0.05, dy - 0.1, EAVE + 0.05), 0.035, 0.025, (1, 0, 0.3), lad, jitter=0.2))
        for j in range(6):
            u = (j + 0.6) / 6.6; xx = W2 + 0.3 - 0.25 * u; zz = DK + (EAVE + 0.05 - DK) * u
            objs.append(plank('rung', (xx, -0.23, zz), (xx, 0.03, zz), 0.025, 0.02, (0, 0, 1), lad, jitter=0.2))
    if t >= 3:                                            # the automatic door: its box over the ducks' door, a solar panel on the roof
        box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
        zb = FL + POP_H + 0.07
        objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.045, zb), m=box_m, bevel=0.008, segs=1))
        objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, zb), m=led, seg=8, rings=4))
        r0, down, nrm = _slope(-1, EAVE, PEAK, 0.16); dn = down.normalized()
        c = r0 + down * 0.45 + nrm * 0.06 + Vector((0.32, 0, 0))
        if t == 3:                                       # (on the curved roof, its front, high up)
            th = math.radians(118); Y = D2 + 0.16
            nrm = Vector((0, math.cos(th) / Y, math.sin(th) / BZ)).normalized(); dn = Vector((0, math.sin(th) * Y, -math.cos(th) * BZ)).normalized()
            if dn.z > 0: dn = -dn
            c = Vector((0.32, Y * math.cos(th), EAVE - 0.06 + BZ * math.sin(th))) + nrm * 0.035
        objs.append(plank('solarframe', c - dn * 0.1, c + dn * 0.1, 0.25, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
        cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
        for i in range(2):
            for j in range(3):
                cc = c + nrm * 0.012 + dn * (-0.05 + i * 0.1) + Vector((-0.08 + j * 0.08, 0, 0))
                objs.append(plank('solarcell', cc - dn * 0.044, cc + dn * 0.044, 0.072, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    if t == 4:                                            # a ship's wheel on its right side, a brass bell, the lighthouse at the back
        wheel = C('fwheel', '#8a5a33', rough=0.6, grain=0.3, grain_scale=G); wx_, wy_, wz_ = W2 + 0.04, -0.2, 0.47
        bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.012, major_segments=24, minor_segments=6, location=(wx_, wy_, wz_))
        tr = bpy.context.object; tr.rotation_euler = (0, math.radians(90), 0); setmat(tr, wheel); objs.append(tr)
        for j in range(8):
            a_ = j * math.pi / 4
            objs.append(plank('spoke', (wx_ + 0.005, wy_, wz_), (wx_ + 0.005, wy_ + math.cos(a_) * 0.13, wz_ + math.sin(a_) * 0.13), 0.014, 0.014, (1, 0, 0), wheel, jitter=0.0, bevel=0.003))
        objs.append(cyl('hub', 0.025, 0.03, (wx_ + 0.01, wy_, wz_), (0, math.radians(90), 0), m=brass, verts=12, bevel=0.003))
        objs.append(cyl('bellpost', 0.016, 0.5, (x1 - 0.28, y0 + 0.08, DK + 0.25), m=C('fwhite4', '#fbf8f1', rough=0.6), verts=8, bevel=0.0))
        objs.append(cyl('bell', 0.045, 0.07, (x1 - 0.22, y0 + 0.08, DK + 0.44), m=brass, verts=14, r2=0.025, bevel=0.003))
        objs.append(box('bellarm', (0.08, 0.015, 0.015), (x1 - 0.25, y0 + 0.08, DK + 0.49), m=iron, bevel=0.003, segs=1))
        lighthouse(objs, x0 + 0.2, y1 - 0.2, DK, name, C('fwhite4', '#fbf8f1', rough=0.6), C('lhred', '#c9453b', rough=0.6), glass, iron, lamp)
    # all of it but the pond k as big (about the middle), and what the browser is told of it the same
    for o in objs + [c for c in bpy.data.objects if c not in before and c.name.startswith('cut_')]:      # (the nest's cutters too)
        o.location = o.location * k; o.scale = o.scale * k
    sc = lambda v: round(v * k, 3) if isinstance(v, (int, float)) else [sc(u) for u in v] if isinstance(v, list) else v
    NESTS['house_call'] = {kk: sc(v) for kk, v in NESTS['house_call'].items()}
    NESTS['house_call'].update(wall=round(D2 * k, 3), scale=k)          # (for the browser: its front wall, and the pop door drawn k as big)
    LIGHTS[name] = [sc(v) for v in LIGHTS.get(name, [])]
    return finish(objs + pobjs, name)


def box_call(): return floating(name='box_call', look=0)
def shed_call(): return floating(name='shed_call', look=1)
def cosy_call(): return floating(name='cosy_call', look=3)
def deluxe_call(): return floating(name='deluxe_call', look=4)


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


BARN_EAVE, BARN_PEAK = 1.14, 1.58          # the Red Barn's walls 12 cm taller than at first, its front roof shorter (coop.OVER_FRONT):
                                          # its nest window clear of the roof from the game's camera (Audrey's polish list, 27 Oct)


def red_barn(**kw):
    """The Red Barn (coop.build) with its nests inside, behind a window right of the barn door (kw: coop.build's eave,
    peak and roof, for the two-storey Deluxe)."""
    kw.setdefault('eave', BARN_EAVE); kw.setdefault('peak', BARN_PEAK)
    wx, FL = 0.445, 0.40
    r = coop.build((0, 0, 0), 0.0, seed=5, pen=False, window=(wx - WIN_W / 2, wx + WIN_W / 2, FL + 0.05, FL + 0.05 + WIN_H), **kw)
    objs = []; nest_window(objs, 'rir', FL, wx, coop.M()['white'], hollow=True, ramp_len=0.67, door='drop', door_m=coop.M()['red'])
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = r; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return r


HOUSES = {'rir': red_barn, 'orp': thatched, 'leg': stone, 'sil': pagoda, 'bra': lodge, 'pol': windmill, 'aya': joglo, 'call': floating}
LATER = ['pol', 'aya', 'call']                           # (release 7's coops: exported after the rest; the call ducks' Floating House, 30 Oct)


def pop_slider(style):
    """The pop door's sliding door, shut: it fills the opening (POP_W x POP_H) and the browser slides it up out of sight by
    day (cut off at the opening's top, as if it ran up inside the wall). Boards with a Z brace in the house's colours (the
    pagoda: a red lattice over paper, like its nest screen), an iron ring to pull it by. At the origin: x across, bottom at
    z=0, the boards' front face at y=0, facing -y."""
    random.seed(31); objs = []; cm = coop.M()
    m, trim = {'rir': (cm['red'], cm['white']), 'orp': (C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G), C('oakdark', '#47301f', rough=0.8)),
               'leg': (C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G), C('trimw', '#efe9dc', rough=0.6)),
               'bra': (C('lodgedoor', '#6d4326', rough=0.75, var=0.08, grain=0.3, grain_scale=G), C('lodgetrim', '#e8dcc0', rough=0.7)),
               'sil': (C('lacquer', '#b0312a', rough=0.4, coat=0.3), None),
               'pol': (C('milldoor', '#2f6a4f', rough=0.55, var=0.05, grain=0.2, grain_scale=G), C('trimw', '#efe9dc', rough=0.6)),
               'aya': (C('jg_teakd', '#5e3a20', rough=0.8, var=0.06, grain=0.3, grain_scale=G), C('jg_gold', '#c9a24a', rough=0.35, metal=0.7)),
               'call': (C('fdoor_2', FLOAT_PAL['door'], rough=0.6, var=0.05), C('ftrim_2', FLOAT_PAL['trim'], rough=0.6))}[style]      # (the browser draws the ducks' k as big)
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
    W2, D2, FL, EAVE, PEAK = 0.62, 0.44, 0.40, BARN_EAVE, BARN_PEAK
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
    e0 = Vector((0, sy * (D2 + coop.OVER_FRONT), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02)); down = e0 - r0; dn = down.normalized()
    nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + coop.OVER_FRONT)).normalized()
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


# ---- the other breeds' coops as they first come, rustic too (release 1 step 6, 25 Oct 2026: each new breed arrives with
# its own rustic coop). Each house is built again with every colour weathered (faded, greyer, rougher: paint and
# limewash gone dull, the roofs bleached), some of its boards, posts or logs gone bare and grey, then a few touches of its
# own: moss and gaps in the Thatched Cottage's thatch, a sheet of tin over the Stone Cottage's slates and the Timber
# Lodge's shingles with moss here and there, boards nailed across a window, torn paper in the Pagoda's lattice. The pen's
# fence is the rustic one they all share.
import colorsys


def _fade(hexc, s_k=0.55, v_k=0.88, grey=0.22):
    h = hexc.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, ss, vv = colorsys.rgb_to_hsv(r, g, b); r, g, b = colorsys.hsv_to_rgb(hh, ss * s_k, vv * v_k)
    r, g, b = (c * (1 - grey) + w * grey for c, w in zip((r, g, b), (0.56, 0.51, 0.44)))
    return '#%02x%02x%02x' % tuple(int(max(0.0, min(1.0, c)) * 255 + 0.5) for c in (r, g, b))


_KEEP = {'lamp'}                                  # (the lantern still lights up at night)


def _rustic_C(name, hexc, rough=0.75, **kw):
    key = 'rw_' + name
    if key not in _m:
        if name in _KEEP: _m[key] = mat(key, hexc, rough=rough, **kw)
        elif name == 'glass': _m[key] = mat(key, RUSTIC['glass'], rough=0.35, spec=0.4)
        else:
            kw = dict(kw); kw.pop('coat', None)
            if kw.get('metal'): kw['metal'] = 0.3
            kw['var'] = max(kw.get('var', 0.0), 0.08)
            _m[key] = mat(key, _fade(hexc), rough=min(1.0, rough + 0.12), **kw)
    return _m[key]


def _bare_bits(root, names, p, seed):
    """Some of its boards, posts or logs gone bare and grey."""
    random.seed(seed)
    bare = _rmat('bare'); grey = _rmat('wood')
    for o in root.children_recursive:
        if o.type == 'MESH' and o.name.split('.')[0] in names and random.random() < p:
            o.data.materials.clear(); o.data.materials.append(bare if random.random() < 0.6 else grey)


def _moss_shingles(root, p, seed):
    random.seed(seed); moss = _rmat('moss', rough=0.95, grain=0.0, bump=0.4, bump_scale=80, var=0.1)
    for o in root.children_recursive:
        if o.type == 'MESH' and o.name.split('.')[0] == 'sh' and random.random() < p:
            o.data.materials.clear(); o.data.materials.append(moss)


def _tin_sheet(objs, eave, peak, over, xa, xb, ta, tb):
    """A sheet of corrugated tin over part of the front slope of a shingle roof, a few rust spots on it."""
    sy = -1
    e0 = Vector((0, sy * (D2 + over), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02)); down = e0 - r0; dn = down.normalized()
    nrm = Vector((0, sy * (peak - eave + 0.08), D2 + over)).normalized()
    tin = mat('r_tin3', '#a8adab', rough=0.75, var=0.04); tin2 = mat('r_tin4', '#929896', rough=0.75, var=0.04); rust = mat('r_rust2', '#8e5d3e', rough=0.9)
    n = 14
    for k in range(n):
        x = xa + (k + 0.5) * (xb - xa) / n
        a = r0 + down * ta + nrm * 0.056 + Vector((x, 0, 0)); b = r0 + down * tb + nrm * 0.056 + Vector((x, 0, 0))
        objs.append(plank('tin', a, b, (xb - xa) / n * 1.01, 0.008, nrm, tin if k % 2 else tin2, jitter=0.0, bevel=0.0))
    for (u, t, s) in ((0.25, 0.62, 0.035), (0.68, 0.3, 0.025)):
        x = xa + (xb - xa) * u; c = r0 + down * (ta + (tb - ta) * t) + nrm * 0.066 + Vector((x, 0, 0))
        objs.append(plank('rust', c - dn * s / 2, c + dn * s / 2, s * 1.3, 0.003, nrm, rust, jitter=0.0, bevel=0.001))


def _boards(objs, x, ys, z0, z1, side, slant=0.03):
    """Bare boards nailed upright on a side wall at x (side: +1 or -1), a little crooked."""
    bare = _rmat('bare')
    for k, y in enumerate(ys):
        objs.append(plank('patch', (x, y, z0), (x, y + (slant if k % 2 else -slant), z1), 0.075, 0.02, (side, 0, 0), bare, jitter=0.8))


def _across(objs, x, y, z, w, side):
    """Two bare boards nailed in a cross over a side window."""
    bare = _rmat('bare')
    for s in (-1, 1):
        objs.append(plank('patch', (x, y - w / 2, z - s * w * 0.42), (x, y + w / 2, z + s * w * 0.42), 0.055, 0.02, (side, 0, 0), bare, jitter=0.5))


def rustic_house(k, seed=21):
    """A breed's house as it first comes (k: orp, leg, sil, bra), rustic."""
    global C
    keep = C; C = _rustic_C
    try: r = HOUSES[k]()
    finally: C = keep
    objs = []
    if k == 'orp':                                 # Thatched Cottage: posts gone grey, moss and gaps in the thatch, side boards
        _bare_bits(r, {'post', 'rail', 'spost', 'srail', 'brace', 'sbrace'}, 0.3, seed)
        random.seed(seed + 1)
        sc = [o for o in r.children_recursive if o.name.split('.')[0] == 'scallop']
        for o in random.sample(sc, min(4, len(sc))): bpy.data.objects.remove(o, do_unlink=True)
        moss = _rmat('moss', rough=0.95, grain=0.0, bump=0.4, bump_scale=80, var=0.1)
        EAVE, PEAK = 0.9, 1.5
        e = Vector((0, -(D2 + 0.22), EAVE - 0.1)); top = Vector((0, 0, PEAK)); nrm = Vector((0, -(PEAK - EAVE + 0.1), D2 + 0.22)).normalized()
        moss = mat('r_moss2', '#5c6b43', rough=0.95, var=0.12, bump=0.4, bump_scale=80)
        for i, (x, t, sz) in enumerate(((-0.5, 0.8, 0.07), (-0.42, 0.9, 0.05), (-0.3, 0.84, 0.045), (0.05, 0.92, 0.05), (0.34, 0.78, 0.065), (0.44, 0.88, 0.05), (0.6, 0.83, 0.04))):
            c = top.lerp(e, t) + nrm * 0.135 + Vector((x, 0, 0))
            objs.append(sphere('mossy', sz, c, (1.3, 1.0, 0.45), (math.atan2(-nrm.y, nrm.z), 0, 0), m=moss, ico=2, disp=0.35, seed=i + 3))
        _boards(objs, W2 + 0.05, (-0.26, 0.2), 0.32, 0.72, 1)
        _boards(objs, -W2 - 0.05, (-0.1,), 0.3, 0.7, -1)
    elif k == 'leg':                               # Stone Cottage: slates faded with moss, a tin patch, boards over the side window
        _moss_shingles(r, 0.07, seed)
        _tin_sheet(objs, 0.86, 1.4, 0.13, -0.5, -0.08, 0.3, 0.8)
        _across(objs, W2 + 0.075, 0.0, 0.55, 0.26, 1)
    elif k == 'sil':                               # Pagoda: torn paper in the lattice, boards on a side window, faded lacquer
        random.seed(seed)
        torn = mat('r_paper', '#b9a57c', rough=0.9, var=0.1)
        for o in r.children_recursive:
            if o.type == 'MESH' and o.name.split('.')[0] == 'paper' and random.random() < 0.6:
                o.data.materials.clear(); o.data.materials.append(torn)
        _across(objs, -W2 - 0.045, 0.0, 0.46, 0.3, -1)
        _boards(objs, W2 + 0.04, (-0.3, 0.3), 0.22, 0.6, 1)
    elif k == 'bra':                               # Timber Lodge: logs gone grey, moss on the shingles, a tin patch, a boarded window
        _bare_bits(r, {'log', 'gable'}, 0.18, seed)
        _moss_shingles(r, 0.08, seed + 1)
        _tin_sheet(objs, 0.88, 1.44, 0.2, 0.12, 0.55, 0.25, 0.75)
        _across(objs, W2 + 0.1, 0.0, 0.5, 0.28, 1)
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = r; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    r.name = 'rustic_' + k
    return r




# ---- release 4 (Audrey: "Coops to work on", the Red Barn first): its five looks, Rustic -> Mended -> Snug -> Cosy -> Deluxe.
# Audrey on the first try (26 Oct): "They are all far too similar. Be creative, the size of the parc around the coop
# perhaps"; then "Yes, build that": the pen grows with every step and each step's building is clearly different.
# Rustic (box_rir, pen_t0, fence_t0): a tiny pen with a broken fence, the old crate (Audrey, 25 Oct: "literally a box and a
#   nest something quite miserable"), the barn's hint two faded red planks; a tin basin for water, no hay.
# Mended (shed_rir, pen_t1, fence_t1): a small pen, its fence patched with new rails; a little lean-to shed, new boards, half
#   painted red (a paint tin and brush by it), a felt roof.
# Snug (house_rir, pen_base, fence): today's pen and Red Barn.
# Cosy (cosy_rir, pen_t3, fence_t3): a bigger pen with grass at its edges and flowers along the fence; the barn's trim
#   painted sage green, a covered porch on its side with a bench and a hanging lantern, a window box, flower pots, a lantern
#   by the hens' door, stepping stones.
# Deluxe (deluxe_rir, pen_t4, fence_t4): the biggest pen, white pickets, roses over the gate, flower borders, bunting; the
#   Cosy barn with a cupola on its roof (the weathervane on top).
# The hens come, go and lay the same way in every look: the same floor, pop door, nest window and ramp foot (nest_window).
# Each pen's layout (box, gate, feeder, dish, hay, sack) goes to coops.json for the browser.
BARN = dict(grey='#9a8f80', grey2='#857a6c', grey3='#b0a48f', red='#9e5244', red2='#874437', brick='#9c5a43', block='#8e8d88',
            stump='#6e5440', cut='#c9b18a', pine='#d6b47e', pine2='#c7a26b', felt='#3e3d3b', sage='#93b49a', pot='#c06a43',
            stone='#aba596', tinbowl='#9aa0a2', grass='#7da34f', grass2='#6a9444', cupola='#f1e9d8', louvre='#5b4a3a')
PENS = {
    0: dict(box=(-1.05, 1.1, -1.72, 0.62), gate=1, feeder=(0.66, -1.2), dish=(-0.78, -1.32), hay=None, hay_rot=0, sack=None,
            straw=((-0.6, -0.95, 0.25, 25), (0.3, -1.4, 0.25, 20))),
    1: dict(box=(-1.36, 1.46, -2.05, 0.7), gate=2, feeder=(0.98, -1.38), dish=(-0.9, -1.55), hay=None, hay_rot=0, sack=(1.08, 0.25),
            straw=((-0.8, -1.2, 0.3, 30), (0.4, -1.75, 0.3, 25))),
    3: dict(box=(-2.0, 2.15, -2.85, 0.85), gate=3, feeder=(1.5, -1.6), dish=(0.55, -2.35), hay=(1.7, 0.45), hay_rot=90, sack=None,
            straw=((1.7, 0.45, 0.4, 40), (-0.3, -1.25, 0.35, 40), (0.9, -0.8, 0.4, 30))),
    4: dict(box=(-2.3, 2.45, -3.2, 0.95), gate=4, feeder=(1.75, -1.7), feeder_style='deluxe', dish=(1.0, -2.55), fountain=True, hay=(1.95, 0.45), hay_rot=90,
            sack=None, pebbles=10, straw=((-0.3, -1.4, 0.3, 25), (1.95, 0.45, 0.4, 40))),
}


def _barn_m(key, rough=0.85, **kw):
    return mat('bx_' + key, BARN[key], rough=rough, var=kw.pop('var', 0.1), grain=kw.pop('grain', 0.3), grain_scale=G, **kw)


def _own(objs, root):
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw


def _swap(root, names, m):
    """Each part made of one of the materials `names` (by name) in material m instead."""
    for o in root.children_recursive:
        if o.type != 'MESH': continue
        for i, mm in enumerate(o.data.materials):
            if mm is not None and mm.name.split('.')[0] in names: o.data.materials[i] = m


def pen_layout(t, k='rir'):
    """A look's pen (t: 0..4; 2 is the Snug pen, the farm's own layout) for breed k's coop (the call ducks' Snug its own: its
    pond where the shared one has straw)."""
    import farm_layout
    if t == 2 and 2 in PENS_BY.get(k, {}): return dict(PENS_BY[k][2])
    return dict(farm_layout.NEW['pen']) if t == 2 else dict(PENS_BY[k][t])


def _gate_of(t, k='rir'):
    """The middle of a look's gate and its front fence's line (Blender x, y)."""
    keep = coop.PEN; coop.PEN = pen_layout(t, k)
    try: return coop.gate_span()[1], coop.PEN['box'][2]
    finally: coop.PEN = keep


def box_barn(seed=31):
    """Rustic: an old crate and a nest."""
    random.seed(seed)
    FL, TOP = 0.40, 0.95
    root = empty('box_rir'); objs = []
    greys = [_barn_m('grey'), _barn_m('grey2'), _barn_m('grey3')]; reds = [_barn_m('red'), _barn_m('red2')]
    dark = C('hall_dark', '#1d1510', rough=1.0)
    blockm = _barn_m('block', rough=0.95, grain=0.0, bump=0.3, bump_scale=60); brick = _barn_m('brick', rough=0.9, grain=0.0, bump=0.2, bump_scale=80)
    for (x, y) in ((-W2 + 0.1, -D2 + 0.1), (-W2 + 0.1, D2 - 0.1), (W2 - 0.1, D2 - 0.1)):
        if y < 0:
            for k in range(6):
                objs.append(box('brick', (0.19, 0.09, 0.065), (x + random.uniform(-0.015, 0.015), y + random.uniform(-0.01, 0.01), 0.0325 + k * 0.066), (0, 0, math.radians(random.uniform(-6, 6))), m=brick, bevel=0.006, segs=1))
        else:
            for k in range(2):
                objs.append(box('cblock', (0.2, 0.2, 0.198), (x, y, 0.1 + k * 0.2), (0, 0, math.radians(random.uniform(-5, 5))), m=blockm, bevel=0.01, segs=1))
    sx, sy = W2 - 0.11, -D2 + 0.11
    objs.append(cyl('stump', 0.1, FL, (sx, sy, FL / 2), m=_barn_m('stump', grain=0.5), verts=12, bevel=0.01))
    objs.append(cyl('stumptop', 0.098, 0.006, (sx, sy, FL - 0.002), m=_barn_m('cut', grain=0.0), verts=12, bevel=0.0))
    for i in range(6):
        y = -D2 + 0.07 + i * (2 * D2 - 0.14) / 5
        objs.append(plank('floor', (-W2 - 0.02, y, FL), (W2 + 0.02, y, FL), 0.12 + random.uniform(-0.02, 0.02), 0.04, (0, 0, 1), random.choice(greys)))
    I = 0.035
    for (size, loc) in (((2 * W2 - 2 * I, 0.01, TOP - FL), (0, -D2 + I, (FL + TOP) / 2)), ((2 * W2 - 2 * I, 0.01, TOP - FL), (0, D2 - I, (FL + TOP) / 2)),
                        ((0.01, 2 * D2 - 2 * I, TOP - FL), (W2 - I, 0, (FL + TOP) / 2)), ((0.01, 2 * D2 - 2 * I, TOP - FL), (-W2 + I, 0, (FL + TOP) / 2))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    POPH = (-0.31 - POP_W / 2, -0.31 + POP_W / 2, FL, FL + POP_H)
    WINH = (0.445 - WIN_W / 2 - 0.01, 0.445 + WIN_W / 2 + 0.01, FL + 0.04, FL + 0.04 + WIN_H)
    def boards(u0, u1, place, out, holes=(), red_rows=(), skip=()):
        z, row = FL + 0.01, 0
        while z < TOP - 0.03:
            h = random.uniform(0.075, 0.105); g = random.uniform(0.008, 0.024)
            zc = z + h / 2
            if row not in skip:
                spans = [(u0, u1)]
                for hx0, hx1, hz0, hz1 in holes:
                    if zc + h / 2 > hz0 and zc - h / 2 < hz1:
                        spans = [s_ for sp in spans for s_ in ((sp[0], min(sp[1], hx0)), (max(sp[0], hx1), sp[1])) if s_[1] - s_[0] > 0.04]
                for (a, b) in spans:
                    m = random.choice(reds) if row in red_rows else random.choice(greys)
                    tilt = random.uniform(-0.008, 0.008)
                    objs.append(plank('board', place(a, zc - tilt), place(b, zc + tilt), h, 0.022, out, m, jitter=0.5))
            z += h + g; row += 1
    boards(-W2, W2, lambda u, v: (u, -D2 - 0.01, v), (0, -1, 0), holes=(POPH, WINH), red_rows=(1, 4))
    boards(-W2, W2, lambda u, v: (u, D2 + 0.01, v), (0, 1, 0), skip=(3,))
    boards(-D2, D2, lambda u, v: (W2 + 0.01, u, v), (1, 0, 0), red_rows=(2,))
    boards(-D2, D2, lambda u, v: (-W2 - 0.01, u, v), (-1, 0, 0), skip=(4,), red_rows=(1,))
    for (x, y) in ((-W2, -D2), (W2, -D2), (-W2, D2), (W2, D2)):
        objs.append(box('cpost', (0.045, 0.045, TOP - FL + random.uniform(-0.04, 0.02)), (x, y, (FL + TOP) / 2), m=random.choice(greys), bevel=0.006, segs=1))
    objs.append(plank('loose', (0.1, D2 + 0.035, 0.74), (0.5, D2 + 0.035, 0.62), 0.085, 0.02, (0, 1, 0), greys[1], jitter=1.0))
    tin = mat('bx_tin', '#a9aeac', rough=0.75, var=0.04); tin2 = mat('bx_tin2', '#939997', rough=0.75, var=0.04); rust = mat('bx_rust', '#94603f', rough=0.9)
    ya, yb, za, zb, xa, xb = -D2 - 0.12, D2 + 0.1, TOP + 0.075, TOP + 0.005, -W2 - 0.09, W2 + 0.06
    nrm = Vector((0, za - zb, yb - ya)).normalized(); n = 18
    for k in range(n):
        x = xa + (k + 0.5) * (xb - xa) / n; tw = 0.012 * (k / n - 0.5)
        objs.append(plank('tin', (x, ya, za + tw), (x, yb, zb - tw), (xb - xa) / n * 1.02, 0.008, nrm, tin if k % 2 else tin2, jitter=0.0, bevel=0.0))
    for (x, y, s) in ((-0.3, -0.2, 0.09), (0.25, 0.15, 0.06), (0.5, -0.35, 0.05), (-0.45, 0.3, 0.07)):
        z = za + (zb - za) * (y - ya) / (yb - ya) + 0.011
        objs.append(plank('rust', (x - s / 2, y, z), (x + s / 2, y, z), s * 1.1, 0.003, nrm, rust, jitter=0.0, bevel=0.001))
    zt = za + (zb - za) * (0.1 - ya) / (yb - ya)
    objs.append(box('brick', (0.19, 0.09, 0.065), (0.15, 0.1, zt + 0.045), (math.atan2(za - zb, yb - ya), 0, math.radians(20)), m=brick, bevel=0.006, segs=1))
    objs.append(sphere('rock', 0.06, (-0.42, -0.05, zt + 0.05), (1.2, 1, 0.7), m=_barn_m('block', rough=0.95, grain=0.0), ico=2, disp=0.3, seed=4))
    ra, rb = Vector((-0.31, -D2 - 0.05, FL + 0.02)), Vector((-0.31, -D2 - 0.72, 0.03))
    pn = Vector((0, -0.5, 0.86)).normalized()
    objs.append(plank('ramp', ra, rb, 0.17, 0.03, pn, greys[2], jitter=0.6))
    for t in (0.35, 0.7):
        c = ra.lerp(rb, t) + pn * 0.02
        objs.append(plank('slat', c + Vector((-0.07, 0, 0)), c + Vector((0.07, 0, 0)), 0.022, 0.016, pn, greys[1], jitter=3.0))
    nest_window(objs, 'rir', FL, 0.445, greys[1], hollow=True, ramp_len=0.67, door='drop', door_m=greys[0])
    _own(objs, root)
    return root


def shed_barn(seed=33):
    """Mended: a little lean-to shed of new boards, half painted red, a felt roof sloping to the front."""
    random.seed(seed)
    FL, ZF, ZB = 0.40, 1.0, 1.27
    root = empty('shed_rir'); objs = []
    red = coop.M()['red']; pine = _barn_m('pine', rough=0.75, var=0.08); pine2 = _barn_m('pine2', rough=0.75, var=0.08)
    felt = _barn_m('felt', rough=0.9, grain=0.0, bump=0.25, bump_scale=90, var=0.05); dark = C('hall_dark', '#1d1510', rough=1.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(box('leg', (0.075, 0.075, FL), (sx * (W2 - 0.05), sy * (D2 - 0.05), FL / 2), m=pine2, bevel=0.01))
    for i in range(7):
        y = -D2 + 0.06 + i * (2 * D2 - 0.12) / 6
        objs.append(plank('floor', (-W2 - 0.03, y, FL), (W2 + 0.03, y, FL), 0.13, 0.045, (0, 0, 1), coop.M()['wood']))
    top = lambda y: ZF + (ZB - ZF) * (y + D2) / (2 * D2)          # the walls' tops, following the roof
    POPH = (-0.31 - POP_W / 2, -0.31 + POP_W / 2, FL, FL + POP_H)
    WINH = (0.445 - WIN_W / 2, 0.445 + WIN_W / 2, FL + 0.04, FL + 0.04 + WIN_H)
    BW = 0.105
    def wall(u0, u1, place, out, ztop, painted, holes=()):
        n = int(round((u1 - u0) / BW)); w = (u1 - u0) / n
        for i in range(n):
            u = u0 + (i + 0.5) * w; ul, ur = u - w / 2, u + w / 2; z1 = ztop(u)
            m = red if painted(u, i) else (pine if i % 3 else pine2)
            pieces = [(ul, ur, FL + 0.02, z1)]
            for (hx0, hx1, hz0, hz1) in holes:
                nxt = []
                for (a, b, za, zb) in pieces:
                    if a < hx1 and b > hx0:
                        if a < hx0: nxt.append((a, hx0, za, zb))
                        if b > hx1: nxt.append((hx1, b, za, zb))
                        c0, c1 = max(a, hx0), min(b, hx1)
                        nxt += [(c0, c1, za, hz0), (c0, c1, hz1, zb)]
                    else: nxt.append((a, b, za, zb))
                pieces = nxt
            for (a, b, za, zb) in pieces:
                if b - a > 0.012 and zb - za > 0.01:
                    objs.append(plank('wall', place((a + b) / 2, za), place((a + b) / 2, zb), (b - a) * 0.96, 0.03, out, m, jitter=0.4))
    edge = lambda u, i: u < 0.02 + 0.05 * math.sin(u * 9)          # (the paint stops at a wavy line: half done)
    wall(-W2, W2, lambda u, v: (u, -D2, v), (0, -1, 0), lambda u: ZF, edge, holes=(POPH, WINH))
    wall(-W2, W2, lambda u, v: (u, D2, v), (0, 1, 0), lambda u: ZB, lambda u, i: u < -0.1)
    wall(-D2, D2, lambda u, v: (-W2 - 0.015, u, v), (-1, 0, 0), top, lambda u, i: True)
    wall(-D2, D2, lambda u, v: (W2 + 0.015, u, v), (1, 0, 0), top, lambda u, i: u > 0.12)
    for (size, loc) in (((2 * W2 - 0.08, 0.01, 0.55), (0, D2 - 0.04, FL + 0.28)), ((0.01, 2 * D2 - 0.08, 0.5), (W2 - 0.04, 0, FL + 0.26)), ((0.01, 2 * D2 - 0.08, 0.5), (-W2 + 0.04, 0, FL + 0.26))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    for (x, y) in ((-W2, -D2), (W2, -D2), (-W2, D2), (W2, D2)):
        objs.append(box('cpost', (0.06, 0.06, top(y) - FL), (x + 0.01 * (1 if x > 0 else -1), y + 0.01 * (1 if y > 0 else -1), (FL + top(y)) / 2), m=pine2, bevel=0.008))
    # the roof: boards under black felt in three strips, battens over the joins, a fascia board along the front
    a0, b0 = Vector((0, -D2 - 0.17, ZF + 0.02)), Vector((0, D2 + 0.12, ZB + 0.06)); ax = b0 - a0; nr = Vector((0, -(ZB - ZF + 0.04), D2 * 2 + 0.29)).normalized()
    for k in range(3):
        p0 = a0 + ax * (k / 3) - ax.normalized() * 0.02; p1 = a0 + ax * ((k + 1) / 3) + ax.normalized() * 0.02
        c = (p0 + p1) / 2 + nr * (0.012 * k)
        objs.append(plank('felt', c + Vector((-W2 - 0.12, 0, 0)), c + Vector((W2 + 0.12, 0, 0)), (p1 - p0).length, 0.03, nr, felt, jitter=0.0, bevel=0.004))
    for k in range(4):
        x = -W2 - 0.1 + k * (2 * W2 + 0.2) / 3
        objs.append(plank('batten', a0 + Vector((x, 0, 0)) + nr * 0.05, b0 + Vector((x, 0, 0)) + nr * 0.05, 0.035, 0.02, nr, pine2, jitter=0.3))
    objs.append(plank('fascia', (-W2 - 0.13, -D2 - 0.18, ZF - 0.02), (W2 + 0.13, -D2 - 0.18, ZF - 0.02), 0.08, 0.025, (0, -1, 0), pine, jitter=0.2))
    # the hens' door: a plain frame, a ramp with slats
    pop_trim(objs, FL, pine2, D2)
    ra, rb = Vector((-0.31, -D2 - 0.05, FL + 0.02)), Vector((-0.31, -D2 - 0.72, 0.03))
    objs.append(plank('ramp', ra, rb, 0.2, 0.03, (0, -0.5, 0.86), pine, jitter=0.3))
    pn = Vector((0, -0.5, 0.86)).normalized()
    for k in range(5):
        c = ra.lerp(rb, (k + 0.6) / 5.6) + pn * 0.022
        objs.append(plank('slat', c + Vector((-0.09, 0, 0)), c + Vector((0.09, 0, 0)), 0.022, 0.018, pn, pine2, jitter=1.5))
    nest_window(objs, 'rir', FL, 0.445, pine2, hollow=True, ramp_len=0.67, door='drop', door_m=pine)
    # the paint tin and its brush on the ground behind, a drip of red down its side
    tin = mat('bx_painttin', '#c9cdcf', rough=0.4, metal=0.7)
    px, py = W2 + 0.2, D2 + 0.12
    objs.append(cyl('ptin', 0.07, 0.13, (px, py, 0.065), m=tin, verts=16, bevel=0.005))
    objs.append(cyl('ppaint', 0.064, 0.006, (px, py, 0.131), m=red, verts=16, bevel=0.0))
    objs.append(box('pdrip', (0.022, 0.004, 0.06), (px + 0.03, py - 0.068, 0.1), m=red, bevel=0.002, segs=1))
    objs.append(box('brush', (0.03, 0.2, 0.012), (px - 0.08, py + 0.14, 0.012), (0, 0, math.radians(30)), m=pine2, bevel=0.003, segs=1))
    objs.append(box('bristle', (0.05, 0.05, 0.02), (px - 0.13, py + 0.05, 0.014), (0, 0, math.radians(30)), m=red, bevel=0.004, segs=1))
    _own(objs, root)
    return root


def _cosy_bits(r, name, t, seed=35, porch=True, eave=None, peak=None, box_z=None, over=None):
    """What makes the barn cosy: sage trim, a porch with a bench and a lantern on its left side (not on the two-storey
    Deluxe), a window box (at box_z) on the right gable, a lantern by the hens' door, the automatic door's box over it and
    its little solar panel on the roof (Audrey, 27 Oct: "starting at cosy the coop door are automatic"), flower pots,
    stepping stones."""
    random.seed(seed)
    eave = BARN_EAVE if eave is None else eave; peak = BARN_PEAK if peak is None else peak; box_z = eave - 0.04 if box_z is None else box_z
    sage = mat('bx_sage', BARN['sage'], rough=0.6, spec=0.25, var=0.04, grain=0.12, grain_scale=G)
    _swap(r, {'trim'}, sage)
    objs = []
    fl = [C('dxf%d' % i, FLOWERS[i], rough=0.5) for i in range(6)]
    leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    iron = C('iron', '#26231f', rough=0.5, metal=0.6); lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    wood = coop.M()['wood']; dark = coop.M()['darkwood']; slate = coop.M()['roof']
    # the porch: a little roof of slates out from the left gable on two posts, a bench under it, a lantern hanging from it
    x0, x1, zh, zl, yy = -W2 - 0.03, -W2 - 0.82, 0.98, 0.76, 0.56
    if porch: _porch(objs, name, sage, wood, dark, slate, iron, lamp, x0, x1, zh, zl, yy)
    # the automatic door: its motor box over the hens' door (a little green light), its solar panel on the front slope
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.045, 0.925), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, 0.925), m=led, seg=8, rings=4))
    objs.append(cyl('autocable', 0.005, eave - 0.96, (-0.36, -D2 - 0.03, (eave + 0.96) / 2), m=box_m, verts=5, bevel=0.0))
    ov = coop.OVER_FRONT if over is None else over                 # (the slates' overhang at the front; the Deluxe's copper roof its own)
    e0 = Vector((0, -(D2 + ov), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02)); dn = (e0 - r0).normalized()
    nrm = Vector((0, -(peak - eave + 0.08), D2 + ov)).normalized()
    c = r0 + (e0 - r0) * 0.62 + nrm * 0.075 + Vector((-0.34, 0, 0))
    objs.append(plank('solarframe', c - dn * 0.1, c + dn * 0.1, 0.25, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for i in range(2):
        for j in range(3):
            cc = c + nrm * 0.012 + dn * (-0.05 + i * 0.1) + Vector((-0.08 + j * 0.08, 0, 0))
            objs.append(plank('solarcell', cc - dn * 0.044, cc + dn * 0.044, 0.072, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # a window box under the round window in the right gable (under the upstairs window on the Deluxe)
    bxw, bzw = W2 + 0.07, box_z
    objs.append(box('flowerbox', (0.09, 0.32, 0.07), (bxw, 0.0, bzw), m=sage, bevel=0.008, segs=1))
    for k in range(8):
        y = -0.13 + k * 0.037
        objs.append(sphere('leafp', 0.03, (bxw, y, bzw + 0.045), (1, 1, 0.8), m=leaf[k % 2], ico=1, disp=0.2, seed=k))
        objs.append(sphere('flower', 0.021, (bxw + 0.01, y + 0.01, bzw + 0.07), m=fl[k % 6], ico=1))
    # a lantern by the hens' door
    lx, ly, lz = -0.545, -D2 - 0.1, 0.72
    objs.append(box('larm', (0.025, 0.1, 0.025), (lx, -D2 - 0.05, lz + 0.07), m=iron, bevel=0.004, segs=1))
    objs.append(box('lanternb', (0.07, 0.07, 0.1), (lx, ly, lz), m=iron, bevel=0.006, segs=1))
    objs.append(box('lanterng', (0.076, 0.076, 0.065), (lx, ly, lz), m=lamp, bevel=0.0))
    objs.append(cyl('lroof', 0.06, 0.05, (lx, ly, lz + 0.075), (0, 0, math.pi / 4), m=iron, verts=4, r2=0.0, bevel=0.0))
    light_at(name, lx, ly, lz)
    # flower pots either side of the foot of the ramp (the birds walk round them)
    potm = _barn_m('pot', rough=0.8, grain=0.0)
    for (x, y) in ((-0.62, -D2 - 0.62), (0.02, -D2 - 0.62)):
        objs.append(cyl('pot', 0.07, 0.11, (x, y, 0.055), m=potm, verts=14, r2=0.055, bevel=0.006))
        for k in range(6):
            aa = k / 6 * math.tau
            objs.append(sphere('potleaf', 0.035, (x + math.cos(aa) * 0.035, y + math.sin(aa) * 0.035, 0.13), (1, 1, 0.8), m=leaf[k % 2], ico=1, disp=0.25, seed=k + 10))
            objs.append(sphere('potflower', 0.022, (x + math.cos(aa + 0.5) * 0.04, y + math.sin(aa + 0.5) * 0.04, 0.16), m=fl[(k + 2) % 6], ico=1))
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.12])
    # stepping stones from the foot of the ramp across the yard
    stone = _barn_m('stone', rough=0.9, grain=0.0, bump=0.2, bump_scale=60, var=0.12)
    gx, gy = _gate_of(t); a, b = Vector((-0.31, -1.3)), Vector((gx, gy + 0.32)); n = max(3, round((b - a).length / 0.25))
    for k in range(n + 1):
        q = a.lerp(b, k / n); x, y = q.x + 0.06 * math.sin(k * 1.7), q.y
        objs.append(sphere('stepstone', 0.085, (x + random.uniform(-0.02, 0.02), y, 0.014), (1.15 + random.uniform(-0.15, 0.15), 0.95, 0.12), (0, 0, random.uniform(0, 3)), m=stone, ico=2, disp=0.18, seed=k + 40))
    _own(objs, r)
    return r


def _porch(objs, name, sage, wood, dark, slate, iron, lamp, x0, x1, zh, zl, yy):
    for sy in (-1, 1):
        objs.append(box('ppost', (0.07, 0.07, zl), (x1 + 0.06, sy * (yy - 0.08), zl / 2), m=sage, bevel=0.01))
    objs.append(plank('pbeam', (x1 + 0.06, -yy, zl - 0.02), (x1 + 0.06, yy, zl - 0.02), 0.07, 0.05, (0, 0, 1), sage, jitter=0.2))
    a, b = Vector((x0, 0, zh)), Vector((x1, 0, zl)); dn = (b - a); nr = Vector((-(zh - zl), 0, -(x0 - x1))).normalized()
    if nr.z < 0: nr = -nr
    objs.append(plank('pboards', a - dn.normalized() * 0.02 + nr * 0.012, b + dn.normalized() * 0.03 + nr * 0.012, 2 * yy + 0.02, 0.02, nr, wood, jitter=0.0))
    rows = 5; hl = dn.length / rows * 0.66
    for rr in range(rows):
        u = (rr + 0.5) / rows; base = a + dn * u + nr * (0.025 + 0.008 * (rows - rr))
        n = 9; w = 2 * yy / n
        for i in range(n + (1 if rr % 2 else 0)):
            y = -yy + (i + 0.5) * w - (w / 2 if rr % 2 else 0)
            yc = max(-yy + w * 0.25, min(yy - w * 0.25, y)); ww = w - 2 * abs(y - yc)
            objs.append(plank('sh', base + Vector((0, yc, 0)) - dn.normalized() * hl, base + Vector((0, yc, 0)) + dn.normalized() * hl, ww * 0.95, 0.018, nr, slate, jitter=1.2, bevel=0.006))
    for sy in (-1, 1):
        objs.append(plank('pbarge', a + Vector((0, sy * (yy + 0.02), 0.03)), b + Vector((0, sy * (yy + 0.02), 0.03)), 0.07, 0.025, (0, sy, 0), sage, jitter=0.2))
    bx = (x0 + x1) / 2 - 0.02
    objs.append(box('bench', (0.2, 0.7, 0.04), (bx, 0.0, 0.25), m=wood, bevel=0.01, segs=1))
    objs.append(box('benchback', (0.03, 0.7, 0.16), (bx + 0.09, 0.0, 0.42), (0, math.radians(-10), 0), m=wood, bevel=0.008, segs=1))
    for sy in (-1, 1):
        objs.append(box('benchleg', (0.18, 0.04, 0.25), (bx, sy * 0.3, 0.125), m=dark, bevel=0.006, segs=1))
    objs.append(cyl('pchain', 0.006, 0.1, (x1 + 0.06, 0.0, zl - 0.09), m=iron, verts=6, bevel=0.0))
    objs.append(box('lanternb', (0.07, 0.07, 0.1), (x1 + 0.06, 0.0, zl - 0.19), m=iron, bevel=0.006, segs=1))
    objs.append(box('lanterng', (0.076, 0.076, 0.065), (x1 + 0.06, 0.0, zl - 0.19), m=lamp, bevel=0.0))
    light_at(name, x1 + 0.06, 0.0, zl - 0.19)


def cosy_barn():
    r = red_barn(); _cosy_bits(r, 'cosy_rir', 3); r.name = 'cosy_rir'
    return r


# the Deluxe's roof (Audrey, 27 Oct: "change the material of the roof to something more noble"): three to choose from,
# each with its cupola roof to match: copper gone green with standing seams, cedar shakes, fish-scale slates
NOBLE = dict(copper=('#5c9a86', '#77b29e', '#4d8574'), cedar=('#b98652', '#a0703f', '#8a5d33'), scallop=('#454b55', '#565d68', '#373c44'))
DELUXE_ROOF = os.environ.get('DELUXE_ROOF', 'copper')


def _noble_m(kind, k):
    c = NOBLE[kind][k]
    if kind == 'copper': return mat('nr_cu%d' % k, c, rough=0.42, spec=0.45, metal=0.25, var=0.06)
    if kind == 'cedar': return mat('nr_ce%d' % k, c, rough=0.85, var=0.16, hue_var=0.01, grain=0.4, grain_scale=G)
    return mat('nr_sl%d' % k, c, rough=0.6, spec=0.35, var=0.1)


def noble_roof(kind):
    def roof(objs, W2, D2, EAVE, PEAK):
        m0, m1, m2 = (_noble_m(kind, k) for k in range(3)); trim = coop.M()['white']
        X0, X1 = -W2 - 0.16, W2 + 0.16
        for sy in (-1, 1):
            e0 = Vector((0, sy * (D2 + 0.16), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02))
            down = e0 - r0; slope = down.length; dn = down.normalized()
            nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + 0.16)).normalized()
            if kind != 'copper':                                   # boards under the shakes or the slates
                objs.append(plank('rboards', r0 + nrm * 0.02 - dn * 0.01, e0 + nrm * 0.02 + dn * 0.02, X1 - X0, 0.02, nrm, m2, jitter=0.0, bevel=0.0))
            if kind == 'copper':                                   # long panels, raised seams between them, a rolled edge at the eave
                n = 10; w = (X1 - X0) / n
                for i in range(n):
                    x = X0 + (i + 0.5) * w
                    objs.append(plank('cu', r0 + Vector((x, 0, 0)) + nrm * 0.03, e0 + Vector((x, 0, 0)) + nrm * 0.03, w * 1.002, 0.02, nrm, m0 if i % 3 else m2, jitter=0.0, bevel=0.003))
                for i in range(n + 1):
                    x = X0 + i * w
                    objs.append(plank('seam', r0 + Vector((x, 0, 0)) + nrm * 0.055, e0 + Vector((x, 0, 0)) + nrm * 0.055, 0.04, 0.014, (1, 0, 0), m1, jitter=0.0, bevel=0.004))
                objs.append(cyl('cuedge', 0.02, X1 - X0 + 0.02, e0 + nrm * 0.035, (0, math.radians(90), 0), m=m1, verts=8, bevel=0.0))
            elif kind == 'cedar':                                  # rows of shakes, each its own length and shade
                rows = int(slope / 0.07)
                for r_ in range(rows + 1):
                    base = r0 + down * (1 - r_ / rows) + nrm * (0.035 + 0.005 * (r_ % 2))
                    x = X0
                    while x < X1 - 0.02:
                        w = random.uniform(0.07, 0.13); w = min(w, X1 - x)
                        L = random.uniform(0.11, 0.14)
                        a = base + Vector((x + w / 2, 0, 0)) - dn * L / 2; b = base + Vector((x + w / 2, 0, 0)) + dn * L / 2
                        objs.append(plank('sh', a, b, w * 0.93, 0.02, nrm, random.choice((m0, m0, m1, m2)), jitter=2.2, bevel=0.004))
                        x += w
            else:                                                  # fish-scale slates: round-bottomed, each row on top of the one below
                rows = int(slope / 0.058); n = 13; w = (X1 - X0) / n; rr = w * 0.56
                for r_ in range(rows + 1):
                    t = 1 - r_ / rows
                    if t * slope < rr * 0.6: continue
                    base = r0 + down * t + nrm * (0.03 + 0.0025 * r_)
                    off = w / 2 if r_ % 2 else 0
                    for i in range(n + 1):
                        x = X0 + i * w + off
                        if x < X0 + w * 0.3 or x > X1 - w * 0.3: continue
                        c = base + Vector((x, 0, 0)); me = bpy.data.meshes.new('scale'); bm = bmesh.new()
                        vs = [bm.verts.new(c + (Vector((math.cos(a), 0, 0)) * rr + (-dn) * (math.sin(a) * rr))) for a in [k / 10 * math.tau for k in range(10)]]
                        f = bm.faces.new(vs)
                        bm.normal_update()
                        if f.normal.dot(nrm) < 0: f.normal_flip()
                        bm.to_mesh(me); bm.free()
                        o = link(bpy.data.objects.new('scale', me)); setmat(o, random.choice((m0, m0, m1))); objs.append(o)
            for sx in (-1, 1):
                objs.append(plank('barge', r0 + Vector((sx * (W2 + 0.17), 0, 0.05)), e0 + Vector((sx * (W2 + 0.17), 0, 0)), 0.09, 0.03, (sx, 0, 0), trim, jitter=0.2))
        objs.append(cyl('ridgecap', 0.045, 2 * W2 + 0.36, (0, 0, PEAK + 0.065), (0, math.radians(90), 0), m1 if kind == 'copper' else m2, verts=14, bevel=0.0))
    return roof


def deluxe_barn(kind=None):
    """Deluxe (Audrey, 27 Oct: "Instead of the extension the coop can have a second floor"): the barn a storey taller (a
    belt of trim between the floors, a hayloft door with a hoist beam above the barn door, a window upstairs on the right
    gable with its flowers), a noble roof, a cupola on the ridge (the weathervane on its top: export's top_of); the cosy
    touches but no porch."""
    kind = kind or DELUXE_ROOF
    EAVE, PEAK = 1.5, 1.94
    r = red_barn(eave=EAVE, peak=PEAK, roof=noble_roof(kind))
    m = coop.M(); trim, red, dark = m['white'], m['red'], m['darkwood']
    objs = []
    for sy in (-1, 1):                                             # the belt between the floors
        objs.append(plank('belt', (-W2 - 0.05, sy * (D2 + 0.035), 1.06), (W2 + 0.05, sy * (D2 + 0.035), 1.06), 0.05, 0.025, (0, sy, 0), trim))
    for sx in (-1, 1):
        objs.append(plank('belt', (sx * (W2 + 0.035), -D2 - 0.05, 1.06), (sx * (W2 + 0.035), D2 + 0.05, 1.06), 0.05, 0.025, (sx, 0, 0), trim))
    lx0, lx1, lz0, lz1, yd = -0.08, 0.23, 1.13, 1.42, -D2 - 0.03     # the hayloft door, above the barn door
    for i in range(3):
        x = lx0 + (i + 0.5) * (lx1 - lx0) / 3
        objs.append(plank('ldoor', (x, yd, lz0), (x, yd, lz1), (lx1 - lx0) / 3 * 0.95, 0.025, (0, -1, 0), red, jitter=0.3))
    yt = yd - 0.022
    for (p, q) in [((lx0, yt, lz0), (lx1, yt, lz0)), ((lx0, yt, lz1), (lx1, yt, lz1)), ((lx0, yt, lz0), (lx0, yt, lz1)), ((lx1, yt, lz0), (lx1, yt, lz1)),
                   ((lx0, yt - 0.004, lz0), (lx1, yt - 0.004, lz1)), ((lx1, yt - 0.008, lz0), (lx0, yt - 0.008, lz1))]:
        objs.append(plank('xtrim', p, q, 0.045, 0.022, (0, -1, 0), trim, jitter=0.2))
    hx = (lx0 + lx1) / 2                                           # the hoist: a beam out over it, a pulley, a rope and hook
    objs.append(box('hoist', (0.05, 0.3, 0.05), (hx, -D2 - 0.12, 1.47), m=dark, bevel=0.008, segs=1))
    objs.append(cyl('pulley', 0.032, 0.02, (hx, -D2 - 0.24, 1.42), (0, math.radians(90), 0), m=coop.M()['metal'], verts=12, bevel=0.0))
    objs.append(cyl('rope', 0.006, 0.26, (hx, -D2 - 0.27, 1.29), m=coop.M()['twine'], verts=5, bevel=0.0))
    objs.append(box('hook', (0.03, 0.012, 0.04), (hx, -D2 - 0.27, 1.15), m=coop.M()['metal'], bevel=0.004, segs=1))
    for sx in (-1, 1):                                             # a window upstairs in each gable, flowers under it
        window(objs, sx * (W2 + 0.035), 0.0, 1.27, 0.22, 0.24, trim, m['glass'], normal=(sx, 0, 0), box_flowers=(trim,) + tuple(C('dxf%d' % i, FLOWERS[i], rough=0.5) for i in range(6)) if sx < 0 else None)
    _own(objs, r)
    _cosy_bits(r, 'deluxe_rir', 4, porch=False, eave=EAVE, peak=PEAK, box_z=1.1, over=0.16)
    objs = []
    white = mat('bx_cupola', BARN['cupola'], rough=0.6, var=0.04, grain=0.12, grain_scale=G); louvre = _barn_m('louvre', rough=0.85)
    z0 = PEAK + 0.02; s = 0.3; h = 0.26
    objs.append(box('cbase', (s + 0.06, s + 0.1, 0.12), (0, 0, z0 - 0.02), m=white, bevel=0.01))          # (its saddle over the ridge)
    objs.append(box('cbody', (s, s, h), (0, 0, z0 + 0.04 + h / 2), m=white, bevel=0.012))
    for (nx, ny) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for k in range(4):
            z = z0 + 0.09 + k * 0.045
            if nx: objs.append(box('louvre', (0.012, s * 0.62, 0.022), (nx * (s / 2 + 0.004), 0, z), m=louvre, bevel=0.002, segs=1))
            else: objs.append(box('louvre', (s * 0.62, 0.012, 0.022), (0, ny * (s / 2 + 0.004), z), m=louvre, bevel=0.002, segs=1))
    zt = z0 + 0.04 + h
    objs.append(box('ccap', (s + 0.08, s + 0.08, 0.03), (0, 0, zt + 0.015), m=white, bevel=0.008))
    objs.append(cyl('croof', (s + 0.12) / math.sqrt(2), 0.2, (0, 0, zt + 0.13), (0, 0, math.pi / 4), m=_noble_m(kind, 0), verts=4, r2=0.0, bevel=0.0))
    objs.append(sphere('cball', 0.022, (0, 0, zt + 0.235), m=_noble_m(kind, 1) if kind == 'copper' else C('gold', '#d4a640', rough=0.3, metal=0.9), seg=10, rings=6))
    # two little lanterns either side of the hayloft door
    iron = C('iron', '#26231f', rough=0.5, metal=0.6); lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    for x in (lx0 - 0.09, lx1 + 0.09):
        objs.append(box('lanternb', (0.06, 0.06, 0.085), (x, -D2 - 0.08, 1.3), m=iron, bevel=0.005, segs=1))
        objs.append(box('lanterng', (0.066, 0.066, 0.055), (x, -D2 - 0.08, 1.3), m=lamp, bevel=0.0))
        objs.append(cyl('lroof', 0.05, 0.04, (x, -D2 - 0.08, 1.363), (0, 0, math.pi / 4), m=iron, verts=4, r2=0.0, bevel=0.0))
        objs.append(box('larm', (0.02, 0.06, 0.02), (x, -D2 - 0.045, 1.37), m=iron, bevel=0.003, segs=1))
        light_at('deluxe_rir', x, -D2 - 0.08, 1.3)
    _own(objs, r)
    r.name = 'deluxe_rir'
    return r


# ---- the hens' play things (Audrey, 27 Oct: "Starting at the cosy one, add a swing in their garden that they can perch on.
# Come with ideas like this cute fun that they interact with"; she chose all four: "Dust bath", "Hanging treat ball",
# "Climbing perch ladder", "Pecking xylophone"). Cosy and Deluxe: the swing, the dust bath, a cabbage hanging from a post;
# Deluxe also: a climbing ladder of perches and a little xylophone. The swing's perch and the cabbage move (their own
# models, swing_seat and cabbage, hung from their pivot at the origin); PLAY gives where each is (Blender x, y) and
# play_info what the browser needs (glTF axes).
PLAY = {3: dict(swing=(-1.3, -1.15), tub=(1.45, -2.35), cabbage=(1.0, -0.95)),
        4: dict(swing=(-1.55, -1.5), dust=(-1.5, -0.12), cabbage=(1.05, -0.95), xylo=(-1.2, -2.45))}
# (each breed's coop its own garden: Audrey, 27 Oct, on the Thatched Cottage: "try not to get the same configuration of the
# toys/accessories for each coop": the same pens, fences and gates, their things in other places and other styles)
PENS_BY = {'rir': PENS}
PLAY_BY = {'rir': PLAY}
# (Audrey, 27 Oct, on the Deluxe: "a weird egg on its right? Its garden looks too messy and busy. We can probably get rid
# of the perchoir. The send bath should be bigger and a bit more obvious that it's a send bath. Use the left space next to
# the coop": no feed sack in the Cosy and Deluxe pens, no ladder, one bale tucked behind the barn, few straws and
# pebbles; the sand bath a sandbox with a beach umbrella, a bucket and spade: in the Deluxe, beside the barn on its left)
SAND_W, SAND_D = 0.9, 0.7                                       # the sandbox (x, y)
# (Audrey, then: "For the cosy revert the old send bath": the Cosy's is the half-barrel of sand again, in its yard; the
# Deluxe's the sandbox)
SWING_TOP, SWING_PERCH, SWING_HALF = 0.56, 0.14, 0.32           # the top bar, the perch's height, half the frame's width
CAB_TOP, CAB_Z = 0.56, 0.21                                     # the arm the cabbage hangs from, the cabbage's middle
LADDER = ((-0.17, 0.13), (-0.09, 0.27), (0.0, 0.42))            # its perches on the front face: (y from its middle, height)


def swing_frame(objs, x, y, rustic=False):
    """(rustic: the cottage's, of round hazel poles lashed with twine)"""
    wood = coop.M()['wood']; dark = coop.M()['darkwood']
    if rustic:
        pole = C('ct_hazel', CT['hazel'], rough=0.85, var=0.12, grain=0.3, grain_scale=G); twine = coop.M()['twine']
        for sx in (-1, 1):
            top = Vector((x + sx * SWING_HALF, y, SWING_TOP + 0.02))
            for sy in (-1, 1):
                a = Vector((x + sx * SWING_HALF, y + sy * 0.2, 0.0)); b = top + Vector((0, -sy * 0.03, 0.05))
                objs.append(cyl('swpole', 0.02, (b - a).length, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=pole, verts=7, bevel=0.0))
            objs.append(cyl('swlash', 0.03, 0.05, top, (0, math.radians(90), 0), m=twine, verts=8, bevel=0.0))
        objs.append(cyl('swbar', 0.022, 2 * SWING_HALF + 0.14, (x, y, SWING_TOP), (0, math.radians(90), 0), m=pole, verts=8, bevel=0.0))
        return
    for sx in (-1, 1):                                          # an A each side, the bar along x across their tops
        top = Vector((x + sx * SWING_HALF, y, SWING_TOP))
        for sy in (-1, 1):
            objs.append(plank('swleg', Vector((x + sx * SWING_HALF, y + sy * 0.2, 0.0)), top + Vector((0, 0, 0.02)), 0.04, 0.035, (sx, 0, 0), wood, jitter=0.4))
        objs.append(plank('swbrace', Vector((x + sx * SWING_HALF, y - 0.1, 0.27)), Vector((x + sx * SWING_HALF, y + 0.1, 0.27)), 0.03, 0.025, (sx, 0, 0), dark, jitter=0.4))
    objs.append(cyl('swbar', 0.022, 2 * SWING_HALF + 0.1, (x, y, SWING_TOP), (0, math.radians(90), 0), m=dark, verts=10, bevel=0.0))


def swing_seat():
    """The swing's perch on its two ropes, hanging from the bar (its pivot at the origin)."""
    objs = []; rope = coop.M()['twine']; pale = _barn_m('pine', rough=0.75, var=0.05)
    L = SWING_TOP - SWING_PERCH
    for sx in (-1, 1):
        objs.append(cyl('swrope', 0.007, L, (sx * 0.17, 0, -L / 2), m=rope, verts=6, bevel=0.0))
        objs.append(cyl('swknot', 0.016, 0.03, (sx * 0.17, 0, -L + 0.01), m=rope, verts=8, bevel=0.0))
        objs.append(cyl('swloop', 0.026, 0.012, (sx * 0.17, 0, -0.005), (0, math.radians(90), 0), m=rope, verts=10, bevel=0.0))
    objs.append(cyl('swperch', 0.02, 0.42, (0, 0, -L), (0, math.radians(90), 0), m=pale, verts=10, bevel=0.004))
    return finish(objs, 'swing_seat')


def dust_tub(objs, x, y):
    """The Cosy's sand bath: a low half-barrel of fine sand, a little spilt round it."""
    staves = [_barn_m('stump', grain=0.5), _barn_m('cut', grain=0.3)]; sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    n = 16
    for k in range(n):
        a = k / n * math.tau; c, s_ = math.cos(a), math.sin(a)
        objs.append(plank('stave', (x + c * 0.25, y + s_ * 0.25, 0.0), (x + c * 0.25, y + s_ * 0.25, 0.11), 0.1, 0.025, (c, s_, 0), staves[k % 2], jitter=0.5))
    for z in (0.03, 0.09):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.262, minor_radius=0.008, major_segments=24, minor_segments=5, location=(x, y, z))
        o = bpy.context.object; setmat(o, iron); objs.append(o)
    objs.append(sphere('dsand', 0.235, (x, y, 0.06), (1, 1, 0.14), m=sand, ico=3, disp=0.12, seed=7))
    for k in range(7):
        a = random.uniform(0, math.tau); d = random.uniform(0.28, 0.38)
        objs.append(sphere('dspill', random.uniform(0.04, 0.07), (x + math.cos(a) * d, y + math.sin(a) * d, 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 3))


def dust_bath(objs, x, y):
    """The Deluxe's sand bath: a low wooden sandbox full of pale sand (a few hollows where they've bathed), a striped beach umbrella
    over its back corner, a little bucket and spade."""
    wood = _barn_m('pine2', rough=0.75, var=0.08); dark = coop.M()['darkwood']
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); sand2 = mat('dsand2', '#e2c98e', rough=0.95, var=0.05)
    hw, hd, H = SAND_W / 2, SAND_D / 2, 0.11
    for (a, b, n) in (((x - hw, y - hd), (x + hw, y - hd), (0, -1, 0)), ((x - hw, y + hd), (x + hw, y + hd), (0, 1, 0)),
                      ((x - hw, y - hd), (x - hw, y + hd), (-1, 0, 0)), ((x + hw, y - hd), (x + hw, y + hd), (1, 0, 0))):
        objs.append(plank('sbox', (a[0], a[1], H / 2), (b[0], b[1], H / 2), H, 0.035, n, wood, jitter=0.3))
        objs.append(plank('sboxtop', (a[0], a[1], H + 0.008), (b[0], b[1], H + 0.008), 0.06, 0.016, (0, 0, 1), wood, jitter=0.2))
    for (cx, cy) in ((x - hw, y - hd), (x + hw, y - hd), (x - hw, y + hd), (x + hw, y + hd)):
        objs.append(box('sbcorner', (0.05, 0.05, H + 0.03), (cx, cy, (H + 0.03) / 2), m=dark, bevel=0.006, segs=1))
    objs.append(box('sand', (SAND_W - 0.04, SAND_D - 0.04, 0.02), (x, y, H - 0.02), m=sand, bevel=0.01, segs=2))
    for k, (dx, dy, s_) in enumerate(((-0.18, 0.05, 0.13), (0.2, -0.08, 0.11), (0.0, 0.17, 0.09))):         # little heaps and hollows
        objs.append(sphere('smound', s_, (x + dx, y + dy, H - 0.015), (1.3, 1.0, 0.22), (0, 0, k), m=sand2 if k == 1 else sand, ico=2, disp=0.15, seed=k + 11))
    for k in range(6):                                          # a little spilt over the edge
        a = random.uniform(0, math.tau)
        px, py = x + math.cos(a) * (hw + 0.08), y + math.sin(a) * (hd + 0.08)
        objs.append(sphere('sspill', random.uniform(0.04, 0.06), (px, py, 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 3))
    # the beach umbrella: a pole at the back left corner, a striped canopy over the box
    cx_, cy_ = -1, 1                                            # (its back left corner: the sand in front of it stays in sight)
    ux, uy, uz, R = x + cx_ * (hw - 0.12), y + cy_ * (hd - 0.12), 0.72, 0.42
    objs.append(cyl('upole', 0.012, uz + 0.04, (ux, uy, (uz + 0.04) / 2), m=C('upole', '#f4efe4', rough=0.5), verts=8, bevel=0.0))
    tilt = Vector((-cx_ * 0.18, -cy_ * 0.12, 1)).normalized(); cent = Vector((ux, uy, uz)); top = cent + tilt * 0.12
    stripes = [C('ustripe1', '#e2574c', rough=0.6), C('ustripe2', '#fbf6ee', rough=0.6)]
    q = tilt.to_track_quat('Z', 'Y')
    n = 12
    for k in range(n):
        a0, a1 = k / n * math.tau, (k + 1) / n * math.tau
        p0 = cent + q @ Vector((math.cos(a0) * R, math.sin(a0) * R, -0.02)); p1 = cent + q @ Vector((math.cos(a1) * R, math.sin(a1) * R, -0.02))
        me = bpy.data.meshes.new('canopy'); bm = bmesh.new()
        f = bm.faces.new([bm.verts.new(top), bm.verts.new(p0), bm.verts.new(p1)]); bm.normal_update()
        if f.normal.dot(tilt) < 0: f.normal_flip()
        bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new('canopy', me)); setmat(o, stripes[k % 2]); objs.append(o)
        so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.008
    objs.append(sphere('utop', 0.018, top + tilt * 0.01, m=C('upole', '#f4efe4', rough=0.5), seg=8, rings=6))
    # a red bucket and a yellow spade on the sand
    objs.append(cyl('bucket', 0.04, 0.07, (x + 0.27, y - 0.17, H + 0.02), m=C('bucket', '#d8443a', rough=0.5), verts=12, r2=0.052, bevel=0.004))
    objs.append(cyl('bucketin', 0.046, 0.005, (x + 0.27, y - 0.17, H + 0.054), m=sand, verts=12, bevel=0.0))
    objs.append(box('spade', (0.05, 0.06, 0.008), (x + 0.12, y - 0.22, H + 0.01), (0, math.radians(8), math.radians(35)), m=C('spade', '#f2c14e', rough=0.5), bevel=0.003, segs=1))
    objs.append(cyl('spadeh', 0.008, 0.14, (x + 0.05, y - 0.27, H + 0.02), (math.radians(80), 0, math.radians(125)), m=C('spade', '#f2c14e', rough=0.5), verts=6, bevel=0.0))


def cabbage_post(objs, x, y):
    """The post and arm the cabbage hangs from (the arm out over the yard)."""
    dark = coop.M()['darkwood']
    px, py = x, y + 0.28
    objs.append(box('cpost', (0.05, 0.05, CAB_TOP + 0.04), (px, py, (CAB_TOP + 0.04) / 2), m=dark, bevel=0.008))
    objs.append(box('carm', (0.04, 0.32, 0.04), (px, py - 0.14, CAB_TOP), m=dark, bevel=0.006))
    objs.append(box('cbrace', (0.03, 0.16, 0.03), (px, py - 0.06, CAB_TOP - 0.08), (math.radians(-40), 0, 0), m=dark, bevel=0.005, segs=1))
    for k in range(3):                                         # its foot in the ground: a few stones
        a = k * 2.1 + 0.4
        objs.append(sphere('cstone', 0.035, (px + math.cos(a) * 0.06, py + math.sin(a) * 0.06, 0.012), (1.2, 1, 0.6), m=_barn_m('stone', rough=0.9, grain=0.0), ico=1, disp=0.2, seed=k))


def cabbage():
    """A cabbage on a string (the string's top at the origin)."""
    objs = []; L = CAB_TOP - CAB_Z
    leaf = [C('cab1', '#7fbf5a', rough=0.7), C('cab2', '#a6d47a', rough=0.7), C('cab3', '#5f9e45', rough=0.75)]
    objs.append(cyl('cstring', 0.005, L - 0.07, (0, 0, -(L - 0.07) / 2), m=coop.M()['twine'], verts=5, bevel=0.0))
    objs.append(sphere('cabheart', 0.075, (0, 0, -L), (1, 1, 0.92), m=leaf[1], ico=2, disp=0.15, seed=2))
    for k in range(7):                                         # loose outer leaves cupped round it
        a = k / 7 * math.tau; c, s_ = math.cos(a), math.sin(a)
        o = sphere('cableaf', 0.06, (c * 0.055, s_ * 0.055, -L - 0.01), (0.35, 1.0, 0.9), (0, math.radians(18), a), m=leaf[k % 3 if k % 3 != 1 else 0], ico=2, disp=0.12, seed=k + 5)
        objs.append(o)
    return finish(objs, 'cabbage')


def ladder(objs, x, y):
    """A little A-frame with perches up its front, the top one at its peak."""
    wood = coop.M()['wood']; pale = _barn_m('pine', rough=0.75, var=0.05); top = LADDER[-1][1] + 0.03
    for sx in (-1, 1):
        for sy in (-1, 1):
            objs.append(plank('lleg', Vector((x + sx * 0.3, y + sy * 0.24, 0.0)), Vector((x + sx * 0.3, y, top + 0.02)), 0.04, 0.03, (sx, 0, 0), wood, jitter=0.3))
    for (dy, z) in LADDER:
        objs.append(cyl('lperch', 0.018, 0.64, (x, y + dy, z), (0, math.radians(90), 0), m=pale, verts=10, bevel=0.0))
        if dy:
            objs.append(cyl('lperch', 0.018, 0.64, (x, y - dy, z), (0, math.radians(90), 0), m=pale, verts=10, bevel=0.0))


def xylophone(objs, x, y):
    """A child's xylophone on low legs, its bars along y in rainbow colours, for pecking."""
    wood = coop.M()['darkwood']; pale = _barn_m('pine', rough=0.75, var=0.05)
    cols = ['#e2453c', '#ff8c42', '#f4c430', '#5bb04a', '#3d7fd1', '#9b6bd1']
    for sy in (-1, 1):
        objs.append(box('xrail', (0.26, 0.03, 0.025), (x, y + sy * 0.16, 0.085), (0, 0, 0), m=pale, bevel=0.005, segs=1))
        for sx in (-1, 1):
            objs.append(box('xleg', (0.03, 0.03, 0.08), (x + sx * 0.1, y + sy * 0.16, 0.04), m=wood, bevel=0.004, segs=1))
    for k in range(6):
        yy = y - 0.13 + k * 0.052; L = 0.26 - k * 0.025
        objs.append(box('xbar', (L, 0.042, 0.016), (x, yy, 0.105), m=C('xbar%d' % k, cols[k], rough=0.35, metal=0.4), bevel=0.004, segs=1))
        for sx in (-1, 1):
            objs.append(sphere('xpin', 0.007, (x + sx * (L / 2 - 0.02), yy, 0.115), m=coop.M()['metal'], seg=6, rings=4))
    objs.append(cyl('xmallet', 0.006, 0.16, (x + 0.08, y + 0.2, 0.015), (math.radians(90), 0, math.radians(30)), m=wood, verts=6, bevel=0.0))
    objs.append(sphere('xmhead', 0.018, (x + 0.12, y + 0.27, 0.018), m=C('xbar0', cols[0], rough=0.35, metal=0.4), seg=8, rings=6))


def play_things(objs, t, k='rir'):
    P = PLAY_BY[k].get(t)
    if not P: return
    if P.get('frame') == 'torii': torii_swing(objs, *P['swing'])
    elif P.get('frame') == 'tree': tree_swing(objs, *P['swing'])
    elif P.get('frame') == 'logs': log_swing(objs, *P['swing'])
    elif P.get('frame') == 'dutch': dutch_swing(objs, *P['swing'])
    elif P.get('frame') == 'joglo': joglo_swing(objs, *P['swing'])
    else: swing_frame(objs, *P['swing'], rustic=P.get('rustic', False))
    (cabbage_tripod if P.get('tripod') else cabbage_bamboo if P.get('holder') == 'bamboo' else cabbage_crook if P.get('holder') == 'crook' else cabbage_stump if P.get('holder') == 'stump' else cabbage_mill if P.get('holder') == 'mill' else cabbage_kentongan if P.get('holder') == 'kentongan' else cabbage_post)(objs, *P['cabbage'])
    if 'tub' in P: dust_tub(objs, *P['tub'])
    if 'tinbath' in P: tin_bath(objs, *P['tinbath'])
    if 'pit' in P: sand_pit(objs, *P['pit'])
    if 'sbowl' in P: sand_bowl(objs, *P['sbowl'])
    if 'zen' in P: zen_garden(objs, *P['zen'])
    if 'barrow' in P: wheelbarrow(objs, *P['barrow'])
    if 'boat' in P: sand_boat(objs, *P['boat'])
    if 'halflog' in P: sand_log(objs, *P['halflog'])
    if 'crib' in P: sand_crib(objs, *P['crib'])
    if 'clog' in P: sand_clog(objs, *P['clog'])
    if 'delft' in P: sand_delft(objs, *P['delft'])
    if 'tampah' in P: sand_tampah(objs, *P['tampah'])
    if 'candi' in P: sand_candi(objs, *P['candi'])
    if 'dust' in P: dust_bath(objs, *P['dust'])
    if 'ladder' in P: ladder(objs, *P['ladder'])
    if 'xylo' in P: (bamboo_xylophone if P.get('bars') == 'bamboo' else log_xylophone if P.get('bars') == 'logs' else tulip_xylophone if P.get('bars') == 'tulip' else gamelan if P.get('bars') == 'gamelan' else xylophone)(objs, *P['xylo'])


def play_info(t, k='rir'):
    """For the browser (glTF axes: x, z = Blender x, -y): each play thing's place, and the spots the birds keep clear of."""
    P = PLAY_BY[k].get(t)
    if not P: return None
    g = lambda q: [q[0], round(-q[1], 3)]
    if 'tub' in P: dust = dict(at=g(P['tub']), r=0.235, y=0.075)
    elif 'pit' in P: dust = dict(at=g(P['pit']), r=PIT_R, y=0.085)
    elif 'tinbath' in P: dust = dict(at=g(P['tinbath']), w=TIN_W, d=TIN_D, y=0.105)
    elif 'sbowl' in P: dust = dict(at=g(P['sbowl']), r=SBOWL_R, y=0.09)
    elif 'zen' in P: dust = dict(at=g(P['zen']), w=ZEN_W, d=ZEN_D, y=0.062)
    elif 'barrow' in P: dust = dict(at=g(P['barrow']), w=BARROW_W - 0.1, d=BARROW_D - 0.08, y=BARROW_Y)
    elif 'boat' in P: dust = dict(at=g(P['boat']), w=BOAT_W - 0.1, d=BOAT_D - 0.1, y=0.1)
    elif 'halflog' in P: dust = dict(at=g(P['halflog']), w=2 * LOGBATH_R - 0.1, d=LOGBATH_L - 0.12, y=LOGBATH_Z + 0.01)
    elif 'crib' in P: dust = dict(at=g(P['crib']), w=CRIB_W - 0.14, d=CRIB_D - 0.14, y=0.115)
    elif 'clog' in P: dust = dict(at=g((P['clog'][0] + 0.03, P['clog'][1])), w=CLOG_L - 0.26, d=CLOG_W - 0.16, y=CLOG_Y + 0.005)
    elif 'delft' in P: dust = dict(at=g(P['delft']), w=DELFT_W - 0.14, d=DELFT_D - 0.14, y=0.105)
    elif 'tampah' in P: dust = dict(at=g(P['tampah']), r=TAMPAH_R - 0.04, y=0.075)
    elif 'candi' in P: dust = dict(at=g(P['candi']), w=CANDI_W - 0.2, d=CANDI_D - 0.2, y=0.135)
    else: dust = dict(at=g(P['dust']), w=SAND_W, d=SAND_D, y=0.105)
    out = dict(swing=dict(at=g(P['swing']), top=SWING_TOP, perch=SWING_PERCH, half=SWING_HALF), dust=dust,
               cabbage=dict(at=g(P['cabbage']), top=CAB_TOP, z=CAB_Z))
    if 'ladder' in P: out['ladder'] = dict(at=g(P['ladder']), perches=[[round(-dy, 3), z] for (dy, z) in LADDER])
    if 'xylo' in P: out['xylo'] = dict(at=g(P['xylo']), bars=[round(0.13 - k * 0.052, 3) for k in range(6)])
    if 'tub' in P: sand = [g(P['tub']) + [0.29]]
    elif 'pit' in P: sand = [g(P['pit']) + [PIT_R + 0.07]]
    elif 'tinbath' in P: sand = [g((P['tinbath'][0] + sx * (TIN_W - TIN_D) / 2, P['tinbath'][1])) + [TIN_D / 2 + 0.08] for sx in (-1, 1)]
    elif 'sbowl' in P: sand = [g(P['sbowl']) + [SBOWL_R + 0.07]]
    elif 'zen' in P: sand = [g((P['zen'][0] + sx * (ZEN_W - ZEN_D) / 2, P['zen'][1])) + [ZEN_D / 2 + 0.08] for sx in (-1, 1)]
    elif 'barrow' in P: bx_, by_ = P['barrow']; sand = [g((bx_, by_)) + [BARROW_D / 2 + 0.1], g((bx_ - 0.4, by_)) + [0.12], g((bx_ + 0.29, by_)) + [0.1]]
    elif 'boat' in P: sand = [g((P['boat'][0] + sx * (BOAT_W - BOAT_D) / 2, P['boat'][1])) + [BOAT_D / 2 + 0.08] for sx in (-1, 1)]
    elif 'halflog' in P: sand = [g((P['halflog'][0], P['halflog'][1] + sy * (LOGBATH_L - 2 * LOGBATH_R) / 2)) + [LOGBATH_R + 0.1] for sy in (-1, 1)]
    elif 'crib' in P: sand = [g((P['crib'][0] + sx * (CRIB_W - CRIB_D) / 2, P['crib'][1])) + [CRIB_D / 2 + 0.1] for sx in (-1, 1)]
    elif 'clog' in P: sand = [g((P['clog'][0] + sx * (CLOG_L - CLOG_W) / 2, P['clog'][1])) + [CLOG_W / 2 + 0.1] for sx in (-1, 1)]
    elif 'delft' in P: sand = [g((P['delft'][0] + sx * (DELFT_W - DELFT_D) / 2, P['delft'][1])) + [DELFT_D / 2 + 0.1] for sx in (-1, 1)]
    elif 'tampah' in P: sand = [g(P['tampah']) + [TAMPAH_R + 0.07]]
    elif 'candi' in P: sand = [g((P['candi'][0] + sx * (CANDI_W - CANDI_D) / 2, P['candi'][1])) + [CANDI_D / 2 + 0.1] for sx in (-1, 1)]
    else: dx, dy = P['dust']; sand = [g((dx - 0.22, dy)) + [0.42], g((dx + 0.22, dy)) + [0.42]]
    cx, cy = P['cabbage']
    holder = [[round(cx + lx, 3), round(-(cy + ly), 3), 0.06] for (lx, ly) in TRIPOD] if P.get('tripod') else [[cx, round(-(cy + 0.28), 3), 0.12 if P.get('holder') == 'stump' else 0.08]]
    keep = [g(P['swing']) + [0.38], *sand, g(P['cabbage']) + [0.13], *holder]
    if P.get('frame') == 'tree': keep.append(g((P['swing'][0] + TREE_DX, P['swing'][1])) + [0.12])          # (the apple tree's trunk)
    if P.get('frame') == 'logs': keep += [g((P['swing'][0] + sx * (SWING_HALF + 0.05), P['swing'][1])) + [0.13] for sx in (-1, 1)]   # (its posts, braced)
    if P.get('frame') == 'joglo': keep += [g((P['swing'][0] + sx * (SWING_HALF + 0.05), P['swing'][1])) + [0.1] for sx in (-1, 1)]   # (its posts)
    if 'crib' in P: keep.append(g((P['crib'][0] + CRIB_PINE[0], P['crib'][1] + CRIB_PINE[1])) + [0.17])            # (the crib's young pine)
    if 'ladder' in P: keep.append(g(P['ladder']) + [0.38])
    if 'xylo' in P: keep.append(g(P['xylo']) + [0.2])
    out['keep'] = keep
    return out


def pen_tier(t, bk='rir'):
    """A look's yard and what's in it (pen_t0, pen_t1, pen_t3, pen_t4; another breed's: pen_t3_orp...): the dirt pad, feeder,
    water, hay, sack, straw; in the smallest pens a tin basin (an enamel one) for water and no hay; in the bigger ones grass
    round the edges."""
    L = pen_layout(t, bk); keep = coop.PEN; coop.PEN = L
    if bk in LATER: random.seed(140 + t + ord(bk[0]))       # (release 7's: their yard's bits the same whatever was made before them)
    try: root = pen_base()
    finally: coop.PEN = keep
    random.seed(40 + t + (0 if bk == 'rir' else 7 * len(bk) + ord(bk[0])))
    if L.get('bowl') in ('clay', 'celadon'):               # (the Pagoda's: a brown clay bowl, a celadon-glazed one)
        _swap(root, {'bowl'}, mat('cs_bowl_' + L['bowl'], CS['clay'] if L['bowl'] == 'clay' else CS['celadon'], rough=0.35, spec=0.5, var=0.02))
    elif L.get('bowl') == 'wood':                           # (the Timber Lodge's: a turned wooden bowl; a copper one in the Cosy)
        _swap(root, {'bowl'}, mat('cb_bowl_wood', CB['bowl'], rough=0.7, var=0.04, grain=0.3, grain_scale=G))
    elif L.get('bowl') == 'copper':
        _swap(root, {'bowl'}, mat('cb_bowl_copper', CB['copper'], rough=0.35, spec=0.5, metal=0.6, var=0.03))
    elif L.get('bowl') == 'stone':                          # (the Stone Cottage's: a carved stone bowl)
        _swap(root, {'bowl'}, mat('cl_bowl_stone', '#aaa395', rough=0.85, var=0.04, bump=0.15, bump_scale=60))
    elif L.get('bowl') == 'coconut':                        # (the Javanese house's: a coconut-shell bowl; a brass one in the Cosy)
        _swap(root, {'bowl'}, mat('jg_bowl_coco', '#5b3f28', rough=0.8, var=0.06))
    elif L.get('bowl') == 'brass':
        _swap(root, {'bowl'}, mat('jg_bowl_brass', '#b88a3a', rough=0.35, metal=0.8, var=0.03))
    elif L.get('bowl') == 'terracotta':                     # (the Little Windmill's: a terracotta bowl; a Delft one in the Cosy)
        _swap(root, {'bowl'}, mat('cw_bowl_terra', CW_TERRA, rough=0.7, var=0.04))
    elif L.get('bowl') == 'delft':
        _swap(root, {'bowl'}, mat('cw_bowl_delft', '#f4f2ec', rough=0.3, spec=0.5, var=0.02))
        dx, dy = L['dish']; objs = []
        bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.012, major_segments=28, minor_segments=6, location=(dx, dy, 0.072))
        o = bpy.context.object; setmat(o, mat('cw_delftrim', '#2f5aa8', rough=0.3, spec=0.5)); objs.append(o)
        for k in range(6):
            aa = k / 6 * math.tau
            objs.append(sphere('dbpaint', 0.022, (dx + math.cos(aa) * 0.172, dy + math.sin(aa) * 0.172, 0.035), (0.3, 0.9, 0.7), (0, 0, aa), m=mat('cw_delftrim', '#2f5aa8', rough=0.3, spec=0.5), seg=8, rings=5))
        _own(objs, root)
    elif L.get('bowl') == 'enamel':
        _swap(root, {'bowl'}, mat('ct_enamel', '#ece6d6', rough=0.3, spec=0.5, var=0.02))
        dx, dy = L['dish']; objs = []
        bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.012, major_segments=28, minor_segments=6, location=(dx, dy, 0.072))
        o = bpy.context.object; setmat(o, mat('ct_enamelrim', '#3f5f8e', rough=0.3, spec=0.5)); objs.append(o)
        objs.append(sphere('chip', 0.012, (dx + 0.15, dy + 0.02, 0.068), (1.3, 1, 0.8), m=C('iron', '#26231f', rough=0.5, metal=0.6), ico=1))
        _own(objs, root)
    elif t <= 1: _swap(root, {'bowl'}, _barn_m('tinbowl', rough=0.45, grain=0.0, metal=0.5))
    if t >= 3:                                     # grass in the corners and along the sides, inside the fence
        x0, x1, y0, y1 = L['box']; g = [_barn_m('grass', rough=0.95, grain=0.0, var=0.1), _barn_m('grass2', rough=0.95, grain=0.0, var=0.1)]
        objs = []
        for k in range(26 if t == 3 else 36):
            side = k % 4
            if side == 0: x, y = random.uniform(x0 + 0.12, x0 + 0.35), random.uniform(y0 + 0.2, y1 - 0.3)
            elif side == 1: x, y = random.uniform(x1 - 0.35, x1 - 0.12), random.uniform(y0 + 0.2, y1 - 0.3)
            elif side == 2: x, y = random.uniform(x0 + 0.2, x1 - 0.2), random.uniform(y0 + 0.1, y0 + 0.28)
            else: x, y = random.uniform(x0 + 0.15, x0 + 0.9), random.uniform(y0 + 0.15, y0 + 0.6)
            m_ = random.choice(g)
            for j in range(5):
                aa = random.uniform(0, math.tau); d = random.uniform(0, 0.05); tilt = random.uniform(0.15, 0.5); h = random.uniform(0.06, 0.11)
                objs.append(cyl('ygrass', 0.012, h, (x + math.cos(aa) * d + math.cos(aa) * math.sin(tilt) * h / 2, y + math.sin(aa) * d + math.sin(aa) * math.sin(tilt) * h / 2, 0.015 + h / 2 * math.cos(tilt)),
                                (math.sin(aa) * -tilt, math.cos(aa) * tilt, 0), m=m_, verts=3, r2=0.0, bevel=0.0))
        play_things(objs, t, bk)
        _own(objs, root)
    root.name = 'pen_t%d' % t + ('' if bk == 'rir' else '_' + bk)
    return root


def fence_tier(t, seed=37):
    """A look's fence: broken (t0), mended (t1), the standard one with flowers along its front (t3), white pickets (t4)."""
    keep = coop.PEN; coop.PEN = pen_layout(t)
    try:
        if t == 4:
            n0 = len(LIGHTS.get('fence_dx', [])); root = deluxe_fence()
            LIGHTS['fence_t4'] = LIGHTS['fence_dx'][n0:]; del LIGHTS['fence_dx'][n0:]     # (its lanterns, where this pen's gate is)
            if not LIGHTS['fence_dx']: del LIGHTS['fence_dx']
        else:
            root = rustic_fence(seed) if t <= 1 else wood_fence()
    finally: coop.PEN = keep
    random.seed(seed + t)
    rails = lambda: [o for o in root.children_recursive if o.type == 'MESH' and o.name.split('.')[0] == 'rail']
    if t == 0:                                     # rails down, one end dropped, posts leaning
        for o in random.sample(rails(), min(2, len(rails()))): bpy.data.objects.remove(o, do_unlink=True)
        for o in random.sample(rails(), min(2, len(rails()))):
            o.rotation_euler.rotate_axis('Y', math.radians(random.choice((-17, 17)))); o.location.z -= 0.06
        posts = [o for o in root.children_recursive if o.type == 'MESH' and o.name.split('.')[0] == 'post']
        for o in random.sample(posts, min(2, len(posts))): o.rotation_euler.x += math.radians(random.choice((-8, 8)))
    elif t == 1:                                   # the old grey fence with new pale rails and a few new posts
        pine = _barn_m('pine', rough=0.75, var=0.08); pine2 = _barn_m('pine2', rough=0.75, var=0.08)
        for o in rails():
            if random.random() < 0.5: o.data.materials.clear(); o.data.materials.append(pine)
        posts = [o for o in root.children_recursive if o.type == 'MESH' and o.name.split('.')[0] in ('post', 'cap')]
        for o in posts:
            if random.random() < 0.3: o.data.materials.clear(); o.data.materials.append(pine2)
    elif t == 3:                                   # painted sage, flowers along the outside of the front fence
        _swap(root, {'wood'}, mat('bx_sagefence', BARN['sage'], rough=0.65, var=0.05, grain=0.15, grain_scale=G))
        _swap(root, {'capwood'}, mat('bx_cupola', BARN['cupola'], rough=0.6, var=0.04, grain=0.12, grain_scale=G))
        x0, x1, y0, y1 = PENS[3]['box']; leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
        objs = []
        gx = _gate_of(3)[0]
        for i in range(90):
            x = random.uniform(x0 + 0.05, x1 - 0.05)
            if abs(x - gx) < 0.5: continue      # (the gate kept clear)
            y = y0 - random.uniform(0.08, 0.2)
            if random.random() < 0.5: objs.append(sphere('bleaf', 0.05, (x, y, 0.04), (1, 1, 0.6), m=random.choice(leaf), ico=1, disp=0.25, seed=i))
            objs.append(sphere('bflower', 0.026, (x, y, 0.08 + random.uniform(0, 0.07)), m=C('dxf%d' % (i % 6), FLOWERS[i % 6], rough=0.5), ico=1))
        _own(objs, root)
    root.name = 'fence_t%d' % t
    return root


def pen_info(t, k='rir'):
    """For the browser (glTF axes): the pen's box, its gate's middle, the feeder, the water, the hay and sack (or none)."""
    keep = coop.PEN; coop.PEN = pen_layout(t, k)
    try:
        x0, x1, y0, y1 = coop.PEN['box']; hinge, gc = coop.gate_span()
        P = coop.PEN
        return dict(min=[x0, round(-y1, 3)], max=[x1, round(-y0, 3)], gate=round(gc, 3), feeder=[P['feeder'][0], -P['feeder'][1]], dish=[P['dish'][0], -P['dish'][1]], dish_r=0.36 if P.get('fountain') or P.get('water') in ('trough', 'flume') else 0.5 if P.get('water') in ('pond', 'canal') else 0.3 if P.get('water') in ('butt', 'padasan') else 0.22,
                    hay=[[P['hay'][0], -P['hay'][1]]] + [[b[0], -b[1]] for b in P.get('bales', [])] if P.get('hay') else [], sack=[P['sack'][0], -P['sack'][1]] if P.get('sack') else None)
    finally: coop.PEN = keep


# ---- release 4, the Thatched Cottage's five looks (Audrey, 27 Oct: "The other four coops", one at a time, shown first).
# Rustic (box_orp): a hut of straw bales, an old board roof under a ragged heap of straw and a patched tarpaulin, a rope over
#   it weighed down with bricks (the hint: its thatch to come).
# Mended (shed_orp): a little wattle hut on a few courses of brick, its woven hazel walls half daubed with clay (the bucket of
#   daub by it), a thin roof of new thatch.
# Snug (house_orp): today's cottage.
# Cosy (cosy_orp): the cottage with hollyhocks, a rose by its corner, a rose arbour with a bench on its left gable under a
#   window with flowers, a lantern by the hens' door, the automatic door's box and its solar panel, pots by the ramp, a
#   doorstep, stepping stones to the gate.
# Deluxe (deluxe_orp): a taller cottage limewashed Suffolk pink, two eyebrow windows in its thatch, a decorated ridge (points
#   and crossed hazel rods) with a straw pheasant on it, a taller chimney; the cosy touches.
# The hens come, go and lay the same way in every look: the same floor (0.2), pop door, nest window (low, its door let down
# onto the ground) and short ramp (nest_window: NESTS['house_orp'] the same).
CT = dict(bale='#d6c07a', bale2='#c8b16a', twine='#74583a', old='#9a8558', old2='#857550', tarp='#6c7352', patch='#8b6a48',
          rope='#a3906a', hazel='#8a6a48', hazel2='#73573a', stake='#5c4431', daub='#e6d9bb', newthatch='#d6b56e', reed='#c9a057',
          ridge='#e3c98a', ligger='#76552f', pink='#f0c9bd', stem='#4f7d3a', holly1='#ec8db5', holly2='#f7eef0', holly3='#bf3a52',
          holly4='#f3d36e', terra='#b0603a', terraold='#9c7462', dry='#8b7d63', stone='#aba596', mat='#9a4f3a', trellis='#efe8d8')


def _ct(key, rough=0.85, **kw):
    return C('ct_' + key, CT[key], rough=rough, **kw)


def _dprism(name, cx, y0, y1, zb, R, m, segs=12, bevel=0.02):
    """A half-round prism lying along y from y0 to y1, its flat side down at zb (an eyebrow of thatch, a door hood)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for y in (y0, y1):
        rings.append([bm.verts.new((cx + R * math.cos(math.pi * k / segs), y, zb + R * math.sin(math.pi * k / segs))) for k in range(segs + 1)])
    bm.faces.new(rings[0]); bm.faces.new(rings[1][::-1])
    for k in range(segs): bm.faces.new((rings[0][k], rings[0][k + 1], rings[1][k + 1], rings[1][k]))
    bm.faces.new((rings[0][segs], rings[0][0], rings[1][0], rings[1][segs]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); soften(o, bevel, 2)
    return o


def _tri(name, a, b, c, n, th, m):
    """A flat triangle (a, b, c) th thick along n."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); n = Vector(n).normalized() * th / 2
    v0 = [bm.verts.new(Vector(p) - n) for p in (a, b, c)]; v1 = [bm.verts.new(Vector(p) + n) for p in (a, b, c)]
    bm.faces.new(v0); bm.faces.new(v1[::-1])
    for i in range(3):
        j = (i + 1) % 3; bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); soften(o, 0.006, 1)
    return o


def _ramp(objs, FL, m, slat_m, w=0.17, slats=2):
    """The hens' short ramp from the pop door (the cottage's: 0.34 long, as nest_window's foot)."""
    L = max(0.3, FL * 1.7)
    ra, rb = Vector((-0.31, -D2 - 0.05, FL + 0.02)), Vector((-0.31, -D2 - 0.05 - L, 0.03))
    d = rb - ra; pn = Vector((0, -d.z, d.y)).normalized()
    if pn.z < 0: pn = -pn
    objs.append(plank('ramp', ra, rb, w, 0.03, pn, m, jitter=0.6))
    for k in range(slats):
        c = ra.lerp(rb, (k + 0.6) / (slats + 0.4)) + pn * 0.02
        objs.append(plank('slat', c + Vector((-w / 2 + 0.02, 0, 0)), c + Vector((w / 2 - 0.02, 0, 0)), 0.022, 0.016, pn, slat_m, jitter=2.5))


def box_orp(seed=41):
    """Rustic: a hut of straw bales."""
    random.seed(seed)
    FL, WX, NF = 0.2, 0.415, 0.08
    root = empty('box_orp'); objs = []
    bales = [_ct('bale', var=0.07, bump=0.35, bump_scale=120), _ct('bale2', var=0.07, bump=0.35, bump_scale=120)]
    twine = _ct('twine', rough=0.9, var=0.05)
    greys = [_barn_m('grey'), _barn_m('grey2'), _barn_m('grey3')]
    brick = C('brick', '#9b5239', rough=0.85, var=0.1)
    def bale(x0, x1, y0, y1, z0, z1):
        along_x = x1 - x0 >= y1 - y0
        objs.append(box('bale', (x1 - x0 - 0.01, y1 - y0 - 0.01, z1 - z0 - 0.008), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (0, 0, math.radians(random.uniform(-1.5, 1.5))),
                        m=random.choice(bales), bevel=0.028, segs=2, jitter=0.005))
        L = max(x1 - x0, y1 - y0)
        for f in ((0.27, 0.73) if L > 0.3 else (0.5,)):
            if along_x: objs.append(box('twine', (0.016, y1 - y0 + 0.002, z1 - z0 + 0.002), (x0 + (x1 - x0) * f, (y0 + y1) / 2, (z0 + z1) / 2), m=twine, bevel=0.003, segs=1))
            else: objs.append(box('twine', (x1 - x0 + 0.002, 0.016, z1 - z0 + 0.002), ((x0 + x1) / 2, y0 + (y1 - y0) * f, (z0 + z1) / 2), m=twine, bevel=0.003, segs=1))
    Z = [(0.0, 0.2), (0.2, 0.44), (0.44, 0.69), (0.69, 0.89)]
    XS, XO, YF, YB = 0.59, 0.8, -D2 + 0.21, D2 - 0.21
    WL, WR = WX - WIN_W / 2, WX + WIN_W / 2
    front = [[(-XS, -0.16), (-0.16, WL)], [(-XS, -0.46), (-0.16, WL)], [(-XS, -0.46), (-0.16, WL)], [(-XS, 0.02), (0.02, XS)]]
    for c, (z0, z1) in enumerate(Z):
        for (a, b) in front[c]: bale(a, b, -D2, YF, z0, z1)
        for sx in (-1, 1):
            for (a, b) in ([(-D2, 0.0), (0.0, D2)] if c % 2 == 0 else [(-D2, -0.22), (-0.22, 0.2), (0.2, D2)]):
                bale(min(sx * XS, sx * XO), max(sx * XS, sx * XO), a, b, z0, z1)
        for (a, b) in ([(-XS, -0.1), (-0.1, XS)] if c % 2 == 0 else [(-XS, 0.15), (0.15, XS)]): bale(a, b, YB, D2, z0, z1)
    for row in range(2):                                           # old bricks under the nest window
        for i in range(3):
            objs.append(box('brick', (0.1, 0.06, 0.05), (WL + 0.055 + i * 0.1 + (0.03 if row else 0) - 0.015, -D2 + 0.03, 0.026 + row * 0.052), (0, 0, math.radians(random.uniform(-4, 4))), m=brick, bevel=0.006, segs=1))
    # lintels: old boards over the hens' door and over the nest window, two boards filling the gap above the window
    objs.append(plank('lintel', (-0.5, (-D2 + YF) / 2, 0.677), (-0.12, (-D2 + YF) / 2, 0.677), 0.21, 0.025, (0, 0, 1), greys[0], jitter=0.8))
    objs.append(plank('lintel', (WL - 0.03, (-D2 + YF) / 2, 0.535), (XS + 0.01, (-D2 + YF) / 2, 0.535), 0.21, 0.025, (0, 0, 1), greys[2], jitter=0.8))
    for k, z in enumerate((0.585, 0.652)):
        objs.append(plank('wboard', (WL - 0.01, -D2 - 0.005, z), (XS + 0.01, -D2 - 0.005, z), 0.064, 0.022, (0, -1, 0), greys[k % 2], jitter=1.0))
    # the roof: old boards across, a ragged heap of straw on them, a tarpaulin with a patch over one end, a rope over it all
    # with a brick hanging at each end
    x = -XO - 0.02
    while x < XO + 0.02:
        w = random.uniform(0.11, 0.15); xc = x + w / 2
        objs.append(plank('rboard', (xc, -D2 - 0.12, 0.905), (xc, D2 + 0.1, 0.9), w * 0.94, 0.028, (0, 0, 1), random.choice(greys), jitter=0.9))
        x += w
    old, old2 = _ct('old', rough=0.95, var=0.06, bump=0.4, bump_scale=90), _ct('old2', rough=0.95, var=0.06, bump=0.4, bump_scale=90)
    objs.append(sphere('heap', 0.5, (-0.16, 0.0, 0.915), (1.32, 1.08, 0.16), m=old, ico=3, disp=0.3, seed=2))
    for k, (x, y, rr, m_) in enumerate(((-0.6, 0.26, 0.2, old2), (0.16, -0.3, 0.22, old2), (-0.46, -0.34, 0.18, old), (0.22, 0.3, 0.2, old), (-0.2, 0.05, 0.22, old2))):
        objs.append(sphere('heap', rr, (x, y, 0.94), (1.25, 1.0, 0.3), (0, 0, random.uniform(0, 3)), m=m_, ico=2, disp=0.35, seed=8 + k))
    straw = coop.M()['straw']
    for k in range(30):                                            # straws sticking up out of it, every which way
        x, y = random.uniform(-0.7, 0.35), random.uniform(-0.42, 0.42); d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(0.2, 0.8))).normalized(); L = random.uniform(0.07, 0.13)
        objs.append(cyl('straw', 0.003, L, Vector((x, y, 0.97)) + d * L / 2, d.to_track_quat('Z', 'Y').to_euler(), straw, verts=5, bevel=0))
    for k in range(26):                                            # straws hanging over the edges
        x = random.uniform(-0.75, 0.3); side = random.choice((-1, 1))
        p = Vector((x, side * random.uniform(0.47, 0.55), 0.93)); d = Vector((random.uniform(-0.3, 0.3), side * 0.5, -1.0)).normalized(); L = random.uniform(0.07, 0.14)
        objs.append(cyl('straw', 0.003, L, p + d * L / 2, d.to_track_quat('Z', 'Y').to_euler(), straw, verts=5, bevel=0))
    tarp, patch = _ct('tarp', rough=0.8, var=0.04), _ct('patch', rough=0.85)
    objs.append(plank('tarp', (0.6, -D2 - 0.13, 0.932), (0.6, D2 + 0.11, 0.928), 0.5, 0.012, (0, 0, 1), tarp, jitter=0.6, bevel=0.004))
    objs.append(plank('tarp', (XO + 0.035, -D2 - 0.1, 0.93), (XO + 0.035, -D2 - 0.1, 0.72), 0.2, 0.012, (1, 0, 0), tarp, jitter=3.0, bevel=0.004))
    objs.append(plank('tarp', (XO + 0.035, 0.15, 0.93), (XO + 0.04, 0.15, 0.76), 0.34, 0.012, (1, 0, 0), tarp, jitter=3.0, bevel=0.004))
    objs.append(plank('patch', (0.55, -0.12, 0.941), (0.55, 0.06, 0.941), 0.16, 0.006, (0, 0, 1), patch, jitter=4.0, bevel=0.002))
    rope = _ct('rope', rough=0.9)
    rx = -0.66
    pts = [Vector((rx, -D2 - 0.12, 0.74)), Vector((rx, -D2 - 0.12, 0.92)), Vector((rx, -0.28, 1.02)), Vector((rx, 0.25, 1.03)), Vector((rx, D2 + 0.1, 0.92)), Vector((rx, D2 + 0.1, 0.74))]
    for a, b in zip(pts, pts[1:]):
        objs.append(cyl('rope', 0.008, (b - a).length + 0.01, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), rope, verts=6, bevel=0.0))
    for y in (-D2 - 0.12, D2 + 0.1):
        objs.append(box('brick', (0.09, 0.065, 0.18), (rx, y, 0.66), (0, 0, math.radians(random.uniform(-8, 8))), m=brick, bevel=0.006, segs=1))
    # the hens' door (a rough frame), its little ramp, the nest window (an old frame, its door let down)
    pop_trim(objs, FL, greys[1], D2)
    _ramp(objs, FL, greys[2], greys[1])
    nest_window(objs, 'orp', FL, WX, greys[1], hollow=True, nest_floor=NF, door='drop', door_m=greys[0])
    # where the cottage's lavender will be: a cracked old pot, a few dry stems
    LX, LY = W2 + 0.06, -D2 - 0.17
    objs.append(cyl('pot', 0.065, 0.13, (LX, LY, 0.065), (math.radians(4), 0, 0), m=_ct('terraold', rough=0.9, var=0.05), verts=12, r2=0.078, bevel=0.006))
    for k in range(5):
        a = k * 1.3; d = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 1.0)).normalized()
        objs.append(cyl('dry', 0.005, 0.13, Vector((LX, LY, 0.12)) + d * 0.065, d.to_track_quat('Z', 'Y').to_euler(), _ct('dry', rough=0.9), verts=5, bevel=0.0))
    objs.append(box('shard', (0.07, 0.05, 0.012), (LX - 0.12, LY - 0.06, 0.008), (0, 0, 0.7), m=_ct('terraold', rough=0.9, var=0.05), bevel=0.003, segs=1))
    straw_bits(objs, (-0.1, -D2 - 0.12, 0), 0.25, 24, 0.0)
    _own(objs, root)
    return root


def shed_orp(seed=43):
    """Mended: a little wattle hut on bricks, half daubed with clay, a thin roof of new thatch."""
    random.seed(seed)
    FL, WX, NF, EAVE, PEAK = 0.2, 0.415, 0.08, 0.8, 1.2
    root = empty('shed_orp'); objs = []
    brick = C('brick', '#9b5239', rough=0.85, var=0.1); brickd = C('brickdark', '#7e3f2b', rough=0.85)
    hz = [_ct('hazel', var=0.12, grain=0.3, grain_scale=G), _ct('hazel2', var=0.12, grain=0.3, grain_scale=G)]
    stake = _ct('stake', var=0.08, grain=0.3, grain_scale=G)
    daub = _ct('daub', rough=0.9, var=0.012, bump=0.3, bump_scale=70)
    thatch = _ct('newthatch', rough=0.9, var=0.05, hue_var=0.01)
    pine = _barn_m('pine', rough=0.75, var=0.08); pine2 = _barn_m('pine2', rough=0.75, var=0.08)
    WL, WR = WX - WIN_W / 2, WX + WIN_W / 2
    # the base: a few courses of brick, round the sides and back a low wall, under the nest window two courses
    for row, (z0, z1) in enumerate(((0.0, 0.06), (0.06, 0.12), (0.12, 0.2))):
        x = -W2 - (0.06 if row % 2 else 0.0)
        while x < W2 - 0.01:
            a, b = max(x, -W2), min(x + 0.12, W2); x += 0.124
            if row == 2 and b > WL and a < WR:                      # (the window's sill)
                if a < WL - 0.02: b = WL
                elif b > WR + 0.02: a = WR
                else: continue
            if b - a < 0.02: continue
            objs.append(box('brick', (b - a - 0.006, 0.06, z1 - z0 - 0.006), ((a + b) / 2, -D2 + 0.026, (z0 + z1) / 2), m=brick if random.random() < 0.75 else brickd, bevel=0.005, segs=1, jitter=0.002))
    for sx in (-1, 1): objs.append(box('base', (0.06, 2 * D2, FL), (sx * (W2 - 0.03), 0, FL / 2), m=brickd, bevel=0.006, segs=1))
    objs.append(box('base', (2 * W2, 0.06, FL), (0, D2 - 0.03, FL / 2), m=brickd, bevel=0.006, segs=1))
    # the walls: hazel rods woven between stakes; daubed with clay on the left of the front (a wavy edge: half done), the left
    # side and the back; the right side still bare
    POPH = (-0.31 - POP_W / 2 - 0.0225, -0.31 + POP_W / 2 + 0.0225, FL, FL + POP_H + 0.0225)
    WINH = (WL - 0.0175, WR + 0.0175, 0.1, NF + 0.04 + WIN_H + 0.0175)
    def wall(u0, u1, place, out, holes=(), daub_at=None):
        daubed = (lambda u, z: False) if daub_at is None else (lambda u, z: daub_at[0] - 0.02 < u < daub_at[1] + 0.02)
        us = [u0 + i * (u1 - u0) / round((u1 - u0) / 0.1) for i in range(round((u1 - u0) / 0.1) + 1)]
        def cut(a, b, z0, z1):                                     # (a..b at z0..z1 less the holes)
            out_ = [(a, b)]
            for (h0, h1, hz0, hz1) in holes:
                if z1 > hz0 and z0 < hz1: out_ = [p for s_ in out_ for p in ((s_[0], min(s_[1], h0)), (max(s_[0], h1), s_[1])) if p[1] - p[0] > 0.012]
            return out_
        for i, u in enumerate(us[1:-1], 1):                        # the stakes (not across the holes)
            zs = [FL, EAVE]
            for (h0, h1, hz0, hz1) in holes:
                if h0 - 0.01 < u < h1 + 0.01: zs = [FL, hz0, hz1, EAVE]
            for z0, z1 in zip(zs[::2], zs[1::2]):
                if z1 - z0 > 0.02 and not daubed(u, (z0 + z1) / 2): objs.append(cyl('stake', 0.011, z1 - z0, place(u, (z0 + z1) / 2, 0.0), m=stake, verts=6, bevel=0.0))
        z, r = FL + 0.024, 0
        while z < EAVE - 0.01:
            for k in range(len(us) - 1):
                for (a, b) in cut(us[k], us[k + 1], z - 0.02, z + 0.02):
                    if daubed((a + b) / 2, z): continue
                    s0 = 0.009 if (k + r) % 2 else -0.009
                    pa, pb = place(a, z, s0 * (1 - 2 * (a - us[k]) / (us[k + 1] - us[k]))), place(b, z, s0 * (1 - 2 * (b - us[k]) / (us[k + 1] - us[k])))
                    objs.append(plank('rod', pa, pb, 0.036, 0.016, out, hz[r % 2], jitter=1.0, bevel=0.0))
            z += 0.044; r += 1
        # the daub: smooth panels over the rods up to a ragged edge (lumps of clay along it)
        if daub_at is None: return
        lo, hi = daub_at
        zs_ = sorted({FL, EAVE} | {h for (h0, h1, hz0, hz1) in holes for h in (hz0, hz1) if FL < h < EAVE})
        for z0, z1 in zip(zs_, zs_[1:]):
            for (a, b) in cut(max(u0, lo), min(u1, hi), z0 + 0.001, z1 - 0.001):
                objs.append(box('daub', (b - a, 0.03, z1 - z0) if out[1] else (0.03, b - a, z1 - z0), place((a + b) / 2, (z0 + z1) / 2, 0.008), m=daub, bevel=0.006, segs=1))
        e_ = hi if lo <= u0 + 1e-6 else lo
        z = FL + 0.03
        while z < EAVE - 0.02:
            u = e_ + random.uniform(-0.035, 0.035)
            if not any(h0 - 0.03 < u < h1 + 0.03 and hz0 - 0.03 < z < hz1 + 0.03 for (h0, h1, hz0, hz1) in holes):
                objs.append(sphere('daubblob', 0.045, place(u, z, 0.012), (1.0, 0.35, 1.2) if out[1] else (0.35, 1.0, 1.2), m=daub, ico=2, disp=0.35, seed=int(z * 100)))
            z += random.uniform(0.05, 0.08)
    fr = lambda u, z, d=0.0: (u, -D2 - d, z)
    wall(-W2, W2, fr, (0, -1, 0), holes=(POPH, WINH), daub_at=(-W2, 0.0))
    for sx in (-1, 1):                                             # the sides: their back halves daubed, their front halves still bare
        wall(-D2, D2, lambda u, z, d=0.0, sx=sx: (sx * (W2 + d), u, z), (sx, 0, 0), daub_at=(0.02, D2))
    objs.append(box('daub', (2 * W2, 0.04, EAVE - FL), (0, D2 + 0.004, (FL + EAVE) / 2), m=daub, bevel=0.01, segs=1))
    objs.append(box('inside', (2 * W2 - 0.1, 2 * D2 - 0.1, 0.01), (0, 0, FL - 0.005), m=C('hall_dark', '#1d1510', rough=1.0), bevel=0.0))
    for sx in (-1, 1):
        objs.append(box('inside', (0.01, 2 * D2 - 0.06, EAVE - FL), (sx * 0.592, 0.01, (FL + EAVE) / 2), m=C('hall_dark', '#1d1510', rough=1.0), bevel=0.0))
        objs.append(prism_gable(sx * W2, EAVE - 0.01, PEAK - 0.04, D2, 0.03, pine))
    for (x, y) in ((-W2 + 0.02, -D2 + 0.02), (W2 - 0.02, -D2 + 0.02), (-W2 + 0.02, D2 - 0.02), (W2 - 0.02, D2 - 0.02), (0.06, -D2 + 0.0)):
        objs.append(cyl('pole', 0.03, EAVE - FL + 0.05, (x, y, (FL + EAVE) / 2), m=stake, verts=8, bevel=0.004))
    for sy in (-1, 1):                                             # a wall plate along the top
        objs.append(plank('plate', (-W2 - 0.03, sy * (D2 + 0.005), EAVE - 0.02), (W2 + 0.03, sy * (D2 + 0.005), EAVE - 0.02), 0.045, 0.04, (0, sy, 0), stake, jitter=0.4))
    # the roof: one thin layer of new thatch, hazel spars along it near the ridge, a small ridge roll
    for sy in (-1, 1):
        e = Vector((0, sy * (D2 + 0.17), EAVE - 0.07)); r_ = Vector((0, 0, PEAK)); nrm = Vector((0, sy * (PEAK - EAVE + 0.07), D2 + 0.17)).normalized()
        th = 0.095; L = (e - r_).length
        o = box('thatch', (2 * W2 + 0.3, L + 0.06, th), (0, 0, 0), m=thatch, bevel=0.035, segs=3)
        o.rotation_euler = (-sy * math.atan2(PEAK - EAVE + 0.07, D2 + 0.17), 0, 0); o.location = (r_ + e) / 2 + nrm * (th / 2); objs.append(o)
        for t in (0.12, 0.22):
            c = r_.lerp(e, t) + nrm * (th + 0.006)
            objs.append(cyl('spar', 0.008, 2 * W2 + 0.22, c, (0, math.radians(90), 0), m=hz[0], verts=6, bevel=0.0))
    objs.append(cyl('ridgeroll', 0.065, 2 * W2 + 0.32, (0, 0, PEAK + 0.07), (0, math.radians(90), 0), _ct('newthatch', rough=0.9, var=0.05, hue_var=0.01), verts=14, bevel=0.02))
    # the hens' door with a new pine frame and ramp, the nest window
    pop_door(objs, FL, pine2, pine, pine2)
    nest_window(objs, 'orp', FL, WX, pine2, hollow=True, nest_floor=NF, door='drop', door_m=pine)
    # the bucket of daub by the corner (where the lavender will be), a trowel in it; a bundle of hazel rods along the back
    LX, LY = W2 + 0.06, -D2 - 0.17
    wood = _barn_m('stump', grain=0.5); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    objs.append(cyl('bucket', 0.075, 0.13, (LX, LY, 0.065), m=wood, verts=14, r2=0.085, bevel=0.006))
    for z in (0.03, 0.1): objs.append(cyl('hoop', 0.08 + z * 0.08, 0.012, (LX, LY, z), m=iron, verts=14, bevel=0.0))
    objs.append(cyl('bdaub', 0.078, 0.01, (LX, LY, 0.128), m=daub, verts=14, bevel=0.0))
    objs.append(box('trowel', (0.06, 0.09, 0.008), (LX + 0.03, LY - 0.02, 0.15), (math.radians(60), 0, math.radians(20)), m=C('metal', '#b9bfc2', rough=0.35, metal=0.8), bevel=0.003, segs=1))
    objs.append(cyl('trhandle', 0.01, 0.08, (LX + 0.05, LY - 0.08, 0.2), (math.radians(60), 0, math.radians(20)), m=pine2, verts=6, bevel=0.0))
    for k in range(7):
        objs.append(cyl('rods', 0.01, 0.9, (W2 + 0.2 + (k % 3) * 0.02, 0.05 + (k // 3) * 0.02, 0.012 + (k % 2) * 0.012), (math.radians(90), 0, math.radians(random.uniform(-2, 2))), m=hz[k % 2], verts=6, bevel=0.0))
    objs.append(sphere('splat', 0.07, (LX - 0.12, LY - 0.05, 0.004), (1.3, 1, 0.08), m=daub, ico=2, disp=0.3, seed=3))
    _own(objs, root)
    return root


def _hollyhock(objs, x, y, h, col, seed):
    """A hollyhock: a tall stem of round cup flowers, smaller towards its top, big leaves at its foot."""
    stem = _ct('stem', rough=0.8); leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    objs.append(cyl('hhstem', 0.009, h, (x, y, h / 2), m=stem, verts=6, bevel=0.0))
    for k in range(3):
        a = seed + k * 2.1
        objs.append(sphere('hhleaf', 0.055, (x + math.cos(a) * 0.05, y + math.sin(a) * 0.05, 0.06 + k * 0.07), (1, 1, 0.35), (0.3, 0, a), m=leaf[k % 2], ico=1, disp=0.25, seed=seed + k))
    n = 7
    for k in range(n):
        u = k / (n - 1); a = seed * 1.7 + k * 2.3; s_ = 0.036 - 0.02 * u
        objs.append(sphere('hhflower', s_, (x + math.cos(a) * 0.02, y + math.sin(a) * 0.02, h * (0.42 + 0.53 * u)), (1, 1, 0.8), m=col, ico=1))
    objs.append(sphere('hhbud', 0.012, (x, y, h + 0.01), m=leaf[1], ico=1))


def _cottage_bits(r, name, t, eave=0.9, peak=1.5, seed=45, arbour=True):
    """What makes the cottage cosy (and stays on the Deluxe): hollyhocks along its gables, a climbing rose at its corner, a window
    with flowers on its left gable (a rose arbour and a bench under it, not on the Deluxe, whose sandbox is there), a lantern by
    the hens' door, the automatic door's box over it and its solar panel on the thatch, pots by the foot of the ramp, a
    doorstep, stepping stones to the gate."""
    random.seed(seed); objs = []
    oak = C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    fl = [C('dxf%d' % i, FLOWERS[i], rough=0.5) for i in range(6)]
    leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    iron = C('iron', '#26231f', rough=0.5, metal=0.6); lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    hh = [_ct('holly1', rough=0.55), _ct('holly2', rough=0.55), _ct('holly3', rough=0.55), _ct('holly4', rough=0.55)]
    for i, (x, y, h) in enumerate(((-0.76, -0.34, 0.8), (-0.78, 0.36, 0.72), (W2 + 0.13, -0.3, 0.78), (W2 + 0.12, 0.3, 0.86))):
        _hollyhock(objs, x, y, h, hh[i % 4], i + 3)
    # a climbing rose up the front left corner post
    rx, ry = -W2 - 0.09, -D2 - 0.05
    for k in range(9):
        z = 0.08 + k * 0.075; a = k * 2.4
        objs.append(sphere('roseleaf', 0.045, (rx + math.cos(a) * 0.03, ry + math.sin(a) * 0.03, z), (1, 1, 0.9), m=leaf[k % 2], ico=1, disp=0.25, seed=k + 20))
        if k > 1: objs.append(sphere('rose', 0.022, (rx + math.cos(a + 1) * 0.045, ry + math.sin(a + 1) * 0.045 - 0.01, z + 0.02), m=fl[2] if k % 3 else fl[3], ico=1))
    # the left gable: a window with a box of flowers, a rose arbour over a bench under it
    window(objs, -W2 - 0.02, 0.0, 0.58, 0.22, 0.18, oak, glass, normal=(-1, 0, 0), box_flowers=[C('fbox', '#6d4a31', rough=0.85)] + fl[:4])
    if arbour:
        tr = _ct('trellis', rough=0.6, var=0.03); wood = coop.M()['wood']; dark = coop.M()['darkwood']
        ax, Y, H = -W2 - 0.38, 0.33, 0.78
        for sy in (-1, 1):
            for dx in (-0.11, 0.11):
                objs.append(box('apost', (0.035, 0.035, H), (ax + dx, sy * Y, H / 2), m=tr, bevel=0.006, segs=1))
            for z in (0.25, 0.45, 0.65):
                objs.append(box('alath', (0.24, 0.02, 0.02), (ax, sy * Y, z), m=tr, bevel=0.003, segs=1))
        for k in range(11):                                        # the arch over the top
            a0, a1 = math.pi * k / 11, math.pi * (k + 1) / 11
            for dx in (-0.11, 0.11):
                objs.append(plank('aarch', (ax + dx, -math.cos(a0) * Y, H + math.sin(a0) * 0.2), (ax + dx, -math.cos(a1) * Y, H + math.sin(a1) * 0.2), 0.03, 0.03, (1, 0, 0), tr, jitter=0.2, bevel=0.004))
        for k in range(14):                                        # roses all over it
            a = math.pi * (k + 0.5) / 14
            p = Vector((ax + random.uniform(-0.1, 0.1), -math.cos(a) * Y, H + math.sin(a) * 0.2 + 0.02))
            objs.append(sphere('aleaf', 0.05, p, (1, 1, 0.8), m=leaf[k % 2], ico=1, disp=0.25, seed=k + 30))
            objs.append(sphere('arose', 0.024, p + Vector((random.uniform(-0.04, 0.04), 0, 0.035)), m=fl[2] if k % 3 else fl[0], ico=1))
        for sy in (-1, 1):
            for k in range(4):
                objs.append(sphere('aleaf', 0.045, (ax - 0.12, sy * Y, 0.2 + k * 0.17), (1, 1, 0.9), m=leaf[k % 2], ico=1, disp=0.25, seed=k + 50))
                objs.append(sphere('arose', 0.022, (ax - 0.15, sy * Y + 0.02, 0.24 + k * 0.17), m=fl[2], ico=1))
        objs.append(box('bench', (0.17, 0.56, 0.035), (ax + 0.02, 0.0, 0.23), m=wood, bevel=0.008, segs=1))
        objs.append(box('benchback', (0.03, 0.56, 0.15), (ax + 0.1, 0.0, 0.38), (0, math.radians(-10), 0), m=wood, bevel=0.008, segs=1))
        for sy in (-1, 1): objs.append(box('benchleg', (0.15, 0.035, 0.23), (ax + 0.02, sy * 0.24, 0.115), m=dark, bevel=0.005, segs=1))
        can = C('can', '#6e9aa8', rough=0.4, metal=0.5)               # a watering can by the bench
        objs.append(cyl('can', 0.05, 0.1, (ax - 0.02, -Y + 0.12, 0.05), m=can, verts=12, bevel=0.005))
        objs.append(cyl('spout', 0.009, 0.12, (ax - 0.08, -Y + 0.12, 0.09), (0, math.radians(-55), 0), m=can, verts=6, bevel=0.0))
    # a lantern on the corner post by the hens' door
    lx, ly, lz = -W2 + 0.02, -D2 - 0.11, 0.5
    objs.append(box('larm', (0.025, 0.1, 0.025), (lx, -D2 - 0.06, lz + 0.07), m=iron, bevel=0.004, segs=1))
    objs.append(box('lanternb', (0.07, 0.07, 0.1), (lx, ly, lz), m=iron, bevel=0.006, segs=1))
    objs.append(box('lanterng', (0.076, 0.076, 0.065), (lx, ly, lz), m=lamp, bevel=0.0))
    objs.append(cyl('lroof', 0.06, 0.05, (lx, ly, lz + 0.075), (0, 0, math.pi / 4), m=iron, verts=4, r2=0.0, bevel=0.0))
    light_at(name, lx, ly, lz)
    # the automatic door: its motor box over the hens' door (a little green light), its solar panel on the thatch
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = 0.2 + POP_H + 0.07
    objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.045, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, zb), m=led, seg=8, rings=4))
    objs.append(cyl('autocable', 0.005, eave - 0.03 - zb, (-0.36, -D2 - 0.03, (eave - 0.03 + zb) / 2), m=box_m, verts=5, bevel=0.0))
    e0 = Vector((0, -(D2 + 0.22), eave - 0.1)); r0 = Vector((0, 0, peak)); dn = (e0 - r0).normalized()
    nrm = Vector((0, -(peak - eave + 0.1), D2 + 0.22)).normalized()
    c = r0.lerp(e0, 0.74) + nrm * 0.165 + Vector((0.42, 0, 0))
    objs.append(plank('solarframe', c - dn * 0.1, c + dn * 0.1, 0.25, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for i in range(2):
        for j in range(3):
            cc = c + nrm * 0.012 + dn * (-0.05 + i * 0.1) + Vector((-0.08 + j * 0.08, 0, 0))
            objs.append(plank('solarcell', cc - dn * 0.044, cc + dn * 0.044, 0.072, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # a doorstep and a mat at the front door
    stone = _ct('stone', rough=0.9, var=0.1)
    objs.append(box('doorstep', (0.32, 0.12, 0.04), (0.045, -D2 - 0.07, 0.02), m=stone, bevel=0.01, segs=1))
    objs.append(box('doormat', (0.2, 0.09, 0.01), (0.045, -D2 - 0.075, 0.045), m=_ct('mat', rough=0.95), bevel=0.003, segs=1))
    # flower pots either side of the foot of the ramp (the birds walk round them)
    potm = _ct('terra', rough=0.8)
    for (x, y) in ((-0.64, -0.98), (0.02, -0.98)):
        objs.append(cyl('pot', 0.07, 0.11, (x, y, 0.055), m=potm, verts=14, r2=0.055, bevel=0.006))
        for k in range(6):
            aa = k / 6 * math.tau
            objs.append(sphere('potleaf', 0.035, (x + math.cos(aa) * 0.035, y + math.sin(aa) * 0.035, 0.13), (1, 1, 0.8), m=leaf[k % 2], ico=1, disp=0.25, seed=k + 10))
            objs.append(sphere('potflower', 0.022, (x + math.cos(aa + 0.5) * 0.04, y + math.sin(aa + 0.5) * 0.04, 0.16), m=fl[(k + 2) % 6], ico=1))
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.12])
    # stepping stones from the foot of the ramp across the yard
    stone = _barn_m('stone', rough=0.9, grain=0.0, bump=0.2, bump_scale=60, var=0.12)
    gx, gy = _gate_of(t); a, b = Vector((-0.31, -1.05)), Vector((gx, gy + 0.32)); n = max(3, round((b - a).length / 0.25))
    for k in range(n + 1):
        q = a.lerp(b, k / n); x, y = q.x + 0.06 * math.sin(k * 1.7), q.y
        objs.append(sphere('stepstone', 0.085, (x + random.uniform(-0.02, 0.02), y, 0.014), (1.15 + random.uniform(-0.15, 0.15), 0.95, 0.12), (0, 0, random.uniform(0, 3)), m=stone, ico=2, disp=0.18, seed=k + 40))
    _own(objs, r)
    return r


def cosy_orp():
    r = thatched(name='cosy_orp'); _cottage_bits(r, 'cosy_orp', 3)
    return r


def deluxe_orp():
    """Deluxe: a taller cottage in Suffolk pink, eyebrow windows, a decorated ridge with a straw pheasant."""
    EAVE, PEAK = 1.1, 1.85
    r = thatched(eave=EAVE, peak=PEAK, name='deluxe_orp')
    random.seed(47); objs = []
    oak = C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    pink = _ct('pink', rough=0.8, var=0.02); _swap(r, {'limewash'}, pink)
    thatch = C('thatch', '#c7a866', rough=0.9, var=0.07, hue_var=0.01)
    for o in list(r.children):                                     # the scallops make way for the decorated ridge; a second chimney pot
        if o.name.split('.')[0] == 'scallop': bpy.data.objects.remove(o, do_unlink=True)
        elif o.name.split('.')[0] == 'chimpot': o.location.x -= 0.045
    objs.append(cyl('chimpot', 0.045, 0.12, (-0.375, 0.2, PEAK + 0.34), m=C('terra', '#b0603a', rough=0.8), verts=10, bevel=0.0))
    for sy in (-1, 1):                                             # a rail where the upstairs floor is
        objs.append(plank('rail', (-W2, sy * (D2 + 0.016), 0.86), (W2, sy * (D2 + 0.016), 0.86), 0.05, 0.03, (0, sy, 0), oak, jitter=0.3))
    for sx in (-1, 1):
        objs.append(plank('srail', (sx * (W2 + 0.016), -D2, 0.86), (sx * (W2 + 0.016), D2, 0.86), 0.05, 0.03, (sx, 0, 0), oak, jitter=0.3))
        window(objs, sx * (W2 + 0.02), 0.0, 1.0, 0.2, 0.16, oak, glass, normal=(sx, 0, 0), box_flowers=[C('fbox', '#6d4a31', rough=0.85)] + [C('dxf%d' % i, FLOWERS[i], rough=0.5) for i in (0, 2, 3, 4)])
    # the decorated ridge: a band of paler straw each side, cut into points along its foot, crossed hazel rods pinning it
    ridge = _ct('ridge', rough=0.9, var=0.04); lig = _ct('ligger', rough=0.8, var=0.08)
    X0, X1 = -W2 - 0.19, W2 + 0.19
    for sy in (-1, 1):
        e = Vector((0, sy * (D2 + 0.22), EAVE - 0.1)); top = Vector((0, 0, PEAK)); nrm = Vector((0, sy * (PEAK - EAVE + 0.1), D2 + 0.22)).normalized()
        dn = (e - top).normalized(); L = (e - top).length
        lift = nrm * 0.235
        a, b = top + lift, top + dn * (L * 0.3) + lift
        objs.append(plank('rband', (a + b) / 2 + Vector((X0, 0, 0)), (a + b) / 2 + Vector((X1, 0, 0)), (b - a).length + 0.04, 0.04, nrm, ridge, jitter=0.0, bevel=0.012))
        n = 11; w = (X1 - X0) / n
        for k in range(n):
            x = X0 + (k + 0.5) * w
            objs.append(_tri('rpoint', b + Vector((x - w / 2, 0, 0)), b + Vector((x + w / 2, 0, 0)), b + dn * 0.1 + Vector((x, 0, 0)), nrm, 0.04, ridge))
        for f in (0.35, 0.85):
            c = a.lerp(b, f) + nrm * 0.026
            objs.append(cyl('ligger', 0.008, X1 - X0 - 0.04, c, (0, math.radians(90), 0), m=lig, verts=6, bevel=0.0))
        ca, cb = a.lerp(b, 0.35) + nrm * 0.03, a.lerp(b, 0.85) + nrm * 0.03
        for k in range(n):
            x0, x1 = X0 + k * w + 0.02, X0 + (k + 1) * w - 0.02
            for (p, q) in ((ca + Vector((x0, 0, 0)), cb + Vector((x1, 0, 0))), (cb + Vector((x0, 0, 0)), ca + Vector((x1, 0, 0)))):
                objs.append(plank('cross', p, q, 0.014, 0.012, nrm, lig, jitter=0.0, bevel=0.0))
    objs.append(sphere('ridgeknot', 0.07, (0, 0, PEAK + 0.2), (1.1, 1, 0.9), m=ridge, ico=2, disp=0.1, seed=6))     # (the vane stands on it)
    # a straw pheasant on the ridge
    ph = _ct('reed', rough=0.9, var=0.04); px, pz, hd = W2 - 0.12, PEAK + 0.2, -1          # (facing the middle, its tail out)
    objs.append(sphere('phbody', 0.075, (px, 0, pz + 0.07), (1.35, 0.75, 0.85), m=ph, ico=2, disp=0.12, seed=4))
    objs.append(sphere('phneck', 0.035, (px + hd * 0.09, 0, pz + 0.13), (1, 0.9, 1.4), (0, math.radians(25 * hd), 0), m=ph, ico=2))
    objs.append(sphere('phhead', 0.033, (px + hd * 0.12, 0, pz + 0.19), (1.2, 0.9, 1), m=ph, ico=2))
    objs.append(cyl('phbeak', 0.012, 0.04, (px + hd * 0.155, 0, pz + 0.19), (0, math.radians(90 * hd), 0), m=_ct('ligger', rough=0.8), verts=6, r2=0.0, bevel=0.0))
    tail_a, tail_b = Vector((px - hd * 0.07, 0, pz + 0.09)), Vector((px - hd * 0.32, 0, pz + 0.22))
    objs.append(cyl('phtail', 0.024, (tail_b - tail_a).length, (tail_a + tail_b) / 2, (tail_b - tail_a).normalized().to_track_quat('Z', 'Y').to_euler(), m=ph, verts=8, r2=0.004, bevel=0.0))
    # two eyebrow windows in the front of the thatch
    e = Vector((0, -(D2 + 0.22), EAVE - 0.1)); top = Vector((0, 0, PEAK)); nrm = Vector((0, -(PEAK - EAVE + 0.1), D2 + 0.22)).normalized()
    s0 = top.lerp(e, 0.72) + nrm * 0.15                            # (the thatch's face there)
    zs = lambda y: s0.z + (y - s0.y) * (PEAK - EAVE + 0.1) / (D2 + 0.22)
    for xd in (-0.36, 0.08):
        R, yf = 0.16, s0.y - 0.01
        zc = zs(yf) + 0.17
        objs.append(box('dormer', (2 * R - 0.01, 0.42, zc - zs(yf) + 0.06), (xd, yf + 0.21, (zc + zs(yf) - 0.06) / 2), m=pink, bevel=0.01, segs=1))
        window(objs, xd, yf - 0.012, (zc + zs(yf)) / 2 + 0.005, 0.17, 0.12, oak, glass)
        objs.append(_dprism('eyebrow', xd, yf - 0.07, yf + 0.5, zc - 0.01, R + 0.03, thatch, segs=12, bevel=0.03))
    _own(objs, r)
    _cottage_bits(r, 'deluxe_orp', 4, eave=EAVE, peak=PEAK, arbour=False)
    r.name = 'deluxe_orp'
    return r


# ---- the Thatched Cottage's gardens (its own, not the Red Barn's: Audrey, 27 Oct): the feeder and water on the other sides,
# an enamel basin for water in the small pens; Cosy: the swing (of hazel poles) on the right, a tin bath of sand at the front
# left, the cabbage hanging from a hazel tripod by the house's left corner, the hay behind the arbour; Deluxe: a round sand
# pit with a thatched parasol beside the house's right gable, a stone trough with a pump for water, a feeder with a little
# thatched roof, the xylophone on the right, the swing at the front right.
PENS_BY['orp'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(-0.6, -1.25), dish=(0.62, -1.32), bowl='enamel', hay=None, hay_rot=0, sack=None,
            straw=((0.35, -0.95, 0.25, 25), (-0.35, -1.42, 0.25, 20))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(-0.95, -1.42), dish=(0.95, -1.5), bowl='enamel', hay=None, hay_rot=0, sack=(-1.1, 0.25),
            straw=((0.75, -1.15, 0.3, 30), (-0.4, -1.75, 0.3, 25))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(-0.75, -1.65), dish=(1.4, -1.15), hay=(-1.6, 0.45), hay_rot=90, sack=None,
            straw=((-1.6, 0.45, 0.4, 40), (0.35, -1.3, 0.35, 40), (-0.9, -0.85, 0.4, 30))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(-0.95, -1.75), feeder_style='cottage', dish=(-1.35, -2.45), water='trough', hay=(-1.95, 0.45), hay_rot=90,
            sack=None, pebbles=10, straw=((0.3, -1.4, 0.3, 25), (-1.95, 0.45, 0.4, 40))),
}
PLAY_BY['orp'] = {3: dict(swing=(1.25, -2.1), tinbath=(-1.3, -2.35), cabbage=(-1.1, -0.95), tripod=True, rustic=True),
                  4: dict(swing=(1.5, -2.3), pit=(1.6, -0.25), cabbage=(-1.0, -0.95), xylo=(0.95, -1.35), tripod=True, rustic=True)}
PIT_R = 0.4                                                     # the Deluxe cottage's round sand pit
TIN_W, TIN_D = 0.62, 0.4                                        # the Cosy cottage's tin bath (x, y)
TRIPOD = ((0.0, 0.32), (-0.28, 0.1), (0.28, 0.1))               # the cabbage's tripod: its feet round the cabbage (Blender x, y)


def tin_bath(objs, x, y):
    """The Cosy cottage's sand bath: an old oval tin bath full of sand, a handle at each end, a little spilt round it."""
    tin = mat('ct_tinbath', '#c3c9ca', rough=0.5, metal=0.3, var=0.04); sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    sy = TIN_D / TIN_W
    o = cyl('tbath', TIN_W / 2 - 0.004, 0.104, (x, y, 0.052), m=tin, verts=24, r2=TIN_W / 2 - 0.035, bevel=0.006); o.scale = (1, sy, 1); objs.append(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=TIN_W / 2 - 0.006, minor_radius=0.014, major_segments=28, minor_segments=6, location=(x, y, 0.118))
    o = bpy.context.object; o.scale = (1, sy * 1.03, 1); setmat(o, tin); objs.append(o)
    o = sphere('tsand', TIN_W / 2 - 0.03, (x, y, 0.104), (1, sy, 0.035), m=sand, ico=3, disp=0.1, seed=11); objs.append(o)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.035, minor_radius=0.007, major_segments=10, minor_segments=4, location=(x + sx * (TIN_W / 2 + 0.02), y, 0.1), rotation=(math.radians(90), 0, 0))
        o = bpy.context.object; setmat(o, tin); objs.append(o)
    for k in range(6):
        a = random.uniform(0, math.tau)
        objs.append(sphere('dspill', random.uniform(0.04, 0.06), (x + math.cos(a) * (TIN_W / 2 + 0.08), y + math.sin(a) * (TIN_D / 2 + 0.07), 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 13))


def sand_pit(objs, x, y):
    """The Deluxe cottage's sand bath: a round pit of pale sand edged with old bricks, a parasol of thatch on a pole over its
    back, a little wooden rake."""
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); sand2 = mat('dsand2', '#e2c98e', rough=0.95, var=0.05)
    brick = C('brick', '#9b5239', rough=0.85, var=0.1)
    n = 22
    for k in range(n):                                          # bricks on edge round it
        a = k / n * math.tau; c, s_ = math.cos(a), math.sin(a)
        objs.append(box('pbrick', (0.1, 0.05, 0.1), (x + c * (PIT_R + 0.02), y + s_ * (PIT_R + 0.02), 0.04), (0, math.radians(random.uniform(-6, 6)), a + math.pi / 2), m=brick, bevel=0.006, segs=1, jitter=0.002))
    objs.append(sphere('psand', PIT_R, (x, y, 0.05), (1, 1, 0.09), m=sand, ico=3, disp=0.08, seed=15))
    for k in range(3):                                          # hollows where they've bathed
        a = k * 2.2 + 0.5
        objs.append(sphere('phollow', 0.1, (x + math.cos(a) * 0.17, y + math.sin(a) * 0.17, 0.083), (1.2, 1, 0.12), m=sand2, ico=2, disp=0.1, seed=k + 16))
    oak = C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G); thatch = C('thatch', '#c7a866', rough=0.9, var=0.07, hue_var=0.01)
    px, py = x + 0.26, y + 0.28                                 # (its pole at the back of the pit, out of their way)
    objs.append(cyl('ppole', 0.02, 0.86, (px, py, 0.43), m=oak, verts=8, bevel=0.0))
    objs.append(cyl('pthatch', 0.46, 0.2, (px, py, 0.93), m=thatch, verts=16, r2=0.03, bevel=0.02))
    objs.append(cyl('pfringe', 0.47, 0.06, (px, py, 0.82), m=thatch, verts=16, r2=0.45, bevel=0.01))
    objs.append(sphere('pknot', 0.045, (px, py, 1.05), m=_ct('ridge', rough=0.9), ico=2))
    objs.append(cyl('rake', 0.008, 0.36, (x - 0.12, y - PIT_R - 0.1, 0.012), (math.radians(90), 0, math.radians(70)), m=oak, verts=6, bevel=0.0))
    objs.append(box('rakeh', (0.13, 0.025, 0.02), (x - 0.29, y - PIT_R - 0.04, 0.012), (0, 0, math.radians(-20)), m=oak, bevel=0.003, segs=1))


def cabbage_tripod(objs, x, y):
    """The cottage's way of hanging the cabbage: three hazel poles tied at the top, the cabbage on a string under them."""
    pole = C('ct_hazel', CT['hazel'], rough=0.85, var=0.12, grain=0.3, grain_scale=G); twine = coop.M()['twine']
    top = Vector((x, y, CAB_TOP + 0.03))
    for (lx, ly) in TRIPOD:
        a = Vector((x + lx, y + ly, 0.0)); b = top + (top - a).normalized() * 0.06
        objs.append(cyl('tpole', 0.016, (b - a).length, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=pole, verts=6, bevel=0.0))
    objs.append(sphere('tknot', 0.03, top, (1, 1, 0.8), m=twine, ico=1))


# ---- release 4, the Pagoda's five looks (Audrey, 27 Oct: "Yes, five looks too": each in its Silkie colour, the Silkies
# themselves unchanged; the browser tints each look's lacquer, roof and trim like the Pagoda's, its rustic hints faded).
# Rustic (box_sil): a shelter of bamboo poles and old reed mats, a sagging mat roof weighed with stones; an old paper lantern
#   on a bamboo pole, the nest's lattice faded (the hint of its colour).
# Mended (shed_sil): a little hut of bamboo canes on a stone base, a roof of halved bamboo, its front pillars and beam half
#   painted in its colour (the pot of lacquer by it), new paper in the lattice, a paper lantern on a pole.
# Snug (house_sil): today's Pagoda.
# Cosy (cosy_sil): a cherry tree in blossom by its left side, a stone lantern, a second paper lantern at the other corner,
#   azaleas along its base, the automatic door's box and its solar panel, glazed pots by the steps, stepping stones.
# Deluxe (deluxe_sil): three tiers and a tall gold finial with rings, little gold bells at the roofs' corners; the cosy
#   touches, the cherry tree on its right.
# The hens come, go and lay the same way in every look (NESTS['house_sil']: the floor 0.14, the two steps, the low nest
# window with its lattice slid up); something stands where the Pagoda's lantern does (the birds walk round it).
CS = dict(bamboo='#bba96b', bamboo2='#a8975a', node='#8d7b45', reed='#c9b37e', reed2='#b19b66', cord='#5a4632', faded='#a0625b',
          stone='#a7a196', stone2='#8f897e', moss='#6e7a4c', blossom='#f6b9cb', blossom2='#f9d3de', blossom3='#ef9db7', trunk='#5b3d2e',
          azalea='#e0457a', azalea2='#f07fa6', celadon='#8fb9a8', celadon2='#a9cbbd', clay='#8a5a3c', bronze='#9c7a3c', koi='#f08a2c',
          koi2='#f4f0e6', pad='#4f8a3a', ink='#2a2420', sand='#ece2c8', raked='#d9cdb0')


def _cs(key, rough=0.8, **kw):
    return C('cs_' + key, CS[key], rough=rough, **kw)


def _cane(objs, a, b, r, m, node_m, nodes=2):
    """A bamboo cane from a to b, with a node ring or two."""
    a, b = Vector(a), Vector(b); d = b - a
    objs.append(cyl('cane', r, d.length, (a + b) / 2, d.normalized().to_track_quat('Z', 'Y').to_euler(), m=m, verts=7, bevel=0.0))
    for k in range(nodes):
        c = a + d * ((k + 1) / (nodes + 1) + random.uniform(-0.06, 0.06))
        objs.append(cyl('node', r * 1.18, 0.012, c, d.normalized().to_track_quat('Z', 'Y').to_euler(), m=node_m, verts=7, bevel=0.0))


def _paper_lantern(objs, name, x, y, z, m, cap, torn=False):
    """A round paper lantern hanging at (x, y, z), its caps; torn: an old one, a flap of paper hanging off."""
    objs.append(sphere('lantern', 0.065, (x, y, z), (1, 1, 1.25), m=m, seg=14, rings=10))
    for dz in (-0.075, 0.075): objs.append(cyl('lcap', 0.03, 0.02, (x, y, z + dz), m=cap, verts=10, bevel=0.0))
    if torn: objs.append(box('ltear', (0.05, 0.004, 0.06), (x + 0.04, y - 0.05, z - 0.06), (0.3, 0, 0.6), m=m, bevel=0.0))
    light_at(name, x, y, z)


SIL_FL, SIL_WX, SIL_WW, SIL_WH, SIL_NF = 0.14, 0.42, 0.26, 0.3, 0.06
LANT = (W2 + 0.2, -D2 - 0.2)                                    # where the Pagoda's lantern hangs (and its block)


def box_sil(seed=51):
    """Rustic: a shelter of bamboo poles and old reed mats."""
    random.seed(seed)
    FL, TOP = SIL_FL, 0.66
    root = empty('box_sil'); objs = []
    bam, node = _cs('bamboo', var=0.08), _cs('node')
    reed, reed2, cord = _cs('reed', rough=0.9, var=0.05), _cs('reed2', rough=0.9), _cs('cord', rough=0.9)
    lines = C('cs_reedline', '#8f7a4c', rough=0.9); old = C('cs_oldmat', '#a99a74', rough=0.95, var=0.06); old2 = C('cs_oldmat2', '#958762', rough=0.95, var=0.06)
    stone = _cs('stone', rough=0.9, var=0.1); faded = _cs('faded', rough=0.7)
    dark = C('hall_dark', '#1d1510', rough=1.0)
    for (x, y) in ((-W2 + 0.05, -D2 + 0.05), (W2 - 0.05, -D2 + 0.05), (-W2 + 0.05, D2 - 0.05), (W2 - 0.05, D2 - 0.05), (0.0, -D2 + 0.05), (0.0, D2 - 0.05)):
        objs.append(sphere('fstone', 0.08, (x, y, 0.045), (1.2, 1.1, 0.6), (0, 0, random.uniform(0, 3)), m=stone, ico=2, disp=0.25, seed=int(x * 10 + y * 7 + 20)))
    for i in range(9):                                             # a floor of split bamboo
        y = -D2 + 0.05 + i * (2 * D2 - 0.1) / 8
        _cane(objs, (-W2 - 0.02, y, FL - 0.02), (W2 + 0.02, y, FL - 0.02), 0.026, bam, node, nodes=1)
    for (x, y) in ((-W2, -D2), (W2, -D2), (-W2, D2), (W2, D2)):    # corner poles, the front ones taller (the roof slopes back)
        _cane(objs, (x, y, 0.0), (x, y, TOP + (0.08 if y < 0 else 0.0)), 0.026, bam, node)
    WL, WR = SIL_WX - SIL_WW / 2, SIL_WX + SIL_WW / 2
    POPH = (-0.31 - POP_W / 2 - 0.0225, -0.31 + POP_W / 2 + 0.0225, FL, FL + POP_H + 0.0225)
    WINH = (WL - 0.02, WR + 0.02, 0.06, SIL_NF + 0.04 + SIL_WH + 0.01)
    def mats(u0, u1, place, out, ztop, holes=(), torn=None):
        """Reed mats hung between the poles: a mat, its cords down it, a few darker reeds across it."""
        pieces = [(u0, u1, FL, ztop)]
        for (h0, h1, hz0, hz1) in holes:
            nxt = []
            for (a, b, za, zb) in pieces:
                if a < h1 and b > h0 and za < hz1 and zb > hz0:
                    if a < h0: nxt.append((a, h0, za, zb))
                    if b > h1: nxt.append((h1, b, za, zb))
                    c0, c1 = max(a, h0), min(b, h1)
                    if hz0 > za: nxt.append((c0, c1, za, hz0))
                    if hz1 < zb: nxt.append((c0, c1, hz1, zb))
                else: nxt.append((a, b, za, zb))
            pieces = nxt
        for (a, b, za, zb) in pieces:
            if b - a < 0.02 or zb - za < 0.02: continue
            if torn and a < torn[0] < b: zb2 = zb - torn[1]                          # (a corner torn off: the mat shorter there)
            else: zb2 = zb
            objs.append(plank('mat', place((a + b) / 2, za), place((a + b) / 2, zb2), (b - a), 0.012, out, random.choice((reed, reed, reed2)), jitter=0.6, bevel=0.0))
            z = za + 0.03
            while z < zb2 - 0.02:                                  # the reeds: darker lines across it
                objs.append(plank('mline', Vector(place(a + 0.005, z)) + Vector(out) * 0.007, Vector(place(b - 0.005, z)) + Vector(out) * 0.007, 0.006, 0.003, out, lines, jitter=0.3, bevel=0.0))
                z += random.uniform(0.04, 0.06)
            n = max(1, int((b - a) / 0.14))
            for k in range(n):
                u = a + (k + 0.5) * (b - a) / n
                objs.append(plank('mcord', place(u, za), place(u, zb2), 0.008, 0.006, out, cord, jitter=0.4, bevel=0.0))
    fy = lambda u, z: (u, -D2 - 0.004, z); by = lambda u, z: (u, D2 + 0.004, z)
    mats(-W2, W2, fy, (0, -1, 0), TOP + 0.04, holes=(POPH, WINH), torn=(-0.55, 0.12))
    mats(-W2, W2, by, (0, 1, 0), TOP - 0.02)
    mats(-D2, D2, lambda u, z: (-W2 - 0.004, u, z), (-1, 0, 0), TOP, torn=(0.2, 0.15))
    mats(-D2, D2, lambda u, z: (W2 + 0.004, u, z), (1, 0, 0), TOP)
    for (size, loc) in (((2 * W2 - 0.06, 0.01, TOP - FL), (0, D2 - 0.03, (FL + TOP) / 2)), ((0.01, 2 * D2 - 0.06, TOP - FL), (W2 - 0.03, 0, (FL + TOP) / 2)),
                        ((0.01, 2 * D2 - 0.06, TOP - FL), (-W2 + 0.03, 0, (FL + TOP) / 2))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    # the roof: two old mats over a ridge pole and its rafters, sagging, a few stones on them, frayed reeds at the edges
    zf, zb_, zr = TOP + 0.1, TOP + 0.02, TOP + 0.3
    _cane(objs, (-W2 - 0.12, 0.02, zr - 0.03), (W2 + 0.12, 0.02, zr - 0.03), 0.024, bam, node, nodes=3)
    for x in (-W2, 0.0, W2):
        for (ya, za) in ((-D2 - 0.12, zf - 0.03), (D2 + 0.1, zb_ - 0.03)):
            _cane(objs, (x, 0.02, zr - 0.03), (x, ya, za), 0.016, bam, node, nodes=1)
    for (ya, za) in ((-D2 - 0.16, zf), (D2 + 0.14, zb_)):
        for k in range(3):                                         # each mat in three strips so it sags between the rafters
            x0, x1 = -W2 - 0.16 + k * (2 * W2 + 0.32) / 3, -W2 - 0.16 + (k + 1) * (2 * W2 + 0.32) / 3
            sag = 0.025 if k == 1 else 0.012
            a, b = Vector(((x0 + x1) / 2, 0.02, zr - sag)), Vector(((x0 + x1) / 2, ya, za - sag))
            nrm = Vector((0, a.z - b.z, b.y - a.y)).normalized()
            if nrm.z < 0: nrm = -nrm
            objs.append(plank('rmat', a + nrm * 0.012, b + nrm * 0.012, (x1 - x0) + 0.01, 0.012, nrm, random.choice((old, old2)), jitter=1.2, bevel=0.0))
            for k2 in range(1, 9):                                  # its reeds, along the ridge
                q = a.lerp(b, k2 / 9) + nrm * 0.02
                objs.append(plank('rline', q + Vector((x0 - (x0 + x1) / 2 + 0.01, 0, 0)), q + Vector((x1 - (x0 + x1) / 2 - 0.01, 0, 0)), 0.007, 0.003, nrm, lines, jitter=0.4, bevel=0.0))
            for k2 in range(3):                                     # its cords, down the slope
                xx = x0 + (k2 + 0.5) * (x1 - x0) / 3 - (x0 + x1) / 2
                objs.append(plank('rcord', a + nrm * 0.021 + Vector((xx, 0, 0)), b + nrm * 0.021 + Vector((xx, 0, 0)), 0.008, 0.004, nrm, cord, jitter=0.4, bevel=0.0))
    for (x, y) in ((-0.4, -0.2), (0.3, -0.25), (0.45, 0.22), (-0.2, 0.25)):
        z = zr + (zf - zr if y < 0 else zb_ - zr) * abs(y - 0.02) / (D2 + 0.14) + 0.03
        objs.append(sphere('rstone', 0.06, (x, y, z), (1.2, 1, 0.65), (0, 0, random.uniform(0, 3)), m=stone, ico=2, disp=0.3, seed=int(x * 30 + 60)))
    straw = coop.M()['straw']
    for k in range(22):
        x = random.uniform(-W2 - 0.1, W2 + 0.1); side = random.choice((-1, 1))
        p = Vector((x, side * (D2 + 0.14) + 0.02, (zf if side < 0 else zb_) - 0.01)); d = Vector((random.uniform(-0.2, 0.2), side * 0.4, -1)).normalized(); L = random.uniform(0.04, 0.1)
        objs.append(cyl('straw', 0.0025, L, p + d * L / 2, d.to_track_quat('Z', 'Y').to_euler(), straw, verts=5, bevel=0))
    # the hens' door, its steps, the nest window (its lattice faded), an old lantern on a pole where the Pagoda's hangs
    pop_door(objs, FL, bam, None, None, steps=2)
    nest_window(objs, 'sil', FL, SIL_WX, bam, ww=SIL_WW, wh=SIL_WH, hollow=True, steps=2, nest_floor=SIL_NF, door='lattice', door_m=faded)
    lx, ly = LANT
    _cane(objs, (lx + 0.07, ly + 0.02, 0.0), (lx + 0.07, ly + 0.02, 0.86), 0.022, bam, node, nodes=3)
    _cane(objs, (lx + 0.07, ly + 0.02, 0.82), (lx - 0.02, ly, 0.84), 0.012, bam, node, nodes=0)
    objs.append(cyl('cord', 0.004, 0.1, (lx - 0.02, ly, 0.78), m=cord, verts=5, bevel=0.0))
    _paper_lantern(objs, 'box_sil', lx - 0.02, ly, 0.66, faded, _cs('node'), torn=True)
    _own(objs, root)
    return root


def shed_sil(seed=53):
    """Mended: a little hut of bamboo canes on a stone base, a roof of halved bamboo, half painted in its colour."""
    random.seed(seed)
    FL, EAVE, PEAK = SIL_FL, 0.75, 1.07                        # (high enough for the nest's lattice slid up above its window)
    root = empty('shed_sil'); objs = []
    bam, bam2, node = _cs('bamboo', var=0.06), _cs('bamboo2', var=0.06), _cs('node')
    stone = _cs('stone', rough=0.9, var=0.1); red = C('lacquer', '#b0312a', rough=0.4, coat=0.3)
    paper = C('paper', '#f3e3bd', rough=0.8); dark = C('hall_dark', '#1d1510', rough=1.0)
    WL, WR = SIL_WX - SIL_WW / 2, SIL_WX + SIL_WW / 2
    # a low base of flat stones
    objs.append(box('sbase', (2 * W2 + 0.1, 2 * D2 + 0.1, FL - 0.02), (0, 0, (FL - 0.02) / 2), m=_cs('stone2', rough=0.9), bevel=0.015, segs=1))
    for i in range(12):
        x = -W2 - 0.02 + i * (2 * W2 + 0.04) / 11
        if WL - 0.06 < x < WR + 0.06: continue
        objs.append(box('sface', (0.1, 0.03, 0.09), (x, -D2 - 0.05, 0.05), (0, 0, math.radians(random.uniform(-4, 4))), m=stone, bevel=0.01, segs=1, jitter=0.004))
    # the walls: bamboo canes standing side by side (the nest window and the hens' door left open); the back plain
    POPH = (-0.31 - POP_W / 2 - 0.0225, -0.31 + POP_W / 2 + 0.0225, FL, FL + POP_H + 0.0225)
    WINH = (WL - 0.02, WR + 0.02, 0.0, SIL_NF + 0.04 + SIL_WH + 0.01)
    R = 0.021
    def canes(u0, u1, place, holes=()):
        n = int((u1 - u0) / (2 * R + 0.003))
        for i in range(n):
            u = u0 + (i + 0.5) * (u1 - u0) / n; zs = [FL - 0.02, EAVE]
            for (h0, h1, hz0, hz1) in holes:
                if h0 - R < u < h1 + R: zs = [FL - 0.02, max(FL - 0.02, hz0), hz1, EAVE]
            for z0, z1 in zip(zs[::2], zs[1::2]):
                if z1 - z0 > 0.03:
                    a, b = place(u, z0), place(u, z1)
                    objs.append(cyl('cane', R, z1 - z0, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (z0 + z1) / 2), m=random.choice((bam, bam, bam2)), verts=6, bevel=0.0))
                    if z1 - z0 > 0.2:
                        for f in (0.33, 0.7):
                            zz = z0 + (z1 - z0) * (f + random.uniform(-0.05, 0.05))
                            objs.append(cyl('node', R * 1.15, 0.01, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zz), m=node, verts=6, bevel=0.0))
    canes(-W2, W2, lambda u, z: (u, -D2 + R, z), holes=(POPH, WINH))
    canes(-D2 + 0.03, D2 - 0.03, lambda u, z: (-W2 + R, u, z)); canes(-D2 + 0.03, D2 - 0.03, lambda u, z: (W2 - R, u, z))
    objs.append(box('backw', (2 * W2, 0.03, EAVE - FL), (0, D2 - 0.015, (FL + EAVE) / 2), m=bam2, bevel=0.0))
    for (size, loc) in (((0.01, 2 * D2 - 0.1, EAVE - FL), (W2 - 0.05, 0, (FL + EAVE) / 2)), ((0.01, 2 * D2 - 0.1, EAVE - FL), (-W2 + 0.05, 0, (FL + EAVE) / 2))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    # posts at the corners and a beam along the top: the left ones painted in its colour, the right still bare (half done)
    for (x, y) in ((-W2 - 0.01, -D2 - 0.01), (W2 + 0.01, -D2 - 0.01), (-W2 - 0.01, D2 + 0.01), (W2 + 0.01, D2 + 0.01)):
        objs.append(cyl('post', 0.035, EAVE - FL + 0.06, (x, y, (FL + EAVE) / 2), m=red if x < 0 else bam2, verts=10, bevel=0.003))
    objs.append(box('beam', (W2 + 0.06, 0.05, 0.05), (-W2 / 2 - 0.03, -D2 - 0.02, EAVE - 0.02), m=red, bevel=0.006, segs=1))
    objs.append(box('beam', (W2 + 0.06, 0.05, 0.05), (W2 / 2 + 0.03, -D2 - 0.02, EAVE - 0.02), m=bam2, bevel=0.006, segs=1))
    for x in (-W2 - 0.04, W2 + 0.04): objs.append(box('beams', (0.05, 2 * D2 + 0.1, 0.05), (x, 0, EAVE - 0.02), m=red if x < 0 else bam2, bevel=0.006, segs=1))
    for sx in (-1, 1): objs.append(prism_gable(sx * W2, EAVE - 0.01, PEAK - 0.04, D2, 0.03, bam2))
    # the roof: halved bamboo laid in rows down the slopes, a cane along the ridge
    for sy in (-1, 1):
        e = Vector((0, sy * (D2 + 0.17), EAVE - 0.05)); r_ = Vector((0, 0, PEAK)); nrm = Vector((0, sy * (PEAK - EAVE + 0.05), D2 + 0.17)).normalized()
        L = (e - r_).length; th = 0.03
        o = box('rboard', (2 * W2 + 0.3, L + 0.04, th), (0, 0, 0), m=bam2, bevel=0.006, segs=1)
        o.rotation_euler = (-sy * math.atan2(PEAK - EAVE + 0.05, D2 + 0.17), 0, 0); o.location = (r_ + e) / 2 + nrm * (th / 2); objs.append(o)
        n = 17
        for k in range(n):
            x = -W2 - 0.13 + (k + 0.5) * (2 * W2 + 0.26) / n
            a, b = r_ + nrm * th + Vector((x, 0, 0)), e + nrm * th + Vector((x, 0, 0)) + (e - r_).normalized() * 0.03
            objs.append(cyl('rcane', 0.03 if k % 2 else 0.026, (b - a).length, (a + b) / 2 + nrm * (0.004 if k % 2 else -0.004), (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=bam if k % 2 else node, verts=8, bevel=0.0))
    _cane(objs, (-W2 - 0.17, 0, PEAK + 0.05), (W2 + 0.17, 0, PEAK + 0.05), 0.04, bam, node, nodes=4)
    # the hens' door, its steps, the nest window (new paper, its lattice painted)
    pop_door(objs, FL, bam2, None, None, steps=2)
    nest_window(objs, 'sil', FL, SIL_WX, bam2, ww=SIL_WW, wh=SIL_WH, hollow=True, steps=2, nest_floor=SIL_NF, door='lattice', door_m=red)
    # a small lattice window with new paper by the door; the pot of lacquer and its brush; a paper lantern on its pole
    objs.append(box('paper', (0.16, 0.02, 0.14), (0.05, -D2 - 0.004, 0.46), m=paper, bevel=0.0))
    for k in (-1, 0, 1):
        objs.append(box('lat', (0.01, 0.015, 0.14), (0.05 + k * 0.053, -D2 - 0.015, 0.46), m=bam2, bevel=0.0))
        objs.append(box('lat', (0.16, 0.015, 0.01), (0.05, -D2 - 0.015, 0.46 + k * 0.047), m=bam2, bevel=0.0))
    px, py = -W2 - 0.2, -D2 + 0.1
    objs.append(cyl('ppot', 0.06, 0.1, (px, py, 0.05), m=_cs('ink', rough=0.4), verts=14, bevel=0.005))
    objs.append(cyl('ppaint', 0.055, 0.006, (px, py, 0.101), m=red, verts=14, bevel=0.0))
    objs.append(box('pdrip', (0.02, 0.004, 0.05), (px + 0.02, py - 0.058, 0.08), m=red, bevel=0.002, segs=1))
    objs.append(box('brush', (0.025, 0.16, 0.01), (px + 0.1, py + 0.02, 0.01), (0, 0, math.radians(25)), m=bam2, bevel=0.003, segs=1))
    objs.append(box('bristle', (0.04, 0.04, 0.016), (px + 0.14, py - 0.05, 0.012), (0, 0, math.radians(25)), m=red, bevel=0.004, segs=1))
    lx, ly = LANT
    _cane(objs, (lx + 0.07, ly + 0.02, 0.0), (lx + 0.07, ly + 0.02, 0.86), 0.022, bam, node, nodes=3)
    _cane(objs, (lx + 0.07, ly + 0.02, 0.82), (lx - 0.02, ly, 0.84), 0.012, bam, node, nodes=0)
    objs.append(cyl('cord', 0.004, 0.1, (lx - 0.02, ly, 0.78), m=_cs('cord'), verts=5, bevel=0.0))
    _paper_lantern(objs, 'shed_sil', lx - 0.02, ly, 0.66, C('lanternred', '#dc4b2e', rough=0.5), C('gold', '#d4a640', rough=0.3, metal=0.9))
    _own(objs, root)
    return root


def cherry_tree(objs, x, y, h=1.25, spread=0.42, seed=60):
    """A little cherry tree in blossom: a crooked trunk, branches, clouds of pink blossom, petals fallen round it."""
    random.seed(seed)
    trunk = _cs('trunk', rough=0.9, var=0.06, grain=0.3, grain_scale=G)
    bl = [_cs('blossom', rough=0.7, var=0.04), _cs('blossom2', rough=0.7, var=0.04), _cs('blossom3', rough=0.7, var=0.04)]
    pts = [Vector((x, y, 0.0)), Vector((x + 0.04, y - 0.02, h * 0.35)), Vector((x - 0.03, y + 0.02, h * 0.62))]
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        objs.append(cyl('trunk', 0.055 - k * 0.012, (b - a).length + 0.02, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=trunk, verts=9, r2=0.045 - k * 0.012, bevel=0.0))
    top = pts[-1]; tips = []
    for k in range(5):
        a = k / 5 * math.tau + 0.3; d = Vector((math.cos(a) * spread * 0.8, math.sin(a) * spread * 0.6, h * 0.28))
        tip = top + d; tips.append(tip)
        objs.append(cyl('branch', 0.022, d.length, top + d / 2, d.normalized().to_track_quat('Z', 'Y').to_euler(), m=trunk, verts=6, r2=0.012, bevel=0.0))
    clouds = tips + [top + Vector((0, 0, h * 0.36))]
    for k, c in enumerate(clouds):
        objs.append(sphere('blossom', spread * 0.42, c, (1.15, 1.05, 0.75), (0, 0, k), m=bl[k % 3], ico=2, disp=0.35, seed=k + seed))
        for j in range(3):
            q = c + Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.4, 0.6))) * spread * 0.35
            objs.append(sphere('blossom', spread * 0.22, q, (1, 1, 0.8), m=bl[(k + j + 1) % 3], ico=1, disp=0.3, seed=k * 3 + j + seed))
    for k in range(26):                                            # petals on the ground
        a = random.uniform(0, math.tau); d = random.uniform(0.1, spread * 1.3)
        objs.append(cyl('petal', 0.014, 0.003, (x + math.cos(a) * d, y + math.sin(a) * d, 0.004), (0, 0, a), m=bl[k % 3], verts=6, bevel=0.0))


def stone_lantern(objs, name, x, y):
    """A little stone lantern (a toro): a foot, a post, the firebox with its light, a roof, a knob."""
    st, st2 = _cs('stone', rough=0.9, var=0.06), _cs('stone2', rough=0.9, var=0.06)
    lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    objs.append(cyl('tbase', 0.1, 0.06, (x, y, 0.03), m=st2, verts=6, bevel=0.006))
    objs.append(cyl('tpost', 0.04, 0.26, (x, y, 0.19), m=st, verts=8, bevel=0.004))
    objs.append(cyl('tshelf', 0.085, 0.04, (x, y, 0.34), m=st2, verts=6, bevel=0.005))
    objs.append(box('tfire', (0.11, 0.11, 0.11), (x, y, 0.415), m=st, bevel=0.008, segs=1))
    objs.append(box('tglow', (0.06, 0.115, 0.06), (x, y, 0.415), m=lamp, bevel=0.0))
    objs.append(box('tglow', (0.115, 0.06, 0.06), (x, y, 0.415), m=lamp, bevel=0.0))
    objs.append(cyl('troof', 0.13, 0.08, (x, y, 0.51), (0, 0, math.pi / 6), m=st2, verts=6, r2=0.03, bevel=0.006))
    objs.append(sphere('tknob', 0.03, (x, y, 0.57), (1, 1, 1.3), m=st, ico=1))
    for k in range(3):
        a = k * 2.0 + 0.5
        objs.append(sphere('tmoss', 0.03, (x + math.cos(a) * 0.08, y + math.sin(a) * 0.08, 0.06), (1.3, 1, 0.5), m=_cs('moss', rough=0.95), ico=1, disp=0.3, seed=k))
    light_at(name, x, y, 0.415)


def _pagoda_bits(r, name, t, eave=0.74, roof=(W2 + 0.28, D2 + 0.26, 1.02), tree=(-1.15, 0.1), tree_h=1.25, bells=()):
    """What makes the Pagoda cosy (and stays on the Deluxe): a cherry tree in blossom, a stone lantern by its left side, a
    second paper lantern at the other front corner, azaleas along its base, the automatic door's box and its solar panel,
    glazed pots by the steps, flat stepping stones to the gate; bells: little gold bells at these roof corners."""
    random.seed(57 + t); objs = []
    cherry_tree(objs, *tree, h=tree_h, seed=60 + t)
    stone_lantern(objs, name, -W2 - 0.33, -0.2)
    lx, ly = -LANT[0], LANT[1]                                     # (the second lantern, mirrored: the birds walk round it)
    objs.append(cyl('cord', 0.004, 0.1, (lx, ly, eave), m=C('dark', '#2a1d16', rough=1.0), verts=5, bevel=0.0))
    _paper_lantern(objs, name, lx, ly, eave - 0.12, C('lanternred', '#dc4b2e', rough=0.5), C('gold', '#d4a640', rough=0.3, metal=0.9))
    BLOCKS.setdefault(name, []).append([round(lx, 3), round(-ly, 3), 0.11])
    az = [_cs('azalea', rough=0.6), _cs('azalea2', rough=0.6)]; leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    for (x, y) in ((W2 + 0.16, -0.2), (W2 + 0.16, 0.18), (-W2 - 0.16, 0.25), (0.0, D2 + 0.16), (0.4, D2 + 0.16)):
        objs.append(sphere('azbush', 0.09, (x, y, 0.07), (1.2, 1, 0.75), m=leaf[0], ico=2, disp=0.3, seed=int(x * 10 + y * 13 + 70)))
        for k in range(7):
            a = k / 7 * math.tau
            objs.append(sphere('azflower', 0.022, (x + math.cos(a) * 0.07, y + math.sin(a) * 0.06, 0.1 + 0.03 * (k % 2)), m=az[k % 2], ico=1))
    # the automatic door: its box over the hens' door (a green light), its solar panel on the lower roof's front
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = SIL_FL + POP_H + 0.07
    objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.045, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, zb), m=led, seg=8, rings=4))
    X, Y, z1 = roof; e0 = Vector((0, -Y, eave + 0.02)); t0 = Vector((0, -0.24, z1))
    dn = (e0 - t0).normalized(); nrm = Vector((0, -(z1 - eave - 0.02), Y - 0.24)).normalized()
    c = t0.lerp(e0, 0.5) + nrm * 0.06 + Vector((0.34, 0, 0))
    objs.append(plank('solarframe', c - dn * 0.09, c + dn * 0.09, 0.23, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for i in range(2):
        for j in range(3):
            cc = c + nrm * 0.012 + dn * (-0.045 + i * 0.09) + Vector((-0.072 + j * 0.072, 0, 0))
            objs.append(plank('solarcell', cc - dn * 0.04, cc + dn * 0.04, 0.065, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # glazed pots of little pines either side of the foot of the steps (the birds walk round them)
    pot = _cs('celadon', rough=0.35, spec=0.5); pine = C('rleaf1', '#3f7a35', rough=0.8)
    for (x, y) in ((-0.66, -0.86), (0.04, -0.86)):
        objs.append(cyl('gpot', 0.07, 0.1, (x, y, 0.05), m=pot, verts=14, r2=0.06, bevel=0.006))
        objs.append(cyl('ptrunk', 0.012, 0.12, (x, y, 0.14), (0.2, 0, 0), m=_cs('trunk'), verts=6, bevel=0.0))
        for k in range(3):
            objs.append(sphere('ppine', 0.05 - k * 0.008, (x + 0.02 * (k - 1), y - 0.01 * k, 0.17 + k * 0.035), (1.4, 1.2, 0.5), m=pine, ico=1, disp=0.25, seed=k + 80))
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.12])
    # flat stepping stones from the foot of the steps to the gate
    stone = _barn_m('stone', rough=0.9, grain=0.0, bump=0.2, bump_scale=60, var=0.12)
    gx, gy = _gate_of(t, 'sil'); a, b = Vector((-0.31, -1.0)), Vector((gx, gy + 0.32)); n = max(3, round((b - a).length / 0.25))
    for k in range(n + 1):
        q = a.lerp(b, k / n); x, y = q.x + 0.05 * math.sin(k * 2.1), q.y
        objs.append(cyl('stepstone', 0.085 + random.uniform(-0.01, 0.015), 0.025, (x, y, 0.012), (0, 0, random.uniform(0, 3)), m=stone, verts=9, bevel=0.006))
    gold = C('gold', '#d4a640', rough=0.3, metal=0.9)
    for (bx, by, bz) in bells:                                     # little bells at the roofs' corners
        objs.append(cyl('bcord', 0.003, 0.05, (bx, by, bz - 0.025), m=gold, verts=4, bevel=0.0))
        objs.append(cyl('bell', 0.022, 0.04, (bx, by, bz - 0.07), m=gold, verts=10, r2=0.012, bevel=0.0))
    _own(objs, r)
    return r


def cosy_sil():
    r = pagoda(name='cosy_sil'); _pagoda_bits(r, 'cosy_sil', 3)
    return r


def deluxe_sil():
    r = pagoda(tiers=3, name='deluxe_sil')
    bells = [(sx * (W2 + 0.28), sy * (D2 + 0.26), 0.74 + 0.02 + 0.15) for sx in (-1, 1) for sy in (-1, 1)] + [(sx * 0.42, sy * 0.33, 1.21 + 0.11) for sx in (-1, 1) for sy in (-1, 1)]
    _pagoda_bits(r, 'deluxe_sil', 4, tree=(1.3, 0.35), tree_h=1.45, bells=bells)
    return r


# ---- the Pagoda's gardens (its own: Audrey, 27 Oct): a clay bowl for water in the small pens, a celadon one in the Cosy;
# Cosy: a swing under a little red torii, a big glazed bowl of sand, the cabbage hanging from a bamboo pole; Deluxe: a zen
# garden of raked sand with three stones for the sand bath, a koi pond with a bamboo spout for water, a feeder of dark
# lacquered wood under a little curved roof, a xylophone of bamboo, the swing.
PENS_BY['sil'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(-0.7, -1.05), dish=(0.6, -1.05), bowl='clay', hay=None, hay_rot=0, sack=None,
            straw=((0.1, -1.3, 0.25, 22), (-0.5, -1.45, 0.2, 15))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(0.55, -1.6), dish=(-0.85, -0.95), bowl='clay', hay=None, hay_rot=0, sack=(1.12, 0.3),
            straw=((-0.6, -1.5, 0.3, 28), (0.9, -1.0, 0.25, 20))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(-1.25, -1.25), dish=(0.55, -1.55), bowl='celadon', hay=(1.6, 0.55), hay_rot=0, sack=None,
            straw=((1.6, 0.55, 0.4, 35), (-0.4, -1.6, 0.35, 35), (1.2, -2.0, 0.3, 25))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(0.95, -1.75), feeder_style='pagoda', dish=(-1.6, -0.1), water='pond', hay=(-2.0, 0.55), hay_rot=90,
            sack=None, pebbles=10, straw=((0.4, -1.3, 0.3, 25), (-2.0, 0.55, 0.4, 35))),
}
PLAY_BY['sil'] = {3: dict(swing=(1.35, -1.1), sbowl=(-1.3, -2.2), cabbage=(0.95, -2.25), frame='torii', holder='bamboo'),
                  4: dict(swing=(1.55, -2.4), zen=(-1.35, -2.45), cabbage=(1.6, -1.0), xylo=(-1.35, -1.25), frame='torii', holder='bamboo', bars='bamboo')}
SBOWL_R = 0.26                                                  # the Cosy Pagoda's glazed bowl of sand
ZEN_W, ZEN_D = 0.9, 0.6                                         # the Deluxe Pagoda's zen garden (x, y)


def sand_bowl(objs, x, y):
    """The Cosy Pagoda's sand bath: a big shallow glazed bowl full of sand on a low wooden ring, a little spilt round it."""
    gl, gl2 = _cs('celadon', rough=0.3, spec=0.5), _cs('celadon2', rough=0.3, spec=0.5)
    sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    objs.append(cyl('sbfoot', SBOWL_R - 0.05, 0.03, (x, y, 0.015), m=_cs('trunk'), verts=16, bevel=0.004))
    objs.append(cyl('sbowl', SBOWL_R - 0.04, 0.07, (x, y, 0.065), m=gl, verts=24, r2=SBOWL_R + 0.02, bevel=0.01))
    bpy.ops.mesh.primitive_torus_add(major_radius=SBOWL_R + 0.015, minor_radius=0.015, major_segments=28, minor_segments=6, location=(x, y, 0.1))
    o = bpy.context.object; setmat(o, gl2); objs.append(o)
    objs.append(sphere('sbsand', SBOWL_R - 0.005, (x, y, 0.088), (1, 1, 0.06), m=sand, ico=3, disp=0.1, seed=17))
    for k in range(5):
        a = random.uniform(0, math.tau)
        objs.append(sphere('dspill', random.uniform(0.04, 0.06), (x + math.cos(a) * (SBOWL_R + 0.1), y + math.sin(a) * (SBOWL_R + 0.1), 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 23))


def zen_garden(objs, x, y):
    """The Deluxe Pagoda's sand bath: a low frame of dark wood round raked pale sand, three mossy stones at its corners."""
    wood = _cs('ink', rough=0.6, var=0.05); sand = _cs('sand', rough=0.95, var=0.03); raked = _cs('raked', rough=0.95)
    hw, hd, H = ZEN_W / 2, ZEN_D / 2, 0.07
    for (a, b, n) in (((x - hw, y - hd), (x + hw, y - hd), (0, -1, 0)), ((x - hw, y + hd), (x + hw, y + hd), (0, 1, 0)),
                      ((x - hw, y - hd), (x - hw, y + hd), (-1, 0, 0)), ((x + hw, y - hd), (x + hw, y + hd), (1, 0, 0))):
        objs.append(plank('zframe', (a[0], a[1], H / 2), (b[0], b[1], H / 2), H, 0.035, n, wood, jitter=0.2))
    objs.append(box('zsand', (ZEN_W - 0.04, ZEN_D - 0.04, 0.05), (x, y, 0.035), m=sand, bevel=0.0))
    for k in range(7):                                             # the raked lines, along x
        yy = y - hd + 0.06 + k * (ZEN_D - 0.12) / 6
        objs.append(box('zline', (ZEN_W - 0.1, 0.012, 0.008), (x, yy, 0.062), m=raked, bevel=0.0))
    st = _cs('stone2', rough=0.9, var=0.08); moss = _cs('moss', rough=0.95)
    for k, (sx, sy, r_) in enumerate(((-0.8, 0.65, 0.07), (0.85, -0.6, 0.055), (0.7, 0.7, 0.045))):
        cx_, cy_ = x + sx * hw, y + sy * hd
        objs.append(sphere('zstone', r_, (cx_, cy_, 0.06), (1.2, 1, 0.9), (0, 0, k), m=st, ico=2, disp=0.25, seed=k + 31))
        objs.append(sphere('zmoss', r_ * 0.6, (cx_, cy_, 0.06 + r_ * 0.7), (1.3, 1.1, 0.4), m=moss, ico=1, disp=0.2, seed=k))
        bpy.ops.mesh.primitive_torus_add(major_radius=r_ * 1.5, minor_radius=0.006, major_segments=16, minor_segments=4, location=(cx_, cy_, 0.062))
        o = bpy.context.object; setmat(o, raked); objs.append(o)


def torii_swing(objs, x, y):
    """The Pagoda's swing frame: a little red torii, its lower beam the swing's bar."""
    red = C('lanternred', '#dc4b2e', rough=0.5); ink = _cs('ink', rough=0.6)
    for sx in (-1, 1):
        objs.append(cyl('tpost', 0.026, SWING_TOP + 0.1, (x + sx * SWING_HALF, y, (SWING_TOP + 0.1) / 2), m=red, verts=10, bevel=0.003))
        objs.append(cyl('tfoot', 0.034, 0.05, (x + sx * SWING_HALF, y, 0.025), m=ink, verts=10, bevel=0.003))
    objs.append(cyl('swbar', 0.022, 2 * SWING_HALF + 0.06, (x, y, SWING_TOP), (0, math.radians(90), 0), m=red, verts=10, bevel=0.0))
    me = bpy.data.meshes.new('kasagi'); bm = bmesh.new(); L = SWING_HALF + 0.17; vs = []
    for k in range(9):                                             # the top beam, its ends sweeping up
        u = -1 + 2 * k / 8; xx = x + u * L; zz = SWING_TOP + 0.13 + 0.05 * u ** 4
        vs.append([bm.verts.new((xx, y + dy, zz + dz)) for (dy, dz) in ((-0.035, -0.02), (0.035, -0.02), (0.035, 0.02), (-0.035, 0.02))])
    for a, b in zip(vs, vs[1:]):
        for i in range(4): bm.faces.new((a[i], a[(i + 1) % 4], b[(i + 1) % 4], b[i]))
    bm.faces.new(vs[0][::-1]); bm.faces.new(vs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('kasagi', me)); setmat(o, ink); soften(o, 0.006, 1); objs.append(o)
    objs.append(box('shimaki', (2 * L - 0.08, 0.06, 0.03), (x, y, SWING_TOP + 0.085), m=red, bevel=0.004, segs=1))


def cabbage_bamboo(objs, x, y):
    """The Pagoda's way of hanging the cabbage: a bamboo post and an arm of bamboo out over the yard."""
    bam, node = _cs('bamboo', var=0.06), _cs('node')
    px, py = x, y + 0.28
    _cane(objs, (px, py, 0.0), (px, py, CAB_TOP + 0.05), 0.025, bam, node, nodes=2)
    _cane(objs, (px, py + 0.03, CAB_TOP), (px, y - 0.03, CAB_TOP), 0.018, bam, node, nodes=1)
    objs.append(sphere('tknot', 0.026, (px, py, CAB_TOP), m=coop.M()['twine'], ico=1))
    for k in range(3):
        a = k * 2.1 + 0.4
        objs.append(sphere('cstone', 0.035, (px + math.cos(a) * 0.06, py + math.sin(a) * 0.06, 0.012), (1.2, 1, 0.6), m=_cs('stone', rough=0.9), ico=1, disp=0.2, seed=k))


def bamboo_xylophone(objs, x, y):
    """A xylophone of bamboo: six canes across a low frame, shorter towards one end, for pecking."""
    bam, node, ink = _cs('bamboo', var=0.05), _cs('node'), _cs('ink', rough=0.6)
    for sy in (-1, 1):
        objs.append(box('xrail', (0.26, 0.03, 0.025), (x, y + sy * 0.16, 0.085), m=ink, bevel=0.005, segs=1))
        for sx in (-1, 1):
            objs.append(box('xleg', (0.03, 0.03, 0.08), (x + sx * 0.1, y + sy * 0.16, 0.04), m=ink, bevel=0.004, segs=1))
    for k in range(6):
        yy = y - 0.13 + k * 0.052; L = 0.26 - k * 0.025
        objs.append(cyl('xbar', 0.018, L, (x, yy, 0.108), (0, math.radians(90), 0), m=bam, verts=8, bevel=0.0))
        objs.append(cyl('xnode', 0.0205, 0.008, (x + L * 0.2, yy, 0.108), (0, math.radians(90), 0), m=node, verts=8, bevel=0.0))
    objs.append(cyl('xmallet', 0.006, 0.16, (x + 0.08, y + 0.2, 0.015), (math.radians(90), 0, math.radians(30)), m=ink, verts=6, bevel=0.0))
    objs.append(sphere('xmhead', 0.018, (x + 0.12, y + 0.27, 0.018), m=bam, seg=8, rings=6))


# ---- release 4, the Stone Cottage's five looks (Audrey, 27 Oct: "The other four coops", one at a time, shown first).
# Rustic (box_leg): a hut of dry-stone walls, its front an old blue door laid on its side (the paint faded, holes cut for
#   the hens), a roof of a few big old slates on two planks, moss and stones on it (the hint: the cottage's blue door).
# Mended (shed_leg): a little stone hut newly pointed, its roof slated half way (battens bare above, a stack of slates by
#   it), a new pine door, a pot of blue paint.
# Snug (house_leg): today's cottage.
# Cosy (cosy_leg): window frames painted duck-egg blue, wisteria along the front, a window box of red geraniums, a dovecote
#   on a pole with two white doves, blue hydrangeas by the ramp, a lantern, the automatic door's box and its solar panel,
#   square flagstones to the gate.
# Deluxe (deluxe_leg): a storey taller, two dormer windows in the slates, a slated porch hood over the blue door on stone
#   brackets, stone balls on the gables, a chimney at each end; the cosy touches.
# The hens come, go and lay the same way in every look (NESTS['house_leg']: the floor 0.18, the ramp, the nest window with
# its door let down).
CL = dict(drystone=('#a39a88', '#8f8778', '#b2a893', '#857e71'), faded='#7f9db3', faded2='#93abbd', bare='#9a8670', slab='#6d7378',
          slab2='#5d6369', moss='#6b7a46', pine='#d4b07a', pine2='#c39f6a', mortar='#b9b0a0', duck='#9ec9c2', wist='#9a7fc4',
          wist2='#b49ad6', gera='#d8383f', hydr='#7fa3d8', hydr2='#9bb8e6', dove='#f4f2ee', flag='#a49d90', flag2='#918a7d', iron='#2b2926')


def _cl(key, rough=0.85, **kw):
    v = CL[key]
    return C('cl_' + key, v if isinstance(v, str) else v[0], rough=rough, **kw)


def _drystone(objs, u0, u1, place, z0, top, ms, holes=(), seed=0):
    """A wall of rough stones stacked without mortar from z0 up to top(u) (uneven), leaving holes (u0, u1, z0, z1)."""
    z, row = z0, 0
    while True:
        h = random.uniform(0.08, 0.12); u = u0 - (0.06 if row % 2 else 0.0)
        if z + h * 0.5 > max(top(u0), top(u1), top((u0 + u1) / 2)) + 0.05: break
        while u < u1:
            w = random.uniform(0.13, 0.24); ub = min(u1, u + w); um = (u + ub) / 2
            if ub - u > 0.05 and z + h * 0.5 < top(um) + random.uniform(-0.06, 0.02) and not any(a < um < b and c < z + h / 2 < d for (a, b, c, d) in holes):
                o = box('dstone', (ub - u - 0.02, 0.07, h - 0.012), (0, 0, 0), m=random.choice(ms), bevel=0.02, segs=1, jitter=0.012)
                place(o, um, z + h / 2); objs.append(o)
            u = ub
        z += h; row += 1


def box_leg(seed=61):
    """Rustic: a dry-stone hut, an old blue door for its front, a roof of old slates."""
    random.seed(seed)
    FL, WX, TOP = 0.18, 0.44, 0.72
    root = empty('box_leg'); objs = []
    ms = [C('cl_ds%d' % i, h, rough=0.9, var=0.08) for i, h in enumerate(CL['drystone'])]
    faded, faded2, bare = _cl('faded', rough=0.8, var=0.05), _cl('faded2', rough=0.8, var=0.05), _cl('bare', rough=0.85, var=0.08, grain=0.3, grain_scale=G)
    iron = _cl('iron', rough=0.5, metal=0.5); dark = C('hall_dark', '#1d1510', rough=1.0)
    WL, WR = WX - WIN_W / 2, WX + WIN_W / 2
    # three walls of dry stone (the back and the sides), dark inside; under the front a row of stones
    def side(o, u, v, sx): o.location = (sx * (W2 - 0.03), u, v); o.rotation_euler = (0, 0, math.radians(90))
    _drystone(objs, -D2, D2, lambda o, u, v: side(o, u, v, -1), 0.0, lambda u: TOP - 0.04 * (u + D2) / D2, ms)
    _drystone(objs, -D2, D2, lambda o, u, v: side(o, u, v, 1), 0.0, lambda u: TOP - 0.04 * (u + D2) / D2, ms)
    def back(o, u, v): o.location = (u, D2 - 0.03, v)
    _drystone(objs, -W2 + 0.04, W2 - 0.04, back, 0.0, lambda u: TOP - 0.08, ms)
    def front(o, u, v): o.location = (u, -D2 + 0.03, v)
    _drystone(objs, -W2, W2, front, 0.0, lambda u: FL if not (WL - 0.02 < u < WR + 0.02) else 0.2, ms)
    for (size, loc) in (((2 * W2 - 0.16, 0.01, TOP - FL), (0, D2 - 0.08, (FL + TOP) / 2)), ((0.01, 2 * D2 - 0.12, TOP - FL), (W2 - 0.08, 0, (FL + TOP) / 2)),
                        ((0.01, 2 * D2 - 0.12, TOP - FL), (-W2 + 0.08, 0, (FL + TOP) / 2))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    # the front: an old door laid on its side, boards across (holes cut for the hens' door and the nest), the paint flaking
    POPH = (-0.31 - POP_W / 2, -0.31 + POP_W / 2, FL, FL + POP_H); WINH = (WL, WR, FL + 0.04, FL + 0.04 + WIN_H)
    z, k = FL, 0
    while z < TOP + 0.04:
        h = 0.135 if k < 4 else TOP + 0.06 - z
        spans = [(-W2 - 0.02, W2 + 0.02)]
        for (h0, h1, hz0, hz1) in (POPH, WINH):
            if z + h > hz0 + 0.01 and z < hz1 - 0.01: spans = [p for s_ in spans for p in ((s_[0], min(s_[1], h0)), (max(s_[0], h1), s_[1])) if p[1] - p[0] > 0.03]
        for (a, b) in spans:
            m_ = bare if (k == 2 and a > 0) else random.choice((faded, faded, faded2))
            objs.append(plank('dboard', (a, -D2 - 0.012, z + h / 2), (b, -D2 - 0.012, z + h / 2), h * 0.96, 0.03, (0, -1, 0), m_, jitter=0.4))
        z += h; k += 1
    for (x0, x1) in ((-0.6, -0.5), (0.0, 0.08)):                   # its ledges (upright now it's on its side) and a brace
        objs.append(plank('dledge', ((x0 + x1) / 2, -D2 - 0.032, FL + 0.02), ((x0 + x1) / 2, -D2 - 0.032, TOP), 0.07, 0.02, (0, -1, 0), faded2, jitter=0.5))
    objs.append(plank('dbrace', (-0.5, -D2 - 0.034, FL + 0.05), (0.0, -D2 - 0.034, TOP - 0.03), 0.06, 0.018, (0, -1, 0), faded2, jitter=0.5))
    objs.append(sphere('dknob', 0.022, (0.16, -D2 - 0.05, FL + 0.48), m=C('brass', '#c99a3c', rough=0.3, metal=0.9), seg=10, rings=6))
    for zz in (FL + 0.08, TOP - 0.05): objs.append(box('dhinge', (0.16, 0.012, 0.03), (-0.65 + 0.08, -D2 - 0.03, zz), m=iron, bevel=0.003, segs=1))
    # the roof: two old planks from front to back, big old slates on them (a gap where one slipped), moss, stones on top
    slab, slab2, moss = _cl('slab', rough=0.7, var=0.1), _cl('slab2', rough=0.7, var=0.1), _cl('moss', rough=0.95)
    zf, zb = TOP + 0.08, TOP + 0.0
    for x in (-0.38, 0.38):
        objs.append(plank('rplank', (x, -D2 - 0.12, zf), (x, D2 + 0.1, zb), 0.12, 0.03, (0, 0, 1), bare, jitter=0.6))
    nrm = Vector((0, zf - zb, 2 * D2 + 0.22)).normalized()
    for row in range(3):
        for col in range(4):
            if (row, col) == (1, 2): continue                       # (one slipped off: it lies on the ground by the wall)
            x = -W2 - 0.08 + (col + 0.5) * (2 * W2 + 0.16) / 4 + (0.04 if row % 2 else 0)
            y0 = -D2 - 0.14 + row * 0.33; y1 = y0 + 0.4
            za = zf + (zb - zf) * (y0 + D2 + 0.14) / (2 * D2 + 0.24) + 0.03 + 0.012 * (2 - row); zb_ = zf + (zb - zf) * (y1 + D2 + 0.14) / (2 * D2 + 0.24) + 0.03 + 0.012 * (2 - row)
            objs.append(plank('rslate', (x, y0, za), (x, y1, zb_), (2 * W2 + 0.16) / 4 * random.uniform(0.9, 1.0), 0.018, nrm, random.choice((slab, slab2)), jitter=2.0, bevel=0.004))
    gx, gy = -0.05, D2 + 0.06                                      # (the gap: dark underneath)
    objs.append(plank('gapdark', (gx, gy - 0.3, zb + 0.035), (gx, gy, zb + 0.02), 0.28, 0.005, nrm, dark, jitter=0.0, bevel=0.0))
    objs.append(plank('fallen', (-W2 - 0.25, 0.1, 0.012), (-W2 - 0.25, 0.48, 0.012), 0.3, 0.018, (0, 0, 1), slab2, jitter=4.0, bevel=0.004))
    for (x, y, r_) in ((-0.35, -0.2, 0.06), (0.4, 0.05, 0.07), (0.1, 0.3, 0.05)):
        z = zf + (zb - zf) * (y + D2 + 0.14) / (2 * D2 + 0.24) + 0.07
        objs.append(sphere('rstone', r_, (x, y, z), (1.2, 1, 0.7), (0, 0, x), m=random.choice(ms), ico=2, disp=0.3, seed=int(x * 50 + 80)))
    for k in range(8):
        x, y = random.uniform(-0.55, 0.55), random.uniform(-0.45, 0.4)
        z = zf + (zb - zf) * (y + D2 + 0.14) / (2 * D2 + 0.24) + 0.06
        objs.append(sphere('rmoss', random.uniform(0.03, 0.05), (x, y, z), (1.4, 1.1, 0.35), m=moss, ico=1, disp=0.3, seed=k + 50))
    # the hens' door (no frame: the hole in the old door), a short plank for a ramp, the nest window (its door an old board)
    _ramp(objs, FL, bare, bare, w=0.17, slats=2)
    nest_window(objs, 'leg', FL, WX, faded2, hollow=True, door='drop', door_m=bare)
    straw_bits(objs, (-0.2, -D2 - 0.15, 0), 0.25, 20, 0.0)
    _own(objs, root)
    return root


def shed_leg(seed=63):
    """Mended: a little stone hut newly pointed, its roof slated half way, a new pine door, a pot of blue paint."""
    random.seed(seed)
    FL, WX, EAVE, PEAK = 0.18, 0.44, 0.76, 1.16
    root = empty('shed_leg'); objs = []
    mortar = _cl('mortar', rough=0.95); stones = [C('st%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))]
    pine, pine2 = _cl('pine', rough=0.75, var=0.08, grain=0.35, grain_scale=G), _cl('pine2', rough=0.75, var=0.08, grain=0.35, grain_scale=G)
    slate = C('slate2', '#57657a', rough=0.65, var=0.12, hue_var=0.01); ridge = C('ridge2', '#46525f', rough=0.6)
    blue = C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G); dark = C('hall_dark', '#1d1510', rough=1.0)
    core = box('core', (2 * W2 - 0.02, 2 * D2 - 0.02, EAVE), (0, 0, EAVE / 2), m=mortar, bevel=0.0); objs.append(core)
    for sx in (-1, 1): objs.append(prism_gable(sx * (W2 - 0.01), EAVE - 0.01, PEAK - 0.06, D2 - 0.01, 0.03, mortar))
    holes = {'front': [(-0.31 - POP_W / 2 - 0.04, -0.31 + POP_W / 2 + 0.04, 0.0, FL + POP_H + 0.05), (-0.1, 0.2, 0.0, 0.62), (WX - WIN_W / 2 - 0.02, WX + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)], 'right': [], 'left': [], 'back': []}
    def wall(side, length, place, top=lambda u: EAVE):
        z = 0.0; row = 0
        while z < PEAK:
            h = random.uniform(0.095, 0.125); u = -length / 2 - (0.07 if row % 2 else 0.0)
            while u < length / 2:
                w = random.uniform(0.15, 0.27); u1 = min(length / 2, u + w); um = (u + u1) / 2
                if u1 - u > 0.05 and z + h * 0.5 < top(um) and not any(a < um < b and c < z + h / 2 < d for (a, b, c, d) in holes[side]):
                    o = box('stone', (u1 - u - 0.016, 0.04, h - 0.016), (0, 0, 0), m=random.choice(stones), bevel=0.012, segs=1, jitter=0.002)
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
    # the roof: battens across both slopes, slates on the front slope's lower half, the rest still bare; a ridge board
    over = 0.13
    for sy in (-1, 1):
        e0 = Vector((0, sy * (D2 + over), EAVE - 0.04)); r0 = Vector((0, 0, PEAK + 0.02)); nrm = Vector((0, sy * (PEAK - EAVE + 0.06), D2 + over)).normalized()
        for x in (-W2 - 0.1, -0.2, 0.2, W2 + 0.1):                 # rafters
            objs.append(plank('rafter', r0 + Vector((x, 0, 0)), e0 + Vector((x, 0, 0)), 0.05, 0.04, (1, 0, 0), pine2, jitter=0.3))
        n = 9
        for k in range(n + 1):                                     # battens
            q = r0.lerp(e0, k / n) + nrm * 0.03
            objs.append(plank('batten', q + Vector((-W2 - 0.12, 0, 0)), q + Vector((W2 + 0.12, 0, 0)), 0.03, 0.02, nrm, pine, jitter=0.3))
        if sy < 0:                                                  # slates on the lower rows, left to right, the top rows to come
            rows = 6
            for rr in range(rows):
                t = 1 - rr / 11
                if rr == rows - 1: xs_end = 0.15                    # (the last row half done)
                else: xs_end = W2 + 0.12
                base = r0.lerp(e0, t) + nrm * (0.05 + 0.006 * rr); x = -W2 - 0.12 + (0.06 if rr % 2 else 0)
                while x < xs_end:
                    w = 0.12
                    a, b = base + Vector((x + w / 2, 0, 0)) - (e0 - r0).normalized() * 0.07, base + Vector((x + w / 2, 0, 0)) + (e0 - r0).normalized() * 0.07
                    objs.append(plank('sh', a, b, w * 0.94, 0.016, nrm, slate, jitter=1.2, bevel=0.004))
                    x += w
    objs.append(plank('ridgeb', (-W2 - 0.12, 0, PEAK + 0.05), (W2 + 0.12, 0, PEAK + 0.05), 0.08, 0.025, (0, 0, 1), pine2, jitter=0.2))
    for x in (-W2 - 0.11, W2 + 0.11):
        for sy in (-1, 1):
            objs.append(plank('barge', (x, 0, PEAK + 0.05), (x, sy * (D2 + over), EAVE - 0.05), 0.07, 0.025, (1 if x > 0 else -1, 0, 0), pine2, jitter=0.2))
    objs.append(box('inside', (2 * W2 - 0.2, 2 * D2 - 0.2, 0.01), (0, 0, EAVE - 0.02), m=dark, bevel=0.0))
    # a new pine door (not painted yet), the nest window, the hens' door and ramp, the pot of blue paint by the door
    arched_door(objs, 0.05, -D2 - 0.01, 0.0, 0.25, 0.6, pine, pine2, _cl('iron', rough=0.5, metal=0.5))
    nest_window(objs, 'leg', FL, WX, pine2, solids=[core], door='drop', door_m=pine)
    pop_door(objs, FL, pine2, pine, pine2)
    px, py = 0.2, -D2 - 0.12
    objs.append(cyl('ptin', 0.06, 0.11, (px - 0.0, py - 0.02, 0.055), m=C('bx_painttin', '#c9cdcf', rough=0.4, metal=0.7), verts=14, bevel=0.005))
    objs.append(cyl('ppaint', 0.055, 0.006, (px, py - 0.02, 0.111), m=blue, verts=14, bevel=0.0))
    objs.append(box('pdrip', (0.02, 0.004, 0.05), (px + 0.02, py - 0.078, 0.08), m=blue, bevel=0.002, segs=1))
    # a stack of slates waiting by the left gable, a few stones
    for k in range(7):
        objs.append(box('slatestack', (0.26, 0.17, 0.014), (-W2 - 0.25 + random.uniform(-0.01, 0.01), 0.05 + random.uniform(-0.01, 0.01), 0.008 + k * 0.015), (0, 0, random.uniform(-0.08, 0.08)), m=slate, bevel=0.003, segs=1))
    for k in range(3):
        objs.append(sphere('dstone', 0.05, (-W2 - 0.25 + k * 0.1, 0.35, 0.03), (1.2, 1, 0.6), m=random.choice(stones), ico=2, disp=0.3, seed=k + 90))
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 14, 0.0)
    _own(objs, root)
    return root


def dovecote(objs, x, y, h=1.05):
    """A white dovecote on a pole: three round doors, a slate roof, two white doves on its ledge."""
    white = C('cupwhite', '#f1ece2', rough=0.6, var=0.03); dark = C('hall_dark', '#1d1510', rough=1.0)
    pole = C('darkwood', '#6d4a31', rough=0.8); slate = C('slate2', '#57657a', rough=0.65, var=0.12, hue_var=0.01); dove = _cl('dove', rough=0.6)
    objs.append(cyl('dpole', 0.025, h, (x, y, h / 2), m=pole, verts=8, bevel=0.0))
    objs.append(box('dbox', (0.22, 0.18, 0.16), (x, y, h + 0.08), m=white, bevel=0.01, segs=1))
    objs.append(box('dledge', (0.26, 0.05, 0.015), (x, y - 0.11, h + 0.02), m=white, bevel=0.004, segs=1))
    for k in (-1, 0, 1):
        objs.append(cyl('dhole', 0.022, 0.01, (x + k * 0.065, y - 0.091, h + 0.09), (math.radians(90), 0, 0), m=dark, verts=10, bevel=0.0))
    for sx in (-1, 1):
        a, b = Vector((x, y, h + 0.26)), Vector((x + sx * 0.15, y, h + 0.15))
        objs.append(plank('droof', (a + b) / 2 + Vector((0, -0.13, 0)), (a + b) / 2 + Vector((0, 0.13, 0)), (b - a).length + 0.02, 0.02, (sx * 0.11, 0, 0.15), slate, jitter=0.0, bevel=0.004))
    for yy in (y - 0.09, y + 0.09): objs.append(_tri('dgable', (x - 0.11, yy, h + 0.16), (x + 0.11, yy, h + 0.16), (x, yy, h + 0.25), (0, 1, 0), 0.01, white))
    for k, dx in enumerate((-0.07, 0.06)):                          # two doves on the ledge
        cx = x + dx
        objs.append(sphere('dove', 0.03, (cx, y - 0.115, h + 0.055), (1.3, 0.9, 0.9), (0, 0, 0.3 * (1 - 2 * k)), m=dove, seg=10, rings=6))
        objs.append(sphere('dovehead', 0.016, (cx + 0.025 * (1 - 2 * k), y - 0.125, h + 0.085), m=dove, seg=8, rings=5))
        objs.append(cyl('dovebeak', 0.005, 0.012, (cx + 0.04 * (1 - 2 * k), y - 0.125, h + 0.083), (0, math.radians(90 * (1 - 2 * k)), 0), m=C('lanternred', '#dc4b2e', rough=0.5), verts=4, r2=0.0, bevel=0.0))


def _stone_bits(r, name, t, eave=0.86, peak=1.4, seed=65, panel_x=-0.3):
    """What makes the Stone Cottage cosy (and stays on the Deluxe): its window frames duck-egg blue, wisteria hanging along
    the front eave, a window box of red geraniums on its side window, a dovecote on a pole by its right side, a lantern by
    the hens' door, the automatic door's box and its solar panel, blue hydrangeas by the ramp, square flagstones to the gate."""
    random.seed(seed); objs = []
    _swap(r, {'trimw'}, _cl('duck', rough=0.55, var=0.03))
    wist, wist2 = _cl('wist', rough=0.6), _cl('wist2', rough=0.6); leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    ye, ze = -D2 - 0.14, eave - 0.06                               # (the front eave's edge)
    x = -W2 - 0.08
    while x < W2 + 0.08:
        objs.append(sphere('wleaf', 0.045, (x, ye, ze), (1.3, 0.8, 0.6), m=random.choice(leaf), ico=1, disp=0.3, seed=int(x * 100) + 200))
        if random.random() < 0.8:                                   # a raceme hanging from the vine
            L = random.uniform(0.1, 0.17)
            for j in range(4):
                objs.append(sphere('wflower', 0.024 - j * 0.004, (x + random.uniform(-0.01, 0.01), ye - 0.005, ze - 0.03 - j * L / 4), (1, 1, 1.3), m=wist if (j + int(x * 50)) % 2 else wist2, ico=1))
        x += random.uniform(0.07, 0.1)
    for k in range(10):                                            # its old stem up the front right corner
        objs.append(sphere('wleaf', 0.04, (W2 + 0.03, -D2 - 0.04, 0.05 + k * (ze - 0.05) / 9), (1, 0.7, 1.2), m=leaf[k % 2], ico=1, disp=0.3, seed=k + 220))
    # a window box of red geraniums under the side window
    gera = _cl('gera', rough=0.55)
    objs.append(box('flowerbox', (0.09, 0.3, 0.07), (W2 + 0.09, 0.0, 0.41), m=_cl('duck', rough=0.55, var=0.03), bevel=0.008, segs=1))
    for k in range(7):
        y = -0.12 + k * 0.04
        objs.append(sphere('leafp', 0.03, (W2 + 0.09, y, 0.455), (1, 1, 0.8), m=leaf[k % 2], ico=1, disp=0.2, seed=k + 240))
        objs.append(sphere('flower', 0.022, (W2 + 0.1, y + 0.01, 0.48), m=gera, ico=1))
    dovecote(objs, W2 + 0.4, -0.12)
    # a lantern by the hens' door
    iron = _cl('iron', rough=0.5, metal=0.5); lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    lx, ly, lz = -0.545, -D2 - 0.1, 0.56
    objs.append(box('larm', (0.025, 0.09, 0.025), (lx, -D2 - 0.045, lz + 0.07), m=iron, bevel=0.004, segs=1))
    objs.append(box('lanternb', (0.07, 0.07, 0.1), (lx, ly, lz), m=iron, bevel=0.006, segs=1))
    objs.append(box('lanterng', (0.076, 0.076, 0.065), (lx, ly, lz), m=lamp, bevel=0.0))
    objs.append(cyl('lroof', 0.06, 0.05, (lx, ly, lz + 0.075), (0, 0, math.pi / 4), m=iron, verts=4, r2=0.0, bevel=0.0))
    light_at(name, lx, ly, lz)
    # the automatic door: its box over the hens' door, its solar panel on the slates
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = 0.18 + POP_H + 0.07
    objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.045, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, zb), m=led, seg=8, rings=4))
    e0 = Vector((0, -(D2 + 0.13), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02)); dn = (e0 - r0).normalized()
    nrm = Vector((0, -(peak - eave + 0.08), D2 + 0.13)).normalized()
    c = r0 + (e0 - r0) * 0.6 + nrm * 0.06 + Vector((panel_x, 0, 0))
    objs.append(plank('solarframe', c - dn * 0.1, c + dn * 0.1, 0.25, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for i in range(2):
        for j in range(3):
            cc = c + nrm * 0.012 + dn * (-0.05 + i * 0.1) + Vector((-0.08 + j * 0.08, 0, 0))
            objs.append(plank('solarcell', cc - dn * 0.044, cc + dn * 0.044, 0.072, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # blue hydrangeas in pots either side of the foot of the ramp (the birds walk round them)
    potm = C('terra', '#b0603a', rough=0.8); hy = [_cl('hydr', rough=0.6), _cl('hydr2', rough=0.6)]
    for (x, y) in ((-0.64, -0.92), (0.02, -0.92)):
        objs.append(cyl('pot', 0.075, 0.12, (x, y, 0.06), m=potm, verts=14, r2=0.06, bevel=0.006))
        objs.append(sphere('hleaf', 0.07, (x, y, 0.15), (1.2, 1.2, 0.7), m=leaf[0], ico=2, disp=0.25, seed=int(x * 10) + 250))
        for k in range(5):
            aa = k / 5 * math.tau
            objs.append(sphere('hydr', 0.04, (x + math.cos(aa) * 0.045, y + math.sin(aa) * 0.045, 0.19 + 0.02 * (k % 2)), m=hy[k % 2], ico=2, disp=0.35, seed=k + 260))
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.12])
    # square flagstones from the foot of the ramp to the gate
    fl = [_cl('flag', rough=0.9, var=0.08), _cl('flag2', rough=0.9, var=0.08)]
    gx, gy = _gate_of(t, 'leg'); a, b = Vector((-0.31, -1.02)), Vector((gx, gy + 0.32)); n = max(3, round((b - a).length / 0.24))
    for k in range(n + 1):
        q = a.lerp(b, k / n)
        objs.append(box('flagstone', (0.16, 0.16, 0.02), (q.x + random.uniform(-0.02, 0.02), q.y, 0.01), (0, 0, math.radians(random.uniform(-12, 12))), m=random.choice(fl), bevel=0.008, segs=1))
    _own(objs, r)
    return r


def cosy_leg():
    r = stone(name='cosy_leg'); _stone_bits(r, 'cosy_leg', 3)
    return r


def deluxe_leg():
    """Deluxe: a storey taller, two dormers in the slates, a slated porch hood over the blue door, stone balls on the gables,
    a chimney at each end; the cosy touches."""
    EAVE, PEAK = 1.15, 1.8
    r = stone(eave=EAVE, peak=PEAK, name='deluxe_leg')
    random.seed(67); objs = []
    stones = [C('st%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))]
    slate = C('slate2', '#57657a', rough=0.65, var=0.12, hue_var=0.01); ridge = C('ridge2', '#46525f', rough=0.6); barge = C('barge2', '#3e4652', rough=0.7)
    lint = C('lintel', '#d2c8b2', rough=0.85); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0); trim = C('trimw', '#efe9dc', rough=0.6)
    # a second chimney on the right gable, stone balls on both gables' tops
    for i in range(int((PEAK + 0.35) / 0.1)):
        objs.append(box('chst', (0.24, 0.22, 0.095), (W2 + 0.11, 0.28, 0.05 + i * 0.1), m=random.choice(stones), bevel=0.012, segs=1, jitter=0.004))
    objs.append(cyl('chimpot', 0.05, 0.12, (W2 + 0.11, 0.28, PEAK + 0.4), m=C('terra', '#b0603a', rough=0.8), verts=10, bevel=0.0))
    # windows upstairs in the front wall (under the eave) and in the left gable
    window(objs, -W2 - 0.04, 0.0, 1.2, 0.2, 0.2, trim, glass, normal=(-1, 0, 0))
    # two dormers on the front slope: stone cheeks, a little slate gable roof, a window
    e0 = Vector((0, -(D2 + 0.13), EAVE - 0.06)); r0 = Vector((0, 0, PEAK + 0.02)); slope = (PEAK - EAVE + 0.08) / (D2 + 0.13)
    zr = lambda y: PEAK + 0.02 + y * slope + 0.05                   # (the slates' face, y < 0)
    for xd in (-0.45, 0.12):
        yf = -D2 + 0.02; zf0 = zr(yf); h = 0.3
        objs.append(box('dormer', (0.3, 0.46, h + 0.25), (xd, yf + 0.23, zf0 + (h - 0.25) / 2), m=random.choice(stones), bevel=0.01, segs=1))
        window(objs, xd, yf - 0.005, zf0 + h * 0.45, 0.16, 0.16, trim, glass)
        top = zf0 + h + 0.13
        for sx in (-1, 1):
            a, b = Vector((xd, yf - 0.06, top)), Vector((xd + sx * 0.2, yf - 0.06, zf0 + h - 0.02))
            objs.append(plank('dslate', (a + b) / 2, (a + b) / 2 + Vector((0, 0.55, 0)), (b - a).length + 0.03, 0.03, Vector((sx * (top - b.z), 0, abs(b.x - a.x))).normalized(), slate, jitter=0.0, bevel=0.006))
        objs.append(_tri('dface', (xd - 0.15, yf - 0.002, zf0 + h - 0.03), (xd + 0.15, yf - 0.002, zf0 + h - 0.03), (xd, yf - 0.002, top - 0.02), (0, 1, 0), 0.02, random.choice(stones)))
        objs.append(cyl('dridge', 0.025, 0.56, (xd, yf + 0.22, top + 0.01), (math.radians(90), 0, 0), m=ridge, verts=8, bevel=0.0))
    # a slated porch hood over the blue door on two stone brackets
    px, ph, pz = 0.055, 0.42, 0.74
    for sx in (-1, 1):
        a, b = Vector((px, -D2 - 0.02, pz + 0.17)), Vector((px + sx * 0.24, -D2 - 0.02, pz))
        objs.append(plank('hood', (a + b) / 2, (a + b) / 2 + Vector((0, -0.3, 0)), (b - a).length + 0.03, 0.03, Vector((sx * 0.17, 0, 0.24)).normalized(), slate, jitter=0.0, bevel=0.006))
        objs.append(box('corbel', (0.06, 0.24, 0.1), (px + sx * 0.18, -D2 - 0.12, pz - 0.07), m=lint, bevel=0.01, segs=1))
    objs.append(cyl('hridge', 0.022, 0.33, (px, -D2 - 0.17, pz + 0.18), (math.radians(90), 0, 0), m=ridge, verts=8, bevel=0.0))
    objs.append(box('hgable', (0.42, 0.03, 0.03), (px, -D2 - 0.31, pz + 0.01), m=lint, bevel=0.006, segs=1))
    for sx in (-1, 1):                                             # stone balls on the gables' tops
        objs.append(sphere('gball', 0.05, (sx * (W2 + 0.02), 0, PEAK + 0.03), m=lint, seg=12, rings=8))
    _own(objs, r)
    _stone_bits(r, 'deluxe_leg', 4, eave=EAVE, peak=PEAK, panel_x=0.5)
    r.name = 'deluxe_leg'
    return r


# ---- the Stone Cottage's gardens (its own: Audrey, 27 Oct): an old stone sink for water in the small pens, a stone bowl in
# the Cosy; Cosy: a swing from the low branch of an old apple tree, a wheelbarrow full of sand, the cabbage hanging from an
# iron shepherd's crook; Deluxe: a little blue rowing boat full of sand, a water butt dripping into a stone basin, a feeder
# like a tiny stone house with a slate roof, the apple-tree swing, the crook, the xylophone.
PENS_BY['leg'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(0.6, -0.95), dish=(-0.62, -1.42), water='sink', hay=None, hay_rot=0, sack=None,
            straw=((-0.2, -1.1, 0.25, 22), (0.4, -1.45, 0.2, 15))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(-0.35, -1.62), dish=(0.95, -1.15), water='sink', hay=None, hay_rot=0, sack=None,
            straw=((-0.8, -1.0, 0.3, 28), (0.5, -1.7, 0.25, 20))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(0.55, -1.35), dish=(-0.5, -2.35), bowl='stone', hay=(-1.7, 0.45), hay_rot=0, sack=None,
            straw=((-1.7, 0.45, 0.4, 35), (0.2, -1.9, 0.35, 35), (-0.9, -1.0, 0.3, 25))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(0.6, -1.5), feeder_style='stonehouse', dish=(1.85, -1.55), water='butt', hay=(-1.95, 0.5), hay_rot=90,
            sack=None, pebbles=10, straw=((0.1, -2.0, 0.3, 25), (-1.95, 0.5, 0.4, 35))),
}
PLAY_BY['leg'] = {3: dict(swing=(-1.2, -1.55), barrow=(1.25, -2.3), cabbage=(1.3, -0.95), frame='tree', holder='crook'),
                  4: dict(swing=(1.5, -2.45), boat=(-1.4, -2.3), cabbage=(1.55, -0.95), xylo=(-1.4, -1.15), frame='tree', holder='crook')}
BARROW_W, BARROW_D, BARROW_Y = 0.46, 0.32, 0.17                 # the Cosy cottage's wheelbarrow of sand (x, y; the sand's height)
BOAT_W, BOAT_D = 0.8, 0.42                                      # the Deluxe cottage's rowing boat of sand
TREE_DX = -0.45                                                 # the apple tree's trunk, beside its swing


def _frustum(name, cx, cy, z0, z1, w0, d0, w1, d1, m, pointed=0.0):
    """A tub: a box wider at the top (w1 x d1 at z1) than its floor (w0 x d0 at z0), open; pointed: its ends drawn to a point
    (a boat), by that much."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for (z, w, d) in ((z0, w0, d0), (z1, w1, d1)):
        pts = [(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)] if not pointed else \
              [(-w / 2 + pointed, -d / 2), (w / 2 - pointed, -d / 2), (w / 2, 0), (w / 2 - pointed, d / 2), (-w / 2 + pointed, d / 2), (-w / 2, 0)]
        rings.append([bm.verts.new((cx + px, cy + py, z)) for (px, py) in pts])
    n = len(rings[0])
    bm.faces.new(rings[0][::-1])
    for i in range(n): bm.faces.new((rings[0][i], rings[0][(i + 1) % n], rings[1][(i + 1) % n], rings[1][i]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.02; so.offset = 1
    soften(o, 0.006, 1)
    return o


def wheelbarrow(objs, x, y):
    """The Cosy cottage's sand bath: an old wheelbarrow full of sand, its wheel at one end, its handles at the other."""
    tray = _cl('faded', rough=0.6, metal=0.3); wood = coop.M()['wood']; iron = _cl('iron', rough=0.5, metal=0.5)
    sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    objs.append(_frustum('btray', x, y, 0.08, BARROW_Y + 0.03, BARROW_W - 0.12, BARROW_D - 0.1, BARROW_W, BARROW_D, tray))
    objs.append(box('bsand', (BARROW_W - 0.06, BARROW_D - 0.05, 0.02), (x, y, BARROW_Y - 0.005), m=sand, bevel=0.01, segs=1))
    for sy in (-1, 1):
        objs.append(plank('bhandle', (x - 0.48, y + sy * 0.13, 0.15), (x + 0.24, y + sy * 0.1, 0.07), 0.03, 0.025, (0, 0, 1), wood, jitter=0.3))
        objs.append(plank('bleg', (x - 0.16, y + sy * 0.12, 0.0), (x - 0.16, y + sy * 0.12, 0.1), 0.025, 0.025, (1, 0, 0), iron, jitter=0.2))
    objs.append(cyl('bwheel', 0.075, 0.035, (x + 0.29, y, 0.075), (math.radians(90), 0, 0), m=C('rubber', '#2c2c2c', rough=0.8), verts=16, bevel=0.006))
    objs.append(cyl('bhub', 0.03, 0.045, (x + 0.29, y, 0.075), (math.radians(90), 0, 0), m=iron, verts=10, bevel=0.0))
    for k in range(5):
        a = random.uniform(0, math.tau)
        objs.append(sphere('dspill', random.uniform(0.04, 0.06), (x + math.cos(a) * 0.3, y + math.sin(a) * 0.26, 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 33))


def sand_boat(objs, x, y):
    """The Deluxe cottage's sand bath: a little blue rowing boat full of sand, a white stripe along it, an oar beside it."""
    blue = C('bluedoor', '#3b6890', rough=0.55, var=0.05, grain=0.2, grain_scale=G); white = C('trimw', '#efe9dc', rough=0.6)
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); wood = coop.M()['wood']
    objs.append(_frustum('hull', x, y, 0.0, 0.13, BOAT_W - 0.24, BOAT_D - 0.2, BOAT_W, BOAT_D, blue, pointed=0.18))
    objs.append(_frustum('stripe', x, y, 0.09, 0.115, BOAT_W - 0.03, BOAT_D - 0.02, BOAT_W + 0.005, BOAT_D + 0.004, white, pointed=0.18))
    objs.append(_frustum('bsand', x, y, 0.06, 0.1, BOAT_W - 0.14, BOAT_D - 0.12, BOAT_W - 0.04, BOAT_D - 0.04, sand, pointed=0.16))
    me = bpy.data.meshes.new('bsandtop'); bm = bmesh.new(); w, d, pt = BOAT_W - 0.05, BOAT_D - 0.05, 0.17
    vs = [bm.verts.new((x + px, y + py, 0.1)) for (px, py) in ((-w / 2 + pt, -d / 2), (w / 2 - pt, -d / 2), (w / 2, 0), (w / 2 - pt, d / 2), (-w / 2 + pt, d / 2), (-w / 2, 0))]
    bm.faces.new(vs); bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('bsandtop', me)); setmat(o, sand); objs.append(o)
    objs.append(box('seat', (0.06, BOAT_D - 0.06, 0.02), (x - 0.2, y, 0.115), m=wood, bevel=0.004, segs=1))
    objs.append(cyl('oar', 0.012, 0.6, (x + 0.05, y - BOAT_D / 2 - 0.1, 0.014), (0, math.radians(90), math.radians(8)), m=wood, verts=6, bevel=0.0))
    objs.append(box('oarblade', (0.14, 0.06, 0.012), (x + 0.38, y - BOAT_D / 2 - 0.06, 0.012), (0, 0, math.radians(8)), m=wood, bevel=0.003, segs=1))
    objs.append(cyl('bucket', 0.04, 0.06, (x - 0.45, y + 0.2, 0.03), m=C('lanternred', '#dc4b2e', rough=0.5), verts=10, r2=0.05, bevel=0.0))


def tree_swing(objs, x, y):
    """The Stone Cottage's swing: from the low branch of an old apple tree beside it."""
    bark = C('cs_trunk', CS['trunk'], rough=0.9, var=0.06, grain=0.3, grain_scale=G)
    leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]; apple = C('apple', '#d23b2c', rough=0.5)
    tx = x + TREE_DX
    pts = [Vector((tx, y, 0.0)), Vector((tx + 0.03, y + 0.02, 0.45)), Vector((tx - 0.02, y - 0.01, 0.95))]
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        objs.append(cyl('trunk', 0.06 - k * 0.012, (b - a).length + 0.03, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=9, r2=0.05 - k * 0.012, bevel=0.0))
    a, b = Vector((tx + 0.02, y, SWING_TOP + 0.06)), Vector((x + SWING_HALF + 0.06, y, SWING_TOP + 0.02))       # the low branch the swing hangs from
    objs.append(cyl('swbar', 0.026, (b - a).length, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=8, r2=0.016, bevel=0.0))
    for k in range(6):                                             # the crown, over the trunk and along the branch
        c = Vector((tx + random.uniform(-0.15, 0.35), y + random.uniform(-0.2, 0.2), 1.0 + random.uniform(0.0, 0.2)))
        objs.append(sphere('crown', random.uniform(0.17, 0.24), c, (1.1, 1.05, 0.85), (0, 0, k), m=leaf[k % 2], ico=2, disp=0.3, seed=k + 270))
    for k in range(8):
        objs.append(sphere('apple', 0.025, (tx + random.uniform(-0.2, 0.45), y + random.uniform(-0.25, 0.25), random.uniform(0.85, 1.05)), m=apple, ico=1))
    for k in range(3):
        objs.append(sphere('apple', 0.024, (tx + random.uniform(-0.3, 0.3), y + random.uniform(-0.3, 0.3), 0.02), m=apple, ico=1))


def cabbage_crook(objs, x, y):
    """The Stone Cottage's way of hanging the cabbage: an iron shepherd's crook, its hook curled over it."""
    iron = _cl('iron', rough=0.5, metal=0.5)
    px, py = x, y + 0.28
    objs.append(cyl('crook', 0.012, CAB_TOP + 0.08, (px, py, (CAB_TOP + 0.08) / 2), m=iron, verts=8, bevel=0.0))
    prev = Vector((px, py, CAB_TOP + 0.08))
    for k in range(1, 8):                                          # the hook: up, over and down to the cabbage's string
        a = math.pi * k / 7
        q = Vector((px, py - 0.14 + 0.14 * math.cos(a), CAB_TOP + 0.08 + 0.1 * math.sin(a)))
        objs.append(cyl('crook', 0.011, (q - prev).length + 0.004, (prev + q) / 2, (q - prev).normalized().to_track_quat('Z', 'Y').to_euler(), m=iron, verts=6, bevel=0.0)); prev = q
    q = Vector((px, y, CAB_TOP))
    objs.append(cyl('crook', 0.011, (q - prev).length, (prev + q) / 2, (q - prev).normalized().to_track_quat('Z', 'Y').to_euler(), m=iron, verts=6, bevel=0.0))
    objs.append(sphere('cfoot', 0.03, (px, py, 0.01), (1.3, 1.3, 0.4), m=iron, ico=1))


# ---- release 4, the Timber Lodge's five looks (Audrey, 27 Oct: "The other four coops", one at a time, shown first).
# Rustic (box_bra): a woodpile hut: split firewood stacked for its sides and back, rough bark-edged slab boards for its front
#   on an old log, a roof of bark sheets on three poles under pine boughs, two logs on top to hold them down; a chopping
#   stump by it (the hint: the lodge's logs and its green roof).
# Mended (shed_bra): a little cabin of new peeled logs, chinked on one side so far (the bucket of chinking by it), a roof of
#   rough slab boards weighed down with stones, a new plank door, fresh logs stacked by its side.
# Snug (house_bra): today's lodge.
# Cosy (cosy_bra): a woodpile under a little roof against its left side, a wreath of pine and cones on its door, a birdhouse
#   on the lantern post, a mossy stump with red toadstools and ferns in a hollow log by the ramp, the automatic door's box and
#   its solar panel, rounds of log for stepping stones to the gate.
# Deluxe (deluxe_bra): a storey taller, a gable over the door with a window and crossed logs at its peak (and at the gables'
#   peaks), a window with green shutters in its side, a tall chimney of river stones, a shingled hood over the door with a
#   lantern, a carved wooden bear by its corner; the cosy touches.
# The hens come, go and lay the same way in every look (NESTS['house_bra']: the floor 0.26, the ramp, the nest window with
# its door let down); something stands where the lodge's lantern post does (the birds walk round it).
CB = dict(bark='#5e4a3a', bark2='#6e5846', endg='#cfa268', split='#dcb985', fresh='#dcb27a', fresh2='#cba06a', slab='#9b7a58',
          slab2='#86684a', pine='#3f6b3a', pine2='#4f7e45', cone='#7a5232', chink='#e6dfcc', green='#4b7a48', shutter='#3e6b47',
          copper='#c27a4a', bowl='#9a6b43', toad='#d23b2c', spot='#f6f0e6', moss='#6b7a46', fern='#5b8c3e', fern2='#47773a',
          bear='#7a5230', bear2='#5a3a22', rstone=('#9a948a', '#a8a093', '#857f76', '#b3ab9c'), bow='#c8283c', bird='#b54a3a',
          iron='#2b2926', log='#8d5b34', mortar='#5d554b')


def _cb(key, rough=0.85, **kw):
    v = CB[key]
    return C('cb_' + key, v if isinstance(v, str) else v[0], rough=rough, **kw)


def _log(objs, a, b, r, m, end_m=None, verts=10, name='log', ends=(True, True), r2=None):
    """A log from a to b, its sawn ends showing (end_m)."""
    a, b = Vector(a), Vector(b); d = b - a; rot = d.normalized().to_track_quat('Z', 'Y').to_euler()
    objs.append(cyl(name, r, d.length, (a + b) / 2, rot, m=m, verts=verts, r2=r2, bevel=0.0))
    if end_m:
        for p, s, rr, on in ((a, -1, r, ends[0]), (b, 1, r2 or r, ends[1])):
            if on: objs.append(cyl(name + 'end', rr * 0.86, 0.01, p + d.normalized() * s * 0.004, rot, m=end_m, verts=verts, bevel=0.0))


def _log_walls(objs, EAVE, r, ms, endg, gaps, over=0.1, side_win=True):
    """A cabin's walls the lodge's way: logs along x front and back, along y on the sides half a log higher, their ends
    crossing at the corners; the front cut round gaps (x0, x1, z0, z1), the right side round its little window."""
    z = r; row = 0
    while z < EAVE:
        for y in (-D2, D2):
            zz = z if row % 2 == 0 else z + r
            spans = [(-W2 - over, W2 + over)]
            if y < 0:
                for (a, b, c, d) in gaps:
                    if c < zz < d:
                        spans = [s for sp in spans for s in ((sp[0], min(sp[1], a)), (max(sp[0], b), sp[1])) if s[1] - s[0] > 0.04]
            for a, b in spans:
                objs.append(cyl('log', r, b - a, ((a + b) / 2, y, zz), (0, math.radians(90), 0), random.choice(ms), verts=10, bevel=0.0))
            for x in (-W2 - over, W2 + over):
                objs.append(cyl('end', r * 0.9, 0.012, (x + (0.008 if x > 0 else -0.008), y, zz), (0, math.radians(90), 0), endg, verts=10, bevel=0.0))
        for x in (-W2, W2):
            zz = z + r if row % 2 == 0 else z
            if side_win and x > 0 and 0.38 < zz < 0.62:
                for a, b in ((-D2 - over, -0.14), (0.14, D2 + over)):
                    objs.append(cyl('log', r, b - a, (x, (a + b) / 2, zz), (math.radians(90), 0, 0), random.choice(ms), verts=10, bevel=0.0))
            else:
                objs.append(cyl('log', r, 2 * D2 + 2 * over, (x, 0, zz), (math.radians(90), 0, 0), random.choice(ms), verts=10, bevel=0.0))
            for y in (-D2 - over, D2 + over):
                objs.append(cyl('end', r * 0.9, 0.012, (x, y + (0.008 if y > 0 else -0.008), zz), (math.radians(90), 0, 0), endg, verts=10, bevel=0.0))
        z += 2 * r; row += 1


def box_bra(seed=71):
    """Rustic: a woodpile hut, a slab-board front on an old log, a roof of bark sheets and pine boughs."""
    random.seed(seed)
    FL, WX, ZF, ZB = 0.26, 0.44, 0.8, 0.9                         # the hens' floor, the nest window, the roof's front and back
    root = empty('box_bra'); objs = []
    bark = [_cb('bark', var=0.08, grain=0.3, grain_scale=G), _cb('bark2', var=0.08, grain=0.3, grain_scale=G)]
    endg, split = _cb('endg', var=0.06), _cb('split', var=0.06)
    slab, slab2 = _cb('slab', var=0.08, grain=0.35, grain_scale=G), _cb('slab2', var=0.08, grain=0.35, grain_scale=G)
    pine = [_cb('pine', rough=0.9), _cb('pine2', rough=0.9)]; cone = _cb('cone'); dark = C('hall_dark', '#1d1510', rough=1.0)
    top = lambda y: ZF + (ZB - ZF) * (y + D2) / (2 * D2) - 0.05      # (the walls stop under the roof)
    # its sides: split firewood stacked front to back, two pieces deep, their ends showing; its back the same, along x
    for sx in (-1, 1):
        z, row = 0.05, 0
        while z < top(0) + 0.02:
            for j in range(2 if z < 0.45 else 1):                  # (stepped: two deep low down, one higher up)
                xc = sx * (W2 + 0.03 + j * 0.1) + (0.015 if row % 2 else -0.01) * sx
                for (y0, y1) in ((-D2 - 0.02, -0.01), (0.01, D2 + 0.02)):
                    if z > top((y0 + y1) / 2) + 0.03: continue
                    rr = random.uniform(0.045, 0.058)
                    _log(objs, (xc, y0 + random.uniform(-0.015, 0.015), z), (xc, y1 + random.uniform(-0.015, 0.015), z), rr, random.choice(bark),
                         split if random.random() < 0.35 else endg, verts=7, name='fw', ends=(y0 < -0.1, y1 > 0.1))
            z += 0.092; row += 1
    z = 0.05
    while z < ZB - 0.06:
        for k in range(3):
            _log(objs, (-W2 + 0.12 + k * 0.4, D2 - 0.05, z), (-W2 + 0.12 + (k + 1) * 0.4 - 0.02, D2 - 0.05, z), random.uniform(0.045, 0.055), random.choice(bark), None, verts=7, name='fw')
        z += 0.095
    for (size, loc) in (((2 * W2 - 0.08, 0.01, ZB - FL), (0, D2 - 0.11, (FL + ZB) / 2)), ((0.01, 2 * D2 - 0.12, ZB - FL), (W2 - 0.03, 0, (FL + ZB) / 2)),
                        ((0.01, 2 * D2 - 0.12, ZB - FL), (-W2 + 0.03, 0, (FL + ZB) / 2)), ((2 * W2 - 0.08, 2 * D2 - 0.1, 0.01), (0, 0, ZF - 0.04))):
        objs.append(box('inside', size, loc, m=dark, bevel=0.0))
    # its front: an old log along the bottom, rough slab boards standing on it (bark on their edges), cut round the hens'
    # door and the nest window
    _log(objs, (-W2 - 0.12, -D2 + 0.05, 0.09), (W2 + 0.12, -D2 + 0.05, 0.09), 0.09, bark[0], endg, verts=12, name='sill')
    POPH = (-0.31 - POP_W / 2, -0.31 + POP_W / 2, FL, FL + POP_H); WINH = (WX - WIN_W / 2, WX + WIN_W / 2, 0.2, 0.24 + WIN_H)
    x = -W2 + 0.01
    while x < W2 - 0.03:
        w = min(random.uniform(0.1, 0.15), W2 - 0.01 - x); xm = x + w / 2; zt = ZF + random.uniform(-0.03, 0.03)
        spans = [(0.17, zt)]
        for (h0, h1, hz0, hz1) in (POPH, WINH):
            if h0 - 0.01 < xm < h1 + 0.01:
                new = []
                for (a, b) in spans:
                    if b > hz0 and a < hz1:
                        if hz0 - a > 0.03: new.append((a, hz0))
                        if b - hz1 > 0.03: new.append((hz1, b))
                    else: new.append((a, b))
                spans = new
        for (za, zb) in spans:
            m_ = slab if random.random() < 0.6 else slab2
            objs.append(plank('slab', (xm, -D2 - 0.012, za), (xm, -D2 - 0.012, zb), w * 0.94, 0.03, (0, -1, 0), m_, jitter=0.5))
            if random.random() < 0.5:                               # (its bark edge)
                objs.append(plank('slabbark', (x + 0.012, -D2 - 0.03, za + 0.02), (x + 0.012, -D2 - 0.03, zb - 0.01), 0.022, 0.012, (0, -1, 0), bark[1], jitter=0.4))
        x += w
    for (a, b) in ((-W2 + 0.01, POPH[0] - 0.02), (POPH[1] + 0.02, WINH[0] - 0.02)):      # two rails nailed across it
        objs.append(plank('rail', (a, -D2 - 0.035, 0.32), (b, -D2 - 0.035, 0.32), 0.05, 0.02, (0, -1, 0), slab2, jitter=0.6))
    objs.append(plank('rail', (-W2 + 0.01, -D2 - 0.035, ZF - 0.045), (W2 - 0.01, -D2 - 0.035, ZF - 0.045), 0.05, 0.02, (0, -1, 0), slab2, jitter=0.6))
    # the roof: three poles across, sheets of bark on them front to back, pine boughs over the bark, two logs to hold it all down
    for (y, zz) in ((-D2 - 0.08, ZF), (0.0, (ZF + ZB) / 2), (D2 + 0.04, ZB)):
        _log(objs, (-W2 - 0.24, y, zz), (W2 + 0.24, y, zz + 0.01), 0.035, bark[0], endg, verts=8, name='pole')
    nrm = Vector((0, -(ZB - ZF), 2 * D2 + 0.12)).normalized()
    n = 6; RW = 2 * W2 + 0.44
    for k in range(n):
        xc = -RW / 2 + (k + 0.5) * RW / n + random.uniform(-0.02, 0.02)
        a = Vector((xc, -D2 - 0.16, ZF - 0.012 + 0.04)); b = Vector((xc, D2 + 0.12, ZB + 0.008 + 0.04))
        objs.append(plank('barksheet', a + nrm * (0.006 * (k % 2)), b + nrm * (0.006 * (k % 2)), RW / n * 1.12, 0.022, nrm, random.choice(bark), jitter=1.4, bevel=0.006))
    fir = [C('cb_fir1', '#2f5a30', rough=0.9), C('cb_fir2', '#3d6b38', rough=0.9), C('cb_fir3', '#4a7a40', rough=0.9)]
    for k in range(9):                                              # (each bough a few bushy tufts along its branch)
        u = -W2 + 0.05 + k * (2 * W2 - 0.1) / 8 + random.uniform(-0.05, 0.05); v0 = random.uniform(-D2 - 0.05, 0.05); a = random.uniform(-0.6, 0.6)
        for j in range(4):
            v = v0 + j * 0.09; uu = u + math.sin(a) * j * 0.09; zz = ZF + (ZB - ZF) * (v + D2) / (2 * D2) + 0.06 + 0.012 * j
            objs.append(sphere('bough', random.uniform(0.065, 0.085), (uu, v, zz), (1.1, 1.0, 0.4), (0, 0, random.uniform(0, 3)), m=random.choice(fir), ico=2, disp=0.6, disp_scale=6.0, seed=k * 5 + j + 300))
    for k in range(3):
        objs.append(sphere('cone', 0.025, (random.uniform(-0.5, 0.5), random.uniform(-0.3, 0.2), ZF + 0.14), (1, 1, 1.5), (math.radians(80), 0, k), m=cone, ico=1, disp=0.3, seed=k + 320))
    for (y, zz) in ((-0.22, ZF + 0.12), (0.22, ZB + 0.09)):
        _log(objs, (-W2 - 0.1, y, zz), (W2 + 0.12, y, zz + 0.01), 0.05, bark[1], endg, verts=9, name='weight')
    # the hens' door (just the hole), a slab for a ramp, the nest window (its door a slab board)
    _ramp(objs, FL, slab2, bark[0], w=0.17, slats=3)
    nest_window(objs, 'bra', FL, WX, slab2, hollow=True, nest_floor=0.2, door='drop', door_m=slab)
    # the chopping stump where the lodge's lantern post stands, a split piece on it, two more by it
    sx_, sy_ = -0.62, -D2 - 0.28
    objs.append(cyl('stump', 0.1, 0.22, (sx_, sy_, 0.11), m=bark[0], verts=12, r2=0.095, bevel=0.0))
    objs.append(cyl('stumptop', 0.088, 0.012, (sx_, sy_, 0.222), m=endg, verts=12, bevel=0.0))
    _log(objs, (sx_ - 0.05, sy_ - 0.01, 0.255), (sx_ + 0.07, sy_ + 0.02, 0.255), 0.032, bark[1], split, verts=6, name='piece')
    for k, (dx, dy, a) in enumerate(((0.16, -0.06, 0.4), (-0.12, -0.15, 1.9))):
        c = Vector((sx_ + dx, sy_ + dy, 0.03)); d = Vector((math.cos(a), math.sin(a), 0)) * 0.09
        _log(objs, c - d, c + d, 0.03, bark[k], split, verts=6, name='piece')
    straw_bits(objs, (-0.2, -D2 - 0.15, 0), 0.25, 20, 0.0)
    _own(objs, root)
    return root


def shed_bra(seed=73):
    """Mended: a little cabin of new peeled logs, chinked on one side so far, a roof of slab boards weighed down with stones."""
    random.seed(seed)
    FL, WX, EAVE, PEAK = 0.26, 0.44, 0.8, 1.2
    root = empty('shed_bra'); objs = []
    fresh = [_cb('fresh', var=0.06, grain=0.35, grain_scale=G), _cb('fresh2', var=0.06, grain=0.35, grain_scale=G)]
    endg = _cb('endg', var=0.05); slab, slab2 = _cb('slab', var=0.08, grain=0.35, grain_scale=G), _cb('slab2', var=0.08, grain=0.35, grain_scale=G)
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); chink = _cb('chink', rough=0.95)
    stones = [C('cb_rs%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(CB['rstone'])]
    # inside: chinked white on the left so far, the right still dark between its logs
    coreL = box('core', (W2 + 0.02 - 0.03, 2 * D2 - 0.06, EAVE), ((-W2 + 0.03 + 0.02) / 2, 0, EAVE / 2), m=chink, bevel=0.0)
    coreR = box('core', (W2 - 0.03 - 0.02, 2 * D2 - 0.06, EAVE), ((0.02 + W2 - 0.03) / 2, 0, EAVE / 2), m=C('lodgeinside', '#3a2a1e', rough=1.0), bevel=0.0)
    objs += [coreL, coreR]
    gaps = [(-0.31 - POP_W / 2 - 0.03, -0.31 + POP_W / 2 + 0.03, 0.24, FL + POP_H + 0.05), (-0.07, 0.23, 0.0, 0.63), (WX - WIN_W / 2 - 0.03, WX + WIN_W / 2 + 0.03, 0.2, 0.24 + WIN_H + 0.06)]
    _log_walls(objs, EAVE, 0.05, fresh, endg, gaps, over=0.09)
    for sx in (-1, 1):                                              # plank gables, new
        n = 7
        for i in range(n):
            y = -D2 + (i + 0.5) * 2 * D2 / n
            zt = EAVE + (PEAK - EAVE) * (1 - abs(y) / D2) - 0.03
            objs.append(plank('gable', (sx * W2, y, EAVE - 0.02), (sx * W2, y, zt), 2 * D2 / n * 0.96, 0.03, (sx, 0, 0), fresh[1], jitter=0.5))
    # the roof: rough slab boards from the ridge down each side, bark up on every other one, a few stones to hold them
    over = 0.16
    for sy in (-1, 1):
        e0 = Vector((0, sy * (D2 + over), EAVE - 0.05)); r0 = Vector((0, 0, PEAK + 0.03)); nrm = Vector((0, sy * (PEAK - EAVE + 0.08), D2 + over)).normalized()
        x, k = -W2 - 0.15, 0
        while x < W2 + 0.13:
            Wd = min(random.uniform(0.12, 0.2), W2 + 0.15 - x); xc = x + Wd / 2
            lift = nrm * (0.03 + 0.012 * (k % 2))
            m_ = bark if random.random() < 0.25 else random.choice((slab, slab, slab2))
            objs.append(plank('rslab', r0 + Vector((xc, 0, 0)) + lift, e0 + Vector((xc, 0, 0)) + lift, Wd * 1.06, 0.025, nrm, m_, jitter=0.8, bevel=0.006))
            x += Wd; k += 1
        if sy < 0:
            for k, (x, t) in enumerate(((-0.45, 0.55), (0.05, 0.7), (0.5, 0.5))):
                c = r0.lerp(e0, t) + nrm * 0.085 + Vector((x, 0, 0))
                objs.append(sphere('rstone', 0.06, c, (1.3, 1, 0.65), (0, 0, k), m=random.choice(stones), ico=2, disp=0.3, seed=k + 330))
    _log(objs, (-W2 - 0.2, 0, PEAK + 0.07), (W2 + 0.2, 0, PEAK + 0.07), 0.04, bark, endg, verts=9, name='ridgelog')
    # a new plank door with a Z brace, the nest window, the hens' door and ramp
    for k in range(4):
        u = -0.07 + 0.0375 + k * 0.075
        objs.append(plank('ldoor', (u, -D2 - 0.04, 0.02), (u, -D2 - 0.04, 0.6), 0.072, 0.03, (0, -1, 0), fresh[k % 2], jitter=0.3))
    for zz in (0.12, 0.5): objs.append(plank('zh', (-0.06, -D2 - 0.06, zz), (0.22, -D2 - 0.06, zz), 0.045, 0.02, (0, -1, 0), fresh[1], jitter=0.3))
    objs.append(plank('zb', (-0.04, -D2 - 0.06, 0.13), (0.2, -D2 - 0.06, 0.49), 0.04, 0.02, (0, -1, 0), fresh[1], jitter=0.3))
    objs.append(sphere('knob', 0.016, (0.18, -D2 - 0.08, 0.32), m=C('iron', '#26231f', rough=0.5, metal=0.6), seg=8, rings=5))
    nest_window(objs, 'bra', FL, WX, fresh[1], solids=[coreL, coreR], nest_floor=0.2, door='drop', door_m=fresh[0])
    pop_door(objs, FL, fresh[1], fresh[0], slab2)
    # where the lantern post will stand: the bucket of chinking, a trowel on it
    bx, by = -0.62, -D2 - 0.28
    objs.append(cyl('cbucket', 0.075, 0.13, (bx, by, 0.065), m=C('bx_painttin', '#c9cdcf', rough=0.4, metal=0.7), verts=14, r2=0.065, bevel=0.005))
    objs.append(cyl('cmix', 0.07, 0.008, (bx, by, 0.128), m=chink, verts=14, bevel=0.0))
    objs.append(box('trowel', (0.05, 0.1, 0.006), (bx + 0.02, by - 0.02, 0.136), (0, 0, 0.5), m=C('trowel', '#9aa0a2', rough=0.35, metal=0.8), bevel=0.002, segs=1))
    objs.append(cyl('trowelh', 0.01, 0.07, (bx - 0.02, by + 0.06, 0.15), (math.radians(90), 0, 0.5), m=C('darkwood', '#6d4a31', rough=0.8), verts=6, bevel=0.0))
    # fresh logs stacked by its right side, waiting
    for k, (dx, zz) in enumerate(((-0.1, 0.05), (0.0, 0.05), (0.1, 0.05), (-0.05, 0.135), (0.05, 0.135), (0.0, 0.22))):
        _log(objs, (W2 + 0.33 + dx, -0.22, zz), (W2 + 0.33 + dx, 0.24, zz), 0.048, fresh[k % 2], endg, verts=10, name='newlog')
    BLOCKS.setdefault('shed_bra', []).append([round(W2 + 0.33, 3), 0.0, 0.26])
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 14, 0.0)
    _own(objs, root)
    return root


def _lodge_bits(r, name, t, eave=0.88, peak=1.44, seed=75, wood_y=(-0.32, 0.3), panel_x=-0.32):
    """What makes the lodge cosy (and stays on the Deluxe): a woodpile under a little roof against its left side, a wreath on
    its door, a birdhouse on the lantern post, a mossy stump with toadstools and ferns in a hollow log either side of the foot
    of the ramp, the automatic door's box and its solar panel, rounds of log for stepping stones to the gate."""
    random.seed(seed); objs = []
    bark = [_cb('bark', var=0.08, grain=0.3, grain_scale=G), _cb('bark2', var=0.08, grain=0.3, grain_scale=G)]
    endg, split = _cb('endg', var=0.06), _cb('split', var=0.06); green = C('greensh', '#4b7a48', rough=0.7, var=0.12, hue_var=0.01)
    pinem = [_cb('pine', rough=0.9), _cb('pine2', rough=0.9)]; cone = _cb('cone'); log = C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G)
    # the woodpile: logs along the wall, their ends to the front, under a little roof of green shingles on two posts
    y0, y1 = wood_y; X0 = -W2 - 0.16
    for row in range(6):
        for j in range(3 if row < 5 else 2):
            x = X0 - 0.055 - j * 0.105 - (0.05 if row % 2 else 0.0)
            if x < X0 - 0.33: continue
            _log(objs, (x, y0 + random.uniform(-0.02, 0.02), 0.05 + row * 0.088), (x, y1 + random.uniform(-0.02, 0.02), 0.05 + row * 0.088), random.uniform(0.042, 0.052),
                 random.choice(bark), split if random.random() < 0.4 else endg, verts=8, name='wpile')
    for y in (y0 - 0.04, y1 + 0.04):
        objs.append(cyl('wpost', 0.025, 0.66, (X0 - 0.36, y, 0.33), m=bark[0], verts=8, bevel=0.0))
    a, b = Vector((-W2 - 0.1, (y0 + y1) / 2, 0.78)), Vector((X0 - 0.42, (y0 + y1) / 2, 0.66))
    objs.append(plank('wroof', a, b, y1 - y0 + 0.2, 0.03, Vector((-(a.z - b.z), 0, a.x - b.x)).normalized(), green, jitter=0.0, bevel=0.006))
    for k in range(int((y1 - y0 + 0.2) / 0.09)):                    # (its shingles' lower edges)
        yy = y0 - 0.1 + (k + 0.5) * 0.09
        objs.append(plank('wsh', (b.x + 0.06, yy, b.z + 0.03), (b.x + 0.01, yy, b.z + 0.012), 0.085, 0.012, (-(a.z - b.z), 0, (a.x - b.x)), green, jitter=1.5, bevel=0.003))
    for yy in (y0 - 0.15, (y0 + y1) / 2, y1 + 0.15): BLOCKS.setdefault(name, []).append([round(X0 - 0.17, 3), round(-yy, 3), 0.2])
    # a wreath of pine and cones on the door, a red bow
    wx, wy, wz = 0.08, -D2 - 0.075, 0.44
    bpy.ops.mesh.primitive_torus_add(major_radius=0.065, minor_radius=0.024, major_segments=16, minor_segments=6, location=(wx, wy, wz), rotation=(math.radians(90), 0, 0))
    o = bpy.context.object; setmat(o, pinem[0]); objs.append(o)
    for k in range(7):
        aa = k / 7 * math.tau
        objs.append(sphere('wsprig', 0.026, (wx + math.cos(aa) * 0.065, wy - 0.012, wz + math.sin(aa) * 0.065), (1.3, 0.6, 0.8), (0, aa, 0), m=pinem[1], ico=1, disp=0.3, seed=k + 340))
    for aa in (3.6, 4.3, 5.2):
        objs.append(sphere('wcone', 0.016, (wx + math.cos(aa) * 0.065, wy - 0.03, wz + math.sin(aa) * 0.065), (1, 1, 1.4), m=cone, ico=1))
    bow = _cb('bow', rough=0.5)
    for sx in (-1, 1): objs.append(sphere('wbow', 0.022, (wx + sx * 0.024, wy - 0.03, wz + 0.075), (1.3, 0.6, 0.8), (0, sx * 0.4, 0), m=bow, seg=8, rings=5))
    objs.append(sphere('wknot', 0.012, (wx, wy - 0.035, wz + 0.075), m=bow, seg=8, rings=5))
    # a birdhouse on the lantern post
    px, py = -0.62, -D2 - 0.28 - 0.045
    objs.append(box('bhouse', (0.08, 0.07, 0.09), (px, py - 0.01, 0.6), m=_cb('bird', rough=0.6), bevel=0.006, segs=1))
    objs.append(cyl('bhole', 0.016, 0.006, (px, py - 0.047, 0.61), (math.radians(90), 0, 0), m=C('hall_dark', '#1d1510', rough=1.0), verts=10, bevel=0.0))
    objs.append(cyl('bperch', 0.004, 0.03, (px, py - 0.06, 0.57), (math.radians(90), 0, 0), m=log, verts=5, bevel=0.0))
    for sx in (-1, 1):
        a_, b_ = Vector((px, py - 0.01, 0.695)), Vector((px + sx * 0.06, py - 0.01, 0.64))
        objs.append(plank('broof', (a_ + b_) / 2 + Vector((0, -0.05, 0)), (a_ + b_) / 2 + Vector((0, 0.05, 0)), (b_ - a_).length + 0.02, 0.012, Vector((sx * 0.055, 0, 0.06)).normalized(), green, jitter=0.0, bevel=0.003))
    # a mossy stump with red toadstools left of the foot of the ramp, ferns in a hollow log right of it (the birds walk round)
    moss = _cb('moss', rough=0.95); toad, spot = _cb('toad', rough=0.5), _cb('spot', rough=0.6); fern = [_cb('fern', rough=0.8), _cb('fern2', rough=0.8)]
    sx_, sy_ = -0.66, -0.95
    objs.append(cyl('mstump', 0.085, 0.17, (sx_, sy_, 0.085), m=bark[0], verts=11, r2=0.08, bevel=0.0))
    objs.append(cyl('mstumptop', 0.072, 0.01, (sx_, sy_, 0.172), m=endg, verts=11, bevel=0.0))
    objs.append(sphere('mmoss', 0.06, (sx_ - 0.03, sy_ + 0.02, 0.17), (1.3, 1.1, 0.35), m=moss, ico=2, disp=0.3, seed=350))
    for k, (dx, dy, h, rr) in enumerate(((0.07, -0.06, 0.06, 0.03), (0.11, 0.0, 0.04, 0.022), (-0.08, -0.07, 0.05, 0.026), (0.03, 0.06, 0.12 + 0.17, 0.02))):
        base = 0.0 if k < 3 else 0.17; hh = h if k < 3 else 0.05
        objs.append(cyl('tstalk', 0.008, hh, (sx_ + dx, sy_ + dy, base + hh / 2), m=spot, verts=6, bevel=0.0))
        objs.append(sphere('tcap', rr, (sx_ + dx, sy_ + dy, base + hh), (1, 1, 0.6), m=toad, seg=10, rings=5))
        for j in range(3):
            aa = j * 2.1 + k
            objs.append(sphere('tspot', rr * 0.22, (sx_ + dx + math.cos(aa) * rr * 0.55, sy_ + dy + math.sin(aa) * rr * 0.55, base + hh + rr * 0.45), m=spot, ico=1))
    fx, fy = 0.02, -0.95
    hl = log
    _log(objs, (fx - 0.15, fy, 0.065), (fx + 0.15, fy, 0.065), 0.07, hl, endg, verts=12, name='hlog')
    objs.append(cyl('hlogin', 0.05, 0.31, (fx, fy, 0.075), (0, math.radians(90), 0), m=C('hall_dark', '#1d1510', rough=1.0), verts=10, bevel=0.0))
    for k in range(9):                                             # its ferns: fronds arching out of it
        aa = k / 9 * math.tau + 0.3; L = random.uniform(0.13, 0.18)
        c = Vector((fx + math.cos(aa) * 0.04, fy + math.sin(aa) * 0.03, 0.12))
        d = Vector((math.cos(aa) * 0.8, math.sin(aa) * 0.8, 0.9)).normalized()
        objs.append(sphere('frond', L / 2, c + d * L / 2, (0.22, 0.06, 1.0), tuple(d.to_track_quat('Z', 'Y').to_euler()), m=fern[k % 2], ico=1))
    for (x, y, rr) in ((sx_, sy_, 0.12), (fx, fy, 0.16)): BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), rr])
    # the automatic door: its box over the hens' door, its solar panel on the shingles
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = 0.26 + POP_H + 0.07
    objs.append(box('autobox', (0.13, 0.05, 0.065), (-0.31, -D2 - 0.075, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.102, zb), m=led, seg=8, rings=4))
    over = 0.2
    e0 = Vector((0, -(D2 + over), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02)); dn = (e0 - r0).normalized()
    nrm = Vector((0, -(peak - eave + 0.08), D2 + over)).normalized()
    c = r0 + (e0 - r0) * 0.55 + nrm * 0.06 + Vector((panel_x, 0, 0))
    objs.append(plank('solarframe', c - dn * 0.1, c + dn * 0.1, 0.25, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for i in range(2):
        for j in range(3):
            cc = c + nrm * 0.012 + dn * (-0.05 + i * 0.1) + Vector((-0.08 + j * 0.08, 0, 0))
            objs.append(plank('solarcell', cc - dn * 0.044, cc + dn * 0.044, 0.072, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # rounds of log for stepping stones from the foot of the ramp to the gate
    gx, gy = _gate_of(t, 'bra'); a, b = Vector((-0.31, -1.04)), Vector((gx, gy + 0.32)); n = max(3, round((b - a).length / 0.25))
    for k in range(n + 1):
        q = a.lerp(b, k / n) + Vector((random.uniform(-0.03, 0.03), 0))
        rr = random.uniform(0.075, 0.09)
        objs.append(cyl('round', rr, 0.03, (q.x, q.y, 0.015), m=bark[k % 2], verts=12, bevel=0.0))
        objs.append(cyl('roundtop', rr * 0.88, 0.006, (q.x, q.y, 0.031), m=endg, verts=12, bevel=0.0))
        objs.append(cyl('roundring', rr * 0.45, 0.004, (q.x, q.y, 0.035), m=split, verts=10, bevel=0.0))
    _own(objs, r)
    return r


def cosy_bra():
    r = lodge(name='cosy_bra'); _lodge_bits(r, 'cosy_bra', 3)
    return r


def deluxe_bra():
    """Deluxe: a storey taller, a gable over the door with a window, crossed logs at the peaks, a window with green shutters
    in its side, a chimney of river stones, a shingled hood over the door with a lantern, a carved wooden bear by its corner;
    the cosy touches."""
    EAVE, PEAK = 1.2, 1.86
    r = lodge(eave=EAVE, peak=PEAK, name='deluxe_bra')
    random.seed(77); objs = []
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); endg = _cb('endg', var=0.06)
    log = C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G); green = C('greensh', '#4b7a48', rough=0.7, var=0.12, hue_var=0.01)
    barge = C('lodgebarge', '#6e4428', rough=0.8, grain=0.3, grain_scale=G); ridge = C('greenridge', '#355a35', rough=0.7)
    trim = C('lodgetrim', '#e8dcc0', rough=0.7); glass = C('glass', '#34516b', rough=0.08, spec=0.9, coat=1.0)
    shut = _cb('shutter', rough=0.6, var=0.04); iron = C('iron', '#26231f', rough=0.5, metal=0.6)
    # a gable over the door, its face at the eave's edge: boards, a window, crossed logs at its peak, its own roof back into
    # the slates
    over = 0.2; kz = (PEAK + 0.02 - (EAVE - 0.06)) / (D2 + over)
    roofz = lambda y: PEAK + 0.02 + y * kz + 0.035                 # (the shingles' face, front slope)
    roofy = lambda z: (z - PEAK - 0.02 - 0.035) / kz
    gx, gw, yf = 0.08, 0.27, -D2 - 0.06                          # (set up the slope, clear of the eave: the window in sight)
    zb = roofz(yf) - 0.04; zs = zb + 0.24; zp = zs + 0.24
    n = 8
    for i in range(n):
        u = gx - gw + (i + 0.5) * 2 * gw / n; zt = zs + (zp - zs) * (1 - abs(u - gx) / gw) - 0.02
        objs.append(plank('dgboard', (u, yf, zb), (u, yf, zt), 2 * gw / n * 0.96, 0.03, (0, -1, 0), barge, jitter=0.4))
    window(objs, gx, yf - 0.02, zb + 0.14, 0.2, 0.18, trim, glass)
    for sx in (-1, 1):
        x = gx + sx * gw
        objs.append(_tri('dgcheek', (x, yf, zb), (x, yf, zs), (x, roofy(zs), zs), (1, 0, 0), 0.03, barge))
        objs.append(plank('dgcorner', (x, yf - 0.005, zb), (x, yf - 0.005, zs), 0.05, 0.035, (0, -1, 0), log, jitter=0.2))
        ea, ri = Vector((gx + sx * (gw + 0.08), 0, zs - 0.04)), Vector((gx, 0, zp + 0.03))
        yb = roofy(zp) + 0.05; nrm = Vector((sx * (ri.z - ea.z), 0, abs(ri.x - ea.x))).normalized(); dn = (ea - ri).normalized(); SL = (ea - ri).length
        objs.append(plank('dgroof', (ea + ri) / 2 + Vector((0, yf - 0.06, 0)), (ea + ri) / 2 + Vector((0, yb, 0)), SL + 0.03, 0.03, nrm, green, jitter=0.0, bevel=0.006))
        rows = 4
        for rr in range(rows):                                     # (its shingles, like the big roof's)
            base = ri.lerp(ea, (rr + 0.55) / rows) + nrm * (0.022 + 0.005 * (rr % 2)); y = yf - 0.06 + (0.045 if rr % 2 else 0.0)
            while y < yb - 0.04:
                q = base + Vector((0, y + 0.045, 0))
                objs.append(plank('dgsh', q - dn * SL / rows * 0.62, q + dn * SL / rows * 0.62, 0.085, 0.016, nrm, green, jitter=1.2, bevel=0.004))
                y += 0.09
        _log(objs, (gx - sx * 0.1, yf - 0.08, zp - 0.05), (gx + sx * 0.07, yf - 0.08, zp + 0.11), 0.02, bark, endg, verts=8, name='xlog')
    objs.append(cyl('dgridge', 0.035, roofy(zp) - yf + 0.08, (gx, (yf - 0.06 + roofy(zp)) / 2, zp + 0.07), (math.radians(90), 0, 0), m=ridge, verts=10, bevel=0.0))
    # crossed logs at both gables' peaks
    for sx in (-1, 1):
        xg = sx * (W2 + 0.22)
        for sy in (-1, 1):
            a = Vector((xg, sy * 0.2, PEAK - 0.12)); b = Vector((xg, -sy * 0.12, PEAK + 0.2))
            _log(objs, a, b, 0.03, bark, endg, verts=8, name='xlog')
    # a window with green shutters in the right gable
    window(objs, W2 + 0.03, 0.0, EAVE + 0.2, 0.2, 0.2, trim, glass, normal=(1, 0, 0))
    for sy in (-1, 1):
        for k in range(2):
            v = sy * (0.15 + (k - 0.5) * 0.034)
            objs.append(plank('shutter', (W2 + 0.06, v, EAVE + 0.07), (W2 + 0.06, v, EAVE + 0.33), 0.032, 0.02, (1, 0, 0), shut, jitter=0.2))
    # a tall chimney of river stones against the left gable, behind the woodpile
    stones = [C('cb_rs%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(CB['rstone'])]
    cx, cy, cw, cd = -W2 - 0.25, 0.24, 0.32, 0.3
    top = PEAK + 0.3
    objs.append(box('chcore', (cw - 0.04, cd - 0.04, top), (cx, cy, top / 2), m=_cb('mortar', rough=0.95), bevel=0.0))
    z, row = 0.04, 0
    while z < top:
        w_ = cw if z < EAVE + 0.1 else cw - 0.06
        for k in range(3):                                         # its front and its outer side
            u = -w_ / 2 + (k + 0.5) * w_ / 3 + (0.03 if row % 2 else -0.02)
            objs.append(sphere('rstone', random.uniform(0.05, 0.062), (cx + u, cy - cd / 2 + 0.015, z), (1.25, 0.8, 0.85), (0, 0, random.uniform(-0.3, 0.3)), m=random.choice(stones), ico=1, disp=0.15, seed=row * 7 + k))
            u = -cd / 2 + (k + 0.5) * cd / 3 + (0.02 if row % 2 else -0.02)
            objs.append(sphere('rstone', random.uniform(0.05, 0.062), (cx - w_ / 2 + 0.015, cy + u, z), (0.8, 1.25, 0.85), (0, 0, random.uniform(-0.3, 0.3)), m=random.choice(stones), ico=1, disp=0.15, seed=row * 7 + k + 3))
            if z > EAVE + 0.15:                                    # (its inner side too, where it rises clear of the roof)
                objs.append(sphere('rstone', random.uniform(0.05, 0.062), (cx + w_ / 2 - 0.015, cy + u, z), (0.8, 1.25, 0.85), (0, 0, random.uniform(-0.3, 0.3)), m=random.choice(stones), ico=1, disp=0.15, seed=row * 7 + k + 5))
        z += 0.085; row += 1
    objs.append(box('chcap', (cw - 0.02, cd + 0.02, 0.04), (cx, cy, top + 0.02), m=_cb('mortar', rough=0.95), bevel=0.01, segs=1))
    # a hood of green shingles over the door on two log brackets, a lantern hanging from it
    hx, hz = 0.08, 0.76
    for sx in (-1, 1):
        a = Vector((hx, -D2 - 0.04, hz + 0.16)); b = Vector((hx + sx * 0.27, -D2 - 0.04, hz))
        objs.append(plank('hood', (a + b) / 2, (a + b) / 2 + Vector((0, -0.32, 0)), (b - a).length + 0.03, 0.03, Vector((sx * 0.16, 0, 0.27)).normalized(), green, jitter=0.0, bevel=0.006))
        _log(objs, (hx + sx * 0.2, -D2 - 0.05, hz - 0.2), (hx + sx * 0.2, -D2 - 0.3, hz - 0.01), 0.022, log, endg, verts=8, name='bracket')
    _log(objs, (hx, -D2 - 0.04, hz + 0.18), (hx, -D2 - 0.36, hz + 0.17), 0.025, log, endg, verts=8, name='hridge')
    lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0))
    lx, ly, lz = hx, -D2 - 0.24, hz + 0.02
    objs.append(cyl('lchain', 0.004, 0.06, (lx, ly, lz + 0.075), m=iron, verts=5, bevel=0.0))
    objs.append(box('lanternb', (0.06, 0.06, 0.08), (lx, ly, lz), m=iron, bevel=0.005, segs=1))
    objs.append(box('lanterng', (0.066, 0.066, 0.055), (lx, ly, lz), m=lamp, bevel=0.0))
    objs.append(cyl('lroof', 0.052, 0.04, (lx, ly, lz + 0.06), (0, 0, math.pi / 4), m=iron, verts=4, r2=0.0, bevel=0.0))
    light_at('deluxe_bra', lx, ly, lz)
    # a carved wooden bear sitting by the front right corner
    bear, bear2 = _cb('bear', rough=0.75, grain=0.35, grain_scale=G, var=0.05), _cb('bear2', rough=0.75)
    bx, by = W2 + 0.3, -D2 - 0.2
    objs.append(cyl('bstump', 0.11, 0.06, (bx, by, 0.03), m=bark, verts=12, bevel=0.0))
    objs.append(sphere('bbody', 0.105, (bx, by, 0.17), (1.0, 0.9, 1.2), m=bear, ico=2, disp=0.12, seed=360))
    objs.append(sphere('bhead', 0.068, (bx - 0.005, by - 0.03, 0.33), (1, 0.95, 0.95), m=bear, ico=2, disp=0.1, seed=361))
    objs.append(sphere('bsnout', 0.03, (bx - 0.01, by - 0.09, 0.315), (1, 1.1, 0.8), m=_cb('split', var=0.04), seg=10, rings=6))
    objs.append(sphere('bnose', 0.012, (bx - 0.01, by - 0.12, 0.325), m=bear2, seg=8, rings=5))
    for sx in (-1, 1):
        objs.append(sphere('bear', 0.022, (bx + sx * 0.05, by - 0.015, 0.395), (1, 0.6, 1), m=bear, seg=8, rings=5))
        objs.append(sphere('beye', 0.008, (bx + sx * 0.026, by - 0.088, 0.35), m=bear2, seg=6, rings=4))
        objs.append(sphere('bpaw', 0.034, (bx + sx * 0.06, by - 0.085, 0.19), (0.9, 1.2, 0.9), m=bear, ico=1, disp=0.1, seed=362 + sx))
        objs.append(sphere('bfoot', 0.04, (bx + sx * 0.065, by - 0.07, 0.075), (0.9, 1.4, 0.7), m=bear, ico=1, disp=0.1, seed=364 + sx))
    BLOCKS.setdefault('deluxe_bra', []).append([round(bx, 3), round(-by, 3), 0.15])
    _own(objs, r)
    _lodge_bits(r, 'deluxe_bra', 4, eave=EAVE, peak=PEAK, wood_y=(-0.42, 0.0), panel_x=-0.5)
    r.name = 'deluxe_bra'
    return r


# ---- the Timber Lodge's gardens (its own: Audrey, 27 Oct): a wooden bowl for water in the small pens, a copper one in the
# Cosy; Cosy: a swing on two log posts beside the lodge, a big half log full of sand, the cabbage hanging from a crooked
# branch stood in a stump; Deluxe: a crib of logs full of sand with a young pine at its corner, water from a split-log flume
# into a hollow log, a feeder like a tiny log cabin, the log swing, the stump, a xylophone of round branches.
PENS_BY['bra'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(-0.62, -1.4), dish=(0.7, -1.1), bowl='wood', hay=None, hay_rot=0, sack=None,
            straw=((0.2, -1.25, 0.25, 22), (-0.75, -0.95, 0.2, 15))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(0.95, -1.05), dish=(-0.95, -1.6), bowl='wood', hay=None, hay_rot=0, sack=None,
            straw=((0.5, -1.6, 0.3, 28), (-0.95, -1.0, 0.25, 20))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(-0.9, -2.4), dish=(1.45, -1.75), bowl='copper', hay=(-1.75, 0.45), hay_rot=90, sack=None,
            straw=((-1.75, 0.45, 0.4, 35), (0.6, -1.3, 0.35, 35), (-0.6, -1.75, 0.3, 25))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(0.95, -2.0), feeder_style='cabin', dish=(-1.75, -0.15), water='flume', hay=(2.0, 0.5), hay_rot=90,
            sack=None, pebbles=10, straw=((0.4, -1.3, 0.3, 25), (2.0, 0.5, 0.4, 35))),
}
PLAY_BY['bra'] = {3: dict(swing=(1.5, -0.45), halflog=(-1.5, -1.3), cabbage=(0.8, -2.3), frame='logs', holder='stump'),
                  4: dict(swing=(1.65, -1.25), crib=(-1.3, -2.5), cabbage=(1.45, -2.6), xylo=(-1.55, -1.3), frame='logs', holder='stump', bars='logs')}
LOGBATH_L, LOGBATH_R, LOGBATH_Z = 0.8, 0.19, 0.17                # the Cosy lodge's half log of sand (along y; its rim's height)
CRIB_W, CRIB_D = 0.86, 0.66                                     # the Deluxe lodge's crib of logs (x, y)
CRIB_PINE = (-CRIB_W / 2 - 0.1, CRIB_D / 2 + 0.04)              # its young pine, at its back left corner


def log_swing(objs, x, y):
    """The lodge's swing: two log posts, braced, a log across their tops with its sawn ends showing."""
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); endg = _cb('endg', var=0.06)
    stones = [C('cb_rs%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(CB['rstone'])]
    for sx in (-1, 1):
        px = x + sx * (SWING_HALF + 0.05)
        _log(objs, (px, y, 0.0), (px, y, SWING_TOP + 0.07), 0.038, bark, endg, verts=9, name='swpost', ends=(False, True))
        for sy in (-1, 1):
            _log(objs, (px, y + sy * 0.2, 0.0), (px, y + sy * 0.02, 0.3), 0.018, bark, None, verts=6, name='swbrace')
        for k in range(2):
            objs.append(sphere('swstone', 0.035, (px + 0.05 * (1 - 2 * k), y - 0.04 + 0.08 * k, 0.012), (1.3, 1, 0.5), m=stones[k], ico=1, disp=0.2, seed=k + 370))
    _log(objs, (x - SWING_HALF - 0.15, y, SWING_TOP + 0.01), (x + SWING_HALF + 0.15, y, SWING_TOP + 0.015), 0.032, bark, endg, verts=9, name='swbar')


def cabbage_stump(objs, x, y):
    """The lodge's way of hanging the cabbage: from a crooked branch stood in an old stump."""
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); endg = _cb('endg', var=0.06); moss = _cb('moss', rough=0.95)
    leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    px, py = x, y + 0.28
    objs.append(cyl('cstump', 0.1, 0.2, (px, py, 0.1), m=bark, verts=12, r2=0.09, bevel=0.0))
    objs.append(cyl('cstumptop', 0.078, 0.01, (px, py, 0.202), m=endg, verts=12, bevel=0.0))
    objs.append(sphere('cmoss', 0.05, (px + 0.07, py + 0.03, 0.08), (0.6, 1.1, 1.2), m=moss, ico=2, disp=0.3, seed=375))
    pts = [Vector((px + 0.02, py + 0.03, 0.18)), Vector((px - 0.015, py, 0.4)), Vector((px + 0.01, py - 0.06, CAB_TOP + 0.04)),
           Vector((px, py - 0.18, CAB_TOP + 0.07)), Vector((x, y, CAB_TOP))]
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        objs.append(cyl('cbranch', 0.026 - k * 0.004, (b - a).length + 0.02, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=7, r2=0.022 - k * 0.004, bevel=0.0))
    for k in range(4):
        objs.append(sphere('cleaf', 0.024, pts[2] + Vector((random.uniform(-0.05, 0.05), random.uniform(-0.03, 0.05), random.uniform(0.0, 0.05))), (1.4, 0.8, 0.4), (0, 0, k), m=leaf[k % 2], ico=1))


def sand_log(objs, x, y):
    """The Cosy lodge's sand bath: a big half log lying along the yard, hollowed and full of sand, a little spilt round it."""
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); endg = _cb('endg', var=0.06)
    sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    L, R, zc = LOGBATH_L, LOGBATH_R, LOGBATH_Z
    coop.half_log(objs, 'slog', x, y, zc, R, L, 'y', bark, endg)
    objs.append(box('lsand', (2 * R - 0.03, L - 0.04, 0.02), (x, y, zc - 0.002), m=sand, bevel=0.008, segs=1))
    for k, (dy, s_) in enumerate(((-0.18, 0.09), (0.15, 0.08))):
        objs.append(sphere('lmound', s_, (x + 0.03 * (1 - 2 * k), y + dy, zc - 0.01), (1.0, 1.3, 0.22), (0, 0, k), m=sand, ico=2, disp=0.15, seed=k + 380))
    for k in range(6):
        aa = random.uniform(0, math.tau)
        objs.append(sphere('lspill', random.uniform(0.04, 0.06), (x + math.cos(aa) * (R + 0.1), y + math.sin(aa) * (L / 2 + 0.05), 0.012), (1.4, 1, 0.12), (0, 0, aa), m=sand, ico=2, disp=0.2, seed=k + 383))


def sand_crib(objs, x, y):
    """The Deluxe lodge's sand bath: a little crib of logs, notched at its corners, full of sand, cones on it, a young pine at
    its back corner."""
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); log = C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G); endg = _cb('endg', var=0.06)
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); sand2 = mat('dsand2', '#e2c98e', rough=0.95, var=0.05)
    hw, hd, r = CRIB_W / 2, CRIB_D / 2, 0.055
    for sy in (-1, 1): _log(objs, (x - hw - 0.08, y + sy * hd, r), (x + hw + 0.08, y + sy * hd, r), r, log, endg, verts=10, name='crib')
    for sx in (-1, 1): _log(objs, (x + sx * hw, y - hd - 0.08, 2.2 * r), (x + sx * hw, y + hd + 0.08, 2.2 * r), r, log, endg, verts=10, name='crib')
    objs.append(box('csand', (CRIB_W - 0.05, CRIB_D - 0.05, 0.03), (x, y, 0.1), m=sand, bevel=0.01, segs=1))
    for k, (dx, dy, s_) in enumerate(((-0.17, 0.06, 0.12), (0.2, -0.07, 0.1))):
        objs.append(sphere('cmound', s_, (x + dx, y + dy, 0.11), (1.3, 1.0, 0.2), (0, 0, k), m=sand2 if k else sand, ico=2, disp=0.15, seed=k + 390))
    cone = _cb('cone')
    for k, (dx, dy) in enumerate(((0.05, 0.12), (0.28, 0.1), (-0.3, -0.15))):
        objs.append(sphere('ccone', 0.025, (x + dx, y + dy, 0.13), (1, 1.5, 1), (0, 0, k), m=cone, ico=1, disp=0.3, seed=k + 393))
    for k in range(5):
        aa = random.uniform(0, math.tau)
        objs.append(sphere('cspill', random.uniform(0.04, 0.06), (x + math.cos(aa) * (hw + 0.1), y + math.sin(aa) * (hd + 0.1), 0.012), (1.4, 1, 0.12), (0, 0, aa), m=sand, ico=2, disp=0.2, seed=k + 396))
    tx, ty = x + CRIB_PINE[0], y + CRIB_PINE[1]                    # the young pine
    pinem = [_cb('pine', rough=0.9), _cb('pine2', rough=0.9)]
    objs.append(cyl('ptrunk', 0.025, 0.2, (tx, ty, 0.1), m=bark, verts=7, bevel=0.0))
    for k, (z0, rr, h) in enumerate(((0.12, 0.17, 0.24), (0.26, 0.13, 0.2), (0.38, 0.09, 0.17))):
        objs.append(cyl('ptier', rr, h, (tx, ty, z0 + h / 2), (0, 0, k * 0.4), m=pinem[k % 2], verts=9, r2=0.0, bevel=0.0))


def log_xylophone(objs, x, y):
    """A xylophone of round branches painted in rainbow colours across two little logs, a stick with a pine cone to play it."""
    bark = _cb('bark', var=0.08, grain=0.3, grain_scale=G); endg = _cb('endg', var=0.06); cone = _cb('cone')
    cols = ['#e2453c', '#ff8c42', '#f4c430', '#5bb04a', '#3d7fd1', '#9b6bd1']
    for sx in (-1, 1): _log(objs, (x + sx * 0.09, y - 0.2, 0.05), (x + sx * 0.09, y + 0.2, 0.05), 0.04, bark, endg, verts=9, name='xlog')
    for k in range(6):
        yy = y - 0.13 + k * 0.052; L = 0.28 - k * 0.025
        _log(objs, (x - L / 2, yy, 0.106), (x + L / 2, yy, 0.106), 0.018, C('xbar%d' % k, cols[k], rough=0.35, metal=0.4), endg, verts=8, name='xbar')
    objs.append(cyl('xmallet', 0.006, 0.16, (x + 0.08, y + 0.24, 0.015), (math.radians(90), 0, math.radians(30)), m=bark, verts=6, bevel=0.0))
    objs.append(sphere('xmhead', 0.022, (x + 0.12, y + 0.31, 0.02), (1, 1.4, 1), m=cone, ico=1, disp=0.3, seed=399))


# ---- the Christmas dress (Audrey, 27 Oct: seasonal coops; "The next one will be Christmas and should only be a dress for
# any coop"; "In season, kept forever"; 1,500 coins). It fits every coop in every look: a garland of fir along the top of
# its pen's fence (front and sides) with little coloured lights and red bows on the posts, a wreath with a red bow on the
# gate posts (on the Deluxe's rose arch), a little Christmas tree in its garden (baubles, lights, a gold star, presents at
# its foot) where there's room, and a lit gold star on the roof's top. The fence's dress by the pen's size
# (xmas_fence_t0..t4: the five pens are the same for every breed); the tree and the star their own models, set in place by
# the browser (coops.json dress: where the tree stands in each breed's pen in each look).
XMAS = dict(fir='#2f5a34', fir2='#3e6e3c', fir3='#24492b', bow='#c8283c', bow2='#a81f30', gold='#e2b443', silver='#c9d6e3',
            red='#d23b3b', blue='#3d6fc4', green='#4fae55', paper=('#c8283c', '#2f6e4a', '#e9d7a5', '#3d6aa8'), ribbon='#f2d36b', pot='#a8442f')
XLIGHTS = ('#ff5a4f', '#ffd25c', '#5fd36b', '#5aa2ff', '#ffffff')            # its bulbs (they glow at night: export GLOW)


def _xm(key, rough=0.7, **kw):
    v = XMAS[key]
    return C('xm_' + key, v if isinstance(v, str) else v[0], rough=rough, **kw)


def _xbulbs():
    return [C('xlight%d' % i, h, rough=0.3, emission=(h, 0.6)) for i, h in enumerate(XLIGHTS)]


def _bow(objs, x, y, z, nx, ny, s=1.0):
    """A red bow facing (nx, ny): two loops, a knot, two tails."""
    bow, bow2 = _xm('bow', rough=0.5), _xm('bow2', rough=0.5)
    tx, ty = -ny, nx                                               # (along the face)
    for sd in (-1, 1):
        objs.append(sphere('xbow', 0.022 * s, (x + tx * sd * 0.024 * s, y + ty * sd * 0.024 * s, z), (1.4, 0.7, 0.9), (0, 0, math.atan2(ty, tx)), m=bow, seg=8, rings=5))
        objs.append(box('xtail', (0.012 * s, 0.006 * s, 0.05 * s), (x + tx * sd * 0.012 * s, y + ty * sd * 0.012 * s, z - 0.03 * s), (0, sd * 0.35, math.atan2(ty, tx)), m=bow2, bevel=0.002, segs=1))
    objs.append(sphere('xknot', 0.011 * s, (x + nx * 0.008, y + ny * 0.008, z), m=bow2, seg=8, rings=5))


def _garland(objs, pts, sag, bulbs, seed=0):
    """A fir garland hung from point to point (each span sagging), little coloured lights along it."""
    random.seed(seed); fir = [_xm('fir', rough=0.9), _xm('fir2', rough=0.9), _xm('fir3', rough=0.9)]
    k = 0
    for p, q in zip(pts, pts[1:]):
        p, q = Vector(p), Vector(q); L = (q - p).length; n = max(4, int(L / 0.075))
        cur = [p.lerp(q, i / n) - Vector((0, 0, sag * 4 * (i / n) * (1 - i / n) * min(1.0, L / 0.55))) for i in range(n + 1)]
        for a, b in zip(cur, cur[1:]):
            objs.append(cyl('xrope', 0.016, (b - a).length + 0.004, (a + b) / 2, (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=fir[0], verts=5, bevel=0.0))
        for i, c in enumerate(cur[:-1]):
            objs.append(sphere('xfir', random.uniform(0.026, 0.034), c + Vector((random.uniform(-0.01, 0.01), random.uniform(-0.01, 0.01), 0.004)), (1.3, 1.0, 0.8), (0, 0, random.uniform(0, 3)), m=random.choice(fir), ico=1, disp=0.4, disp_scale=5.0, seed=k))
            if i % 2 == 1:
                d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), -0.6)).normalized()
                objs.append(sphere('xbulb', 0.014, c + d * 0.03, (1, 1, 1.25), m=bulbs[k % len(bulbs)], ico=1))
            k += 1


def xmas_fence(t):
    """The Christmas dress for a pen's fence (t: the look): the garland along its front and sides, bows on the posts, a wreath
    with a bow on each gate post (the Deluxe: on its rose arch)."""
    random.seed(80 + t); objs = []
    L = pen_layout(t); keep = coop.PEN; coop.PEN = L
    try: hinge, gc = coop.gate_span()
    finally: coop.PEN = keep
    x0, x1, y0, y1 = L['box']; bulbs = _xbulbs()
    zt = 0.53 if t != 4 else 0.45                                  # (the posts' tops; the pickets' on the Deluxe)
    def posts(a, b):
        a, b = Vector(a), Vector(b); n = max(1, int((b - a).length / 0.55)); return [a.lerp(b, i / n) for i in range(n + 1)]
    front = posts((x0, y0), (x1, y0)); g0 = min(hinge, 2 * gc - hinge); g1 = max(hinge, 2 * gc - hinge)
    left, right = posts((x0, y0), (x0, y1)), posts((x1, y0), (x1, y1))
    runs = [[(p.x, p.y, zt) for p in front if p.x <= g0 + 0.01], [(p.x, p.y, zt) for p in front if p.x >= g1 - 0.01],
            [(p.x, p.y, zt) for p in left], [(p.x, p.y, zt) for p in right]]
    for i, r in enumerate(runs):
        if len(r) > 1: _garland(objs, r, 0.07, bulbs, seed=i + 10 * t)
    for p in front + left[1:] + right[1:]:                         # a bow on each post (not the gate's: their wreaths)
        if abs(p.x - g0) < 0.05 or abs(p.x - g1) < 0.05: continue
        ny = -1 if abs(p.y - y0) < 0.01 else 0; nx = 0 if ny else (-1 if abs(p.x - x0) < 0.01 else 1)
        _bow(objs, p.x + nx * 0.045, p.y + ny * 0.045, zt - 0.03, nx, ny, 1.0)
    # the wreaths: on the two gate posts, facing out (the Deluxe: one, under its rose arch's top)
    fir = [_xm('fir', rough=0.9), _xm('fir2', rough=0.9)]; berry = _xm('red', rough=0.4)
    spots = [((g0 + g1) / 2, y0 - 0.03, 0.86 + (g1 - g0) / 2 - 0.16, 0.09)] if t == 4 else [(g0, y0 - 0.06, 0.36, 0.075), (g1, y0 - 0.06, 0.36, 0.075)]
    for (wx, wy, wz, R) in spots:
        bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=R * 0.3, major_segments=18, minor_segments=6, location=(wx, wy, wz), rotation=(math.radians(90), 0, 0))
        o = bpy.context.object; setmat(o, fir[0]); objs.append(o)
        for k in range(10):
            a = k / 10 * math.tau
            objs.append(sphere('xwfir', R * 0.36, (wx + math.cos(a) * R, wy - 0.01, wz + math.sin(a) * R), (1.3, 0.6, 0.9), (0, a, 0), m=fir[k % 2], ico=1, disp=0.35, seed=k + 30))
            if k % 3 == 0: objs.append(sphere('xberry', 0.012, (wx + math.cos(a + 0.3) * R, wy - 0.03, wz + math.sin(a + 0.3) * R), m=berry, ico=1))
        _bow(objs, wx, wy - 0.03, wz - R * 0.95, 0, -1, 1.2)
        if t == 4: objs.append(cyl('xwire', 0.003, 0.16, (wx, wy, wz + R + 0.08), m=C('iron', '#26231f', rough=0.5, metal=0.6), verts=4, bevel=0.0))
    return finish(objs, 'xmas_fence_t%d' % t)


XMAS_TREE_R = 0.3                                                  # what the birds keep clear of round the tree


def xmas_tree():
    """A little Christmas tree in a red pot: tiers of fir, baubles, a string of lights, a gold star, three presents at its foot."""
    random.seed(90); objs = []
    fir = [_xm('fir', rough=0.9), _xm('fir2', rough=0.9), _xm('fir3', rough=0.9)]; gold = C('xm_star', XMAS['gold'], rough=0.3, emission=(XMAS['gold'], 0.5))
    bulbs = _xbulbs(); balls = [_xm('red', rough=0.25, spec=0.6), _xm('gold', rough=0.25, metal=0.6), _xm('silver', rough=0.25, metal=0.6), _xm('blue', rough=0.25, spec=0.6)]
    objs.append(cyl('xpot', 0.1, 0.12, (0, 0, 0.06), m=_xm('pot', rough=0.6), verts=14, r2=0.085, bevel=0.008))
    objs.append(cyl('xtrunk', 0.025, 0.12, (0, 0, 0.16), m=C('cs_trunk', CS['trunk'], rough=0.9), verts=7, bevel=0.0))
    tiers = ((0.18, 0.22, 0.24), (0.33, 0.17, 0.22), (0.47, 0.12, 0.2), (0.59, 0.075, 0.16))
    for k, (z0, r, h) in enumerate(tiers):
        objs.append(cyl('xtier', r, h, (0, 0, z0 + h / 2), (0, 0, k * 0.5), m=fir[k % 3], verts=10, r2=0.0, bevel=0.0))
        for j in range(7 - k):                                    # bushy edges
            a = j / (7 - k) * math.tau + k
            objs.append(sphere('xedge', 0.035, (math.cos(a) * r * 0.85, math.sin(a) * r * 0.85, z0 + 0.03), (1.2, 1.2, 0.6), m=fir[(j + k) % 3], ico=1, disp=0.3, seed=j + 10 * k))
    for k in range(16):                                           # baubles round the tiers
        z = random.uniform(0.22, 0.62); rr = 0.2 * (1 - (z - 0.18) / 0.55) + 0.02; a = random.uniform(0, math.tau)
        objs.append(sphere('xball', 0.022, (math.cos(a) * rr, math.sin(a) * rr, z), m=balls[k % 4], seg=10, rings=6))
    for k in range(26):                                           # a string of lights spiralling up
        u = k / 26; z = 0.2 + u * 0.45; rr = 0.21 * (1 - u) + 0.04; a = u * 3.2 * math.tau
        objs.append(sphere('xbulb', 0.011, (math.cos(a) * rr, math.sin(a) * rr, z), (1, 1, 1.25), m=bulbs[k % len(bulbs)], ico=1))
    star(objs, 0, 0, 0.8, 0.055, gold)
    paper = [C('xm_paper%d' % i, h, rough=0.6) for i, h in enumerate(XMAS['paper'])]; rib = _xm('ribbon', rough=0.4)
    for k, (dx, dy, w, d, h, a) in enumerate(((0.16, -0.08, 0.1, 0.09, 0.08, 0.3), (-0.12, -0.14, 0.12, 0.1, 0.07, -0.4), (0.03, -0.2, 0.08, 0.08, 0.1, 0.1))):
        objs.append(box('xgift', (w, d, h), (dx, dy, h / 2), (0, 0, a), m=paper[k], bevel=0.006, segs=1))
        objs.append(box('xrib', (w + 0.004, 0.016, h + 0.004), (dx, dy, h / 2), (0, 0, a), m=rib, bevel=0.002, segs=1))
        objs.append(box('xrib', (0.016, d + 0.004, h + 0.004), (dx, dy, h / 2), (0, 0, a), m=rib, bevel=0.002, segs=1))
        _bow(objs, dx, dy, h + 0.012, 0, -1, 0.5)
    return finish(objs, 'xmas_tree')


def star(objs, x, y, z, r, m, th=0.022, name='xstar'):
    """A five-pointed star standing upright at (x, y, z), r across its points, facing the front (-y)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); ring = []
    for k in range(10):
        a = math.pi / 2 + k * math.pi / 5; rr = r if k % 2 == 0 else r * 0.45
        ring.append((x + math.cos(a) * rr, z + math.sin(a) * rr))
    f0 = [bm.verts.new((u, y - th / 2, v)) for (u, v) in ring]; f1 = [bm.verts.new((u, y + th / 2, v)) for (u, v) in ring]
    c0 = bm.verts.new((x, y - th, z)); c1 = bm.verts.new((x, y + th, z))      # (a little domed, front and back)
    for i in range(10):
        j = (i + 1) % 10
        bm.faces.new((c0, f0[i], f0[j])); bm.faces.new((c1, f1[j], f1[i])); bm.faces.new((f0[i], f1[i], f1[j], f0[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); objs.append(o)


def xmas_star():
    """A lit gold star on a little rod, standing on the origin (the browser sets it on a roof's top)."""
    objs = []; gold = C('xm_star', XMAS['gold'], rough=0.3, emission=(XMAS['gold'], 0.5))
    objs.append(cyl('xsrod', 0.01, 0.16, (0, 0, 0.08), m=C('gold', '#d4a640', rough=0.3, metal=0.9), verts=6, bevel=0.0))
    star(objs, 0, 0, 0.3, 0.15, gold, th=0.04)
    star(objs, 0, 0, 0.3, 0.15, gold, th=0.04); objs[-1].rotation_euler.z = math.radians(90)      # (a second, crossed: a star from every side)
    return finish(objs, 'xmas_star')


def xmas_tree_spot(t, k):
    """Where the Christmas tree stands in breed k's pen in look t ([glTF x, z, its size]), clear of everything (its keep:
    XMAS_TREE_R times its size), in front of the house, as near a front corner as there's room: full size, else smaller
    (a small pen); None if there's no room at all."""
    for s_ in (1.0, 0.8, 0.65):
        sp = _tree_spot(t, k, XMAS_TREE_R * s_)
        if sp: return sp + [s_]
    return None


def _tree_spot(t, k, TR):
    P = pen_info(t, k); play = play_info(t, k); L = pen_layout(t, k); N = NESTS['house_' + k]
    x0, x1 = P['min'][0], P['max'][0]; z0, z1 = P['min'][1], P['max'][1]          # (glTF: z = -y; the front at z1)
    obs = [(P['feeder'][0], P['feeder'][1], 0.22), (P['dish'][0], P['dish'][1], P['dish_r'] + 0.02)]
    obs += [(h[0], h[1], 0.36) for h in P['hay']] + ([(P['sack'][0], P['sack'][1], 0.25)] if P['sack'] else [])
    if play: obs += [tuple(c) for c in play['keep']]
    look = (['box_', 'shed_', 'house_', 'cosy_', 'deluxe_'][t]) + k
    obs += [tuple(b) for b in BLOCKS.get('house_' + k, []) + BLOCKS.get(look, [])]
    foot = (N['foot'][0], N['foot'][1]); gate = (P['gate'], z1 - 0.05)
    def seg_d(px, pz, a, b):
        ax, az = a; bx, bz = b; vx, vz = bx - ax, bz - az; t_ = max(0, min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz + 1e-9)))
        return math.hypot(px - ax - t_ * vx, pz - az - t_ * vz)
    best = None
    for i in range(int((x1 - x0) / 0.05) + 1):
        for j in range(int((z1 - z0) / 0.05) + 1):
            x, z = x0 + i * 0.05, z0 + j * 0.05
            if min(x - x0, x1 - x, z - z0, z1 - z) < TR + 0.05: continue
            if abs(x) < W2 + 0.2 + TR and z < D2 + 0.15 + TR: continue        # (the house)
            if seg_d(x, z, (-0.31, D2), foot) < 0.22 + TR: continue                       # (the ramp)
            if seg_d(x, z, foot, gate) < 0.28 + TR: continue                              # (the way to the gate)
            if any(math.hypot(x - a, z - b) < r + TR for (a, b, r) in obs): continue
            if z < D2 + 0.3: continue                                                              # (in front of the house)
            d = min(math.hypot(x - (x0 + 0.4), z - (z1 - 0.4)), math.hypot(x - (x1 - 0.4), z - (z1 - 0.4)))
            if best is None or d < best[0]: best = (d, round(x, 3), round(z, 3))
    return [best[1], best[2]] if best else None


# ---- release 7, the Little Windmill's five looks (the Polish's coop; Audrey, 29 Oct, on its everyday look: "Yes, do the
# other looks (Recommended)").
# Rustic (box_pol): the stump of an old mill: a short brick ring broken off unevenly, bricks fallen out, moss, old boards
#   across its top under a broken old sail laid over them and a sack, weighed down with bricks (the hint: its sails to come).
# Mended (shed_pol): the brick rebuilt (new bricks among the old), a stubby tower of new pine boards, the lowest painted white
#   so far (the pot of white paint by it), a little cap of wooden shingles, a first pair of bare sails turning, a ladder.
# Snug (house_pol): the Little Windmill.
# Cosy (cosy_pol): tulips along its sides, blue-and-white Delft pots of tulips by the ramp, a pair of painted clogs on a
#   doorstep, a window box of geraniums on the tower, the automatic door's box and its solar panel, a brick path to the gate.
# Deluxe (deluxe_pol): a taller tower with a gallery round it on brackets (a white rail), striped shutters on its windows, a
#   fantail at the back of its cap, bigger sails with red stocks; the cosy touches.
# The hens come, go and lay the same way in every look: the same floor (0.2), pop door, nest window and ramp (NESTS['house_pol']).
CW_TERRA = '#c0673f'
CW = dict(old=('#8f6a58', '#86604f', '#9a7562', '#7a5748'), oldmortar='#b7ab97', moss='#6b7a45', moss2='#7f8f50', sack='#b39a6e',
          oldwood='#8e8676', oldwood2='#7b7466', oldlat='#c9c3b5', newbrick=('#c4704f', '#b9644a'), pine='#d8b886', pine2='#cba872',
          felt='#3e3d3b', tulip=('#e2453c', '#f4c430', '#f08bb0', '#fbf6ee', '#ff8c42', '#c8283c'), delft='#2f5aa8', delftw='#f4f2ec',
          clog='#e8c46a', clog2='#d9a441', red='#9e3b2e', soil='#5b4332', paver=('#9c5a43', '#8a4f3c', '#a8664b'), stem='#4f8a3a')


def _cw(key, i=None, rough=0.85, **kw):
    v = CW[key] if i is None else CW[key][i]
    return C('cw_' + key + ('' if i is None else str(i)), v, rough=rough, **kw)


def box_pol(seed=81):
    """Rustic: the stump of an old mill, broken off, an old broken sail and a sack over boards for its roof."""
    random.seed(seed); root = empty('box_pol'); objs = []
    FL, WX = 0.2, 0.36
    bricks = [_cw('old', i, var=0.08) for i in range(4)]; mortar = _cw('oldmortar', rough=0.95)
    old, old2 = _cw('oldwood', var=0.08, grain=0.3, grain_scale=G), _cw('oldwood2', var=0.08, grain=0.3, grain_scale=G)
    lat = _cw('oldlat', rough=0.85, var=0.05); sack = _cw('sack', rough=0.95, var=0.04); moss = [_cw('moss', rough=0.95), _cw('moss2', rough=0.95)]
    pts = mill_base_pts(); TOP = 0.72
    core = ring_mesh('core', mill_base_pts(-0.012), 0.0, mill_base_pts(-0.012), TOP, mortar, cap_a=True, cap_b=True); objs.append(core)
    holes = [(-0.31 - POP_W / 2 - 0.03, -0.31 + POP_W / 2 + 0.03, 0.0, FL + POP_H + 0.04), (WX - WIN_W / 2 - 0.02, WX + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)]
    rag = random.Random(seed + 1); ragged = {}
    def top(i, u):                                   # (broken off: higher and lower along each wall, lowest at the back)
        k = (i, round(u, 1))
        if k not in ragged: ragged[k] = (0.86 if i in (0, 1, 7) else 0.8) - (0.1 if i in (4, 5) else 0.0) + rag.uniform(-0.07, 0.05)
        return ragged[k]
    mill_bricks(objs, pts, 0.92, holes, bricks, seed, top=top, missing=0.05)
    for k in range(9):                               # moss on the old bricks, low down and on the broken top
        i = k % 8; a, b = pts[i], pts[(i + 1) % 8]; d, L, n = _face_frame(a, b); u = random.uniform(0.15, L - 0.15)
        p = Vector((a[0], a[1], 0)) + d * u + n * 0.03
        z = random.choice((random.uniform(0.04, 0.2), top(i, u) - 0.04))
        if i == 0 and any(x0 - 0.05 < p.x < x1 + 0.05 for (x0, x1, z0, z1) in holes): continue
        objs.append(sphere('moss', random.uniform(0.04, 0.07), (p.x, p.y, z), (1.4, 0.5, 0.7), (0, 0, math.atan2(d.y, d.x)), m=random.choice(moss), ico=2, disp=0.3, seed=k + 400))
    # its roof: old grey boards across the top, the broken old sail laid over them (a lath snapped, bars gone), a sack
    # thrown over a corner, bricks to weigh it all down
    for k in range(7):
        y = -D2 + 0.06 + k * 0.13
        objs.append(plank('oldboard', (-W2 - 0.04, y, TOP + 0.03 + 0.01 * (k % 2)), (W2 + 0.04, y + random.uniform(-0.02, 0.02), TOP + 0.03), 0.12, 0.025, (0, 0, 1), random.choice((old, old2)), jitter=1.2))
    a0 = math.radians(-24); d = Vector((math.cos(a0), math.sin(a0), 0)); q = Vector((-math.sin(a0), math.cos(a0), 0))
    c0 = Vector((-0.42, 0.12, TOP + 0.08))
    for off, L in ((0.0, 0.95), (0.24, 0.62)):        # its two long laths, one snapped short
        objs.append(plank('oldlath', c0 + q * off, c0 + q * off + d * L, 0.024, 0.02, (0, 0, 1), lat, jitter=1.0, bevel=0.003))
    objs.append(plank('oldstock', c0 - q * 0.04 - d * 0.1, c0 - q * 0.04 + d * 1.05, 0.05, 0.04, (0, 0, 1), old2, jitter=0.5))
    for k in range(9):
        if k in (3, 6): continue                    # (bars gone)
        u = 0.06 + k * 0.1; w_ = 0.24 if u < 0.62 else 0.12
        objs.append(plank('oldbar', c0 + d * u + Vector((0, 0, 0.018)), c0 + d * u + q * w_ + Vector((0, 0, 0.018)), 0.018, 0.014, (0, 0, 1), lat, jitter=3.0, bevel=0.002))
    s0 = Vector((0.3, -0.05, TOP + 0.075))
    objs.append(box('sackcloth', (0.48, 0.42, 0.012), tuple(s0), (math.radians(4), math.radians(-3), math.radians(15)), m=sack, bevel=0.004, segs=1))
    for k in range(5):                               # its folds
        objs.append(sphere('sackfold', 0.05, (s0.x - 0.18 + k * 0.09, s0.y + random.uniform(-0.12, 0.12), s0.z + 0.01), (1.6, 0.4, 0.25), (0, 0, math.radians(15 + random.uniform(-20, 20))), m=sack, ico=1, disp=0.2, seed=k + 410))
    for (x, y) in ((-0.5, -0.25), (0.45, 0.22), (-0.05, 0.3)):
        objs.append(box('roofbrick', (0.17, 0.08, 0.06), (x, y, TOP + 0.1), (0, 0, random.uniform(-0.5, 0.5)), m=random.choice(bricks), bevel=0.01, segs=1, jitter=0.004))
    # the hens' door (just its hole), an old board for a ramp, the nest window (its door an old board)
    _ramp(objs, FL, old2, old, w=0.17, slats=2)
    nest_window(objs, 'pol', FL, WX, old, solids=[core], door='drop', door_m=old2)
    # fallen bricks about its foot, an old millstone half sunk in the ground where the millstone will lean
    for k, (x, y) in enumerate(((-0.75, -0.2), (-0.7, 0.1), (0.75, 0.32), (-0.1, 0.55), (0.5, 0.52))):
        objs.append(box('fallen', (0.17, 0.08, 0.06), (x, y, 0.03), (random.uniform(-0.3, 0.3), 0, random.uniform(0, 3)), m=random.choice(bricks), bevel=0.01, segs=1, jitter=0.004))
    objs.append(cyl('oldstone', 0.18, 0.07, (W2 + 0.22, -0.05, 0.015), (math.radians(8), 0, 0), m=C('millstone', '#a39d93', rough=0.9, var=0.05), verts=20, bevel=0.01))
    objs.append(cyl('oldhole', 0.035, 0.075, (W2 + 0.22, -0.05, 0.02), (math.radians(8), 0, 0), m=C('millhole', '#4d4740', rough=0.9), verts=10, bevel=0.0))
    objs.append(sphere('oldmoss', 0.06, (W2 + 0.15, -0.12, 0.05), (1.4, 1, 0.4), m=moss[0], ico=2, disp=0.3, seed=420))
    BLOCKS.setdefault('box_pol', []).append([round(W2 + 0.22, 3), 0.05, 0.2])
    straw_bits(objs, (-0.2, -D2 - 0.15, 0), 0.25, 18, 0.0)
    _own(objs, root)
    return root


def shed_pol(seed=83):
    """Mended: the brick rebuilt, a stubby tower of new pine boards (the lowest painted white so far), a little cap of wooden
    shingles, a first pair of bare sails turning, a ladder against it, a pot of white paint where the lantern will be."""
    random.seed(seed); root = empty('shed_pol'); objs = []
    FL, WX = 0.2, 0.36
    M_ = dict(MILL, z0=0.9, z1=1.36, r0=0.44, r1=0.35, hub=1.5, hub_y=-0.47, sail=0.6)
    bricks = [_cw('old', 0, var=0.08), _cw('old', 2, var=0.08), _cw('newbrick', 0, var=0.06), _cw('newbrick', 1, var=0.06)]
    mortar = C('mmortar', '#d6c8b0', rough=0.95)
    pine, pine2 = _cw('pine', var=0.06, grain=0.3, grain_scale=G), _cw('pine2', var=0.06, grain=0.3, grain_scale=G)
    white = C('millboard', '#f2ede2', rough=0.7, var=0.03); felt = _cw('felt', rough=0.8, var=0.05)
    shaft = C('millshaft', '#5a3a26', rough=0.7, grain=0.3, grain_scale=G)
    pts = mill_base_pts()
    core = ring_mesh('core', mill_base_pts(-0.012), 0.0, mill_base_pts(-0.012), M_['base'], mortar, cap_a=True, cap_b=True); objs.append(core)
    holes = [(-0.31 - POP_W / 2 - 0.04, -0.31 + POP_W / 2 + 0.04, 0.0, FL + POP_H + 0.05), (-0.135, 0.135, 0.0, 0.62),
             (WX - WIN_W / 2 - 0.02, WX + WIN_W / 2 + 0.02, FL + 0.03, FL + 0.04 + WIN_H + 0.02)]
    mill_bricks(objs, pts, M_['base'], holes, bricks, seed)
    # a skirt of tarred felt for now, over its top
    objs.append(ring_mesh('feltskirt', mill_base_pts(0.06), M_['base'] - 0.01, octa(M_['r0'] + 0.03), M_['z0'] + 0.01, felt))
    # the tower: new pine boards, the lowest rows on its front painted white so far
    Z0, Z1, R0, R1 = M_['z0'], M_['z1'], M_['r0'], M_['r1']
    objs.append(ring_mesh('tower', octa(R0 - 0.02), Z0 - 0.04, octa(R1 - 0.02), Z1, pine2, cap_b=True))
    rad = lambda z: R0 + (R1 - R0) * (z - Z0) / (Z1 - Z0)
    tilt = math.atan2((R0 - R1) * math.cos(math.radians(22.5)), Z1 - Z0)
    z = Z0
    while z < Z1 - 0.01:
        h = 0.06; zc = z + h / 2; P = octa(rad(zc) + 0.004)
        for i in range(8):
            a, b = P[i], P[(i + 1) % 8]; d, L, n = _face_frame(a, b)
            nn = (n * math.cos(tilt) + Vector((0, 0, math.sin(tilt)))).normalized()
            m_ = white if (i in (0, 7, 1) and zc < 1.08) or (i == 0 and zc < 1.2) else random.choice((pine, pine, pine2))
            objs.append(plank('mboard', (a[0] - d.x * 0.01, a[1] - d.y * 0.01, zc), (b[0] + d.x * 0.01, b[1] + d.y * 0.01, zc), h + 0.008, 0.014, nn, m_, jitter=0.3, bevel=0.003))
        z += h
    for (x, y) in octa(1.0):
        objs.append(plank('mpost', (x * (R0 + 0.012), y * (R0 + 0.012), Z0 - 0.02), (x * (R1 + 0.012), y * (R1 + 0.012), Z1), 0.04, 0.03, (x, y, 0.15), pine, jitter=0.1))
    # its cap: an eight-sided little roof of wooden shingles, a knob, the windshaft out to the front
    objs.append(cyl('curb', R1 + 0.04, 0.04, (0, 0, Z1 + 0.02), m=shaft, verts=16, bevel=0.006))
    objs.append(cyl('woodcap', R1 + 0.09, 0.3, (0, 0, Z1 + 0.19), (0, 0, math.radians(22.5)), m=pine2, verts=8, r2=0.03, bevel=0.006))
    for k, t_ in enumerate((0.2, 0.45, 0.7)):        # its rows of shingles
        objs.append(cyl('capshingle', (R1 + 0.09) * (1 - t_) + 0.03 * t_ + 0.012, 0.03, (0, 0, Z1 + 0.04 + 0.3 * t_), (0, 0, math.radians(22.5)), m=pine if k % 2 else pine2, verts=8, r2=(R1 + 0.09) * (1 - t_ - 0.08) + 0.03 * (t_ + 0.08), bevel=0.0))
    objs.append(sphere('capknob', 0.035, (0, 0, Z1 + 0.36), m=shaft, seg=10, rings=6))
    objs.append(cyl('windshaft', 0.045, 0.3, (0, M_['hub_y'] + 0.17, M_['hub']), (math.radians(90), 0, 0), m=shaft, verts=12, bevel=0.004))
    MILLS['shed_pol'] = dict(hub=[0.0, round(M_['hub'], 3), round(-M_['hub_y'], 3)], sails='sails_pol_t1')
    # a plain new door of pine boards, the nest window, the hens' door and ramp
    for k in range(3):
        u = -0.1 + k * 0.1
        objs.append(plank('pdoor', (u, -D2 - 0.03, 0.02), (u, -D2 - 0.03, 0.6), 0.095, 0.03, (0, -1, 0), pine if k % 2 else pine2, jitter=0.3))
    for zz in (0.12, 0.5): objs.append(plank('zh', (-0.14, -D2 - 0.05, zz), (0.14, -D2 - 0.05, zz), 0.045, 0.02, (0, -1, 0), pine2, jitter=0.3))
    objs.append(plank('zb', (-0.12, -D2 - 0.05, 0.13), (0.12, -D2 - 0.05, 0.49), 0.04, 0.02, (0, -1, 0), pine2, jitter=0.3))
    objs.append(sphere('knob', 0.016, (0.09, -D2 - 0.07, 0.32), m=C('iron', '#26231f', rough=0.5, metal=0.6), seg=8, rings=5))
    nest_window(objs, 'pol', FL, WX, pine, solids=[core], door='drop', door_m=pine2)
    pop_door(objs, FL, pine, pine2, C('darkwood', '#6d4a31', rough=0.8))
    # a ladder up its right side to the felt; where the lantern post will be, a pot of white paint and its brush
    for sx in (-1, 1):
        objs.append(plank('ladrail', (W2 + 0.3, sx * 0.13, 0.0), (W2 + 0.05, sx * 0.13, 1.0), 0.04, 0.03, (1, 0, 0.25), pine2, jitter=0.2))
    for k in range(6):
        t_ = (k + 0.7) / 6.6
        objs.append(cyl('ladrung', 0.013, 0.28, (W2 + 0.3 - 0.25 * t_, 0.0, t_ * 1.0), (math.radians(90), 0, 0), m=pine, verts=6, bevel=0.0))
    BLOCKS.setdefault('shed_pol', []).append([round(W2 + 0.26, 3), 0.0, 0.18])
    px, py = -0.66, -D2 - 0.26
    objs.append(cyl('painttin', 0.07, 0.12, (px, py, 0.06), m=C('bx_painttin', '#c9cdcf', rough=0.4, metal=0.7), verts=14, bevel=0.005))
    objs.append(cyl('paint', 0.064, 0.006, (px, py, 0.122), m=white, verts=14, bevel=0.0))
    objs.append(cyl('brushh', 0.009, 0.12, (px + 0.03, py + 0.02, 0.17), (math.radians(30), 0, math.radians(40)), m=pine2, verts=6, bevel=0.0))
    objs.append(box('brushb', (0.045, 0.014, 0.04), (px + 0.005, py - 0.01, 0.13), (math.radians(30), 0, math.radians(40)), m=white, bevel=0.003, segs=1))
    objs.append(sphere('splat', 0.06, (px + 0.1, py - 0.06, 0.004), (1.3, 1, 0.08), m=white, ico=2, disp=0.3, seed=430))
    block('pol', -0.66, -D2 - 0.26, 0.1)
    # a pallet of new bricks where the millstone will lean
    objs.append(box('pallet', (0.32, 0.36, 0.05), (W2 + 0.22, 0.25, 0.025), m=pine2, bevel=0.005, segs=1))
    for k in range(3):
        for j in range(2):
            for l in range(2):
                objs.append(box('newbrick', (0.15, 0.07, 0.06), (W2 + 0.15 + l * 0.15, 0.13 + j * 0.24 - (0.04 if k % 2 else 0), 0.08 + k * 0.062), m=bricks[2 + (k + j + l) % 2], bevel=0.008, segs=1))
    BLOCKS.setdefault('shed_pol', []).append([round(W2 + 0.22, 3), -0.25, 0.22])
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 14, 0.0)
    _own(objs, root)
    return root


def _tulip(objs, x, y, col, h=0.16, seed=0):
    rnd = random.Random(seed); lean = Vector((rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), 1)).normalized()
    stem = _cw('stem', rough=0.8); top = Vector((x, y, 0)) + lean * h
    objs.append(cyl('tstem', 0.005, h, (Vector((x, y, 0)) + top) / 2, lean.to_track_quat('Z', 'Y').to_euler(), m=stem, verts=5, bevel=0.0))
    for sx in (-1, 1):
        objs.append(sphere('tleaf', 0.05, (x + sx * 0.015, y, 0.05), (0.2, 0.08, 1.0), (0, sx * 0.35, rnd.uniform(0, 3)), m=stem, ico=1))
    objs.append(sphere('tulip', 0.024, tuple(top + Vector((0, 0, 0.012))), (0.85, 0.85, 1.25), m=_cw('tulip', col, rough=0.5), seg=8, rings=6))


def _mill_bits(r, name, t, tower=None, seed=85, beds=((6, 0.1, 0.9), (7, 0.15, 0.85), (2, 0.2, 0.8)), box_c='#2f6a4f'):
    """What makes the windmill cosy (and stays on the Deluxe): tulips along its sides, Delft pots of tulips by the ramp, a pair
    of painted clogs on a doorstep by its green door, a window box of geraniums on the tower, the automatic door's box and its
    solar panel on the skirt, a path of red bricks to the gate."""
    random.seed(seed); objs = []; M_ = dict(MILL, **(tower or {}))
    soil = _cw('soil', rough=0.95, var=0.05); leaf = [C('rleaf1', '#3f7a35', rough=0.8), C('rleaf2', '#5a9442', rough=0.8)]
    pts = mill_base_pts()
    # tulip beds along its two sides and the back corners (clear of the millstone and sacks on the right)
    k = 0
    for (i, u0, u1) in beds:
        a, b = pts[i], pts[(i + 1) % 8]; d, L, n = _face_frame(a, b)
        c = Vector((a[0], a[1], 0)) + d * (L * (u0 + u1) / 2) + n * 0.1
        objs.append(box('tbed', (L * (u1 - u0) + 0.06, 0.15, 0.03), (c.x, c.y, 0.015), (0, 0, math.atan2(d.y, d.x)), m=soil, bevel=0.01, segs=1))
        for j in range(int(L * (u1 - u0) / 0.07)):
            p = Vector((a[0], a[1], 0)) + d * (L * u0 + 0.04 + j * 0.07) + n * (0.07 + 0.05 * (j % 2))
            _tulip(objs, p.x, p.y, (k // 3) % 5, h=0.13 + 0.04 * (j % 3) / 2, seed=k + 500); k += 1
        BLOCKS.setdefault(name, []).append([round(c.x, 3), round(-c.y, 3), 0.16])
    # blue-and-white Delft pots of tulips either side of the foot of the ramp
    blue, whitep = _cw('delft', rough=0.3, spec=0.5), _cw('delftw', rough=0.3, spec=0.5)
    for j, (x, y) in enumerate(((-0.64, -0.95), (0.02, -0.95))):
        objs.append(cyl('dpot', 0.075, 0.13, (x, y, 0.065), m=whitep, verts=16, r2=0.06, bevel=0.006))
        for z in (0.03, 0.11):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.071 - z * 0.08, minor_radius=0.007, major_segments=16, minor_segments=4, location=(x, y, z))
            o = bpy.context.object; setmat(o, blue); objs.append(o)
        for kk in range(4):                          # its blue flourishes
            aa = kk / 4 * math.tau + 0.4
            objs.append(sphere('dpaint', 0.016, (x + math.cos(aa) * 0.068, y + math.sin(aa) * 0.068, 0.07), (0.4, 0.4, 1.2), (0, 0, aa), m=blue, ico=1))
        for kk in range(5):
            aa = kk / 5 * math.tau
            _tulip(objs, x + math.cos(aa) * 0.035, y + math.sin(aa) * 0.035, (j * 2 + kk) % 3 * 2 % 6, h=0.17, seed=520 + kk + j * 5)
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.12])
    # a stone doorstep before the green door, a pair of yellow clogs on it, a red tulip painted on each
    objs.append(box('doorstep', (0.32, 0.14, 0.035), (0.0, -D2 - 0.08, 0.0175), m=C('stepstone', '#a8a194', rough=0.85, var=0.12), bevel=0.008, segs=1))
    clog, clog2 = _cw('clog', rough=0.6), _cw('clog2', rough=0.6)
    for sx in (-1, 1):
        cx = sx * 0.06; cy = -D2 - 0.09
        objs.append(sphere('clog', 0.07, (cx, cy, 0.075), (0.5, 1.15, 0.45), (0, 0, sx * 0.1), m=clog, seg=12, rings=8))
        objs.append(sphere('cloghole', 0.032, (cx, cy + 0.03, 0.098), (0.75, 1.0, 0.3), m=C('hall_dark', '#1d1510', rough=1.0), seg=10, rings=6))
        objs.append(sphere('clogtoe', 0.025, (cx, cy - 0.065, 0.09), (0.8, 0.7, 0.5), m=clog2, seg=8, rings=5))
        objs.append(sphere('clogtulip', 0.012, (cx + sx * 0.034, cy - 0.02, 0.08), (0.3, 1.0, 1.0), m=_cw('tulip', 0, rough=0.5), seg=6, rings=4))
    BLOCKS.setdefault(name, []).append([0.0, round(D2 + 0.09, 3), 0.12])
    # a window box of red geraniums under the tower's front window
    Z0, Z1, R0, R1 = M_['z0'], M_['z1'], M_['r0'], M_['r1']
    rad = lambda z: R0 + (R1 - R0) * (z - Z0) / (Z1 - Z0)
    wz = M_['win']
    fy = -rad(wz - 0.13) * math.cos(math.radians(22.5)) - 0.07
    objs.append(box('flowerbox', (0.22, 0.08, 0.07), (0.0, fy, wz - 0.13), m=C('millbox', box_c, rough=0.55, var=0.05), bevel=0.008, segs=1))
    gera = C('gera', '#d8343a', rough=0.55)
    for kk in range(6):
        x = -0.085 + kk * 0.034
        objs.append(sphere('leafp', 0.026, (x, fy, wz - 0.08), (1, 1, 0.8), m=leaf[kk % 2], ico=1, disp=0.2, seed=kk + 540))
        objs.append(sphere('flower', 0.019, (x + 0.008, fy - 0.01, wz - 0.06), m=gera, ico=1))
    # the automatic door: its box over the hens' door, its solar panel on the skirt's front left
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = 0.2 + POP_H + 0.065
    objs.append(box('autobox', (0.13, 0.05, 0.06), (-0.31, -D2 - 0.04, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.067, zb), m=led, seg=8, rings=4))
    # (its solar panel on top of the lantern post, tilted to the sky: on the steep skirt it stood up like a card)
    c = Vector((-0.66, -D2 - 0.26, 1.0)); up = Vector((0, 0.5, 0.866)); along = Vector((1, 0, 0)); nrm = Vector((0, -0.866, 0.5))
    objs.append(box('solarpole', (0.03, 0.03, 0.07), (c.x, c.y, 0.975), m=C('iron', '#26231f', rough=0.5, metal=0.6), bevel=0.003, segs=1))
    c = c + Vector((0, 0, 0.04))
    objs.append(plank('solarframe', c - up * 0.07, c + up * 0.07, 0.2, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for ii in range(2):
        for jj in range(3):
            cc = c + nrm * 0.012 + up * (-0.033 + ii * 0.066) + along * (-0.062 + jj * 0.062)
            objs.append(plank('solarcell', cc - up * 0.028, cc + up * 0.028, 0.055, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    # a path of red bricks, laid in pairs, from the foot of the ramp to the gate
    pav = [_cw('paver', i, var=0.06) for i in range(3)]
    gx, gy = _gate_of(t, 'pol'); a, b = Vector((-0.31, -1.02)), Vector((gx, gy + 0.3)); n = max(3, round((b - a).length / 0.2))
    dirn = (b - a).normalized(); ang = math.atan2(dirn.y, dirn.x)
    for kk in range(n + 1):
        q = a.lerp(b, kk / n)
        for sx in (-1, 1):
            p = q + Vector((-dirn.y, dirn.x)) * (sx * 0.05 + (0.025 if kk % 2 else -0.025))
            objs.append(box('paver', (0.09, 0.18, 0.025), (p.x, p.y, 0.0125), (0, 0, ang + math.pi / 2 + math.radians(random.uniform(-4, 4))), m=random.choice(pav), bevel=0.006, segs=1))
    _own(objs, r)
    return r


def cosy_pol():
    r = windmill(name='cosy_pol', pal=COSY_PAL, sails='sails_pol_cosy'); _mill_bits(r, 'cosy_pol', 3)
    return r


DX_MILL = dict(z1=2.12, r1=0.31, hub=2.29, hub_y=-0.6, sail=1.0, win=1.5, swin=1.4)


def deluxe_pol():
    """Deluxe: a taller tower with a gallery round it (a white rail), striped shutters on its windows, a fantail at the back of
    its cap, bigger sails with red stocks; the cosy touches."""
    r = windmill(name='deluxe_pol', M=DX_MILL, sails='sails_pol_dx', pal=DX_PAL)
    random.seed(87); objs = []; M_ = dict(MILL, **DX_MILL)
    white = C('trimw', DX_PAL['trim'], rough=0.6); deck = C('millstage', '#7a5a40', rough=0.8, var=0.08, grain=0.3, grain_scale=G)
    shaft = C('millshaft', '#5a3a26', rough=0.7, grain=0.3, grain_scale=G); green = C('milldoor', DX_PAL['door'], rough=0.55, var=0.05, grain=0.2, grain_scale=G)
    Z0, Z1, R0, R1 = M_['z0'], M_['z1'], M_['r0'], M_['r1']
    rad = lambda z: R0 + (R1 - R0) * (z - Z0) / (Z1 - Z0)
    # the gallery: a deck of boards round the tower on brackets, a white rail round its edge
    GZ = 1.08; GR = rad(GZ) + 0.2; inner = octa(rad(GZ) + 0.01); outer = octa(GR)
    for i in range(8):
        a, b, ia, ib = outer[i], outer[(i + 1) % 8], inner[i], inner[(i + 1) % 8]
        for k in range(3):
            t_ = (k + 0.5) / 3
            p0 = Vector(ia).lerp(Vector(a), t_); p1 = Vector(ib).lerp(Vector(b), t_)
            objs.append(plank('gboard', (p0.x, p0.y, GZ), (p1.x, p1.y, GZ), (GR - rad(GZ)) / 3 * 1.05, 0.025, (0, 0, 1), deck, jitter=0.6, bevel=0.003))
        m_ = Vector(a).lerp(Vector(b), 0.5); mi = Vector(ia).lerp(Vector(ib), 0.5)
        objs.append(plank('gbracket', (mi.x, mi.y, GZ - 0.22), (m_.x * 0.92, m_.y * 0.92, GZ - 0.02), 0.035, 0.03, (m_.y, -m_.x, 0), shaft, jitter=0.2))
        objs.append(box('grailpost', (0.025, 0.025, 0.14), (a[0], a[1], GZ + 0.07), m=white, bevel=0.004, segs=1))
        objs.append(plank('grail', (a[0], a[1], GZ + 0.135), (b[0], b[1], GZ + 0.135), 0.025, 0.02, (0, 0, 1), white, jitter=0.0, bevel=0.003))
        objs.append(plank('grail2', (a[0], a[1], GZ + 0.07), (b[0], b[1], GZ + 0.07), 0.018, 0.014, (0, 0, 1), white, jitter=0.0, bevel=0.002))
    # striped shutters either side of the tower's windows (green and white, as on Dutch mills)
    for (wz, normal, x0) in ((M_['win'], (0, -1, 0), 0.0), (M_['swin'], (1, 0, 0), None), (M_['swin'], (-1, 0, 0), None)):
        if normal[1]:
            fy = -rad(wz) * math.cos(math.radians(22.5)) - 0.035
            for sx in (-1, 1):
                objs.append(box('shutter', (0.07, 0.015, 0.18), (sx * 0.11, fy, wz), m=green, bevel=0.003, segs=1))
                objs.append(box('shutstripe', (0.075, 0.017, 0.03), (sx * 0.11, fy - 0.001, wz), (0, sx * 0.9, 0), m=white, bevel=0.0))
        else:
            fx = normal[0] * (rad(wz) * math.cos(math.radians(22.5)) + 0.04)
            for sy in (-1, 1):
                objs.append(box('shutter', (0.015, 0.065, 0.16), (fx, sy * 0.1, wz), m=green, bevel=0.003, segs=1))
                objs.append(box('shutstripe', (0.017, 0.07, 0.028), (fx + normal[0] * 0.001, sy * 0.1, wz), (sy * 0.9, 0, 0), m=white, bevel=0.0))
    # the fantail at the back of the cap: a little wheel of white blades on a frame (it keeps the sails to the wind)
    fy_, fz_ = R1 + 0.38, Z1 + 0.12
    for sx in (-1, 1):
        objs.append(plank('fanframe', (sx * 0.12, 0.15, Z1 + 0.06), (sx * 0.02, fy_, fz_), 0.03, 0.025, (sx, 0, 0), shaft, jitter=0.2))
    objs.append(cyl('fanhub', 0.03, 0.06, (0, fy_, fz_), (0, math.radians(90), 0), m=shaft, verts=10, bevel=0.0))
    for k in range(6):
        a = k / 6 * math.tau
        d = Vector((0, math.cos(a), math.sin(a)))
        objs.append(plank('fanblade', Vector((0, fy_, fz_)) + d * 0.03, Vector((0, fy_, fz_)) + d * 0.2, 0.06, 0.008, (0.6, 0, 0), white, jitter=0.0, bevel=0.002))
    _own(objs, r)
    _mill_bits(r, 'deluxe_pol', 4, tower=DX_MILL, box_c=DX_PAL['door'])
    r.name = 'deluxe_pol'
    return r


# ---- the Little Windmill's gardens (its own): a terracotta bowl for water in the small pens, a blue-and-white Delft one in
# the Cosy; Cosy: a swing on Dutch-green posts, a giant wooden clog full of sand, the cabbage hanging from the arm of a post
# with a little toy windmill on top; Deluxe: a sandbox of blue-and-white tiles, a little canal with a white drawbridge for
# water, a feeder like a tiny windmill, the swing, the post, a xylophone of tulip-coloured bars on a green stand.
PENS_BY['pol'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(-0.72, -1.38), dish=(0.78, -1.5), bowl='terracotta', hay=None, hay_rot=0, sack=None,
            straw=((0.1, -1.3, 0.25, 22), (0.7, -0.9, 0.2, 14))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(-1.0, -1.55), dish=(0.98, -1.5), bowl='terracotta', hay=None, hay_rot=0, sack=None,
            straw=((0.3, -1.65, 0.3, 26), (-0.9, -1.05, 0.25, 20))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(1.55, -2.2), dish=(-0.8, -2.35), bowl='delft', hay=(-1.7, 0.4), hay_rot=90, sack=None,
            straw=((-1.7, 0.4, 0.4, 35), (0.7, -1.4, 0.35, 30), (-0.5, -1.8, 0.3, 25))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(-1.85, -1.95), feeder_style='mill', dish=(1.55, -2.5), water='canal', hay=(2.0, 0.5), hay_rot=90,
            sack=None, pebbles=10, straw=((0.6, -1.3, 0.3, 25), (2.0, 0.5, 0.4, 35))),
}
PLAY_BY['pol'] = {3: dict(swing=(1.45, -0.8), clog=(-1.35, -1.3), cabbage=(0.85, -2.35), frame='dutch', holder='mill'),
                  4: dict(swing=(1.6, -0.9), delft=(-1.45, -0.95), cabbage=(-0.95, -2.6), xylo=(0.95, -1.6), frame='dutch', holder='mill', bars='tulip')}
CLOG_L, CLOG_W, CLOG_Y = 0.92, 0.44, 0.13                         # the Cosy windmill's giant clog of sand (along x; its sand's height)
DELFT_W, DELFT_D = 0.86, 0.66                                     # the Deluxe windmill's tiled sandbox (x, y)


def dutch_swing(objs, x, y):
    """The windmill's swing: two Dutch-green A frames, white tops shaped like little tulips, a white bar across."""
    green = C('milldoor', '#2f6a4f', rough=0.55, var=0.05, grain=0.2, grain_scale=G); white = C('trimw', '#efe9dc', rough=0.6)
    for sx in (-1, 1):
        top = Vector((x + sx * SWING_HALF, y, SWING_TOP))
        for sy in (-1, 1):
            objs.append(plank('swleg', Vector((x + sx * SWING_HALF, y + sy * 0.2, 0.0)), top + Vector((0, 0, 0.02)), 0.04, 0.035, (sx, 0, 0), green, jitter=0.3))
        objs.append(plank('swbrace', Vector((x + sx * SWING_HALF, y - 0.1, 0.27)), Vector((x + sx * SWING_HALF, y + 0.1, 0.27)), 0.03, 0.025, (sx, 0, 0), white, jitter=0.3))
        objs.append(sphere('swtulip', 0.032, (x + sx * (SWING_HALF + 0.07), y, SWING_TOP + 0.02), (0.85, 0.85, 1.2), m=_cw('tulip', 0, rough=0.5), seg=10, rings=7))
    objs.append(cyl('swbar', 0.022, 2 * SWING_HALF + 0.1, (x, y, SWING_TOP), (0, math.radians(90), 0), m=white, verts=10, bevel=0.0))


def cabbage_mill(objs, x, y):
    """The windmill's way of hanging the cabbage: a white post with a little toy windmill on its top, an arm out to it."""
    white = C('trimw', '#efe9dc', rough=0.6); green = C('milldoor', '#2f6a4f', rough=0.55, var=0.05)
    px, py = x, y + 0.28
    objs.append(box('cpost', (0.05, 0.05, CAB_TOP + 0.04), (px, py, (CAB_TOP + 0.04) / 2), m=white, bevel=0.008))
    objs.append(box('carm', (0.04, 0.32, 0.04), (px, py - 0.14, CAB_TOP), m=green, bevel=0.006))
    objs.append(box('cbrace', (0.03, 0.16, 0.03), (px, py - 0.06, CAB_TOP - 0.08), (math.radians(-40), 0, 0), m=green, bevel=0.005, segs=1))
    tz = CAB_TOP + 0.04                                            # the toy windmill on top
    objs.append(cyl('tmill', 0.04, 0.14, (px, py, tz + 0.07), (0, 0, math.pi / 8), m=C('millboard', '#f2ede2', rough=0.7, var=0.03), verts=8, r2=0.028, bevel=0.003))
    objs.append(cyl('tmcap', 0.036, 0.05, (px, py, tz + 0.165), m=C('millslate', '#454c57', rough=0.65), verts=10, r2=0.01, bevel=0.003))
    hub = Vector((px, py - 0.045, tz + 0.12))
    for k in range(4):
        a = math.radians(30 + k * 90); d = Vector((math.cos(a), 0, math.sin(a))); q = Vector((-math.sin(a), 0, math.cos(a)))
        objs.append(plank('tmsail', hub + d * 0.015 + q * 0.012, hub + d * 0.085 + q * 0.012, 0.026, 0.004, (0, -1, 0), C('cw_cloth', '#ece0c4', rough=0.9), jitter=0.0, bevel=0.0))
    for k in range(3):
        a = k * 2.1 + 0.4
        objs.append(sphere('cstone', 0.035, (px + math.cos(a) * 0.06, py + math.sin(a) * 0.06, 0.012), (1.2, 1, 0.6), m=_barn_m('stone', rough=0.9, grain=0.0), ico=1, disp=0.2, seed=k + 560))


def sand_clog(objs, x, y):
    """The Cosy windmill's sand bath: a giant wooden clog (its toe turned up) full of sand, a red tulip painted on its side."""
    clog, clog2 = _cw('clog', rough=0.6, var=0.03), _cw('clog2', rough=0.6)
    sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    L, W, H = CLOG_L, CLOG_W, 0.16
    def outline(t):                                                # its rim round from the heel (t=0) by the toe (t=0.5)
        a = t * math.tau; c, s_ = math.cos(a), math.sin(a)
        rx = L / 2 * (1.0 if c < 0 else 1.12); ry = W / 2 * (1.0 if c < 0 else 0.86 - 0.18 * c)
        return Vector((x - c * rx * 0.98, y + s_ * ry, 0))
    N = 28; me = bpy.data.meshes.new('clogside'); bm = bmesh.new(); low, high = [], []
    for k in range(N):
        p = outline(k / N); toe = max(0.0, math.cos(k / N * math.tau)) ** 3
        low.append(bm.verts.new((p.x, p.y, 0.02))); high.append(bm.verts.new((p.x, p.y, H + 0.09 * toe)))
    for k in range(N): bm.faces.new((low[k], low[(k + 1) % N], high[(k + 1) % N], high[k]))
    bm.faces.new(list(reversed(low))); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('clogside', me)); setmat(o, clog); so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.03; so.offset = -1
    for p_ in o.data.polygons: p_.use_smooth = True
    objs.append(o)
    objs.append(cyl('clogsole', 0.5, 0.03, (x, y, 0.015), m=clog2, verts=24, bevel=0.0)); objs[-1].scale = (L / 2 * 1.04 / 0.5, W / 2 / 0.5, 1)
    objs.append(cyl('clogsand', 0.5, 0.02, (x + 0.03, y, CLOG_Y - 0.01), m=sand, verts=24, bevel=0.0)); objs[-1].scale = ((L / 2 - 0.08) / 0.5, (W / 2 - 0.05) / 0.5, 1)
    for k, (dx, s_) in enumerate(((-0.17, 0.1), (0.15, 0.08))):
        objs.append(sphere('cmound', s_, (x + dx, y + 0.02 * (1 - 2 * k), CLOG_Y), (1.3, 1.0, 0.22), (0, 0, k), m=sand, ico=2, disp=0.15, seed=k + 570))
    for sy in (-1, 1):                                             # a red tulip painted on each side
        objs.append(sphere('cpaint', 0.028, (x + 0.05, y + sy * (W / 2 + 0.008), 0.11), (1.0, 0.2, 1.3), m=_cw('tulip', 0, rough=0.5), seg=8, rings=6))
        objs.append(sphere('cpaintl', 0.03, (x + 0.05, y + sy * (W / 2 + 0.006), 0.06), (0.25, 0.2, 1.0), m=_cw('stem', rough=0.8), seg=6, rings=4))
    for k in range(6):
        aa = random.uniform(0, math.tau)
        objs.append(sphere('cspill', random.uniform(0.04, 0.06), (x + math.cos(aa) * (L / 2 + 0.1), y + math.sin(aa) * (W / 2 + 0.1), 0.012), (1.4, 1, 0.12), (0, 0, aa), m=sand, ico=2, disp=0.2, seed=k + 575))


def sand_delft(objs, x, y):
    """The Deluxe windmill's sand bath: a low sandbox faced with blue-and-white Delft tiles, full of sand, a little toy boat."""
    blue, whitep = _cw('delft', rough=0.3, spec=0.5), _cw('delftw', rough=0.3, spec=0.5)
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); sand2 = mat('dsand2', '#e2c98e', rough=0.95, var=0.05)
    hw, hd, H = DELFT_W / 2, DELFT_D / 2, 0.11
    objs.append(box('dcore', (DELFT_W - 0.02, DELFT_D - 0.02, H - 0.01), (x, y, (H - 0.01) / 2), m=whitep, bevel=0.0))
    for (a, b, n) in (((x - hw, y - hd), (x + hw, y - hd), (0, -1, 0)), ((x - hw, y + hd), (x + hw, y + hd), (0, 1, 0)),
                      ((x - hw, y - hd), (x - hw, y + hd), (-1, 0, 0)), ((x + hw, y - hd), (x + hw, y + hd), (1, 0, 0))):
        A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); L = (B - A).length; nt = max(3, round(L / 0.11))
        for k in range(nt):                                         # tiles along it, a blue flower painted on each
            c = A.lerp(B, (k + 0.5) / nt) + Vector(n) * 0.006 + Vector((0, 0, H / 2))
            objs.append(box('dtile', (L / nt - 0.008 if n[1] else 0.006, 0.006 if n[1] else L / nt - 0.008, H - 0.012), tuple(c), m=whitep, bevel=0.002, segs=1))
            objs.append(sphere('dtpaint', 0.022, tuple(c + Vector(n) * 0.004), (0.9 if n[1] else 0.2, 0.2 if n[1] else 0.9, 0.9), m=blue, seg=8, rings=5))
        objs.append(plank('dtrim', (a[0], a[1], H + 0.008), (b[0], b[1], H + 0.008), 0.045, 0.016, (0, 0, 1), blue, jitter=0.0, bevel=0.003))
    objs.append(box('sand', (DELFT_W - 0.05, DELFT_D - 0.05, 0.02), (x, y, H - 0.02), m=sand, bevel=0.01, segs=2))
    for k, (dx, dy, s_) in enumerate(((-0.18, 0.06, 0.12), (0.2, -0.08, 0.1))):
        objs.append(sphere('smound', s_, (x + dx, y + dy, H - 0.015), (1.3, 1.0, 0.22), (0, 0, k), m=sand2 if k else sand, ico=2, disp=0.15, seed=k + 580))
    bx, by = x + 0.24, y + 0.16                                   # a little toy boat with a white sail
    objs.append(sphere('tboat', 0.07, (bx, by, H + 0.01), (1.3, 0.55, 0.4), m=_cw('red', rough=0.5), seg=10, rings=6))
    objs.append(cyl('tmast', 0.005, 0.13, (bx, by, H + 0.08), m=C('millshaft', '#5a3a26', rough=0.7), verts=5, bevel=0.0))
    objs.append(_tri('tsail', (bx + 0.005, by, H + 0.04), (bx + 0.005, by, H + 0.14), (bx + 0.07, by, H + 0.045), (0, -1, 0), 0.004, C('trimw', '#efe9dc', rough=0.6)))
    for k in range(5):
        aa = random.uniform(0, math.tau)
        objs.append(sphere('sspill', random.uniform(0.04, 0.06), (x + math.cos(aa) * (hw + 0.08), y + math.sin(aa) * (hd + 0.08), 0.012), (1.4, 1, 0.12), (0, 0, aa), m=sand, ico=2, disp=0.2, seed=k + 585))


def tulip_xylophone(objs, x, y):
    """A xylophone of bars in tulip colours on a little green stand, a red tulip at each end of it, a mallet."""
    green = C('milldoor', '#2f6a4f', rough=0.55, var=0.05); white = C('trimw', '#efe9dc', rough=0.6)
    cols = ['#e2453c', '#ff8c42', '#f4c430', '#f08bb0', '#9b6bd1', '#fbf6ee']
    for sy in (-1, 1):
        objs.append(box('xrail', (0.26, 0.03, 0.025), (x, y + sy * 0.16, 0.085), m=green, bevel=0.005, segs=1))
        for sx in (-1, 1):
            objs.append(box('xleg', (0.03, 0.03, 0.08), (x + sx * 0.1, y + sy * 0.16, 0.04), m=green, bevel=0.004, segs=1))
        objs.append(sphere('xtulip', 0.022, (x, y + sy * 0.21, 0.1), (0.85, 0.85, 1.2), m=_cw('tulip', 0, rough=0.5), seg=8, rings=6))
    for k in range(6):
        yy = y - 0.13 + k * 0.052; L = 0.26 - k * 0.025
        objs.append(box('xbar', (L, 0.042, 0.016), (x, yy, 0.105), m=C('txbar%d' % k, cols[k], rough=0.4, metal=0.3), bevel=0.004, segs=1))
        for sx in (-1, 1):
            objs.append(sphere('xpin', 0.007, (x + sx * (L / 2 - 0.02), yy, 0.115), m=white, seg=6, rings=4))
    objs.append(cyl('xmallet', 0.006, 0.16, (x + 0.08, y + 0.2, 0.015), (math.radians(90), 0, math.radians(30)), m=green, verts=6, bevel=0.0))
    objs.append(sphere('xmhead', 0.018, (x + 0.12, y + 0.27, 0.018), m=_cw('tulip', 1, rough=0.5), seg=8, rings=6))


# ---- release 7, the Javanese House's five looks (the Ayam Cemani's coop; Audrey, 29 Oct, on its everyday look: "Yes"; and
# from the windmill's: looks 3, 4 and 5 each clearly its own).
# Rustic (box_aya): a hut of salvaged planks of every colour on stones, a roof of rusty tin sheets under a palm frond, an old
#   carved panel with gold in it leaning on its side (the hint), a cracked jar.
# Mended (shed_aya): walls of new woven bamboo on a low stone base, a hipped roof half laid with new clay tiles (bare battens
#   above), a stack of tiles waiting.
# Snug (house_aya): the joglo, terracotta tiles.
# Cosy (cosy_aya): green-glazed tiles; a frangipani tree in flower by its left side, a banana plant at its back right, orchids
#   in pots by the ramp, the automatic door's box and its solar panel, river stones to the gate.
# Deluxe (deluxe_aya): taller, cream walls, red posts with gold, a third tier of roof, black-glazed tiles with gold hips, two
#   gold-and-red ceremonial umbrellas at its front; the cosy touches.
# The hens come, go and lay the same way in every look (NESTS['house_aya']: the floor 0.24, the nest window at 0.42).
JR = dict(plank=('#8e8676', '#7b7466', '#5f7f8f', '#7f8f5a', '#9a7a58'), rust='#9a5a34', rust2='#7d4a2c', frond='#8a9a48', frond2='#a8a85a',
          bamboo='#d9c58a', bamboo2='#b9a066', batten='#a07850', soil='#5b4332', frang='#f7f3e6', frangc='#f2c94c', leaf='#3f6e34', leaf2='#56883e',
          banana='#6fa04a', banana2='#5a8a3c', orchid='#b46ad1', orchid2='#f4e9f6', river='#6e6b66', red='#8e2b22')
COSY_JG = dict(tile='#4f8a5b', tile2='#3f7449', ridge='#2f5a37', glazed=True)
DX_JG = dict(tile='#2b2a2e', tile2='#1f1e22', ridge='#141317', glazed=True, goldhips=True, wall='#efe4cc', wall2='#e6d9bd', post='#8e2b22')
DX_JOGLO = dict(eave=1.0, brk=1.22, brk2=1.52, peak=2.16)


def _jr(key, i=None, rough=0.85, **kw):
    v = JR[key] if i is None else JR[key][i]
    return C('jr_' + key + ('' if i is None else str(i)), v, rough=rough, **kw)


def box_aya(seed=91):
    """Rustic: a hut of salvaged planks on stones, a roof of rusty tin under a palm frond, an old carved panel by it."""
    random.seed(seed); root = empty('box_aya'); objs = []
    FL, WX, ZF, ZB = 0.24, 0.42, 0.86, 0.96
    planks = [_jr('plank', i, var=0.08, grain=0.3, grain_scale=G) for i in range(5)]; dark = C('hall_dark', '#1d1510', rough=1.0)
    rust, rust2 = _jr('rust', rough=0.7, var=0.1, metal=0.2), _jr('rust2', rough=0.75, var=0.08)
    stones = [_jg('stone', i, rough=0.9, var=0.06) for i in range(3)]
    core = box('core', (2 * W2 - 0.06, 2 * D2 - 0.06, ZF - FL - 0.02), (0, 0, (ZF + FL) / 2 - 0.01), m=dark, bevel=0.0); objs.append(core)
    objs.append(box('floor', (2 * W2, 2 * D2, 0.03), (0, 0, FL - 0.015), m=planks[1], bevel=0.004, segs=1))
    for (x, y) in ((-W2 + 0.08, -D2 + 0.08), (W2 - 0.08, -D2 + 0.08), (-W2 + 0.08, D2 - 0.08), (W2 - 0.08, D2 - 0.08), (0.0, D2 - 0.08)):
        for k in range(2):                           # (stood on piles of stones)
            objs.append(box('stilt', (0.16, 0.14, FL / 2 - 0.01), (x + random.uniform(-0.02, 0.02), y, FL / 4 + k * FL / 2 - 0.01), (0, 0, random.uniform(-0.3, 0.3)), m=random.choice(stones), bevel=0.012, segs=1, jitter=0.006))
    holes = [(-0.31 - POP_W / 2 - 0.01, -0.31 + POP_W / 2 + 0.01, FL, FL + POP_H + 0.02), (WX - WIN_W / 2 - 0.01, WX + WIN_W / 2 + 0.01, FL + 0.03, FL + 0.04 + WIN_H + 0.02)]
    top = lambda y: ZF + (ZB - ZF) * (y + D2) / (2 * D2)
    def run(side, length, place):                    # planks across, of every colour, a few gone
        z = FL
        while z < ZB:
            h = random.uniform(0.07, 0.1); u = -length / 2
            while u < length / 2:
                w = min(random.uniform(0.3, 0.6), length / 2 - u); um = u + w / 2
                if w > 0.05 and random.random() > 0.08 and not (side == 'front' and any(a - 0.02 < um < b + 0.02 and c < z + h / 2 < d for (a, b, c, d) in holes)):
                    place(um, z + h / 2, w, h)
                u += w
            z += h
    run('front', 2 * W2 + 0.04, lambda u, zc, w, h: objs.append(plank('rplank', (u - w / 2, -D2 - 0.01, zc), (u + w / 2, -D2 - 0.01, zc), h - 0.01, 0.025, (0, -1, 0), random.choice(planks), jitter=1.5)) if zc < ZF - 0.02 else None)
    for sx in (-1, 1):
        run('side', 2 * D2 + 0.04, lambda u, zc, w, h, sx=sx: objs.append(plank('rplank', (sx * (W2 + 0.01), u - w / 2, zc), (sx * (W2 + 0.01), u + w / 2, zc), h - 0.01, 0.025, (sx, 0, 0), random.choice(planks), jitter=1.5)) if zc < top(u) - 0.02 else None)
    run('back', 2 * W2 + 0.04, lambda u, zc, w, h: objs.append(plank('rplank', (u - w / 2, D2 + 0.01, zc), (u + w / 2, D2 + 0.01, zc), h - 0.01, 0.025, (0, 1, 0), random.choice(planks), jitter=1.5)) if zc < ZB - 0.02 else None)
    # the roof: three rusty corrugated tin sheets sloping to the front, a palm frond over them, stones on top
    nrm = Vector((0, -(ZB - ZF), 2 * D2 + 0.3)).normalized()
    for k, x0 in enumerate((-W2 - 0.12, -0.24, 0.32)):
        w = 0.6 if k < 2 else W2 + 0.12 - 0.32
        a = Vector((x0 + w / 2, -D2 - 0.16, ZF + 0.02)); b = Vector((x0 + w / 2, D2 + 0.12, ZB + 0.02))
        objs.append(plank('tin', a + nrm * 0.006 * k, b + nrm * 0.006 * k, w, 0.01, nrm, random.choice((rust, rust2)), jitter=1.2, bevel=0.0))
        for j in range(int(w / 0.06)):               # its ribs
            xx = x0 + 0.03 + j * 0.06
            objs.append(cyl('tinrib', 0.008, (b - a).length, Vector((xx, (a.y + b.y) / 2, (a.z + b.z) / 2)) + nrm * (0.012 + 0.006 * k), (b - a).normalized().to_track_quat('Z', 'Y').to_euler(), m=rust2, verts=4, bevel=0.0))
    fr = [_jr('frond', rough=0.85), _jr('frond2', rough=0.85)]
    p0 = Vector((-0.75, 0.3, ZB + 0.06)); p1 = Vector((0.55, -0.3, ZF + 0.07)); d = (p1 - p0).normalized(); q = d.cross(nrm).normalized()
    objs.append(cyl('fmid', 0.012, (p1 - p0).length, (p0 + p1) / 2, d.to_track_quat('Z', 'Y').to_euler(), m=fr[1], verts=5, bevel=0.0))
    for k in range(16):                              # its leaflets either side
        c = p0.lerp(p1, (k + 1) / 17)
        for sx in (-1, 1):
            e = c + q * sx * 0.12 + d * 0.06
            objs.append(sphere('leaflet', 0.07, (c + e) / 2 + nrm * 0.01, (0.15, 1.0, 0.04), tuple((e - c).normalized().to_track_quat('Y', 'Z').to_euler()), m=fr[k % 2], ico=1))
    for (x, y) in ((-0.3, -0.1), (0.45, 0.2)):
        objs.append(sphere('roofstone', 0.06, (x, y, ZF + (ZB - ZF) * (y + D2) / (2 * D2) + 0.08), (1.2, 1, 0.7), m=random.choice(stones), ico=2, disp=0.3, seed=int(x * 10) + 700))
    # the hens' door (its hole), an old plank for a ramp, the nest window (its door an old plank)
    _ramp(objs, FL, planks[0], planks[1], w=0.17, slats=2)
    nest_window(objs, 'aya', FL, WX, planks[1], solids=[core], door='drop', door_m=planks[4])
    # an old carved panel leaning on its right side, gold left in its carving (the hint), a cracked old jar
    px = W2 + 0.09
    objs.append(box('oldpanel', (0.03, 0.42, 0.5), (px, -0.05, 0.25), (0, math.radians(-12), 0), m=_jg('teakd', var=0.06), bevel=0.006, segs=1))
    for k, (dy, dz) in enumerate(((-0.1, 0.36), (0.08, 0.36), (-0.1, 0.16), (0.08, 0.16), (-0.01, 0.26))):
        objs.append(box('oldcarve', (0.012, 0.06, 0.06), (px + 0.02 + (dz - 0.25) * 0.2, -0.05 + dy, dz), (math.radians(45), math.radians(-12), 0), m=_jg('gold', rough=0.5, metal=0.5), bevel=0.003, segs=1))
    objs.append(sphere('oldjar', 0.11, (W2 + 0.18, 0.3, 0.11), (1, 1, 1.05), m=_jg('jar', rough=0.85, var=0.06), seg=12, rings=8))
    objs.append(box('jarcrack', (0.004, 0.02, 0.12), (W2 + 0.18 + 0.105, 0.3, 0.13), (0, 0, 0), m=dark, bevel=0.0))
    BLOCKS.setdefault('box_aya', []).append([round(W2 + 0.13, 3), -0.1, 0.2]); BLOCKS.setdefault('box_aya', []).append([round(W2 + 0.18, 3), -0.3, 0.14])
    straw_bits(objs, (-0.2, -D2 - 0.15, 0), 0.25, 18, 0.0)
    _own(objs, root)
    return root


def shed_aya(seed=93):
    """Mended: walls of new woven bamboo on a low stone base, a hipped roof half laid with new clay tiles, tiles waiting."""
    random.seed(seed); root = empty('shed_aya'); objs = []
    FL, WX, EAVE, PEAK = 0.24, 0.42, 0.88, 1.38
    bam, bam2 = _jr('bamboo', rough=0.6, var=0.05), _jr('bamboo2', rough=0.6, var=0.05); batten = _jr('batten', var=0.08, grain=0.3, grain_scale=G)
    pole = C('fp_bamboo', '#c9b56e', rough=0.6); stones = [_jg('stone', i, rough=0.9, var=0.06) for i in range(3)]
    tile, tile2, ridge = _jg('tile', rough=0.7, var=0.1), _jg('tile2', rough=0.7, var=0.08), _jg('ridge', rough=0.7)
    dark = C('hall_dark', '#1d1510', rough=1.0)
    PX, PY = W2 + 0.04, D2 + 0.04
    objs.append(box('plinth', (2 * PX, 2 * PY, FL - 0.01), (0, 0, (FL - 0.01) / 2), m=stones[1], bevel=0.01, segs=1))
    for k in range(12):                              # its stones' faces along the front
        objs.append(box('pstone', (2 * PX / 6 - 0.012, 0.03, FL / 2 - 0.012), (-PX + (k % 6 + 0.5) * 2 * PX / 6 + (0.05 if k >= 6 else 0) - 0.025, -PY - 0.012, FL / 4 + (k // 6) * FL / 2), m=random.choice(stones), bevel=0.008, segs=1, jitter=0.002))
    core = box('core', (2 * W2 - 0.04, 2 * D2 - 0.04, EAVE - FL), (0, 0, (EAVE + FL) / 2), m=dark, bevel=0.0); objs.append(core)
    holes = [(-0.31 - POP_W / 2 - 0.01, -0.31 + POP_W / 2 + 0.01, FL, FL + POP_H + 0.03), (-0.12, 0.18, FL, FL + 0.6), (WX - WIN_W / 2 - 0.01, WX + WIN_W / 2 + 0.01, FL + 0.03, FL + 0.04 + WIN_H + 0.03)]
    def weave(u0, u1, place, front=False):           # woven bamboo: little squares in two shades, a checker
        S = 0.075; nu = int((u1 - u0) / S); nz = int((EAVE - FL - 0.04) / S)
        for i in range(nu):
            for j in range(nz):
                u = u0 + (i + 0.5) * (u1 - u0) / nu; z = FL + 0.02 + (j + 0.5) * S
                if front and any(a < u < b and c < z < d for (a, b, c, d) in holes): continue
                place(u, z, (u1 - u0) / nu, (i + j) % 2)
    weave(-W2, W2, lambda u, z, w, k: objs.append(box('weave', (w - 0.006, 0.014, 0.069), (u, -D2 - 0.008, z), m=bam if k else bam2, bevel=0.0)), front=True)
    weave(-W2, W2, lambda u, z, w, k: objs.append(box('weave', (w - 0.006, 0.014, 0.069), (u, D2 + 0.008, z), m=bam if k else bam2, bevel=0.0)))
    for sx in (-1, 1):
        weave(-D2, D2, lambda u, z, w, k, sx=sx: objs.append(box('weave', (0.014, w - 0.006, 0.069), (sx * (W2 + 0.008), u, z), m=bam if k else bam2, bevel=0.0)))
    for (x, y) in ((-W2, -D2), (W2, -D2), (-W2, D2), (W2, D2)):     # bamboo poles at its corners, a rail along the top
        objs.append(cyl('bpole', 0.028, EAVE - FL + 0.04, (x, y, (EAVE + FL) / 2), m=pole, verts=8, bevel=0.0))
    for (a, b) in (((-W2, -D2 - 0.02), (W2, -D2 - 0.02)), ((W2 + 0.02, -D2), (W2 + 0.02, D2)), ((-W2 - 0.02, -D2), (-W2 - 0.02, D2))):
        objs.append(cyl('brail', 0.02, math.dist(a, b), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, EAVE - 0.03), (0, math.radians(90), math.atan2(b[1] - a[1], b[0] - a[0])), m=pole, verts=7, bevel=0.0))
    # the roof: battens over its whole frame, new tiles laid over the lower half so far (ribs and courses), the ridge bare
    OV = 0.16; outer = [(-W2 - OV, -D2 - 0.1), (W2 + OV, -D2 - 0.1), (W2 + OV, D2 + OV), (-W2 - OV, D2 + OV)]
    top = [(-0.3, 0.03), (0.3, 0.03), (0.3, 0.03), (-0.3, 0.03)]
    objs.append(ring_mesh('roofboard', outer, EAVE, top, PEAK, batten))
    for i in range(4):
        a0, a1 = Vector((*outer[i], EAVE)), Vector((*outer[(i + 1) % 4], EAVE)); b0, b1 = Vector((*top[i], PEAK)), Vector((*top[(i + 1) % 4], PEAK))
        up = (b0.lerp(b1, 0.5) - a0.lerp(a1, 0.5)).normalized(); along = (a1 - a0).normalized(); nrm = along.cross(up)
        if nrm.z < 0: nrm = -nrm
        for k in range(7):                           # battens across, all the way up
            t = (k + 0.5) / 7; p, q = a0.lerp(b0, t), a1.lerp(b1, t)
            if (q - p).length > 0.05: objs.append(plank('batten', p + nrm * 0.012, q + nrm * 0.012, 0.025, 0.018, nrm, batten, jitter=0.3, bevel=0.0))
    half = [Vector((*outer[i], EAVE)).lerp(Vector((*top[i], PEAK)), 0.5) for i in range(4)]
    hip_tier(objs, 'tiledhalf', outer, EAVE + 0.025, [(v.x, v.y) for v in half], (EAVE + PEAK) / 2 + 0.025, tile, tile2, 3, hip=ridge)
    # a plain door of woven bamboo, the nest window, the hens' door and ramp
    objs.append(box('bdoor', (0.28, 0.025, 0.58), (0.03, -D2 - 0.015, FL + 0.29), m=bam2, bevel=0.004, segs=1))
    for k in range(6):
        objs.append(box('bdoorweave', (0.26, 0.01, 0.03), (0.03, -D2 - 0.032, FL + 0.06 + k * 0.095), m=bam, bevel=0.0))
    nest_window(objs, 'aya', FL, WX, pole, solids=[core], door='drop', door_m=bam2)
    pop_door(objs, FL, pole, C('wood', '#a7744a', rough=0.75, var=0.13, grain=0.38, grain_scale=G), C('darkwood', '#6d4a31', rough=0.8))
    # new tiles stacked where the lantern will hang, more on a pallet by its right side
    for k in range(6):
        objs.append(box('newtiles', (0.2, 0.14, 0.025), (-0.66, -D2 - 0.26, 0.0125 + k * 0.026), (0, 0, random.uniform(-0.05, 0.05)), m=tile if k % 2 else tile2, bevel=0.004, segs=1))
    block('aya', -0.66, -D2 - 0.26, 0.13)
    objs.append(box('pallet', (0.32, 0.36, 0.05), (W2 + 0.22, -0.05, 0.025), m=batten, bevel=0.005, segs=1))
    for k in range(8):
        objs.append(box('newtiles', (0.14, 0.2, 0.025), (W2 + 0.15 + (k % 2) * 0.15, -0.05, 0.065 + (k // 2) * 0.027), m=tile if k % 3 else tile2, bevel=0.004, segs=1))
    BLOCKS.setdefault('shed_aya', []).append([round(W2 + 0.22, 3), 0.05, 0.22])
    straw_bits(objs, (-0.31, -D2 - 0.04, FL + 0.01), 0.08, 14, 0.0)
    _own(objs, root)
    return root


def frangipani(objs, x, y, h=1.0, seed=0):
    """A little frangipani tree: a grey trunk forking into stout branches, tufts of long leaves at their tips, white flowers
    with yellow hearts among them."""
    rnd = random.Random(seed); bark = C('frbark', '#7d7468', rough=0.85, var=0.05)
    leaf = [_jr('leaf', rough=0.7), _jr('leaf2', rough=0.7)]; fl, flc = _jr('frang', rough=0.5), _jr('frangc', rough=0.5)
    base = Vector((x, y, 0.0)); fork = Vector((x + 0.02, y, h * 0.45))
    objs.append(cyl('frtrunk', 0.045, (fork - base).length, (base + fork) / 2, (fork - base).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=8, r2=0.035, bevel=0.0))
    for k in range(4):
        a = k / 4 * math.tau + 0.4; tip = fork + Vector((math.cos(a) * 0.26, math.sin(a) * 0.2, h * 0.38 + rnd.uniform(-0.05, 0.08)))
        objs.append(cyl('frbranch', 0.026, (tip - fork).length, (fork + tip) / 2, (tip - fork).normalized().to_track_quat('Z', 'Y').to_euler(), m=bark, verts=6, r2=0.018, bevel=0.0))
        for j in range(6):                           # its tuft of long leaves
            aa = j / 6 * math.tau + k; d = Vector((math.cos(aa), math.sin(aa), 0.55)).normalized()
            objs.append(sphere('frleaf', 0.1, tuple(tip + d * 0.09), (0.32, 1.0, 0.06), tuple(d.to_track_quat('Y', 'Z').to_euler()), m=leaf[(j + k) % 2], ico=1))
        for j in range(4):                           # its flowers
            c = tip + Vector((rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), 0.06 + rnd.uniform(0, 0.03)))
            for pp in range(5):
                pa = pp / 5 * math.tau
                objs.append(sphere('frpetal', 0.018, (c.x + math.cos(pa) * 0.016, c.y + math.sin(pa) * 0.016, c.z), (1.0, 0.55, 0.3), (0, 0, pa), m=fl, seg=6, rings=4))
            objs.append(sphere('frheart', 0.009, tuple(c + Vector((0, 0, 0.005))), m=flc, seg=6, rings=4))


def banana_plant(objs, x, y, h=0.9):
    """A banana plant: a green stem of sheaths, big leaves arching out from its top, one hanging torn."""
    g, g2 = _jr('banana', rough=0.7), _jr('banana2', rough=0.7)
    objs.append(cyl('bstem', 0.05, h * 0.6, (x, y, h * 0.3), m=g2, verts=10, r2=0.035, bevel=0.0))
    for k in range(6):
        a = k / 6 * math.tau + 0.3; d = Vector((math.cos(a), math.sin(a), 0.9 - 0.25 * (k % 2))).normalized()
        c = Vector((x, y, h * 0.6)) + d * 0.22
        objs.append(sphere('bleaf', 0.24, tuple(c), (0.4, 1.0, 0.03), tuple(d.to_track_quat('Y', 'Z').to_euler()), m=g if k % 2 else g2, ico=2))


def _joglo_bits(r, name, t, J=None, seed=95, tree=(-0.98, 0.15), banana=(0.98, 0.42)):
    """What makes the Javanese house cosy (and stays on the Deluxe): a frangipani in flower by its left side, a banana plant at
    its back right, orchids in clay pots either side of the foot of the ramp, the automatic door's box and its solar panel on
    the roof's skirt, flat river stones to the gate."""
    random.seed(seed); objs = []; J_ = dict(JOGLO, **(J or {}))
    frangipani(objs, *tree, h=1.05, seed=seed); BLOCKS.setdefault(name, []).append([tree[0], round(-tree[1], 3), 0.14])
    banana_plant(objs, *banana); BLOCKS.setdefault(name, []).append([banana[0], round(-banana[1], 3), 0.14])
    potm = _jg('jar', rough=0.75, var=0.04); leaf = [_jr('leaf', rough=0.7), _jr('leaf2', rough=0.7)]; orch = [_jr('orchid', rough=0.5), _jr('orchid2', rough=0.5)]
    for j, (x, y) in enumerate(((-0.64, -0.98), (0.02, -0.98))):
        objs.append(cyl('opot', 0.07, 0.12, (x, y, 0.06), m=potm, verts=12, r2=0.055, bevel=0.006))
        for k in range(4):
            a = k / 4 * math.tau + j
            objs.append(sphere('oleaf', 0.06, (x + math.cos(a) * 0.04, y + math.sin(a) * 0.04, 0.13), (0.35, 1.0, 0.08), (0, 0.3, a), m=leaf[k % 2], ico=1))
        sp = Vector((x + 0.02, y, 0.13)); tip = sp + Vector((0.06 * (1 - 2 * j), 0.0, 0.2))
        objs.append(cyl('ostem', 0.004, (tip - sp).length, (sp + tip) / 2, (tip - sp).normalized().to_track_quat('Z', 'Y').to_euler(), m=leaf[1], verts=4, bevel=0.0))
        for k in range(5):                           # a spray of flowers down its arching stem
            c = sp.lerp(tip, 0.45 + k * 0.13) + Vector((0.015 * (k % 2), -0.02, -0.01 * k))
            objs.append(sphere('orchid', 0.022, tuple(c), (1.0, 0.4, 0.85), m=orch[(k + j) % 2], seg=8, rings=5))
        BLOCKS.setdefault(name, []).append([round(x, 3), round(-y, 3), 0.11])
    box_m = C('autobox', '#3f4a45', rough=0.5); led = C('autoled', '#7dff8a', rough=0.3, emission=('#5dff6e', 1.5))
    zb = J_['FL'] + POP_H + 0.065
    objs.append(box('autobox', (0.13, 0.05, 0.06), (-0.31, -D2 - 0.045, zb), m=box_m, bevel=0.008, segs=1))
    objs.append(sphere('autoled', 0.009, (-0.265, -D2 - 0.072, zb), m=led, seg=8, rings=4))
    OF = J_['front']; e0 = Vector((-0.42, -D2 - OF, J_['eave'])); e1 = Vector((-0.42, -0.28, J_['brk']))
    up = (e1 - e0).normalized(); nrm = Vector((1, 0, 0)).cross(up)
    if nrm.z < 0: nrm = -nrm
    c = e0.lerp(e1, 0.5) + nrm * 0.045
    objs.append(plank('solarframe', c - up * 0.08, c + up * 0.08, 0.22, 0.02, nrm, C('solarframe', '#b8bec2', rough=0.4, metal=0.6), jitter=0.0, bevel=0.004))
    cell = C('solarcell', '#24365c', rough=0.25, spec=0.6)
    for ii in range(2):
        for jj in range(3):
            cc = c + nrm * 0.012 + up * (-0.037 + ii * 0.074) + Vector((-0.07 + jj * 0.07, 0, 0))
            objs.append(plank('solarcell', cc - up * 0.032, cc + up * 0.032, 0.062, 0.008, nrm, cell, jitter=0.0, bevel=0.0))
    rv = [_jr('river', rough=0.8, var=0.08), _jg('stone', 2, rough=0.9, var=0.06)]
    gx, gy = _gate_of(t, 'aya'); a, b = Vector((-0.31, -1.06)), Vector((gx, gy + 0.3)); n = max(3, round((b - a).length / 0.22))
    for k in range(n + 1):
        q = a.lerp(b, k / n) + Vector((random.uniform(-0.04, 0.04), 0))
        objs.append(sphere('riverstone', 0.085, (q.x, q.y, 0.004), (1.25, 0.95, 0.12), (0, 0, random.uniform(0, 3)), m=random.choice(rv), ico=2, disp=0.12, seed=k + 720))
    _own(objs, r)
    return r


def cosy_aya():
    r = joglo(name='cosy_aya', pal=COSY_JG); _joglo_bits(r, 'cosy_aya', 3)
    return r


def deluxe_aya():
    """Deluxe: taller, cream walls, red posts with gold, a third tier of black-glazed tiles with gold hips, two gold-and-red
    ceremonial umbrellas at its front; the cosy touches."""
    r = joglo(name='deluxe_aya', J=DX_JOGLO, pal=DX_JG)
    random.seed(97); objs = []
    gold = C('jg_gold', JG['gold'], rough=0.35, metal=0.7); red = _jr('red', rough=0.5, var=0.04); pole = C('jg_teakd', JG['teakd'], rough=0.8)
    for sx in (-1, 1):                               # the umbrellas (payung): a pole, a red canopy with a gold fringe, a gold top
        x, y, h, R = sx * 0.92, -D2 - 0.3, 1.02, 0.2
        objs.append(cyl('ppole', 0.012, h, (x, y, h / 2), m=pole, verts=6, bevel=0.0))
        objs.append(cyl('pcanopy', R, 0.09, (x, y, h + 0.02), m=red, verts=16, r2=0.02, bevel=0.0))
        objs.append(cyl('pfringe', R + 0.01, 0.035, (x, y, h - 0.04), m=gold, verts=16, r2=R + 0.005, bevel=0.0))
        objs.append(sphere('ptop', 0.022, (x, y, h + 0.085), m=gold, seg=8, rings=5))
        objs.append(cyl('pbase', 0.05, 0.04, (x, y, 0.02), m=gold, verts=10, bevel=0.0))
        BLOCKS.setdefault('deluxe_aya', []).append([x, round(-y, 3), 0.1])
    _own(objs, r)
    _joglo_bits(r, 'deluxe_aya', 4, J=DX_JOGLO)
    r.name = 'deluxe_aya'
    return r


# ---- the Javanese House's gardens (its own): a coconut-shell bowl in the small pens, a brass one in the Cosy; Cosy: a swing
# between two teak posts under a little roof of clay tiles, a big round woven bamboo tray of sand, the cabbage from the arm of
# a post with a slit drum (a kentongan) hanging on it; Deluxe: a sand pit edged with carved stone like a temple's base, a
# padasan for water (a clay jar on a stand, a bamboo spout into a stone basin), a feeder like a tiny teak house with a black-
# and-gold roof, a little gamelan of bronze bars to peck, the swing, the post.
PENS_BY['aya'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(0.75, -1.32), dish=(-0.75, -1.45), bowl='coconut', hay=None, hay_rot=0, sack=None,
            straw=((0.0, -1.3, 0.25, 22), (-0.7, -0.95, 0.2, 14))),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(1.05, -1.25), dish=(-1.0, -1.48), bowl='coconut', hay=None, hay_rot=0, sack=None,
            straw=((0.35, -1.6, 0.3, 26), (-0.95, -1.0, 0.25, 20))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(1.5, -2.3), dish=(0.75, -2.3), bowl='brass', hay=(1.7, 0.45), hay_rot=90, sack=None,
            straw=((1.7, 0.45, 0.4, 35), (-0.6, -1.6, 0.35, 30), (0.6, -1.3, 0.3, 25))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(1.75, -2.45), feeder_style='joglo', dish=(-1.75, -1.85), water='padasan', hay=(2.0, 0.5), hay_rot=90,
            sack=None, pebbles=10, straw=((0.5, -1.4, 0.3, 25), (2.0, 0.5, 0.4, 35))),
}
# the Floating House's yards (its pond where a house stands: the feeder, the water, the hay and the straw in front of it or
# beside it, never in the water; the Snug's its own, the shared one has straw where the pond is); no play things in the yard:
# the ducks' toy is the beach ball on their pond (from the Cosy)
PENS_BY['call'] = {
    0: dict(box=PENS[0]['box'], gate=PENS[0]['gate'], feeder=(-0.72, -1.4), dish=(0.76, -1.45), hay=None, hay_rot=0, sack=None, straw=((0.2, -1.38, 0.2, 14),)),
    1: dict(box=PENS[1]['box'], gate=PENS[1]['gate'], feeder=(-1.0, -1.58), dish=(0.98, -1.6), hay=None, hay_rot=0, sack=None, straw=((0.3, -1.72, 0.25, 20),)),
    2: dict(box=(-1.6, 1.75, -2.45, 0.75), gate=3, feeder=(1.2, -1.5), dish=(0.25, -1.95), hay=(-1.1, -1.9), hay_rot=12, sack=(1.4, -2.15),
            straw=((-1.1, -1.9, 0.4, 60), (0.55, -1.55, 0.3, 30))),
    3: dict(box=PENS[3]['box'], gate=PENS[3]['gate'], feeder=(1.55, -2.2), dish=(-0.8, -2.35), hay=(-1.72, 0.45), hay_rot=90, sack=None,
            straw=((-1.72, 0.45, 0.4, 35), (0.7, -1.6, 0.35, 30))),
    4: dict(box=PENS[4]['box'], gate=PENS[4]['gate'], feeder=(-1.85, -2.0), dish=(1.55, -2.5), hay=(2.05, 0.55), hay_rot=90, sack=None, pebbles=10,
            straw=((0.6, -1.55, 0.3, 25), (2.05, 0.55, 0.4, 35))),
}
PLAY_BY['call'] = {}
PLAY_BY['aya'] = {3: dict(swing=(-1.4, -1.95), tampah=(1.35, -1.25), cabbage=(-1.2, -1.02), frame='joglo', holder='kentongan'),
                  4: dict(swing=(-1.65, -0.8), candi=(1.55, -1.15), cabbage=(0.9, -2.55), xylo=(-1.1, -2.6), frame='joglo', holder='kentongan', bars='gamelan')}
TAMPAH_R = 0.33                                                   # the Cosy Javanese house's woven tray of sand
CANDI_W, CANDI_D = 0.9, 0.7                                       # the Deluxe's stone-edged sand pit (x, y)


def joglo_swing(objs, x, y):
    """The Javanese house's swing: two teak posts, a bar across, a little roof of clay tiles over it with a gold tip."""
    teak2, teakd = _jg('teak2', var=0.08, grain=0.35, grain_scale=G), _jg('teakd', var=0.06)
    tile, tile2, ridge = _jg('tile', rough=0.7, var=0.1), _jg('tile2', rough=0.7, var=0.08), _jg('ridge', rough=0.7)
    for sx in (-1, 1):
        px = x + sx * (SWING_HALF + 0.05)
        objs.append(box('swpost', (0.05, 0.05, SWING_TOP + 0.1), (px, y, (SWING_TOP + 0.1) / 2), m=teak2, bevel=0.006, segs=1))
        objs.append(cyl('swpad', 0.045, 0.04, (px, y, 0.02), m=_jg('stone', 0, rough=0.9), verts=8, r2=0.035, bevel=0.0))
    objs.append(box('swbeam', (2 * SWING_HALF + 0.24, 0.06, 0.04), (x, y, SWING_TOP + 0.08), m=teakd, bevel=0.005, segs=1))
    objs.append(cyl('swbar', 0.022, 2 * SWING_HALF + 0.1, (x, y, SWING_TOP), (0, math.radians(90), 0), m=teakd, verts=10, bevel=0.0))
    W_, D_ = SWING_HALF + 0.16, 0.16
    hip_tier(objs, 'swroof', [(x - W_, y - D_), (x + W_, y - D_), (x + W_, y + D_), (x - W_, y + D_)], SWING_TOP + 0.1,
             [(x - 0.12, y), (x + 0.12, y), (x + 0.12, y), (x - 0.12, y)], SWING_TOP + 0.26, tile, tile2, 2, hip=ridge, spacing=0.09)
    objs.append(sphere('swtip', 0.018, (x, y, SWING_TOP + 0.29), m=_jg('gold', rough=0.35, metal=0.7), seg=8, rings=5))


def cabbage_kentongan(objs, x, y):
    """The Javanese house's way of hanging the cabbage: a teak post and arm, a kentongan (a slit drum of hollow log) hanging
    on the post's side."""
    teak2, teakd = _jg('teak2', var=0.08, grain=0.35, grain_scale=G), _jg('teakd', var=0.06)
    px, py = x, y + 0.28
    objs.append(box('cpost', (0.05, 0.05, CAB_TOP + 0.08), (px, py, (CAB_TOP + 0.08) / 2), m=teak2, bevel=0.008))
    objs.append(box('carm', (0.04, 0.32, 0.04), (px, py - 0.14, CAB_TOP), m=teakd, bevel=0.006))
    objs.append(box('cbrace', (0.03, 0.16, 0.03), (px, py - 0.06, CAB_TOP - 0.08), (math.radians(-40), 0, 0), m=teakd, bevel=0.005, segs=1))
    kx = px + 0.07
    objs.append(cyl('kentongan', 0.04, 0.26, (kx, py + 0.02, CAB_TOP - 0.17), m=_jg('teak', var=0.06, grain=0.3, grain_scale=G), verts=10, bevel=0.004))
    objs.append(box('kslit', (0.006, 0.02, 0.16), (kx + 0.04, py + 0.02, CAB_TOP - 0.17), m=C('hall_dark', '#1d1510', rough=1.0), bevel=0.0))
    objs.append(cyl('kcord', 0.004, 0.06, (kx, py + 0.02, CAB_TOP - 0.01), m=C('twinecord', '#74583a', rough=0.9), verts=4, bevel=0.0))
    objs.append(cyl('kpad', 0.06, 0.04, (px, py, 0.02), m=_jg('stone', 0, rough=0.9), verts=8, r2=0.045, bevel=0.0))


def sand_tampah(objs, x, y):
    """The Cosy Javanese house's sand bath: a big round tray of woven bamboo (a tampah) on the ground, full of sand."""
    bam, bam2 = _jr('bamboo', rough=0.6, var=0.05), _jr('bamboo2', rough=0.6, var=0.05)
    sand = mat('dtsand', '#e8d29f', rough=0.95, var=0.06, bump=0.3, bump_scale=200)
    R = TAMPAH_R
    objs.append(cyl('tbase', R, 0.025, (x, y, 0.0125), m=bam2, verts=28, bevel=0.0))
    for k, z in enumerate((0.03, 0.055)):
        bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=0.018, major_segments=32, minor_segments=6, location=(x, y, z))
        o = bpy.context.object; setmat(o, bam if k else bam2); objs.append(o)
    for k in range(16):                              # its weave showing round the rim
        a = k / 16 * math.tau
        objs.append(box('tweave', (0.05, 0.012, 0.04), (x + math.cos(a) * (R + 0.012), y + math.sin(a) * (R + 0.012), 0.042), (0, 0, a + math.pi / 2), m=bam if k % 2 else bam2, bevel=0.0))
    objs.append(sphere('tsand', R - 0.03, (x, y, 0.05), (1, 1, 0.12), m=sand, ico=3, disp=0.1, seed=730))
    for k in range(6):
        a = random.uniform(0, math.tau); d = random.uniform(R + 0.04, R + 0.12)
        objs.append(sphere('tspill', random.uniform(0.04, 0.06), (x + math.cos(a) * d, y + math.sin(a) * d, 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 731))


def sand_candi(objs, x, y):
    """The Deluxe Javanese house's sand bath: a sand pit edged with carved grey stone in two steps, like a temple's base, a
    little bell-shaped stone at each corner."""
    stones = [_jg('stone', i, rough=0.9, var=0.06) for i in range(3)]
    sand = mat('dsand', '#f0dca8', rough=0.95, var=0.05, bump=0.35, bump_scale=220); sand2 = mat('dsand2', '#e2c98e', rough=0.95, var=0.05)
    hw, hd = CANDI_W / 2, CANDI_D / 2
    for step, (inset, z0, h) in enumerate(((0.0, 0.0, 0.07), (0.05, 0.07, 0.06))):
        for (a, b) in (((x - hw + inset, y - hd + inset), (x + hw - inset, y - hd + inset)), ((x - hw + inset, y + hd - inset), (x + hw - inset, y + hd - inset))):
            L = b[0] - a[0]; n = max(3, round(L / 0.2))
            for k in range(n):
                objs.append(box('cstone', (L / n - 0.01, 0.08, h - 0.006), (a[0] + (k + 0.5) * L / n, a[1], z0 + h / 2), m=stones[(k + step) % 3], bevel=0.008, segs=1, jitter=0.002))
        for sx in (-1, 1):
            L = CANDI_D - 2 * inset - 0.08; n = max(2, round(L / 0.2))
            for k in range(n):
                objs.append(box('cstone', (0.08, L / n - 0.01, h - 0.006), (x + sx * (hw - inset), y - L / 2 + (k + 0.5) * L / n, z0 + h / 2), m=stones[(k + step + 1) % 3], bevel=0.008, segs=1, jitter=0.002))
    objs.append(box('csand', (CANDI_W - 0.2, CANDI_D - 0.2, 0.03), (x, y, 0.115), m=sand, bevel=0.01, segs=1))
    for k, (dx, dy, s_) in enumerate(((-0.15, 0.05, 0.1), (0.17, -0.06, 0.09))):
        objs.append(sphere('cmound', s_, (x + dx, y + dy, 0.125), (1.3, 1.0, 0.22), (0, 0, k), m=sand2 if k else sand, ico=2, disp=0.15, seed=k + 740))
    for sx in (-1, 1):
        for sy in (-1, 1):                           # a little stupa at each corner
            cx_, cy_ = x + sx * (hw - 0.02), y + sy * (hd - 0.02)
            objs.append(sphere('stupa', 0.045, (cx_, cy_, 0.16), (1, 1, 1.1), m=stones[2], seg=10, rings=6))
            objs.append(cyl('stupatop', 0.012, 0.06, (cx_, cy_, 0.23), m=stones[2], verts=6, r2=0.004, bevel=0.0))
    for k in range(5):
        a = random.uniform(0, math.tau)
        objs.append(sphere('cspill', random.uniform(0.04, 0.06), (x + math.cos(a) * (hw + 0.1), y + math.sin(a) * (hd + 0.1), 0.012), (1.4, 1, 0.12), (0, 0, a), m=sand, ico=2, disp=0.2, seed=k + 745))


def gamelan(objs, x, y):
    """A little gamelan (a saron) to peck at: bronze bars on a red case with gold edges, a wooden beater by it."""
    red = _jr('red', rough=0.5, var=0.04); gold = _jg('gold', rough=0.35, metal=0.7); bronze = C('bronze', '#c6a052', rough=0.3, metal=0.85, var=0.04)
    objs.append(box('scase', (0.3, 0.38, 0.08), (x, y, 0.04), m=red, bevel=0.01, segs=1))
    for sy in (-1, 1):
        objs.append(box('sedge', (0.31, 0.02, 0.02), (x, y + sy * 0.18, 0.082), m=gold, bevel=0.003, segs=1))
        objs.append(sphere('send', 0.04, (x, y + sy * 0.21, 0.07), (1.2, 0.6, 1.0), m=red, seg=10, rings=6))
    for k in range(6):
        yy = y - 0.13 + k * 0.052; L = 0.26 - k * 0.02
        objs.append(box('xbar', (L, 0.042, 0.014), (x, yy, 0.096), m=bronze, bevel=0.004, segs=1))
        for sx in (-1, 1):
            objs.append(sphere('xpin', 0.006, (x + sx * (L / 2 - 0.02), yy, 0.105), m=gold, seg=6, rings=4))
    objs.append(cyl('xmallet', 0.007, 0.16, (x + 0.08, y + 0.24, 0.015), (math.radians(90), 0, math.radians(30)), m=_jg('teakd', var=0.06), verts=6, bevel=0.0))
    objs.append(cyl('xmhead', 0.02, 0.04, (x + 0.12, y + 0.3, 0.02), (0, math.radians(90), math.radians(30)), m=_jg('teak', var=0.06), verts=8, bevel=0.0))
