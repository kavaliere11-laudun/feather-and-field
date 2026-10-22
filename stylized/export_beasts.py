"""Export the farm's other animals for the browser (beasts.glb + beasts.json): the fox ('fox') and the fox cub ('cub').
Like the birds: one mesh each with vertex colours, bone weights and a fur region per vertex. The coat's pattern (darker
back, white bib, belly, cheeks and tail tip, black socks, ear tips and ear backs) is painted per vertex here. The bones
(beasts.JOINTS): root, hips, chest, neck, head, three in the tail, two in each leg; beasts.json gives each model's pivots.
glTF's (x, y, z) = the animal's (left, up, forward): it faces +z.  Usage: python export_beasts.py [out_dir]"""
import os, sys, json, math, struct
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import numpy as np
import beasts
from mathutils import Vector

flat_info = g['flat_info']
JOINTS = beasts.JOINTS
BEAST_BUDGET = {'fox': 2800, 'cub': 1800}
PIVOTS, MODELS, STATS = {}, {}, {}


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def hexrgb(h):           # a colour as the materials hold it (linear)
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def bake(name, root, budget):
    bpy.context.view_layer.update()
    piv = {o.name.split('.')[0][3:]: Vector(o.matrix_world.translation) for o in bpy.context.scene.objects if o.name.startswith('pv_')}
    C = {k: hexrgb(v) for k, v in beasts.COATS['cub' if name == 'cub' else 'fox'].items()}
    S = 0.56 if name == 'cub' else 1.0
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    objs = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.visible_get() and 'part' in o]
    meshes = []
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        me.calc_loop_triangles(); meshes.append([o, me, len(me.loop_triangles)])
    kept = lambda o, n: n <= 60 or o.get('keep')
    small = sum(n for o, _, n in meshes if kept(o, n)); big = sum(n for o, _, n in meshes if not kept(o, n))
    ratio = max(0.004, min(1.0, (budget - small) / max(1, big)))
    if ratio < 1.0:
        for rec in meshes:
            o, me, n = rec
            if kept(o, n): continue
            tmp = bpy.data.objects.new('tmp', me); bpy.context.scene.collection.objects.link(tmp)
            md = tmp.modifiers.new('dec', 'DECIMATE'); md.ratio = ratio; md.use_collapse_triangulate = True
            dg.update()
            me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
            bpy.data.objects.remove(tmp); me2.calc_loop_triangles(); rec[1] = me2; rec[2] = len(me2.loop_triangles)
    pv = {k: np.array(v[:], np.float32) for k, v in piv.items()}
    tl = [pv['tail1'], pv['tail2'], pv['tail3'], pv['tailtip']]
    P_, N_, C_, J_, W_, A_ = [], [], [], [], [], []
    for o, me, n in meshes:
        prt = o['part']; paint = int(o.get('paint', 0)); mode = o.get('col')
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        co = np.array([mw @ v.co for v in me.vertices], np.float32); lc = np.array([v.co[:] for v in me.vertices], np.float32)
        try: cn = np.array([c.vector[:] for c in me.corner_normals], np.float32)
        except AttributeError: me.calc_normals_split(); cn = np.array([l.normal[:] for l in me.loops], np.float32)
        cn = cn @ np.array(nm, np.float32).T; cn /= np.maximum(1e-8, np.linalg.norm(cn, axis=1, keepdims=True))
        lv = np.array([l.vertex_index for l in me.loops], np.int64)
        cols = [(flat_info(m)[0][:3] if m is not None else [0.8, 0.8, 0.8]) for m in me.materials] or [[0.8, 0.8, 0.8]]
        corners = np.array([t.loops[:] for t in me.loop_triangles], np.int64).reshape(-1)
        mi = np.repeat(np.array([t.material_index for t in me.loop_triangles], np.int64), 3)
        p = co[lv[corners]]; nrm = cn[corners]; loc = lc[lv[corners]]
        c = np.array([cols[min(i, len(cols) - 1)] for i in mi], np.float32)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        W = np.zeros((len(p), len(JOINTS)), np.float32)
        J = lambda nm_: JOINTS.index(nm_)
        if prt == 'chest':                                        # the body: hips to chest, the neck, up to the head
            t = ss(pv['hips'][0] + 0.02 * S, pv['chest'][0] - 0.02 * S, x)
            wn = ss(pv['chest'][0] + 0.07 * S, pv['neck'][0] + 0.02 * S, x) * ss(pv['chest'][2] - 0.01 * S, pv['neck'][2] + 0.03 * S, z)
            wh = ss(pv['head'][2] - 0.06 * S, pv['head'][2] + 0.01 * S, z) * (x > pv['neck'][0])
            W[:, J('hips')] = (1 - t) * (1 - wn); W[:, J('chest')] = t * (1 - wn); W[:, J('neck')] = wn * (1 - wh); W[:, J('head')] = wn * wh
        elif prt == 'head':
            W[:, J('head')] = 1
        elif prt in ('FLu', 'FRu', 'HLu', 'HRu'):                  # a leg: upper and lower bones, its top joined to the body
            L = prt[:2]; up, lo = pv[L + 'u'], pv[L + 'l']
            wl = ss(lo[2] + 0.02 * S, lo[2] - 0.02 * S, z)
            wb = ss(up[2] - 0.08 * S, up[2] + 0.01 * S, z) * 0.75
            body = 'chest' if L[0] == 'F' else 'hips'
            W[:, J(L + 'u')] = (1 - wl) * (1 - wb); W[:, J(L + 'l')] = wl * (1 - wb); W[:, J(body)] = wb
        elif prt == 'tail1':                                      # the tail: along its three bones, its root joined to the hips
            s = np.zeros(len(p), np.float32); best = np.full(len(p), 1e9, np.float32)
            for i in range(3):
                a, b = tl[i], tl[i + 1]; ab = b - a; u = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
                d = np.linalg.norm(p - (a + u[:, None] * ab), axis=1); better = d < best; best = np.where(better, d, best); s = np.where(better, i + u, s)
            w1 = 1 - ss(0.6, 1.25, s); w3 = ss(1.75, 2.4, s); w2 = np.clip(1 - w1 - w3, 0, 1); wb = (1 - ss(0.0, 0.3, s)) * 0.6
            W[:, J('tail1')] = w1 * (1 - wb); W[:, J('tail2')] = w2 * (1 - wb); W[:, J('tail3')] = w3 * (1 - wb); W[:, J('hips')] = wb
            o['_s'] = 1
        else:
            W[:, J(prt)] = 1
        # the coat's pattern
        if mode:
            n_ = nrm
            if mode == 'fox':
                if prt == 'head':
                    hc = pv['headc']; HD = 1.38 if name == 'cub' else 1.0
                    line = hc[2] - 0.014 * S * HD + 0.12 * np.maximum(0, x - hc[0])          # rising a little towards the nose
                    wht = ss(line + 0.003 * S, line - 0.016 * S, z) * ss(hc[0] - 0.075 * S * HD, hc[0] - 0.04 * S * HD, x)
                    dark = ss(0.6, 0.95, n_[:, 2]) * ss(hc[0] + 0.02 * S, hc[0] - 0.02 * S, x) * 0.5
                else:
                    belly = ss(-0.2, -0.65, n_[:, 2])
                    bib = ss(0.15, 0.6, n_[:, 0]) * ss(pv['chest'][0] - 0.02 * S, pv['chest'][0] + 0.08 * S, x) * ss(pv['head'][2] + 0.02 * S, pv['head'][2] - 0.04 * S, z)
                    wht = np.maximum(belly, bib)
                    dark = ss(0.45, 0.9, n_[:, 2]) * ss(pv['hips'][0] - 0.1 * S, pv['chest'][0], x) * 0.85
                base = C['fur'][None, :] * (1 - dark[:, None]) + C['back'][None, :] * dark[:, None]
                c = base * (1 - wht[:, None]) + C['white'][None, :] * wht[:, None]
            elif mode == 'fox_leg':
                L = prt[:2]; lo = pv[L + 'l']
                blk = ss(lo[2] + 0.035 * S, lo[2] - 0.015 * S, z) if L[0] == 'F' else ss(lo[2] + 0.05 * S, lo[2] - 0.01 * S, z)
                inner = ss(0.4, 0.8, -np.sign(y) * n_[:, 1]) * (1 - blk) * 0.5        # paler on the inside of the legs
                c = C['fur'][None, :] * (1 - blk[:, None]) + C['black'][None, :] * blk[:, None]
                c = c * (1 - inner[:, None]) + C['white'][None, :] * inner[:, None]
            elif mode == 'fox_tail':
                s = np.zeros(len(p), np.float32); best = np.full(len(p), 1e9, np.float32)
                for i in range(3):
                    a, b = tl[i], tl[i + 1]; ab = b - a; u = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
                    d = np.linalg.norm(p - (a + u[:, None] * ab), axis=1); better = d < best; best = np.where(better, d, best); s = np.where(better, i + u, s)
                tipw = ss(2.45, 2.75, s); dark = ss(0.3, 0.8, n_[:, 2]) * 0.7 * (1 - tipw) + ss(2.0, 2.4, s) * (1 - tipw) * 0.35
                base = C['fur'][None, :] * (1 - dark[:, None]) + C['back'][None, :] * dark[:, None]
                c = base * (1 - tipw[:, None]) + C['white'][None, :] * tipw[:, None]
            elif mode == 'fox_ear':
                f = (loc[:, 2] - loc[:, 2].min()) / max(1e-6, loc[:, 2].max() - loc[:, 2].min())
                blk = np.maximum(ss(0.5, 0.72, f), ss(-0.05, -0.45, n_[:, 0]))
                c = C['fur'][None, :] * (1 - blk[:, None]) + C['black'][None, :] * blk[:, None]
            # a little unevenness, as in real fur
            rnd = np.sin(x * 61.0 + y * 37.0) * np.sin(z * 53.0 - x * 29.0) * np.sin(y * 71.0 + z * 17.0)
            c = c * (1.0 + 0.06 * rnd[:, None])
        # the strongest four bones, weights adding up to one
        top = np.argsort(-W, axis=1)[:, :4]; wt = np.take_along_axis(W, top, 1)
        wt /= np.maximum(1e-6, wt.sum(1, keepdims=True))
        P_.append(p); N_.append(nrm); C_.append(c); J_.append(top.astype(np.float32)); W_.append(wt); A_.append(np.full(len(p), paint, np.float32))
    p = np.concatenate(P_); n = np.concatenate(N_); c = np.concatenate(C_); jt = np.concatenate(J_); wt = np.concatenate(W_); pa = np.concatenate(A_)
    gl = lambda v: np.stack([v[..., 1], v[..., 2], v[..., 0]], -1)          # (forward, left, up) -> (left, up, forward)
    P = gl(p); N = gl(n)
    Cb = np.clip(np.round(np.clip(c, 0, 1) * 255), 0, 255).astype(np.uint8)
    W8 = np.round(wt * 255).astype(np.int32); W8[:, 0] += 255 - W8.sum(1)
    key = np.concatenate([np.round(P * 1e4), np.round(N * 1e3), Cb.astype(np.float32), jt, W8.astype(np.float32), pa[:, None]], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.reshape(-1)
    first = np.zeros(len(uniq), np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    MODELS[name] = dict(pos=P[first].astype(np.float32), nrm=N[first].astype(np.float32),
                        col=np.concatenate([Cb[first], np.full((len(first), 1), 255, np.uint8)], 1), idx=inv.astype(np.uint32),
                        joints=jt[first].astype(np.uint8), weights=W8[first].astype(np.uint8), paint=pa[first].astype(np.uint8))
    PIVOTS[name] = {k: [round(float(v[1]), 5), round(float(v[2]), 5), round(float(v[0]), 5)] for k, v in piv.items()}
    PIVOTS[name]['root'] = [0, 0, 0]
    STATS[name] = dict(tris=len(inv) // 3, verts=len(first))
    print('BAKED', name, STATS[name], 'ratio', round(ratio, 3))


def write(path, names):
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
    def add_view(data, target):
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target)); bin_.extend(data); return len(views) - 1
    def acc(data, ctype, count, typ, target=34962, **kw):
        accs.append(dict(bufferView=add_view(data, target), componentType=ctype, count=count, type=typ, **kw)); return len(accs) - 1
    for name in names:
        pr = MODELS[name]; pos = pr['pos']
        at = dict(POSITION=acc(pos.tobytes(), 5126, len(pos), 'VEC3', min=[float(x) for x in pos.min(0)], max=[float(x) for x in pos.max(0)]),
                  NORMAL=acc(pr['nrm'].tobytes(), 5126, len(pos), 'VEC3'),
                  COLOR_0=acc(pr['col'].tobytes(), 5121, len(pos), 'VEC4', normalized=True),
                  JOINTS_0=acc(pr['joints'].tobytes(), 5121, len(pos), 'VEC4'),
                  WEIGHTS_0=acc(pr['weights'].tobytes(), 5121, len(pos), 'VEC4', normalized=True),
                  _PAINT=acc(pr['paint'].tobytes(), 5121, len(pos), 'SCALAR'))
        ib = pr['idx'].astype(np.uint16)
        meshes.append(dict(name=name, primitives=[dict(attributes=at, indices=acc(ib.tobytes(), 5123, len(ib), 'SCALAR', target=34963), material=0)]))
        nodes.append(dict(name=name, mesh=len(meshes) - 1))
    while len(bin_) % 4: bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='Feather & Field export_beasts.py'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=meshes, materials=[dict(name='satin', pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0, roughnessFactor=0.7))],
                accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total)); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
    print('WROTE', os.path.basename(path), round(total / 1024), 'KB', names)


names = []
for k in ('fox', 'cub'):
    fresh(); r = beasts.fox(k, seed=3); light(1)
    bake(k, r, BEAST_BUDGET[k]); names.append(k)
write(os.path.join(OUT, 'beasts.glb'), names)
# the animals' places (static): the foxes' den
fresh(); beasts.den(); light(1)
import webglb
webglb.BUDGET['den'] = 2600
bake_and_export('den')
write_glb(os.path.join(OUT, 'fauna.glb'), ['den'])
json.dump(dict(joints=JOINTS, models=PIVOTS, stats={k: STATS[k] for k in names}), open(os.path.join(OUT, 'beasts.json'), 'w'), indent=1)
print('STATS', json.dumps({k: STATS[k] for k in names}), 'den', webglb.STATS.get('den'))
