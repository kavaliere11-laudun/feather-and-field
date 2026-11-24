// Life round the decorations (main.js placeDecor puts them on the farm): bees busy between the hives and the lavender in
// front of them, butterflies over the cottage flower bed, little birds dropping in at the bird bath for a drink and a
// splashy bath, a glint of sun on the golden cockerel now and then, and music notes floating out of the bandstand of an
// evening (or when it's tapped). The bees, butterflies and birds by day only: they go home at dusk. Each decoration in its
// own frame, d.m (its world matrix; unturned, it faces +z, towards the player).
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const UP = new THREE.Vector3(0, 1, 0);

function tex(draw, w = 64, h = 64) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ bees: out of a hive's slot, over to the lavender in front,
// a hover at a flower or two, back in (or into another hive); a fuzzy striped body, wings a blur. (Bigger than life, to be
// seen: 19 Nov 2026, Audrey: "We need to see bees around the beehive": they had been 3 cm long, out by day only; now about
// twice that, more of them and busier, and from dusk to morning a few resting on each hive's landing board, wings still,
// crawling a little now and then: the hives never look empty.)
const HIVES = [-0.85, 0, 0.85].map(x => new THREE.Vector3(x, 0.3, 0.32));          // (each hive's slot)
class Bees {
  constructor(parent, grade, r, n = 24) {
    this.r = r; this.b = [];
    const body = new THREE.SphereGeometry(1, 10, 8), col = [], P = body.attributes.position;
    for (let i = 0; i < P.count; i++) { const z = P.getZ(i), band = z < 0.6 && Math.sin(z * 8 + 0.6) > 0.25; col.push(...(band ? [0.14, 0.1, 0.05] : [0.98, 0.74, 0.14])); }
    body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const bm = new THREE.MeshLambertMaterial({ vertexColors: true }); if (grade) grade(bm);
    this.n = n; this.bodies = new THREE.InstancedMesh(body, bm, n); this.bodies.frustumCulled = false; this.bodies.count = 0;
    const wm = new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }); if (grade) grade(wm);
    this.wings = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), wm, n * 2); this.wings.frustumCulled = false; this.wings.count = 0;
    parent.add(this.bodies, this.wings);
    for (let i = 0; i < n; i++) this.b.push({ rest: i < 9, st: 'in', t: r() * 4, p: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), mid: new THREE.Vector3(), at: new THREE.Vector3(), dur: 1, h: 0, seed: r() * 9 });
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YZX'); this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  flower(v) { return v.set(lerp(-1.2, 1.15, this.r()), 0.27 + this.r() * 0.07, lerp(0.5, 0.74, this.r())); }       // (a lavender spike)
  fly(b, to, dur) {
    b.from.copy(b.p); b.to.copy(to); b.mid.copy(b.from).add(b.to).multiplyScalar(0.5);
    b.mid.y += 0.1 + this.r() * 0.22; b.mid.x += (this.r() - 0.5) * 0.5; b.mid.z += (this.r() - 0.3) * 0.4; b.dur = dur; b.t = 0;
  }
  update(dt, day, time) {
    let k = 0;
    for (const b of this.b) {
      b.t += dt;
      if (b.st === 'in') {
        if (b.t > 0.8 && day > 0.5 && this.r() < dt * 0.9) { b.p.copy(HIVES[Math.floor(this.r() * 3)]); this.fly(b, this.flower(this._v), 0.9 + this.r() * 0.8); b.st = 'out'; b.visits = 1 + Math.floor(this.r() * 3); }
        else { if (b.rest && day <= 0.5) this.restAt(b, k++, time, day); continue; }
      }
      if (b.st === 'out' || b.st === 'home') {                        // (a curving flight)
        const u = Math.min(1, b.t / b.dur), a = 1 - u;
        b.p.set(a * a * b.from.x + 2 * a * u * b.mid.x + u * u * b.to.x, a * a * b.from.y + 2 * a * u * b.mid.y + u * u * b.to.y, a * a * b.from.z + 2 * a * u * b.mid.z + u * u * b.to.z);
        b.p.y += Math.sin(time * 13 + b.seed) * 0.008;
        const dx = 2 * a * (b.mid.x - b.from.x) + 2 * u * (b.to.x - b.mid.x), dz = 2 * a * (b.mid.z - b.from.z) + 2 * u * (b.to.z - b.mid.z);
        if (dx * dx + dz * dz > 1e-6) b.h = Math.atan2(dx, dz);
        if (u >= 1) { if (b.st === 'home') { b.st = 'in'; b.t = 0; continue; } b.st = 'hover'; b.t = 0; b.hold = 0.8 + this.r() * 1.8; b.at.copy(b.p); }
      } else if (b.st === 'hover') {                                   // (busy at a flower: a little wobble over it)
        b.p.set(b.at.x + Math.sin(time * 7 + b.seed) * 0.012, b.at.y + Math.sin(time * 11 + b.seed) * 0.008, b.at.z + Math.cos(time * 6 + b.seed * 2) * 0.012);
        if (b.t > b.hold) {
          if (--b.visits > 0 && day > 0.5) { this.fly(b, this.flower(this._v), 0.5 + this.r() * 0.5); b.st = 'out'; }
          else { this.fly(b, this._v.copy(HIVES[Math.floor(this.r() * 3)]), 0.9 + this.r() * 0.7); b.st = 'home'; }
        }
      }
      const s = 0.035;
      this._q.setFromAxisAngle(UP, b.h);
      this.bodies.setMatrixAt(k, this._m.compose(b.p, this._q, this._s.set(s * 0.85, s * 0.8, s * 1.3)));
      const flap = 0.5 + 0.5 * Math.sin(time * 70 + b.seed * 7);
      for (const side of [-1, 1]) {                                    // (two little round wings, a blur of a beat)
        this._q.setFromEuler(this._e.set(-Math.PI / 2, b.h, side * (0.15 + 0.5 * flap)));
        this._w.set(side * 0.032, 0.022, -0.008).applyAxisAngle(UP, b.h).add(b.p);
        this.wings.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), this._m.compose(this._w, this._q, this._s.set(0.03, 0.017, 1)));
      }
      k++;
    }
    this.bodies.count = k; this.wings.count = k * 2;
    this.bodies.instanceMatrix.needsUpdate = true; this.wings.instanceMatrix.needsUpdate = true;
  }
  // a bee resting on a hive's landing board (dusk to morning; by day the ones in stay in): its own spot on the board, wings
  // folded flat along its back, now and then a little crawl
  restAt(b, k, time, day) {
    if (day > 0.5) return;
    const i = this.b.indexOf(b), H = HIVES[i % 3], j = Math.floor(i / 3), x = H.x + (j - 1) * 0.07 + Math.sin(time * 0.35 + b.seed) * 0.02, z = H.z + 0.09 + (j % 2) * 0.035;
    const p = this._v.set(x, H.y - 0.025, z), h = b.seed + Math.sin(time * 0.3 + b.seed) * 0.6, s = 0.035;
    this._q.setFromAxisAngle(UP, h);
    this.bodies.setMatrixAt(k, this._m.compose(p, this._q, this._s.set(s * 0.85, s * 0.8, s * 1.3)));
    for (const side of [-1, 1]) { this._q.setFromEuler(this._e.set(-Math.PI / 2, h, side * 0.08)); this._w.set(side * 0.012, 0.022, -0.02).applyAxisAngle(UP, h).add(p); this.wings.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), this._m.compose(this._w, this._q, this._s.set(0.022, 0.012, 1))); }
  }
  get out() { return this.b.filter(b => b.st !== 'in').length; }
}

// ------------------------------------------------------------------ butterflies over the flower bed: a flutter from flower to
// flower, settling a moment with the wings slowly opening and closing, now and then a little wander out and back
export class Butterflies {
  constructor(parent, grade, r, n = 4, land = null) {
    this.r = r; this.f = []; this.land = land;          // (land: where they settle, if not the flower bed: the Rose Arbour's roses)
    const COL = [['#fbf6e9', '#3a3a3a'], ['#f2c84b', '#6a4a12'], ['#ee8a3c', '#3a1d0e'], ['#8fbdf0', '#21364f']];
    for (let i = 0; i < n; i++) {
      const [c, edge] = COL[i % COL.length];
      const map = tex(x => {                                             // (one wing: a big fore wing, a smaller hind wing, a spot)
        const wing = () => { x.beginPath(); x.ellipse(36, 22, 25, 17, -0.35, 0, Math.PI * 2); x.moveTo(47, 46); x.ellipse(30, 46, 17, 13, 0.4, 0, Math.PI * 2); };
        x.fillStyle = c; wing(); x.fill(); x.lineWidth = 3; x.strokeStyle = edge; wing(); x.stroke();
        x.fillStyle = edge; x.beginPath(); x.arc(46, 17, 4.5, 0, Math.PI * 2); x.fill();
      });
      const m = new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }); if (grade) grade(m);
      const g = new THREE.Group();
      const wings = [-1, 1].map(s => {                                     // (each wing hinged on the body, flat when open)
        const geo = new THREE.PlaneGeometry(0.075, 0.075).translate(0.0375, 0, 0).rotateX(-Math.PI / 2);
        const w = new THREE.Mesh(geo, m); const h = new THREE.Group(); h.scale.x = s; h.add(w); g.add(h); return h;
      });
      const bodyM = new THREE.MeshLambertMaterial({ color: '#2b2118' }); if (grade) grade(bodyM);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.05, 5).rotateX(Math.PI / 2), bodyM));
      parent.add(g);
      const f = { g, wings, st: 'fly', t: 0, p: land ? land(r) : new THREE.Vector3((r() - 0.5) * 0.8, 0.4, (r() - 0.5) * 0.8), to: new THREE.Vector3(), from: new THREE.Vector3(), dur: 1, h: 0, phase: r() * 6 };
      this.f.push(f); this.pick(f);
    }
  }
  pick(f) {
    f.from.copy(f.p); const a = this.r() * 6.28;
    if (this.land) {                                                     // (the arbour: from rose to rose, now and then a wander round it)
      if (this.r() < 0.25) { const d = 1.3 + this.r() * 0.8; f.to.set(Math.cos(a) * d, 0.9 + this.r() * 1.2, Math.sin(a) * d); f.land = false; }
      else { f.to.copy(this.land(this.r)); f.land = true; }
    } else if (this.r() < 0.2) { const d = 1.0 + this.r() * 1.1; f.to.set(Math.cos(a) * d, 0.55 + this.r() * 0.55, Math.sin(a) * d); f.land = false; }     // (a little wander)
    else { const d = Math.sqrt(this.r()) * 0.6; f.to.set(Math.cos(a) * d, 0.33 + this.r() * 0.05, Math.sin(a) * d); f.land = true; }
    f.st = 'fly'; f.dur = 0.9 + f.from.distanceTo(f.to) / 0.4; f.t = 0;
  }
  update(dt, day, time) {
    for (const f of this.f) {
      f.g.visible = day > 0.3;
      if (!f.g.visible) continue;
      f.t += dt;
      let open;
      if (f.st === 'fly') {
        const u = smooth(0, 1, f.t / f.dur), wob = Math.sin(time * 5 + f.phase) * 0.05;
        const y = lerp(f.from.y, f.to.y, u) + Math.sin(u * Math.PI) * 0.16 + Math.abs(Math.sin(time * 9 + f.phase)) * 0.025;
        f.h = Math.atan2(f.to.x - f.from.x, f.to.z - f.from.z);
        f.g.position.set(lerp(f.from.x, f.to.x, u) + Math.cos(f.h) * wob, y, lerp(f.from.z, f.to.z, u) - Math.sin(f.h) * wob);
        open = Math.abs(Math.sin(time * 15 + f.phase));
        if (f.t >= f.dur) { f.p.copy(f.g.position); if (f.land) { f.st = 'rest'; f.t = 0; f.hold = 1.5 + this.r() * 3; } else this.pick(f); }
      } else {                                                           // (settled on a flower, wings slowly opening and closing)
        open = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(time * 2.2 + f.phase));
        if (f.t > f.hold) this.pick(f);
      }
      f.g.rotation.set(0, f.h, 0);
      const a = (1 - open) * 1.35;                                       // (0: wide open and flat; up to nearly closed above the back)
      f.wings[0].rotation.z = a; f.wings[1].rotation.z = a;
    }
  }
}

// ------------------------------------------------------------------ the bird bath's visitors (its own blue tit sits on the
// rim already): a robin and a chaffinch drop in, a look round and a sip, a hop into the water for a splashy bath, back on
// the rim for a shake of the feathers, and off
const BATH = { rim: 0.705, R: 0.47, water: 0.671, tit: Math.atan2(0.3, 0.36), bath: true, kinds: ['robin', 'chaffinch'] };
// (the Golden Egg Fountain, 24 Nov 2026: three little birds come to drink from its basin's rim, 0.375 up and 1.02 out, between
// the four bronze frogs, mostly at its sides; no bath, the basin's deep; grand.py fountain_dec)
// (the Rose Arbour, 24 Nov 2026: grand.py rose_arbour_dec in the game's frame, its front towards +z: the roses along the
// front of its arch, up its two front posts, on the two standard roses' heads; where the butterflies settle and the petals
// fall from)
const ARBOUR = {
  rose(r) {
    const k = r();
    if (k < 0.45) { const t = Math.PI * (0.12 + 0.76 * r()); return new THREE.Vector3(0.78 * Math.cos(t), 1.86 + 0.53 * Math.sin(t), 0.08 + r() * 0.05); }
    if (k < 0.75) { const s = r() < 0.5 ? -1 : 1; return new THREE.Vector3(s * (0.8 + r() * 0.04), 0.7 + r() * 1.0, 0.07); }
    const s = r() < 0.5 ? -1 : 1, a = r() * 6.28, e = 0.3 + r() * 0.9;
    return new THREE.Vector3(s * 0.88 + Math.cos(a) * Math.cos(e) * 0.22, 1.02 + Math.sin(e) * 0.21, 0.62 + Math.sin(a) * Math.cos(e) * 0.22);
  },
};
const FOUNT = { rim: 0.375, R: 1.02, water: 0.28, frogs: [1, 3, 5, 7].map(k => k * Math.PI / 4), bath: false, kinds: ['chaffinch', 'robin', 'chaffinch'] };
function smallBird(kind, grade) {
  const C = kind === 'robin' ? { back: '#7d6248', belly: '#ea6a32', head: '#7d6248', cap: '#7d6248', face: '#ea6a32', wing: '#6e5540' }
    : kind === 'blackbird' ? { back: '#1f1d1c', belly: '#262422', head: '#1f1d1c', cap: '#1a1918', face: '#262422', wing: '#161514' }      // (the orchard's blackbird: black all over, an orange beak)
    : { back: '#8a7a6a', belly: '#d9907a', head: '#7f93a8', cap: '#6b84a3', face: '#d9907a', wing: '#4a4f4a' };
  const mats = {}; const mat = c => mats[c] || (mats[c] = (m => { if (grade) grade(m); return m; })(new THREE.MeshLambertMaterial({ color: c })));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1, to = body) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; to.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 12, 9);
  add(S, C.back, 0, 0.047, -0.006, 0.03, 0.028, 0.045); add(S, C.belly, 0, 0.04, 0.01, 0.027, 0.025, 0.033);
  const head = new THREE.Group(); head.position.set(0, 0.074, 0.028); body.add(head);
  add(S, C.head, 0, 0, 0, 0.022, 0.021, 0.022, head); add(S, C.cap, 0, 0.011, -0.002, 0.019, 0.011, 0.019, head);
  add(S, C.face, 0, -0.004, 0.012, 0.015, 0.013, 0.012, head);
  add(new THREE.ConeGeometry(1, 1, 6).rotateX(Math.PI / 2), kind === 'robin' ? '#2a2420' : kind === 'blackbird' ? '#f2a03a' : '#b9a48a', 0, -0.001, 0.027, 0.0055, 0.0055, 0.014, head);
  for (const s of [-1, 1]) add(S, '#111', s * 0.014, 0.005, 0.012, 0.0045, 0.0045, 0.0045, head);
  const tail = add(new THREE.BoxGeometry(1, 1, 1), C.wing, 0, 0.05, -0.06, 0.02, 0.005, 0.045); tail.rotation.x = -0.35;
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.024, 0.058, 0); body.add(w); add(S, C.wing, s * 0.004, -0.008, -0.008, 0.007, 0.019, 0.036, w); if (kind !== 'robin') add(S, '#f2efe6', s * 0.007, -0.006, 0.006, 0.004, 0.006, 0.012, w); return w; });
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.0018, 0.0018, 0.03, 4), '#5a4a3a', s * 0.008, 0.015, 0);
  g.userData = { body, head, tail, wings };
  g.scale.setScalar(1.35);                                                 // (a touch bigger than life, to be seen)
  return g;
}
class BathBirds {
  constructor(parent, grade, r, splash, spot = BATH) {
    this.r = r; this.splash = splash; this.list = []; this.S = spot;
    for (const [i, kind] of spot.kinds.entries()) { const g = smallBird(kind, grade); g.visible = false; parent.add(g); this.list.push({ kind, g, st: 'away', t: 3 + i * 7 + r() * 6, a: 0 }); }
  }
  angle(b) {
    if (this.S.frogs) {                                                    // (the fountain: between the frogs, mostly at its sides, seen side on (the back's hidden by the bowls))
      const d = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));
      for (let k = 0; k < 20; k++) {
        const x = this.r(), a = (x < 0.4 ? 0 : x < 0.8 ? 1 : x < 0.95 ? 0.5 : 1.5) * Math.PI + (this.r() - 0.5) * 0.5;
        if (this.S.frogs.every(f => d(f, a) > 0.4) && this.list.every(o => o === b || o.st === 'away' || d(o.a, a) > 0.5)) return a;
      }
      return null;
    }                                                               // (a spot on the rim clear of the tit and the other bird; mostly at the back,
                                                                           // facing the player)
    for (let k = 0; k < 20; k++) {
      const a = this.r() < 0.75 ? Math.PI * (1.1 + this.r() * 0.8) : this.r() * 6.28, d = q => Math.abs(Math.atan2(Math.sin(q - a), Math.cos(q - a)));
      if (d(BATH.tit) > 0.75 && this.list.every(o => o === b || o.st === 'away' || d(o.a) > 1.3)) return a;
    }
    return null;
  }
  update(dt, day, time) {
    for (const b of this.list) {
      b.t -= dt;
      const U = b.g.userData;
      if (b.st === 'away') {
        b.g.visible = false;
        if (b.t <= 0) {
          const a = day > 0.6 ? this.angle(b) : null;
          if (a === null) { b.t = 4; continue; }
          b.a = a; const c = Math.cos(a), s = Math.sin(a), far = a + (this.r() - 0.5) * 1.2;
          b.from = new THREE.Vector3(Math.cos(far) * 4, 2.6, Math.sin(far) * 4); b.on = new THREE.Vector3(c * this.S.R, this.S.rim, s * this.S.R);
          b.st = 'in'; b.t = b.dur = 1.7;
        }
        continue;
      }
      b.g.visible = true;
      let flap = 0, peck = 0, bob = 0, look = 0;
      if (b.st === 'in' || b.st === 'off') {                             // (flying in from afar, or off again)
        const u = 1 - Math.max(0, b.t) / b.dur, A = b.st === 'in' ? b.from : b.on, B = b.st === 'in' ? b.on : b.to;
        const e = b.st === 'in' ? 1 - (1 - u) * (1 - u) : u * u;
        b.g.position.lerpVectors(A, B, e); b.g.position.y += Math.sin(e * Math.PI) * 0.3;
        b.g.rotation.y = Math.atan2(B.x - A.x, B.z - A.z); flap = 0.5 + 0.5 * Math.sin(time * 40);
        if (b.t <= 0) { if (b.st === 'in') { b.st = 'rim'; b.t = this.S.bath ? 1.8 + this.r() * 1.8 : 4 + this.r() * 4; } else { b.st = 'away'; b.t = 6 + this.r() * 12; } }
      } else if (b.st === 'rim') {                                       // (on the rim: a look round, a sip or two)
        b.g.position.copy(b.on); b.g.rotation.y = Math.atan2(-b.on.x, -b.on.z) + Math.sin(time * 1.7 + b.a) * 0.6;
        look = Math.sin(time * 3.1) * 0.4; peck = smooth(0.6, 0.9, Math.sin(time * 4.2 + b.a));
        if (!this.S.bath) {                                              // (at the fountain: sips, head right down, a look round between)
          b.g.rotation.y = Math.atan2(-b.on.x, -b.on.z) + Math.sin(time * 0.8 + b.a) * 0.35;
          const sip = smooth(0.55, 0.95, Math.sin(time * 1.9 + b.a * 3)); peck = sip * 1.35; look = (1 - sip) * Math.sin(time * 2.3 + b.a) * 0.5;
          if (b.t <= 0) { b.st = 'off'; b.t = b.dur = 1.7; const a = b.a + (this.r() - 0.5) * 1.4; b.to = new THREE.Vector3(Math.cos(a) * 4.5, 2.7, Math.sin(a) * 4.5); }
        } else if (b.t <= 0) { b.st = 'hop'; b.t = b.dur = 0.35; b.at = new THREE.Vector3(Math.cos(b.a) * 0.24, this.S.water - 0.028, Math.sin(b.a) * 0.24); }
      } else if (b.st === 'hop') {                                       // (a hop down into the water)
        const u = 1 - Math.max(0, b.t) / b.dur; b.g.position.lerpVectors(b.on, b.at, u); b.g.position.y += Math.sin(u * Math.PI) * 0.06; flap = 0.6;
        if (b.t <= 0) { b.st = 'bath'; b.t = 2.6 + this.r() * 1.6; this.splash(b.g.position, 6); }
      } else if (b.st === 'bath') {                                      // (in the water: a splashy bath, wings beating, a turn or two)
        b.g.position.copy(b.at); b.g.rotation.y = Math.sin(time * 0.9 + b.a * 3) * 1.3;          // (turning about, mostly towards the player)
        flap = Math.abs(Math.sin(time * 17)); bob = Math.sin(time * 14) * 0.006; peck = 0.5 + 0.5 * Math.sin(time * 9);
        if ((b.drip = (b.drip || 0) - dt) <= 0) { b.drip = 0.12 + this.r() * 0.12; this.splash(b.g.position, 2 + Math.floor(this.r() * 3)); }
        if (b.t <= 0) { b.st = 'up'; b.t = b.dur = 0.35; }
      } else if (b.st === 'up') {                                        // (a hop back up on the rim)
        const u = 1 - Math.max(0, b.t) / b.dur; b.g.position.lerpVectors(b.at, b.on, u); b.g.position.y += Math.sin(u * Math.PI) * 0.06; flap = 0.6;
        if (b.t <= 0) { b.st = 'shake'; b.t = 1.1; b.g.rotation.y = Math.atan2(b.on.x, b.on.z); }
      } else if (b.st === 'shake') {                                     // (a shake of the feathers, a few drops flying)
        b.g.position.copy(b.on); U.body.rotation.z = Math.sin(time * 45) * 0.22 * Math.min(1, b.t * 2);
        if (b.t > 0.6 && Math.sin(time * 45) > 0.9) this.splash(b.g.position.clone().setY(b.on.y + 0.06), 1);
        if (b.t <= 0) { U.body.rotation.z = 0; b.st = 'off'; b.t = b.dur = 1.7; const a = b.a + (this.r() - 0.5) * 1.4; b.to = new THREE.Vector3(Math.cos(a) * 4.5, 2.7, Math.sin(a) * 4.5); }
      }
      if (day < 0.5 && (b.st === 'rim' || b.st === 'bath')) { b.st = 'off'; b.g.position.copy(b.on); b.t = b.dur = 1.7; b.to = new THREE.Vector3(Math.cos(b.a) * 4.5, 2.7, Math.sin(b.a) * 4.5); }
      U.body.position.y = bob; U.head.rotation.set(peck * 0.7, look, 0); U.body.rotation.x = peck * 0.35;
      U.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap * 1.2; });
      U.tail.rotation.x = -0.35 + Math.sin(time * 3) * 0.1 + peck * 0.25;
    }
  }
}

// ------------------------------------------------------------------ the Dovecote's doves (24 Nov 2026, Audrey: "Yes, put it in
// (Recommended)": "White doves fly round it now and then, land on its ledges"): four white doves on the landing ledges under
// its pigeon holes (grand.py dovecote_dec: the tower 0.72 round, the ledges 1.72 up and 0.79 out, at its holes, the ones
// facing the player and its sides; its own four doves sit still on the others and the roof); now and then by day they all
// take off one after another, circle the tower a lap or two, high and wide, wings beating then gliding, and each comes
// back down to a free ledge; perched, a look about, now and then a coo (her breast puffed, a bow); at night they're in
const TRACTOR_EXHAUST = [1.52, 1.6, 0.256];                       // (the top of its exhaust, in its own frame)
const DOVECOTE = { r: 0.79, y: 1.72, slots: [165, 195, 255, 345, 15, 135].map(d => d * Math.PI / 180) };
function whiteDove(grade) {
  const mats = {}; const mat = c => mats[c] || (mats[c] = (m => { if (grade) grade(m); return m; })(new THREE.MeshLambertMaterial({ color: c })));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1, to = body) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; to.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 12, 9), W = '#fbf8f1';
  add(S, W, 0, 0.058, -0.004, 0.04, 0.037, 0.064);
  const head = new THREE.Group(); head.position.set(0, 0.1, 0.05); body.add(head);
  add(S, W, 0, 0, 0, 0.026, 0.026, 0.027, head);
  add(new THREE.ConeGeometry(1, 1, 6).rotateX(Math.PI / 2), '#d99a9a', 0, -0.004, 0.03, 0.0055, 0.0055, 0.016, head);
  for (const sd of [-1, 1]) add(S, '#1c1a1a', sd * 0.017, 0.006, 0.013, 0.0045, 0.0045, 0.0045, head);
  const tail = add(new THREE.BoxGeometry(1, 1, 1), '#f2eee4', 0, 0.06, -0.075, 0.05, 0.008, 0.06); tail.rotation.x = -0.25;
  const wings = [-1, 1].map(sd => { const w = new THREE.Group(); w.position.set(sd * 0.03, 0.075, 0); body.add(w); add(S, '#f6f2e8', sd * 0.06, 0, -0.01, 0.065, 0.007, 0.038, w); return w; });
  for (const sd of [-1, 1]) add(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 4), '#d98a8a', sd * 0.012, 0.015, 0.005);
  g.userData = { body, head, tail, wings };
  g.scale.setScalar(1.3);
  return g;
}
class Doves {
  constructor(parent, grade, r, n = 4) {
    this.r = r; this.list = []; this.next = 6 + r() * 8; this.taken = new Set();
    for (let i = 0; i < n; i++) { const g = whiteDove(grade); parent.add(g); const d = { g, st: 'perch', slot: i, t: r() * 4, ph: r() * 6.28, coo: 2 + r() * 6 }; this.taken.add(i); this.list.push(d); this.sit(d); }
  }
  at(k, v = new THREE.Vector3()) { const a = DOVECOTE.slots[k]; return v.set(Math.cos(a) * DOVECOTE.r, DOVECOTE.y, -Math.sin(a) * DOVECOTE.r); }
  sit(d) { this.at(d.slot, d.g.position); d.g.rotation.set(0, Math.atan2(d.g.position.x, d.g.position.z), 0); }
  update(dt, day, time) {
    const L = this.list;
    if (day < 0.5) {                                                    // (in for the night: on their ledges again by morning)
      for (const d of L) { d.g.visible = false; if (d.st !== 'perch') { d.st = 'perch'; } }
      this.taken = new Set(L.map(d => d.slot)); for (const d of L) this.sit(d); this.next = 4 + this.r() * 8; return;
    }
    if (L.every(d => d.st === 'perch') && (this.next -= dt) <= 0) {   // (off they go, one after another)
      this.next = 24 + this.r() * 30; this.taken.clear(); const laps = 1 + this.r() * 1.2;
      L.forEach((d, i) => { d.st = 'wait'; d.t = i * (0.35 + this.r() * 0.3); d.laps = laps * 6.28 + i * 0.4; d.rc = 1.9 + this.r() * 0.5; d.h = 2.7 + this.r() * 0.6; d.w = 0.85 + this.r() * 0.15; });
    }
    for (const d of L) {
      const U = d.g.userData; d.g.visible = true; d.t -= dt;
      let flap = 0, bow = 0, look = 0;
      if (d.st === 'perch') {
        this.sit(d); d.g.rotation.y += Math.sin(time * 0.7 + d.ph) * 0.4;
        look = Math.sin(time * 1.9 + d.ph * 2) * 0.5;
        if ((d.coo -= dt) < 0) { if (d.coo < -1.2) d.coo = 3 + this.r() * 7; else bow = Math.sin((-d.coo / 1.2) * Math.PI); }      // (a coo: a puff and a bow)
      } else if (d.st === 'wait') {
        this.sit(d); if (d.t <= 0) { d.st = 'up'; d.t = d.dur = 1.1; d.from = d.g.position.clone(); d.th = Math.atan2(d.from.z, d.from.x); d.went = 0; }
      } else if (d.st === 'up' || d.st === 'circle') {                 // (up and round the tower, wings beating, then gliding a while)
        d.th -= d.w * dt; d.went += d.w * dt;
        const c = new THREE.Vector3(Math.cos(d.th) * d.rc, d.h + Math.sin(time * 1.3 + d.ph) * 0.12, Math.sin(d.th) * d.rc);
        if (d.st === 'up') { const u = 1 - Math.max(0, d.t) / d.dur, e = u * u * (3 - 2 * u); d.g.position.lerpVectors(d.from, c, e); if (d.t <= 0) d.st = 'circle'; }
        else d.g.position.copy(c);
        d.g.rotation.set(0, Math.atan2(Math.sin(d.th), -Math.cos(d.th)), -0.3);      // (heading along the circle, banked into it)
        flap = (Math.sin(time * 1.1 + d.ph) > -0.2 || d.st === 'up') ? 0.5 + 0.5 * Math.sin(time * 22 + d.ph) : 0.5;
        if (d.st === 'circle' && d.went >= d.laps) {                    // (back down to a free ledge, the nearest to it)
          let best = -1, bd = 1e9; const v = new THREE.Vector3();
          for (let k = 0; k < DOVECOTE.slots.length; k++) if (!this.taken.has(k)) { const dd = this.at(k, v).distanceTo(d.g.position); if (dd < bd) { bd = dd; best = k; } }
          d.slot = best; this.taken.add(best); d.st = 'down'; d.t = d.dur = 1.6; d.from = d.g.position.clone();
        }
      } else if (d.st === 'down') {
        const u = 1 - Math.max(0, d.t) / d.dur, e = 1 - (1 - u) * (1 - u), to = this.at(d.slot);
        d.g.position.lerpVectors(d.from, to, e); d.g.position.y += Math.sin(u * Math.PI) * 0.25;
        d.g.rotation.set(0, Math.atan2(to.x - d.from.x, to.z - d.from.z), 0); flap = u > 0.6 ? 0.5 + 0.5 * Math.sin(time * 26) : 0.5;
        if (d.t <= 0) { d.st = 'perch'; d.coo = 0.8 + this.r() * 2; }
      }
      U.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (d.st === 'perch' || d.st === 'wait' ? 1.35 : (flap - 0.5) * 1.4); });      // (folded down her sides; beating, or level gliding)
      U.head.rotation.set(bow * 0.6, look, 0); U.body.scale.set(1 + bow * 0.12, 1 + bow * 0.08, 1); U.body.rotation.x = bow * 0.25;
      U.tail.rotation.x = -0.25 + (d.st === 'perch' ? Math.sin(time * 2 + d.ph) * 0.05 : 0.2);
    }
  }
}

// ------------------------------------------------------------------ the Little Orchard (24 Nov 2026): now and then by day an
// apple drops from one of its three apple trees into the grass (a bounce, a little roll; gone after a while), and a blackbird
// drops in to hop about under the trees, pecking at the fallen fruit, and flies off again (grand.py orchard_dec, in its own
// frame: each apple tree's trunk x, z, its crown's middle and size; the meadow's top)
const ORCHARD = { trees: [[-1.05, 0.8, 1.4, 0.54], [1.05, 0.75, 1.365, 0.53], [1.05, -1.2, 1.47, 0.57]], ground: 0.02 };
class OrchardLife {
  constructor(parent, grade, r) {
    this.r = r; this.apples = []; this.next = 3 + r() * 6;
    const m = new THREE.MeshLambertMaterial({ color: '#c9302c' }); if (grade) grade(m);
    const geo = new THREE.SphereGeometry(0.052, 10, 8);
    for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(geo, m); a.castShadow = true; a.visible = false; parent.add(a); this.apples.push({ m: a, st: 'off', v: 0, t: 0, out: new THREE.Vector2() }); }
    this.bird = { g: smallBird('blackbird', grade), st: 'away', t: 6 + r() * 8, a: 0 }; this.bird.g.visible = false; parent.add(this.bird.g);
  }
  spot() {                                                              // (by a fallen apple, if there's one; else under a tree)
    const lie = this.apples.filter(a => a.st === 'rest'), r = this.r;
    if (lie.length && r() < 0.8) { const A = lie[Math.floor(r() * lie.length) % lie.length], a = r() * 6.28; return new THREE.Vector3(A.m.position.x + Math.cos(a) * 0.12, ORCHARD.ground, A.m.position.z + Math.sin(a) * 0.12); }
    const T = ORCHARD.trees[Math.floor(r() * 3) % 3], a = r() * 6.28, d = 0.35 + r() * 0.35;
    return new THREE.Vector3(T[0] + Math.cos(a) * d, ORCHARD.ground, T[1] + Math.sin(a) * d);
  }
  update(dt, day, time) {
    if (day > 0.5 && (this.next -= dt) <= 0) {                         // (an apple drops)
      this.next = 7 + this.r() * 12;
      const A = this.apples.find(a => a.st === 'off') || this.apples.reduce((x, y) => (x.t > y.t ? x : y));
      const T = ORCHARD.trees[Math.floor(this.r() * 3) % 3], a = this.r() * 6.28, rr = T[3] * (0.55 + this.r() * 0.3);
      A.m.position.set(T[0] + Math.cos(a) * rr, T[2] - T[3] * 0.45, T[1] + Math.sin(a) * rr); A.m.scale.setScalar(1); A.m.visible = true;
      A.st = 'fall'; A.v = 0; A.t = 0; A.bounced = false; A.out.set(Math.cos(a), Math.sin(a)).multiplyScalar(0.35 + this.r() * 0.25);
    }
    for (const A of this.apples) {
      if (A.st === 'off') continue;
      A.t += dt; const g = ORCHARD.ground + 0.05;
      if (A.st === 'fall') {
        A.v -= 9.8 * dt; A.m.position.y += A.v * dt;
        if (A.bounced) { A.m.position.x += A.out.x * dt; A.m.position.z += A.out.y * dt; A.m.rotation.x += dt * 5; }
        if (A.m.position.y <= g) { A.m.position.y = g; if (!A.bounced && A.v < -1) { A.v = -A.v * 0.28; A.bounced = true; } else { A.st = 'roll'; A.t = 0; } }
      } else if (A.st === 'roll') {                                     // (a little roll in the grass, slowing)
        const k = Math.max(0, 1 - A.t / 0.7); A.m.position.x += A.out.x * k * dt; A.m.position.z += A.out.y * k * dt; A.m.rotation.x += dt * 5 * k;
        if (k <= 0) { A.st = 'rest'; A.t = 0; }
      } else if (A.st === 'rest' && A.t > 40) { const k = Math.max(0, 1 - (A.t - 40) / 1.5); A.m.scale.setScalar(Math.max(0.01, k)); if (k <= 0) { A.st = 'off'; A.m.visible = false; } }
    }
    const B = this.bird, U = B.g.userData; B.t -= dt;                   // the blackbird
    if (B.st === 'away') {
      B.g.visible = false;
      if (B.t <= 0) {
        if (day < 0.6) { B.t = 5; return; }
        B.on = this.spot(); const far = this.r() * 6.28; B.from = new THREE.Vector3(Math.cos(far) * 5, 3.2, Math.sin(far) * 5);
        B.st = 'in'; B.t = B.dur = 1.8; B.hops = 2 + Math.floor(this.r() * 3);
      }
      return;
    }
    B.g.visible = true;
    let flap = 0, peck = 0, look = 0;
    if (B.st === 'in' || B.st === 'off' || B.st === 'hop') {
      const u = 1 - Math.max(0, B.t) / B.dur, A = B.st === 'off' ? B.on : B.from, Z = B.st === 'off' ? B.to : B.on;
      const e = B.st === 'in' ? 1 - (1 - u) * (1 - u) : B.st === 'off' ? u * u : u;
      B.g.position.lerpVectors(A, Z, e); B.g.position.y += Math.sin(e * Math.PI) * (B.st === 'hop' ? 0.08 : 0.4);
      B.g.rotation.y = Math.atan2(Z.x - A.x, Z.z - A.z); flap = B.st === 'hop' ? 0.4 : 0.5 + 0.5 * Math.sin(time * 40);
      if (B.t <= 0) {
        if (B.st === 'off') { B.st = 'away'; B.t = 14 + this.r() * 20; }
        else { B.st = 'peck'; B.t = 1.4 + this.r() * 1.8; }
      }
    } else if (B.st === 'peck') {                                       // (pecking at the fruit, a look about between)
      B.g.position.copy(B.on); peck = smooth(0.5, 0.9, Math.sin(time * 5.5 + B.a)); look = (1 - peck) * Math.sin(time * 2.7) * 0.5;
      if (B.t <= 0 || day < 0.5) {
        if (B.hops-- > 0 && day >= 0.5) { B.from = B.on.clone(); const a = this.r() * 6.28; B.on = B.on.clone().add(new THREE.Vector3(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22)); B.st = 'hop'; B.t = B.dur = 0.35; }
        else { const a = this.r() * 6.28; B.to = new THREE.Vector3(Math.cos(a) * 5, 3.4, Math.sin(a) * 5); B.st = 'off'; B.t = B.dur = 1.7; }
      }
    }
    U.head.rotation.set(peck * 0.9, look, 0); U.body.rotation.x = peck * 0.4;
    U.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap * 1.2; });
    U.tail.rotation.x = -0.35 + Math.sin(time * 3) * 0.1 + peck * 0.3;
  }
}

// ------------------------------------------------------------------ the Tree House (24 Nov 2026): a red squirrel lives in its oak.
// By day now and then it comes down the trunk head first, leaps onto the deck's right-hand railing, runs along it and sits
// up there nibbling a nut, its tail curled over its back; back to the trunk, down to the grass, a few bounds out in front
// and a sit-up to look about; back and up the trunk into the leaves (grand.py tree_house_dec, in its own frame: the
// trunk at x 0, z -0.9, its girth by height; the railing's top; a spot on the grass in front)
const TREEHOUSE = { trunk: [0, -0.9], r: h => 0.345 - 0.04 * h, side: -0.35, crown: 2.75, low: 1.6, railBack: [0.92, 2.08, -0.5], railSit: [0.92, 2.08, 0.02], grass: [0.45, 0.02, 1.2] };
function redSquirrel(grade) {
  const mats = {}; const mat = c => mats[c] || (mats[c] = (m => { if (grade) grade(m); return m; })(new THREE.MeshLambertMaterial({ color: c })));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1, to = body) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; to.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 12, 9), RED = '#b9582c', TAIL = '#c4652f', CREAM = '#f1e3c8';
  add(S, RED, 0, 0.05, 0, 0.036, 0.036, 0.06); add(S, CREAM, 0, 0.04, 0.012, 0.028, 0.026, 0.045);
  const head = new THREE.Group(); head.position.set(0, 0.078, 0.055); body.add(head);
  add(S, RED, 0, 0, 0, 0.028, 0.027, 0.031, head); add(S, '#c96f3c', 0, -0.006, 0.026, 0.015, 0.014, 0.016, head);
  add(S, '#2a1d18', 0, -0.004, 0.04, 0.005, 0.004, 0.004, head);
  for (const sd of [-1, 1]) {
    add(S, '#14100e', sd * 0.017, 0.007, 0.018, 0.0055, 0.006, 0.005, head);
    const ear = add(new THREE.ConeGeometry(1, 1, 6), RED, sd * 0.014, 0.03, -0.006, 0.008, 0.026, 0.006, head); ear.rotation.z = -sd * 0.25;
    add(new THREE.ConeGeometry(1, 1, 5), '#7e351a', sd * 0.016, 0.047, -0.006, 0.004, 0.014, 0.004, head);      // (its ear tufts)
  }
  const paws = new THREE.Group(); paws.position.set(0, 0.05, 0.05); body.add(paws);
  for (const sd of [-1, 1]) add(S, RED, sd * 0.012, 0, 0, 0.008, 0.016, 0.008, paws);
  const nut = add(S, '#7a5230', 0, 0.012, 0.012, 0.011, 0.012, 0.011, paws); nut.visible = false;
  for (const sd of [-1, 1]) add(S, RED, sd * 0.024, 0.022, -0.03, 0.014, 0.02, 0.026);      // (its haunches)
  const tail = new THREE.Group(); tail.position.set(0, 0.05, -0.055); body.add(tail);
  const bits = [];
  for (let i = 0; i < 6; i++) { const u = i / 5; bits.push(add(S, i % 2 ? TAIL : RED, 0, 0.02 + u * 0.12, -0.03 - Math.sin(u * Math.PI) * 0.045 + u * 0.03, 0.024 + Math.sin(u * Math.PI) * 0.01, 0.03, 0.026 + Math.sin(u * Math.PI) * 0.008, tail)); }
  g.userData = { body, head, tail, paws, nut, bits };
  g.scale.setScalar(1.45);                                                 // (a touch bigger than life, to be seen)
  return g;
}
class TreeHouseLife {
  constructor(parent, grade, r) {
    this.r = r; this.g = redSquirrel(grade); this.g.visible = false; parent.add(this.g);
    this.st = 'away'; this.t = 4 + r() * 8; this.dur = 1; this.from = new THREE.Vector3(); this.to = new THREE.Vector3(); this.n = 0;
    this._m = new THREE.Matrix4(); this._x = new THREE.Vector3(); this._y = new THREE.Vector3(); this._z = new THREE.Vector3();
  }
  bark(h) { const T = TREEHOUSE, r = T.r(h); return new THREE.Vector3(T.trunk[0] + Math.cos(T.side) * r, h, T.trunk[1] - Math.sin(T.side) * r); }
  out() { return this._y.set(Math.cos(TREEHOUSE.side), 0, -Math.sin(TREEHOUSE.side)); }
  face(fwd, up) {                                                       // (its nose along fwd, its back towards up)
    const z = this._z.copy(fwd).normalize(), y = this._y.copy(up).addScaledVector(z, -up.dot(z)).normalize(), x = this._x.crossVectors(y, z);
    this.g.quaternion.setFromRotationMatrix(this._m.makeBasis(x, y, z));
  }
  go(st, dur, to) { this.st = st; this.t = this.dur = dur; this.from.copy(this.g.position); if (to) this.to.copy(to); }
  update(dt, day, time) {
    const T = TREEHOUSE, U = this.g.userData, r = this.r; this.t -= dt;
    const u = 1 - Math.max(0, this.t) / this.dur, e = u * u * (3 - 2 * u);
    let pitch = 0, look = 0, nod = 0, tail = 0.25 * Math.sin(time * 2.1), hold = false;
    if (this.st === 'away') {
      this.g.visible = false;
      if (this.t <= 0) { if (day < 0.6) { this.t = 5; return; } this.g.position.copy(this.bark(T.crown)); this.g.visible = true; this.n = 1 + Math.floor(r() * 2); this.go('down', 1.7, this.bark(T.low)); }
      return;
    }
    if (this.st === 'down' || this.st === 'up' || this.st === 'down2') {      // (on the bark: head first down, head first up)
      this.g.position.lerpVectors(this.from, this.to, e);
      this.face(this._z.set(0, this.st === 'up' ? 1 : -1, 0), this.out().clone());
      pitch = Math.sin(time * 18) * 0.12; tail = 0.5 + Math.sin(time * 9) * 0.25;
      if (this.t <= 0) {
        if (this.st === 'down') this.go('leap', 0.5, new THREE.Vector3(...T.railBack));
        else if (this.st === 'down2') this.go('bound', 1.5, new THREE.Vector3(...T.grass));
        else { this.st = 'away'; this.t = 12 + r() * 22; this.g.visible = false; }
      }
    } else if (this.st === 'leap' || this.st === 'leapback') {      // (a leap between the trunk and the railing)
      this.g.position.lerpVectors(this.from, this.to, u); this.g.position.y += Math.sin(u * Math.PI) * 0.18;
      this.face(this._z.subVectors(this.to, this.from).setY(0), this._x.set(0, 1, 0));
      pitch = -0.5 + u; tail = 0.9;
      if (this.t <= 0) {
        if (this.st === 'leap') this.go('rail', 0.9, new THREE.Vector3(...T.railSit));
        else this.go('down2', 1.6, this.bark(0.04));
      }
    } else if (this.st === 'rail' || this.st === 'railback' || this.st === 'bound' || this.st === 'home') {      // (a scamper: bounding)
      this.g.position.lerpVectors(this.from, this.to, e); this.g.position.y += Math.abs(Math.sin(u * Math.PI * (this.st === 'bound' || this.st === 'home' ? 5 : 3))) * 0.05;
      this.face(this._z.subVectors(this.to, this.from).setY(0), this._x.set(0, 1, 0));
      pitch = Math.sin(u * Math.PI * 8) * 0.2; tail = 0.6 + Math.sin(time * 12) * 0.2;
      if (this.t <= 0) {
        if (this.st === 'rail') { this.go('sit', 4 + r() * 3); U.nut.visible = true; }
        else if (this.st === 'railback') this.go('leapback', 0.5, this.bark(T.low));
        else if (this.st === 'bound') this.go('look', 2.5 + r() * 2);
        else this.go('up', 2.2, this.bark(T.crown));
      }
    } else if (this.st === 'sit' || this.st === 'look') {      // (sat up: nibbling its nut on the railing, looking about on the grass)
      this.g.position.copy(this.from);
      this.face(this._z.set(this.st === 'sit' ? 0.7 : -0.4, 0, this.st === 'sit' ? 0.7 : 1), this._x.set(0, 1, 0));
      pitch = -0.95; hold = this.st === 'sit'; tail = 1.25 + Math.sin(time * 1.3) * 0.08 + (Math.sin(time * 0.9) > 0.93 ? Math.sin(time * 30) * 0.15 : 0);
      if (hold) nod = Math.max(0, Math.sin(time * 14)) * 0.18; else look = Math.sin(time * 1.1) * 0.7;
      if (this.t <= 0) {
        U.nut.visible = false;
        if (this.st === 'sit') this.go('railback', 0.8, new THREE.Vector3(...T.railBack));
        else if (--this.n > 0) { const a = r() * 6.28; this.go('bound', 0.9, new THREE.Vector3(T.grass[0] + Math.cos(a) * 0.35, T.grass[1], T.grass[2] + Math.sin(a) * 0.3)); }
        else this.go('home', 1.5, this.bark(0.04));
      }
    }
    U.body.rotation.x = pitch; U.head.rotation.set(-pitch * 0.8 + nod, look, 0); U.tail.rotation.x = tail;
    U.paws.rotation.x = hold || this.st === 'look' ? -1.1 : 0; U.paws.position.y = hold ? 0.06 : 0.05;
  }
}

// ------------------------------------------------------------------ the Hot-Air Balloon (24 Nov 2026): it bobs gently on its
// ropes (main.js balloonMove moves its balloon and basket by `s`), its pennant flutters, and now and then (every 10 to 24 s)
// its burner puffs a flame for a second or so, up into the envelope's mouth, a warm glow on the dark (grand.py
// hot_air_balloon_dec, in its own frame: the burner's top BALLOON_BURNER, the balloon's floor BALLOON_LIFT up)
export function balloonSway(t) { return { y: Math.sin(t * 0.9) * 0.035 + Math.sin(t * 0.37) * 0.015, rx: Math.sin(t * 0.7) * 0.012, rz: Math.sin(t * 0.53 + 1) * 0.012, flag: Math.sin(t * 5.3) * 0.25 + Math.sin(t * 8.1) * 0.1 - 0.15 }; }
const BALLOON_BURNER = 1.75;
class BalloonLife {
  constructor(parent, r) {
    this.r = r; this.t = r() * 20; this.next = 4 + r() * 6; this.on = 0; this.s = balloonSway(this.t);
    const outer = new THREE.MeshBasicMaterial({ color: '#ff9a2e', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const inner = new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flame = new THREE.Group(); this.flame.visible = false; parent.add(this.flame);
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.36, 10, 1, true), outer); a.position.y = 0.18;
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 8, 1, true), inner); b.position.y = 0.11;
    this.flame.add(a, b); this.flame.renderOrder = 3;
  }
  update(dt) {
    this.t += dt; this.s = balloonSway(this.t);
    if (this.on > 0) this.on -= dt;
    else if ((this.next -= dt) <= 0) { this.next = 10 + this.r() * 14; this.on = 1.1 + this.r() * 0.6; }
    const k = this.on > 0 ? Math.min(1, this.on / 0.25, (1.6 - this.on) / 0.12) : 0, F = this.flame;
    F.visible = k > 0.02;
    if (F.visible) {
      F.position.set(0, BALLOON_BURNER + this.s.y, 0); F.rotation.set(this.s.rx, 0, this.s.rz);
      const f = 0.85 + Math.sin(this.t * 37) * 0.1 + Math.sin(this.t * 23) * 0.08;
      F.scale.set(k * f, k * (0.8 + 0.3 * f), k * f);
    }
  }
}

// ------------------------------------------------------------------ sprites: a glint of sun, music notes, water drops
class Floaters {
  constructor(scene, maps, max, grade) { this.scene = scene; this.maps = [].concat(maps); this.pool = []; this.max = max; this.grade = grade; }
  spawn(at, size, life, drift, o = {}) {
    let n = this.pool.find(q => q.life <= 0);
    if (!n) {
      if (this.pool.length >= this.max) return null;
      n = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })), life: 0, v: new THREE.Vector3() };
      if (this.grade && !o.glow) this.grade(n.sp.material);
      n.sp.renderOrder = 4; this.scene.add(n.sp); this.pool.push(n);
    }
    n.sp.material.map = this.maps[o.map || 0]; n.sp.material.needsUpdate = true;
    n.sp.position.copy(at); n.size = size; n.life = n.full = life; n.v.copy(drift); n.fall = o.fall || 0; n.pulse = !!o.pulse; n.spin = o.spin || 0; n.grow = o.grow || 0;
    n.sp.visible = true; n.sp.scale.setScalar(1e-4); return n;
  }
  update(dt) {
    for (const n of this.pool) {
      if (n.life <= 0) continue;
      n.life -= dt; if (n.life <= 0) { n.sp.visible = false; continue; }
      const t = 1 - n.life / n.full;
      n.v.y -= n.fall * dt; n.sp.position.addScaledVector(n.v, dt);
      const s = n.size * (n.pulse ? Math.sin(t * Math.PI) : Math.min(1, t * 6)) * (1 + n.grow * t); n.sp.scale.set(s, s, s);
      n.sp.material.opacity = n.pulse ? 1 : Math.min(1, (1 - t) * 2.5);
      n.sp.material.rotation = n.pulse ? t * 1.4 : Math.sin(t * 5 + n.spin) * 0.25;
    }
  }
  get live() { return this.pool.filter(n => n.life > 0).length; }
}

export class DecorLife {
  // decor: [{ model, m (world matrix), box (its own frame) }]; o: { grade(material), hour(), toCam (towards the camera) }; r(): random
  constructor(scene, decor, o, r) {
    this.o = o; this.r = r; this.time = 0;
    const frame = d => { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.copy(d.m); g.matrixWorld.copy(d.m); scene.add(g); return g; };
    const glint = tex(c => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,238,170,0.55)'); g.addColorStop(1, 'rgba(255,230,150,0)');
      c.fillStyle = g; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(255,255,248,0.95)';
      c.beginPath(); c.moveTo(32, 1); c.lineTo(35, 29); c.lineTo(63, 32); c.lineTo(35, 35); c.lineTo(32, 63); c.lineTo(29, 35); c.lineTo(1, 32); c.lineTo(29, 29); c.closePath(); c.fill();
    });
    const NOTE_COL = ['#7a3fa0', '#2f6db3', '#2e8b57', '#24305e'];          // (no red: over the bandstand's red roof)
    const notes = NOTE_COL.map((col, i) => tex(c => {                     // (a quaver, or two joined: in four colours, edged in cream)
      const two = i % 2;
      const path = () => {
        c.beginPath();
        if (two) { for (const x of [16, 44]) { c.moveTo(x + 10, 46); c.ellipse(x, 46, 10, 7, -0.35, 0, Math.PI * 2); } c.moveTo(25, 45); c.lineTo(25, 12); c.lineTo(53, 8); c.lineTo(53, 41); }
        else { c.moveTo(35, 44); c.ellipse(24, 44, 11, 8, -0.35, 0, Math.PI * 2); c.moveTo(33, 41); c.lineTo(33, 10); c.quadraticCurveTo(46, 18, 48, 30); }
      };
      c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = '#fff4d6'; c.fillStyle = '#fff4d6'; path(); c.stroke(); c.fill();
      c.lineWidth = 4; c.strokeStyle = col; c.fillStyle = col; path(); c.stroke(); c.fill();
    }));
    const drop = tex(c => { const g = c.createRadialGradient(32, 28, 0, 32, 32, 28); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(210,235,255,0.85)'); g.addColorStop(1, 'rgba(190,225,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    this.glints = new Floaters(scene, glint, 4); this.notes = new Floaters(scene, notes, 20, o.grade); this.drops = new Floaters(scene, drop, 40, o.grade);
    const petal = ['#e0507a', '#f4b8c6', '#c22a44'].map(col => tex(c => {          // (a rose petal: a rounded teardrop, a paler edge)
      c.beginPath(); c.moveTo(32, 58); c.bezierCurveTo(6, 40, 10, 8, 32, 6); c.bezierCurveTo(54, 8, 58, 40, 32, 58); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,240,245,0.55)'; c.stroke();
    }));
    this.petals = new Floaters(scene, petal, 14, o.grade);
    const smoke = tex(c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(120,120,124,0.85)'); g.addColorStop(0.55, 'rgba(150,150,154,0.5)'); g.addColorStop(1, 'rgba(170,170,174,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    this.smoke = new Floaters(scene, smoke, 16, o.grade);
    for (const d of decor) {
      if (d.model === 'beehives') this.bees = new Bees(frame(d), o.grade, r);
      if (d.model === 'flowers') this.flies = new Butterflies(frame(d), o.grade, r);
      if (d.model === 'birdbath') { const f = frame(d); this.bath = new BathBirds(f, o.grade, r, (p, n) => this.splash(f.localToWorld(p.clone()), n)); }
      if (d.model === 'fountain') { const f = frame(d); this.fount = { f, birds: new BathBirds(f, o.grade, r, (p, n) => this.splash(f.localToWorld(p.clone()), n), FOUNT), dropIn: 0 }; }
      if (d.model === 'rose_arbour') { const f = frame(d); this.arbour = { f, flies: new Butterflies(f, o.grade, r, 3, ARBOUR.rose), petalIn: 0.5 }; }
      if (d.model === 'dovecote') this.doves = new Doves(frame(d), o.grade, r);
      if (d.model === 'tractor') this.tractor = { f: frame(d), next: 8 + r() * 10, run: 0, puffIn: 0, jig: { on: false, x: 0, y: 0, roll: 0 } };
      if (d.model === 'orchard') this.orchard = new OrchardLife(frame(d), o.grade, r);
      if (d.model === 'tree_house') this.treeHouse = new TreeHouseLife(frame(d), o.grade, r);
      if (d.model === 'hot_air_balloon') this.balloon = new BalloonLife(frame(d), r);
      if (d.model === 'statue') this.statue = d;
      if (d.model === 'bandstand') this.band = d;
    }
    this.glintIn = 1.5; this.noteIn = 0; this.tune = 0; this._v = new THREE.Vector3(); this._d = new THREE.Vector3(); this._r = new THREE.Matrix3();
  }
  splash(at, n = 3) {
    for (let i = 0; i < n; i++) { const a = this.r() * 6.28, s = 0.25 + this.r() * 0.35; this.drops.spawn(at.clone().add(this._v.set(0, 0.03, 0)), 0.022 + this.r() * 0.012, 0.45 + this.r() * 0.2, this._d.set(Math.cos(a) * s, 0.7 + this.r() * 0.6, Math.sin(a) * s), { fall: 4.5 }); }
  }
  // a tap on the bandstand: a little tune (notes tumbling out of it for a few seconds)
  play() { this.tune = 4.5; this.noteIn = 0; }
  dayAt(h) { return smooth(6.3, 7.2, h) * (1 - smooth(19.6, 20.4, h)); }
  evening(h) { return h >= 17.5 && h < 21.5; }
  update(dt) {
    this.time += dt;
    const h = this.o.hour(), day = this.dayAt(h), t = this.time;
    if (this.bees) this.bees.update(dt, day, t);
    if (this.flies) this.flies.update(dt, day, t);
    if (this.bath) this.bath.update(dt, day, t);
    if (this.doves) this.doves.update(dt, day, t);
    if (this.orchard) this.orchard.update(dt, day, t);
    if (this.treeHouse) this.treeHouse.update(dt, day, t);
    if (this.balloon) this.balloon.update(dt);
    // (the Red Tractor, 24 Nov 2026: now and then by day its engine putters for a few seconds: a little shake (main.js moves
    // it by jig), puffs of smoke from its exhaust, its top at TRACTOR_EXHAUST in its own frame (grand.py tractor_dec))
    if (this.tractor) {
      const T = this.tractor, J = T.jig;
      if (T.run > 0) {
        T.run -= dt; const k = Math.min(1, T.run / 0.6, (5.5 - T.run) / 0.3);
        J.on = T.run > 0; J.x = Math.sin(t * 61) * 0.006 * k; J.y = Math.abs(Math.sin(t * 47)) * 0.008 * k; J.roll = Math.sin(t * 53) * 0.004 * k;
        if ((T.puffIn -= dt) <= 0) {
          T.puffIn = 0.16 + this.r() * 0.12;
          const p = T.f.localToWorld(this._v.set(TRACTOR_EXHAUST[0], TRACTOR_EXHAUST[1] + 0.03, TRACTOR_EXHAUST[2]));
          this.smoke.spawn(p, 0.09 + this.r() * 0.04, 1.4 + this.r() * 0.6, this._d.set((this.r() - 0.5) * 0.12 + 0.08, 0.55 + this.r() * 0.25, (this.r() - 0.5) * 0.12), { spin: this.r() * 6, grow: 2.2 });
        }
      } else if (J.on) { J.on = false; J.x = J.y = J.roll = 0; }
      else if (day > 0.6 && (T.next -= dt) <= 0) { T.next = 22 + this.r() * 30; T.run = 5.5; T.puffIn = 0; }
    }
    if (this.arbour) {                                                    // (the arbour: its butterflies by day; now and then a petal drifting down)
      this.arbour.flies.update(dt, day, t);
      if ((this.arbour.petalIn -= dt) <= 0) {
        this.arbour.petalIn = 1.1 + this.r() * 2.2;
        const p = this.arbour.f.localToWorld(ARBOUR.rose(this.r)), fall = 0.16 + this.r() * 0.08, a = this.r() * 6.28, s = 0.05 + this.r() * 0.06;
        this.petals.spawn(p, 0.045 + this.r() * 0.015, Math.max(1.5, (p.y - this.arbour.f.matrixWorld.elements[13] - 0.06) / fall), this._d.set(Math.cos(a) * s, -fall, Math.sin(a) * s), { map: Math.floor(this.r() * 3), spin: this.r() * 6 });
      }
    }
    if (this.fount) {                                                     // (the fountain: its birds; now and then a drop jumping up where its water falls in)
      this.fount.birds.update(dt, day, t);
      if ((this.fount.dropIn -= dt) <= 0) {
        this.fount.dropIn = 0.18 + this.r() * 0.3;
        const a = this.r() * 6.28, top = this.r() < 0.3, R = top ? 0.37 : 0.69;
        this.splash(this.fount.f.localToWorld(this._v.set(Math.cos(a) * R, top ? 1.08 : 0.29, Math.sin(a) * R)), 1);
      }
    }
    // the cockerel catching the sun: a sparkle somewhere on him, now and then
    if (this.statue && day > 0.7 && (this.glintIn -= dt) <= 0) {
      this.glintIn = 1.8 + this.r() * 3.5;
      // (a point in him, brought towards the player along the line of sight: the same place on screen, over him)
      const p = this._v.set(lerp(-0.22, 0.22, this.r()), lerp(1.3, 2.25, this.r()), lerp(-0.15, 0.15, this.r())).applyMatrix4(this.statue.m).addScaledVector(this.o.toCam, 0.9);
      this.glints.spawn(p, 0.26 + this.r() * 0.14, 0.75, this._d.set(0, 0, 0), { pulse: true, glow: true });
    }
    // the bandstand's music: of an evening, or a tune when tapped; the notes come out at the front (towards the player)
    // and drift up and away
    if (this.band) {
      if (this.tune > 0) this.tune -= dt;
      if ((this.evening(h) || this.tune > 0) && (this.noteIn -= dt) <= 0) {
        this.noteIn = this.tune > 0 ? 0.22 + this.r() * 0.2 : 0.8 + this.r() * 1.2;
        // (from under the eaves at the front, just outside the roof's edge, so they float up over it into the sky and never
        // go behind it; up, and a little to the side)
        const a = (this.r() - 0.5) * 2.8, R = 1.85 + this.r() * 0.1;
        const p = this._v.set(Math.sin(a) * R, 2.2 + this.r() * 0.5, Math.cos(a) * R).applyMatrix4(this.band.m);
        const dir = this._d.set(Math.sin(a) * 0.08 + (this.r() - 0.5) * 0.3, 0, Math.cos(a) * 0.08).applyMatrix3(this._r.setFromMatrix4(this.band.m)).setY(0.9 + this.r() * 0.25);
        this.notes.spawn(p, 0.3 + this.r() * 0.1, 3.4, dir, { map: Math.floor(this.r() * 4), spin: this.r() * 6 });
      }
    }
    this.glints.update(dt); this.notes.update(dt); this.drops.update(dt); this.petals.update(dt); this.smoke.update(dt);
  }
  // for the tests: what's going on
  state() {
    return {
      bees: this.bees ? this.bees.out : null, butterflies: this.flies ? this.flies.f.filter(f => f.g.visible).length : null,
      bath: this.bath ? this.bath.list.map(b => b.st) : null, fountain: this.fount ? this.fount.birds.list.map(b => b.st) : null, arbour: this.arbour ? this.arbour.flies.f.filter(f => f.g.visible).length : null, doves: this.doves ? this.doves.list.map(d => d.st) : null, tractor: this.tractor ? { on: this.tractor.jig.on, next: +this.tractor.next.toFixed(1) } : null, orchard: this.orchard ? { apples: this.orchard.apples.filter(a => a.st !== 'off').length, bird: this.orchard.bird.st } : null, squirrel: this.treeHouse ? this.treeHouse.st : null, balloon: this.balloon ? { flame: this.balloon.flame.visible, y: +this.balloon.s.y.toFixed(4) } : null, squirrelAt: this.treeHouse ? this.treeHouse.g.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(3)) : null, smoke: this.smoke.live, petals: this.petals.live, glints: this.glints.live, notes: this.notes.live, drops: this.drops.live,
    };
  }
}
