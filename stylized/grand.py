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


def lathe_band(name, prof, a0, a1, m, segs=4):
    """A piece of a surface of turning (a balloon's gore): the profile prof [(z, r), ...] turned from angle a0 to a1,
    segs steps across; smooth, both faces wound outwards."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rows = []
    for z, r in prof:
        row = []
        for k in range(segs + 1):
            a = a0 + (a1 - a0) * k / segs; rr = max(r, 1e-4)
            row.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z)))
        rows.append(row)
    for i in range(len(rows) - 1):
        for k in range(segs):
            if prof[i + 1][1] < 1e-3: bm.faces.new((rows[i][k], rows[i][k + 1], rows[i + 1][k]))
            else: bm.faces.new((rows[i][k], rows[i][k + 1], rows[i + 1][k + 1], rows[i + 1][k]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for pl in o.data.polygons: pl.use_smooth = True
    return o


BALLOON_LIFT = 0.32       # (the Hot-Air Balloon: how high its basket floats over the grass; its floating part's origin)


def hot_air_balloon_dec(seed=141, name='hot_air_balloon', part=None):
    """(part: None all of it, as in the pictures; for the game 'ground' what stays on the grass, 'float' the balloon and
    its basket, about the grass under it: the browser bobs it, main.js balloonBob)
    A hot-air balloon tethered on the farm, its basket floating a little over the grass as if about to go up: a tall
    envelope of sixteen gores in red, cream and gold with a sky-blue band round its middle and a scalloped skirt, a crown
    ring on top; load lines down to a burner on four poles over a wicker basket with a leather rim, sandbags hanging from
    it, a little pennant; four ropes down to stakes in the grass, a wooden step to climb in by, a coil of rope, two more
    sandbags and a wicker hamper on the grass."""
    random.seed(seed); objs = []; flo = []
    red = C('hbred', '#d8453b', rough=0.55); cream = C('hbcream', '#f4ead2', rough=0.6); gold = C('hbgold', '#f2b84a', rough=0.55)
    blue = C('hbblue', '#5fa8d3', rough=0.55); white = C('hbwhite', '#fbf7ee', rough=0.6)
    wicker = [C('hbwicker', '#b98a4e', rough=0.85, var=0.08), C('hbwicker2', '#a77a42', rough=0.85, var=0.08)]
    leather = C('hbleather', '#6b3f26', rough=0.6); rope = C('hbrope', '#d6c197', rough=0.9); steel = C('hbsteel', '#5a5d63', rough=0.4, metal=0.6)
    sack = C('hbsack', '#9e8558', rough=0.95, var=0.06); wood = [C('hbwood%d' % i, h, rough=0.85, var=0.1, grain=0.3) for i, h in enumerate(('#9a7650', '#8a6744'))]
    flame = C('lamp', '#ffb347', rough=0.3, emission=('#ffa030', 1.0))
    L = BALLOON_LIFT
    BZ0, BZ1, BW = L, L + 0.62, 0.42             # the basket: its bottom, its rim, half its width
    BU = BZ1 + 0.62                              # the burner
    MZ = BU + 0.5                                # the envelope's mouth (room under it for the burner's flame to be seen)
    prof = [(0.0, 0.34), (0.25, 0.48), (0.6, 0.78), (1.0, 1.1), (1.45, 1.38), (1.9, 1.56), (2.35, 1.64), (2.75, 1.6), (3.1, 1.46), (3.4, 1.2), (3.62, 0.86), (3.76, 0.46), (3.82, 0.0)]
    prof = [(MZ + z * 0.92, r * 0.92) for z, r in prof]
    NG = 16; cols = [red, cream, gold, cream]
    for g in range(NG):                          # (the gores, up and down, a sky-blue band round the middle)
        a0, a1 = g / NG * math.tau, (g + 1) / NG * math.tau
        low = [p for p in prof if p[0] <= MZ + 1.75]; band = [p for p in prof if MZ + 1.74 <= p[0] <= MZ + 2.17]; high = [p for p in prof if p[0] >= MZ + 2.16]
        flo.append(lathe_band('hbgore', low, a0, a1, cols[g % 4], segs=3))
        flo.append(lathe_band('hbband', band, a0, a1, blue, segs=3))
        flo.append(lathe_band('hbgore', high, a0, a1, cols[g % 4], segs=3))
    skirt = [(MZ - 0.12, 0.29), (MZ - 0.06, 0.3), (MZ + 0.001, 0.313)]
    for g in range(NG):                          # (a fabric skirt round the mouth, in the gores' colours)
        flo.append(lathe_band('hbskirt', skirt, g / NG * math.tau, (g + 1) / NG * math.tau, cols[g % 4], segs=2))
    flo.append(ring('hbcrown', 0.05, 0.17, MZ + 3.505, 0.04, white, verts=20))
    flo.append(ring('hbmouth', 0.29, 0.34, MZ, 0.03, white, verts=24))
    # the basket: wicker sides in courses, a leather rim, poles up to the burner, load lines up to the mouth
    for sd in range(4):
        ang = sd * math.pi / 2; n = Vector((math.cos(ang), math.sin(ang), 0)); t = Vector((-n.y, n.x, 0))
        for k in range(12):                      # (woven: thin courses in two shades over upright stakes)
            z = BZ0 + 0.03 + k * 0.05; off = 0.006 if k % 2 else -0.006
            flo.append(plank('hbweave', tuple(n * (BW + off) + t * -BW + Vector((0, 0, z))), tuple(n * (BW + off) + t * BW + Vector((0, 0, z))), 0.046, 0.03, tuple(n), wicker[k % 2], jitter=0.4, bevel=0.0))
        for j in range(7):
            u = -BW + (j + 0.5) * 2 * BW / 7
            flo.append(box('hbstake2', (0.018, 0.018, BZ1 - BZ0 - 0.02), tuple(n * (BW + 0.018) + t * u + Vector((0, 0, (BZ0 + BZ1) / 2))), m=C('hbwicker3', '#8c6235', rough=0.85), bevel=0.0, segs=1))
        A = n * (BW + 0.02) + t * -(BW + 0.04) + Vector((0, 0, BZ1)); B = n * (BW + 0.02) + t * (BW + 0.04) + Vector((0, 0, BZ1))
        flo.append(cyl('hbrim', 0.04, (B - A).length, tuple((A + B) / 2), (B - A).to_track_quat('Z', 'Y').to_euler(), m=leather, verts=8, bevel=0.0))
    flo.append(box('hbfloor', (2 * BW, 2 * BW, 0.04), (0, 0, BZ0 + 0.02), m=wicker[1], bevel=0.0, segs=1))
    for cx in (-1, 1):
        for cy in (-1, 1):
            c = Vector((cx * BW * 0.92, cy * BW * 0.92, 0))
            flo.append(box('hbcorner', (0.05, 0.05, BZ1 - BZ0), tuple(c + Vector((0, 0, (BZ0 + BZ1) / 2))), m=leather, bevel=0.0, segs=1))
            top = Vector((cx * 0.16, cy * 0.16, BU)); A = c + Vector((0, 0, BZ1))
            flo.append(cyl('hbpole', 0.014, (top - A).length, tuple((A + top) / 2), (top - A).to_track_quat('Z', 'Y').to_euler(), m=steel, verts=6, bevel=0.0))
            m0 = Vector((cx * 0.25, cy * 0.25, MZ + 0.02))
            flo.append(cyl('hbline', 0.006, (m0 - top).length, tuple((top + m0) / 2), (m0 - top).to_track_quat('Z', 'Y').to_euler(), m=rope, verts=4, bevel=0.0))
    flo.append(box('hbframe', (0.36, 0.36, 0.03), (0, 0, BU), m=steel, bevel=0.0, segs=1))
    flo.append(cyl('hbburner', 0.09, 0.16, (0, 0, BU + 0.06), m=steel, verts=12, bevel=0.0))
    flo.append(cyl('hbcoil', 0.065, 0.06, (0, 0, BU + 0.16), m=C('hbcopper', '#b8733a', rough=0.35, metal=0.7), verts=12, bevel=0.0))
    flo.append(sphere('hbflame', 0.06, (0, 0, BU + 0.26), (1, 1, 1.8), m=flame, seg=10, rings=6))
    for sd in range(4):                          # (sandbags hanging from the rim)
        ang = sd * math.pi / 2 + math.pi / 4; n = Vector((math.cos(ang), math.sin(ang), 0))
        top = n * (BW * 1.42) + Vector((0, 0, BZ1 - 0.02))
        flo.append(cyl('hbbagrope', 0.005, 0.14, tuple(top - Vector((0, 0, 0.07))), m=rope, verts=4, bevel=0.0))
        flo.append(sphere('hbbag', 0.07, tuple(top - Vector((0, 0, 0.21))), (1, 1, 1.15), m=sack, seg=10, rings=7))
        flo.append(cyl('hbbagtie', 0.022, 0.04, tuple(top - Vector((0, 0, 0.13))), m=rope, verts=8, r2=0.03, bevel=0.0))
    # a little pennant on a pole at a corner
    P0 = Vector((BW * 0.92, -BW * 0.92, BZ1)); P1 = P0 + Vector((0, 0, 0.55))
    flo.append(cyl('hbflagpole', 0.01, 0.55, tuple((P0 + P1) / 2), m=wood[0], verts=5, bevel=0.0))
    flg = []; flag(flg, tuple(P1), tuple(P1 - Vector((0, 0, 0.16))), tuple(P1 + Vector((0.26, -0.04, -0.08))), red, name='hbpennant')
    # the tether ropes down to stakes in the grass (with the balloon: they stay taut as it bobs), the stakes on the grass
    for k in range(4):
        ang = k * math.pi / 2 + math.pi / 4 + 0.15; d = Vector((math.cos(ang), math.sin(ang), 0))
        S0 = d * 1.35; A = d * (BW * 1.35) + Vector((0, 0, BZ0 + 0.12)); B = S0 + Vector((0, 0, 0.16))
        flo.append(cyl('hbtether', 0.009, (B - A).length, tuple((A + B) / 2), (B - A).to_track_quat('Z', 'Y').to_euler(), m=rope, verts=5, bevel=0.0))
        objs.append(cyl('hbstake', 0.03, 0.2, tuple(S0 + Vector((0, 0, 0.105))), (random.uniform(-0.12, 0.12), random.uniform(-0.12, 0.12), 0), m=wood[k % 2], verts=6, r2=0.02, bevel=0.0))
    # on the grass: a wooden step, a coil of rope, two sandbags, a wicker hamper
    objs.append(box('hbstep', (0.42, 0.26, 0.04), (0.0, -0.78, 0.2), m=wood[0], bevel=0.006, segs=1))
    for sx in (-1, 1): objs.append(box('hbstepleg', (0.04, 0.24, 0.18), (sx * 0.17, -0.78, 0.09), m=wood[1], bevel=0.0, segs=1))
    for k in range(3): objs.append(ring('hbcoilrope', 0.08 - k * 0.012, 0.12 - k * 0.012, 0.02 + k * 0.025, 0.025, rope, verts=16)); objs[-1].location = (0.78, -0.72, 0.02 + k * 0.025)
    for x, y in ((-0.8, -0.62), (-0.62, -0.82)):
        r_ = random.uniform(0, 3); objs.append(sphere('hbbag', 0.09, (x, y, 0.065), (1.25, 0.85, 0.72), (0, 0, r_), m=sack, seg=10, rings=7))
        objs.append(cyl('hbbagtie', 0.025, 0.05, (x + math.cos(r_) * 0.11, y + math.sin(r_) * 0.11, 0.06), (0, math.pi / 2, r_), m=rope, verts=8, r2=0.035, bevel=0.0))
    for k in range(4): objs.append(box('hbhamper', (0.34, 0.24, 0.05), (-0.95, 0.55, 0.027 + k * 0.05), (0, 0, 0.3), m=wicker[k % 2], bevel=0.006, segs=1))
    objs.append(box('hbhamperlid', (0.36, 0.26, 0.035), (-0.95, 0.55, 0.215), (0, 0, 0.3), m=leather, bevel=0.008, segs=1))
    objs.append(ring('hbhandle', 0.07, 0.085, 0, 0.02, leather, verts=12)); objs[-1].location = (-0.95, 0.55, 0.24); objs[-1].rotation_euler = (math.pi / 2, 0, 0.3)
    if part == 'float':
        for o in flo: o.matrix_basis = Matrix.Translation((0, 0, -L)) @ o.matrix_basis
        keep = flo
    elif part == 'flag':                         # (its pennant, about the top of its pole: main.js flutters it)
        for o in flg: o.matrix_basis = Matrix.Translation(-P1) @ o.matrix_basis
        keep = flg
    else:
        keep = objs + (flo + flg if part is None else [])
    for o in objs + flo + flg:
        if not any(o is k for k in keep): bpy.data.objects.remove(o, do_unlink=True)
    return finish(keep, name)


def panel(name, w, h, nx, ny, center, n, m):
    """A flat wall panel w wide, h tall, facing n, with nx by ny little squares (corners enough for the baked corner
    shading to stay true across it: a plain box's four corners, all tucked behind quoins, darkened a whole wall)."""
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=nx, y_segments=ny, size=0.5)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * h, 0))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    n = Vector(n).normalized(); X = Vector((0, 0, 1)).cross(n).normalized(); Y = Vector((0, 0, 1))      # (X x Y = n: not mirrored, its faces wound outwards)
    o.matrix_basis = Matrix.Translation(Vector(center)) @ Matrix((X, Y, n)).transposed().to_4x4()
    for pl in o.data.polygons: pl.use_smooth = False
    return o


CLOCK = {'z': 3.8, 'out': 0.68, 'r': 0.4}      # (the Clock Tower's faces: their middle's height, how far out from the middle, their size)
BELL_AT = Vector((0, 0, 4.88))                 # (its bell: where it hangs from)


def arch(objs, c, n, span, z0, rise, thick, depth, m, k=9, name='ctarch'):
    """A round arch of stones in a wall facing n (c its middle at the springing, z0): k voussoirs over a span."""
    t = Vector((-n.y, n.x, 0)); R = span / 2
    for i in range(k):
        a0, a1 = math.pi * i / k, math.pi * (i + 1) / k
        p0 = c + t * (math.cos(a0) * (R + thick / 2)) + Vector((0, 0, z0 + math.sin(a0) * (R + thick / 2) * rise / R))
        p1 = c + t * (math.cos(a1) * (R + thick / 2)) + Vector((0, 0, z0 + math.sin(a1) * (R + thick / 2) * rise / R))
        objs.append(plank(name, tuple(p0), tuple(p1), depth, thick, tuple(n.cross(p1 - p0).cross(p1 - p0).normalized() * -1 if False else n), m, jitter=0.0, bevel=0.0))


def clock_tower_dec(seed=151, name='clock_tower', part=None, hands=True):
    """(part: None all of it, as in the pictures (its hands at ten past ten); for the game 'tower' all but the bell, 'bell'
    the bell about where it hangs (BELL_AT): the browser draws the hands at the farm's own time and swings the bell on the
    hour, main.js clockParts)
    A village clock tower: a stone footing, a tall shaft rendered cream with stone quoins, a green arched door with a lamp
    over it and a narrow window; a stone cornice, then the clock stage with a white dial on each of its four sides (gold
    hour marks, a gold boss, black hands); an open belfry of four arches with its bronze bell; a steep slate spire with a
    gold ball and a golden hen weathervane. On a square of flagstones, a bench at its side, two tubs of flowers by its door."""
    random.seed(seed); objs = []; bell = []
    stone = [C('ctstone%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#d9c9a6', '#cdbb96', '#e3d5b6'))]      # (warm: its walls face the view, mostly out of the sun)
    render = C('ctrender', '#fbefd6', rough=0.85, var=0.02); slate = C('ctslate', '#71819a', rough=0.6, var=0.05); slate2 = C('ctslate2', '#5f6e85', rough=0.6, var=0.05)
    dial = C('ctdial', '#fbf8ef', rough=0.5); black = C('ctblack', '#1f2226', rough=0.5); gold = C('ctgold', '#e9b949', rough=0.25, metal=1.0)
    green = C('ctgreen', '#2f6a46', rough=0.6, var=0.05, grain=0.2); bronze = C('ctbronze', '#a8824a', rough=0.35, metal=0.8)
    wood = [C('ctwood%d' % i, h, rough=0.85, var=0.1, grain=0.3) for i, h in enumerate(('#9a7650', '#8a6744'))]
    flag_ = [C('ctflag%d' % i, h, rough=0.85, var=0.05) for i, h in enumerate(('#b9b3a4', '#aaa392', '#c4beb0'))]
    lamp = C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)); glass = C('glass', '#3e5767', rough=0.25)
    fl = [C('ctfl', '#e0414a', rough=0.6), C('ctfl2', '#f4d03c', rough=0.6), C('ctfl3', '#c9a0e0', rough=0.6)]; leaf = C('ctleaf', '#4a8731', rough=0.8)
    H0, H1, H2, H3, H4 = 0.5, 3.35, 4.25, 4.35, 5.1      # (the footing's top, the shaft's top, the clock stage's top, the belfry's floor, its top)
    W1, W2 = 0.6, 0.66                               # (half the shaft, half the clock stage)
    # the flagstones, the footing
    for i in range(-4, 4):
        for j in range(-4, 4):
            if abs(i + 0.5) < 2 and abs(j + 0.5) < 2: continue
            objs.append(box('ctflag', (0.36, 0.36, 0.03), ((i + 0.5) * 0.4 + random.uniform(-0.01, 0.01), (j + 0.5) * 0.4 + random.uniform(-0.01, 0.01), 0.015), (0, 0, random.uniform(-0.04, 0.04)), m=random.choice(flag_), bevel=0.006, segs=1))
    objs.append(box('ctfoot', (2 * W1 + 0.22, 2 * W1 + 0.22, H0), (0, 0, H0 / 2), m=stone[1], bevel=0.02, segs=2))
    objs.append(box('ctfootcap', (2 * W1 + 0.3, 2 * W1 + 0.3, 0.07), (0, 0, H0), m=stone[2], bevel=0.015, segs=2))
    # the shaft: rendered, stone quoins up its corners
    for side in range(4):                         # (its walls as panels: see panel)
        a = side * math.pi / 2; n = Vector((math.sin(a), -math.cos(a), 0))
        objs.append(panel('ctshaft', 2 * W1, H1 - H0, 6, 14, tuple(n * W1 + Vector((0, 0, (H0 + H1) / 2))), tuple(n), render))
    z = H0 + 0.04; k = 0
    while z < H1 - 0.1:
        h = 0.22
        for sx in (-1, 1):
            for sy in (-1, 1):
                L1 = 0.3 if k % 2 == 0 else 0.18; L2 = 0.18 if k % 2 == 0 else 0.3
                objs.append(box('ctquoin', (L1, 0.04, h - 0.02), (sx * (W1 - L1 / 2 + 0.02), sy * (W1 + 0.01), z + h / 2), m=random.choice(stone), bevel=0.006, segs=1))
                objs.append(box('ctquoin', (0.04, L2, h - 0.02), (sx * (W1 + 0.01), sy * (W1 - L2 / 2 + 0.02), z + h / 2), m=random.choice(stone), bevel=0.006, segs=1))
        z += h; k += 1
    for zz, hh in ((H1 - 0.02, 0.1), (H1 + 0.07, 0.07)): objs.append(box('ctcornice', (2 * W1 + 0.12 + (0.06 if zz > H1 else 0), 2 * W1 + 0.12 + (0.06 if zz > H1 else 0), hh), (0, 0, zz), m=stone[2], bevel=0.01, segs=1))
    objs.append(box('ctband', (2 * W1 + 0.05, 2 * W1 + 0.05, 0.08), (0, 0, 1.95), m=stone[2], bevel=0.008, segs=1))      # (a string course half way up)
    # the door, its arch, a lamp over it; a narrow window higher up
    FY = -W1 - 0.012
    objs.append(box('ctdoor', (0.52, 0.04, 0.95), (0, FY, H0 + 0.475), m=green, bevel=0.006, segs=1))
    for i in range(8):                            # (the door's round top, in slabs)
        z0 = i / 8 * 0.26; z1 = (i + 1) / 8 * 0.26; w = 2 * math.sqrt(max(0.0, 0.26 ** 2 - ((z0 + z1) / 2) ** 2))
        objs.append(box('ctdoortop', (w, 0.04, z1 - z0 + 0.002), (0, FY, H0 + 0.95 + (z0 + z1) / 2), m=green, bevel=0.0, segs=1))
    arch(objs, Vector((0, FY - 0.01, 0)), Vector((0, -1, 0)), 0.56, H0 + 0.95, 0.28, 0.09, 0.05, stone[2], k=7)
    for sx in (-1, 1): objs.append(box('ctjamb', (0.09, 0.05, 0.95), (sx * 0.325, FY - 0.01, H0 + 0.475), m=stone[2], bevel=0.0, segs=1))
    objs.append(sphere('ctknob', 0.025, (0.16, FY - 0.04, H0 + 0.48), m=gold, seg=8, rings=6))
    for sx in (-1, 1):
        for zz in (0.25, 0.7): objs.append(box('ctstrap', (0.2, 0.012, 0.035), (sx * 0.12, FY - 0.025, H0 + zz), m=black, bevel=0.0, segs=1))
    objs.append(box('ctlampbox', (0.1, 0.1, 0.14), (0, FY - 0.2, H0 + 1.42), m=lamp, bevel=0.0, segs=1))
    objs.append(cyl('ctlamptop', 0.08, 0.05, (0, FY - 0.2, H0 + 1.52), m=black, verts=4, r2=0.01, bevel=0.0))
    objs.append(plank('ctlamparm', (0, FY, H0 + 1.55), (0, FY - 0.2, H0 + 1.55), 0.02, 0.02, (0, 0, 1), black, jitter=0.0, bevel=0.0))
    objs.append(box('ctwindow', (0.16, 0.04, 0.5), (0, FY, 2.45), m=glass, bevel=0.0, segs=1))
    arch(objs, Vector((0, FY - 0.01, 0)), Vector((0, -1, 0)), 0.18, 2.7, 0.09, 0.06, 0.05, stone[2], k=5)
    objs.append(box('ctsill', (0.28, 0.08, 0.04), (0, FY - 0.03, 2.18), m=stone[2], bevel=0.006, segs=1))
    # the clock stage and its four faces
    for side in range(4):
        a = side * math.pi / 2; n = Vector((math.sin(a), -math.cos(a), 0))
        objs.append(panel('ctstage', 2 * W2, H2 - H1 - 0.1, 6, 4, tuple(n * W2 + Vector((0, 0, (H1 + 0.1 + H2) / 2))), tuple(n), render))
    for sx in (-1, 1):
        for sy in (-1, 1): objs.append(box('ctpilaster', (0.12, 0.12, H2 - H1 - 0.1), (sx * (W2 - 0.04), sy * (W2 - 0.04), (H1 + 0.1 + H2) / 2), m=stone[0], bevel=0.008, segs=1))
    objs.append(box('ctstagecap', (2 * W2 + 0.14, 2 * W2 + 0.14, 0.1), (0, 0, H2), m=stone[2], bevel=0.012, segs=1))
    CZ, CR = CLOCK['z'], CLOCK['r']
    for side in range(4):
        a = side * math.pi / 2; n = Vector((math.sin(a), -math.cos(a), 0)); t = Vector((-n.y, n.x, 0)); c = n * (W2 + 0.005) + Vector((0, 0, CZ))
        objs.append(cyl('ctdial', CR, 0.03, tuple(c + n * 0.01), tuple(n.to_track_quat('Z', 'Y').to_euler()), m=dial, verts=32, bevel=0.0))
        rr = ring('ctdialring', CR - 0.01, CR + 0.035, 0, 0.04, black, verts=32); rr.location = tuple(c + n * 0.02); rr.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); objs.append(rr)
        for h in range(12):
            ang = h / 12 * math.tau; d = t * math.sin(ang) + Vector((0, 0, math.cos(ang)))
            big = h % 3 == 0
            objs.append(plank('cttick', tuple(c + n * 0.03 + d * (CR - (0.1 if big else 0.07))), tuple(c + n * 0.03 + d * (CR - 0.03)), 0.035 if big else 0.02, 0.012, tuple(n), gold if big else black, jitter=0.0, bevel=0.0))
        objs.append(cyl('ctboss', 0.03, 0.03, tuple(c + n * 0.045), tuple(n.to_track_quat('Z', 'Y').to_euler()), m=gold, verts=10, bevel=0.0))
        if part is None and hands:               # (for the pictures: ten past ten)
            for ang, L, w in ((math.tau * (10 + 10 / 60) / 12, 0.2, 0.03), (math.tau * 10 / 60, 0.31, 0.02)):
                d = t * math.sin(ang) + Vector((0, 0, math.cos(ang)))
                objs.append(plank('cthand', tuple(c + n * 0.05 - d * 0.04), tuple(c + n * 0.05 + d * L), w, 0.012, tuple(n), black, jitter=0.0, bevel=0.0))
    # the belfry: a floor, four corner piers, an arch on each side, the bell inside
    objs.append(box('ctbelfloor', (2 * W2 - 0.04, 2 * W2 - 0.04, H3 - H2), (0, 0, (H2 + H3) / 2), m=stone[1], bevel=0.0, segs=1))
    PW = 0.2
    for sx in (-1, 1):
        for sy in (-1, 1): objs.append(box('ctpier', (PW, PW, H4 - H3), (sx * (W2 - 0.03 - PW / 2), sy * (W2 - 0.03 - PW / 2), (H3 + H4) / 2), m=random.choice(stone), bevel=0.01, segs=1))
    span = 2 * (W2 - 0.03 - PW); spring = H4 - 0.12 - span / 2 * 0.75
    for side in range(4):
        a = side * math.pi / 2; n = Vector((math.sin(a), -math.cos(a), 0)); t = Vector((-n.y, n.x, 0)); c = n * (W2 - 0.09)
        arch(objs, c, n, span, spring, span / 2 * 0.75, 0.08, 0.14, stone[2], k=9)
        objs.append(box('ctspandrel', (2 * W2 - 0.06 if side % 2 == 0 else 0.14, 0.14 if side % 2 == 0 else 2 * W2 - 0.06, 0.1), tuple(c + Vector((0, 0, H4 - 0.05))), m=stone[0], bevel=0.0, segs=1))
        objs.append(box('ctrail', (span if side % 2 == 0 else 0.05, 0.05 if side % 2 == 0 else span, 0.05), tuple(c + Vector((0, 0, H3 + 0.32))), m=black, bevel=0.0, segs=1))
    objs.append(box('ctbelfrycap', (2 * W2 + 0.1, 2 * W2 + 0.1, 0.1), (0, 0, H4 + 0.05), m=stone[2], bevel=0.012, segs=1))
    # the bell on its beam (the bell itself is its own part: it swings on the hour)
    objs.append(box('ctbeam', (2 * W2 - 0.3, 0.1, 0.1), (0, 0, BELL_AT.z + 0.05), m=wood[0], bevel=0.0, segs=1))
    bprof = [(0.0, 0.2), (0.03, 0.205), (0.08, 0.18), (0.18, 0.135), (0.3, 0.115), (0.4, 0.105), (0.45, 0.07), (0.47, 0.0)]
    bz0 = BELL_AT.z - 0.52
    for g in range(8):
        bell.append(lathe_band('ctbell', [(bz0 + z, r) for z, r in bprof], g / 8 * math.tau, (g + 1) / 8 * math.tau, bronze, segs=3))
    bell.append(ring('ctbellrim', 0.19, 0.215, bz0 + 0.03, 0.04, bronze, verts=24))
    bell.append(box('ctyoke', (0.06, 0.06, 0.07), tuple(BELL_AT - Vector((0, 0, 0.04))), m=black, bevel=0.0, segs=1))
    bell.append(cyl('ctclapper', 0.012, 0.3, tuple(Vector((0, 0, bz0 + 0.16))), m=black, verts=5, bevel=0.0))
    bell.append(sphere('ctclapball', 0.035, (0, 0, bz0 + 0.03), m=black, seg=8, rings=6))
    # the spire: a steep pyramid of slate with a few bands, a gold ball, a golden hen weathervane
    SZ0, SZ1 = H4 + 0.1, H4 + 1.25
    sp = cyl('ctspire', (W2 + 0.08) * math.sqrt(2), SZ1 - SZ0, (0, 0, (SZ0 + SZ1) / 2), (0, 0, math.pi / 4), m=slate, verts=4, r2=0.0, bevel=0.0); objs.append(sp)
    for u in (0.2, 0.45, 0.68):
        rr = (W2 + 0.08) * math.sqrt(2) * (1 - u) + 0.008
        objs.append(cyl('ctspireband', rr, 0.035, (0, 0, SZ0 + (SZ1 - SZ0) * u), (0, 0, math.pi / 4), m=slate2, verts=4, r2=rr - 0.035 * (W2 + 0.08) * math.sqrt(2) / (SZ1 - SZ0), bevel=0.0))
    objs.append(sphere('ctball', 0.06, (0, 0, SZ1 + 0.03), m=gold, seg=12, rings=8))
    objs.append(cyl('ctrod', 0.012, 0.45, (0, 0, SZ1 + 0.25), m=black, verts=6, bevel=0.0))
    for a in (0, math.pi / 2):
        objs.append(plank('ctarm', (math.cos(a) * -0.16, math.sin(a) * -0.16, SZ1 + 0.2), (math.cos(a) * 0.16, math.sin(a) * 0.16, SZ1 + 0.2), 0.015, 0.015, (0, 0, 1), black, jitter=0.0, bevel=0.0))
        for sd in (-1, 1): objs.append(sphere('ctarmball', 0.022, (math.cos(a) * 0.17 * sd, math.sin(a) * 0.17 * sd, SZ1 + 0.2), m=gold, seg=8, rings=6))
    HZ = SZ1 + 0.42                               # (the hen: a little gold silhouette side on, turning in the wind)
    objs.append(sphere('cthen', 0.1, (0, 0, HZ), (1.0, 0.18, 0.72), m=gold, seg=12, rings=8))
    objs.append(sphere('cthen', 0.05, (0.09, 0, HZ + 0.07), (1, 0.2, 1), m=gold, seg=10, rings=6))
    objs.append(cyl('cthencomb', 0.03, 0.02, (0.09, 0, HZ + 0.12), (math.pi / 2, 0, 0), m=C('ctred', '#c9302c', rough=0.5), verts=8, bevel=0.0))
    flag(objs, (-0.07, 0, HZ + 0.02), (-0.2, 0, HZ + 0.14), (-0.16, 0, HZ - 0.03), gold, name='cthentail')
    objs.append(cyl('ctbeak', 0.015, 0.04, (0.155, 0, HZ + 0.06), (0, math.pi / 2, 0), m=C('ctbeakm', '#e08a2a', rough=0.5), verts=6, r2=0.0, bevel=0.0))
    # a bench at its side, tubs of flowers by its door
    BX = W1 + 0.55
    objs.append(box('ctbench', (0.18, 0.9, 0.04), (BX, 0.1, 0.42), m=wood[0], bevel=0.006, segs=1))
    objs.append(box('ctbenchback', (0.04, 0.9, 0.22), (BX + 0.1, 0.1, 0.6), (0, -0.15, 0), m=wood[1], bevel=0.006, segs=1))
    for yy in (-0.28, 0.48):
        objs.append(box('ctbenchleg', (0.16, 0.04, 0.4), (BX, yy, 0.2), m=black, bevel=0.0, segs=1))
    for sx in (-1, 1):
        x = sx * 0.55; y = -W1 - 0.35
        objs.append(cyl('cttub', 0.15, 0.24, (x, y, 0.15), m=wood[1], verts=12, r2=0.17, bevel=0.0))
        objs.append(ring('cttubband', 0.155, 0.175, 0, 0.025, black, verts=16)); objs[-1].location = (x, y, 0.2)
        objs.append(sphere('cttubleaf', 0.15, (x, y, 0.3), (1, 1, 0.6), m=leaf, ico=1, disp=0.3, seed=sx + 3))
        for j in range(7):
            a = j / 7 * math.tau; objs.append(sphere('cttubfl', 0.03, (x + math.cos(a) * 0.1, y + math.sin(a) * 0.1, 0.36 + random.uniform(0, 0.04)), m=fl[(j + (sx > 0)) % 3], ico=1))
    keep = {None: objs + bell, 'tower': objs, 'bell': bell}[part]
    if part == 'bell':
        for o in bell: o.matrix_basis = Matrix.Translation(-BELL_AT) @ o.matrix_basis
    for o in objs + bell:
        if not any(o is k for k in keep): bpy.data.objects.remove(o, do_unlink=True)
    return finish(keep, name)


def clipped(objs, name, c, r, scale, leaf, seed, ico=3, disp=0.1, leaves=0, sq=1.0):
    """A clipped shape of box: a smooth green ball (its leafy skin a little bumpy), scaled; leaves: a few small leaves
    standing out of its skin (it's freshly clipped, not shaggy)."""
    rnd = random.Random(seed)
    o = sphere(name, r, tuple(c), scale, m=leaf[0], ico=ico, disp=disp, disp_scale=6.0, seed=seed); objs.append(o)
    for k in range(leaves):
        a = rnd.uniform(0, math.tau); el = math.asin(rnd.uniform(-0.4, 1.0))
        d = Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el)))
        p = Vector(c) + Vector((d.x * scale[0], d.y * scale[1], d.z * scale[2])) * r * 0.99
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), rnd.uniform(0, math.tau)) @ Quaternion((1, 0, 0), rnd.uniform(0.3, 0.7))
        objs.append(flat_leaf(name + 'leaf', tuple(p), q, rnd.uniform(0.045, 0.06), rnd.uniform(0.02, 0.026), leaf[1 + (k % 2) + (1 if el > 0.5 else 0)], both=False))


def topiary_garden_dec(seed=161, name='topiary_garden'):
    """A topiary garden: a square of lawn edged by a low clipped box hedge (a gap at the front), gravel paths in a cross
    to the middle; there, on a round box plinth, a big topiary hen clipped from box (her comb and wattle of red roses, her
    eye a dark pebble), four lollipop standards in terracotta pots round her; in the four beds a spiral cone, a tiered
    cake, a ball on a ball and a little topiary chick; a white bench at the back, a watering can and the shears."""
    random.seed(seed); objs = []
    leaf = [C('tgleaf%d' % i, h, rough=0.85, var=0.05, hue_var=0.01) for i, h in enumerate(('#3e7a2f', '#4a8a35', '#5a9b3e', '#6aab47'))]
    lawn = C('tglawn', '#6fa544', rough=0.95, var=0.04); gravel = C('tggravel', '#e2d6bb', rough=0.95, var=0.05)
    pot = C('tgpot', '#c46a3f', rough=0.8, var=0.05); stem = C('tgstem', '#6b5039', rough=0.9); rose = C('tgrose', '#d8343f', rough=0.6)
    white = C('tgwhite', '#f4f1ea', rough=0.6); eye = C('tgeye', '#1f1d1c', rough=0.4); zinc = C('tgzinc', '#8f9aa3', rough=0.45, metal=0.5)
    beak = C('tgbeak', '#e8b84a', rough=0.6)
    E = 2.0
    objs.append(box('tglawn', (2 * E, 2 * E, 0.02), (0, 0, 0.01), m=lawn, bevel=0.0, segs=1))
    for a, b in (((-0.35, -E), (0.35, E)), ((-E, -0.35), (E, 0.35))):            # (the gravel cross)
        objs.append(box('tggravel', (b[0] - a[0], b[1] - a[1], 0.025), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.0125), m=gravel, bevel=0.0, segs=1))
    objs.append(cyl('tggravelring', 1.0, 0.026, (0, 0, 0.013), m=gravel, verts=32, bevel=0.0))
    # the hedge round it: clipped lengths with rounded tops (the front's gap for the path)
    HW, HH = 0.24, 0.38
    def hedge(a, b, k):                          # (a clipped hedge: a rounded box of box, its leaves on its skin)
        rnd = random.Random(seed * 100 + k); A, B = Vector((a[0], a[1], 0)), Vector((b[0], b[1], 0)); L = (B - A).length; along = abs(B.x - A.x) > 0.01
        mid = (A + B) / 2; sz = (L + HW, HW, HH) if along else (HW, L - HW - 0.01, HH)      # (the sides between the front and back: no faces on top of each other at the corners)
        objs.append(box('tghedge', sz, (mid.x, mid.y, HH / 2 + 0.02), m=leaf[0], bevel=0.07, segs=3))
        for i in range(int(L * 40)):
            u = rnd.uniform(-0.5, 0.5); side = rnd.choice((-1, 1, 0, 0)); 
            if side == 0: p_ = mid + (Vector((u * (L + HW * 0.6), rnd.uniform(-0.4, 0.4) * HW, 0)) if along else Vector((rnd.uniform(-0.4, 0.4) * HW, u * (L + HW * 0.6), 0))) + Vector((0, 0, HH + 0.02)); d = Vector((0, 0, 1))
            else: d = Vector((0, side, 0)) if along else Vector((side, 0, 0)); p_ = mid + (Vector((u * (L + HW * 0.6), 0, 0)) if along else Vector((0, u * (L + HW * 0.6), 0))) + d * HW / 2 + Vector((0, 0, rnd.uniform(0.08, HH - 0.02)))
            q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), rnd.uniform(0, math.tau)) @ Quaternion((1, 0, 0), rnd.uniform(0.3, 0.7))
            objs.append(flat_leaf('tghedgeleaf', tuple(p_), q, rnd.uniform(0.04, 0.055), rnd.uniform(0.018, 0.024), leaf[1 + (i % 2) + (1 if side == 0 else 0)], both=False))
    hedge((-E + 0.12, -E + 0.12), (-0.5, -E + 0.12), 0); hedge((0.5, -E + 0.12), (E - 0.12, -E + 0.12), 1)
    hedge((E - 0.12, -E + 0.12), (E - 0.12, E - 0.12), 2); hedge((E - 0.12, E - 0.12), (-E + 0.12, E - 0.12), 3); hedge((-E + 0.12, E - 0.12), (-E + 0.12, -E + 0.12), 4)
    for sx in (-1, 1): clipped(objs, 'tgpost', (sx * 0.58, -E + 0.12, 0.42), 0.17, (1, 1, 1), leaf, seed + 7 + sx, ico=3, disp=0.08)      # (balls either side of the way in)
    # the hen, on her round plinth
    objs.append(cyl('tgplinth', 0.55, 0.3, (0, 0, 0.16), m=leaf[0], verts=24, bevel=0.0)); clipped(objs, 'tgplinthtop', (0, 0, 0.3), 0.55, (1, 1, 0.18), leaf, seed + 1, ico=3, disp=0.05)
    HZ = 0.32
    clipped(objs, 'tghen', (0.0, 0.05, HZ + 0.5), 0.5, (0.82, 1.0, 0.78), leaf, seed + 2, ico=3, disp=0.08, leaves=60)      # (her body, facing the front)
    clipped(objs, 'tghen', (0.0, -0.36, HZ + 0.95), 0.22, (0.85, 0.9, 1.05), leaf, seed + 3, ico=3, disp=0.08, leaves=20)    # (her head)
    clipped(objs, 'tghen', (0.0, -0.25, HZ + 0.72), 0.2, (0.95, 0.9, 1.0), leaf, seed + 4, ico=3, disp=0.08)                # (her neck)
    for k, (dx, dz, tilt) in enumerate(((0, 0.2, 0.0), (-0.14, 0.1, 0.35), (0.14, 0.1, -0.35))):                            # (her tail: three clipped plumes)
        o = sphere('tgtail', 0.26, (dx, 0.5, HZ + 0.82 + dz), (0.35, 0.55, 1.0), (math.radians(-25), tilt, 0), m=leaf[0], ico=3, disp=0.08, disp_scale=6.0, seed=seed + 10 + k); objs.append(o)
    for sx in (-1, 1): objs.append(sphere('tgwing', 0.3, (sx * 0.36, 0.08, HZ + 0.55), (0.25, 0.85, 0.55), (math.radians(-10), 0, 0), m=leaf[1], ico=3, disp=0.07, disp_scale=6.0, seed=seed + 20 + sx))
    for k in range(5): objs.append(sphere('tgcomb', 0.045, (0.0, -0.4 + k * 0.045, HZ + 1.17 - abs(k - 2) * 0.015), m=rose, ico=1))      # (her comb of red roses)
    for k in range(2): objs.append(sphere('tgwattle', 0.04, (0.0, -0.53 + k * 0.02, HZ + 0.84 - k * 0.05), m=rose, ico=1))
    objs.append(cyl('tgbeak', 0.04, 0.09, (0.0, -0.6, HZ + 0.94), (math.radians(90), 0, 0), m=beak, verts=6, r2=0.0, bevel=0.0))
    for sx in (-1, 1): objs.append(sphere('tgeye', 0.025, (sx * 0.15, -0.5, HZ + 1.0), m=eye, seg=8, rings=6))
    # four lollipop standards in terracotta pots round her
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2; x, y = math.cos(a) * 0.82, math.sin(a) * 0.82
        objs.append(cyl('tgpot', 0.12, 0.2, (x, y, 0.1), m=pot, verts=12, r2=0.14, bevel=0.0))
        objs.append(ring('tgpotrim', 0.13, 0.155, 0.2, 0.03, pot, verts=14)); objs[-1].location = (x, y, 0.2)
        objs.append(cyl('tgstem', 0.018, 0.55, (x, y, 0.47), m=stem, verts=6, bevel=0.0))
        clipped(objs, 'tgball', (x, y, 0.85), 0.2, (1, 1, 1), leaf, seed + 30 + k, ico=3, disp=0.08, leaves=14)
    # in the four beds: a spiral cone, a tiered cake, a ball on a ball, a little topiary chick
    B = 1.22
    bx, by = -B, -B + 0.1                                  # (front left: a spiral cone)
    for i in range(7):
        z = 0.12 + i * 0.2; r = 0.36 * (1 - i / 7.5)
        clipped(objs, 'tgspiral', (bx, by, z), r, (1, 1, 0.45), leaf, seed + 40 + i, ico=3, disp=0.05)
    bx, by = B, -B + 0.1                                   # (front right: a tiered cake)
    for i, (r, z) in enumerate(((0.38, 0.18), (0.28, 0.5), (0.18, 0.76), (0.1, 0.95))):
        clipped(objs, 'tgcake', (bx, by, z), r, (1, 1, 0.55 if i < 3 else 1.0), leaf, seed + 50 + i, ico=3, disp=0.05)
    bx, by = -B, B                                         # (back left: a ball on a ball)
    clipped(objs, 'tgballs', (bx, by, 0.32), 0.32, (1, 1, 1), leaf, seed + 60, ico=3, disp=0.07, leaves=16)
    clipped(objs, 'tgballs', (bx, by, 0.82), 0.2, (1, 1, 1), leaf, seed + 61, ico=3, disp=0.07, leaves=10)
    bx, by = B, B - 0.05                                   # (back right: a little topiary chick, looking up at the hen)
    clipped(objs, 'tgchick', (bx, by, 0.3), 0.28, (0.9, 1.0, 0.95), leaf, seed + 70, ico=3, disp=0.07)
    clipped(objs, 'tgchick', (bx - 0.05, by - 0.16, 0.6), 0.16, (1, 1, 1), leaf, seed + 71, ico=3, disp=0.07)
    objs.append(cyl('tgbeak', 0.03, 0.06, (bx - 0.08, by - 0.31, 0.6), (math.radians(90), 0, math.radians(-15)), m=beak, verts=6, r2=0.0, bevel=0.0))
    for sx in (-1, 1): objs.append(sphere('tgeye', 0.018, (bx - 0.05 + sx * 0.08, by - 0.27, 0.66), m=eye, seg=8, rings=6))
    # a white bench at the back, a watering can and the shears
    objs.append(box('tgbench', (0.9, 0.3, 0.05), (0, E - 0.55, 0.42), m=white, bevel=0.01, segs=1))
    objs.append(box('tgbenchback', (0.9, 0.04, 0.3), (0, E - 0.42, 0.62), (math.radians(-10), 0, 0), m=white, bevel=0.01, segs=1))
    for sx in (-1, 1):
        for sy in (-1, 1): objs.append(box('tgbenchleg', (0.05, 0.05, 0.4), (sx * 0.4, E - 0.55 + sy * 0.12, 0.2), m=white, bevel=0.0, segs=1))
    WC = Vector((0.75, -E + 0.55, 0))
    objs.append(cyl('tgcan', 0.1, 0.2, tuple(WC + Vector((0, 0, 0.12))), m=zinc, verts=14, r2=0.09, bevel=0.0))
    objs.append(cyl('tgspout', 0.015, 0.3, tuple(WC + Vector((-0.16, 0, 0.22))), (0, math.radians(-55), 0), m=zinc, verts=6, r2=0.01, bevel=0.0))
    objs.append(ring('tghandle', 0.07, 0.085, 0, 0.02, zinc, verts=12)); objs[-1].location = tuple(WC + Vector((0.02, 0, 0.26))); objs[-1].rotation_euler = (math.pi / 2, 0, 0)
    SH = Vector((-1.1, -E + 0.12, HH + 0.06))              # (the shears left on the hedge)
    for sd in (-1, 1):
        objs.append(plank('tgblade', tuple(SH), tuple(SH + Vector((0.22, sd * 0.03, 0.01))), 0.025, 0.008, (0, 0, 1), zinc, jitter=0.0, bevel=0.0))
        objs.append(plank('tghandle2', tuple(SH), tuple(SH + Vector((-0.2, sd * 0.06, 0.0))), 0.022, 0.02, (0, 0, 1), C('tgred', '#b5312b', rough=0.6), jitter=0.0, bevel=0.0))
    return finish(objs, name)


GRAND = {'fountain': fountain_dec, 'rose_arbour': rose_arbour_dec, 'dovecote': dovecote_dec, 'tractor': tractor_dec, 'orchard': orchard_dec, 'tree_house': tree_house_dec, 'hot_air_balloon': hot_air_balloon_dec, 'clock_tower': clock_tower_dec, 'topiary_garden': topiary_garden_dec}
