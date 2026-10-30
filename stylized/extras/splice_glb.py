# Keep a .glb's models exactly as they are (byte for byte) and put in some from a fresh export, replaced or added: the
# exporters don't make byte-identical models twice (the simplifying varies), so redoing one would otherwise change all the
# others a little. Its .json's per-model entries (models, stats, names) are merged the same way.
#   python3 stylized/extras/splice_glb.py OLD.glb OLD.json NEW.glb NEW.json OUT.glb OUT.json name1,name2
# (the birds: stylized/extras/splice_birds.py, by a name prefix)
import json, struct, sys
def load(p):
    b = open(p, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + jl]); bin_ = b[20 + jl + 8:]
    out = {}
    for m in js['meshes']:
        pr = m['primitives'][0]; at = {}
        for k in list(pr['attributes']) + ['indices']:
            a = js['accessors'][pr['attributes'][k] if k != 'indices' else pr['indices']]; v = js['bufferViews'][a['bufferView']]
            at[k] = (dict(a), bin_[v['byteOffset']:v['byteOffset'] + v['byteLength']], v.get('target'))
        out[m['name']] = (at, pr.get('material', 0))
    return js, out
TAKE = sys.argv[7].split(',')
oj, old = load(sys.argv[1]); nj, new = load(sys.argv[3])
names = [m['name'] for m in oj['meshes']] + [n for n in TAKE if n not in old]
bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
for name in names:
    at, mat = (new if name in TAKE else old)[name]
    prim = dict(attributes={}, material=mat)
    for k, (a, data, target) in at.items():
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), **({'target': target} if target else {}))); bin_.extend(data)
        a = dict(a); a['bufferView'] = len(views) - 1; accs.append(a)
        if k == 'indices': prim['indices'] = len(accs) - 1
        else: prim['attributes'][k] = len(accs) - 1
    meshes.append(dict(name=name, primitives=[prim])); nodes.append(dict(name=name, mesh=len(meshes) - 1))
while len(bin_) % 4: bin_.append(0)
g = dict(oj); g.update(nodes=nodes, meshes=meshes, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))], scenes=[dict(nodes=list(range(len(nodes))))])
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(sys.argv[5], 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js); f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
OJ, NJ = json.load(open(sys.argv[2])), json.load(open(sys.argv[4]))
for key in ('models', 'stats', 'names'):
    if key in OJ and key in NJ:
        for n in TAKE: OJ[key][n] = NJ[key][n]
json.dump(OJ, open(sys.argv[6], 'w'), indent=1)
_, chk = load(sys.argv[5])
body = lambda m: [(k, d) for k, (a, d, t) in sorted(m[0].items())]      # (the data, not where it sits in the file)
print('spliced', TAKE, '; the others unchanged:', all(body(chk[n]) == body(old[n]) for n in names if n not in TAKE), '; new ones in:', all(body(chk[n]) == body(new[n]) for n in TAKE))
