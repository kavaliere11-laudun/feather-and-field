"""Small farm decorations, each built around the origin (use ffland.build to place and turn them)."""
import math, random
import bpy
from ffbird import principled, ellipsoid
from ffscene import box, cyl, wood

_M = {}
def M(name, fn):
    if name not in _M: _M[name] = fn()
    return _M[name]

straw = lambda: M('straw', lambda: wood('dstraw', (0.66, 0.5, 0.17), scale=(30, 3, 3), rough=0.9, dark=0.68))
plank = lambda: M('plank', lambda: wood('dplank', (0.36, 0.22, 0.11), rough=0.8, dark=0.6))
dark_wood = lambda: M('dwood', lambda: wood('ddark', (0.17, 0.1, 0.05), rough=0.85, dark=0.6))
white_wood = lambda: M('white', lambda: wood('dwhite', (0.8, 0.78, 0.72), scale=(1, 20, 1), rough=0.7, dark=0.88))
iron = lambda: M('iron', lambda: principled('diron', (0.05, 0.05, 0.055), 0.45))
stone = lambda: M('stone', lambda: principled('dstone', (0.42, 0.4, 0.36), 0.9))
soil = lambda: M('soil', lambda: principled('dsoil', (0.13, 0.075, 0.04), 0.95))
leafm = lambda: M('cabbage', lambda: principled('dcabbage', (0.2, 0.4, 0.12), 0.6, sss=0.2))
pumpkin = lambda: M('pumpkin', lambda: principled('dpumpkin', (0.75, 0.28, 0.03), 0.5, coat=0.2))
terracotta = lambda: M('terra', lambda: principled('dterra', (0.5, 0.2, 0.09), 0.8))
red = lambda: M('red', lambda: principled('dred', (0.5, 0.05, 0.03), 0.5))
glass = lambda: M('glass', lambda: principled('dlamp', (1.0, 0.85, 0.5), 0.2))


def hay_stack():
    """Two bales with one on top, a little loose straw."""
    box('bale', (0, 0, 0.14), (0.62, 0.36, 0.28), straw(), bevel=0.04)
    box('bale', (0.05, 0.42, 0.14), (0.62, 0.36, 0.28), straw(), rot=(0, 0, 0.12), bevel=0.04)
    box('bale', (0.03, 0.2, 0.42), (0.62, 0.36, 0.28), straw(), rot=(0, 0, -0.08), bevel=0.04)


def round_bale():
    cyl('roll', (0, 0, 0.32), 0.34, 0.6, straw(), rot=(math.pi / 2, 0, 0.4), v=28)


def barrels():
    for (x, y) in [(0, 0), (0.42, 0.08), (0.2, 0.4)]:
        cyl('barrel', (x, y, 0.27), 0.18, 0.54, dark_wood(), v=20)
        for z in (0.1, 0.44): cyl('hoop', (x, y, z), 0.185, 0.03, iron(), v=20)
    box('crate', (-0.38, 0.25, 0.15), (0.4, 0.34, 0.3), plank(), bevel=0.01)
    for i in range(6): ellipsoid('apple', (-0.47 + (i % 3) * 0.09, 0.2 + (i // 3) * 0.1, 0.32), (0.04, 0.04, 0.04), red(), seg=10)


def wheelbarrow():
    box('tray', (0, 0, 0.36), (0.75, 0.48, 0.2), M('green', lambda: principled('dgreen', (0.08, 0.22, 0.12), 0.5)), bevel=0.03)
    cyl('wheel', (0.45, 0, 0.16), 0.16, 0.06, iron(), rot=(math.pi / 2, 0, 0), v=20)
    for s in (1, -1):
        box('handle', (-0.55, s * 0.18, 0.4), (0.6, 0.04, 0.04), plank())
        box('leg', (-0.25, s * 0.18, 0.15), (0.04, 0.04, 0.3), plank())
    for i in range(4): ellipsoid('pump', (-0.15 + i * 0.12, (i % 2) * 0.1 - 0.05, 0.5), (0.08, 0.08, 0.06), pumpkin(), seg=12)


def planter():
    box('planter', (0, 0, 0.16), (0.9, 0.36, 0.32), plank(), bevel=0.02)
    box('soil', (0, 0, 0.31), (0.84, 0.3, 0.02), soil())
    cols = [(0.85, 0.2, 0.3), (0.9, 0.75, 0.15), (0.6, 0.3, 0.75), (0.95, 0.95, 0.9)]
    for i in range(16):
        x, y = random.uniform(-0.38, 0.38), random.uniform(-0.12, 0.12)
        ellipsoid('leaf', (x, y, 0.36), (0.06, 0.06, 0.05), leafm(), seg=8)
        ellipsoid('bloom', (x, y, 0.42), (0.035, 0.035, 0.025), M('bl%d' % (i % 4), lambda c=cols[i % 4]: principled('dbloom', c, 0.5)), seg=8)


def flower_pots():
    for (x, y, s) in [(0, 0, 1), (0.3, 0.1, 0.8), (0.12, 0.32, 0.9)]:
        cyl('pot', (x, y, 0.13 * s), 0.13 * s, 0.26 * s, terracotta(), v=16)
        ellipsoid('plant', (x, y, 0.3 * s), (0.14 * s, 0.14 * s, 0.1 * s), leafm(), seg=10)
        for k in range(5):
            a = k * 1.3; ellipsoid('bloom', (x + math.cos(a) * 0.08 * s, y + math.sin(a) * 0.08 * s, 0.36 * s), (0.03, 0.03, 0.02), M('pink', lambda: principled('dpink', (0.9, 0.35, 0.5), 0.5)), seg=8)


def lamp_post():
    cyl('post', (0, 0, 0.75), 0.035, 1.5, iron(), v=10)
    box('arm', (0.12, 0, 1.45), (0.26, 0.03, 0.03), iron())
    box('lamp', (0.24, 0, 1.34), (0.13, 0.13, 0.18), glass())
    box('cap', (0.24, 0, 1.45), (0.17, 0.17, 0.04), iron())


def well():
    for i in range(14):
        a = i / 14 * math.tau
        box('stone', (math.cos(a) * 0.42, math.sin(a) * 0.42, 0.24), (0.22, 0.14, 0.48), stone(), rot=(0, 0, a), bevel=0.02)
    cyl('water', (0, 0, 0.3), 0.36, 0.02, M('wwater', lambda: principled('dwater', (0.02, 0.08, 0.1), 0.05, coat=0.8)), v=20)
    for s in (1, -1): box('post', (0, s * 0.46, 0.75), (0.07, 0.07, 1.0), plank())
    box('beam', (0, 0, 1.2), (0.07, 1.0, 0.07), plank())
    for s in (1, -1): box('roof', (s * 0.22, 0, 1.38), (0.5, 1.15, 0.04), M('wroof', lambda: principled('droof', (0.32, 0.08, 0.05), 0.7)), rot=(0, s * 0.62, 0))
    cyl('bucket', (0, 0, 0.85), 0.09, 0.14, plank(), v=12)


def veg_patch(w=2.4, d=1.6):
    box('bed', (0, 0, 0.04), (w, d, 0.08), soil(), bevel=0.03)
    rows = int(d / 0.32)
    for r in range(rows):
        y = -d / 2 + 0.2 + r * 0.32
        for i in range(int(w / 0.28)):
            x = -w / 2 + 0.18 + i * 0.28 + random.uniform(-0.03, 0.03)
            if r % 3 == 2: ellipsoid('pump', (x, y, 0.14), (0.1, 0.1, 0.08), pumpkin(), seg=12)
            else: ellipsoid('cab', (x, y, 0.13), (0.1, 0.1, 0.08), leafm(), seg=12)


def picket_fence(L=3.0, h=0.5):
    n = int(L / 0.14)
    for i in range(n + 1):
        box('picket', (-L / 2 + i * L / n, 0, h / 2), (0.06, 0.025, h), white_wood())
    for z in (0.16, 0.38): box('rail', (0, 0.02, z), (L, 0.03, 0.05), white_wood())


def scarecrow():
    box('pole', (0, 0, 0.7), (0.06, 0.06, 1.4), plank())
    box('arms', (0, 0, 1.05), (0.06, 0.9, 0.05), plank())
    box('shirt', (0, 0, 1.0), (0.18, 0.5, 0.36), M('shirt', lambda: principled('dshirt', (0.35, 0.08, 0.05), 0.8)), bevel=0.03)
    ellipsoid('head', (0, 0, 1.32), (0.13, 0.13, 0.14), M('sack', lambda: principled('dsack', (0.6, 0.48, 0.3), 0.9)))
    cyl('brim', (0, 0, 1.43), 0.24, 0.03, straw(), v=20); cyl('hat', (0, 0, 1.52), 0.12, 0.18, straw(), v=16)


def log_pile():
    for i, (y, z) in enumerate([(-0.2, 0.1), (0, 0.1), (0.2, 0.1), (-0.1, 0.28), (0.1, 0.28), (0, 0.45)]):
        cyl('log', (0, y, z), 0.1, 0.9, dark_wood(), rot=(0, math.pi / 2, 0), v=12)


def bench():
    box('seat', (0, 0, 0.42), (1.1, 0.34, 0.05), plank())
    box('back', (0, 0.15, 0.68), (1.1, 0.05, 0.3), plank())
    for x in (-0.45, 0.45):
        for y in (-0.12, 0.12): box('leg', (x, y, 0.2), (0.05, 0.05, 0.4), iron())


def dock(L=1.6):
    for i in range(7): box('board', (i * L / 7, 0, 0.1), (L / 7 - 0.02, 0.8, 0.04), plank())
    for x in (0.1, L - 0.1):
        for y in (-0.35, 0.35): cyl('pile', (x, y, 0.0), 0.05, 0.4, dark_wood(), v=10)


def mushrooms():
    cap = M('mcap', lambda: principled('dmcap', (0.6, 0.06, 0.04), 0.5))
    stem = M('mstem', lambda: principled('dmstem', (0.85, 0.82, 0.75), 0.6))
    for (x, y, s) in [(0, 0, 1), (0.12, 0.05, 0.7), (-0.08, 0.1, 0.8)]:
        cyl('stem', (x, y, 0.04 * s), 0.02 * s, 0.08 * s, stem, v=8)
        ellipsoid('cap', (x, y, 0.09 * s), (0.06 * s, 0.06 * s, 0.035 * s), cap, seg=10)


def stepping_stones(n=5, step=0.42):
    for i in range(n): ellipsoid('stone', (i * step, random.uniform(-0.05, 0.05), 0.0), (0.16, 0.13, 0.03), stone(), seg=12)


def wheat_field(w=4.0, d=2.4):
    """Ripe wheat: a soil bed with dense golden stalks (hair) in gently clumped rows."""
    box('bed', (0, 0, 0.03), (w, d, 0.06), soil(), bevel=0.04)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.065)); p = bpy.context.object
    p.scale = (w - 0.15, d - 0.15, 1); bpy.ops.object.transform_apply(scale=True)
    p.data.materials.append(soil())
    m = bpy.data.materials.new('wheat'); m.use_nodes = True; nt = m.node_tree; bsdf = nt.nodes['Principled BSDF']
    info = nt.nodes.new('ShaderNodeHairInfo'); mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = (0.35, 0.24, 0.05, 1); mix.inputs['B'].default_value = (0.92, 0.7, 0.22, 1)
    nt.links.new(info.outputs['Intercept'], mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.7
    p.data.materials.append(m)
    mod = p.modifiers.new('wheat', 'PARTICLE_SYSTEM'); s = mod.particle_system.settings
    s.type = 'HAIR'; s.count = int(w * d * 420); s.hair_length = 0.55; s.use_advanced_hair = True
    s.normal_factor = 0.7 * 0.33; s.factor_random = 0.04; s.material = 2
    s.child_type = 'INTERPOLATED'; s.rendered_child_count = 6; s.child_radius = 0.06; s.clump_factor = 0.4
    s.roughness_1 = 0.03; s.roughness_endpoint = 0.04
    s.root_radius = 1.6; s.tip_radius = 1.0; s.radius_scale = 0.01; s.render_step = 3


def sunflowers(w=3.6, d=1.8):
    box('bed', (0, 0, 0.03), (w, d, 0.06), soil(), bevel=0.04)
    stem = M('sfstem', lambda: principled('dsfstem', (0.12, 0.3, 0.06), 0.6))
    petal = M('sfpetal', lambda: principled('dsfpetal', (0.95, 0.68, 0.04), 0.5, sss=0.1))
    centre = M('sfcentre', lambda: principled('dsfcentre', (0.12, 0.06, 0.02), 0.8))
    for r in range(int(d / 0.45)):
        for i in range(int(w / 0.4)):
            x = -w / 2 + 0.25 + i * 0.4 + random.uniform(-0.05, 0.05); y = -d / 2 + 0.25 + r * 0.45
            h = random.uniform(0.85, 1.15)
            cyl('stem', (x, y, h / 2), 0.02, h, stem, v=6)
            for k in range(2): ellipsoid('leaf', (x + (0.08 if k else -0.08), y, h * (0.4 + 0.2 * k)), (0.1, 0.05, 0.02), leafm(), seg=8)
            ellipsoid('petals', (x, y - 0.02, h + 0.02), (0.17, 0.05, 0.17), petal, rot=(0.25, 0, 0), seg=14)
            ellipsoid('centre', (x, y - 0.05, h + 0.02), (0.08, 0.035, 0.08), centre, rot=(0.25, 0, 0), seg=12)


def bridge(L=1.8, W=0.75, rise=0.22):
    """A small arched wooden footbridge along local x."""
    n = 11
    for i in range(n):
        t = (i + 0.5) / n; x = -L / 2 + t * L; z = 0.06 + rise * math.sin(math.pi * t)
        ang = math.atan(rise * math.pi / L * math.cos(math.pi * t))
        box('plank', (x, 0, z), (L / n - 0.015, W, 0.04), plank(), rot=(0, -ang, 0))
    for s in (1, -1):
        for i in range(5):
            t = i / 4; x = -L / 2 + t * L; z = 0.06 + rise * math.sin(math.pi * t)
            box('post', (x, s * W / 2, z + 0.22), (0.05, 0.05, 0.46), dark_wood())
        for k in range(8):
            t0, t1 = k / 8, (k + 1) / 8
            x0, x1 = -L / 2 + t0 * L, -L / 2 + t1 * L
            z0, z1 = 0.06 + rise * math.sin(math.pi * t0) + 0.42, 0.06 + rise * math.sin(math.pi * t1) + 0.42
            box('rail', ((x0 + x1) / 2, s * W / 2, (z0 + z1) / 2), (math.hypot(x1 - x0, z1 - z0) + 0.01, 0.04, 0.04), dark_wood(), rot=(0, -math.atan2(z1 - z0, x1 - x0), 0))
