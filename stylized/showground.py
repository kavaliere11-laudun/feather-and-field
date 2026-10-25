"""The show ground for the 3D game's poultry shows (release 1 step 9, Audrey chose a "show day on the farm"): a white marquee
open along its front (two peaks with pennants, a scalloped valance with a red trim, guy ropes and pegs, bunting along the
front), a trestle table inside under a green cloth with six little show coops in a row (Audrey, 25 Oct: "the chickens
should not be in a cage"): each a tiny wooden house in its own soft colour, open at the front so its bird shows, a pitched
shingle roof, a heart cut out of its gable, a pennant, a straw floor, its card under the eave (the part is still called
'show_pens'), the judge's table (his clipboard, the rosette box, a cup of tea), a blank sign board on two
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
NPEN, CW, CD, WT = 6, 0.54, 0.93, 0.025         # six little coops: inside 0.54 wide, 0.93 deep (a Light Brahma rooster's tail), boards 2.5 cm
OW = CW + 2 * WT                               # a coop's width outside its walls
PITCH = 0.67                                   # from one coop's middle to the next (their eaves 2 cm apart)
OH, OHF, OHB = 0.03, 0.05, 0.03                # the roof's overhang at the sides, the front and the back
ROW = (NPEN - 1) * PITCH + OW + 2 * OH         # the row of coops, end to end (eave to eave)
PF = FRONT + 0.15                              # the coops' fronts (close to the open side, so the birds show from the game's view under the valance)
TABLE = 0.74                                   # the table's top, under its cloth
BASE = 0.025                                   # the coops' floor boards
FLOOR = TABLE + BASE + 0.018                   # where a bird stands, on the straw
SILL = TABLE + 0.135                           # the top of the front board under the opening (its rosette pinned on it)
TOP = 1.65                                     # the walls' tops (the eaves): a Light Brahma rooster (0.71) and room over him
RA = math.radians(33)                          # the roof's pitch
RIDGE = TOP + OW / 2 * math.tan(RA)            # the roof's underside at the ridge
CORNER = 0.06                                  # the corner boards either side of the opening (0.47 m wide between them)
SIGN = (-2.95, -1.75)                          # the sign board (x, y): in front, to the left of the marquee
JT = (2.85, -1.7)                              # the judge's table: in front, to the right

COL = dict(canvas='#f7f5ee', seam='#d8d0bc', trim='#c8372d', pole='#94693f', rope='#e3d8bd', peg='#a07245', baize='#3d6b48',
           coopwhite='#f7f1e3', heart='#5a3f33', wire='#b3b9bf', straw='#ebcf78', straw2='#c99a3e', signface='#fbf6e7', signframe='#3d6b48',
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


# each little coop's own soft colour: its walls, its roof (a deeper shade of it), the pennant on its gable
COOPS = [('#f6e2b6', '#c98e57', '#3f7fc4'),     # cream
         ('#b2d49c', '#6a9a5a', '#d8433a'),     # sage
         ('#aed3f0', '#5a8bbd', '#f2c14e'),     # pale blue
         ('#fbd970', '#d89a32', '#3f7fc4'),     # butter yellow
         ('#f7bdb8', '#cf6f6b', '#5aa65a'),     # blush
         ('#cbb8ee', '#8a72c2', '#f2c14e')]     # lavender


def MV(hexc, var=0.07):
    """A coop's colour, each board a shade of it."""
    k = 'v' + hexc
    if k not in _M: _M[k] = mat('sg_c' + hexc.lstrip('#'), hexc, rough=0.85, spec=0.2, var=var)
    return _M[k]


def shade(hexc, k):
    c = [int(hexc[i:i + 2], 16) * k for i in (1, 3, 5)]
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(v))) for v in c)


def prism(name, pts, y0, y1, m):
    """A board cut to the outline pts ((x, z), anticlockwise seen from the front), from y0 (its front) back to y1."""
    n = len(pts)
    V = [(x, y0, z) for x, z in pts] + [(x, y1, z) for x, z in pts]
    F = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n)]
    return mesh_obj(name, V, F, m)


def board(name, a, b, width, thick, normal, m, bevel=0.0):
    """A board from a to b (its length), its face towards normal."""
    a, b, n = Vector(a), Vector(b), Vector(normal).normalized()
    X = b - a; L = X.length; X = X / L
    T = (n - X * n.dot(X)).normalized(); W = X.cross(T)
    o = box(name, (L, thick, width), (0, 0, 0), m=m, bevel=bevel, segs=1)
    o.matrix_world = Matrix.Translation((a + b) / 2) @ Matrix((X, T, W)).transposed().to_4x4()
    return o


def heart_pts(cx, cz, w, n=16):
    """A heart's outline (x, z), w across, its middle at (cx, cz), anticlockwise from its point."""
    P = []
    for k in range(n):
        t = math.pi - k / n * math.tau
        x, z = 16 * math.sin(t) ** 3, 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        P.append((cx + x * w / 32, cz + (z + 2.5) * w / 32))
    return P


def coop(i, rnd):
    """Coop i: a little wooden house on the table, open at the front (no door, nothing across it) so its bird shows: board
    walls at the back and sides in its own colour, a pitched roof of lapped shingles a shade deeper with a little overhang,
    white trim (corner boards, the front board under the opening, the barge boards), a white gable piece with a heart cut
    out under the ridge, a pennant on the ridge, a straw floor, and its card hanging under the eave."""
    cx = pen_x(i); wall, roofc, flag = COOPS[i]
    Wm, Rm, Tm = MV(wall), MV(roofc, 0.09), M('coopwhite', 0.7)
    il, ir, yb = cx - CW / 2, cx + CW / 2, PF + CD          # (inside its walls; its back wall's inside)
    ta = math.tan(RA)
    def under(x): return RIDGE - abs(x - cx) * ta           # the roof's underside above x
    z0 = TABLE + BASE
    box('floor', (CW, CD, BASE), (cx, PF + CD / 2, TABLE + BASE / 2), (0, 0, 0), Wm, bevel=0.0)
    # the side walls: lapped boards, up to the roof
    nb = 5; hb = (TOP + WT * ta - TABLE) / nb
    for s in (-1, 1):
        for k in range(nb):
            box('side', (WT, CD + WT, hb + 0.01), (cx + s * (CW / 2 + WT / 2 + 0.002), PF + (CD + WT) / 2, TABLE + hb * (k + 0.5)), (0, math.radians(-s * 2.5), 0), Wm, bevel=0.0)
    # the back wall: upright boards up into the gable, a darker backing showing between them
    nv = 5; bw = CW / nv
    for k in range(nv):
        x0, x1 = il + k * bw + 0.002, il + (k + 1) * bw - 0.002
        pts = [(x0, TABLE), (x1, TABLE), (x1, under(x1))] + ([(cx, RIDGE)] if x0 < cx < x1 else []) + [(x0, under(x0))]
        prism('back', pts, yb, yb + WT, Wm)
    prism('backing', [(il, TABLE), (ir, TABLE), (ir, under(ir)), (cx, RIDGE), (il, under(il))], yb + WT, yb + WT + 0.006, MV(shade(wall, 0.62), 0.0))
    # the front: a white board under the opening (its rosette pinned on it), corner boards in its colour up to the barge boards
    box('sill', (OW + 0.02, 0.036, SILL - TABLE), (cx, PF - 0.018, (TABLE + SILL) / 2), (0, 0, 0), Tm, bevel=0.006, segs=1)
    for s in (-1, 1):
        box('corner', (CORNER, 0.026, TOP + 0.01 - SILL), (cx + s * (OW / 2 - CORNER / 2), PF - 0.013, (SILL + TOP + 0.01) / 2), (0, 0, 0), Wm, bevel=0.0)
    # the roof: three courses of shingles a side, each lapping the one below, a ridge cap, white barge boards at the front
    yf, yk = PF - OHF, yb + WT + 0.006 + OHB
    Ls = (OW / 2 + OH) / math.cos(RA)
    for s in (-1, 1):
        d, n = Vector((s * math.cos(RA), 0, -math.sin(RA))), Vector((s * math.sin(RA), 0, math.cos(RA)))
        P0 = Vector((cx, 0, RIDGE))
        for k in range(3):
            u = Ls - k * 0.12 - 0.155 / 2; c = P0 + d * u + n * (0.009 + k * 0.008)
            board('shingles', (c.x, yf, c.z), (c.x, yk, c.z), 0.155, 0.018, n, Rm)
        a, b = P0 + d * -0.03 + n * 0.007, P0 + d * Ls + n * 0.007
        board('barge', (a.x, yf - 0.011, a.z), (b.x, yf - 0.011, b.z), 0.064, 0.022, (0, -1, 0), Tm)
    box('ridgecap', (0.026, yk - yf + 0.01, 0.026), (cx, (yf + yk) / 2, RIDGE + 0.034 / math.cos(RA) + 0.004), (0, math.radians(45), 0), Tm, bevel=0.0)
    # the gable piece under the ridge, with a heart cut out of it (dark, as the roof's inside behind it)
    apex = RIDGE - 0.032 / math.cos(RA); gh = 0.085
    prism('gable', [(cx - gh / ta, apex - gh), (cx + gh / ta, apex - gh), (cx, apex)], yf, yf + 0.014, Tm)
    H = heart_pts(cx, apex - gh * 0.6, 0.05)
    mesh_obj('heart', [(x, yf - 0.001, z) for x, z in H] + [(cx, yf - 0.001, apex - gh * 0.6)], [(len(H), k, (k + 1) % len(H)) for k in range(len(H))], M('heart', 0.9))
    # a pennant on the ridge, over the gable
    top = RIDGE + 0.06 + 0.085; px, py = cx, yf + 0.02
    rod('flagpole', (px, py, RIDGE + 0.04), (px, py, top + 0.008), 0.0055, M('pole'), 6)
    mesh_obj('pennant', [(px, py, top), (px, py, top - 0.045), (px + 0.08, py - 0.004, top - 0.024)], [(0, 1, 2)], flag_mat(flag), solid=0.005)
    # the straw: a bumpy layer, loose straws, a couple over the front board
    nx, ny = 5, 8; V, F = [], []
    for j in range(ny + 1):
        for k in range(nx + 1):
            x = il + CW * k / nx; y = PF + 0.004 + (CD - 0.008) * j / ny
            edge = k in (0, nx) or j in (0, ny)
            h = 0.006 if edge else 0.012 + 0.012 * noise.noise(Vector((x * 9 + i * 3.1, y * 9, 0.5)))
            V.append((x, y, z0 + h))
    for j in range(ny):
        for k in range(nx):
            q = j * (nx + 1) + k; F.append((q, q + 1, q + nx + 2, q + nx + 1))
    mesh_obj('straw', V, F, M('straw'), smooth=True)
    for k in range(8):
        x = cx + rnd.uniform(-0.23, 0.23); y = PF + rnd.uniform(0.06, CD - 0.08); a = rnd.uniform(0, math.pi)
        box('straws', (rnd.uniform(0.07, 0.13), 0.006, 0.004), (x, y, z0 + 0.022), (rnd.uniform(-0.3, 0.3), 0, a), M('straw2' if k % 2 else 'straw'), bevel=0.0)
    for k in range(2):
        x = cx + (-0.15 if k else 0.11) + rnd.uniform(-0.03, 0.03)
        box('straws', (0.006, rnd.uniform(0.09, 0.12), 0.004), (x, PF - 0.01, SILL + 0.004), (math.radians(-12), 0, rnd.uniform(-0.5, 0.5)), M('straw2' if k else 'straw'), bevel=0.0)
    # its card, hanging on a string under the eave at the left (clear of a bird turned to the right)
    kx, ky, kz = card_at(cx)
    rod('cardstring', (kx, ky, kz + 0.0275), (kx, ky, kz + 0.0275 + 0.038), 0.0025, M('rope'), 4)
    box('card', (0.08, 0.006, 0.055), (kx, ky, kz), (0, 0, 0), M('card', 0.7), bevel=0.0)


def card_at(cx):
    """The middle of a coop's card (hanging 3.4 cm under its barge board, at the left)."""
    kx = cx - (OW / 2 - 0.095)
    return kx, PF - OHF - 0.011, RIDGE - abs(kx - cx) * math.tan(RA) - 0.032 / math.cos(RA) - 0.034 - 0.0275


def pens():
    """The trestle table under its green cloth, and the six little coops in a row on it."""
    y0, y1 = PF - 0.014, PF + CD + WT + 0.06                           # (the coops' fronts at the table's front edge)
    TL = ROW + 0.1
    box('tabletop', (TL, y1 - y0, 0.04), (0, (y0 + y1) / 2, TABLE - 0.02), (0, 0, 0), M('baize'), bevel=0.012, segs=1)
    # the cloth's skirt: pleated along the front, plain at the ends
    V, F = [], []
    n = 64; xa, xb = -TL / 2, TL / 2
    for k in range(n + 1):
        x = xa + (xb - xa) * k / n; y = y0 - 0.008 - (0.012 if k % 2 else 0.0)
        V += [(x, y, 0.035), (x, y, TABLE)]
    for k in range(n): F.append((2 * k, 2 * k + 2, 2 * k + 3, 2 * k + 1))
    mesh_obj('skirt', V, F, M('baize'), solid=0.006)
    for s in (-1, 1): box('skirtend', (0.01, y1 - y0, TABLE - 0.035), (s * (TL + 0.01) / 2, (y0 + y1) / 2, (TABLE + 0.035) / 2), (0, 0, 0), M('baize'), bevel=0.0)
    rnd = random.Random(7)
    for i in range(NPEN): coop(i, rnd)


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


BIRD = (-0.02, 0.37)                             # a bird's spot in her coop: a touch left of the middle, 0.37 m in (her tail clear of the back wall)


def places(sign_rect):
    P = []
    for i in range(NPEN):
        cx = pen_x(i); bx, bz = cx + BIRD[0], -(PF + BIRD[1]); jx, jz = cx + 0.36, -PF + 0.46
        P.append(dict(
            x=round(cx, 4), front=round(-PF, 4),                    # the coop's middle across, its front (z)
            bird=gl(bx, PF + BIRD[1], FLOOR), birdYaw=round(math.radians(14), 3),     # where a bird stands on the straw, turned a little to the right
            room=[round(CW, 3), round(CD, 3), round(TOP - TABLE - BASE, 3)],         # inside: wide, deep, high to the eaves
            pin=gl(cx, PF - 0.046, TABLE + BASE + 0.062),                              # a rosette's pin: on the front board under the opening, in the middle (it hangs over the table's cloth)
            card=gl(*card_at(cx)),
            judge=[round(jx, 3), round(jz, 3)], judgeYaw=round(math.atan2(bx - jx, bz - jz), 3),     # beside it, peering in at her
            pinAt=[round(cx - 0.24, 3), round(-PF + 0.54, 3)], pinYaw=round(math.pi, 3),                          # facing it, his right hand (judge_pin) at its pin
            farmer=[round(cx, 3), round(-PF + 0.5, 3)], farmerYaw=round(math.pi, 3),  # in front of it, facing it, to put a bird in
            door=gl(cx, PF, (SILL + TOP) / 2)))                       # the opening's middle (where she's lifted in)
    sc = sign_rect['centre']
    TL, y1 = ROW + 0.11, PF + CD + WT + 0.06
    return dict(
        pens=P, floor=round(FLOOR, 4), top=round(TOP, 4), sill=round(SILL, 4), ridge=round(RIDGE, 4),
        eave=EAVE, peak=PEAK, valance=round(EAVE - 0.17, 3),
        tent=[-HW, -BACK, HW, -FRONT],                              # the marquee's walls and roof (x0, z0, x1, z1)
        table=[round(-TL / 2, 3), round(-y1, 3), round(TL / 2, 3), round(-(PF - 0.022), 3)],
        aisle=[-2.05, round(-PF + 0.18, 3), 2.05, round(-PF + 0.95, 3)],         # the open strip in front of the pens
        entrance=[0.0, round(-FRONT + 0.75, 3)],
        sign=dict(centre=gl(*sc), w=round(sign_rect['w'], 3), h=round(sign_rect['h'], 3), normal=[0, 0, 1]),
        signFoot=[round(SIGN[0] - 0.6, 3), round(-SIGN[1] - 0.08, 3), round(SIGN[0] + 0.6, 3), round(-SIGN[1] + 0.06, 3)],
        judgeTable=dict(at=[JT[0], -JT[1]], top=0.7, foot=[round(JT[0] - 0.37, 3), round(-JT[1] - 0.24, 3), round(JT[0] + 0.37, 3), round(-JT[1] + 0.24, 3)],
                        stand=[round(JT[0] - 0.05, 3), round(-JT[1] - 0.48, 3)], standYaw=0.0),          # (behind it, facing the player)
        pegs=[gl(p[0], p[1], 0)[0::2] for _, p in GUYS],
    )
