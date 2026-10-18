"""A stylized apple tree: smooth branching trunk, soft leafy clumps, shiny apples (and a few in the grass).
Run directly for a close-up: python tree.py [samples]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

_M = {}


def M():
    if _M: return _M
    _M.update(
        bark=mat('bark', '#7a5236', rough=0.85, grain=0.45, grain_scale=(30, 30, 2.5), var=0.05),
        apple=mat('apple', '#d23a2c', rough=0.28, spec=0.55, coat=0.4, var=0.12, hue_var=0.02, ramp=[(0.0, '#b02a22'), (0.6, '#d8402e'), (1.0, '#e9a13c')]),
        stalk=mat('stalk', '#5b3c22', rough=0.8),
    )
    return _M


def leaf_mat(tag, top='#a8d461', mid='#6fae45', low='#3f7a33'):
    """Soft foliage: darker underneath, sunlit on top, with leaf-cluster bumps and a little light shining through."""
    key = 'leaf_' + tag
    if key in _M: return _M[key]
    m = mat(key, mid, rough=0.75, spec=0.2, var=0.1, hue_var=0.02, sss=0.12, ramp=[(0.0, low), (0.55, mid), (1.0, top)])
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 16.0
    L.new(tc.outputs['Object'], vo.inputs['Vector'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.9; bp.inputs['Distance'].default_value = 0.02
    L.new(vo.outputs['Distance'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    _M[key] = m; return m


def trunk(name, nodes, edges, radii, m, parent=None):
    """A smooth trunk from a branching skeleton (skin + subdivision)."""
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in nodes], edges, []); me.update()
    o = link(bpy.data.objects.new(name, me))
    sk = o.modifiers.new('skin', 'SKIN'); sk.use_smooth_shade = True
    for i, r in enumerate(radii):
        o.data.skin_vertices[0].data[i].radius = (r, r)
    o.data.skin_vertices[0].data[0].use_root = True
    subsurf(o, 2); setmat(o, m)
    if parent: o.parent = parent
    return o


def build(loc=(0, 0, 0), seed=2, scale=1.0, apples=26, leaves='summer'):
    random.seed(seed); m = M()
    root = empty('tree', loc, (0, 0, random.uniform(0, math.tau)))
    # skeleton: trunk with a gentle lean, three main limbs, little root flares
    N = [(0, 0, 0), (0.03, 0.0, 0.36), (0.05, 0.02, 0.62),
         (0.42, 0.08, 0.95), (-0.36, 0.18, 0.98), (0.04, -0.38, 1.02), (0.08, 0.06, 1.2),
         (0.17, 0.0, 0.03), (-0.12, 0.12, 0.03), (-0.04, -0.15, 0.03)]
    E = [(0, 1), (1, 2), (2, 3), (2, 4), (2, 5), (2, 6), (0, 7), (0, 8), (0, 9)]
    Rr = [0.12, 0.09, 0.075, 0.045, 0.045, 0.04, 0.05, 0.035, 0.035, 0.035]
    trunk('trunk', N, E, Rr, m['bark'], root)
    # canopy: overlapping lumpy clumps on an ellipsoid shell, plus a core
    lm = leaf_mat(leaves) if leaves == 'summer' else leaf_mat(leaves, '#e6c25a', '#c98a3a', '#8a4f2a')
    C = Vector((0.04, 0.02, 1.36))
    clumps = [(C, 0.5)]
    for i in range(22):                       # puffs all round a wide dome: a cauliflower outline
        a = i * 2.39996 + random.uniform(-0.15, 0.15); u = (i + 0.5) / 22
        el = math.asin(-0.45 + 1.3 * u) if -1 < -0.45 + 1.3 * u < 1 else 0.9
        d = Vector((math.cos(a) * math.cos(el) * 0.68, math.sin(a) * math.cos(el) * 0.68, math.sin(el) * 0.48))
        clumps.append((C + d, random.uniform(0.2, 0.3)))
    shells = []
    for i, (c, r) in enumerate(clumps):
        o = sphere('clump', r, tuple(c), (1, 1, 0.88), m=lm, ico=4, disp=0.16, disp_scale=1.4, seed=seed * 10 + i, parent=root)
        subsurf(o, 1)
        shells.append((c, r))
    # a fringe of small leaves on the outer puffs breaks up the outline
    lf = bpy.data.meshes.new('leaf'); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * 0.03, v.co.y * 0.016, v.co.z * 0.004))
    bm.to_mesh(lf); bm.free(); lf.materials.append(lm)
    for p in lf.polygons: p.use_smooth = True
    for k in range(700):
        c, r = random.choice(shells[1:])
        d = Vector((random.gauss(0, 1), random.gauss(0, 1), random.gauss(0, 1) * 0.9)).normalized()
        if d.z < -0.5: continue
        p = c + Vector((d.x * r, d.y * r, d.z * r * 0.88)) * random.uniform(0.98, 1.06)
        if (p - C).length < 0.55: continue
        o = link(bpy.data.objects.new('leaf', lf)); o.parent = root; o.location = p
        o.rotation_euler = (d.to_track_quat('Z', 'X').to_euler()); o.rotation_euler.rotate_axis('Z', random.uniform(0, 6.28))
        o.rotation_euler.rotate_axis('X', random.uniform(-0.6, 0.6))
        sc_ = random.uniform(0.8, 1.3); o.scale = (sc_, sc_, sc_)
    # apples sitting on the outside of the canopy
    for k in range(apples):
        c, r = random.choice(shells[1:])
        d = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.9, 0.5))).normalized()
        p = c + Vector((d.x * r, d.y * r, d.z * r * 0.86)) * 1.0
        if (p - C).length < 0.6: continue
        a = sphere('apple', 0.045, tuple(p), (1, 1, 0.92), m=m['apple'], seg=16, rings=10, parent=root)
        cyl('stalk', 0.004, 0.025, (p.x, p.y, p.z + 0.04), m=m['stalk'], verts=5, bevel=0, parent=root)
    root.scale = (scale, scale, scale)
    return root


def fallen_apples(center, n=5, seed=9, r=0.8):
    random.seed(seed); m = M()
    for i in range(n):
        a = random.uniform(0, math.tau); d = random.uniform(0.25, r)
        sphere('fapple', 0.038, (center[0] + math.cos(a) * d, center[1] + math.sin(a) * d, 0.034), (1, 1, 0.92), (random.uniform(0, 1), 0, 0), m['apple'], seg=16, rings=10)


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 64
    scn = reset()
    import grass, hen
    grass.field(scn, size=9.0, density=650, seed=12, tuft_h=0.05)
    build((0, 0, 0), seed=2, scale=1.25)
    fallen_apples((0, 0), 6)
    hen.build('rir_h', (0.85, -0.55, 0), math.radians(150), 'peck', seed=7)
    lighting(scn)
    camera(scn, (3.6, -4.0, 2.4), (0.0, 0.0, 1.05), lens=50)
    R = int(os.environ.get('RES', 1200)); render(scn, 'tree_closeup', R, R, samples)
