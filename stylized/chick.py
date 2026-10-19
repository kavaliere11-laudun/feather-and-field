"""A fluffy Rhode Island Red chick in the cosy-farm look, to match hen.py: a round golden fluff-ball with a big head,
tiny wings, a stub of a tail, a little beak and big dark eyes. Poses: 'stand' (head up) and 'peck' (head down).
Run directly for a close-up next to a hen: python chick.py [samples]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

K = 1 / 0.575
_mats = {}


def mats():
    if _mats: return _mats
    _mats.update(
        fluff=feather_mat('fluff_rir_c', [(0.0, '#d39a42'), (0.5, '#e8b85a'), (1.0, '#f4d27c')], scale=40, depth=0.1),
        wing=feather_mat('cwing_rir_c', [(0.0, '#c98d3e'), (0.6, '#dba64e'), (1.0, '#e6b55c')], scale=36, depth=0.1),
        beak=mat('beak_rir_c', '#e9b24c', rough=0.4, spec=0.4),
        leg=mat('leg_rir_c', '#f0be42', rough=0.45, spec=0.35),
        pupil=mat('pupil', '#0b0a09', rough=0.05, spec=1.0, coat=1.0),
        shine=mat('cshine', '#ffffff', rough=0.1, spec=0.8),
    )
    return _mats


def build(loc=(0, 0, 0), yaw=0.0, pose='stand', seed=1):
    random.seed(seed)
    M = mats()
    root = empty('chick', loc, (0, 0, yaw))
    rig = empty('cbody', (0, 0, 0), (0, 0, 0), root)
    if pose == 'peck': rig.rotation_euler = (0, math.radians(18), 0); rig.location = (0.006, 0, -0.004)
    head = Vector((0.03, 0, 0.122)) if pose != 'peck' else Vector((0.066, 0, 0.05))
    E = [
        ('ELLIPSOID', (-0.006, 0, 0.056), 0.05 * K, (1.18, 1.0, 0.92), 2.0),      # round body
        ('BALL', (0.02, 0, 0.05), 0.034 * K, None, 2.0),                           # fluffy chest
        ('ELLIPSOID', (-0.05, 0, 0.068), 0.02 * K, (1.0, 0.85, 1.0), 2.0),         # stub of a tail
    ]
    metaball_mesh('chick_body', E, res=0.004, m=M['fluff'], parent=rig)
    # the head: its own round ball, so it reads as a head (a soft crease where it meets the body)
    sphere('chead_ball', 0.04, tuple(head), (1.0, 0.96, 0.98), m=M['fluff'], parent=rig, seg=28, rings=18)
    hd = empty('chead', tuple(head), (0, math.radians(-6 if pose != 'peck' else 30), 0), rig)
    cyl('cbeak', 0.011, 0.026, (0.044, 0, -0.006), (0, math.radians(90 + 10), 0), M['beak'], verts=10, r2=0.0012, bevel=0.0012, parent=hd)
    for sd in (1, -1):
        sphere('ceye', 0.0098, (0.024, sd * 0.03, 0.009), m=M['pupil'], parent=hd, seg=16, rings=10)
        sphere('cglint', 0.0028, (0.031, sd * 0.034, 0.014), m=M['shine'], parent=hd, seg=8, rings=6)
        w = empty('cwing', (-0.016, sd * 0.05, 0.058), (math.radians(sd * -4), math.radians(-14), 0), rig)
        sphere('cwingb', 0.026, (0, 0, 0), (1.0, 0.2, 0.55), m=M['wing'], parent=w, seg=20, rings=12)
    for sd in (1, -1):                                                       # little legs and feet
        lg = empty('cleg', (0.004, sd * 0.02, 0), (0, 0, 0), root)
        cyl('cshank', 0.0055, 0.028, (0, 0, 0.014), m=M['leg'], verts=8, bevel=0.001, parent=lg)
        for ang, L in ((0, 0.024), (35, 0.02), (-35, 0.02)):
            a = math.radians(ang + sd * 6)
            cyl('ctoe', 0.0032, L, (math.cos(a) * L / 2, math.sin(a) * L / 2, 0.003), (0, math.radians(90), a), M['leg'], verts=6, r2=0.0018, bevel=0.0008, parent=lg)
    return root


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 64
    scn = reset()
    import hen
    g = cyl('ground', 0.9, 0.04, (0, 0, -0.02), m=mat('grass_g', '#6fae4b', rough=0.9), verts=64, bevel=0.0)
    hen.build('rir_h', (-0.05, 0.12, 0), math.radians(20), 'stand', seed=1)
    build((0.22, -0.12, 0), math.radians(-20), 'stand', seed=1)
    build((0.3, 0.12, 0), math.radians(140), 'peck', seed=2)
    lighting(scn)
    camera(scn, (0.95, -0.85, 0.62), (0.1, 0.02, 0.12), lens=50)
    R = int(os.environ.get('RES', 900)); render(scn, 'chick_closeup', R, R, samples)
