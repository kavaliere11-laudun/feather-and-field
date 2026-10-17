def card(name, L, W, mat, curve=0.0, cup=0.15, n=14):
    """Feather with a rounded tip, lying along +X, outer face +Z."""
    bm = bmesh.new(); rows = []
    for i in range(n + 1):
        t = i / n
        w = W * min(1, t / 0.18) ** 0.5 * (math.sqrt(max(0, 1 - ((t - 0.5) / 0.5) ** 2)) if t > 0.5 else 1)
        w = max(w, 0.0008)
        x = t * L; z = curve * L * t * t
        rows.append([bm.verts.new((x, w / 2, z - cup * w)), bm.verts.new((x, 0, z)), bm.verts.new((x, -w / 2, z - cup * w))])
    for i in range(n):
        for j in range(2):
            bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.005
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(mat)
    return o
