"""Export every breed for the browser (flock.glb + flock.json): Rhode Island Red, Buff Orpington, Cream Legbar, Light Brahma,
Polish, Ayam Cemani
and Silkie hens and roosters, and the chick. Each model is one mesh with vertex colours, bone weights (root, body, head,
wings, tail, legs: the browser animates them) and a paint region per vertex (the browser repaints plumage for each breed
and Silkie colour). flock.json gives each model's bone pivots. glTF's (x, y, z) = Blender's (x, z, -y); birds face +z.
Usage: python export_birds.py [out_dir]"""
import os, sys, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import numpy as np
import breeds
from mathutils import Vector, Matrix

JOINTS = ['root', 'body', 'head', 'wingL', 'wingR', 'tail', 'legL', 'legR']
BUDGET_BIRD = {'h': 3000, 'r': 3800, 'chick': 1000}         # lighter since 21 Oct: the browser adds fluff shells on top
flat_info = g['flat_info']
PIVOTS = {}


def gl(v):             # Blender to glTF axes
    return [round(float(v[0]), 5), round(float(v[2]), 5), round(float(-v[1]), 5)]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def bake_bird(name, root, budget, small_cut=60, floor=0.06):
    """Bake the scene's bird into arrays: positions, normals, colours, joints, weights, paint regions (one primitive)."""
    root.rotation_euler = (0, 0, math.radians(-90))            # face Blender -y (glTF +z)
    bpy.context.view_layer.update()
    s = root.scale[0]
    piv = {o.name.split('.')[0][3:]: o.matrix_world.translation.copy() for o in bpy.context.scene.objects if o.name.startswith('pv_')}
    PIVOTS[name] = {k: gl(v) for k, v in piv.items()}
    PIVOTS[name]['root'] = [0, 0, 0]
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get()]
    meshes = []
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        me.calc_loop_triangles(); meshes.append([o, me, len(me.loop_triangles)])
    kept = lambda o, n: n <= small_cut or o.get('keep')          # small parts and careful details (eyes, tail feathers) stay as they are
    small = sum(n for o, _, n in meshes if kept(o, n)); big = sum(n for o, _, n in meshes if not kept(o, n))
    ratio = max(floor, min(1.0, (budget - small) / max(1, big)))
    if ratio < 1.0:                                            # simplify the bigger parts evenly down to the budget
        for rec in meshes:
            o, me, n = rec
            if kept(o, n): continue
            tmp = bpy.data.objects.new('tmp', me); bpy.context.scene.collection.objects.link(tmp)
            md = tmp.modifiers.new('dec', 'DECIMATE'); md.ratio = ratio; md.use_collapse_triangulate = True
            dg.update()
            me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
            bpy.data.objects.remove(tmp); me2.calc_loop_triangles(); rec[1] = me2; rec[2] = len(me2.loop_triangles)
    H = piv['headc']; NB = piv['head']; nd = (H - NB).normalized(); reach = (H - NB).length
    P_, N_, C_, J_, W_, A_, F_ = [], [], [], [], [], [], []
    for o, me, n in meshes:
        part = o.get('part', 'body'); paint = int(o.get('paint', 0))
        j = JOINTS.index(part)
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        co = np.array([mw @ v.co for v in me.vertices], dtype=np.float32)
        try: cn = np.array([c.vector[:] for c in me.corner_normals], dtype=np.float32)
        except AttributeError: me.calc_normals_split(); cn = np.array([l.normal[:] for l in me.loops], dtype=np.float32)
        cn = cn @ np.array(nm, dtype=np.float32).T
        cn /= np.maximum(1e-8, np.linalg.norm(cn, axis=1, keepdims=True))
        lv = np.array([l.vertex_index for l in me.loops], dtype=np.int64)
        cols = []
        for m in me.materials:
            c = flat_info(m)[0] if m is not None else [0.8, 0.8, 0.8]
            cols.append(c[:3])
        if not cols: cols = [[0.8, 0.8, 0.8]]
        corners = np.array([t.loops[:] for t in me.loop_triangles], dtype=np.int64).reshape(-1)
        mi = np.repeat(np.array([t.material_index for t in me.loop_triangles], dtype=np.int64), 3)
        p = co[lv[corners]]; nrm = cn[corners]
        c = np.array([cols[min(i, len(cols) - 1)] for i in mi], dtype=np.float32)
        jt = np.zeros((len(p), 4), np.float32); wt = np.zeros((len(p), 4), np.float32)
        if part == 'body':                                     # the neck bends: body vertices near the head follow it a little or fully
            d = np.linalg.norm(p - np.array(H), axis=1)
            t = (p - np.array(NB)) @ np.array(nd)
            w = (1 - smoothstep(0.07 * s, reach * 1.25, d)) * (t > -0.015 * s)
            jt[:, 0] = JOINTS.index('body'); jt[:, 1] = JOINTS.index('head'); wt[:, 0] = 1 - w; wt[:, 1] = w
        else:
            jt[:, 0] = j; wt[:, 0] = 1
        # feather coordinates (tail and flight feathers, crest: across, along), 0 elsewhere
        fuv = np.zeros((len(p), 2), np.float32)
        if 'feat' in me.uv_layers:
            lu = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers['feat'].data.foreach_get('uv', lu)
            fuv = lu.reshape(-1, 2)[corners].astype(np.float32)
        P_.append(p); N_.append(nrm); C_.append(c); J_.append(jt); W_.append(wt); A_.append(np.full(len(p), paint, np.float32)); F_.append(fuv)
    p = np.concatenate(P_); n = np.concatenate(N_); c = np.concatenate(C_); jt = np.concatenate(J_); wt = np.concatenate(W_); pa = np.concatenate(A_); fu = np.concatenate(F_)
    P = np.stack([p[:, 0], p[:, 2], -p[:, 1]], 1); N = np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1)
    C = np.clip(np.round(np.clip(c, 0, 1) * 255), 0, 255).astype(np.uint8)
    W8 = np.round(wt * 255).astype(np.int32); W8[:, 0] += 255 - W8.sum(1)          # weights add up to exactly 1
    key = np.concatenate([np.round(P * 1e4), np.round(N * 1e3), C.astype(np.float32), jt, W8.astype(np.float32), pa[:, None], np.round(fu * 1e3)], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.reshape(-1)
    first = np.zeros(len(uniq), dtype=np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    MODELS[name] = [dict(bucket='satin', pos=P[first].astype(np.float32), nrm=N[first].astype(np.float32),
                         col=np.concatenate([C[first], np.full((len(first), 1), 255, np.uint8)], 1), idx=inv.astype(np.uint32),
                         joints=jt[first].astype(np.uint8), weights=W8[first].astype(np.uint8), paint=pa[first].astype(np.uint8),
                         feat=np.round(np.clip(fu[first], 0, 1) * 255).astype(np.uint8))]
    STATS[name] = dict(tris=len(inv) // 3, verts=len(first))
    print('BAKED', name, STATS[name], 'ratio', round(ratio, 3))


def write_bird_glb(path, names):
    """Like webglb.write_glb, plus JOINTS_0, WEIGHTS_0 and _PAINT."""
    import struct
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
    def add_view(data, target):
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target)); bin_.extend(data); return len(views) - 1
    def acc(data, ctype, count, typ, target=34962, **kw):
        accs.append(dict(bufferView=add_view(data, target), componentType=ctype, count=count, type=typ, **kw)); return len(accs) - 1
    for name in names:
        pr = MODELS[name][0]
        pos, nrm, col, idx = pr['pos'], pr['nrm'], pr['col'], pr['idx']
        at = dict(POSITION=acc(pos.tobytes(), 5126, len(pos), 'VEC3', min=[float(x) for x in pos.min(0)], max=[float(x) for x in pos.max(0)]),
                  NORMAL=acc(nrm.tobytes(), 5126, len(nrm), 'VEC3'),
                  COLOR_0=acc(col.tobytes(), 5121, len(col), 'VEC4', normalized=True),
                  JOINTS_0=acc(pr['joints'].tobytes(), 5121, len(pos), 'VEC4'),
                  WEIGHTS_0=acc(pr['weights'].tobytes(), 5121, len(pos), 'VEC4', normalized=True),
                  _PAINT=acc(pr['paint'].tobytes(), 5121, len(pos), 'SCALAR'),
                  _FEAT=acc(pr['feat'].tobytes(), 5121, len(pos), 'VEC2', normalized=True))
        ib = idx.astype(np.uint16)
        a_idx = acc(ib.tobytes(), 5123, len(ib), 'SCALAR', target=34963)
        meshes.append(dict(name=name, primitives=[dict(attributes=at, indices=a_idx, material=0)])); nodes.append(dict(name=name, mesh=len(meshes) - 1))
    while len(bin_) % 4: bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='Feather & Field export_birds.py'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=meshes, materials=[dict(name='satin', pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0, roughnessFactor=0.6))],
                accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
    print('WROTE', os.path.basename(path), round(total / 1024), 'KB', names)


LOW = {'h': 1200, 'r': 1500, 'chick': 420}
CREST_EXTRA = {'h': 2000, 'r': 2300}      # (a Polish's crest: its feathers are kept whole)
SIL_BUDGET = {'h': 2300, 'r': 2600}     # Silkies: no long tail or bare-skin eyes, and their fluff shells multiply them      # a light version of each bird for when the view is zoomed far out
names = []
for b in ('rir', 'orp', 'leg', 'bra', 'pol', 'aya', 'sil'):
    for sx in ('h', 'r'):
        for lo in (False, True):
            fresh(); r = breeds.build(b, sx, seed=3, lo=lo); light(1)
            nm = '%s_%s' % (b, sx) + ('_lo' if lo else '')
            bake_bird(nm, r, (LOW[sx] if lo else (SIL_BUDGET[sx] if b == 'sil' else BUDGET_BIRD[sx] + (CREST_EXTRA[sx] if b == 'pol' else 0))) + (100 if b == 'sil' and lo else 0) - (300 if b == 'sil' and lo else 0), *((20, 0.02) if lo else ())); names.append(nm)
for lo in (False, True):
    fresh(); r = breeds.chick(seed=3); light(1)
    nm = 'chick' + ('_lo' if lo else ''); bake_bird(nm, r, LOW['chick'] if lo else BUDGET_BIRD['chick'], *((20, 0.02) if lo else ())); names.append(nm)
write_bird_glb(os.path.join(OUT, 'flock.glb'), names)
json.dump(dict(joints=JOINTS, paint=breeds.PAINT, models=PIVOTS, stats=STATS), open(os.path.join(OUT, 'flock.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
