"""Render the farmer's sprites for the web game, with the same camera and lights as the bird sprites (22 degrees round from
the side, looking down as on the farm), so the farmer sits on the farm like the hens do.
Writes r/farmer/<look>_<frame>.png and r/farmer/meta_<look>.json (foot point and pixels per Blender unit for each frame).
Usage: LOOK=m FRAMES=walk0,walk1 python farmer_sprites.py [samples]"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import farmer as FM
from farmer import *
from bpy_extras.object_utils import world_to_camera_view

R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUTD = os.path.join(R, 'r', 'farmer'); os.makedirs(OUTD, exist_ok=True)
RES, ORTHO, CZ = 512, 2.1, 0.78


def walk_pose(i, n=6, torch=False):
    f = i / n * math.tau; s, c = math.sin(f), math.cos(f)
    q = dict(hipL=(0, -24 * s, 0), hipR=(0, 24 * s, 0), kneeL=8 + 30 * max(0, c), kneeR=8 + 30 * max(0, -c),
             shL=(6, 22 * s, 0), elL=-22, shR=(-6, -22 * s, 0), elR=-22, chest=(0, 5, 0), head=(0, -3, 0),
             root_z=0.016 * (1 - abs(s)) - 0.006, hand=('relax', 'relax'))
    if torch: q.update(shR=(-8, -70, 0), elR=-12, hand=('relax', 'hold'), chest=(0, 8, 0))
    return q


FRAMES = {}
for i in range(6):
    FRAMES['walk%d' % i] = dict(pose=walk_pose(i), face='neutral', yaw=0)
    FRAMES['twalk%d' % i] = dict(pose=walk_pose(i, torch=True), face='worried', yaw=0, torch=True)
FRAMES['idle'] = dict(pose='turn', face='neutral', yaw=-45)
FRAMES['tidle'] = dict(pose=dict(POSES['turn'], shR=(-8, -70, 0), elR=-12, hand=('relax', 'hold')), face='worried', yaw=-45, torch=True)
FRAMES['wave0'] = dict(pose='wave', face='happy', yaw=-45)
FRAMES['wave1'] = dict(pose=dict(POSES['wave'], shR=(-140, -10, 0), elR=-55), face='happy', yaw=-45)
FRAMES['tell0'] = dict(pose='telloff', face='stern', yaw=-45)
FRAMES['tell1'] = dict(pose=dict(POSES['telloff'], wrR=(0, 0, 0), elR=(-108, 0, 18)), face='stern', yaw=-45)
FRAMES['worry0'] = dict(pose='worried', face='worried', yaw=-45)
FRAMES['worry1'] = dict(pose=dict(POSES['worried'], head=(-6, -4, -12)), face=dict(FACE['worried'], look=(0.55, 0.0)), yaw=-45)
FRAMES['feed0'] = dict(pose=dict(POSES['feed'], shR=(-30, 10, 0), elR=-40), face='feeding', yaw=-40, bucket=True)
FRAMES['feed1'] = dict(pose=dict(POSES['feed'], shR=(-45, -20, 0), elR=-30), face='feeding', yaw=-40, bucket=True)
FRAMES['feed2'] = dict(pose='feed', face='feeding', yaw=-40, bucket=True)
# crouching to stroke a hen (the hen is the bird's own sprite, drawn beside the farmer in the game)
PET_FACE = dict(FACE['cuddle'], fx=None)
FRAMES['pet0'] = dict(pose='pet', face=PET_FACE, yaw=-14)
FRAMES['pet1'] = dict(pose=dict(POSES['pet'], shR=(-10, -86, 0), elR=-6, wrR=(0, -4, 0)), face=PET_FACE, yaw=-14)
FRAMES['pet2'] = dict(pose=dict(POSES['pet'], shR=(-10, -70, 0), elR=-24, wrR=(0, 14, 0), head=(0, 0, 0)), face=PET_FACE, yaw=-14)


def stage(scn):
    """The bird sprites' stage (ffbird.stage with FARM=1): ortho camera 22 degrees round, 4 m up over 6 m out."""
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    A = math.radians(22); ch = CZ + 4.0
    bpy.ops.object.camera_add(location=(0.08 + 6 * math.sin(A), -6 * math.cos(A), ch), rotation=(math.radians(90 - math.degrees(math.atan2(ch - CZ, 6))), 0, A))
    cam = bpy.context.object; cam.data.type = 'ORTHO'; cam.data.ortho_scale = ORTHO; scn.camera = cam
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(48), math.radians(18), math.radians(28)))
    sun = bpy.context.object; sun.data.energy = 3.0; sun.data.angle = math.radians(10)
    bpy.ops.object.light_add(type='AREA', location=(-2.5, -3, 2.2))
    fill = bpy.context.object; fill.data.energy = 260; fill.data.size = 3
    fill.rotation_euler = (Vector((0, 0, 0.8)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(-2.5, 2.5, 2.0))
    rim = bpy.context.object; rim.data.energy = 160; rim.data.size = 2
    rim.rotation_euler = (Vector((0, 0, 0.9)) - rim.location).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); scn.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.78, 0.8, 0.8, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.75
    return cam


def torch_held(hand_world, fwd):
    body = mat('fm_torch', '#2f5a3a', rough=0.35, spec=0.5, coat=0.3); metal = mat('fm_torchm', '#c9ccd1', rough=0.25, metal=0.9)
    glow = mat('fm_lens', '#fff4b8', rough=0.2, emission=('#fff1a0', 8.0))
    M = Matrix.Translation(hand_world) @ Vector(fwd).normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    r = empty('torch'); r.matrix_world = M
    cyl('tbody', 0.026, 0.16, (0, 0, 0.0), (0, 0, 0), body, verts=24, bevel=0.006, parent=r)
    cyl('thead', 0.04, 0.06, (0, 0, 0.1), (0, 0, 0), body, verts=28, r2=0.046, bevel=0.008, parent=r)
    cyl('tring', 0.047, 0.012, (0, 0, 0.134), (0, 0, 0), metal, verts=28, bevel=0.003, parent=r)
    cyl('tlens', 0.04, 0.004, (0, 0, 0.14), (0, 0, 0), glow, verts=28, bevel=0.0, parent=r)


if __name__ == '__main__':
    samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 16
    look = os.environ.get('LOOK', 'm')
    names = os.environ.get('FRAMES', ','.join(FRAMES)).split(',')
    mp = os.path.join(OUTD, 'meta_%s.json' % look)
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    for name in names:
        spec = FRAMES[name]
        scn = reset(); FM._F.clear(); HC._M.clear()
        root, hd = build(look, spec['pose'], spec['face'], yaw=math.radians(spec['yaw']))
        bpy.context.view_layer.update()
        wR = [o for o in root.children_recursive if o.name.startswith('wristR')][0].matrix_world
        wL = [o for o in root.children_recursive if o.name.startswith('wristL')][0].matrix_world
        if spec.get('torch'):
            yaw = math.radians(spec['yaw'])
            torch_held(wR @ Vector((0, 0, -0.06)), Vector((math.cos(yaw), math.sin(yaw), -0.15)))
        if spec.get('bucket'): bucket_prop(wL @ Vector((0, 0, -0.06)))
        cam = stage(scn)
        scn.render.engine = 'CYCLES'; scn.cycles.device = 'CPU'; scn.cycles.samples = samples; scn.cycles.use_denoising = True
        scn.cycles.max_bounces = 4; scn.render.film_transparent = True
        scn.render.resolution_x = scn.render.resolution_y = RES; scn.render.resolution_percentage = 100
        scn.view_settings.view_transform = 'Standard'; scn.view_settings.look = 'None'; scn.view_settings.exposure = -0.15
        out = os.path.join(OUTD, '%s_%s.png' % (look, name)); scn.render.filepath = out
        bpy.context.view_layer.update()
        u, v, _ = world_to_camera_view(scn, cam, Vector((0, 0, 0)))
        meta[name] = {'ox': round(u * RES, 2), 'oy': round((1 - v) * RES, 2), 'ppu': round(RES / ORTHO, 3)}
        bpy.ops.render.render(write_still=True)
        print('RENDERED', look, name)
        json.dump(meta, open(mp, 'w'), indent=0)
