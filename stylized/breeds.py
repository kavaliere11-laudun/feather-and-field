"""Every breed in the cosy-farm look, built for the browser with parts that bones can move (body, head, wings, tail, legs):
Rhode Island Red, Buff Orpington, Cream Legbar, Light Brahma and Silkie, as hens and roosters, plus one chick for every breed.
Each mesh is tagged with its part (o['part']: which bone moves it) and its paint region (o['paint']: which colour the
browser gives it, so one Silkie model can wear any of the 11 Silkie colours). Pivot empties (pv_*) mark where the bones turn.
Blender metres; the bird faces +x here (the exporter turns it to face the camera's way)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from hen import paddle, K

# paint regions (the browser's painter uses the same numbers)
PAINT = dict(keep=0, body=1, wing=2, prim=3, tail=4, crest=5, legfeather=6, down=7, cwing=8, cleg=9, cbeak=10)

# shape and base colours per breed (the browser repaints plumage; these are what the file shows on its own)
BREEDS = {
    'rir': dict(scale=1.0, body=(1.45, 0.92, 0.9), r=0.125, comb=1.0, tail='fan', shank=0.11,
                legs='#efbd3c', beak='#e7b04a', eye='#e08a26', combc='#d8352b', plum='#8a3a1c', wing='#6e2814', tailc='#2e1710'),
    'orp': dict(scale=1.06, body=(1.4, 1.06, 0.98), r=0.134, comb=0.8, tail='short', shank=0.085, thigh=1.3, cushion=True,
                legs='#ecc6b2', beak='#e6c49a', eye='#d9842a', combc='#d8352b', plum='#e2a94e', wing='#cf9441', tailc='#c08236'),
    'leg': dict(scale=0.95, body=(1.52, 0.85, 0.86), r=0.121, comb=0.75, crest=True, tail='fan', tail_up=10, shank=0.12,
                legs='#e9bd45', beak='#e3c07a', eye='#d9842a', combc='#d8352b', plum='#bdb6a6', wing='#9c968a', tailc='#d8d2c2'),
    'bra': dict(scale=1.13, body=(1.36, 1.0, 1.04), r=0.13, comb=0.5, pea=True, tail='short', shank=0.1, feathered=True, thigh=1.2,
                legs='#efc24a', beak='#e9c46a', eye='#d9842a', combc='#d8352b', plum='#f1ede3', wing='#ece7dc', tailc='#1d1b1a'),
    'sil': dict(scale=0.86, silkie=True, shank=0.08,
                legs='#5c5868', beak='#757688', eye='#2c2222', combc='#4b2032', lobe='#3fa6b8', plum='#f4f1ea', wing='#ece8df', tailc='#f4f1ea'),
}
ROOSTER = 1.12

_mats = {}


def flat(name, hexc, rough=0.75):
    """A plain colour (the browser's models are flat-coloured: no textures)."""
    if name not in _mats: _mats[name] = mat(name, hexc, rough=rough)
    return _mats[name]


def tag(o, part, paint='keep'):
    o['part'] = part; o['paint'] = PAINT[paint]; return o


def pivot(name, loc, parent):
    return empty('pv_' + name, loc, (0, 0, 0), parent)


def build(breed='rir', sex='h', seed=1):
    """A bird standing at the origin, facing +x. Returns its root empty."""
    random.seed(seed); _mats.clear()
    B = BREEDS[breed]; rooster = sex == 'r'
    root = empty('bird_%s_%s' % (breed, sex))
    body_rig = empty('body', (0, 0, 0), (0, 0, 0), root)
    if B.get('silkie'): parts = silkie(B, rooster, root, body_rig, seed)
    else: parts = feathered(B, rooster, root, body_rig, seed)
    s = B['scale'] * (ROOSTER if rooster else 1.0)
    root.scale = (s, s, s)
    return root


# ------------------------------------------------------------------ the four "feathered" breeds (hen.py's shapes, varied)
def feathered(B, rooster, root, body_rig, seed):
    pl = flat('plum', B['plum'], 0.85); wg = flat('wing', B['wing'], 0.85); tl = flat('tailc', B['tailc'], 0.55)
    cm = flat('comb', B['combc'], 0.45); bk = flat('beak', B['beak'], 0.4); lg = flat('legs', B['legs'], 0.45)
    ey = flat('eye', B['eye'], 0.15); pu = flat('pupil', '#0b0a09', 0.05)
    bx, by, bz = B['body']; R = B['r']
    head = Vector((0.15, 0, 0.415)); neck = (head + Vector((0.075, 0, 0.27))) / 2
    th = B.get('thigh', 1.0)
    E = [
        ('ELLIPSOID', (-0.02, 0, 0.215), R * K, (bx, by, bz), 2.0),                     # body
        ('BALL', (0.085, 0, 0.2), (R * 0.74) * K, None, 2.0),                           # full breast
        ('ELLIPSOID', (-0.12, 0, 0.27), R * 0.64 * K, (1.2, by * 1.08, 0.95), 2.0),     # back rising to the tail
        ('ELLIPSOID', (-0.19, 0, 0.33), 0.05 * K, (0.85, 0.9, 1.45), 2.0),              # tail cushion
        ('ELLIPSOID', tuple(neck), 0.044 * K, (1.0, 0.95, 1.55), 2.0),                  # neck
        ('BALL', tuple(head), 0.058 * K, None, 2.0),                                    # head
        ('BALL', (0.0, 0.055, 0.12), 0.05 * th * K, None, 1.6), ('BALL', (0.0, -0.055, 0.12), 0.05 * th * K, None, 1.6),   # thighs
    ]
    if B.get('cushion'): E.append(('ELLIPSOID', (-0.13, 0, 0.17), 0.085 * K, (1.1, by * 1.1, 0.9), 2.0))     # an Orpington's fluffy rear
    if rooster: E.append(('ELLIPSOID', tuple(neck + Vector((-0.02, 0, -0.02))), 0.065 * K, (1.1, 1.05, 1.3), 2.0))   # hackle ruff
    tag(metaball_mesh('body_mb', E, res=0.008, m=pl, parent=body_rig), 'body', 'body')
    pivot('body', (0.0, 0, 0.17), body_rig)
    pivot('head', (0.085, 0, 0.29), body_rig)
    pivot('headc', tuple(head), body_rig)
    # head details (all ride on the head bone)
    hd = empty('head', tuple(head), (0, math.radians(-10), 0), body_rig)
    tag(cyl('beak', 0.019, 0.048, (0.07, 0, -0.008), (0, math.radians(90 + 12), 0), bk, verts=12, r2=0.002, bevel=0.002, parent=hd), 'head')
    for sd in (1, -1):
        tag(sphere('eye', 0.016, (0.032, sd * 0.043, 0.013), m=ey, parent=hd, seg=12, rings=8), 'head')
        tag(sphere('pupil', 0.0098, (0.039, sd * 0.0545, 0.0145), m=pu, parent=hd, seg=10, rings=6), 'head')
        tag(sphere('lobe', 0.011, (0.004, sd * 0.045, -0.012), (1, 0.45, 1.2), m=cm if not B.get('pea') else flat('lobe_w', '#efe6da'), parent=hd, seg=12, rings=8), 'head')
    cs = (1.5 if rooster else 1.0) * B['comb']
    if B.get('pea'):           # a Brahma's pea comb: three low ridges
        el = [('BALL', (0.045 - i * 0.02, dy, 0.046), 0.012 * K * (1.2 if rooster else 1.0), None, 2.0) for i in range(3) for dy in (-0.008, 0, 0.008)]
        tag(metaball_mesh('comb', el, res=0.004, m=cm, parent=hd), 'head')
    else:
        comb = metaball_mesh('comb', [('BALL', (0.045 - i * 0.022, 0, 0.05 + 0.012 * math.sin(i * 1.1) * cs + (0.006 if i in (1, 2) else 0)), (0.017 - 0.0015 * abs(i - 1.5)) * K * cs, None, 2.0) for i in range(4)]
                             + [('ELLIPSOID', (0.0, 0, 0.042), 0.02 * K, (2.2, 0.5, 0.5), 2.0)], res=0.004, m=cm, parent=hd)
        comb.scale = (1, 0.55, 1); tag(comb, 'head')
    wk = (1.0 if rooster else 0.8) * (0.6 if B.get('pea') else 1.0)
    tag(metaball_mesh('wattles', [('ELLIPSOID', (0.05, sd * 0.009, -0.042), 0.013 * K * wk * (1.5 if rooster else 1), (0.8, 0.6, 1.3), 2.0) for sd in (1, -1)], res=0.004, m=cm, parent=hd), 'head')
    if B.get('crest'):         # a Legbar's little crest of feathers swept back behind the comb
        for i in range(5):
            a = math.radians(-50 + 25 * i)
            tag(paddle('crest', 0.06, 0.022, 0.008, pl, hd, (-0.03, 0.012 * math.sin(a), 0.035), (math.radians(20 * math.sin(a)), math.radians(-150), 0), curve=0.15), 'head', 'crest')
    # wings: soft folded shapes with feather tips at the back
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        w = empty('wing', (0.0, sd * 0.093 * by / 0.92, 0.24), (math.radians(sd * -6), math.radians(-12), math.radians(sd * -4)), body_rig)
        pivot(nm, (-0.01, sd * 0.088 * by / 0.92, 0.285), body_rig)
        tag(sphere('wingbase', 0.1, (0, 0, 0), (1.05, 0.2, 0.5), m=wg, parent=w, seg=24, rings=14), nm, 'wing')
        for k in range(4):
            e = math.radians(-8 - k * 5)
            tag(paddle('prim', 0.1 - k * 0.008, 0.032, 0.01, wg, w, (-0.05, sd * (0.008 - k * 0.002), -0.012 - k * 0.011),
                       (0, e - math.pi, math.radians(sd * (4 + k * 2))), curve=-sd * 0.12), nm, 'prim')
    # tail
    tb = empty('tail', (-0.2, 0, 0.33), (0, 0, 0), body_rig)
    pivot('tail', (-0.19, 0, 0.32), body_rig)
    short = B['tail'] == 'short'
    n = 9 if rooster else 7
    up = math.radians(B.get('tail_up', 0))
    for i in range(n):
        side = 1 if i % 2 else -1
        e = math.radians(28 + (40 if short else 50) * i / (n - 1)) + up
        L = (0.2 if rooster else 0.14) * (0.72 if short else 1.0) * (1.0 - 0.15 * abs(i / (n - 1) - 0.5))
        tag(paddle('tailf', L, 0.055 if short else (0.05 if not rooster else 0.045), 0.011, tl, tb, (0.01, side * 0.012, -0.01),
                   (math.radians(side * 6), e - math.pi, math.radians(side * 9)), curve=side * 0.22), 'tail', 'tail')
    if rooster:
        for sd in (1, -1):
            tag(paddle('sickle', 0.3 * (0.7 if short else 1.0), 0.035, 0.01, tl, tb, (0.01, sd * 0.014, 0.02), (math.radians(sd * 6), math.radians(55) + up - math.pi, math.radians(sd * 12)), curve=sd * 0.3), 'tail', 'tail')
    # legs and feet (their own bones: they stay planted while the body tilts)
    sh = B['shank']
    for sd, nm in ((1, 'legL'), (-1, 'legR')):
        lg_ = empty('leg', (0.01, sd * 0.055, 0), (0, 0, 0), root)
        pivot(nm, (0.01, sd * 0.055, sh), root)
        tag(cyl('shank', 0.0115, sh, (0, 0, sh / 2), (0, math.radians(6), 0), lg, verts=8, r2=0.0095, bevel=0, parent=lg_), nm)
        for ang, L in ((0, 0.06), (32, 0.05), (-32, 0.05), (180, 0.03)):
            a = math.radians(ang + sd * 6)
            tag(cyl('toe', 0.0065, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.006), (0, math.radians(90), a), lg, verts=6, r2=0.0035, bevel=0, parent=lg_), nm)
        if B.get('feathered'):    # a Brahma's feathered shanks: soft feathering down the outside of each leg and onto the outer toe
            rnd = random.Random(seed * 11 + (1 if sd > 0 else 2))
            F = [('ELLIPSOID', (-0.004, sd * 0.012, sh * 0.55), 0.016 * K, (1.0, 0.9, 2.2), 2.0), ('ELLIPSOID', (0.012, sd * 0.022, 0.012), 0.012 * K, (1.8, 1.0, 0.7), 2.0)]
            F += bumps(rnd, (-0.004, sd * 0.014, sh * 0.5), (0.014, 0.016, 0.03), 5, 0.009, 0.012)
            tag(metaball_mesh('legfluff', F, res=0.0045, m=pl, parent=lg_), nm, 'legfeather')
    return True


# ------------------------------------------------------------------ the Silkie: a soft cloud of fluff with a pompom crest
def bumps(rnd, centre, radii, n, r0, r1, zmin=-1.0, skip=None):
    """Metaball bumps over an ellipsoid's surface: a fluffy outline that stays one soft shape."""
    out = []
    for i in range(n * 3):
        if len(out) >= n: break
        u = rnd.uniform(-1, 1); a = rnd.uniform(0, math.tau); q = math.sqrt(1 - u * u)
        d = Vector((q * math.cos(a), q * math.sin(a), u))
        if d.z < zmin or (skip and skip(d)): continue
        p = Vector((centre[0] + d.x * radii[0] * 0.92, centre[1] + d.y * radii[1] * 0.92, centre[2] + d.z * radii[2] * 0.92))
        out.append(('BALL', tuple(p), rnd.uniform(r0, r1) * K, None, 1.4))
    return out


def silkie(B, rooster, root, body_rig, seed):
    pl = flat('plum', B['plum'], 0.9); wg = flat('wing', B['wing'], 0.9)
    cm = flat('comb', B['combc'], 0.5); bk = flat('beak', B['beak'], 0.45); lg = flat('legs', B['legs'], 0.55)
    ey = flat('eye', '#120d0c', 0.1); gl = flat('shine', '#ffffff', 0.1); lb = flat('lobe', B['lobe'], 0.35); skin = flat('skin', '#3a2c3c', 0.6)
    rnd = random.Random(seed * 31 + (7 if rooster else 0))
    up = 0.025 if rooster else 0.0
    # body: a round core, full breast, a cushion rising behind and a fluffy neck, all edged with soft bumps
    E = [('ELLIPSOID', (-0.01, 0, 0.19), 0.13 * K, (1.22, 1.0, 0.95), 2.0),
         ('BALL', (0.075, 0, 0.21 + up * 0.5), 0.092 * K, None, 2.0),
         ('ELLIPSOID', (-0.13, 0, 0.255), 0.08 * K, (1.0, 0.95, 1.0), 2.0),
         ('ELLIPSOID', (0.09, 0, 0.285 + up), 0.06 * K, (1.0, 1.0, 1.3), 2.0)]
    E += bumps(rnd, (-0.01, 0, 0.2), (0.16, 0.13, 0.125), 34, 0.034, 0.05, zmin=-0.45)
    E += bumps(rnd, (0.09, 0, 0.29 + up), (0.06, 0.06, 0.075), 8, 0.025, 0.035, zmin=-0.2)
    tag(metaball_mesh('body_mb', E, res=0.009, m=pl, parent=body_rig), 'body', 'body')
    pivot('body', (0.0, 0, 0.17), body_rig)
    head = Vector((0.125, 0, 0.35 + up))
    pivot('head', (0.1, 0, 0.28 + up), body_rig)
    pivot('headc', tuple(head), body_rig)
    # the cushion tail: a pompom (a rooster's sits higher and fuller)
    pivot('tail', (-0.15, 0, 0.27), body_rig)
    T = bumps(rnd, (-0.2, 0, 0.3 + up), (0.05, 0.05, 0.05), 9 if rooster else 7, 0.03, 0.04)
    T.append(('BALL', (-0.19, 0, 0.3 + up), 0.045 * K, None, 2.0))
    tag(metaball_mesh('tail_mb', T, res=0.008, m=pl, parent=body_rig), 'tail', 'tail')
    # head: a small dark face with a short beak, bead eyes, turquoise earlobes, a mulberry walnut comb, and the pompom crest
    hd = empty('head', tuple(head), (0, math.radians(-8), 0), body_rig)
    tag(sphere('face', 0.034, (0.02, 0, -0.006), (1.0, 0.95, 0.95), m=skin, parent=hd, seg=16, rings=10), 'head')
    tag(cyl('beak', 0.016, 0.036, (0.058, 0, -0.012), (0, math.radians(90 + 14), 0), bk, verts=10, r2=0.002, bevel=0.002, parent=hd), 'head')
    for sd in (1, -1):
        tag(sphere('eye', 0.011, (0.04, sd * 0.024, 0.004), m=ey, parent=hd, seg=12, rings=8), 'head')
        tag(sphere('glint', 0.003, (0.048, sd * 0.028, 0.009), m=gl, parent=hd, seg=8, rings=6), 'head')
        tag(sphere('lobe', 0.01, (0.004, sd * 0.03, -0.016), (1, 0.45, 1.25), m=lb, parent=hd, seg=10, rings=8), 'head')
    wal = metaball_mesh('comb', [('BALL', (0.032 + rnd.uniform(-0.006, 0.006), rnd.uniform(-0.007, 0.007), 0.026 + rnd.uniform(-0.003, 0.005)), 0.009 * K * (1.35 if rooster else 1.0), None, 2.0) for _ in range(6)], res=0.0035, m=cm, parent=hd)
    tag(wal, 'head')
    tag(metaball_mesh('wattles', [('ELLIPSOID', (0.038, sd * 0.007, -0.03), 0.007 * K * (1.4 if rooster else 1), (0.8, 0.6, 1.2), 2.0) for sd in (1, -1)], res=0.0035, m=cm, parent=hd), 'head')
    cr = (-0.012 - (0.012 if rooster else 0), 0, 0.045)
    C = bumps(rnd, cr, (0.045 * (1.15 if rooster else 1), 0.045, 0.04), 12, 0.022, 0.03, zmin=-0.5)
    C.append(('ELLIPSOID', cr, 0.04 * K, (1.15 if rooster else 1.0, 1.0, 0.9), 2.0))
    tag(metaball_mesh('crest', C, res=0.006, m=pl, parent=hd), 'head', 'crest')
    M_ = bumps(rnd, (0.0, 0, -0.012), (0.03, 0.04, 0.03), 8, 0.016, 0.022, skip=lambda d: d.x > 0.4)     # fluffy cheeks (muffs) round the back of the face
    tag(metaball_mesh('muffs', M_, res=0.005, m=pl, parent=hd), 'head', 'body')
    # wings: soft fluff on the sides (enough to flap)
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        pivot(nm, (-0.01, sd * 0.1, 0.26 + up), body_rig)
        W = bumps(rnd, (-0.045, sd * 0.11, 0.22 + up), (0.07, 0.018, 0.04), 8, 0.016, 0.022)
        W.append(('ELLIPSOID', (-0.045, sd * 0.108, 0.22 + up), 0.045 * K, (1.5, 0.38, 0.8), 2.0))
        tag(metaball_mesh('wingp', W, res=0.007, m=wg, parent=body_rig), nm, 'wing')
    # short dark legs with feathered shanks and five toes
    sh = B['shank']
    for sd, nm in ((1, 'legL'), (-1, 'legR')):
        lg_ = empty('leg', (0.01, sd * 0.05, 0), (0, 0, 0), root)
        pivot(nm, (0.01, sd * 0.05, sh), root)
        tag(cyl('shank', 0.012, sh, (0, 0, sh / 2), (0, math.radians(6), 0), lg, verts=8, r2=0.01, bevel=0, parent=lg_), nm)
        for ang, L in ((0, 0.05), (28, 0.045), (-28, 0.045), (165, 0.026), (195, 0.024)):
            a = math.radians(ang + sd * 6)
            tag(cyl('toe', 0.006, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.006), (0, math.radians(90), a), lg, verts=6, r2=0.0035, bevel=0, parent=lg_), nm)
        F = bumps(rnd, (0.004, sd * 0.016, sh * 0.6), (0.02, 0.02, 0.03), 6, 0.012, 0.016) + [('ELLIPSOID', (0.004, sd * 0.016, sh * 0.6), 0.02 * K, (1, 1, 1.4), 2.0)]
        F += [('ELLIPSOID', (0.022, sd * 0.024, 0.014), 0.013 * K, (1.5, 1.0, 0.7), 2.0)]
        tag(metaball_mesh('legfluff', F, res=0.005, m=pl, parent=lg_), nm, 'legfeather')
    return True


# ------------------------------------------------------------------ the chick (one model; the browser paints it for each breed and Silkie colour)
def chick(seed=1):
    random.seed(seed); _mats.clear()
    fl = flat('down', '#f1cf72', 0.9); wg = flat('cwing', '#e6bd5f', 0.9)
    bk = flat('cbeak', '#e9b24c', 0.4); lg = flat('cleg', '#f0be42', 0.45); pu = flat('pupil', '#0b0a09', 0.05); sh = flat('shine', '#ffffff', 0.1)
    root = empty('chick')
    rig = empty('cbody', (0, 0, 0), (0, 0, 0), root)
    head = Vector((0.03, 0, 0.122))
    E = [('ELLIPSOID', (-0.006, 0, 0.056), 0.05 * K, (1.18, 1.0, 0.92), 2.0),
         ('BALL', (0.02, 0, 0.05), 0.034 * K, None, 2.0),
         ('ELLIPSOID', (-0.05, 0, 0.068), 0.02 * K, (1.0, 0.85, 1.0), 2.0)]
    tag(metaball_mesh('chick_body', E, res=0.004, m=fl, parent=rig), 'body', 'down')
    pivot('body', (0, 0, 0.05), rig)
    pivot('head', (0.022, 0, 0.09), rig)
    pivot('headc', tuple(head), rig)
    tag(sphere('chead_ball', 0.04, tuple(head), (1.0, 0.96, 0.98), m=fl, parent=rig, seg=24, rings=16), 'head', 'down')
    hd = empty('chead', tuple(head), (0, math.radians(-6), 0), rig)
    tag(cyl('cbeak', 0.011, 0.026, (0.044, 0, -0.006), (0, math.radians(90 + 10), 0), bk, verts=10, r2=0.0012, bevel=0.0012, parent=hd), 'head', 'cbeak')
    for sd in (1, -1):
        tag(sphere('ceye', 0.0098, (0.024, sd * 0.03, 0.009), m=pu, parent=hd, seg=14, rings=10), 'head')
        tag(sphere('cglint', 0.0028, (0.031, sd * 0.034, 0.014), m=sh, parent=hd, seg=8, rings=6), 'head')
    tag(sphere('ctuft', 0.012, (0.0, 0, 0.038), (1.4, 0.8, 0.9), m=fl, parent=hd, seg=10, rings=8), 'head', 'down')     # a little tuft on top
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        pivot(nm, (-0.012, sd * 0.046, 0.074), rig)
        w = empty('cwing', (-0.016, sd * 0.05, 0.058), (math.radians(sd * -4), math.radians(-14), 0), rig)
        tag(sphere('cwingb', 0.026, (0, 0, 0), (1.0, 0.2, 0.55), m=wg, parent=w, seg=16, rings=10), nm, 'cwing')
    for sd, nm in ((1, 'legL'), (-1, 'legR')):
        lg_ = empty('cleg', (0.004, sd * 0.02, 0), (0, 0, 0), root)
        pivot(nm, (0.004, sd * 0.02, 0.03), root)
        tag(cyl('cshank', 0.0055, 0.03, (0, 0, 0.015), m=lg, verts=8, bevel=0.001, parent=lg_), nm, 'cleg')
        for ang, L in ((0, 0.024), (35, 0.02), (-35, 0.02)):
            a = math.radians(ang + sd * 6)
            tag(cyl('ctoe', 0.0032, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.003), (0, math.radians(90), a), lg, verts=6, r2=0.0018, bevel=0.0008, parent=lg_), nm, 'cleg')
    pivot('tail', (-0.05, 0, 0.07), rig)
    return root


if __name__ == '__main__':          # a line-up close-up: [ONLY=sil,orp] python breeds.py [samples]
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 32
    scn = reset()
    cyl('ground', 4.0, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    only = [b for b in os.environ.get('ONLY', 'rir,orp,leg,bra,sil').split(',') if b]
    x = 0.0
    for b in only:
        for s in ('h', 'r'):
            r = build(b, s, seed=3); r.location = (x, 0, 0); r.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -60)))); x += 0.42
    c = chick(); c.location = (x, 0, 0); c.rotation_euler = (0, 0, math.radians(-60)); x += 0.2
    mid = (x - 0.2) / 2
    lighting(scn)
    camera(scn, (mid + 0.3, -0.9 - 0.75 * x, 0.5 + 0.25 * x), (mid, 0, 0.18), lens=45)
    R = int(os.environ.get('RES', 1400)); render(scn, os.environ.get('NAME', 'breeds_lineup'), R, int(R * 0.5), samples)
