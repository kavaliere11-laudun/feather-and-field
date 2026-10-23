"""Export the geese for the browser (geese.glb + geese.json): Gertrude the Embden ('embden') and Hector the Toulouse
('toulouse'). Like the foxes: one mesh each with vertex colours, bone weights and a feather region per vertex; and, for the
birds' feather drawing, everything decided here: each vertex's feather pattern (colour, amount and kind: Hector's grey feathers
edged pale, Gertrude's white ones only a shade darker where they overlap), the modelled feathers' own coordinates (across,
along), and where each vertex sits in the feathers' two lattices: round the body (gb: across, up from the body's middle,
forward) and round the neck and head (gn: across, forward of the neck's line, how far up the neck), so the rows of feathers
follow the long curved neck. The bones (geese.JOINTS) and pivots go to geese.json.
glTF's (x, y, z) = the goose's (left, up, forward): it faces +z.  Usage: python export_geese.py [out_dir]"""
import os, sys, json, math, struct
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE)
from webglb import *
import numpy as np
import geese
from breeds import PAINT
from mathutils import Vector

flat_info = g['flat_info']
JOINTS = geese.JOINTS
BUDGET = {'embden': 14000, 'toulouse': 14300}
PIVOTS, MODELS, STATS = {}, {}, {}


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def hexrgb(h):           # a colour as the materials hold it (linear)
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4).astype(np.float32)


def nearest_on(p, pts):
    """For each point: the nearest point on the polyline pts, its arc length from pts[0], the segment's direction, and the
    unclamped position along the first segment (negative behind the start)."""
    best = np.full(len(p), 1e9, np.float32); s = np.zeros(len(p), np.float32)
    cp = np.zeros_like(p); tg = np.zeros_like(p); seg = np.zeros(len(p), np.float32); cum = 0.0
    t0 = None
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; ab = b - a; L = float(np.linalg.norm(ab)); u_raw = ((p - a) @ ab) / (ab @ ab)
        if i == 0: t0 = u_raw.copy()
        u = np.clip(u_raw, 0, 1); q = a + u[:, None] * ab; d = np.linalg.norm(p - q, axis=1); better = d < best
        best = np.where(better, d, best); s = np.where(better, cum + u * L, s); seg = np.where(better, i + u, seg)
        cp[better] = q[better]; tg[better] = ab / L
        cum += L
    return best, s, cp, tg, seg, t0


def chain_w(s, n, blend=0.2):
    w = np.zeros((len(s), n), np.float32)
    for i in range(n):
        lo = 1.0 if i == 0 else ss(i - blend, i + blend, s)
        hi = 1.0 if i == n - 1 else 1 - ss(i + 1 - blend, i + 1 + blend, s)
        w[:, i] = lo * hi
    return w / np.maximum(1e-6, w.sum(1, keepdims=True))


def bake(name, root, budget):
    bpy.context.view_layer.update()
    B = geese.GEESE[name]; S = B['S']; zc = (0.29 - B['low']) * S
    piv = {o.name.split('.')[0][3:]: Vector(o.matrix_world.translation) for o in bpy.context.scene.objects if o.name.startswith('pv_')}
    C = {k: hexrgb(v) for k, v in B['coat'].items()}
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
    N, H = geese.neck_points(B)
    neck = [np.array(v[:], np.float32) for v in N] + [np.array(H[:], np.float32), pv['bill']]
    neck_r = np.array([0.066, 0.053, 0.046, 0.042, 0.039, 0.036], np.float32) * S
    P_, N_, C_, J_, W_, A_, F_, FP_, FM_, GB_, GN_, HW_ = [], [], [], [], [], [], [], [], [], [], [], []
    for o, me, n in meshes:
        prt = o['part']; paint = int(o.get('paint', 0)); mode = o.get('col')
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        co = np.array([mw @ v.co for v in me.vertices], np.float32)
        try: cn = np.array([c.vector[:] for c in me.corner_normals], np.float32)
        except AttributeError: me.calc_normals_split(); cn = np.array([l.normal[:] for l in me.loops], np.float32)
        cn = cn @ np.array(nm, np.float32).T; cn /= np.maximum(1e-8, np.linalg.norm(cn, axis=1, keepdims=True))
        lv = np.array([l.vertex_index for l in me.loops], np.int64)
        cols = [(flat_info(m)[0][:3] if m is not None else [0.8, 0.8, 0.8]) for m in me.materials] or [[0.8, 0.8, 0.8]]
        corners = np.array([t.loops[:] for t in me.loop_triangles], np.int64).reshape(-1)
        mi = np.repeat(np.array([t.material_index for t in me.loop_triangles], np.int64), 3)
        p = co[lv[corners]]; nrm = cn[corners]
        c = np.array([cols[min(i, len(cols) - 1)] for i in mi], np.float32)
        x, y, z = p[:, 0], p[:, 1], p[:, 2]
        W = np.zeros((len(p), len(JOINTS)), np.float32)
        J = lambda nm_: JOINTS.index(nm_)
        # the neck's line: how far along it and how far from it each point is
        dist, s_len, cp, tg, seg, t0 = nearest_on(p, neck)
        hw = np.zeros(len(p), np.float32)
        if prt == 'body':
            # the neck's points follow its four bones (and the head, at the top), blended at the joints; the body behind
            # the neck's base (and far from its line) stays with the body
            on = ss(-0.15, 0.35, np.where(seg < 1, t0, 1.0)) * (1 - ss(1.6, 2.4, dist / np.interp(seg, np.arange(6), neck_r)))
            cw = chain_w(np.clip(seg, 0, 5), 5, 0.22)              # neck1..neck4, head
            for i, b_ in enumerate(geese.NECK + ['head']): W[:, J(b_)] = cw[:, i] * on
            W[:, J('body')] = 1 - on
            hw = on
        elif prt in ('legL', 'legR'):                         # the thigh: its top stays with the body
            hp, hl = pv[prt], pv[prt + 'k']; ab = hl - hp; u = np.clip(((p - hp) @ ab) / (ab @ ab), 0, 1)
            wl = ss(0.1, 0.5, u); W[:, J(prt)] = wl; W[:, J('body')] = 1 - wl
        else:
            W[:, J(prt)] = 1
            if prt in ('head', 'jaw', 'blinkL', 'blinkR'): hw[:] = 1
        # colour and the feathers' pattern: 0 none, 2 a dark centre with a pale edge, 4 darker where the next feather overlaps
        fpat = np.zeros((len(p), 4), np.float32); fmode = np.zeros(len(p), np.float32)
        if mode == 'goose':
            up = nrm[:, 2]
            if name == 'embden':
                shade = ss(-0.1, -0.7, up) * 0.55 + (paint == PAINT['wing']) * 0.12 * ss(0.2, -0.4, up)
                c = C['white'][None, :] * (1 - shade[:, None]) + C['shade'][None, :] * shade[:, None]
                fpat[:] = np.concatenate([C['shade'] * 0.62, [0.16]]); fmode[:] = 4
            else:
                # Hector: a dark head and neck, the back and flanks grey in laced rows, a pale grey breast going to a white
                # belly and under the tail
                c = np.zeros((len(p), 3), np.float32) + C['back']
                neckness = np.clip(hw, 0, 1) if prt in ('body', 'head') else np.zeros(len(p), np.float32)
                belly = ss(zc - 0.02 * S, zc - 0.075 * S, z) * (1 - neckness)
                belly = np.maximum(belly, ss(-0.2 * S, -0.27 * S, x) * ss(zc + 0.03 * S, zc - 0.01 * S, z))       # under the tail
                breast = ss(0.02 * S, 0.12 * S, x) * ss(zc + 0.08 * S, zc + 0.02 * S, z) * (1 - neckness)
                c = c * (1 - breast[:, None]) + C['breast'][None, :] * breast[:, None]
                c = c * (1 - belly[:, None]) + C['belly'][None, :] * belly[:, None]
                c = c * (1 - neckness[:, None]) + C['dark'][None, :] * neckness[:, None]
                laced = (1 - belly) * (1 - breast) * (1 - neckness)
                # (grey feathers with a thin pale edge: the edge colour mixed in, a darker grey drawn over each feather's middle)
                if prt.startswith('wing') or paint in (PAINT['wing'], PAINT['prim']):
                    c = c * 0 + (C['wing'] * 0.62 + C['edge'] * 0.38); laced = np.ones(len(p), np.float32)
                    fpat[:, :3] = C['wing'] * 0.85; fpat[:, 3] = 0.6
                    if paint == PAINT['prim']: c = c * 0 + C['wing'] * 0.85
                else:
                    fpat[:, :3] = C['back'] * 0.85; fpat[:, 3] = 0.55 * laced
                    c = c * (1 - 0.3 * laced[:, None]) + C['edge'][None, :] * 0.3 * laced[:, None]
                fmode[:] = np.where(laced > 0.3, 2, 4)
                fpat[:, 3] = np.where(laced > 0.3, fpat[:, 3], 0.22)
                if paint == PAINT['tail']: c = c * 0 + C['back']; fpat[:, :3] = C['belly']; fmode[:] = 0
            if paint == PAINT['prim'] or paint == PAINT['tail']:       # long glossy feathers: a soft sheen
                fmode[:] = 5; fpat[:, :3] = 1.0; fpat[:, 3] = 0.08
            rnd = np.sin(x * 61.0 + y * 37.0) * np.sin(z * 53.0 - x * 29.0) * np.sin(y * 71.0 + z * 17.0)
            c = c * (1.0 + 0.035 * rnd[:, None])
        # the strongest four bones, weights adding up to one
        top = np.argsort(-W, axis=1)[:, :4]; wt = np.take_along_axis(W, top, 1)
        wt /= np.maximum(1e-6, wt.sum(1, keepdims=True))
        # the feathers' lattices: round the body, and round the neck's line (across, forward of it, how far up it)
        gb = np.stack([y, z - zc, x], 1)
        side = np.array([0, 1, 0], np.float32); perp = np.cross(side[None, :], tg); perp /= np.maximum(1e-6, np.linalg.norm(perp, axis=1, keepdims=True))
        d = p - cp; gn = np.stack([d @ side, np.sum(d * perp, 1), s_len], 1)
        fuv = np.zeros((len(p), 2), np.float32)
        if 'feat' in me.uv_layers:
            lu = np.zeros(len(me.loops) * 2, np.float32); me.uv_layers['feat'].data.foreach_get('uv', lu)
            fuv = lu.reshape(-1, 2)[corners].astype(np.float32)
        P_.append(p); N_.append(nrm); C_.append(c); J_.append(top.astype(np.float32)); W_.append(wt); A_.append(np.full(len(p), paint, np.float32))
        F_.append(fuv); FP_.append(fpat); FM_.append(fmode); GB_.append(gb); GN_.append(gn); HW_.append(hw)
    cat = lambda L: np.concatenate(L)
    p, n, c, jt, wt, pa, fu, fp, fm, gb, gn, hw = map(cat, (P_, N_, C_, J_, W_, A_, F_, FP_, FM_, GB_, GN_, HW_))
    gl = lambda v: np.stack([v[..., 1], v[..., 2], v[..., 0]], -1)          # (forward, left, up) -> (left, up, forward)
    P = gl(p); Nn = gl(n)
    Cb = np.clip(np.round(np.clip(c, 0, 1) * 255), 0, 255).astype(np.uint8)
    FPb = np.clip(np.round(np.clip(fp, 0, 1) * 255), 0, 255).astype(np.uint8)
    W8 = np.round(wt * 255).astype(np.int32); W8[:, 0] += 255 - W8.sum(1)
    key = np.concatenate([np.round(P * 1e4), np.round(Nn * 1e3), Cb.astype(np.float32), jt, W8.astype(np.float32), pa[:, None], np.round(fu * 1e3), FPb.astype(np.float32), fm[:, None]], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.reshape(-1)
    first = np.zeros(len(uniq), np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    MODELS[name] = dict(pos=P[first].astype(np.float32), nrm=Nn[first].astype(np.float32),
                        col=np.concatenate([Cb[first], np.full((len(first), 1), 255, np.uint8)], 1), idx=inv.astype(np.uint32),
                        joints=jt[first].astype(np.uint8), weights=W8[first].astype(np.uint8), paint=pa[first].astype(np.uint8),
                        feat=np.round(np.clip(fu[first], 0, 1) * 255).astype(np.uint8), fpat=FPb[first], fmode=fm[first].astype(np.uint8),
                        gb=gb[first].astype(np.float32), gn=gn[first].astype(np.float32), hw=np.round(np.clip(hw[first], 0, 1) * 255).astype(np.uint8))
    PIVOTS[name] = {k: [round(float(v[1]), 5), round(float(v[2]), 5), round(float(v[0]), 5)] for k, v in piv.items()}
    PIVOTS[name]['root'] = [0, 0, 0]
    STATS[name] = dict(tris=len(inv) // 3, verts=len(first))
    print('BAKED', name, STATS[name], 'ratio', round(ratio, 3), 'kept', small, 'shaped', budget - small)


def write(path, names):
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
    def add_view(data, target):
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target)); bin_.extend(data); return len(views) - 1
    def acc(data, ctype, count, typ, target=34962, **kw):
        accs.append(dict(bufferView=add_view(data, target), componentType=ctype, count=count, type=typ, **kw)); return len(accs) - 1
    for name in names:
        pr = MODELS[name]; pos = pr['pos']; nv = len(pos)
        at = dict(POSITION=acc(pos.tobytes(), 5126, nv, 'VEC3', min=[float(v) for v in pos.min(0)], max=[float(v) for v in pos.max(0)]),
                  NORMAL=acc(pr['nrm'].tobytes(), 5126, nv, 'VEC3'),
                  COLOR_0=acc(pr['col'].tobytes(), 5121, nv, 'VEC4', normalized=True),
                  JOINTS_0=acc(pr['joints'].tobytes(), 5121, nv, 'VEC4'),
                  WEIGHTS_0=acc(pr['weights'].tobytes(), 5121, nv, 'VEC4', normalized=True),
                  _PAINT=acc(pr['paint'].tobytes(), 5121, nv, 'SCALAR'),
                  _FEAT=acc(pr['feat'].tobytes(), 5121, nv, 'VEC2', normalized=True),
                  _FPAT=acc(pr['fpat'].tobytes(), 5121, nv, 'VEC4', normalized=True),
                  _FMODE=acc(pr['fmode'].tobytes(), 5121, nv, 'SCALAR'),
                  _GB=acc(pr['gb'].tobytes(), 5126, nv, 'VEC3'), _GN=acc(pr['gn'].tobytes(), 5126, nv, 'VEC3'),
                  _HEADW=acc(pr['hw'].tobytes(), 5121, nv, 'SCALAR', normalized=True))
        ib = pr['idx'].astype(np.uint16 if nv < 65536 else np.uint32)
        meshes.append(dict(name=name, primitives=[dict(attributes=at, indices=acc(ib.tobytes(), 5123 if nv < 65536 else 5125, len(ib), 'SCALAR', target=34963), material=0)]))
        nodes.append(dict(name=name, mesh=len(meshes) - 1))
    while len(bin_) % 4: bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='Feather & Field export_geese.py'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
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
for k in ('embden', 'toulouse'):
    fresh(); r = geese.goose(k, seed=3); light(1)
    bake(k, r, BUDGET[k]); names.append(k)
write(os.path.join(OUT, 'geese.glb'), names)
json.dump(dict(joints=JOINTS, names={k: geese.GEESE[k]['name'] for k in names}, models=PIVOTS, stats=STATS), open(os.path.join(OUT, 'geese.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
