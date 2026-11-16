"""The East Meadow (16 Nov 2026, Audrey: "we need to extend the map; we can fit more coops but they should not be packed and
we need space for decoration"; her choice: "East Meadow, 10 new fields"): the farm's far end carried on 17 m (its bounds'
v from -25 to -42), with two lanes down it and one across, a few trees, bushes, rocks, flowers, pebbles and its long
grass. python3 meadow.py  ->  models/village.json changed in place (once: it says so in 'meadow'); then python3 fields.py.
Everything is added at the END of each list: a tree's, a bush's and a rock's id is its place in its list (the game saves
the ones cleared), so the old ones keep theirs. (stylized/village_layout.py made village.json: made again, run this again.)"""
import json, math, random
P = 'models/village.json'; V = json.load(open(P)); R2 = math.sqrt(0.5)
if 'meadow' in V: raise SystemExit('the meadow is already in village.json')
V0, V1 = -42.0, V['bounds']['v'][0]; U0, U1 = V['bounds']['u']
xz = lambda u, v: [round((u - v) * R2, 3), 0.0, round(-(u + v) * R2, 3)]
rnd = random.Random(1611)
def lane(a, b, step=0.7, wob=0.22):
    n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step)); out = []
    for i in range(n + 1):
        t = i / n; w = math.sin(t * math.pi) * wob * math.sin(i * 0.9)
        d = (b[0] - a[0], b[1] - a[1]); L = math.hypot(*d); out.append(xz(a[0] + d[0] * t - d[1] / L * w, a[1] + d[1] * t + d[0] / L * w))
    return out
old_end = min((l for l in V['paths'] if len(l) > 3), key=lambda l: min((-p[2] - p[0]) * R2 for p in l))      # (the lane that runs to the old far edge: carried on from its end)
e = min(old_end, key=lambda p: (-p[2] - p[0]) * R2); eu, ev = (e[0] - e[2]) * R2, (-e[2] - e[0]) * R2
lanes = [lane((eu, ev), (eu + 0.3, V0 + 0.8)), lane((-14.4, V1 - 0.6), (-14.6, V0 + 0.8)), lane((-14.5, -33.5), (eu + 0.15, -33.5))]
V['paths'] += lanes
def clear(u, v, r):
    x, _, z = xz(u, v)
    for l in lanes:
        for i in range(1, len(l)):
            ax, az, bx, bz = l[i - 1][0], l[i - 1][2], l[i][0], l[i][2]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L))
            if math.hypot(x - ax - dx * t, z - az - dz * t) < r: return False
    return True
def spots(n, r, edge=0.8):
    out = []
    while len(out) < n:
        u, v = rnd.uniform(U0 + edge, U1 - edge), rnd.uniform(V0 + edge, V1 - 0.1)
        if clear(u, v, r): out.append((u, v))
    return out
area = (U1 - U0) * (V1 - V0); old_area = (U1 - U0) * (V['bounds']['v'][1] - V1); k = area / old_area
tr = [t for t in V['trees']]
for (u, v) in spots(7, 2.2, 2.0): t = dict(rnd.choice(tr)); t['pos'] = xz(u, v); t['kind'] = 'wood'; V['trees'].append(t)
for name, n, r in (('bushes', round(len(V['bushes']) * k), 1.2), ('rocks', round(len(V['rocks']) * k), 1.0), ('flowers', round(len(V['flowers']) * k), 0.9)):
    src = list(V[name])
    for (u, v) in spots(n, r): o = dict(rnd.choice(src)); o['pos'] = xz(u, v); V[name].append(o)
for (u, v) in spots(round(len(V['pebbles']) * k), 0.3, 0.3): V['pebbles'].append(xz(u, v))
src = list(V['tufts'])
for (u, v) in spots(round(len(V['tufts']) * k), 0.55, 0.2): t = list(rnd.choice(src)); t[0:3] = xz(u, v); t[4] = round(rnd.uniform(0, 6.283), 2); V['tufts'].append(t)
B = V['bounds']; V['meadow'] = {'v': [V0, V1], 'was': {'v': list(B['v']), 'corners': B['corners']}}
B['v'] = [V0, B['v'][1]]
B['corners'] = [xz(U0, V0), xz(U1, V0), xz(U1, B['v'][1]), xz(U0, B['v'][1])]
json.dump(V, open(P, 'w'), separators=(',', ':'))
print('meadow: lanes', [len(l) for l in lanes], 'trees', len(V['trees']), 'bushes', len(V['bushes']), 'tufts', len(V['tufts']), 'corners', B['corners'])
