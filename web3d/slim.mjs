// A model file made smaller for the phone (build.sh: the first load came to ~25 MB, the coops alone 15 MB): each still
// mesh's corners as 16-bit whole numbers on a grid fitted to that mesh (KHR_mesh_quantization: the node scaled and moved
// to put them back) and its normals as 8-bit; colours and the triangles as they were. A mesh on a skin, shared by two
// nodes, or on a node already moved is left as it was. main.js's loadGLB turns them back into ordinary numbers as it
// loads, so everything after sees the very same model (to within a twentieth of a millimetre on a coop).
// Usage: node slim.mjs in.glb out.glb
import fs from 'fs';
const [src, dst] = process.argv.slice(2);
const f = fs.readFileSync(src);
const jl = f.readUInt32LE(12), J = JSON.parse(f.subarray(20, 20 + jl).toString());
const binStart = 20 + jl + 8, BIN = f.subarray(binStart, binStart + f.readUInt32LE(20 + jl));
const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
// an accessor's numbers (as floats)
function read(ai) {
  const a = J.accessors[ai], v = J.bufferViews[a.bufferView], n = N[a.type], cs = SIZE[a.componentType];
  const stride = v.byteStride || n * cs, off = (v.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * n);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
    const p = off + i * stride + k * cs;
    out[i * n + k] = a.componentType === 5126 ? BIN.readFloatLE(p) : a.componentType === 5123 ? BIN.readUInt16LE(p) : a.componentType === 5125 ? BIN.readUInt32LE(p)
      : a.componentType === 5121 ? BIN.readUInt8(p) : a.componentType === 5122 ? BIN.readInt16LE(p) : BIN.readInt8(p);
  }
  return out;
}
const users = {};
for (const nd of J.nodes) if (nd.mesh !== undefined) users[nd.mesh] = (users[nd.mesh] || 0) + 1;
const slim = new Set();
J.nodes.forEach((nd, i) => {
  if (nd.mesh === undefined || nd.skin !== undefined || users[nd.mesh] > 1 || nd.matrix || nd.translation || nd.rotation || nd.scale) return;
  const m = J.meshes[nd.mesh];
  if (m.primitives.every(p => J.accessors[p.attributes.POSITION].componentType === 5126 && !p.attributes.JOINTS_0 && !p.targets)) slim.add(i);
});
// the new binary: every view copied as it was, except the slimmed positions and normals (written anew)
const chunks = []; let len = 0;
const put = (buf) => { while (len % 4) { chunks.push(Buffer.alloc(1)); len++; } const o = len; chunks.push(buf); len += buf.length; return o; };
const views = J.bufferViews.map(v => ({ ...v, byteOffset: put(BIN.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength)) }));
const acc = J.accessors.map(a => ({ ...a }));
let saved = 0;
for (const ni of slim) {
  const nd = J.nodes[ni], m = J.meshes[nd.mesh];
  const P = m.primitives.map(p => read(p.attributes.POSITION));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const a of P) for (let i = 0; i < a.length; i++) { lo[i % 3] = Math.min(lo[i % 3], a[i]); hi[i % 3] = Math.max(hi[i % 3], a[i]); }
  const c = lo.map((l, k) => (l + hi[k]) / 2), s = Math.max(1e-6, ...hi.map((h, k) => (h - lo[k]) / 2)) / 32767;
  nd.translation = c; nd.scale = [s, s, s];
  m.primitives.forEach((p, pi) => {
    const a = P[pi], n = a.length / 3, b = Buffer.alloc(n * 8);
    const qlo = [32767, 32767, 32767], qhi = [-32767, -32767, -32767];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
      const q = Math.max(-32767, Math.min(32767, Math.round((a[i * 3 + k] - c[k]) / s)));
      b.writeInt16LE(q, i * 8 + k * 2); qlo[k] = Math.min(qlo[k], q); qhi[k] = Math.max(qhi[k], q);
    }
    const old = J.accessors[p.attributes.POSITION];
    saved += J.bufferViews[old.bufferView].byteLength - b.length;
    views.push({ buffer: 0, byteOffset: put(b), byteLength: b.length, byteStride: 8, target: 34962 });
    acc[p.attributes.POSITION] = { bufferView: views.length - 1, componentType: 5122, count: n, type: 'VEC3', min: qlo, max: qhi };
    if (p.attributes.NORMAL !== undefined && J.accessors[p.attributes.NORMAL].componentType === 5126) {
      const r = read(p.attributes.NORMAL), nb = Buffer.alloc(n * 4);
      for (let i = 0; i < n; i++) {
        const l = Math.hypot(r[i * 3], r[i * 3 + 1], r[i * 3 + 2]) || 1;
        for (let k = 0; k < 3; k++) nb.writeInt8(Math.max(-127, Math.min(127, Math.round(r[i * 3 + k] / l * 127))), i * 4 + k);
      }
      saved += J.bufferViews[J.accessors[p.attributes.NORMAL].bufferView].byteLength - nb.length;
      views.push({ buffer: 0, byteOffset: put(nb), byteLength: nb.length, byteStride: 4, target: 34962 });
      acc[p.attributes.NORMAL] = { bufferView: views.length - 1, componentType: 5120, normalized: true, count: n, type: 'VEC3' };
    }
  });
}
// the old views no longer used dropped (and the binary written again without them)
const usedV = new Set(acc.map(a => a.bufferView)); (J.images || []).forEach(im => { if (im.bufferView !== undefined) usedV.add(im.bufferView); });
const remap = {}, outViews = [], out = []; let ol = 0;
const put2 = (buf) => { while (ol % 4) { out.push(Buffer.alloc(1)); ol++; } const o = ol; out.push(buf); ol += buf.length; return o; };
const NB = Buffer.concat(chunks);
views.forEach((v, i) => { if (!usedV.has(i)) return; remap[i] = outViews.length; outViews.push({ ...v, byteOffset: put2(NB.subarray(v.byteOffset, v.byteOffset + v.byteLength)) }); });
while (ol % 4) { out.push(Buffer.alloc(1)); ol++; }
J.bufferViews = outViews; J.accessors = acc.map(a => ({ ...a, bufferView: remap[a.bufferView] }));
(J.images || []).forEach(im => { if (im.bufferView !== undefined) im.bufferView = remap[im.bufferView]; });
J.buffers = [{ byteLength: ol }];
if (slim.size) { J.extensionsUsed = [...new Set([...(J.extensionsUsed || []), 'KHR_mesh_quantization'])]; J.extensionsRequired = [...new Set([...(J.extensionsRequired || []), 'KHR_mesh_quantization'])]; }
let js = Buffer.from(JSON.stringify(J)); if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - js.length % 4, 0x20)]);
const bin = Buffer.concat(out), head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4E4F534A, 4); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
fs.writeFileSync(dst, Buffer.concat([head, jh, js, bh, bin]));
console.log('slim', src.split('/').pop(), (f.length / 1e6).toFixed(2), '->', ((20 + js.length + 8 + bin.length) / 1e6).toFixed(2), 'MB', slim.size, 'meshes');
