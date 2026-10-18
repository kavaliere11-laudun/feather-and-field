"""Stylized meadow: soft rolling ground, chunky grass tufts, little flowers and pebbles."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

_cache = {}


def ground_mat():
    if 'ground' in _cache: return _cache['ground']
    m = bpy.data.materials.new('meadow'); m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.95
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = 0.1
    tc = N.new('ShaderNodeTexCoord')
    big = N.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.35; big.inputs['Detail'].default_value = 3
    small = N.new('ShaderNodeTexNoise'); small.inputs['Scale'].default_value = 6.0; small.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], big.inputs[0]); L.new(tc.outputs['Object'], small.inputs[0])
    cr = N.new('ShaderNodeValToRGB'); el = cr.color_ramp.elements
    el[0].position, el[0].color = 0.35, lin('#6f9f45'); el[1].position, el[1].color = 0.65, lin('#9cc463')
    e = el.new(0.5); e.color = lin('#86b553')
    L.new(big.outputs['Fac'], cr.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'OVERLAY'; mix.inputs['Factor'].default_value = 0.25
    L.new(cr.outputs['Color'], mix.inputs['A']); L.new(small.outputs['Color'], mix.inputs['B'])
    L.new(mix.outputs['Result'], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.3; bp.inputs['Distance'].default_value = 0.01
    L.new(small.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _cache['ground'] = m; return m


def tuft_mesh(name, blades=7, h=0.09, seed=0):
    """A clump of curved, tapering blades."""
    random.seed(seed)
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    for i in range(blades):
        a = random.uniform(0, math.tau); lean = random.uniform(0.15, 0.55); hh = h * random.uniform(0.6, 1.15); w = random.uniform(0.008, 0.013)
        base = Vector((math.cos(a), math.sin(a), 0)) * random.uniform(0, 0.02)
        side = Vector((-math.sin(a), math.cos(a), 0))
        out = Vector((math.cos(a), math.sin(a), 0))
        rows = []
        segs = 4
        for k in range(segs + 1):
            t = k / segs
            c = base + out * (lean * hh * t * t) + Vector((0, 0, hh * t))
            ww = w * (1 - t) ** 0.8 + 0.0005
            rows.append((bm.verts.new(c - side * ww), bm.verts.new(c + side * ww)))
        for k in range(segs):
            bm.faces.new((rows[k][0], rows[k][1], rows[k + 1][1], rows[k + 1][0]))
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me


def flower_obj(kind, coll_parent=None):
    """kind: 'daisy', 'butter' (buttercup), 'clover' (purple)."""
    if kind == 'daisy':
        pet = mat('petal_w', '#fbf7ee', rough=0.6) if 'pw' not in _cache else _cache['pw']; _cache['pw'] = pet
        cen = mat('centre_y', '#f2b52c', rough=0.6) if 'cy' not in _cache else _cache['cy']; _cache['cy'] = cen
        parts = []
        for i in range(8):
            a = i / 8 * math.tau
            parts.append(sphere('pet', 0.012, (math.cos(a) * 0.012, math.sin(a) * 0.012, 0.035), (1.0, 0.45, 0.18), (0, 0, a), pet, seg=8, rings=6))
        parts.append(sphere('cen', 0.007, (0, 0, 0.037), (1, 1, 0.6), m=cen, seg=10, rings=6))
        stem = cyl('stem', 0.0018, 0.035, (0, 0, 0.0175), m=_stem(), verts=5, bevel=0); parts.append(stem)
        return join(parts, 'daisy')
    col = {'butter': '#f6c624', 'clover': '#b783d6'}[kind]
    key = 'f_' + kind
    m = _cache.get(key) or mat(key, col, rough=0.5, sss=0.2); _cache[key] = m
    parts = [sphere('bloom', 0.011, (0, 0, 0.045), (1, 1, 0.75), m=m, ico=1, seg=8, rings=6),
             cyl('stem', 0.0018, 0.045, (0, 0, 0.0225), m=_stem(), verts=5, bevel=0)]
    return join(parts, kind)


def _stem():
    if 'stem' not in _cache: _cache['stem'] = mat('stem', '#4f8a33', rough=0.8)
    return _cache['stem']


def blade_mat():
    if 'blade' not in _cache:
        _cache['blade'] = mat('blade', '#6db046', rough=0.7, spec=0.2, var=0.12, hue_var=0.015, sss=0.1,
                              ramp=[(0.0, '#5d8f3a'), (0.5, '#80b350'), (1.0, '#b9d877')])
    return _cache['blade']


def scatter(meshes, area, count, seed, zfun=None, scale=(0.6, 1.4), avoid=None, mat_=None):
    """area = (x0, y0, x1, y1); avoid(x, y) -> True to skip a spot."""
    random.seed(seed); objs = []
    # clumps: most tufts gather round a few centres, the rest are scattered singles
    nc = max(1, count // 9)
    centres = [(random.uniform(area[0], area[2]), random.uniform(area[1], area[3]), random.uniform(0.04, 0.16)) for _ in range(nc)]
    for i in range(count):
        if random.random() < 0.78:
            cx_, cy_, r_ = random.choice(centres); x, y = random.gauss(cx_, r_), random.gauss(cy_, r_)
        else:
            x, y = random.uniform(area[0], area[2]), random.uniform(area[1], area[3])
        if not (area[0] <= x <= area[2] and area[1] <= y <= area[3]): continue
        if avoid and avoid(x, y): continue
        me = random.choice(meshes)
        o = link(bpy.data.objects.new('sc', me)); o.location = (x, y, zfun(x, y) if zfun else 0)
        s = random.uniform(*scale); o.scale = (s, s, s); o.rotation_euler = (0, 0, random.uniform(0, math.tau))
        if mat_ and not me.materials: me.materials.append(mat_)
        objs.append(o)
    return objs


def field(scn, size=4.0, density=800, seed=1, center=(0, 0), avoid=None, flowers=0.06, pebbles=0.02, tuft_h=0.06):
    """A square meadow of size x size metres centred on center."""
    cx, cy = center
    g = box('meadow', (size, size, 0.1), (cx, cy, -0.05), m=ground_mat(), bevel=0.0)
    meshes = [tuft_mesh('tuft%d' % i, blades=random.Random(i).randint(5, 9), h=tuft_h * (0.8 + 0.2 * (i % 3)), seed=i) for i in range(6)]
    bm_ = blade_mat()
    for me in meshes: me.materials.append(bm_)
    area = (cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2)
    n = int(density * size * size / 9)
    scatter(meshes, area, n, seed, avoid=avoid)
    # flowers: linked copies of a few prototypes
    protos = [flower_obj(k) for k in ('daisy', 'daisy', 'butter', 'clover')]
    for p in protos: p.location = (0, 0, -10)
    random.seed(seed + 7)
    for i in range(int(n * flowers)):
        x, y = random.uniform(area[0], area[2]), random.uniform(area[1], area[3])
        if avoid and avoid(x, y): continue
        p = random.choice(protos); o = link(bpy.data.objects.new('fl', p.data)); o.location = (x, y, 0)
        s = random.uniform(0.8, 1.2); o.scale = (s, s, s); o.rotation_euler = (0, 0, random.uniform(0, math.tau))
    peb = mat('pebble', '#a8a39a', rough=0.8, var=0.15, bump=0.3, bump_scale=40)
    random.seed(seed + 11)
    for i in range(int(n * pebbles)):
        x, y = random.uniform(area[0], area[2]), random.uniform(area[1], area[3])
        if avoid and avoid(x, y): continue
        r = random.uniform(0.012, 0.03)
        sphere('pebble', r, (x, y, r * 0.2), (1.2, 1.0, 0.55), (0, 0, random.uniform(0, 6)), peb, ico=2, disp=0.2, seed=i)
    return g
