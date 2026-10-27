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


def red_barn(**kw):
    """The Red Barn (coop.build) with its nests inside, behind a window right of the barn door (kw: coop.build's eave,
    peak and roof, for the two-storey Deluxe)."""
    wx, FL = 0.445, 0.40
    r = coop.build((0, 0, 0), 0.0, seed=5, pen=False, window=(wx - WIN_W / 2, wx + WIN_W / 2, FL + 0.05, FL + 0.05 + WIN_H), **kw)
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
    """A look's pen (t: 0..4; 2 is the Snug pen, the farm's own layout) for breed k's coop."""
    import farm_layout
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


def _cosy_bits(r, name, t, seed=35, porch=True, eave=1.02, peak=1.46, box_z=0.98):
    """What makes the barn cosy: sage trim, a porch with a bench and a lantern on its left side (not on the two-storey
    Deluxe), a window box (at box_z) on the right gable, a lantern by the hens' door, the automatic door's box over it and
    its little solar panel on the roof (Audrey, 27 Oct: "starting at cosy the coop door are automatic"), flower pots,
    stepping stones."""
    random.seed(seed)
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
    e0 = Vector((0, -(D2 + 0.16), eave - 0.06)); r0 = Vector((0, 0, peak + 0.02)); dn = (e0 - r0).normalized()
    nrm = Vector((0, -(peak - eave + 0.08), D2 + 0.16)).normalized()
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
    _cosy_bits(r, 'deluxe_rir', 4, porch=False, eave=EAVE, peak=PEAK, box_z=1.1)
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
    swing_frame(objs, *P['swing'], rustic=P.get('rustic', False))
    (cabbage_tripod if P.get('tripod') else cabbage_post)(objs, *P['cabbage'])
    if 'tub' in P: dust_tub(objs, *P['tub'])
    if 'tinbath' in P: tin_bath(objs, *P['tinbath'])
    if 'pit' in P: sand_pit(objs, *P['pit'])
    if 'dust' in P: dust_bath(objs, *P['dust'])
    if 'ladder' in P: ladder(objs, *P['ladder'])
    if 'xylo' in P: xylophone(objs, *P['xylo'])


def play_info(t, k='rir'):
    """For the browser (glTF axes: x, z = Blender x, -y): each play thing's place, and the spots the birds keep clear of."""
    P = PLAY_BY[k].get(t)
    if not P: return None
    g = lambda q: [q[0], round(-q[1], 3)]
    if 'tub' in P: dust = dict(at=g(P['tub']), r=0.235, y=0.075)
    elif 'pit' in P: dust = dict(at=g(P['pit']), r=PIT_R, y=0.085)
    elif 'tinbath' in P: dust = dict(at=g(P['tinbath']), w=TIN_W, d=TIN_D, y=0.105)
    else: dust = dict(at=g(P['dust']), w=SAND_W, d=SAND_D, y=0.105)
    out = dict(swing=dict(at=g(P['swing']), top=SWING_TOP, perch=SWING_PERCH, half=SWING_HALF), dust=dust,
               cabbage=dict(at=g(P['cabbage']), top=CAB_TOP, z=CAB_Z))
    if 'ladder' in P: out['ladder'] = dict(at=g(P['ladder']), perches=[[round(-dy, 3), z] for (dy, z) in LADDER])
    if 'xylo' in P: out['xylo'] = dict(at=g(P['xylo']), bars=[round(0.13 - k * 0.052, 3) for k in range(6)])
    if 'tub' in P: sand = [g(P['tub']) + [0.29]]
    elif 'pit' in P: sand = [g(P['pit']) + [PIT_R + 0.07]]
    elif 'tinbath' in P: sand = [g((P['tinbath'][0] + sx * (TIN_W - TIN_D) / 2, P['tinbath'][1])) + [TIN_D / 2 + 0.08] for sx in (-1, 1)]
    else: dx, dy = P['dust']; sand = [g((dx - 0.22, dy)) + [0.42], g((dx + 0.22, dy)) + [0.42]]
    cx, cy = P['cabbage']
    holder = [[round(cx + lx, 3), round(-(cy + ly), 3), 0.06] for (lx, ly) in TRIPOD] if P.get('tripod') else [[cx, round(-(cy + 0.28), 3), 0.08]]
    keep = [g(P['swing']) + [0.38], *sand, g(P['cabbage']) + [0.13], *holder]
    if 'ladder' in P: keep.append(g(P['ladder']) + [0.38])
    if 'xylo' in P: keep.append(g(P['xylo']) + [0.2])
    out['keep'] = keep
    return out


def pen_tier(t, bk='rir'):
    """A look's yard and what's in it (pen_t0, pen_t1, pen_t3, pen_t4; another breed's: pen_t3_orp...): the dirt pad, feeder,
    water, hay, sack, straw; in the smallest pens a tin basin (an enamel one) for water and no hay; in the bigger ones grass
    round the edges."""
    L = pen_layout(t, bk); keep = coop.PEN; coop.PEN = L
    try: root = pen_base()
    finally: coop.PEN = keep
    random.seed(40 + t + (0 if bk == 'rir' else 7 * len(bk) + ord(bk[0])))
    if L.get('bowl') == 'enamel':
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
        return dict(min=[x0, round(-y1, 3)], max=[x1, round(-y0, 3)], gate=round(gc, 3), feeder=[P['feeder'][0], -P['feeder'][1]], dish=[P['dish'][0], -P['dish'][1]], dish_r=0.36 if P.get('fountain') or P.get('water') == 'trough' else 0.22,
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
