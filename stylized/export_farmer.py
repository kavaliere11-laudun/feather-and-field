"""Export the farmer for the browser (farmer.glb + farmer.json): both looks, 'm' (Arthur) and 'f' (Rosie), from the same
Blender model as the 2D game's sprites (character/farmer.py), built standing with every joint at rest (arms and legs
straight down, hands open) so the browser can pose them. Each part hangs rigid on its joint (one bone per joint, as the
frogs), so the farmer is one mesh, one draw. The face is made to move: the upper and lower eyelids are half spheres on their
own bones (turned open or shut in the browser), the iris, pupil and catch-lights on an eye bone (turned to look about), the
brows on brow bones, and every mouth shape the farmer has (smile, grin, talk, shout, worried, frown) on its own bone, shown
one at a time. The torch and the feed pail hang on the hands, hidden until wanted. The checked shirt is drawn per pixel in
the browser from each point's place on its part (_CLOTH), as the Blender material does; the cheeks' blush is a weight
(_BLUSH) so it can deepen. glTF's (x, y, z) = the farmer's (left, up, forward): he faces +z.
Usage: ../bl/bin/python export_farmer.py [out_dir] [looks]   (or [out_dir] outfits[=market,show]: the bought outfits, below)"""
import os, sys, json, math, struct
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.path.join(HERE, 'web', 'models')
os.makedirs(OUT, exist_ok=True)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, 'character'))
from webglb import *
import numpy as np
from mathutils import Vector, Matrix
import farmer as FM
import hen_char as HC
from common import empty

flat_info = g['flat_info']
ZERO = dict(shL=(0, 0, 0), shR=(0, 0, 0), elL=0, elR=0, wrL=(0, 0, 0), wrR=(0, 0, 0), hipL=(0, 0, 0), hipR=(0, 0, 0), kneeL=0, kneeR=0,
            ankleL=0, ankleR=0, chest=(0, 0, 0), head=(0, 0, 0), hand=('open', 'open'))
EXPR = dict(up=0.0, lo=0.0, look=(0, 0), brow=0.0, brow_h=0.2, mouth='smile', blush=0.0)
MOUTHS = ['smile', 'grin', 'talk', 'o', 'wavy', 'frown']
MODELS, JOINTS, INFO, STATS = {}, {}, {}, {}


def to_gl(v): return [float(v[1]), float(v[2]), float(v[0])]          # Blender (forward, left, up) -> glTF (left, up, forward)


def q_gl(q): return [float(q.y), float(q.z), float(q.x), float(q.w)]   # a rotation's axis turned the same way (x, y, z, w)


def bone_of(o, bones):
    p = o.parent
    while p is not None and p not in bones: p = p.parent
    return p


def reparent(o, parent):
    mw = o.matrix_world.copy(); o.parent = parent; o.matrix_parent_inverse = Matrix.Identity(4); bpy.context.view_layer.update(); o.matrix_world = mw


def build(look):
    fresh()
    root, hd = FM.build(look, ZERO, EXPR)
    Mt = FM.mats(look); hr = 0.2
    bpy.context.view_layer.update()
    hobj = [o for o in hd.children if o.name.startswith('headm')][0]
    surf = HC.surface_finder(hobj)
    face = {}                                          # name -> objects made for the face before the extra mouths
    for o in hd.children: face.setdefault(o.name.split('.')[0], []).append(o)
    # ---- the eyes: a bone for the look (iris, pupil, shine), one for each lid
    info = dict(eyes={})
    for s, key in ((1, 'L'), (-1, 'R')):
        n = Vector((0.9, s * 0.36, 0.06)).normalized(); sp_, _ = surf(n); ic = sp_ - n * 0.014
        up = Vector((0, 0, 1)); Zl = (up - n * up.dot(n)).normalized(); Xl = n.cross(Zl)
        Fm = Matrix.Translation(ic) @ Matrix((Xl, n, Zl)).transposed().to_4x4()
        def side(o):                                   # (which side of the face: by the middle of what it's drawn round)
            bb = [o.matrix_world @ Vector(v) for v in o.bound_box]; c = sum(bb, Vector()) / 8
            return (c - hd.matrix_world.translation).y * s > 0
        for bname, parts in (('eye' + key, ('iris', 'pupil', 'shine')), ('lid' + key, ('lidup', 'lashline', 'flick')), ('lidlo' + key, ('lidlo',))):
            b = empty(bname, (0, 0, 0), (0, 0, 0), hd); b.matrix_basis = Fm.copy(); bpy.context.view_layer.update()
            for nm in parts:
                for o in face.get(nm, []):
                    if side(o): reparent(o, b)
        # the brow: on its own bone at its middle, turned to the face
        br = [o for o in face.get('brow', []) if side(o)][0]
        pts = [Vector(p.co[:3]) for p in br.data.splines[0].points]; c = sum(pts, Vector()) / len(pts)
        b = empty('brow' + key, (0, 0, 0), (0, 0, 0), hd); b.matrix_basis = Matrix.Translation(c) @ Matrix((Xl, n, Zl)).transposed().to_4x4()
        bpy.context.view_layer.update(); reparent(br, b)
        info['eyes'][key] = dict(r=0.037 * 1.07, centre=to_gl(ic))
    # ---- the mouths: the smile made with the face, then each other shape, each on its own bone at the mouth
    cdir = Vector((0.93, 0, -0.43)).normalized() * hr; mp, mn = surf(cdir)
    mouth_parts = {'m', 'mline', 'mouth', 'teeth', 'tongue', 'lip', 'lipline'}
    for kind in MOUTHS:
        before = set(hd.children)
        if kind != 'smile': FM.mouth(kind, hd, hr, surf, Mt)
        made = [o for o in hd.children if o not in before] if kind != 'smile' else [o for o in hd.children if o.name.split('.')[0] in mouth_parts]
        b = empty('mouth_' + kind, (0, 0, 0), (0, 0, 0), hd); b.matrix_basis = Matrix.Translation(mp); bpy.context.view_layer.update()
        for o in made:
            if o is not b: reparent(o, b)
    # ---- the props: the torch in the right hand, the pail in the left (hidden until wanted)
    wR = [o for o in root.children_recursive if o.name.startswith('wristR')][0]; wL = [o for o in root.children_recursive if o.name.startswith('wristL')][0]
    bpy.context.view_layer.update()
    if FM.LOOKS[look].get('judge'):
        # the judge: his clipboard in the left hand, his pencil in the right (hidden until wanted); the torch's and the
        # pail's bones are kept, with nothing on them, so the farmers' rig drives him just the same
        for nm, w in (('torch', wR), ('pail', wL)): empty(nm, (0, 0, 0), (0, 0, 0), w)
        cb = FM.clipboard_prop(wL.matrix_world.copy()); reparent(cb, wL)
        pc = FM.pencil_prop(wR.matrix_world.copy()); reparent(pc, wR)
        bpy.context.view_layer.update()
        # where a held thing goes, in each wrist's own frame (glTF axes): the palm's middle, and the right hand's pinch
        # between thumb and finger (a rosette held by its pin to be pinned on a pen)
        info['hold'] = dict(palm=to_gl(Vector((0.0, 0.0, -0.059))), pinch=to_gl(Vector((0.045, 0.0, -0.105))))
        info['mouth'] = to_gl(hd.matrix_world @ mp); info['blush'] = [to_gl(hd.matrix_world @ surf((0.75, sd * 0.55, -0.3))[0]) for sd in (1, -1)]
        return root, hd, info
    t = FM.torch_prop(wR.matrix_world @ Vector((0, 0, -0.06)), Vector((1.0, 0.0, -0.05)))
    for o in list(t.children):
        if o.name.startswith('tbeam'): bpy.data.objects.remove(o)
    reparent(t, wR); t.name = 'torch'
    pl = FM.bucket_prop(wL.matrix_world @ Vector((0, 0, -0.06))); reparent(pl, wL); pl.name = 'pail'
    for o in [o for o in pl.children if o.name.startswith('g')][7:]: bpy.data.objects.remove(o)          # (a few grains of corn show)
    bpy.context.view_layer.update()
    if os.environ.get('FACEDBG'):
        for e in [o for o in hd.children if o.type == 'EMPTY']: print('BONE', e.name, sorted(c.name for c in e.children))
    info['blush'] = [to_gl(hd.matrix_world @ surf((0.75, sd * 0.55, -0.3))[0]) for sd in (1, -1)]
    info['mouth'] = to_gl(hd.matrix_world @ mp)
    return root, hd, info


def bake(look, root, budget, info, only=None, store=None, keep=()):
    """only: which of the farmer's parts to keep (an outfit's own: export_outfits), stored under store (default: the look);
    keep: parts never simplified."""
    store = store or look
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    # the bones: every empty in the farmer, named uniquely (the hands' own joints take their side's letter)
    empties = [root] + [o for o in root.children_recursive if o.type == 'EMPTY']
    names = {}
    for e in empties:
        base = e.name.split('.')[0]
        if base in ('hand', 'knuckle', 'idx', 'thumb'):
            p = e.parent
            while p is not None and not p.name.startswith('wrist'): p = p.parent
            base += p.name.split('.')[0][-1]
        if e is root: base = 'root'
        names[e] = base
    assert len(set(names.values())) == len(names), sorted(names.values())
    def depth(e):
        d = 0
        while e.parent is not None: e = e.parent; d += 1
        return d
    order = sorted(empties, key=lambda e: (depth(e), names[e]))          # (each bone after its parent)
    idx = {e: i for i, e in enumerate(order)}
    joints = []
    for e in order:
        mb = e.matrix_basis if e is not root else Matrix.Identity(4)
        loc, q, sc = mb.decompose()
        joints.append(dict(name=names[e], parent=names[e.parent] if e is not root and e.parent in idx else None,
                           pos=to_gl(loc), quat=q_gl(q), scale=[float(sc[1]), float(sc[2]), float(sc[0])]))
    objs = [o for o in root.children_recursive if o.type in ('MESH', 'CURVE') and o.visible_get() and (only is None or only(o))]
    for o in objs:                                      # (the face's lines: round enough with fewer sides)
        if o.type == 'CURVE': o.data.bevel_resolution = 1
    dg.update()
    meshes = []
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        me.calc_loop_triangles(); meshes.append([o, me, len(me.loop_triangles)])
    # simplified part by part: the face's little parts kept as they are, the big soft shapes to a set number of triangles
    # each, every other round part to about 40% (they're smooth-shaded, so it hardly shows)
    KEEP = ('m', 'mline', 'mouth', 'teeth', 'tongue', 'lip', 'lipline', 'shine', 'lashline', 'flick', 'brow',
            'glassrim', 'glassarm', 'glassbridge', 'cline', 'ctick', 'lapel')          # (the judge's: thin lines)
    TARGET = dict(torso=2600, beard=1300, headm=3000, hair=1600, plait=700, plaitend=120, brim=800, crown=600, cuff=180, eyeball=360, lidup=420, lidlo=420, iris=260, pupil=200,
                  moustache=700, scuff=120, capcrown=1000, beaniecrown=1000, hairtop=1200)          # (the outfits' cap and bobble hat, Rosie's hair under them: export_outfits)
    total = 0
    for rec in meshes:
        o, me, n = rec; k = o.name.split('.')[0]
        if k in KEEP or k in keep or n <= 120: total += n; continue
        ratio = min(1.0, TARGET[k] / n) if k in TARGET else 0.3
        if ratio >= 0.98: total += n; continue
        tmp = bpy.data.objects.new('tmp', me); bpy.context.scene.collection.objects.link(tmp)
        md = tmp.modifiers.new('dec', 'DECIMATE'); md.ratio = ratio; md.use_collapse_triangulate = True
        dg.update()
        me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        bpy.data.objects.remove(tmp); me2.calc_loop_triangles(); rec[1] = me2; rec[2] = len(me2.loop_triangles); total += rec[2]
    print('TRIS', store, total)
    if os.environ.get('BREAKDOWN'):
        agg = {}
        for o, _, n in meshes: k = o.name.split('.')[0]; agg[k] = agg.get(k, 0) + n
        print(sorted(agg.items(), key=lambda kv: -kv[1])[:30])
    bc = [np.array([v[2], v[0], v[1]], np.float32) for v in info['blush']]          # (back to Blender's axes)
    P_, N_, C_, J_, CL_, CM_, BL_ = [], [], [], [], [], [], []
    for o, me, n in meshes:
        b = bone_of(o, idx); j = idx[b]
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        loc_co = np.array([v.co[:] for v in me.vertices], np.float32)
        co = np.array([mw @ v.co for v in me.vertices], np.float32)
        try: cn = np.array([c.vector[:] for c in me.corner_normals], np.float32)
        except AttributeError: me.calc_normals_split(); cn = np.array([l.normal[:] for l in me.loops], np.float32)
        cn = cn @ np.array(nm, np.float32).T; cn /= np.maximum(1e-8, np.linalg.norm(cn, axis=1, keepdims=True))
        lv = np.array([l.vertex_index for l in me.loops], np.int64)
        mats_ = list(me.materials) or [None]
        cols = [(flat_info(m)[0][:3] if m is not None else [0.8, 0.8, 0.8]) for m in mats_]
        corners = np.array([t.loops[:] for t in me.loop_triangles], np.int64).reshape(-1)
        mi = np.repeat(np.array([t.material_index for t in me.loop_triangles], np.int64), 3)
        p = co[lv[corners]]; nrm = cn[corners]; lc = loc_co[lv[corners]]
        c = np.array([cols[min(i, len(cols) - 1)] for i in mi], np.float32)
        mname = [((mats_[min(i, len(mats_) - 1)].name.split('.')[0]) if mats_[min(i, len(mats_) - 1)] else '') for i in mi]
        cm = np.array([1 if nm_.startswith('fm_shirt_') else 2 if nm_.startswith('fm_shirtarm_') else 0 for nm_ in mname], np.float32)
        bw = np.zeros(len(p), np.float32)
        if o.name.startswith('headm'):
            for q in bc: bw = np.maximum(bw, np.exp(-np.sum(((p - q) / np.array([0.05, 0.05, 0.035], np.float32)) ** 2, 1)))
        P_.append(p); N_.append(nrm); C_.append(c); J_.append(np.full(len(p), j, np.float32)); CL_.append(lc); CM_.append(cm); BL_.append(bw)
    cat = lambda L: np.concatenate(L)
    p, n, c, jt, cl, cm, bw = map(cat, (P_, N_, C_, J_, CL_, CM_, BL_))
    gl = lambda v: np.stack([v[..., 1], v[..., 2], v[..., 0]], -1)
    P = gl(p); Nn = gl(n)
    Cb = np.clip(np.round(np.clip(c, 0, 1) * 255), 0, 255).astype(np.uint8)
    Bb = np.round(np.clip(bw, 0, 1) * 255).astype(np.uint8)
    key = np.concatenate([np.round(P * 1e4), np.round(Nn * 1e3), Cb.astype(np.float32), jt[:, None], cm[:, None], np.round(cl * 1e4), Bb[:, None].astype(np.float32)], 1)
    uniq, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.reshape(-1)
    first = np.zeros(len(uniq), np.int64); first[inv[::-1]] = np.arange(len(inv))[::-1]
    nv = len(first)
    MODELS[store] = dict(pos=P[first].astype(np.float32), nrm=Nn[first].astype(np.float32),
                       col=np.concatenate([Cb[first], np.full((nv, 1), 255, np.uint8)], 1), idx=inv.astype(np.uint32),
                       joints=np.concatenate([jt[first, None], np.zeros((nv, 3))], 1).astype(np.uint8),
                       weights=np.concatenate([np.full((nv, 1), 255), np.zeros((nv, 3))], 1).astype(np.uint8),
                       cloth=cl[first].astype(np.float32), cmode=cm[first].astype(np.uint8), blush=Bb[first])
    JOINTS[store] = joints; INFO[store] = info
    STATS[store] = dict(tris=len(inv) // 3, verts=nv, bones=len(joints))
    print('BAKED', store, STATS[store])


def write(path, looks, names=None):
    """looks: the MODELS keys to write, each as a mesh named farmer_<key> (or names[key])."""
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
    def add_view(data, target):
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target)); bin_.extend(data); return len(views) - 1
    def acc(data, ctype, count, typ, target=34962, **kw):
        accs.append(dict(bufferView=add_view(data, target), componentType=ctype, count=count, type=typ, **kw)); return len(accs) - 1
    for look in looks:
        pr = MODELS[look]; pos = pr['pos']; nv = len(pos)
        at = dict(POSITION=acc(pos.tobytes(), 5126, nv, 'VEC3', min=[float(v) for v in pos.min(0)], max=[float(v) for v in pos.max(0)]),
                  NORMAL=acc(pr['nrm'].tobytes(), 5126, nv, 'VEC3'),
                  COLOR_0=acc(pr['col'].tobytes(), 5121, nv, 'VEC4', normalized=True),
                  JOINTS_0=acc(pr['joints'].tobytes(), 5121, nv, 'VEC4'),
                  WEIGHTS_0=acc(pr['weights'].tobytes(), 5121, nv, 'VEC4', normalized=True),
                  _CLOTH=acc(pr['cloth'].tobytes(), 5126, nv, 'VEC3'),
                  _CMODE=acc(pr['cmode'].tobytes(), 5121, nv, 'SCALAR'),
                  _BLUSH=acc(pr['blush'].tobytes(), 5121, nv, 'SCALAR', normalized=True))
        ib = pr['idx'].astype(np.uint16 if nv < 65536 else np.uint32)
        nm = (names or {}).get(look, 'farmer_' + look)
        meshes.append(dict(name=nm, primitives=[dict(attributes=at, indices=acc(ib.tobytes(), 5123 if nv < 65536 else 5125, len(ib), 'SCALAR', target=34963), material=0)]))
        nodes.append(dict(name=nm, mesh=len(meshes) - 1))
    while len(bin_) % 4: bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='Feather & Field export_farmer.py'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=meshes, materials=[dict(name='satin', pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0, roughnessFactor=0.7))],
                accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(bin_)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total)); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
    print('WROTE', os.path.basename(path), round(total / 1024), 'KB', looks)


# ------------------------------------------------------------------ the outfits the player buys in the game (farmer.py's OUTFITS): one
# file each, outfit_<id>.glb + outfit_<id>.json, holding only what an outfit changes, for both looks: its hat (everything on the
# hat's bone: the browser hides the Classic straw hat's parts, which all hang on that bone, and shows these instead) and the
# show rosette or the rodeo neckerchief on the chest. The shirt is the same shape as the checked one, so it's only colours:
# a check (its three colours and how fine), a plain colour or a knit (the json's `shirt`), drawn per pixel by farmer.js.
# Rosie's plait ribbon is the hat band's colour in the 2D game: where an outfit's band differs, the json says which colour
# of hers becomes which (`ribbon`: the vertex colours as farmer.glb holds them, on the head's bone). Every part keeps the
# farmers' 42 bones (checked against farmer.json), so every pose and face works the same in every outfit.
# Usage: ../bl/bin/python export_farmer.py web3d/models outfits[=market,show]
OUTFIT_IDS = ['market', 'garden', 'winter', 'rodeo', 'show']
OUTFIT_EXTRAS = ('pleat', 'roscentre', 'rostail', 'Torus', 'scarftip')          # (the rosette's and the neckerchief's parts)
OUTFIT_KEEP = ('band', 'stripe', 'turnup')          # (the hats' bands as made: simplified, their edges came out frayed)


def outfit_part(root):
    hat = [o for o in root.children_recursive if o.type == 'EMPTY' and o.name.split('.')[0] == 'hat'][0]
    def wanted(o):
        if o.name.split('.')[0] in OUTFIT_EXTRAS: return True
        p = o.parent
        while p is not None:
            if p is hat: return True
            p = p.parent
        return False
    return wanted


def col8(m):
    """A material's colour as export_farmer bakes it into the vertices (linear, 0..255)."""
    return [int(v) for v in np.clip(np.round(np.clip(np.array(flat_info(m)[0][:3], np.float32), 0, 1) * 255), 0, 255)]


def export_outfits(ids):
    ref = json.load(open(os.path.join(OUT, 'farmer.json')))          # (the farmers' own bones: every outfit hangs on them)
    for oid in ids:
        FM.OUTFIT = oid; FM._F.clear()
        O = FM.OUTFITS[oid]
        # both looks' parts the same shape (all but the garden's sun hat, whose brim droops like each look's own straw hat):
        # one mesh for both (Arthur's; Rosie's comes out the same but for the simplifying's little differences)
        shared = O.get('hat') != 'sunhat'
        hairtop = O.get('hat') not in (None, 'straw', 'sunhat')          # (Rosie's hair over the top of her head: farmer.py hair_top)
        meshes, names = {}, {}
        for look in ('m', 'f'):
            root, hd, info = build(look)
            if look == 'f' and hairtop:
                hobj = [o for o in hd.children if o.name.startswith('headm')][0]
                FM.hair_top(look, hd, HC.surface_finder(hobj), FM.mats(look))
            light(1)
            key = oid + ':' + look
            bake(look, root, 0, info, only=outfit_part(root), store=key, keep=OUTFIT_KEEP)
            J, R = JOINTS[key], ref['joints'][look]
            assert [(j['name'], j['parent']) for j in J] == [(j['name'], j['parent']) for j in R], 'the bones differ'
            for a, b in zip(J, R):
                same = np.allclose(a['pos'], b['pos'], atol=1e-6) and (a['name'] == 'hat' or np.allclose(a['quat'], b['quat'], atol=1e-6))
                assert same, ('bone moved', a['name'])
            if look == 'm' or not shared: names[key] = 'outfit_%s' % oid + ('' if shared else '_' + look)
            meshes[look] = [names[oid + ':m' if shared else key]]
            if look == 'f' and hairtop:                                # (her hair: a mesh of its own, the hat shared with Arthur)
                bake(look, root, 0, info, only=lambda o: o.name.split('.')[0] == 'hairtop', store=oid + ':hair')
                names[oid + ':hair'] = 'outfit_%s_hair_f' % oid; meshes['f'].append(names[oid + ':hair'])
        write(os.path.join(OUT, 'outfit_%s.glb' % oid), list(names), names)
        if O.get('shirt'): shirt = dict(kind='check', cols=list(O['shirt']), f=O.get('check', 135.0))
        elif O.get('knit'): shirt = dict(kind='knit', col=O['knit'])
        else: shirt = dict(kind='plain', col=O['plain'])
        ribbon = {}
        if O.get('band') and O['band'].lower() != FM.LOOKS['f']['band'].lower():
            FM.OUTFIT = 'classic'; FM._F.clear(); was = col8(FM.mats('f')['band'])
            FM.OUTFIT = oid; FM._F.clear(); now = col8(FM.mats('f')['band'])
            ribbon['f'] = {'joint': 'headc', 'from': was, 'to': now}
        stats = {nm: dict(tris=STATS[k]['tris'], verts=STATS[k]['verts']) for k, nm in names.items()}
        meta = dict(id=oid, meshes=meshes, hide=['hat'], shirt=shirt, band=O.get('band'), ribbon=ribbon, stats=stats)
        json.dump(meta, open(os.path.join(OUT, 'outfit_%s.json' % oid), 'w'), indent=1)
        print('OUTFIT', oid, meshes, stats)
    FM.OUTFIT = 'classic'; FM._F.clear()


if len(sys.argv) > 2 and sys.argv[2].startswith('outfits'):
    export_outfits(sys.argv[2].split('=')[1].split(',') if '=' in sys.argv[2] else OUTFIT_IDS)
    sys.exit(0)
looks = sys.argv[2].split(',') if len(sys.argv) > 2 else ['m', 'f']
for look in looks:
    root, hd, info = build(look); light(1)
    bake(look, root, 0, info)
# the farmers (Arthur, Rosie) in farmer.glb; the show judge ('j') in his own judge.glb + judge.json (same layout, loaded
# only for a show day: farmer.js addLook)
for fname, group in (('farmer', [k for k in looks if k != 'j']), ('judge', [k for k in looks if k == 'j'])):
    if not group: continue
    write(os.path.join(OUT, fname + '.glb'), group)
    plaid = {k: [FM.LOOKS[k]['shirt'][i] for i in range(3)] for k in group}
    json.dump(dict(joints={k: JOINTS[k] for k in group}, info={k: INFO[k] for k in group}, plaid=plaid,
                   colours={k: {c: FM.LOOKS[k][c] for c in ('skin', 'blush', 'hair', 'band', 'hat', 'boots', 'denim')} for k in group},
                   mouths=MOUTHS, stats={k: STATS[k] for k in group}), open(os.path.join(OUT, fname + '.json'), 'w'), indent=1)
print('STATS', json.dumps(STATS))
