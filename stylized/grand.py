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
from village3d import stone_row, polyline, flat_leaf, bale, straw_ms, tuft
from mathutils import Vector, Quaternion, Matrix


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


# ------------------------------------------------------------------ level 43: the Dovecote
def flat(o):
    """Flat faces (a disc's sides and ends shaded apart)."""
    for md in [m for m in o.modifiers if m.type == 'WEIGHTED_NORMAL']: o.modifiers.remove(md)
    for pl in o.data.polygons: pl.use_smooth = False
    return o


def dove(objs, p, yaw, m, beak, eye, s=1.0, look=0.0):
    """A white dove sitting (p: where her feet are; yaw: which way she faces, in Blender's x-y plane)."""
    f = Vector((math.cos(yaw), math.sin(yaw), 0)); P = Vector(p)
    objs.append(sphere('ddbody', 0.05 * s, tuple(P + Vector((0, 0, 0.045 * s))), (1.45, 1.0, 0.95), (0, math.radians(-10), yaw), m=m, seg=12, rings=7))
    objs.append(box('ddtail', (0.075 * s, 0.05 * s, 0.012 * s), tuple(P - f * 0.075 * s + Vector((0, 0, 0.05 * s))), (0, math.radians(-18), yaw), m=m, bevel=0.004, segs=1))
    h = P + f * 0.06 * s + Vector((0, 0, 0.1 * s)); fh = Vector((math.cos(yaw + look), math.sin(yaw + look), 0))
    objs.append(sphere('ddhead', 0.028 * s, tuple(h), m=m, seg=10, rings=6))
    objs.append(cyl('ddbeak', 0.008 * s, 0.022 * s, tuple(h + fh * 0.032 * s - Vector((0, 0, 0.004 * s))), (0, math.radians(90), yaw + look), m=beak, verts=6, r2=0.002 * s, bevel=0.0))
    for sd in (-1, 1):
        e = h + fh * 0.016 * s + Vector((-fh.y, fh.x, 0)) * sd * 0.02 * s + Vector((0, 0, 0.008 * s))
        objs.append(sphere('ddeye', 0.0045 * s, tuple(e), m=eye, seg=6, rings=4))


def dovecote_dec(seed=101, name='dovecote'):
    """A round dovecote tower in the French way (a pigeonnier): limewashed walls on a stone footing, a projecting stone
    ledge round it, a row of arched pigeon holes under the eaves, each with its little landing ledge; a cone of round
    clay tiles in courses, an open lantern on top with a gold ball and a dove weathervane; a green arched door with a
    stone surround and two steps, a sack of grain by it; ivy climbing one side, hollyhocks by the door; a stone basin of
    water for the doves; a ring of flagstones round it all; white doves on the ledges and the roof."""
    random.seed(seed); objs = []
    lime = C('dclime', '#f1eadb', rough=0.85, var=0.03); lime2 = C('dclime2', '#e8dfcb', rough=0.85, var=0.03)
    stone = [C('dcstone%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#c9bea6', '#bfb39a', '#d2c8b2'))]
    tiles = [C('dctile%d' % i, h, rough=0.75, var=0.08, hue_var=0.012) for i, h in enumerate(('#c2603f', '#b55639', '#cc6c48'))]
    dark = C('dcdark', '#3a302a', rough=0.9); green = C('dcdoor', '#4d7a5a', rough=0.6, var=0.04)
    gold = C('dcgold', '#f2c14e', rough=0.25, metal=1.0); iron = C('dciron', '#2b2f2f', rough=0.45)
    wood = C('dcwood', '#8a6a4a', rough=0.8, var=0.08)
    doveW = C('dcdove', '#fbf8f1', rough=0.6); doveB = C('dcbeak', '#e8a0a0', rough=0.6); eyeM = C('dceye', '#1c1a1a', rough=0.4)
    ivy = [C('dcivy%d' % i, h, rough=0.75, var=0.08) for i, h in enumerate(('#2f6b34', '#3d7a3a', '#4f8a40'))]
    leaf = C('dcleaf', '#4a8a38', rough=0.8, var=0.06); holly = [C('dchol', '#e88aa8', rough=0.6), C('dchol2', '#f4c0cf', rough=0.6), C('dchol3', '#c84a6a', rough=0.6)]
    sack = C('dcsack', '#cdb48a', rough=0.95, var=0.05); grain = C('dcgrain', '#e2c56a', rough=0.8)
    water = C('dcwater', '#6fb0d4', rough=0.08, spec=0.9)
    R, WALL = 0.72, 2.15                                         # (the tower's radius, its walls' height)
    # the flagstones round it, and the grass between them
    for ring_r, n in ((R + 0.22, 18), (R + 0.5, 26)):
        for k in range(n):
            a = 2 * math.pi * (k + random.uniform(0.35, 0.65)) / n; L = 2 * math.pi * ring_r / n - 0.03
            objs.append(box('dcflag', (L * random.uniform(0.85, 0.98), 0.25, 0.04), (math.cos(a) * ring_r, math.sin(a) * ring_r, 0.02), (0, 0, a + math.pi / 2 + random.uniform(-0.06, 0.06)), m=random.choice(stone), bevel=0.012, segs=1, jitter=0.004))
    # the tower: a stone footing, the limewashed wall, the ledge, the pigeon holes, the cornice
    objs.append(cyl('dcfoot', R + 0.05, 0.4, (0, 0, 0.2), m=stone[1], verts=32, bevel=0.015))
    for k in range(22):                                          # (the footing's stones showing)
        a = 2 * math.pi * k / 22 + (0.07 if k % 2 else 0)
        objs.append(box('dcfstone', (0.2, 0.06, 0.13), (math.cos(a) * (R + 0.06), math.sin(a) * (R + 0.06), 0.1 + (k % 2) * 0.16), (0, 0, a + math.pi / 2), m=random.choice(stone), bevel=0.01, segs=1))
    wall = tube('dcwall', R, R, WALL, 0.38, lime, verts=40)                  # (no ends: smooth all round, its light true)
    for pl in wall.data.polygons: pl.use_smooth = True
    objs.append(wall)
    objs.append(ring('dcledge', R - 0.02, R + 0.08, 1.45, 0.07, stone[2]))      # (the ledge round it: no rat gets past)
    HZ = 1.78; NH = 12
    for k in range(NH):                                          # the pigeon holes, each with its landing ledge
        a = 2 * math.pi * (k + 0.5) / NH; c, s_ = math.cos(a), math.sin(a)
        objs.append(box('dchole', (0.1, 0.04, 0.13), (c * (R - 0.005), s_ * (R - 0.005), HZ), (0, 0, a + math.pi / 2), m=dark, bevel=0.0))
        objs.append(cyl('dcholetop', 0.05, 0.04, (c * (R - 0.005), s_ * (R - 0.005), HZ + 0.065), (math.pi / 2, 0, a + math.pi / 2), m=dark, verts=10, bevel=0.0))
        objs.append(box('dcperch', (0.16, 0.09, 0.025), (c * (R + 0.035), s_ * (R + 0.035), HZ - 0.075), (0, 0, a + math.pi / 2), m=stone[2], bevel=0.006, segs=1))
        objs.append(box('dcsurround', (0.16, 0.03, 0.02), (c * (R + 0.005), s_ * (R + 0.005), HZ + 0.115), (0, 0, a + math.pi / 2), m=stone[0], bevel=0.004, segs=1))
    objs.append(ring('dccornice', R - 0.02, R + 0.1, WALL - 0.02, 0.08, stone[2]))
    # the roof: courses of round tiles (open cones, each overlapping the one below), the lantern, the ball and the vane
    RR, RH, NC = R + 0.22, 0.95, 7
    for i in range(NC):
        u0, u1 = i / NC, (i + 1.25) / NC
        r0, r1 = RR * (1 - u0), RR * (1 - min(1, u1)) + 0.01; z0, z1 = WALL + 0.02 + RH * u0, WALL + 0.02 + RH * min(1, u1)
        objs.append(tube('dctiles', r1, r0, z1, z0 - 0.02, tiles[i % 3], verts=36))
        for k in range(int(36 * (1 - u0)) + 6):                     # (the round tiles' ridges down each course)
            a = 2 * math.pi * k / (int(36 * (1 - u0)) + 6) + i * 0.13
            objs.append(cyl('dcrib', 0.018, math.hypot(r0 - r1, z1 - z0) * 0.8, ((r0 + r1) / 2 * math.cos(a), (r0 + r1) / 2 * math.sin(a), (z0 + z1) / 2 - 0.005),
                            (0, -math.atan2(r0 - r1, z1 - z0), a), m=tiles[(i + k) % 3], verts=5, bevel=0.0))
    objs.append(cyl('dcroofcap', 0.03, 0.04, (0, 0, WALL + RH), m=tiles[1], verts=12, bevel=0.0))
    LZ = WALL + RH - 0.05
    objs.append(cyl('dclantbase', 0.17, 0.05, (0, 0, LZ), m=lime2, verts=6, bevel=0.006))
    for k in range(6):                                           # (its six little posts, open between)
        a = 2 * math.pi * k / 6
        objs.append(box('dclantpost', (0.03, 0.03, 0.2), (math.cos(a) * 0.14, math.sin(a) * 0.14, LZ + 0.12), (0, 0, a), m=lime2, bevel=0.004, segs=1))
    objs.append(cyl('dclantroof', 0.2, 0.17, (0, 0, LZ + 0.3), m=tiles[0], verts=6, r2=0.01, bevel=0.006))
    objs.append(sphere('dcball', 0.04, (0, 0, LZ + 0.42), m=gold, seg=12, rings=8))
    objs.append(cyl('dcvanerod', 0.007, 0.34, (0, 0, LZ + 0.58), m=iron, verts=5, bevel=0.0))
    objs.append(box('dcvanearrow', (0.36, 0.012, 0.012), (0, 0, LZ + 0.62), m=iron, bevel=0.0))
    objs.append(box('dcvanetail', (0.06, 0.008, 0.06), (-0.17, 0, LZ + 0.62), (0, math.radians(45), 0), m=iron, bevel=0.0))
    vd = Vector((0.02, 0, LZ + 0.68))                            # (the vane's own dove, gold, flying)
    objs.append(sphere('dcvanedove', 0.045, tuple(vd), (1.5, 0.45, 0.7), m=gold, seg=10, rings=6))
    objs.append(sphere('dcvanedove', 0.022, tuple(vd + Vector((0.065, 0, 0.022))), m=gold, seg=8, rings=5))
    for sd in (-1, 1): objs.append(box('dcvanewing', (0.05, 0.11, 0.008), tuple(vd + Vector((-0.005, sd * 0.05, 0.02))), (sd * math.radians(25), 0, 0), m=gold, bevel=0.0))
    # the door at the front: an arch of stones round it, green boards, two steps; a sack of grain by it
    DW, DH = 0.46, 0.92; fy = -R
    objs.append(box('dcdoor', (DW, 0.05, DH), (0, fy - 0.005, 0.4 + DH / 2), m=green, bevel=0.008, segs=1))
    for k in range(6):                                           # (its round top: slabs, narrower as they go up)
        z0 = k / 6 * DW / 2; w = 2 * math.sqrt(max(0.0, (DW / 2) ** 2 - (z0 + DW / 24) ** 2))
        objs.append(box('dcdoortop', (w, 0.05, DW / 12 + 0.002), (0, fy - 0.005, 0.4 + DH + z0 + DW / 24), m=green, bevel=0.0))
    for k in range(4):                                           # (the gaps between its boards, up into the round top)
        x = -DW / 2 + (k + 1) * DW / 5; top = DH + math.sqrt(max(0.0, (DW / 2) ** 2 - x * x)) - 0.03
        objs.append(box('dcboard', (0.008, 0.055, top), (x, fy - 0.01, 0.4 + top / 2), m=C('dcdoor2', '#416b4d', rough=0.6), bevel=0.0))
    objs.append(sphere('dcknob', 0.018, (0.15, fy - 0.045, 0.4 + DH * 0.48), m=iron, seg=8, rings=5))
    for k in range(9):                                           # (the arch of stones)
        a = math.pi * k / 8; rr = DW / 2 + 0.06
        objs.append(box('dcarch', (0.09, 0.07, 0.07), (math.cos(a) * rr, fy - 0.02, 0.4 + DH + math.sin(a) * rr), (0, -a + math.pi / 2, 0), m=random.choice(stone), bevel=0.008, segs=1))
    for sx in (-1, 1): objs.append(box('dcjamb', (0.09, 0.07, DH), (sx * (DW / 2 + 0.06), fy - 0.02, 0.4 + DH / 2), m=stone[k % 3 if sx > 0 else 1], bevel=0.008, segs=1))
    objs.append(box('dcstep', (0.7, 0.3, 0.2), (0, fy - 0.17, 0.1), m=stone[0], bevel=0.015, segs=1))
    objs.append(box('dcstep', (0.62, 0.22, 0.2), (0, fy - 0.08, 0.3), m=stone[2], bevel=0.015, segs=1))
    objs.append(sphere('dcsack', 0.13, (0.5, fy - 0.12, 0.13), (0.9, 0.8, 1.15), m=sack, seg=14, rings=9))
    objs.append(cyl('dcsacktop', 0.07, 0.06, (0.5, fy - 0.12, 0.29), m=sack, verts=10, r2=0.05, bevel=0.0))
    for k in range(14):                                          # (grain spilled on the step)
        objs.append(sphere('dcgrain', 0.008, (0.32 + random.uniform(-0.15, 0.15), fy - 0.2 + random.uniform(-0.12, 0.1), 0.205), (1, 1, 0.6), m=grain, seg=5, rings=3))
    # ivy up the left side
    for k in range(70):
        a = math.radians(random.uniform(150, 215)); z = random.uniform(0.35, 1.9) ** 1.0
        if z > 1.4 and random.random() < 0.6: continue
        d = Vector((math.cos(a), math.sin(a), random.uniform(-0.3, 0.5))).normalized()
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), random.uniform(0, 2 * math.pi))
        objs.append(flat_leaf('dcivy', (math.cos(a) * (R + 0.012), math.sin(a) * (R + 0.012), z), q, random.uniform(0.07, 0.1), random.uniform(0.04, 0.055), random.choice(ivy), shape='heart', both=False, fold=0.004))
    # hollyhocks by the door (on the right), tall stems with flowers up them
    for j, (hx, hy, hh) in enumerate(((0.62, -0.62, 1.25), (0.78, -0.48, 1.05), (0.5, -0.78, 0.9))):
        objs.append(cyl('dcstem', 0.012, hh, (hx, hy, hh / 2), m=leaf, verts=5, bevel=0.0))
        for k in range(5):
            objs.append(sphere('dchleaf', 0.06, (hx + random.uniform(-0.05, 0.05), hy + random.uniform(-0.05, 0.05), 0.1 + k * 0.08), (1.2, 1.2, 0.4), m=leaf, ico=1, disp=0.2, seed=j * 10 + k))
        for k in range(8):
            z = hh * (0.45 + 0.55 * k / 8); a = k * 2.4
            objs.append(sphere('dchflower', 0.035 - k * 0.002, (hx + math.cos(a) * 0.03, hy + math.sin(a) * 0.03, z), (1, 1, 0.55), m=holly[(j + k) % 3], seg=8, rings=5))
    # the doves' basin of water, on the right
    BX, BY = 0.95, 0.35
    objs.append(cyl('dcbasinfoot', 0.08, 0.35, (BX, BY, 0.175), m=stone[1], verts=12, r2=0.06, bevel=0.01))
    objs.append(cyl('dcbasin', 0.22, 0.08, (BX, BY, 0.39), m=stone[2], verts=20, r2=0.16, bevel=0.012))
    objs.append(cyl('dcbasinw', 0.19, 0.01, (BX, BY, 0.43), m=water, verts=20, bevel=0.0))
    # the doves: two on the ledges by the holes, one on the roof's edge, one on the basin's rim
    for a, z, look in ((math.radians(-60), HZ - 0.062, 0.4), (math.radians(-130), HZ - 0.062, -0.5)):
        p = (math.cos(a) * (R + 0.05), math.sin(a) * (R + 0.05), z); dove(objs, p, a, doveW, doveB, eyeM, look=look)
    a = math.radians(-100); dove(objs, (math.cos(a) * (RR - 0.05), math.sin(a) * (RR - 0.05), WALL + 0.06), a, doveW, doveB, eyeM, look=0.6)
    dove(objs, (BX - 0.2, BY - 0.02, 0.43), math.radians(170), doveW, doveB, eyeM, look=-0.3)
    return finish(objs, name)


# ------------------------------------------------------------------ level 44: the Red Tractor
def tyre(objs, c, r, w, axis_y, rubber, rim, hub, lugs=18, lug=0.05, name='rt'):
    """A wheel side on to y: a black tyre with chevron lugs round it, a cream rim, a red hub."""
    x, y, z = c
    objs.append(cyl(name + 'tyre', r - lug * 0.5, w, (x, y, z), (math.pi / 2, 0, 0), m=rubber, verts=28, bevel=0.02))
    for k in range(lugs):                                         # (the tread: a chevron of two bars at each step)
        a = 2 * math.pi * k / lugs
        for sd in (-1, 1):
            objs.append(box(name + 'lug', (lug * 1.3, w * 0.48, lug), (x + math.cos(a) * (r - lug * 0.45), y + sd * w * 0.25, z + math.sin(a) * (r - lug * 0.45)), (0, -a + math.pi / 2, sd * 0.45), m=rubber, bevel=0.006, segs=1))
    for sd in (-1, 1):
        objs.append(cyl(name + 'rim', r * 0.6, 0.02, (x, y + sd * (w / 2 - 0.004), z), (math.pi / 2, 0, 0), m=rim, verts=24, bevel=0.006))
        objs.append(cyl(name + 'hub', r * 0.2, 0.05, (x, y + sd * (w / 2 + 0.01), z), (math.pi / 2, 0, 0), m=hub, verts=14, bevel=0.008))
        for k in range(6):                                        # (the wheel nuts)
            a = 2 * math.pi * k / 6
            objs.append(cyl(name + 'nut', r * 0.03, 0.03, (x + math.cos(a) * r * 0.13, y + sd * (w / 2 + 0.04), z + math.sin(a) * r * 0.13), (math.pi / 2, 0, 0), m=hub, verts=6, bevel=0.0))


def tractor_dec(seed=111, name='tractor'):
    """A little vintage red tractor, no maker's name on it: big rear wheels with chevron treads and cream rims, small
    front wheels, a rounded red bonnet with a silver grille and two headlamps, a tall exhaust with a flap on its top, a
    steering wheel and a sprung pan seat, red mudguards over the big wheels; hitched behind, a wooden trailer with red
    sideboards loaded with straw bales and pumpkins. Parked on a patch of trodden earth with straw about, a bale and a
    pitchfork, a milk churn. Turned a little, so its front is seen. The exhaust's top at EXHAUST (main.js: its puffs)."""
    random.seed(seed); objs = []
    red = C('rtred', '#c8322b', rough=0.35, var=0.03); red2 = C('rtred2', '#b02a24', rough=0.4, var=0.03)
    cream = C('rtcream', '#f1e6cc', rough=0.45); grey = C('rtgrey', '#5d6166', rough=0.55, var=0.04); dark = C('rtdark', '#3a3d40', rough=0.6)
    rubber = C('rtrubber', '#2a2a2a', rough=0.9, var=0.03); silver = C('rtsilver', '#d4d8da', rough=0.25, metal=0.9)
    black = C('rtblack', '#1f1f1f', rough=0.5); seatM = C('rtseat', '#2c2c2c', rough=0.6)
    wood = [C('rtwood%d' % i, h, rough=0.8, var=0.1, grain=0.3) for i, h in enumerate(('#9a6b3f', '#8a5d36', '#a8784a'))]
    earth = C('rtearth', '#a08867', rough=0.95, var=0.06); earth2 = C('rtearth2', '#8f7a5c', rough=0.95, var=0.06)
    ms = straw_ms(); twine = C('vhtwinec', '#b8382e', rough=0.7)
    pump = C('rtpump', '#e0802e', rough=0.55); stalk = C('rtstalk', '#6b5a2e', rough=0.8)
    T = []                                                       # (the tractor and its trailer: turned together after)
    # ---- the tractor: its rear axle at the origin, its front towards +x
    tyre(T, (0, 0.6, 0.55), 0.55, 0.26, True, rubber, cream, red, lugs=20, lug=0.06)
    tyre(T, (0, -0.6, 0.55), 0.55, 0.26, True, rubber, cream, red, lugs=20, lug=0.06)
    for y in (0.42, -0.42): tyre(T, (1.38, y, 0.3), 0.3, 0.14, True, rubber, cream, red, lugs=0, lug=0.03)
    for y in (0.42, -0.42):                                       # (the front tyres' ribs)
        for k in range(3): T.append(ring('rtrib', 0.29, 0.305, 0, 0.012, rubber, verts=24)); T[-1].location = (1.38, y + (k - 1) * 0.04, 0.3); T[-1].rotation_euler = (math.pi / 2, 0, 0)
    T.append(cyl('rtaxle', 0.05, 1.0, (0, 0, 0.55), (math.pi / 2, 0, 0), m=grey, verts=12, bevel=0.0))
    T.append(box('rtfaxle', (0.1, 0.9, 0.1), (1.38, 0, 0.32), m=grey, bevel=0.012, segs=1))
    T.append(box('rtgearbox', (0.62, 0.5, 0.5), (0.18, 0, 0.62), m=grey, bevel=0.04, segs=2))
    T.append(box('rtengine', (0.75, 0.42, 0.34), (0.88, 0, 0.55), m=dark, bevel=0.03, segs=2))
    T.append(box('rtbonnet', (1.05, 0.5, 0.36), (0.98, 0, 0.88), m=red, bevel=0.12, segs=4))      # (rounded over the top)
    T.append(box('rtbonnetside', (1.0, 0.52, 0.06), (0.98, 0, 0.73), m=red2, bevel=0.02, segs=1))
    T.append(box('rtgrille', (0.06, 0.46, 0.44), (1.52, 0, 0.78), m=silver, bevel=0.03, segs=2))
    for k in range(6): T.append(box('rtslat', (0.02, 0.38, 0.018), (1.555, 0, 0.62 + k * 0.06), m=dark, bevel=0.0))
    T.append(box('rtweight', (0.14, 0.6, 0.14), (1.58, 0, 0.42), m=grey, bevel=0.02, segs=1))
    for y in (0.27, -0.27):                                       # (the headlamps, either side of the bonnet's front)
        T.append(cyl('rtlamp', 0.06, 0.09, (1.42, y, 0.98), (0, math.pi / 2, 0), m=red, verts=14, bevel=0.01))
        T.append(cyl('rtlampglass', 0.045, 0.01, (1.47, y, 0.98), (0, math.pi / 2, 0), m=cream, verts=14, bevel=0.0))
    T.append(cyl('rtcap', 0.04, 0.05, (1.25, 0, 1.08), m=silver, verts=10, bevel=0.006))      # (the radiator cap)
    T.append(cyl('rtexhaust', 0.032, 0.62, (1.12, 0.17, 1.27), m=black, verts=10, bevel=0.0))
    T.append(cyl('rtexflap', 0.042, 0.012, (1.12, 0.17, 1.585), (0.25, 0, 0), m=black, verts=10, bevel=0.0))
    T.append(cyl('rtcolumn', 0.025, 0.55, (0.38, 0, 1.12), (0, math.radians(-38), 0), m=dark, verts=8, bevel=0.0))
    T.append(cyl('rtdash', 0.12, 0.18, (0.48, 0, 1.0), (0, math.pi / 2, 0), m=red2, verts=14, bevel=0.01))
    wheel = ring('rtwheel', 0.15, 0.18, 0, 0.025, black, verts=28); wheel.location = (0.2, 0, 1.36); wheel.rotation_euler = (0, math.radians(-52), 0); T.append(wheel)
    for a in (0, 2.1, 4.2): T.append(plank('rtspoke', (0.2, 0, 1.36), (0.2 + math.cos(a) * 0.1 * math.cos(math.radians(52)), math.sin(a) * 0.15, 1.36 + math.cos(a) * 0.12), 0.02, 0.01, (1, 0, 1), black, jitter=0.0, bevel=0.0))
    T.append(cyl('rtseatstem', 0.02, 0.4, (-0.35, 0, 0.95), (0, math.radians(30), 0), m=dark, verts=6, bevel=0.0))
    T.append(cyl('rtseat', 0.2, 0.06, (-0.42, 0, 1.12), m=seatM, verts=18, r2=0.17, bevel=0.02))
    T.append(box('rtseatback', (0.06, 0.32, 0.14), (-0.6, 0, 1.2), (0, math.radians(-15), 0), m=seatM, bevel=0.03, segs=2))
    for sd in (-1, 1):                                            # the mudguards, curving over the big wheels
        pts = [Vector((math.cos(a) * 0.66, sd * 0.6, 0.55 + math.sin(a) * 0.66)) for a in [math.radians(15 + k * 15) for k in range(11)]]
        polyline(T, 'rtguard', pts, 0.34, 0.025, (0, 0, 1), red)
        T.append(box('rtstep', (0.4, 0.14, 0.03), (0.42, sd * 0.42, 0.42), m=grey, bevel=0.006, segs=1))
    for sd in (-1, 1): T.append(plank('rtlink', (-0.2, sd * 0.22, 0.5), (-0.72, sd * 0.32, 0.36), 0.05, 0.03, (0, 0, 1), grey, jitter=0.0, bevel=0.0))
    T.append(box('rtdrawbar', (0.6, 0.08, 0.05), (-0.78, 0, 0.42), m=grey, bevel=0.01, segs=1))
    # ---- the trailer, hitched behind: a bed on two wheels, red sideboards, straw bales and pumpkins
    TX = -1.85; L, W, BZ = 1.35, 0.95, 0.56
    T.append(box('rttbar', (0.6, 0.06, 0.06), (-1.0, 0, 0.44), (0, math.radians(-6), 0), m=grey, bevel=0.01, segs=1))
    T.append(box('rttbed', (L, W, 0.06), (TX, 0, BZ), m=wood[0], bevel=0.01, segs=1))
    for k in range(7): T.append(box('rttplank', (0.18, W - 0.02, 0.012), (TX - L / 2 + 0.1 + k * 0.19, 0, BZ + 0.035), m=random.choice(wood), bevel=0.003, segs=1))
    for sd in (-1, 1):
        for k in range(2): T.append(box('rttside', (L, 0.04, 0.12), (TX, sd * (W / 2 - 0.02), BZ + 0.1 + k * 0.13), m=red if k else red2, bevel=0.008, segs=1))
        for k in range(4): T.append(box('rttpost', (0.05, 0.05, 0.3), (TX - L / 2 + 0.06 + k * (L - 0.12) / 3, sd * (W / 2 - 0.02), BZ + 0.15), m=wood[1], bevel=0.006, segs=1))
        tyre(T, (TX, sd * (W / 2 + 0.14), 0.32), 0.32, 0.16, True, rubber, cream, red, lugs=12, lug=0.035, name='rtt')
    for k in range(2): T.append(box('rttend', (0.04, W, 0.12), (TX - L / 2 + 0.02, 0, BZ + 0.1 + k * 0.13), m=red if k else red2, bevel=0.008, segs=1))
    T.append(cyl('rttaxle', 0.035, W + 0.2, (TX, 0, 0.32), (math.pi / 2, 0, 0), m=grey, verts=8, bevel=0.0))
    for (bx, by, bz, yaw) in ((TX - 0.33, 0.21, BZ + 0.2, 0.0), (TX - 0.33, -0.21, BZ + 0.2, 0.03), (TX + 0.12, 0.21, BZ + 0.2, -0.04), (TX - 0.1, 0.0, BZ + 0.48, 0.08)):
        bale(T, (bx, by, bz), (0.42, 0.4, 0.28), yaw + math.pi / 2, ms, twine)
    for (x, y, r) in ((TX + 0.45, -0.2, 0.13), (TX + 0.48, 0.15, 0.11), (TX + 0.2, -0.22, 0.1)):      # (pumpkins at its front end)
        z = BZ + 0.05 + r * 0.8
        for k in range(6):
            a = k / 6 * math.tau
            T.append(sphere('rtpump', r * 0.62, (x + math.cos(a) * r * 0.38, y + math.sin(a) * r * 0.38, z), (1, 1, 0.82), m=pump, seg=8, rings=6))
        T.append(cyl('rtstalk', 0.014, 0.06, (x, y, z + r * 0.75), m=stalk, verts=6, r2=0.009, bevel=0.0))
    # turned so its front is towards the player and a little to the right; set back so it sits in the middle
    TURN, SHIFT = math.radians(-28), Vector((0.45, 0.12, 0))
    Rm = Matrix.Rotation(TURN, 4, 'Z')
    for o in T: o.matrix_basis = Matrix.Translation(SHIFT) @ Rm @ o.matrix_basis
    objs += T
    # ---- the ground: trodden earth, straw about, a bale and a pitchfork, a milk churn
    for k in range(9):
        a = 2 * math.pi * k / 9; r = random.uniform(1.0, 1.3)
        objs.append(cyl('rtpatch', random.uniform(0.6, 0.85), 0.012, (math.cos(a) * r * 0.9, math.sin(a) * r * 0.55, 0.006), m=random.choice((earth, earth2)), verts=14, bevel=0.0))
    objs.append(cyl('rtpatch', 1.1, 0.014, (0, 0, 0.007), (0, 0, 0), m=earth, verts=24, bevel=0.0)); objs[-1].scale = (1.85, 1.05, 1)
    for k in range(60):
        x, y = random.uniform(-1.9, 1.9), random.uniform(-1.0, 1.0)
        if (x / 2.0) ** 2 + (y / 1.1) ** 2 > 1: continue
        objs.append(plank('rtstraw', (x, y, 0.016), (x + random.uniform(-0.09, 0.09), y + random.uniform(-0.09, 0.09), 0.016), 0.01, 0.003, (0, 0, 1), random.choice(ms[1:]), jitter=0.0, bevel=0.0))
    bale(objs, (-1.05, -0.78, 0.14), (0.62, 0.34, 0.28), 0.35, ms, twine)
    a0, a1 = Vector((-0.7, -0.62, 0.02)), Vector((-0.95, -0.62, 0.95)); dv = (a1 - a0).normalized()      # (the pitchfork leaning on the bale, its tines up)
    objs.append(plank('rtforkshaft', tuple(a0), tuple(a1), 0.035, 0.035, (0, -1, 0), wood[2], jitter=0.0, bevel=0.0))
    objs.append(plank('rtforkbar', tuple(a1 + Vector((0, -0.07, 0))), tuple(a1 + Vector((0, 0.07, 0))), 0.02, 0.02, (0, 0, 1), silver, jitter=0.0, bevel=0.0))
    for k in range(3): objs.append(plank('rtfork', tuple(a1 + Vector((0, (k - 1) * 0.06, 0))), tuple(a1 + Vector((0, (k - 1) * 0.06, 0)) + dv * 0.26), 0.012, 0.012, (0, -1, 0), silver, jitter=0.0, bevel=0.0))
    churn = Vector((0.78, -1.02, 0))
    objs.append(cyl('rtchurn', 0.14, 0.42, tuple(churn + Vector((0, 0, 0.21))), m=silver, verts=16, r2=0.12, bevel=0.01))
    objs.append(cyl('rtchurnneck', 0.07, 0.12, tuple(churn + Vector((0, 0, 0.47))), m=silver, verts=12, r2=0.09, bevel=0.006))
    objs.append(cyl('rtchurnlid', 0.08, 0.04, tuple(churn + Vector((0, 0, 0.55))), m=red, verts=12, bevel=0.008))
    return finish(objs, name)


# ------------------------------------------------------------------ level 45: the Little Orchard
def fruit_tree(objs, x, y, h, kind, leaf, bark, fruit, seed):
    """A little fruit tree: a crooked trunk splitting into branches, a round crown of leaves over dark leafy cores (lighter
    on top), its fruit hanging round the outside of the crown: 'apple', 'pear' or 'plum'."""
    rnd = random.Random(seed)
    C0 = Vector((x, y, h * 0.7)); RC = h * 0.27
    T0, T1 = Vector((x, y, 0)), Vector((x + rnd.uniform(-0.05, 0.05), y + rnd.uniform(-0.05, 0.05), h * 0.42))
    objs.append(cyl('ortrunk', 0.075, (T1 - T0).length, tuple((T0 + T1) / 2), (T1 - T0).to_track_quat('Z', 'Y').to_euler(), m=bark, verts=8, r2=0.055, bevel=0.0))
    for k in range(4):                                            # (its branches, up and out into the crown)
        a = k / 4 * math.tau + rnd.uniform(-0.3, 0.3); B = C0 + Vector((math.cos(a) * RC * 0.55, math.sin(a) * RC * 0.55, rnd.uniform(-0.05, 0.12)))
        objs.append(cyl('orbranch', 0.04, (B - T1).length, tuple((T1 + B) / 2), (B - T1).to_track_quat('Z', 'Y').to_euler(), m=bark, verts=6, r2=0.022, bevel=0.0))
    cores = [(C0, RC * 0.72)]
    for k in range(7):
        a = k / 7 * math.tau + rnd.uniform(-0.3, 0.3); el = rnd.uniform(-0.25, 0.6)
        cores.append((C0 + Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el) * 0.85)) * RC * 0.5, RC * rnd.uniform(0.42, 0.55)))
    for i, (c, r) in enumerate(cores):
        objs.append(sphere('orcore', r, tuple(c), (1, 1, 0.9), (0, 0, rnd.uniform(0, 3)), m=leaf[0], ico=1, disp=0.3, disp_scale=4.0, seed=seed * 10 + i))
    for k in range(560):                                          # (leaves all over the crown's outside, lighter where the sun is)
        a = rnd.uniform(0, math.tau); el = math.asin(rnd.uniform(-0.55, 1.0))
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = C0 + Vector((d.x, d.y, d.z * 0.85)) * RC * rnd.uniform(0.92, 1.04)
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), rnd.uniform(0, math.tau)) @ Quaternion((1, 0, 0), rnd.uniform(0.25, 0.6))
        objs.append(flat_leaf('orleaf', tuple(p), q, rnd.uniform(0.075, 0.1), rnd.uniform(0.028, 0.036), leaf[min(3, 1 + (k % 2) + (1 if el > 0.5 else 0))], both=False, fold=0.005))
    for k in range(20 if kind != 'plum' else 26):                 # its fruit, round the outside, mostly from the middle down
        a = rnd.uniform(0, math.tau); el = rnd.uniform(-0.6, 0.45)
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = C0 + Vector((d.x, d.y, d.z * 0.85)) * RC * 1.03
        if kind == 'apple':
            r = rnd.uniform(0.05, 0.058); objs.append(sphere('orfruit', r, tuple(p), (1, 1, 0.92), m=fruit[k % len(fruit)], seg=7, rings=5))
        elif kind == 'pear':
            r = rnd.uniform(0.045, 0.052); objs.append(sphere('orfruit', r, tuple(p - Vector((0, 0, r * 0.3))), m=fruit[k % 2], seg=7, rings=5))
            objs.append(sphere('orfruit', r * 0.62, tuple(p + Vector((0, 0, r * 0.55))), m=fruit[k % 2], seg=6, rings=4))
        else:
            objs.append(sphere('orfruit', rnd.uniform(0.034, 0.04), tuple(p), (1, 1, 1.12), m=fruit[k % 2], seg=7, rings=5))


def orchard_dec(seed=121, name='orchard'):
    """A little orchard: five fruit trees in a square of meadow (three apples, red and rosy; a pear; a plum), a rustic
    fence of posts and two rails round it with a little gate open at the front, stepping stones in to the middle tree,
    long grass and wildflowers about the trunks, fallen apples in the grass; a ladder leaning into a front tree, a wicker
    basket of apples and a crate of them by the gate."""
    random.seed(seed); objs = []
    leaf = [C('orleaf%d' % i, h, rough=0.8, var=0.06, hue_var=0.012) for i, h in enumerate(('#2c5f24', '#3a7429', '#4a8731', '#5d9b3a'))]
    bark = C('orbark', '#6b5039', rough=0.9, var=0.1); wood = [C('orwood%d' % i, h, rough=0.85, var=0.1, grain=0.3) for i, h in enumerate(('#9a7650', '#8a6744', '#a8845c'))]
    red = [C('orred', '#c9302c', rough=0.5), C('orred2', '#b5262a', rough=0.5), C('orcheek', '#e9b44c', rough=0.5)]
    rosy = [C('orrosy', '#e0583e', rough=0.5), C('orrosy2', '#d84b37', rough=0.5), C('orcheek2', '#f1d064', rough=0.5)]
    pear = [C('orpear', '#c9cf4a', rough=0.55), C('orpear2', '#b9c23e', rough=0.55)]
    plum = [C('orplum', '#6b2f6e', rough=0.45), C('orplum2', '#5a2860', rough=0.45)]
    meadow = C('ormeadow', '#78a845', rough=0.95, var=0.05); grass = [C('orgrass%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#5f9a3a', '#6fab42', '#86bb50'))]
    stoneM = [C('orstone%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#8f8a7c', '#7f7a6d'))]
    wicker = C('orwicker', '#b98a4e', rough=0.85, var=0.08); fl = [C('orfl', '#fbf6ee', rough=0.6), C('orfl2', '#f4d03c', rough=0.6), C('orfl3', '#c9a0e0', rough=0.6)]
    X2, Y0, Y1 = 1.95, -1.7, 1.75
    objs.append(box('ormeadow', (2 * X2, Y1 - Y0, 0.02), (0, (Y0 + Y1) / 2, 0.01), m=meadow, bevel=0.0))
    # the trees: two at the front, one in the middle, two at the back
    TREES = [(-1.05, -0.8, 2.0, 'apple', red), (1.05, -0.75, 1.95, 'apple', rosy), (0.0, 0.3, 2.2, 'pear', pear), (-1.05, 1.15, 2.05, 'plum', plum), (1.05, 1.2, 2.1, 'apple', red)]
    for i, (x, y, h, kind, fr) in enumerate(TREES):
        fruit_tree(objs, x, y, h, kind, leaf, bark, fr, seed * 10 + i)
        for k in range(5): tuft(objs, x + math.cos(k * 1.3) * 0.25, y + math.sin(k * 1.3) * 0.25, 7, 0.1, 0.22, grass, z0=0.02, width=0.018)
        if kind == 'apple':                                       # (fallen apples in the grass under it)
            for k in range(3):
                a = random.uniform(0, math.tau); r = random.uniform(0.3, 0.55)
                objs.append(sphere('orfallen', 0.05, (x + math.cos(a) * r, y + math.sin(a) * r, 0.06), m=fr[k % 2], seg=7, rings=5))
    for k in range(34):                                           # (long grass and wildflowers about the meadow)
        x, y = random.uniform(-X2 + 0.15, X2 - 0.15), random.uniform(Y0 + 0.15, Y1 - 0.15)
        if abs(x) < 0.3 and y < 0.0: continue                     # (not on the stepping stones)
        tuft(objs, x, y, 6, 0.08, random.uniform(0.12, 0.2), grass, z0=0.02, width=0.015)
        if k % 3 == 0:
            for j in range(3): objs.append(sphere('orflower', 0.018, (x + random.uniform(-0.06, 0.06), y + random.uniform(-0.06, 0.06), random.uniform(0.12, 0.2)), (1, 1, 0.6), m=fl[k % 3], ico=1))
    for k, (x, y) in enumerate(((0.03, -1.4), (-0.08, -0.98), (0.06, -0.55))):      # (grey stepping stones in from the gate, set low in the grass)
        objs.append(cyl('orstep', random.uniform(0.11, 0.13), 0.025, (x, y, 0.02), (0, 0, random.uniform(0, 3)), m=stoneM[k % 2], verts=9, bevel=0.008))
    # the fence: posts and two rails round it, a gap at the front for the gate
    def rails(a, b):
        A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); L = (B - A).length; n = max(1, round(L / 0.6))
        for k in range(n + 1):
            p = A + (B - A) * k / n; objs.append(box('orpost', (0.08, 0.08, 0.62), (p.x, p.y, 0.31), (0, 0, random.uniform(-0.05, 0.05)), m=random.choice(wood), bevel=0.012, segs=1, jitter=0.005))
        for z in (0.24, 0.5):
            objs.append(plank('orrail', (A.x, A.y, z), (B.x, B.y, z), 0.07, 0.04, (0, 0, 1), random.choice(wood), jitter=0.4, bevel=0.006))
    rails((-X2, Y0), (-0.42, Y0)); rails((0.42, Y0), (X2, Y0)); rails((X2, Y0), (X2, Y1)); rails((X2, Y1), (-X2, Y1)); rails((-X2, Y1), (-X2, Y0))
    # the little gate, open inwards on its post at the right
    hinge = Vector((0.42, Y0, 0)); ga = math.radians(115); gd = Vector((math.cos(ga), math.sin(ga), 0)); GW = 0.8
    for z in (0.16, 0.44): objs.append(plank('orgate', tuple(hinge + Vector((0, 0, z))), tuple(hinge + gd * GW + Vector((0, 0, z))), 0.07, 0.035, (0, 0, 1), wood[2], jitter=0.0, bevel=0.006))
    for u in (0.03, GW - 0.03): objs.append(box('orgatestile', (0.06, 0.04, 0.42), tuple(hinge + gd * u + Vector((0, 0, 0.3))), (0, 0, ga), m=wood[2], bevel=0.006, segs=1))
    objs.append(plank('orgatebrace', tuple(hinge + gd * 0.05 + Vector((0, 0, 0.18))), tuple(hinge + gd * (GW - 0.05) + Vector((0, 0, 0.42))), 0.05, 0.03, (-gd.y, gd.x, 0), wood[1], jitter=0.0, bevel=0.0))
    # a ladder leaning into the front right tree
    L0, L1 = Vector((0.62, -1.2, 0.0)), Vector((0.95, -0.92, 1.55)); side = Vector((0.8, -0.6, 0)).normalized() * 0.17
    for sd in (-1, 1): objs.append(plank('orladder', tuple(L0 + side * sd), tuple(L1 + side * sd), 0.045, 0.03, (0.6, 0.8, 0), wood[0], jitter=0.0, bevel=0.0))
    for k in range(1, 7):
        p = L0 + (L1 - L0) * k / 7.2; objs.append(plank('orrung', tuple(p - side), tuple(p + side), 0.03, 0.025, (0, 0, 1), wood[1], jitter=0.0, bevel=0.0))
    # a wicker basket of apples and a crate of them by the gate
    BK = Vector((-0.8, -1.32, 0))
    objs.append(cyl('orbasket', 0.17, 0.2, tuple(BK + Vector((0, 0, 0.12))), m=wicker, verts=18, r2=0.2, bevel=0.01))
    objs.append(ring('orbasketrim', 0.18, 0.215, 0.225, 0.03, wicker, verts=24)); objs[-1].location = tuple(BK + Vector((0, 0, 0.225)))
    for k in range(6): objs.append(plank('orweave', tuple(BK + Vector((math.cos(k * 1.05) * 0.18, math.sin(k * 1.05) * 0.18, 0.03))), tuple(BK + Vector((math.cos(k * 1.05) * 0.205, math.sin(k * 1.05) * 0.205, 0.21))), 0.015, 0.012, (math.cos(k * 1.05), math.sin(k * 1.05), 0), C('orwicker2', '#a17543', rough=0.85), jitter=0.0, bevel=0.0))
    for k in range(7):
        a = k / 7 * math.tau; r = 0.09 if k else 0.0
        objs.append(sphere('orbasketapple', 0.05, tuple(BK + Vector((math.cos(a) * r, math.sin(a) * r, 0.24 + (0.04 if not k else 0)))), m=red[k % 2], seg=7, rings=5))
    CR = Vector((-1.35, -1.25, 0))
    for z in (0.05, 0.15, 0.25):
        for sd in (-1, 1):
            objs.append(box('orcrate', (0.46, 0.02, 0.07), tuple(CR + Vector((0, sd * 0.16, z))), m=random.choice(wood), bevel=0.004, segs=1))
            objs.append(box('orcrate', (0.02, 0.32, 0.07), tuple(CR + Vector((sd * 0.22, 0, z))), m=random.choice(wood), bevel=0.004, segs=1))
    for i in range(4):
        for j in range(3): objs.append(sphere('orcrateapple', 0.048, tuple(CR + Vector((-0.15 + i * 0.1, -0.1 + j * 0.1, 0.28))), m=rosy[(i + j) % 2], seg=7, rings=5))
    return finish(objs, name)


def flag(objs, a, b, c, m, name='thflag'):
    """A little triangle of cloth (a bunting flag): its corners a, b, c, both faces."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    A, B, Cc = Vector(a), Vector(b), Vector(c); n = (B - A).cross(Cc - A).normalized() * 0.002
    f = [bm.verts.new(v) for v in (A, B, Cc)]; bm.faces.new(f)
    g = [bm.verts.new(v - n) for v in (A, B, Cc)]; bm.faces.new(g[::-1])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for pl in o.data.polygons: pl.use_smooth = False
    objs.append(o)


def leafy(objs, C0, R, n, leaf, seed, sq=0.85, cores=7):
    """A big clump of leaves: dark leafy cores inside, little leaves all over its outside, lighter where the sun is."""
    rnd = random.Random(seed)
    objs.append(sphere('thcore', R * 0.74, tuple(C0), (1, 1, sq), (0, 0, rnd.uniform(0, 3)), m=leaf[0], ico=1, disp=0.3, disp_scale=4.0, seed=seed))
    for k in range(cores):
        a = k / cores * math.tau + rnd.uniform(-0.3, 0.3); el = rnd.uniform(-0.3, 0.6)
        c = C0 + Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el) * sq)) * R * 0.5
        objs.append(sphere('thcore', R * rnd.uniform(0.42, 0.55), tuple(c), (1, 1, 0.9), (0, 0, rnd.uniform(0, 3)), m=leaf[0], ico=1, disp=0.3, disp_scale=4.0, seed=seed * 10 + k))
    for k in range(n):
        a = rnd.uniform(0, math.tau); el = math.asin(rnd.uniform(-0.5, 1.0))
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = C0 + Vector((d.x, d.y, d.z * sq)) * R * rnd.uniform(0.92, 1.04)
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), rnd.uniform(0, math.tau)) @ Quaternion((1, 0, 0), rnd.uniform(0.25, 0.6))
        objs.append(flat_leaf('thleaf', tuple(p), q, rnd.uniform(0.1, 0.13), rnd.uniform(0.036, 0.046), leaf[min(3, 1 + (k % 2) + (1 if el > 0.45 else 0))], both=False, fold=0.006))


SWING_AT = Vector((1.45, 0.563, 2.37))      # (the tree house's swing: where it swings from, Blender's axes)


def tree_house_dec(seed=131, name='tree_house', part=None):
    """(part: None all of it, as in the pictures; for the game 'house' all but the swing, 'swing' its ropes and seat about
    the point it swings from (SWING_AT), the browser swings it: main.js treeSwing)
    A tree house: a big old oak with its roots spread, a deck up in it on two posts and braces, with a railing round it;
    on the deck a little cabin of blue boards with a steep roof of red shingles (its gable to the front), a round window
    with a box of flowers, a yellow door with a lantern by it, a stovepipe; a wooden ladder up to the deck, bunting from
    the roof down to the railing, a rope swing on a long low branch, a bucket on a rope; grass, toadstools by the roots."""
    random.seed(seed); objs = []
    leaf = [C('thleaf%d' % i, h, rough=0.8, var=0.06, hue_var=0.012) for i, h in enumerate(('#2b5a22', '#386f28', '#478430', '#5b9939'))]
    bark = [C('thbark', '#6a4e38', rough=0.95, var=0.12), C('thbark2', '#5b432f', rough=0.95, var=0.12)]
    wood = [C('thwood%d' % i, h, rough=0.85, var=0.1, grain=0.3) for i, h in enumerate(('#a07a52', '#8f6b47', '#b08a60'))]
    blue = [C('thblue', '#7fb0c6', rough=0.8, var=0.05), C('thblue2', '#76a7bd', rough=0.8, var=0.05)]
    trim = C('thtrim', '#f3eee2', rough=0.7); door = C('thdoor', '#e3b03f', rough=0.7); glass = C('glass', '#3e5767', rough=0.25)      # ('glass', 'lamp': lit at night in the game)
    tiles = [C('thtile%d' % i, h, rough=0.75, var=0.06) for i, h in enumerate(('#a9473a', '#b85a44', '#9b3f33'))]
    rope = C('thrope', '#d6c197', rough=0.9); iron = C('thiron', '#3b3b3e', rough=0.5)
    grassM = C('thgrass', '#74a443', rough=0.95, var=0.05); grass = [C('thgr%d' % i, h, rough=0.85, var=0.06) for i, h in enumerate(('#5f9a3a', '#6fab42', '#86bb50'))]
    fl = [C('thfl', '#e0414a', rough=0.6), C('thfl2', '#f4d03c', rough=0.6), C('thfl3', '#f7f2ea', rough=0.6)]
    flagsM = [C('thfg%d' % i, h, rough=0.7) for i, h in enumerate(('#e35d5b', '#f2c14e', '#5fa8d3', '#7bc47f', '#f4f1ea'))]
    cap = C('thcap', '#c9302c', rough=0.6); stem = C('thstem', '#f1ead8', rough=0.7)
    TX, TY = 0.0, 0.9                        # the trunk
    PZ, PX, PY0, PY1 = 1.5, 0.95, -0.85, 0.62  # the deck: its height, half its width, its front and back
    CX, CY0, CY1, WH = 0.62, -0.22, 0.45, 0.85  # the cabin: half its width, its front and back, its walls' height
    # the oak: a thick trunk flaring at its foot, roots spread over the grass, big limbs up into its crown
    objs.append(cyl('thtrunk', 0.34, 3.0, (TX, TY, 1.5), m=bark[0], verts=14, r2=0.22, bevel=0.0))
    for k in range(7):
        a = k / 7 * math.tau + random.uniform(-0.25, 0.25); L = random.uniform(0.45, 0.7)
        A = Vector((TX + math.cos(a) * 0.2, TY + math.sin(a) * 0.2, 0.3)); B = Vector((TX + math.cos(a) * (0.3 + L), TY + math.sin(a) * (0.3 + L), 0.03))
        objs.append(cyl('throot', 0.13, (B - A).length, tuple((A + B) / 2), (B - A).to_track_quat('Z', 'Y').to_euler(), m=bark[k % 2], verts=8, r2=0.04, bevel=0.0))
    LIMBS = [((0, 0, 2.6), (-1.05, 0.75, 3.25), 0.13), ((0, 0, 2.8), (0.85, 0.95, 3.5), 0.13), ((0, 0, 2.9), (0.1, 1.2, 3.9), 0.12), ((0, 0, 2.95), (-0.4, 0.6, 3.95), 0.1)]
    for a, b, r in LIMBS:
        A = Vector((TX + a[0], TY + a[1], a[2])); B = Vector(b)
        objs.append(cyl('thlimb', r, (B - A).length, tuple((A + B) / 2), (B - A).to_track_quat('Z', 'Y').to_euler(), m=bark[0], verts=8, r2=r * 0.5, bevel=0.0))
    SW = (Vector((TX + 0.15, TY - 0.05, 2.25)), Vector((1.78, 0.5, 2.5)))      # (the long low branch the swing hangs from, bending up at its end)
    objs.append(cyl('thlimb', 0.1, (SW[1] - SW[0]).length, tuple((SW[0] + SW[1]) / 2), (SW[1] - SW[0]).to_track_quat('Z', 'Y').to_euler(), m=bark[1], verts=8, r2=0.06, bevel=0.0))
    for a, b, r in ((SW[1] - Vector((0.04, 0, 0.02)), Vector((2.0, 0.55, 2.85)), 0.06), (SW[0] + (SW[1] - SW[0]) * 0.55, Vector((1.0, 0.25, 2.95)), 0.05)):
        objs.append(cyl('thtwig', r, (b - a).length, tuple((a + b) / 2), (b - a).to_track_quat('Z', 'Y').to_euler(), m=bark[1], verts=6, r2=r * 0.5, bevel=0.0))
    leafy(objs, Vector((0.0, 0.85, 3.85)), 1.3, 1150, leaf, seed * 10 + 1)
    leafy(objs, Vector((-1.15, 0.75, 3.3)), 0.62, 300, leaf, seed * 10 + 2, cores=4)
    leafy(objs, Vector((1.7, 0.6, 2.95)), 0.55, 260, leaf, seed * 10 + 3, cores=4)
    # the deck: two posts at the front, its frame, boards across, braces back to the trunk
    for x in (-PX + 0.08, PX - 0.08):
        objs.append(box('thpost', (0.1, 0.1, PZ - 0.17), (x, PY0 + 0.08, (PZ - 0.17) / 2), m=wood[1], bevel=0.01, segs=1))
        objs.append(plank('thbrace', (x, PY0 + 0.08, PZ - 0.55), (x, PY0 + 0.6, PZ - 0.08), 0.07, 0.05, (1, 0, 0), wood[0], jitter=0.0, bevel=0.0))
    for y in (PY0 + 0.05, PY1 - 0.05): objs.append(box('thbeam', (2 * PX, 0.1, 0.12), (0, y, PZ - 0.1), m=wood[1], bevel=0.008, segs=1))
    for x in (-PX + 0.05, PX - 0.05): objs.append(box('thbeam', (0.1, PY1 - PY0 - 0.22, 0.11), (x, (PY0 + PY1) / 2, PZ - 0.105), m=wood[1], bevel=0.008, segs=1))
    for sd in (-1, 1): objs.append(plank('thbrace', (TX + sd * 0.2, TY - 0.15, PZ - 0.85), (sd * (PX - 0.1), PY1 - 0.1, PZ - 0.12), 0.08, 0.06, (0, -1, 0), wood[0], jitter=0.0, bevel=0.0))
    n = int(round((PY1 - PY0) / 0.13))
    for k in range(n):
        y = PY0 + (k + 0.5) * (PY1 - PY0) / n
        objs.append(box('thdeck', (2 * PX + 0.04, (PY1 - PY0) / n - 0.012, 0.035), (random.uniform(-0.01, 0.01), y, PZ - 0.02), m=random.choice(wood), bevel=0.0, segs=1))
    # the railing: posts, a top rail and a middle one, round the front and the sides (a gap at the front left for the ladder)
    def railing(a, b, first=True):
        A, B = Vector((a[0], a[1], PZ)), Vector((b[0], b[1], PZ)); L = (B - A).length; nn = max(1, round(L / 0.45))
        if True:
            for k in range(0 if first else 1, nn + 1):
                q = A + (B - A) * k / nn; objs.append(box('thrpost', (0.055, 0.055, 0.58), (q.x, q.y, PZ + 0.29), m=wood[2], bevel=0.0, segs=1))
        for z in (0.3, 0.56): objs.append(plank('thrail', tuple(A + Vector((0, 0, z))), tuple(B + Vector((0, 0, z))), 0.06, 0.035, (0, 0, 1), random.choice(wood), jitter=0.3, bevel=0.0))
    LG = -PX + 0.42                             # (where the ladder comes up)
    railing((LG, PY0 + 0.03), (PX - 0.03, PY0 + 0.03)); railing((PX - 0.03, PY0 + 0.03), (PX - 0.03, PY1 - 0.03), first=False); railing((-PX + 0.03, PY0 + 0.25), (-PX + 0.03, PY1 - 0.03))
    objs.append(box('thrpost', (0.055, 0.055, 0.58), (-PX + 0.03, PY0 + 0.03, PZ + 0.29), m=wood[2], bevel=0.0, segs=1))
    # the cabin: boards up and down (its front up to the gable), white corners, a steep roof of shingles, its ridge front to back
    RISE = 0.6; th = RISE / CX; ZW = PZ + WH
    for k in range(13):
        x = -CX + (k + 0.5) * 2 * CX / 13; top = ZW + (CX - abs(x)) * th - 0.03
        for y, nrm in ((CY0, -1), (CY1, 1)): objs.append(plank('thboard', (x, y, PZ), (x, y, top), 2 * CX / 13 - 0.008, 0.03, (0, nrm, 0), blue[k % 2], jitter=0.2, bevel=0.0))
    for k in range(7):
        y = CY0 + (k + 0.5) * (CY1 - CY0) / 7
        for x, nrm in ((-CX, -1), (CX, 1)): objs.append(plank('thboard', (x, y, PZ), (x, y, ZW), (CY1 - CY0) / 7 - 0.008, 0.03, (nrm, 0, 0), blue[k % 2], jitter=0.2, bevel=0.0))
    for x in (-CX, CX):
        for y in (CY0, CY1): objs.append(box('thcorner', (0.06, 0.06, WH), (x, y, PZ + WH / 2), m=trim, bevel=0.0, segs=1))
    OV = 0.12; ZE = ZW - OV * th; ZR = ZW + RISE
    for sd in (-1, 1):                          # (the shingles, in courses from the eaves up, each course over the one below)
        E = Vector((sd * (CX + OV), 0, ZE)); Rr = Vector((0, 0, ZR)); u = (Rr - E).normalized(); nrm = Vector((sd * u.z, 0, -sd * u.x * -1)).normalized()
        nrm = Vector((sd * math.sin(math.atan(th)), 0, math.cos(math.atan(th))))
        Ls = (Rr - E).length; rows = int(Ls / 0.1) + 1
        for r_ in range(rows):
            s0 = min(r_ * 0.1, Ls - 0.13); off = 0.05 if r_ % 2 else 0.0
            yy = CY0 - OV - 0.02 + off
            while yy < CY1 + OV:
                a = E + u * s0 + Vector((0, yy + 0.06, 0)) + nrm * (0.012 + r_ * 0.0015)
                objs.append(plank('thtile', tuple(a), tuple(a + u * 0.15), 0.115, 0.02, tuple(nrm), random.choice(tiles), jitter=1.2, bevel=0.0))
                yy += 0.12
    objs.append(box('thridge', (0.07, CY1 - CY0 + 2 * OV + 0.04, 0.06), (0, (CY0 + CY1) / 2, ZR + 0.02), m=tiles[2], bevel=0.0, segs=1))
    for sd in (-1, 1):                          # (white barge boards along the gable's edges)
        objs.append(plank('thbarge', (sd * (CX + OV), CY0 - OV - 0.01, ZE - 0.03), (0, CY0 - OV - 0.01, ZR + 0.01), 0.1, 0.03, (0, -1, 0), trim, jitter=0.0, bevel=0.0))
    # its front: a yellow door, a round window with a cross and a box of flowers, a little round window in the gable, a lantern
    DX = 0.25; FY = CY0 - 0.03
    objs.append(box('thdoor', (0.36, 0.03, 0.66), (DX, FY - 0.005, PZ + 0.33), m=door, bevel=0.006, segs=1))
    for zz in (0.12, 0.54): objs.append(box('thdoorbar', (0.3, 0.015, 0.05), (DX, FY - 0.025, PZ + zz), m=C('thdoor2', '#d39c30', rough=0.7), bevel=0.0, segs=1))
    objs.append(sphere('thknob', 0.02, (DX - 0.12, FY - 0.035, PZ + 0.34), m=iron, seg=8, rings=6))
    for a, b in (((DX - 0.21, FY - 0.02, PZ), (DX - 0.21, FY - 0.02, PZ + 0.71)), ((DX + 0.21, FY - 0.02, PZ), (DX + 0.21, FY - 0.02, PZ + 0.71)), ((DX - 0.24, FY - 0.02, PZ + 0.7), (DX + 0.24, FY - 0.02, PZ + 0.7))):
        objs.append(plank('thdoorframe', a, b, 0.05, 0.03, (0, -1, 0), trim, jitter=0.0, bevel=0.0))
    WX, WZ = -0.3, PZ + 0.48
    objs.append(cyl('thwin', 0.15, 0.03, (WX, FY - 0.01, WZ), (math.pi / 2, 0, 0), m=glass, verts=20, bevel=0.0))
    objs.append(ring('thwinframe', 0.145, 0.19, 0, 0.04, trim, verts=24)); objs[-1].location = (WX, FY - 0.02, WZ); objs[-1].rotation_euler = (math.pi / 2, 0, 0)
    objs.append(box('thwinbar', (0.3, 0.02, 0.025), (WX, FY - 0.03, WZ), m=trim, bevel=0.0, segs=1)); objs.append(box('thwinbar', (0.025, 0.02, 0.3), (WX, FY - 0.03, WZ), m=trim, bevel=0.0, segs=1))
    objs.append(box('thflowerbox', (0.36, 0.1, 0.08), (WX, FY - 0.07, WZ - 0.25), m=wood[1], bevel=0.006, segs=1))
    for k in range(9):
        objs.append(sphere('thbloom', 0.03, (WX - 0.15 + k * 0.0375, FY - 0.07 + random.uniform(-0.03, 0.03), WZ - 0.18 + random.uniform(0, 0.03)), m=fl[k % 2] if k % 3 else grass[1], ico=1))
    GZ = ZW + 0.26
    objs.append(cyl('thgwin', 0.075, 0.03, (0, FY - 0.01, GZ), (math.pi / 2, 0, 0), m=glass, verts=16, bevel=0.0))
    objs.append(ring('thgwinframe', 0.07, 0.1, 0, 0.035, trim, verts=20)); objs[-1].location = (0, FY - 0.02, GZ); objs[-1].rotation_euler = (math.pi / 2, 0, 0)
    LX = DX + 0.3                                # (a lantern on a bracket by the door)
    objs.append(plank('thbracket', (LX, FY, PZ + 0.82), (LX, FY - 0.14, PZ + 0.82), 0.025, 0.02, (0, 0, 1), iron, jitter=0.0, bevel=0.0))
    objs.append(box('thlantern', (0.07, 0.07, 0.1), (LX, FY - 0.14, PZ + 0.72), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.0, segs=1))
    objs.append(cyl('thlanterntop', 0.055, 0.04, (LX, FY - 0.14, PZ + 0.79), m=iron, verts=4, r2=0.01, bevel=0.0))
    objs.append(cyl('thpipe', 0.04, 0.5, (0.32, CY1 - 0.12, ZR - 0.05), m=iron, verts=10, bevel=0.0))
    objs.append(cyl('thpipecap', 0.075, 0.05, (0.32, CY1 - 0.12, ZR + 0.22), m=iron, verts=10, r2=0.02, bevel=0.0))
    # the ladder up to the deck, at the front left
    L0, L1 = Vector((LG - 0.21, PY0 - 0.55, 0.0)), Vector((LG - 0.21, PY0 - 0.02, PZ + 0.5))
    for sd in (-1, 1): objs.append(plank('thladder', tuple(L0 + Vector((sd * 0.17, 0, 0))), tuple(L1 + Vector((sd * 0.17, 0, 0))), 0.05, 0.035, (0, -1, 0.3), wood[0], jitter=0.0, bevel=0.0))
    for k in range(1, 8):
        q = L0 + (L1 - L0) * k / 8.4; objs.append(plank('thrung', tuple(q - Vector((0.17, 0, 0))), tuple(q + Vector((0.17, 0, 0))), 0.035, 0.03, (0, 0, 1), wood[1], jitter=0.0, bevel=0.0))
    # bunting from the gable's top down to the railing's front corners
    for end in (Vector((LG, PY0 + 0.03, PZ + 0.58)), Vector((PX - 0.03, PY0 + 0.03, PZ + 0.58))):
        S0 = Vector((0, CY0 - OV - 0.03, ZR - 0.04)); pts = []
        for k in range(13):
            u = k / 12; pts.append(S0 + (end - S0) * u - Vector((0, 0, math.sin(u * math.pi) * 0.12)))
        polyline(objs, 'thstring', [tuple(q) for q in pts], 0.008, 0.008, (0, -1, 0), rope)
        for k in range(1, 12, 2):
            a, b = pts[k], pts[k + 1]; mid = (a + b) / 2
            flag(objs, a, b, mid - Vector((0, 0, 0.13)), flagsM[(k // 2 + (0 if end.x < 0 else 2)) % 5])
    # the swing on its long low branch: two ropes, a plank seat
    swing = []; SY = SW[0].y + (SW[1].y - SW[0].y) * 0.82
    for x in (1.28, 1.62):
        top = SW[0] + (SW[1] - SW[0]) * ((x - SW[0].x) / (SW[1].x - SW[0].x))
        swing.append(cyl('thswingrope', 0.012, top.z - 0.08 - 0.5, (x, SY, (top.z - 0.08 + 0.5) / 2), m=rope, verts=6, bevel=0.0))
    swing.append(box('thseat', (0.46, 0.17, 0.035), (1.45, SY, 0.5), m=wood[2], bevel=0.006, segs=1))
    # a bucket on a rope from a little arm at the deck's right
    objs.append(plank('tharm', (PX - 0.03, PY0 + 0.45, PZ + 0.56), (PX + 0.28, PY0 + 0.45, PZ + 0.62), 0.05, 0.04, (0, 0, 1), wood[1], jitter=0.0, bevel=0.0))
    objs.append(cyl('thpulley', 0.045, 0.025, (PX + 0.25, PY0 + 0.45, PZ + 0.55), (0, math.pi / 2, 0), m=iron, verts=10, bevel=0.0))
    objs.append(cyl('thbucketrope', 0.008, PZ + 0.5 - 0.72, (PX + 0.25, PY0 + 0.45, (PZ + 0.5 + 0.72) / 2), m=rope, verts=5, bevel=0.0))
    objs.append(cyl('thbucket', 0.1, 0.17, (PX + 0.25, PY0 + 0.45, 0.62), m=wood[0], verts=12, r2=0.12, bevel=0.0))
    objs.append(ring('thbucketband', 0.1, 0.12, 0, 0.025, iron, verts=16)); objs[-1].location = (PX + 0.25, PY0 + 0.45, 0.66)
    # grass, toadstools by the roots
    for k in range(26):
        a = random.uniform(0, math.tau); r = random.uniform(0.55, 1.65); x, y = 0.2 + math.cos(a) * r, -0.05 + math.sin(a) * r
        if abs(x - (LG - 0.21)) < 0.3 and -1.5 < y < -0.8: continue
        tuft(objs, x, y, 6, 0.08, random.uniform(0.1, 0.18), grass, z0=0.02, width=0.016)
    for k, (x, y, s) in enumerate(((-0.55, 1.25, 1.0), (-0.42, 1.38, 0.7), (0.62, 1.35, 0.85), (0.5, 0.42, 0.6))):
        objs.append(cyl('thstemm', 0.025 * s, 0.09 * s, (x, y, 0.045 * s), m=stem, verts=8, bevel=0.0))
        objs.append(sphere('thcap', 0.07 * s, (x, y, 0.09 * s), (1, 1, 0.55), m=cap, seg=10, rings=6))
        for j in range(3): objs.append(sphere('thspot', 0.012 * s, (x + math.cos(j * 2.1) * 0.035 * s, y + math.sin(j * 2.1) * 0.035 * s, 0.115 * s), m=stem, seg=6, rings=4))
    if part == 'swing':
        for o in swing: o.matrix_basis = Matrix.Translation(-SWING_AT) @ o.matrix_basis
        keep = swing
    else:
        keep = objs + (swing if part is None else [])
    for o in objs + swing:
        if not any(o is k for k in keep): bpy.data.objects.remove(o, do_unlink=True)
    return finish(keep, name)


GRAND = {'fountain': fountain_dec, 'rose_arbour': rose_arbour_dec, 'dovecote': dovecote_dec, 'tractor': tractor_dec, 'orchard': orchard_dec, 'tree_house': tree_house_dec}
