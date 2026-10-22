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
          'FLu', 'FLl', 'FLw', 'FRu', 'FRl', 'FRw', 'HLu', 'HLk', 'HLl', 'HRu', 'HRk', 'HRl']
# the legs' bones, top down: front shoulder (upper arm), elbow (forearm), wrist (the paw); hind hip (thigh), knee (shin), hock
LEG_BONES = {'FL': ['FLu', 'FLl', 'FLw'], 'FR': ['FRu', 'FRl', 'FRw'], 'HL': ['HLu', 'HLk', 'HLl'], 'HR': ['HRu', 'HRk', 'HRl']}
TAIL_BONES = ['tail1', 'tail2', 'tail3', 'tail4']
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


def surface(o, centre, d):
    """Where a ray from outside along -d towards centre first meets mesh o (o at the origin, unrotated)."""
    bpy.context.view_layer.update()
    hit, loc, nrm, _ = o.ray_cast(centre + d * 0.5, -d)
    return (Vector(loc), Vector(nrm)) if hit else (centre + d * 0.05, d)


def ear_shell(name, w, h, cup, thick, front, m, parent, u0=-1.0, u1=1.0, lift=0.0):
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
            verts.append((x, u * half, v * h - 0.12 * h * bow * (1 - v)))           # the base curves down at its middle
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
    iris = flat(kind + '_iris', '#c98a2e' if not cub else '#7c5c34', 0.12); pupil = flat('fpupil', '#0b0907', 0.05); glint = flat('fglint', '#ffffff', 0.1)
    rim = flat('frim', '#17110d', 0.4)
    inner = flat(kind + '_inner', '#e6d6c2', 0.8); hollow = flat(kind + '_hollow', '#3b2c25', 0.9)
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
    # ---- head: skull, white cheeks, a tapering muzzle, nose
    hc = P(0.335, 0, hy + 0.19) if not cub else P(0.31, 0, hy + 0.2)
    h = lambda dx, dy, dz: hc + Vector((dx, dy, dz)) * S * HD
    E = [('ELLIPSOID', tuple(h(0, 0, 0)), 0.07 * S * HD * K, (1.1, 1.06, 0.84), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, 0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(-0.004, -0.05, -0.03)), 0.042 * S * HD * K, (1.0, 0.9, 0.85), 2.0),
         ('ELLIPSOID', tuple(h(0.07 * MZ, 0, -0.026)), 0.038 * S * HD * K, (1.4, 0.74, 0.66), 2.0),
         ('ELLIPSOID', tuple(h(0.125 * MZ, 0, -0.033)), 0.022 * S * HD * K, (1.6, 0.8, 0.72), 2.0)]
    head = part(metaball_mesh(kind + '_head', E, res=0.006 * S * HD, m=coat, parent=root), 'head', 'body', 'fox')
    tip = h(0.125 * MZ + 0.033, 0, -0.03)
    part(keep(sphere(kind + '_nose', 0.0135 * S * HD, tuple(tip), (1.0, 1.2, 0.85), m=nose, parent=root, seg=12, rings=8)), 'head')
    # ---- eyes: almond-shaped and set at the front of the skull, looking forward and a little out: a dark rim round an
    # amber iris (a cub's darker), a slit pupil (a cub's round), a catch-light. Placed on the skull's surface.
    er = (0.0135 if cub else 0.0112) * S * HD
    for sd in (1, -1):
        d = Vector((0.8, sd * 0.58, 0.16)).normalized()
        at, nrm = surface(head, h(0.02, 0, 0.005), d)
        ec = at - d * er * 0.38                                                     # set into the skull, not bulging
        q = d.to_track_quat('Z', 'Y') @ Quaternion((0, 0, 1), sd * -0.22)          # the outer corner a little higher
        rot = q.to_euler()
        dep = lambda k: ec + d * er * k
        # the rim's front sits just behind the iris's, so it shows only as a dark line round it; the pupil and the catch-light
        # stand a hair proud of the iris so they show
        part(keep(sphere(kind + '_rim', er * 1.14, tuple(dep(-0.08)), (1.34, 0.86, 0.46), rot=rot, m=rim, parent=root, seg=14, rings=8)), 'head')
        part(keep(sphere(kind + '_eye', er, tuple(dep(0.0)), (1.25, 0.78, 0.5), rot=rot, m=iris, parent=root, seg=14, rings=8)), 'head')
        ps = (0.52, 0.56, 0.5) if cub else (0.24, 0.7, 0.5)
        part(keep(sphere(kind + '_pupil', er, tuple(dep(0.07)), ps, rot=rot, m=pupil, parent=root, seg=10, rings=6)), 'head')
        up = q @ Vector((0, 1, 0)); across = q @ Vector((1, 0, 0))
        part(keep(sphere(kind + '_glint', er * 0.16, tuple(dep(0.47) + up * er * 0.28 - across * sd * er * 0.22), m=glint, parent=root, seg=6, rings=4)), 'head')
        pivot('eye' + ('L' if sd > 0 else 'R'), tuple(ec), root)
        # ---- an ear: a tall cupped triangle, its back black above the base, its inside pale and fluffy, leaning out and back
        eh, ew = (0.12 if cub else 0.112) * S * HD, (0.048 if cub else 0.045) * S * HD
        ed = Vector((-0.16, sd * 0.5, 0.85)).normalized()
        eb, _ = surface(head, h(-0.01, 0, 0.0), ed)
        eb = eb - ed * 0.016 * S * HD
        qe = Euler((math.radians(-sd * 15), math.radians(-8), math.radians(sd * 16)), 'XYZ')
        # the back (coat: black above an orange base), the dark hollow inside, and a strip of pale fluff along each inner edge
        cup, th = 0.022 * S * HD, 0.009 * S * HD
        pieces = [(False, '_ear', coat, 'crest', 'fox_ear', -1, 1, 0), (True, '_earin', hollow, 'keep', None, -1, 1, 0),
                  (True, '_fringeA', inner, 'down', None, -1, -0.68, 0.0015 * S * HD), (True, '_fringeB', inner, 'down', None, 0.68, 1, 0.0015 * S * HD)]
        for front, nm, mm, pnt, col, u0, u1, lift in pieces:
            e = ear_shell(kind + nm + ('L' if sd > 0 else 'R'), ew, eh, cup, th, front, mm, root, u0, u1, lift)
            e.location = tuple(eb); e.rotation_euler = qe
            part(keep(e), 'head', pnt, col)
    # ---- legs: three bones each. Front: shoulder, elbow (behind it), wrist; hind: hip, knee (forward), hock (back); the
    # paw on the ground in front of the last joint. Black socks, paler on the inside.
    for sd, F, H in ((1, 'FL', 'HL'), (-1, 'FR', 'HR')):
        y = sd * 0.062
        sh, el = P(0.15, y, hy - 0.03), P(0.105, y * 1.03, hy - 0.03 - 0.125 * LG)
        wr, pw = P(0.12, y * 1.04, 0.065 * LG + 0.004), P(0.14, y * 1.04, 0.018)
        E = chain([sh, sh.lerp(el, 0.5), el, el.lerp(wr, 0.5), wr, pw + Vector((0, 0, 0.01 * S))], [0.05, 0.04, 0.03, 0.025, 0.02, 0.019], S) + \
            [('ELLIPSOID', tuple(pw + Vector((0.012 * S, 0, -0.002 * S))), 0.022 * S * K, (1.5, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + F, E, res=0.006 * S, m=coat, parent=root), F + 'u', 'legfeather', 'fox_leg')
        pivot(F + 'u', tuple(sh), root); pivot(F + 'l', tuple(el), root); pivot(F + 'w', tuple(wr), root); pivot(F + 'p', tuple(pw), root)
        y = sd * 0.068
        hip, kn = P(-0.15, y, hy - 0.02), P(-0.1, y * 1.05, hy - 0.02 - 0.13 * LG)
        hk, pw = P(-0.205, y * 1.05, 0.095 * LG), P(-0.185, y * 1.05, 0.018)
        E = chain([hip, hip.lerp(kn, 0.5), kn, kn.lerp(hk, 0.5), hk, pw + Vector((0, 0, 0.01 * S))], [0.068, 0.056, 0.04, 0.03, 0.021, 0.018], S) + \
            [('ELLIPSOID', tuple(pw + Vector((0.012 * S, 0, -0.002 * S))), 0.022 * S * K, (1.5, 0.95, 0.62), 2.0)]
        part(metaball_mesh(kind + '_leg' + H, E, res=0.006 * S, m=coat, parent=root), H + 'u', 'legfeather', 'fox_leg')
        pivot(H + 'u', tuple(hip), root); pivot(H + 'k', tuple(kn), root); pivot(H + 'l', tuple(hk), root); pivot(H + 'p', tuple(pw), root)
    # ---- the brush: big and bushy in four bones, rising from the hips, arching down and back, the white tip turning up
    if not cub:
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
