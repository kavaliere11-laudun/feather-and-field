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
                   coat=dict(white='#f6f4ef', shade='#dedad2'), iris='#8bb9e4', ring='#efbf8f', ringw=1.14, bill='#f5862a', nail='#f6e3d2', feet='#f2892c', web='#dd7424'),
    # a grey Toulouse gander: longer and lower, a paunch hanging between his legs, a dewlap under his bill, dark eyes with an
    # orange ring; dark grey head, neck and back, grey wings with pale-edged feathers, a pale breast, white belly and tail end
    'toulouse': dict(name='Hector', S=1.0, BL=1.08, low=0.03, LG=0.86, paunch=True, dewlap=True, neck=0.86,
                     coat=dict(dark='#5f5a56', back='#77716b', wing='#7d7770', edge='#d2ccc1', breast='#a29c94', belly='#f1eee7'),
                     iris='#4a2a16', ring='#f08a2c', ringw=1.3, bill='#f08a30', nail='#d8c6b2', feet='#e6832f', web='#cf6d26'),
    # the pond's mallards (24 Oct, as the game's art plan has them: a drake and two ducks): smaller, lower and rounder than a
    # goose, a short neck, a round head with a steep forehead, a broad flat bill; the drake with his bottle-green head, white
    # collar, chestnut breast, pale grey flanks, black rump and the two curled black feathers over his tail; the duck mottled
    # brown, a dark crown and a dark line through the eye, an orange bill with a dark saddle; both with the blue patch on
    # the wing (the speculum) edged white
    'mallard_m': dict(name='Rocco', S=0.6, BL=0.94, low=0.07, LG=0.62, paunch=False, dewlap=False, neck=0.52, duck=True, drake=True,
                      coat=dict(grey='#cbc7bd', green='#1c5a34', collar='#f3f1ea', chest='#6e3a22', back='#776b5d', black='#19191b', wing='#8c8275',
                                spec='#2b52ad', specw='#f1efe8', tailw='#e4e1d9', belly='#e3e0d8'),
                      iris='#3a2012', ring='#1c5a34', ringw=1.0, bill='#d8c23d', nail='#2b2a1e', feet='#f08a2c', web='#e0782a'),
    'mallard_f': dict(name='Daisy', S=0.58, BL=0.94, low=0.07, LG=0.62, paunch=False, dewlap=False, neck=0.52, duck=True, drake=False,
                      coat=dict(brown='#9a7650', dark='#5e4129', buff='#b9945f', crown='#45311f', wing='#7a6550', spec='#2b52ad', specw='#f1efe8', belly='#b39572'),
                      iris='#3a2012', ring='#9c7b56', ringw=1.0, bill='#d27a2c', nail='#3b2b1c', feet='#f08a2c', web='#e0782a', saddle='#4a3a2a'),
    # the call ducks (30 Oct 2026, from Audrey's photos of white ones: "call duck (new type of eggs!)", "I still want it"):
    # little plump ducks, a full round breast, the head held up on a short neck, a rounded head and a broad orange bill; white
    # all over, orange feet, a small dark eye; the drake's curl over his tail. head_k: the head's size for the bird's, bill_k:
    # the bill's length, neck_rs: the neck's thickness up it
    'call_m': dict(name='Pip', S=0.42, BL=0.88, low=0.075, LG=0.55, paunch=False, dewlap=False, neck=0.44, duck=True, drake=True, call=True, head_k=1.32, bill_k=1.4, neck_rs=(0.07, 0.056, 0.046, 0.04, 0.036, 0.034),
                   coat=dict(white='#fcfbf7', shade='#e7e4db'), iris='#1d1512', ring='#f2efe8', ringw=1.0, bill='#f2a23a', nail='#e8b45c', feet='#f28a2a', web='#e2782a'),
    'call_f': dict(name='Puddle', S=0.4, BL=0.88, low=0.075, LG=0.55, paunch=False, dewlap=False, neck=0.44, duck=True, drake=False, call=True, head_k=1.32, bill_k=1.4, neck_rs=(0.07, 0.056, 0.046, 0.04, 0.036, 0.034),
                   coat=dict(white='#fcfbf7', shade='#e7e4db'), iris='#1d1512', ring='#f2efe8', ringw=1.0, bill='#f0a640', nail='#e9b867', feet='#f28a2a', web='#e2782a'),
}


def neck_points(B):
    """The neck's joints (base inside the body's front .. under the head), the head's middle and the bill's base."""
    S, BL, zc = B['S'], B['BL'], 0.29 - B['low']
    base = Vector((0.13 * BL, 0, zc + 0.06)) * 1.0
    nl = B.get('neck', 1.0)
    off = [Vector((0, 0, 0)), Vector((0.05, 0, 0.1 * nl)), Vector((0.066, 0, 0.2 * nl)), Vector((0.06, 0, 0.29 * nl)), Vector((0.076, 0, 0.355 * nl))]
    N = [(base + o) * S for o in off]
    H = N[4] + Vector((0.034, 0, 0.03)) * S * B.get('head_k', 1.0)      # (a call duck's big head sits up and forward)
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
    ring = flat(kind + '_ring', B['ring'], 0.5); web = flat(kind + '_web', B['web'], 0.55); dark = flat('gdark', '#2a2420', 0.5); nos = flat(kind + '_nostril', '#8a3f16', 0.5); claw = flat('gclaw', '#3a2e27', 0.5)
    root = empty(kind)
    N, H = neck_points(B)
    # ---- the body and neck in one smooth shape: a long boat of a body, a full breast, the rump rising to the tail, soft
    # feathers under the tail; the neck rising from the front of the body in a gentle S
    # (the back end shaped like a boat's stern: the belly curving up under the tail, the back sloping down to it, so the tail
    # is the body's back point)
    E = [('ELLIPSOID', tuple(P(-0.01 * BL, 0, zc / S)), 0.13 * S * K, (1.8 * BL, 1.0, 0.9), 2.0),
         ('BALL', tuple(P(0.115 * BL, 0, zc / S - 0.005)), 0.106 * S * K, None, 2.0),
         ('ELLIPSOID', tuple(P(-0.03 * BL, 0, zc / S - 0.05)), 0.11 * S * K, (1.7 * BL, 0.95, 0.75), 2.0),
         ('ELLIPSOID', tuple(P(-0.2 * BL, 0, zc / S + 0.03)), 0.075 * S * K, (1.4, 0.85, 0.75), 2.0),
         ('ELLIPSOID', tuple(P(-0.255 * BL, 0, zc / S + 0.018)), 0.054 * S * K, (1.45, 0.72, 0.7), 2.0),
         ('ELLIPSOID', tuple(P(-0.2 * BL, 0, zc / S - 0.025)), 0.07 * S * K, (1.3, 0.85, 0.8), 2.0)]
    if B['paunch']:            # a Toulouse's paunch: two soft lobes hanging low between the legs
        for sd in (1, -1): E.append(('ELLIPSOID', tuple(P(-0.07 * BL, sd * 0.04, zc / S - 0.1)), 0.066 * S * K, (1.55, 0.8, 0.85), 2.0))
    E += chain(N + [H], list(B.get('neck_rs', (0.066, 0.053, 0.046, 0.042, 0.039, 0.036))), S)      # (neck_rs: a call duck's short neck, thick at its base, slim under the big head)
    body_o = part(metaball_mesh(kind + '_body', E, res=0.0085 * S, m=coat, parent=root), 'body', 'body', 'goose')
    zax = zc + 0.012 * S

    def onbody(x, phi, sd, lift):
        """A point on the body: x along it (metres for S=1, + forward), phi round it from the top (degrees) on side sd,
        raised `lift` off its surface (metres for S=1); and the surface's normal there"""
        d = Vector((0, sd * math.sin(math.radians(phi)), math.cos(math.radians(phi))))
        loc, nrm = surface(body_o, Vector((x * S, 0, zax)), d)
        return loc + nrm * lift * S, nrm

    def lay(name, x0, p0, x1, p1, sd, lift0, lift1, w0, pointed=False, seg=7, xmin=-0.3, bend=0.0):
        """A feather lying on the body, following its curve: from (x0, phi0) back to (x1, phi1), raised lift0 .. lift1, w0
        wide (for S=1); past xmin (off the end of the body) it carries straight on; bend bows its middle (degrees)"""
        pts, ns = [], []
        for k in range(seg + 1):
            t = k / seg; x = x0 + (x1 - x0) * t
            if x >= xmin * BL or k < 2:
                p, n = onbody(x, p0 + (p1 - p0) * t + bend * math.sin(math.pi * t), sd, lift0 + (lift1 - lift0) * t)
            else:
                p = pts[-1] + (pts[-1] - pts[-2]); n = ns[-1]
            pts.append(p); ns.append(n)
        ws, wds = [], []
        for k in range(seg + 1):
            t = k / seg; tg = (pts[min(k + 1, seg)] - pts[max(k - 1, 0)]).normalized()
            wds.append(ns[k].cross(tg).normalized())
            if pointed: ws.append(w0 * S * min(1.0, t / 0.15 + 0.3) * (1 - t ** 1.6) ** 0.7 + 0.001)
            else: ws.append(w0 * S * min(1.0, t / 0.12 + 0.35) * (1 - t ** 2.4) ** 0.5 + 0.0015)
        return ribbon(name, pts, ws, wds, coat, root, thick=0.0016)
    # ---- the head: long and smooth, a flat crown, the forehead running straight down into the bill (a goose's profile);
    # a Toulouse's dewlap hanging under the bill and throat
    h = lambda dx, dy, dz: H + Vector((dx, dy, dz)) * S
    E = [('ELLIPSOID', tuple(h(-0.008, 0, 0.003)), 0.037 * S * K, (1.4, 0.82, 0.92), 2.0),
         ('ELLIPSOID', tuple(h(0.022, 0, 0.0)), 0.032 * S * K, (1.4, 0.84, 0.95), 2.0),
         ('ELLIPSOID', tuple(h(0.042, 0, -0.002)), 0.024 * S * K, (1.3, 0.86, 0.95), 2.0),
         ('ELLIPSOID', tuple(h(0.008, 0, -0.016)), 0.026 * S * K, (1.5, 0.8, 0.7), 2.0)]
    if B.get('duck'):          # a duck's round head: a high round crown, a steep forehead, full cheeks
        E = [('ELLIPSOID', tuple(h(-0.004, 0, 0.008)), 0.043 * S * K, (1.22, 0.86, 1.0), 2.0),
             ('ELLIPSOID', tuple(h(0.026, 0, 0.002)), 0.033 * S * K, (1.15, 0.86, 0.95), 2.0),
             ('ELLIPSOID', tuple(h(0.006, 0, -0.018)), 0.03 * S * K, (1.4, 0.82, 0.75), 2.0)]
    if B.get('call'):          # a call duck's: big and round, a high domed crown, a steep forehead, full round cheeks
        hk = B['head_k']; h = lambda dx, dy, dz: H + Vector((dx, dy, dz)) * S * hk
        E = [('ELLIPSOID', tuple(h(-0.004, 0, 0.007)), 0.042 * S * hk * K, (1.22, 0.88, 1.0), 2.0),
             ('ELLIPSOID', tuple(h(0.024, 0, 0.0)), 0.031 * S * hk * K, (1.15, 0.86, 0.92), 2.0),
             ('ELLIPSOID', tuple(h(0.006, 0, -0.017)), 0.03 * S * hk * K, (1.35, 0.88, 0.78), 2.0),
             ('ELLIPSOID', tuple(h(0.036, 0, -0.006)), 0.02 * S * hk * K, (1.3, 0.92, 0.95), 2.0)]      # (the face running into the bill)
    if B['dewlap']:
        E += [('ELLIPSOID', tuple(h(0.028, 0, -0.034)), 0.02 * S * K, (1.3, 0.5, 1.35), 2.0),
              ('ELLIPSOID', tuple(h(0.006, 0, -0.06)), 0.018 * S * K, (1.15, 0.5, 1.3), 2.0)]
    head = part(keep(metaball_mesh(kind + '_head', E, res=0.0078 * S, m=coat, parent=root)), 'head', 'crest', 'goose')
    # ---- the bill: a goose's big wedge of a bill, deep at the base where it meets the face, its top running on from the
    # forehead and sloping gently to a broad rounded tip with a pale nail; dark nostrils; the lower bill under it on the jaw
    # (a pink tongue on it), the mouth dark inside (hidden while shut)
    bx0 = h(0.056, 0, 0)
    if B.get('call'):          # a call duck's: a broad orange wedge, deep where it meets the face, running on from the forehead
        bx0 = h(0.047, 0, -0.007)
        up_ = bill_loft(kind + '_bill', bx0, 0.076 * S * B['bill_k'], [(0.0, 0.0282, 0.0262, 0.006), (0.25, 0.027, 0.019, 0.0022), (0.6, 0.0262, 0.0122, -0.0022),
                                                       (1.0, 0.027, 0.0086, -0.0052)], S, bill, nail, root, nail_from=0.9)
    elif B.get('duck'):          # a duck's bill: long, flat and broad, a little wider towards its rounded tip, a small dark nail
        bx0 = h(0.05, 0, -0.004)
        up_ = bill_loft(kind + '_bill', bx0, 0.076 * S, [(0.0, 0.0172, 0.0118, 0.0062), (0.3, 0.0152, 0.0072, 0.0012), (0.65, 0.0162, 0.0052, -0.0022),
                                                       (1.0, 0.0172, 0.0042, -0.0042)], S, bill, nail, root, nail_from=0.93)
    else:
        up_ = bill_loft(kind + '_bill', bx0, 0.074 * S, [(0.0, 0.0195, 0.0148, 0.0095), (0.3, 0.0168, 0.0118, 0.0052), (0.6, 0.0146, 0.0092, 0.0012),
                                                       (0.85, 0.0138, 0.0072, -0.0028), (1.0, 0.0128, 0.0058, -0.0062)], S, bill, nail, root, nail_from=0.82)
    part(keep(up_), 'head')
    for sd in (1, -1):
        part(keep(sphere(kind + '_nostril', 0.0028 * S, tuple(bx0 + (Vector((0.03, sd * 0.012, 0.0178)) if B.get('call') else Vector((0.027, sd * 0.0122, 0.0132))) * S), (2.4, 0.5, 0.6), m=nos, parent=root, seg=8, rings=5)), 'head')
    if B.get('call'):          # (broad like its bill)
        lo_ = bill_loft(kind + '_jaw', bx0 + Vector((-0.004, 0, -0.0078)) * S, 0.072 * S * B['bill_k'], [(0.0, 0.0215, 0.0072, 0.0), (0.5, 0.0208, 0.0056, -0.0012),
                                                                                         (1.0, 0.0218, 0.0042, -0.0042)], S, lower, lower, root)
    elif B.get('duck'):
        lo_ = bill_loft(kind + '_jaw', bx0 + Vector((-0.004, 0, -0.0062)) * S, 0.072 * S * B.get('bill_k', 1.0), [(0.0, 0.015, 0.0045, 0.0), (0.5, 0.0145, 0.0034, -0.0006),
                                                                                         (1.0, 0.0155, 0.0028, -0.0024)], S, lower, lower, root)
    else:
        lo_ = bill_loft(kind + '_jaw', bx0 + Vector((-0.004, 0, -0.0082)) * S, 0.07 * S, [(0.0, 0.0172, 0.0066, 0.0), (0.5, 0.0142, 0.0055, -0.0008),
                                                                                        (1.0, 0.0112, 0.004, -0.003)], S, lower, lower, root)
    part(keep(lo_), 'jaw')
    bk = B.get('bill_k', 1.0)
    part(keep(sphere(kind + '_tongue', 0.011 * S, tuple(bx0 + Vector((0.03 * bk, 0, -0.0065)) * S), (2.4 * bk, 0.72, 0.3), m=tongue, parent=root, seg=10, rings=6)), 'jaw')
    part(keep(sphere(kind + '_mouthin', 0.0145 * S, tuple(bx0 + Vector((0.03 * bk, 0, -0.0045)) * S), (2.6 * bk, 0.72, 0.3), m=gum, parent=root, seg=12, rings=6)), 'head')
    pivot('jaw', tuple(bx0 + Vector((-0.006, 0, -0.008)) * S), root)
    b1 = bx0 + Vector((0.074 * B.get('bill_k', 1.0), 0, -0.007)) * S
    # ---- eyes: high on the sides of the head, a little forward: a clear round iris (Gertrude's pale blue, Hector's dark
    # brown), a round pupil, a bright catch-light, and a ring of bare skin round each (Hector's orange)
    er = 0.0138 * S * (1.1 if B.get('call') else 1.0)       # (a call duck's a little bigger: a baby face)
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
    # ---- the folded wings: lying snug on each upper flank, following the body's curve (laid on it with onbody/lay): a smooth
    # bed of small coverts (feathered by the browser's drawing) rounded at the front and blending into the body at its edges;
    # on it a row of greater coverts, the secondaries and tertials lying back, their tips making the wing's scalloped lower and
    # back edge, and the long pointed primaries coming out from under them, running back over the rump to cross above the tail
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R')
        nu, nv, xf, xb = 16, 8, 0.075, -0.175
        rows = []
        for i in range(nu + 1):
            u = i / nu; x = (xf + (xb - xf) * u) * BL
            pt = 36 - 14 * u                                        # the top edge (towards the spine), degrees from the top
            pb = 82 + 14 * math.sin(math.pi * min(1.0, u * 1.25)) - 10 * u      # the lower edge
            k = math.sqrt(max(0.0, 1 - (1 - min(1.0, u / 0.2)) ** 2)) * math.sqrt(max(0.0, 1 - (1 - min(1.0, (1 - u) / 0.12)) ** 2))
            mid, half = (pt + pb) / 2, (pb - pt) / 2 * max(0.12, k)
            rows.append([onbody(x, mid - half + 2 * half * (j / nv), sd, 0.006 + 0.0085 * math.sin(math.pi * j / nv) * max(0.2, k))[0] for j in range(nv + 1)])
        part(keep(sheet(kind + '_wbed', rows, coat, root, out=lambda p: p - Vector((p.x, 0, zax)))), nm, 'wing', 'goose')
        for i in range(7):                             # the greater coverts: a row along the middle of the wing
            f = i / 6; x0, p0 = (0.055 - 0.16 * f) * BL, 60 - 8 * f
            part(lay(kind + '_gcov', x0, p0, x0 - 0.07 * BL, p0 + 7, sd, 0.0168, 0.0178, 0.04), nm, 'prim', 'goose')
        for i in range(9):                             # secondaries (front and low) .. tertials (back and high, over the back)
            f = i / 8; x0, p0 = (0.04 - 0.15 * f) * BL, 84 - 34 * f
            x1, p1 = x0 - (0.12 + 0.07 * f) * BL, p0 + 3 - 16 * f
            part(lay(kind + '_sec', x0, p0, x1, p1, sd, 0.011 + 0.0006 * i, 0.0125 + 0.0006 * i, 0.05, bend=3 * (1 - f)), nm, 'prim', 'goose')
        for j in range(5):                             # the primaries: out from under the tertials, back over the rump
            f = j / 4; x0, p0 = (-0.03 - 0.02 * f) * BL, 62 - 6 * f
            if B.get('duck'):                            # (a duck's: shorter, lying close along the back to the tail)
                part(lay(kind + '_prim', x0, p0, (-0.27 + 0.012 * f) * BL, 24 + 4 * f + (1.5 if sd > 0 else 0), sd, 0.0085 - 0.0004 * j, 0.009 + 0.0003 * (4 - j),
                         0.036, pointed=True, seg=9, xmin=-0.27), nm, 'prim', 'goose')
                continue
            part(lay(kind + '_prim', x0, p0, (-0.33 + 0.012 * f) * BL, 17 + 4 * f + (1.5 if sd > 0 else 0), sd, 0.0105 - 0.0004 * j, 0.0125 + 0.0003 * (4 - j) + (0.0015 if sd > 0 else 0),
                     0.038, pointed=True, seg=9, xmin=-0.315), nm, 'prim', 'goose')
        pivot(nm, tuple(P(0.07 * BL, sd * 0.1, zc / S + 0.07)), root)
    # ---- the open wings (shown spread): a smooth leading edge from the shoulder out to the wrist and along the hand; behind
    # it a thin bed (the coverts' smaller feathers, drawn by the browser) and rows of real feathers like roof tiles: two rows of
    # coverts over thirteen broad secondaries (the inner ones, the tertials, longer and turned in to meet the body), and on the
    # hand its coverts over ten long pointed primaries fanned from pointing back to pointing out; every feather overlapping
    # the next so the wing is whole, arched a little (the feathers curving down to their tips). The browser grows it from the
    # shoulder as the folded one tucks away, and flaps it, the hand following the arm a moment later
    for sd in (1, -1):
        nm = 'wing' + ('L' if sd > 0 else 'R') + 'o'; hn = 'wing' + ('L' if sd > 0 else 'R') + 'h'
        s0 = P(0.06 * BL, sd * 0.085, zc / S + 0.08)
        span = Vector((0.07, sd * 1.0, 0.05)).normalized()
        wrist = s0 + span * 0.27 * S
        hand = Vector((-0.3, sd * 1.0, -0.03)).normalized()
        back = Vector((-1, 0, 0)); out_ = Vector((0, sd, 0))
        cd = (back - span * back.dot(span)).normalized()            # chordwise at the arm: back, square to it
        ch = (back - hand * back.dot(hand)).normalized()            # and at the hand
        wn = span.cross(cd) * sd                                    # the wing's upper side
        # the leading edge: a flattened tube, thick at the shoulder, thin along the hand
        le = [s0.lerp(wrist, t) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        part(keep(tube(kind + '_lea', le, [0.03, 0.026, 0.023, 0.02, 0.018, 0.016], [0.017, 0.014, 0.012, 0.011, 0.01, 0.009], [cd] * 6, [wn] * 6, S, coat, root)), nm, 'wing', 'goose')
        lh = [wrist + hand * 0.085 * S * t for t in (0.0, 0.33, 0.66, 1.0)]
        part(keep(tube(kind + '_leh', lh, [0.016, 0.014, 0.011, 0.007], [0.009, 0.008, 0.006, 0.004], [ch] * 4, [wn] * 4, S, coat, root)), hn, 'wing', 'goose')
        # the beds behind the leading edge (arm, then hand), arched down towards the back
        rows = [[s0.lerp(wrist, t) + cd * (c * 0.07 * S) - wn * (0.01 * c * c * S) for c in (0.0, 0.25, 0.5, 0.75, 1.0)] for t in [i / 10 for i in range(11)]]
        part(keep(sheet(kind + '_obed', rows, coat, root, thick=0.003 * S)), nm, 'wing', 'goose')
        rows = [[wrist + hand * (t * 0.08 * S) + ch * (c * 0.05 * S * (1 - 0.5 * t)) - wn * (0.008 * c * c * S) for c in (0.0, 0.33, 0.66, 1.0)] for t in (0.0, 0.25, 0.5, 0.75, 1.0)]
        part(keep(sheet(kind + '_obedh', rows, coat, root, thick=0.003 * S)), hn, 'wing', 'goose')
        # the coverts: two rows along the arm, the lower (greater) row longer
        for row, (n_, c0, L_, w_, lift) in enumerate([(11, 0.006, 0.05, 0.042, 0.0095), (12, 0.026, 0.072, 0.05, 0.0065)]):
            for i in range(n_):
                t = 0.03 + 0.94 * i / (n_ - 1)
                st = s0.lerp(wrist, t) + cd * c0 * S
                dirn = (cd + out_ * (0.04 + 0.12 * t) - wn * 0.05).normalized()
                part(wing_feather(kind + '_ocov', st, dirn, wn, L_ * S, w_ * S, coat, root, lift=lift * S, droop=0.004 * S, seg=4, base=0.2), nm, 'prim', 'goose')
        # the secondaries: broad, rounded, overlapping; the inner ones (tertials) longer and turned in towards the body
        for i in range(13):
            t = 0.02 + 0.96 * i / 12
            st = s0.lerp(wrist, t) + cd * 0.04 * S
            turn = -0.22 * (1 - min(1.0, t / 0.2)) + 0.16 * t
            dirn = (cd + out_ * turn - wn * 0.06).normalized()
            L_ = (0.15 + 0.03 * (1 - min(1.0, t / 0.2)) + 0.012 * t) * S
            part(wing_feather(kind + '_osec', st, dirn, wn, L_, 0.06 * S, coat, root, lift=0.0035 * (1 - t) * S, droop=0.012 * S, seg=7), nm, 'prim', 'goose')
        # the hand's coverts over the primaries' bases
        for i in range(7):
            f = i / 6; a = math.radians(26 + 52 * f)
            st = wrist + hand * (0.004 + 0.06 * f) * S + ch * 0.008 * S
            dirn = (back * math.cos(a) + out_ * math.sin(a) - wn * 0.04).normalized()
            part(wing_feather(kind + '_ocov', st, dirn, wn, (0.085 + 0.01 * f) * S, 0.048 * S, coat, root, lift=0.0065 * S, droop=0.005 * S, seg=4, base=0.2), hn, 'prim', 'goose')
        # the primaries: fanned from pointing back (the innermost, carrying on the secondaries' edge) to pointing out (the
        # wing's tip); the innermost on top of the next
        PL = [0.19, 0.2, 0.212, 0.226, 0.24, 0.255, 0.27, 0.28, 0.275, 0.245]
        for i in range(10):
            f = i / 9; a = math.radians(24 + 60 * f)
            st = wrist + hand * (0.003 + 0.07 * f) * S + ch * 0.022 * S * (1 - f)
            dirn = (back * math.cos(a) + out_ * math.sin(a) - wn * 0.05).normalized()
            part(wing_feather(kind + '_oprim', st, dirn, wn, PL[i] * S, (0.058 - 0.008 * f) * S, coat, root, lift=0.0028 * (1 - f) * S, droop=0.016 * S, pointed=True), hn, 'prim', 'goose')
        pivot(nm, tuple(s0), root); pivot(hn, tuple(wrist), root)
    # ---- the tail: a goose's short fan of stiff feathers sticking out behind the rump, tipped up and folded a little down at
    # its sides (the middle feathers highest), on top of the soft white feathers under it
    tb = P(-0.268 * BL, 0, zc / S + 0.052)
    nt = 10
    for i in range(nt):
        f = (i - (nt - 1) / 2) / ((nt - 1) / 2)
        a = math.radians(27 * f)
        st = tb + Vector((0.008 * abs(f), f * 0.012, -0.01 * f * f)) * S
        dirn = Vector((-math.cos(a), math.sin(a), 0.3 - 0.22 * f * f)).normalized()
        part(flat_feather(kind + '_tail', st, dirn, (0.105 - 0.02 * f * f) * S, 0.05 * S, coat, root, lift=0.003 * S * (1 - abs(f)), droop=0.002 * S, curl=0.05, seg=6, base=0.6), 'tail', 'tail', 'goose')
    if B.get('drake'):
        for k_, sd in enumerate((1, -1)):
            st = tb + Vector((0.012, sd * 0.004, 0.006)) * S
            part(flat_feather(kind + '_curl', st, Vector((0.25, sd * 0.05, 1.0)).normalized(), 0.05 * S, 0.012 * S, coat, root, lift=0.002 * S * k_, curl=0.9, seg=8, pointed=True, base=0.5), 'tail', 'tail', 'goose')
    pivot('tail', tuple(P(-0.25 * BL, 0, zc / S + 0.05)), root)
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
        c_ = cyl(kind + '_shank', 0.0132 * S, sh.length + 0.01 * S, tuple(heel + sh * 0.5), sh.to_track_quat('Z', 'Y').to_euler(), feet, verts=8, r2=0.0105 * S, bevel=0, parent=root)
        for p_ in c_.data.polygons: p_.use_smooth = True
        part(keep(c_), L + 'k')
        part(keep(sphere(kind + '_heel', 0.0148 * S, tuple(heel), (1.0, 1.0, 1.15), m=feet, parent=root, seg=8, rings=5)), L + 'k')
        part(keep(webbed_foot(kind + '_foot', foot, sd, S, feet, claw, root, web)), L + 'f')
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


def wing_feather(name, start, dirn, wn, L, w0, m, parent, lift=0.0, droop=0.0, curl=0.0, seg=8, pointed=False, base=0.35):
    """A flight feather or covert of the open wing: as flat_feather, its vane lying in the wing's plane (wn: the wing's
    upper side) rather than level."""
    side = wn.cross(dirn).normalized(); nrm = dirn.cross(side).normalized()
    if nrm.dot(wn) < 0: nrm = -nrm
    pts, ws, wds = [], [], []
    for i in range(seg + 1):
        t = i / seg
        p = start + dirn * L * t + nrm * (lift - droop * t * t + curl * L * t * t)
        if pointed: w = w0 * min(1.0, t / 0.12 + base) * (1 - t ** 1.6) ** 0.7 + 0.001
        else: w = w0 * min(1.0, t / 0.12 + base) * (1 - t ** 2.2) ** 0.5 + 0.0015
        pts.append(p); ws.append(w); wds.append(side)
    return ribbon(name, pts, ws, wds, m, parent, thick=0.002)


def sheet(name, rows, m, parent, thick=0.0, out=None):
    """A smooth sheet through a grid of points (rows of the same length). out(p): which way is outside at p (the faces
    turned to face it; one-sided, for a bed lying on the body); or thick: two-sided with that thickness."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    V = [[bm.verts.new(p) for p in r] for r in rows]
    for i in range(len(V) - 1):
        for j in range(len(V[i]) - 1):
            f = bm.faces.new((V[i][j], V[i][j + 1], V[i + 1][j + 1], V[i + 1][j]))
            if out:
                f.normal_update()
                if f.normal.dot(out(f.calc_center_median())) < 0: f.normal_flip()
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); o.parent = parent
    if thick:
        so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = thick; so.offset = 0
    for p_ in o.data.polygons: p_.use_smooth = True
    return o


def tube(name, pts, rcs, rvs, cds, wns, S, m, parent, sides=12):
    """The open wing's leading edge: a flattened tube along pts, rcs wide (chordwise, along cds) and rvs deep (along wns),
    for S=1, set mostly behind the line (so its front is the wing's edge), closed at both ends."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rings = []
    for p, rc, rv, cd, wn in zip(pts, rcs, rvs, cds, wns):
        c = p + cd * rc * S * 0.4
        rings.append([bm.verts.new(c + cd * math.cos(2 * math.pi * j / sides) * rc * S + wn * math.sin(2 * math.pi * j / sides) * rv * S) for j in range(sides)])
    for i in range(len(rings) - 1):
        for j in range(sides):
            bm.faces.new((rings[i][j], rings[i][(j + 1) % sides], rings[i + 1][(j + 1) % sides], rings[i + 1][j]))
    for r_, p in ((rings[0], pts[0]), (rings[-1], pts[-1])):
        c = bm.verts.new(sum((v.co for v in r_), Vector()) / sides)
        for j in range(sides): bm.faces.new((r_[j], r_[(j + 1) % sides], c))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); o.parent = parent
    for p_ in o.data.polygons: p_.use_smooth = True
    return o


def webbed_foot(name, at, sd, S, m, claw_m, parent, web_m=None):
    """A goose's webbed foot from `at` (the ankle, on the ground): three toes fanned forward and the broad web between them
    (a little darker), its front edge dipping only a little between the toe tips, so the foot is a paddle; low ridges along
    the toes, a small dark claw on each; the hind toe a little knob."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    angs = [math.radians(a) for a in (-sd * 34, 0, sd * 34)]           # inner, middle, outer toe
    lens = [0.06, 0.072, 0.064]
    th = 0.0045 * S
    tips = [Vector((math.cos(a) * l, math.sin(a) * l, 0)) * S for a, l in zip(angs, lens)]
    # the web's outline: from the ankle out along each toe, dipping back a little in between the tips
    ring = [Vector((-0.01, 0, 0)) * S]
    for i in range(3):
        ring.append(tips[i] * 0.3 + Vector((-0.004 * S, 0, 0)) if i != 1 else tips[i] * 0.55)
        ring.append(tips[i])
        if i < 2: ring.append((tips[i] + tips[i + 1]) / 2 * 0.86)
    top = [bm.verts.new(at + p + Vector((0, 0, th))) for p in ring]
    bot = [bm.verts.new(at + p) for p in ring]
    c_t = bm.verts.new(at + Vector((0.025 * S, 0, th * 1.4))); c_b = bm.verts.new(at + Vector((0.025 * S, 0, 0)))
    n = len(ring)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((c_t, top[i], top[j])); bm.faces.new((c_b, bot[j], bot[i])); bm.faces.new((top[i], bot[i], bot[j], top[j]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, web_m or m); o.parent = parent
    for p_ in o.data.polygons: p_.use_smooth = False
    parts = [o]
    for i, tp in enumerate(tips):                      # the toes: a low ridge along the top of the web, a claw at the end
        a = angs[i]; d = Vector((math.cos(a), math.sin(a), 0))
        ln = tp.length
        c = cyl(name + '_toe', 0.0042 * S, ln * 0.94, tuple(at + d * ln * 0.47 + Vector((0, 0, th + 0.0008 * S))), (0, math.radians(90), a), m, verts=6, r2=0.003 * S, bevel=0, parent=parent)
        k = sphere(name + '_claw', 0.0042 * S, tuple(at + tp + d * 0.003 * S + Vector((0, 0, th * 0.7))), (1.6, 0.8, 0.7), (0, 0, a), m=claw_m, parent=parent, seg=6, rings=4)
        parts += [c, k]
    k = sphere(name + '_hind', 0.0065 * S, tuple(at + Vector((-0.012, 0, 0.011)) * S), (1.3, 0.95, 0.9), m=m, parent=parent, seg=8, rings=5)
    parts.append(k)
    return join(parts, name)


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 32
    scn = reset()
    cyl('ground', 3.0, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    ka, kc = ('call_m', 'call_f') if os.environ.get('CALL') else ('embden', 'toulouse')       # (CALL=1: the call ducks)
    a = goose(ka); a.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -25))))
    c = goose(kc); c.location = (0.2, -0.75, 0) if not os.environ.get('CALL') else (0.05, -0.4, 0); c.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -25)) - 10))
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
