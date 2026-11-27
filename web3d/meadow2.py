"""The East Meadow made to look like it always belonged (27 Nov 2026, Audrey: "Please review the map as the bottom of it is
weird and looks added"): meadow.py had carried the farm on with three ruler-straight lanes (one of them starting from
nothing, 4.7 m short of the lane it was meant to carry on), and the old far edge's line of trees was left standing across
the middle in a row. Here: the three lanes drawn again, winding gently, the left one carrying on from the end of its lane
in the old farm, the one across curving from it to the right one; the old edge's trees moved, each keeping its id (the
game saves the ones cleared by id), into a few natural groups about the meadow, clear of the lanes. Still the last three
lanes (fields.py: the meadow's), so: python3 meadow2.py; python3 fields.py.
(A coop, decoration or the like a moved tree would stand on: the game clears it there on loading, as it always has.)"""
import json, math
P = 'models/village.json'; V = json.load(open(P)); R2 = math.sqrt(0.5)
if V.get('meadow', {}).get('v2'): raise SystemExit('already done')
xz = lambda u, v: [round((u - v) * R2, 3), 0.0, round(-(u + v) * R2, 3)]
uv = lambda p: ((p[0] - p[2]) * R2, (-p[2] - p[0]) * R2)
def wind(pts, step=0.6):
    """a lane through these (u, v) points, smooth (Catmull-Rom), a point every `step` m"""
    out = []; ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        n = max(2, int(math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return [xz(u, v) for u, v in out]
old = V['paths'][:-3]
L5 = [uv(p) for p in old[5]]; L6 = [uv(p) for p in old[6]]
b0 = min(L5, key=lambda p: p[1]); a0 = min(L6, key=lambda p: p[1])          # (the old lanes' far ends)
V0 = V['meadow']['v'][0]
A = wind([a0, (a0[0] - 0.5, -27.5), (a0[0] - 1.6, -31.5), (a0[0] - 0.9, -35.5), (a0[0] + 0.3, -38.5), (a0[0] + 0.1, V0 + 0.8)])
B = wind([b0, (b0[0] + 0.6, -24.5), (b0[0] + 1.7, -28.0), (b0[0] + 1.2, -31.0), (b0[0] - 0.4, -35.0), (b0[0] - 0.9, -38.5), (b0[0] - 0.6, V0 + 0.8)])
C = wind([(b0[0] + 1.25, -31.0), (-8.5, -32.2), (-2.0, -34.4), (4.5, -34.6), (10.0, -33.2), (a0[0] - 1.45, -32.6)])
V['paths'] = old + [A, B, C]
# the old far edge's trees (a straight row across the meadow's top): into groups, each tree its own id
row = [i for i, t in enumerate(V['trees']) if -27.0 < uv(t['pos'])[1] < -24.8 and abs(uv(t['pos'])[0]) < 20]
spots = [(-6.4, -28.4), (-4.6, -29.6), (-7.2, -30.1),        # a little copse left of the middle
         (5.6, -38.9), (7.4, -38.0), (6.2, -40.2),           # another down by the far woods
         (-19.0, -36.5), (19.0, -29.2), (0.8, -40.6), (-17.6, -30.4)]
def clear_of_lanes(u, v, r=2.0):
    x, _, z = xz(u, v)
    for l in (A, B, C):
        for i in range(1, len(l)):
            ax, az, bx, bz = l[i - 1][0], l[i - 1][2], l[i][0], l[i][2]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L))
            if math.hypot(x - ax - dx * t, z - az - dz * t) < r: return False
    return True
moved = []
for i, (u, v) in zip(row, spots):
    assert clear_of_lanes(u, v), (u, v)
    V['trees'][i]['pos'] = xz(u, v); moved.append(i)
# bushes, rocks, flowers, tufts and pebbles now on a lane: a little way off it
for name in ('bushes', 'rocks', 'flowers'):
    for o in V[name]:
        u, v = uv(o['pos'])
        if v < -24 and not clear_of_lanes(u, v, 0.9):
            for d in (1.2, -1.2, 1.8, -1.8, 2.6, -2.6):
                if clear_of_lanes(u + d, v, 0.9): o['pos'] = xz(u + d, v); break
V['pebbles'] = [p for p in V['pebbles'] if uv(p)[1] > -24 or clear_of_lanes(*uv(p), 0.5)]
V['tufts'] = [t for t in V['tufts'] if uv(t)[1] > -24 or clear_of_lanes(*uv(t), 0.6)]
V['meadow']['v2'] = True
json.dump(V, open(P, 'w'), separators=(',', ':'))
print('lanes', len(A), len(B), len(C), 'trees moved', moved)
