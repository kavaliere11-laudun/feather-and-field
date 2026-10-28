"""Decorations the player can buy for the farm (game design doc, "Things to buy"), seen from the map camera and rendered
at twice map resolution, like the frogs and ducks. Each is built facing -Y and turned 45 degrees so its front faces the
camera, the way the farmhouse does. The windmill's sails are a separate picture, drawn face-on, so the game can turn them.
Usage: STYLE=fv python decor_sprites.py -- OUTDIR [names]"""
import sys, os, math, random, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector, Matrix
from ffbird import reset, principled, ellipsoid
from ffscene import box, cyl, wood
import ffcam

args = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = args[0]; os.makedirs(OUTDIR, exist_ok=True)
ONLY = args[1].split(',') if len(args) > 1 else None
K = 2
SAMPLES = int(os.environ.get('SAMP', 40))
mp = os.path.join(OUTDIR, 'decor.json')
meta = json.load(open(mp)) if os.path.exists(mp) else {}


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


_MT = {}
def mat(name, hexc, rough=0.6, metal=0.0, coat=0.0, alpha=1.0, spec=0.5, emit=None):
    key = (name, hexc, rough, metal, alpha)
    if key in _MT: return _MT[key]
    m = principled(name, lin(hexc), rough, coat=coat, spec=spec)
    b = m.node_tree.nodes['Principled BSDF']
    if metal: b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try: m.blend_method = 'BLEND'
        except Exception: pass
    if emit:
        b.inputs['Emission Color'].default_value = (*lin(emit[0]), 1); b.inputs['Emission Strength'].default_value = emit[1]
    _MT[key] = m; return m


def cone(name, loc, r1, r2, h, m, rot=(0, 0, 0), v=24, smooth=True):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(m)
    if smooth: bpy.ops.object.shade_smooth()
    return o


def ball(name, loc, r, m, scale=(1, 1, 1), seg=20):
    return ellipsoid(name, loc, (r * scale[0], r * scale[1], r * scale[2]), m, seg=seg)


def group_turn(objs, deg=45.0, at=(0, 0, 0)):
    """Turn everything just built about the vertical axis through `at`."""
    R = Matrix.Translation(Vector(at)) @ Matrix.Rotation(math.radians(deg), 4, 'Z') @ Matrix.Translation(-Vector(at))
    for o in objs:
        if o.parent is None: o.matrix_world = R @ o.matrix_world


def built_since(before): return [o for o in bpy.data.objects if o not in before and o.type == 'MESH']


def shoot(name, size_m, tz, catcher=True, catcher_size=None):
    scn = bpy.context.scene
    if catcher:
        bpy.ops.mesh.primitive_plane_add(size=catcher_size or size_m * 2.5, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    px = int(size_m * ffcam.PPU * K)
    ffcam.setup(scn, (0, 0, tz), px, px, samples=SAMPLES, transparent=True)
    scn.render.threads_mode = 'AUTO'
    scn.camera.data.ortho_scale = size_m
    scn.render.filepath = os.path.join(OUTDIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    ax, ay = ffcam.project((0, 0, 0), (0, 0, tz), px / K, px / K)
    meta[name] = {'px': px, 'k': K, 'anchor': [round(ax * K, 1), round(ay * K, 1)]}
    return px


random.seed(7)
stone = lambda: mat('stone', '#a49d8f', 0.85)
dstone = lambda: mat('dstone', '#7f786c', 0.9)
soilm = lambda: mat('soil', '#4a3121', 0.95)
leaf = lambda: mat('leaf', '#3f7a2a', 0.6)
leaf2 = lambda: mat('leaf2', '#5c9a34', 0.6)
whitep = lambda: mat('whitepaint', '#f1eee6', 0.55)
redroof = lambda: mat('redroof', '#a3402e', 0.7)
dark = lambda: mat('dark', '#2a201a', 0.8)
gold = lambda: mat('gold', '#f2c14e', 0.22, metal=1.0)
iron = lambda: mat('iron', '#2f4a3a', 0.45, metal=0.6)
water = lambda: mat('water', '#5f8fb0', 0.05, spec=0.9, coat=1.0)
glass = lambda: mat('glass', '#e3f3ee', 0.12, alpha=0.42, spec=0.9)
def planks():
    if 'planks' not in _MT: _MT['planks'] = wood('dplank', lin('#8a5a33'), rough=0.8, dark=0.6)
    return _MT['planks']


def flower_heads(cx, cy, n, r, colours, h=(0.16, 0.3), size=0.035):
    for i in range(n):
        a = random.random() * math.tau; d = r * math.sqrt(random.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d; hh = random.uniform(*h)
        cyl('stem', (x, y, hh / 2), 0.006, hh, leaf(), v=6)
        ball('fl', (x, y, hh), size * random.uniform(0.8, 1.2), mat('fl' + colours[i % len(colours)], colours[i % len(colours)], 0.5), scale=(1, 1, 0.8), seg=12)
        if random.random() < 0.5: ball('lf', (x + 0.02, y, 0.05), 0.04, leaf2(), scale=(1.2, 0.6, 0.5), seg=10)


# ------------------------------------------------------------------ the decorations
def flowers():
    """A round cottage flower bed with a stone edge: tulips, daisies and a few tall blue spikes in the middle."""
    for i in range(22):
        a = i / 22 * math.tau
        ball('edge', (math.cos(a) * 0.82, math.sin(a) * 0.82, 0.06), 0.09, stone() if i % 3 else dstone(), scale=(1.3, 1.0, 0.75), seg=14)
    cyl('soil', (0, 0, 0.07), 0.78, 0.12, soilm(), v=40)
    cols = ['#e2453c', '#f4c430', '#f08bb0', '#fbf6ee', '#9b6bd1', '#ff8c42']
    flower_heads(0, 0, 70, 0.68, cols, h=(0.17, 0.3), size=0.04)
    for i in range(30): ball('bush', (random.uniform(-0.6, 0.6) * 0.9, random.uniform(-0.6, 0.6) * 0.9, 0.12), 0.07, leaf(), scale=(1, 1, 0.7), seg=10)
    for i in range(5):                                    # delphinium spikes
        a = i / 5 * math.tau; x, y = math.cos(a) * 0.18, math.sin(a) * 0.18
        for k in range(9): ball('sp', (x, y, 0.25 + k * 0.05), 0.035 - k * 0.002, mat('blue', '#4f6fd6', 0.5), seg=10)


def birdbath():
    """A stone bird bath on a fluted pedestal, a blue tit on the rim, pebbles and primroses round the foot."""
    cyl('foot', (0, 0, 0.05), 0.28, 0.1, stone(), v=8)
    cone('ped', (0, 0, 0.32), 0.15, 0.1, 0.45, stone(), v=8, smooth=False)
    cone('bowl', (0, 0, 0.6), 0.14, 0.5, 0.12, stone(), v=32)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.045, location=(0, 0, 0.66)); bpy.context.object.data.materials.append(stone()); bpy.ops.object.shade_smooth()
    cyl('water', (0, 0, 0.665), 0.47, 0.012, water(), v=40)
    ball('tit', (0.36, -0.3, 0.74), 0.065, mat('titblue', '#4b7fd1', 0.5), scale=(1.3, 0.9, 0.9))
    ball('titb', (0.36, -0.3, 0.72), 0.055, mat('tityel', '#f2d23c', 0.5), scale=(1.2, 0.8, 0.7))
    ball('tith', (0.42, -0.36, 0.79), 0.038, mat('titwh', '#f6f3ea', 0.5))
    for i in range(18):
        a = random.random() * math.tau; d = random.uniform(0.34, 0.55)
        ball('peb', (math.cos(a) * d, math.sin(a) * d, 0.02), 0.04, stone() if i % 2 else dstone(), scale=(1.2, 1, 0.5), seg=10)
    for i in range(8):
        a = i / 8 * math.tau + 0.2; x, y = math.cos(a) * 0.62, math.sin(a) * 0.62
        ball('pl', (x, y, 0.05), 0.08, leaf2(), scale=(1, 1, 0.5), seg=10)
        for k in range(3): ball('pr', (x + random.uniform(-0.05, 0.05), y + random.uniform(-0.05, 0.05), 0.1), 0.03, mat('prim', '#f6e27a', 0.5), seg=10)

def gable(name, x0, y0, z0, w, d, h, m, over=0.05):
    """A gable roof whose ridge runs front to back (along Y), so its triangular end faces the camera."""
    import bmesh
    ang = math.atan2(h, w / 2); L = math.hypot(w / 2, h) + over
    for sd in (1, -1):
        box(name, (x0 + sd * w / 4, y0, z0 + h / 2), (L, d + 2 * over, 0.035), m, rot=(0, sd * ang, 0), bevel=0.008)
    me = bpy.data.meshes.new('end'); bm = bmesh.new()
    for yy in (y0 - d / 2, y0 + d / 2):
        vs = [bm.verts.new(v) for v in ((x0 - w / 2, yy, z0), (x0 + w / 2, yy, z0), (x0, yy, z0 + h))]; bm.faces.new(vs)
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new('end', me); bpy.context.collection.objects.link(o); return o


def beehives():
    """Three white WBC hives on stands, with gabled roofs and lavender in front."""
    before = set(bpy.data.objects)
    roofm = mat('hiveroof', '#7f8c78', 0.6)
    for i, x in enumerate((-0.85, 0.0, 0.85)):
        for lx in (-0.16, 0.16):
            for ly in (-0.16, 0.16): box('leg', (x + lx, ly, 0.11), (0.06, 0.06, 0.22), planks())
        box('stand', (x, 0, 0.24), (0.56, 0.56, 0.05), planks())
        box('board', (x, -0.33, 0.27), (0.4, 0.16, 0.02), planks(), rot=(math.radians(-15), 0, 0))
        z = 0.27
        for k in range(3 if i != 1 else 4):                 # the lifts: each flares out at the bottom
            cone('lift', (x, 0, z + 0.09), 0.43, 0.33, 0.18, whitep(), v=4, smooth=False).rotation_euler.z = math.radians(45)
            box('liftline', (x, 0, z + 0.005), (0.62, 0.62, 0.012), mat('liftl', '#c9c4b8', 0.7))
            z += 0.17
        box('slot', (x, -0.3, 0.3), (0.22, 0.02, 0.025), dark())
        box('eave', (x, 0, z + 0.02), (0.52, 0.52, 0.04), whitep())
        o = gable('roof', x, 0, z + 0.04, 0.52, 0.52, 0.2, roofm); o.data.materials.append(whitep())
    for i in range(18):                                     # lavender
        x = random.uniform(-1.25, 1.25); y = random.uniform(-0.75, -0.48)
        ball('lavb', (x, y, 0.1), 0.12, mat('lavleaf', '#7f9a74', 0.7), scale=(1, 1, 0.8), seg=10)
        for k in range(6):
            cyl('lavs', (x + random.uniform(-0.08, 0.08), y + random.uniform(-0.08, 0.08), 0.22), 0.012, 0.12, mat('lav', '#8f6fc4', 0.6), v=6)
    group_turn(built_since(before))

def duckhouse():
    """A little duck house on a floating raft, with a ramp down into the water."""
    before = set(bpy.data.objects)
    box('raft', (0, 0, 0.03), (0.95, 0.85, 0.08), planks(), bevel=0.01)
    box('house', (0, 0.08, 0.3), (0.5, 0.48, 0.42), mat('blueboard', '#7aa3b8', 0.7), bevel=0.01)
    o = gable('roof', 0, 0.08, 0.51, 0.5, 0.48, 0.26, redroof(), over=0.06); o.data.materials.append(mat('blueboard', '#7aa3b8', 0.7))
    cyl('door', (0, -0.165, 0.27), 0.1, 0.02, dark(), rot=(math.radians(90), 0, 0), v=24)
    box('doorb', (0, -0.165, 0.2), (0.2, 0.02, 0.14), dark())
    box('step', (0, -0.26, 0.09), (0.28, 0.12, 0.03), planks())
    box('ramp', (0, -0.62, 0.0), (0.24, 0.45, 0.03), planks(), rot=(math.radians(-16), 0, 0))
    for k in range(4): box('cleat', (0, -0.5 - k * 0.09, 0.03 - k * 0.025), (0.22, 0.02, 0.02), planks())
    # (the back and the sides, seen now the 3D farm turns all the way round: a round window in each, white rimmed)
    rim = mat('duckrim', '#f1ede2', 0.6)
    cyl('rimb', (0, 0.325, 0.33), 0.075, 0.02, rim, rot=(math.radians(90), 0, 0), v=20)
    cyl('winb', (0, 0.333, 0.33), 0.055, 0.02, dark(), rot=(math.radians(90), 0, 0), v=20)
    for sx in (-1, 1):
        cyl('rims', (sx * 0.255, 0.08, 0.33), 0.065, 0.02, rim, rot=(0, math.radians(90), 0), v=20)
        cyl('wins', (sx * 0.263, 0.08, 0.33), 0.047, 0.02, dark(), rot=(0, math.radians(90), 0), v=20)
    group_turn(built_since(before))

def greenhouse():
    """A Victorian greenhouse on a low brick wall: white frames, glass, tomatoes and pots inside."""
    before = set(bpy.data.objects)
    W, D, Hw, Hg, Hr = 3.0, 1.9, 0.45, 1.25, 1.85
    brick = mat('brick', '#a2563a', 0.85)
    for (x, y, w, d) in ((0, -D / 2, W, 0.12), (0, D / 2, W, 0.12), (-W / 2, 0, 0.12, D), (W / 2, 0, 0.12, D)):
        box('wall', (x, y, Hw / 2), (w, d, Hw), brick)
    box('floor', (0, 0, 0.02), (W - 0.1, D - 0.1, 0.04), mat('gravel', '#b3a58c', 0.95))
    for x in (-0.9, 0.0, 0.9):                              # plants inside
        box('bench', (x, 0.45, 0.55), (0.75, 0.5, 0.06), planks())
        for k in range(3): ball('tom', (x - 0.25 + k * 0.25, 0.45, 0.75), 0.13, leaf(), scale=(1, 1, 1.3), seg=12)
        for k in range(3): ball('tomr', (x - 0.22 + k * 0.25, 0.32, 0.72), 0.03, mat('tomato', '#d9382c', 0.4), seg=8)
        cyl('pot', (x, -0.45, 0.12), 0.12, 0.2, mat('terra', '#b0603a', 0.8), v=16); ball('potp', (x, -0.45, 0.3), 0.14, leaf2(), seg=12)
    # glass walls and roof
    box('gwall', (0, -D / 2 + 0.03, (Hw + Hg) / 2), (W - 0.05, 0.02, Hg - Hw), glass())
    box('gwall', (0, D / 2 - 0.03, (Hw + Hg) / 2), (W - 0.05, 0.02, Hg - Hw), glass())
    for x in (-W / 2 + 0.03, W / 2 - 0.03):
        box('gend', (x, 0, (Hw + Hg) / 2), (0.02, D - 0.05, Hg - Hw), glass())
    ang = math.atan2(Hr - Hg, D / 2); L = math.hypot(Hr - Hg, D / 2)
    for sd in (1, -1):
        box('groof', (0, sd * D / 4, (Hg + Hr) / 2), (W, L + 0.04, 0.02), glass(), rot=(-sd * ang, 0, 0))
    for x in (-W / 2, W / 2):                               # gable ends
        import bmesh
        me = bpy.data.meshes.new('gable'); bm = bmesh.new()
        vs = [bm.verts.new(v) for v in ((x, -D / 2, Hg), (x, D / 2, Hg), (x, 0, Hr))]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('gable', me); bpy.context.collection.objects.link(o); o.data.materials.append(glass())
    fw = whitep()
    for i in range(7):                                      # frames
        x = -W / 2 + i * W / 6
        for sd in (1, -1):
            box('post', (x, sd * D / 2, (Hw + Hg) / 2), (0.06, 0.06, Hg - Hw), fw)
            box('raft', (x, sd * D / 4, (Hg + Hr) / 2), (0.055, L + 0.02, 0.05), fw, rot=(-sd * ang, 0, 0))
    for sd in (1, -1):
        box('plate', (0, sd * D / 2, Hg), (W + 0.04, 0.05, 0.05), fw); box('sill', (0, sd * D / 2, Hw + 0.02), (W + 0.04, 0.06, 0.04), fw)
    box('ridge', (0, 0, Hr + 0.03), (W + 0.12, 0.1, 0.09), fw)
    for x in (-W / 2, W / 2):
        for sd in (1, -1): box('barge', (x, sd * D / 4, (Hg + Hr) / 2), (0.06, L + 0.04, 0.06), fw, rot=(-sd * ang, 0, 0))
    for x in (-W / 2 - 0.04, W / 2 + 0.04): ball('fin', (x, 0, Hr + 0.1), 0.05, fw, seg=12)
    box('door', (W / 2 + 0.01, 0, (Hw + Hg) / 2 - 0.15), (0.03, 0.6, 1.1), glass())
    group_turn(built_since(before))


SAIL_R = 3.1
def windmill():
    """A white smock windmill on a brick base, with a white ogee cap and a fantail; the sails are a separate picture."""
    before = set(bpy.data.objects)
    cone('base', (0, 0, 0.6), 1.45, 1.35, 1.2, mat('brick2', '#9a5a3e', 0.85), v=8, smooth=False).rotation_euler.z = math.radians(22.5)
    cone('tower', (0, 0, 1.2 + 2.5), 1.22, 0.72, 5.0, mat('board', '#f4f1ea', 0.65), v=8, smooth=False).rotation_euler.z = math.radians(22.5)
    for k in range(10):                                     # weatherboard lines
        z = 1.45 + k * 0.48; r = 1.22 - (z - 1.2) / 5.0 * 0.5 + 0.006
        cone('boardl', (0, 0, z), r + 0.012, r, 0.035, mat('boardl', '#cfc9bc', 0.7), v=8, smooth=False).rotation_euler.z = math.radians(22.5)
    capm = mat('capw', '#f7f5ef', 0.55)
    ball('cap', (0, 0.05, 6.35), 0.9, capm, scale=(0.95, 1.25, 0.72), seg=32)
    box('capb', (0, 0.05, 6.2), (1.7, 2.1, 0.16), mat('capband', '#3a5e46', 0.6), bevel=0.03)
    ball('finial', (0, 0.05, 7.05), 0.12, mat('capband', '#3a5e46', 0.6), seg=16)
    cyl('hub', (0, -1.05, 6.3), 0.18, 0.5, dark(), rot=(math.radians(90), 0, 0), v=16)
    box('door', (0, -1.38, 1.55), (0.6, 0.06, 1.0), mat('door', '#3a5e46', 0.6))
    for z in (3.4, 4.7): box('win', (0, -1.13 + (z - 3.4) * 0.1, z), (0.3, 0.06, 0.38), mat('winw', '#3a5e46', 0.6))
    cyl('fanpost', (0, 1.25, 5.85), 0.04, 1.3, planks(), rot=(math.radians(-35), 0, 0), v=8)
    for i in range(6):
        a = i / 6 * math.tau; box('fan', (math.cos(a) * 0.24, 1.7, 6.45 + math.sin(a) * 0.24), (0.07, 0.02, 0.5), whitep(), rot=(0, a, 0))
    group_turn(built_since(before))
    return Matrix.Rotation(math.radians(45), 4, 'Z') @ Vector((0, -1.32, 6.3))     # the hub, where the sails turn

def sails():
    """Four lattice sails with canvas, face-on, centred on the hub."""
    frame = mat('sailwood', '#6b4a2e', 0.8); cloth = mat('canvas', '#efe3c6', 0.85, alpha=0.92)
    cyl('hubc', (0, 0, 0), 0.22, 0.12, dark(), rot=(math.radians(90), 0, 0), v=24)
    for i in range(4):
        a = i * math.pi / 2
        R = Matrix.Rotation(a, 4, 'Y')
        def put(o):
            o.matrix_world = R @ o.matrix_world
        put(box('stock', (SAIL_R / 2, 0, 0), (SAIL_R, 0.08, 0.1), frame))
        put(box('canvas', (SAIL_R * 0.58, 0.02, 0.27), (SAIL_R * 0.78, 0.01, 0.48), cloth))
        for k in range(8):
            x = SAIL_R * 0.2 + k * SAIL_R * 0.78 / 7
            put(box('bar', (x, -0.01, 0.27), (0.04, 0.03, 0.52), frame))
        for z in (0.03, 0.51): put(box('rail', (SAIL_R * 0.58, -0.01, z), (SAIL_R * 0.8, 0.03, 0.035), frame))


def shoot_sails(name):
    """Face-on render of the sails (they turn in a vertical plane facing the camera's direction)."""
    scn = bpy.context.scene
    size = SAIL_R * 2 + 0.4; px = int(size * ffcam.PPU * K)
    ffcam.setup(scn, (0, 0, 0), px, px, samples=SAMPLES, transparent=True)
    scn.render.threads_mode = 'AUTO'
    cam = scn.camera; cam.location = (0, -40, 0); cam.rotation_euler = (math.radians(90), 0, 0); cam.data.ortho_scale = size
    scn.render.filepath = os.path.join(OUTDIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    meta[name] = {'px': px, 'k': K, 'anchor': [px / 2, px / 2], 'faceon': True}


def bandstand():
    """A Victorian bandstand: octagonal deck, green iron columns, red roof with a cream fascia and a gold finial."""
    before = set(bpy.data.objects)
    R = 1.3
    cyl('deck', (0, 0, 0.28), R + 0.1, 0.56, whitep(), v=8).rotation_euler.z = math.radians(22.5)
    cyl('deckedge', (0, 0, 0.58), R + 0.16, 0.06, mat('deckwood', '#9a6a43', 0.7), v=8).rotation_euler.z = math.radians(22.5)
    for k in range(3): box('step', (0, -R - 0.18 - k * 0.2, 0.42 - k * 0.16), (0.9, 0.22, 0.16), whitep())
    ir = iron()
    for i in range(8):
        a = (i + 0.5) / 8 * math.tau; x, y = math.cos(a) * R, math.sin(a) * R
        cyl('col', (x, y, 1.65), 0.05, 2.1, ir, v=12)
        ball('capital', (x, y, 2.7), 0.08, ir, seg=12)
        if i != 6:                                          # railings, open at the front for the steps
            b_ = (i + 1.5) / 8 * math.tau; x2, y2 = math.cos(b_) * R, math.sin(b_) * R
            mx, my = (x + x2) / 2, (y + y2) / 2; L = math.hypot(x2 - x, y2 - y); ang = math.atan2(y2 - y, x2 - x)
            box('rail', (mx, my, 1.05), (L, 0.05, 0.05), ir, rot=(0, 0, ang))
            for k in range(5): cyl('bal', (x + (x2 - x) * (k + 1) / 6, y + (y2 - y) * (k + 1) / 6, 0.82), 0.015, 0.45, ir, v=6)
    cyl('fascia', (0, 0, 2.82), R + 0.32, 0.22, mat('cream', '#f3e7c9', 0.6), v=8).rotation_euler.z = math.radians(22.5)
    cone('roof', (0, 0, 3.35), R + 0.42, 0.12, 0.95, mat('roofred', '#b2392f', 0.6), v=8, smooth=False).rotation_euler.z = math.radians(22.5)
    ball('fin', (0, 0, 3.98), 0.12, gold(), seg=16)
    cone('spike', (0, 0, 4.25), 0.05, 0.0, 0.4, gold(), v=12)
    group_turn(built_since(before))


def statue():
    """A golden cockerel on a stone plinth: the champion farm's statue."""
    before = set(bpy.data.objects)
    box('step', (0, 0, 0.08), (1.25, 1.25, 0.16), stone(), bevel=0.03)
    box('plinth', (0, 0, 0.4), (0.8, 0.8, 0.5), mat('stonel', '#bdb6a6', 0.8), bevel=0.03)
    box('cap', (0, 0, 0.7), (0.95, 0.95, 0.1), stone(), bevel=0.03)
    box('plaque', (0, -0.405, 0.42), (0.46, 0.02, 0.22), mat('bronze', '#7a5a2c', 0.35, metal=0.8))
    for i in range(14):
        a = i / 14 * math.tau; x, y = math.cos(a) * 0.9, math.sin(a) * 0.9
        ball('box', (x, y, 0.08), 0.13, leaf(), scale=(1, 1, 0.7), seg=10)
    group_turn(built_since(before))
    sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/sty')
    import hen_char as HC
    HC._M.clear()
    before2 = set(bpy.data.objects)
    root, hd = HC.build('rir_r', (0, 0, 0.75), math.radians(-90 + 45 - 25), {})
    root.scale = (2.5, 2.5, 2.5)
    g = gold()
    for o in bpy.data.objects:
        if o in before2 or o.type not in ('MESH', 'CURVE', 'META', 'SURFACE'): continue
        try:
            o.data.materials.clear(); o.data.materials.append(g)
        except Exception: pass

DECOR = {
    'flowers': (flowers, 2.2, 0.2), 'birdbath': (birdbath, 1.7, 0.5), 'beehives': (beehives, 3.0, 0.5), 'duckhouse': (duckhouse, 1.9, 0.3),
    'greenhouse': (greenhouse, 4.6, 0.9), 'windmill': (windmill, 11.0, 3.0), 'bandstand': (bandstand, 5.8, 1.3), 'statue': (statue, 2.8, 1.1),
}
for name, (fn, size, tz) in DECOR.items():
    if ONLY and name not in ONLY: continue
    reset(); _MT.clear(); random.seed(hash(name) % 1000)
    hub = fn()
    shoot('dc_' + name, size, tz, catcher=(name != 'duckhouse'))
    if name == 'windmill':
        a = ffcam.project(tuple(hub), (0, 0, tz), 1, 1); o = ffcam.project((0, 0, 0), (0, 0, tz), 1, 1)
        meta['dc_windmill']['hub'] = [round(a[0] - o[0], 1), round(a[1] - o[1], 1)]          # map pixels from the foot to the hub
        reset(); _MT.clear(); sails(); shoot_sails('dc_sails')
    print('DECOR', name, flush=True)
    json.dump(meta, open(mp, 'w'), indent=0)
print('DECOR_DONE', sorted(meta))
