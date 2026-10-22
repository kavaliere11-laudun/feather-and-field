"""Farmer sprites for the web game's farm map: the map camera (orthographic, 42 degrees down, 45 round), twice map resolution.
Frames: stand, wave, walk0-5, run0-5, trun0-5 (running with the torch at night), tell0-1 (wagging a finger), worried, feed0-1.
Usage: LOOKS=m,f python fm_sprites.py OUTDIR"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, '/tmp/claude-0/-home-claude/88b51f90-727f-5086-b33f-f5130c8e3dff/scratchpad')
os.environ.setdefault('STYLE', 'fv')
import farmer as FM
from common import *
import hen_char as HC
import ffcam

OUTDIR = sys.argv[-1]; os.makedirs(OUTDIR, exist_ok=True)
KS = 2                                    # sprite pixels per map pixel
SIZE = 2.3                                # metres of picture plane the render covers
PITCH = math.radians(float(os.environ.get('PITCH', 22)))
FM.HAT_TILT = -20


def gait(phase, run=False, torch=False):
    s, c = math.sin(phase), math.cos(phase)
    A = 36 if run else 22                 # how far the legs swing
    d = dict(chest=(0, 15 if run else 4, 0), head=(0, -8 if run else 0, 0), root_z=(0.035 if run else 0.012) * abs(c) - (0.03 if run else 0.0))
    d['hipL'] = (0, -A * s, 0); d['hipR'] = (0, A * s, 0)
    kb = 70 if run else 30
    d['kneeL'] = kb * max(0.0, math.sin(phase + 0.9)) ** 1.5 + (8 if run else 3)
    d['kneeR'] = kb * max(0.0, math.sin(phase + 0.9 + math.pi)) ** 1.5 + (8 if run else 3)
    arm = 38 if run else 24
    d['shL'] = (8, arm * s, 0); d['elL'] = -85 if run else -22
    d['shR'] = (-8, -arm * s, 0); d['elR'] = -85 if run else -22
    d['hand'] = ('fist', 'fist') if run else ('relax', 'relax')
    if torch: d['shR'] = (-8, -70, 0); d['elR'] = -18; d['hand'] = ('fist', 'hold')
    return d


FRAMES = [('stand', 'turn', 'neutral', ()), ('wave', 'wave', 'happy', ())]
FRAMES += [('walk%d' % i, gait(i / 6 * math.tau), 'happy', ()) for i in range(6)]
FRAMES += [('run%d' % i, gait(i / 6 * math.tau, run=True), 'stern', ()) for i in range(6)]
FRAMES += [('trun%d' % i, gait(i / 6 * math.tau, run=True, torch=True), 'panic', ('torch',)) for i in range(6)]
tell = dict(FM.POSES['telloff'])
FRAMES += [('tell0', dict(tell, wrR=(-16, 0, 0)), 'stern', ()), ('tell1', dict(tell, wrR=(16, 0, 0)), 'stern', ())]
FRAMES += [('worried', 'worried', 'worried', ())]
feed = dict(FM.POSES['feed'])
FRAMES += [('feed0', dict(feed, shR=(-35, -10, 0), elR=-55), 'feeding', ('bucket',)), ('feed1', feed, 'feeding', ('bucket', 'grain'))]

meta = {}
for look in os.environ.get('LOOKS', 'm,f').split(','):
    for name, pose, face, props in FRAMES:
        if os.environ.get('ONLY') and name not in os.environ['ONLY'].split(','): continue
        scn = reset(); FM._F.clear(); HC._M.clear()
        root, hd = FM.build(look, pose, face)
        bpy.context.view_layer.update()
        wR = [o for o in root.children_recursive if o.name.startswith('wristR')][0].matrix_world
        wL = [o for o in root.children_recursive if o.name.startswith('wristL')][0].matrix_world
        handR = wR @ Vector((0, 0, -0.06)); handL = wL @ Vector((0, 0, -0.06))
        if 'torch' in props:
            t = FM.torch_prop(handR, Vector((1.0, -0.12, -0.2)))
            for o in t.children:
                if o.name.startswith('tbeam'): o.scale = (0.8, 0.8, 0.6); o.location.z = 0.3
        if 'bucket' in props: FM.bucket_prop(handL)
        if 'grain' in props: FM.grain_arc(handR, Vector((0.6, -0.8, 0.1)))
        bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
        px = int(SIZE * ffcam.PPU * KS)
        tz = 0.72
        ffcam.setup(scn, (0, 0, tz), px, px, samples=int(os.environ.get('SAMP', 40)), transparent=True)
        # a lower camera than the map's (like the birds' sprites), so the face shows under the hat brim
        d = Vector((math.sin(math.radians(45)) * math.cos(PITCH), -math.cos(math.radians(45)) * math.cos(PITCH), math.sin(PITCH)))
        scn.camera.location = Vector((0, 0, tz)) + d * 80
        scn.camera.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        scn.camera.data.ortho_scale = SIZE
        n = 'farmer_%s_%s' % (look, name)
        scn.render.filepath = os.path.join(OUTDIR, n + '.png')
        bpy.ops.render.render(write_still=True)
        bpy.context.view_layer.update()
        cm = scn.camera.matrix_world; right, up = cm.to_3x3().col[0], cm.to_3x3().col[1]
        q = Vector((0, 0, -tz)); k = px / SIZE
        ax, ay = (px / 2 + q.dot(right) * k) / KS, (px / 2 - q.dot(up) * k) / KS
        meta[n] = {'px': px, 'k': KS, 'anchor': [round(ax * KS, 1), round(ay * KS, 1)]}
        print('SPRITE', n, flush=True)
old = json.load(open(os.path.join(OUTDIR, 'farmer.json'))) if os.path.exists(os.path.join(OUTDIR, 'farmer.json')) else {}
old.update(meta); json.dump(old, open(os.path.join(OUTDIR, 'farmer.json'), 'w'))
print('FM_SPRITES_DONE', len(meta))
