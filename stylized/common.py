"""Stylized 'cosy farm' look: shared helpers for materials, chunky bevelled parts, light, camera and render.
Units are metres. X forward for animals, Z up."""
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix, Euler, noise

EXPOSURE = -0.45
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o); return o


# ------------------------------------------------------------------ materials
def _bsdf(m):
    nt = m.node_tree; return nt, nt.nodes['Principled BSDF']


def mat(name, col, rough=0.75, spec=0.25, var=0.0, hue_var=0.0, sss=0.0, sheen=0.0, coat=0.0, metal=0.0, grain=0.0, grain_scale=(2, 2, 30),
        bump=0.0, bump_scale=60.0, ramp=None, emission=None):
    """A soft, mostly matte material.
    var: per-object brightness variation (planks, leaves); hue_var: per-object hue wobble.
    grain: wood-grain streaks (object space, stretched along local Z by grain_scale); bump: small surface noise.
    ramp: [(pos, hex)...] colour ramp along generated Z (bottom -> top)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt, b = _bsdf(m); N, L = nt.nodes, nt.links
    b.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in b.inputs: b.inputs['Specular IOR Level'].default_value = spec
    b.inputs['Metallic'].default_value = metal
    if sheen and 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = sheen
    if coat and 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    if sss and 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = sss; b.inputs['Subsurface Radius'].default_value = (0.3, 0.15, 0.08)
    # base colour: flat, or a ramp along the object's height
    if ramp:
        tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); cr = N.new('ShaderNodeValToRGB')
        L.new(tc.outputs['Generated'], sep.inputs[0]); L.new(sep.outputs['Z'], cr.inputs[0])
        el = cr.color_ramp.elements
        el[0].position, el[0].color = ramp[0][0], lin(ramp[0][1]); el[1].position, el[1].color = ramp[-1][0], lin(ramp[-1][1])
        for p, h in ramp[1:-1]:
            e = el.new(p); e.color = lin(h)
        colsock = cr.outputs['Color']
    else:
        rgb = N.new('ShaderNodeRGB'); rgb.outputs[0].default_value = lin(col); colsock = rgb.outputs[0]
    if grain:
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = grain_scale
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 6
        if 'Distortion' in nz.inputs: nz.inputs['Distortion'].default_value = 2.5
        L.new(tc.outputs['Object'], mp.inputs[0]); L.new(mp.outputs[0], nz.inputs[0])
        mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.35; mr.inputs['From Max'].default_value = 0.65
        mr.inputs['To Min'].default_value = 1 - grain; mr.inputs['To Max'].default_value = 1.0
        L.new(nz.outputs['Fac'], mr.inputs['Value'])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
        cv = N.new('ShaderNodeCombineColor')
        for i in range(3): L.new(mr.outputs[0], cv.inputs[i])
        L.new(colsock, mul.inputs['A']); L.new(cv.outputs[0], mul.inputs['B']); colsock = mul.outputs['Result']
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25 * grain; bp.inputs['Distance'].default_value = 0.002
        L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    if var or hue_var:
        oi = N.new('ShaderNodeObjectInfo'); hsv = N.new('ShaderNodeHueSaturation')
        mv = N.new('ShaderNodeMapRange'); mv.inputs['To Min'].default_value = 1 - var; mv.inputs['To Max'].default_value = 1 + var
        mh = N.new('ShaderNodeMapRange'); mh.inputs['To Min'].default_value = 0.5 - hue_var; mh.inputs['To Max'].default_value = 0.5 + hue_var
        L.new(oi.outputs['Random'], mv.inputs['Value']); L.new(oi.outputs['Random'], mh.inputs['Value'])
        L.new(mv.outputs[0], hsv.inputs['Value']); L.new(mh.outputs[0], hsv.inputs['Hue'])
        L.new(colsock, hsv.inputs['Color']); colsock = hsv.outputs['Color']
    if bump and not grain:
        tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = bump_scale; nz.inputs['Detail'].default_value = 4
        L.new(tc.outputs['Object'], nz.inputs[0])
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.003
        L.new(nz.outputs['Fac'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    if emission:
        b.inputs['Emission Color'].default_value = lin(emission[0]); b.inputs['Emission Strength'].default_value = emission[1]
    L.new(colsock, b.inputs['Base Color'])
    return m


def feather_mat(name, ramp, scale=34.0, depth=0.18, sheen=0.25):
    """Soft feathers: colour ramp along height + a scalloped feather pattern (voronoi cells) as gentle shading and bump."""
    m = mat(name, ramp[0][1], rough=0.85, spec=0.15, ramp=ramp, sheen=sheen)
    nt, b = _bsdf(m); N, L = nt.nodes, nt.links
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale * 1.4, scale)
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'F1'
    L.new(tc.outputs['Object'], mp.inputs[0]); L.new(mp.outputs[0], vo.inputs['Vector'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.12; bp.inputs['Distance'].default_value = 0.003
    L.new(vo.outputs['Distance'], bp.inputs['Height']); L.new(bp.outputs['Normal'], b.inputs['Normal'])
    # darken the cell edges a touch so feathers read as soft scallops
    cur = b.inputs['Base Color'].links[0].from_socket
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.15; mr.inputs['From Max'].default_value = 0.55
    mr.inputs['To Min'].default_value = 1.0; mr.inputs['To Max'].default_value = 1 - depth
    L.new(vo.outputs['Distance'], mr.inputs['Value'])
    cv = N.new('ShaderNodeCombineColor')
    for i in range(3): L.new(mr.outputs[0], cv.inputs[i])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    L.new(cur, mul.inputs['A']); L.new(cv.outputs[0], mul.inputs['B']); L.new(mul.outputs['Result'], b.inputs['Base Color'])
    return m


def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m); return o


# ------------------------------------------------------------------ geometry
def soften(o, bevel=0.012, segs=3, smooth=True):
    """Chunky look: rounded edges that catch the light, smooth shading with crisp faces."""
    if bevel:
        bv = o.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = segs; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35)
        bv.harden_normals = False
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
        wn = o.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100
    return o


def box(name, size, loc=(0, 0, 0), rot=(0, 0, 0), m=None, bevel=0.012, segs=3, parent=None, jitter=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        if jitter: v.co += Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-1, 1))) * jitter
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; o.rotation_euler = rot
    if m: setmat(o, m)
    soften(o, bevel, segs)
    if parent: o.parent = parent
    return o


def cyl(name, r, depth, loc=(0, 0, 0), rot=(0, 0, 0), m=None, verts=16, r2=None, bevel=0.006, parent=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; o.rotation_euler = rot
    if m: setmat(o, m)
    soften(o, bevel, 2)
    if parent: o.parent = parent
    return o


def sphere(name, r, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), m=None, seg=24, rings=14, parent=None, ico=0, disp=0.0, disp_scale=2.0, seed=0):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    if ico: bmesh.ops.create_icosphere(bm, subdivisions=ico, radius=r)
    else: bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    if disp:
        off = Vector((seed * 13.1, seed * 7.7, seed * 3.3))
        for v in bm.verts:
            n = noise.noise(v.co * disp_scale / r + off)
            v.co += v.co.normalized() * n * disp * r
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.location = loc; o.scale = scale; o.rotation_euler = rot
    for p in o.data.polygons: p.use_smooth = True
    if m: setmat(o, m)
    if parent: o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    o = link(bpy.data.objects.new(name, None)); o.location = loc; o.rotation_euler = rot
    if parent: o.parent = parent
    return o


def subsurf(o, lv=2):
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = lv; s.render_levels = lv; return o


def metaball_mesh(name, elems, res=0.012, threshold=0.6, m=None, parent=None, smooth=0):
    """Blobby organic shapes (bodies, combs): elems = [(type, (x,y,z), radius, (sx,sy,sz), stiffness), ...]. smooth: that
    many passes of smoothing over the surface after (the peafowl's: no bumps where the blobs meet)."""
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = threshold
    for typ, co, r, sz, stiff in elems:
        e = mb.elements.new(type=typ); e.co = co; e.radius = r; e.stiffness = stiff
        if typ == 'ELLIPSOID': e.size_x, e.size_y, e.size_z = sz
    o = link(bpy.data.objects.new(name + '_mb', mb))
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    ev = o.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev)
    bpy.data.objects.remove(o)
    if smooth:
        import bmesh
        bm = bmesh.new(); bm.from_mesh(me)
        for _ in range(smooth): bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    out = link(bpy.data.objects.new(name, me))
    if m: setmat(out, m)
    if parent: out.parent = parent
    return out


def join(objs, name):
    """Join several mesh objects into one (keeps materials)."""
    ctx = bpy.context
    for o in ctx.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    ctx.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); objs[0].name = name; return objs[0]


# ------------------------------------------------------------------ world, light, camera, render
def lighting(scn, sun_dir=(-0.55, -0.35, 0.76), sun=4.2, sun_col='#fff1dc', sky='#bcd8f2', sky_strength=1.05, angle=4.0):
    sd = bpy.data.lights.new('sun', 'SUN'); sd.energy = sun; sd.color = lin(sun_col)[:3]; sd.angle = math.radians(angle)
    so = link(bpy.data.objects.new('sun', sd))
    so.rotation_euler = Vector(sun_dir).to_track_quat('Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); w.use_nodes = True; scn.world = w
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = lin(sky); bg.inputs['Strength'].default_value = sky_strength
    return so


def camera(scn, loc, target, lens=50, ortho=None, dof=None):
    c = bpy.data.cameras.new('cam'); o = link(bpy.data.objects.new('cam', c)); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if ortho: c.type = 'ORTHO'; c.ortho_scale = ortho
    else: c.lens = lens
    c.clip_start = 0.05; c.clip_end = 500
    if dof:
        c.dof.use_dof = True; c.dof.focus_distance = (Vector(target) - Vector(loc)).length; c.dof.aperture_fstop = dof
    scn.camera = o; return o


def game_camera(scn, target, width_m):
    """The game's own view: orthographic, 42 degrees down, 45 degrees round (same as the current farm art)."""
    p, y = math.radians(42.0), math.radians(45.0)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    return camera(scn, Vector(target) + d * 60, target, ortho=width_m)


def render(scn, name, w=1200, h=1200, samples=96, transparent=False):
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'; scn.cycles.samples = samples; scn.cycles.use_denoising = True
    scn.cycles.max_bounces = 6; scn.cycles.diffuse_bounces = 3; scn.cycles.glossy_bounces = 2; scn.cycles.transmission_bounces = 4
    scn.cycles.use_adaptive_sampling = True; scn.cycles.adaptive_threshold = 0.02
    scn.render.resolution_x, scn.render.resolution_y = w, h; scn.render.resolution_percentage = 100
    scn.render.film_transparent = transparent
    scn.view_settings.view_transform = 'Standard'; scn.view_settings.look = 'None'      # bright, saturated storybook colours
    scn.view_settings.exposure = EXPOSURE
    scn.render.image_settings.file_format = 'PNG'
    scn.render.filepath = os.path.join(OUT, name + '.png')
    import time; t = time.time()
    bpy.ops.render.render(write_still=True)
    print('RENDERED', name, round(time.time() - t, 1), 's')
