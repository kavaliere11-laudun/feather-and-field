"""A straw nest for each pen (a back layer, and its front rim drawn over a sitting hen) and an egg for each breed,
seen from the map camera. Rendered at twice map resolution and added to the props in OUTDIR/props.json.
Usage: python nest_sprites.py -- OUTDIR"""
import sys, os, math, random, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector
from ffbird import reset, principled, ellipsoid
import ffcam

OUTDIR = sys.argv[sys.argv.index('--') + 1]; os.makedirs(OUTDIR, exist_ok=True)
K = 2
mp = os.path.join(OUTDIR, 'props.json')
meta = json.load(open(mp)) if os.path.exists(mp) else {}
D, _, _ = ffcam.basis()
toward = Vector((D[0], D[1])).normalized()          # ground direction towards the camera: the nest's front


def shoot(name, size_m, tz, catcher=True):
    if catcher:
        bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    px = int(size_m * ffcam.PPU * K)
    scn = bpy.context.scene
    ffcam.setup(scn, (0, 0, tz), px, px, samples=48, transparent=True)
    scn.camera.data.ortho_scale = size_m
    scn.render.filepath = os.path.join(OUTDIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    ax, ay = ffcam.project((0, 0, 0), (0, 0, tz), px / K, px / K)
    meta[name] = {'px': px, 'k': K, 'anchor': [round(ax * K, 1), round(ay * K, 1)]}


def lin(hexc):
    c = [int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def nest(part):
    """part: 'back' = the whole nest; 'front' = only the half of the rim nearest the camera."""
    random.seed(5)
    straw = [principled('straw%d' % i, c, 0.75) for i, c in enumerate([(0.5, 0.33, 0.08), (0.36, 0.22, 0.06), (0.62, 0.45, 0.13), (0.28, 0.17, 0.05)])]
    R, r = 0.2, 0.075
    keep = lambda x, y: part == 'back' or (x * toward.x + y * toward.y) > -0.02
    if part == 'back':                                   # the hollow, lined with straw
        bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=0.02, location=(0, 0, 0.012), vertices=32)
        bpy.context.object.data.materials.append(straw[1])
    # the rim: a ring of short straws lying round and round the nest
    for i in range(520):
        a = random.uniform(0, math.tau); rr = R + random.gauss(0, r * 0.4); z = 0.015 + 0.075 * math.exp(-((rr - R) / r) ** 2) * random.uniform(0.6, 1.1)
        x, y = math.cos(a) * rr, math.sin(a) * rr
        if not keep(x, y): continue
        L = random.uniform(0.08, 0.16)
        tang = a + random.gauss(0, 0.35)          # lying round the ring
        bpy.ops.mesh.primitive_cylinder_add(radius=0.0055, depth=L, vertices=5, location=(x, y, z),
                                            rotation=(math.pi / 2 + random.gauss(0, 0.12), 0, tang))
        bpy.context.object.data.materials.append(random.choice(straw))
    # a few loose straws sticking out
    for i in range(18):
        a = random.uniform(0, math.tau); rr = R + r * random.uniform(0.7, 1.1); x, y = math.cos(a) * rr, math.sin(a) * rr
        if not keep(x, y): continue
        bpy.ops.mesh.primitive_cylinder_add(radius=0.004, depth=random.uniform(0.07, 0.12), vertices=5, location=(x, y, 0.05),
                                            rotation=(random.uniform(1.2, 1.5), 0, a + math.pi / 2 + random.gauss(0, 0.5)))
        bpy.context.object.data.materials.append(random.choice(straw))


def egg(hexc):
    m = principled('shell', lin(hexc), 0.45, coat=0.15)
    ellipsoid('egg', (0, 0, 0.03), (0.045, 0.032, 0.032), m, rot=(0, math.radians(8), math.radians(25)), seg=32)


for part in ('back', 'front'):
    reset(); nest(part); shoot('nest_' + part, 0.7, 0.05, catcher=(part == 'back'))
for name, col in [('egg_rir', '#a96a40'), ('egg_orp', '#dcb98f'), ('egg_sil', '#efe4d2'), ('egg_leg', '#a7cfc8'), ('egg_bra', '#c9a07a')]:
    reset(); egg(col); shoot(name, 0.2, 0.03)
json.dump(meta, open(mp, 'w'))
print('NEST_DONE')
