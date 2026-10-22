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

JOINTS = ['root', 'hips', 'chest', 'neck', 'head', 'tail1', 'tail2', 'tail3', 'FLu', 'FLl', 'FRu', 'FRl', 'HLu', 'HLl', 'HRu', 'HRl']
COATS = {
    # a red fox: rusty orange, a darker saddle, white throat, chest, belly and tail tip, black socks and ear backs
    'fox': dict(fur='#c4592a', back='#9f4420', white='#efe6d8', black='#2a1f19', eye='#d9982c', nose='#1a1412'),
    # a cub: softer, browner and greyer, lighter round the muzzle
    'cub': dict(fur='#9a6a4a', back='#7d5539', white='#e3d6c3', black='#4a3a30', eye='#5b4a3a', nose='#1e1714'),
}


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


def fox(kind='fox', seed=1):
    """A fox standing at the origin, facing +x. kind 'fox' (grown, about 0.55 m to the top of the head) or 'cub' (a little
    over half that, with a bigger head, shorter legs and muzzle, and bigger eyes)."""
    random.seed(seed); breeds._mats.clear()
    cub = kind == 'cub'
    S = 0.56 if cub else 1.0                      # overall size
    HD = 1.38 if cub else 1.0                     # the head's size against the body
    LG = 0.82 if cub else 1.0                     # leg length
    MZ = 0.62 if cub else 1.0                     # muzzle length
    C = COATS['cub' if cub else 'fox']
    coat = flat(kind + '_coat', C['fur'], 0.85)
    black = flat(kind + '_black', C['black'], 0.8); nose = flat(kind + '_nose', C['nose'], 0.35)
    iris = flat(kind + '_iris', C['eye'], 0.15); pupil = flat('fpupil', '#0b0907', 0.05); glint = flat('fglint', '#ffffff', 0.1)
    inner = flat(kind + '_inner', '#e9cbb9', 0.8)
    root = empty(kind)
    P = lambda x, y, z: Vector((x * S, y * S, z * S))
    hy = 0.34 * LG + 0.03                          # height of the back (legs shorter on a cub)
    # ---- body: chest, belly and hips in one smooth shape, the neck rising from the chest
    E = [('ELLIPSOID', tuple(P(0.13, 0, hy - 0.01)), 0.118 * S * K, (1.3, 0.86, 1.0), 2.0),
         ('ELLIPSOID', tuple(P(-0.01, 0, hy - 0.015)), 0.105 * S * K, (1.45, 0.86, 0.92), 2.0),
         ('ELLIPSOID', tuple(P(-0.15, 0, hy)), 0.108 * S * K, (1.15, 0.9, 0.98), 2.0),
         ('BALL', tuple(P(0.22, 0, hy + 0.07)), 0.082 * S * K, None, 2.0),
         ('BALL', tuple(P(0.27, 0, hy + 0.12)), 0.07 * S * K, None, 2.0)]
    part(metaball_mesh(kind + '_body', E, res=0.009 * S, m=coat, parent=root), 'chest', 'body', 'fox')
    # ---- head: skull, white cheeks, a tapering muzzle, nose, eyes and big ears
    hc = P(0.335, 0, hy + 0.19) if not cub else P(0.31, 0, hy + 0.2)
    h = lambda dx, dy, dz: hc + Vector((dx, dy, dz)) * S * HD
    E = [('ELLIPSOID', tuple(h(0, 0, 0)), 0.07 * S * HD * K, (1.1, 1.06, 0.84), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, 0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, -0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(0.07 * MZ, 0, -0.026)), 0.038 * S * HD * K, (1.4, 0.74, 0.66), 2.0),
         ('ELLIPSOID', tuple(h(0.125 * MZ, 0, -0.033)), 0.022 * S * HD * K, (1.6, 0.8, 0.72), 2.0)]
    part(metaball_mesh(kind + '_head', E, res=0.006 * S * HD, m=coat, parent=root), 'head', 'body', 'fox')
    tip = h(0.125 * MZ + 0.033, 0, -0.03)
    part(keep(sphere(kind + '_nose', 0.0135 * S * HD, tuple(tip), (1.0, 1.2, 0.85), m=nose, parent=root, seg=12, rings=8)), 'head')
    er = (0.018 if cub else 0.0125) * S * HD
    for sd in (1, -1):
        ec = h(0.05, sd * 0.04, 0.008)
        part(keep(sphere(kind + '_eye', er, tuple(ec), m=iris, parent=root, seg=12, rings=8)), 'head')
        if cub: part(keep(sphere(kind + '_pupil', er * 0.62, tuple(ec + Vector((0.004, sd * 0.006, 0.001)) * S * HD), m=pupil, parent=root, seg=10, rings=6)), 'head')
        else: part(keep(sphere(kind + '_pupil', er * 0.95, tuple(ec + Vector((0.006, sd * 0.0045, 0.0)) * S * HD), (0.3, 0.3, 0.95), m=pupil, parent=root, seg=10, rings=6)), 'head')
        part(keep(sphere(kind + '_glint', er * 0.24, tuple(ec + Vector((0.009, sd * 0.007, 0.006)) * S * HD), m=glint, parent=root, seg=6, rings=4)), 'head')
        # an ear: a tall rounded cone leaning out and back, pale inside, black tip and back (coloured per vertex)
        eh = (0.1 if cub else 0.092) * S * HD
        eb = h(-0.012, sd * 0.042, 0.052)
        e = cyl(kind + '_ear', 0.036 * S * HD, eh, (0, 0, 0), m=coat, verts=14, r2=0.004 * S * HD, bevel=0.0); e.parent = root
        e.scale = (0.55, 1.0, 1.0)
        e.rotation_euler = (math.radians(-sd * 16), math.radians(-12), 0)
        e.location = tuple(eb + Vector((0, 0, eh / 2)) + Vector((-0.012, sd * 0.012, 0)) * S * HD)
        part(e, 'head', 'crest', 'fox_ear')
        ie = cyl(kind + '_earin', 0.026 * S * HD, eh * 0.78, (0, 0, 0), m=inner, verts=12, r2=0.003 * S * HD, bevel=0.0); ie.parent = root
        ie.scale = (0.25, 1.0, 1.0)
        ie.rotation_euler = (math.radians(-sd * 16), math.radians(-12), 0)
        ie.location = tuple(eb + Vector((0, 0, eh * 0.42)) + Vector((0.006, sd * 0.012, 0)) * S * HD)
        part(ie, 'head')
    # ---- legs: two bones each (upper, lower), black socks; front legs straight, hind legs with the hock
    for sd, F, H in ((1, 'FL', 'HL'), (-1, 'FR', 'HR')):
        y = sd * 0.062
        sh, el, pw = P(0.14, y, hy - 0.05), P(0.145, y * 1.04, hy - 0.05 - 0.15 * LG), P(0.16, y * 1.04, 0.022)
        E = chain([sh, sh.lerp(el, 0.55), el, pw + Vector((0, 0, 0.014 * S))], [0.05, 0.034, 0.024, 0.019], S) + \
            [('ELLIPSOID', tuple(pw + Vector((0.016 * S, 0, -0.004 * S))), 0.023 * S * K, (1.45, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + F, E, res=0.0065 * S, m=coat, parent=root), F + 'u', 'legfeather', 'fox_leg')
        pivot(F + 'u', tuple(sh), root); pivot(F + 'l', tuple(el), root); pivot(F + 'p', tuple(pw), root)
        y = sd * 0.068
        hip, kn, hk, pw = P(-0.16, y, hy - 0.04), P(-0.12, y * 1.05, hy - 0.04 - 0.13 * LG), P(-0.2, y * 1.05, 0.03 + 0.08 * LG), P(-0.185, y * 1.05, 0.022)
        E = chain([hip, hip.lerp(kn, 0.5), kn, hk, pw + Vector((0, 0, 0.014 * S))], [0.066, 0.05, 0.032, 0.02, 0.018], S) + \
            [('ELLIPSOID', tuple(pw + Vector((0.016 * S, 0, -0.004 * S))), 0.023 * S * K, (1.45, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + H, E, res=0.0065 * S, m=coat, parent=root), H + 'u', 'legfeather', 'fox_leg')
        pivot(H + 'u', tuple(hip), root); pivot(H + 'l', tuple(hk), root); pivot(H + 'k', tuple(kn), root); pivot(H + 'p', tuple(pw), root)
    # ---- the brush: a big bushy tail in three bones, curving down and back, a white tip
    tl = [P(-0.22, 0, hy + 0.02), P(-0.36, 0, hy - 0.03), P(-0.5, 0, hy - 0.09), P(-0.63, 0, hy - 0.15), P(-0.73, 0, hy - 0.17)]
    if cub: tl = [P(-0.22, 0, hy + 0.02), P(-0.33, 0, hy - 0.02), P(-0.43, 0, hy - 0.07), P(-0.52, 0, hy - 0.11), P(-0.58, 0, hy - 0.12)]
    rad = [0.035, 0.055, 0.068, 0.064, 0.042] if not cub else [0.03, 0.045, 0.05, 0.046, 0.032]
    E = chain(tl, rad, S)
    part(metaball_mesh(kind + '_tail', E, res=0.008 * S, m=coat, parent=root), 'tail1', 'tail', 'fox_tail')
    for i, nm in enumerate(('tail1', 'tail2', 'tail3')): pivot(nm, tuple(tl[i]), root)
    pivot('tailtip', tuple(tl[-1]), root)
    # ---- the other pivots
    pivot('hips', tuple(P(-0.12, 0, hy)), root); pivot('chest', tuple(P(0.1, 0, hy)), root)
    pivot('neck', tuple(P(0.22, 0, hy + 0.05)), root); pivot('head', tuple(hc + Vector((-0.04, 0, -0.045)) * S * HD), root)
    pivot('headc', tuple(hc), root); pivot('nose', tuple(tip), root)
    return root


def den():
    """The foxes' den at the edge of the woods: a grassy bank with a dark round entrance facing +x, a fan of dug-out earth in
    front, a few roots and stones. About 1.6 x 1.3 m. Ground at z=0."""
    random.seed(4); objs = []
    soil = mat('densoil', '#6f4d33', rough=0.95, var=0.12); dug = mat('dendug', '#8a6446', rough=0.95, var=0.1)
    turf = mat('denturf', '#5d8c3c', rough=0.9, var=0.1, hue_var=0.015); dark = mat('denhole', '#120c08', rough=1.0)
    root_m = mat('denroot', '#5b4330', rough=0.85, var=0.1); stone = mat('denstone', '#8f8a80', rough=0.85, var=0.1)
    objs.append(sphere('dmound', 0.62, (-0.08, 0, -0.06), (1.25, 1.05, 0.72), m=soil, ico=3, disp=0.06, disp_scale=3.0, seed=5))
    objs.append(sphere('dturf', 0.6, (-0.26, 0, 0.0), (1.08, 1.02, 0.66), m=turf, ico=3, disp=0.05, disp_scale=4.0, seed=6))
    # the entrance: a dark hollow in the bank's face, with a lip of earth
    hole = sphere('dhole', 0.2, (0.56, 0, 0.15), (0.5, 1.2, 0.95), m=dark, seg=20, rings=12); objs.append(hole)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.21, minor_radius=0.05, major_segments=20, minor_segments=8, location=(0.58, 0, 0.15), rotation=(0, math.radians(70), 0))
    lip = bpy.context.object; lip.scale = (1.0, 1.15, 0.9); setmat(lip, soil); objs.append(lip)
    objs.append(sphere('dspoil', 0.32, (0.92, 0.02, -0.02), (1.1, 1.3, 0.14), m=dug, ico=3, disp=0.05, disp_scale=5.0, seed=7))
    for k in range(3):                         # roots over the bank, one arching over the entrance
        a = math.radians(-40 + k * 40); r0 = Vector((-0.25 + 0.1 * k, math.sin(a) * 0.3, 0.42)); r1 = Vector((0.45 + 0.05 * k, math.sin(a) * 0.62, 0.04))
        mid = (r0 + r1) / 2 + Vector((0.05, 0, 0.1))
        for (a_, b_) in ((r0, mid), (mid, r1)):
            d = b_ - a_; o = cyl('droot', 0.022 - 0.004 * k, d.length, tuple((a_ + b_) / 2), m=root_m, verts=8, r2=0.016 - 0.003 * k, bevel=0.0)
            o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); objs.append(o)
    for k in range(5):
        a = random.uniform(-1.4, 1.4); r = random.uniform(0.75, 1.1)
        objs.append(sphere('dstone', random.uniform(0.03, 0.06), (math.cos(a) * r * 0.8, math.sin(a) * r * 0.75, 0.0), (1.2, 1.0, 0.6), m=stone, ico=2, disp=0.2, seed=20 + k))
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
