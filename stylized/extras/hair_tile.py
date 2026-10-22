"""A seamless tile of real Silkie fluff for the browser (silkie_hair.jpg): Blender particle hair like the 2D game's Silkie
(soft, curled, clumped strands lying along one direction), rendered straight down in Cycles. The tile repeats without seams:
nine identical copies of the hairy patch are laid in a 3x3 grid and only the middle one is framed, so strands that cross
its edges come in from the neighbours. White hair over a dark undercoat; the browser tints it to each Silkie colour.
The strands flow towards the top of the image (the browser lays that direction down and back along the bird).
Usage: python hair_tile.py [out.jpg] [size] [samples] [kind]      kind: silkie (default) or down (chicks)"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

args = [a for a in sys.argv[1:]]
OUTF = args[0] if args else os.path.join(OUT, 'silkie_hair.jpg')
SIZE = int(args[1]) if len(args) > 1 else 1024
SAMPLES = int(args[2]) if len(args) > 2 else 48
KIND = args[3] if len(args) > 3 else 'silkie'
T = 0.07 if KIND == 'silkie' else 0.035          # the tile's size in metres (the browser maps it at the same size)


def hair_mat():
    m = bpy.data.materials.new('fluff'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes; L = nt.links.new
    out = N.new('ShaderNodeOutputMaterial'); h = N.new('ShaderNodeBsdfHairPrincipled'); h.parametrization = 'COLOR'
    h.inputs['Roughness'].default_value = 0.42; h.inputs['Radial Roughness'].default_value = 0.75; h.inputs['Coat'].default_value = 0.1
    info = N.new('ShaderNodeHairInfo'); mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = (0.55, 0.55, 0.55, 1); mix.inputs['B'].default_value = (0.95, 0.95, 0.95, 1)      # darker roots, bright tips
    L(info.outputs['Intercept'], mix.inputs['Factor']); L(mix.outputs['Result'], h.inputs['Color'])
    L(h.outputs[0], out.inputs['Surface'])
    return m


def patch(loc, hm, under):
    bpy.ops.mesh.primitive_plane_add(size=T, location=loc)
    o = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=8); bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(under); o.data.materials.append(hm)
    mod = o.modifiers.new('hair', 'PARTICLE_SYSTEM'); ps = mod.particle_system; s = ps.settings
    ps.seed = 7
    silk = KIND == 'silkie'
    s.type = 'HAIR'; s.count = 900 if silk else 1400; s.use_advanced_hair = True
    L = 0.05 if silk else 0.016
    s.normal_factor = L * 0.35; s.object_align_factor = (0, L * 0.9, 0); s.factor_random = L * 0.25     # lying along +y, lifted a little
    s.hair_length = L
    s.material = 2
    s.child_type = 'INTERPOLATED'; s.child_percent = 10; s.rendered_child_count = 14 if silk else 10
    s.child_length = 1.0; s.child_length_threshold = 0.35; s.child_radius = 0.15
    s.clump_factor = -0.1 if silk else 0.2; s.roughness_1 = 0.004 if silk else 0.002; s.roughness_1_size = 0.6
    s.roughness_endpoint = 0.004 if silk else 0.001; s.roughness_2 = 0.002
    s.kink = 'CURL'; s.kink_amplitude = 0.004 if silk else 0.0015; s.kink_frequency = 2.0
    s.root_radius = 1.0; s.tip_radius = 0.15; s.radius_scale = 0.0006 if silk else 0.0005
    s.render_step = 4
    return o


scn = reset()
hm = hair_mat()
under = mat('undercoat', '#3a3a3a', rough=0.9)
for i in (-1, 0, 1):
    for j in (-1, 0, 1):
        patch((i * T, j * T, 0), hm, under)
# soft light from above and a little behind the flow, as on the bird in the game
sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(12)
so = bpy.data.objects.new('sun', sun); scn.collection.objects.link(so); so.rotation_euler = (math.radians(30), 0, math.radians(15))
w = scn.world or bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.62, 0.65, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = T
co = bpy.data.objects.new('cam', cam); scn.collection.objects.link(co); co.location = (0, 0, 0.5); scn.camera = co
scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
scn.render.resolution_x = scn.render.resolution_y = SIZE
scn.view_settings.view_transform = 'Standard'; scn.view_settings.exposure = 0.0
scn.render.image_settings.file_format = 'PNG'
tmp = os.path.join(OUT, 'hair_tile_raw.png'); scn.render.filepath = tmp
bpy.ops.render.render(write_still=True)
# grey, with its average lifted to mid-grey so it tints colours without darkening them on average
from PIL import Image, ImageOps
im = Image.open(tmp).convert('L')
import numpy as np
a = np.asarray(im).astype(np.float32)
a = np.clip((a - a.mean()) * 1.0 + 150, 0, 255).astype(np.uint8)
Image.fromarray(a).save(OUTF, quality=88)
print('WROTE', OUTF, 'mean', round(float(a.mean()), 1))
