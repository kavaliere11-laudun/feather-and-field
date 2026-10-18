"""The expressive Feather & Field hen (and rooster): a detailed character model with a posable face.
Face: eyelids that open, close, droop or narrow (with a closed-eye line), pupils that look around, shiny catchlights,
little feather brows that tilt, a beak that opens, rosy cheeks, a comb that flops. Body: feather collar, layered wings, full tail.
build(key, loc, yaw, expr) where expr is a name from EXPR or a dict of face settings."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

K = 1 / 0.575

PAL = {
    'rir_h': dict(body=[(0.0, '#5a1f10'), (0.35, '#7a2d16'), (0.75, '#9a4220'), (1.0, '#b65a2a')], face='#a2482a', hackle='#c06a32', wing='#73301a',
                  covert='#8a3b1d', prim='#3d180d', tail='#30170f', comb='#dd3a2e', beak='#f0b84e', leg='#f2c23f', eye='#e9922a', brow='#4a1c0d'),
    'rir_r': dict(body=[(0.0, '#3e140a'), (0.4, '#6a220f'), (0.7, '#a63e18'), (1.0, '#d0702a')], face='#b5532a', hackle='#de8a34', wing='#86301a',
                  covert='#a8421c', prim='#2a120a', tail='#16110e', comb='#e43a2c', beak='#f0b84e', leg='#f2c23f', eye='#e9922a', brow='#35150a'),
}

# face settings: up/lo = upper/lower lid level (-1 closed .. 1 open), tilt = lid slant in degrees (+ inner corner lower: cross,
# - outer corner lower: sad), closed = 'happy' (^ ^) or 'sleepy' (- -) closed-eye line, look = (sideways, up/down) pupil shift,
# pupil = pupil size, eye = eye size, brow = brow slant (+ worried/sad, - cross), brow_h = brow height, beak = opening (radians),
# blush 0..1, comb = flop 0..1, head = (roll, pitch, yaw) degrees (+pitch looks down), fluff = body puff, fx = little effect
EXPR = {
    'happy':     dict(up=0.95, lo=-0.68, smile=0.5, tilt=0, look=(0.05, 0.05), pupil=1.0, brow=0.0, brow_h=0.55, beak=0.4, blush=0.7, head=(9, -10, 0), fx='notes'),
    'joyful':    dict(closed='happy', brow=0.15, brow_h=0.35, beak=0.55, blush=0.95, head=(-8, -16, 0), fx='sparkles'),
    'hungry':    dict(up=0.62, lo=-0.85, tilt=-12, look=(0.3, 0.62), brow=0.5, brow_h=0.35, beak=0.32, blush=0.0, head=(4, -14, -4), fx='thought'),
    'sleepy':    dict(closed='sleepy', brow=0.1, brow_h=-0.25, beak=0.0, blush=0.3, comb=0.45, head=(16, 10, 0), fx='zzz'),
    'surprised': dict(up=1.0, lo=-1.0, eye=1.15, pupil=0.72, brow=0.0, brow_h=0.85, beak=0.48, blush=0.0, head=(0, -12, 0), fluff=1.04, fx='exclaim'),
    'sad':       dict(up=0.3, lo=-0.75, tilt=-26, look=(0.1, -0.45), brow=0.7, brow_h=0.1, beak=0.0, blush=0.0, comb=0.85, head=(-6, 14, 0), fx='tear'),
    'grumpy':    dict(up=0.12, lo=-0.42, tilt=28, look=(0.15, 0.0), brow=-0.75, brow_h=-0.25, beak=0.06, blush=0.0, head=(0, 6, 8), fx='puffs'),
    'mischief':  dict(up=0.42, lo=-0.62, smile=0.3, tilt=10, look=(0.35, 0.1), wink=-1, brow_side={-1: (0.1, 0.15), 1: (-0.25, 0.8)}, beak=0.26, tongue_out=True,
                      blush=0.4, head=(10, -6, 10), fx='wink'),
    'proud':     dict(closed='content', brow=-0.1, brow_h=0.6, beak=0.0, blush=0.65, head=(-4, -24, 0), fluff=1.08, fx='chicks'),
    'love':      dict(up=0.8, lo=-0.72, smile=0.32, tilt=-6, look=(0.05, 0.1), hearts=True, brow=0.25, brow_h=0.3, beak=0.12, blush=1.0, head=(-12, -6, 0), fx='hearts'),
}
# the hen's colours for the character sheet: (label EN, label FR, hex)
SWATCHES = {
    'rir_h': [('Feathers', 'Plumes', '#7a2d16'), ('Highlights', 'Reflets', '#b65a2a'), ('Collar', 'Camail', '#c06a32'), ('Wing', 'Aile', '#73301a'),
              ('Tail', 'Queue', '#30170f'), ('Comb', 'Crête', '#dd3a2e'), ('Beak', 'Bec', '#f0b84e'), ('Eyes', 'Yeux', '#e9922a'), ('Cheeks', 'Joues', '#ff8f9e')],
    'rir_r': [('Feathers', 'Plumes', '#6a220f'), ('Highlights', 'Reflets', '#d0702a'), ('Collar', 'Camail', '#de8a34'), ('Wing', 'Aile', '#86301a'),
              ('Tail', 'Queue', '#16110e'), ('Comb', 'Crête', '#e43a2c'), ('Beak', 'Bec', '#f0b84e'), ('Legs', 'Pattes', '#f2c23f')],
}
_M = {}
_EYES = {}


def M(key):
    if key in _M: return _M[key]
    P = PAL[key]
    d = dict(
        body=feather_mat('cf_feathers_' + key, P['body'], scale=17, depth=0.2),
        face=feather_mat('cf_face_' + key, [(0, P['face']), (1, P['face'])], scale=40, depth=0.08),
        hackle=mat('cf_hackle_' + key, P['hackle'], rough=0.6, spec=0.3, sheen=0.3, ramp=[(0, P['body'][2][1]), (1, P['hackle'])]),
        wing=feather_mat('cf_wing_' + key, [(0, P['wing']), (1, P['wing'])], scale=14, depth=0.18),
        covert=mat('cf_covert_' + key, P['covert'], rough=0.65, spec=0.25, ramp=[(0, P['wing']), (1, P['covert'])]),
        prim=mat('cf_prim_' + key, P['prim'], rough=0.55, spec=0.3, ramp=[(0, P['prim']), (1, P['wing'])]),
        sickle=mat('cf_sickle_' + key, P['tail'], rough=0.38, spec=0.45, coat=0.15, sheen=0.2, ramp=[(0.0, '#2b1a10'), (0.55, P['tail']), (1.0, '#1c2a1d')]),
        tail=mat('cf_tail_' + key, P['tail'], rough=0.45, spec=0.4, coat=0.15, sheen=0.25, ramp=[(0.0, P['wing']), (0.45, P['tail']), (1.0, P['tail'])]),
        comb=mat('cf_comb_' + key, P['comb'], rough=0.42, spec=0.35, sss=0.25),
        beak=mat('cf_beak_' + key, P['beak'], rough=0.35, spec=0.45, ramp=[(0, '#d99a35'), (1, P['beak'])]),
        mouth=mat('cf_mouth', '#7a2a2a', rough=0.6),
        tongue=mat('cf_tongue', '#e07a86', rough=0.4, sss=0.2),
        leg=mat('cf_leg_' + key, P['leg'], rough=0.45, spec=0.35, bump=0.15, bump_scale=120),
        nail=mat('cf_nail', '#6b4a2e', rough=0.5),
        eye=mat('cf_eye_' + key, P['eye'], rough=0.12, spec=0.8, ramp=[(0, '#b8601a'), (0.6, P['eye']), (1, '#f6c25a')]),
        pupil=mat('cf_pupil', '#050404', rough=0.25, spec=0.5, coat=0.15),
        shine=mat('cf_shine', '#ffffff', rough=0.2, emission=('#ffffff', 3.0)),
        lid=mat('cf_lid_' + key, P['face'], rough=0.7, spec=0.2),
        lash=mat('cf_lash', '#2a120a', rough=0.6),
        brow=mat('cf_brow_' + key, P['brow'], rough=0.7),
        blush=blush_mat(),
    )
    _M[key] = d; return d


def blush_mat():
    """A soft pink glow that fades to nothing at the edges (rosy cheeks)."""
    m = bpy.data.materials.new('cf_blush'); m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = lin('#ff7f8f'); b.inputs['Roughness'].default_value = 0.7
    tc = N.new('ShaderNodeTexCoord'); gr = N.new('ShaderNodeTexGradient'); gr.gradient_type = 'SPHERICAL'
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 1.0, 1.0)
    L.new(tc.outputs['Object'], mp.inputs[0]); L.new(mp.outputs[0], gr.inputs[0])
    vm = N.new('ShaderNodeMath'); vm.operation = 'MULTIPLY'; vm.inputs[1].default_value = 2.4; vm.use_clamp = True
    L.new(gr.outputs['Fac'], vm.inputs[0]); L.new(vm.outputs[0], b.inputs['Alpha'])
    if hasattr(m, 'blend_method'): m.blend_method = 'BLEND'
    return m


def _sock(node, ident):
    return [s for s in node.inputs if s.identifier == ident][0]


def blush_face(base, amount, hr, centre=None):
    """Rosy cheeks painted straight onto the face (so they always sit on the skin): a soft pink oval under each eye."""
    m = base.copy(); m.name = base.name + '_blush'
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    cur = b.inputs['Base Color'].links[0].from_socket
    k = hr / 0.062
    tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sx.inputs[0])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L.new(sx.outputs['Y'], ab.inputs[0])
    cx = N.new('ShaderNodeCombineXYZ'); L.new(sx.outputs['X'], cx.inputs['X']); L.new(ab.outputs[0], cx.inputs['Y']); L.new(sx.outputs['Z'], cx.inputs['Z'])
    sub = N.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; L.new(cx.outputs[0], sub.inputs[0])
    sub.inputs[1].default_value = centre if centre else (0.041 * k, 0.043 * k, -0.012 * k)
    sc = N.new('ShaderNodeVectorMath'); sc.operation = 'MULTIPLY'; L.new(sub.outputs[0], sc.inputs[0])
    sc.inputs[1].default_value = (1 / (0.019 * k), 1 / (0.019 * k), 1 / (0.012 * k))
    ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; L.new(sc.outputs[0], ln.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['From Min'].default_value = 0.3; mr.inputs['From Max'].default_value = 1.0
    mr.inputs['To Min'].default_value = min(0.85, 0.85 * amount); mr.inputs['To Max'].default_value = 0.0
    L.new(ln.outputs['Value'], mr.inputs['Value'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MIX'
    L.new(mr.outputs[0], _sock(mix, 'Factor_Float')); L.new(cur, _sock(mix, 'A_Color'))
    _sock(mix, 'B_Color').default_value = lin('#ff8f9e')
    L.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m


def heart_outline(n=56):
    """Points round a heart, about 2 units wide, centred on the origin."""
    pts = []
    for i in range(n):
        t = i / n * math.tau
        x = 16 * math.sin(t) ** 3; y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x / 16, (y + 2.5) / 16))
    return pts


def circle_outline(n=40):
    return [(math.cos(i / n * math.tau), math.sin(i / n * math.tau)) for i in range(n)]


def heart_pupil(name, R, ic, d, half_w, m, parent, outline=None):
    """A pupil painted onto the round eye: heart-shaped for 'in love', round otherwise (outline=circle_outline())."""
    Zd = Vector((0, 0, 1)); Zd = (Zd - d * Zd.dot(d)).normalized(); Xd = Zd.cross(d)
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = 5; Rs = R * 1.004
    ctr = bm.verts.new((0, 0, 0)); ring_v = []
    outline = outline or heart_outline()
    for r in range(1, rings + 1):
        f = r / rings; row = []
        for (x, y) in outline:
            row.append(bm.verts.new((x * half_w * f, y * half_w * f, 0)))
        ring_v.append(row)
    n_ = len(outline)
    for i in range(n_):
        bm.faces.new((ctr, ring_v[0][i], ring_v[0][(i + 1) % n_]))
    for r in range(rings - 1):
        for i in range(n_):
            j = (i + 1) % n_
            bm.faces.new((ring_v[r][i], ring_v[r + 1][i], ring_v[r + 1][j], ring_v[r][j]))
    for v in bm.verts:                       # wrap onto the eyeball
        x, y = v.co.x, v.co.y
        v.co.z = math.sqrt(max(0.0, Rs * Rs - x * x - y * y))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    sm = o.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = 0.0005; sm.offset = 0.0
    o.parent = parent; o.matrix_basis = Matrix.Translation(ic) @ Matrix((Xd, Zd, d)).transposed().to_4x4()
    return o


def lid_patch(name, R, edge, below, m, parent, matrix, thick=0.0012, nx=30, nz=14):
    """An eyelid that hugs the eye and ends on a curve z = edge(x) (eye frame: x across, y out, z up).
    below=True covers the eye from the bottom up to the curve (a lower lid pushed up by a smile)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); rows = []
    for i in range(nx + 1):
        x = (-1 + 2 * i / nx) * R * 0.999
        zs = math.sqrt(max(0.0, R * R - x * x)); e = max(-zs, min(zs, edge(x)))
        z0, z1 = (-zs, e) if below else (e, zs)
        row = []
        for j in range(nz + 1):
            z = z0 + (z1 - z0) * j / nz
            row.append(bm.verts.new((x, math.sqrt(max(0.0, R * R - x * x - z * z)), z)))
        rows.append(row)
    for i in range(nx):
        for j in range(nz):
            try: bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=R * 1e-4)
    bm.normal_update()
    if bm.faces and sum(f.normal.y for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    sm = o.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = thick; sm.offset = 1.0
    o.parent = parent; o.matrix_basis = matrix
    return o


def surface_finder(obj):
    """Finds points on a shape's outer surface (in its own space), so face parts sit right on a head of any shape."""
    from mathutils.bvhtree import BVHTree
    me = obj.data
    bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    def surf(dirn, origin=(0, 0, 0)):
        d = Vector(dirn).normalized(); o = Vector(origin)
        loc, nor, _, _ = bvh.ray_cast(o + d * 0.4, -d)
        if loc is None: return o + d * 0.06, d
        if nor.dot(d) < 0: nor = -nor
        return loc, nor
    return surf


def paddle(name, length, width, thick, m, parent, matrix=None, loc=(0, 0, 0), rot=(0, 0, 0), curve=0.0, tip=0.85, sub=2, arch=0.0, cuts=2):
    """A rounded feather (flat, tapering, gently curved). Length along local X, width along local Z, faces local Y."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) > 0.5], cuts=cuts, use_grid_fill=True)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) < 0.01 and abs(e.verts[0].co.z - e.verts[1].co.z) > 0.5], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        x = v.co.x + 0.5
        taper = 0.5 + 0.5 * math.sin(min(1, x) * math.pi * tip)
        v.co = Vector((x * length, v.co.y * thick, v.co.z * width * taper))
        v.co.y += curve * (x ** 2) * length
        v.co.z += arch * (x ** 3) * length              # bends the feather within its own plane (a drooping sickle)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); subsurf(o, sub)
    for p in o.data.polygons: p.use_smooth = True
    o.parent = parent
    if matrix is not None: o.matrix_basis = matrix
    else: o.location = loc; o.rotation_euler = rot
    return o


def basis(origin, xdir, ydir):
    """A local frame: X along xdir, Y as close to ydir as possible, Z completing it."""
    X = Vector(xdir).normalized(); Y = Vector(ydir); Y = (Y - X * Y.dot(X)).normalized(); Z = X.cross(Y)
    return Matrix.Translation(Vector(origin)) @ Matrix((X, Y, Z)).transposed().to_4x4()


def cap(name, R, plane_dir, level, keep_above, m, parent, matrix, thick=0.0012):
    """A spherical eyelid: the part of a sphere above (or below) a slanted plane, given a little thickness."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=40, v_segments=24, radius=R)
    n = Vector(plane_dir).normalized()
    if level > -0.999 if keep_above else level < 0.999:
        co = n * (level * R)
        res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=(n if keep_above else -n), clear_inner=True)
    bm.to_mesh(me); bm.free()
    if len(me.vertices) == 0: bpy.data.meshes.remove(me); return None
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    sm = o.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = thick; sm.offset = 1.0
    o.parent = parent; o.matrix_basis = matrix
    return o


def curve_line(name, pts, depth, m, parent, matrix):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = depth; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], p[2], 1.0)
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(m); o.parent = parent; o.matrix_basis = matrix
    return o


def beak_mesh(name, L, w, h, hook, m, parent, matrix):
    """A curved beak: elliptical base tapering to a point that hooks down."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=22, radius=1.0)
    for v in bm.verts:
        u = (max(-1.0, min(1.0, v.co.z)) + 1) / 2          # 0 at the back (inside the head), 1 at the tip
        rr = math.hypot(v.co.x, v.co.y); cx, cy = (v.co.x / rr, v.co.y / rr) if rr > 1e-6 else (0.0, 0.0)
        if u < 0.12: t = 0.0; k = 1.03 * math.sin(u / 0.12 * math.pi / 2); x = (u - 0.12) / 0.88 * L
        else: t = (u - 0.12) / 0.88; k = (1 - t) ** 0.8 + 0.03; x = t * L
        v.co = Vector((x, cx * w * k, cy * h * k - hook * (t ** 2.2) * L))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); subsurf(o, 1)
    for p in o.data.polygons: p.use_smooth = True
    o.parent = parent; o.matrix_basis = matrix
    return o


def head_mesh(name, hs, m, parent):
    """The head, sculpted from a sphere: round at the back, a forehead that slopes down into the beak, a slimmer muzzle,
    chubby cheeks under the eyes, a soft brow ridge over them, and a throat that runs down into the neck."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1.0)
    def bump(v, c, amt, sig):
        c = Vector(c).normalized(); return amt * math.exp(-((v - c).length_squared) / sig)
    for v in bm.verts:
        u = v.co.copy(); p = u.copy(); f = max(0.0, u.x)
        p.x *= 1.0 + 0.3 * f * f                        # longer towards the beak
        p.y *= 1.0 - 0.2 * f ** 2                       # slimmer muzzle
        if u.z > 0: p.z *= 0.9 - 0.12 * f               # flatter crown, forehead sloping to the beak
        else: p.z *= 1.0 + 0.25 * max(0.0, -u.x + 0.2) * (-u.z)   # throat drops into the neck
        out = 0.0
        for sd in (1, -1):
            out += bump(u, (0.5, sd * 0.6, -0.5), 0.06, 0.07)        # cheeks
        p += u * out
        v.co = Vector((p.x * 0.053, p.y * 0.046, p.z * 0.052)) * hs
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); subsurf(o, 1)
    for poly in o.data.polygons: poly.use_smooth = True
    o.parent = parent
    return o


def build(key='rir_h', loc=(0, 0, 0), yaw=0.0, expr='happy', seed=1):
    random.seed(seed)
    X = dict(EXPR['happy']); X.update(EXPR[expr] if isinstance(expr, str) else expr)
    P = PAL[key]; Mt = M(key); rooster = key.endswith('_r')
    root = empty('hen_' + key, loc, (0, 0, yaw))
    body_rig = empty('body', (0, 0, 0), (0, 0, 0), root)
    fl = X.get('fluff', 1.0); body_rig.scale = (fl, fl, fl)
    head = Vector((0.15, 0, 0.42)); neck = Vector((0.11, 0, 0.33))
    E = [
        ('ELLIPSOID', (-0.02, 0, 0.215), 0.125 * K, (1.45, 0.92, 0.9), 2.0),
        ('BALL', (0.085, 0, 0.2), 0.092 * K, None, 2.0),
        ('ELLIPSOID', (-0.12, 0, 0.27), 0.08 * K, (1.2, 1.0, 0.95), 2.0),
        ('ELLIPSOID', (-0.19, 0, 0.33), 0.05 * K, (0.85, 0.9, 1.45), 2.0),
        ('ELLIPSOID', tuple(neck), 0.046 * K, (1.0, 0.95, 1.5), 2.0),
        ('BALL', (0.0, 0.055, 0.12), 0.05 * K, None, 1.6), ('BALL', (0.0, -0.055, 0.12), 0.05 * K, None, 1.6),
    ]
    metaball_mesh('cf_body', E, res=0.007, m=Mt['body'], parent=body_rig)
    # ---- head: its own round shape so it can tilt; face details ride on it
    roll, pitch, yw = X.get('head', (0, 0, 0))
    hd = empty('head', tuple(head), (math.radians(roll), math.radians(pitch - 8), math.radians(yw)), body_rig)
    hr = 0.062 * (1.08 if rooster else 1.0)
    hs = hr / 0.062
    headobj = head_mesh('cf_head', hs, Mt['face'], hd)
    surf = surface_finder(headobj)
    if X.get('blush', 0) > 0.01:
        bc, _ = surf((0.041, 0.043, -0.014))
        headobj.data.materials[0] = blush_face(Mt['face'], X['blush'], hr, centre=(bc.x, abs(bc.y), bc.z))
    # ---- eyes
    R = 0.0195 * X.get('eye', 1.0)
    for s in (1, -1):
        Ec = Vector((0.05, s * 0.028, 0.014)); n = Ec.normalized()
        sp_, _ = surf(n)
        ic = sp_ - n * 0.0078                                      # iris centre, a little sunk into the head
        _EYES[s] = ic.copy()
        up = Vector((0, 0, 1)); Zl = (up - n * up.dot(n)).normalized(); Xl = n.cross(Zl)
        inner = Xl * s                                            # towards the beak
        F = Matrix((Xl, n, Zl)).transposed().to_4x4()             # eye frame: x across, y out, z up
        Fm = Matrix.Translation(ic) @ F
        sphere('iris', R, tuple(ic), m=Mt['eye'], parent=hd, seg=28, rings=16)
        lx, lz = X.get('look', (0, 0))
        d = (n + inner * lx * 0.55 + Zl * lz * 0.55).normalized()
        if X.get('hearts'):
            heart_pupil('heartpupil', R, ic, d, R * 0.64, _fxmat('heartpupil', '#e8304f', 0.15), hd)
        else:
            pr = R * 0.6 * X.get('pupil', 1.0)
            heart_pupil('pupil', R, ic, d, pr, Mt['pupil'], hd, outline=[(x, y * 1.06) for x, y in circle_outline()])
        shut = X.get('closed') or X.get('wink') == s
        for k_, (a, b_, r_) in enumerate(((0.42, 0.3, 0.24), (-0.32, -0.28, 0.11)) if not shut else ()):
            sd = (n + Zl * a + inner * b_).normalized()
            sphere('shine', R * r_, tuple(ic + sd * R * 1.01), m=Mt['shine'], parent=hd, seg=10, rings=6)
        # eyelids (spherical caps) and, when shut, the closed-eye line
        tilt = math.radians(X.get('tilt', 0))
        mdir = Vector((math.sin(tilt) * s, 0, math.cos(tilt)))     # in the eye frame (x has inner = +s)
        closed = X.get('closed') or ('happy' if X.get('wink') == s else None)
        Rl = R * 1.08
        if closed:
            cap('lidfull', Rl, (0, 0, 1), -1.0, True, Mt['lid'], hd, Fm)
            w = R * 0.85
            pts = []
            for i in range(17):
                u = -1 + 2 * i / 16; x = u * w
                z = {'happy': 0.32 * R * (1 - u * u) - 0.05 * R, 'content': 0.08 * R - 0.2 * R * (1 - u * u)}.get(closed, -0.06 * R - 0.1 * R * (1 - u * u))
                y = math.sqrt(max(0.0, (Rl * 1.02) ** 2 - x * x - z * z))
                pts.append((x, y, z))
            curve_line('lash', pts, 0.0017, Mt['lash'], hd, Fm)
        else:
            cap('lidup', Rl, mdir, X.get('up', 0.55), True, Mt['lid'], hd, Fm)
            lt = math.radians(X.get('tilt', 0) * -0.3)
            if X.get('smile'):                                      # lower lid pushed up into a smile: the eye becomes a happy crescent
                lo_, sm_, R_l = X.get('lo', -0.7), X['smile'], Rl * 0.995
                edge = lambda x: R_l * (lo_ + sm_ * (1 - (x / R_l) ** 2))
                lid_patch('lidlo', R_l, edge, True, Mt['lid'], hd, Fm, thick=0.0008)
                pts = []                                            # a fine dark line along the lid edge so the smile reads
                for i in range(21):
                    x = (-0.86 + 1.72 * i / 20) * R_l; z = edge(x); y2 = R_l ** 2 - x * x - z * z
                    if y2 > 0: pts.append((x, math.sqrt(y2) + 0.0009, z))
                if len(pts) > 2: curve_line('lidline', pts, 0.0007, Mt['lash'], hd, Fm)
            else:
                cap('lidlo', Rl * 0.995, (math.sin(lt) * s, 0, math.cos(lt)), X.get('lo', -0.6), False, Mt['lid'], hd, Fm)
        # brow: a small dark feather above the eye, slanted by mood
        bsl, bh = X.get('brow_side', {}).get(s, (X.get('brow', 0.0), X.get('brow_h', 0.0)))
        bp_, bn_ = surf((ic + Zl * (R * (1.5 + 0.45 * bh))).normalized())
        bpos = bp_ + bn_ * 0.003
        bm_ = basis(bpos, Xl, bn_)
        ang = (-bsl * math.radians(32) + math.radians(float(os.environ.get('BROW0', -16)))) * s
        rot = Matrix.Rotation(ang, 4, 'Y')
        b = sphere('brow', 1.0, (0, 0, 0), m=Mt['brow'], parent=hd, seg=16, rings=10)
        b.matrix_basis = bm_ @ rot @ Matrix.Diagonal((0.016, 0.0045, 0.0055, 1.0))
        # earlobe
        lp_, ln_ = surf((-0.01, s * 0.06, -0.022))
        lb = sphere('lobe', 1.0, (0, 0, 0), m=Mt['comb'], parent=hd, seg=12, rings=8)
        lb.matrix_basis = basis(lp_ - ln_ * 0.001, Vector((0, 0, 1)), ln_) @ Matrix.Diagonal((0.009 * hs, 0.003, 0.0068 * hs, 1.0))
    # ---- beak: upper and lower halves, hinged at the base; a tongue shows when it opens
    op = X.get('beak', 0.0)
    fp_, _ = surf((1.0, 0, -0.14))
    base = Vector((fp_.x - 0.008 * hs, 0, -0.008 * hs))
    beak_mesh('beak_up', 0.046 * hs, 0.022 * hs, 0.0155 * hs, 0.36, Mt['beak'], hd, Matrix.Translation(base) @ Matrix.Rotation(-op * 0.3, 4, 'Y'))
    lower = Matrix.Translation(base + Vector((0, 0, -0.008))) @ Matrix.Rotation(op, 4, 'Y')
    beak_mesh('beak_lo', 0.033 * hs, 0.019 * hs, 0.0085 * hs, 0.05, Mt['beak'], hd, lower)
    if op > 0.05:
        sphere('mouth', 0.012, tuple(base + Vector((0.006, 0, -0.008))), (1.2, 0.9, 0.7), m=Mt['mouth'], parent=hd, seg=14, rings=8)
        t = sphere('tongue', 1.0, (0, 0, 0), m=Mt['tongue'], parent=hd, seg=14, rings=8)
        if X.get('tongue_out'): t.matrix_basis = lower @ Matrix.Translation((0.03, 0, 0.0045)) @ Matrix.Rotation(-0.25, 4, 'Y') @ Matrix.Diagonal((0.017, 0.0075, 0.0034, 1.0))
        else: t.matrix_basis = lower @ Matrix.Translation((0.016, 0, 0.004)) @ Matrix.Diagonal((0.011, 0.007, 0.003, 1.0))
    # ---- comb (flops sideways when sad or sleepy) and wattles
    cs = 1.5 if rooster else 1.0
    tp_, _ = surf((0.12, 0, 1.0))
    cb = empty('combbase', (tp_.x - 0.004, 0, tp_.z - 0.009 * hs), (math.radians(X.get('comb', 0.0) * 38), 0, 0), hd)
    pts = [(0.03, 0.015), (0.015, 0.024), (-0.002, 0.027), (-0.019, 0.023), (-0.033, 0.014)]
    ce = [('BALL', (x_ * cs ** 0.35, 0, z_ * cs), (0.0105 if i in (1, 2, 3) else 0.0092) * K * cs ** 0.45, None, 2.0) for i, (x_, z_) in enumerate(pts)]
    ce += [('ELLIPSOID', (-0.001, 0, 0.009 * cs), 0.019 * K, (2.0 * cs ** 0.3, 0.6, 0.8 * cs ** 0.9), 2.0),    # the blade itself
           ('ELLIPSOID', (0.0, 0, 0.0), 0.02 * K, (2.1 * cs ** 0.3, 0.7, 0.55), 2.0)]                         # rooted in the head
    mb = metaball_mesh('comb', ce, res=0.0035, m=Mt['comb'], parent=cb)
    mb.scale = (1, 0.5, 1)
    wl = []                                         # two long drops hanging under the beak
    wx = base.x - 0.002
    for s in (1, -1):
        wl += [('ELLIPSOID', (wx, s * 0.0062, -0.038 * cs ** 0.5 - 0.004), 0.0095 * K * cs ** 0.7, (0.75, 0.5, 1.15), 2.0),
               ('BALL', (wx - 0.002, s * 0.0058, -0.05 * cs ** 0.5 - 0.004), 0.0072 * K * cs ** 0.7, None, 2.0)]
    metaball_mesh('wattles', wl, res=0.0035, m=Mt['comb'], parent=hd)
    # ---- neck collar: golden hackle feathers falling over the shoulders
    for row in range(3):                       # three overlapping rows, lying close over the neck and shoulders
        for i in range(15):
            phi = math.radians(60 + i * (240 / 14)) + (0.1 * row)
            rad = Vector((math.cos(phi), math.sin(phi), 0))
            p = neck + Vector((math.cos(phi) * 0.041, math.sin(phi) * 0.039, 0.035 - row * 0.024))
            dirn = (rad * 0.22 + Vector((0, 0, -1))).normalized()
            Lh = (0.05 + 0.012 * row) * (1.3 if rooster else 1.0)
            paddle('hackle', Lh, 0.024, 0.005, Mt['hackle'], body_rig, matrix=basis(p, dirn, rad), curve=0.08, tip=0.9)
    # ---- wings: base, coverts, secondaries and primaries, layered
    for s in (1, -1):
        w = empty('wing', (0.0, s * 0.093, 0.245), (math.radians(s * -6), math.radians(-12), math.radians(s * -4)), body_rig)
        sphere('wingbase', 0.1, (0, 0, 0), (1.02, 0.19, 0.48), m=Mt['wing'], parent=w, seg=28, rings=16)
        rows = [(Mt['prim'], 4, 0.1, 0.03, -0.045, -0.018, 6), (Mt['wing'], 5, 0.078, 0.032, -0.012, -0.03, 4), (Mt['covert'], 6, 0.052, 0.03, 0.03, -0.012, 3)]
        for ri, (mm, cnt, L_, W_, x0, z0, spread) in enumerate(rows):
            for k in range(cnt):
                e = math.radians(-6 - k * spread)
                paddle('wf', L_ - k * 0.004, W_, 0.008, mm, w, loc=(x0 - k * 0.012, s * (0.012 + ri * 0.004), z0 - k * 0.009),
                       rot=(0, e - math.pi, math.radians(s * (3 + k * 2))), curve=-s * 0.1, tip=0.95)
    # ---- tail: a full fan with lighter coverts (and sickles on a rooster)
    tb = empty('tail', (-0.2, 0, 0.33), (0, 0, 0), body_rig)
    n = 11 if rooster else 9
    for i in range(n):
        side = 1 if i % 2 else -1
        e = math.radians(24 + (44 if rooster else 38) * i / (n - 1))
        L_ = (0.23 if rooster else 0.15) * (1.0 - 0.15 * abs(i / (n - 1) - 0.5))
        paddle('tailf', L_, 0.05, 0.011, Mt['tail'], tb, loc=(0.01, side * 0.012, -0.01), rot=(math.radians(side * 6), e - math.pi, math.radians(side * 2)), curve=side * 0.08, tip=0.95)
    for i in range(6):
        side = 1 if i % 2 else -1
        e = math.radians(20 + 40 * i / 5)
        paddle('tailcov', 0.09, 0.04, 0.01, Mt['covert'], tb, loc=(0.04, side * 0.028, -0.02), rot=(math.radians(side * 10), e - math.pi, math.radians(side * 9)), curve=side * 0.12, tip=0.95)
    if rooster:                                     # a fountain of glossy sickle feathers that rise and arch over the tail
        for sd in (1, -1):
            for j, (L_, E_, A_, dz, dy, rz) in enumerate(((0.2, 72, 1.25, 0.03, 0.006, 2), (0.18, 66, 1.18, 0.018, 0.013, 6), (0.16, 60, 1.1, 0.006, 0.02, 10),
                                                         (0.14, 54, 1.0, -0.006, 0.026, 14), (0.115, 48, 0.9, -0.016, 0.031, 18))):
                paddle('sickle', L_, 0.05 - j * 0.003, 0.01, Mt['sickle'], tb, loc=(0.015 - j * 0.007, sd * dy, dz),
                       rot=(math.radians(sd * 12), math.radians(E_) - math.pi, math.radians(sd * rz * 0.7)), curve=sd * 0.05, arch=A_, cuts=10, tip=0.95)
    # ---- legs and feet with little nails
    for s in (1, -1):
        lg = empty('leg', (0.01, s * 0.055, 0), (0, 0, 0), root)
        cyl('shank', 0.012, 0.11, (0, 0, 0.055), (0, math.radians(6), 0), Mt['leg'], verts=12, r2=0.01, bevel=0.002, parent=lg)
        for ang, L_ in ((0, 0.062), (32, 0.052), (-32, 0.052), (180, 0.032)):
            a = math.radians(ang + s * 6)
            cyl('toe', 0.0068, L_, (math.cos(a) * L_ / 2, math.sin(a) * L_ / 2, 0.006), (0, math.radians(90), a), Mt['leg'], verts=10, r2=0.0038, bevel=0.0015, parent=lg)
            sphere('nail', 0.0032, (math.cos(a) * (L_ + 0.002), math.sin(a) * (L_ + 0.002), 0.005), (1.6, 0.8, 0.7), (0, 0, a), Mt['nail'], seg=8, rings=6, parent=lg)
    if rooster: root.scale = (1.12, 1.12, 1.12)
    root['fx'] = X.get('fx', ''); root['hr'] = hr
    return root, hd


# ------------------------------------------------------------------ little mood effects, laid out flat towards the camera
def _fxmat(name, col, glow=0.6):
    k = 'fx_' + name
    if k not in _M: _M[k] = mat(k, col, rough=0.35, spec=0.4, emission=(col, glow))
    return _M[k]


def text_obj(txt, size, m):
    cu = bpy.data.curves.new('t', 'FONT'); cu.body = txt; cu.size = size; cu.extrude = size * 0.1; cu.bevel_depth = size * 0.06; cu.bevel_resolution = 3
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = link(bpy.data.objects.new('txt', cu)); o.data.materials.append(m)
    return o


def heart(size, m, puff=0.38):
    """A soft, puffy heart (flat outline, rounded front and back)."""
    me = bpy.data.meshes.new('heart'); bm = bmesh.new()
    outline = heart_outline(56); n_ = len(outline); rings = 7
    ctr = bm.verts.new((0, 0, size * puff)); rows = []
    for r in range(1, rings + 1):
        f = r / rings; z = size * puff * math.sqrt(max(0.0, 1 - f ** 2.2))
        rows.append([bm.verts.new((x * size * f, y * size * f, z)) for (x, y) in outline])
    for i in range(n_): bm.faces.new((ctr, rows[0][i], rows[0][(i + 1) % n_]))
    for r in range(rings - 1):
        for i in range(n_):
            j = (i + 1) % n_; bm.faces.new((rows[r][i], rows[r + 1][i], rows[r + 1][j], rows[r][j]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('heart', me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    mm = o.modifiers.new('mirror', 'MIRROR'); mm.use_axis = (False, False, True); mm.use_mirror_merge = True; mm.merge_threshold = size * 0.01
    return o


def star(size, m, points=4):
    me = bpy.data.meshes.new('star'); bm = bmesh.new()
    rim = []
    for i in range(points * 2):
        a = math.pi / 2 + i / (points * 2) * math.tau; r = size if i % 2 == 0 else size * 0.3
        rim.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, 0)))
    f_ = bm.verts.new((0, 0, size * 0.2)); b_ = bm.verts.new((0, 0, -size * 0.2))
    n = len(rim)
    for i in range(n):
        bm.faces.new((rim[i], rim[(i + 1) % n], f_)); bm.faces.new((rim[(i + 1) % n], rim[i], b_))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('star', me)); setmat(o, m)
    return o


def drop(size, m):
    me = bpy.data.meshes.new('drop'); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=size)
    for v in bm.verts:
        if v.co.z > 0:
            k = 1 - (v.co.z / size) ** 1.4; v.co.x *= k; v.co.y *= k; v.co.z *= 1.7
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new('drop', me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    return o


def effects(kind, H, cam, eye=None):
    """Effects around the head H, placed in the picture plane of camera cam (x right, y up, z towards the viewer), in metres."""
    Rc = cam.matrix_world.to_3x3().normalized(); R4 = Rc.to_4x4()
    right, up, back = Rc.col[0], Rc.col[1], Rc.col[2]
    def at(o, ox, oy, oz=0.0, spin=0.0, scl=(1, 1, 1), base=None):
        p = (base if base is not None else H) + right * ox + up * oy + back * oz
        o.matrix_world = Matrix.Translation(p) @ R4 @ Matrix.Rotation(math.radians(spin), 4, 'Z') @ Matrix.Diagonal((*scl, 1.0))
        return o
    if kind == 'sparkles':
        m = _fxmat('spark', '#ffc93a', 2.2)
        for (x, y, s, sp) in ((0.085, 0.07, 0.022, 0), (-0.085, 0.045, 0.016, 12), (0.1, -0.005, 0.012, -10), (-0.05, 0.1, 0.012, 20), (0.035, 0.11, 0.009, 0)):
            at(star(s, m), x, y, 0.02, sp)
    elif kind == 'hearts':
        m = _fxmat('heart', '#ff4f6d', 0.7)
        for (x, y, s, sp) in ((0.082, 0.06, 0.02, -14), (0.05, 0.108, 0.013, 12), (0.112, 0.112, 0.009, -22)):
            at(heart(s, m), x, y, 0.02, sp)
    elif kind == 'zzz':
        m = _fxmat('zzz', '#6f84dc', 0.5)
        for (x, y, s, sp) in ((0.058, 0.05, 0.02, 8), (0.082, 0.077, 0.027, -6), (0.11, 0.108, 0.035, 10)):
            at(text_obj('Z', s, m), x, y, 0.02, sp)
    elif kind == 'wink':
        m = _fxmat('spark', '#ffc93a', 2.2)
        at(star(0.015, m), -0.036, 0.05, 0.03, 10, base=eye)
        at(star(0.009, m), -0.058, 0.03, 0.03, -8, base=eye)
    elif kind == 'chicks':                                   # two fluffy chicks looking up at their proud mum
        my = _M.get('chick') or mat('chick', '#ffd84a', rough=0.85, sheen=0.6, ramp=[(0, '#f5b935'), (1, '#ffe27a')]); _M['chick'] = my
        mo = Mt_beak = _M.get('chickbeak') or mat('chickbeak', '#f39a2b', rough=0.4, spec=0.4); _M['chickbeak'] = mo
        mk = _M.get('chickeye') or mat('chickeye', '#120c08', rough=0.2, spec=0.6); _M['chickeye'] = mk
        mw = _M.get('chickshine') or mat('chickshine', '#ffffff', rough=0.2, emission=('#ffffff', 2.0)); _M['chickshine'] = mw
        for (cx, cy, sc, sp) in ((0.035, -0.088, 1.15, 8), (0.1, -0.078, 1.0, -10)):
            def C(ox, oy, oz=0.0): return (cx + ox * sc, cy + oy * sc, 0.07 + oz * sc)
            o = sphere('chickbody', 1.0, m=my, seg=24, rings=14); at(o, *C(0, 0), sp, (0.024 * sc, 0.021 * sc, 0.022 * sc))
            o = sphere('chickhead', 1.0, m=my, seg=24, rings=14); at(o, *C(0.002, 0.026, 0.004), sp, (0.017 * sc, 0.016 * sc, 0.016 * sc))
            for ex in (-1, 1):
                o = sphere('chickeye', 1.0, m=mk, seg=12, rings=8); at(o, *C(ex * 0.0065, 0.031, 0.018), 0, (0.0028 * sc, 0.0034 * sc, 0.0018 * sc))
                o = sphere('chickshine', 1.0, m=mw, seg=8, rings=6); at(o, *C(ex * 0.0065 + 0.001, 0.0325, 0.0196), 0, (0.0009 * sc,) * 3)
            o = sphere('chickbeak', 1.0, m=mo, seg=12, rings=8); at(o, *C(0.002, 0.024, 0.0195), 0, (0.0042 * sc, 0.0028 * sc, 0.004 * sc))
            for tx in (-0.003, 0.0, 0.003):
                o = sphere('chicktuft', 1.0, m=my, seg=8, rings=6); at(o, *C(0.002 + tx, 0.043, 0.003), tx * 4000, (0.0022 * sc, 0.006 * sc, 0.0022 * sc))
    elif kind == 'notes':                                    # humming a happy little tune
        m = _fxmat('note', '#2f9a52', 0.35)
        for (x, y, sc, sp) in ((0.078, 0.06, 1.0, -12), (0.112, 0.1, 0.78, 10)):
            o = sphere('notehead', 1.0, m=m, seg=20, rings=10); at(o, x, y, 0.02, sp - 25, (0.0085 * sc, 0.0062 * sc, 0.004 * sc))
            c = curve_line('notestem', [(0.0078 * sc, 0.0, 0), (0.0078 * sc, 0.034 * sc, 0)], 0.0016 * sc, m, None, Matrix.Identity(4)); at(c, x, y, 0.02, sp)
            c = curve_line('noteflag', [(0.0078 * sc, 0.034 * sc, 0), (0.016 * sc, 0.026 * sc, 0), (0.019 * sc, 0.016 * sc, 0)], 0.0016 * sc, m, None, Matrix.Identity(4)); at(c, x, y, 0.02, sp)
    elif kind == 'tear':
        m = _fxmat('tear', '#7ccaf8', 0.35)
        o = drop(0.0075, m)
        at(o, 0.002, -0.026, 0.014, base=eye)
        o.matrix_world = o.matrix_world @ Matrix.Rotation(math.radians(-90), 4, 'X')
    elif kind == 'puffs':
        m = _fxmat('puff', '#f4f4f4', 0.25)
        for cx, cy, sz in ((-0.06, 0.085, 1.0), (0.055, 0.095, 0.85)):
            for (x, y, r) in ((0, 0, 0.012), (0.011, 0.006, 0.01), (-0.01, 0.005, 0.009), (0.003, 0.016, 0.009), (-0.004, 0.026, 0.006)):
                o = sphere('puff', 1.0, (0, 0, 0), m=m, seg=14, rings=8)
                at(o, cx + x * sz, cy + y * sz, 0.0, 0, (r * sz, r * sz, r * sz * 0.6))
    elif kind == 'exclaim':
        m = _fxmat('excl', '#ff8a1f', 0.6)
        at(text_obj('!', 0.068, m), 0.088, 0.075, 0.02, -10)
        ml = _fxmat('shock', '#ff8a1f', 0.6)
        for ang in (35, 62, 90, 118):                       # little shock lines round the top of the head
            a = math.radians(ang); r0, r1 = 0.083, 0.1
            p0 = (math.cos(a) * r0, math.sin(a) * r0); p1 = (math.cos(a) * r1, math.sin(a) * r1)
            if ang == 35: continue                          # leave room for the '!'
            c = curve_line('shock', [(p0[0], p0[1], 0), (p1[0], p1[1], 0)], 0.0022, ml, None, Matrix.Identity(4))
            at(c, -0.012, 0.0, 0.0)
    elif kind == 'thought':
        mw = _fxmat('bubble', '#ffffff', 0.2); mg = _fxmat('grain', '#f2b632', 0.25); mb = _fxmat('bowl', '#5f9fd6', 0.15)
        cx, cy = 0.092, 0.088
        o = sphere('cloud', 1.0, (0, 0, 0), m=mw, seg=24, rings=12); at(o, cx, cy, 0, 0, (0.03, 0.022, 0.006))
        for i in range(9):                                   # bumpy cloud edge
            a = i / 9 * math.tau + 0.2
            o = sphere('cloud', 1.0, (0, 0, 0), m=mw, seg=16, rings=10)
            at(o, cx + math.cos(a) * 0.03, cy + math.sin(a) * 0.021, -0.001, 0, (0.0125, 0.0125, 0.005))
        for (x, y, r) in ((0.046, 0.042, 0.0045), (0.06, 0.056, 0.0072)):
            o = sphere('trail', 1.0, (0, 0, 0), m=mw, seg=14, rings=8); at(o, x, y, 0, 0, (r, r, r * 0.45))
        # a little blue bowl heaped with corn, inside the cloud
        o = sphere('bowl', 1.0, (0, 0, 0), m=mb, seg=20, rings=10); at(o, cx, cy - 0.008, 0.008, 0, (0.017, 0.007, 0.006))
        random.seed(5)
        for i in range(16):
            gx = random.uniform(-0.013, 0.013); gy = 0.002 + random.uniform(0, 0.009) * (1 - abs(gx) / 0.016)
            o = sphere('grain', 1.0, (0, 0, 0), m=mg, seg=10, rings=6)
            at(o, cx + gx, cy - 0.006 + gy, 0.011 + random.uniform(0, 0.003), random.uniform(0, 180), (0.0042, 0.0032, 0.003))


def eye_world(hd, hr, s=-1):
    return hd.matrix_world @ _EYES[s]


def shadow_catcher(size=3.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, 0))
    g = bpy.context.active_object; g.is_shadow_catcher = True
    return g


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 32
    mode = os.environ.get('MODE', 'face')
    key = os.environ.get('KEY', 'rir_h')
    R_ = int(os.environ.get('RES', 600))
    if mode == 'face':
        which = os.environ.get('EXPR', 'happy')
        scn = reset()
        root, hd = build(key, (0, 0, 0), 0.0, which)
        bpy.context.view_layer.update()
        H = hd.matrix_world.translation.copy()
        lighting(scn, sun_dir=(0.55, -0.45, 0.75), sun=3.6)
        cam = camera(scn, tuple(H + Vector((0.52, -0.25, 0.085))), tuple(H), lens=float(os.environ.get("LENS", 84)))
        bpy.context.view_layer.update()
        Rc = cam.matrix_world.to_3x3()
        cam.location = cam.location + Rc.col[0] * 0.016 + Rc.col[1] * 0.016     # head a little left and low: room for the effect
        bpy.context.view_layer.update()
        if root['fx']: effects(root['fx'], H, cam, eye_world(hd, root['hr']))
        render(scn, 'face_' + which, R_, R_, samples, transparent=True)
    elif mode == 'headtest':                                 # quick look at the head from several sides
        scn = reset()
        root, hd = build(key, (0, 0, 0), 0.0, os.environ.get('EXPR', 'happy'))
        bpy.context.view_layer.update()
        H = hd.matrix_world.translation.copy()
        lighting(scn, sun_dir=(0.55, -0.45, 0.75), sun=3.6)
        cam = None
        for vname, (dx, dy, dz) in (('front', (1, 0, 0.1)), ('34', (0.75, -0.62, 0.12)), ('side', (0, -1, 0.06)), ('back34', (-0.6, -0.75, 0.25))):
            if cam: bpy.data.objects.remove(cam)
            cam = camera(scn, tuple(H + Vector((dx, dy, dz)) * 3), tuple(H + Vector((0, 0, 0.01))), ortho=float(os.environ.get('ORTHO', 0.24)))
            render(scn, 'ht_%s_%s' % (key, vname), R_, R_, samples, transparent=True)
    else:                                                    # turnaround: front, three-quarter, side, back (orthographic)
        views = {'front': (1, 0), '34': (0.74, -0.67), 'side': (0, -1), 'back': (-1, 0)}
        for vname in os.environ.get('VIEWS', 'front,34,side,back').split(','):
            scn = reset(); _M.clear()
            root, hd = build(key, (0, 0, 0), 0.0, os.environ.get('EXPR', 'happy'))
            shadow_catcher()
            lighting(scn, sun_dir=(0.5, -0.6, 0.85), sun=3.4)
            dx, dy = views[vname]
            tgt = Vector((-0.08, 0, 0.3)) if vname in ('side', '34') else Vector((0.0, 0, 0.3))
            camera(scn, tuple(tgt + Vector((dx, dy, 0.16 if vname in ('34', 'side') else 0.05)) * 6), tuple(tgt), ortho=float(os.environ.get('ORTHO', 1.0)))
            render(scn, 'turn_%s_%s' % (key, vname), R_, R_, samples, transparent=True)
