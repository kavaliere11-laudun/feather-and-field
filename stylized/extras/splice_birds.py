# Keep every bird exactly as it was (byte for byte) except one breed's: splice that breed's models from a fresh export into the
# flock in use. export_birds.py doesn't make byte-identical models twice (the simplifying varies), so redoing one breed would
# otherwise change every other bird a little, the Silkies too ("Do not edit silkies just the other breeds"). Used for the Light
# Brahma's new look (29 Oct 2026): export to a scratch folder, then
#   python3 stylized/extras/splice_birds.py web3d/models/flock.glb web3d/models/flock.json NEW/flock.glb NEW/flock.json \
#           web3d/models/flock.glb web3d/models/flock.json bra_
# usage: splice_birds.py OLD.glb OLD.json NEW.glb NEW.json OUT.glb OUT.json PREFIX
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
PRE = sys.argv[7]
oj, old = load(sys.argv[1]); nj, new = load(sys.argv[3])
names = [m['name'] for m in oj['meshes']]
bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
for name in names:
    at, mat = (new if name.startswith(PRE) else old)[name]
    prim = dict(attributes={}, material=mat)
    for k, (a, data, target) in at.items():
        while len(bin_) % 4: bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target)); bin_.extend(data)
        a = dict(a); a['bufferView'] = len(views) - 1; accs.append(a)
        if k == 'indices': prim['indices'] = len(accs) - 1
        else: prim['attributes'][k] = len(accs) - 1
    meshes.append(dict(name=name, primitives=[prim])); nodes.append(dict(name=name, mesh=len(meshes) - 1))
while len(bin_) % 4: bin_.append(0)
g = dict(oj); g.update(nodes=nodes, meshes=meshes, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))])
js = json.dumps(g, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
with open(sys.argv[5], 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js); f.write(struct.pack('<II', len(bin_), 0x004E4942)); f.write(bin_)
OJ, NJ = json.load(open(sys.argv[2])), json.load(open(sys.argv[4]))
for k in list(OJ['models']):
    if k.startswith(PRE): OJ['models'][k] = NJ['models'][k]; OJ['stats'][k] = NJ['stats'][k]
json.dump(OJ, open(sys.argv[6], 'w'), indent=1)
_, chk = load(sys.argv[5])
print('spliced; unchanged others:', all(chk[n] == old[n] for n in names if not n.startswith(PRE)), '; new ones in:', all(chk[n] == new[n] for n in names if n.startswith(PRE)))
