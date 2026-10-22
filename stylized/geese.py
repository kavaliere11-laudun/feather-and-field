"""The farm's geese, built for the browser like the foxes: smooth shapes in parts that bones can move, feathered in the
browser with the birds' feather drawing. Two characters: Gertrude, a big white Embden goose (the boss), and Hector, a grey
Toulouse gander, heavier and lower, with a dewlap under his bill and a paunch (he follows her everywhere).
Each mesh is tagged with its part (o['part']: the bone it follows), its feather region (o['paint']: as the birds' paint
regions: the feather size and the fluff), and how it is coloured (o['col']: 'goose' for the plumage worked out per vertex by
the exporter, otherwise its material's colour). Pivot empties (pv_*) mark where the bones turn.
Bones (JOINTS): root; body; the neck in four (neck1 at its base .. neck4 under the head); head; jaw (the lower bill: honks
and hisses); blinkL/R (the eyes); wingL/R (the folded wing: lifted and ruffled) and wingLo/Ro (the open wing, spread out to
the side: the browser grows it from the shoulder as the folded one tucks away, and flaps it); tail (wags); each leg:
legL (hip: the feathered thigh), legLk (the heel, at the top of the orange shank), legLf (the webbed foot).
Blender metres; the goose faces +x here (the exporter turns it to face the camera's way).
Run directly for a picture: python geese.py [samples]"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import breeds
from breeds import flat, pivot, keep, PAINT, ribbon
from hen import K
from beasts import part, chain, surface
from mathutils import Quaternion, Euler

JOINTS = ['root', 'body', 'neck1', 'neck2', 'neck3', 'neck4', 'head', 'jaw', 'blinkL', 'blinkR',
          'wingL', 'wingLo', 'wingR', 'wingRo', 'tail', 'legL', 'legLk', 'legLf', 'legR', 'legRk', 'legRf']
NECK = ['neck1', 'neck2', 'neck3', 'neck4']
GEESE = {
    # a white Embden goose: tall and upright, blue eyes, an orange bill with a pale nail
    'embden': dict(name='Gertrude', S=1.0, BL=1.0, low=0.0, LG=1.0, paunch=False, dewlap=False,
                   coat=dict(white='#f6f4ef', shade='#dedad2'), iris='#78a6d6', ring='#f4c9a0', bill='#f28a2a', nail='#f3dccb', feet='#f2892c'),
    # a grey Toulouse gander: longer and lower, a paunch hanging between his legs, a dewlap under his bill, dark eyes with an
    # orange ring; dark grey head, neck and back, grey wings with pale-edged feathers, a pale breast, white belly and tail end
    'toulouse': dict(name='Hector', S=1.0, BL=1.08, low=0.03, LG=0.86, paunch=True, dewlap=True,
                     coat=dict(dark='#5f5a56', back='#77716b', wing='#7d7770', edge='#d2ccc1', breast='#a29c94', belly='#f1eee7'),
                     iris='#3a2618', ring='#ea8e36', bill='#ec8c30', nail='#cbb9a7', feet='#e6832f'),
}


def neck_points(B):
    """The neck's joints (base inside the body's front .. under the head), the head's middle and the bill's base."""
    S, BL, zc = B['S'], B['BL'], 0.29 - B['low']
    base = Vector((0.13 * BL, 0, zc + 0.06)) * 1.0
    off = [Vector((0, 0, 0)), Vector((0.05, 0, 0.1)), Vector((0.066, 0, 0.2)), Vector((0.06, 0, 0.29)), Vector((0.076, 0, 0.355))]
    N = [(base + o) * S for o in off]
    H = N[4] + Vector((0.034, 0, 0.03)) * S
    return N, H


def goose(kind='embden', seed=1):
    """A goose standing at the origin, facing +x."""
    random.seed(seed); breeds._mats.clear()
    B = GEESE[kind]; S, BL, LG = B['S'], B['BL'], B['LG']
    zc = (0.29 - B['low']) * S                             # the body's middle, its height
    P = lambda x, y, z: Vector((x * S, y * S, z * S))
    coat = flat(kind + '_coat', list(B['coat'].values())[0], 0.85)
    bill = flat(kind + '_bill', B['bill'], 0.42); nail = flat(kind + '_nail', B['nail'], 0.4); feet = flat(kind + '_feet', B['feet'], 0.5)
    lower = flat(kind + '_lowbill', B['bill'], 0.45); gum = flat('gmouth', '#6a2a2c', 0.6); tongue = flat('gtongue', '#e08a8c', 0.45)
    iris = flat(kind + '_iris', B['iris'], 0.12); pupil = flat('gpupil', '#0b0907', 0.05); glint = flat('gglint', '#ffffff', 0.1)
    ring = flat(kind + '_ring', B['ring'], 0.5); dark = flat('gdark', '#2a2420', 0.5); claw = flat('gclaw', '#3a2e27', 0.5)
    root = empty(kind)
    N, H = neck_points(B)
    # ---- the body and neck in one smooth shape: a long boat of a body, a full breast, the rump rising to the tail, soft
    # feathers under the tail; the neck rising from the front of the body in a gentle S
    E = [('ELLIPSOID', tuple(P(-0.02 * BL, 0, zc / S)), 0.13 * S * K, (1.9 * BL, 1.0, 0.9), 2.0),
         ('BALL', tuple(P(0.115 * BL, 0, zc / S - 0.005)), 0.106 * S * K, None, 2.0),
         ('ELLIPSOID', tuple(P(-0.03 * BL, 0, zc / S - 0.05)), 0.11 * S * K, (1.7 * BL, 0.95, 0.75), 2.0),
         ('ELLIPSOID', tuple(P(-0.21 * BL, 0, zc / S + 0.035)), 0.075 * S * K, (1.4, 0.85, 0.75), 2.0),
         ('ELLIPSOID', tuple(P(-0.245 * BL, 0, zc / S - 0.015)), 0.06 * S * K, (1.2, 0.8, 0.85), 2.0)]
    if B['paunch']:            # a Toulouse's paunch: two soft lobes hanging low between the legs
        for sd in (1, -1): E.append(('ELLIPSOID', tuple(P(-0.07 * BL, sd * 0.04, zc / S - 0.1)), 0.066 * S * K, (1.55, 0.8, 0.85), 2.0))
    E += chain(N + [H], [0.064, 0.05, 0.041, 0.036, 0.035, 0.036], S)
    part(metaball_mesh(kind + '_body', E, res=0.0085 * S, m=coat, parent=root), 'body', 'body', 'goose')
    # ---- the head: rounded, a smooth slope into the bill; a Toulouse's dewlap hanging under the bill and throat
    h = lambda dx, dy, dz: H + Vector((dx, dy, dz)) * S
    E = [('ELLIPSOID', tuple(h(0, 0, 0)), 0.043 * S * K, (1.35, 0.86, 0.95), 2.0),
         ('ELLIPSOID', tuple(h(0.03, 0, 0.008)), 0.03 * S * K, (1.25, 0.85, 0.9), 2.0),
         ('ELLIPSOID', tuple(h(0.012, 0, -0.016)), 0.034 * S * K, (1.4, 0.88, 0.8), 2.0)]
    if B['dewlap']:
        E += [('ELLIPSOID', tuple(h(0.018, 0, -0.045)), 0.025 * S * K, (1.25, 0.55, 1.5), 2.0),
              ('ELLIPSOID', tuple(h(-0.004, 0, -0.08)), 0.021 * S * K, (1.1, 0.55, 1.35), 2.0)]
    head = part(keep(metaball_mesh(kind + '_head', E, res=0.0082 * S, m=coat, parent=root)), 'head', 'crest', 'goose')
    # ---- the bill: the upper bill (orange, a pale nail at its tip, dark nostrils), the lower bill on the jaw with a pink
    # tongue, the inside of the mouth dark (hidden while shut)
    b0, b1 = h(0.048, 0, -0.004), h(0.13, 0, -0.021)
    E = [('ELLIPSOID', tuple(b0.lerp(b1, t)), (0.0235 - 0.0115 * t) * S * K, (1.15, 0.86 - 0.05 * t, 0.72 - 0.14 * t), 2.0) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
    part(keep(metaball_mesh(kind + '_bill', E, res=0.0046 * S, m=bill, parent=root)), 'head')
    part(keep(sphere(kind + '_nail', 0.0085 * S, tuple(b1 + Vector((0.006, 0, 0.0)) * S), (1.1, 1.0, 0.55), m=nail, parent=root, seg=10, rings=6)), 'head')
    for sd in (1, -1):
        part(keep(sphere(kind + '_nostril', 0.0032 * S, tuple(b0.lerp(b1, 0.45) + Vector((0, sd * 0.0105, 0.009)) * S), (1.8, 0.6, 0.6), m=dark, parent=root, seg=8, rings=5)), 'head')
    l0, l1 = h(0.044, 0, -0.021), h(0.121, 0, -0.028)
    E = [('ELLIPSOID', tuple(l0.lerp(l1, t)), (0.015 - 0.0055 * t) * S * K, (1.15, 0.82, 0.5), 2.0) for t in (0.0, 0.33, 0.66, 1.0)]
    part(keep(metaball_mesh(kind + '_jaw', E, res=0.0044 * S, m=lower, parent=root)), 'jaw')
    part(keep(sphere(kind + '_tongue', 0.011 * S, tuple(l0.lerp(l1, 0.45) + Vector((0, 0, 0.007)) * S), (2.4, 0.75, 0.32), m=tongue, parent=root, seg=10, rings=6)), 'jaw')
    part(keep(sphere(kind + '_mouthin', 0.016 * S, tuple(b0.lerp(b1, 0.4) + Vector((0, 0, -0.008)) * S), (2.6, 0.78, 0.35), m=gum, parent=root, seg=12, rings=6)), 'head')
    pivot('jaw', tuple(h(0.04, 0, -0.014)), root)
    # ---- eyes: on the sides of the head towards the front; a round iris (Gertrude's blue, Hector's dark), a round pupil, a
    # catch-light, and a ring round each (Hector's orange)
    er = 0.0078 * S
    for sd in (1, -1):
        d = Vector((0.36, sd * 0.92, 0.2)).normalized()
        at, _ = surface(head, h(0.016, 0, 0.004), d)
        ec = at - d * er * 0.42
        rot = d.to_track_quat('Z', 'Y').to_euler()
        dep = lambda k: ec + d * er * k
        nm = 'blink' + ('L' if sd > 0 else 'R')
        part(keep(sphere(kind + '_ring', er * 1.3, tuple(dep(-0.1)), (1.0, 1.0, 0.45), rot=rot, m=ring, parent=root, seg=12, rings=6)), nm)
        part(keep(sphere(kind + '_eye', er, tuple(dep(0.0)), (1.0, 1.0, 0.5), rot=rot, m=iris, parent=root, seg=12, rings=7)), nm)
        part(keep(sphere(kind + '_pupil', er * 0.5, tuple(dep(0.36)), (1.0, 1.0, 0.4), rot=rot, m=pupil, parent=root, seg=8, rings=5)), nm)
        q = d.to_track_quat('Z', 'Y'); up = q @ Vector((0, 1, 0)); across = q @ Vector((1, 0, 0))
        part(keep(sphere(kind + '_glint', er * 0.2, tuple(dep(0.5) + up * er * 0.32 - across * sd * er * 0.25), m=glint, parent=root, seg=6, rings=4)), nm)
        pivot('eye' + ('L' if sd > 0 else 'R'), tuple(ec), root); pivot(nm, tuple(ec), root)
    # ---- the folded wings: a smooth panel of coverts on each upper flank, the long flight feathers lying back over the rump,
    # their tips crossing over the tail
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R')
        w = sphere(kind + '_wing', 0.12 * S, tuple(P(-0.03 * BL, sd * 0.1, zc / S + 0.045)), (1.62 * BL, 0.2, 0.52),
                   (math.radians(sd * -10), math.radians(-5), 0), m=coat, parent=root, seg=22, rings=11)
        part(keep(w), nm, 'wing', 'goose')
        for i in range(5):                             # (lying low along the back, closing in over the rump: only their ends show)
            f = i / 4
            st = P(-0.1 * BL - 0.012 * f, sd * (0.088 - 0.01 * f), zc / S + 0.075 - 0.01 * f)
            L = (0.2 + 0.035 * (1 - abs(f - 0.35))) * S * BL
            dirn = Vector((-1, -sd * (0.2 + 0.05 * f), -0.17 - 0.03 * f)).normalized()
            part(flat_feather(kind + '_prim', st, dirn, L, 0.038 * S, coat, root, lift=0.0018 * S * (4 - i), droop=0.006 * S), nm, 'prim', 'goose')
        pivot(nm, tuple(P(0.08 * BL, sd * 0.1, zc / S + 0.07)), root)
    # ---- the open wings (shown spread): coverts along the arm, secondaries hanging back from it, primaries fanned out from
    # the hand; laid out flat to the side, the browser grows them from the shoulder and flaps them
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R') + 'o'
        s0 = P(0.07 * BL, sd * 0.1, zc / S + 0.075)
        span = Vector((-0.1, sd * 1.0, 0.08)).normalized()
        wrist = s0 + span * 0.27 * S
        # (the arm a slim leading edge; over the roots of the flight feathers, rows of coverts like roof tiles: short ones
        # along the edge, longer ones behind, the front rows on top)
        E = [('ELLIPSOID', tuple(s0.lerp(wrist, t)), (0.02 - 0.007 * t) * S * K, (1.2, 1.5, 0.55), 2.0) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
        part(metaball_mesh(kind + '_owing', E, res=0.007 * S, m=coat, parent=root), nm, 'wing', 'goose')
        for row, (n_, L_, w_, back, up_) in enumerate([(8, 0.046, 0.04, 0.0, 0.012), (8, 0.066, 0.045, 0.014, 0.008), (9, 0.092, 0.05, 0.026, 0.004)]):
            for i in range(n_):
                t = 0.04 + 0.92 * i / (n_ - 1)
                st = s0.lerp(wrist, t) + Vector((-back, 0, 0)) * S
                dirn = Vector((-1, sd * (0.12 + 0.25 * t), -0.02)).normalized()
                part(flat_feather(kind + '_ocov', st, dirn, L_ * S, w_ * S, coat, root, lift=up_ * S, seg=4), nm, 'prim', 'goose')
        for i in range(9):                             # secondaries along the arm, hanging back, overlapping
            t = 0.05 + 0.9 * i / 8
            st = s0.lerp(wrist, t) + Vector((-0.03, 0, 0)) * S
            dirn = Vector((-1, sd * (0.1 + 0.28 * t), -0.03)).normalized()
            part(flat_feather(kind + '_osec', st, dirn, (0.165 + 0.02 * t) * S, 0.066 * S, coat, root, lift=-0.0012 * S * i), nm, 'prim', 'goose')
        for i in range(4):                             # the primaries' coverts at the hand
            f = i / 3; a = math.radians(-40 + 50 * f)
            dirn = Vector((math.sin(a), sd * math.cos(a), 0.0)).normalized()
            part(flat_feather(kind + '_ocov', wrist - Vector((0.01, 0, 0)) * S * f, dirn, 0.1 * S, 0.05 * S, coat, root, lift=0.006 * S, seg=4), nm, 'prim', 'goose')
        for i in range(8):                             # primaries fanned out from the hand
            f = i / 7
            st = wrist + span * 0.015 * S - Vector((0.014, 0, 0)) * S * f
            a = math.radians(-62 + 66 * f)
            dirn = Vector((math.sin(a), sd * math.cos(a), 0.02 - 0.02 * f)).normalized()
            part(flat_feather(kind + '_oprim', st, dirn, (0.28 - 0.07 * abs(f - 0.62)) * S, 0.064 * S, coat, root, lift=-0.002 * S * (7 - i)), nm, 'prim', 'goose')
        pivot(nm, tuple(s0), root)
    # ---- the tail: a short rounded fan of stiff feathers, tipped up a little
    tb = P(-0.265 * BL, 0, zc / S + 0.05)
    for i in range(7):
        f = (i - 3) / 3
        st = tb + Vector((0.006 * abs(f), f * 0.024, -0.004 * abs(f))) * S
        dirn = Vector((-1, f * 0.2, 0.2 - 0.05 * abs(f))).normalized()
        part(flat_feather(kind + '_tail', st, dirn, (0.082 - 0.008 * abs(f)) * S, 0.05 * S, coat, root, lift=0.0025 * S * (3 - abs(i - 3)), curl=0.14), 'tail', 'tail', 'goose')
    pivot('tail', tuple(P(-0.24 * BL, 0, zc / S + 0.04)), root)
    # ---- legs: the feathered thigh tucked into the body (hip), the heel at the top of the orange shank (the bend points back),
    # the shank down and a little forward to the webbed foot: three long toes joined by the web, a little claw on each
    for sd in (1, -1):
        L = 'leg' + ('L' if sd > 0 else 'R')
        hip = P(-0.03 * BL, sd * 0.07, zc / S - 0.035)
        heel = P(-0.048 * BL, sd * 0.076, 0.128 * LG)
        foot = P(-0.022 * BL, sd * 0.082, 0.02)
        E = chain([hip, hip.lerp(heel, 0.5), heel + Vector((0, 0, 0.012)) * S], [0.045, 0.032, 0.02], S)
        part(metaball_mesh(kind + '_thigh', E, res=0.01 * S, m=coat, parent=root), L, 'legfeather', 'goose')
        sh = (foot + Vector((0, 0, 0.006)) * S) - heel
        c_ = cyl(kind + '_shank', 0.0118 * S, sh.length + 0.01 * S, tuple(heel + sh * 0.5), sh.to_track_quat('Z', 'Y').to_euler(), feet, verts=8, r2=0.0092 * S, bevel=0, parent=root)
        for p_ in c_.data.polygons: p_.use_smooth = True
        part(keep(c_), L + 'k')
        part(keep(sphere(kind + '_heel', 0.0135 * S, tuple(heel), (1.0, 1.0, 1.15), m=feet, parent=root, seg=8, rings=5)), L + 'k')
        part(keep(webbed_foot(kind + '_foot', foot, sd, S, feet, claw, root)), L + 'f')
        pivot(L, tuple(hip), root); pivot(L + 'k', tuple(heel), root); pivot(L + 'f', tuple(foot), root)
        pivot(L + 'p', tuple(foot + Vector((0.07, 0, -0.018)) * S), root)       # the toes' tips (where the foot meets the ground)
    # ---- the other pivots
    pivot('body', (0.0, 0, zc), root)
    for i, nm in enumerate(NECK): pivot(nm, tuple(N[i]), root)
    pivot('head', tuple(N[4]), root); pivot('headc', tuple(H), root); pivot('bill', tuple(b1), root)
    return root


def flat_feather(name, start, dirn, L, w0, m, parent, lift=0.0, droop=0.0, curl=0.0, seg=8):
    """A long stiff feather lying flat (its vane level, across `dirn`): from `start` along `dirn` for L, rounded at the
    tip, bending down by `droop` at the tip, curling up by `curl` (a fraction of L); `lift` raises it (stacked feathers)."""
    up = Vector((0, 0, 1)); side = up.cross(dirn).normalized(); nrm = dirn.cross(side).normalized()
    pts, ws, wds = [], [], []
    for i in range(seg + 1):
        t = i / seg
        p = start + dirn * L * t + nrm * (lift - droop * t * t + curl * L * t * t)
        w = w0 * min(1.0, t / 0.12 + 0.35) * (1 - t ** 2.2) ** 0.5 + 0.0015
        pts.append(p); ws.append(w); wds.append(side)
    return ribbon(name, pts, ws, wds, m, parent, thick=0.002)


def webbed_foot(name, at, sd, S, m, claw_m, parent):
    """A goose's webbed foot from `at` (the ankle, on the ground): three toes fanned forward, the web between them scalloped
    in between the toe tips, a small claw on each; the hind toe a little knob."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    angs = [math.radians(a) for a in (-sd * 30, 0, sd * 30)]           # inner, middle, outer toe (outer and inner swapped by side)
    lens = [0.062, 0.074, 0.066]
    th = 0.005 * S
    tips = [Vector((math.cos(a) * l, math.sin(a) * l * (1 if sd > 0 else 1), 0)) * S for a, l in zip(angs, lens)]
    # the web's outline: from the ankle out along each toe, dipping back in between the tips
    ring = [Vector((-0.008, 0, 0)) * S]
    for i in range(3):
        ring.append(tips[i] * 0.35 + Vector((-0.004 * S, 0, 0)))
        ring.append(tips[i])
        if i < 2:
            mid = (tips[i] + tips[i + 1]) / 2
            ring.append(mid * 0.72)
    top = [bm.verts.new(at + p + Vector((0, 0, th))) for p in ring]
    bot = [bm.verts.new(at + p) for p in ring]
    c_t = bm.verts.new(at + Vector((0.025 * S, 0, th * 1.6))); c_b = bm.verts.new(at + Vector((0.025 * S, 0, 0)))
    n = len(ring)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((c_t, top[i], top[j])); bm.faces.new((c_b, bot[j], bot[i])); bm.faces.new((top[i], bot[i], bot[j], top[j]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); o.parent = parent
    for p_ in o.data.polygons: p_.use_smooth = False
    parts = [o]
    for i, tp in enumerate(tips):                      # the toes: a raised ridge along the top of the web, a claw at the end
        a = angs[i]; d = Vector((math.cos(a), math.sin(a), 0))
        ln = tp.length
        c = cyl(name + '_toe', 0.0048 * S, ln * 0.92, tuple(at + d * ln * 0.46 + Vector((0, 0, th + 0.0018 * S))), (0, math.radians(90), a), m, verts=6, r2=0.0035 * S, bevel=0, parent=parent)
        k = sphere(name + '_claw', 0.0042 * S, tuple(at + tp + d * 0.003 * S + Vector((0, 0, th * 0.7))), (1.6, 0.8, 0.7), (0, 0, a), m=claw_m, parent=parent, seg=6, rings=4)
        parts += [c, k]
    k = sphere(name + '_hind', 0.006 * S, tuple(at + Vector((-0.012, 0, 0.012)) * S), (1.3, 0.9, 0.9), m=m, parent=parent, seg=8, rings=5)
    parts.append(k)
    return join(parts, name)


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 32
    scn = reset()
    cyl('ground', 3.0, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    a = goose('embden'); a.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -25))))
    c = goose('toulouse'); c.location = (0.2, -0.75, 0); c.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -25)) - 10))
    if os.environ.get('OPEN') == '0':                  # folded only (the open wings hidden, as in the browser at rest)
        for o in bpy.context.scene.objects:
            if '_ow' in o.name or '_osec' in o.name or '_oprim' in o.name or '_ocov' in o.name: o.hide_render = True
    lighting(scn)
    cam = os.environ.get('CAM', 'front')
    if cam == 'side': camera(scn, (0.25, -3.2, 0.55), (0.25, -0.35, 0.38), lens=45)
    else: camera(scn, (1.6, -2.6, 1.1), (0.1, -0.35, 0.38), lens=42)
    render(scn, os.environ.get('NAME', 'geese'), 1000, 800, samples)
