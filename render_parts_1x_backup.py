"""Render one strip of a saved map scene, or all its tree sprites, in a fresh process.
Usage: python render_parts.py -- DIR strip I N   |   python render_parts.py -- DIR trees"""
import sys, os, json, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from mathutils import Vector
import ffcam

a = sys.argv[sys.argv.index('--') + 1:]
D = a[0]; meta = json.load(open(os.path.join(D, 'parts.json')))
bpy.ops.wm.open_mainfile(filepath=os.path.join(D, 'scene.blend'))
scn = bpy.context.scene; cam = scn.camera
scn.cycles.device = 'CPU'; scn.render.threads_mode = 'FIXED'; scn.render.threads = 2
scn.cycles.denoising_prefilter = 'FAST'
try: scn.cycles.tile_size = 1024
except Exception: pass
t1 = time.time()
if a[1] == 'strip':
    i, n = int(a[2]), int(a[3]); H = meta['H']; OVL = 32
    top = max(0, round(H * i / n) - OVL); bot = min(H, round(H * (i + 1) / n) + OVL)
    scn.render.use_border = True; scn.render.use_crop_to_border = True
    scn.render.border_min_x, scn.render.border_max_x = 0.0, 1.0
    scn.render.border_min_y, scn.render.border_max_y = 1 - bot / H, 1 - top / H
    name = 'farm_map_part%d.png' % i; scn.render.filepath = os.path.join(D, name)
    bpy.ops.render.render(write_still=True)
    sj = os.path.join(D, 'strips.json'); parts = json.load(open(sj)) if os.path.exists(sj) else []
    parts = [p for p in parts if p[0] != name] + [[name, top, bot]]; parts.sort(key=lambda p: p[1])
    json.dump(parts, open(sj, 'w')); print('STRIP', i, round(time.time() - t1), flush=True)
else:
    TREE_PX = 440
    d, _, _ = ffcam.basis()
    scn.render.use_border = False; scn.render.use_crop_to_border = False
    scn.render.film_transparent = True; scn.render.resolution_percentage = 100
    scn.render.resolution_x = scn.render.resolution_y = TREE_PX
    cam.data.ortho_scale = TREE_PX / ffcam.PPU
    scn.cycles.samples = 24
    for o in bpy.data.objects:
        if o.type in ('MESH', 'CURVE'): o.visible_camera = False
    for t in meta['trees']:
        if os.path.exists(os.path.join(D, t['file'])): continue
        objs = [bpy.data.objects[n] for n in t['objs']]
        for o in objs: o.visible_camera = True
        cam.location = Vector(t['tgt']) + Vector(d) * 80
        scn.render.filepath = os.path.join(D, t['file'])
        bpy.ops.render.render(write_still=True)
        for o in objs: o.visible_camera = False
        print('TREE', t['file'], round(time.time() - t1), flush=True)
print('PART_DONE', flush=True)
