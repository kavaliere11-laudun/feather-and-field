// Fishing (release 5; game-plan-v2.md §8; Audrey, 28 Oct: the fish "Perfect, carry on"; a legendary fish: "Photo, then let
// go", "and on top of that each time the farmer fishes a new breed of fish he is happy and does a little celebration").
// The farmer out at the end of the pond's dock, where his old cane rod lies (farmer.js makeRod) and his bucket of water
// stands: he crouches and picks the rod up (and lays it down again when he's done: never just there or gone).
//  1. Tap the water to cast: the rod drawn back over the shoulder and swung, the float flying out on its line to where you
//     tapped (as near as the rod reaches), a little ring where it lands.
//  2. Watch the float: it bobs; a nibble or two (little dips); then it's pulled under with a splash and a "!": tap now.
//     Tapping before: "Too soon!", the fish wary a moment more. Too slow: it's off with the worm.
//  3. Reel in by holding: the line's pull on a gauge, keep it in the green while the fish pulls (it comes in while the pull's
//     in the green, quicker while you're reeling; rare fish pull harder, a legendary one hardest). Too hard for too long and the line snaps; too slack and it slips the hook. Its shadow comes in
//     under the water as you reel, now and then a rare one leaps.
//  4. Out it comes on the line, up in front of him; he takes it in his left hand, crouches to lay the rod down, and holds it
//     cradled on both palms, turned round to show you; a fish new to you: held out on his left palm, a hop and a fist
//     punched in the air, hooray ("A new fish!"). Its card (main.js gameUI.fishCard); then he turns to the bucket, crouches
//     and lowers it into the water there for the village aquarium shop (a legendary one: at the dock's edge, back into the
//     pond), and picks his rod up again (or leaves it lying there and goes).
// The game's side (the worms, which fish, the coins and XP, the save) is game.js; the farmer's walk out and back,
// farmlife.js fishAt; main.js puts it on the dock, its gate and the taps.
import * as THREE from 'three';
import { Fish } from './fish.js';
import { makeRod } from './farmer.js';
import { FISHING } from './game.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = u => u * u * (3 - 2 * u);
// the reel's feel by how rare the fish is: the green part of the gauge, how quickly reeling brings it in, its pull
const FIGHT = [{ g0: 0.28, g1: 0.76, rate: 0.2, pull: 0.26, every: [1.3, 2.6] }, { g0: 0.34, g1: 0.72, rate: 0.13, pull: 0.36, every: [1.0, 2.0] }, { g0: 0.38, g1: 0.7, rate: 0.09, pull: 0.42, every: [0.9, 1.8] }];
const SNAP_T = 0.75, SLIP_T = 2.6, BITE_WIN = [1.25, 1.05, 0.95];

// ---- the little things on the water: rings spreading, the float, the line, a fish's shadow, a "!"
function ringPool(scene, n, y) {
  const geo = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.renderOrder = 3; m.material.userData.noGrade = true; scene.add(m); list.push({ m, t: 1, T: 1, r: 0.1 });
  }
  return {
    add(x, z, r = 0.25, T = 1.1) { const R = list.reduce((a, b) => (b.t / b.T > a.t / a.T ? b : a)); R.t = 0; R.T = T; R.r = r; R.m.position.set(x, y, z); R.m.visible = true; },
    update(dt) { for (const R of list) { if (!R.m.visible) continue; R.t += dt; const u = R.t / R.T; if (u >= 1) { R.m.visible = false; continue; } R.m.scale.setScalar(0.03 + R.r * sm(u)); R.m.material.opacity = 0.55 * (1 - u); } },
    hide() { for (const R of list) R.m.visible = false; },
  };
}
function makeFloat(grade) {
  const g = new THREE.Group(), mat = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }); if (grade) grade(m); return m; };
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e2412b'));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#f6f1e4'));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.04, 6).translate(0, 0.035, 0), mat('#e2412b'));
  g.add(top, bot, stick); g.visible = false;
  return g;
}
// the line: a thin ribbon turned to the camera (a plain line would be a hair's width on a phone), from the rod's tip to the
// float (or the fish), sagging when slack
class Line {
  constructor(scene, n = 22) {
    this.n = n; this.pos = new Float32Array(n * 2 * 3);
    const g = new THREE.BufferGeometry(), idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#f3eedf', transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false }));
    this.mesh.material.userData.noGrade = true; this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; this.mesh.visible = false; scene.add(this.mesh);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._t = new THREE.Vector3(); this._s = new THREE.Vector3();
  }
  set(from, to, sag, camDir, w = 0.0048) {
    const P = this.pos, n = this.n, a = this._a, b = this._b;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      a.copy(from).lerp(to, u); a.y -= sag * 4 * u * (1 - u);
      const v = Math.min(1, (i + 1) / (n - 1)), w0 = Math.max(0, (i - 1) / (n - 1));
      b.copy(from).lerp(to, v); b.y -= sag * 4 * v * (1 - v);
      this._t.copy(from).lerp(to, w0); this._t.y -= sag * 4 * w0 * (1 - w0);
      this._s.subVectors(b, this._t).cross(camDir).normalize().multiplyScalar(w / 2);
      P.set([a.x + this._s.x, a.y + this._s.y, a.z + this._s.z, a.x - this._s.x, a.y - this._s.y, a.z - this._s.z], i * 6);
    }
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.visible = true;
  }
}
function bangSprite() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = 'rgba(255,253,247,0.97)'; c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e2512a'; c.font = '900 62px Nunito, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', 48, 52);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }); m.userData.noGrade = true;
  const s = new THREE.Sprite(m); s.renderOrder = 13; s.visible = false; s.scale.setScalar(0.22);
  return s;
}
// the bucket by his feet: zinc, a water line inside
function makeBucket(grade) {
  const g = new THREE.Group(), mat = (c, r = 0.4, me = 0.5) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me }); if (grade) grade(m); return m; };
  const side = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 18, 1, true).translate(0, 0.1, 0), mat('#a9b2b6')); side.material.side = THREE.DoubleSide;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.1, 18).rotateX(-Math.PI / 2).translate(0, 0.004, 0), mat('#8a9397'));
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.118, 18).rotateX(-Math.PI / 2).translate(0, 0.16, 0), mat('#5aa6c8', 0.15, 0));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 6, 22).rotateX(Math.PI / 2).translate(0, 0.2, 0), mat('#c2c9cc'));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.004, 4, 16, Math.PI).translate(0, 0.2, 0), mat('#7d8589'));
  for (const o of [side, bottom, water, rim, handle]) { o.castShadow = true; g.add(o); }
  g.visible = false;
  return g;
}

// the rod's places: lying on the dock by his right foot (its grip by his foot, pointing back along the dock), or in his
// right fist; moving between them as he crouches to lay it down or pick it up (never just there or gone)
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3();
function lerpMatrix(A, B, k, out) { A.decompose(_p1, _q1, _s1); B.decompose(_p2, _q2, _s2); return out.compose(_p1.lerp(_p2, k), _q1.slerp(_q2, k), _s1.lerp(_s2, k)); }

export class Fishing {
  // o: { scene, grade, water ('pond'), waterY, spot: { stand: [x, z], face (heading out over the water), deck (its
  // height) }, inWater(x, z), reach: [nearest, farthest] a cast can land, game, t(key, vars), hint(text), say(key) (the
  // farmer's lines), card(result, then(keep)), wake(ms) }
  constructor(o) {
    this.o = o; this.state = 'off'; this.t = 0; this.hold = false; this.T = 0; this.p = 0; this.rodIn = false;
    this.float = makeFloat(o.grade); o.scene.add(this.float);
    this.line = new Line(o.scene); this.rings = ringPool(o.scene, 8, o.waterY + 0.003);
    this.bang = bangSprite(); o.scene.add(this.bang);
    const S = o.spot, h = S.face, f = new THREE.Vector3(Math.sin(h), 0, Math.cos(h)), left = new THREE.Vector3(Math.cos(h), 0, -Math.sin(h));
    this.fwd = f; this.left = left;
    // the bucket on his left, the rod lying on his right: both stay on the dock (they're his, kept there)
    this.bucket = makeBucket(o.grade); o.scene.add(this.bucket);
    const B = new THREE.Vector3(S.stand[0], S.deck, S.stand[1]).addScaledVector(left, 0.36).addScaledVector(f, -0.04); this.bucket.position.copy(B);
    this.bucketAt = B;
    this.deckRod = new THREE.Group(); this.deckRod.matrixAutoUpdate = false; const inner = makeRod(o.grade); inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0); this.deckRod.add(inner); o.scene.add(this.deckRod);
    const rp = new THREE.Vector3(S.stand[0], S.deck + 0.02, S.stand[1]).addScaledVector(left, -0.3).addScaledVector(f, 0.12);
    const z = f.clone().negate(), y = left.clone().negate(), x = new THREE.Vector3().crossVectors(y, z);          // (along the dock towards the bank, its reel to the side)
    this.rodRest = new THREE.Matrix4().makeBasis(x, y, z).setPosition(rp);
    this.deckRod.matrix.copy(this.rodRest); this.deckRod.updateMatrixWorld(true);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#203747', transparent: true, opacity: 0, depthWrite: false }));
    sh.material.userData.noGrade = true; sh.renderOrder = 2; sh.visible = false; o.scene.add(sh); this.shadow = sh;
    this.fish = null; this.ui(); this.props(true);
  }
  get on() { return this.state !== 'off'; }
  props(on) { this.bucket.visible = on; this.deckRod.visible = on && !this.rodIn; }
  // ---- the screen's part: the worms and Stop at the bottom; the gauge while reeling; a sheet of glass over the farm from
  // the cast to the catch (a tap or a hold anywhere is the player's; the view stays put)
  ui() {
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
    this.bar = el('div', 'fishbar'); this.wormsEl = el('span', 'fishworms'); this.stopBtn = el('button', 'fishstop'); this.stopBtn.type = 'button';
    this.stopBtn.addEventListener('click', () => this.stop());
    this.bar.append(this.wormsEl, this.stopBtn); this.bar.hidden = true;
    this.gauge = el('div', 'fishgauge'); const track = el('div', 'fishtrack'); this.green = el('div', 'fishgreen'); this.needle = el('div', 'fishneedle');
    this.prog = el('div', 'fishprog'); this.progFill = el('div', 'fishprogfill'); this.prog.append(this.progFill);
    track.append(this.green, this.needle); this.gauge.append(this.prog, track); this.gauge.hidden = true;
    this.glass = el('div', 'fishglass'); this.glass.hidden = true;
    const down = e => { e.preventDefault(); this.press(true); }, up = e => { e.preventDefault(); this.press(false); };
    this.glass.addEventListener('pointerdown', down); this.glass.addEventListener('pointerup', up); this.glass.addEventListener('pointercancel', up); this.glass.addEventListener('pointerleave', up);
    document.body.append(this.glass, this.gauge, this.bar);
  }
  refreshBar() {
    const n = this.o.game.worms(), t = this.o.t;
    this.wormsEl.textContent = '🪱 ' + (n === 1 ? t('fish_worms1') : n ? t('fish_worms', { n }) : t('fish_worms0'));
    this.stopBtn.textContent = t('fish_stop');
  }
  // ---- out at the dock's end (main.js, once the farmer's there): he crouches and picks his rod up, then he's ready
  start() { this.state = 'pickup'; this.t = 0; this.then = 'ready'; this.o.wake(1500); }
  ready() { this.state = 'ready'; this.t = 0; this.bar.hidden = false; this.refreshBar(); this.o.hint(this.o.t(this.o.game.worms() ? 'fish_cast' : 'fish_worms0')); }
  stop() {                                         // (Stop, or night falling: the line wound in, the rod laid down, off he goes)
    if (['off', 'laydown', 'leaving'].includes(this.state)) return;
    if (['reel', 'bite', 'wait', 'nibble', 'cast'].includes(this.state)) this.o.game.loseFish();
    this.clearWater(); this.bar.hidden = true; this.gauge.hidden = true; this.glass.hidden = true;
    if (this.fish) { this.keep = false; return; }   // (a fish in his hands: into the bucket first; he stops after)
    if (this.rodIn) { this.state = 'laydown'; this.t = 0; this.then = 'leaving'; } else this.state = 'leaving';
    this.o.wake(1000);
  }
  end() { this.clearWater(); if (this.fish) { this.fish.root.removeFromParent(); this.fish = null; } this.result = null; this.state = 'off'; this.rodIn = false; this.bar.hidden = true; this.gauge.hidden = true; this.glass.hidden = true; this.deckRod.matrix.copy(this.rodRest); this.deckRod.updateMatrixWorld(true); this.props(true); }
  clearWater() {
    this.float.visible = false; this.line.mesh.visible = false; this.shadow.visible = false; this.bang.visible = false; this.rings.hide();
    if (this.fish && !['lift', 'unhook', 'show', 'trophy', 'card', 'away'].includes(this.state)) { this.fish.root.removeFromParent(); this.fish = null; }
  }
  // ---- a tap on the farm while ready: the water where it hit (x, z) cast to (as near as the rod reaches); true if taken
  tapWater(x, z) {
    if (this.state !== 'ready') return false;
    const S = this.o.spot, h = S.face, fx = Math.sin(h), fz = Math.cos(h);
    let dx = x - S.stand[0], dz = z - S.stand[1], d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = fx; dz = fz; d = 1; }
    let a = Math.atan2(dx, dz) - h; a = Math.atan2(Math.sin(a), Math.cos(a)); a = clamp(a, -1.0, 1.0);      // (out in front, not behind him)
    const [r0, r1] = this.o.reach; d = clamp(d, r0, r1);
    let tx = S.stand[0] + Math.sin(h + a) * d, tz = S.stand[1] + Math.cos(h + a) * d;
    for (let k = 0; k < 12 && !this.o.inWater(tx, tz); k++) { d = Math.max(r0, d - 0.25); a *= 0.8; tx = S.stand[0] + Math.sin(h + a) * d; tz = S.stand[1] + Math.cos(h + a) * d; }
    if (!this.o.inWater(tx, tz)) return false;
    const bite = this.o.game.castWorm(this.o.water);
    if (!bite) { this.o.hint(this.o.t('fish_noworms', { n: FISHING.free })); return true; }
    this.bite = bite; this.refreshBar();
    this.target = new THREE.Vector3(tx, this.o.waterY, tz); this.state = 'cast'; this.t = 0; this.glass.hidden = false;
    this.o.wake(3000);
    return true;
  }
  // ---- a tap or a hold on the glass
  press(on) {
    this.hold = on && this.state === 'reel';
    if (!on) return;
    if (this.state === 'bite') { this.strike(); return; }
    if (this.state === 'wait' || this.state === 'nibble') { this.o.hint(this.o.t('fish_soon')); this.state = 'wait'; this.t = 0; this.waitFor = 2 + Math.random() * 2.5; }
  }
  strike() {
    const F = FIGHT[this.bite.rare];
    this.state = 'reel'; this.t = 0; this.T = 0.45; this.p = 0; this.over = 0; this.slack = 0; this.surge = 0; this.nextSurge = 0.8; this.hold = true;
    this.bang.visible = false; this.gauge.hidden = false;
    this.green.style.left = (F.g0 / 1.2 * 100) + '%'; this.green.style.width = ((F.g1 - F.g0) / 1.2 * 100) + '%';
    this.o.hint(this.o.t('fish_reel')); this.o.wake(3000);
    this.fishAt = this.target.clone(); this.shadow.visible = true; this.shadow.material.opacity = 0;
    const L = Math.max(0.1, (this.bite.cm / 100) * 0.9); this.shadow.scale.set(L * 0.16, 1, L * 0.5);
    this.rings.add(this.target.x, this.target.z, 0.35, 0.9);
  }
  lose(key) {
    this.o.game.loseFish(); this.clearWater(); this.gauge.hidden = true; this.glass.hidden = true;
    this.state = 'ready'; this.t = 0; this.o.hint(this.o.t(key)); this.refreshBar(); this.o.wake(1500);
  }
  // ---- each frame (the water's part; the farmer's own, and the fish in his hands, in drive)
  update(dt, camDir) {
    if (this.state === 'off') return;
    this.t += dt; this.rings.update(dt);
    const S = this.o.spot, tip = this.tip, W = this.o.waterY;
    if (this.state === 'cast') {
      // (drawn back, swung: the float leaves the tip at 0.45 s and lands 0.6 s later)
      if (this.t > 0.45 && tip) {
        const u = clamp((this.t - 0.45) / 0.6, 0, 1), p = tip.clone().lerp(this.target, u); p.y = tip.y + (this.target.y - tip.y) * u + 0.9 * 4 * u * (1 - u) * 0.6;
        this.float.position.copy(p); this.float.visible = true; this.line.set(tip, p, 0.02, camDir);
        if (u >= 1) { this.state = 'wait'; this.t = 0; this.waitFor = 2.5 + Math.random() * 4; this.nibbles = 1 + Math.floor(Math.random() * 3); this.rings.add(this.target.x, this.target.z, 0.22); this.o.hint(this.o.t('fish_wait')); }
      }
    } else if (this.state === 'wait' || this.state === 'nibble' || this.state === 'bite') {
      let dip = 0;
      if (this.state === 'wait' && this.t > this.waitFor) { this.state = 'nibble'; this.t = 0; }
      if (this.state === 'nibble') {
        const k = Math.floor(this.t / 0.7), u = (this.t % 0.7) / 0.7;
        if (k < this.nibbles) { dip = u < 0.3 ? Math.sin(u / 0.3 * Math.PI) * 0.012 : 0; if (u < dt / 0.7 + 1e-3) this.rings.add(this.target.x, this.target.z, 0.12, 0.7); }
        else { this.state = 'bite'; this.t = 0; this.rings.add(this.target.x, this.target.z, 0.4, 1.0); this.rings.add(this.target.x, this.target.z, 0.25, 0.8); this.o.hint(this.o.t('fish_bite')); }
      }
      if (this.state === 'bite') {
        dip = Math.min(0.06, this.t * 0.4);
        this.bang.visible = true; this.bang.position.set(this.target.x, W + 0.25 + 0.03 * Math.sin(this.t * 18), this.target.z);
        if (this.t > BITE_WIN[this.bite.rare]) { this.bang.visible = false; this.lose('fish_missed'); return; }
      }
      const fp = this.target.clone(); fp.y = W + 0.006 * Math.sin(this.t * 2.6) - dip;
      this.float.position.copy(fp); this.float.visible = fp.y > W - 0.04;
      if (tip) this.line.set(tip, fp, 0.12, camDir);
      this.o.wake(200);
    } else if (this.state === 'reel') {
      const F = FIGHT[this.bite.rare], big = 0.8 + 0.4 * clamp((this.bite.cm - 5) / 100, 0, 1);
      // the fish's pull: a surge now and then, harder for a rarer, bigger fish
      this.nextSurge -= dt; if (this.nextSurge <= 0) { this.surge = 0.35; this.nextSurge = F.every[0] + Math.random() * (F.every[1] - F.every[0]); this.surgeK = F.pull * big * (0.7 + 0.6 * Math.random()); }
      let dT = this.hold ? 0.85 : -0.75;
      if (this.surge > 0) { this.surge -= dt; dT += this.surgeK / 0.35 * (this.hold ? 1 : 0.55); }
      this.T = clamp(this.T + dT * dt, 0, 1.2);
      const inGreen = this.T >= F.g0 && this.T <= F.g1;
      this.p = clamp(this.p + (inGreen ? F.rate * (this.hold ? 1 : 0.5) : this.T < F.g0 ? -0.03 : 0.02) * dt, 0, 1);      // (in the green it comes in, quicker reeling; slack, it swims off a little)
      this.over = this.T > 1.0 ? this.over + dt : 0;
      this.slack = this.T < F.g0 * 0.6 && this.p > 0.04 ? this.slack + dt : 0;
      this.needle.style.left = (this.T / 1.2 * 100) + '%'; this.progFill.style.width = (this.p * 100) + '%';
      this.needle.classList.toggle('hot', this.T > 1.0); this.needle.classList.toggle('ok', inGreen);
      if (this.over > SNAP_T) { this.lose('fish_snap'); return; }
      if (this.slack > SLIP_T) { this.lose('fish_slip'); return; }
      // its shadow coming in under the water, weaving; a ring now and then
      const end = new THREE.Vector3(S.stand[0] + Math.sin(S.face) * 0.6, W, S.stand[1] + Math.cos(S.face) * 0.6);
      const at = this.target.clone().lerp(end, sm(this.p)), side = new THREE.Vector3(Math.cos(S.face), 0, -Math.sin(S.face));
      at.addScaledVector(side, 0.25 * (1 - this.p) * Math.sin(this.t * 1.7));
      const dir = at.clone().sub(this.fishAt); this.fishAt.copy(at);
      this.shadow.position.set(at.x, W + 0.002, at.z); if (dir.lengthSq() > 1e-8) this.shadow.rotation.y = Math.atan2(dir.x, dir.z);
      this.shadow.material.opacity = Math.min(0.32, this.t * 0.6);
      if (Math.random() < dt * (this.surge > 0 ? 3 : 0.7)) this.rings.add(at.x, at.z, 0.14, 0.7);
      this.float.visible = false;
      if (tip) this.line.set(tip, new THREE.Vector3(at.x, W, at.z), 0.04 * (1.2 - this.T), camDir);
      if (this.p >= 1) this.landed();
      this.o.wake(200);
    } else if (this.state === 'lift' || this.state === 'unhook') {
      // (the line from the rod's tip to its mouth, till he takes it off the hook)
      if (this.fish) { this.fish.amp = this.state === 'lift' ? 0.2 : 0.12; this.fish.rate = 15; this.fish.update(dt); }
      if (tip && this.mouth && (this.state === 'lift' || this.t < 0.75)) this.line.set(tip, this.mouth, 0, camDir); else this.line.mesh.visible = false;
      this.o.wake(200);
    } else {
      if (this.fish) { this.fish.amp = 0.06; this.fish.rate = 9; this.fish.update(dt); }
      this.o.wake(200);
    }
  }
  landed() {
    this.result = this.o.game.landFish();
    this.gauge.hidden = true; this.shadow.visible = false; this.hold = false;
    if (!this.result) { this.lose('fish_slip'); return; }
    const f = new Fish(this.result.id, this.o.grade); this.fish = f;
    const L = f.spec.L, show = Math.max(0.3, Math.min(0.72, L * 1.7)) * (0.9 + 0.2 * (this.result.cm - f.spec.cm[0]) / Math.max(1, f.spec.cm[1] - f.spec.cm[0]));      // (larger than life in his hands, so it reads on a phone; a bigger one a little bigger)
    f.root.scale.setScalar(show / L); this.fishLen = show;
    f.mesh.geometry.computeBoundingBox(); const bb = f.mesh.geometry.boundingBox; this.fishHalfH = (bb.max.y - bb.min.y) / 2 * show / L * 0.8; this.fishMid = (bb.max.y + bb.min.y) / 2 * show / L;
    this.o.scene.add(f.root);
    this.state = 'lift'; this.t = 0; this.rings.add(this.fishAt.x, this.fishAt.z, 0.35, 1.0); this.splashed = false;
    this.o.wake(2000);
  }
  showCard() {
    this.state = 'card'; this.t = 0; this.glass.hidden = true; this.bar.hidden = true;
    this.o.card(this.result, keep => { this.keep = keep; this.state = 'away'; this.t = 0; this.splashed = false; this.o.wake(2000); });
  }
  // ---- the fish in his hands: cradled on both palms (along his shoulders, belly down, a little out from him), or on his
  // left palm (the same way, its side to you); dangling from the hook (head up)
  hands(rig, Lf, how) {
    const B = rig.B, f = new THREE.Vector3(Math.sin(Lf.heading), 0, Math.cos(Lf.heading)), up = new THREE.Vector3(0, 1, 0), left = new THREE.Vector3(Math.cos(Lf.heading), 0, -Math.sin(Lf.heading));
    const lift = up.clone().multiplyScalar(this.fishHalfH + 0.025 - this.fishMid);
    if (how === 'left') {
      const pos = B.handL.getWorldPosition(new THREE.Vector3()).addScaledVector(f, 0.06).addScaledVector(left, -0.04).add(lift);
      return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.clone().negate(), up, left)) };
    }
    const a = B.handL.getWorldPosition(new THREE.Vector3()), b = B.handR.getWorldPosition(new THREE.Vector3());
    const pos = a.add(b).multiplyScalar(0.5).addScaledVector(f, 0.04).add(lift);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.clone().negate(), up, left)) };
  }
  hung(mouth, Lf) {                                // (head up under the hook, its back to him)
    const up = new THREE.Vector3(0, 1, 0), left = new THREE.Vector3(Math.cos(Lf.heading), 0, -Math.sin(Lf.heading)), back = new THREE.Vector3(-Math.sin(Lf.heading), 0, -Math.cos(Lf.heading));
    return { pos: mouth.clone().addScaledVector(up, -this.fishLen * 0.5), quat: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, back, up)) };
  }
  place(P, Q, k = 1) {
    const r = this.fish.root;
    if (k >= 1) { r.position.copy(P); r.quaternion.copy(Q); } else { r.position.lerp(P, k); r.quaternion.slerp(Q, k); }
  }
  // the rod: in his hand or on the dock, or on its way between (k: 0 lying there .. 1 in his hand)
  rodBetween(rig, k) {
    const R = rig.ensureRod(); R.updateWorldMatrix(true, false);
    if (k >= 1) { this.rodIn = true; this.deckRod.visible = false; return; }
    this.rodIn = false; this.deckRod.visible = true;
    lerpMatrix(this.rodRest, R.matrixWorld, sm(k), this.deckRod.matrix); this.deckRod.matrixWorldNeedsUpdate = true; this.deckRod.updateMatrixWorld(true);
  }
  // ---- the farmer, each frame while he's out on the dock (farmlife.js fishAt): his pose for where things are, the rod
  // laid down and picked up, the fish in his hands; true once he's done
  drive(Lf, dt) {
    const W = Lf.want, rig = Lf.f.rig, st = this.state, t = this.t;
    W.face = 'neutral'; W.pose = this.rodIn ? 'rod' : 'turn'; W.props.rod = this.rodIn; W.props.rodBend = 0;
    if (st === 'off' || st === 'leaving') { W.props.rod = false; return true; }
    const faceTo = (h, rate = 2.5) => Lf.turnTo(h, dt, rate), water = this.o.spot.face, toCam = Lf.o.toCamera ? Lf.o.toCamera(Lf.pos.x, Lf.pos.z) : water + Math.PI;
    const toBucket = Math.atan2(this.bucketAt.x - Lf.pos.x, this.bucketAt.z - Lf.pos.z);
    // (the rod: picked up from the dock, or laid down on it: a crouch, the right hand down to it)
    const rodMove = (up, then) => {
      faceTo(water); W.pose = t > 0.25 && t < 1.25 ? 'kneel' : up && t >= 1.25 ? 'rod' : 'turn'; W.face = 'neutral'; W.look = [0, -0.4];
      const k = clamp((t - 0.55) / 0.45, 0, 1), m = up ? k : 1 - k;
      W.props.rod = m >= 1; this.rodBetween(rig, m >= 1 ? 1 : m);
      if (t >= 1.7) { this.state = then; this.t = 0; if (then === 'ready') this.ready(); }
    };
    if (st === 'pickup') { rodMove(true, this.then || 'ready'); this.tip = rig.rodTip(); return false; }
    if (st === 'laydown') { rodMove(false, this.then || 'leaving'); this.tip = null; return false; }
    if (['ready', 'cast', 'wait', 'nibble', 'bite', 'reel'].includes(st)) {
      faceTo(water); this.rodIn = true; W.props.rod = true;
      if (st === 'cast') { W.pose = t < 0.4 ? 'cast' : 'rod'; W.face = 'happy'; }
      else if (st === 'wait' || st === 'nibble') W.look = [0, -0.25];
      else if (st === 'bite') { W.face = 'happy'; W.look = [0, -0.25]; }
      else if (st === 'reel') {
        W.pose = 'reel'; W.face = this.T > 0.95 ? 'worried' : 'happy'; W.props.rodBend = 0.25 + 0.7 * this.T; W.look = [0, -0.3];
        const crank = this.hold ? Math.sin(t * 14) : 0;
        W.anim = (P) => { P.elL[1] += 14 * crank; P.shL[0] += 6 * crank; };
      }
      this.tip = rig.rodTip();
      return false;
    }
    // ---- the catch: out of the water on the line, up in front of him; he takes it in his left hand, lays the rod down, holds it
    // in both; turns round to show it; hooray for a new one (on his left palm, a fist in the air); its card; into the bucket
    // (or back into the water), the rod picked up again
    if (st === 'lift') {
      faceTo(water); W.pose = 'rod'; W.props.rod = true; W.props.rodBend = 0.35; W.face = 'happy'; W.look = [0, -0.2];
      this.tip = rig.rodTip();
      const u = clamp(t / 0.9, 0, 1), hang = this.tip.clone().add(new THREE.Vector3(0, -0.55 - this.fishLen * 0.1, 0)).addScaledVector(this.fwd, -0.15);
      const from = new THREE.Vector3(this.fishAt.x, this.o.waterY, this.fishAt.z), m = from.clone().lerp(hang, sm(u)); m.y += 0.12 * Math.sin(u * Math.PI);
      m.addScaledVector(this.left, 0.05 * Math.sin(t * 6) * (1 - u * 0.5));          // (swinging a little)
      this.mouth = m; const H = this.hung(m, Lf); this.place(H.pos, H.quat);
      if (u >= 1) { this.state = 'unhook'; this.t = 0; this.o.say(this.result.legend ? 'fishbig' : this.result.first ? 'fishnew' : 'fishgot'); }
      return false;
    }
    if (st === 'unhook') {
      faceTo(water);
      this.tip = rig.rodTip();
      if (t < 0.75) {                                // (his left hand to it; off the hook)
        W.pose = 'take'; W.props.rod = true; W.props.rodBend = 0.2; W.face = 'happy';
        const H = this.hung(this.mouth, Lf), L = this.hands(rig, Lf, 'left'), k = sm(clamp(t / 0.7, 0, 1));
        this.place(H.pos.clone().lerp(L.pos, k), H.quat.clone().slerp(L.quat, k));
        this.mouth.copy(this.fish.root.position).addScaledVector(new THREE.Vector3(0, 1, 0), this.fishLen * 0.5 * (1 - k));
      } else if (t < 1.75) {                         // (crouched, the rod laid down on the dock with his right hand)
        W.pose = 'kneel'; W.look = [0, -0.4];
        const k = clamp((t - 1.05) / 0.45, 0, 1); W.props.rod = k <= 0; this.rodBetween(rig, 1 - k);
        const L = this.hands(rig, Lf, 'left'); this.place(L.pos, L.quat);
      } else {                                       // (up again, both hands to it)
        W.pose = 'showfish'; W.face = 'happy'; W.look = [0, -0.35];
        const a = this.hands(rig, Lf, 'left'), b = this.hands(rig, Lf, 'two'), k = sm(clamp((t - 1.75) / 0.45, 0, 1));
        this.place(a.pos.lerp(b.pos, k), a.quat.slerp(b.quat, k));
        if (t >= 2.25) { this.state = 'show'; this.t = 0; }
      }
      return false;
    }
    if (st === 'show' || st === 'card' || st === 'trophy') {
      faceTo(toCam, 3);                              // (turned round to show it to you)
      W.face = 'happy'; W.pose = st === 'trophy' ? 'trophy' : 'showfish';
      const two = this.hands(rig, Lf, 'two'), one = this.hands(rig, Lf, 'left');
      if (st === 'trophy') {
        W.anim = (P) => { const k = Math.sin(t * 8); P.rootZ += 0.045 * Math.max(0, k); P.shR[1] += 22 * k; P.elR[1] -= 14 * k; };      // (a hop and a fist pumped, hooray)
        const k = sm(clamp(t / 0.35, 0, 1)) * sm(clamp((2.6 - t) / 0.35, 0, 1)); this.place(two.pos.lerp(one.pos, k), two.quat.slerp(one.quat, k));
        if (t > 2.6) this.showCard();
      } else {
        this.place(two.pos, two.quat);
        if (st === 'show' && t > (this.result.first ? 1.0 : 1.6)) { if (this.result.first) { this.state = 'trophy'; this.t = 0; } else this.showCard(); }
      }
      return false;
    }
    if (st === 'away') {
      const legend = this.result && this.result.legend;
      if (legend) {
        // (back to the water, crouched at the edge, lowered in; she slips out of his hands and away)
        faceTo(water, 3); W.face = 'happy';
        W.pose = t < 0.55 ? 'showfish' : t < 2.4 ? 'release' : 'turn';
        if (this.fish) {
          const two = this.hands(rig, Lf, 'two');
          if (t < 1.5) this.place(two.pos, two.quat);
          else {
            const k = clamp((t - 1.5) / 0.8, 0, 1), to = two.pos.clone().addScaledVector(this.fwd, 0.45); to.y = this.o.waterY - 0.05;
            this.place(two.pos.lerp(to, sm(k)), two.quat);
            if (k > 0.55 && !this.splashed) { this.splashed = true; this.rings.add(to.x, to.z, 0.45, 1.2); this.rings.add(to.x, to.z, 0.25, 0.9); }
            if (k >= 1) { this.fish.root.removeFromParent(); this.fish = null; }
          }
        }
      } else {
        // (turned to the bucket, crouched, the fish lowered into the water in it with a little splash)
        faceTo(toBucket, 3); W.face = 'happy';
        W.pose = t < 0.6 ? 'showfish' : t < 2.0 ? 'release' : 'turn';
        if (this.fish) {
          const two = this.hands(rig, Lf, 'two'), B = this.bucketAt, k = clamp((t - 1.05) / 0.5, 0, 1);
          const into = new THREE.Vector3(B.x, B.y + 0.09, B.z);
          if (k <= 0) this.place(two.pos, two.quat); else this.place(two.pos.lerp(into, sm(k)), two.quat);
          if (k >= 1) { if (!this.splashed) { this.splashed = true; this.rings.add(B.x, B.z, 0.1, 0.5); } this.fish.root.removeFromParent(); this.fish = null; }
        }
      }
      if (t >= (legend ? 2.9 : 2.5)) { this.result = null; this.t = 0; if (this.keep) { this.state = 'pickup'; this.then = 'ready'; } else { this.state = 'leaving'; this.bar.hidden = true; } }      // (on fishing: the rod picked up again; or off he goes, the rod left lying on the dock)
      return false;
    }
    return false;
  }
}
