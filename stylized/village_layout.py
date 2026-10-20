"""The village's plan for the 3D farm: the same layout as the game's 2D village map (farm_map3.py, v7) - ten clusters of
four plots round a village green with a pond, winding lanes, two streams with footbridges, the farmhouse and fields at the
top, the pasture at the bottom, woods round the edge - written as data for the browser (three.js coordinates:
(x, y, z) = Blender (x, z, -y); a Blender turn of d degrees about z is a three.js turn of d degrees about y).
No Blender needed. Usage: python village_layout.py out.json"""
import sys, os, json, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))      # ffcam lives one folder up
import ffcam
from ffcam import uv_to_world

random.seed(11)
R2 = ffcam.R2

# ------------------------------------------------------------------ the layout, as in farm_map3.py (u across the screen, v up the screen)
U_MAX, V_MIN, V_MAX = 21.5, -25.0, 43.0
PEN_W, PEN_D = 3.6, 3.0
HALF = (PEN_W + PEN_D) / 2 * 0.7071
CLUSTERS = [(-7.5, 27), (7.5, 27), (-14, 14), (14, 14), (-14.5, 0), (14, 1.5), (-5, -8), (7.5, -10), (-14.5, -16), (15.5, -18.6)]
def clane(cu, cv, v): return cu + 0.35 * math.sin(v * 0.5 + cu)


def rot2(x, y, deg):
    a = math.radians(deg); return x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)


SLOTS, LANE_PATHS = [], []
for (cu, cv) in CLUSTERS:
    for dv in (2.55, -2.55):
        lu = clane(cu, cv, cv + dv)
        SLOTS += [(lu - 2.9, cv + dv, 90), (lu + 2.9, cv + dv, 0)]
    LANE_PATHS.append([(clane(cu, cv, v), v) for v in [cv - 4.9 + i * 0.7 for i in range(15)]])
HOUSE_UV, STALL_UV = (0.0, 36.0), (5.6, 35.4)
POND = (0.0, 9.5, 4.6, 2.7)
LOOP = (0.0, 9.0, 8.3, 8.8)
PASTURE_UV, PASTURE_WD, PASTURE_DEG = (0.0, -20.0), (6.0, 4.6), 180
MAP_TARGET = uv_to_world(0, 9.4)


def world_to_uv(x, y): return ((x + y) * R2, (y - x) * R2)
def gate_uv(u, v, deg, d=PEN_D / 2):
    cx, cy = uv_to_world(u, v); gx, gy = rot2(0, -d, deg); return world_to_uv(cx + gx, cy + gy)
def loop_pt(a, wob=True):
    cu, cv, ru, rv = LOOP
    r = 1 + (0.04 * math.sin(a * 3 + 1) if wob else 0)
    return (cu + ru * r * math.cos(a), cv + rv * r * math.sin(a))
def nearest_loop(u, v):
    best = min(range(96), key=lambda k: math.hypot(*(lambda p: (p[0] - u, p[1] - v))(loop_pt(k / 96 * math.tau))))
    return loop_pt(best / 96 * math.tau)
def curve(pts, n=6):
    out = []
    P_ = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P_) - 2):
        p0, p1, p2, p3 = P_[i - 1], P_[i], P_[i + 1], P_[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out


UV_PATHS = [[loop_pt(k / 72 * math.tau) for k in range(73)]]
UV_PATHS += LANE_PATHS
L = lambda i: LANE_PATHS[i]
UV_PATHS.append(curve([L(0)[0], (-6.2, 20.5), nearest_loop(-4.6, 16.4)]))
UV_PATHS.append(curve([L(1)[0], (6.2, 20.5), nearest_loop(4.6, 16.4)]))
UV_PATHS.append(curve([L(2)[0], (-11.2, 8.8), nearest_loop(-8.3, 9)]))
UV_PATHS.append(curve([L(3)[0], (11.2, 8.8), nearest_loop(8.3, 9)]))
UV_PATHS.append(curve([L(4)[-1], (-14.3, 7.0), L(2)[0]]))
UV_PATHS.append(curve([L(5)[-1], (14.0, 7.8), L(3)[0]]))
UV_PATHS.append(curve([L(8)[-1], (-14.6, -8.0), L(4)[0]]))
UV_PATHS.append(curve([L(9)[-1], (15.8, -9.0), L(5)[0]]))
UV_PATHS.append(curve([L(6)[-1], (-3.6, -1.0), nearest_loop(-2.6, 0.5)]))
UV_PATHS.append(curve([L(7)[-1], (5.0, -2.5), nearest_loop(3.4, 0.8)]))
UV_PATHS.append(curve([(0.0, 33.6), (0.4, 26.0), (-0.3, 21.0), nearest_loop(0, 17.8)]))
UV_PATHS.append(curve([(0.3, 31.5), (3.2, 32.4), (STALL_UV[0] - 0.5, STALL_UV[1] - 1.2)]))
pgu, pgv = gate_uv(*PASTURE_UV, PASTURE_DEG, PASTURE_WD[1] / 2)
UV_PATHS.append(curve([nearest_loop(1.2, 0.2), (1.3, -6.0), (1.1, -12.0), (pgu, pgv)]))
for (u, v, deg) in SLOTS:
    gu, gv = gate_uv(u, v, deg)
    ci = [i for i, (cu, cv) in enumerate(CLUSTERS) if abs(cu - (u + (2.9 if deg == 90 else -2.9))) < 1.2 and abs(cv - v) < 3][0]
    cu, cv = CLUSTERS[ci]; lu = clane(cu, cv, gv - 0.7)
    UV_PATHS.append([(gu, gv), ((gu + lu) / 2, gv - 0.35), (lu, gv - 0.7)])
PATHS = [[uv_to_world(u, v) for (u, v) in p] for p in UV_PATHS]
STREAMS = [curve([(-22.4, 34.5), (-18.6, 31.0), (-17.4, 25.5), (-15.6, 21.0), (-11.8, 20.4), (-8.6, 20.1), (-6.3, 17.2), (-5.4, 13.6), (-4.0, 10.8)], 5),
           curve([(4.1, 9.0), (6.8, 7.2), (10.0, 6.9), (13.0, 7.6), (17.0, 7.3), (22.4, 8.2)], 5)]
STREAM_W = 0.42


def _cross(a, b, c, d):
    r = (b[0] - a[0], b[1] - a[1]); q = (d[0] - c[0], d[1] - c[1]); den = r[0] * q[1] - r[1] * q[0]
    if abs(den) < 1e-9: return None
    t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den; s_ = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den
    return (a[0] + t * r[0], a[1] + t * r[1], math.atan2(*reversed(r))) if 0 <= t <= 1 and 0 <= s_ <= 1 else None


BRIDGES = []
for p in UV_PATHS:
    for a, b in zip(p, p[1:]):
        for st in STREAMS:
            for c, d in zip(st, st[1:]):
                x = _cross(a, b, c, d)
                if x and all(math.hypot(x[0] - q[0], x[1] - q[1]) > 2 for q in BRIDGES): BRIDGES.append(x)


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay; L_ = dx * dx + dy * dy
    t = 0 if L_ == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L_))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


SEGS = [(p[i], p[i + 1]) for p in PATHS for i in range(len(p) - 1)]
SEG_BOX = [(min(a[0], b[0]) - 0.8, max(a[0], b[0]) + 0.8, min(a[1], b[1]) - 0.8, max(a[1], b[1]) + 0.8) for a, b in SEGS]
def path_dist(x, y):
    d = 9.0
    for (a, b), (x0, x1, y0, y1) in zip(SEGS, SEG_BOX):
        if x0 <= x <= x1 and y0 <= y <= y1: d = min(d, seg_dist((x, y), a, b))
    return d
def pen_l1(u, v, su, sv): return abs(u - su) + abs(v - sv)
def in_pen(u, v, margin=0.0):
    for (su, sv, deg) in SLOTS:
        if pen_l1(u, v, su, sv) < HALF + 0.1 + margin: return True
    return pen_l1(u, v, *PASTURE_UV) < 3.95 + margin
def pond_r(u, v): return math.hypot((u - POND[0]) / POND[2], (v - POND[1]) / POND[3])
FIELDS = [(14.2, 37.6, 2.45, 1.45), (-15.2, 37.4, 2.15, 1.15), (-9.6, 36.4, 1.6, 1.15), (-6.0, -20.5, 1.45, 1.45)]
ORCHARD = [(5.6, -18.2), (8.0, -19.6), (6.0, -22.4), (8.6, -23.0)]
def stream_dist(u, v):
    d = 9.0
    for st in STREAMS:
        for (a, b) in zip(st, st[1:]):
            if min(a[0], b[0]) - 1 <= u <= max(a[0], b[0]) + 1 and min(a[1], b[1]) - 1 <= v <= max(a[1], b[1]) + 1:
                d = min(d, seg_dist((u, v), a, b))
    return d
def busy(u, v):
    if any(abs(u - fu) < hw and abs(v - fv) < hh for fu, fv, hw, hh in FIELDS): return True
    if any(math.hypot(u - a, v - b) < 1.6 for a, b in ORCHARD): return True
    return stream_dist(u, v) < STREAM_W + 0.45 or any(math.hypot(u - b[0], v - b[1]) < 1.3 for b in BRIDGES)


# ------------------------------------------------------------------ things to place (the same rules as the 2D map)
def T(x, y, z=0.0): return [round(x, 3), round(z, 3), round(-y, 3)]
def TU(u, v, z=0.0): return T(*uv_to_world(u, v), z)
def deg_of(u_dir, v_dir):          # a direction given in u/v, as a Blender world angle in degrees
    x, y = uv_to_world(u_dir, v_dir); return math.degrees(math.atan2(y, x))


TREES = []
def add_tree(u, v, h, r, kind):
    TREES.append(dict(u=u, v=v, h=h, r=r, kind=kind))
for v in range(-24, 44, 4):                     # woods all round the edge
    for side in (-1, 1):
        add_tree(side * (21.9 + random.uniform(-0.3, 0.4)), v + random.uniform(-1.0, 1.0), random.uniform(3.0, 3.8), random.uniform(1.15, 1.45), 'wood')
for u in range(-18, 19, 4):
    if abs(u) < 7 or abs(u) > 11: add_tree(u + random.uniform(-0.6, 0.6), 42.6 + random.uniform(-0.4, 0.4), random.uniform(3.2, 3.9), random.uniform(1.2, 1.45), 'wood')
    if not 9 < u < 21: add_tree(u + random.uniform(-0.6, 0.6), -25.6 + random.uniform(-0.3, 0.3), random.uniform(3.0, 3.6), random.uniform(1.1, 1.35), 'wood')
for (u, v) in [(-6.8, 3.2), (6.6, 14.8), (-19.0, -8.0), (19.4, -10.5), (-19.8, 22.5), (19.6, 24.0)]:
    add_tree(u, v, random.uniform(3.0, 3.6), random.uniform(1.1, 1.3), 'green')
for (u, v) in ORCHARD:
    add_tree(u, v, random.uniform(2.3, 2.6), random.uniform(0.85, 0.95), 'apple')


def clear(u, v, r_tree=1.6):
    return not any(math.hypot(u - t['u'], v - t['v']) < r_tree for t in TREES)


bushes, rocks, flower_spots = [], [], []
while len(bushes) < 110:
    u, v = random.uniform(-20.5, 20.5), random.uniform(-24, 41)
    if in_pen(u, v, 0.6) or path_dist(*uv_to_world(u, v)) < 1.0 or pen_l1(u, v, *HOUSE_UV) < 2.8 or pen_l1(u, v, *STALL_UV) < 1.8 \
            or pond_r(u, v) < 1.35 or not clear(u, v) or busy(u, v):
        continue
    bushes.append(dict(pos=TU(u, v), s=round(random.uniform(0.3, 0.48) / 0.4, 3), rot=round(random.uniform(0, 360))))
for k in range(30):
    u, v = random.uniform(-20.5, 20.5), random.uniform(-24, 41)
    if not in_pen(u, v, 0.4) and path_dist(*uv_to_world(u, v)) > 0.9 and pond_r(u, v) > 1.3 and not busy(u, v):
        rocks.append(dict(pos=TU(u, v), s=round(random.uniform(0.1, 0.2) / 0.15, 3), rot=round(random.uniform(0, 360))))
while len(flower_spots) < 95:
    u, v = random.uniform(-20.5, 20.5), random.uniform(-24, 41)
    if in_pen(u, v, 0.5) or path_dist(*uv_to_world(u, v)) < 0.9 or pond_r(u, v) < 1.3 or pen_l1(u, v, *HOUSE_UV) < 2.8 or busy(u, v): continue
    flower_spots.append(dict(pos=TU(u, v), r=0.5))


def free(u, v, r=1.2):
    x, y = uv_to_world(u, v)
    return not (in_pen(u, v, r) or path_dist(x, y) < r * 0.7 or pond_r(u, v) < 1.2 or busy(u, v) or pen_l1(u, v, *HOUSE_UV) < 3.0)


props = []          # [model name, position, Blender world angle in degrees, scale]
def put(name, u, v, deg=0, s=1.0): props.append(dict(model=name, pos=TU(u, v), deg=deg, s=s))
for (cu, cv), name in zip(CLUSTERS, ['hay_stack', 'barrels', 'planter', 'round_bale', 'flower_pots', 'log_pile', 'wheelbarrow', 'hay_stack', 'barrels', 'round_bale']):
    for (du, dv) in [(0, 5.6), (0.8, 5.4), (-0.8, 5.5), (0, -5.6)]:
        if free(cu + du, cv + dv, 0.6): put(name, cu + du, cv + dv, random.choice([0, 30, 60, 90])); break
for k in range(0, 72, 9):                       # lamp posts round the green
    a = k / 72 * math.tau; u, v = loop_pt(a); put('lamp_post', u * 1.09, 9 + (v - 9) * 1.08, 180)
for (u, v, deg) in [(0.0, 13.4, 135), (-3.6, 5.6, 45)]: put('bench', u, v, deg)
for k in range(10):                             # flower beds round the green
    a = k / 10 * math.tau + 0.3; u, v = 6.0 * math.cos(a), 9.5 + 4.6 * math.sin(a)
    if free(u, v, 0.4): flower_spots.append(dict(pos=TU(u, v), r=0.35))
for (u, v) in [(-19.5, 12.0), (19.5, 18.0), (-19.8, -2.5), (-9.0, -24.0), (12.0, 29.5), (-12.0, 29.0)]:
    if free(u, v, 0.4): put(random.choice(['mushrooms', 'round_bale', 'log_pile']), u, v, random.choice([0, 45, 90]))
hu, hv = HOUSE_UV
put('farmhouse', hu, hv, 45); put('egg_stall', *STALL_UV, 45)
put('picket_fence', hu - 2.9, hv - 2.0, 45); put('picket_fence', hu + 2.6, hv - 2.0, 45)
put('flower_pots', hu - 1.6, hv - 1.6); put('bench', hu + 1.2, hv - 2.2, 45)
put('well', -3.6, 37.6, 0)
put('veg_patch', -9.6, 36.4, 45); put('scarecrow', -9.4, 37.6, 45)
put('sunflowers', -15.2, 37.4, 45)
put('wheat_field', 14.2, 37.6, 45)
put('wheelbarrow', 9.0, 35.0, 20); put('hay_stack', 10.4, 36.4, 70)
put('veg_patch_sq', -6.0, -20.5, 45)
put('dock', POND[0] + 0.6, POND[1] - POND[3] + 0.2, 135)
for (du, dv) in [(-1.8, -1.0), (1.6, 0.9)]: put('round_bale', PASTURE_UV[0] + du, PASTURE_UV[1] + dv, 30)
for (u, v, ang) in BRIDGES:
    ax_, ay_ = uv_to_world(math.cos(ang), math.sin(ang)); put('bridge', u, v, round(math.degrees(math.atan2(ay_, ax_)), 1))
put('pasture', *PASTURE_UV, PASTURE_DEG)
sx, sy = rot2(0.6, 1.6, PASTURE_DEG); px_, py_ = uv_to_world(*PASTURE_UV)
props.append(dict(model='pasture_shelter', pos=T(px_ + sx, py_ + sy), deg=PASTURE_DEG, s=1.0))
fx, fy = rot2(-1.4, -0.6, PASTURE_DEG)
flower_spots.append(dict(pos=T(px_ + fx, py_ + fy), r=0.8))
while len(flower_spots) < 95 + 10 + 55:         # extra wildflower drifts in open grass
    u, v = random.uniform(-20.5, 20.5), random.uniform(-24, 41)
    if in_pen(u, v, 0.5) or path_dist(*uv_to_world(u, v)) < 0.8 or pond_r(u, v) < 1.3 or pen_l1(u, v, *HOUSE_UV) < 2.8 or busy(u, v): continue
    flower_spots.append(dict(pos=TU(u, v), r=0.5))

# pebbles along the path edges
pebbles = []
for k in range(40000):
    u, v = random.uniform(-20.5, 20.5), random.uniform(-24, 40)
    x, y = uv_to_world(u, v); d = path_dist(x, y)
    if .5 < d < .62 and len(pebbles) < 2200: pebbles.append(T(x, y))

# frogs' spots round the water's edge (for later)
frogs = []
for k in range(14):
    a = k / 14 * math.tau + random.uniform(-0.1, 0.1); rr = random.uniform(1.04, 1.18)
    frogs.append(TU(POND[0] + math.cos(a) * POND[2] * rr, POND[1] + math.sin(a) * POND[3] * rr))

# where grass can grow (for tufts): open ground away from pens, paths, water, buildings and fields
def grass_ok(x, y):
    u, v = world_to_uv(x, y)
    return not (in_pen(u, v, 0.25) or path_dist(x, y) < 0.62 or pond_r(u, v) < 1.12 or pen_l1(u, v, *HOUSE_UV) < 2.4
                or pen_l1(u, v, *STALL_UV) < 1.4 or busy(u, v) or stream_dist(u, v) < STREAM_W + 0.15)
tufts = []
for k in range(26000):
    u, v = random.uniform(-21.5, 21.5), random.uniform(-25.5, 43.5)
    x, y = uv_to_world(u, v)
    if grass_ok(x, y): tufts.append(T(x, y) + [random.randint(0, 2), round(random.uniform(0, 6.28), 2), round(random.uniform(1.3, 2.3), 2)])
    if len(tufts) >= 11000: break

# ------------------------------------------------------------------ the plan, for the browser
def poly(p): return [T(x, y) for (x, y) in p]
pc = uv_to_world(POND[0], POND[1])
out = dict(
    note='three.js coordinates (metres); deg = turn about the vertical axis; plots are numbered as in the game',
    bounds=dict(u=[-U_MAX, U_MAX], v=[V_MIN, V_MAX], corners=[TU(-U_MAX, V_MIN), TU(U_MAX, V_MIN), TU(U_MAX, V_MAX), TU(-U_MAX, V_MAX)]),
    plots=[dict(pos=TU(u, v), deg=deg) for (u, v, deg) in SLOTS],
    paths=[poly(p) for p in PATHS], pathHalf=0.44,
    streams=[[TU(u, v) for (u, v) in st] for st in STREAMS], streamHalf=STREAM_W,
    pond=dict(center=T(*pc), axisU=T(*uv_to_world(POND[2], 0)), axisV=T(*uv_to_world(0, POND[3]))),
    house=TU(*HOUSE_UV), start=TU(*SLOTS[0][:2]),
    trees=[dict(pos=TU(t['u'], t['v']), h=round(t['h'], 2), r=round(t['r'], 2), kind=t['kind']) for t in TREES],
    bushes=bushes, rocks=rocks, flowers=flower_spots, props=props, pebbles=pebbles, frogs=frogs, tufts=tufts,
)
path = sys.argv[1] if len(sys.argv) > 1 else 'village.json'
json.dump(out, open(path, 'w'), separators=(',', ':'))
print('village', len(SLOTS), 'plots', len(PATHS), 'paths', len(BRIDGES), 'bridges', len(TREES), 'trees', len(bushes), 'bushes', len(rocks), 'rocks',
      len(flower_spots), 'flower spots', len(props), 'props', len(pebbles), 'pebbles', len(tufts), 'tufts', round(os.path.getsize(path) / 1024), 'KB')
