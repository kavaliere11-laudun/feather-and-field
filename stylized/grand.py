"""The grand decorations (24 Nov 2026, Audrey: "What's next" -> "Grand decorations (Recommended)"): big showpieces for her
land, one for each of the levels 41 to 49 on the road of 50 levels, each shown to her as a picture before it goes in.
Built as the village's decorations are (stylized/village3d.py: boards, stones, tiles and trims, each piece its own flat
shade in the browser). Blender axes: x across, y back (the front faces -y), z up.
Look at one: bl/bin/python stylized/extras/view_grand.py fountain OUT"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from coop import plank
from coops import C, finish
from village3d import stone_row, polyline, flat_leaf
from mathutils import Vector, Quaternion


def ring(name, r0, r1, z, h, m, verts=48):
    """A flat ring (a basin's rim): r0 inside, r1 outside, z its middle, h high."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    top0, top1, bot0, bot1 = [], [], [], []
    for k in range(verts):
        a = 2 * math.pi * k / verts; c, s_ = math.cos(a), math.sin(a)
        top0.append(bm.verts.new((c * r0, s_ * r0, h / 2))); top1.append(bm.verts.new((c * r1, s_ * r1, h / 2)))
        bot0.append(bm.verts.new((c * r0, s_ * r0, -h / 2))); bot1.append(bm.verts.new((c * r1, s_ * r1, -h / 2)))
    for k in range(verts):
        j = (k + 1) % verts
        bm.faces.new((top0[k], top1[k], top1[j], top0[j])); bm.faces.new((bot0[j], bot1[j], bot1[k], bot0[k]))
        bm.faces.new((top1[k], bot1[k], bot1[j], top1[j])); bm.faces.new((top0[j], bot0[j], bot0[k], top0[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = (0, 0, z); setmat(o, m); return o


def tube(name, r0, r1, z0, z1, m, verts=40):
    """An open tube (no ends): water falling from a bowl's lip as a thin sheet, r0 at the top (z0), r1 at the bottom (z1)."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=verts, radius1=r1, radius2=r0, depth=z0 - z1)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = (0, 0, (z0 + z1) / 2); setmat(o, m); return o


def see_through(m, a):
    """A material the light shows through a little (water): its alpha, blended."""
    try:
        n = m.node_tree.nodes.get('Principled BSDF')
        if n: n.inputs['Alpha'].default_value = a
        m.blend_method = 'BLEND'
    except Exception as e: print('ALPHA', e)
    return m


def streams(objs, r, z0, z1, n, m):
    """Water falling from a bowl's lip (radius r, at z0) down to z1: n thin streams, each bowing out a little as it falls."""
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n; pts = []
        for i in range(6):
            u = i / 5; rr = r + 0.02 + 0.07 * math.sin(u * math.pi * 0.5); z = z0 - (z0 - z1) * u
            pts.append((math.cos(a) * rr, math.sin(a) * rr, z))
        for i in range(5): objs.append(plank('fstream', pts[i], pts[i + 1], 0.022, 0.012, (math.cos(a), math.sin(a), 0), m, jitter=0.0, bevel=0.0))


# ------------------------------------------------------------------ level 41: the Golden Egg Fountain
def fountain_dec(seed=81, name='fountain', part=None):
    """(part: None all of it, as in the pictures; for the game 'stone' all but the water, 'pool' the still water in the
    basin and the bowls, 'fall' the water falling and the frogs' arcs: the browser moves the water, main.js fountainWater)
    A grand fountain for the farm: a round stone basin (a ring of dressed stones under a moulded rim) full of water, a
    fluted pedestal with two scalloped bowls, the water falling from each in a thin curtain, and on top a golden egg;
    round the basin four little bronze frogs spouting arcs of water into it. It stands on a square of pale gravel in a
    stone kerb, a clipped box ball at each corner and lavender between them."""
    random.seed(seed); objs = []; pool = []; falls = []
    stone = [C('fstone%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#cfc7b5', '#c4bba8', '#d8d1c1'))]
    pale = C('fpale', '#e2dbcb', rough=0.8, var=0.03); gravel = C('fgravel', '#d9cfb7', rough=0.95, var=0.06)
    gold = C('fgold', '#f2c14e', rough=0.2, metal=1.0); bronze = C('fbronze', '#6f7f4a', rough=0.45, metal=0.6)
    water = C('fwater', '#5fa9d0', rough=0.08, spec=0.9, coat=1.0); fall = see_through(C('ffall', '#d6eefa', rough=0.1, spec=0.9), 0.36)
    box_g = C('fbox', '#3f7a35', rough=0.85, var=0.08); box_g2 = C('fbox2', '#4c8b3d', rough=0.85, var=0.08)
    lav = C('flav', '#9a7ac8', rough=0.7, var=0.08); lav_s = C('flavs', '#6f8f5a', rough=0.8)
    E = 1.42                                                     # (the gravel square's half side)
    objs.append(box('fgravel', (2 * E - 0.1, 2 * E - 0.1, 0.03), (0, 0, 0.015), m=gravel, bevel=0.0))
    for (a, b) in (((-E, -E), (E, -E)), ((E, -E), (E, E)), ((E, E), (-E, E)), ((-E, E), (-E, -E))):
        stone_row(objs, a, b, 0.0, 0.07, stone, -0.03, depth=0.08, lens=(0.26, 0.4), name='fkerb')
    # the basin: a ring of dressed stones, a moulded rim on top, the water inside
    R, H = 1.0, 0.36
    n = 22
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n; am = (a0 + a1) / 2
        L = 2 * R * math.sin(math.pi / n) * 1.02
        objs.append(box('fwall', (L, 0.16, H - 0.06), (math.cos(am) * R, math.sin(am) * R, (H - 0.06) / 2), (0, 0, am + math.pi / 2), m=random.choice(stone), bevel=0.012, segs=1, jitter=0.003))
    objs.append(ring('frim', R - 0.08, R + 0.12, H - 0.02, 0.07, pale))
    pool.append(cyl('fwater', R - 0.06, 0.02, (0, 0, H - 0.09), m=water, verts=48, bevel=0.0))
    objs.append(cyl('fplinth', R + 0.18, 0.06, (0, 0, 0.03), m=stone[1], verts=48, bevel=0.012))
    # the pedestal: a round foot, a fluted shaft, the lower bowl (scalloped), a shorter shaft, the upper bowl, the golden egg
    objs.append(cyl('ffoot', 0.26, 0.16, (0, 0, H + 0.0), m=pale, verts=24, r2=0.2, bevel=0.01))
    objs.append(cyl('fshaft', 0.13, 0.5, (0, 0, H + 0.33), m=stone[2], verts=16, bevel=0.004))
    for k in range(12):                                          # (the flutes)
        a = 2 * math.pi * k / 12
        objs.append(cyl('fflute', 0.018, 0.44, (math.cos(a) * 0.13, math.sin(a) * 0.13, H + 0.33), m=pale, verts=6, bevel=0.0))
    B1 = H + 0.64
    objs.append(cyl('fbowl1', 0.2, 0.14, (0, 0, B1 - 0.01), m=stone[0], verts=32, r2=0.6, bevel=0.01))
    pool.append(cyl('fbowl1w', 0.55, 0.02, (0, 0, B1 + 0.065), m=water, verts=32, bevel=0.0))
    for k in range(16):                                          # (its scalloped lip)
        a = 2 * math.pi * k / 16
        objs.append(sphere('fscallop', 0.06, (math.cos(a) * 0.6, math.sin(a) * 0.6, B1 + 0.04), (1, 1, 0.55), m=pale, seg=10, rings=6))
    falls.append(tube('fsheet1', 0.62, 0.7, B1 + 0.05, H - 0.08, fall))      # (the water falling from its lip into the basin: a thin sheet)
    objs.append(cyl('fshaft2', 0.08, 0.36, (0, 0, B1 + 0.22), m=stone[2], verts=12, bevel=0.004))
    B2 = B1 + 0.42
    objs.append(cyl('fbowl2', 0.11, 0.1, (0, 0, B2 - 0.01), m=stone[0], verts=24, r2=0.32, bevel=0.008))
    pool.append(cyl('fbowl2w', 0.29, 0.02, (0, 0, B2 + 0.045), m=water, verts=24, bevel=0.0))
    for k in range(10):
        a = 2 * math.pi * k / 10
        objs.append(sphere('fscallop', 0.04, (math.cos(a) * 0.32, math.sin(a) * 0.32, B2 + 0.03), (1, 1, 0.55), m=pale, seg=10, rings=6))
    falls.append(tube('fsheet2', 0.335, 0.39, B2 + 0.035, B1 + 0.07, fall))
    objs.append(cyl('fegg_cup', 0.07, 0.06, (0, 0, B2 + 0.08), m=gold, verts=16, r2=0.05, bevel=0.004))
    objs.append(sphere('fegg', 0.13, (0, 0, B2 + 0.25), (0.8, 0.8, 1.04), m=gold, seg=24, rings=14))      # the golden egg
    # four little bronze frogs on the rim, each spouting an arc of water into the basin
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; cx, cy = math.cos(a) * (R + 0.02), math.sin(a) * (R + 0.02)
        to = math.atan2(-cy, -cx)
        objs.append(sphere('ffrog', 0.09, (cx, cy, H + 0.07), (1.15, 1.0, 0.75), (0, 0, to), m=bronze, seg=14, rings=8))
        for s in (-1, 1):
            objs.append(sphere('ffrogeye', 0.03, (cx + math.cos(to) * 0.05 + math.cos(to + s * 1.2) * 0.04, cy + math.sin(to) * 0.05 + math.sin(to + s * 1.2) * 0.04, H + 0.12), m=bronze, seg=8, rings=5))
        pts = []
        for i in range(9):                                       # (the arc: out of its mouth, up a little, down into the water)
            u = i / 8; d = 0.08 + u * 0.55; z = H + 0.1 + 0.22 * math.sin(u * math.pi * 0.9) - u * 0.12
            pts.append((cx + math.cos(to) * d, cy + math.sin(to) * d, z))
        for i in range(8):
            falls.append(plank('fjet', pts[i], pts[i + 1], 0.03, 0.03, (0, 0, 1), fall, jitter=0.0, bevel=0.0))
    # the corners: a clipped box ball on a little square of soil, lavender along the sides
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (E - 0.28), sy * (E - 0.28)
            objs.append(sphere('fboxball', 0.24, (x, y, 0.25), (1, 1, 0.95), m=random.choice((box_g, box_g2)), ico=2, disp=0.18, seed=int(10 + sx * 3 + sy)))
            objs.append(cyl('fpot', 0.2, 0.08, (x, y, 0.06), m=stone[1], verts=12, bevel=0.01))
    for side in range(4):
        for k in range(7):
            u = -0.72 + k * 0.24
            x, y = [(u, -E + 0.22), (E - 0.22, u), (u, E - 0.22), (-E + 0.22, u)][side]
            if side == 0 and abs(u) < 0.3: continue                # (the way in at the front)
            for j in range(5):
                px, py = x + random.uniform(-0.05, 0.05), y + random.uniform(-0.05, 0.05); h = random.uniform(0.22, 0.3)
                objs.append(cyl('flavstem', 0.006, h, (px, py, h / 2), m=lav_s, verts=4, bevel=0.0))
                objs.append(sphere('flavflower', 0.018, (px, py, h + 0.02), (1, 1, 2.6), m=lav, seg=6, rings=4))
    keep = {None: objs + pool + falls, 'stone': objs, 'pool': pool, 'fall': falls}[part]
    for o in objs + pool + falls:
        if not any(o is k for k in keep): bpy.data.objects.remove(o, do_unlink=True)
    return finish(keep, name)


# ------------------------------------------------------------------ level 42: the Rose Arbour
def rose_arbour_dec(seed=91, name='rose_arbour'):
    """A white timber arbour smothered in climbing roses (deep pink, blush and crimson): four square posts, an arched top
    of curved ribs with battens over it, trellis on its sides and back, a white bench inside with two soft cushions, a
    lantern hanging from the top of the arch (lit at night); on a round terrace of bricks laid in basket weave with an edge
    of bricks, two standard roses in terracotta pots either side of the way in, two clipped box balls at the back,
    a few fallen petals."""
    random.seed(seed); objs = []
    white = C('rawhite', '#f3efe6', rough=0.6, var=0.02); white2 = C('rawhite2', '#e9e4d8', rough=0.6, var=0.02)
    bricks = [C('rabrick%d' % i, h, rough=0.85, var=0.07) for i, h in enumerate(('#b65a3e', '#a94f37', '#c2694a'))]
    mortar = C('ramortar', '#b8a487', rough=0.95, var=0.04)
    leaf = [C('raleaf%d' % i, h, rough=0.8, var=0.07, hue_var=0.015) for i, h in enumerate(('#2f6a2c', '#3d7a32', '#4f8c3a', '#64a042'))]
    roses = [C('rarose', '#e0507a', rough=0.55), C('rarose2', '#f4b8c6', rough=0.55), C('rarose3', '#c22a44', rough=0.55), C('rarose4', '#f7dfe2', rough=0.55)]
    heart = [C('raheart', '#b8325a', rough=0.6), C('raheart2', '#e48aa0', rough=0.6), C('raheart3', '#8e1a2e', rough=0.6), C('raheart4', '#eab3bd', rough=0.6)]
    hedge = [C('rahedge', '#3f7a35', rough=0.85, var=0.08), C('rahedge2', '#4c8b3d', rough=0.85, var=0.08)]
    terra = C('raterra', '#b8653d', rough=0.8, var=0.05); terra2 = C('raterra2', '#c47248', rough=0.8); soil = C('rasoil', '#5a3f2c', rough=0.95)
    stem = C('rastem', '#5a4a30', rough=0.85); iron = C('rairon', '#2b2f2f', rough=0.45); lamp = C('lamp', '#ffe2a0', rough=0.3)
    sage = C('racush', '#9cb89a', rough=0.9, var=0.03); blush = C('racush2', '#f0d4d0', rough=0.9, var=0.03)
    RT = 1.3                                                     # (the terrace's radius)
    # the terrace: mortar under, bricks in basket weave (pairs, each square turned from the next), an edge of bricks
    objs.append(cyl('ramortar', RT, 0.02, (0, 0, 0.01), m=mortar, verts=48, bevel=0.0))
    for i in range(-7, 7):
        for j in range(-7, 7):
            cx, cy = (i + 0.5) * 0.2, (j + 0.5) * 0.2
            for k in (-1, 1):
                at, size = ((cx, cy + k * 0.05), (0.19, 0.09)) if (i + j) % 2 else ((cx + k * 0.05, cy), (0.09, 0.19))
                if math.hypot(*at) > RT - 0.135: continue           # (each brick inside the edge)
                objs.append(box('rabrick', (size[0], size[1], 0.03), (at[0], at[1], 0.03), m=random.choice(bricks), bevel=0.0))
    n = 44
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        objs.append(box('raedge', (2 * math.pi * (RT - 0.06) / n - 0.012, 0.1, 0.05), (math.cos(a) * (RT - 0.06), math.sin(a) * (RT - 0.06), 0.03), (0, 0, a + math.pi / 2), m=random.choice(bricks), bevel=0.004, segs=1))
    # two clipped box balls at the back, either side of the arbour
    for sx in (-1, 1):
        a = math.radians(90 - sx * 58); R = RT - 0.3
        objs.append(sphere('raboxball', 0.22, (math.cos(a) * R, math.sin(a) * R, 0.24), (1, 1, 0.95), m=hedge[0 if sx < 0 else 1], ico=2, disp=0.18, seed=int(20 + sx * 3)))
    # the arbour: posts, arched ribs front and back, battens over, trellis sides and back
    AY, X2, Y2, PH, RISE = 0.3, 0.75, 0.3, 1.8, 0.5
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * X2, AY + sy * Y2
            objs.append(box('rapost', (0.085, 0.085, PH), (x, y, PH / 2 + 0.04), m=white, bevel=0.01, segs=1))
            objs.append(box('rafoot', (0.13, 0.13, 0.08), (x, y, 0.08), m=white2, bevel=0.01, segs=1))
            objs.append(box('racap', (0.11, 0.11, 0.04), (x, y, PH + 0.04), m=white2, bevel=0.008, segs=1))
    arch = lambda t, r=1.0: Vector((X2 * r * math.cos(t), 0, PH + 0.04 + RISE * r * math.sin(t)))
    N = 14
    for y in (AY - Y2, AY + Y2):
        for rr, w in ((1.0, 0.09), (0.8, 0.05)):                  # (a rib, and a slimmer one under it)
            pts = [arch(math.pi * k / N, rr) + Vector((0, y, 0)) for k in range(N + 1)]
            polyline(objs, 'rarib', pts, w, 0.05, (0, -1, 0), white)
        for k in range(1, N, 2):                                  # (little spokes between them)
            t = math.pi * k / N
            objs.append(plank('raspoke', tuple(arch(t, 0.8) + Vector((0, y, 0))), tuple(arch(t, 1.0) + Vector((0, y, 0))), 0.03, 0.04, (0, -1, 0), white2, jitter=0.0, bevel=0.0))
    for k in range(1, N):
        t = math.pi * k / N; p = arch(t, 1.0)
        objs.append(plank('rabatten', (p.x, AY - Y2 - 0.07, p.z + 0.03), (p.x, AY + Y2 + 0.07, p.z + 0.03), 0.045, 0.03, (math.cos(t) * RISE, 0, math.sin(t) * X2), white2, jitter=0.0, bevel=0.0))
    def lattice(face, u0, u1, z0, z1, fixed, step=0.17):
        """Diagonal trellis in a frame: along y (face 'x', at x = fixed) or along x (face 'y', at y = fixed)."""
        P = (lambda u, z: (fixed, u, z)) if face == 'x' else (lambda u, z: (u, fixed, z))
        nm = (1, 0, 0) if face == 'x' else (0, -1, 0)
        for z in (z0, z1): objs.append(plank('raframe', P(u0, z), P(u1, z), 0.05, 0.035, nm, white, jitter=0.0, bevel=0.0))
        for sgn in (1, -1):
            c = -(u1 - u0) - (z1 - z0)
            while c < (u1 - u0) + (z1 - z0):
                # the line z - z0 = sgn * (u - u0) + c, clipped to the frame
                seg = []
                for u in (u0, u1):
                    z = z0 + sgn * (u - u0) + c
                    if z0 <= z <= z1: seg.append((u, z))
                for z in (z0, z1):
                    u = u0 + (z - z0 - c) * sgn
                    if u0 < u < u1: seg.append((u, z))
                seg = sorted(set(seg))
                if len(seg) >= 2 and math.hypot(seg[-1][0] - seg[0][0], seg[-1][1] - seg[0][1]) > 0.05:
                    a, b = seg[0], seg[-1]; off = 0.012 * sgn
                    pa, pb = list(P(*a)), list(P(*b))
                    if face == 'x': pa[0] += off; pb[0] += off
                    else: pa[1] += off; pb[1] += off
                    objs.append(plank('ralath', tuple(pa), tuple(pb), 0.028, 0.012, nm, white2, jitter=0.0, bevel=0.0))
                c += step
    for sx in (-1, 1): lattice('x', AY - Y2 + 0.04, AY + Y2 - 0.04, 0.2, 1.62, sx * X2)
    lattice('y', -X2 + 0.04, X2 - 0.04, 0.62, 1.62, AY + Y2)
    # the bench inside, along the back, and its cushions
    for sx in (-1, 1):
        for y in (AY + 0.0, AY + Y2 - 0.08):
            objs.append(box('raleg', (0.05, 0.05, 0.4), (sx * (X2 - 0.12), y, 0.24), m=white, bevel=0.006, segs=1))
    for k in range(4):
        objs.append(box('raseat', (2 * X2 - 0.14, 0.075, 0.03), (0, AY - 0.02 + k * 0.085, 0.45), m=white, bevel=0.006, segs=1))
    for z in (0.58, 0.7):
        objs.append(box('raback', (2 * X2 - 0.14, 0.03, 0.06), (0, AY + Y2 - 0.06, z), m=white, bevel=0.006, segs=1))
    objs.append(box('racushion', (0.5, 0.3, 0.06), (-0.3, AY + 0.1, 0.495), m=sage, bevel=0.03, segs=3))
    objs.append(box('racushion', (0.5, 0.3, 0.06), (0.3, AY + 0.1, 0.495), m=sage, bevel=0.03, segs=3))
    objs.append(box('rapillow', (0.26, 0.08, 0.24), (0.42, AY + 0.2, 0.64), (math.radians(-15), 0, math.radians(-8)), m=blush, bevel=0.035, segs=3))
    # the lantern hanging from the top of the arch
    top = PH + 0.04 + RISE
    objs.append(cyl('rachain', 0.006, 0.28, (0, AY, top - 0.14), m=iron, verts=5, bevel=0.0))
    objs.append(cyl('ralantcap', 0.06, 0.04, (0, AY, top - 0.3), m=iron, verts=8, r2=0.02, bevel=0.0))
    objs.append(cyl('ralamp', 0.04, 0.12, (0, AY, top - 0.38), m=lamp, verts=8, bevel=0.0))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        objs.append(cyl('ralantbar', 0.006, 0.13, (math.cos(a) * 0.045, AY + math.sin(a) * 0.045, top - 0.38), m=iron, verts=4, bevel=0.0))
    objs.append(cyl('ralantbase', 0.055, 0.025, (0, AY, top - 0.455), m=iron, verts=8, bevel=0.0))
    # the roses: leafy clumps climbing every post and over the arch, more at the front and on the left, roses dotted on them;
    # little leaves all over; swags hanging from the front arch
    clumps = []
    def clump(p, r, out):
        clumps.append((Vector(p), r, Vector(out).normalized()))
        objs.append(sphere('raclump', r * 0.85, tuple(p), (1, 1, 0.9), (0, 0, random.uniform(0, 3)), m=random.choice(leaf[:2]), ico=1, disp=0.3, disp_scale=5.0, seed=len(clumps) * 7 + seed))      # (a dark core: the leaves cover it)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * X2, AY + sy * Y2; z = 0.12
            while z < PH:
                a = random.uniform(0, 2 * math.pi)
                out = Vector((sx * 0.8 + math.cos(a) * 0.4, sy * 0.6 + math.sin(a) * 0.4, 0.1))
                clump((x + out.x * 0.06, y + out.y * 0.06, z), random.uniform(0.07, 0.095) * (0.8 if z < 0.6 else 1.0), out)
                z += random.uniform(0.11, 0.16) * (1.4 if z < 0.7 and sy > 0 else 1.0)
    for k in range(34):                                           # (over the arch: more at the front, more on the left)
        t = math.pi * (random.uniform(0, 1) ** (1.25 if random.random() < 0.5 else 1.0))
        if random.random() < 0.35: t = math.pi - t * 0.6
        p = arch(t, 1.04); y = AY + random.uniform(-Y2 - 0.06, Y2 + 0.06) * (1 if random.random() < 0.6 else 0.4) - (0.12 if random.random() < 0.5 else 0)
        out = Vector((math.cos(t) * 0.8, -0.2, math.sin(t) + 0.2))
        clump((p.x, y, p.z + 0.03), random.uniform(0.08, 0.12), out)
    for sx in (-1, 1):                                            # (swags at the front, hanging from the shoulders)
        t0 = math.pi * (0.15 if sx > 0 else 0.85); p = arch(t0, 0.95)
        for j in range(4):
            clump((p.x - sx * 0.04 * j, AY - Y2 - 0.07, p.z - 0.08 - j * 0.11), 0.07 - j * 0.008, (sx * 0.3, -1, 0))
    for k in range(1300):                                         # leaves all over the clumps, lighter where the sun reaches
        c, r, out = random.choice(clumps)
        d = (out * 0.7 + Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.7, 1)))).normalized()
        p = c + d * r * random.uniform(0.78, 0.95)
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), random.uniform(0, 2 * math.pi)) @ Quaternion((1, 0, 0), random.uniform(0.25, 0.6))
        objs.append(flat_leaf('raleafy', tuple(p), q, random.uniform(0.06, 0.08), random.uniform(0.022, 0.03), leaf[min(3, 1 + (k % 2) + (1 if d.z > 0.5 else 0))], both=False, fold=0.005))
    for k in range(130):                                          # the roses: a cup with its heart
        c, r, out = random.choice(clumps)
        d = (out * 1.2 + Vector((random.uniform(-0.8, 0.8), random.uniform(-0.8, 0.8), random.uniform(-0.4, 0.9)))).normalized()
        p = c + d * r * 0.98; i = random.choice((0, 0, 0, 1, 1, 2, 3)); s = random.uniform(0.03, 0.04)
        e = d.to_track_quat('Z', 'Y').to_euler()
        objs.append(sphere('rarose', s, tuple(p), (1, 1, 0.62), e, m=roses[i], seg=7, rings=4))
        objs.append(sphere('raheart', s * 0.5, tuple(p + d * s * 0.42), (1, 1, 0.7), e, m=heart[i], ico=1))
    # two standard roses in pots either side of the way in
    for sx in (-1, 1):
        x, y = sx * 0.88, -0.62
        objs.append(cyl('rapot', 0.15, 0.3, (x, y, 0.17), m=terra, verts=16, r2=0.115, bevel=0.004))
        objs.append(cyl('rapotrim', 0.165, 0.05, (x, y, 0.31), m=terra2, verts=16, bevel=0.004))
        objs.append(cyl('rasoil', 0.14, 0.01, (x, y, 0.335), m=soil, verts=14, bevel=0.0))
        objs.append(cyl('rastem', 0.016, 0.62, (x, y, 0.64), m=stem, verts=6, bevel=0.0))
        hc = Vector((x, y, 1.02))
        objs.append(sphere('rahead', 0.19, tuple(hc), (1, 1, 0.92), m=leaf[1], ico=2, disp=0.25, disp_scale=4.0, seed=int(50 + sx * 3)))
        for k in range(160):
            a = random.uniform(0, 2 * math.pi); el = math.asin(random.uniform(-0.5, 1.0))
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), random.uniform(0, 2 * math.pi)) @ Quaternion((1, 0, 0), random.uniform(0.25, 0.55))
            objs.append(flat_leaf('raleafy', tuple(hc + Vector((d.x, d.y, d.z * 0.92)) * 0.19), q, random.uniform(0.06, 0.075), random.uniform(0.022, 0.028), leaf[min(3, 1 + (k % 2) + (1 if d.z > 0.5 else 0))], both=False, fold=0.005))
        for k in range(16):
            a = random.uniform(0, 2 * math.pi); el = math.asin(random.uniform(-0.3, 0.95))
            d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
            i = 0 if sx < 0 else 2; s = random.uniform(0.028, 0.034); e = d.to_track_quat('Z', 'Y').to_euler()
            objs.append(sphere('rarose', s, tuple(hc + d * 0.215), (1, 1, 0.62), e, m=roses[i if k % 4 else 1], seg=7, rings=4))
            objs.append(sphere('raheart', s * 0.5, tuple(hc + d * (0.215 + s * 0.42)), (1, 1, 0.7), e, m=heart[i if k % 4 else 1], ico=1))
    # a few fallen petals on the bricks
    for k in range(18):
        x, y = random.uniform(-0.6, 0.6), random.uniform(-0.5, 0.25)
        objs.append(cyl('rapetal', 0.014, 0.004, (x, y, 0.048), (0, 0, random.uniform(0, 3)), m=random.choice(roses[:2]), verts=6, bevel=0.0))
    return finish(objs, name)


GRAND = {'fountain': fountain_dec, 'rose_arbour': rose_arbour_dec}
