import sys, os, resource, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset
scn = reset()
import ffland
from ffland import tree
import ffcam
N = int(os.environ.get('N', '6'))
for i in range(N):
    tree(i * 3.0 - 9, 0, 3.4, 1.3)
for o in bpy.data.objects:
    for m in o.modifiers:
        if os.environ.get('NOSUB') and m.type == 'SUBSURF': m.show_render = False
        if os.environ.get('NODISP') and m.type == 'DISPLACE': m.show_render = False
o = [o for o in bpy.data.objects if o.name.startswith('Icosphere')][0]
print('MODINFO', [(m.type, getattr(m, 'levels', None), getattr(m, 'render_levels', None)) for m in o.modifiers])
if os.environ.get('PLAIN'):
    pm = bpy.data.materials.new('plain')
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.data.materials.clear(); o.data.materials.append(pm)
if os.environ.get('NOSSS'):
    for m in bpy.data.materials:
        if m.node_tree and 'Principled BSDF' in m.node_tree.nodes: m.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = 0
dg = bpy.context.evaluated_depsgraph_get()
faces = sum(len(o.evaluated_get(dg).data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print('FACES', faces)
ffcam.setup(scn, (0, 0, 0), 400, 300, samples=4)
scn.render.filepath = '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad/r/map/t.png'
bpy.ops.render.render(write_still=True)
print('PEAK', resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)
