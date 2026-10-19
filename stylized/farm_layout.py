"""Where things go on the Unity farm, in Blender coordinates (metres; the coop's house at the origin, its front facing -y).
OLD is the first layout (18 Oct 2026); NEW has a bigger pen (19 Oct 2026, Audrey: "the coop should be bigger").
export_unity.py turns NEW into Data/layout.json; layout_preview.py renders either from the game's camera."""
import math
import coop

R2 = math.sqrt(0.5)
RIGHT = (R2, R2)          # the screen's right, on the ground
TO_CAM = (R2, -R2)        # towards the camera, on the ground


def path_points(gx, y0):
    """The dirt path from the gate: the same curve as the farm scene, starting at the gate."""
    pts = [(gx + 0.55 * math.sin(t * 3.0) - 1.6 * t * t, y0 - 0.08 - t * 4.2) for t in (i / 39 for i in range(40))]
    dx, dy = pts[-1][0] - pts[-2][0], pts[-1][1] - pts[-2][1]
    n = math.hypot(dx, dy); dx, dy = dx / n, dy / n
    pts += [(pts[-1][0] + dx * 0.25 * (k + 1), pts[-1][1] + dy * 0.25 * (k + 1)) for k in range(40)]
    return pts


def apple_spots(trunk, degs, r=0.75, h=0.98):
    out = []
    for d in degs:
        a = math.radians(d)
        out.append((trunk[0] + r * (RIGHT[0] * math.cos(a) + TO_CAM[0] * math.sin(a)),
                    trunk[1] + r * (RIGHT[1] * math.cos(a) + TO_CAM[1] * math.sin(a)), h))
    return out


OLD = dict(
    pen=coop.SMALL_PEN,
    trees=[dict(model='apple_tree', pos=(-2.0, 1.15), scale=1.25, yaw=20), dict(model='apple_tree_b', pos=(2.6, 1.6), scale=1.0, yaw=200)],
    yard_birds=[(0.2, -1.05), (0.62, -1.0), (-0.6, -0.8), (-0.05, -0.55)],
    tree_birds=[(-1.55, 0.45)],
    apples=apple_spots((-2.0, 1.15), (0, 45, 90, 135, 180)),
    target=(-0.15, -0.1, 0.3), ortho=4.0,
)
OLD['path_pts'] = path_points(-1.25 + 2.5 * 2.6 / 4 + 0.05, -1.9)[::3]

BIG_PEN = dict(box=(-1.6, 1.75, -2.45, 0.75), gate=3, feeder=(1.2, -1.45), dish=(0.2, -1.95), hay=(-1.1, -1.85), hay_rot=12,
               straw=((-1.1, -1.85, 0.4, 70), (-0.3, -1.05, 0.35, 40), (0.6, -0.6, 0.5, 40), (0.9, -2.0, 0.35, 30)), sack=(1.15, 0.2))
NEW_TRUNK = (-2.55, 0.55)
NEW = dict(
    pen=BIG_PEN,
    trees=[dict(model='apple_tree', pos=NEW_TRUNK, scale=1.25, yaw=20), dict(model='apple_tree_b', pos=(2.9, 1.7), scale=1.0, yaw=200)],
    yard_birds=[(0.3, -1.3), (0.95, -2.0), (-0.75, -1.2), (-0.2, -2.05)],     # the same spots as the hens below
    chicks=[(0.55, -1.7)],
    tree_birds=[],
    glutton=[(1.35, -0.95)],                 # since 19 Oct she lives in the coop and trots out to the apple tree
    apples=apple_spots(NEW_TRUNK, (90, 112, 135, 157, 180)),
    target=(-0.6, -0.2, 0.3), ortho=4.4,
)
_saved = coop.PEN; coop.PEN = BIG_PEN
NEW['gate'] = coop.gate_span()
coop.PEN = _saved
NEW['path_pts'] = path_points(NEW['gate'][1] + 0.05, BIG_PEN['box'][2])[::3]


# ------------------------------------------------------------------ for Unity (Data/layout.json)
def U(x, y, z=0.0): return [round(-x, 4), round(z, 4), round(-y, 4)]
def flat(L): return [v for item in L for v in item]           # Unity's JsonUtility can't read nested lists

NEW.update(
    nest=(0.9, -0.74),                       # the straw nest in the yard, by the house
    hens=[dict(model='hen', pos=(0.3, -1.3, 0.015), yaw=30, area='yard'), dict(model='hen', pos=(0.95, -2.0, 0.015), yaw=160, area='yard'),
          dict(model='hen', pos=(-0.75, -1.2, 0.015), yaw=250, area='yard'), dict(model='rooster', pos=(-0.2, -2.05, 0.015), yaw=300, area='yard'),
          dict(model='hen', pos=(1.35, -0.95, 0.015), yaw=90, area='yard', glutton=True)],
)


def unity_layout(L, path_pts, sun):
    x0, x1, y0, y1 = L['pen']['box']
    P = L['pen']
    obstacles = [U(*P['hay']) + [0.38], U(*P['feeder']) + [0.22], U(*P['dish']) + [0.22], U(-0.31, -0.75) + [0.18], U(-0.31, -1.0) + [0.16], U(*P['sack']) + [0.2]]
    return {
        'path': flat([U(p[0], p[1]) for p in path_pts]),
        'pen': {'min': [round(-x1 - 0.05, 4), 0, round(-y1 - 0.05, 4)], 'max': [round(-x0 + 0.05, 4), 0, round(-y0 + 0.05, 4)]},
        'yard': {'min': [round(-(x1 - 0.2), 4), 0, 0.6], 'max': [round(-(x0 + 0.2), 4), 0, round(-(y0 + 0.15), 4)]},
        'yardObstacles': flat(obstacles),
        'nest': U(*L['nest']), 'feeder': U(*P['feeder']),
        'trees': [{'model': t['model'], 'pos': U(*t['pos']), 'scale': t['scale'], 'yaw': t['yaw']} for t in L['trees']],
        'hens': [{'model': h['model'], 'pos': U(*h['pos']), 'yaw': h['yaw'], 'area': h['area'], 'glutton': bool(h.get('glutton'))} for h in L['hens']],
        'gate': U(L['gate'][1] - 0.1, y0),     # where birds walk through the gate (clear of its open leaf)
        'camera': {'target': U(L['target'][0], L['target'][1], L['target'][2]), 'pitch': 42.0, 'yaw': 135.0, 'orthoSize': L['ortho']},
        'sun': sun,
    }
