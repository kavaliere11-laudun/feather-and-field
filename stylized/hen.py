"""A stylized, chunky Rhode Island Red hen (and a rooster variant) in the cosy-farm look.
Run directly for a close-up: python hen.py [samples]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

K = 1 / 0.575          # metaball radius for a wanted surface radius (stiffness 2, threshold 0.6)

PALETTES = {
    'rir_h': dict(body=[(0.0, '#5a1f10'), (0.35, '#7a2d16'), (0.75, '#9a4220'), (1.0, '#b65a2a')], wing='#6e2814', wing_tip='#3a170c',
                  tail='#2e1710', comb='#d8352b', beak='#e7b04a', leg='#efbd3c', eye='#e08a26'),
    'rir_r': dict(body=[(0.0, '#3e140a'), (0.4, '#6a220f'), (0.7, '#a63e18'), (1.0, '#d0702a')], wing='#7c2a12', wing_tip='#2a120a',
                  tail='#14100e', comb='#e0332a', beak='#e7b04a', leg='#efbd3c', eye='#e08a26'),
}
_mats = {}


def mats(key):
    if key in _mats: return _mats[key]
    P = PALETTES[key]
    M = dict(
        body=feather_mat('feathers_' + key, P['body'], scale=17, depth=0.2),
        wing=feather_mat('wing_' + key, [(0, P['wing_tip']), (0.55, P['wing']), (1, P['wing'])], scale=14, depth=0.25),
        tail=mat('tail_' + key, P['tail'], rough=0.5, spec=0.35, coat=0.12, sheen=0.2, ramp=[(0.0, P['wing']), (0.45, P['tail']), (1.0, P['tail'])]),
        comb=mat('comb_' + key, P['comb'], rough=0.45, spec=0.35, sss=0.25),
        beak=mat('beak_' + key, P['beak'], rough=0.4, spec=0.4),
        leg=mat('leg_' + key, P['leg'], rough=0.45, spec=0.35, bump=0.15, bump_scale=120),
        eye=mat('eye_' + key, P['eye'], rough=0.15, spec=0.8),
        pupil=mat('pupil', '#0b0a09', rough=0.05, spec=1.0, coat=1.0),
    )
    _mats[key] = M; return M


def paddle(name, length, width, thick, m, parent, loc, rot, curve=0.0):
    """A rounded feather: a subdivided flat box, slightly curved."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        x = v.co.x + 0.5                                   # 0 at the root, 1 at the tip
        taper = 0.55 + 0.45 * math.sin(min(1, x) * math.pi * 0.85)
        v.co = Vector((x * length, v.co.y * thick, v.co.z * width * taper))
        v.co.y += curve * (x ** 2) * length
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); subsurf(o, 2)
    for p in o.data.polygons: p.use_smooth = True
    o.parent = parent; o.location = loc; o.rotation_euler = rot
    return o


def build(key='rir_h', loc=(0, 0, 0), yaw=0.0, pose='stand', seed=1):
    """pose: 'stand' (head up), 'peck' (head down to the ground), 'look' (head turned)."""
    random.seed(seed)
    M = mats(key); rooster = key.endswith('_r')
    root = empty('hen_' + key, loc, (0, 0, yaw))
    s = 1.12 if rooster else 1.0
    body_rig = empty('body', (0, 0, 0), (0, 0, 0), root)
    if pose == 'peck': body_rig.rotation_euler = (0, math.radians(22), 0); body_rig.location = (0.02, 0, -0.01)
    if pose == 'look': body_rig.rotation_euler = (0, math.radians(-4), 0)
    # head position by pose (body space)
    head = {'stand': Vector((0.15, 0, 0.415)), 'look': Vector((0.135, 0.02, 0.425)), 'peck': Vector((0.23, 0, 0.15))}[pose]
    neck = (head + Vector((0.075, 0, 0.27))) / 2
    if pose == 'peck': neck = Vector((0.15, 0, 0.25))
    E = [
        ('ELLIPSOID', (-0.02, 0, 0.215), 0.125 * K, (1.45, 0.92, 0.9), 2.0),       # body: long and low
        ('BALL', (0.085, 0, 0.2), 0.092 * K, None, 2.0),                           # full breast, low and forward
        ('ELLIPSOID', (-0.12, 0, 0.27), 0.08 * K, (1.2, 1.0, 0.95), 2.0),          # back rising to the tail
        ('ELLIPSOID', (-0.19, 0, 0.33), 0.05 * K, (0.85, 0.9, 1.45), 2.0),         # tail cushion
        ('ELLIPSOID', tuple(neck), 0.044 * K, (1.0, 0.95, 1.55 if pose != 'peck' else 1.2), 2.0),   # neck
        ('BALL', tuple(head), 0.058 * K, None, 2.0),                               # head (a touch big: cute)
        ('BALL', (0.0, 0.055, 0.12), 0.05 * K, None, 1.6), ('BALL', (0.0, -0.055, 0.12), 0.05 * K, None, 1.6),   # fluffy thighs
    ]
    if rooster:
        E.append(('ELLIPSOID', tuple(neck + Vector((-0.02, 0, -0.02))), 0.065 * K, (1.1, 1.05, 1.3), 2.0))      # hackle ruff
    body = metaball_mesh('hen_body', E, res=0.008, m=M['body'], parent=body_rig)
    # head details, in head space
    hd = empty('head', tuple(head), (0, math.radians(-10 if pose != 'peck' else 25), math.radians(18) if pose == 'look' else 0), body_rig)
    beak = cyl('beak', 0.019, 0.048, (0.07, 0, -0.008), (0, math.radians(90 + 12), 0), M['beak'], verts=12, r2=0.002, bevel=0.002, parent=hd)
    for sd in (1, -1):
        sphere('eye', 0.016, (0.032, sd * 0.043, 0.013), m=M['eye'], parent=hd, seg=18, rings=12)
        sphere('pupil', 0.0098, (0.039, sd * 0.0545, 0.0145), m=M['pupil'], parent=hd, seg=14, rings=8)
        sphere('lobe', 0.011, (0.004, sd * 0.045, -0.012), (1, 0.45, 1.2), m=M['comb'], parent=hd, seg=12, rings=8)
    # comb: a row of rounded points; wattles: two soft drops
    cs = 1.5 if rooster else 1.0
    comb = metaball_mesh('comb', [('BALL', (0.045 - i * 0.022, 0, 0.05 + 0.012 * math.sin(i * 1.1) * cs + (0.006 if i in (1, 2) else 0)), (0.017 - 0.0015 * abs(i - 1.5)) * K * cs, None, 2.0) for i in range(4)]
                         + [('ELLIPSOID', (0.0, 0, 0.042), 0.02 * K, (2.2, 0.5, 0.5), 2.0)], res=0.004, m=M['comb'], parent=hd)
    comb.scale = (1, 0.55, 1)
    wat = metaball_mesh('wattles', [('ELLIPSOID', (0.05, sd * 0.009, -0.042), 0.013 * K * cs, (0.8, 0.6, 1.3), 2.0) for sd in (1, -1)], res=0.004, m=M['comb'], parent=hd)
    # wings: soft folded shapes with darker feather tips at the back
    for sd in (1, -1):
        w = empty('wing', (0.0, sd * 0.093, 0.24), (math.radians(sd * -6), math.radians(-12), math.radians(sd * -4)), body_rig)
        wb = sphere('wingbase', 0.1, (0, 0, 0), (1.05, 0.2, 0.5), m=M['wing'], parent=w, seg=28, rings=16)
        for k in range(4):     # primaries: point back and a little down, flat faces outwards
            e = math.radians(-8 - k * 5)
            paddle('prim', 0.1 - k * 0.008, 0.032, 0.01, M['wing'], w, (-0.05, sd * (0.008 - k * 0.002), -0.012 - k * 0.011),
                   (0, e - math.pi, math.radians(sd * (4 + k * 2))), curve=-sd * 0.12)
    # tail: a fan of dark glossy feathers rising behind (bigger, sickle-curved on a rooster)
    tb = empty('tail', (-0.2, 0, 0.33), (0, 0, 0), body_rig)
    n = 9 if rooster else 7
    for i in range(n):
        side = 1 if i % 2 else -1
        e = math.radians(28 + 50 * i / (n - 1))                  # from low and back to high and upright
        L = (0.22 if rooster else 0.14) * (1.0 - 0.15 * abs(i / (n - 1) - 0.5))
        paddle('tailf', L, 0.05 if not rooster else 0.045, 0.011, M['tail'], tb, (0.01, side * 0.012, -0.01),
               (math.radians(side * 6), e - math.pi, math.radians(side * 9)), curve=side * 0.22)
    if rooster:
        for sd in (1, -1):
            paddle('sickle', 0.3, 0.035, 0.01, M['tail'], tb, (0.01, sd * 0.014, 0.02), (math.radians(sd * 6), math.radians(55) - math.pi, math.radians(sd * 12)), curve=sd * 0.3)
    # legs and feet (stay planted; the body tilts above them)
    for sd in (1, -1):
        lg = empty('leg', (0.01, sd * 0.055, 0), (0, 0, 0), root)
        cyl('shank', 0.0115, 0.11, (0, 0, 0.055), (0, math.radians(6), 0), M['leg'], verts=10, r2=0.0095, bevel=0.002, parent=lg)
        for ang, L in ((0, 0.06), (32, 0.05), (-32, 0.05), (180, 0.03)):
            a = math.radians(ang + sd * 6)
            cyl('toe', 0.0065, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.006), (0, math.radians(90), a), M['leg'], verts=8, r2=0.0035, bevel=0.0015, parent=lg)
    if rooster: root.scale = (s, s, s)
    return root


def ground_patch(r=0.7, seed=3):
    """A little grassy disc for close-ups."""
    g = cyl('ground', r, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9, bump=0.2, bump_scale=30), verts=64, bevel=0.0)
    return g


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 64
    scn = reset()
    import grass
    grass.field(scn, size=8.0, density=700, seed=4, tuft_h=0.045)
    build('rir_h', (0.05, -0.05, 0), math.radians(8), 'stand', seed=1)
    build('rir_h', (-0.35, 0.75, 0), math.radians(195), 'peck', seed=2)
    lighting(scn)
    camera(scn, (0.82, -0.92, 0.74), (-0.04, 0.12, 0.2), lens=50, dof=4.0)
    R = int(os.environ.get('RES', 1200)); render(scn, 'hen_closeup', R, R, samples)
