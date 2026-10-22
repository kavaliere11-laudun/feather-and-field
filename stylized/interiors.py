"""Inside each coop style, for the night view (tap a coop at night and you're inside: the birds asleep on their perch).
A room open at the front (Blender -y, where the camera is), 1.5 m wide, 0.9 m deep, 1 m high: floor boards under a litter of
straw, the style's walls (raw barn boards; whitewash and oak beams; stone; logs; plaster with red lacquer beams), a ladder
perch against the back wall, two nest boxes on the right, the little pop door (shut) and a window on the left, a feeder, a
drinker, a hay bale, a ceiling on joists, and a lantern turned low hanging over the nest boxes.
ROOMS records, per style, the perches, nest boxes, the chicks' corner, the lantern and the window for the browser
(glTF axes: (x, y, z) = Blender (x, z, -y)).
Run directly for a picture of all five: python interiors.py [samples]"""
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import coop
from coop import plank, straw_bits

X2, Y0, Y1, H = 0.75, -0.45, 0.45, 1.0           # half width, the open front, the back wall, the height
G = (1.5, 26, 26)
_m = {}
ROOMS = {}


def C(name, hexc, rough=0.75, **kw):
    if name not in _m: _m[name] = mat(name, hexc, rough=rough, **kw)
    return _m[name]


def reset_mats():
    _m.clear(); coop._M.clear()


def g(p):                                         # Blender point -> glTF
    return [round(p[0], 3), round(p[2], 3), round(-p[1], 3)]


def walls_boards(objs, wood, dark):
    """Raw barn boards inside the Red Barn, with a dark beam at the top."""
    BW = 0.11
    for i in range(int(2 * X2 / BW)):                       # back wall: vertical boards
        x = -X2 + (i + 0.5) * BW
        objs.append(plank('wboard', (x, Y1, 0.0), (x, Y1, H), BW * 0.95, 0.025, (0, -1, 0), wood, jitter=0.5))
    for sx in (-1, 1):                                      # side walls
        for i in range(int((Y1 - Y0) / BW)):
            y = Y0 + (i + 0.5) * BW
            objs.append(plank('wboard', (sx * X2, y, 0.0), (sx * X2, y, H), BW * 0.95, 0.025, (-sx, 0, 0), wood, jitter=0.5))
    for sx in (-1, 1):
        objs.append(box('post', (0.07, 0.07, H), (sx * (X2 - 0.04), Y1 - 0.04, H / 2), m=dark, bevel=0.008))
    objs.append(box('beam', (2 * X2, 0.07, 0.07), (0, Y1 - 0.04, H - 0.04), m=dark, bevel=0.008))


def walls_whitewash(objs, lime, oak):
    """The cottage: whitewashed walls, an oak timber frame (posts, a rail, braces)."""
    objs.append(box('wall', (2 * X2, 0.04, H), (0, Y1 + 0.02, H / 2), m=lime, bevel=0.0))
    for sx in (-1, 1): objs.append(box('wall', (0.04, Y1 - Y0, H), (sx * (X2 + 0.02), 0, H / 2), m=lime, bevel=0.0))
    for x in (-X2 + 0.03, -0.25, 0.25, X2 - 0.03):
        objs.append(plank('post', (x, Y1 - 0.01, 0.0), (x, Y1 - 0.01, H), 0.06, 0.035, (0, -1, 0), oak, jitter=0.4))
    for z in (0.62, H - 0.04):
        objs.append(plank('rail', (-X2, Y1 - 0.012, z), (X2, Y1 - 0.012, z), 0.055, 0.035, (0, -1, 0), oak, jitter=0.3))
    objs.append(plank('brace', (-0.25, Y1 - 0.013, 0.62), (-X2 + 0.05, Y1 - 0.013, 0.05), 0.045, 0.03, (0, -1, 0), oak, jitter=0.3))
    objs.append(plank('brace', (0.25, Y1 - 0.013, 0.62), (X2 - 0.05, Y1 - 0.013, 0.05), 0.045, 0.03, (0, -1, 0), oak, jitter=0.3))
    for sx in (-1, 1):
        for y in (Y0 + 0.04, Y1 - 0.06):
            objs.append(plank('spost', (sx * X2, y, 0.0), (sx * X2, y, H), 0.06, 0.035, (-sx, 0, 0), oak, jitter=0.4))
        objs.append(plank('srail', (sx * X2, Y0, 0.62), (sx * X2, Y1, 0.62), 0.055, 0.035, (-sx, 0, 0), oak, jitter=0.3))


def walls_stone(objs, stones, mortar, beam):
    """The stone cottage: rough stone blocks in courses, a wooden beam at the top."""
    objs.append(box('mortar', (2 * X2, 0.03, H), (0, Y1 + 0.03, H / 2), m=mortar, bevel=0.0))
    for sx in (-1, 1): objs.append(box('mortar', (0.03, Y1 - Y0, H), (sx * (X2 + 0.03), 0, H / 2), m=mortar, bevel=0.0))
    def course(place, length):
        z = 0.0; row = 0
        while z < H - 0.08:
            h = random.uniform(0.1, 0.13); u = -length / 2 - (0.08 if row % 2 else 0.0)
            while u < length / 2:
                w = random.uniform(0.16, 0.28); u1 = min(length / 2, u + w)
                if u1 - u > 0.05: place(box('stone', (u1 - u - 0.014, 0.045, h - 0.014), (0, 0, 0), m=random.choice(stones), bevel=0.016, segs=1, jitter=0.003), (u + u1) / 2, z + h / 2)
                u = u1
            z += h; row += 1
    def back(o, u, v): o.location = (u, Y1, v); objs.append(o)
    def side(sx):
        def f(o, u, v): o.location = (sx * X2, u, v); o.rotation_euler = (0, 0, math.radians(90)); objs.append(o)
        return f
    course(back, 2 * X2); course(side(-1), Y1 - Y0); course(side(1), Y1 - Y0)
    objs.append(box('beam', (2 * X2, 0.08, 0.08), (0, Y1 - 0.05, H - 0.04), m=beam, bevel=0.01))


def walls_logs(objs, log, endg):
    """The timber lodge: round logs laid one on another, their ends crossing at the corners."""
    r = 0.06; z = r; row = 0
    while z < H:
        objs.append(cyl('log', r, 2 * X2 + 0.16, (0, Y1 + 0.02, z), (0, math.radians(90), 0), log, verts=10, bevel=0.0))
        for sx in (-1, 1):
            objs.append(cyl('log', r, Y1 - Y0 + 0.1, (sx * (X2 + 0.02), 0.0, z + (r if row % 2 else 0)), (math.radians(90), 0, 0), log, verts=10, bevel=0.0))
            objs.append(cyl('end', r * 0.9, 0.012, (sx * (X2 + 0.02), Y0 - 0.05, z + (r if row % 2 else 0)), (math.radians(90), 0, 0), endg, verts=10, bevel=0.0))
        z += 2 * r; row += 1


def walls_plaster(objs, plaster, red):
    """The pagoda: white plaster walls between red lacquered pillars and beams."""
    objs.append(box('wall', (2 * X2, 0.04, H), (0, Y1 + 0.02, H / 2), m=plaster, bevel=0.0))
    for sx in (-1, 1): objs.append(box('wall', (0.04, Y1 - Y0, H), (sx * (X2 + 0.02), 0, H / 2), m=plaster, bevel=0.0))
    for x in (-X2 + 0.04, X2 - 0.04):
        objs.append(cyl('pillar', 0.04, H, (x, Y1 - 0.04, H / 2), m=red, verts=12, bevel=0.003))
    for z in (0.08, H - 0.05):
        objs.append(box('rbeam', (2 * X2, 0.05, 0.05), (0, Y1 - 0.02, z), m=red, bevel=0.006, segs=1))
        for sx in (-1, 1): objs.append(box('rbeam', (0.05, Y1 - Y0, 0.05), (sx * (X2 - 0.01), 0, z), m=red, bevel=0.006, segs=1))


def room(style):
    random.seed(11); objs = []; m = coop.M()
    wood, dark, straw = m['wood'], m['darkwood'], m['straw']
    # floor boards and the deep litter of straw
    for i in range(10):
        y = Y0 + (i + 0.5) * (Y1 - Y0) / 10
        objs.append(plank('floor', (-X2, y, 0.0), (X2, y, 0.0), (Y1 - Y0) / 10 * 0.96, 0.03, (0, 0, 1), dark, jitter=0.4))
    for k in range(9):
        objs.append(sphere('litter', 0.22, (random.uniform(-0.6, 0.6), random.uniform(-0.3, 0.35), 0.0), (random.uniform(1.0, 1.6), random.uniform(0.8, 1.2), 0.12), m=straw, ico=2, disp=0.35, seed=k))
    straw_bits(objs, (0, 0, 0), 0.62, 140, 0.03)
    # the walls, each style its own
    if style == 'rir': walls_boards(objs, wood, dark)
    elif style == 'orp': walls_whitewash(objs, C('limewash', '#f1e8d2', rough=0.85, var=0.03), C('oak', '#5d3e28', rough=0.8, var=0.1, grain=0.3, grain_scale=G))
    elif style == 'leg': walls_stone(objs, [C('st%d' % i, h, rough=0.85, var=0.08) for i, h in enumerate(('#a59b88', '#928a7b', '#b3a891', '#877f72', '#9c8f7a'))], C('mortar', '#6f685e', rough=0.95), dark)
    elif style == 'bra': walls_logs(objs, C('log', '#8d5b34', rough=0.8, var=0.1, grain=0.35, grain_scale=G), C('endgrain', '#cfa268', rough=0.8, var=0.05))
    else: walls_plaster(objs, C('plaster', '#f3eee2', rough=0.85), C('lacquer', '#b0312a', rough=0.4, coat=0.3))
    # a little window high on the left wall: the night sky outside, a crossbar frame
    frame = C('wframe', '#e9e0cc', rough=0.6) if style != 'sil' else C('lacquer', '#b0312a', rough=0.4, coat=0.3)
    wy, wz, ws = 0.08, 0.66, 0.26
    if style == 'sil':
        objs.append(cyl('nightsky', ws / 2, 0.012, (-X2 + 0.035, wy, wz), (0, math.radians(90), 0), C('nightsky', '#22335e', rough=0.3), verts=24, bevel=0.0))
        bpy.ops.mesh.primitive_torus_add(major_radius=ws / 2 + 0.01, minor_radius=0.018, major_segments=28, minor_segments=8, location=(-X2 + 0.04, wy, wz), rotation=(0, math.radians(90), 0))
        t_ = bpy.context.object; setmat(t_, frame); objs.append(t_)
    else:
        objs.append(box('nightsky', (0.012, ws, ws), (-X2 + 0.035, wy, wz), m=C('nightsky', '#22335e', rough=0.3), bevel=0.0))
        for (a, b) in (((wy - ws / 2, wz - ws / 2), (wy + ws / 2, wz - ws / 2)), ((wy - ws / 2, wz + ws / 2), (wy + ws / 2, wz + ws / 2)),
                       ((wy - ws / 2, wz - ws / 2), (wy - ws / 2, wz + ws / 2)), ((wy + ws / 2, wz - ws / 2), (wy + ws / 2, wz + ws / 2)),
                       ((wy, wz - ws / 2), (wy, wz + ws / 2)), ((wy - ws / 2, wz), (wy + ws / 2, wz))):
            objs.append(plank('wframe', (-X2 + 0.045, a[0], a[1]), (-X2 + 0.045, b[0], b[1]), 0.03, 0.02, (1, 0, 0), frame, jitter=0.2, bevel=0.004))
    # the pop door, low on the left wall near the front: its little sliding door shut for the night, in its guides
    py, ph, pw = -0.24, 0.42, 0.3
    objs.append(box('popshut', (0.02, pw, ph), (-X2 + 0.04, py, ph / 2 + 0.02), m=wood, bevel=0.006))
    for dy in (-pw / 2 - 0.02, pw / 2 + 0.02):
        objs.append(box('guide', (0.03, 0.03, ph + 0.12), (-X2 + 0.05, py + dy, (ph + 0.12) / 2), m=dark, bevel=0.005))
    objs.append(cyl('handle', 0.012, 0.06, (-X2 + 0.06, py, ph - 0.02), (0, math.radians(90), 0), m['metal'], verts=8, bevel=0.0))
    # the perch: a ladder leaning on the back wall, two round bars
    bars = [(0.16, 0.3), (0.31, 0.52)]                          # (y, z) of each bar
    px0, px1 = -0.62, 0.24
    for x in (px0 - 0.03, px1 + 0.03):
        objs.append(plank('rail', (x, 0.02, 0.0), (x, Y1 - 0.06, 0.72), 0.05, 0.035, (1, 0, 0), dark, jitter=0.3))
    for (y, z) in bars:
        objs.append(cyl('perch', 0.024, px1 - px0 + 0.08, ((px0 + px1) / 2, y, z), (0, math.radians(90), 0), wood, verts=12, bevel=0.0))
    # two nest boxes on the right, open towards the room, straw inside (the browser puts the eggs in)
    nb = []
    for k, x in enumerate((0.42, 0.63)):
        bw, bd, z0 = 0.2, 0.3, 0.14
        objs.append(box('nbbase', (bw, bd, 0.02), (x, Y1 - bd / 2, z0), m=dark, bevel=0.004))
        objs.append(box('nbtop', (bw + 0.02, bd + 0.02, 0.02), (x, Y1 - bd / 2, z0 + 0.25), m=dark, bevel=0.004))
        for dx in (-bw / 2, bw / 2): objs.append(box('nbside', (0.02, bd, 0.25), (x + dx, Y1 - bd / 2, z0 + 0.125), m=dark, bevel=0.004))
        objs.append(box('nblip', (bw, 0.02, 0.06), (x, Y1 - bd, z0 + 0.03), m=wood, bevel=0.004))
        objs.append(sphere('nbstraw', 0.09, (x, Y1 - bd / 2, z0 + 0.03), (1.05, 1.5, 0.35), m=straw, ico=2, disp=0.3, seed=40 + k))
        straw_bits(objs, (x, Y1 - bd / 2, 0), 0.08, 14, z0 + 0.04)
        nb.append(g((x, Y1 - bd / 2 - 0.02, z0 + 0.06)))
    for x in (0.42, 0.63):
        objs.append(box('nbleg', (0.03, 0.03, 0.14), (x, Y1 - 0.27, 0.07), m=dark, bevel=0.004))
    # the chicks' corner: a hollow in the straw by the nest boxes, under the beam's lantern light
    chick = (0.5, -0.1, 0.02)
    objs.append(sphere('cornerstraw', 0.16, (chick[0], chick[1], 0.0), (1.2, 1.0, 0.18), m=straw, ico=2, disp=0.35, seed=60))
    # feeder and drinker, a hay bale in the back corner
    # (galvanised steel: a pale grey, not metal, as nothing in here would show in a mirror finish)
    galv = C('galv', '#a7adb0', rough=0.45)
    objs.append(cyl('feeder', 0.07, 0.22, (-0.5, -0.12, 0.13), m=galv, verts=16, bevel=0.004))
    objs.append(cyl('feedpan', 0.11, 0.035, (-0.5, -0.12, 0.02), m=galv, verts=20, bevel=0.004))
    objs.append(cyl('feedlid', 0.085, 0.05, (-0.5, -0.12, 0.265), m=galv, verts=16, r2=0.02, bevel=0.003))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.03, minor_radius=0.005, major_segments=12, minor_segments=4, location=(-0.5, -0.12, 0.3), rotation=(math.radians(90), 0, 0))
    t_ = bpy.context.object; setmat(t_, galv); objs.append(t_)
    red = C('redplastic', '#c9473a', rough=0.5)
    dx_, dy_ = 0.1, -0.3
    objs.append(cyl('drinker', 0.048, 0.12, (dx_, dy_, 0.08), m=red, verts=16, bevel=0.004))
    objs.append(sphere('drinktop', 0.048, (dx_, dy_, 0.14), (1, 1, 0.55), m=red, seg=16, rings=8))
    objs.append(cyl('drinkbase', 0.078, 0.025, (dx_, dy_, 0.0125), m=C('redbase', '#a8392f', rough=0.55), verts=20, bevel=0.003))
    objs.append(cyl('waterpan', 0.067, 0.004, (dx_, dy_, 0.026), m=m['water'], verts=18, bevel=0.0))
    objs.append(box('hay', (0.32, 0.2, 0.2), (-0.56, Y1 - 0.14, 0.1), m=m['hay'], bevel=0.03, segs=2))
    # the ceiling: boards (plaster in the pagoda, limewash in the cottage) on joists, a beam across the open front, and a
    # lantern turned low for the night hanging from the middle joist over the nest boxes (clear of the sleepers)
    beam = {'rir': dark, 'orp': C('oak', '#5d3e28'), 'leg': dark, 'bra': C('log', '#8d5b34'), 'sil': C('lacquer', '#b0312a')}[style]
    lid = {'orp': C('limewash', '#f1e8d2'), 'sil': C('plaster', '#f3eee2')}.get(style)
    if lid: objs.append(box('ceiling', (2 * X2 + 0.08, Y1 - Y0 + 0.02, 0.03), (0, (Y0 + Y1) / 2 + 0.01, H + 0.015), m=lid, bevel=0.0))
    else:
        for i in range(8):
            x = -X2 - 0.04 + (i + 0.5) * (2 * X2 + 0.08) / 8
            objs.append(plank('cboard', (x, Y0 + 0.01, H + 0.012), (x, Y1 + 0.02, H + 0.012), (2 * X2 + 0.08) / 8 * 0.96, 0.024, (0, 0, -1), wood, jitter=0.4))
    for y in (Y0 + 0.14, 0.0, Y1 - 0.14):
        objs.append(box('joist', (2 * X2 + 0.04, 0.055, 0.06), (0, y, H - 0.03), m=beam, bevel=0.006, segs=1))
    objs.append(box('lintel', (2 * X2 + 0.06, 0.08, 0.065), (0, Y0 - 0.005, H + 0.015), m=beam, bevel=0.008))
    lx, ly, lz = 0.53, 0.0, H - 0.25
    objs.append(cyl('hook', 0.004, H - 0.06 - (lz + 0.075), (lx, ly, (H - 0.06 + lz + 0.075) / 2), m=m['metal'], verts=5, bevel=0.0))
    objs.append(box('lantcap', (0.08, 0.08, 0.02), (lx, ly, lz + 0.065), m=C('iron', '#26231f', rough=0.5, metal=0.6), bevel=0.004))
    objs.append(box('lamp', (0.06, 0.06, 0.08), (lx, ly, lz), m=C('lamp', '#ffd98a', rough=0.3, emission=('#ffcf70', 1.0)), bevel=0.004))
    objs.append(box('lantbase', (0.08, 0.08, 0.015), (lx, ly, lz - 0.047), m=C('iron', '#26231f', rough=0.5, metal=0.6), bevel=0.004))
    ROOMS['inside_' + style] = dict(
        perches=[dict(x0=px0 + 0.07, x1=px1 - 0.05, top=round(z + 0.024, 3), z=round(-y, 3)) for (y, z) in bars],
        nests=nb, chicks=g(chick), lamp=g((lx, ly, lz)), window=g((-X2 + 0.04, wy, wz)), size=[2 * X2, H, Y1 - Y0])
    root = empty('inside_' + style)
    for o in objs:
        mw = o.matrix_basis.copy(); o.parent = root; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = mw
    return root


STYLES = ['rir', 'orp', 'leg', 'bra', 'sil']

if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 24
    scn = reset()
    for i, k in enumerate(os.environ.get('ONLY', ','.join(STYLES)).split(',')):
        r = room(k); r.location = (i * 1.9 - 3.8, 0, 0)
    lighting(scn)
    camera(scn, (0.0, -6.5, 2.6), (0.0, 0, 0.4), lens=40)
    R = int(os.environ.get('RES', 1600)); render(scn, os.environ.get('NAME', 'interiors_row'), R, int(R * 0.4), samples)
