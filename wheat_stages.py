"""Render the wheat field by the farmhouse in four growing stages, as patches of the 2x map (same scene, camera and light).
Usage: python wheat_stages.py   (writes r/wheat/wheat_<stage>.png and r/wheat/meta.json)"""
import sys, os, json, math, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
OUT = 'r/wheat'
bpy.ops.wm.open_mainfile(filepath='r/map7/scene.blend')
scn = bpy.context.scene; cam = scn.camera
scn.cycles.device = 'CPU'; scn.render.threads_mode = 'FIXED'; scn.render.threads = 4
W, H = scn.render.resolution_x, scn.render.resolution_y
hair = next(o for o in bpy.data.objects if any(m.type == 'PARTICLE_SYSTEM' and m.name == 'wheat' for m in o.modifiers))
bed = next(c for c in hair.parent.children if c.name.startswith('bed'))
# the patch: the bed's corners and the tops of the stalks, plus a margin of grass all round
pts = []
for ob, ztop in ((bed, 0.0), (hair, 0.62)):
    for c in ob.bound_box:
        w = ob.matrix_world @ Vector(c); pts += [w, w + Vector((0, 0, ztop))]
xs, ys = [], []
for p in pts:
    v = world_to_camera_view(scn, cam, p); xs.append(v.x * W); ys.append((1 - v.y) * H)
M = 26
x0, x1, y0, y1 = math.floor(min(xs)) - M, math.ceil(max(xs)) + M, math.floor(min(ys)) - M, math.ceil(max(ys)) + M
print('REGION', x0, x1, y0, y1, flush=True)
scn.render.use_border = True; scn.render.use_crop_to_border = True
scn.render.border_min_x, scn.render.border_max_x = x0 / W, x1 / W
scn.render.border_min_y, scn.render.border_max_y = 1 - y1 / H, 1 - y0 / H
scn.render.resolution_percentage = 200
mod = next(m for m in hair.modifiers if m.name == 'wheat'); ps = mod.particle_system.settings
mat = bpy.data.materials['wheat']; mix = next(n for n in mat.node_tree.nodes if n.type == 'MIX')
GOLD = (tuple(mix.inputs['A'].default_value), tuple(mix.inputs['B'].default_value)); L0 = ps.hair_length
STAGES = {                                   # name: (show stalks, length, root colour, tip colour)
    'soil':    (False, L0, *GOLD),
    'sprouts': (True, 0.11, (0.10, 0.26, 0.05, 1), (0.42, 0.72, 0.20, 1)),
    'growing': (True, 0.34, (0.08, 0.22, 0.04, 1), (0.38, 0.64, 0.17, 1)),
    'ripe':    (True, L0, *GOLD),
}
# ploughed furrows along the bed, seen while the field is bare or just sprouting
from mathutils import Matrix
soilm = bed.data.materials[0]; ridges = []
for i in range(8):
    yy = -1.05 + i * 0.3
    me = bpy.data.meshes.new('ridge'); ob = bpy.data.objects.new('ridge%d' % i, me); scn.collection.objects.link(ob)
    import bmesh; bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
    me.materials.append(soilm)
    ob.matrix_world = bed.matrix_world @ Matrix.LocRotScale(Vector((0, yy, 0.07)), None, Vector((4.15, 0.15, 0.06)))
    bv = ob.modifiers.new('bv', 'BEVEL'); bv.width = 0.025; bv.segments = 3
    ridges.append(ob)
C0, K0 = ps.count, ps.rendered_child_count
only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(STAGES)
for name in only:
    show, L, a, b = STAGES[name]
    mod.show_render = show; ps.hair_length = L
    for r in ridges: r.hide_render = name not in ('soil', 'sprouts')
    ps.count = int(C0 * .2) if name == 'sprouts' else C0; ps.rendered_child_count = 3 if name == 'sprouts' else K0
    mix.inputs['A'].default_value = a; mix.inputs['B'].default_value = b
    scn.render.filepath = os.path.abspath(os.path.join(OUT, 'wheat_%s.png' % name)); t = time.time()
    bpy.ops.render.render(write_still=True); print('STAGE', name, round(time.time() - t), flush=True)
json.dump({'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0, 'scale': 2}, open(os.path.join(OUT, 'meta.json'), 'w'))
print('WHEAT_DONE', flush=True)
