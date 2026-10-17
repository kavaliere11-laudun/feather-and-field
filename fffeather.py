"""Real-feather toolkit: feather meshes, a feather shader and region-based instancing over a body."""
import bpy, bmesh, math
from mathutils import Vector


def feather_mesh(name, L, W, shape='contour', cup=0.22, curve=0.08, n=12, m=6, root=0.12):
    """A single feather lying along +X, width along Y, its outer face towards +Z.
    contour = rounded body feather, lance = long pointed hackle feather, flight = long, asymmetric vane."""
    def width(t):
        if shape == 'lance':
            return W * min(1, t * 5) * (1 - t) ** 0.9
        if shape == 'flight':
            return W * min(1, t * 6) * (1 - t ** 3) ** 0.5
        return W * math.sin(math.pi * min(1.0, t * 0.92 + 0.08)) ** 0.55 * (0.75 + 0.25 * t)
    bm = bmesh.new(); uv_rows = []
    grid = []
    for i in range(n + 1):
        t = i / n; w = width(t); row = []
        for j in range(-m, m + 1):
            s = j / m
            off = 0.15 * s if (shape == 'flight' and s > 0) else 0
            x = (t - root) * L; y = s * w / 2 * (1 + off)
            z = curve * L * t * t - cup * w * s * s
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    uvl = bm.loops.layers.uv.new('UVMap')
    for i in range(n):
        for j in range(2 * m):
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            for loop, (ii, jj) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
                loop[uvl].uv = (ii / n, jj / (2 * m))
            f.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = (0, 0, -60)      # parked out of frame; instances use its original geometry
    return o


def feather_shader(name, base, edge, rachis=None, tip=None, jitter=0.18, sheen=0.35, coat=0.0, coat_tint=(1, 1, 1), barbs=55, side_col=None):
    """Feather colour from its own UVs: darker edges, a fine shaft, barb grooves, per-feather variation."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N['Principled BSDF']
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['UV'], sep.inputs[0])
    # s = distance from the shaft (0 centre .. 1 edge)
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = 0.5; Lk(sep.outputs['Y'], sub.inputs[0])
    ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; Lk(sub.outputs[0], ab.inputs[0])
    s = N.new('ShaderNodeMath'); s.operation = 'MULTIPLY'; s.inputs[1].default_value = 2; Lk(ab.outputs[0], s.inputs[0])
    edgef = N.new('ShaderNodeMapRange'); edgef.inputs['From Min'].default_value = 0.55; edgef.inputs['From Max'].default_value = 1.0; Lk(s.outputs[0], edgef.inputs['Value'])
    col = N.new('ShaderNodeMix'); col.data_type = 'RGBA'; col.inputs['A'].default_value = (*base, 1); col.inputs['B'].default_value = (*edge, 1)
    Lk(edgef.outputs['Result'], col.inputs['Factor']); last = col.outputs['Result']
    if side_col:   # one half of the vane a different colour (flight feathers)
        gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5; Lk(sep.outputs['Y'], gt.inputs[0])
        sc = N.new('ShaderNodeMix'); sc.data_type = 'RGBA'; sc.inputs['B'].default_value = (*side_col, 1)
        Lk(gt.outputs[0], sc.inputs['Factor']); Lk(last, sc.inputs['A']); last = sc.outputs['Result']
    if tip:
        tf = N.new('ShaderNodeMapRange'); tf.inputs['From Min'].default_value = 0.7; tf.inputs['From Max'].default_value = 1.0; Lk(sep.outputs['X'], tf.inputs['Value'])
        tm = N.new('ShaderNodeMix'); tm.data_type = 'RGBA'; tm.inputs['B'].default_value = (*tip, 1)
        Lk(tf.outputs['Result'], tm.inputs['Factor']); Lk(last, tm.inputs['A']); last = tm.outputs['Result']
    if rachis:
        rf = N.new('ShaderNodeMapRange'); rf.inputs['From Min'].default_value = 0.07; rf.inputs['From Max'].default_value = 0.0; Lk(s.outputs[0], rf.inputs['Value'])
        rm = N.new('ShaderNodeMix'); rm.data_type = 'RGBA'; rm.inputs['B'].default_value = (*rachis, 1)
        Lk(rf.outputs['Result'], rm.inputs['Factor']); Lk(last, rm.inputs['A']); last = rm.outputs['Result']
    # per-feather brightness variation
    oi = N.new('ShaderNodeObjectInfo')
    jr = N.new('ShaderNodeMapRange'); jr.inputs['To Min'].default_value = 1 - jitter; jr.inputs['To Max'].default_value = 1 + jitter; Lk(oi.outputs['Random'], jr.inputs['Value'])
    vm = N.new('ShaderNodeVectorMath'); vm.operation = 'SCALE'; Lk(last, vm.inputs[0]); Lk(jr.outputs['Result'], vm.inputs['Scale'])
    # barbs: fine grooves angled towards the tip
    comb = N.new('ShaderNodeCombineXYZ')
    ang = N.new('ShaderNodeMath'); ang.operation = 'MULTIPLY_ADD'; Lk(s.outputs[0], ang.inputs[0]); ang.inputs[1].default_value = -0.35; Lk(sep.outputs['X'], ang.inputs[2])
    Lk(ang.outputs[0], comb.inputs['X'])
    wv = N.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = barbs; wv.inputs['Distortion'].default_value = 0.6; wv.inputs['Detail'].default_value = 1
    Lk(comb.outputs[0], wv.inputs['Vector'])
    gm = N.new('ShaderNodeMix'); gm.data_type = 'RGBA'; gm.blend_type = 'MULTIPLY'; gm.inputs['Factor'].default_value = 0.22
    Lk(vm.outputs[0], gm.inputs['A']); Lk(wv.outputs['Color'], gm.inputs['B'])
    Lk(gm.outputs['Result'], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; bp.inputs['Distance'].default_value = 0.002
    Lk(wv.outputs['Fac'], bp.inputs['Height']); Lk(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.55
    b.inputs['Specular IOR Level'].default_value = 0.28
    b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = 0.4
    b.inputs['Sheen Tint'].default_value = (*[min(1, c * 3 + 0.05) for c in base], 1)
    if coat:
        b.inputs['Coat Weight'].default_value = coat; b.inputs['Coat Tint'].default_value = (*coat_tint, 1); b.inputs['Coat Roughness'].default_value = 0.25
    return m


def instance_feathers(body, regions):
    """regions: dicts with group, proto, dist, dens, flow, scale(min,max), tilt (radians, lifts tips), jitter (radians), seed."""
    ng = bpy.data.node_groups.new('feathers', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N = ng.nodes; Lk = ng.links.new
    gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput'); join = N.new('GeometryNodeJoinGeometry')
    Lk(gi.outputs[0], join.inputs[0])
    for k, r in enumerate(regions):
        na = N.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT'; na.inputs['Name'].default_value = r['group']
        cmp = N.new('FunctionNodeCompare'); cmp.data_type = 'FLOAT'; cmp.operation = 'GREATER_THAN'
        Lk(na.outputs['Attribute'], cmp.inputs['A']); cmp.inputs['B'].default_value = 0.5
        d = N.new('GeometryNodeDistributePointsOnFaces'); d.distribute_method = 'POISSON'
        d.inputs['Distance Min'].default_value = r['dist']; d.inputs['Density Max'].default_value = r['dens']; d.inputs['Seed'].default_value = r.get('seed', k)
        Lk(gi.outputs[0], d.inputs['Mesh']); Lk(cmp.outputs['Result'], d.inputs['Selection'])
        al = N.new('FunctionNodeAlignRotationToVector'); al.axis = 'X'; al.pivot_axis = 'Z'
        Lk(d.outputs['Rotation'], al.inputs['Rotation']); al.inputs['Vector'].default_value = r['flow']
        rv = N.new('FunctionNodeRandomValue'); rv.data_type = 'FLOAT_VECTOR'
        j = r.get('jitter', 0.2); t = r.get('tilt', 0.12)
        vin = [s_ for s_ in rv.inputs if s_.type == 'VECTOR']
        vin[0].default_value = (-0.04, -t - 0.05, -j); vin[1].default_value = (0.04, -t + 0.05, j)
        rv.inputs['Seed'].default_value = 11 + k
        e2r = N.new('FunctionNodeEulerToRotation'); Lk([o for o in rv.outputs if o.type == 'VECTOR'][0], e2r.inputs['Euler'])
        rr = N.new('FunctionNodeRotateRotation'); rr.rotation_space = 'LOCAL'
        Lk(al.outputs['Rotation'], rr.inputs['Rotation']); Lk(e2r.outputs['Rotation'], rr.inputs['Rotate By'])
        sc = N.new('FunctionNodeRandomValue'); sc.data_type = 'FLOAT'
        fin = [s_ for s_ in sc.inputs if s_.type == 'VALUE']
        fin[0].default_value, fin[1].default_value = r.get('scale', (0.85, 1.15)); sc.inputs['Seed'].default_value = 31 + k
        oi = N.new('GeometryNodeObjectInfo'); oi.transform_space = 'ORIGINAL'; oi.inputs['Object'].default_value = r['proto']
        ip = N.new('GeometryNodeInstanceOnPoints')
        Lk(d.outputs['Points'], ip.inputs['Points']); Lk(oi.outputs['Geometry'], ip.inputs['Instance'])
        Lk(rr.outputs['Rotation'], ip.inputs['Rotation']); Lk([o for o in sc.outputs if o.type == 'VALUE'][0], ip.inputs['Scale'])
        Lk(ip.outputs['Instances'], join.inputs[0])
    Lk(join.outputs[0], go.inputs[0])
    mod = body.modifiers.new('feathers', 'NODES'); mod.node_group = ng
    return mod
