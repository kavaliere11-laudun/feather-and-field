"""Buildings and materials shared by the farm scenes (extracted from plot.py)."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy, bmesh
from mathutils import Vector
from ffbird import principled
W, D = 3.4, 2.9          # plot width (x) and depth (y); front edge at y = -D/2


def box(name, loc, size, mat, rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new('b', 'BEVEL'); m.width = bevel; m.segments = 2
    o.data.materials.append(mat); return o


def cyl(name, loc, r, h, mat, rot=(0, 0, 0), v=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o


def wood(name, col, scale=(2, 40, 2), rough=0.75, dark=0.6):
    """Planks: wave-textured grain plus a darker groove every board."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = scale
    wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = 3; wv.inputs['Distortion'].default_value = 6; wv.inputs['Detail'].default_value = 4
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], wv.inputs['Vector'])
    rp = nt.nodes.new('ShaderNodeValToRGB')
    rp.color_ramp.elements[0].color = (*[c * dark for c in col], 1); rp.color_ramp.elements[1].color = (*col, 1)
    nt.links.new(wv.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.2
    nt.links.new(wv.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = rough
    return m


def planks_mat(name, col, n_per_m=9, axis='X', groove=0.45):
    """Vertical board-and-batten: dark grooves at regular intervals across the given axis."""
    m = wood(name, col, scale=(1, 1, 18) if axis == 'X' else (18, 1, 1), dark=0.75)
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes['Texture Coordinate']
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs['Vector'])
    mt = nt.nodes.new('ShaderNodeMath'); mt.operation = 'MULTIPLY'; mt.inputs[1].default_value = n_per_m
    nt.links.new(sep.outputs[axis], mt.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; nt.links.new(mt.outputs[0], fr.inputs[0])
    st = nt.nodes.new('ShaderNodeMath'); st.operation = 'GREATER_THAN'; st.inputs[1].default_value = 0.92; nt.links.new(fr.outputs[0], st.inputs[0])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    nt.links.new(st.outputs[0], mix.inputs['Factor'])
    old = b.inputs['Base Color'].links[0].from_socket
    nt.links.new(old, mix.inputs['A']); mix.inputs['B'].default_value = (groove, groove, groove, 1)
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m


def shingles(name, col, rows=14):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (rows * 0.8, rows, 1)
    br = nt.nodes.new('ShaderNodeTexBrick'); br.inputs['Color1'].default_value = (*col, 1)
    br.inputs['Color2'].default_value = (*[c * 0.75 for c in col], 1); br.inputs['Mortar'].default_value = (*[c * 0.35 for c in col], 1)
    br.inputs['Scale'].default_value = 1; br.inputs['Mortar Size'].default_value = 0.025; br.inputs['Brick Width'].default_value = 0.6; br.inputs['Row Height'].default_value = 1
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], br.inputs['Vector'])
    nt.links.new(br.outputs['Color'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.5
    nt.links.new(br.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.8
    return m



def gable_roof(x0, x1, y0, y1, z_eave, z_ridge, mat, over=0.12, thick=0.05):
    """Two roof planes running along x, ridge at the middle in y."""
    ym = (y0 + y1) / 2
    for sgn in (1, -1):
        ye = (y1 if sgn > 0 else y0) + sgn * over
        bm = bmesh.new()
        a = bm.verts.new((x0 - over, ym, z_ridge)); b = bm.verts.new((x1 + over, ym, z_ridge))
        c = bm.verts.new((x1 + over, ye, z_eave - over * 0.6)); d = bm.verts.new((x0 - over, ye, z_eave - over * 0.6))
        f = bm.faces.new((a, b, c, d) if sgn > 0 else (d, c, b, a))
        bmesh.ops.triangulate if False else None
        me = bpy.data.meshes.new('roof'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')
        sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = thick
        o.data.materials.append(mat); o.select_set(False)


def gable_wall(x0, x1, y, z0, z_eave, z_ridge, mat):
    """Triangle + rectangle at the gable end (faces -y)."""
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in [(x0, y, z0), (x1, y, z0), (x1, y, z_eave), ((x0 + x1) / 2, y, z_ridge), (x0, y, z_eave)]]
    bm.faces.new(vs)
    me = bpy.data.meshes.new('gable'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('gable', me); bpy.context.collection.objects.link(o)
    sol = o.modifiers.new('s', 'SOLIDIFY'); sol.thickness = 0.04
    o.data.materials.append(mat); return o


def red_barn():
    red = planks_mat('barnred', (0.36, 0.035, 0.022), n_per_m=11)
    white = principled('trim', (0.82, 0.8, 0.74), 0.6)
    slate = shingles('slate', (0.09, 0.095, 0.11), rows=12)
    post_m = wood('stilt', (0.16, 0.09, 0.045))
    dark = principled('inside', (0.02, 0.012, 0.008), 0.9)
    # coop footprint: x -1.0..0.25 (gable faces the camera), y 0.35..1.25
    x0, x1, y0, y1, zb, ze, zr = -1.25, 0.05, 0.4, 1.25, 0.22, 0.86, 1.3
    for x in (x0 + 0.06, x1 - 0.06):
        for y in (y0 + 0.06, y1 - 0.06):
            box('stilt', (x, y, zb / 2), (0.07, 0.07, zb), post_m)
    box('floor', ((x0 + x1) / 2, (y0 + y1) / 2, zb + 0.02), (x1 - x0 + 0.04, y1 - y0 + 0.04, 0.05), post_m)
    # side walls along y (visible side is x1)
    box('wallR', (x1, (y0 + y1) / 2, (zb + ze) / 2), (0.04, y1 - y0, ze - zb), planks_mat('barnred2', (0.3, 0.03, 0.02), n_per_m=11, axis='Y'))
    box('wallL', (x0, (y0 + y1) / 2, (zb + ze) / 2), (0.04, y1 - y0, ze - zb), red)
    box('wallB', ((x0 + x1) / 2, y1, (zb + ze) / 2), (x1 - x0, 0.04, ze - zb), red)
    gable_wall(x0, x1, y0, zb, ze, zr, red)
    # roof ridge runs front-to-back (y), so pitch faces left/right: build with axes swapped
    xm = (x0 + x1) / 2; over = 0.12
    for sgn in (1, -1):
        xe = (x1 if sgn > 0 else x0) + sgn * over
        bm = bmesh.new()
        a = bm.verts.new((xm, y0 - over, zr)); b = bm.verts.new((xm, y1 + over, zr))
        c = bm.verts.new((xe, y1 + over, ze - 0.07)); d = bm.verts.new((xe, y0 - over, ze - 0.07))
        bm.faces.new((a, d, c, b) if sgn > 0 else (a, b, c, d))
        me = bpy.data.meshes.new('roof'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(o)
        uv = me.uv_layers.new();
        for loop in me.loops:
            co = me.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (co.y, math.hypot(co.x - xm, co.z - zr))
        o.modifiers.new('s', 'SOLIDIFY').thickness = 0.05
        o.data.materials.append(slate)
    # white trim: corners, gable edge, door frame with X brace
    for x in (x0, x1):
        box('corner', (x, y0 - 0.02, (zb + ze) / 2), (0.05, 0.05, ze - zb), white)
    L = math.hypot((x1 - x0) / 2 + over, zr - ze + 0.07)
    for sgn in (1, -1):
        ang = math.atan2(zr - ze, (x1 - x0) / 2)
        box('barge', (xm + sgn * (x1 - x0) / 4 + sgn * over / 2, y0 - over - 0.01, (zr + ze) / 2 - 0.02), (L, 0.04, 0.06), white, rot=(0, sgn * ang, 0))
    dx = xm; dw, dh = 0.34, 0.46
    box('door', (dx, y0 - 0.03, zb + 0.04 + dh / 2), (dw, 0.03, dh), planks_mat('door', (0.26, 0.025, 0.016), n_per_m=14))
    for (cx, cz, w_, h_) in [(dx, zb + 0.04 + dh, dw + 0.05, 0.04), (dx, zb + 0.04, dw + 0.05, 0.04), (dx - dw / 2, zb + 0.04 + dh / 2, 0.04, dh), (dx + dw / 2, zb + 0.04 + dh / 2, 0.04, dh)]:
        box('frame', (cx, y0 - 0.05, cz), (w_, 0.03, h_), white)
    diag = math.hypot(dw, dh); a = math.atan2(dh, dw)
    for sgn in (1, -1):
        box('brace', (dx, y0 - 0.055, zb + 0.04 + dh / 2), (diag, 0.025, 0.035), white, rot=(0, sgn * a, 0))
    # hayloft window
    box('loft', (dx, y0 - 0.03, zr - 0.2), (0.2, 0.03, 0.16), dark)
    box('loftframe', (dx, y0 - 0.045, zr - 0.2), (0.24, 0.02, 0.2), white).scale = (1, 1, 1)
    box('loft2', (dx, y0 - 0.05, zr - 0.2), (0.2, 0.03, 0.16), dark)
    # ramp down to the run
    rl = math.hypot(0.5, zb + 0.04)
    box('ramp', (dx, y0 - 0.3, (zb + 0.04) / 2), (0.24, rl, 0.03), post_m, rot=(math.atan2(zb + 0.04, 0.5), 0, 0))
    for i in range(4):
        t = (i + 0.5) / 4
        box('cleat', (dx, y0 - 0.05 - t * 0.5, (zb + 0.04) * (1 - t) + 0.025), (0.24, 0.02, 0.02), post_m)
    # nest box on the visible side
    box('nest', (x1 + 0.13, (y0 + y1) / 2, ze - 0.2), (0.22, 0.45, 0.24), red)
    box('nestlid', (x1 + 0.14, (y0 + y1) / 2, ze - 0.06), (0.27, 0.5, 0.03), slate, rot=(0, math.radians(-14), 0))


def curved_roof(cx, cy, X, Y, ze, zr, mat, up=0.12, n=36, thick=0.05):
    """Hip roof with a concave pagoda curve and lifted corners."""
    bm = bmesh.new(); grid = []
    for i in range(n + 1):
        row = []
        for j in range(n + 1):
            u = -1 + 2 * i / n; v = -1 + 2 * j / n
            m = max(abs(u), abs(v))
            z = zr - (zr - ze) * (m ** 0.65) + up * (abs(u) ** 6) * (abs(v) ** 6) * 1.0 + up * 0.35 * m ** 8
            row.append(bm.verts.new((cx + u * X, cy + v * Y, z)))
        grid.append(row)
    for i in range(n):
        for j in range(n):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    me = bpy.data.meshes.new('proof'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('proof', me); bpy.context.collection.objects.link(o)
    uv = me.uv_layers.new()
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = ((co.x - cx) * 1.0, -max(abs(co.x - cx) / X, abs(co.y - cy) / Y) * 1.6)
    o.modifiers.new('s', 'SOLIDIFY').thickness = thick
    for p_ in me.polygons: p_.use_smooth = True
    o.data.materials.append(mat); return o


def pagoda():
    white = principled('plaster', (0.78, 0.76, 0.7), 0.85)
    redp = principled('lacquer', (0.4, 0.03, 0.02), 0.35, coat=0.4)
    teal = shingles('tiles', (0.04, 0.16, 0.14), rows=10)
    stone = principled('stone', (0.42, 0.4, 0.36), 0.9)
    dark = principled('inside', (0.02, 0.012, 0.01), 0.9)
    gold = principled('gold', (0.6, 0.4, 0.08), 0.3); gold.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 1
    cx, cy = -0.55, 0.85; X, Y = 0.62, 0.42
    box('plinth', (cx, cy, 0.06), (2 * X + 0.25, 2 * Y + 0.25, 0.12), stone, bevel=0.02)
    box('walls', (cx, cy, 0.42), (2 * X, 2 * Y, 0.6), white)
    for dx in (-X, X):
        for dy in (-Y, Y):
            cyl('pillar', (cx + dx, cy + dy, 0.42), 0.045, 0.62, redp)
    box('beam', (cx, cy - Y - 0.01, 0.7), (2 * X + 0.1, 0.06, 0.06), redp)
    # moon door
    cyl('moon', (cx, cy - Y - 0.02, 0.38), 0.19, 0.03, dark, rot=(math.radians(90), 0, 0), v=40)
    bpy.ops.mesh.primitive_torus_add(location=(cx, cy - Y - 0.035, 0.38), rotation=(math.radians(90), 0, 0), major_radius=0.2, minor_radius=0.022)
    bpy.context.object.data.materials.append(redp); bpy.ops.object.shade_smooth()
    # lattice windows
    for dx in (-0.4, 0.4):
        box('win', (cx + dx, cy - Y - 0.02, 0.45), (0.16, 0.02, 0.18), principled('paper', (0.8, 0.72, 0.55), 0.8))
        for k in (-1, 0, 1):
            box('lat', (cx + dx + k * 0.05, cy - Y - 0.035, 0.45), (0.012, 0.01, 0.18), redp)
            box('lat', (cx + dx, cy - Y - 0.035, 0.45 + k * 0.055), (0.16, 0.01, 0.012), redp)
    curved_roof(cx, cy, X + 0.28, Y + 0.24, 0.72, 1.02, teal, up=0.16)
    box('upper', (cx, cy, 1.08), (0.6, 0.44, 0.22), white)
    for dx in (-0.3, 0.3):
        for dy in (-0.22, 0.22):
            cyl('pillar2', (cx + dx, cy + dy, 1.08), 0.03, 0.24, redp)
    curved_roof(cx, cy, 0.48, 0.36, 1.18, 1.42, teal, up=0.12)
    cyl('finial', (cx, cy, 1.48), 0.03, 0.12, gold)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(cx, cy, 1.56)); bpy.context.object.data.materials.append(gold)
    # hanging lantern
    cyl('cord', (cx + 0.5, cy - Y - 0.25, 0.68), 0.004, 0.1, dark)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=(cx + 0.5, cy - Y - 0.25, 0.58)); lan = bpy.context.object
    lan.scale = (1, 1, 1.25); lm = principled('lantern', (0.55, 0.05, 0.03), 0.4); lm.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = (1, 0.45, 0.15, 1)
    lm.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1.5; lan.data.materials.append(lm)
    # little ramp of stone steps
    for i in range(3):
        box('step', (cx, cy - Y - 0.2 - i * 0.12, 0.09 - i * 0.03), (0.4, 0.12, 0.18 - i * 0.06), stone, bevel=0.01)


def props():
    metal = principled('galv', (0.55, 0.57, 0.58), 0.35); metal.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.85
    water = principled('water', (0.1, 0.25, 0.32), 0.05)
    feed = principled('feed', (0.45, 0.32, 0.12), 0.9)
    # hanging feeder
    cyl('feeder', (0.95, 0.85, 0.3), 0.09, 0.32, metal)
    cyl('pan', (0.95, 0.85, 0.06), 0.17, 0.06, metal)
    cyl('pellets', (0.95, 0.85, 0.09), 0.15, 0.01, feed)
    # waterer
    cyl('water', (1.3, 0.75, 0.2), 0.11, 0.3, metal); cyl('wtray', (1.3, 0.75, 0.04), 0.17, 0.05, metal); cyl('wsurf', (1.3, 0.75, 0.065), 0.15, 0.005, water)
    # straw bale
    straw = wood('straw', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)
    box('bale', (1.15, 1.15, 0.13), (0.5, 0.3, 0.26), straw, bevel=0.03)


