"""The show ground for the 3D game's poultry shows (release 1 step 9, Audrey chose a "show day on the farm"): a white marquee
open along its front (two peaks with pennants, a scalloped valance with a red trim, guy ropes and pegs, bunting along the
front), a trestle table inside under a green cloth with six show pens in a row (white boards, wire fronts and tops, straw
floors, a little card on each), the judge's table (his clipboard, the rosette box, a cup of tea), a blank sign board on two
posts (its words are drawn by the browser, in English or French), and the rosettes (1st red, 2nd blue, 3rd yellow, the
champion's red, white and blue with longer tails), each hung from its pin.
Built facing -Y, which is glTF's +Z (the browser turns it to face the player, as the decorations); metres. Each part is
built by its own function into an empty scene (export_showground.py bakes them); places() gives where things go, in glTF
axes (x, up, z towards the player)."""
import math, random
import bpy, bmesh
from mathutils import Vector, Matrix, noise
from common import mat, box, cyl, sphere, empty, link, setmat, subsurf

# ------------------------------------------------------------------ sizes
HW, FRONT, BACK = 2.2, -1.15, 1.15            # the marquee: 4.4 m wide, 2.3 m deep
EAVE, PEAK, SAG = 2.35, 3.2, 2.98              # its walls' tops, its two peaks, the dip of the ridge between them
PEAKS = (-1.1, 1.1)
NPEN, PW, PT, PD, PH = 6, 0.6, 0.03, 0.95, 0.8  # six pens: inside 0.6 wide, 0.95 deep, 0.8 high (a Light Brahma rooster stands 0.71)
PITCH = PW + PT
ROW = NPEN * PITCH + PT                        # the row of pens, end to end
PF = FRONT + 0.38                              # the pens' fronts (close to the open side, so the birds show from the game's view)
TABLE = 0.74                                   # the table's top, under its cloth
BASE = 0.025                                   # the pens' base boards
FLOOR = TABLE + BASE + 0.018                   # where a bird stands, on the straw
TOP = TABLE + BASE + PH                        # the pens' tops
SIGN = (-2.95, -1.75)                          # the sign board (x, y): in front, to the left of the marquee
JT = (2.85, -1.7)                              # the judge's table: in front, to the right

COL = dict(canvas='#f7f5ee', seam='#d8d0bc', trim='#c8372d', pole='#94693f', rope='#e3d8bd', peg='#a07245', baize='#3d6b48',
           penwhite='#f2efe6', wire='#b3b9bf', straw='#ebcf78', straw2='#c99a3e', signface='#fbf6e7', signframe='#3d6b48',
           wood='#b88d5c', cloth='#f7f4ec', box='#a8794a', card='#fbfaf4', gold='#efbf45', tea='#f6f3ec', teafill='#9a6235',
           red='#d0342c', blue='#2f62b8', yellow='#f2c230', white='#f8f6f0')
FLAGS = ['#d8433a', '#f2c14e', '#3f7fc4', '#5aa65a', '#f4f1e8']
_M = {}


def M(key, rough=0.85):
    if key not in _M: _M[key] = mat('sg_' + key, COL.get(key, key), rough=rough, spec=0.2)
    return _M[key]


def flag_mat(c):
    k = 'flag' + c
    if k not in _M: _M[k] = mat('sg_flag_' + c.lstrip('#'), c, rough=0.7, sheen=0.2)
    return _M[k]


def mesh_obj(name, verts, faces, m, mats=None, smooth=False, solid=0.0):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    o = link(bpy.data.objects.new(name, me))
    if mats:
        for mm in mats: o.data.materials.append(mm)
    else: setmat(o, m)
    for p in o.data.polygons: p.use_smooth = smooth
    if solid:
        s = o.modifiers.new('s', 'SOLIDIFY'); s.thickness = solid; s.offset = 0
    return o


def rod(name, a, b, r, m, sides=6):
    """A thin round rod from a to b (ropes, wires, poles)."""
    a, b = Vector(a), Vector(b); d = b - a
    o = cyl(name, r, d.length, tuple((a + b) / 2), (0, 0, 0), m, verts=sides, bevel=0.0)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.normalized().to_track_quat('Z', 'Y')
    for md in list(o.modifiers): o.modifiers.remove(md)
    return o


def curve(name, pts, depth, m, res=0):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = depth; cu.bevel_resolution = res; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], p[2], 1.0)
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(m)
    return o


# ------------------------------------------------------------------ the marquee
def roof_h(x, y):
    """The roof's height: two peaks on a ridge along x that dips between them, sloping to the walls on every side (the
    canvas slightly hollow, as it hangs)."""
    sy = abs(y) / BACK
    ex = max(0.0, (abs(x) - abs(PEAKS[1])) / (HW - abs(PEAKS[1])))
    ridge = SAG + (PEAK - SAG) * math.exp(-((abs(x) - abs(PEAKS[1])) / 0.42) ** 2)
    t = min(1.0, max(sy, ex))
    return EAVE + (ridge - EAVE) * (1 - t) ** 1.18


def roof():
    nx, ny, ox, oy = 56, 28, 0.035, 0.035          # (the canvas runs a little past the walls)
    xs = [-(HW + ox) + 2 * (HW + ox) * i / nx for i in range(nx + 1)]
    ys = [-(BACK + oy) + 2 * (BACK + oy) * j / ny for j in range(ny + 1)]
    V = []
    for y in ys:
        for x in xs: V.append((x, y, roof_h(max(-HW, min(HW, x)), max(-BACK, min(BACK, y))) - (0.012 if abs(x) > HW or abs(y) > BACK else 0)))
    F = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i; F.append((a, a + 1, a + nx + 2, a + nx + 1))
    o = mesh_obj('roof', V, F, M('canvas'), smooth=True)
    # seams: from the ridge down to the eaves across the middle, and from each peak to the corners and the ends' middles
    def on_roof(x, y): return Vector((x, y, roof_h(x, y) + 0.01))
    lines = []
    for x in (-0.55, 0.0, 0.55, -1.65, 1.65):
        for sy in (-1, 1):
            if abs(x) > 1.6: continue
            lines.append([(x, sy * BACK * k / 10) for k in range(11)])
    for px in PEAKS:
        s = 1 if px > 0 else -1
        for ty in (-BACK, 0.0, BACK):
            lines.append([(px + (s * HW - px) * k / 10, ty * k / 10) for k in range(11)])
        for sy in (-1, 1):
            lines.append([(px, sy * BACK * k / 10) for k in range(11)])
    for i, L in enumerate(lines): curve('seam', [on_roof(x, y) for x, y in L], 0.012, M('seam'))
    # the peaks: a little pole through each, a gold ball and a pennant
    for i, px in enumerate(PEAKS):
        rod('finial', (px, 0, PEAK - 0.05), (px, 0, PEAK + 0.42), 0.022, M('pole'), 8)
        sphere('knob', 0.042, (px, 0, PEAK + 0.44), m=M('gold', 0.4), seg=10, rings=6)
        c = FLAGS[2] if px < 0 else FLAGS[0]
        V = [(px, 0, PEAK + 0.38), (px, 0, PEAK + 0.2), (px + 0.36, -0.02, PEAK + 0.27)]
        mesh_obj('pennant', V, [(0, 1, 2)], flag_mat(c), solid=0.008)
    return o


def valance(a, b, out):
    """A scalloped valance along the eaves from a to b (2-D), just outside the wall (out: which way is outside): canvas with
    a red trim along its scallops."""
    a, b, out = Vector(a), Vector(b), Vector(out)
    L = (b - a).length; n = max(2, round(L / 0.28)); cols = 6
    V, F, mi = [], [], []
    top, drop, dip = EAVE + 0.035, 0.07, 0.1
    pts = []
    for k in range(n * cols + 1):
        u = k / (n * cols); f = (k % cols) / cols if k < n * cols else 0.0
        p = a.lerp(b, u) + out * 0.04
        bot = EAVE - drop - dip * math.sin(math.pi * f)
        pts.append((p, bot))
    for p, bot in pts:
        V += [(p.x, p.y, top), (p.x, p.y, bot + 0.035), (p.x, p.y, bot)]
    for k in range(len(pts) - 1):
        i = 3 * k
        F.append((i, i + 3, i + 4, i + 1)); mi.append(0)
        F.append((i + 1, i + 4, i + 5, i + 2)); mi.append(1)
    o = mesh_obj('valance', V, F, None, mats=[M('canvas'), M('trim', 0.6)], solid=0.012)
    for p, m_ in zip(o.data.polygons, mi): p.material_index = m_
    return o


def wall(a, b, name='wall'):
    a, b = Vector(a), Vector(b)
    V = [(a.x, a.y, 0.0), (b.x, b.y, 0.0), (b.x, b.y, EAVE), (a.x, a.y, EAVE)]
    return mesh_obj(name, V, [(0, 1, 2, 3)], M('canvas'), solid=0.014)


def guy(top, peg):
    top, peg = Vector(top), Vector(peg)
    rod('rope', top, peg + Vector((0, 0, 0.07)), 0.0065, M('rope'), 5)
    d = (top - peg).normalized()
    o = box('peg', (0.035, 0.035, 0.16), tuple(peg + Vector((0, 0, 0.03))), (0, 0, 0), M('peg'), bevel=0.006, segs=1)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((-d.x, -d.y, 2.2)).normalized().to_track_quat('Z', 'Y')
    r = peg + Vector((0, 0, 0.07)) + (top - peg - Vector((0, 0, 0.07))) * 0.16
    o = box('runner', (0.024, 0.02, 0.075), tuple(r), (0, 0, 0), M('peg'), bevel=0.005, segs=1)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = d.to_track_quat('Z', 'Y')


# the guy ropes: (from the top of a pole, to its peg). The front corners' run out sideways and back, clear of the open front
# (where the judge walks, the sign and his table stand)
GUYS = [((s * HW, FRONT, EAVE), (s * (HW + 0.9), FRONT + 0.62, 0)) for s in (-1, 1)] + \
       [((s * HW, 0.25, EAVE), (s * (HW + 1.0), 0.45, 0)) for s in (-1, 1)] + \
       [((s * HW, BACK, EAVE), (s * (HW + 0.75), BACK + 0.75, 0)) for s in (-1, 1)] + \
       [((x, BACK, EAVE), (x, BACK + 0.95, 0)) for x in (-1.1, 1.1)]


def bunting(a, b, sag, n, seed=3):
    """A string of little flags from a to b, dipping in the middle."""
    a, b = Vector(a), Vector(b); rnd = random.Random(seed)
    def at(u): return a.lerp(b, u) - Vector((0, 0, sag * 4 * u * (1 - u)))
    curve('string', [at(k / 24) for k in range(25)], 0.004, M('rope'))
    for i in range(n):
        u0, u1 = (i + 0.12) / n, (i + 0.88) / n; p0, p1 = at(u0), at(u1); mid = (p0 + p1) / 2
        tip = mid + Vector((0, -0.012 + rnd.uniform(-0.01, 0.01), -0.15))
        mesh_obj('flag', [p0 - Vector((0, 0.004, 0)), p1 - Vector((0, 0.004, 0)), tip], [(0, 2, 1)], flag_mat(FLAGS[i % len(FLAGS)]), solid=0.006)


def tent():
    roof()
    valance((-HW - 0.035, FRONT), (HW + 0.035, FRONT), (0, -1))
    valance((HW, FRONT - 0.035), (HW, BACK + 0.035), (1, 0))
    valance((-HW, FRONT - 0.035), (-HW, BACK + 0.035), (-1, 0))
    valance((-HW - 0.035, BACK), (HW + 0.035, BACK), (0, 1))
    wall((-HW, FRONT), (-HW, BACK)); wall((HW, FRONT), (HW, BACK)); wall((-HW, BACK), (HW, BACK))
    # the poles: at the open front's corners (and along the walls, where they hold the canvas out)
    for s in (-1, 1):
        rod('pole', (s * HW, FRONT, 0), (s * HW, FRONT, EAVE + 0.08), 0.04, M('pole'), 10)
        sphere('poleknob', 0.05, (s * HW, FRONT, EAVE + 0.1), m=M('pole'), seg=10, rings=6)
        for y in (0.0, BACK): rod('pole', (s * HW, y, EAVE - 0.05), (s * HW, y, EAVE + 0.08), 0.035, M('pole'), 8)
        # the front canvas rolled up under the valance and tied
        rod('roll', (s * (HW - 0.02), FRONT + 0.03, EAVE - 0.06), (s * 0.02, FRONT + 0.03, EAVE - 0.06), 0.05, M('canvas'), 10)
    for g in GUYS: guy(*g)
    bunting((-HW, FRONT - 0.07, EAVE + 0.02), (HW, FRONT - 0.07, EAVE + 0.02), 0.06, 22)


# ------------------------------------------------------------------ the table and the six pens
def pen_x(i): return (i - (NPEN - 1) / 2) * PITCH


def pens():
    y0, y1 = PF - 0.014, PF + PD + 0.09                              # (the pens' fronts at the table's front edge)
    box('tabletop', (ROW + 0.16, y1 - y0, 0.04), (0, (y0 + y1) / 2, TABLE - 0.02), (0, 0, 0), M('baize'), bevel=0.012, segs=1)
    # the cloth's skirt: pleated along the front, plain at the ends
    V, F = [], []
    n = 64; xa, xb = -(ROW + 0.16) / 2, (ROW + 0.16) / 2
    for k in range(n + 1):
        x = xa + (xb - xa) * k / n; y = y0 - 0.008 - (0.012 if k % 2 else 0.0)
        V += [(x, y, 0.035), (x, y, TABLE)]
    for k in range(n): F.append((2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1))
    mesh_obj('skirt', V, F, M('baize'), solid=0.006)
    for s in (-1, 1): box('skirtend', (0.01, y1 - y0, TABLE - 0.035), (s * (ROW + 0.17) / 2, (y0 + y1) / 2, (TABLE + 0.035) / 2), (0, 0, 0), M('baize'), bevel=0.0)
    # the row of pens: base, back, side boards (white), a kick board and a top rail along the front
    z0 = TABLE + BASE
    box('penbase', (ROW, PD + 0.04, BASE), (0, PF + PD / 2, TABLE + BASE / 2), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    box('penback', (ROW, 0.02, PH), (0, PF + PD + 0.01, z0 + PH / 2), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    for i in range(NPEN + 1):
        x = (i - NPEN / 2) * PITCH
        box('penside', (PT, PD + 0.02, PH), (x, PF + PD / 2, z0 + PH / 2), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    box('kick', (ROW, 0.022, 0.07), (0, PF, z0 + 0.035), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    box('toprail', (ROW, 0.035, 0.035), (0, PF, TOP - 0.0175), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    box('backrail', (ROW, 0.035, 0.03), (0, PF + PD, TOP + 0.005), (0, 0, 0), M('penwhite'), bevel=0.006, segs=1)
    rnd = random.Random(7)
    for i in range(NPEN):
        cx = pen_x(i)
        for k in range(5):                                         # the wire front
            x = cx + (k - 2) * 0.12
            rod('bar', (x, PF, z0 + 0.07), (x, PF, TOP - 0.035), 0.0055, M('wire', 0.5), 6)
        for k in (-1, 0, 1):                                       # the wire top
            x = cx + k * 0.16
            rod('topbar', (x, PF, TOP - 0.01), (x, PF + PD, TOP - 0.01), 0.005, M('wire', 0.5), 6)
        rod('crossbar', (cx - PW / 2, PF + PD / 2, TOP - 0.008), (cx + PW / 2, PF + PD / 2, TOP - 0.008), 0.005, M('wire', 0.5), 6)
        # the straw: a bumpy layer, and a few loose straws
        nx, ny = 6, 9; V, F = [], []
        for j in range(ny + 1):
            for k in range(nx + 1):
                x = cx - PW / 2 + PW * k / nx; y = PF + 0.012 + (PD - 0.024) * j / ny
                edge = k in (0, nx) or j in (0, ny)
                h = 0.004 if edge else 0.012 + 0.012 * noise.noise(Vector((x * 9 + i * 3.1, y * 9, 0.5)))
                V.append((x, y, z0 + h))
        for j in range(ny):
            for k in range(nx):
                a = j * (nx + 1) + k; F.append((a, a + 1, a + nx + 2, a + nx + 1))
        mesh_obj('straw', V, F, M('straw'), smooth=True)
        for k in range(16):
            x = cx + rnd.uniform(-0.26, 0.26); y = PF + rnd.uniform(0.05, PD - 0.05); a = rnd.uniform(0, math.pi)
            L = rnd.uniform(0.07, 0.13)
            o = box('straws', (L, 0.006, 0.004), (x, y, z0 + 0.022), (rnd.uniform(-0.3, 0.3), 0, a), M('straw2' if k % 2 else 'straw'), bevel=0.0)
        # the pen's card (its number), hung on the top rail at the right
        box('card', (0.08, 0.006, 0.055), (cx + PW / 2 - 0.07, PF - 0.021, TOP - 0.055), (0, 0, 0), M('card', 0.7), bevel=0.0)
        rod('cardstring', (cx + PW / 2 - 0.07, PF - 0.022, TOP - 0.03), (cx + PW / 2 - 0.07, PF - 0.022, TOP - 0.006), 0.0025, M('rope'), 4)


# ------------------------------------------------------------------ the sign board and the judge's table
SIGN_Z, SIGN_W, SIGN_H = 1.38, 1.16, 0.66


def sign_rect():
    """The sign's face, where its words go (inside its green frame)."""
    return dict(centre=(SIGN[0], SIGN[1] - 0.0285, SIGN_Z), w=SIGN_W - 0.1, h=SIGN_H - 0.1)


def sign():
    sx, sy = SIGN; zc = SIGN_Z; w, h = SIGN_W, SIGN_H
    for s in (-1, 1):
        box('signpost', (0.075, 0.075, zc + h / 2 + 0.05), (sx + s * (w / 2 - 0.08), sy + 0.02, (zc + h / 2 + 0.05) / 2), (0, 0, 0), M('pole'), bevel=0.01, segs=1)
        sphere('postknob', 0.045, (sx + s * (w / 2 - 0.08), sy + 0.02, zc + h / 2 + 0.08), m=M('pole'), seg=10, rings=6)
    box('signback', (w, 0.04, h), (sx, sy, zc), (0, 0, 0), M('signframe'), bevel=0.012, segs=1)
    box('signface', (w - 0.1, 0.012, h - 0.1), (sx, sy - 0.022, zc), (0, 0, 0), M('signface', 0.75), bevel=0.0)
    # a little gabled roof over it (two planks meeting at a ridge along the top)
    ridge = zc + h / 2 + 0.1
    for s in (-1, 1):
        box('signroof', (w + 0.14, 0.15, 0.022), (sx, sy + s * 0.064, ridge - 0.037), (math.radians(-s * 30), 0, 0), M('signframe'), bevel=0.005, segs=1)
    return sign_rect()


def judge_table():
    tx, ty = JT; top = 0.7
    box('jtop', (0.74, 0.48, 0.03), (tx, ty, top - 0.015), (0, 0, 0), M('wood', 0.6), bevel=0.008, segs=1)
    box('jcloth', (0.62, 0.36, 0.006), (tx, ty, top + 0.003), (0, 0, math.radians(4)), M('cloth'), bevel=0.0)
    for sx in (-1, 1):                                             # folding legs: a cross at each end
        for s in (-1, 1):
            rod('jleg', (tx + sx * 0.31, ty + s * 0.2, 0.0), (tx + sx * 0.31, ty - s * 0.2, top - 0.03), 0.016, M('wood', 0.6), 6)
    # the rosette box: an open wooden tray with the rosettes in it, standing on their edges
    bx, by = tx - 0.13, ty - 0.02
    box('rbox', (0.28, 0.2, 0.012), (bx, by, top + 0.012), (0, 0, 0), M('box', 0.6), bevel=0.003, segs=1)
    for (dx, dy, sx_, sy_) in ((0, -0.095, 0.28, 0.012), (0, 0.095, 0.28, 0.012), (-0.135, 0, 0.012, 0.2), (0.135, 0, 0.012, 0.2)):
        box('rboxside', (sx_, sy_, 0.07), (bx + dx, by + dy, top + 0.04), (0, 0, 0), M('box', 0.6), bevel=0.003, segs=1)
    for k, c in enumerate(('red', 'blue', 'yellow', 'red')):          # (standing in a row, leaning back a little)
        x = bx - 0.093 + k * 0.062
        o = cyl('rdisc', 0.03, 0.014, (x, by + 0.01, top + 0.05), (math.radians(72), 0, 0), M(c, 0.55), verts=12, bevel=0.0)
        cyl('rdot', 0.012, 0.018, (x, by + 0.008, top + 0.05), (math.radians(72), 0, 0), M('gold', 0.45), verts=10, bevel=0.0)
    # a cup of tea on its saucer
    cx_, cy_ = tx + 0.22, ty + 0.1
    cyl('saucer', 0.06, 0.008, (cx_, cy_, top + 0.01), (0, 0, 0), M('tea', 0.4), verts=14, bevel=0.0)
    cyl('cup', 0.035, 0.055, (cx_, cy_, top + 0.042), (0, 0, 0), M('tea', 0.4), verts=14, r2=0.042, bevel=0.0)
    cyl('teafill', 0.04, 0.004, (cx_, cy_, top + 0.066), (0, 0, 0), M('teafill', 0.3), verts=14, bevel=0.0)
    rod('handle', (cx_ + 0.04, cy_, top + 0.05), (cx_ + 0.06, cy_, top + 0.035), 0.007, M('tea', 0.4), 5)
    return dict(top=top, at=(tx, ty))


def clipboard():
    """The judge's clipboard lying on his table (hidden while he carries his own)."""
    tx, ty = JT; top = 0.7; x, y = tx + 0.14, ty - 0.04; a = math.radians(-14)
    box('jboard', (0.22, 0.29, 0.008), (x, y, top + 0.01), (0, 0, a), M('box', 0.6), bevel=0.003, segs=1)
    box('jpaper', (0.19, 0.24, 0.003), (x + 0.004, y - 0.012, top + 0.0155), (0, 0, a), M('card', 0.8), bevel=0.0)
    box('jclip', (0.08, 0.03, 0.012), (x - 0.03, y + 0.125, top + 0.018), (0, 0, a), M('wire', 0.4), bevel=0.003, segs=1)


# ------------------------------------------------------------------ the rosettes
ROSETTES = {
    'first': dict(rings=[('red', 0.085)], tails=['red', 'red'], tail=0.17),
    'second': dict(rings=[('blue', 0.085)], tails=['blue', 'blue'], tail=0.17),
    'third': dict(rings=[('yellow', 0.085)], tails=['yellow', 'yellow'], tail=0.17),
    'champion': dict(rings=[('red', 0.112), ('white', 0.087), ('blue', 0.064)], tails=['red', 'white', 'blue'], tail=0.27),
}
ROS_DROP = 0.045                                 # how far below its pin a rosette's middle hangs


def rosette(kind):
    """A pleated rosette: rings of ruffled ribbon, a gold button in the middle, ribbon tails with notched ends. Its origin is
    the pin (at the top of its back), its face towards -Y; it hangs below the pin."""
    R = ROSETTES[kind]; c = Vector((0, -0.006, -ROS_DROP))
    rout = R['rings'][0][1]
    # tails first (behind the rings)
    nt = len(R['tails'])
    for k, col in enumerate(R['tails']):
        ang = math.radians((k - (nt - 1) / 2) * (22 if nt > 2 else 26)); L = R['tail']; w = 0.034 if nt < 3 else 0.03
        d = Vector((math.sin(ang), 0, -math.cos(ang))); side = Vector((math.cos(ang), 0, math.sin(ang)))
        p0 = c + d * (rout * 0.35) + Vector((0, 0.004 + 0.001 * k, 0)); p1 = c + d * (rout * 0.35 + L)
        notch = p1 - d * 0.03
        V = [p0 - side * w / 2, p0 + side * w / 2, p1 + side * w / 2 - Vector((0, 0.01, 0)), notch - Vector((0, 0.01, 0)), p1 - side * w / 2 - Vector((0, 0.01, 0))]
        mesh_obj('tail', V, [(0, 1, 2, 3), (0, 3, 4)], M(col, 0.6), solid=0.003)
    for ri, (col, r) in enumerate(R['rings']):
        n = 14 if r < 0.08 else 18; rin = r * 0.42 if ri == 0 else r * 0.55
        y = -0.004 * ri
        V = []
        for k in range(2 * n):
            a = k / (2 * n) * math.tau; ws = 0.007 if k % 2 else -0.004
            V.append((c.x + math.cos(a) * rin, c.y + y - 0.006, c.z + math.sin(a) * rin))
            V.append((c.x + math.cos(a) * r, c.y + y + ws, c.z + math.sin(a) * r))
        F = []
        for k in range(2 * n):
            i, j = 2 * k, 2 * ((k + 1) % (2 * n)); F.append((i, i + 1, j + 1, j))          # (facing -Y, the front)
        o = mesh_obj('ring', V, F, M(col, 0.6))
        if ri == 0:                                                # a plain back
            V2 = [(c.x + math.cos(k / n * math.tau) * r * 0.98, c.y + 0.004, c.z + math.sin(k / n * math.tau) * r * 0.98) for k in range(n)] + [(c.x, c.y + 0.004, c.z)]
            mesh_obj('back', V2, [(n, (k + 1) % n, k) for k in range(n)], M(col, 0.6))
    b = sphere('button', 1.0, tuple(c + Vector((0, -0.014 - 0.004 * len(R['rings']), 0))), (rout * 0.4, 0.012, rout * 0.4), m=M('gold', 0.45), seg=12, rings=5)
    rod('pin', (0, 0.002, 0.004), (0, 0.002, -0.03), 0.0025, M('wire', 0.4), 4)
    return dict(drop=ROS_DROP, r=rout, tail=R['tail'])


# ------------------------------------------------------------------ where things go (glTF axes: x, up, z towards the player)
def gl(x, y, z): return [round(x, 4), round(z, 4), round(-y, 4)]


def places(sign_rect):
    P = []
    for i in range(NPEN):
        cx = pen_x(i)
        P.append(dict(
            x=round(cx, 4), front=round(-PF, 4),                    # the pen's middle across, its front (z)
            bird=gl(cx, PF + 0.4, FLOOR), birdYaw=round(math.radians(14), 3),          # where a bird stands, turned a little to the right
            room=[round(PW, 3), round(PD, 3), round(PH, 3)],
            pin=gl(cx, PF - 0.046, TABLE + BASE + 0.062),                              # a rosette's pin: on the front's bottom rail, in the middle (it hangs over the table's cloth)
            card=gl(cx + PW / 2 - 0.07, PF - 0.0245, TOP - 0.055),
            judge=[round(cx + 0.36, 3), round(-PF + 0.46, 3)], judgeYaw=round(math.atan2(-0.36, -0.86), 3),     # beside it, peering in
            pinAt=[round(cx - 0.24, 3), round(-PF + 0.54, 3)], pinYaw=round(math.pi, 3),                          # facing it, his right hand (judge_pin) at its pin
            farmer=[round(cx, 3), round(-PF + 0.5, 3)], farmerYaw=round(math.pi, 3),  # in front of it, facing it, to put a bird in
            door=gl(cx, PF, (FLOOR + TOP) / 2)))
    sc = sign_rect['centre']
    return dict(
        pens=P, floor=round(FLOOR, 4), top=round(TOP, 4),
        eave=EAVE, peak=PEAK, valance=round(EAVE - 0.17, 3),
        tent=[-HW, -BACK, HW, -FRONT],                              # the marquee's walls and roof (x0, z0, x1, z1)
        table=[round(-(ROW + 0.17) / 2, 3), round(-(PF + PD + 0.09), 3), round((ROW + 0.17) / 2, 3), round(-(PF - 0.022), 3)],
        aisle=[-2.05, round(-PF + 0.18, 3), 2.05, round(-PF + 0.95, 3)],         # the open strip in front of the pens
        entrance=[0.0, round(-FRONT + 0.75, 3)],
        sign=dict(centre=gl(*sc), w=round(sign_rect['w'], 3), h=round(sign_rect['h'], 3), normal=[0, 0, 1]),
        signFoot=[round(SIGN[0] - 0.6, 3), round(-SIGN[1] - 0.08, 3), round(SIGN[0] + 0.6, 3), round(-SIGN[1] + 0.06, 3)],
        judgeTable=dict(at=[JT[0], -JT[1]], top=0.7, foot=[round(JT[0] - 0.37, 3), round(-JT[1] - 0.24, 3), round(JT[0] + 0.37, 3), round(-JT[1] + 0.24, 3)],
                        stand=[round(JT[0] - 0.05, 3), round(-JT[1] - 0.48, 3)], standYaw=0.0),          # (behind it, facing the player)
        pegs=[gl(p[0], p[1], 0)[0::2] for _, p in GUYS],
    )
