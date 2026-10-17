"""Small living things for the farm map, seen from the map camera: frogs (sitting, leaping) and grass tufts.
Rendered at twice map resolution. Usage: python props_sprites.py -- OUTDIR"""
import sys, os, math, random, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled, ellipsoid
import ffcam

OUTDIR = sys.argv[sys.argv.index('--') + 1]; os.makedirs(OUTDIR, exist_ok=True)
K = 2                     # supersampling: sprite pixels per map pixel
meta = {}


def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)


def shoot(name, size_m, tz, catcher=True):
    if catcher:
        bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    px = int(size_m * ffcam.PPU * K)
    scn = bpy.context.scene
    ffcam.setup(scn, (0, 0, tz), px, px, samples=32, transparent=True)
    scn.camera.data.ortho_scale = size_m
    scn.render.filepath = os.path.join(OUTDIR, name + '.png')
    bpy.ops.render.render(write_still=True)
    ax, ay = ffcam.project((0, 0, 0), (0, 0, tz), px / K, px / K)
    meta[name] = {'px': px, 'k': K, 'anchor': [round(ax * K, 1), round(ay * K, 1)]}


# ---------------------------------------------------------------- frog (drawn larger than life so it can be seen)
def frog(leap=False):
    skin = principled('frogskin', (0.12, 0.2, 0.04), 0.35, coat=0.6)
    belly = principled('frogbelly', (0.5, 0.48, 0.3), 0.6)
    spot = principled('frogspot', (0.04, 0.07, 0.02), 0.5)
    eye_m = principled('frogeye', (0.35, 0.25, 0.04), 0.1, coat=1.0)
    pupil = principled('pupil', (0.0, 0.0, 0.0), 0.1, coat=1.0)
    S = 0.26                                        # body length in metres
    tilt = math.radians(-18 if leap else 22)        # nose up when sitting, stretched out when leaping
    z0 = 0.09 if leap else 0.0
    def P(x, z): return (x * math.cos(tilt) - z * math.sin(tilt), x * math.sin(tilt) + z * math.cos(tilt) + z0)
    bx, bz = P(0, 0.055)
    ellipsoid('body', (bx, 0, bz), (S * 0.42, S * 0.3, S * 0.2), skin, rot=(0, -tilt, 0))
    ellipsoid('belly', (bx, 0, bz - 0.02), (S * 0.38, S * 0.26, S * 0.15), belly, rot=(0, -tilt, 0))
    hx, hz = P(S * 0.36, 0.075)
    ellipsoid('head', (hx, 0, hz), (S * 0.2, S * 0.25, S * 0.13), skin, rot=(0, -tilt, 0))
    for s in (1, -1):
        ex, ez = P(S * 0.38, 0.11)
        ellipsoid('eye', (ex, s * S * 0.15, ez), (0.022, 0.022, 0.022), eye_m)
        ellipsoid('pupil', (ex + 0.012, s * S * 0.165, ez + 0.004), (0.01, 0.008, 0.012), pupil)
        for k in range(3):
            sx, sz = P(-S * 0.1 + k * 0.03, 0.09)
            ellipsoid('spot', (sx, s * (0.02 + k * 0.015), sz), (0.014, 0.012, 0.006), spot)
        if leap:      # back legs stretched out behind, front legs reaching forward
            ellipsoid('thigh', (-S * 0.55, s * S * 0.2, z0 + 0.02), (S * 0.32, 0.03, 0.025), skin, rot=(0, math.radians(-10), 0))
            ellipsoid('shin', (-S * 0.95, s * S * 0.22, z0 - 0.01), (S * 0.3, 0.022, 0.02), skin)
            ellipsoid('fore', (S * 0.55, s * S * 0.16, z0 + 0.0), (S * 0.18, 0.018, 0.016), skin, rot=(0, math.radians(25), 0))
        else:         # folded legs at the sides, front feet planted
            ellipsoid('thigh', (-S * 0.12, s * S * 0.3, 0.035), (S * 0.3, S * 0.1, 0.035), skin)
            ellipsoid('foot', (S * 0.05, s * S * 0.38, 0.008), (S * 0.18, 0.03, 0.008), skin)
            ellipsoid('fore', (S * 0.3, s * S * 0.2, 0.02), (0.02, 0.02, 0.04), skin)


# ---------------------------------------------------------------- grass tufts
def tuft(kind):
    random.seed(kind * 13 + 1)
    g1 = principled('blade1', (0.06, 0.13, 0.02), 0.55, sss=0.1)
    g2 = principled('blade2', (0.13, 0.2, 0.04), 0.55, sss=0.1)
    seed = principled('seedhead', (0.35, 0.28, 0.12), 0.8)
    n = 34 if kind < 2 else 22
    for i in range(n):
        a = random.uniform(0, math.tau); r = random.uniform(0, 0.11)
        h = random.uniform(0.22, 0.42) * (1.25 if kind == 2 else 1)
        lean = random.uniform(0.15, 0.45)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.012, radius2=0.0, depth=h,
                                        location=(math.cos(a) * r + math.cos(a) * lean * h / 2, math.sin(a) * r + math.sin(a) * lean * h / 2, h / 2 * math.cos(lean)),
                                        rotation=(-math.sin(a) * lean, math.cos(a) * lean, 0))
        o = bpy.context.object; o.scale = (1, 0.35, 1); o.data.materials.append(g1 if i % 3 else g2)
        if kind == 2 and i % 4 == 0:
            ellipsoid('seed', (math.cos(a) * (r + lean * h), math.sin(a) * (r + lean * h), h * math.cos(lean)), (0.012, 0.012, 0.04), seed, seg=8)
    if kind == 1:     # a few daisies
        petal = principled('petal', (0.85, 0.84, 0.8), 0.5); mid = principled('mid', (0.8, 0.55, 0.05), 0.5)
        for k in range(5):
            a = random.uniform(0, math.tau); r = random.uniform(0.03, 0.13); z = random.uniform(0.16, 0.28)
            ellipsoid('daisy', (math.cos(a) * r, math.sin(a) * r, z), (0.03, 0.03, 0.008), petal, seg=12)
            ellipsoid('dmid', (math.cos(a) * r, math.sin(a) * r, z + 0.006), (0.011, 0.011, 0.006), mid, seg=8)


# ---------------------------------------------------------------- ducks on the water (no ground, drawn a little larger than life)
def duck(male, dabble=False):
    S = 1.25
    body_c = (0.42, 0.42, 0.4) if male else (0.3, 0.19, 0.09)
    body = principled('dbody', body_c, 0.6); breast = principled('dbreast', (0.25, 0.08, 0.04) if male else (0.36, 0.24, 0.12), 0.6)
    head = principled('dhead', (0.02, 0.18, 0.08) if male else (0.32, 0.2, 0.1), 0.35, coat=0.6)
    tailm = principled('dtail', (0.03, 0.03, 0.035) if male else (0.25, 0.16, 0.08), 0.5)
    bill = principled('dbill', (0.75, 0.6, 0.08) if male else (0.6, 0.38, 0.12), 0.4)
    white = principled('dwhite', (0.85, 0.85, 0.82), 0.5); spec = principled('dspec', (0.08, 0.15, 0.55), 0.3, coat=0.5)
    tilt = math.radians(55 if dabble else 0)
    def P(x, z): return (x * math.cos(tilt) - z * math.sin(tilt), x * math.sin(tilt) + z * math.cos(tilt))
    def E(name, x, y, z, sc, m, rot=0):
        px, pz = P(x * S, z * S); ellipsoid(name, (px, y * S, pz), tuple(c * S for c in sc), m, rot=(0, -tilt + rot, 0))
    E('body', 0, 0, 0.05, (0.2, 0.11, 0.08), body)
    E('breast', 0.12, 0, 0.06, (0.09, 0.095, 0.075), breast)
    E('tail', -0.19, 0, 0.09, (0.07, 0.05, 0.04), tailm, rot=math.radians(-25))
    for sd in (1, -1): E('wing', -0.02, sd * 0.075, 0.09, (0.15, 0.04, 0.05), body); E('spec', -0.07, sd * 0.1, 0.085, (0.04, 0.012, 0.02), spec)
    if not dabble:
        E('neck', 0.16, 0, 0.14, (0.04, 0.04, 0.07), head)
        if male: E('ring', 0.16, 0, 0.1, (0.045, 0.045, 0.012), white)
        E('head', 0.19, 0, 0.21, (0.06, 0.045, 0.05), head)
        E('bill', 0.26, 0, 0.2, (0.05, 0.022, 0.012), bill)
        for sd in (1, -1): E('eye', 0.215, sd * 0.038, 0.225, (0.01, 0.006, 0.01), principled('deye', (0, 0, 0), 0.1, coat=1))


for male in (True, False):
    for dab in (False, True):
        reset(); duck(male, dab); shoot('duck_%s_%s' % ('m' if male else 'f', 'dab' if dab else 'swim'), 1.0, 0.1, catcher=False)
for leap in (False, True):
    reset(); frog(leap); shoot('frog_leap' if leap else 'frog_sit', 0.9, 0.06)
for k in range(3):
    reset(); tuft(k); shoot('tuft_%d' % k, 1.0, 0.2, catcher=False)
json.dump(meta, open(os.path.join(OUTDIR, 'props.json'), 'w'))
print('PROPS_DONE', meta)
