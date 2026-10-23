"""The farm's animals that aren't chickens, built for the browser like the birds: smooth shapes in parts that bones can move,
furred in the browser. First the fox family (a grown fox, and a cub with a big head, short legs and a fluffy coat); the dog
and the geese come later.
Each mesh is tagged with its part (o['part']: the bone it mostly follows), its fur (o['paint']: the fur length region, as the
birds' paint regions) and how it is coloured (o['col']: 'fox' for the coat's pattern worked out per vertex by the exporter,
otherwise its material's colour). Pivot empties (pv_*) mark where the bones turn.
Blender metres; the animal faces +x here (the exporter turns it to face the camera's way).
Run directly for a picture: python beasts.py [samples]"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import breeds
from breeds import flat, pivot, keep, PAINT
from hen import K
from mathutils import Quaternion, Euler

JOINTS = ['root', 'hips', 'chest', 'neck', 'head', 'tail1', 'tail2', 'tail3', 'tail4',
          'FLu', 'FLl', 'FLw', 'FRu', 'FRl', 'FRw', 'HLu', 'HLk', 'HLl', 'HRu', 'HRk', 'HRl',
          'jaw', 'earL', 'earR', 'blinkL', 'blinkR', 'lidL', 'lidR']
# the face: the lower jaw (opens), each ear (pricks up, flattens back, swivels), each eye (closes: a blink, a squint), and on
# the dog each upper eyelid (lowers over the eye and tilts: soft, sleepy, pleading, intent)
# the legs' bones, top down: front shoulder (upper arm), elbow (forearm), wrist (the paw); hind hip (thigh), knee (shin), hock
LEG_BONES = {'FL': ['FLu', 'FLl', 'FLw'], 'FR': ['FRu', 'FRl', 'FRw'], 'HL': ['HLu', 'HLk', 'HLl'], 'HR': ['HRu', 'HRk', 'HRl']}
TAIL_BONES = ['tail1', 'tail2', 'tail3', 'tail4']
COATS = {
    # a red fox: rusty orange, a darker saddle, white throat, chest, belly and tail tip, black socks and ear backs
    'fox': dict(fur='#c4592a', back='#9f4420', white='#efe6d8', black='#2a1f19', eye='#d9982c', nose='#1a1412'),
    # a cub: softer, browner and greyer, lighter round the muzzle
    'cub': dict(fur='#9a6a4a', back='#7d5539', white='#e3d6c3', black='#4a3a30', eye='#5b4a3a', nose='#1e1714'),
    # Biscuit, a Border Collie: black and white (a white blaze down the face, white muzzle, collar, chest, belly, socks and
    # tail tip), warm brown eyes
    'collie': dict(fur='#2b282a', back='#211f21', white='#f1ede6', black='#151315', eye='#93592a', nose='#121011'),
}
# the shapes: overall size, the head against the body, leg length, muzzle length
SHAPES = {'fox': dict(S=1.0, HD=1.0, LG=1.0, MZ=1.0), 'cub': dict(S=0.56, HD=1.38, LG=0.82, MZ=0.62), 'collie': dict(S=1.08, HD=1.08, LG=1.22, MZ=0.8)}


def part(o, joint, paint='keep', col=None):
    o['part'] = joint; o['paint'] = PAINT[paint]
    if col: o['col'] = col
    return o


def chain(pts, radii, S, step=0.45):
    """Metaball balls along a line through pts, radii at each point (surface radii), close enough to make a smooth limb."""
    E = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; ra, rb = radii[i], radii[i + 1]
        n = max(1, int(math.ceil((b - a).length / (step * min(ra, rb) * S))))
        for k in range(n):
            t = k / n; E.append(('BALL', tuple(a.lerp(b, t)), (ra + (rb - ra) * t) * S * K, None, 2.0))
    E.append(('BALL', tuple(pts[-1]), radii[-1] * S * K, None, 2.0))
    return E


def surface(o, centre, d):
    """Where a ray from outside along -d towards centre first meets mesh o (o at the origin, unrotated)."""
    bpy.context.view_layer.update()
    hit, loc, nrm, _ = o.ray_cast(centre + d * 0.5, -d)
    return (Vector(loc), Vector(nrm)) if hit else (centre + d * 0.05, d)


LID_OPEN, LID_SHUT = 70.0, -75.0          # (degrees: where the eyelid's edge sits on its dome, open and shut; the browser turns it)


def eyelid(name, centre, q, er, m, parent, c=0.45, R=1.12, RX=2.2, span=150.0):
    """An upper eyelid: part of a dome round the eye (round in its up-down section, so turning it about the eye's across
    axis slides it over the eye without its surface moving), its edge across the eye. Built open (the edge up inside the
    brow); the browser turns it down over the eye (LID_OPEN to LID_SHUT). centre: the dome's middle (behind the eye), q: the
    eye's frame (x across, y up, z out of the face), er: the eye's size."""
    nx, nf = 12, 10
    verts, faces = [], []
    for i in range(nx + 1):
        x = (-1.0 + 2.0 * i / nx) * 1.6 * er
        ryz = R * er * math.sqrt(max(0.0, 1 - (x / (RX * er)) ** 2))       # (smaller towards the corners: the edge arches)
        for j in range(nf + 1):
            ph = math.radians(LID_OPEN + span * j / nf)
            verts.append(tuple(centre + q @ Vector((x, ryz * math.sin(ph), ryz * math.cos(ph) - c * er))))
    for i in range(nx):
        for j in range(nf):
            a = i * (nf + 1) + j; b = a + 1; cc = a + nf + 1; dd = cc + 1
            faces.append((a, cc, dd, b))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    me.validate()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); o.parent = parent
    # facing out of the face (the normals away from the eye)
    bpy.context.view_layer.update()
    pc = o.data.polygons[len(o.data.polygons) // 2]
    if (o.matrix_world @ pc.center - centre).dot(o.matrix_world.to_3x3() @ pc.normal) < 0:
        for p in me.polygons: p.flip()
    return o


def ear_shell(name, w, h, cup, thick, front, m, parent, u0=-1.0, u1=1.0, lift=0.0, fold=0.0, fold_at=0.55):
    """One side of a fox's ear: a rounded triangle cupped like a shell, base at the origin, rising along +z, opening towards
    +x. front=True is the inside of the ear (facing +x), False the back; the two meet along the rim. u0..u1: only that strip
    across the ear (-1 one edge, 1 the other); lift: that far in front of the inside (a layer over it)."""
    nu, nv = max(3, int(round(4 * (u1 - u0)))), 7
    verts, faces = [], []
    for j in range(nv + 1):
        v = j / nv
        half = w * (1 - v ** 1.7) ** 0.75                       # the width tapers to a rounded point
        for i in range(nu + 1):
            u = u0 + (u1 - u0) * i / nu
            bow = (1 - u * u)
            xf = -cup * bow * (0.35 + 0.65 * math.sin(math.pi * min(1.0, v * 1.15)))   # hollow in the middle, flat at the rim
            x = xf + lift * math.sqrt(max(0.0, bow)) if front else xf - thick * math.sqrt(max(0.0, bow)) * (1 - 0.6 * v)
            zz = v * h - 0.12 * h * bow * (1 - v)                                    # the base curves down at its middle
            if fold and v > fold_at:                     # a tipped ear (a collie's): the top folds forward, bending over smoothly
                a = fold * min(1.0, (v - fold_at) / 0.22); zc = fold_at * h; dz = zz - zc
                x, zz = x + dz * math.sin(a), zc + dz * math.cos(a)
            verts.append((x, u * half, zz))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i; b = a + 1; c = a + nu + 1; d = c + 1
            faces.append((a, b, d, c) if front else (a, c, d, b))
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); o.parent = parent
    return o


def fox(kind='fox', seed=1):
    """A fox standing at the origin, facing +x. kind 'fox' (grown, about 0.55 m to the top of the head) or 'cub' (a little
    over half that, with a bigger head, shorter legs and muzzle, and bigger eyes); or 'collie': Biscuit the farm dog, a
    Border Collie on the same frame (longer legs, a deeper chest, a broad head with a shorter muzzle, round brown eyes,
    tipped ears, a long low plumed tail)."""
    random.seed(seed); breeds._mats.clear()
    cub, dog = kind == 'cub', kind == 'collie'
    SH = SHAPES[kind if kind in SHAPES else 'fox']
    S, HD, LG, MZ = SH['S'], SH['HD'], SH['LG'], SH['MZ']      # overall size, the head against the body, leg and muzzle length
    C = COATS[kind if kind in COATS else 'fox']
    coat = flat(kind + '_coat', C['fur'], 0.85)
    black = flat(kind + '_black', C['black'], 0.8); nose = flat(kind + '_nose', C['nose'], 0.35)
    iris = flat(kind + '_iris', C['eye'] if dog else '#c98a2e' if not cub else '#7c5c34', 0.12); pupil = flat('fpupil', '#0b0907', 0.05); glint = flat('fglint', '#ffffff', 0.1)
    rim = flat('frim', '#17110d', 0.4)
    inner = flat(kind + '_inner', '#2e2a2a' if dog else '#e6d6c2', 0.8); hollow = flat(kind + '_hollow', '#6a5250' if dog else '#3b2c25', 0.9)
    root = empty(kind)
    P = lambda x, y, z: Vector((x * S, y * S, z * S))
    hy = 0.34 * LG + 0.03                          # height of the back (legs shorter on a cub)
    # ---- body: chest, belly and hips in one smooth shape, the neck rising from the chest
    E = [('ELLIPSOID', tuple(P(0.13, 0, hy - 0.01)), 0.118 * S * K, (1.3, 0.86, 1.0), 2.0),
         ('ELLIPSOID', tuple(P(-0.01, 0, hy - 0.015)), 0.105 * S * K, (1.45, 0.86, 0.92), 2.0),
         ('ELLIPSOID', tuple(P(-0.15, 0, hy)), 0.108 * S * K, (1.15, 0.9, 0.98), 2.0),
         ('BALL', tuple(P(0.22, 0, hy + 0.07)), 0.082 * S * K, None, 2.0),
         ('BALL', tuple(P(0.27, 0, hy + 0.12)), 0.07 * S * K, None, 2.0)]
    if dog:                                         # a collie: a deeper chest, a tucked-up waist, a strong neck carried higher
        E = [('ELLIPSOID', tuple(P(0.13, 0, hy - 0.025)), 0.128 * S * K, (1.25, 0.86, 1.12), 2.0),
             ('ELLIPSOID', tuple(P(-0.01, 0, hy - 0.002)), 0.1 * S * K, (1.5, 0.84, 0.92), 2.0),      # (a level back)
             ('ELLIPSOID', tuple(P(-0.15, 0, hy + 0.005)), 0.104 * S * K, (1.15, 0.9, 0.96), 2.0),
             ('BALL', tuple(P(0.22, 0, hy + 0.08)), 0.085 * S * K, None, 2.0),
             ('BALL', tuple(P(0.265, 0, hy + 0.135)), 0.072 * S * K, None, 2.0)]
    part(metaball_mesh(kind + '_body', E, res=0.009 * S, m=coat, parent=root), 'chest', 'body', 'fox')
    # ---- head: skull, white cheeks, a tapering muzzle, nose
    hc = P(0.335, 0, hy + 0.19) if not cub else P(0.31, 0, hy + 0.2)
    h = lambda dx, dy, dz: hc + Vector((dx, dy, dz)) * S * HD
    E = [('ELLIPSOID', tuple(h(0, 0, 0)), 0.07 * S * HD * K, (1.1, 1.06, 0.84), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, 0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, -0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(0.07 * MZ, 0, -0.026)), 0.038 * S * HD * K, (1.4, 0.74, 0.66), 2.0),
         ('ELLIPSOID', tuple(h(0.125 * MZ, 0, -0.033)), 0.022 * S * HD * K, (1.6, 0.8, 0.72), 2.0)]
    if dog:                                         # a collie: a broad rounded skull, a clear stop, a strong blunter muzzle
        E = [('ELLIPSOID', tuple(h(0, 0, 0.004)), 0.072 * S * HD * K, (1.05, 1.08, 0.88), 2.0),
             ('ELLIPSOID', tuple(h(0.0, 0.045, -0.028)), 0.04 * S * HD * K, (1.0, 0.85, 0.85), 2.0),
             ('ELLIPSOID', tuple(h(0.0, -0.045, -0.028)), 0.04 * S * HD * K, (1.0, 0.85, 0.85), 2.0),
             ('ELLIPSOID', tuple(h(0.072 * MZ, 0, -0.03)), 0.04 * S * HD * K, (1.45, 0.82, 0.7), 2.0),
             ('ELLIPSOID', tuple(h(0.125 * MZ, 0, -0.036)), 0.026 * S * HD * K, (1.5, 0.92, 0.78), 2.0)]
    head = part(metaball_mesh(kind + '_head', E, res=0.006 * S * HD, m=coat, parent=root), 'head', 'body', 'fox')
    if dog: head['dec'] = 3.0                       # (more of his triangles in the face, so the blaze's edges stay smooth)
    tip = h(0.125 * MZ + 0.033, 0, -0.03)
    # the lower jaw (white, under the muzzle, hinged at the back of the mouth) with the tongue on it; the inside of the mouth
    # (dark) on the head, hidden while the mouth is shut
    chin = flat(kind + '_chin', C['white'], 0.85); gum = flat(kind + '_mouth', '#4b2021', 0.6); tongue_m = flat(kind + '_tongue', '#d9727e', 0.45)
    E = chain([h(0.0, 0, -0.05), h(0.06 * MZ, 0, -0.054), h(0.112 * MZ, 0, -0.05)], [0.026, 0.02, 0.013], S * HD)
    part(metaball_mesh(kind + '_jaw', E, res=0.005 * S * HD, m=chin, parent=root), 'jaw', 'crest')
    part(keep(sphere(kind + '_mouthin', 0.027 * S * HD, tuple(h(0.06 * MZ, 0, -0.043)), (1.75, 0.72, 0.42), m=gum, parent=root, seg=12, rings=6)), 'head')
    part(keep(sphere(kind + '_tongue', 0.016 * S * HD, tuple(h(0.068 * MZ, 0, -0.037)), (2.1, 0.95, 0.34), m=tongue_m, parent=root, seg=10, rings=6)), 'jaw')
    pivot('jaw', tuple(h(-0.012, 0, -0.036)), root)
    part(keep(sphere(kind + '_nose', 0.0135 * S * HD, tuple(tip), (1.0, 1.2, 0.85), m=nose, parent=root, seg=12, rings=8)), 'head')
    # ---- eyes: almond-shaped and set at the front of the skull, looking forward and a little out: a dark rim round an
    # amber iris (a cub's darker), a slit pupil (a cub's round), a catch-light. Placed on the skull's surface.
    er = (0.0135 if cub else 0.0142 if dog else 0.0112) * S * HD
    for sd in (1, -1):
        d = Vector((0.8, sd * 0.58, 0.16)).normalized()
        at, nrm = surface(head, h(0.02, 0, 0.005), d)
        ec = at - d * er * (0.24 if dog else 0.38)                                  # set into the skull, not bulging (a dog's rounder, fuller)
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), sd * -0.22)          # the outer corner a little higher
        rot = q.to_euler()
        dep = lambda k: ec + d * er * k
        # the rim's front sits just behind the iris's, so it shows only as a dark line round it; the pupil and the catch-light
        # stand a hair proud of the iris so they show
        part(keep(sphere(kind + '_rim', er * 1.14, tuple(dep(-0.08)), (1.34, 0.86, 0.46), rot=rot, m=rim, parent=root, seg=14, rings=8)), 'blink' + ('L' if sd > 0 else 'R'))
        part(keep(sphere(kind + '_eye', er, tuple(dep(0.0)), (1.12, 0.92, 0.5) if dog else (1.25, 0.78, 0.5), rot=rot, m=iris, parent=root, seg=14, rings=8)), 'blink' + ('L' if sd > 0 else 'R'))
        ps = (0.6, 0.64, 0.5) if dog else (0.52, 0.56, 0.5) if cub else (0.24, 0.7, 0.5)     # (a dog's pupil round and big)
        part(keep(sphere(kind + '_pupil', er, tuple(dep(0.07)), ps, rot=rot, m=pupil, parent=root, seg=10, rings=6)), 'blink' + ('L' if sd > 0 else 'R'))
        up = q @ Vector((0, 1, 0)); across = q @ Vector((1, 0, 0))
        if dog:       # a big bright catch-light up by the pupil and a little one below: wet, lively eyes
            part(keep(sphere(kind + '_glint', er * 0.21, tuple(dep(0.46) + up * er * 0.3 - across * sd * er * 0.26), (1.0, 1.0, 0.6), rot=rot, m=glint, parent=root, seg=8, rings=5)), 'blink' + ('L' if sd > 0 else 'R'))
            part(keep(sphere(kind + '_glint2', er * 0.085, tuple(dep(0.46) - up * er * 0.32 + across * sd * er * 0.3), (1.0, 1.0, 0.6), rot=rot, m=glint, parent=root, seg=6, rings=4)), 'blink' + ('L' if sd > 0 else 'R'))
        else:
            part(keep(sphere(kind + '_glint', er * 0.16, tuple(dep(0.47) + up * er * 0.28 - across * sd * er * 0.22), m=glint, parent=root, seg=6, rings=4)), 'blink' + ('L' if sd > 0 else 'R'))
        pivot('eye' + ('L' if sd > 0 else 'R'), tuple(ec), root); pivot('blink' + ('L' if sd > 0 else 'R'), tuple(ec), root)
        if dog:       # his upper eyelids (coat black, no fur), and where they turn: about the eye's across axis, tilted about its forward one
            sdn = 'L' if sd > 0 else 'R'; lc = ec - d * er * 0.45
            part(keep(eyelid(kind + '_lid' + sdn, lc, q, er, coat, root)), 'lid' + sdn)
            pivot('lid' + sdn, tuple(lc), root); pivot('lidax' + sdn, tuple(lc + across * er), root); pivot('lidfw' + sdn, tuple(lc + d * er), root)
        # ---- an ear: a tall cupped triangle, its back black above the base, its inside pale and fluffy, leaning out and back
        eh, ew = (0.12 if cub else 0.092 if dog else 0.112) * S * HD, (0.048 if cub else 0.04 if dog else 0.045) * S * HD
        ed = Vector((-0.16, sd * (0.74 if dog else 0.5), 0.66 if dog else 0.85)).normalized()
        eb, _ = surface(head, h(-0.01, 0, 0.0), ed)
        eb = eb - ed * 0.016 * S * HD
        qe = Euler((math.radians(-sd * (30 if dog else 15)), math.radians(-8), math.radians(sd * 16)), 'XYZ')
        # the back (coat: black above an orange base), the dark hollow inside, and a strip of pale fluff along each inner edge
        cup, th = 0.022 * S * HD, 0.009 * S * HD
        pieces = [(False, '_ear', coat, 'down' if dog else 'crest', 'fox_ear', -1, 1, 0), (True, '_earin', hollow, 'keep', None, -1, 1, 0),
                  (True, '_fringeA', inner, 'down', None, -1, -0.68, 0.0015 * S * HD), (True, '_fringeB', inner, 'down', None, 0.68, 1, 0.0015 * S * HD)]
        for front, nm, mm, pnt, col, u0, u1, lift in pieces:
            e = ear_shell(kind + nm + ('L' if sd > 0 else 'R'), ew, eh, cup, th, front, mm, root, u0, u1, lift, fold=0.95 if dog else 0.0, fold_at=0.6)
            e.location = tuple(eb); e.rotation_euler = qe
            part(keep(e), 'ear' + ('L' if sd > 0 else 'R'), pnt, col)
        pivot('ear' + ('L' if sd > 0 else 'R'), tuple(eb + ed * 0.012 * S * HD), root)
    # ---- legs: three bones each. Front: shoulder, elbow (behind it), wrist; hind: hip, knee (forward), hock (back); the
    # paw on the ground in front of the last joint. Black socks, paler on the inside.
    for sd, F, H in ((1, 'FL', 'HL'), (-1, 'FR', 'HR')):
        y = sd * 0.062
        sh, el = P(0.15, y, hy - 0.03), P(0.105, y * 1.03, hy - 0.03 - 0.125 * LG)
        wr, pw = P(0.12, y * 1.04, 0.065 * LG + 0.004), P(0.14, y * 1.04, 0.018)
        lr = [0.054, 0.044, 0.034, 0.029, 0.024, 0.022] if dog else [0.05, 0.04, 0.03, 0.025, 0.02, 0.019]     # (a dog's legs a little sturdier)
        E = chain([sh, sh.lerp(el, 0.5), el, el.lerp(wr, 0.5), wr, pw + Vector((0, 0, 0.01 * S))], lr, S) + \
            [('ELLIPSOID', tuple(pw + Vector((0.012 * S, 0, -0.002 * S))), 0.022 * S * K, (1.5, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + F, E, res=0.006 * S, m=coat, parent=root), F + 'u', 'legfeather', 'fox_leg')
        pivot(F + 'u', tuple(sh), root); pivot(F + 'l', tuple(el), root); pivot(F + 'w', tuple(wr), root); pivot(F + 'p', tuple(pw), root)
        y = sd * 0.068
        # (a fox's hind leg: the thigh a broad flat muscle that is part of the body's outline, a slim shin angled back to a
        # high hock, and a long straight foot down to the paw; not a round drumstick)
        # (the knee high up, tucked in the haunch; below the body the leg angles BACK to the hock, then the foot comes down
        # and a little forward to the paw: the bend you see points backwards, as on a dog)
        hip, kn = P(-0.15, y, hy - 0.015), P(-0.142, y * 1.04, hy - 0.015 - 0.065 * LG)
        hk, pw = P(-0.248, y * 1.04, 0.135 * LG), P(-0.205, y * 1.04, 0.018)
        lr = [0.054, 0.044, 0.034, 0.028, 0.024, 0.021] if dog else [0.05, 0.04, 0.03, 0.024, 0.02, 0.017]
        E = chain([hip, hip.lerp(kn, 0.5), kn, kn.lerp(hk, 0.5), hk, pw + Vector((0, 0, 0.01 * S))], lr, S) + \
            [('ELLIPSOID', tuple(hip.lerp(kn, 0.7) + Vector((-0.01 * S, 0, 0))), 0.062 * S * K, (1.25, 0.62, 1.0), 2.0),      # the haunch, over the knee
             ('ELLIPSOID', tuple(pw + Vector((0.012 * S, 0, -0.002 * S))), 0.022 * S * K, (1.5, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + H, E, res=0.006 * S, m=coat, parent=root), H + 'u', 'legfeather', 'fox_leg')
        pivot(H + 'u', tuple(hip), root); pivot(H + 'k', tuple(kn), root); pivot(H + 'l', tuple(hk), root); pivot(H + 'p', tuple(pw), root)
    # ---- the brush: big and bushy in four bones, rising from the hips, arching down and back, the white tip turning up
    if dog:                                         # a collie's tail: long, carried low, plumed, an upward sweep at the tip
        tl = [P(-0.205, 0, hy + 0.01), P(-0.29, 0, hy - 0.055), P(-0.345, 0, hy - 0.15), P(-0.37, 0, hy - 0.245), P(-0.36, 0, hy - 0.32), P(-0.315, 0, hy - 0.36)]
        rad = [0.028, 0.034, 0.038, 0.037, 0.031, 0.02]
    elif not cub:
        tl = [P(-0.205, 0, hy + 0.03), P(-0.33, 0, hy - 0.005), P(-0.45, 0, hy - 0.075), P(-0.56, 0, hy - 0.14), P(-0.655, 0, hy - 0.17), P(-0.74, 0, hy - 0.16)]
        rad = [0.033, 0.052, 0.066, 0.068, 0.058, 0.036]
    else:
        tl = [P(-0.205, 0, hy + 0.025), P(-0.3, 0, hy - 0.005), P(-0.39, 0, hy - 0.05), P(-0.47, 0, hy - 0.095), P(-0.54, 0, hy - 0.115), P(-0.595, 0, hy - 0.105)]
        rad = [0.03, 0.043, 0.051, 0.052, 0.045, 0.03]
    E = chain(tl, rad, S)
    part(metaball_mesh(kind + '_tail', E, res=0.008 * S, m=coat, parent=root), 'tail1', 'tail', 'fox_tail')
    for i, nm in enumerate(TAIL_BONES): pivot(nm, tuple(tl[i]), root)
    pivot('tailtip', tuple(tl[-1]), root)
    # ---- the other pivots
    pivot('hips', tuple(P(-0.12, 0, hy)), root); pivot('chest', tuple(P(0.1, 0, hy)), root)
    pivot('neck', tuple(P(0.22, 0, hy + 0.05)), root); pivot('head', tuple(hc + Vector((-0.04, 0, -0.045)) * S * HD), root)
    pivot('headc', tuple(hc), root); pivot('nose', tuple(tip), root)
    return root


# the den's tunnel (Blender axes, the den's middle at the origin, its mouth facing +x): the mouth's centre x and height, how
# far it runs into the bank, its half-width (ry) and half-height (rz), its slope down (degrees)
DEN_TUNNEL = dict(x=0.62, back=-0.75, front=0.95, z=0.21, ry=0.3, rz=0.3, tilt=6)


def flat_box(name, size, loc, m):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; setmat(o, m)
    return o


def den():
    """The foxes' den at the edge of the woods: a grassy bank with a dark round entrance facing +x, a fan of dug-out earth in
    front, a few roots and stones. About 1.9 x 1.5 m, big enough for the whole fox in its tunnel. Ground at z=0."""
    random.seed(4); objs = []
    soil = mat('densoil', '#6f4d33', rough=0.95, var=0.12); dug = mat('dendug', '#8a6446', rough=0.95, var=0.1)
    turf = mat('denturf', '#5d8c3c', rough=0.9, var=0.1, hue_var=0.015); dark = mat('denhole', '#120c08', rough=1.0)
    root_m = mat('denroot', '#5b4330', rough=0.85, var=0.1); stone = mat('denstone', '#8f8a80', rough=0.85, var=0.1)
    # a bank tall enough to dig into: a steep earth face towards +x, turf over the top and back
    objs.append(sphere('dmound', 0.62, (-0.12, 0, -0.18), (1.4, 1.15, 1.5), m=soil, ico=4, disp=0.05, disp_scale=3.0, seed=5))
    objs.append(sphere('dturf', 0.6, (-0.4, 0, -0.08), (1.35, 1.2, 1.42), m=turf, ico=3, disp=0.05, disp_scale=4.0, seed=6))
    # the entrance: a real tunnel into the bank (DEN_TUNNEL: the browser keeps the foxes inside it as they come and go), dark
    # inside, with an earth floor
    T = DEN_TUNNEL
    cut = cyl('dcut', 1.0, T['front'] - T['back'], ((T['front'] + T['back']) / 2, 0, T['z']), m=dark, verts=28, bevel=0.0)
    cut.rotation_euler = (0, math.radians(90 - T['tilt']), 0); cut.scale = (T['rz'], T['ry'], 1.0)       # (the back end lower)
    cut.hide_render = True; cut.hide_set(True)
    for o in objs[:2]:                         # the mound and the turf
        md = o.modifiers.new('tunnel', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cut; md.solver = 'EXACT'
        if hasattr(md, 'material_mode'): md.material_mode = 'TRANSFER'
    floor = flat_box('dfloor', (T['x'] - T['back'], T['ry'] * 1.7, 0.01), ((T['x'] + T['back']) / 2, 0, 0.004), mat('denfloor', '#2a1d14', rough=1.0))
    objs.append(floor)
    objs.append(sphere('dspoil', 0.32, (0.95, 0.02, -0.02), (1.1, 1.3, 0.1), m=dug, ico=3, disp=0.05, disp_scale=5.0, seed=7))
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    def bank(x, y):                            # the bank's height at (x, y) (the mound or the turf over it, as cut)
        best = 0.0
        for o in objs[:2]:
            inv = o.matrix_world.inverted(); org = inv @ Vector((x, y, 3.0)); dr = (inv.to_3x3() @ Vector((0, 0, -1))).normalized()
            hit, loc, nrm, idx = o.ray_cast(org, dr, depsgraph=dg)
            if hit: best = max(best, (o.matrix_world @ loc).z)
        return best
    for k in range(3):                         # roots over the bank, down its sides (clear of the entrance), half buried in it
        a = math.radians((-60, 55, 80)[k]); x0, y0 = -0.3 + 0.1 * k, math.sin(a) * 0.3; x1, y1 = 0.55 + 0.05 * k, math.sin(a) * 0.66
        pts = []
        for i in range(13):                    # down the bank until it meets the ground, where the root goes in
            t = i / 12; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t + 0.05 * math.sin(t * math.pi) * (1 if y1 > 0 else -1)
            hz = bank(x, y)
            if hz < 0.05: pts.append(Vector((x, y, -0.015))); break
            if i % 2 == 0: pts.append(Vector((x, y, hz - 0.008)))
        for (a_, b_) in zip(pts, pts[1:]):
            d = b_ - a_; o = cyl('droot', 0.022 - 0.004 * k, d.length + 0.02, tuple((a_ + b_) / 2), m=root_m, verts=8, r2=0.02 - 0.004 * k, bevel=0.0)
            o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); objs.append(o)
    for k in range(5):                         # stones by the sides (none on the foxes' way in and out)
        a = random.uniform(0.7, 1.6) * (1 if k % 2 else -1); r = random.uniform(0.75, 1.0)
        objs.append(sphere('dstone', random.uniform(0.03, 0.06), (math.cos(a) * r * 0.8, math.sin(a) * r * 0.9, 0.0), (1.2, 1.0, 0.6), m=stone, ico=2, disp=0.2, seed=20 + k))
    root = empty('den')
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return root


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 32
    scn = reset()
    cyl('ground', 3.0, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    a = fox('fox'); a.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -20))))
    c = fox('cub'); c.location = (0.75, -0.3, 0); c.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -20)) - 15))
    lighting(scn)
    camera(scn, (0.5, -2.2, 0.7), (0.3, -0.1, 0.28), lens=45)
    render(scn, os.environ.get('NAME', 'fox_family'), 1000, 800, samples)
