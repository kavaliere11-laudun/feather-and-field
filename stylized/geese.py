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
from mathutils import Quaternion, Euler, Matrix

JOINTS = ['root', 'body', 'neck1', 'neck2', 'neck3', 'neck4', 'head', 'jaw', 'blinkL', 'blinkR',
          'wingL', 'wingLo', 'wingLh', 'wingR', 'wingRo', 'wingRh', 'tail', 'legL', 'legLk', 'legLf', 'legR', 'legRk', 'legRf']
NECK = ['neck1', 'neck2', 'neck3', 'neck4']
GEESE = {
    # a white Embden goose: tall and upright, blue eyes, an orange bill with a pale nail
    'embden': dict(name='Gertrude', S=1.0, BL=1.0, low=0.0, LG=1.0, paunch=False, dewlap=False,
                   coat=dict(white='#f6f4ef', shade='#dedad2'), iris='#8bb9e4', ring='#efbf8f', ringw=1.14, bill='#f5862a', nail='#f6e3d2', feet='#f2892c'),
    # a grey Toulouse gander: longer and lower, a paunch hanging between his legs, a dewlap under his bill, dark eyes with an
    # orange ring; dark grey head, neck and back, grey wings with pale-edged feathers, a pale breast, white belly and tail end
    'toulouse': dict(name='Hector', S=1.0, BL=1.08, low=0.03, LG=0.86, paunch=True, dewlap=True, neck=0.86,
                     coat=dict(dark='#5f5a56', back='#77716b', wing='#7d7770', edge='#d2ccc1', breast='#a29c94', belly='#f1eee7'),
                     iris='#4a2a16', ring='#f08a2c', ringw=1.3, bill='#f08a30', nail='#d8c6b2', feet='#e6832f'),
}


def neck_points(B):
    """The neck's joints (base inside the body's front .. under the head), the head's middle and the bill's base."""
    S, BL, zc = B['S'], B['BL'], 0.29 - B['low']
    base = Vector((0.13 * BL, 0, zc + 0.06)) * 1.0
    nl = B.get('neck', 1.0)
    off = [Vector((0, 0, 0)), Vector((0.05, 0, 0.1 * nl)), Vector((0.066, 0, 0.2 * nl)), Vector((0.06, 0, 0.29 * nl)), Vector((0.076, 0, 0.355 * nl))]
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
    ring = flat(kind + '_ring', B['ring'], 0.5); dark = flat('gdark', '#2a2420', 0.5); nos = flat(kind + '_nostril', '#8a3f16', 0.5); claw = flat('gclaw', '#3a2e27', 0.5)
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
    E += chain(N + [H], [0.066, 0.053, 0.046, 0.042, 0.039, 0.036], S)
    part(metaball_mesh(kind + '_body', E, res=0.0085 * S, m=coat, parent=root), 'body', 'body', 'goose')
    # ---- the head: long and smooth, a flat crown, the forehead running straight down into the bill (a goose's profile);
    # a Toulouse's dewlap hanging under the bill and throat
    h = lambda dx, dy, dz: H + Vector((dx, dy, dz)) * S
    E = [('ELLIPSOID', tuple(h(-0.008, 0, 0.003)), 0.037 * S * K, (1.4, 0.82, 0.92), 2.0),
         ('ELLIPSOID', tuple(h(0.022, 0, 0.0)), 0.032 * S * K, (1.4, 0.84, 0.95), 2.0),
         ('ELLIPSOID', tuple(h(0.042, 0, -0.002)), 0.024 * S * K, (1.3, 0.86, 0.95), 2.0),
         ('ELLIPSOID', tuple(h(0.008, 0, -0.016)), 0.026 * S * K, (1.5, 0.8, 0.7), 2.0)]
    if B['dewlap']:
        E += [('ELLIPSOID', tuple(h(0.028, 0, -0.034)), 0.02 * S * K, (1.3, 0.5, 1.35), 2.0),
              ('ELLIPSOID', tuple(h(0.006, 0, -0.06)), 0.018 * S * K, (1.15, 0.5, 1.3), 2.0)]
    head = part(keep(metaball_mesh(kind + '_head', E, res=0.0078 * S, m=coat, parent=root)), 'head', 'crest', 'goose')
    # ---- the bill: a goose's big wedge of a bill, deep at the base where it meets the face, its top running on from the
    # forehead and sloping gently to a broad rounded tip with a pale nail; dark nostrils; the lower bill under it on the jaw
    # (a pink tongue on it), the mouth dark inside (hidden while shut)
    bx0 = h(0.056, 0, 0)
    up_ = bill_loft(kind + '_bill', bx0, 0.074 * S, [(0.0, 0.0195, 0.0148, 0.0095), (0.3, 0.0168, 0.0118, 0.0052), (0.6, 0.0146, 0.0092, 0.0012),
                                                   (0.85, 0.0138, 0.0072, -0.0028), (1.0, 0.0128, 0.0058, -0.0062)], S, bill, nail, root, nail_from=0.82)
    part(keep(up_), 'head')
    for sd in (1, -1):
        part(keep(sphere(kind + '_nostril', 0.0028 * S, tuple(bx0 + Vector((0.027, sd * 0.0122, 0.0132)) * S), (2.4, 0.5, 0.6), m=nos, parent=root, seg=8, rings=5)), 'head')
    lo_ = bill_loft(kind + '_jaw', bx0 + Vector((-0.004, 0, -0.0082)) * S, 0.07 * S, [(0.0, 0.0172, 0.0066, 0.0), (0.5, 0.0142, 0.0055, -0.0008),
                                                                                    (1.0, 0.0112, 0.004, -0.003)], S, lower, lower, root)
    part(keep(lo_), 'jaw')
    part(keep(sphere(kind + '_tongue', 0.011 * S, tuple(bx0 + Vector((0.03, 0, -0.0065)) * S), (2.4, 0.72, 0.3), m=tongue, parent=root, seg=10, rings=6)), 'jaw')
    part(keep(sphere(kind + '_mouthin', 0.0145 * S, tuple(bx0 + Vector((0.03, 0, -0.0045)) * S), (2.6, 0.72, 0.3), m=gum, parent=root, seg=12, rings=6)), 'head')
    pivot('jaw', tuple(bx0 + Vector((-0.006, 0, -0.008)) * S), root)
    b1 = bx0 + Vector((0.074, 0, -0.007)) * S
    # ---- eyes: high on the sides of the head, a little forward: a clear round iris (Gertrude's pale blue, Hector's dark
    # brown), a round pupil, a bright catch-light, and a ring of bare skin round each (Hector's orange)
    er = 0.0116 * S
    for sd in (1, -1):
        d = Vector((0.28, sd * 0.92, 0.27)).normalized()
        at, _ = surface(head, h(0.012, 0, 0.004), d)
        ec = at - d * er * 0.12                         # (standing proud of the head's soft feathers)
        rot = d.to_track_quat('Z', 'Y').to_euler()
        dep = lambda k: ec + d * er * k
        nm = 'blink' + ('L' if sd > 0 else 'R')
        part(keep(sphere(kind + '_ring', er * B.get('ringw', 1.3), tuple(dep(-0.12)), (1.0, 1.0, 0.45), rot=rot, m=ring, parent=root, seg=14, rings=6)), nm)
        part(keep(sphere(kind + '_eye', er, tuple(dep(0.0)), (1.0, 1.0, 0.52), rot=rot, m=iris, parent=root, seg=14, rings=7)), nm)
        part(keep(sphere(kind + '_pupil', er * 0.44, tuple(dep(0.38)), (1.0, 1.0, 0.42), rot=rot, m=pupil, parent=root, seg=10, rings=5)), nm)
        q = d.to_track_quat('Z', 'Y'); up = q @ Vector((0, 1, 0)); across = q @ Vector((1, 0, 0))
        part(keep(sphere(kind + '_glint', er * 0.26, tuple(dep(0.52) + up * er * 0.3 - across * sd * er * 0.24), m=glint, parent=root, seg=6, rings=4)), nm)
        pivot('eye' + ('L' if sd > 0 else 'R'), tuple(ec), root); pivot(nm, tuple(ec), root)
    # ---- the folded wings: on each upper flank a smooth bed of small coverts at the shoulder, then real feathers lying on it
    # like roof tiles, following its curve: a row of greater coverts, the long secondaries and tertials below and behind
    # them (their tips making the wing's scalloped lower and back edge), and the primaries lying back over the rump, their
    # tips crossing over the tail
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R')
        wc = P(-0.03 * BL, sd * 0.1, zc / S + 0.045); wr = Vector((0.12 * 1.62 * BL, 0.12 * 0.2, 0.12 * 0.52)) * S
        wrot = Euler((math.radians(sd * -10), math.radians(-5), 0))
        w = sphere(kind + '_wing', 0.12 * S, tuple(wc), (1.62 * BL, 0.2, 0.52), wrot, m=coat, parent=root, seg=22, rings=11)
        part(keep(w), nm, 'wing', 'goose')
        M = Matrix.Translation(wc) @ wrot.to_matrix().to_4x4()
        def on_panel(x, z, lift):                      # a point on the panel's outer surface (its own frame: x along, z up)
            u = 1 - (x / wr.x) ** 2 - (z / wr.z) ** 2
            return M @ Vector((x, sd * (wr.y * math.sqrt(max(0.0, u)) + lift), z))
        def panel_feather(nm_, x0, z0, ang, L, w0, lift, seg=6, pointed=False):
            """a feather lying on the panel from (x0, z0), pointing back and down by ang (degrees below -x), hugging it"""
            d = Vector((-math.cos(math.radians(ang)), 0, -math.sin(math.radians(ang))))
            pts, ws, wds = [], [], []
            for k in range(seg + 1):
                t = k / seg; x, z = x0 + d.x * L * t, z0 + d.z * L * t
                pts.append(on_panel(x, z, lift + 0.002 * S * t))
                across = Vector((-d.z, 0, d.x)); a_ = on_panel(x + across.x * 0.004, z + across.z * 0.004, lift)
                wds.append((a_ - on_panel(x, z, lift)).normalized())
                if pointed: ws.append(w0 * min(1.0, t / 0.15 + 0.25) * (1 - t) ** 0.8 + 0.001)
                else: ws.append(w0 * min(1.0, t / 0.12 + 0.35) * (1 - t ** 2.2) ** 0.5 + 0.0015)
            return ribbon(nm_, pts, ws, wds, coat, root, thick=0.0018)
        for i in range(7):                             # the greater coverts: a row across the middle of the wing
            f = i / 6
            x0, z0 = (0.1 - 0.17 * f) * BL * S, (0.035 - 0.03 * f) * S
            part(panel_feather(kind + '_gcov', x0, z0, 28, 0.075 * S, 0.042 * S, 0.004 * S), nm, 'prim', 'goose')
        for i in range(9):                             # secondaries and tertials: long, lying back, their tips the wing's edge
            f = i / 8
            x0, z0 = (0.06 - 0.17 * f) * BL * S, (0.004 - 0.022 * f) * S
            part(panel_feather(kind + '_sec', x0, z0, 22 - 10 * f, (0.12 + 0.05 * f) * S, 0.048 * S, 0.0015 * S), nm, 'prim', 'goose')
        for i in range(5):                             # the primaries (lying low along the back, closing in over the rump)
            f = i / 4
            st = P(-0.1 * BL - 0.012 * f, sd * (0.088 - 0.01 * f), zc / S + 0.075 - 0.01 * f)
            L = (0.2 + 0.035 * (1 - abs(f - 0.35))) * S * BL
            dirn = Vector((-1, -sd * (0.2 + 0.05 * f), -0.17 - 0.03 * f)).normalized()
            part(flat_feather(kind + '_prim', st, dirn, L, 0.036 * S, coat, root, lift=0.0018 * S * (4 - i), droop=0.006 * S, pointed=True), nm, 'prim', 'goose')
        pivot(nm, tuple(P(0.08 * BL, sd * 0.1, zc / S + 0.07)), root)
    # ---- the open wings (shown spread): the arm from the shoulder out and a little forward to the wrist, the hand angling
    # back from it; along the arm rows of coverts like roof tiles over the long secondaries, from the hand the primaries
    # fanned out, long and pointed, the wing arched (its feathers curving down a little to their tips); the browser grows
    # it from the shoulder and flaps it, the hand following the arm a moment later
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R') + 'o'; hn = 'wing' + ('L' if sd > 0 else 'R') + 'h'
        s0 = P(0.07 * BL, sd * 0.1, zc / S + 0.075)
        span = Vector((0.1, sd * 1.0, 0.06)).normalized()
        wrist = s0 + span * 0.28 * S
        hand = Vector((-0.38, sd * 1.0, 0.0)).normalized()
        E = [('ELLIPSOID', tuple(s0.lerp(wrist, t) + Vector((-0.008, 0, 0)) * S), (0.026 - 0.009 * t) * S * K, (1.35, 1.5, 0.55), 2.0) for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
        part(metaball_mesh(kind + '_owing', E, res=0.007 * S, m=coat, parent=root), nm, 'wing', 'goose')
        for row, (n_, L_, w_, back, up_) in enumerate([(9, 0.055, 0.042, 0.004, 0.007), (9, 0.075, 0.046, 0.016, 0.005), (10, 0.1, 0.05, 0.028, 0.003)]):
            for i in range(n_):
                t = 0.04 + 0.92 * i / (n_ - 1)
                st = s0.lerp(wrist, t) + Vector((-back, 0, 0)) * S
                dirn = Vector((-1, sd * (0.06 + 0.2 * t), -0.04)).normalized()
                part(flat_feather(kind + '_ocov', st, dirn, L_ * S, w_ * S, coat, root, lift=up_ * S, seg=4, droop=0.004 * S, base=0.12), nm, 'prim', 'goose')
        for i in range(10):                            # secondaries along the arm, hanging back, overlapping
            t = 0.04 + 0.92 * i / 9
            st = s0.lerp(wrist, t) + Vector((-0.03, 0, 0)) * S
            dirn = Vector((-1, sd * (0.05 + 0.25 * t), -0.05)).normalized()
            part(flat_feather(kind + '_osec', st, dirn, (0.16 + 0.025 * t) * S, 0.064 * S, coat, root, lift=-0.0012 * S * i, droop=0.014 * S), nm, 'prim', 'goose')
        for i in range(5):                             # the primaries' coverts on the hand
            f = i / 4
            st = wrist + hand * 0.03 * S * f
            dirn = (hand * 0.55 + Vector((-1, 0, 0)) * (0.7 - 0.3 * f)).normalized()
            part(flat_feather(kind + '_ocov', st, dirn, 0.11 * S, 0.05 * S, coat, root, lift=0.007 * S, seg=4, droop=0.005 * S), hn, 'prim', 'goose')
        for i in range(9):                             # primaries fanned out from the hand, long and pointed
            f = i / 8
            st = wrist + hand * (0.012 + 0.07 * f) * S
            a = math.radians(-70 + 62 * f)
            dirn = Vector((math.sin(a), sd * math.cos(a), -0.03)).normalized()
            part(flat_feather(kind + '_oprim', st, dirn, (0.27 + 0.05 * f) * S, 0.062 * S, coat, root, lift=-0.002 * S * (8 - i), droop=0.02 * S, pointed=True), hn, 'prim', 'goose')
        pivot(nm, tuple(s0), root); pivot(hn, tuple(wrist), root)
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


def bill_loft(name, base, L, prof, S, m, m_tip, parent, nail_from=2.0, sides=14, rings=10):
    """A bill as a smooth loft from its base (on the face) forward along +x for L: prof = [(t, half width, half height,
    the middle's height offset)] along it (t 0..1, metres for S=1), interpolated; rounded closed tip. Faces from nail_from
    on get m_tip (the pale nail)."""
    def at(t):
        for (t0, *a0), (t1, *a1) in zip(prof, prof[1:]):
            if t0 <= t <= t1:
                u = (t - t0) / max(1e-6, t1 - t0); return [x + (y - x) * u for x, y in zip(a0, a1)]
        return prof[-1][1:]
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rows = []
    for i in range(rings + 1):
        t = i / rings; hw, hh, dz = at(t)
        if t > 0.88:                                    # the broad rounded tip
            k = math.sqrt(max(0.0, 1 - ((t - 0.88) / 0.12) ** 2)); hw *= 0.55 + 0.45 * k; hh *= 0.6 + 0.4 * k
        c = base + Vector((L * t, 0, dz * S))
        ring = []
        for j in range(sides):
            a = 2 * math.pi * j / sides
            y, z = math.cos(a) * hw * S, math.sin(a) * hh * S
            if z < 0: z *= 0.8                           # a little flatter underneath
            ring.append(bm.verts.new(c + Vector((0, y, z))))
        rows.append(ring)
    for i in range(rings):
        for j in range(sides):
            f = bm.faces.new((rows[i][j], rows[i][(j + 1) % sides], rows[i + 1][(j + 1) % sides], rows[i + 1][j]))
            f.material_index = 1 if (i + 0.5) / rings >= nail_from else 0
    tip = bm.verts.new(base + Vector((L * 1.02, 0, at(1.0)[2] * S)))
    for j in range(sides): f = bm.faces.new((rows[-1][j], rows[-1][(j + 1) % sides], tip)); f.material_index = 1 if nail_from <= 1 else 0
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(m); o.data.materials.append(m_tip); o.parent = parent
    for p_ in o.data.polygons: p_.use_smooth = True
    return o


def flat_feather(name, start, dirn, L, w0, m, parent, lift=0.0, droop=0.0, curl=0.0, seg=8, pointed=False, base=0.35):
    """A long stiff feather lying flat (its vane level, across `dirn`): from `start` along `dirn` for L, rounded at the
    tip, bending down by `droop` at the tip, curling up by `curl` (a fraction of L); `lift` raises it (stacked feathers)."""
    up = Vector((0, 0, 1)); side = up.cross(dirn).normalized(); nrm = dirn.cross(side).normalized()
    pts, ws, wds = [], [], []
    for i in range(seg + 1):
        t = i / seg
        p = start + dirn * L * t + nrm * (lift - droop * t * t + curl * L * t * t)
        if pointed: w = w0 * min(1.0, t / 0.12 + base) * (1 - t ** 1.6) ** 0.7 + 0.001
        else: w = w0 * min(1.0, t / 0.12 + base) * (1 - t ** 2.2) ** 0.5 + 0.0015
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
    elif cam == 'head':                               # both heads close up, side-on (ROT=0)
        c.location = (0.0, -0.32, 0)
        camera(scn, (0.3, -1.25, 0.8), (0.3, -0.16, 0.72), lens=60)
    else: camera(scn, (1.6, -2.6, 1.1), (0.1, -0.35, 0.38), lens=42)
    render(scn, os.environ.get('NAME', 'geese'), 1000, 800, samples)
