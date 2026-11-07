# Soft shading in the corners (ambient occlusion), baked once into the still models: under the eaves, where a wall meets
# the ground or a step, between the boards of a fence, inside a barrel's rim. For each corner of each part (a building, a
# coop, a prop) rays go out over the half of the sky it faces; what they hit near by (the part itself, and the ground
# under it when it stands on the ground) is how hidden that corner is. The answer goes in the colour's fourth number (the
# alpha, 255 everywhere until now, so the files don't grow): 255 open, lower hidden. main.js (ambientShade) darkens
# the colour by it as the model loads, in the new look only; the colours themselves aren't touched, so the Silkie coops'
# own colours are still found by tintedPart.
# Usage (Blender's own python, for its ray tree): bl/bin/python web3d/bake_ao.py web3d/models/village.glb [more.glb ...]
# Run again on a fresh export: it reads the parts' shapes, not the old answer.
import sys, json, struct, time, math
import numpy as np
import bpy  # noqa: F401  (mathutils comes with it)
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from multiprocessing import Pool

DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
# not shaded: nature has its own (crownShade, natureContact), the flowers and wheat are too fine, lights and glass stay clear
SKIP_PART = ('tree_', 'bush_', 'rock_', 'wheat_field', 'sunflowers', 'flowers', 'mushrooms', 'xmas_star')
SKIP_MAT = ('glow', 'glowc', 'window', 'glass')
RAYS = 48
GROUND_W = 0.6          # the ground counts a little less (the contact patches and foot shading do some of that already)


class GLB:
    def __init__(s, path):
        f = open(path, 'rb').read(); jl = struct.unpack_from('<I', f, 12)[0]; s.J = json.loads(f[20:20 + jl])
        bl = struct.unpack_from('<I', f, 20 + jl)[0]; s.B = bytearray(f[20 + jl + 8:20 + jl + 8 + bl])

    def view(s, i):
        a = s.J['accessors'][i]; v = s.J['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(DT[a['componentType']])
        st = v.get('byteStride', n * dt.itemsize); off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.ndarray((a['count'], n), dt, s.B, off, (st, dt.itemsize))

    def save(s, path):
        js = json.dumps(s.J, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
        B = bytes(s.B); B += b'\0' * ((4 - len(B) % 4) % 4)
        open(path, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(B)) + struct.pack('<II', len(js), 0x4E4F534A) + js
                               + struct.pack('<II', len(B), 0x004E4942) + B)


def hemisphere(n):
    # cosine-weighted directions round +z, spread evenly (a sunflower spiral on the disc, lifted onto the dome)
    out = []
    for i in range(n):
        r = math.sqrt((i + 0.5) / n); a = i * 2.399963229728653
        x, y = r * math.cos(a), r * math.sin(a); out.append((x, y, math.sqrt(max(0.0, 1 - x * x - y * y))))
    return np.array(out)


DOME = hemisphere(RAYS)


def bake_part(job):
    name, P, N, T, shade = job                      # corners, their normals, triangles, which corners get an answer
    lo, hi = P.min(0), P.max(0); ext = float((hi - lo).max())
    reach = min(0.5, max(0.08, 0.25 * ext))          # how far a corner looks for what hides it
    ground = abs(lo[1]) < 0.03                       # standing on the ground
    tree = BVHTree.FromPolygons(P.tolist(), T.tolist(), all_triangles=True); cast = tree.ray_cast
    occ = np.zeros(len(P)); buried = np.zeros(len(P), bool)
    eps = 0.0015 + 0.0005 * ext
    seen = {}
    for i in np.nonzero(shade)[0]:
        n = N[i]; ln = np.linalg.norm(n)
        if ln < 1e-6: continue
        n = n / ln
        key = (round(P[i][0], 4), round(P[i][1], 4), round(P[i][2], 4), round(n[0], 2), round(n[1], 2), round(n[2], 2))
        if key in seen: occ[i], buried[i] = seen[key]; continue
        # a frame round the normal, turned by an angle of its own (no banding from one corner to the next)
        t = np.cross(n, (0, 1, 0) if abs(n[1]) < 0.9 else (1, 0, 0)); t /= np.linalg.norm(t); b = np.cross(n, t)
        h = (math.sin(P[i][0] * 127.1 + P[i][1] * 311.7 + P[i][2] * 74.7) * 43758.5453) % 1.0 * 2 * math.pi
        c, s = math.cos(h), math.sin(h); t, b = t * c + b * s, b * c - t * s
        D = DOME[:, :1] * t + DOME[:, 1:2] * b + DOME[:, 2:3] * n
        o = P[i] + n * eps; ov = Vector(o); total = 0.0; backs = 0
        for d in D:
            dv = Vector(d); hit = cast(ov, dv, reach)
            dist = hit[3] if hit[0] is not None else None
            if dist is not None and hit[1].dot(dv) > 0: backs += 1      # (the inside of something)
            w = 1.0
            if ground and d[1] < -1e-4:
                gd = max(0.0, o[1]) / -d[1]                 # (a corner at or under the ground: hidden by it)
                if gd < reach and (dist is None or gd < dist): dist, w = gd, GROUND_W
            if dist is not None: total += w * (1 - (dist / reach) ** 2)
        # a corner inside another piece (a rail's end in its post: the models are pieces pushed into each other) is never
        # seen, but the faces it's a corner of are: it takes its seen neighbours' answer below, not a black one
        buried[i] = backs > 0.4 * RAYS
        occ[i] = total / RAYS; seen[key] = (occ[i], buried[i])
    # a gentle smoothing along the surface: each corner with its seen neighbours on the same side (no speckle on a flat
    # wall); a buried corner takes its seen neighbours' answer (open if it has none: a rail buried at both ends)
    nb = [[] for _ in range(len(P))]
    for a, b2, c2 in T:
        nb[a] += (b2, c2); nb[b2] += (a, c2); nb[c2] += (a, b2)
    nb = [list(set(x)) for x in nb]
    for i in np.nonzero(buried)[0]:
        js = [j for j in nb[i] if shade[j] and not buried[j]]
        occ[i] = occ[js].mean() if js else 0.0
    for _ in range(2):
        new = occ.copy()
        for i in np.nonzero(shade)[0]:
            js = [j for j in nb[i] if shade[j] and not buried[j] and np.dot(N[i], N[j]) > 0.6]
            if js: new[i] = 0.5 * occ[i] + 0.5 * occ[js].mean()
        occ = new
    return name, occ, reach, ground


def main(paths):
    for path in paths:
        t0 = time.time(); G = GLB(path); jobs = []; where = {}
        for nd in G.J['nodes']:
            if 'mesh' not in nd: continue
            name = nd.get('name', ''); m = G.J['meshes'][nd['mesh']]
            if any(k in nd for k in ('translation', 'rotation', 'scale', 'matrix')): print('  (moved node, skipped)', name); continue
            P, N, T, S, off, prims = [], [], [], [], 0, []
            for p in m['primitives']:
                a = p['attributes']
                if 'COLOR_0' not in a or 'NORMAL' not in a: continue
                pos = G.view(a['POSITION']).astype(float); nor = G.view(a['NORMAL']).astype(float)
                idx = G.view(p['indices']).reshape(-1, 3).astype(np.int64) if 'indices' in p else np.arange(len(pos)).reshape(-1, 3)
                mat = G.J['materials'][p['material']]['name'] if 'material' in p else ''
                on = not name.startswith(SKIP_PART) and mat not in SKIP_MAT
                P.append(pos); N.append(nor); T.append(idx + off); S.append(np.full(len(pos), on)); prims.append((p, off, len(pos))); off += len(pos)
            if not P: continue
            P, N, T, S = np.concatenate(P), np.concatenate(N), np.concatenate(T), np.concatenate(S)
            # (a floor on the ground, a pen's yard, the bare earth of a plot: left as it is; its few corners are mostly at
            # its edge, by the fence, and the darkness would spread over all of it: a muddy yard, not a shaded corner)
            S &= ~((N[:, 1] > 0.85 * np.linalg.norm(N, axis=1)) & (P[:, 1] < 0.06))
            where[name] = prims
            if S.any(): jobs.append((name, P, N, T, S))
            else:
                for p, o, n in prims: G.view(p['attributes']['COLOR_0'])[:, 3] = 255
        with Pool(2) as pool:
            for name, occ, reach, ground in pool.imap_unordered(bake_part, jobs):
                for p, o, n in where[name]:
                    G.view(p['attributes']['COLOR_0'])[:, 3] = np.clip(np.round(255 * (1 - occ[o:o + n])), 0, 255).astype(np.uint8)
                print(f'  {name:18s} corners {sum(n for _, _, n in where[name]):7d} reach {reach:.2f} ground {ground} mean hidden {occ.mean():.3f}', flush=True)
        G.save(path); print(path, f'{time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
