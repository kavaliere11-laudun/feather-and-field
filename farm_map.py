"""The whole farm as one tall map for the game: building spots are left as grass, coops are drawn on top as overlays.
Usage: python farm_map.py -- OUT.png JSON_OUT [SCALE]"""
import sys, math, random, time, json
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled
scn = reset()
import ffland
from ffland import tree, bush, flowers, rock, pond, build, pen_fence, farmhouse, egg_stall, rot2
from coops3 import pasture_shelter
import ffcam
from ffcam import uv_to_world

args = sys.argv[sys.argv.index('--') + 1:]
OUT, JSON_OUT = args[0], args[1]
SC = float(args[2]) if len(args) > 2 else 1.0          # 0.5 for a quick preview
W_PX, H_PX = 1120, 2400
random.seed(5)

# ------------------------------------------------------------------ layout in (u across the screen, v up the screen)
SLOTS = [(-3.3, 12.5, 90), (3.3, 12.5, 0), (-3.3, 6.0, 90), (3.3, 6.0, 0),
         (-3.3, -0.5, 90), (3.3, -0.5, 0), (-3.3, -7.0, 90), (3.3, -7.0, 0)]
HOUSE_UV, STALL_UV = (-2.6, 19.6), (2.9, 18.6)
POND_UV = (-3.6, -13.8)
PASTURE_UV, PASTURE_WD = (3.3, -14.0), (4.4, 4.0)
MAP_TARGET = uv_to_world(0, 2.0)


def wpos(uv): return uv_to_world(*uv)


def gate_world(u, v, deg):
    cx, cy = uv_to_world(u, v); gx, gy = rot2(0, -1.75, deg); return (cx + gx, cy + gy)


def world_to_uv(x, y): return ((x + y) * ffcam.R2, (y - x) * ffcam.R2)


def path_u(v): return 0.35 * math.sin(v * 0.28)


main_path = [uv_to_world(path_u(v), v) for v in [x * 1.0 for x in range(-22, 22)]]
PATHS = [main_path]
for (u, v, deg) in SLOTS:
    gx, gy = gate_world(u, v, deg); gu, gv = world_to_uv(gx, gy)
    PATHS.append([(gx, gy), uv_to_world((gu + path_u(gv)) * 0.45, gv - 0.4), uv_to_world(path_u(gv - 0.8), gv - 0.8)])
hu, hv = HOUSE_UV
PATHS.append([uv_to_world(path_u(18.5), 18.5), uv_to_world(-1.2, 18.4), uv_to_world(hu + 0.35, hv - 1.35)])
PATHS.append([uv_to_world(path_u(17.5), 17.5), uv_to_world(STALL_UV[0] - 0.6, STALL_UV[1] - 1.1)])
pgx, pgy = gate_world(PASTURE_UV[0], PASTURE_UV[1], 0)
PATHS.append([(pgx, pgy), uv_to_world(path_u(-15.8), -15.8)])


def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


def smooth(e0, e1, x):
    t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)


def vnoise(x, y):
    return (math.sin(x * 1.7 + math.sin(y * 0.9)) + math.sin(y * 1.3 + math.sin(x * 1.1) * 1.5) + math.sin((x + y) * 0.7)) / 3


def height(x, y):
    u, v = world_to_uv(x, y)
    e = max(abs(u) - 7.5, v - 25.0, -21.5 - v, 0)
    return 0.6 * smooth(0, 4, e) + 0.03 * vnoise(x * 2, y * 2)


ffland.GROUND['fn'] = height


def in_pen(u, v, margin=0.0):
    for (su, sv, deg) in SLOTS:
        if abs(u - su) + abs(v - sv) < 2.4 + margin: return True
    pu, pv = PASTURE_UV
    return abs(u - pu) + abs(v - pv) < 2.9 + margin


# ------------------------------------------------------------------ terrain with painted paths
def terrain():
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=int(330 * max(SC, 0.5)), y_subdivisions=int(330 * max(SC, 0.5)), size=52)
    g = bpy.context.object; me = g.data
    dirt = me.color_attributes.new(name='dirt', type='FLOAT_COLOR', domain='POINT')
    vg = g.vertex_groups.new(name='grass')
    pu, pv = POND_UV
    for vtx in me.vertices:
        x, y = vtx.co.x, vtx.co.y
        u, v = world_to_uv(x, y)
        vtx.co.z = height(x, y)
        w = 0.0
        if abs(u) < 9 and -23 < v < 27:
            for path in PATHS:
                d = min(seg_dist((x, y), path[i], path[i + 1]) for i in range(len(path) - 1))
                w = max(w, 1 - smooth(0.3, 0.56 + 0.08 * vnoise(x * 3, y * 3), d))
        hu_, hv_ = HOUSE_UV
        if abs(u - hu_) < 2.2 and -2.4 < v - hv_ < 0.2:      # trodden yard in front of the house
            w = max(w, 0.55 * smooth(0, 0.6, min(2.2 - abs(u - hu_), 0.2 - (v - hv_), v - hv_ + 2.4)))
        pr = math.hypot((u - pu) / 2.0, (v - pv) / 1.2)
        if pr < 1.0: vtx.co.z -= 0.12 * (1 - pr * pr) + 0.01
        w = max(w, 0.85 * (1 - smooth(1.0, 1.25, pr)))
        dirt.data[vtx.index].color = (w, w, w, 1)
        inside = abs(u) < 8.6 and -22 < v < 26.5
        vg.add([vtx.index], max(0.0, (1 - w)) if (inside and pr > 1.05) else 0.0, 'REPLACE')
    me.update()
    for p in me.polygons: p.use_smooth = True
    m = bpy.data.materials.new('ground'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; Lk = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord'); at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'dirt'
    big = nt.nodes.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.35; big.inputs['Detail'].default_value = 4
    fine = nt.nodes.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 9; fine.inputs['Detail'].default_value = 10
    for n in (big, fine): Lk(tc.outputs['Object'], n.inputs['Vector'])
    gr = nt.nodes.new('ShaderNodeValToRGB'); gr.color_ramp.elements[0].color = (0.05, 0.11, 0.02, 1); gr.color_ramp.elements[1].color = (0.16, 0.26, 0.05, 1)
    Lk(big.outputs['Fac'], gr.inputs['Fac'])
    er = nt.nodes.new('ShaderNodeValToRGB'); er.color_ramp.elements[0].color = (0.13, 0.08, 0.04, 1); er.color_ramp.elements[1].color = (0.36, 0.25, 0.14, 1)
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
    gm.node_tree.links.new(gi.outputs['Intercept'], rg.inputs['Fac']); gm.node_tree.links.new(rg.outputs['Color'], gb.inputs['Base Color'])
    gb.inputs['Roughness'].default_value = 0.55
    me.materials.append(gm)
    mod = g.modifiers.new('grass', 'PARTICLE_SYSTEM'); ps = mod.particle_system; s = ps.settings
    s.type = 'HAIR'; s.count = int(95000 * SC); s.hair_length = 0.08; s.use_advanced_hair = True
    s.normal_factor = 0.085 * 0.33; s.factor_random = 0.03; s.material = 2
    s.roughness_2 = 0.03; s.roughness_endpoint = 0.025
    s.root_radius = 0.7; s.tip_radius = 0.0; s.radius_scale = 0.01; s.render_step = 2
    s.child_type = 'INTERPOLATED'; s.rendered_child_count = 3; s.child_radius = 0.25
    ps.vertex_group_density = 'grass'


print('STEP', 'terrain()', flush=True)
terrain()
print('STEP', 'pond((*uv', flush=True)
pond((*uv_to_world(*POND_UV), 2.0, 1.2, 45))
print('STEP', 'build(farmhouse', flush=True)
build(farmhouse, (*wpos(HOUSE_UV), height(*wpos(HOUSE_UV))), 45)
build(egg_stall, (*wpos(STALL_UV), height(*wpos(STALL_UV))), 45)
print('STEP', '# pasture for retire', flush=True)
# pasture for retired birds: a fenced meadow with a shelter and a trough
build(lambda: pen_fence(*PASTURE_WD, gate=0.8), (*wpos(PASTURE_UV), 0), 0)
build(pasture_shelter, (*uv_to_world(PASTURE_UV[0] + 0.3, PASTURE_UV[1] + 1.1), 0), 0)
px_, py_ = wpos(PASTURE_UV)
flowers(px_ + 0.6, py_ - 0.6, 0.7, 45, [(0.85, 0.82, 0.75), (0.8, 0.6, 0.05), (0.55, 0.25, 0.7)])

print('STEP', '# trees down both', flush=True)
# trees down both sides and behind the house; bushes, rocks and flowers between the spots
for v in range(-22, 27, 4):
    for side in (-1, 1):
        u = side * (6.6 + random.uniform(-0.3, 0.9))
        tree(*uv_to_world(u, v + random.uniform(-1.2, 1.2)), random.uniform(3.0, 3.8), random.uniform(1.15, 1.45))
for (u, v) in [(-5.0, 23.2), (-1.0, 23.8), (3.5, 23.0), (0.8, 25.5)]:
    tree(*uv_to_world(u, v), random.uniform(3.2, 3.9), random.uniform(1.2, 1.45))
print('STEP', 'placed = 0', flush=True)
placed = 0
while placed < 22:
    u, v = random.uniform(-6, 6), random.uniform(-20, 22)
    if in_pen(u, v, 0.6) or abs(u - path_u(v)) < 1.0 or abs(u - HOUSE_UV[0]) + abs(v - HOUSE_UV[1]) < 2.6 or abs(u - STALL_UV[0]) + abs(v - STALL_UV[1]) < 1.6 \
            or math.hypot((u - POND_UV[0]) / 2.4, (v - POND_UV[1]) / 1.6) < 1.0:
        continue
    bush(*uv_to_world(u, v), random.uniform(0.3, 0.48)); placed += 1
for k in range(10):
    u, v = random.uniform(-6, 6), random.uniform(-20, 22)
    if not in_pen(u, v, 0.4) and abs(u - path_u(v)) > 0.9:
        rock(*uv_to_world(u, v), random.uniform(0.1, 0.2))
for (u, v) in [(-5.4, 16.5), (5.2, 9.0), (-5.6, 2.5), (5.4, -4.0), (-5.2, -10.5), (1.2, -18.5), (-1.6, 21.5), (5.6, 15.0)]:
    flowers(*uv_to_world(u, v), 0.55, 30, random.sample([(0.85, 0.82, 0.75), (0.8, 0.6, 0.05), (0.55, 0.25, 0.7), (0.85, 0.3, 0.4)], 2))

print('STEP', 'ffcam.setup(scn', flush=True)
ffcam.setup(scn, (*MAP_TARGET, 0), W_PX, H_PX, samples=28)
scn.render.resolution_percentage = int(100 * SC)
scn.render.filepath = OUT

# ------------------------------------------------------------------ where everything lands on the image, for the game
P = lambda p: [round(c, 1) for c in ffcam.project(p, (*MAP_TARGET, 0), W_PX, H_PX)]
def poly(cu, cv, deg, x0, x1, y0, y1):
    cx, cy = uv_to_world(cu, cv); out = []
    for (lx, ly) in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]:
        rx, ry = rot2(lx, ly, deg); out.append(P((cx + rx, cy + ry, 0)))
    return out
data = {'size': [W_PX, H_PX], 'ppu': ffcam.PPU, 'slots': [], 'pasture': None}
for (u, v, deg) in SLOTS:
    cx, cy = uv_to_world(u, v)
    dx, dy = rot2(-0.45, 0.85, deg)
    sx, sy = rot2(-0.9, -1.3, deg)
    data['slots'].append({'uv': [u, v], 'deg': deg, 'center': P((cx, cy, 0)),
                          'yard': poly(u, v, deg, -1.5, 1.5, -1.3, 0.1),
                          'nest': P((cx + dx, cy + dy, 1.75)), 'sign': P((cx + sx, cy + sy, 0.66))})
data['pasture'] = {'center': P((*wpos(PASTURE_UV), 0)), 'yard': poly(*PASTURE_UV, 0, -2.0, 2.0, -1.8, 0.4)}
data['house'] = P((*wpos(HOUSE_UV), 1.2)); data['stall'] = P((*wpos(STALL_UV), 0.8))
json.dump(data, open(JSON_OUT, 'w'), indent=1)

t = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t, 1))
