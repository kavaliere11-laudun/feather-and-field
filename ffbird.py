"""Shared Blender helpers for Feather & Field bird renders. Chickens face +X."""
import bpy, bmesh, math, sys, time
from mathutils import Vector, Matrix


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene


def principled(name, color, rough=0.6, sss=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = spec
    if sss:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (0.5, 0.12, 0.08)
        b.inputs['Subsurface Scale'].default_value = 0.03
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    return m


def hair_mat(name, color, rough=0.35, tip=None):
    """Principled hair; optional tip colour blended along the strand."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    h = nt.nodes.new('ShaderNodeBsdfHairPrincipled')
    h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = rough
    h.inputs['Radial Roughness'].default_value = 0.7
    h.inputs['Coat'].default_value = 0.12
    if tip:
        info = nt.nodes.new('ShaderNodeHairInfo')
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = (*color, 1); mix.inputs['B'].default_value = (*tip, 1)
        nt.links.new(info.outputs['Intercept'], mix.inputs['Factor'])
        nt.links.new(mix.outputs['Result'], h.inputs['Color'])
    else:
        h.inputs['Color'].default_value = (*color, 1)
    nt.links.new(h.outputs[0], out.inputs['Surface'])
    return m


def feather_mat(name, base, edge, light=None, scale=(22, 30, 22), bump=0.35, rough=0.55, sheen=None):
    """Smooth plumage: Voronoi cells read as overlapping feathers, darker at the edges."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = scale
    vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'F1'; vo.inputs['Randomness'].default_value = 0.8
    vo2 = nt.nodes.new('ShaderNodeTexVoronoi'); vo2.feature = 'DISTANCE_TO_EDGE'
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], vo.inputs['Vector']); nt.links.new(mp.outputs['Vector'], vo2.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (*edge, 1)
    ramp.color_ramp.elements[1].position = 0.22; ramp.color_ramp.elements[1].color = (*base, 1)
    if light:
        e = ramp.color_ramp.elements.new(0.5); e.color = (*light, 1)
    nt.links.new(vo2.outputs['Distance'], ramp.inputs['Fac'])
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 60; noise.inputs['Detail'].default_value = 6
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 0.25
    nt.links.new(ramp.outputs['Color'], mix.inputs['A']); nt.links.new(noise.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
    nt.links.new(vo2.outputs['Distance'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    if sheen:
        b.inputs['Coat Weight'].default_value = 0.35; b.inputs['Coat Tint'].default_value = (*sheen, 1)
    return m


def ellipsoid(name, loc, scale, mat, rot=(0, 0, 0), seg=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    if mat: o.data.materials.append(mat)
    return o


def deform(o, fn):
    mw = o.matrix_world; inv = mw.inverted()
    for v in o.data.vertices:
        w = mw @ v.co
        v.co = inv @ Vector(fn(w.copy()))
    o.data.update()


HAIR_K = 0.33


def hair(o, hmat, count, normal, align=(0, 0, 0), children=12, curl=0.0, clump=0.0, rough=0.06,
         radius=0.3, tip=0.05, rnd=0.2, steps=3, density_vgroup=None):
    """Hair whose length and direction come from velocity: normal (outward) + align (world direction)."""
    o.data.materials.append(hmat)
    mod = o.modifiers.new('hair', 'PARTICLE_SYSTEM'); ps = mod.particle_system; s = ps.settings
    k = HAIR_K
    normal *= k; align = tuple(a * k for a in align)
    s.type = 'HAIR'; s.count = count; s.use_advanced_hair = True
    s.normal_factor = normal; s.object_align_factor = align; s.factor_random = rnd * normal
    s.hair_length = max(0.001, math.sqrt(normal ** 2 + sum(a * a for a in align)))
    s.material = len(o.data.materials)
    s.child_type = 'INTERPOLATED'; s.child_percent = 6; s.rendered_child_count = children
    s.child_length = 1.0; s.child_length_threshold = 0.3; s.child_radius = 0.1
    s.clump_factor = clump; s.roughness_1 = rough; s.roughness_1_size = 1.0
    s.roughness_endpoint = rough * 0.5; s.roughness_2 = rough * 0.4
    if curl:
        s.kink = 'CURL'; s.kink_amplitude = curl; s.kink_frequency = 2.0
    s.root_radius = radius; s.tip_radius = tip; s.radius_scale = 0.01
    s.display_step = 3; s.render_step = steps
    if density_vgroup: ps.vertex_group_density = density_vgroup
    return ps


def feather_card(name, length, width, mat, curve=0.15):
    """A single curved feather shape: a flattened, tapered strip."""
    bm = bmesh.new()
    n = 10
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        w = width * math.sin(math.pi * min(1, t * 1.08)) ** 0.7 * (1 - 0.3 * t)
        x = t * length; z = curve * length * t * t
        left.append(bm.verts.new((x, w / 2, z))); right.append(bm.verts.new((x, -w / 2, z)))
    for i in range(n):
        bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    sol = o.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = 0.006
    o.data.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return o


def comb_single(name, mat, base_len=0.22, height=0.12, points=5, loc=(0, 0, 0), thick=0.018):
    """Serrated single comb as a thin extruded outline."""
    pts = [(0, 0)]
    for i in range(points):
        x0 = base_len * i / points; x1 = base_len * (i + 1) / points
        h = height * (0.65 + 0.35 * math.sin(math.pi * (i + 0.5) / points))
        pts += [(x0 + (x1 - x0) * 0.2, h * 0.55), (x0 + (x1 - x0) * 0.5, h), (x0 + (x1 - x0) * 0.8, h * 0.55)]
    pts += [(base_len + 0.04, height * 0.25), (base_len, 0)]
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]
    f = bm.faces.new(vs)
    ret = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ret['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += thick
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, -thick / 2, 0))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = loc
    bev = o.modifiers.new('round', 'BEVEL'); bev.width = 0.006; bev.segments = 3
    o.modifiers.new('sub', 'SUBSURF').levels = 1
    o.data.materials.append(mat)
    return o


def beak(name, mat, loc, length=0.12, radius=0.045, hook=0.03, tilt=8):
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius, radius2=0.0, depth=length, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    o = bpy.context.object; o.name = name
    bpy.ops.object.transform_apply(rotation=True)
    for v in o.data.vertices:
        t = (v.co.x + length / 2) / length          # 0 at base, 1 at tip
        v.co.z -= hook * t * t
        v.co.z *= 0.85
    o.location = loc; o.rotation_euler = (0, math.radians(tilt), 0)
    o.modifiers.new('sub', 'SUBSURF').levels = 1
    bpy.ops.object.shade_smooth(); o.data.materials.append(mat)
    return o


def eye(loc, iris, r=0.026):
    ir = principled('iris', iris, 0.08, coat=1.0)
    pu = principled('pupil', (0.005, 0.005, 0.005), 0.05)
    gl = principled('cornea', (0.02, 0.02, 0.02), 0.02, coat=1.0)
    side = 1 if loc[1] > 0 else -1
    e = ellipsoid('eye', loc, (r, r * 0.6, r), ir, seg=20)
    ellipsoid('pupil', (loc[0] + r * 0.15, loc[1] + side * r * 0.45, loc[2]), (r * 0.5, r * 0.25, r * 0.5), pu, seg=16)
    return e


def legs(mat, positions, hip_z=0.42, foot_z=0.0, toe=0.13, radius=0.028, scale_tex=True):
    for lx, y in positions:
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=radius, depth=hip_z - foot_z, location=(lx, y, (hip_z + foot_z) / 2))
        l = bpy.context.object; l.data.materials.append(mat); bpy.ops.object.shade_smooth()
        for dx, dy in [(toe, 0), (toe * 0.8, toe * 0.4), (toe * 0.8, -toe * 0.4), (-toe * 0.55, 0)]:
            ln = math.hypot(dx, dy)
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius * 0.55, depth=ln + 0.03, location=(lx + dx / 2, y + dy / 2, foot_z + 0.012), rotation=(0, math.radians(90), math.atan2(dy, dx)))
            t = bpy.context.object; t.data.materials.append(mat); bpy.ops.object.shade_smooth()


def stage(scn, out, res=384, ortho=2.05, samples=20, center_z=0.8, angle=22, cam_h=1.6, transparent=True, catcher=True):
    import os
    if os.environ.get('FARM'):
        cam_h = center_z + 4.0; ortho *= 1.05
    if catcher:
        bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    A = math.radians(angle)
    CX = float(os.environ.get('CAMX', 0.08))
    bpy.ops.object.camera_add(location=(CX + 6 * math.sin(A), -6 * math.cos(A), cam_h), rotation=(math.radians(90 - math.degrees(math.atan2(cam_h - center_z, 6))), 0, A))
    cam = bpy.context.object; cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho; scn.camera = cam
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(48), math.radians(18), math.radians(28)))
    sun = bpy.context.object; sun.data.energy = 3.0; sun.data.angle = math.radians(10)
    bpy.ops.object.light_add(type='AREA', location=(-2.5, -3, 2.2))
    fill = bpy.context.object; fill.data.energy = 260; fill.data.size = 3
    fill.rotation_euler = (Vector((0, 0, 0.8)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(-2.5, 2.5, 2.0))
    rim = bpy.context.object; rim.data.energy = 160; rim.data.size = 2
    rim.rotation_euler = (Vector((0, 0, 0.9)) - rim.location).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.78, 0.8, 0.8, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.75
    scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = samples
    scn.cycles.use_denoising = True; scn.cycles.max_bounces = 4; scn.cycles.transparent_max_bounces = 10
    scn.render.threads_mode = 'FIXED'; scn.render.threads = 2
    scn.render.film_transparent = transparent
    scn.render.resolution_x = res; scn.render.resolution_y = res
    scn.render.filepath = out
    scn.view_settings.view_transform = 'Standard'; scn.view_settings.look = 'None'; scn.view_settings.exposure = -0.15
    t = time.time(); bpy.ops.render.render(write_still=True)
    print('RENDER_SECONDS', round(time.time() - t, 1), out)


def stride(parts, legs_xy, hip_z, walk, fwd_deg=24, back_deg=16, lift=0.035):
    """Walking pose: swing each leg about its hip. walk=1 lifts the +y leg forward, walk=2 the -y leg.
    Parts are sorted onto a leg by which side (y) they sit. Returns the hinge empties (parent these, not the parts)."""
    bpy.context.view_layer.update()
    hinges = []
    for lx, ly in legs_xy:
        side = ly > 0
        fwd = (walk == 1) == side
        hinge = bpy.data.objects.new('hinge', None); bpy.context.collection.objects.link(hinge)
        hinge.location = (lx, ly, hip_z)
        bpy.context.view_layer.update()
        for o in parts:
            if o.parent is None and (o.matrix_world.translation.y > 0) == side:
                o.parent = hinge; o.matrix_parent_inverse = hinge.matrix_world.inverted()
        hinge.rotation_euler.y = math.radians(-fwd_deg if fwd else back_deg)
        if fwd: hinge.location.z += lift
        hinges.append(hinge)
    return hinges
