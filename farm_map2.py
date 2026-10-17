"""The big farm (40 plots: two lanes, 4 across, 10 rows) as one map, plus every tree as its own sprite so trees can sway in the game.
Trees are hidden from the camera in the ground render but still cast their shadows on it.
Usage: python farm_map2.py -- OUTDIR [SCALE] [notrees]"""
import sys, os, math, random, time, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector
from ffbird import reset, principled
scn = reset()
import ffland
from ffland import tree, bush, flowers, rock, pond, build, pen_fence, farmhouse, egg_stall, rot2
from coops3 import pasture_shelter
import ffcam
from ffcam import uv_to_world

args = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = args[0]; os.makedirs(OUTDIR, exist_ok=True)
SC = float(args[1]) if len(args) > 1 else 1.0
NOTREES = 'notrees' in args
GROUND_ONLY = 'groundonly' in args
FV = os.environ.get('STYLE') == 'fv'            # the brighter, busier FarmVille-like look
REGION = os.environ.get('REGION')               # 'x0,x1,y0,y1' as fractions: render just part of the map (look tests)
if FV:
    _orig_leaf = ffland.leaf_mat
    def bright_leaf(seed):
        m = _orig_leaf(seed); nt = m.node_tree
        for n in nt.nodes:
            if n.type == 'VALTORGB':
                for e in n.color_ramp.elements: e.color = tuple(min(1, c * 1.45) for c in e.color[:3]) + (1,)
            if n.type == 'MIX' and n.blend_type == 'MULTIPLY': n.inputs['A'].default_value = (0.45, 0.65, 0.25, 1)
        return m
    ffland.leaf_mat = bright_leaf          # reuse tree sprites from an earlier run; only redo the ground
W_PX, H_PX = 2080, 3900
random.seed(7)

# ------------------------------------------------------------------ layout (u across the screen, v up the screen)
LANES = (-5.55, 5.55)
ROWS = [41.0 - 5.1 * i for i in range(10)]
PEN_W, PEN_D = 3.6, 3.0                        # pen size in its own frame (5 birds); the coop sits at the back
HALF = (PEN_W + PEN_D) / 2 * 0.7071            # a pen is a diamond on screen: |du| + |dv| < HALF
def lane_u(lane, v): return lane + 0.6 * math.sin(v * 0.16 + 0.7)     # both lanes curve together, so the coops follow them


SLOTS = []
for i, v in enumerate(ROWS):                    # plot order: the two nearest the middle first, then the outer ones
    a, b = lane_u(LANES[0], v), lane_u(LANES[1], v)
    out = 2.9 + (0.3 if i % 2 else 0)           # outer coops step in and out a little, row by row
    SLOTS += [(a + 2.9, v, 0), (b - 2.9, v, 90), (a - out, v, 90), (b + out, v, 0)]
HOUSE_UV, STALL_UV = (-2.6, 48.6), (3.4, 48.0)
TOP_V, BOT_V = 45.5, -9.6                       # cross paths
POND = (-5.6, -14.2, 3.2, 1.8)                 # u, v, radius across, radius up
PASTURE_UV, PASTURE_WD, PASTURE_DEG = (5.6, -14.6), (6.0, 4.6), 180
MAP_TARGET = uv_to_world(0, 16.9)


def wpos(uv): return uv_to_world(*uv)
def world_to_uv(x, y): return ((x + y) * ffcam.R2, (y - x) * ffcam.R2)


def gate_uv(u, v, deg, d=PEN_D / 2):
    cx, cy = uv_to_world(u, v); gx, gy = rot2(0, -d, deg); return world_to_uv(cx + gx, cy + gy)


def lane_path(lane): return [uv_to_world(lane_u(lane, v), v) for v in [BOT_V + i * 0.8 for i in range(int((TOP_V - BOT_V) / 0.8) + 2)]]


PATHS = [lane_path(l) for l in LANES]
PATHS.append([uv_to_world(u, TOP_V + 0.25 * math.sin(u * 0.4)) for u in [x * 0.8 for x in range(-8, 9)]])
PATHS.append([uv_to_world(u, BOT_V + 0.25 * math.sin(u * 0.5)) for u in [x * 0.8 for x in range(-15, 9)]])
# a stream runs in from the left and feeds the pond; the bottom path crosses it on a little bridge
STREAM = [(-14.5, -7.2), (-13.0, -7.9), (-11.8, -8.8), (-10.9, -9.7), (-10.2, -10.6), (-9.4, -11.6), (-8.7, -12.6), (-8.0, -13.4)]
STREAM_W = 0.42                                 # half width in metres
BRIDGE_UV = (-10.95, BOT_V + 0.25 * math.sin(-10.95 * 0.5))
for (u, v, deg) in SLOTS:
    gu, gv = gate_uv(u, v, deg)
    lane = LANES[0] if u < 0 else LANES[1]
    PATHS.append([uv_to_world(gu, gv), uv_to_world((gu + lane_u(lane, gv)) / 2, gv - 0.35), uv_to_world(lane_u(lane, gv - 0.7), gv - 0.7)])
hu, hv = HOUSE_UV
PATHS.append([uv_to_world(hu - 0.5, TOP_V), uv_to_world(hu + 0.3, hv - 1.4)])
PATHS.append([uv_to_world(STALL_UV[0] - 0.3, TOP_V), uv_to_world(STALL_UV[0] - 0.4, STALL_UV[1] - 1.2)])
pgu, pgv = gate_uv(*PASTURE_UV, PASTURE_DEG, PASTURE_WD[1] / 2)
PATHS.append([uv_to_world(lane_u(LANES[1], BOT_V), BOT_V), uv_to_world(pgu, pgv)])
PATHS.append([uv_to_world(LANES[0], BOT_V), uv_to_world(POND[0] + 0.6, POND[1] + POND[3] + 0.2)])


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


SEGS = [(p[i], p[i + 1]) for p in PATHS for i in range(len(p) - 1)]
SEG_BOX = [(min(a[0], b[0]) - 0.8, max(a[0], b[0]) + 0.8, min(a[1], b[1]) - 0.8, max(a[1], b[1]) + 0.8) for a, b in SEGS]


def path_dist(x, y):
    d = 9.0
    for (a, b), (x0, x1, y0, y1) in zip(SEGS, SEG_BOX):
        if x0 <= x <= x1 and y0 <= y <= y1:
            d = min(d, seg_dist((x, y), a, b))
    return d


def smooth(e0, e1, x):
    t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)


def vnoise(x, y):
    return (math.sin(x * 1.7 + math.sin(y * 0.9)) + math.sin(y * 1.3 + math.sin(x * 1.1) * 1.5) + math.sin((x + y) * 0.7)) / 3


def height(x, y):
    u, v = world_to_uv(x, y)
    e = max(abs(u) - 12.0, v - 52.5, -20.5 - v, 0)
    return 0.6 * smooth(0, 4, e) + 0.03 * vnoise(x * 2, y * 2)


ffland.GROUND['fn'] = height


def pen_l1(u, v, su, sv): return abs(u - su) + abs(v - sv)


def in_pen(u, v, margin=0.0):
    for (su, sv, deg) in SLOTS:
        if pen_l1(u, v, su, sv) < HALF + 0.1 + margin: return True
    return pen_l1(u, v, *PASTURE_UV) < 3.95 + margin


def pond_r(u, v): return math.hypot((u - POND[0]) / POND[2], (v - POND[1]) / POND[3])


FIELDS = [(8.7, 50.8, 2.45, 1.45), (-8.9, 51.3, 2.15, 1.15), (-0.2, -14.8, 1.45, 1.75)]     # u, v, half widths (fields are square to u/v)


def busy(u, v):
    if any(abs(u - fu) < hw and abs(v - fv) < hh for fu, fv, hw, hh in FIELDS): return True
    return stream_dist(u, v) < STREAM_W + 0.45 or math.hypot(u - BRIDGE_UV[0], v - BRIDGE_UV[1]) < 1.3


def stream_dist(u, v):
    d = 9.0
    for (a, b) in zip(STREAM, STREAM[1:]):
        if min(a[0], b[0]) - 1 <= u <= max(a[0], b[0]) + 1 and min(a[1], b[1]) - 1 <= v <= max(a[1], b[1]) + 1:
            d = min(d, seg_dist((u, v), a, b))
    return d


# ------------------------------------------------------------------ terrain with painted paths
def terrain():
    k = max(SC, 0.5)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=int(185 * k), y_subdivisions=int(525 * k), size=1, location=(*uv_to_world(0, 15.0), 0), rotation=(0, 0, math.radians(45)))
    g = bpy.context.object; g.scale = (30, 82, 1)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = g.data
    dirt = me.color_attributes.new(name='dirt', type='FLOAT_COLOR', domain='POINT')
    vg = g.vertex_groups.new(name='grass')
    for vtx in me.vertices:
        x, y = vtx.co.x, vtx.co.y
        u, v = world_to_uv(x, y)
        vtx.co.z = height(x, y)
        w = 0.0
        if abs(u) < 13 and -21 < v < 53:
            d = path_dist(x, y)
            if d < 1.0: w = 1 - smooth(0.32, 0.6 + 0.08 * vnoise(x * 3, y * 3), d)
        if abs(u - hu) < 2.3 and -2.5 < v - hv < 0.2:
            w = max(w, 0.55 * smooth(0, 0.6, min(2.3 - abs(u - hu), 0.2 - (v - hv), v - hv + 2.5)))
        pr = pond_r(u, v)
        if pr < 1.0: vtx.co.z -= 0.12 * (1 - pr * pr) + 0.01
        w = max(w, 0.85 * (1 - smooth(1.0, 1.22, pr)))
        sd = stream_dist(u, v)
        if sd < STREAM_W + 0.1: vtx.co.z -= 0.1 * (1 - (sd / (STREAM_W + 0.1)) ** 2)
        w = max(w, 0.8 * (1 - smooth(STREAM_W, STREAM_W + 0.3, sd)))
        if sd < STREAM_W + 0.05: pr = 0       # no grass in the water
        dirt.data[vtx.index].color = (w, w, w, 1)
        inside = abs(u) < 14.5 and -22 < v < 56
        vg.add([vtx.index], max(0.0, (1 - w)) if (inside and pr > 1.04) else 0.0, 'REPLACE')
    me.update()
    for p in me.polygons: p.use_smooth = True
    m = bpy.data.materials.new('ground'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; Lk = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord'); at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'dirt'
    big = nt.nodes.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.35; big.inputs['Detail'].default_value = 4
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 9; fine.inputs['Detail'].default_value = 10
    for nd in (big, fine): Lk(tc.outputs['Object'], nd.inputs['Vector'])
    gr = nt.nodes.new('ShaderNodeValToRGB'); gr.color_ramp.elements[0].color = (0.05, 0.11, 0.02, 1); gr.color_ramp.elements[1].color = (0.16, 0.26, 0.05, 1)
    if FV:   # sunny patches of lighter, yellower grass among richer green
        gr.color_ramp.elements[0].color = (0.07, 0.17, 0.025, 1); gr.color_ramp.elements[1].color = (0.3, 0.42, 0.085, 1)
        e = gr.color_ramp.elements.new(0.55); e.color = (0.15, 0.3, 0.05, 1)
    Lk(big.outputs['Fac'], gr.inputs['Fac'])
    er = nt.nodes.new('ShaderNodeValToRGB'); er.color_ramp.elements[0].color = (0.13, 0.08, 0.04, 1); er.color_ramp.elements[1].color = (0.36, 0.25, 0.14, 1)
    if FV: er.color_ramp.elements[0].color = (0.3, 0.2, 0.11, 1); er.color_ramp.elements[1].color = (0.58, 0.44, 0.27, 1)
    Lk(fine.outputs['Fac'], er.inputs['Fac'])
    mixf = nt.nodes.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'
    Lk(fine.outputs['Fac'], mixf.inputs[0]); mixf.inputs[1].default_value = 0.5; Lk(at.outputs['Fac'], mixf.inputs[2])
    rmp = nt.nodes.new('ShaderNodeMapRange'); rmp.inputs['From Min'].default_value = 0.55; rmp.inputs['From Max'].default_value = 0.85
    Lk(mixf.outputs[0], rmp.inputs['Value'])
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'
    Lk(rmp.outputs['Result'], mx.inputs['Factor']); Lk(gr.outputs['Color'], mx.inputs['A']); Lk(er.outputs['Color'], mx.inputs['B'])
    Lk(mx.outputs['Result'], b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35
    Lk(fine.outputs['Fac'], bp.inputs['Height']); Lk(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.95
    me.materials.append(m)
    gm = bpy.data.materials.new('grass'); gm.use_nodes = True; gb = gm.node_tree.nodes['Principled BSDF']
    gi = gm.node_tree.nodes.new('ShaderNodeHairInfo'); rg = gm.node_tree.nodes.new('ShaderNodeValToRGB')
    rg.color_ramp.elements[0].color = (0.03, 0.07, 0.012, 1); rg.color_ramp.elements[1].color = (0.24, 0.36, 0.06, 1)
    if FV: rg.color_ramp.elements[0].color = (0.07, 0.16, 0.025, 1); rg.color_ramp.elements[1].color = (0.33, 0.5, 0.1, 1)
    gm.node_tree.links.new(gi.outputs['Intercept'], rg.inputs['Fac']); gm.node_tree.links.new(rg.outputs['Color'], gb.inputs['Base Color'])
    gb.inputs['Roughness'].default_value = 0.55
    me.materials.append(gm)
    mod = g.modifiers.new('grass', 'PARTICLE_SYSTEM'); ps = mod.particle_system; s = ps.settings
    s.type = 'HAIR'; s.count = int(180000 * SC); s.hair_length = 0.08; s.use_advanced_hair = True
    s.normal_factor = 0.085 * 0.33; s.factor_random = 0.03; s.material = 2
    s.roughness_2 = 0.03; s.roughness_endpoint = 0.025
    s.root_radius = 0.7; s.tip_radius = 0.0; s.radius_scale = 0.01; s.render_step = 2
    if FV: s.normal_factor = 0.07 * 0.33; s.root_radius = 0.95; s.rendered_child_count = 4
    s.child_type = 'INTERPOLATED'; s.rendered_child_count = 3; s.child_radius = 0.25
    ps.vertex_group_density = 'grass'
    return g


t0 = time.time()
ground = terrain(); print('STEP terrain', round(time.time() - t0), flush=True)
pond((*uv_to_world(POND[0], POND[1]), POND[2], POND[3], 45))


def stream_water():
    import bmesh
    bm = bmesh.new(); left, right = [], []
    for i, (u, v) in enumerate(STREAM):
        a = STREAM[max(0, i - 1)]; b = STREAM[min(len(STREAM) - 1, i + 1)]
        du, dv = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dv) or 1; nu, nv = -dv / L, du / L
        wv = STREAM_W * (0.85 + 0.15 * math.sin(i * 1.7))
        for side, lst in ((1, left), (-1, right)):
            x, y = uv_to_world(u + nu * wv * side, v + nv * wv * side); lst.append(bm.verts.new((x, y, -0.05)))
    for i in range(len(STREAM) - 1): bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    me = bpy.data.meshes.new('stream'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('stream', me); bpy.context.collection.objects.link(o)
    w_ = principled('streamwater', (0.012, 0.075, 0.1), 0.03, coat=0.0); w_.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value = 0.3
    o.data.materials.append(w_)
    stone_m = principled('bankstone', (0.4, 0.38, 0.34), 0.85); pts = []
    for (a, b) in zip(STREAM, STREAM[1:]):
        for k in range(7):
            t = random.random(); u, v = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            du, dv = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dv); s_ = random.choice((1, -1)) * (STREAM_W + random.uniform(0.02, 0.12))
            x, y = uv_to_world(u - dv / L * s_, v + du / L * s_); pts.append((x, y, height(x, y) - 0.02))
    from ffland import scatter_spheres
    scatter_spheres('bankstones', (0.42, 0.4, 0.36), pts, 0.07)


stream_water()
build(farmhouse, (*wpos(HOUSE_UV), height(*wpos(HOUSE_UV))), 45)
build(egg_stall, (*wpos(STALL_UV), height(*wpos(STALL_UV))), 45)
build(lambda: pen_fence(*PASTURE_WD, gate=0.9), (*wpos(PASTURE_UV), 0), PASTURE_DEG)
sx, sy = rot2(0.6, 1.6, PASTURE_DEG); px_, py_ = wpos(PASTURE_UV)
build(pasture_shelter, (px_ + sx, py_ + sy, 0), PASTURE_DEG)
fx, fy = rot2(-1.4, -0.6, PASTURE_DEG)
flowers(px_ + fx, py_ + fy, 0.8, 50, [(0.85, 0.82, 0.75), (0.8, 0.6, 0.05), (0.55, 0.25, 0.7)])

# ------------------------------------------------------------------ trees: each one remembered so it can be rendered on its own
TREES = []
def add_tree(u, v, h, r, drop=False):
    before = set(bpy.data.objects)
    x, y = uv_to_world(u, v)
    tree(x, y, h, r)                            # always built, so the random numbers stay the same for the trees after it
    objs = [o for o in bpy.data.objects if o not in before]
    TREES.append({'uv': [u, v], 'x': x, 'y': y, 'z': height(x, y), 'h': h, 'r': r, 'objs': objs, 'drop': drop})

for v in range(-20, 54, 4):
    for side in (-1, 1):
        add_tree(side * (12.75 + random.uniform(-0.2, 0.45)), v + random.uniform(-1.0, 1.0), random.uniform(3.0, 3.8), random.uniform(1.15, 1.45))
for i in range(0, 9, 2):                        # a tree in the middle strip every other gap between rows
    add_tree(random.uniform(-0.25, 0.25), ROWS[i] - 2.55 + random.uniform(-0.2, 0.2), random.uniform(2.7, 3.2), random.uniform(0.95, 1.1), drop=True)  # they hid the coops: removed
for u in (-4.6, 0.8, 4.6):          # the top corners are fields now
    add_tree(u + random.uniform(-0.3, 0.3), 52.3 + random.uniform(-0.3, 0.3), random.uniform(3.2, 3.9), random.uniform(1.2, 1.45))
for u in (-9.6, -1.2, 1.4, 9.8):
    add_tree(u, -19.4 + random.uniform(-0.4, 0.4), random.uniform(3.0, 3.6), random.uniform(1.1, 1.35))
for t in TREES:
    if t['drop']:
        for o in t['objs']: bpy.data.objects.remove(o, do_unlink=True)
print('STEP trees', len(TREES), flush=True)

placed = 0
while placed < 60:
    u, v = random.uniform(-11.4, 11.4), random.uniform(-19, 51)
    if in_pen(u, v, 0.6) or path_dist(*uv_to_world(u, v)) < 1.0 or pen_l1(u, v, *HOUSE_UV) < 2.8 or pen_l1(u, v, *STALL_UV) < 1.8 \
            or pond_r(u, v) < 1.35 or any(math.hypot(u - t['uv'][0], v - t['uv'][1]) < 1.6 for t in TREES) or busy(u, v):
        continue
    bush(*uv_to_world(u, v), random.uniform(0.3, 0.48)); placed += 1
for k in range(18):
    u, v = random.uniform(-11.4, 11.4), random.uniform(-19, 51)
    if not in_pen(u, v, 0.4) and path_dist(*uv_to_world(u, v)) > 0.9 and pond_r(u, v) > 1.3 and not busy(u, v):
        rock(*uv_to_world(u, v), random.uniform(0.1, 0.2))
fl = 0
while fl < 22:
    u, v = random.uniform(-11.4, 11.4), random.uniform(-19, 51)
    if in_pen(u, v, 0.5) or path_dist(*uv_to_world(u, v)) < 0.9 or pond_r(u, v) < 1.3 or busy(u, v): continue
    flowers(*uv_to_world(u, v), 0.55, 30, random.sample([(0.85, 0.82, 0.75), (0.8, 0.6, 0.05), (0.55, 0.25, 0.7), (0.85, 0.3, 0.4)], 2)); fl += 1

if FV:
    import ffdecor as dc
    from ffland import scatter_spheres
    def put(fn, u, v, deg=0):
        x, y = uv_to_world(u, v); build(fn, (x, y, height(x, y)), deg)
    mid = [dc.hay_stack, dc.barrels, dc.planter, dc.round_bale, dc.flower_pots, dc.log_pile, dc.wheelbarrow, dc.bench, dc.hay_stack]
    for i, fn in enumerate(mid): put(fn, lane_u(0, ROWS[i] - 2.55) - (lane_u(0, 0) - 0) * 0 + random.uniform(-0.2, 0.2), ROWS[i] - 2.55, random.choice([0, 30, 60, 90]))
    for i in range(0, 9, 2):
        for lane in LANES:
            put(dc.lamp_post, lane_u(lane, ROWS[i] - 2.55) + 0.75, ROWS[i] - 2.55, 180)
    for i in range(9):
        for side in (-1, 1):
            u = side * 11.0 + (lane_u(0, ROWS[i] - 2.55) if side < 0 else lane_u(0, ROWS[i] - 2.55)) * 0.5
            if i % 3 == 0: put(dc.mushrooms, u, ROWS[i] - 2.55 + random.uniform(-0.6, 0.6))
            elif i % 3 == 1: flowers(*uv_to_world(u, ROWS[i] - 2.55), 0.45, 26, random.sample([(0.85, 0.82, 0.75), (0.9, 0.7, 0.1), (0.6, 0.3, 0.75), (0.9, 0.35, 0.45)], 2))
            else: put(dc.round_bale, u, ROWS[i] - 2.55, random.choice([0, 45, 90]))
    # the farmhouse garden: a picket fence, a vegetable patch with a scarecrow, a well and a bench
    hu_, hv_ = HOUSE_UV
    put(lambda: dc.picket_fence(2.0), hu_ - 2.9, hv_ - 2.0, 45)
    put(lambda: dc.picket_fence(2.0), hu_ + 2.6, hv_ - 2.0, 45)
    put(lambda: dc.veg_patch(2.6, 1.8), -8.2, 48.6, 45)
    put(dc.scarecrow, -8.0, 49.9, 45)
    put(dc.well, 0.9, 50.3, 0)
    put(dc.bench, hu_ + 1.2, hv_ - 2.2, 45)
    put(dc.flower_pots, hu_ - 1.6, hv_ - 1.6)
    put(dc.wheelbarrow, 6.6, 48.6, 20)
    put(dc.hay_stack, 8.6, 47.6, 70)
    # pond dock and pasture bales
    put(lambda: dc.dock(1.8), POND[0] + POND[2] - 0.2, POND[1] - 0.3, 225)
    for (du, dv) in [(-1.8, -1.0), (1.6, 0.9)]: put(dc.round_bale, PASTURE_UV[0] + du, PASTURE_UV[1] + dv, 30)
    # crop fields in the top corners and between the pond and the pasture, a bridge over the stream
    put(lambda: dc.wheat_field(4.4, 2.4), 8.7, 50.8, 45)
    put(lambda: dc.sunflowers(3.8, 1.8), -8.9, 51.3, 45)
    put(lambda: dc.veg_patch(2.4, 3.0), -0.2, -14.8, 45)
    put(lambda: dc.bridge(1.9, 0.8), BRIDGE_UV[0], BRIDGE_UV[1], 45)
    put(dc.log_pile, -12.2, -10.4, 20)
    # pebbles along the edges of every path
    pts = []
    for k in range(45000):
        u, v = random.uniform(-11.5, 11.5), random.uniform(-19, 50)
        x, y = uv_to_world(u, v); d = path_dist(x, y)
        if .5 < d < .64: pts.append((x, y, height(x, y) + 0.01))
    for cols in [(0.5, 0.48, 0.44), (0.62, 0.56, 0.47), (0.36, 0.34, 0.31)]:
        scatter_spheres('pebbles', cols, pts[len(pts) * [(0.5, 0.48, 0.44), (0.62, 0.56, 0.47), (0.36, 0.34, 0.31)].index(cols) // 3:(len(pts) * ([(0.5, 0.48, 0.44), (0.62, 0.56, 0.47), (0.36, 0.34, 0.31)].index(cols) + 1)) // 3], 0.035)
    # extra wildflower drifts in open grass
    fl2 = 0
    while fl2 < 30:
        u, v = random.uniform(-11.3, 11.3), random.uniform(-18, 51)
        if in_pen(u, v, 0.5) or path_dist(*uv_to_world(u, v)) < 0.8 or pond_r(u, v) < 1.3 or pen_l1(u, v, *HOUSE_UV) < 2.8 or busy(u, v): continue
        flowers(*uv_to_world(u, v), 0.5, 34, random.sample([(0.95, 0.9, 0.85), (0.95, 0.75, 0.1), (0.65, 0.3, 0.85), (0.95, 0.35, 0.5), (0.4, 0.55, 0.95)], 2)); fl2 += 1
    print('STEP decor', len(pts), flush=True)

if os.environ.get('TESTCOOPS'):          # look tests only: show real coops on the first plots
    from ffscene import red_barn, pagoda, props
    from coops3 import thatched_cottage, stone_cottage, timber_lodge
    for (u, v, deg), fn in zip(SLOTS[:6], [red_barn, pagoda, thatched_cottage, stone_cottage, timber_lodge, red_barn]):
        cx, cy = uv_to_world(u, v); ox, oy = rot2(0.15, 0.35, deg)
        build(lambda fn=fn: (fn(), props()), (cx + ox, cy + oy, 0), deg)
        build(lambda: pen_fence(PEN_W, PEN_D), (cx, cy, 0), deg)
ffcam.setup(scn, (*MAP_TARGET, 0), W_PX, H_PX, samples=28)
if REGION:
    x0, x1, y0, y1 = map(float, REGION.split(','))
    scn.render.use_border = True; scn.render.use_crop_to_border = True
    scn.render.border_min_x, scn.render.border_max_x = x0, x1
    scn.render.border_min_y, scn.render.border_max_y = 1 - y1, 1 - y0
scn.render.resolution_percentage = int(100 * SC)
cam = scn.camera

# ------------------------------------------------------------------ geometry for the game
P = lambda p: [round(c, 2) for c in ffcam.project(p, (*MAP_TARGET, 0), W_PX, H_PX)]


def frame(u, v, deg):
    cx, cy = uv_to_world(u, v); c = P((cx, cy, 0))
    ax = rot2(1, 0, deg); ay = rot2(0, 1, deg)
    ex = P((cx + ax[0], cy + ax[1], 0)); ey = P((cx + ay[0], cy + ay[1], 0))
    return {'c': c, 'ex': [round(ex[0] - c[0], 3), round(ex[1] - c[1], 3)], 'ey': [round(ey[0] - c[0], 3), round(ey[1] - c[1], 3)], 'deg': deg}


o0 = P((0, 0, 0)); z1 = P((0, 0, 1))
pc = uv_to_world(POND[0], POND[1])
geom = {
    'size': [W_PX, H_PX], 'ppu': ffcam.PPU, 'ez': [round(z1[0] - o0[0], 3), round(z1[1] - o0[1], 3)],
    'slots': [frame(*s) for s in SLOTS],
    'pasture': dict(frame(*PASTURE_UV, PASTURE_DEG), w=PASTURE_WD[0], d=PASTURE_WD[1]),
    # pond: an ellipse on the ground, given as a frame whose unit circle is the water's edge
    'pond': {'c': P((*pc, -0.03)), 'eu': [round(POND[2] * ffcam.PPU, 2), 0.0], 'ev': [0.0, round(-POND[3] * ffcam.PPU * math.sin(math.radians(ffcam.PITCH)), 2)]},
    'house': P((*wpos(HOUSE_UV), 1.2)), 'stall': P((*wpos(STALL_UV), 0.8)),
    'stream': [P((*uv_to_world(u, v), -0.05)) for (u, v) in STREAM],
    'trees': [],
}
# grass tufts: spots on open grass, away from pens, paths and the pond
tufts = []
while len(tufts) < 200:
    u, v = random.uniform(-12.6, 12.6), random.uniform(-20, 52)
    if in_pen(u, v, 0.35) or path_dist(*uv_to_world(u, v)) < 0.75 or pond_r(u, v) < 1.12 or pen_l1(u, v, *HOUSE_UV) < 2.6 or pen_l1(u, v, *STALL_UV) < 1.6 or busy(u, v) \
            or any(math.hypot(u - t['uv'][0], v - t['uv'][1]) < 0.9 for t in TREES if not t['drop']):
        continue
    tufts.append(P((*uv_to_world(u, v), 0)) + [random.randint(0, 2)])
geom['tufts'] = tufts
# frog spots around the water's edge
frogs = []
for k in range(14):
    a = k / 14 * math.tau + random.uniform(-0.1, 0.1); rr = random.uniform(1.04, 1.18)
    frogs.append(P((*uv_to_world(POND[0] + math.cos(a) * POND[2] * rr, POND[1] + math.sin(a) * POND[3] * rr), 0)))
geom['frogSpots'] = frogs

# ------------------------------------------------------------------ the ground render (trees cast shadows but are not seen)
if not NOTREES:
    for t in TREES:
        if t['drop']: continue
        for o in t['objs']: o.visible_camera = False
scn.render.filepath = os.path.join(OUTDIR, 'farm_map.png')
t1 = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t1, 1), flush=True)

# ------------------------------------------------------------------ each tree on its own, see-through
d, _, _ = ffcam.basis()
if not NOTREES:
    TREE_PX = 440
    scn.render.film_transparent = True; scn.render.resolution_percentage = 100
    scn.render.resolution_x = scn.render.resolution_y = TREE_PX
    cam.data.ortho_scale = TREE_PX / ffcam.PPU
    scn.cycles.samples = 24
    everything = [o for o in bpy.data.objects if o.type in ('MESH', 'CURVE')]
    for o in everything: o.visible_camera = False
    for i, t in enumerate(TREES):
        if t['drop']: continue
        tgt = Vector((t['x'], t['y'], t['z'] + t['h'] * 0.62))
        name = 'tree_%02d.png' % i
        if not GROUND_ONLY:
            for o in t['objs']: o.visible_camera = True
            cam.location = tgt + Vector(d) * 80
            scn.render.filepath = os.path.join(OUTDIR, name)
            bpy.ops.render.render(write_still=True)
            for o in t['objs']: o.visible_camera = False
        base_map = P((t['x'], t['y'], t['z']))
        base_spr = ffcam.project((t['x'], t['y'], t['z']), tuple(tgt), TREE_PX, TREE_PX)
        geom['trees'].append({'file': name, 'base': base_map, 'anchor': [round(base_spr[0], 1), round(base_spr[1], 1)], 'h': t['h']})
        print('TREE', i, flush=True)
json.dump(geom, open(os.path.join(OUTDIR, 'geom2.json'), 'w'), separators=(',', ':'))
print('MAP2_DONE', flush=True)
