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
// a hover at a flower or two, back in (or into another hive); a fuzzy striped body, wings a blur. (A little bigger than
// life, to be seen.)
const HIVES = [-0.85, 0, 0.85].map(x => new THREE.Vector3(x, 0.3, 0.32));          // (each hive's slot)
class Bees {
  constructor(parent, grade, r, n = 14) {
    this.r = r; this.b = [];
    const body = new THREE.SphereGeometry(1, 10, 8), col = [], P = body.attributes.position;
    for (let i = 0; i < P.count; i++) { const z = P.getZ(i), band = z < 0.6 && Math.sin(z * 8 + 0.6) > 0.25; col.push(...(band ? [0.14, 0.1, 0.05] : [0.98, 0.74, 0.14])); }
    body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const bm = new THREE.MeshLambertMaterial({ vertexColors: true }); if (grade) grade(bm);
    this.bodies = new THREE.InstancedMesh(body, bm, n); this.bodies.frustumCulled = false; this.bodies.count = 0;
    const wm = new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }); if (grade) grade(wm);
    this.wings = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), wm, n * 2); this.wings.frustumCulled = false; this.wings.count = 0;
    parent.add(this.bodies, this.wings);
    for (let i = 0; i < n; i++) this.b.push({ st: 'in', t: r() * 4, p: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), mid: new THREE.Vector3(), at: new THREE.Vector3(), dur: 1, h: 0, seed: r() * 9 });
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
        if (b.t > 1.5 && day > 0.5 && this.r() < dt * 0.35) { b.p.copy(HIVES[Math.floor(this.r() * 3)]); this.fly(b, this.flower(this._v), 0.9 + this.r() * 0.8); b.st = 'out'; b.visits = 1 + Math.floor(this.r() * 3); }
        else continue;
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
      const s = 0.016;
      this._q.setFromAxisAngle(UP, b.h);
      this.bodies.setMatrixAt(k, this._m.compose(b.p, this._q, this._s.set(s * 0.85, s * 0.8, s * 1.3)));
      const flap = 0.5 + 0.5 * Math.sin(time * 70 + b.seed * 7);
      for (const side of [-1, 1]) {                                    // (two little round wings, a blur of a beat)
        this._q.setFromEuler(this._e.set(-Math.PI / 2, b.h, side * (0.15 + 0.5 * flap)));
        this._w.set(side * 0.017, 0.012, -0.004).applyAxisAngle(UP, b.h).add(b.p);
        this.wings.setMatrixAt(k * 2 + (side > 0 ? 1 : 0), this._m.compose(this._w, this._q, this._s.set(0.016, 0.009, 1)));
      }
      k++;
    }
    this.bodies.count = k; this.wings.count = k * 2;
    this.bodies.instanceMatrix.needsUpdate = true; this.wings.instanceMatrix.needsUpdate = true;
  }
  get out() { return this.b.filter(b => b.st !== 'in').length; }
}

// ------------------------------------------------------------------ butterflies over the flower bed: a flutter from flower to
// flower, settling a moment with the wings slowly opening and closing, now and then a little wander out and back
class Butterflies {
  constructor(parent, grade, r, n = 4) {
    this.r = r; this.f = [];
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
      const f = { g, wings, st: 'fly', t: 0, p: new THREE.Vector3((r() - 0.5) * 0.8, 0.4, (r() - 0.5) * 0.8), to: new THREE.Vector3(), from: new THREE.Vector3(), dur: 1, h: 0, phase: r() * 6 };
      this.f.push(f); this.pick(f);
    }
  }
  pick(f) {
    f.from.copy(f.p); const a = this.r() * 6.28;
    if (this.r() < 0.2) { const d = 1.0 + this.r() * 1.1; f.to.set(Math.cos(a) * d, 0.55 + this.r() * 0.55, Math.sin(a) * d); f.land = false; }     // (a little wander)
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
const BATH = { rim: 0.705, R: 0.47, water: 0.671, tit: Math.atan2(0.3, 0.36) };
function smallBird(kind, grade) {
  const C = kind === 'robin' ? { back: '#7d6248', belly: '#ea6a32', head: '#7d6248', cap: '#7d6248', face: '#ea6a32', wing: '#6e5540' }
    : { back: '#8a7a6a', belly: '#d9907a', head: '#7f93a8', cap: '#6b84a3', face: '#d9907a', wing: '#4a4f4a' };
  const mats = {}; const mat = c => mats[c] || (mats[c] = (m => { if (grade) grade(m); return m; })(new THREE.MeshLambertMaterial({ color: c })));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, c, x, y, z, sx = 1, sy = 1, sz = 1, to = body) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; to.add(m); return m; };
  const S = new THREE.SphereGeometry(1, 12, 9);
  add(S, C.back, 0, 0.047, -0.006, 0.03, 0.028, 0.045); add(S, C.belly, 0, 0.04, 0.01, 0.027, 0.025, 0.033);
  const head = new THREE.Group(); head.position.set(0, 0.074, 0.028); body.add(head);
  add(S, C.head, 0, 0, 0, 0.022, 0.021, 0.022, head); add(S, C.cap, 0, 0.011, -0.002, 0.019, 0.011, 0.019, head);
  add(S, C.face, 0, -0.004, 0.012, 0.015, 0.013, 0.012, head);
  add(new THREE.ConeGeometry(1, 1, 6).rotateX(Math.PI / 2), kind === 'robin' ? '#2a2420' : '#b9a48a', 0, -0.001, 0.027, 0.0055, 0.0055, 0.014, head);
  for (const s of [-1, 1]) add(S, '#111', s * 0.014, 0.005, 0.012, 0.0045, 0.0045, 0.0045, head);
  const tail = add(new THREE.BoxGeometry(1, 1, 1), C.wing, 0, 0.05, -0.06, 0.02, 0.005, 0.045); tail.rotation.x = -0.35;
  const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.024, 0.058, 0); body.add(w); add(S, C.wing, s * 0.004, -0.008, -0.008, 0.007, 0.019, 0.036, w); if (kind !== 'robin') add(S, '#f2efe6', s * 0.007, -0.006, 0.006, 0.004, 0.006, 0.012, w); return w; });
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.0018, 0.0018, 0.03, 4), '#5a4a3a', s * 0.008, 0.015, 0);
  g.userData = { body, head, tail, wings };
  g.scale.setScalar(1.35);                                                 // (a touch bigger than life, to be seen)
  return g;
}
class BathBirds {
  constructor(parent, grade, r, splash) {
    this.r = r; this.splash = splash; this.list = [];
    for (const [i, kind] of ['robin', 'chaffinch'].entries()) { const g = smallBird(kind, grade); g.visible = false; parent.add(g); this.list.push({ kind, g, st: 'away', t: 3 + i * 7 + r() * 6, a: 0 }); }
  }
  angle(b) {                                                               // (a spot on the rim clear of the tit and the other bird; mostly at the back,
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
          b.from = new THREE.Vector3(Math.cos(far) * 4, 2.6, Math.sin(far) * 4); b.on = new THREE.Vector3(c * BATH.R, BATH.rim, s * BATH.R);
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
        if (b.t <= 0) { if (b.st === 'in') { b.st = 'rim'; b.t = 1.8 + this.r() * 1.8; } else { b.st = 'away'; b.t = 6 + this.r() * 12; } }
      } else if (b.st === 'rim') {                                       // (on the rim: a look round, a sip or two)
        b.g.position.copy(b.on); b.g.rotation.y = Math.atan2(-b.on.x, -b.on.z) + Math.sin(time * 1.7 + b.a) * 0.6;
        look = Math.sin(time * 3.1) * 0.4; peck = smooth(0.6, 0.9, Math.sin(time * 4.2 + b.a));
        if (b.t <= 0) { b.st = 'hop'; b.t = b.dur = 0.35; b.at = new THREE.Vector3(Math.cos(b.a) * 0.24, BATH.water - 0.028, Math.sin(b.a) * 0.24); }
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
    n.sp.position.copy(at); n.size = size; n.life = n.full = life; n.v.copy(drift); n.fall = o.fall || 0; n.pulse = !!o.pulse; n.spin = o.spin || 0;
    n.sp.visible = true; n.sp.scale.setScalar(1e-4); return n;
  }
  update(dt) {
    for (const n of this.pool) {
      if (n.life <= 0) continue;
      n.life -= dt; if (n.life <= 0) { n.sp.visible = false; continue; }
      const t = 1 - n.life / n.full;
      n.v.y -= n.fall * dt; n.sp.position.addScaledVector(n.v, dt);
      const s = n.size * (n.pulse ? Math.sin(t * Math.PI) : Math.min(1, t * 6)); n.sp.scale.set(s, s, s);
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
    for (const d of decor) {
      if (d.model === 'beehives') this.bees = new Bees(frame(d), o.grade, r);
      if (d.model === 'flowers') this.flies = new Butterflies(frame(d), o.grade, r);
      if (d.model === 'birdbath') { const f = frame(d); this.bath = new BathBirds(f, o.grade, r, (p, n) => this.splash(f.localToWorld(p.clone()), n)); }
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
    // the cockerel catching the sun: a sparkle somewhere on him, now and then
    if (this.statue && day > 0.7 && (this.glintIn -= dt) <= 0) {
      this.glintIn = 1.8 + this.r() * 3.5;
      // (a point in him, brought towards the player along the line of sight: the same place on screen, over him)
      const p = this._v.set(lerp(-0.22, 0.22, this.r()), lerp(1.0, 1.9, this.r()), lerp(-0.15, 0.15, this.r())).applyMatrix4(this.statue.m).addScaledVector(this.o.toCam, 0.9);
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
    this.glints.update(dt); this.notes.update(dt); this.drops.update(dt);
  }
  // for the tests: what's going on
  state() {
    return {
      bees: this.bees ? this.bees.out : null, butterflies: this.flies ? this.flies.f.filter(f => f.g.visible).length : null,
      bath: this.bath ? this.bath.list.map(b => b.st) : null, glints: this.glints.live, notes: this.notes.live, drops: this.drops.live,
    };
  }
}
