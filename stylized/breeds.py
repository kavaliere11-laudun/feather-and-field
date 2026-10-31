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
PAINT = dict(keep=0, body=1, wing=2, prim=3, tail=4, crest=5, legfeather=6, down=7, cwing=8, cleg=9, cbeak=10, saddle=11)

# shape and base colours per breed (the browser repaints plumage; these are what the file shows on its own)
BREEDS = {
    'rir': dict(scale=1.0, body=(1.42, 0.8, 0.84), r=0.12, comb=1.0, tail='fan', shank=0.11, lift=0.04,
                legs='#efbd3c', beak='#e7b04a', eye='#e08a26', combc='#d8352b', plum='#8a3a1c', wing='#6e2814', tailc='#2e1710'),
    'orp': dict(scale=1.06, body=(1.38, 0.92, 0.92), r=0.128, comb=0.8, tail='short', shank=0.085, lift=0.035, thigh=1.15, cushion=True,
                legs='#ecc6b2', beak='#e6c49a', eye='#d9842a', combc='#d8352b', plum='#e2a94e', wing='#cf9441', tailc='#c08236'),
    'leg': dict(scale=0.95, body=(1.5, 0.76, 0.8), r=0.116, comb=0.75, crest=True, tail='fan', tail_up=10, shank=0.12, lift=0.045,
                legs='#e9bd45', beak='#e3c07a', eye='#d9842a', combc='#d8352b', plum='#bdb6a6', wing='#9c968a', tailc='#d8d2c2'),
    # the Light Brahma (redone from Audrey's photos, 29 Oct 2026): huge and fluffy, a small head on a short thick neck under a
    # great striped cape, a broad back, a big soft cushion rising to a short black tail (a rooster's short and upright),
    # fluffy trousers, feathers flaring down the legs onto the outer toes, a tiny pea comb, red lobes, a beetle brow
    'bra': dict(scale=1.13, body=(1.36, 0.95, 0.98), r=0.127, comb=0.5, pea=True, tail='short', shank=0.1, lift=0.035, feathered=True, thigh=1.1,
                brahma=True, head=(0.172, 0, 0.428), head_r=(0.17, 0, 0.462), head_s=0.9, tilt=-6, tail_up_h=6, tail_up=22, tail_len=0.95, tail_spread=0.5, tail_twist=62, wing_out=1.0, sickle_len=0.62, saddle_len=1.15,
                legs='#efc24a', beak='#dcb763', eye='#d4652c', combc='#d8352b', lobe='#d23a2e', plum='#f1ede3', wing='#ece7dc', tailc='#1d1b1a'),
    # (29 Oct 2026, Audrey's two new breeds for levels 26 and 29: "Polish (Recommended)", "Ayam Cemani")
    # the Polish: White-crested Black, the great round crest falling over the eyes (a rooster's of long pointed feathers
    # spilling outwards), a tiny V comb hidden in it, white earlobes, slate legs
    'pol': dict(scale=0.95, body=(1.42, 0.78, 0.82), r=0.116, comb=0.0, polish=True, tail='fan', tail_up=30, shank=0.11, lift=0.04,
                legs='#6c7383', beak='#7a7680', eye='#c26a2c', combc='#d8352b', lobe='#efe9de', plum='#1b1a1f', wing='#1f1e24', tailc='#141317',
                crestc='#f4f1ea', face='#2c2930', lid='#25232a', wattle=0.85, wattle_r=0.95, head=(0.188, 0, 0.39), head_r=(0.18, 0, 0.415), tilt=4, tail_len=1.25),
                # (her head low and forward, bowed a little, so the crest sits on her shoulders over her face, and a tall fan of
                # a tail: Audrey's photo)
    # the Ayam Cemani: black all over, even the comb, the face, the beak, the legs and the eyes; tall and slender, the tail
    # carried high
    'aya': dict(scale=1.0, body=(1.48, 0.74, 0.8), r=0.114, comb=1.05, serrated=True, saddle_len=1.2, tail_up_h=30, tail_len=1.3, wattle_r=0.95, fullneck=True,
                tail='fan', tail_up=16, shank=0.135, lift=0.055,
                legs='#1e1d23', beak='#25232b', eye='#1a1214', combc='#2b2531', face='#2e2a34', lid='#28252d', lobe='#2b2531',
                plum='#131217', wing='#15141a', tailc='#0e0d11', saddle='#131217'),
    # the Indian blue peafowl (level 30, 31 Oct 2026: Audrey's "Indian blue (Recommended)", "Peacock + 2 peahens", her photos):
    # a long slender neck, a small head with a fan of a crest, white stripes above and below the eye; the peacock's neck and
    # breast shining cobalt blue, his back of green-bronze scales, barred wings, rusty flight feathers, his long green train
    # with its eyes (the browser draws them: birds.js), fanned when he shows off; the peahen brown-grey, scaled, her lower
    # neck metallic green, her belly white, a short brown tail
    'pea': dict(scale=1.0, peafowl=True, shank=0.17, lift=0.0, legs='#a99a8a', beak='#8f8578', eye='#2a1d16', face='#f3f0e8', lid='#e9e5dc',
                plum='#1f45a8', wing='#c9b08a', tailc='#2b6a36', plum_h='#8a7b6a', wing_h='#7f705f', tailc_h='#6e5f4f'),
    'sil': dict(scale=0.86, silkie=True, shank=0.08,
                legs='#5c5868', beak='#757688', eye='#2c2222', combc='#4b2032', lobe='#3fa6b8', plum='#f4f1ea', wing='#ece8df', tailc='#f4f1ea'),
}
ROOSTER = 1.12
LO = False
LEG_Y = 0.046        # (the peafowl's legs: how far out from the middle)
FAN = False          # (True: the peacock built with his train fanned; 'hang': hanging down from his perch, roosting: the browser's display pose, a morph of the same feathers)

_mats = {}


def flat(name, hexc, rough=0.75):
    """A plain colour (the browser's models are flat-coloured: no textures)."""
    if name not in _mats: _mats[name] = mat(name, hexc, rough=rough)
    return _mats[name]


def tag(o, part, paint='keep'):
    o['part'] = part; o['paint'] = PAINT[paint]; return o


def pivot(name, loc, parent):
    return empty('pv_' + name, loc, (0, 0, 0), parent)


def keep(o):
    """Small careful details (eyes, tail feathers): the exporter never simplifies these."""
    o['keep'] = True; return o


def ribbon(name, pts, widths, wdirs, m, parent, thick=0.0028, vs=None, us=None):
    """A thin feather: a strip along points, `widths` wide across `wdirs`, with a little thickness. vs: each row's v (along),
    if not evenly 0 at the root .. 1 at the tip (a peacock's train feathers: measured back from the tip, for the eye there)"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rows = []
    for p, w, wd in zip(pts, widths, wdirs):
        rows.append((bm.verts.new(p - wd * (w / 2)), bm.verts.new(p + wd * (w / 2))))
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    bm.to_mesh(me); bm.free()
    # feather coordinates for the browser's detail (quill, barbs, edges): u across (0.05 one edge .. 0.95 the other), v along
    # (0 at the root, 1 at the tip). Rows were made left then right, one row per point
    uv = me.uv_layers.new(name='feat'); n = len(pts)
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            hu = us[vi // 2] if us else 0.45                    # (us: each row's half-span across, if not the whole 0.05 .. 0.95: a train feather's in metres)
            uv.data[li].uv = (0.5 - hu if vi % 2 == 0 else 0.5 + hu, vs[vi // 2] if vs else (vi // 2) / max(1, n - 1))
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = thick; so.offset = 0; so.use_rim = False      # two faces, no edges
    for p_ in o.data.polygons: p_.use_smooth = True
    o.parent = parent
    return keep(o)


def feat_uv(o, length, width):
    """Feather coordinates (as ribbon()) for a paddle feather from hen.paddle: x runs root to tip, z across."""
    me = o.data; uv = me.uv_layers.new(name='feat')
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            x = max(0.0, min(1.0, co.x / length))
            taper = 0.55 + 0.45 * math.sin(x * math.pi * 0.85)
            a = max(-1.0, min(1.0, co.z / (width * taper / 2)))
            uv.data[li].uv = (0.5 + 0.45 * a, x)
    return o


def feather(name, m, parent, start, a0, turn, L, w0, side, spread=0.0, twist=25.0, seg=10, droop=0.0, part='tail', paint='tail', pointed=False):
    """A curved feather from `start` (parent space; the bird faces +x, so back is -x): it leaves at `a0` degrees above the
    backward horizontal and bends down by `turn` degrees along its length L, drifting sideways by `spread`."""
    pts, ws, wds = [], [], []
    p = Vector(start)
    for i in range(seg + 1):
        t = i / seg
        a = math.radians(a0 - turn * t ** 1.15)
        d = Vector((-math.cos(a), side * spread / max(L, 1e-3), math.sin(a))).normalized()
        if i: p = p + d * (L / seg)
        inplane = Vector((math.sin(a), 0, math.cos(a)))
        tw = math.radians(twist * (0.4 + 0.6 * t))
        wd = (inplane * math.cos(tw) + Vector((0, side, 0)) * math.sin(tw)).normalized()
        if pointed: w = w0 * min(1.0, t / 0.15 + 0.25) * (1 - t) ** 0.9
        else: w = w0 * min(1.0, t / 0.12 + 0.3) * (1 - t * t) ** 0.5 + 0.002
        pts.append(p.copy() + Vector((0, 0, -droop * t * t))); ws.append(w); wds.append(wd)
    return tag(ribbon(name, pts, ws, wds, m, parent), part, paint)


def natural_eye(hd, sd, B, R=0.057):
    """A chicken's eye on the side of the head: set into a patch of bare red skin, amber iris, flush round pupil, a thin lid
    and a small catch-light."""
    d = Vector((0.42, sd * 0.86, 0.22)).normalized()
    rot = d.to_track_quat('Z', 'Y').to_euler()
    skin = flat('face', B.get('face', '#cf4a3c'), 0.55); lid = flat('lid', B.get('lid', '#a93a30'), 0.5)
    iris = flat('iris', B['eye'], 0.12); pupil = flat('pupil', '#0a0807', 0.05); glint = flat('glint', '#ffffff', 0.1)
    face = sphere('face', 0.02, tuple(d * (R - 0.0065) + Vector((0.01, 0, -0.005))), (1.1, 0.95, 0.3), rot, m=skin, parent=hd, seg=10, rings=6)
    eye_c = d * (R - 0.0035)
    ball = sphere('eye', 0.0105, tuple(eye_c), m=iris, parent=hd, seg=10, rings=7)
    pu = sphere('pupil', 0.0052, tuple(eye_c + d * 0.0094), (1, 1, 0.35), rot, m=pupil, parent=hd, seg=8, rings=5)
    gl = sphere('glint', 0.0017, tuple(eye_c + d * 0.0104 + Vector((0.0025, 0, 0.0028))), m=glint, parent=hd, seg=6, rings=4)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.0108, minor_radius=0.0021, major_segments=10, minor_segments=4)
    tor = bpy.context.object; setmat(tor, lid); [setattr(p_, 'use_smooth', True) for p_ in tor.data.polygons]
    tor.parent = hd; tor.location = tuple(eye_c + d * 0.0045); tor.rotation_euler = rot
    for o in (face, ball, pu, gl, tor): tag(keep(o), 'head')


def build(breed='rir', sex='h', seed=1, lo=False):
    """A bird standing at the origin, facing +x. Returns its root empty. lo: fewer, simpler tail feathers."""
    random.seed(seed); _mats.clear()
    global LO; LO = lo
    B = BREEDS[breed]; rooster = sex == 'r'
    root = empty('bird_%s_%s' % (breed, sex))
    body_rig = empty('body', (0, 0, 0), (0, 0, 0), root)
    if B.get('silkie'): parts = silkie(B, rooster, root, body_rig, seed)
    elif B.get('peafowl'): parts = peafowl(B, rooster, root, body_rig, seed, fan=FAN)
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
    head = Vector(B.get('head_r' if rooster and 'head_r' in B else 'head', (0.16, 0, 0.455))); neck = (head + Vector((0.08, 0, 0.28))) / 2      # the head held up on a clear neck
    th = B.get('thigh', 1.0); hs = B.get('head_s', 1.0)
    E = [
        ('ELLIPSOID', (-0.02, 0, 0.215), R * K, (bx, by, bz), 2.0),                     # body
        ('BALL', (0.085, 0, 0.205), (R * 0.7) * K, None, 2.0),                          # full breast
        ('ELLIPSOID', (-0.12, 0, 0.27), R * 0.64 * K, (1.2, by * 1.08, 0.95), 2.0),     # back rising to the tail
        ('ELLIPSOID', (-0.19, 0, 0.33), 0.05 * K, (0.85, 0.9, 1.45), 2.0),              # tail cushion
        ('ELLIPSOID', tuple(neck), 0.042 * K, (1.0, 0.9, 1.9), 2.0),                    # neck
        ('BALL', tuple(head), 0.058 * hs * K, None, 2.0),                               # head
        ('BALL', (0.0, 0.055, 0.12), 0.05 * th * K, None, 1.6), ('BALL', (0.0, -0.055, 0.12), 0.05 * th * K, None, 1.6),   # thighs
    ]
    if B.get('cushion'): E.append(('ELLIPSOID', (-0.13, 0, 0.17), 0.085 * K, (1.1, by * 1.1, 0.9), 2.0))     # an Orpington's fluffy rear
    if rooster: E.append(('ELLIPSOID', tuple(neck + Vector((-0.02, 0, -0.02))), 0.065 * K, (1.1, 1.05, 1.3), 2.0))   # hackle ruff
    elif B.get('polish') or B.get('fullneck'): E.append(('ELLIPSOID', tuple(neck + Vector((-0.016, 0, 0.004))), 0.056 * K, (1.05, 1.0, 1.4), 2.0))   # a Polish hen's full neck (her photo)
    if B.get('brahma'):          # (Audrey's photos) the hackle cape: a thick neck flaring out over the shoulders; fluffy trousers;
        # a big soft cushion rising to the tail
        E.append(('ELLIPSOID', tuple(neck + Vector((-0.014, 0, 0.0))), 0.054 * K, (1.05, 1.02, 1.45), 2.0))
        E.append(('ELLIPSOID', tuple(neck + Vector((-0.05, 0, -0.07))), 0.066 * K, (1.2, 1.3 * by / 0.95, 0.85), 2.0))
        for sd in (1, -1): E.append(('ELLIPSOID', (0.004, sd * 0.06, 0.088), 0.05 * K, (1.05, 0.95, 1.55), 2.0))      # (down to the hocks)
        E.append(('ELLIPSOID', (-0.155, 0, 0.3 if not rooster else 0.31), (0.074 if not rooster else 0.06) * K, (1.0, by * 1.05, 1.15), 2.0))
    tag(metaball_mesh('body_mb', E, res=0.008, m=pl, parent=body_rig), 'body', 'body')
    body_rig.location.z = B.get('lift', 0.0)          # the whole body held higher, on longer legs (bigger birds looked bulky)
    pivot('body', (0.0, 0, 0.17), body_rig)
    pivot('head', (0.085, 0, 0.3), body_rig)
    pivot('headc', tuple(head), body_rig)
    # head details (all ride on the head bone)
    hd = empty('head', tuple(head), (0, math.radians(B.get('tilt', -10) if not rooster else -10), 0), body_rig)
    if hs != 1.0: hd.scale = (hs, hs, hs)          # (a Brahma's head small for its great body)
    tag(cyl('beak', 0.019, 0.048, (0.07, 0, -0.008), (0, math.radians(90 + 12), 0), bk, verts=12, r2=0.002, bevel=0.002, parent=hd), 'head')
    for sd in (1, -1):
        natural_eye(hd, sd, B)
        if B.get('brahma'):       # a Brahma's beetle brow: a ridge of feathers over each eye
            tag(keep(sphere('brow', 0.014, (0.022, sd * 0.043, 0.027), (1.6, 0.55, 0.5), (math.radians(sd * 30), 0, 0), m=pl, parent=hd, seg=12, rings=8)), 'head', 'body')
        tag(sphere('lobe', 0.011, (0.004, sd * 0.045, -0.012), (1, 0.45, 1.2), m=flat('lobe_b', B['lobe']) if B.get('lobe') else cm if not B.get('pea') else flat('lobe_w', '#efe6da'), parent=hd, seg=12, rings=8), 'head')
    cs = (1.5 if rooster else 1.0) * B['comb']
    if B.get('polish'): pass   # (the Polish's tiny V comb is hidden in its crest)
    elif B.get('serrated'):      # an Ayam Cemani's single comb: a tall blade with clear points (Audrey's photos)
        serrated_comb(rooster, hd, cm)
    elif B.get('pea'):           # a Brahma's pea comb: three low ridges
        pr = (0.0115 if rooster else 0.0085) if B.get('brahma') else 0.012 * (1.2 if rooster else 1.0)      # (a Brahma's tiny and low: Audrey's photos)
        el = [('BALL', (0.045 - i * 0.02, dy, 0.046 - (0.003 if B.get('brahma') else 0)), pr * K, None, 2.0) for i in range(3) for dy in (-0.008, 0, 0.008)]
        tag(metaball_mesh('comb', el, res=0.004, m=cm, parent=hd), 'head')
    else:
        comb = metaball_mesh('comb', [('BALL', (0.045 - i * 0.022, 0, 0.05 + 0.012 * math.sin(i * 1.1) * cs + (0.006 if i in (1, 2) else 0)), (0.017 - 0.0015 * abs(i - 1.5)) * K * cs, None, 2.0) for i in range(4)]
                             + [('ELLIPSOID', (0.0, 0, 0.042), 0.02 * K, (2.2, 0.5, 0.5), 2.0)], res=0.004, m=cm, parent=hd)
        comb.scale = (1, 0.55, 1); tag(comb, 'head')
    wk = (1.0 if rooster else 0.8) * (0.6 if B.get('pea') else 1.0) * B.get('wattle_r' if rooster and 'wattle_r' in B else 'wattle', 1.0)
    if B.get('serrated'):      # (an Ayam Cemani's: long and broad, a rooster's hanging well down: Audrey's photos)
        tag(keep(metaball_mesh('wattles', [('ELLIPSOID', (0.048, sd * 0.011, -0.048 - (0.004 if rooster else 0)), 0.012 * K * wk * (1.5 if rooster else 1), (0.85, 0.42, 1.4), 2.0) for sd in (1, -1)], res=0.003, m=cm, parent=hd)), 'head')
    elif B.get('polish'):      # (a Polish's two wattles hang apart, long and rounded: his photo)
        tag(keep(metaball_mesh('wattles', [('ELLIPSOID', (0.05, sd * 0.0125, -0.046), 0.011 * K * wk * (1.5 if rooster else 1), (0.75, 0.5, 1.6), 2.0) for sd in (1, -1)], res=0.0028, m=cm, parent=hd)), 'head')
    else: tag(metaball_mesh('wattles', [('ELLIPSOID', (0.05, sd * 0.009, -0.042), 0.013 * K * wk * (1.5 if rooster else 1), (0.8, 0.6, 1.3), 2.0) for sd in (1, -1)], res=0.004, m=cm, parent=hd), 'head')
    if B.get('crest'):         # a Legbar's little crest of feathers swept back behind the comb
        for i in range(5):
            a = math.radians(-50 + 25 * i)
            tag(feat_uv(paddle('crest', 0.06, 0.022, 0.008, pl, hd, (-0.03, 0.012 * math.sin(a), 0.035), (math.radians(20 * math.sin(a)), math.radians(-150), 0), curve=0.15), 0.06, 0.022), 'head', 'crest')
    if B.get('polish'): polish_crest(B, rooster, hd, seed)
    # wings: soft folded shapes with feather tips at the back
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        w = empty('wing', (0.0, sd * 0.093 * by / 0.92 * B.get('wing_out', 1.0), 0.24), (math.radians(sd * -6), math.radians(-12), math.radians(sd * -4)), body_rig)
        pivot(nm, (-0.01, sd * 0.088 * by / 0.92, 0.285), body_rig)
        tag(sphere('wingbase', 0.105, (0, 0, 0), (1.1, 0.22, 0.52), m=wg, parent=w, seg=24, rings=14), nm, 'wing')
        for k in range(4):
            e = math.radians(-8 - k * 5)
            tag(feat_uv(paddle('prim', 0.1 - k * 0.008, 0.032, 0.01, wg, w, (-0.05, sd * (0.008 - k * 0.002), -0.012 - k * 0.011),
                       (0, e - math.pi, math.radians(sd * (4 + k * 2))), curve=-sd * 0.12), 0.1 - k * 0.008, 0.032), nm, 'prim')
    # tail: curved feathers. A rooster's is majestic: long arching sickles over layers of lesser sickles, the main tail
    # feathers and short coverts, with saddle hackles draping down his back
    tb = empty('tail', (-0.2, 0, 0.33), (0, 0, 0), body_rig)
    pivot('tail', (-0.19, 0, 0.32), body_rig)
    short = B['tail'] == 'short'
    up = B.get('tail_up_h', B.get('tail_up', 0)) if not rooster else B.get('tail_up', 0)
    k = 0.74 if short else 1.0
    rnd = random.Random(seed * 7 + (1 if rooster else 0))
    seg = 4 if LO else 8
    for sd in (1, -1):
        n = 5 if not LO else 3
        for i in range(n):                                   # main tail feathers (rectrices): a fan, fairly straight
            f = i / (n - 1)
            feather('tailf', tl, tb, (0.01, sd * (0.006 + 0.004 * i), -0.01 + 0.006 * i), 32 + 34 * f + up + (8 if short else 0), 18,
                    (0.15 if rooster else 0.135 * B.get('tail_len', 1.0)) * k * (1.0 - 0.18 * abs(f - 0.6)), 0.05 if not short else 0.056, sd, spread=(0.012 + 0.012 * f) * (B.get('tail_spread', 1.0) if not rooster else 1.0), twist=B.get('tail_twist', 35) if not rooster else 35, seg=seg)
    if rooster:
        for sd in (1, -1):
            m_ = 6 if not LO else 3
            for i in range(m_):                              # lesser sickles, layered down the sides, each falling a little lower
                f = i / (m_ - 1)
                feather('sickle_s', tl, tb, (0.015 - 0.006 * f, sd * (0.01 + 0.012 * f), 0.025 - 0.03 * f), 66 - 18 * f + up, 140 + 20 * f,
                        (0.36 - 0.1 * f) * k * B.get('sickle_len', 1.0), 0.038, sd, spread=0.02 + 0.025 * f, twist=26, seg=seg, droop=0.015)
            feather('sickle', tl, tb, (0.02, sd * 0.008, 0.04), 78 + up, 172, 0.52 * k * B.get('sickle_len', 1.0), 0.046, sd, spread=0.012, twist=20, seg=seg + 4)   # the two great sickles (a Brahma's short)
            if not LO:
                for i in range(3):                           # short coverts over the base
                    feather('covert', tl, tb, (0.03 - 0.01 * i, sd * (0.02 + 0.01 * i), 0.0), 55 - 10 * i, 70, 0.11 - 0.01 * i, 0.034, sd, spread=0.02, twist=35, seg=6)
        sad = flat('saddle', B.get('saddle', B['plum']), 0.5)
        for sd in (1, -1):                                   # saddle hackles: long thin pointed feathers draping from the back
            for i in range(7 if not LO else 3):
                f = i / 6 if not LO else i / 2
                start = (-0.07 - 0.06 * f, sd * (0.025 + 0.04 * f + rnd.uniform(-0.004, 0.004)), 0.318 - 0.012 * f)
                feather('saddleh', sad, body_rig, start, -6 - 10 * f, 22, (0.11 - 0.015 * f) * B.get('saddle_len', 1.0), 0.016, sd, spread=0.012, twist=78, seg=6 if not LO else 3,
                        part='body', paint='saddle', pointed=True)
    # legs and feet (their own bones: they stay planted while the body tilts)
    sh = B['shank'] + B.get('lift', 0.0)
    for sd, nm in ((1, 'legL'), (-1, 'legR')):
        lg_ = empty('leg', (0.01, sd * 0.055, 0), (0, 0, 0), root)
        pivot(nm, (0.01, sd * 0.055, sh), root)
        tag(cyl('shank', 0.0115 * (1.2 if B.get('brahma') else 1.0), sh, (0, 0, sh / 2), (0, math.radians(6), 0), lg, verts=8, r2=0.0095 * (1.2 if B.get('brahma') else 1.0), bevel=0, parent=lg_), nm)
        for ang, L in ((0, 0.06), (32, 0.05), (-32, 0.05), (180, 0.03)):
            a = math.radians(ang + sd * 6)
            tag(cyl('toe', 0.0065, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.006), (0, math.radians(90), a), lg, verts=6, r2=0.0035, bevel=0, parent=lg_), nm)
        if B.get('feathered'):    # a Brahma's feathered shanks: soft feathering down the outside of each leg and onto the outer toe
            rnd = random.Random(seed * 11 + (1 if sd > 0 else 2))
            F = [('ELLIPSOID', (-0.004, sd * 0.012, sh * 0.55), 0.016 * K, (1.0, 0.9, 2.2), 2.0), ('ELLIPSOID', (0.012, sd * 0.022, 0.012), 0.012 * K, (1.8, 1.0, 0.7), 2.0)]
            if B.get('brahma'): F = [('ELLIPSOID', (-0.008, sd * 0.014, sh * 0.5), 0.021 * K, (1.1, 1.0, 2.0), 2.0), ('ELLIPSOID', (0.006, sd * 0.026, 0.016), 0.016 * K, (1.9, 1.2, 0.8), 2.0)]      # (a thick feathered boot)
            F += bumps(rnd, (-0.004, sd * 0.014, sh * 0.5), (0.014, 0.016, 0.03), 5, 0.009, 0.012)
            tag(metaball_mesh('legfluff', F, res=0.0045, m=pl, parent=lg_), nm, 'legfeather')
            if B.get('brahma'): brahma_legs(sd, nm, sh, lg_, pl)
    return True


def peafowl(B, rooster, root, body_rig, seed, fan=False):
    """An Indian blue peafowl (the bird faces +x): a long body, a long slender neck up to a small head, long legs; the peacock's
    train of long feathers from his lower back, trailing to the ground behind him (fan: raised and spread in a great fan
    behind him, the same feathers in the same order)."""
    rnd = random.Random(seed * 13 + (1 if rooster else 0))
    pl = flat('plum', B['plum'] if rooster else B['plum_h'], 0.85); wg = flat('wing', B['wing'] if rooster else B['wing_h'], 0.85)
    tl = flat('tailc', B['tailc'] if rooster else B['tailc_h'], 0.55); bk = flat('beak', B['beak'], 0.45); lg = flat('legs', B['legs'], 0.5)
    k = 1.0 if rooster else 0.92
    # (31 Oct, Audrey: "The posture and shape of peacock are not natural": the body carried tilted up at the front, the breast
    # high and full, the back sloping down to the tail; the neck rising out of the breast, not from the middle of the body,
    # shorter, its front hollowed under the chin and its back bowed, the head held a little forward)
    head = Vector((0.2 * k, 0, 0.69 * k)); nb = Vector((0.11 * k, 0, 0.46 * k))
    # the body: one smooth shape (31 Oct, Audrey: "body shape needs rework to look more smooth"): a chain of overlapping
    # ellipsoids along its spine from the tail coverts up to the base of the neck, their widths and depths rising and
    # falling smoothly (deepest at the belly, the breast full and high), smoothed over after
    SP = [(-0.27, 0.362, 0.03, 0.026), (-0.21, 0.355, 0.054, 0.048), (-0.15, 0.346, 0.072, 0.066), (-0.09, 0.336, 0.084, 0.08),
          (-0.03, 0.33, 0.088, 0.088), (0.025, 0.338, 0.086, 0.087), (0.07, 0.365, 0.076, 0.078), (0.1, 0.402, 0.058, 0.06), (0.112, 0.44, 0.042, 0.045)]
    if not rooster: SP[0] = (-0.28, 0.36, 0.036, 0.028)      # (a peahen's tail coverts over the root of her tail)
    E = [('ELLIPSOID', (x * k, 0, z * k), 0.06 * k * K, (1.0, ry / 0.06, rz / 0.06), 2.0) for (x, z, ry, rz) in SP]
    for sd in (1, -1):                                  # the thighs, feathered, tapering down to the hock where the bare leg starts
        E += [('ELLIPSOID', (-0.002 * k, sd * 0.036 * k, 0.262 * k), 0.03 * k * K, (1.2, 0.95, 1.35), 2.0),
              ('ELLIPSOID', (-0.008 * k, sd * 0.042 * k, 0.212 * k), 0.022 * k * K, (1.1, 0.95, 1.35), 2.0),
              ('ELLIPSOID', (-0.012 * k, sd * LEG_Y * k, B['shank'] * k + 0.02), 0.0175 * k * K, (1.0, 1.0, 1.35), 2.0)]
    for i in range(7):                                  # the neck: up out of the breast, its back bowed a little, the head forward at its top
        t = i / 6
        c = Vector((nb.x + (head.x - nb.x) * t ** 1.8 - 0.012 * k * math.sin(t * math.pi), 0, nb.z + (head.z - nb.z) * t - 0.012 * k * t * t))
        E.append(('ELLIPSOID', tuple(c), (0.032 - 0.009 * t) * k * K, (1.0, 0.9, 1.45), 2.0))
    E.append(('BALL', tuple(head), 0.038 * k * K, None, 2.0))
    E.append(('ELLIPSOID', tuple(head + Vector((0.012 * k, 0, -0.006 * k))), 0.03 * k * K, (1.3, 0.85, 0.9), 2.0))      # (the face, a little long)
    tag(metaball_mesh('body_mb', E, res=0.008, m=pl, parent=body_rig, smooth=4), 'body', 'body')
    pivot('body', (0.0, 0, 0.24 * k), body_rig)
    pivot('head', tuple(nb), body_rig)
    pivot('headc', tuple(head), body_rig)
    hd = empty('head', tuple(head), (0, math.radians(-8), 0), body_rig)
    tag(cyl('beak', 0.012 * k, 0.05 * k, (0.052 * k, 0, -0.008 * k), (0, math.radians(90 + 14), 0), bk, verts=10, r2=0.002, bevel=0.002, parent=hd), 'head')
    white = flat('pv_white', '#f3f1ea', 0.6)
    for sd in (1, -1):
        natural_eye(hd, sd, B, R=0.034 * k)
        # the white stripes: one above the eye, one below it, curving back
        for (dz, dx, sc_, pitch) in ((0.02, -0.006, (2.2, 0.4, 0.5), 8), (-0.015, -0.002, (2.0, 0.4, 0.65), 10)):      # (the upper one rising to the front over the eye: not a frown)
            tag(keep(sphere('facestripe', 0.012 * k, (dx * k, sd * 0.031 * k, dz * k), sc_, (math.radians(sd * 8), math.radians(pitch), math.radians(sd * -10)), m=white, parent=hd, seg=10, rings=6)), 'head')
    # the crest: a little fan of bare shafts, each with a tuft at its tip (a peacock's blue, a peahen's brown edged green)
    shaft = flat('pv_shaft', '#3b3a40' if rooster else '#5c4c3c', 0.6); tuft = flat('pv_tuft', '#1e62d0' if rooster else '#6d5a44', 0.45)
    n = 11
    for i in range(n):                                  # (a fan across the head, the tufts apart: a crown, as in her photos)
        a = math.radians(-50 + 100 * i / (n - 1))
        d = Vector((-0.2, math.sin(a) * 0.95, math.cos(a) * 1.0)).normalized(); L = (0.074 if rooster else 0.064) * k * (1 - 0.12 * abs(i - n // 2) / (n // 2))
        p0 = Vector((-0.004 * k, 0, 0.032 * k))
        tag(keep(cyl('crest', 0.0018, L, tuple(p0 + d * L / 2), d.to_track_quat('Z', 'Y').to_euler(), m=shaft, verts=4, bevel=0.0, parent=hd)), 'head')
        tag(keep(sphere('cresttip', 0.0075 * k, tuple(p0 + d * (L + 0.003 * k)), (0.5, 1.0, 1.3), d.to_track_quat('Z', 'Y').to_euler(), m=tuft, parent=hd, seg=8, rings=5)), 'head')
    # wings: long folded wings along the sides, the flight feathers at their tips (a peacock's rusty, under barred coverts)
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        w = empty('wing', (-0.035 * k, sd * 0.074 * k, 0.36 * k), (math.radians(sd * -4), math.radians(-12), math.radians(sd * -2)), body_rig)      # (folded close along the side, its front up with the body)
        pivot(nm, (0.0, sd * 0.08 * k, 0.385 * k), body_rig)
        tag(sphere('wingbase', 0.1 * k, (0, 0, 0), (1.25, 0.16, 0.44), m=wg, parent=w, seg=24, rings=14), nm, 'wing')
        for j in range(4):                              # (the flight feathers tucked under its back edge: only their tips show)
            e = math.radians(-8 - j * 3)
            tag(feat_uv(paddle('prim', (0.07 - j * 0.007) * k, 0.026 * k, 0.008, wg, w, (-0.07 * k, sd * (0.002 - j * 0.002), -0.008 * k - j * 0.006 * k),
                       (0, e - math.pi, math.radians(sd * (2 + j * 1.5))), curve=-sd * 0.08), (0.07 - j * 0.007) * k, 0.026 * k), nm, 'prim')
    tb = empty('tail', (-0.27 * k, 0, 0.36 * k), (0, 0, 0), body_rig)
    pivot('tail', (-0.25 * k, 0, 0.35 * k), body_rig)
    if not rooster:
        for i in range(9):                              # a peahen's tail: closed, broad and rounded, carrying on the line of her back down
            f = i / 8 - 0.5                             # (31 Oct, Audrey: "peahen tail is odd": no thin blade sticking out)
            feather('tailf', tl, tb, (0.03 - 0.012 * abs(f), f * 0.03, -0.004 + 0.008 * (0.5 - abs(f))), -16 + 4 * (0.5 - abs(f)), 8, 0.23 * (1.0 - 0.18 * (2 * f) ** 2), 0.062, 1 if f >= 0 else -1,
                    spread=0.02 * abs(f), twist=8 + 20 * abs(f), seg=6 if LO else 8)
    else: peacock_train(tl, tb, rnd, fan)
    # the legs (31 Oct, Audrey: "the junction with the body is poor and the shape of the legs and feet needs rework"): the
    # feathered thigh tapers down (in the body's own shape) to the hock, the ankle, where the bare leg starts with a knuckle;
    # the tarsus stout and scaled down its front, slanting forward a little from the hock to the foot; three long front toes
    # and a short hind one, each jointed, thick at its base, raised a little at its knuckles, with a dark claw; a peacock's
    # spur behind
    sh = B['shank'] * k; claw = flat('pv_claw', '#4a4038', 0.45)
    def seg_(name, a_, b_, r1, r2, m, parent, verts=8):
        d_ = b_ - a_
        return cyl(name, r1, d_.length, tuple((a_ + b_) / 2), d_.normalized().to_track_quat('Z', 'Y').to_euler(), m, verts=verts, r2=r2, bevel=0, parent=parent)
    for sd, nm in ((1, 'legL'), (-1, 'legR')):
        ly = sd * LEG_Y * k
        lg_ = empty('leg', (0.0, ly, 0), (0, 0, math.radians(sd * 7)), root)       # (the foot turned out a little)
        hock = Vector((-0.012 * k, 0, sh)); foot = Vector((0.006 * k, 0, 0.012))
        pivot(nm, (-0.012 * k, ly, sh), root)
        tag(sphere('hock', 0.0148 * k, tuple(hock), (1.15, 1.0, 1.25), m=lg, parent=lg_, seg=10, rings=7), nm)
        tag(seg_('shank', foot, hock, 0.0112 * k, 0.0135 * k, lg, lg_), nm)
        up = (hock - foot).normalized()
        for j in range(7):                              # the scutes down its front
            c = foot.lerp(hock, (j + 0.6) / 7.6) + Vector((0.0094 * k, 0, 0))
            tag(sphere('scute', 0.0075 * k, tuple(c), (0.28, 1.45, 0.5), m=lg, parent=lg_, seg=6, rings=3), nm)
        tag(sphere('footpad', 0.012 * k, tuple(foot + Vector((0.004, 0, -0.004))), (1.35, 1.15, 0.6), m=lg, parent=lg_, seg=8, rings=5), nm)
        for ang, L in ((0, 0.074), (32, 0.06), (-32, 0.06), (180, 0.03)):
            a = math.radians(ang); d = Vector((math.cos(a), math.sin(a), 0)) * k
            hind = ang == 180
            p0 = foot + d * 0.006 + Vector((0, 0, 0.004 if hind else -0.004))
            p1 = p0 + d * L * 0.45 + Vector((0, 0, 0.002 if hind else 0.004))
            p2 = p1 + d * L * 0.38 + Vector((0, 0, -0.004 if hind else -0.002))
            tip = p2 + d * L * 0.17 + Vector((0, 0, -0.005))
            tag(seg_('toe', p0, p1, 0.0072 * k, 0.006 * k, lg, lg_, 7), nm)
            tag(sphere('knuckle', 0.0063 * k, tuple(p1), m=lg, parent=lg_, seg=6, rings=4), nm)
            tag(seg_('toe', p1, p2, 0.006 * k, 0.0048 * k, lg, lg_, 7), nm)
            tag(sphere('knuckle', 0.005 * k, tuple(p2), m=lg, parent=lg_, seg=6, rings=4), nm)
            tag(seg_('claw', p2, tip, 0.0042 * k, 0.0008, claw, lg_, 6), nm)
        if rooster:                                     # his spur: a short horn behind, a third of the way up
            sp = foot.lerp(hock, 0.32) + Vector((-0.008, 0, 0))
            tag(seg_('spur', sp, sp + Vector((-0.02, 0, -0.004)), 0.0048, 0.0008, claw, lg_, 6), nm)
    return True


TRAIN = dict(rows=((0.0, 30, 0.98), (0.008, 26, 0.84), (0.016, 22, 0.7), (0.024, 18, 0.56), (0.032, 14, 0.43), (0.04, 10, 0.31)), vlen=0.75, eye=0.07, hw=0.08, cover=1.4)
# the train's feathers, in rows from the longest (at the back of the fan, underneath when trailing) to the shortest: (start
# height, how many, length). Each feather is a long wedge, narrow at its root and broad at its rounded tip, as wide as its
# share of the fan (cover: overlapping its neighbours, so the fan is full, 31 Oct, Audrey's "A fuller fan"). 'feat' v runs
# back from its tip (vlen metres = 1), u across in metres of hw (the widest half), so the browser draws every eye the same
# size and round (eye: its centre from the tip)


def peacock_train(tl, tb, rnd, fan):
    """The peacock's train: rows of long feathers from the tail's base, each a wedge widening to a broad rounded tip where its
    eye is (painted by the browser). Trailing: back from his tail in a long gentle sweep down to the grass, widening, the
    shorter rows lying on top so every row's eyes show, like scales, the end resting on the ground. Fanned: raised behind
    him in a great full fan, a little dished, the longest row at the back, each row's eyes in a neat ring. Both from the same
    points in the same order (one morphs into the other in the browser)."""
    rows = TRAIN['rows'][:4] if LO else TRAIN['rows']
    for r_, (z0, n, L) in enumerate(rows):
        if LO: n = max(6, n // 2)
        S = math.radians(204 - 16 * r_)                     # (the row's span in the fan: its sides drooping a little below level)
        we = TRAIN['cover'] * L * S / n                     # (its width at the tip: its share of the fan's edge, overlapping)
        tipr = we / 2
        for i in range(n):
            f = (i + 0.5) / n - 0.5                         # -0.5 .. 0.5 across
            Lf = L * (1.0 - 0.3 * (2 * f) ** 2) * (0.97 + 0.06 * rnd.random()) - min(0.12, 0.25 * L) * (i % 2)      # (shorter to the sides: the train's rounded end; every other one shorter, its tip ending before its neighbours' eyes: lying on top of them, every eye shows)
            off = L * (1.0 - 0.05 * (2 * f) ** 2) - Lf      # (in the fan its root that much further out, so its eye is in its row's ring)
            body = max(0.0, Lf - 0.16)
            ss = [body * j / (2 if LO else 5) for j in range(3 if LO else 6)] + [Lf - tipr * d for d in ((1.0, 0.4, 0.1, 0.0) if LO else (1.0, 0.5, 0.234, 0.094, 0.022, 0.0))]
            ss = sorted(set(round(x, 5) for x in ss if x >= 0))
            pts, ws, wds, vs, hus = [], [], [], [], []
            for s_ in ss:
                dt = Lf - s_                                # metres back from the tip
                if dt < tipr: w = we * math.sqrt(max(0.0, 1 - ((tipr - dt) / tipr) ** 2))
                else: w = TRAIN['cover'] * (off + s_) * S / n * (0.85 + 0.15 * smooth01(1 - (dt - tipr) / 0.2))
                w = max(min(w, we), 0.005)
                if fan == 'hang':                           # roosting on his perch (31 Oct): over the perch behind him and hanging straight down
                    u = s_; R = 0.15; a_ = min(u / R, math.pi / 2)
                    lay = (0.0016 * abs(i - (n - 1) / 2) * (30 / n) + 0.003 * (i % 2) + 0.006 * r_) * smooth01(u / 0.2)      # (the shorter on the outside, every eye showing)
                    if u <= R * math.pi / 2: p = Vector((0.08 - R * math.sin(a_), 0, -(R - R * math.cos(a_))))
                    else: p = Vector((0.08 - R, 0, -R - (u - R * math.pi / 2)))
                    p += Vector((-lay, f * (0.035 + 0.15 * smooth01(u / 0.7)), 0.012 - 0.003 * r_))
                    th_ = 0.45 * f * smooth01(u / 0.4); wd = Vector((-math.sin(th_), math.cos(th_), 0))
                elif fan:                                   # a full fan: leaning back a little, dished (its edges come forward)
                    phi = f * S
                    up, side = math.cos(phi), math.sin(phi)
                    lean = math.radians(10 - 2 * r_)
                    rho = off + s_
                    d = Vector((-math.sin(lean) * up - 0.1, side, math.cos(lean) * up)).normalized()
                    p = Vector((0.016 * r_ + 0.006 * (i % 2), 0, z0 - 0.024 * r_)) + d * rho + Vector((0.09 * (rho / 0.98) ** 2, 0, 0))
                    wd = Vector((0, math.cos(phi), -math.sin(phi)))     # across: in the fan's plane
                else:                                       # trailing: a long sweep back and down to the grass, widening
                    u = s_
                    drop = smooth01(u / 0.8)
                    lay = 0.0016 * abs(i - (n - 1) / 2) * (30 / n) + 0.003 * (i % 2)      # (the shorter on top: the outer ones over the middle ones, every other one over its neighbours; never two in one place: every eye shows, like scales)
                    hgt = (0.355 + z0) * (1 - drop) + (0.012 + 0.007 * r_ + lay) * drop
                    p = Vector((0.08 - u * 0.975, f * (0.035 + 0.3 * smooth01(u / 0.75)), hgt - 0.355 + 0.012 * (1 - drop)))      # (from under the feathers of his lower back)
                    th_ = 0.55 * f * drop; wd = Vector((0, math.cos(th_), -math.sin(th_)))      # (its sides sloping down)
                pts.append(p); ws.append(w if fan is True else w * 0.62); wds.append(wd); vs.append(max(0.0, 1.0 - dt / TRAIN['vlen'])); hus.append(0.45 * min(1.0, w / 2 / TRAIN['hw']))      # (trailing, the barbs lie closer: narrower, its eye an oval; 'feat' as the fan's, so the fan's eyes are round)
            tag(ribbon('train', pts, ws, wds, tl, tb, thick=0.0024, vs=vs, us=hus), 'tail', 'tail')
    # under the train: the stiff grey-brown tail feathers that hold it up (hidden when trailing, a fan behind the fan when shown)
    tf = flat('pv_tailf', '#6d6255', 0.6)
    for i in range(6):
        f = (i + 0.5) / 6 - 0.5
        if fan == 'hang': feather('tailf', tf, tb, (0.04, f * 0.02, -0.03), -78, 4, 0.13, 0.03, 1 if f > 0 else -1, spread=abs(f) * 0.06, twist=10, seg=6)
        elif fan: feather('tailf', tf, tb, (-0.03, f * 0.02, -0.03), 72 - abs(f) * 90, 4, 0.34, 0.03, 1 if f > 0 else -1, spread=abs(f) * 0.5, twist=10, seg=6)
        else: feather('tailf', tf, tb, (0.06, f * 0.02, -0.025), -12, 6, 0.13, 0.03, 1 if f > 0 else -1, spread=abs(f) * 0.06, twist=10, seg=6)      # (under the train)


def smooth01(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def brahma_legs(sd, nm, sh, lg_, pl):
    """A Brahma's leg feathering (Audrey's photos): broad soft feathers lying down the outside of each shank like shingles,
    their faces outwards, the lower ones flaring out over the foot, in two overlapping rows; and a fringe along the outer and
    middle toes. Each feather leaves from its own little stand, turned so it points back and out."""
    n_sh = 6 if not LO else 3
    for row in ((0, 1) if not LO else (0,)):
        for i in range(n_sh):                            # down the shank, flaring more lower down; the back row further round behind
            f = i / (n_sh - 1)
            st = empty('lf', (-0.003 - 0.007 * row, sd * (0.012 - 0.002 * row), sh * (0.86 - 0.6 * f) - 0.008 * row),
                       (0, 0, math.radians(-sd * (14 + 32 * f + 22 * row))), lg_)
            feather('legf', pl, st, (0, 0, 0), -66 + 46 * f, -24, 0.058 + 0.02 * f, 0.036 + 0.006 * f, sd, twist=12, seg=4 if not LO else 3,
                    part=nm, paint='legfeather')
    toes = [(32, 0.014, 0.038), (32, 0.028, 0.034), (32, 0.042, 0.028), (12, 0.026, 0.03), (0, 0.04, 0.024)] if not LO else [(32, 0.022, 0.034), (0, 0.03, 0.024)]
    for ang, r, L in toes:                               # along the outer toe, and the middle toe's outer side
        a = math.radians(sd * ang + sd * 6)
        st = empty('tf', (math.cos(a) * r, math.sin(a) * r, 0.011), (0, 0, a - math.pi + math.radians(sd * 70)), lg_)
        feather('toef', pl, st, (0, 0, 0), -6, -12, L, 0.024, sd, twist=75, seg=3, part=nm, paint='legfeather')


def serrated_comb(rooster, hd, cm):
    """A single comb as a blade with clear points along its top (an Ayam Cemani's, from Audrey's photos: a rooster's tall with
    five spikes and a leader behind, a hen's small and upright). Built as a thick outline over the top of the head (head
    space: the bird faces +x, the head a ball of radius 0.058)."""
    s = 1.0 if rooster else 0.5      # (a rooster's bigger: Audrey, 29 Oct 20:40 "Can the rooster comb be bigger please?")
    top = lambda x: math.sqrt(max(0.0, 0.058 ** 2 - x * x))
    xs = [-0.03, -0.01, 0.01, 0.029, 0.046] if rooster else [-0.016, -0.004, 0.008, 0.02, 0.031]      # (from just behind the beak back over the head)
    hs = [0.05, 0.066, 0.072, 0.062, 0.044] if rooster else [0.03, 0.038, 0.04, 0.035, 0.025]
    out = [(-0.058 if rooster else -0.03, 0.016 if rooster else 0.006)]          # the leader at the back
    for i, (x, h) in enumerate(zip(xs, hs)):
        if i: out.append(((x + xs[i - 1]) / 2, 0.03 if rooster else 0.009))       # the valleys between the points (a rooster's a broad blade under them)
        else: out.append((x - 0.01 * (0.6 + 0.4 * s), 0.028 if rooster else 0.008))
        out.append((x, h * s))
    out.append((xs[-1] + 0.012 * (0.6 + 0.4 * s), 0.008 * s + 0.002)); out.append((xs[-1] + 0.02 * (0.6 + 0.4 * s), 0.0))
    poly = [(x, top(x) + h) for x, h in out]
    for k in range(6):                                                           # the base, sunk into the head
        x = out[-1][0] + (out[0][0] - out[-1][0]) * k / 5
        poly.append((x, top(x) - 0.012))
    t = 0.0085 if rooster else 0.0055
    me = bpy.data.meshes.new('comb'); bm = bmesh.new()
    A = [bm.verts.new((x, t / 2, z)) for x, z in poly]; Bv = [bm.verts.new((x, -t / 2, z)) for x, z in poly]
    bm.faces.new(A); bm.faces.new(list(reversed(Bv)))
    n = len(poly)
    for i in range(n): bm.faces.new((A[i], A[(i + 1) % n], Bv[(i + 1) % n], Bv[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('comb', me)); setmat(o, cm); o.parent = hd
    soften(o, 0.0022, 1)
    tag(keep(o), 'head')


def polish_crest(B, rooster, hd, seed):
    """A Polish's crest, from Audrey's photos (29 Oct 19:13, after "this looks like a hat. take inspiration of real
    photos please"): a big round core perched forward over the face (the browser covers it in fine soft plumage standing
    out all round: birds.js FUR.pol), so it hides the eyes and the beak and wattles peep out underneath; a hen's a round
    powder puff, a rooster's bigger and spilling down all round like a mop. Its front is black, by the beak (a hen's a
    little, a rooster's a mane round his face: birds.js crestFront). Head space (the bird faces +x)."""
    cm = flat('crest', B.get('crestc', '#f4f1ea'), 0.85)
    rnd = random.Random(seed * 13 + (5 if rooster else 0))
    C = (0.02, 0, 0.044) if not rooster else (0.004, 0, 0.046)
    Rb = 0.064 if not rooster else 0.06
    S = (1.08, 1.04, 1.12) if not rooster else (1.08, 1.2, 1.12)     # (round, as tall as wide; a rooster's wider: Audrey's photos)
    E = [('ELLIPSOID', C, Rb * K, S, 2.0)]
    E += bumps(rnd, C, (Rb * S[0], Rb * S[1], Rb * S[2]), 14, 0.016, 0.022, zmin=-0.5, skip=lambda d: d.x > 0.6 and d.z < -0.15)
    tag(metaball_mesh('crest_core', E, res=0.0045, m=cm, parent=hd), 'head', 'crest')


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
    # body: one smooth soft shape, as in the 2D game (the browser's hair makes the fluffy edge): a round core, full breast,
    # a cushion rising behind and a thick neck. No bumps: they made a lumpy cloud that read as a sheep's fleece
    E = [('ELLIPSOID', (-0.01, 0, 0.19), 0.112 * K, (1.24, 1.0, 0.95), 2.0),
         ('BALL', (0.07, 0, 0.205 + up * 0.5), 0.08 * K, None, 2.0),
         ('ELLIPSOID', (-0.115, 0, 0.255), 0.078 * K, (1.1, 0.95, 1.0), 2.0),
         ('ELLIPSOID', (0.085, 0, 0.28 + up), 0.052 * K, (1.0, 1.0, 1.3), 2.0)]
    tag(metaball_mesh('body_mb', E, res=0.009, m=pl, parent=body_rig), 'body', 'body')
    pivot('body', (0.0, 0, 0.17), body_rig)
    head = Vector((0.125, 0, 0.35 + up))
    pivot('head', (0.1, 0, 0.28 + up), body_rig)
    pivot('headc', tuple(head), body_rig)
    # the cushion tail: a pompom (a rooster's sits higher and fuller)
    pivot('tail', (-0.15, 0, 0.27), body_rig)
    T = [('ELLIPSOID', (-0.18, 0, 0.295 + up), 0.044 * K, (1.15, 0.9, 1.0), 2.0)]
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
    C = [('ELLIPSOID', cr, 0.036 * K, (1.15 if rooster else 1.0, 1.0, 0.9), 2.0)]       # a round pompom
    tag(metaball_mesh('crest', C, res=0.006, m=pl, parent=hd), 'head', 'crest')
    M_ = [('ELLIPSOID', (-0.008, sd * 0.026, -0.014), 0.024 * K, (1.0, 0.8, 1.1), 2.0) for sd in (1, -1)] + \
         [('ELLIPSOID', (-0.024, 0, -0.008), 0.026 * K, (0.9, 1.2, 1.0), 2.0)]                       # fluffy cheeks (muffs) round the back of the face
    tag(metaball_mesh('muffs', M_, res=0.005, m=pl, parent=hd), 'head', 'body')
    # wings: soft fluff on the sides (enough to flap)
    for sd, nm in ((1, 'wingL'), (-1, 'wingR')):
        pivot(nm, (-0.01, sd * 0.1, 0.26 + up), body_rig)
        W = [('ELLIPSOID', (-0.045, sd * 0.084, 0.212 + up), 0.048 * K, (1.6, 0.36, 0.85), 2.0)]      # a soft wing lying on each side
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
    only = [b for b in os.environ.get('ONLY', 'rir,orp,leg,bra,pol,aya,sil').split(',') if b]
    x = 0.0
    for b in only:
        for s in ('h', 'r'):
            r = build(b, s, seed=3); r.location = (x, 0, 0); r.rotation_euler = (0, 0, math.radians(float(os.environ.get('ROT', -60)))); x += 0.42
    c = chick(); c.location = (x, 0, 0); c.rotation_euler = (0, 0, math.radians(-60)); x += 0.2
    mid = (x - 0.2) / 2
    lighting(scn)
    camera(scn, (mid + 0.3, -0.9 - 0.75 * x, 0.5 + 0.25 * x), (mid, 0, 0.18), lens=45)
    R = int(os.environ.get('RES', 1400)); render(scn, os.environ.get('NAME', 'breeds_lineup'), R, int(R * 0.5), samples)
