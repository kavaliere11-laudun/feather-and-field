"""Render one plot overlay on a see-through background: a coop pen, an empty staked plot, or a plot for sale.
Usage: python overlay.py -- OUT.png KIND DEG       KIND: rir orp leg sil bra empty sale"""
import sys, math, random, time
sys.path.insert(0, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
import bpy
from ffbird import reset, principled
scn = reset()          # clear the scene first: the landscape module creates materials when it loads
from ffscene import red_barn, pagoda, props, box, wood
from ffland import build, pen_fence, build_plot, bush, flowers, rock, blob, leaf_mat
from coops3 import thatched_cottage, stone_cottage, timber_lodge
import ffcam

args = sys.argv[sys.argv.index('--') + 1:]
OUT, KIND, DEG = args[0], args[1], float(args[2])
SIZE = 600
random.seed(11)
PW, PD = 3.6, 3.0


def earth_patch(W, D, strength=1.0):
    """Trodden earth inside the pen, fading into the grass of the map at its edges."""
    m = bpy.data.materials.new('earth'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']; Lk = nt.links.new; N = nt.nodes
    tc = N.new('ShaderNodeTexCoord'); sx = N.new('ShaderNodeSeparateXYZ'); Lk(tc.outputs['Object'], sx.inputs[0])
    fine = N.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 9; fine.inputs['Detail'].default_value = 10
    Lk(tc.outputs['Object'], fine.inputs['Vector'])
    er = N.new('ShaderNodeValToRGB'); er.color_ramp.elements[0].color = (0.13, 0.08, 0.04, 1); er.color_ramp.elements[1].color = (0.36, 0.25, 0.14, 1)
    Lk(fine.outputs['Fac'], er.inputs['Fac']); Lk(er.outputs['Color'], b.inputs['Base Color'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35
    Lk(fine.outputs['Fac'], bp.inputs['Height']); Lk(bp.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Roughness'].default_value = 0.95
    # alpha: distance to the edge of the rectangle, roughened by noise
    def edge(axis, half):
        ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; Lk(sx.outputs[axis], ab.inputs[0])
        sb = N.new('ShaderNodeMath'); sb.operation = 'SUBTRACT'; sb.inputs[0].default_value = half; Lk(ab.outputs[0], sb.inputs[1])
        return sb
    ex, ey = edge('X', W / 2), edge('Y', D / 2)
    mn = N.new('ShaderNodeMath'); mn.operation = 'MINIMUM'; Lk(ex.outputs[0], mn.inputs[0]); Lk(ey.outputs[0], mn.inputs[1])
    big = N.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 2.5; Lk(tc.outputs['Object'], big.inputs['Vector'])
    ad = N.new('ShaderNodeMath'); ad.operation = 'MULTIPLY_ADD'; Lk(big.outputs['Fac'], ad.inputs[0]); ad.inputs[1].default_value = 0.35; Lk(mn.outputs[0], ad.inputs[2])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.18; mr.inputs['From Max'].default_value = 0.5
    mr.inputs['To Max'].default_value = strength; Lk(ad.outputs[0], mr.inputs['Value'])
    Lk(mr.outputs['Result'], b.inputs['Alpha'])
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.003)); o = bpy.context.object
    o.scale = (W, D, 1); bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m); return o


def blank_sign(x, y):
    post = wood('signpost', (0.22, 0.13, 0.065))
    board = wood('signboard', (0.5, 0.34, 0.17), scale=(1, 1, 20))
    box('signpost', (x, y, 0.38), (0.06, 0.06, 0.76), post)
    box('sign', (x, y - 0.035, 0.66), (0.62, 0.04, 0.32), board, bevel=0.015)


def overgrown():
    """A plot not yet bought: brambles, long grass and wildflowers behind a sign."""
    bramble = leaf_mat(3.3)
    for k in range(9):
        x, y = random.uniform(-1.4, 1.4), random.uniform(-1.1, 1.1)
        bush(x, y, random.uniform(0.28, 0.45))
    berry = principled('berry', (0.15, 0.01, 0.05), 0.3, coat=0.5)
    for k in range(40):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.025, location=(random.uniform(-1.4, 1.4), random.uniform(-1.1, 1.1), random.uniform(0.15, 0.5)))
        bpy.context.object.data.materials.append(berry)
    flowers(0.2, -0.3, 0.8, 30, [(0.85, 0.82, 0.75), (0.8, 0.6, 0.05)])
    rock(1.1, -0.9, 0.16)
    blank_sign(-0.9, -1.3)


def coop_pen_deluxe(kind):
    """The deluxe upgrade (deluxe.py): the same coop, with a picket fence, rose arch, flowers, path, bunting and weathervane."""
    import deluxe
    coop = {'rir': red_barn, 'sil': pagoda, 'orp': thatched_cottage, 'leg': stone_cottage, 'bra': timber_lodge}[kind]
    loc = (0.2, 0.35, 0) if kind == 'rir' else (0.1, 0.35, 0)
    before = set(bpy.data.objects)
    build(coop, loc, 0)
    objs = [o for o in bpy.data.objects if o not in before]
    build(props, loc, 0)
    if kind == 'rir':
        straw = wood('straw', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)
        build(lambda: [box('bale', (x, y, 0.13), (0.3, 0.5, 0.26), straw, bevel=0.03) for (x, y) in [(-1.45, 0.2), (-1.45, -0.15)]], loc, 0)
    g = {}
    build(lambda: g.update(gate=deluxe.picket_fence(PW, PD)), (0, 0, 0), 0)
    build(lambda: deluxe.extras(objs, PW, PD, *g['gate']), (0, 0, 0), 0)
    earth_patch(PW - 0.1, PD - 0.1)


def coop_pen(kind):
    if kind.endswith('_dx'): return coop_pen_deluxe(kind[:-3])
    if kind == 'rir':
        def fn():
            red_barn(); props()
            straw = wood('straw', (0.62, 0.45, 0.15), scale=(30, 3, 3), rough=0.9, dark=0.65)
            for (x, y) in [(-1.45, 0.2), (-1.45, -0.15)]:
                box('bale', (x, y, 0.13), (0.3, 0.5, 0.26), straw, bevel=0.03)
        build(fn, (0.2, 0.35, 0), 0)
    elif kind == 'sil':
        build(lambda: (pagoda(), props()), (0.1, 0.35, 0), 0)
    elif kind == 'orp':
        build(lambda: (thatched_cottage(), props()), (0.1, 0.35, 0), 0)
    elif kind == 'leg':
        build(lambda: (stone_cottage(), props()), (0.1, 0.35, 0), 0)
    elif kind == 'bra':
        build(lambda: (timber_lodge(), props()), (0.1, 0.35, 0), 0)
    build(lambda: pen_fence(PW, PD), (0, 0, 0), 0)
    earth_patch(PW - 0.1, PD - 0.1)


before = set(bpy.data.objects)
if KIND in ('fence', 'fence_dx'):      # just the two fence sides nearest the camera, drawn over the birds in the game
    if KIND == 'fence_dx':
        import deluxe
        def fx_():
            g0, g1 = deluxe.picket_fence(PW, PD); deluxe.rose_arch(g0, g1, -PD / 2); deluxe.front_bunting(PW, PD, g0, g1)
        build(fx_, (0, 0, 0), 0)
    else: build(lambda: pen_fence(PW, PD), (0, 0, 0), 0)
    fx = PW / 2 if DEG == 0 else -PW / 2
    # the fence may be built as one mesh: split it into its loose pieces (posts, rails) and keep the pieces on the two near sides
    news = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in news:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    kept = 0
    for o in [o for o in bpy.data.objects if o not in before and o.type == 'MESH']:
        vs = [o.matrix_world @ v.co for v in o.data.vertices]
        if not vs: continue
        cx = sum(v.x for v in vs) / len(vs); cy = sum(v.y for v in vs) / len(vs)
        front = abs(cy + PD / 2) < 0.12 or abs(cx - fx) < 0.12
        if front: kept += 1
        else: bpy.data.objects.remove(o, do_unlink=True)
    print('FENCE_PIECES_KEPT', kept)
elif KIND == 'sale':
    overgrown()
elif KIND == 'empty':
    build(lambda: build_plot(3.0, 2.4), (0, 0, 0), 0)
    earth_patch(3.0, 2.4, strength=0.85)
else:
    coop_pen(KIND)
# turn the whole plot to face the path
pivot = bpy.data.objects.new('pivot', None); bpy.context.collection.objects.link(pivot)
for o in [o for o in bpy.data.objects if o not in before and o is not pivot]:
    if o.parent is None: o.parent = pivot
pivot.rotation_euler = (0, 0, math.radians(DEG))
# invisible ground that still catches shadows
bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
if KIND.startswith('fence'): bpy.data.objects.remove(bpy.context.object, do_unlink=True)     # no ground shadow: the full overlay has it
ffcam.setup(scn, (0, 0, 0.6), SIZE, SIZE, samples=32, transparent=True)
import os
scn.render.resolution_percentage = int(100 * float(os.environ.get('OVSCALE', '1')))   # 2 = twice the map's detail, sharp when zoomed in
scn.render.filepath = OUT
t = time.time(); bpy.ops.render.render(write_still=True); print('RENDER_SECONDS', round(time.time() - t, 1))
