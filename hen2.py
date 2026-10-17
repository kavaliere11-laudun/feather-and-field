"""Feather & Field, bird model v2: a sculpted body covered in individually placed feathers, on a skeleton,
so one bird can be posed into a walk cycle, pecking, sitting and so on.
Chickens face +X, feet on the ground at the origin; same size and camera as the v1 sprites.

Usage: python hen2.py -- OUTDIR BREED SEX POSES [RES]
  POSES: comma list from stand, walk0..walk5, peck0, peck1, sit, crow, card   ('card' = the close-up portrait)
  env FARM=1 renders the farm camera (the game's view) instead of the portrait camera."""
import sys, os, math, random, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector, Matrix, kdtree
from ffbird import reset, principled, ellipsoid, comb_single, beak, eye

args = sys.argv[sys.argv.index('--') + 1:]
OUTDIR, BREED, SEX, POSES = args[0], args[1], args[2], args[3].split(',')
RES = int(args[4]) if len(args) > 4 else 512
os.makedirs(OUTDIR, exist_ok=True)
R = SEX == 'r'
scn = reset()
random.seed(7)
clamp01 = lambda v: max(0.0, min(1.0, v))
smooth = lambda a, b, v: (lambda t: t * t * (3 - 2 * t))(clamp01((v - a) / (b - a)))


def lin(c):          # sRGB colour (0-255 or 0-1 hex) to linear
    if isinstance(c, str): c = tuple(int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ====================================================================== breed colours (sRGB hex, as you'd pick them from a photo)
COL = {
    'rir_h': dict(body='#6a2410', back='#5c1f0d', hackle='#7a3014', breast='#6c2611', fluff='#8a4a2a', wingcov='#62220e',
                  sec='#5a200e', prim='#1c140f', tail='#16110e', tail_sheen=(0.25, 0.55, 0.35), dark_tip='#2a1208',
                  comb='#b3201a', leg='#cf9c34', beak='#b8893c', eye='#c4741e'),
}
COL.update({
    # Buff Orpington: golden buff all over, faintly paler at the feather edges; pinkish-white legs
    'orp_h': dict(body='#b07838', back='#a46e32', hackle='#bc8440', breast='#b47c3a', fluff='#c89656', wingcov='#a87234',
                  sec='#98642c', prim='#8e5c2a', tail='#94602c', tail_sheen=(1, 0.9, 0.7), dark_tip='#8e5c2a',
                  comb='#b3201a', leg='#e2c4ae', beak='#d9bb8c', eye='#c47a2a', edge_light=0.06),
    # Cream Legbar: soft grey with darker barring, salmon breast, cream hackle striped grey, little crest
    'leg_h': dict(body='#7f7b72', back='#77736a', hackle='#857f72', hackle_edge='#e2d7bb', breast='#a8836e', breast_edge='#8c8478',
                  fluff='#b8ad9b', wingcov='#7a766d', sec='#6c685f', prim='#5a5650', tail='#5f5b54', tail_sheen=(1, 1, 1), dark_tip='#5a5650',
                  comb='#b3201a', leg='#d3b247', beak='#d0b06a', eye='#c47a2a', mottle='#9a9488'),
    # Light Brahma: white, a black-and-white striped hackle, black tail and wing tips, feathered legs, pea comb
    'bra_h': dict(body='#cfccc4', back='#c9c6be', hackle='#26262a', hackle_edge='#dedbd4', breast='#d2cfc8', fluff='#dad7d0',
                  wingcov='#cbc8c0', sec='#c4c1ba', body_edge='#aaa79f', sec_edge='#2a2a2e', prim='#232327', prim_edge='#dcd9d2', tail='#1d1d21',
                  tail_sheen=(0.3, 0.6, 0.45), dark_tip='#3a3a3e', comb='#b3201a', leg='#d9b04a', beak='#d4ae66', eye='#c47a2a'),
})
COL.update({
    'rir_r': dict(body='#6e220c', back='#8c2e10', hackle='#b0461a', breast='#4e1a0a', fluff='#7a3a20', wingcov='#a33a14',
                  sec='#5a1e0c', prim='#1a1410', tail='#121212', tail_sheen=(0.25, 0.6, 0.4), dark_tip='#3a1206',
                  saddle='#a8421a', sickle='#141416', comb='#b81e18', leg='#d4a030', beak='#b8893c', eye='#c4741e'),
    'orp_r': dict(body='#b07838', back='#b47c3a', hackle='#c88c44', breast='#ac7436', fluff='#c89656', wingcov='#c08640',
                  sec='#98642c', prim='#8e5c2a', tail='#9a6630', tail_sheen=(1, 0.9, 0.7), dark_tip='#8e5c2a',
                  saddle='#c48a40', sickle='#a06a30', comb='#b81e18', leg='#e2c4ae', beak='#d9bb8c', eye='#c47a2a', edge_light=0.06),
    'leg_r': dict(body='#8a8478', back='#9a927f', hackle='#cfc5a8', hackle_edge='#7a756a', breast='#7a766e', fluff='#a8a090',
                  wingcov='#c9b98e', sec='#77736a', prim='#5a5650', tail='#6a665e', tail_sheen=(1, 1, 1), dark_tip='#5a5650',
                  saddle='#cbc1a4', saddle_edge='#7a756a', sickle='#d6d0c2', sickle_edge='#8a8478', mottle='#5e5a52',
                  comb='#b81e18', leg='#d3b247', beak='#d0b06a', eye='#c47a2a'),
    'bra_r': dict(body='#cfccc4', back='#d2cfc8', hackle='#26262a', hackle_edge='#dedbd4', breast='#cbc8c0', fluff='#dad7d0',
                  wingcov='#d6d3cc', sec='#c4c1ba', sec_edge='#2a2a2e', prim='#232327', prim_edge='#dcd9d2', tail='#1d1d21',
                  tail_sheen=(0.3, 0.6, 0.45), dark_tip='#3a3a3e', saddle='#2a2a2e', saddle_edge='#dedbd4', sickle='#1a1a1e',
                  comb='#b81e18', leg='#d9b04a', beak='#d4ae66', eye='#c47a2a'),
})
SHAPE = {
    'rir': dict(S=1.0, sx=1.0, sy=1.0, sz=1.0, fl=1.0, comb='single', crest=False, legfeathers=False),
    'orp': dict(S=1.06, sx=1.02, sy=1.14, sz=1.08, fl=1.25, comb='single', crest=False, legfeathers=False),
    'leg': dict(S=0.94, sx=0.98, sy=0.92, sz=0.94, fl=0.95, comb='single', crest=True, legfeathers=False),
    'bra': dict(S=1.12, sx=1.0, sy=1.06, sz=1.04, fl=1.12, comb='pea', crest=False, legfeathers=True),
}[BREED]
P = COL['%s_%s' % (BREED, SEX)]
if R: SHAPE = dict(SHAPE, S=SHAPE['S'] * 1.1)
NU = 0.08 if R else 0.0          # a rooster carries his head higher on a longer neck
DZ = -0.12                     # the finished bird sits this much lower on shorter legs

# ====================================================================== body: soft overlapping shapes, fused and smoothed
HX, HZ = 0.46 + NU * 0.2, 1.27 + NU                      # head centre
parts = [
    ellipsoid('torso', (-0.04, 0, 0.72), (0.43, 0.25, 0.26), None, rot=(0, math.radians(-6), 0)),
    ellipsoid('breast', (0.2, 0, 0.7), (0.24, 0.22, 0.24), None),
    ellipsoid('back', (-0.14, 0, 0.84), (0.34, 0.21, 0.15), None, rot=(0, math.radians(-8), 0)),
    ellipsoid('rump', (-0.37, 0, 0.87), (0.17, 0.16, 0.15), None, rot=(0, math.radians(-25), 0)),
    ellipsoid('belly', (-0.08, 0, 0.52), (0.28, 0.2, 0.14), None),
    ellipsoid('shoulders', (0.2, 0, 0.9), (0.18, 0.18, 0.12), None),
    ellipsoid('neck1', (0.31, 0, 0.98), (0.14, 0.13, 0.15), None, rot=(0, math.radians(20), 0)),
    ellipsoid('neck2', (0.39 + NU * 0.1, 0, 1.12 + NU * 0.6), (0.1, 0.095, 0.12 + NU * 0.3), None, rot=(0, math.radians(14), 0)),
    ellipsoid('head', (HX, 0, HZ), (0.075, 0.06, 0.066), None),
    ellipsoid('thighL', (0.02, 0.12, 0.47), (0.1, 0.08, 0.11), None),
    ellipsoid('thighR', (0.02, -0.12, 0.47), (0.1, 0.08, 0.11), None),
]
bpy.ops.object.select_all(action='DESELECT')
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]; bpy.ops.object.join()
body = bpy.context.object; body.name = 'body'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for typ, kw in (('REMESH', dict(mode='VOXEL', voxel_size=0.012)), ('SMOOTH', dict(factor=0.9, iterations=20))):
    m = body.modifiers.new(typ.lower(), typ)
    for k, v in kw.items(): setattr(m, k, v)
    bpy.ops.object.modifier_apply(modifier=m.name)
for v in body.data.vertices:
    w = smooth(1.02, 0.86, v.co.z)
    v.co.x = v.co.x * (1 + (SHAPE['sx'] - 1) * w); v.co.y *= 1 + (SHAPE['sy'] - 1) * w
    v.co.z = 0.7 + (v.co.z - 0.7) * (1 + (SHAPE['sz'] - 1) * w)
bpy.ops.object.shade_smooth()
skin_m = principled('skin', tuple((x + y) / 2 for x, y in zip(lin(P['body']), lin(P['back']))), 0.8)
body.data.materials.append(skin_m)

def mixc_(c1, c2):
    a, b = lin(c1), lin(c2); return tuple((x + y) / 2 for x, y in zip(a, b))


# ====================================================================== feathers
# One material for every feather: colour comes from a per-feather attribute, shape detail (rachis, barbs, a soft
# downy base and a slightly darker edge) from the card's own UVs.
def feather_material():
    m = bpy.data.materials.new('feather'); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N['Principled BSDF']
    col = N.new('ShaderNodeAttribute'); col.attribute_name = 'fcol'
    rnd = N.new('ShaderNodeAttribute'); rnd.attribute_name = 'frnd'
    uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ'); Lk(uv.outputs['UV'], sep.inputs[0])
    av = N.new('ShaderNodeMath'); av.operation = 'ABSOLUTE'; Lk(sep.outputs['Y'], av.inputs[0])
    # barbs: fine stripes angled from the rachis towards the tip
    bar = N.new('ShaderNodeMath'); bar.operation = 'MULTIPLY_ADD'; Lk(av.outputs[0], bar.inputs[0]); bar.inputs[1].default_value = 0.55; Lk(sep.outputs['X'], bar.inputs[2])
    wv = N.new('ShaderNodeMath'); wv.operation = 'MULTIPLY'; wv.inputs[1].default_value = 140.0; Lk(bar.outputs[0], wv.inputs[0])
    sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'; Lk(wv.outputs[0], sn.inputs[0])
    sb = N.new('ShaderNodeMapRange'); sb.inputs['From Min'].default_value = -1; sb.inputs['To Min'].default_value = 0.9; sb.inputs['To Max'].default_value = 1.06; Lk(sn.outputs[0], sb.inputs['Value'])
    # rachis: a thin lighter line down the middle
    ra = N.new('ShaderNodeMapRange'); ra.inputs['From Min'].default_value = 0.03; ra.inputs['From Max'].default_value = 0.08; ra.inputs['To Min'].default_value = 1.25; ra.inputs['To Max'].default_value = 1.0; Lk(av.outputs[0], ra.inputs['Value'])
    # edge and tip: a touch darker; base: paler down
    ef = N.new('ShaderNodeMapRange'); ef.inputs['From Min'].default_value = 0.42; ef.inputs['From Max'].default_value = 0.92; Lk(av.outputs[0], ef.inputs['Value'])
    col2 = N.new('ShaderNodeAttribute'); col2.attribute_name = 'fcol2'
    emix = N.new('ShaderNodeMix'); emix.data_type = 'RGBA'; Lk(ef.outputs['Result'], emix.inputs['Factor']); Lk(col.outputs['Color'], emix.inputs['A']); Lk(col2.outputs['Color'], emix.inputs['B'])
    dn = N.new('ShaderNodeMapRange'); dn.inputs['From Min'].default_value = 0.0; dn.inputs['From Max'].default_value = 0.35; dn.inputs['To Min'].default_value = 1.45; dn.inputs['To Max'].default_value = 1.0; Lk(sep.outputs['X'], dn.inputs['Value'])
    jit = N.new('ShaderNodeMapRange'); jit.inputs['To Min'].default_value = 0.86; jit.inputs['To Max'].default_value = 1.12; Lk(rnd.outputs['Fac'], jit.inputs['Value'])
    k = None
    for node in (sb, ra, dn, jit):
        if k is None: k = node.outputs['Result']; continue
        mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; Lk(k, mm.inputs[0]); Lk(node.outputs['Result'], mm.inputs[1]); k = mm.outputs[0]
    sc = N.new('ShaderNodeVectorMath'); sc.operation = 'SCALE'; Lk(emix.outputs['Result'], sc.inputs[0]); Lk(k, sc.inputs['Scale'])
    Lk(sc.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.62; b.inputs['Specular IOR Level'].default_value = 0.35
    b.inputs['Sheen Weight'].default_value = 0.35; b.inputs['Sheen Roughness'].default_value = 0.4
    # glossy feathers (tails) carry a coloured coat through the 'fgloss' attribute
    gl = N.new('ShaderNodeAttribute'); gl.attribute_name = 'fgloss'
    Lk(gl.outputs['Fac'], b.inputs['Coat Weight']); b.inputs['Coat Roughness'].default_value = 0.25
    gc = N.new('ShaderNodeAttribute'); gc.attribute_name = 'fsheen'; Lk(gc.outputs['Color'], b.inputs['Coat Tint'])
    return m


FEATHERS = []          # (verts list, col, gloss, sheen, bone or None)


def add_feather(base, axis, normal, L, W, col, lift=0.18, curl=0.12, cup=0.25, tip=0.55, bone=None, gloss=0.0, sheen=(1, 1, 1), shape=1.0, edge=None, bend=None):
    """A feather card lying on the body: starts at base, runs along axis (tangent), outer face along normal.
    lift tilts it off the body; curl bends the tip back down; cup curves it across."""
    a = (axis * math.cos(lift) + normal * math.sin(lift)).normalized()
    n = (normal - a * normal.dot(a)).normalized()
    w = n.cross(a).normalized()
    rows, cols = (6 if L < 0.28 else 16), (-1.0, -0.5, 0.0, 0.5, 1.0)
    vs = []
    for i in range(rows + 1):
        s = i / rows
        if shape >= 1:      # rounded contour feather
            half = W * 0.5 * (0.35 + 0.65 * math.sin(math.pi * min(1.0, s / (2 * tip))) if s < tip else W * 0.5 * math.sqrt(max(0.0, 1 - ((s - tip) / (1 - tip)) ** 2)))
        else:               # pointed hackle / saddle feather
            half = W * 0.5 * math.sin(math.pi * min(1.0, s * 1.15)) ** 0.8 * (1 - s) ** 0.35
        half = max(half, W * 0.03)
        c = base + a * (L * s) - n * (curl * L * s * s) + (bend * (L * s * s) if bend is not None else Vector())
        row = []
        for v in cols:
            row.append((c + w * (half * v) - n * (cup * half * v * v), (s, v)))
        vs.append(row)
    c1 = lin(col) if isinstance(col, str) else col
    if edge is None:            # default edge: a touch darker, or paler for laced breeds
        el = P.get('edge_light', 0); c2 = tuple(min(1, x * (1 + el * 4)) if el else x * 0.78 for x in c1)
    else: c2 = lin(edge) if isinstance(edge, str) else edge
    FEATHERS.append((vs, c1, gloss, sheen, bone, c2))


# --- where each kind of feather goes: regions from the rest-pose body
def region(p, nrm):
    neck = smooth(0.86, 0.98, p.z) * smooth(0.18, 0.3, p.x)
    head = clamp01(1 - (p - Vector((HX, 0, HZ))).length / 0.1) > 0
    breast = smooth(0.35, 0.6, nrm.x) * smooth(0.45, 0.6, p.z) * (1 - neck)
    back = smooth(0.25, 0.6, nrm.z) * smooth(0.25, 0.05, p.x) * (1 - neck)
    under = smooth(0.58, 0.45, p.z) * (1 - breast)
    return head, neck, breast, back, under


def flow(p, nrm, neck, breast, under):
    """Feathers point back and down: down the neck, down the breast, back along the body."""
    d_body = Vector((-1.0, 0.0, -0.32)) + Vector((0, 0.25 * (1 if p.y > 0 else -1), 0)) * smooth(0.3, 0.8, abs(nrm.y))
    d_neck = (Vector((0.12, 0, 0.82)) - p); d_neck.y = 0; d_neck = d_neck.normalized() if d_neck.length > 1e-6 else Vector((0, 0, -1))
    d_breast = Vector((-0.15, 0, -1.0))
    d_under = Vector((-0.9, 0, -0.4))
    d = d_body * (1 - neck) * (1 - breast) * (1 - under) + d_neck * neck + d_breast * breast * (1 - neck) + d_under * under
    t = d - nrm * d.dot(nrm)
    return t.normalized() if t.length > 1e-6 else Vector((-1, 0, 0))


def sample_surface(o, count):
    me = o.data; me.calc_loop_triangles()
    tris = [(t, t.area) for t in me.loop_triangles]
    total = sum(a for _, a in tris); acc = []; s = 0
    for t, a in tris: s += a; acc.append(s)
    import bisect
    pts = []
    for _ in range(count):
        r = random.random() * total; t = tris[bisect.bisect_left(acc, r)][0]
        u, v = random.random(), random.random()
        if u + v > 1: u, v = 1 - u, 1 - v
        a, b, c = (me.vertices[i].co for i in t.vertices)
        p = a + (b - a) * u + (c - a) * v
        pts.append((p, t.normal.copy()))
    return pts


def mixc(c1, c2, t):
    a, b = lin(c1), lin(c2)
    return tuple(x + (y - x) * t for x, y in zip(a, b))


# contour feathers all over: smaller on the head and neck, larger on the body
EYE = Vector((HX + 0.045, 0.055, HZ + 0.005))
for p, nrm in sample_surface(body, 4600):
    head, neck, breast, back, under = region(p, nrm)
    if p.x > HX + 0.025 and abs(p.z - HZ) < 0.06: continue                    # bare face round the eye and beak
    if p.z < 0.36: continue                                                    # nothing under the thighs
    edge = None; fl = SHAPE['fl']
    if head:
        L, W, col, shape = 0.035, 0.03, P.get('head', P['hackle'] if 'hackle_edge' not in P else P['hackle_edge']), 1
    elif neck > 0.5 and R:
        L, W, shape = (0.17 + 0.07 * random.random()) * fl, 0.038, 0
        col = mixc(P['hackle'], P['dark_tip'], 0.12 * random.random()); edge = P.get('hackle_edge')
        d = flow(p, nrm, neck, breast, under)
        add_feather(p - d * L * 0.25 + nrm * 0.003, d, nrm, L, W, col, lift=0.05, curl=0.12, cup=0.25, shape=0, edge=edge, gloss=0.3, sheen=(1, 0.9, 0.75))
        continue
    elif R and p.x < -0.08 and p.z > 0.76 and nrm.z > 0.1:          # saddle: long pointed feathers falling over the back and sides
        L = (0.16 + 0.07 * random.random()) * fl
        d = Vector((-1, 0.35 * (1 if p.y > 0 else -1), -0.75)); d = (d - nrm * d.dot(nrm)).normalized()
        add_feather(p - d * L * 0.25 + nrm * 0.003, d, nrm, L, 0.04, mixc(P['saddle'], P['back'], 0.2 * random.random()), lift=0.05, curl=0.1, cup=0.25,
                    shape=0, edge=P.get('saddle_edge'), gloss=0.3, sheen=(1, 0.9, 0.75))
        continue
    elif neck > 0.5:
        L, W, shape = (0.10 + 0.04 * random.random()) * fl, 0.04, 0
        col = mixc(P['hackle'], P['dark_tip'], 0.18 * random.random()); edge = P.get('hackle_edge')
    else:
        L = (0.09 + 0.05 * random.random() + 0.03 * back) * fl
        W = L * 0.62; shape = 1
        col = mixc(P['body'], P['back'], back) if breast < 0.5 else lin(P['breast'])
        if breast >= 0.5: edge = P.get('breast_edge')
        if 'mottle' in P and breast < 0.5 and random.random() < 0.45: col = mixc(P['body'], P['mottle'], 0.6 + 0.4 * random.random())
        if under > 0.5: L *= 1.15 * fl; W *= 1.1; col = mixc(P['body'], P['fluff'], 0.45)
    d = flow(p, nrm, neck, breast, under)
    add_feather(p - d * L * 0.35 + nrm * 0.003, d, nrm, L, W, col, lift=(0.1 if not neck > 0.5 else 0.07) * (1 + (fl - 1) * 1.5),
                curl=0.28, cup=0.32, shape=shape, edge=edge)
if SHAPE['crest']:      # a small swept-back crest behind the comb
    for i in range(60):
        a = random.uniform(-0.9, 0.9); pnt = Vector((HX - 0.04 + 0.03 * random.random(), math.sin(a) * 0.035, HZ + 0.045 + 0.01 * random.random()))
        add_feather(pnt, Vector((-0.8, math.sin(a) * 0.3, 0.45)).normalized(), Vector((math.sin(a) * 0.4, math.sin(a), 0.6)).normalized(),
                    0.07 + 0.03 * random.random(), 0.03, mixc(P['hackle'], P['body'], 0.5), lift=0.3, curl=0.2, cup=0.2, shape=0, edge=P.get('hackle_edge'))

# ====================================================================== wings, folded on the sides
for s_ in (1, -1):
    sh = Vector((0.18, s_ * 0.235 * SHAPE['sy'] * (1 + (SHAPE['fl'] - 1) * 0.5), 0.83))      # shoulder
    back_dir = Vector((-1, 0, -0.12)).normalized()
    out = Vector((0, s_, 0.25)).normalized()
    # primaries first (underneath), then secondaries, then rows of coverts on top: later feathers lie over earlier ones
    for k in range(5):
        base = sh + back_dir * (0.2 + k * 0.03) + Vector((0, 0, -0.13 - k * 0.004)) + out * 0.004
        add_feather(base, (back_dir + Vector((0, 0, -0.1))).normalized(), out, 0.22, 0.06, mixc(P['sec'], P['prim'], 0.55), lift=0.0, curl=0.02, cup=0.1, tip=0.8, edge=P.get('prim_edge'))
    for k in range(9):
        base = sh + back_dir * (0.02 + k * 0.03) + Vector((0, 0, -0.1 - k * 0.004)) + out * (0.012 + k * 0.0006)
        add_feather(base, (back_dir + Vector((0, 0, -0.16))).normalized(), out, 0.27 - k * 0.008, 0.085, mixc(P['sec'], P['wingcov'], 0.3 * random.random()), lift=0.0, curl=0.03, cup=0.12, tip=0.75, edge=P.get('sec_edge'))
    for k in range(70):       # coverts: scattered, overlapping, finer towards the shoulder
        u, v = random.random(), random.random()                 # u along the wing, v from its lower edge up
        L = 0.07 + 0.08 * (1 - v) * (0.8 + 0.4 * random.random())
        base = sh + back_dir * (u * 0.3) + Vector((0, 0, -0.07 + v * 0.1 - 0.02 * u)) + out * (0.022 + 0.01 * v + 0.004 * random.random())
        d = (back_dir + Vector((0, 0, -0.45 - 0.2 * random.random()))).normalized()
        add_feather(base, d, out, L, L * 0.8, mixc(P['wingcov'], P['body'], 0.6 * random.random()), lift=0.02, curl=0.14, cup=0.3)

# ====================================================================== tail: two fans of glossy black feathers rising behind, with coverts
TB = Vector((-0.38 * SHAPE['sx'], 0, 0.95))
for s_ in (1, -1):
    for i in range(10):
        ang = math.radians(36 + i * 3.2)
        ax = Vector((-math.cos(ang), s_ * 0.16, math.sin(ang))).normalized()
        nrm = Vector((0, s_, 0.08)).normalized()
        add_feather(TB + Vector((0.02 - i * 0.003, s_ * (0.006 + i * 0.003), -0.02 + i * 0.003)), ax, nrm, 0.3 - abs(i - 5) * 0.006, 0.15,
                    mixc(P['tail'], P['back'], 0.3 + 0.15 * random.random()), lift=0.0, curl=0.04, cup=0.05, tip=0.62, bone='tail', gloss=0.25, sheen=P['tail_sheen'])
    for i in range(12):
        ang = math.radians(16 + i * 3.6)
        ax = Vector((-math.cos(ang), s_ * 0.12, math.sin(ang))).normalized()
        nrm = Vector((0, s_, 0.25)).normalized()
        add_feather(TB + Vector((0.11 - i * 0.01, s_ * (0.04 + i * 0.004), -0.07 + i * 0.007)), ax, nrm, 0.17 + 0.008 * i, 0.11,
                    mixc(P['back'], P['tail'], 0.04 * i * random.random()), lift=0.0, curl=0.14, cup=0.25, bone='tail')

if R:
    for s_ in (1, -1):
        for j, (L, ang, bz) in enumerate([(0.86, 78, 0.78), (0.8, 75, 0.79), (0.74, 72, 0.8), (0.68, 69, 0.81), (0.62, 66, 0.82), (0.56, 62, 0.84), (0.5, 58, 0.85), (0.44, 54, 0.85), (0.4, 50, 0.85)]):
            a_ = math.radians(ang)
            ax = Vector((-math.cos(a_), s_ * (0.04 + j * 0.02), math.sin(a_))).normalized()
            add_feather(TB + Vector((0.05 - j * 0.007, s_ * (0.02 + j * 0.0045), 0.03 - j * 0.011)), ax, Vector((0, s_, 0.05)).normalized(), L * SHAPE['fl'] ** 0.5, 0.11 - j * 0.0035,
                        mixc(P['sickle'], P['tail'], 0.2 * random.random()), lift=0.0, curl=0.0, cup=0.1, tip=0.82, shape=1, bone='tail',
                        gloss=0.55, sheen=P['tail_sheen'], edge=P.get('sickle_edge'), bend=Vector((-0.5, 0, -bz)))

if SHAPE['legfeathers']:
    for s_, sd in ((1, 'L'), (-1, 'R')):
        top, bot = Vector((-0.04, s_ * 0.1, 0.22 - DZ)), Vector((0.02, s_ * 0.1, 0.06 - DZ))      # (the plumage is lowered by DZ later)
        for i in range(26):
            t = random.random(); pnt = top.lerp(bot, t) + Vector((0, s_ * 0.022, 0))
            add_feather(pnt, Vector((0.15, s_ * 0.5, -1)).normalized(), Vector((0, s_, 0.1)).normalized(), 0.07 + 0.03 * t, 0.045,
                        mixc(P['fluff'], P['body'], 0.5), lift=0.25, curl=0.1, cup=0.25, bone='shank.' + sd)

# ====================================================================== build the plumage mesh
bm = bmesh.new()
uvl = bm.loops.layers.uv.new('UVMap')
fcol = bm.verts.layers.float_color.new('fcol'); fcol2 = bm.verts.layers.float_color.new('fcol2'); frnd = bm.verts.layers.float.new('frnd')
fgl = bm.verts.layers.float.new('fgloss'); fsh = bm.verts.layers.float_color.new('fsheen')
owner = []          # feather index per vertex
for fi, (rows, col, gloss, sheen, bone, col2) in enumerate(FEATHERS):
    r = random.random(); grid = []
    for row in rows:
        g = []
        for co, uv in row:
            v = bm.verts.new(co); v[fcol] = (*col, 1); v[fcol2] = (*col2, 1); v[frnd] = r; v[fgl] = gloss; v[fsh] = (*sheen, 1); g.append((v, uv)); owner.append(fi)
        grid.append(g)
    for i in range(len(grid) - 1):
        for j in range(len(grid[i]) - 1):
            quad = (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])
            f = bm.faces.new([q[0] for q in quad]); f.smooth = True
            for loop, q in zip(f.loops, quad): loop[uvl].uv = q[1]
me = bpy.data.meshes.new('plumage'); bm.to_mesh(me); bm.free()
plum = bpy.data.objects.new('plumage', me); bpy.context.collection.objects.link(plum)
plum.data.materials.append(feather_material())
sol = plum.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = 0.003; sol.offset = 0
print('FEATHERS', len(FEATHERS), len(me.vertices), flush=True)

# ====================================================================== head details: face, comb, wattles, beak, eyes
red = principled('comb', lin(P['comb']), 0.42, sss=0.35)
face_m = principled('face', tuple(c * 0.88 for c in lin(P['comb'])), 0.5, sss=0.3)
beak_m = principled('beak', lin(P['beak']), 0.32, coat=0.3)
leg_m = principled('legs', lin(P['leg']), 0.5)
head_parts = [ellipsoid('face', (HX + 0.05, 0, HZ - 0.012), (0.045, 0.058, 0.044), face_m)]
if SHAPE['comb'] == 'pea':
    for i in range(3):
        head_parts.append(ellipsoid('pea', (HX - 0.02 + i * 0.03, 0, HZ + 0.06 - i * 0.008), (0.022, 0.016 if i == 1 else 0.011, 0.012), red, seg=16))
else:
    head_parts.append(comb_single('comb', red, base_len=0.15 if not R else 0.2, height=0.07 if not R else 0.12, points=5, loc=(HX - 0.06, 0, HZ + 0.052), thick=0.018))
for s in (1, -1):
    head_parts.append(ellipsoid('wattle', (HX + 0.086, s * 0.014, HZ - 0.07), (0.02, 0.01, 0.036) if not R else (0.026, 0.011, 0.062), red, seg=20))
    head_parts.append(ellipsoid('lobe', (HX + 0.008, s * 0.062, HZ - 0.035), (0.014, 0.006, 0.018), red, seg=16))
    head_parts.append(eye((HX + 0.062, s * 0.054, HZ + 0.006), lin(P['eye']), r=0.017))
head_parts.append(beak('beak', beak_m, (HX + 0.108, 0, HZ - 0.012), length=0.075, radius=0.024, hook=0.017, tilt=8))
for o in list(bpy.data.objects):
    if o.name.startswith(('pupil', 'eye')) and o not in head_parts: head_parts.append(o)

# ====================================================================== sit the bird a little lower on shorter legs
for o in [body, plum] + head_parts:
    if o.parent is None: o.location.z += DZ
bpy.ops.object.select_all(action='DESELECT')
for o in [body, plum]: o.select_set(True)
bpy.context.view_layer.objects.active = body; bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

# ====================================================================== skeleton
arm_d = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm_d); bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
EB = arm_d.edit_bones


def bone(name, h, t, parent=None, deform=True):
    b = EB.new(name); b.head = h; b.tail = t; b.use_deform = deform
    if parent: b.parent = EB[parent]
    return b


bone('root', (0, 0, 0), (0, 0, 0.2), deform=False)
bone('body', (-0.12, 0, 0.66 + DZ), (0.22, 0, 0.78 + DZ), 'root')
bone('neck1', (0.26, 0, 0.9 + DZ), (0.36, 0, 1.04 + DZ), 'body')
bone('neck2', (0.36, 0, 1.04 + DZ), (0.42 + NU * 0.2, 0, 1.2 + DZ + NU), 'neck1')
bone('head', (0.42 + NU * 0.2, 0, 1.2 + DZ + NU), (0.57 + NU * 0.2, 0, 1.25 + DZ + NU), 'neck2')
bone('tail', (-0.3, 0, 0.9 + DZ), (-0.52, 0, 1.06 + DZ), 'body')
for s, sd in ((1, 'L'), (-1, 'R')):
    bone('thigh.' + sd, (0.04, s * 0.1, 0.5 + DZ), (-0.04, s * 0.1, 0.22), 'body')
    bone('shank.' + sd, (-0.04, s * 0.1, 0.22), (0.02, s * 0.1, 0.035), 'thigh.' + sd)
bpy.ops.object.mode_set(mode='OBJECT')

# skin: body by automatic weights; each feather follows the body under its base, the tail feathers the tail bone
body.parent = rig; bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.parent_set(type='ARMATURE_AUTO')
kd = kdtree.KDTree(len(body.data.vertices))
for v in body.data.vertices: kd.insert(v.co, v.index)
kd.balance()
gname = {g.index: g.name for g in body.vertex_groups}
pg = {}
for vg in body.vertex_groups: pg[vg.name] = plum.vertex_groups.new(name=vg.name)
if 'tail' not in pg: pg['tail'] = plum.vertex_groups.new(name='tail')
vstart = 0
for fi, (rows, col, gloss, sheen, bonen, col2) in enumerate(FEATHERS):
    nv = len(rows) * len(rows[0]); idx = list(range(vstart, vstart + nv)); vstart += nv
    if bonen:
        if bonen not in pg: pg[bonen] = plum.vertex_groups.new(name=bonen)
        pg[bonen].add(idx, 1.0, 'REPLACE'); continue
    root = rows[0][2][0]
    _, vi, _ = kd.find(root)
    for g in body.data.vertices[vi].groups:
        if g.weight > 0.01: pg[gname[g.group]].add(idx, g.weight, 'REPLACE')
plum.parent = rig; mod = plum.modifiers.new('rig', 'ARMATURE'); mod.object = rig
for o in head_parts:
    if o.parent is None:
        mw = o.matrix_world.copy(); o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = 'head'; o.matrix_world = mw

# legs: scaled shank and toes, following the shank bones; feet planted by IK targets
targets = {}
legobjs = []
for s, sd in ((1, 'L'), (-1, 'R')):
    tgt = bpy.data.objects.new('foot.' + sd, None); bpy.context.collection.objects.link(tgt)
    tgt.location = (0.02, s * 0.1, 0.035); targets[sd] = tgt
    pb = rig.pose.bones['shank.' + sd]
    ik = pb.constraints.new('IK'); ik.target = tgt; ik.chain_count = 2
    pole = bpy.data.objects.new('pole.' + sd, None); bpy.context.collection.objects.link(pole); pole.location = (-0.6, s * 0.1, 0.35)
    ik.pole_target = pole; ik.pole_angle = math.radians(0)
    # shank: a tapered tube with a scaled look, bound to the shank bone
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.027, depth=0.22, location=(0, 0, 0))
    sk = bpy.context.object; sk.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legobjs.append(sk)
    for v in sk.data.vertices:
        t = (v.co.z + 0.11) / 0.22; v.co.x *= 0.8 + 0.25 * t; v.co.y *= 0.8 + 0.25 * t
    a_, b_ = Vector((-0.04, s * 0.1, 0.25)), Vector((0.02, s * 0.1, 0.035))
    sk.matrix_world = Matrix.Translation((a_ + b_) / 2) @ (b_ - a_).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    mw = sk.matrix_world.copy(); sk.parent = rig; sk.parent_type = 'BONE'; sk.parent_bone = 'shank.' + sd; sk.matrix_world = mw
    # toes follow the foot target, so a planted foot stays planted
    for ang, L in [(0, 0.14), (32, 0.11), (-32, 0.11), (180, 0.06)]:
        a = math.radians(ang)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.014, radius2=0.007, depth=L, location=(0.02 + math.cos(a) * L / 2, s * 0.1 + math.sin(a) * L / 2, 0.012), rotation=(0, math.radians(90), a))
        t = bpy.context.object; t.data.materials.append(leg_m); bpy.ops.object.shade_smooth(); legobjs.append(t)
        mw = t.matrix_world.copy(); t.parent = tgt; t.matrix_world = mw

# ====================================================================== poses
REST = {'root': Vector((0, 0, 0))}


from mathutils import Quaternion
PITCH, ROLL, YAWV = Vector((0, 1, 0)), Vector((1, 0, 0)), Vector((0, 0, 1))


def turn(pb, axis, deg):
    """Rotate a bone about a world axis (through its own head): PITCH + bends forward/down, ROLL tips sideways."""
    rest = pb.bone.matrix_local.to_3x3()
    q = Quaternion((rest.inverted() @ axis).normalized(), math.radians(deg))
    pb.rotation_quaternion = q @ pb.rotation_quaternion


def shift(pb, v):
    pb.location = pb.bone.matrix_local.to_3x3().inverted() @ Vector(v)


# the head can be steered to a point in space (for the walking head-bob): IK on the neck, off unless a pose uses it
headtgt = bpy.data.objects.new('headtgt', None); bpy.context.collection.objects.link(headtgt)
hik = rig.pose.bones['neck2'].constraints.new('IK'); hik.target = headtgt; hik.chain_count = 2; hik.influence = 0.0
HEAD_TIP = rig.data.bones['neck2'].tail_local.copy()          # the top of the neck: the head rides on it, kept level
WALK_N = 8
TURN_DEG = {'turn1': -22.67, 'turn2': -45.33, 'turn3': -68.0}      # a third, two thirds, and facing the camera


def pose(name):
    """Set the skeleton for one named pose.
    walk0..walk7: one full stride; peck0..2: down, beak on the ground, back up; look1/look2: eyeing something sideways;
    scratch0/1: raking the ground with a foot; sit: on the nest; crow."""
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    for sd, s in (('L', 1), ('R', -1)):
        targets[sd].location = (0.02, s * 0.1, 0.035); targets[sd].rotation_euler = (0, 0, 0); targets[sd].scale = (1, 1, 1)
    hik.influence = 0.0; rig.data.bones['head'].use_inherit_rotation = True
    B = rig.pose.bones
    for o in legobjs: o.hide_render = name == 'sit'          # sitting: legs folded away under her
    # turning round: the whole bird swings to face the camera (the game mirrors these for the second half of the turn)
    size.rotation_euler = (0, 0, math.radians(TURN_DEG.get(name, 0.0)))
    if name.startswith('walk'):
        ph = int(name[4:]) / WALK_N
        # body: up at the middle of each step, leaning onto the standing leg, tail swinging the other way
        shift(B['body'], (0, 0, -0.012 + 0.012 * math.cos(4 * math.pi * (ph - 0.3))))
        lean = -4.5 * math.sin(2 * math.pi * (ph - 0.05))
        turn(B['body'], ROLL, lean); turn(B['body'], PITCH, 4); turn(B['body'], YAWV, 2.5 * math.sin(2 * math.pi * ph))
        turn(B['tail'], ROLL, -lean * 1.4)
        # head bob: held still in space while the body walks on under it (so it slides back), then darted forward
        hb = (ph * 2 + 0.15) % 1.0
        dx = 0.065 - 0.13 * (hb / 0.68) if hb < 0.68 else -0.065 + 0.13 * smooth(0.68, 1.0, hb)
        headtgt.location = HEAD_TIP + Vector((dx, 0, -0.008 if hb >= 0.68 else 0.0)); hik.influence = 1.0
        rig.data.bones['head'].use_inherit_rotation = False; turn(B['head'], PITCH, 8)      # head held level, beak a touch down
        for sd, s, off in (('L', 1, 0.0), ('R', -1, 0.5)):
            q = (ph + off) % 1.0
            if q < 0.62:      # planted: the foot stays put on the ground while the body passes over it
                x = 0.11 - 0.24 * (q / 0.62); z = 0.035; curl = 0.0; pitch = 0.0
            else:             # picked up high with the toes curled, swung forward, toes opening to land
                k = (q - 0.62) / 0.38; x = -0.13 + 0.24 * smooth(0, 1, k)
                z = 0.035 + 0.12 * math.sin(math.pi * k) ** 0.8
                curl = math.sin(math.pi * min(1.0, k * 1.25)); pitch = 0.9 * math.sin(math.pi * k) - 0.15 * smooth(0.75, 1.0, k)
            targets[sd].location = (x + 0.02, s * 0.1, z)
            targets[sd].rotation_euler = (0, pitch, 0); targets[sd].scale = (1 - 0.45 * curl, 1 - 0.5 * curl, 1)
    elif name.startswith('peck'):
        k = int(name[4:])
        body, n1, n2, hd = [(14, 26, 30, 14), (30, 48, 26, 24), (18, 30, 26, 4)][k]
        turn(B['body'], PITCH, body); turn(B['neck1'], PITCH, n1); turn(B['neck2'], PITCH, n2); turn(B['head'], PITCH, hd)
        if k == 2: turn(B['head'], ROLL, -14); turn(B['head'], YAWV, -12)          # coming up, a little tilt as she swallows
        turn(B['tail'], PITCH, -6 * (k == 1))
    elif name.startswith('face'):        # close-up: turning the head round to look at you, then cocking it
        k = int(name[4:])
        ny, hy, roll, pitch = [(0, 0, 0, 0), (-9, -24, 4, -2), (-18, -46, 6, -4), (-18, -44, -16, -2)][k]
        turn(B['neck2'], YAWV, ny); turn(B['head'], YAWV, hy); turn(B['head'], ROLL, roll); turn(B['head'], PITCH, pitch)
        turn(B['neck1'], PITCH, -3 * (k > 0))
    elif name.startswith('look'):        # chickens look with one eye: the head turns and tilts
        side = -1 if name == 'look1' else 1
        turn(B['neck2'], YAWV, 14 * side); turn(B['head'], YAWV, 34 * side); turn(B['head'], ROLL, 16 * side)
        turn(B['neck1'], PITCH, -5 if side < 0 else 4); turn(B['body'], PITCH, 2)
    elif name.startswith('scratch'):     # raking the ground: one foot forward, then dragged back hard
        back = name == 'scratch1'
        turn(B['body'], PITCH, 9 if back else 6); turn(B['neck1'], PITCH, 22); turn(B['neck2'], PITCH, 10); turn(B['head'], PITCH, 20)
        shift(B['body'], (0, 0, -0.02))
        targets['R'].location = (-0.17, -0.11, 0.04) if back else (0.12, -0.1, 0.075)
        targets['R'].rotation_euler = (0, -0.35 if back else 0.5, 0)
        targets['L'].location = (0.03, 0.1, 0.035)
    elif name == 'sit':
        shift(B['body'], (0, 0, -0.24)); turn(B['body'], PITCH, 2)
        B['body'].scale = (1.06, 1.0, 1.06)
        turn(B['neck1'], PITCH, -6)
        for sd, s in (('L', 1), ('R', -1)): targets[sd].location = (0.0, s * 0.1, 0.16)        # legs tucked up under her
    elif name == 'crow':
        turn(B['body'], PITCH, -18)
        turn(B['neck1'], PITCH, -14); turn(B['neck2'], PITCH, -20); turn(B['head'], PITCH, -30)
    bpy.context.view_layer.update()


# ====================================================================== breed size: everything scaled from the feet
size = bpy.data.objects.new('size', None); bpy.context.collection.objects.link(size)
for o in [rig, headtgt] + list(targets.values()) + [bpy.data.objects['pole.L'], bpy.data.objects['pole.R']]:
    o.parent = size
size.scale = (SHAPE['S'],) * 3

# ====================================================================== camera, light and render (same framing as the v1 sprites)
from ffbird import stage
os.environ.setdefault('CAMX', '-0.12' if R else '0.08')
first = True
for name in POSES:
    pose('stand' if name == 'card' else name)
    out = os.path.join(OUTDIR, '%s_%s_%s.png' % (name, BREED, SEX))
    t0 = time.time()
    if first:
        stage(scn, out, res=RES, ortho=2.4 if R else 2.05, samples=int(os.environ.get('SAMPLES', 32)), center_z=0.86 if R else 0.8, cam_h=1.6 if R else 1.55)
        scn.cycles.transparent_max_bounces = 16; first = False
    else:
        scn.render.filepath = out; bpy.ops.render.render(write_still=True)
    print('POSE', name, round(time.time() - t0, 1), flush=True)
print('HEN2_DONE')
