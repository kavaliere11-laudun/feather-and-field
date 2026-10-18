"""The Feather & Field farmer: a chunky, friendly character in the same style as the hens, in two looks ('m' and 'f').
Straw hat, checked shirt with rolled sleeves, denim dungarees, wellies. Posable body (arms, legs, hands) and the same kind of
face rig as the hens (eyelids, pupils, brows), plus a mouth that can smile, grin, talk, shout or wobble.
build(look, pose, expr) -> (root, head). The character faces +X, its left is +Y."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import hen_char as HC

K = 1 / 0.575
LOOKS = {
    'm': dict(skin='#eab48c', blush='#f08a7a', hair='#6b3b1f', iris='#4f7d3a', shirt=('#f4ead9', '#c8372d', '#7c1f19'), denim='#3e6ea3',
              boots='#3f6e3c', band='#3d6aa8', hat='#e6c26c', beard=True, lashes=False),
    'f': dict(skin='#a8714f', blush='#e0746a', hair='#2a1a12', iris='#4a2c18', shirt=('#f6efe0', '#e0566a', '#8f2236'), denim='#3e6ea3',
              boots='#efbf3a', band='#d8343a', hat='#e6c26c', beard=False, lashes=True),
}
_F = {}
HAT_TILT = -10                 # degrees the hat is pushed back (more for the farm-map sprites, so the face shows)


def plaid(name, cols, f=135.0, axes=('Y', 'Z')):
    """A checked shirt fabric: light ground, coloured bands both ways, darker where they cross."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links; b = N['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.85
    if 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = 0.4
    tc = N.new('ShaderNodeTexCoord'); sp = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sp.inputs[0])
    facs = []
    for ax in axes:
        mm = N.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = f; L.new(sp.outputs[ax], mm.inputs[0])
        sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'; L.new(mm.outputs[0], sn.inputs[0])
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.35; L.new(sn.outputs[0], gt.inputs[0])
        facs.append(gt)
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; L.new(facs[0].outputs[0], ad.inputs[0]); L.new(facs[1].outputs[0], ad.inputs[1])
    hf = N.new('ShaderNodeMath'); hf.operation = 'MULTIPLY'; hf.inputs[1].default_value = 0.5; L.new(ad.outputs[0], hf.inputs[0])
    cr = N.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'CONSTANT'
    el = cr.color_ramp.elements; el[0].position, el[0].color = 0.0, lin(cols[0]); el[1].position, el[1].color = 0.75, lin(cols[2])
    e = el.new(0.25); e.color = lin(cols[1])
    L.new(hf.outputs[0], cr.inputs[0]); L.new(cr.outputs['Color'], b.inputs['Base Color'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 400; L.new(tc.outputs['Object'], nz.inputs[0])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.08; L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m


def mats(look):
    if look in _F: return _F[look]
    P = LOOKS[look]
    d = dict(
        skin=mat('fm_skin_' + look, P['skin'], rough=0.55, spec=0.3, sss=0.25),
        nose=mat('fm_nose_' + look, P['skin'], rough=0.5, spec=0.35, sss=0.3, ramp=[(0, P['skin']), (1, P['blush'])]),
        hair=mat('fm_hair_' + look, P['hair'], rough=0.55, spec=0.35, sheen=0.3, bump=0.25, bump_scale=90),
        shirt=plaid('fm_shirt_' + look, P['shirt']),
        shirt_arm=plaid('fm_shirtarm_' + look, P['shirt'], axes=('X', 'Z')),
        denim=mat('fm_denim_' + look, P['denim'], rough=0.85, spec=0.15, bump=0.35, bump_scale=260, var=0.0),
        stitch=mat('fm_stitch', '#e9b44c', rough=0.6),
        brass=mat('fm_brass', '#d9a441', rough=0.3, metal=0.8, spec=0.6),
        boots=mat('fm_boots_' + look, P['boots'], rough=0.3, spec=0.6, coat=0.3),
        sole=mat('fm_sole', '#4a3a2c', rough=0.8),
        hat=mat('fm_hat', P['hat'], rough=0.8, spec=0.15, grain=0.35, grain_scale=(30, 30, 3)),
        band=mat('fm_band_' + look, P['band'], rough=0.6),
        white=mat('fm_white', '#fbf8f2', rough=0.25, spec=0.6, coat=0.2),
        iris=mat('fm_iris_' + look, P['iris'], rough=0.2, spec=0.6),
        pupil=mat('fm_pupil', '#0a0706', rough=0.2, spec=0.6),
        shine=mat('fm_shine', '#ffffff', rough=0.2, emission=('#ffffff', 3.0)),
        lid=mat('fm_lid_' + look, P['skin'], rough=0.55, spec=0.3, sss=0.2),
        line=mat('fm_line', '#3b1d14', rough=0.6),
        mouth=mat('fm_mouth', '#5c1d1f', rough=0.6),
        teeth=mat('fm_teeth', '#fbf6ec', rough=0.3, spec=0.5),
        tongue=mat('fm_tongue', '#e06d78', rough=0.45, sss=0.2),
    )
    _F[look] = d; return d


# ------------------------------------------------------------------ poses and faces
# joint angles in degrees. shoulders: (x = out to the side, y = - raise forwards, z = twist); elbow: bend forwards (negative);
# hips: (x = out, y = - leg forwards); knee: bend backwards (positive); chest: (roll, pitch forwards +, yaw); head: (roll, pitch down +, yaw)
POSES = {
    'stand':   dict(),
    'turn':    dict(shL=(6, 0, 0), shR=(-6, 0, 0), elL=-8, elR=-8, hand=('relax', 'relax')),
    'wave':    dict(shL=(14, -4, 0), elL=-14, shR=(-128, -18, 0), elR=-28, wrR=(0, 0, 0), hand=('relax', 'open'), chest=(-3, 0, 0), head=(-6, -2, 0)),
    'telloff': dict(chest=(0, 10, 0), head=(0, 4, 0), shR=(-58, -28, 0), elR=(-108, 0, 0), wrR=(0, 0, 0), shL=(38, 18, 0), elL=(-70, -20, 0), hand=('fist', 'point'), hipL=(0, -8, 0), hipR=(0, 10, 0), kneeR=10),
    'worried': dict(head=(8, -4, 12), chest=(4, 4, 0), shL=(18, -55, 0), elL=-125, shR=(-18, -55, 0), elR=-125, hand=('relax', 'relax'), wrL=(0, -20, 0), wrR=(0, -20, 0)),
    'panic':   dict(chest=(0, 18, -6), head=(0, -6, -4), shR=(-10, -75, 0), elR=-15, shL=(8, 40, 0), elL=-50, hand=('fist', 'hold'), hipL=(0, -32, 0), kneeL=14, hipR=(0, 26, 0), kneeR=34, root_z=-0.01),
    'cuddle':  dict(head=(-6, 10, 0), chest=(0, -4, 0), shL=(6, -50, 0), elL=(-45, -72, 0), shR=(-6, -50, 0), elR=(45, -72, 0), hand=('relax', 'relax'), wrL=(0, 0, -20), wrR=(0, 0, 20)),
    'feed':    dict(chest=(0, 4, 12), head=(0, 8, 14), shR=(-62, -40, 0), elR=-25, shL=(10, -12, 0), elL=-20, hand=('open', 'hold')),
}
FACE = {
    'neutral': dict(up=0.75, lo=-0.8, look=(0, 0), brow=0.0, brow_h=0.2, mouth='smile', blush=0.35),
    'happy':   dict(up=0.95, lo=-0.62, smile=0.5, look=(0.0, 0.05), brow=-0.05, brow_h=0.5, mouth='grin', blush=0.6),
    'stern':   dict(up=0.55, lo=-0.62, tilt=18, look=(0.0, 0.0), brow=-0.75, brow_h=-0.1, mouth='talk', blush=0.3),
    'worried': dict(up=0.82, lo=-0.75, tilt=-14, look=(-0.55, 0.0), brow=0.75, brow_h=0.35, mouth='wavy', blush=0.2),
    'panic':   dict(up=1.0, lo=-1.0, eye=1.12, pupil=0.55, look=(0.0, 0.0), brow=0.6, brow_h=0.95, mouth='o', blush=0.0, fx='sweat'),
    'cuddle':  dict(closed='happy', brow=0.1, brow_h=0.45, mouth='smile', blush=1.0, fx='hearts'),
    'feeding': dict(up=0.9, lo=-0.66, smile=0.45, look=(0.35, -0.2), brow=0.0, brow_h=0.4, mouth='grin', blush=0.5),
}


def limb(name, L, r1, r2, m, parent):
    """Simple and sturdy: a tapered cylinder with a ball at each end (the balls hide the bend at the joints)."""
    c = cyl(name, r1, L, (0, 0, -L / 2), (0, 0, 0), m, verts=20, r2=r2, bevel=0.0, parent=parent)
    for p in c.data.polygons: p.use_smooth = True
    for mod in list(c.modifiers): c.modifiers.remove(mod)
    sphere(name + '_top', r1, (0, 0, 0), m=m, parent=parent, seg=20, rings=12)
    sphere(name + '_end', r2, (0, 0, -L), m=m, parent=parent, seg=20, rings=12)
    return c


def hand(side, shape, Mt, parent):
    """A friendly cartoon hand: a soft mitten for three fingers, a separate index finger and a thumb.
    shape: relax | open | point | fist | hold. The palm faces the body (towards -side*Y), fingers point down (-Z)."""
    s = side
    root = empty('hand', (0, 0, -0.012), (0, 0, 0), parent); root.scale = (1.35, 1.35, 1.35)
    sphere('palm', 1.0, (0, 0, -0.035), (0.03, 0.019, 0.036), m=Mt['skin'], parent=root, seg=20, rings=12)
    curl = {'relax': 25, 'open': 5, 'point': 95, 'fist': 105, 'hold': 85}[shape]
    icurl = {'relax': 18, 'open': 0, 'point': 0, 'fist': 110, 'hold': 85}[shape]
    spread = {'open': 14}.get(shape, 4)
    # three fingers as one soft mitten, bent at the knuckles
    k = empty('knuckle', (-0.004, 0, -0.064), (math.radians(-s * curl), 0, 0), root)
    sphere('mitten', 1.0, (0, 0, -0.02), (0.017, 0.016, 0.028), m=Mt['skin'], parent=k, seg=18, rings=12)
    # index finger
    ki = empty('idx', (0.018, 0, -0.06), (math.radians(-s * icurl), math.radians(-spread), 0), root)
    limb('index', 0.042 if shape == 'point' else 0.032, 0.0088, 0.008, Mt['skin'], ki)
    # thumb, on the front side of the hand
    kt = empty('thumb', (0.026, -s * 0.004, -0.022), (math.radians(-s * (40 if shape in ('fist', 'hold') else 20)), math.radians(-50), 0), root)
    limb('thumbf', 0.026, 0.0095, 0.008, Mt['skin'], kt)
    return root


def head_shape(name, hr, m, parent):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=40, radius=1.0)
    def bump(v, c, amt, sig):
        c = Vector(c).normalized(); return amt * math.exp(-((v - c).length_squared) / sig)
    for v in bm.verts:
        u = v.co.copy(); p = u.copy()
        out = 0.0
        for sd in (1, -1):
            out += bump(u, (0.7, sd * 0.55, -0.35), 0.08, 0.09)      # round cheeks
        out += bump(u, (0.8, 0.0, -0.6), 0.04, 0.06)                # little chin
        out -= bump(u, (0.95, 0.0, 0.05), 0.03, 0.05)               # a slightly flatter face
        p += u * out
        if u.z < -0.3: p.y *= 1 - 0.12 * (-u.z - 0.3)               # a softer jaw
        v.co = Vector((p.x * 0.96, p.y * 1.0, p.z * 1.06)) * hr
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m); subsurf(o, 1)
    for poly in o.data.polygons: poly.use_smooth = True
    o.parent = parent
    return o


def decal(name, pts2, centre_dir, U, V, surf, m, parent, off=0.0012, fill=True):
    """Project a flat 2-D shape onto the face (pts2 in metres around the mouth point); a filled patch or a curve line."""
    out = []
    for (u, v) in pts2:
        d = (centre_dir + U * u + V * v).normalized()
        p, n = surf(d)
        out.append(p + n * off)
    if not fill: return out
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new(p) for p in out]
    c = sum(out, Vector()) / len(out)
    cd = (c - Vector()).normalized(); pc, nc = surf(cd); cv = bm.verts.new(pc + nc * off)
    for i in range(len(vs)): bm.faces.new((cv, vs[i], vs[(i + 1) % len(vs)]))
    bm.normal_update()
    if sum(f.normal.dot(cd) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); setmat(o, m)
    for p in o.data.polygons: p.use_smooth = True
    o.parent = parent; return o


def mouth(kind, hd, hr, surf, Mt):
    """Mouth shapes drawn onto the face: smile, grin (open, teeth), talk, o (shout), wavy (worried), frown, flat."""
    cdir = Vector((0.93, 0, -0.43)).normalized() * hr
    U = Vector((0, 1, 0)); V = Vector((0, 0, 1)).cross(Vector((0, 1, 0))).cross(Vector((0, 1, 0)))
    V = Vector((0.3, 0, 0.95)).normalized()
    w = 0.042 * hr / 0.165
    def ring(fn, n=36): return [fn(i / n * math.tau) for i in range(n)]
    def line(pts, depth=0.0028):
        P = decal('m', pts, cdir, U, V, surf, Mt['line'], hd, off=0.0016, fill=False)
        curve_line_world('mline', P, depth, Mt['line'], hd)
    if kind in ('smile', 'frown', 'flat', 'wavy'):
        pts = []
        for i in range(25):
            u = -1 + 2 * i / 24
            v = {'smile': -0.32 * (1 - u * u) + 0.08 * u * u, 'frown': 0.25 * (1 - u * u) - 0.12, 'flat': -0.05 * u * u,
                 'wavy': 0.09 * math.sin(u * math.pi * 2.0) - 0.05}[kind]
            pts.append((u * w * (0.8 if kind == 'wavy' else 1.0), v * w))
        line(pts)
        return
    if kind == 'grin':      # a big open smile: straight-ish top, round bottom
        def outline(t):
            u = math.cos(t); s = math.sin(t)
            return (u * w * 1.05, (0.06 * w * (1 - u * u) - 0.02 * w) if s > 0 else (-0.62 * w * math.sqrt(max(0, 1 - u * u)) * (0.9 + 0.1 * abs(u))))
        top_teeth = lambda t: (math.cos(t) * w * 0.8, (0.03 * w) + math.sin(t) * 0.1 * w - 0.07 * w)
        tongue = lambda t: (math.cos(t) * w * 0.5, -0.45 * w + math.sin(t) * 0.13 * w)
    elif kind == 'talk':
        outline = lambda t: (math.cos(t) * w * 0.7, -0.18 * w + math.sin(t) * 0.3 * w)
        top_teeth = lambda t: (math.cos(t) * w * 0.55, 0.05 * w + math.sin(t) * 0.07 * w)
        tongue = lambda t: (math.cos(t) * w * 0.35, -0.36 * w + math.sin(t) * 0.08 * w)
    else:                   # 'o': a big shout
        outline = lambda t: (math.cos(t) * w * 0.55, -0.28 * w + math.sin(t) * 0.55 * w)
        top_teeth = lambda t: (math.cos(t) * w * 0.32, 0.2 * w + math.sin(t) * 0.05 * w)
        tongue = lambda t: (math.cos(t) * w * 0.32, -0.62 * w + math.sin(t) * 0.12 * w)
    decal('mouth', ring(outline), cdir, U, V, surf, Mt['mouth'], hd, off=0.0008)
    decal('teeth', ring(top_teeth), cdir, U, V, surf, Mt['teeth'], hd, off=0.0014)
    decal('tongue', ring(tongue), cdir, U, V, surf, Mt['tongue'], hd, off=0.0014)
    P = decal('lip', ring(outline, 48) + [ring(outline, 48)[0]], cdir, U, V, surf, Mt['line'], hd, off=0.0018, fill=False)
    curve_line_world('lipline', P, 0.0016, Mt['line'], hd)


def curve_line_world(name, pts, depth, m, parent):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = depth; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], p[2], 1.0)
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(m); o.parent = parent
    return o


def build(look='m', pose='stand', expr='neutral', loc=(0, 0, 0), yaw=0.0, seed=3):
    random.seed(seed)
    P = LOOKS[look]; Mt = mats(look)
    Q = dict(POSES['stand']); Q.update(POSES[pose] if isinstance(pose, str) else pose)
    X = dict(FACE['neutral']); X.update(FACE[expr] if isinstance(expr, str) else expr)
    D = lambda a: tuple(math.radians(v) for v in a)
    root = empty('farmer_' + look, loc, (0, 0, yaw))
    pel = empty('pelvis', (0, 0, 0.56 + Q.get('root_z', 0)), (0, 0, 0), root)
    chest = empty('chest', (0, 0, 0.14), D(Q.get('chest', (0, 0, 0))), pel)
    # ---- torso: one soft shape, shirt above the waist, dungarees below and on the bib
    E = [('ELLIPSOID', (0.012, 0, -0.13), 0.165 * K, (0.92, 1.05, 0.85), 2.0),
         ('ELLIPSOID', (0.0, 0, 0.07), 0.15 * K, (0.85, 1.12, 0.95), 2.0),
         ('BALL', (-0.005, 0.15, 0.15), 0.07 * K, None, 2.0), ('BALL', (-0.005, -0.15, 0.15), 0.07 * K, None, 2.0),
         ('ELLIPSOID', (0.0, 0, 0.25), 0.058 * K, (1, 1, 1.2), 2.0)]
    torso = metaball_mesh('torso', E, res=0.008, m=Mt['shirt'], parent=chest)
    torso.data.materials.append(Mt['denim'])
    for poly in torso.data.polygons:
        c = poly.center
        bib = c.x > 0.02 and abs(c.y) < 0.085 and c.z < 0.11
        if c.z < -0.05 or bib: poly.material_index = 1
    # bib edge stitching, straps and buttons
    surfT = HC.surface_finder(torso)
    def on_torso(y, z, off=0.004):
        p, n = surfT(Vector((1.0, y * 6, z * 3)).normalized(), origin=(0, y, z)); return p + n * off
    edge = [on_torso(-0.085, -0.05), on_torso(-0.085, 0.11), on_torso(0.085, 0.11), on_torso(0.085, -0.05)]
    pts = []
    for a, b in zip(edge[:-1], edge[1:]):
        for i in range(6): pts.append(a.lerp(b, i / 6))
    pts.append(edge[-1])
    curve_line_world('bibseam', pts, 0.0025, Mt['stitch'], chest)
    for sd in (1, -1):
        a = on_torso(sd * 0.07, 0.105, 0.006)
        def on_back(y, z, off=0.007):
            p, n = surfT(Vector((-1.0, y * 6, z * 3)).normalized(), origin=(0, y, z)); return p + n * off
        def over(y, x, off=0.008):                     # over the top of the shoulder
            p, n = surfT(Vector((x * 3, y * 2, 1.0)).normalized(), origin=(x, y, 0.1)); return p + n * off
        strap = [a, on_torso(sd * 0.085, 0.16, 0.008), over(sd * 0.1, 0.03), over(sd * 0.1, -0.05), on_back(sd * 0.085, 0.13), on_back(sd * 0.06, 0.03), on_back(sd * 0.03, -0.06)]
        o = curve_line_world('strap', strap, 0.016, Mt['denim'], chest)
        o.data.bevel_resolution = 2
        b = sphere('button', 0.012, tuple(a + Vector((0.003, 0, -0.004))), (0.5, 1, 1), m=Mt['brass'], parent=chest, seg=16, rings=10)
    pk = on_torso(0.0, 0.04, 0.003)
    box('pocket', (0.012, 0.075, 0.05), tuple(pk), (0, math.radians(-8), 0), Mt['denim'], bevel=0.006, parent=chest)
    # ---- head
    head = empty('head', (0, 0, 0.3), D(Q.get('head', (0, 0, 0))), chest)
    hr = 0.2; hs = hr / 0.165
    hd = empty('headc', (0.0, 0, 0.165), (0, 0, 0), head)
    hobj = head_shape('headm', hr, Mt['skin'], hd)
    surf = HC.surface_finder(hobj)
    if X.get('blush', 0) > 0.01:
        bc, _ = surf((0.75, 0.55, -0.3))
        hobj.data.materials[0] = HC.blush_face(Mt['skin'], X['blush'], 0.062, centre=(bc.x, abs(bc.y), bc.z))
        # blush_face sizes its oval for a hen's head; widen it for the farmer's bigger cheeks
        mm = hobj.data.materials[0]
        for n in mm.node_tree.nodes:
            if n.type == 'VECT_MATH' and n.operation == 'MULTIPLY': n.inputs[1].default_value = (1 / 0.05, 1 / 0.05, 1 / 0.035)
    np_, nn_ = surf((1.0, 0, -0.18))
    sphere('nose', 1.0, tuple(np_ - nn_ * 0.004), (0.021 * hs, 0.025 * hs, 0.02 * hs), m=Mt['nose'], parent=hd, seg=20, rings=12)
    for sd in (1, -1):
        ep, en = surf((0.0, sd * 1.0, -0.08))
        e = sphere('ear', 1.0, (0, 0, 0), m=Mt['skin'], parent=hd, seg=18, rings=12)
        e.matrix_basis = HC.basis(ep - en * 0.004, Vector((0.25, 0, 1)), en) @ Matrix.Diagonal((0.033 * hs, 0.013 * hs, 0.023 * hs, 1))
    # ---- eyes (same rig as the hens: lids, pupils, catchlights, brows)
    R = 0.037 * X.get('eye', 1.0)
    for s in (1, -1):
        n = Vector((0.9, s * 0.36, 0.06)).normalized()
        sp_, _ = surf(n)
        ic = sp_ - n * 0.014
        up = Vector((0, 0, 1)); Zl = (up - n * up.dot(n)).normalized(); Xl = n.cross(Zl)
        inner = Xl * s
        Fm = Matrix.Translation(ic) @ Matrix((Xl, n, Zl)).transposed().to_4x4()
        shut = X.get('closed')
        sphere('eyeball', R, tuple(ic), m=Mt['white'], parent=hd, seg=28, rings=16)
        lx, lz = X.get('look', (0, 0))
        d = (n + inner * lx * 0.5 + Zl * lz * 0.5).normalized()
        if not shut:
            HC.heart_pupil('iris', R, ic, d, R * 0.6, Mt['iris'], hd, outline=HC.circle_outline())
            HC.heart_pupil('pupil', R * 1.002, ic, d, R * 0.3 * X.get('pupil', 1.0), Mt['pupil'], hd, outline=HC.circle_outline())
            for (a, b_, r_) in ((0.45, 0.25, 0.2), (-0.3, -0.3, 0.09)):
                sd_ = (d + Zl * a + inner * b_).normalized()
                sphere('shine', R * r_, tuple(ic + sd_ * R * 1.0), m=Mt['shine'], parent=hd, seg=10, rings=6)
        Rl = R * 1.07
        tilt = math.radians(X.get('tilt', 0))
        if shut:
            HC.cap('lidfull', Rl, (0, 0, 1), -1.0, True, Mt['lid'], hd, Fm)
            pts = []
            for i in range(17):
                u = -1 + 2 * i / 16; x = u * R * 0.9
                z = 0.32 * R * (1 - u * u) - 0.05 * R
                y = math.sqrt(max(0.0, (Rl * 1.02) ** 2 - x * x - z * z)); pts.append((x, y, z))
            HC.curve_line('lash', pts, 0.0024, Mt['line'], hd, Fm)
        else:
            HC.cap('lidup', Rl, (math.sin(tilt) * s, 0, math.cos(tilt)), X.get('up', 0.75), True, Mt['lid'], hd, Fm)
            if X.get('smile'):
                lo_, sm_, R_l = X.get('lo', -0.7), X['smile'], Rl * 0.995
                HC.lid_patch('lidlo', R_l, lambda x: R_l * (lo_ + sm_ * (1 - (x / R_l) ** 2)), True, Mt['lid'], hd, Fm, thick=0.001)
            else:
                HC.cap('lidlo', Rl * 0.995, (0, 0, 1), X.get('lo', -0.8), False, Mt['lid'], hd, Fm)
            # upper lash line along the lid edge (thicker, with little flicks, on the 'f' look)
            lv = X.get('up', 0.75)
            if lv < 0.999:
                pts = []
                for i in range(21):
                    u = -0.98 + 1.96 * i / 20; x = u * Rl * math.sqrt(max(0, 1 - lv * lv))
                    z = lv * Rl - math.tan(tilt) * x * s if False else lv * Rl + (-math.sin(tilt) * s * x)
                    y2 = (Rl * 1.01) ** 2 - x * x - z * z
                    if y2 > 0: pts.append((x, math.sqrt(y2), z))
                if len(pts) > 2:
                    HC.curve_line('lashline', pts, 0.0028 if P['lashes'] else 0.0016, Mt['line'], hd, Fm)
                    if P['lashes']:
                        x0, y0, z0 = pts[-1] if s > 0 else pts[0]
                        HC.curve_line('flick', [(x0, y0, z0), (x0 + (-0.006 if s > 0 else 0.006) * 0, y0 + 0.002, z0 + 0.004)], 0.0016, Mt['line'], hd, Fm)
        # brow: a soft curved stroke of hair colour
        bsl, bh = X.get('brow', 0.0), X.get('brow_h', 0.0)
        bp_, bn_ = surf((ic + Zl * (R * (1.45 + 0.5 * bh))).normalized())
        bpos = bp_ + bn_ * 0.003
        ang = -bsl * math.radians(26) * s
        frame = HC.basis(bpos, Xl, bn_) @ Matrix.Rotation(ang, 4, 'Y')
        pts = []
        for i in range(9):
            u = -1 + 2 * i / 8
            pts.append(tuple(frame @ Vector((u * 0.036, 0.0, 0.008 * (1 - u * u)))))
        o = curve_line_world('brow', [Vector(p) for p in pts], 0.0075 if look == 'm' else 0.0058, Mt['hair'], hd)
    mouth(X.get('mouth', 'smile'), hd, hr, surf, Mt)
    # ---- hair and hat
    hair(look, hd, hr, surf, Mt)
    hat(look, hd, hr, Mt)
    # ---- arms
    for side, key in ((1, 'L'), (-1, 'R')):
        sh = empty('shoulder' + key, (-0.005, side * 0.19, 0.155), D(Q.get('sh' + key, (side * 6, 0, 0))), chest)
        limb('upperarm', 0.2, 0.058, 0.05, Mt['shirt_arm'], sh)
        ev = Q.get('el' + key, -6); ev = (0, ev, 0) if isinstance(ev, (int, float)) else ev
        el = empty('elbow' + key, (0, 0, -0.2), D(ev), sh)
        cuff = bpy.data.meshes.new('cuff'); bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=0.054, radius2=0.052, depth=0.034); bm.to_mesh(cuff); bm.free()
        co = link(bpy.data.objects.new('cuff', cuff)); setmat(co, Mt['shirt_arm']); co.parent = el; co.location = (0, 0, -0.012)
        sm = co.modifiers.new('s', 'SOLIDIFY'); sm.thickness = 0.008; subsurf(co, 1)
        for p in co.data.polygons: p.use_smooth = True
        limb('forearm', 0.18, 0.045, 0.036, Mt['skin'], el)
        wr = empty('wrist' + key, (0, 0, -0.18), D(Q.get('wr' + key, (0, 0, 0))), el)
        hs = Q.get('hand', ('relax', 'relax'))
        hand(side, hs[0] if side > 0 else hs[1], Mt, wr)
    # ---- legs and wellies
    for side, key in ((1, 'L'), (-1, 'R')):
        hp = empty('hip' + key, (0.0, side * 0.085, -0.05), D(Q.get('hip' + key, (0, 0, 0))), pel)
        limb('thigh', 0.17, 0.078, 0.066, Mt['denim'], hp)
        kn = empty('knee' + key, (0, 0, -0.17), (0, math.radians(Q.get('knee' + key, 0)), 0), hp)
        limb('shin', 0.2, 0.064, 0.058, Mt['denim'], kn)
        an = empty('ankle' + key, (0, 0, -0.24), (0, -math.radians(Q.get('knee' + key, 0)) - math.radians(Q.get('hip' + key, (0, 0, 0))[1]) * 0.6, 0), kn)
        boot = cyl('boot', 0.07, 0.17, (0, 0, 0.065), (0, 0, 0), Mt['boots'], verts=24, r2=0.074, bevel=0.01, parent=an)
        sphere('toe', 1.0, (0.06, 0, -0.04), (0.11, 0.072, 0.06), m=Mt['boots'], parent=an, seg=24, rings=14)
        sphere('heel', 1.0, (-0.01, 0, -0.045), (0.075, 0.07, 0.05), m=Mt['boots'], parent=an, seg=20, rings=12)
        cyl('sole', 0.072, 0.018, (0.04, 0, -0.09), (0, 0, 0), Mt['sole'], verts=24, bevel=0.006, parent=an).scale = (1.55, 1.0, 1.0)
        rim = cyl('bootrim', 0.077, 0.022, (0, 0, 0.15), (0, 0, 0), Mt['boots'], verts=24, bevel=0.006, parent=an)
    root['look'] = look
    return root, hd


def hair(look, hd, hr, surf, Mt):
    if look == 'm':
        E = []
        for i in range(26):                                         # short tousled hair: sides and back, under the hat
            a = math.radians(70 + i * (220 / 25)); z = random.uniform(-0.05, 0.35)
            d = Vector((math.cos(a) * 0.95, math.sin(a), z)).normalized()
            p, n = surf(d); E.append(('BALL', tuple(p - n * 0.01), 0.026 * K, None, 2.0))
        for sd in (1, -1):                                          # sideburns
            p, n = surf((0.25, sd * 1.0, -0.25)); E.append(('ELLIPSOID', tuple(p - n * 0.006), 0.016 * K, (0.6, 0.6, 1.6), 2.0))
        metaball_mesh('hair', E, res=0.006, m=Mt['hair'], parent=hd)
        # a short, full beard over the chin and jaw, below the mouth
        E = []
        for i in range(15):
            a = math.radians(-84 + i * 12)
            for zz, rr in ((-0.55, 0.03), (-0.78, 0.034), (-0.95, 0.03)):
                d = Vector((math.cos(a) * (0.8 if zz > -0.9 else 0.5), math.sin(a), zz)).normalized()
                if zz == -0.55 and abs(math.degrees(a)) < 40: continue        # keep the mouth clear
                p, n = surf(d); E.append(('BALL', tuple(p + n * 0.004), rr * K, None, 2.0))
        for sd in (1, -1):
            p, n = surf((0.2, sd * 1.0, -0.3)); E.append(('ELLIPSOID', tuple(p), 0.024 * K, (0.7, 0.7, 1.4), 2.0))
        metaball_mesh('beard', E, res=0.005, m=Mt['hair'], parent=hd)
    else:
        E = []
        for i in range(16):                                         # hair framing the face and covering the back of the head (big soft shapes)
            a = math.radians(60 + i * (240 / 15))
            for z in (0.05, 0.4):
                d = Vector((math.cos(a) * 0.95, math.sin(a), z)).normalized()
                p, n = surf(d); E.append(('BALL', tuple(p - n * 0.02), 0.042 * K, None, 2.0))
        for x, z in ((-0.6, 0.6), (-0.3, 0.68), (0.0, 0.72)):           # a side-swept fringe peeking out under the brim
            p, n = surf((0.8, x, z)); E.append(('ELLIPSOID', tuple(p - n * 0.012), 0.026 * K, (1, 1.5, 0.7), 2.0))
        for sd in (1, -1):                                          # locks in front of the ears
            p, n = surf((0.35, sd * 0.95, -0.2)); E.append(('ELLIPSOID', tuple(p - n * 0.004), 0.02 * K, (0.7, 0.7, 2.0), 2.0))
        metaball_mesh('hair', E, res=0.006, m=Mt['hair'], parent=hd)
        # a long plait over her right shoulder, tied with a ribbon
        p0, n0 = surf((-0.4, -0.85, -0.35))
        pts = [p0, p0 + Vector((0.03, -0.04, -0.1)), p0 + Vector((0.09, -0.05, -0.2)), p0 + Vector((0.14, -0.04, -0.3)), p0 + Vector((0.17, -0.03, -0.38))]
        beads = []
        for i in range(14):
            t = i / 13; seg = min(3, int(t * 4)); f = t * 4 - seg
            p = pts[seg].lerp(pts[seg + 1], f)
            side = 0.01 if i % 2 else -0.01
            beads.append(('ELLIPSOID', tuple(p + Vector((0, side, 0))), (0.026 - 0.008 * t) * K, (0.9, 0.9, 1.25), 2.0))
        metaball_mesh('plait', beads, res=0.005, m=Mt['hair'], parent=hd)
        tip = pts[-1]
        sphere('ribbon', 1.0, tuple(tip + Vector((0, 0, 0.018))), (0.022, 0.03, 0.012), m=Mt['band'], parent=hd, seg=16, rings=10)
        for sd in (1, -1):
            r = sphere('bow', 1.0, tuple(tip + Vector((0.005, sd * 0.02, 0.022))), (0.012, 0.02, 0.01), (sd * 0.4, 0, 0), m=Mt['band'], parent=hd, seg=14, rings=8)
        metaball_mesh('plaitend', [('ELLIPSOID', tuple(tip + Vector((0.004, 0, -0.03))), 0.016 * K, (0.9, 0.9, 1.5), 2.0)], res=0.004, m=Mt['hair'], parent=hd)


def hat(look, hd, hr, Mt):
    h = empty('hat', (-0.012, 0, hr * 0.64), (0, math.radians(HAT_TILT), 0), hd); h.scale = (hr / 0.165,) * 3
    crown = cyl('crown', 0.128, 0.105, (0, 0, 0.06), (0, 0, 0), Mt['hat'], verts=40, r2=0.112, bevel=0.03, parent=h)
    subsurf(crown, 1)
    dent = sphere('crowntop', 1.0, (0, 0, 0.11), (0.11, 0.1, 0.03), m=Mt['hat'], parent=h, seg=32, rings=12)
    me = bpy.data.meshes.new('brim'); bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, segments=64, radius=1.0)
    rings = []
    for k in range(6):
        r = 0.115 + (0.27 - 0.115) * k / 5
        rings.append([bm.verts.new((math.cos(a) * r, math.sin(a) * r * 0.96, -0.012 * (k / 5) ** 2 * (1.6 if look == 'm' else 2.4) * 2.2 + 0.006 * math.cos(2 * a) * (k / 5))) for a in [i / 64 * math.tau for i in range(64)]])
    for v in list(bm.verts):
        if not any(v in r for r in rings): bm.verts.remove(v)
    for k in range(5):
        for i in range(64):
            j = (i + 1) % 64; bm.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bm.to_mesh(me); bm.free()
    br = link(bpy.data.objects.new('brim', me)); setmat(br, Mt['hat']); br.parent = h; br.location = (0, 0, 0.012)
    sm = br.modifiers.new('s', 'SOLIDIFY'); sm.thickness = 0.012; sm.offset = 0; subsurf(br, 2)
    for p in br.data.polygons: p.use_smooth = True
    band = cyl('band', 0.129, 0.028, (0, 0, 0.026), (0, 0, 0), Mt['band'], verts=40, r2=0.126, bevel=0.004, parent=h)
    if look == 'f':                                                # a little flower on the band
        fm = mat('fm_flower', '#fff3c4', rough=0.5); fc = mat('fm_flowerc', '#f2b632', rough=0.5)
        c = Vector((0.06, 0.112, 0.03))
        for i in range(6):
            a = i / 6 * math.tau
            sphere('petal', 1.0, tuple(c + Vector((0, math.cos(a) * 0.016, math.sin(a) * 0.016)) * 1.0), (0.006, 0.013, 0.008), (a, 0, 0), m=fm, parent=h, seg=12, rings=8)
        sphere('fcentre', 0.008, tuple(c + Vector((0, 0.004, 0))), m=fc, parent=h, seg=12, rings=8)


# ------------------------------------------------------------------ props
def torch_prop(hand_world, fwd):
    """A big rubber torch with a soft beam of light."""
    body = mat('fm_torch', '#2f5a3a', rough=0.35, spec=0.5, coat=0.3); metal = mat('fm_torchm', '#c9ccd1', rough=0.25, metal=0.9)
    glow = mat('fm_lens', '#fff4b8', rough=0.2, emission=('#fff1a0', 8.0))
    beam = bpy.data.materials.new('fm_beam'); beam.use_nodes = True; nt = beam.node_tree; N = nt.nodes
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader')
    em.inputs['Color'].default_value = lin('#ffdd6e'); em.inputs['Strength'].default_value = 2.6; mx.inputs[0].default_value = 0.34
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs[0])
    if hasattr(beam, 'blend_method'): beam.blend_method = 'BLEND'
    f = Vector(fwd).normalized()
    M = Matrix.Translation(hand_world) @ f.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    r = empty('torch'); r.matrix_world = M
    cyl('tbody', 0.026, 0.16, (0, 0, 0.0), (0, 0, 0), body, verts=24, bevel=0.006, parent=r)
    cyl('thead', 0.04, 0.06, (0, 0, 0.1), (0, 0, 0), body, verts=28, r2=0.046, bevel=0.008, parent=r)
    cyl('tring', 0.047, 0.012, (0, 0, 0.134), (0, 0, 0), metal, verts=28, bevel=0.003, parent=r)
    cyl('tlens', 0.04, 0.004, (0, 0, 0.14), (0, 0, 0), glow, verts=28, bevel=0.0, parent=r)
    cyl('tbeam', 0.04, 0.55, (0, 0, 0.415), (0, 0, 0), beam, verts=32, r2=0.17, bevel=0.0, parent=r)
    return r


def bucket_prop(hand_world):
    pail = mat('fm_pail', '#b9c2c7', rough=0.35, metal=0.7, spec=0.5); grain = mat('fm_grain', '#f0b53a', rough=0.6)
    r = empty('bucket'); r.location = hand_world + Vector((0.0, 0.0, -0.2))
    b = cyl('pail', 0.1, 0.17, (0, 0, 0), (0, 0, 0), pail, verts=32, r2=0.12, bevel=0.006, parent=r)
    cyl('rim', 0.124, 0.012, (0, 0, 0.085), (0, 0, 0), pail, verts=32, bevel=0.004, parent=r)
    for i in range(30):
        a = random.uniform(0, math.tau); rr = random.uniform(0, 0.1)
        sphere('g', 1.0, (math.cos(a) * rr, math.sin(a) * rr, 0.075 + random.uniform(0, 0.012)), (0.009, 0.007, 0.006), (0, 0, a), grain, seg=8, rings=6, parent=r)
    pts = [(math.cos(t) * 0.12, math.sin(t) * 0.0, 0.08 + math.sin(t) * 0.12) for t in [i / 16 * math.pi for i in range(17)]]
    HC.curve_line('handle', pts, 0.004, pail, r, Matrix.Rotation(math.radians(90), 4, 'Z'))
    return r


def grain_arc(start, direction):
    grain = mat('fm_grain2', '#f0b53a', rough=0.6)
    d = Vector(direction).normalized()
    for i in range(26):
        t = random.uniform(0.05, 1.0)
        p = start + d * (0.55 * t) + Vector((0, 0, 0.12 * t - 0.75 * t * t)) + Vector((random.uniform(-0.04, 0.04), random.uniform(-0.04, 0.04), random.uniform(-0.03, 0.03)))
        sphere('fly', 1.0, tuple(p), (0.009, 0.007, 0.006), (random.uniform(0, 3), random.uniform(0, 3), 0), grain, seg=8, rings=6)


def fx_cam(kind, H, cam, k=1.0):
    """Little effects around the head, flat to the camera; offsets in metres in the picture plane."""
    Rc = cam.matrix_world.to_3x3().normalized(); R4 = Rc.to_4x4(); right, up, back = Rc.col[0], Rc.col[1], Rc.col[2]
    def at(o, ox, oy, oz=0.0, spin=0.0, scl=(1, 1, 1)):
        o.matrix_world = Matrix.Translation(H + right * ox * k + up * oy * k + back * oz * k) @ R4 @ Matrix.Rotation(math.radians(spin), 4, 'Z') @ Matrix.Diagonal((*scl, 1.0))
        return o
    if kind == 'hearts':
        m = HC._fxmat('heart', '#ff4f6d', 0.7)
        for (x, y, s, sp) in ((0.36, 0.3, 0.06, -14), (0.46, 0.44, 0.042, 12), (0.25, 0.5, 0.032, -20)):
            at(HC.heart(s * k, m), x, y, 0.15, sp)
    elif kind == 'sweat':
        m = HC._fxmat('tear', '#7ccaf8', 0.35)
        for (x, y, s, sp) in ((0.27, -0.02, 0.026, -20), (-0.27, 0.0, 0.022, 20), (0.31, -0.13, 0.018, -30)):
            o = HC.drop(s * k, m); at(o, x, y, 0.1, sp); o.matrix_world = o.matrix_world @ Matrix.Rotation(math.radians(-90), 4, 'X')
    elif kind == 'shout':
        m = HC._fxmat('excl', '#ff8a1f', 0.6)
        at(HC.text_obj('!', 0.17 * k, m), 0.4, 0.22, 0.15, -12)
        at(HC.text_obj('!', 0.12 * k, m), 0.5, 0.12, 0.15, 8)


MOODS = {        # mood: (look, pose, face, props)
    'happy':   ('f', 'wave', 'happy', ()),
    'telloff': ('m', 'telloff', 'stern', ('shout',)),
    'worried': ('f', 'worried', 'worried', ()),
    'panic':   ('m', 'panic', 'panic', ('torch', 'sweat')),
    'cuddle':  ('f', 'cuddle', 'cuddle', ('hen', 'hearts')),
    'feed':    ('m', 'feed', 'feeding', ('bucket', 'grain')),
}


def wpos(name_prefix, root):
    for o in root.children_recursive:
        if o.name.startswith(name_prefix): return o.matrix_world.translation.copy()
    return None


if __name__ == '__main__' and os.environ.get('MODE') == 'lineup':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 24
    scn = reset()
    build('m', 'turn', 'neutral', loc=(0, 0.62, 0), yaw=math.radians(8))
    HC.build('rir_h', (0.15, 0.0, 0), math.radians(-20), 'happy')
    build('f', 'turn', 'neutral', loc=(0, -0.62, 0), yaw=math.radians(-8))
    HC.shadow_catcher(6)
    lighting(scn, sun_dir=(0.5, -0.6, 0.85), sun=3.4)
    camera(scn, tuple(Vector((0, 0, 0.8)) + Vector((1.0, -0.25, 0.1)) * 9), (0, 0, 0.8), ortho=2.75)
    render(scn, 'fm_lineup', int(os.environ.get('RES', 900)), int(int(os.environ.get('RES', 900)) * 0.62), samples, transparent=True)
    sys.exit(0)

if __name__ == '__main__' and os.environ.get('MODE') == 'mood':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 24
    mood = os.environ.get('MOOD', 'happy'); look, pose, face, props = MOODS[mood]
    look = os.environ.get('LOOK', look); R_ = int(os.environ.get('RES', 500))
    scn = reset()
    root, hd = build(look, pose, face)
    HC.shadow_catcher()
    lighting(scn, sun_dir=(0.5, -0.6, 0.85), sun=3.4)
    bpy.context.view_layer.update()
    H = hd.matrix_world.translation.copy()
    wR = [o for o in root.children_recursive if o.name.startswith('wristR')][0].matrix_world
    wL = [o for o in root.children_recursive if o.name.startswith('wristL')][0].matrix_world
    handR = wR @ Vector((0, 0, -0.06)); handL = wL @ Vector((0, 0, -0.06))
    if 'torch' in props: torch_prop(handR, Vector((1.0, -0.12, -0.14)))
    if 'bucket' in props: bucket_prop(handL)
    if 'grain' in props: grain_arc(handR, Vector((0.6, -0.8, 0.1)))
    if 'hen' in props:
        chest = [o for o in root.children_recursive if o.name.startswith('chest')][0].matrix_world.translation
        hr_, hh = HC.build('rir_h', (0, 0, 0), 0.0, 'love')
        hr_.scale = (0.8, 0.8, 0.8); hr_.location = chest + Vector((0.17, 0.0, -0.13)); hr_.rotation_euler = (0, 0, math.radians(-38))
    bpy.context.view_layer.update()
    cam = camera(scn, (2.05, -1.32, 1.22), (0.05, 0, 0.78), lens=float(os.environ.get('LENS', 46)))
    bpy.context.view_layer.update()
    for k_ in props:
        if k_ in ('hearts', 'sweat', 'shout'): fx_cam(k_, H, cam)
    render(scn, 'fm_mood_%s' % mood, R_, R_, samples, transparent=True)
    sys.exit(0)

if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 24
    look = os.environ.get('LOOK', 'm'); pose = os.environ.get('POSE', 'turn'); expr = os.environ.get('EXPR', 'happy')
    R_ = int(os.environ.get('RES', 500))
    scn = reset()
    root, hd = build(look, pose, expr)
    HC.shadow_catcher()
    lighting(scn, sun_dir=(0.5, -0.6, 0.85), sun=3.4)
    bpy.context.view_layer.update()
    mode = os.environ.get('MODE', 'views')
    if mode == 'face':
        H = hd.matrix_world.translation.copy()
        camera(scn, tuple(H + Vector((1.2, -0.55, 0.12))), tuple(H + Vector((0, 0, -0.02))), lens=110)
        render(scn, 'fm_face_%s_%s' % (look, expr), R_, R_, samples, transparent=True)
    else:
        for vname in os.environ.get('VIEWS', 'front,34').split(','):
            dx, dy = {'front': (1, 0), '34': (0.74, -0.67), 'side': (0, -1), 'back': (-1, 0)}[vname]
            tgt = Vector((0, 0, 0.75))
            cams = [o for o in bpy.data.objects if o.type == 'CAMERA']
            for c in cams: bpy.data.objects.remove(c)
            camera(scn, tuple(tgt + Vector((dx, dy, 0.12)) * 8), tuple(tgt), ortho=float(os.environ.get('ORTHO', 1.75)))
            render(scn, 'fm_%s_%s_%s' % (look, pose, vname), R_, R_, samples, transparent=True)
