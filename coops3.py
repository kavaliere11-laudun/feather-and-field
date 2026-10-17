"""The remaining coops in 3D. Each builds around the pen origin, coop at the back-left, door facing -y (the run)."""
import math, random
import bpy, bmesh
from ffbird import principled
from ffscene import box, cyl, wood, planks_mat, shingles


def mat_noise(name, c0, c1, scale=8.0, rough=0.85, bump=0.3, detail=6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = detail
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].color = (*c0, 1); rp.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(nz.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
    nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m


def stone_mat(name, tones, mortar=(0.5, 0.47, 0.42), scale=(9, 9, 14)):
    """Irregular dressed stones: Voronoi cells with mortar lines and a colour per stone."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; Lk = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = scale
    Lk(tc.outputs['Object'], mp.inputs['Vector'])
    ve = nt.nodes.new('ShaderNodeTexVoronoi'); ve.feature = 'DISTANCE_TO_EDGE'; Lk(mp.outputs['Vector'], ve.inputs['Vector'])
    vc = nt.nodes.new('ShaderNodeTexVoronoi'); Lk(mp.outputs['Vector'], vc.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.elements[0].color = (*tones[0], 1); rp.color_ramp.elements[1].color = (*tones[1], 1)
    if len(tones) > 2:
        e = rp.color_ramp.elements.new(0.5); e.color = (*tones[2], 1)
    sep = nt.nodes.new('ShaderNodeSeparateColor'); Lk(vc.outputs['Color'], sep.inputs[0]); Lk(sep.outputs[0], rp.inputs['Fac'])
    mt = nt.nodes.new('ShaderNodeMapRange'); mt.inputs['From Min'].default_value = 0.02; mt.inputs['From Max'].default_value = 0.06
    Lk(ve.outputs['Distance'], mt.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (*mortar, 1)
    Lk(mt.outputs['Result'], mx.inputs['Factor']); Lk(rp.outputs['Color'], mx.inputs['B'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; Lk(tc.outputs['Object'], nz.inputs['Vector'])
    gm = nt.nodes.new('ShaderNodeMix'); gm.data_type = 'RGBA'; gm.blend_type = 'MULTIPLY'; gm.inputs['Factor'].default_value = 0.25
    Lk(mx.outputs['Result'], gm.inputs['A']); Lk(nz.outputs['Color'], gm.inputs['B']); Lk(gm.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6
    Lk(mt.outputs['Result'], bp.inputs['Height']); Lk(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.9
    return m


def thatch_mat():
    m = bpy.data.materials.new('thatch'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; Lk = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (60, 60, 4)
    Lk(tc.outputs['Object'], mp.inputs['Vector'])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.5; nz.inputs['Detail'].default_value = 10; nz.inputs['Distortion'].default_value = 0.4
    Lk(mp.outputs['Vector'], nz.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.elements[0].color = (0.16, 0.1, 0.03, 1); rp.color_ramp.elements[1].color = (0.6, 0.42, 0.14, 1)
    e = rp.color_ramp.elements.new(0.55); e.color = (0.42, 0.28, 0.08, 1)
    Lk(nz.outputs['Fac'], rp.inputs['Fac']); Lk(rp.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.9
    Lk(nz.outputs['Fac'], bp.inputs['Height']); Lk(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.95
    return m


def mesh_obj(name, verts, faces, mat=None, solid=0.0, sub=0, smooth=True, uv_fn=None):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    if uv_fn:
        uv = me.uv_layers.new()
        for loop in me.loops:
            uv.data[loop.index].uv = uv_fn(me.vertices[loop.vertex_index].co)
    if solid:
        so = o.modifiers.new('s', 'SOLIDIFY'); so.thickness = solid
        if sub: so.offset = 0.0
    if sub:   # rounded edges without shrinking the panel (thick thatch)
        bv = o.modifiers.new('round', 'BEVEL'); bv.width = solid * 0.45; bv.segments = 5; bv.limit_method = 'NONE'
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if mat: me.materials.append(mat)
    return o


def gable_ends(x0, x1, y0, y1, ze, zr, mat, ridge='y'):
    """Triangular gable walls: ridge along y means the gables face front and back."""
    if ridge == 'y':
        xm = (x0 + x1) / 2
        for y in (y0, y1):
            mesh_obj('gable', [(x0, y, ze), (x1, y, ze), (xm, y, zr)], [(0, 1, 2)], mat, solid=0.04, smooth=False)
    else:
        ym = (y0 + y1) / 2
        for x in (x0, x1):
            mesh_obj('gable', [(x, y0, ze), (x, y1, ze), (x, ym, zr)], [(0, 1, 2)], mat, solid=0.04, smooth=False)


def roof(x0, x1, y0, y1, ze, zr, mat, over=0.12, thick=0.05, ridge='y', sub=0):
    if ridge == 'y':
        xm = (x0 + x1) / 2
        for s, xe in ((1, x1 + over), (-1, x0 - over)):
            v = [(xm, y0 - over, zr), (xm, y1 + over, zr), (xe, y1 + over, ze - over * 0.7), (xe, y0 - over, ze - over * 0.7)]
            f = [(0, 3, 2, 1)] if s > 0 else [(0, 1, 2, 3)]
            mesh_obj('roof', v, f, mat, solid=thick, sub=sub, uv_fn=lambda c: (c.y, math.hypot(c.x - xm, c.z - zr)))
    else:
        ym = (y0 + y1) / 2
        for s, ye in ((1, y1 + over), (-1, y0 - over)):
            v = [(x0 - over, ym, zr), (x1 + over, ym, zr), (x1 + over, ye, ze - over * 0.7), (x0 - over, ye, ze - over * 0.7)]
            f = [(0, 1, 2, 3)] if s > 0 else [(0, 3, 2, 1)]
            mesh_obj('roof', v, f, mat, solid=thick, sub=sub, uv_fn=lambda c: (c.x, math.hypot(c.y - ym, c.z - zr)))


def window(cx, y, cz, w, h, frame_m, glass_m, cross=True, box_m=None, flowers=None):
    box('win', (cx, y - 0.015, cz), (w, 0.03, h), glass_m)
    for dz in (-h / 2, h / 2):
        box('wf', (cx, y - 0.03, cz + dz), (w + 0.04, 0.025, 0.035), frame_m)
    for dx in (-w / 2, w / 2):
        box('wf', (cx + dx, y - 0.03, cz), (0.035, 0.025, h), frame_m)
    if cross:
        box('wf', (cx, y - 0.032, cz), (0.025, 0.02, h), frame_m); box('wf', (cx, y - 0.032, cz), (w, 0.02, 0.025), frame_m)
    if box_m:
        box('flowerbox', (cx, y - 0.08, cz - h / 2 - 0.05), (w + 0.06, 0.1, 0.08), box_m)
        for k in range(7):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.03, location=(cx - w / 2 + 0.02 + k * (w - 0.04) / 6, y - 0.08 + random.uniform(-.02, .02), cz - h / 2 + 0.01 + random.uniform(0, .03)))
            bpy.context.object.data.materials.append(flowers[k % len(flowers)])


def arched_door(cx, y, zb, w, h, door_m, frame_m, knob_m=None):
    r = w / 2; n = 16
    pts = [(cx - r, zb), (cx + r, zb)] + [(cx + r * math.cos(math.pi * i / n), zb + h - r + r * math.sin(math.pi * i / n)) for i in range(n + 1)]
    v = [(x, y - 0.02, z) for x, z in pts]
    mesh_obj('door', v, [tuple(range(len(v)))], door_m, solid=0.03, smooth=False)
    if knob_m:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.018, location=(cx + r * 0.6, y - 0.05, zb + h * 0.42)); bpy.context.object.data.materials.append(knob_m)


# ---------------------------------------------------------------------------------- Thatched Cottage (Orpington)
def thatched_cottage():
    plaster = mat_noise('limewash', (0.66, 0.63, 0.55), (0.78, 0.75, 0.68), scale=6, bump=0.15)
    beam = wood('oak', (0.09, 0.055, 0.03))
    brick = stone_mat('brickbase', [(0.3, 0.1, 0.06), (0.4, 0.16, 0.09)], mortar=(0.45, 0.42, 0.38), scale=(18, 18, 30))
    straw = thatch_mat()
    green = planks_mat('greendoor', (0.05, 0.16, 0.08), n_per_m=14)
    glass = principled('glass', (0.03, 0.05, 0.07), 0.08, coat=0.6)
    brass = principled('brass', (0.6, 0.42, 0.12), 0.3); brass.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1
    flowers = [principled('fl1', (0.8, 0.12, 0.15), 0.6, sss=0.2), principled('fl2', (0.85, 0.55, 0.7), 0.6, sss=0.2), principled('fl3', (0.85, 0.75, 0.2), 0.6, sss=0.2)]
    x0, x1, y0, y1, zb, ze, zr = -1.3, 0.05, 0.4, 1.25, 0.16, 0.78, 1.3
    box('base', ((x0 + x1) / 2, (y0 + y1) / 2, zb / 2), (x1 - x0 + 0.06, y1 - y0 + 0.06, zb), brick)
    box('walls', ((x0 + x1) / 2, (y0 + y1) / 2, (zb + ze) / 2), (x1 - x0, y1 - y0, ze - zb), plaster)
    gable_ends(x0, x1, y0, y1, ze, zr, plaster, ridge='x')
    # timber frame on the front wall
    for x in (x0 + 0.02, -0.95, -0.35, x1 - 0.02):
        box('post', (x, y0 - 0.02, (zb + ze) / 2), (0.05, 0.03, ze - zb), beam)
    box('rail', ((x0 + x1) / 2, y0 - 0.02, ze - 0.03), (x1 - x0, 0.03, 0.05), beam)
    box('rail', ((x0 + x1) / 2, y0 - 0.02, zb + 0.03), (x1 - x0, 0.03, 0.05), beam)
    box('brace', (-1.12, y0 - 0.021, 0.47), (0.36, 0.028, 0.045), beam, rot=(0, math.radians(-50), 0))
    # thick, rounded thatch with a ridge roll
    roof(x0, x1, y0, y1, ze, zr, straw, over=0.2, thick=0.17, ridge='x', sub=2)
    cyl('ridgeroll', ((x0 + x1) / 2, (y0 + y1) / 2, zr + 0.03), 0.09, x1 - x0 + 0.36, straw, rot=(0, math.radians(90), 0), v=20)
    # round-topped green door, window with flower box
    arched_door(-0.65, y0 - 0.01, zb, 0.3, 0.5, green, beam, brass)
    window(-0.15, y0, 0.5, 0.22, 0.2, beam, glass, box_m=beam, flowers=flowers)
    window(-1.12, y0, 0.58, 0.16, 0.14, beam, glass)
    # little ramp and a pot of lavender by the door
    rl = math.hypot(0.45, zb)
    box('ramp', (-0.65, y0 - 0.24, zb / 2), (0.22, rl, 0.025), beam, rot=(math.atan2(zb, 0.45), 0, 0))
    cyl('pot', (-0.25, y0 - 0.18, 0.08), 0.07, 0.16, principled('terracotta', (0.42, 0.15, 0.07), 0.8))
    lav = principled('lavender', (0.25, 0.15, 0.45), 0.7, sss=0.2)
    for k in range(9):
        a = k * 0.7
        cyl('lav', (-0.25 + 0.04 * math.cos(a), y0 - 0.18 + 0.04 * math.sin(a), 0.24), 0.012, 0.16, lav, v=6)


# ---------------------------------------------------------------------------------- Stone Cottage (Cream Legbar)
def stone_cottage():
    stone = stone_mat('stonewall', [(0.36, 0.3, 0.22), (0.55, 0.48, 0.36), (0.45, 0.4, 0.32)])
    slate = shingles('slate', (0.1, 0.11, 0.13), rows=14)
    trim = principled('trim', (0.78, 0.76, 0.7), 0.6)
    blue = planks_mat('bluedoor', (0.08, 0.2, 0.32), n_per_m=14)
    glass = principled('glass', (0.03, 0.05, 0.07), 0.08, coat=0.6)
    lintel = principled('lintel', (0.55, 0.5, 0.4), 0.9)
    x0, x1, y0, y1, zb, ze, zr = -1.25, 0.05, 0.4, 1.25, 0.0, 0.78, 1.32
    box('walls', ((x0 + x1) / 2, (y0 + y1) / 2, ze / 2), (x1 - x0, y1 - y0, ze), stone)
    gable_ends(x0, x1, y0, y1, ze, zr, stone, ridge='y')
    roof(x0, x1, y0, y1, ze, zr, slate, over=0.1, thick=0.05, ridge='y')
    box('chimney', (x0 + 0.22, y1 - 0.15, zr - 0.05), (0.2, 0.2, 0.6), stone)
    cyl('chimneypot', (x0 + 0.22, y1 - 0.15, zr + 0.3), 0.05, 0.1, principled('pot', (0.4, 0.16, 0.08), 0.7))
    xm = (x0 + x1) / 2
    arched_door(xm, y0 - 0.01, 0.0, 0.3, 0.52, blue, trim, lintel)
    box('lintel', (xm, y0 - 0.03, 0.55), (0.42, 0.05, 0.07), lintel)
    # round "eye" window in the gable
    cyl('roundwin', (xm, y0 - 0.025, 0.98), 0.08, 0.03, glass, rot=(math.radians(90), 0, 0), v=24)
    bpy.ops.mesh.primitive_torus_add(location=(xm, y0 - 0.04, 0.98), rotation=(math.radians(90), 0, 0), major_radius=0.085, minor_radius=0.015)
    bpy.context.object.data.materials.append(trim)
    # side window, climbing ivy and a basket of blue eggs
    box('sidewin', (x1 + 0.015, 0.85, 0.48), (0.03, 0.22, 0.2), glass)
    box('sidewinframe', (x1 + 0.03, 0.85, 0.48), (0.02, 0.26, 0.24), trim)
    ivy = principled('ivy', (0.04, 0.12, 0.03), 0.6, sss=0.15)
    for k in range(40):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.025, 0.045),
                                              location=(x0 + 0.05 + random.random() * 0.25, y0 - 0.03, random.random() * 0.75))
        bpy.context.object.data.materials.append(ivy)
    basket = wood('wicker', (0.36, 0.24, 0.1), scale=(40, 40, 6))
    cyl('basket', (0.28, y0 - 0.2, 0.06), 0.11, 0.12, basket, v=20)
    egg = principled('blueegg', (0.4, 0.62, 0.58), 0.4)
    for k in range(5):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.03, location=(0.28 + 0.05 * math.cos(k * 1.3), y0 - 0.2 + 0.05 * math.sin(k * 1.3), 0.13))
        o = bpy.context.object; o.scale = (1, 1, 1.3); o.data.materials.append(egg)


# ---------------------------------------------------------------------------------- Timber Lodge (Light Brahma)
def timber_lodge():
    log = wood('log', (0.3, 0.18, 0.09), scale=(1, 30, 1), dark=0.55)
    endgrain = principled('endgrain', (0.55, 0.38, 0.2), 0.8)
    greenroof = shingles('greenshingle', (0.06, 0.16, 0.08), rows=12)
    door = planks_mat('lodgedoor', (0.18, 0.1, 0.05), n_per_m=12)
    glass = principled('glass', (0.03, 0.05, 0.07), 0.08, coat=0.6)
    straw = wood('straw', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)
    x0, x1, y0, y1, ze, zr = -1.45, 0.15, 0.3, 1.3, 0.85, 1.45
    r = 0.06
    z = r
    while z < ze:      # walls of stacked logs with ends that cross at the corners
        for y in (y0, y1):
            cyl('log', ((x0 + x1) / 2, y, z), r, x1 - x0 + 0.22, log, rot=(0, math.radians(90), 0), v=12)
        for x in (x0, x1):
            cyl('log', (x, (y0 + y1) / 2, z + r), r, y1 - y0 + 0.22, log, rot=(math.radians(90), 0, 0), v=12)
        for x in (x0 - 0.11, x1 + 0.11):
            for y in (y0, y1):
                cyl('end', (x, y, z), r * 0.98, 0.01, endgrain, rot=(0, math.radians(90), 0), v=12)
        z += 2 * r
    gable_ends(x0, x1, y0, y1, ze, zr, log, ridge='y')
    roof(x0, x1, y0, y1, ze, zr, greenroof, over=0.16, thick=0.06, ridge='y')
    xm = (x0 + x1) / 2
    for dx in (-0.12, 0.12):
        box('door', (xm + dx, y0 - 0.07, 0.32), (0.23, 0.04, 0.6), door)
        box('zbrace', (xm + dx, y0 - 0.095, 0.32), (0.27, 0.02, 0.04), log, rot=(0, math.radians(38 if dx < 0 else -38), 0))
    window(x0 + 0.3, y0 - 0.06, 0.52, 0.2, 0.18, log, glass)
    window(x1 - 0.3, y0 - 0.06, 0.52, 0.2, 0.18, log, glass)
    box('bale', (x1 + 0.4, y0 + 0.1, 0.15), (0.5, 0.3, 0.3), straw, bevel=0.03)
    box('bale2', (x1 + 0.4, y0 + 0.45, 0.15), (0.5, 0.3, 0.3), straw, bevel=0.03, rot=(0, 0, math.radians(8)))
    # a lantern by the door
    cyl('lanternpost', (xm + 0.42, y0 - 0.12, 0.45), 0.02, 0.9, log)
    lm = principled('lantern', (0.6, 0.4, 0.1), 0.4); b = lm.node_tree.nodes['Principled BSDF']
    b.inputs['Emission Color'].default_value = (1, 0.6, 0.2, 1); b.inputs['Emission Strength'].default_value = 1.2
    box('lantern', (xm + 0.42, y0 - 0.12, 0.93), (0.08, 0.08, 0.1), lm)


# ---------------------------------------------------------------------------------- Pasture shelter for retired birds
def pasture_shelter():
    timber = wood('shelter', (0.22, 0.13, 0.07))
    roof_m = shingles('shelterroof', (0.2, 0.12, 0.07), rows=10)
    straw = wood('straw2', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)
    W, D, hf, hb = 1.6, 0.9, 0.95, 0.65
    for x in (-W / 2, W / 2):
        box('side', (x, 0, hb / 2), (0.04, D, hb), planks_mat('sideplank', (0.24, 0.15, 0.08), n_per_m=10, axis='Y'))
        box('front_post', (x, -D / 2, hf / 2), (0.07, 0.07, hf), timber)
    box('back', (0, D / 2, hb / 2), (W, 0.04, hb), planks_mat('backplank', (0.24, 0.15, 0.08), n_per_m=10))
    a = math.atan2(hf - hb, D)
    box('roof', (0, 0, (hf + hb) / 2 + 0.04), (W + 0.25, math.hypot(D, hf - hb) + 0.25, 0.05), roof_m, rot=(-a, 0, 0))
    box('straw', (0, 0.05, 0.03), (W - 0.1, D - 0.1, 0.06), straw)
    # water trough
    box('trough', (W / 2 + 0.55, -0.4, 0.12), (0.7, 0.25, 0.24), principled('galv', (0.5, 0.52, 0.53), 0.35))
    box('water', (W / 2 + 0.55, -0.4, 0.235), (0.62, 0.18, 0.01), principled('water', (0.03, 0.08, 0.1), 0.05, coat=0.8))
