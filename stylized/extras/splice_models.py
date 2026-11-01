# Put some models from a fresh export into a .glb (village.glb, decor.glb), keeping every other model byte for byte (each
# mesh's primitives, their materials matched by bucket name), as splice_coops.py without its json (1 Nov 2026: the village's
# rebuilt farmhouse and decorations, export_village3d.py).
#   python3 stylized/extras/splice_models.py OLD.glb NEW.glb OUT.glb name1,name2
import json, struct, sys
def load(p):
    b = open(p, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + jl]); bin_ = b[20 + jl + 8:]
    out = {}
    for m in js['meshes']:
        prims = []
        for pr in m['primitives']:
            at = {}
            for k in list(pr['attributes']) + ['indices']:
                a = js['accessors'][pr['attributes'][k] if k != 'indices' else pr['indices']]; v = js['bufferViews'][a['bufferView']]
                at[k] = (dict(a), bin_[v['byteOffset']:v['byteOffset'] + v['byteLength']], v.get('target'))
            prims.append((at, js['materials'][pr.get('material', 0)]['name']))
        out[m['name']] = prims
    return js, out
oj, old = load(sys.argv[1]); nj, new = load(sys.argv[2])
TAKE = sys.argv[4].split(',')
mats = list(oj['materials']); mi = {m['name']: i for i, m in enumerate(mats)}
for m in nj['materials']:
    if m['name'] not in mi: mi[m['name']] = len(mats); mats.append(m)
names = [m['name'] for m in oj['meshes']] + [n for n in TAKE if n not in old]
bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
for name in names:
    prims = []
    for at, mname in (new if name in TAKE else old)[name]:
        prim = dict(attributes={}, material=mi[mname])
        for k, (a, data, target) in at.items():
            while len(bin_) % 4: bin_.append(0)
            views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), **({'target': target} if target else {}))); bin_.extend(data)
            a = dict(a); a['bufferView'] = len(views) - 1; accs.append(a)
            if k == 'indices': prim['indices'] = len(accs) - 1
            else: prim['attributes'][k] = len(accs) - 1
        prims.append(prim)
    meshes.append(dict(name=name, primitives=prims)); nodes.append(dict(name=name, mesh=len(meshes) - 1))
while len(bin_) % 4: bin_.append(0)
g = dict(oj); g.update(nodes=nodes, meshes=meshes, materials=mats, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))], scenes=[dict(nodes=list(range(len(nodes))))])
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(sys.argv[3], 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js); f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
_, chk = load(sys.argv[3])
body = lambda prims: [[(k, d) for k, (a, d, t) in sorted(at.items())] + [mn] for at, mn in prims]
print('spliced', TAKE, '; the others unchanged:', all(body(chk[n]) == body(old[n]) for n in names if n not in TAKE), '; new ones in:', all(body(chk[n]) == body(new[n]) for n in TAKE))
