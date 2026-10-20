"""Shared tools for the browser's models (used by export_web.py and export_village.py): bake a Blender model with the
Unity exporter's flat colours, simplify it to a triangle budget, and write GLB files with vertex colours and a few shared
materials (matte, satin, gloss, metal). glTF's (x, y, z) = Blender's (x, z, -y)."""
import os, sys, json, math, struct
HERE = os.path.dirname(os.path.abspath(__file__))
_argv = sys.argv; sys.argv = [sys.argv[0], 'web']      # the Unity exporter's head reads its own arguments: export nothing of its own
src = open(os.path.join(HERE, 'export_unity.py')).read()
head = src[:src.index('# ---- birds:')]
g = {'__file__': os.path.join(HERE, 'export_unity.py'), '__name__': 'export_helpers'}
exec(compile(head, 'export_unity_head', 'exec'), g)
sys.argv = _argv
bpy, math_, Vector = g['bpy'], g['math'], g['Vector']
import numpy as np
import hen, coop, tree, grass, farm_layout

MODELS = {}              # name -> list of primitives (bucket, positions, normals, colours, indices)
STATS = {}
BUCKETS = {'matte': (0.85, 0.0), 'satin': (0.55, 0.0), 'gloss': (0.25, 0.0), 'metal': (0.35, 0.8)}


def bucket_of(m):
    if m is None: return 'matte', [0.8, 0.8, 0.8]
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    rough = b.inputs['Roughness'].default_value if b else 0.8
    metal = b.inputs['Metallic'].default_value if b else 0.0
    col = list(b.inputs['Base Color'].default_value)[:3] if b else list(m.diffuse_color)[:3]
    if metal > 0.5: return 'metal', col
    return ('gloss' if rough < 0.35 else 'satin' if rough < 0.65 else 'matte'), col


# total triangle budgets for the web (the Unity versions are 3 to 4 times heavier); models not listed keep what they have
BUDGET = {'hen_stand': 5000, 'hen_peck': 5000, 'rooster_stand': 5500, 'rooster_peck': 5500, 'chick_stand': 2200, 'chick_peck': 2200,
          'apple_tree': 16000, 'apple_tree_b': 16000, 'flower_daisy': 300}


def to_arrays(ob, name):
    """The joined mesh as vertex arrays per material bucket (positions and normals in glTF axes, linear colours)."""
    me = ob.data
    tris0 = sum(len(p.vertices) - 2 for p in me.polygons)
    if name in BUDGET and tris0 > BUDGET[name]:                 # simplify the whole model down to its budget
        md = ob.modifiers.new('budget', 'DECIMATE'); md.ratio = BUDGET[name] / tris0; md.use_collapse_triangulate = True
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    me.calc_loop_triangles()
    try:
        cn = np.array([c.vector[:] for c in me.corner_normals], dtype=np.float32)
    except AttributeError:
        me.calc_normals_split(); cn = np.array([l.normal[:] for l in me.loops], dtype=np.float32)
    co = np.array([v.co[:] for v in me.vertices], dtype=np.float32)
    lv = np.array([l.vertex_index for l in me.loops], dtype=np.int64)
    info = [bucket_of(m) for m in me.materials] or [('matte', [0.8, 0.8, 0.8])]
    prims = {}
    for tri in me.loop_triangles:
        bk, col = info[min(tri.material_index, len(info) - 1)]
        prims.setdefault(bk, []).append((tri.loops[0], tri.loops[1], tri.loops[2], tri.material_index))
    out = []
    for bk, tris in prims.items():
        corners = np.array([t[:3] for t in tris], dtype=np.int64).reshape(-1)
        mats = np.repeat(np.array([t[3] for t in tris], dtype=np.int64), 3)
        p = co[lv[corners]]; n = cn[corners]
        c = np.array([info[min(i, len(info) - 1)][1] for i in mats], dtype=np.float32)
        P = np.stack([p[:, 0], p[:, 2], -p[:, 1]], 1)                     # Blender to glTF: (x, z, -y)
        N = np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1)
        C = np.clip(np.round(np.clip(c, 0, 1) * 255), 0, 255).astype(np.uint8)
        key = np.concatenate([np.round(P * 1e4), np.round(N * 1e3), C.astype(np.float32)], 1)
        uniq, inv = np.unique(key, axis=0, return_inverse=True)
        inv = inv.reshape(-1)
        first = np.zeros(len(uniq), dtype=np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
        out.append(dict(bucket=bk, pos=P[first].astype(np.float32), nrm=N[first].astype(np.float32),
                        col=np.concatenate([C[first], np.full((len(first), 1), 255, np.uint8)], 1), idx=inv.astype(np.uint32)))
    tris = sum(len(o['idx']) // 3 for o in out)
    STATS[name] = dict(tris=tris, verts=sum(len(o['pos']) for o in out), prims=len(out))
    print('BAKED', name, STATS[name])
    return out


def export(objs, name):            # replaces the Unity exporter's FBX export: keep the arrays for the GLB
    MODELS[name] = to_arrays(objs[0], name)

g['export'] = export
bake_and_export, fresh = g['bake_and_export'], g['fresh']


def write_glb(path, names):
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []; mats = {}
    def add_view(data, target):
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target))
        bin_.extend(data); return len(views) - 1
    def mat_index(bk):
        if bk not in mats: mats[bk] = len(mats)
        return mats[bk]
    for name in names:
        prims = []
        for pr in MODELS[name]:
            pos, nrm, col, idx = pr['pos'], pr['nrm'], pr['col'], pr['idx']
            a_pos = len(accs); accs.append(dict(bufferView=add_view(pos.tobytes(), 34962), componentType=5126, count=len(pos), type='VEC3',
                                                min=[float(x) for x in pos.min(0)], max=[float(x) for x in pos.max(0)]))
            a_nrm = len(accs); accs.append(dict(bufferView=add_view(nrm.tobytes(), 34962), componentType=5126, count=len(nrm), type='VEC3'))
            a_col = len(accs); accs.append(dict(bufferView=add_view(col.tobytes(), 34962), componentType=5121, normalized=True, count=len(col), type='VEC4'))
            small = len(pos) < 65536
            ib = idx.astype(np.uint16 if small else np.uint32)
            a_idx = len(accs); accs.append(dict(bufferView=add_view(ib.tobytes(), 34963), componentType=5123 if small else 5125, count=len(ib), type='SCALAR'))
            prims.append(dict(attributes=dict(POSITION=a_pos, NORMAL=a_nrm, COLOR_0=a_col), indices=a_idx, material=mat_index(pr['bucket'])))
        meshes.append(dict(name=name, primitives=prims)); nodes.append(dict(name=name, mesh=len(meshes) - 1))
    materials = [None] * len(mats)
    for bk, i in mats.items():
        r, m = BUCKETS[bk]
        materials[i] = dict(name=bk, pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=m, roughnessFactor=r))
    while len(bin_) % 4: bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='Feather & Field export_web.py'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=meshes, materials=materials, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
    print('WROTE', os.path.basename(path), round(total / 1024), 'KB', names)


def light(levels=1, bevel_segments=None):
    for o in bpy.context.scene.objects:
        for md in o.modifiers:
            if md.type == 'SUBSURF': md.levels = md.render_levels = min(md.levels, levels)
            if md.type == 'BEVEL' and bevel_segments is not None: md.segments = min(md.segments, bevel_segments)




# ---- a better guess at a material's colour when its base colour comes from a texture the Unity exporter doesn't read
# (the 2D map's roof tiles are a brick texture: the old guess fell back to plain white)
_flat_info = g['flat_info']


def _trace(sock, depth=0):
    if depth > 8: return None
    if not sock.is_linked:
        v = getattr(sock, 'default_value', None)
        try: return list(v)[:3] if v is not None and len(v) >= 3 else None
        except TypeError: return None
    n = sock.links[0].from_node
    if n.type == 'TEX_BRICK': return list(n.inputs['Color1'].default_value)[:3]
    if n.type == 'RGB': return list(n.outputs[0].default_value)[:3]
    if n.type == 'VALTORGB': return list(n.color_ramp.evaluate(0.6))[:3]
    if n.type == 'MIX':                          # a pattern of two colours: the first, or the bolder one for stripes (the stall's awning)
        a = [i for i in n.inputs if i.name == 'A' and i.type == 'RGBA']
        b_ = [i for i in n.inputs if i.name == 'B' and i.type == 'RGBA']
        if a and b_ and not a[0].is_linked and not b_[0].is_linked and n.inputs['Factor'].is_linked:
            ca, cb = list(a[0].default_value)[:3], list(b_[0].default_value)[:3]
            sat = lambda c: max(c) - min(c)
            return cb if sat(cb) > sat(ca) else ca
        return _trace(a[0], depth + 1) if a else None
    if n.type == 'MIX_RGB': return _trace(n.inputs['Color1'], depth + 1)
    if n.type == 'HUE_SAT': return _trace(n.inputs['Color'], depth + 1)
    return None


def flat_info_web(m):
    col, rough, metal, var = _flat_info(m)
    b = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if b is not None and b.inputs['Base Color'].is_linked:
        dflt = list(b.inputs['Base Color'].default_value)[:3]
        if col is None or [round(c, 4) for c in col[:3]] == [round(c, 4) for c in dflt]:      # the old guess fell back to the default
            c = _trace(b.inputs['Base Color'])
            if c: col = c + [1.0]
    return col, rough, metal, var


g['flat_info'] = flat_info_web
