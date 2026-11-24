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
from village3d import stone_row


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
def fountain_dec(seed=81, name='fountain'):
    """A grand fountain for the farm: a round stone basin (a ring of dressed stones under a moulded rim) full of water, a
    fluted pedestal with two scalloped bowls, the water falling from each in a thin curtain, and on top a golden egg;
    round the basin four little bronze frogs spouting arcs of water into it. It stands on a square of pale gravel in a
    stone kerb, a clipped box ball at each corner and lavender between them."""
    random.seed(seed); objs = []
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
    objs.append(cyl('fwater', R - 0.06, 0.02, (0, 0, H - 0.09), m=water, verts=48, bevel=0.0))
    objs.append(cyl('fplinth', R + 0.18, 0.06, (0, 0, 0.03), m=stone[1], verts=48, bevel=0.012))
    # the pedestal: a round foot, a fluted shaft, the lower bowl (scalloped), a shorter shaft, the upper bowl, the golden egg
    objs.append(cyl('ffoot', 0.26, 0.16, (0, 0, H + 0.0), m=pale, verts=24, r2=0.2, bevel=0.01))
    objs.append(cyl('fshaft', 0.13, 0.5, (0, 0, H + 0.33), m=stone[2], verts=16, bevel=0.004))
    for k in range(12):                                          # (the flutes)
        a = 2 * math.pi * k / 12
        objs.append(cyl('fflute', 0.018, 0.44, (math.cos(a) * 0.13, math.sin(a) * 0.13, H + 0.33), m=pale, verts=6, bevel=0.0))
    B1 = H + 0.64
    objs.append(cyl('fbowl1', 0.2, 0.14, (0, 0, B1 - 0.01), m=stone[0], verts=32, r2=0.6, bevel=0.01))
    objs.append(cyl('fbowl1w', 0.55, 0.02, (0, 0, B1 + 0.065), m=water, verts=32, bevel=0.0))
    for k in range(16):                                          # (its scalloped lip)
        a = 2 * math.pi * k / 16
        objs.append(sphere('fscallop', 0.06, (math.cos(a) * 0.6, math.sin(a) * 0.6, B1 + 0.04), (1, 1, 0.55), m=pale, seg=10, rings=6))
    objs.append(tube('fsheet1', 0.62, 0.7, B1 + 0.05, H - 0.08, fall))      # (the water falling from its lip into the basin: a thin sheet)
    objs.append(cyl('fshaft2', 0.08, 0.36, (0, 0, B1 + 0.22), m=stone[2], verts=12, bevel=0.004))
    B2 = B1 + 0.42
    objs.append(cyl('fbowl2', 0.11, 0.1, (0, 0, B2 - 0.01), m=stone[0], verts=24, r2=0.32, bevel=0.008))
    objs.append(cyl('fbowl2w', 0.29, 0.02, (0, 0, B2 + 0.045), m=water, verts=24, bevel=0.0))
    for k in range(10):
        a = 2 * math.pi * k / 10
        objs.append(sphere('fscallop', 0.04, (math.cos(a) * 0.32, math.sin(a) * 0.32, B2 + 0.03), (1, 1, 0.55), m=pale, seg=10, rings=6))
    objs.append(tube('fsheet2', 0.335, 0.39, B2 + 0.035, B1 + 0.07, fall))
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
            objs.append(plank('fjet', pts[i], pts[i + 1], 0.03, 0.03, (0, 0, 1), fall, jitter=0.0, bevel=0.0))
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
    return finish(objs, name)


GRAND = {'fountain': fountain_dec}
