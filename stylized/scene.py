"""The farm in the new look, seen through the game's own camera (orthographic, 42 degrees down, 45 degrees round)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import grass, hen, coop, tree

samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 96
scn = reset()
PEN = (-1.3, -1.95, 1.4, 0.8)


def path_strip(points, width=0.75, seed=3):
    """A worn dirt path with soft wobbly edges."""
    random.seed(seed)
    me = bpy.data.meshes.new('path'); bm = bmesh.new(); rows = []
    pts = [Vector(p) for p in points]
    for i, p in enumerate(pts):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); n = Vector((-d.y, d.x, 0))
        w = width / 2 * (1 + 0.12 * noise.noise(p * 1.7))
        rows.append((bm.verts.new(p - n * w + Vector((0, 0, 0.004))), bm.verts.new(p + n * w + Vector((0, 0, 0.004)))))
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('path', me)); setmat(o, coop.dirt_mat())
    for p in o.data.polygons: p.use_smooth = True
    sb = o.modifiers.new('sub', 'SUBSURF'); sb.levels = sb.render_levels = 2
    return o


# a path from the pen gate winding off down the screen
pts = []
GX = -1.25 + 2.5 * 2.6 / 4 + 0.05          # middle of the gate gap in the front fence
for i in range(40):
    t = i / 39
    pts.append((GX + 0.55 * math.sin(t * 3.0) - 1.6 * t * t, -1.98 - t * 4.2, 0))
path_strip(pts, width=0.62)
on_path = lambda x, y: any((Vector((x, y, 0)) - Vector(p)).length < 0.45 for p in pts[::2])
in_pen = lambda x, y: PEN[0] < x < PEN[2] and PEN[1] < y < PEN[3]
TREE = (-2.0, 1.15)
grass.field(scn, size=13.0, density=300, seed=21, tuft_h=0.055,
            avoid=lambda x, y: in_pen(x, y) or on_path(x, y) or (Vector((x - TREE[0], y - TREE[1], 0)).length < 0.18))
coop.build((0, 0, 0), 0.0)
tree.build((TREE[0], TREE[1], 0), seed=2, scale=1.25)
tree.fallen_apples(TREE, 7, r=1.0)
tree.build((2.6, 1.6, 0), seed=5, scale=1.0)
# hens: three in the yard, one out pecking at the fallen apples, a rooster by the house
hen.build('rir_h', (0.2, -1.05, 0.015), math.radians(-60), 'stand', seed=3)
hen.build('rir_h', (0.62, -1.0, 0.015), math.radians(200), 'peck', seed=4)
hen.build('rir_h', (-0.6, -0.8, 0.015), math.radians(-20), 'look', seed=5)
hen.build('rir_r', (-0.05, -0.55, 0.015), math.radians(-35), 'stand', seed=6)
hen.build('rir_h', (-1.55, 0.45, 0), math.radians(140), 'peck', seed=8)
lighting(scn, sun_dir=(-0.55, -0.62, 0.72), sun=4.4)
game_camera(scn, (-0.15, -0.1, 0.3), 6.2)
R = int(os.environ.get('RES', 1000))
render(scn, 'farm_scene', R, int(R * 1.6), samples)
