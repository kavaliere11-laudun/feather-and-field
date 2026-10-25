"""The farm's fields (release 1 step 5, Audrey 25 Oct: "For me it's a full piece of land not just a patch for the coop...
people will have choice to put their coops where they want so no predefined places"; she chose fields with natural
borders, one more each level, nearest first). python3 fields.py  ->  models/fields.json (and fields.png, a map to look at)

The farm inside its bounds, less its lanes (the plots' little gate paths left out: there are no set places any more), the
streams and the pond with their banks, is split into fields: the lanes and the water are their natural borders, and the
big open stretches between them are shared out into fields of about the same size (a coop or two each) by growing them
from seeds over the ground, never across a lane or the water (a few rounds of moving each seed to the middle of its
field, so they come out even). The home field (the first coop and the farmhouse) is the farm's from the start; then the
order the rest come up for sale: always one touching the land already owned (or just over a lane from it), the nearest
to home first.

Written out: the grid of which field each half-metre... quarter-metre square belongs to (run-length rows), and for each
field its middle, its size and its borders as simplified lines, each saying what's on the other side (another field, a
lane, water, the farm's edge), for the fences and the sign.
"""
import json, math, heapq
from collections import deque
import numpy as np

V = json.load(open('models/village.json'))
R2 = math.sqrt(0.5)
B = V['bounds']
CELL = 0.25
N_FIELDS = 31                    # (two of them, the first coop's and the farmhouse's, make the home field: 30 in all)
cs = B['corners']; xs = [c[0] for c in cs]; zs = [c[2] for c in cs]
X0, Z0 = min(xs) - 1, min(zs) - 1
NX = int((max(xs) + 1 - X0) / CELL) + 1; NZ = int((max(zs) + 1 - Z0) / CELL) + 1
X = X0 + (np.arange(NX) + 0.5) * CELL; Z = Z0 + (np.arange(NZ) + 0.5) * CELL
XX, ZZ = np.meshgrid(X, Z)
U = (XX - ZZ) * R2; VV = (-ZZ - XX) * R2
inside = (U > B['u'][0]) & (U < B['u'][1]) & (VV > B['v'][0]) & (VV < B['v'][1])

def segdist(px, pz, a, b):
    ax, az, bx, bz = a[0], a[2], b[0], b[2]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
    t = np.clip(((px - ax) * dx + (pz - az) * dz) / L, 0, 1); return np.hypot(px - ax - dx * t, pz - az - dz * t)

LANES = [l for l in V['paths'] if len(l) > 3]          # (the 3-point gate paths are left out)
lane = np.zeros_like(inside)
for l in LANES:
    for i in range(1, len(l)): lane |= segdist(XX, ZZ, l[i - 1], l[i]) < V['pathHalf'] + 0.12
water = np.zeros_like(inside)
for st in V['streams']:
    for i in range(1, len(st)): water |= segdist(XX, ZZ, st[i - 1], st[i]) < V['streamHalf'] + 0.28
P = V['pond']; c = P['center']; au = np.array([P['axisU'][0], P['axisU'][2]]); av = np.array([P['axisV'][0], P['axisV'][2]])
lu = np.linalg.norm(au) * 1.12 + 0.3; lv = np.linalg.norm(av) * 1.12 + 0.3; au = au / np.linalg.norm(au); av = av / np.linalg.norm(av)
dx = XX - c[0]; dz = ZZ - c[2]
water |= ((dx * au[0] + dz * au[1]) / lu) ** 2 + ((dx * av[0] + dz * av[1]) / lv) ** 2 <= 1
free = inside & ~lane & ~water

# the open stretches between the lanes and the water
reg = -np.ones(free.shape, int); nreg = 0; area = []
for k in range(NZ):
    for i in range(NX):
        if free[k, i] and reg[k, i] < 0:
            q = deque([(k, i)]); reg[k, i] = nreg; s = 0
            while q:
                a, b = q.popleft(); s += 1
                for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    A, Bb = a + da, b + db
                    if 0 <= A < NZ and 0 <= Bb < NX and free[A, Bb] and reg[A, Bb] < 0: reg[A, Bb] = nreg; q.append((A, Bb))
            area.append(s * CELL * CELL); nreg += 1
area = np.array(area)
big = [r for r in range(nreg) if area[r] >= 30]           # (slivers smaller than a coop: not land)
total = sum(area[r] for r in big)

# seeds: shared out by area (each stretch at least one), the first coop's and the farmhouse's among them
plot0 = V['plots'][0]['pos']; house = next(p['pos'] for p in V['props'] if p['model'] == 'farmhouse')
def cell_of(x, z): return int((z - Z0) / CELL), int((x - X0) / CELL)
counts = {r: max(1, round(area[r] / total * N_FIELDS)) for r in big}
while sum(counts.values()) > N_FIELDS: counts[min((r for r in counts if counts[r] > 1), key=lambda r: area[r] / counts[r])] -= 1
while sum(counts.values()) < N_FIELDS: counts[max(counts, key=lambda r: area[r] / counts[r])] += 1
rng = np.random.default_rng(7)
seeds = []
fixed = [cell_of(plot0[0], plot0[2]), cell_of(house[0], house[2])]
for r in big:
    cells = np.argwhere(reg == r)
    mine = [f for f in fixed if reg[f] == r]
    seeds += [(tuple(f), True) for f in mine]
    for _ in range(counts[r] - len(mine)): seeds.append((tuple(cells[rng.integers(len(cells))]), False))

STEPS = [(1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)]
def grow(seeds):
    """each free cell to the nearest seed over the ground (never across a lane or the water)"""
    lab = -np.ones(free.shape, int); dist = np.full(free.shape, np.inf); h = []
    for j, (s, _) in enumerate(seeds): dist[s] = 0; lab[s] = j; heapq.heappush(h, (0, s[0], s[1], j))
    while h:
        d, a, b, j = heapq.heappop(h)
        if d > dist[a, b] or lab[a, b] != j: continue
        for da, db, w in STEPS:
            A, Bb = a + da, b + db
            if 0 <= A < NZ and 0 <= Bb < NX and free[A, Bb] and reg[A, Bb] in big and (not (da and db) or (free[a, Bb] and free[A, b])):
                nd = d + w
                if nd < dist[A, Bb]: dist[A, Bb] = nd; lab[A, Bb] = j; heapq.heappush(h, (nd, A, Bb, j))
    return lab
for it in range(14):                                      # (each seed to the middle of its field: even fields)
    lab = grow(seeds)
    new = []
    for j, (s, fix) in enumerate(seeds):
        if fix: new.append((s, fix)); continue
        cells = np.argwhere(lab == j)
        if not len(cells): new.append((s, fix)); continue
        m = cells.mean(0); k = cells[np.argmin(((cells - m) ** 2).sum(1))]
        new.append((tuple(k), fix))
    seeds = new
lab = grow(seeds)
# the home field: the first coop's and the farmhouse's together
home_ids = sorted(set(lab[f] for f in fixed))
for j in home_ids[1:]: lab[lab == j] = home_ids[0]
ids = sorted(set(lab[lab >= 0].ravel()))
remap = {j: n for n, j in enumerate(ids)}
lab = np.vectorize(lambda v: remap.get(v, -1))(lab)
nf = len(ids); home = remap[home_ids[0]]

# which fields touch (or face each other over a lane): for the order
cen = {f: np.argwhere(lab == f).mean(0) for f in range(nf)}
def xz(k, i): return [round(X0 + (i + 0.5) * CELL, 3), round(Z0 + (k + 0.5) * CELL, 3)]
near = {f: set() for f in range(nf)}
reach = int(math.ceil((2 * V['pathHalf'] + 0.5) / CELL))
for f in range(nf):
    cells = np.argwhere(lab == f)
    for k, i in cells[::3]:
        for dk in range(-reach, reach + 1):
            for di in range(-reach, reach + 1):
                A, Bb = k + dk, i + di
                if 0 <= A < NZ and 0 <= Bb < NX and lab[A, Bb] >= 0 and lab[A, Bb] != f and not water[(k + A) // 2, (i + Bb) // 2]: near[f].add(int(lab[A, Bb]))
hc = cen[home]
order = [home]
while len(order) < nf:
    cand = set().union(*(near[f] for f in order)) - set(order)
    if not cand: cand = set(range(nf)) - set(order)
    order.append(min(cand, key=lambda f: np.hypot(*(cen[f] - hc))))
pos = {f: n for n, f in enumerate(order)}
lab = np.vectorize(lambda v: pos[v] if v >= 0 else -1)(lab)

# each field's borders: the cell edges between it and what's next to it, joined into lines and simplified
def kind_at(k, i):
    if not (0 <= k < NZ and 0 <= i < NX) or not inside[k, i]: return 'edge'
    if lab[k, i] >= 0: return int(lab[k, i])
    if water[k, i]: return 'water'
    if lane[k, i]: return 'lane'
    return 'none'
def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); d = b - a; L = np.hypot(*d) or 1
    dists = [abs(d[0] * (a[1] - p[1]) - d[1] * (a[0] - p[0])) / L for p in pts[1:-1]]
    j = int(np.argmax(dists)) + 1
    if dists[j - 1] > eps: return rdp(pts[:j + 1], eps)[:-1] + rdp(pts[j:], eps)
    return [pts[0], pts[-1]]
fields = []
for f in range(nf):
    edges = {}                                            # (the corner points of each edge, by what's over it)
    for k, i in np.argwhere(lab == f):
        for dk, di, e in ((1, 0, ((k + 1, i), (k + 1, i + 1))), (-1, 0, ((k, i + 1), (k, i))), (0, 1, ((k + 1, i + 1), (k, i + 1))), (0, -1, ((k, i), (k + 1, i)))):
            o = kind_at(k + dk, i + di)
            if o == f: continue
            edges.setdefault(str(o), []).append(e)
    lines = []
    for o, es in edges.items():
        nxt = {}
        for a, b in es: nxt.setdefault(a, []).append(b)
        prev = {}
        for a, b in es: prev.setdefault(b, []).append(a)
        used = set()
        for a, b in es:
            if (a, b) in used: continue
            # back to the start of this run, then along it
            s = a; guard = 0
            while s in prev and guard < 10000:
                p = next((p for p in prev[s] if (p, s) not in used), None)
                if p is None or p == a: break
                s = p; guard += 1
            run = [s]; cur = s
            while cur in nxt:
                n = next((n for n in nxt[cur] if (cur, n) not in used), None)
                if n is None: break
                used.add((cur, n)); run.append(n); cur = n
                if cur == s: break
            pts = [[round(X0 + q[1] * CELL, 3), round(Z0 + q[0] * CELL, 3)] for q in run]
            if len(pts) >= 2: lines.append({'by': o if not o.lstrip('-').isdigit() else int(o), 'pts': rdp(pts, 0.3)})
    cells = np.argwhere(lab == f)
    m = cells.mean(0)
    fields.append({'id': f, 'mid': xz(*m), 'area': round(len(cells) * CELL * CELL, 1), 'lines': lines})

# the grid, run-length rows: [start, length, field] runs of each row
rows = []
for k in range(NZ):
    row, i = [], 0
    while i < NX:
        v = lab[k, i]
        if v < 0: i += 1; continue
        j = i
        while j < NX and lab[k, j] == v: j += 1
        row += [i, j - i, int(v)]; i = j
    rows.append(row)
out = {'note': 'the farm\'s fields (fields.py): id = the order they come up for sale (0: home, the farm\'s from the start)',
       'cell': CELL, 'x0': X0, 'z0': Z0, 'nx': NX, 'nz': NZ, 'rows': rows, 'fields': fields}
json.dump(out, open('models/fields.json', 'w'), separators=(',', ':'))
print('fields', nf, 'home area', fields[0]['area'], 'areas', sorted(f['area'] for f in fields))

# a map to look at
try:
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    img = np.zeros(lab.shape + (3,))
    pal = plt.cm.tab20(np.linspace(0, 1, 20))[:, :3]
    for f in range(nf): img[lab == f] = pal[(f * 7) % 20] * 0.8 + 0.2
    img[lane] = [0.85, 0.7, 0.5]; img[water] = [0.4, 0.6, 0.9]; img[~inside] = [1, 1, 1]
    plt.figure(figsize=(10, 10)); plt.imshow(img, origin='lower', extent=[X0, X0 + NX * CELL, Z0, Z0 + NZ * CELL])
    for fl in fields: plt.text(fl['mid'][0], fl['mid'][1], str(fl['id']), ha='center', va='center', fontsize=9, weight='bold')
    plt.plot(plot0[0], plot0[2], 'k^'); plt.plot(house[0], house[2], 'ks')
    plt.savefig('/tmp/claude-0/farmer/fields.png', dpi=80, bbox_inches='tight')
except Exception as e: print('no map', e)
