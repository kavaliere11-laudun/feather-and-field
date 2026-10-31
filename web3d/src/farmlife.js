// The farmer on the farm (the look and the moves: farmer.js). By day the farmer lives out on the farm: out of the
// farmhouse door in the morning with a stretch and "Good morning, girls!", then round the farm along the paths (across the
// grass only where there's no path): to a coop to stand at its fence with hands on hips watching the hens, now and then a
// wave and "Hello, girls!"; to a corner of the farm (a bench, the well, the stall) for a look about; to the pond to watch the
// ducks; to Biscuit's kennel to crouch and give him a pat if he's at home ("Good boy, Biscuit!"); to the porch for a rest;
// and, when the player is looking, a wave. At dusk the torch comes out; at bedtime "Goodnight, girls!" and in through the
// door. At night, when the player sends the farmer after Rusty (nightvisit.js), out of the door comes the farmer with the
// torch, running; shines it on Rusty, "Shoo! Off you go, Rusty!", walks home and goes back in. Tap the farmer: a wave and
// "Hello!". The farmer walks round the geese, the ducks and Biscuit (and they step aside); everything said is in a bubble,
// in English or French.
import * as THREE from 'three';
import { register, tr } from './lang.js';
import { Farmer, FARMER_NAME } from './farmer.js';
import { Torch } from './nightvisit.js';

export const FARMER_TEXT = register('say', {
  hi: ['Hello, girls!', 'Coucou, les filles !'],                       // (the 2D game's own line)
  morning: ['Good morning, girls!', 'Bonjour, les filles !'],
  night: ['Goodnight, girls!', 'Bonne nuit, les filles !'],
  hello: ['Hello!', 'Coucou !'],
  dog: ['Good boy, {dog}!', 'Brave chien, {dog} !'],
  ducks: ['Hello, ducks!', 'Bonjour, les canards !'],
  feed: ['Dinner time!', 'À table !'],                                 // (the 2D game's own lines)
  cuddle: ['There, there…', 'Là, là…'],
  chicks: ['Off to your new home, little ones!', 'En route pour votre nouvelle maison, mes petits !'],
  farewell: ['Off you go, and good luck!', 'Allez, bonne route !'],
  sow: ['Grow tall and golden!', 'Pousse bien, mon blé !'],
  harvest: ['What a harvest!', 'Quelle belle récolte !'],
  honey: ['Thank you, bees!', 'Merci, les abeilles !'],
  geese: ['Hello, you two!', 'Coucou, vous deux !'],                     // (a visit to the geese: geese.js, main.js geeseVisit)
  whoa: ['Whoa!', 'Oh là là !'],
  tomorrow: ['Maybe tomorrow…', 'Demain, peut-être…'],
  corn: ['Some corn for you!', 'Du grain pour vous !'],
  there: ['There you are!', 'Vous voilà !'],
  wormsH: ['Thank you, my lovely!', 'Merci, ma belle !'], wormsR: ['Thanks, old chap!', 'Merci, mon brave !'],      // (worms from a hen or a rooster)
  fishgot: ['Got one!', 'Attrapé !'], fishnew: ['A new fish!', 'Un nouveau poisson !'], fishbig: ['What a beauty!', 'Quelle beauté !'],      // (fishing: fishing.js)
  role: { m: ['farmer', 'fermier'], f: ['farmer', 'fermière'] },
});
const OUT_AT = 6.4, IN_AT = 22.6, TORCH_AT = 21.2;       // (out of the house, in for the night, the torch lit: hours)
const SPEED = { walk: 1.0, hurry: 1.45, run: 2.15 };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// a speech bubble: the words on a rounded card with a tail, drawn once for each line
const BUBBLES = {};
function bubbleTexture(text) {
  if (BUBBLES[text]) return BUBBLES[text];
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), font = '800 44px Nunito, system-ui, sans-serif';
  c.font = font; const w = Math.ceil(Math.min(900, c.measureText(text).width + 56));
  cv.width = w; cv.height = 112; c.font = font;
  c.fillStyle = 'rgba(255,253,247,0.97)'; c.beginPath(); c.roundRect(4, 6, w - 8, 76, 36); c.fill();
  c.beginPath(); c.moveTo(w / 2 - 12, 80); c.lineTo(w / 2 + 12, 80); c.lineTo(w / 2 - 4, 104); c.fill();
  c.fillStyle = '#3b2a1a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, 45);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.userData = { w: w / 112 };
  return (BUBBLES[text] = t);
}

// ------------------------------------------------------------------ the farmer's tasks: run(life, dt) true when done
const TK = {
  // along the paths to (x, z) (the village grid's way, the paths preferred)
  // (held up at a corner, or by someone in the way, for a second and a half: the way found again from where he is)
  path: (x, z, pace = 'walk', tmax = 120) => ({ name: 'path', t: 0, pts: null, i: 0, still: 0, again: 0, run(L, dt) {
    this.t += dt;
    if (!this.pts) { const f = L.o.nav.find(L.pos.x, L.pos.z, x, z, true); this.pts = f ? f.slice(1) : []; this.i = 0; if (!this.pts.length) return true; }
    const p = this.pts[this.i], last = this.i >= this.pts.length - 1, x0 = L.pos.x, z0 = L.pos.z;
    if (L.moveTo(p[0], p[1], dt, pace, !last) || (!last && Math.hypot(p[0] - L.pos.x, p[1] - L.pos.z) < 0.18)) { if (last) return true; this.i++; }
    this.still = Math.hypot(L.pos.x - x0, L.pos.z - z0) < 0.002 ? this.still + dt : 0;
    if (this.still > 1.5 && this.again < 4) { this.pts = null; this.still = 0; this.again++; }
    L.want.face = 'neutral'; L.want.lookAbout = true;
    return this.t > tmax;
  } }),
  // turning to a heading (or to face the camera)
  face: (h) => ({ name: 'face', t: 0, run(L, dt) { this.t += dt; const want = h === 'camera' ? L.o.toCamera(L.pos.x, L.pos.z) : h; return L.turnTo(want, dt, 3) < 0.05 || this.t > 3; } }),
  // standing doing something for secs: set(want, u) sets the pose and face u seconds in
  act: (name, secs, set) => ({ name, t: 0, run(L, dt) { this.t += dt; set(L.want, this.t, L); return this.t >= secs; } }),
  say: (key) => ({ name: 'say', run(L) { L.say(key); return true; } }),
  // straight from point to point (into a pen and out: the village grid has the pen blocked), slowing for a hen in the way
  walk: (pts, pace = 'walk') => ({ name: 'walk', i: 0, t: 0, run(L, dt) {
    this.t += dt; const p = pts[this.i], last = this.i >= pts.length - 1;
    const h = Math.atan2(p[0] - L.pos.x, p[1] - L.pos.z);
    if (L.speed < 0.2 && Math.abs(wrap(h - L.heading)) > 0.5 && Math.hypot(p[0] - L.pos.x, p[1] - L.pos.z) > 0.1) { L.turnTo(h, dt, 4); L.want.face = 'neutral'; return false; }      // (round on the spot first: no swinging wide)
    if (L.moveTo(p[0], p[1], dt, pace, !last) || (!last && Math.hypot(p[0] - L.pos.x, p[1] - L.pos.z) < 0.1)) { if (last) return true; this.i++; }
    L.want.face = 'neutral';
    return this.t > 40;
  } }),
  // out of the farmhouse door (fading in), or in through it (fading out)
  fade: (to) => ({ name: 'fade', t: 0, run(L, dt) {
    this.t += dt; const u = Math.min(1, this.t / 0.6); L.f.fade(to ? u : 1 - u);
    if (u >= 1) L.home = !to;
    return u >= 1;
  } }),
  seq: (name, list) => ({ name, list, i: 0, run(L, dt) {
    while (this.i < this.list.length) {
      let c = this.list[this.i];
      if (typeof c === 'function') { c = this.list[this.i] = c(L); if (!c) { this.i++; continue; } }
      if (!c.run(L, dt)) return false;
      this.i++; return this.i >= this.list.length;
    }
    return true;
  } }),
};

// poses for standing about (want: the pose, the face, where to look; u: seconds into it)
const STAND = {
  hips: (W, u) => { W.pose = 'hips'; W.face = 'neutral'; W.look = [0.6 * Math.sin(u * 0.7), 0.05 * Math.sin(u * 1.3)]; W.head = [0, 4, 18 * Math.sin(u * 0.7)]; },
  about: (W, u) => { W.pose = 'turn'; W.face = 'neutral'; W.look = [0.7 * Math.sin(u * 0.6), 0]; W.head = [0, 0, 22 * Math.sin(u * 0.6)]; },
  wave: (W, u) => { W.pose = 'wave'; W.face = 'happy'; W.waving = true; },
  stretch: (W, u) => { W.pose = u < 2.2 ? 'stretch' : 'turn'; W.face = u < 2.2 ? 'cuddle' : 'happy'; },
  cheer: (W, u) => { const k = u % 3.0; W.pose = k < 1.1 ? 'stretch' : 'wave'; W.face = 'happy'; W.waving = k >= 1.1; },      // (both arms up: hooray! then a wave)
  pat: (W, u) => { W.pose = 'pet'; W.face = 'cuddle'; W.patting = true; },
};

// a few handfuls of corn thrown towards V.cornAt (V.scatter) (the geese's visit): the feed pose, a throw each time round
const HAT_REST = 0.02;                // (the hat lying on the grass: its bone's height above the ground)
function scatter(V, n) {
  let thrown = 0;
  return TK.act('scatter', 0.45 + n * 0.9, (W, u, Lf) => {
    W.pose = 'feed'; W.face = 'feeding'; W.scatter = u;
    const k = Math.floor(u * 1.1 + 0.45); if (k > thrown && thrown < n) { thrown = k; V.scatter(Lf.handTip()); }
  });
}

export class FarmLife {
  // o: { look, name, nav (with the paths' costs), door: [x, z, the heading out], groundY(x, z), spots(): { coops: [[x, z,
  // facing]], farm: [[x, z]] }, pond(): [[x, z, facing]] (on the bank), kennel: [x, z, facing] (in front of its door), dog():
  // Biscuit's FarmDog, visit(): the night visit, others(): the geese, the ducks, Biscuit (to walk round: each with pos),
  // grade, lang, toCamera(x, z), inView(x, z), dogName(), say(text) (the farmer's lines, for the tests) }
  constructor(scene, o, r) {
    this.o = o; this.r = r; this.lang = o.lang || 'en';
    this.group = new THREE.Group(); scene.add(this.group);
    this.f = new Farmer(this.group, o.look, o.grade, r);
    this.name = o.name || tr(this.lang, 'name.' + o.look);
    this.f.label = this.name + ' · ' + tr(this.lang, 'say.role.' + o.look); this.f.isFarmer = true; this.f.life = this;
    this.torch = new Torch(scene);
    this.torch.glowAt = () => this.torchTip();
    const bm = new THREE.SpriteMaterial({ map: bubbleTexture('…'), transparent: true, depthWrite: false, depthTest: false }); bm.userData.noGrade = true;
    this.bubble = new THREE.Sprite(bm); this.bubble.renderOrder = 12; this.bubble.visible = false; scene.add(this.bubble); this.bubbleT = 0;
    this.home = true; this.task = null; this.speed = 0; this.av = 0; this.heading = o.door[2]; this.phase = 0; this.time = 0; this.moved = 0;
    this.placed = false; this.recent = []; this.near = []; this.said = [];
    this.f.fade(0);
  }
  get pos() { return this.f.pos; }
  wear(id) { return this.f.wear(id); }          // a bought outfit (loaded first: farmer.js loadOutfit), or Classic (null)
  T(key) { return tr(this.lang, 'say.' + key).replace('{dog}', this.o.dogName ? this.o.dogName() : 'Biscuit'); }
  say(key, secs = 2.6) {
    const text = this.T(key), m = this.bubble.material; m.map = bubbleTexture(text); m.needsUpdate = true;
    this.bubbleT = secs; this.said.push(key); if (this.said.length > 40) this.said.shift();
    if (this.o.said) this.o.said(key, text);
  }
  torchTip() { return this.f.rig.B.torch.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(Math.sin(this.heading) * 0.14, 0.02, Math.cos(this.heading) * 0.14)); }
  // ---- moving: turning smoothly, a step towards (x, z) at a pace, round the animals (waiting a moment if one's right in front)
  turnTo(h, dt, rate = 3.5) {
    const d = wrap(h - this.heading), want = clamp(d * 5, -rate, rate);
    this.av += clamp(want - this.av, -16 * dt, 16 * dt);
    let step = this.av * dt; if (Math.abs(step) > Math.abs(d)) { step = d; this.av = 0; }
    this.heading += step; this.turned = true;
    return Math.abs(d);
  }
  moveTo(x, z, dt, pace = 'walk', through = false) {
    const p = this.pos, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return true;
    let ax = dx / d, az = dz / d, slow = 1;
    for (const o of this.near) {
      const rx = o.pos.x - p.x, rz = o.pos.z - p.z, rd = Math.hypot(rx, rz), R = o.R || (o.isDuck ? 0.42 : 0.6);
      if (rd > R + 0.7 || rd > d + R) continue;
      const ahead = (rx * ax + rz * az) / Math.max(1e-3, rd); if (ahead < 0.2) continue;
      const k = Math.min(1, (R + 0.7 - rd) / 0.8) * ahead, cross = ax * rz - az * rx, th = -(cross >= 0 ? 1 : -1) * 1.1 * k;
      const c = Math.cos(th), sn = Math.sin(th), bx = ax * c - az * sn, bz = ax * sn + az * c;
      if (!this.o.nav || this.o.nav.freeAt(p.x + bx * 0.35, p.z + bz * 0.35)) { ax = bx; az = bz; }      // (never bending into anything)
      if (rd < R * 1.1 && ahead > 0.7) slow = Math.min(slow, Math.max(0.15, (rd - R * 0.8) / (R * 0.3)));
    }
    const off = this.turnTo(Math.atan2(ax, az), dt, pace === 'run' ? 7 : 4.5);
    let want = SPEED[pace] * (off > 1.2 ? 0.15 : off > 0.6 ? 0.5 : 1) * slow;
    if (!through) want = Math.min(want, Math.sqrt(2 * 2.5 * Math.max(0, d - 0.03)) + 0.05);
    this.speed += clamp(want - this.speed, -5 * dt, 3 * dt); this.movedNow = true;
    const st = Math.min(d, Math.max(0, this.speed) * dt);
    let nx = p.x + Math.sin(this.heading) * st, nz = p.z + Math.cos(this.heading) * st;
    const nav = this.o.nav;
    if (nav && !nav.freeAt(nx, nz) && nav.freeAt(p.x, p.z)) {
      nx = p.x + dx / d * st; nz = p.z + dz / d * st;        // (stepping round someone: never into anything; straight on, the way is clear)
      if (!this.pen && !nav.freeAt(nx, nz) && !(this.o.onBridge && this.o.onBridge(nx, nz))) {      // (not even that, at a corner: sliding along it, or a moment's wait; onto a footbridge, into a pen only by its gate)
        if (nav.freeAt(nx, p.z)) nz = p.z; else if (nav.freeAt(p.x, nz)) nx = p.x; else { nx = p.x; nz = p.z; }
      }
    }
    this.moved += Math.hypot(nx - p.x, nz - p.z); p.x = nx; p.z = nz;
    return false;
  }
  // ---- where to be at the hour the page opens: by day out by the door with a wave, at night indoors
  place(hour) {
    this.placed = true;
    const D = this.o.door; this.pos.set(D[0], 0, D[1]); this.heading = D[2];
    if (this.night(hour)) { this.home = true; this.f.fade(0); this.task = null; return; }
    this.task = this.comeOut(hour, 'hi');
  }
  night(h) { return h >= IN_AT || h < OUT_AT; }
  comeOut(hour, line) {
    const D = this.o.door, out = [D[0] + Math.sin(D[2]) * 0.9, D[1] + Math.cos(D[2]) * 0.9];
    const L = [TK.fade(true), TK.path(out[0], out[1])];
    if (hour < 8.5 && line !== 'hi') L.push(TK.act('stretch', 3.4, STAND.stretch));
    L.push(TK.face('camera'), TK.say(line || (hour < 11 ? 'morning' : 'hi')), TK.act('wave', 2.4, STAND.wave));
    return TK.seq('out', L);
  }
  goHome() {
    const D = this.o.door, out = [D[0] + Math.sin(D[2]) * 0.9, D[1] + Math.cos(D[2]) * 0.9];
    return TK.seq('home', [TK.path(out[0], out[1]), TK.face('camera'), TK.say('night'), TK.act('wave', 2.2, STAND.wave), TK.path(D[0], D[1]), TK.face(D[2] + Math.PI), TK.fade(false)]);
  }
  // ---- what next, by day
  // (force: 'coop', 'corner', 'pond', 'pat', 'porch' or 'wave', for a film)
  next(hour, force) {
    const R = this.r, S = this.o.spots ? this.o.spots() : { coops: [], farm: [] }, pick = { coop: 0, corner: 0.5, pond: 0.65, pat: 0.75, porch: 0.85, wave: 0.95 }[force] ?? R();
    // (somewhere not just visited, and one of the nearer ones: a stroll, not a march across the farm)
    const fresh = list => { const l = list.filter(s => !this.recent.some(q => Math.hypot(q[0] - s[0], q[1] - s[1]) < 1.5)).sort((a, b) => Math.hypot(a[0] - this.pos.x, a[1] - this.pos.z) - Math.hypot(b[0] - this.pos.x, b[1] - this.pos.z)); return l.slice(0, Math.max(2, Math.ceil(l.length * 0.35))); };
    const go = (s, pace = 'walk') => { this.recent.push(s); if (this.recent.length > 4) this.recent.shift(); return TK.path(s[0], s[1], pace); };
    const dog = this.o.dog && this.o.dog(), K = this.o.kennel;
    // (friends with the geese: now and then over to their gate to say hello, and they come over to it: main.js geeseFence)
    const GF = !force && this.o.geeseFence ? this.o.geeseFence() : null;
    if (GF && R() < 0.14) return TK.seq('coop', [go(GF), TK.face(GF[2]), () => { if (this.o.greetGeese) this.o.greetGeese(GF); return null; }, TK.act('hips', 4, STAND.hips), TK.say('geese'), TK.act('wave', 2.2, STAND.wave), TK.act('about', 2 + R() * 2, STAND.about)]);
    if (pick < 0.4 && S.coops.length) {                       // a look at a coop's hens over the fence
      const c = fresh(S.coops), s = c[Math.floor(R() * c.length)] || S.coops[0];
      const L = [go(s), TK.face(s[2]), () => { if (this.o.greet) this.o.greet(s); return null; }, TK.act('hips', 4 + R() * 4, STAND.hips)];      // (its trusting birds come to say hello)
      if (R() < 0.4) L.push(TK.say('hi'), TK.act('wave', 2.2, STAND.wave));
      L.push(TK.act('about', 1.5 + R() * 2, STAND.about));
      return TK.seq('coop', L);
    }
    if (pick < 0.58 && S.farm.length) {                       // a corner of the farm: a bench, the well, the stall
      const c = fresh(S.farm), s = c[Math.floor(R() * c.length)] || S.farm[0];
      return TK.seq('corner', [go(s), TK.act('about', 4 + R() * 4, STAND.about)]);
    }
    const P = this.o.pond ? this.o.pond() : [];
    if (pick < 0.72 && P.length) {                            // watching the ducks on the pond
      const c = fresh(P), s = c[Math.floor(R() * c.length)] || P[0];
      const L = [go(s), TK.face(s[2]), TK.act('hips', 5 + R() * 4, STAND.hips)];
      if (R() < 0.35) L.push(TK.say('ducks'), TK.act('wave', 2, STAND.wave));
      return TK.seq('pond', L);
    }
    if (pick < 0.82 && K && dog && dog.dog && dog.dog.root.visible && Math.hypot(dog.dog.pos.x - K[0], dog.dog.pos.z - K[1]) < 1.6 && !(dog.guard && !dog.guard.done)) {
      // Biscuit at home: he trots over to sit in front of where the farmer stops (on the player's side, a little round, so
      // both show), waits wagging, and gets a crouch and a pat ("Good boy!"), his hello in answer
      // (when the farmer gets there: if Biscuit's gone off meanwhile, just a look about)
      const greet = L => {
        const d = dog.dog, nav = L.o.nav, cam = L.o.toCamera ? L.o.toCamera(K[0], K[1]) : 0, own = Math.atan2(d.pos.x - K[0], d.pos.z - K[1]);
        const side = [cam + 0.6, cam - 0.6, cam, own].map(a => [K[0] + Math.sin(a) * 0.62, K[1] + Math.cos(a) * 0.62]).find(q => !nav || (nav.freeAt(q[0], q[1]) && nav.clearLine(K[0], K[1], q[0], q[1])));
        const wait = side && d.root.visible && Math.hypot(d.pos.x - K[0], d.pos.z - K[1]) < 3.5 && dog.awaitPat ? dog.awaitPat(L, side[0], side[1]) : null;
        if (!wait) return TK.act('about', 2 + R() * 2, STAND.about);
        const meet = { name: 'meet', t: 0, run(L, dt) {             // (facing him as he comes and sits, a smile)
          this.t += dt; L.turnTo(Math.atan2(d.pos.x - L.pos.x, d.pos.z - L.pos.z), dt, 3); L.want.face = 'happy';
          return wait.ready && this.t > 0.4 || this.t > 6;
        } };
        return TK.seq('patting', [meet, TK.say('dog'), TK.act('pat', 3.2, STAND.pat), () => { if (dog.tapped) dog.tapped(d); return null; }, TK.act('about', 1.5, STAND.about)]);
      };
      return TK.seq('pat', [go(K), greet]);
    }
    if (pick < 0.92) {                                        // a rest on the porch, looking out over the farm
      const D = this.o.door, s = [D[0] + Math.sin(D[2]) * 0.9, D[1] + Math.cos(D[2]) * 0.9];
      return TK.seq('porch', [go(s), TK.face(D[2]), TK.act('about', 6 + R() * 6, STAND.about)]);
    }
    if (this.o.inView && this.o.inView(this.pos.x, this.pos.z)) return TK.seq('wave', [TK.face('camera'), TK.say('hello'), TK.act('wave', 2.4, STAND.wave)]);
    return TK.seq('about', [TK.act('about', 3 + R() * 3, STAND.about)]);
  }
  // ---- into a pen (main.js penSpec: P): a cuddle for `hen`, her worms (n of them), or filling the feeder and scattering
  // corn. If he's in the middle of coming out, going in or another pen, straight after it. False when he can't (indoors, or
  // out after Rusty)
  visitPen(P, kind, hen, n) {
    if (!P || this.home || this.running) return false;
    const t = this.penTask(P, kind, hen, n);
    if ((kind === 'cuddle' || kind === 'worms') && P.reserve) P.reserve(hen);
    if (this.task && /^(out|home|pen)$/.test(this.task.name)) this.pending = t; else this.task = t;
    return true;
  }
  penTask(P, kind, hen, n) {
    const self = this, pen = on => () => { if (on) { self.pen = P; P.enter(); } else { P.leave(); self.pen = null; } return null; };
    // (never got to the gate after all: no visit)
    const there = { name: 'check', run(Lf) { if (Math.hypot(Lf.pos.x - P.out[0], Lf.pos.z - P.out[1]) > 0.7) { seq.aborted = true; if (P.letGo) P.letGo(hen); } return true; } };
    const L = [TK.path(P.out[0], P.out[1], 'hurry'), there, TK.face(P.toGate), pen(true), TK.walk(P.in)];
    if (kind === 'fill') {
      // the pail into the feeder, then corn for everyone, four handfuls ("Dinner time!"), and a moment watching them peck
      let thrown = 0;
      L.push(TK.walk([P.feederAt]), TK.face(P.toFeeder),
        TK.act('pour', 2.6, (W, u) => { W.pose = 'feed'; W.face = 'feeding'; W.pour = Math.min(1, u / 0.6) * Math.min(1, Math.max(0, (2.6 - u) / 0.5)); P.fill((u - 0.5) / 1.5); }),
        TK.walk([P.throwAt]), TK.face(P.toCorn), TK.say('feed'),
        TK.act('scatter', 3.9, (W, u, Lf) => {
          W.pose = 'feed'; W.face = 'feeding'; W.scatter = u;
          const k = Math.floor(u * 1.1 + 0.45); if (k > thrown && thrown < 4) { thrown = k; P.scatter(Lf.handTip(), 12); }
        }),
        TK.act('watch', 4.5, (W, u) => { W.pose = 'turn'; W.face = 'happy'; W.look = [0.35 * Math.sin(u * 0.9), -0.35]; W.head = [0, 8, 14 * Math.sin(u * 0.9)]; }));
    } else if (kind === 'worms') {
      // worms from her (Audrey, 28 Oct: "that would be cute if the chickens get them to the farmer ... if the chicken loves the
      // farmer and the farmer goes and asks for it"): a crouch, she hurries over and he holds his hand out low, palm up; for
      // each worm she scratches, pecks it up out of the ground and drops it in his palm (P.dig); "Thank you, my lovely!", a
      // heart; his hand closed round them, up, and into the pocket on his bib
      let ready = null, hearted = false;
      const N = Math.max(1, n || 1), DIG = 2.4, all = DIG * N, rooster = hen && hen.kind === 'rooster';
      const L2 = () => P.henAt && P.henAt.hand === 'L', cup = () => L2() ? 'cupL' : 'cup', close = P2 => { P2[L2() ? 'handL' : 'handR'] = [105, 110, 40, 4]; };      // (the hand on her side)
      L.push(TK.walk([P.crouchAt]), TK.face(P.toHen), TK.act('crouch', 0.8, W => { W.pose = 'pet'; W.face = 'happy'; }),
        () => { ready = P.callHen(hen, true); return null; },
        { name: 'wait', t: 0, run(Lf, dt) { this.t += dt; const W = Lf.want; W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.4]; return !ready || ready() || this.t > (P.waitMax || 12); } },
        // (she couldn't come after all, gone in to lay, say: he gets up again)
        () => ready && ready() ? TK.seq('worms', [
          TK.act('hand', 0.6, W => { W.pose = cup(); W.face = 'happy'; W.look = [0, -0.5]; }),
          TK.act('dig', all, (W, u, Lf) => { W.pose = cup(); W.face = 'happy'; W.look = [0, -0.5]; P.dig(hen, u, DIG, N, Lf); }),
          TK.say(rooster ? 'wormsR' : 'wormsH'),
          TK.act('thanks', 1.3, (W, u, Lf) => { W.pose = cup(); W.face = 'happy'; W.look = [0, -0.3]; P.dig(hen, all, DIG, N, Lf); if (u > 0.25 && !hearted) { hearted = true; P.heart(hen); } }),
          TK.act('close', 0.45, (W, u, Lf) => { W.pose = cup(); W.face = 'happy'; W.anim = close; P.dig(hen, all, DIG, N, Lf); if (u > 0.3) P.wormsClosed(); }),
          TK.act('pocket', 1.1, (W, u) => { W.pose = L2() ? 'pocketL' : 'pocket'; W.face = 'happy'; if (u > 0.85) W.anim = P2 => { P2[L2() ? 'handL' : 'handR'] = [5, 0, 20, 14]; }; }),
          () => { P.wormsDone(hen); return null; },
        ]) : null,
        () => { P.wormsDone(hen); P.letGo(hen); return null; },
        TK.act('up', 0.6, W => { W.pose = 'turn'; W.face = 'happy'; }));
    } else {
      // a proper cuddle (Audrey, 25 Oct: "Could you do a proper cuddle?"): a crouch, she hurries over and settles in front of
      // him; he scoops her up in both hands and stands with her held against his chest, stroking her back and swaying a
      // little ("There, there…"), hearts floating up, her eyes shut happily; then he crouches and sets her down again
      // (P.lift: how far up she is, 0 on the ground .. 1 in his arms; where his arms are, from him)
      let ready = null, heart = 0.3;
      const sm = u => u * u * (3 - 2 * u), step = (a, b, u) => Math.max(0, Math.min(1, (u - a) / (b - a)));
      L.push(TK.walk([P.crouchAt]), TK.face(P.toHen), TK.act('crouch', 0.8, W => { W.pose = 'pet'; W.face = 'happy'; }),
        () => { ready = P.callHen(hen); return null; },
        { name: 'wait', t: 0, run(Lf, dt) { this.t += dt; const W = Lf.want; W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.4]; return !ready || ready() || this.t > (P.waitMax || 12); } },
        // (she couldn't come after all, gone in to lay, say: he gets up again)
        () => ready && ready() ? TK.seq('cuddling', [
          TK.act('scoop', 1.0, (W, u, Lf) => { W.pose = 'scoop'; W.face = 'happy'; W.look = [0, -0.5]; if (P.lift) P.lift(hen, 0.32 * sm(step(0.45, 1.0, u)), Lf); }),
          TK.act('rise', 1.0, (W, u, Lf) => { W.pose = 'hold'; W.face = 'happy'; if (P.lift) P.lift(hen, 0.32 + 0.68 * sm(step(0, 0.85, u)), Lf); }),
          TK.say('cuddle'),
          TK.act('hug', 4.8, (W, u, Lf) => { W.pose = 'hold'; W.face = 'cuddle'; W.hug = u; if (P.lift) P.lift(hen, 1, Lf); if (u > heart) { heart += 0.55; P.heart(hen); } }),
          TK.act('lower', 1.1, (W, u, Lf) => { W.pose = u < 0.35 ? 'hold' : 'scoop'; W.face = 'happy'; W.look = [0, -0.5]; if (P.lift) P.lift(hen, 1 - sm(step(0.2, 0.95, u)), Lf); }),
          () => { if (P.lift) P.lift(hen, 0, null); return null; },
        ]) : null,
        () => { P.letGo(hen); return null; },
        TK.act('up', 0.8, W => { W.pose = 'turn'; W.face = 'happy'; }));
    }
    L.push(TK.walk([...(kind === 'fill' && P.clear ? [P.clear] : []), ...P.back.slice(0, 3)]), pen(false), TK.walk(P.back.slice(3)));      // (with the pail: round the feeder's far side of it)
    const seq = TK.seq('pen', L), run = seq.run.bind(seq);
    seq.run = (Lf, dt) => {
      if (seq.aborted) return true;
      if (kind !== 'fill') return run(Lf, dt);
      const W = Lf.want; W.props.pail = true;
      const done = run(Lf, dt);
      if (W.pose === 'turn') { W.pose = 'carry'; W.keepArms = 'R'; }      // (carrying the pail, it steady in the left hand)
      return done;
    };
    return seq;
  }
  // ---- a farewell at a coop's gate (main.js chicksGo): he hurries to `at` ([x, z], outside the gate), turns to `face`
  // (the youngsters lined up inside it), ready(), "Off you go, and good luck!", and cheers them off (hooray, a wave),
  // turning to keep watching them as they go (watch(): where they are, [x, z]), till done() or half a minute. (Named
  // 'pen': he isn't called away meanwhile; a visit asked for waits till after.) Audrey: "The farmer is not looking at
  // the chickens anymore to say goodbye that's odd"
  cheerAt(at, face, ready, done, watch) {
    if (this.home || this.running) return false;
    const there = { name: 'check', run(Lf) { if (Math.hypot(Lf.pos.x - at[0], Lf.pos.z - at[1]) > 0.7) seq.aborted = true; return true; } };
    const cheer = { name: 'cheer', t: 0, run(Lf, dt) {
      this.t += dt; STAND.cheer(Lf.want, this.t);
      const w = watch && watch(); if (w) Lf.turnTo(Math.atan2(w[0] - Lf.pos.x, w[1] - Lf.pos.z), dt, 2.4);
      return (this.t > 3 && done()) || this.t > 30;
    } };
    const seq = TK.seq('pen', [TK.path(at[0], at[1], 'hurry'), there, TK.face(face), () => { ready(); return null; }, TK.say('farewell'), cheer, TK.act('about', 1.5, STAND.about)]);
    const run = seq.run.bind(seq); seq.run = (Lf, dt) => seq.aborted || run(Lf, dt);
    if (this.task && /^(out|home|pen)$/.test(this.task.name)) this.pending = seq; else this.task = seq;
    return true;
  }
  // ---- work about the farm (main.js: sowing and harvesting the wheat, the honey): he hurries to `at` ([x, z]), turns to
  // `face`, says `say`, then `acts` ([name, secs, set(want, u, life)], 'camera': turning to face the player, or 'done': done() there), then a moment's look
  // about. done() once ('done', or the end of the acts, or straight away if he never gets there); pail: carrying the pail all the while. Named 'pen': he isn't
  // called away meanwhile; asked while he's coming out, going in or busy in a pen, straight after it
  workAt(at, face, acts, done, o = {}) {
    if (this.home || this.running) return false;
    let fin = false; const finish = () => { if (!fin) { fin = true; if (done) done(); } return null; };
    const there = { name: 'check', run(Lf) { if (Math.hypot(Lf.pos.x - at[0], Lf.pos.z - at[1]) > 0.8) { seq.aborted = true; finish(); } return true; } };
    const L = [TK.path(at[0], at[1], 'hurry'), there, TK.face(face), ...(o.say ? [TK.say(o.say)] : []), ...acts.map(a => a === 'done' ? finish : a === 'camera' ? TK.face('camera') : TK.act(a[0], a[1], a[2])), finish, TK.act('about', 1.4, STAND.about)];
    const seq = TK.seq('pen', L), run = seq.run.bind(seq);
    seq.run = (Lf, dt) => {
      if (seq.aborted) return true;
      if (!o.pail) return run(Lf, dt);
      const W = Lf.want; W.props.pail = true;
      const r = run(Lf, dt);
      if (W.pose === 'turn') { W.pose = 'carry'; W.keepArms = 'R'; }
      return r;
    };
    seq.finish = finish;
    if (this.task && /^(out|home|pen)$/.test(this.task.name)) this.pending = seq; else this.task = seq;
    return seq;
  }
  // ---- a visit to the geese (main.js geeseVisit: V, with the geese's own part in geese.js): to their gate, in, and as far
  // as they trust the farmer (V.stage): 0 cross: "Hello, you two!", a wave; they come at him hissing, "Whoa!", and he runs
  // for the gate, his hat knocked off on the way out; it lands outside, he gets it back and puts it on ("Maybe
  // tomorrow…"). 1 wary: corn scattered towards them ("Some corn for you!"), then back by the gate watching them come for
  // it. 2 curious: a handful of corn at his feet and a crouch while they come and eat by him ("There you are!"). 3
  // friends: they come to meet him; a crouch, they come up to him and he strokes their necks ("There, there…"), hearts
  // floating up. Then out again, the gate shut behind him. Named 'pen' (he isn't called away meanwhile).
  visitGeese(V) {
    if (this.home || this.running) return false;
    const self = this, R = this.r;
    const there = { name: 'check', run(Lf) { if (Math.hypot(Lf.pos.x - V.out[0], Lf.pos.z - V.out[1]) > 0.8) { seq.aborted = true; V.done(false); } return true; } };
    const gate = on => () => { if (on) { self.pen = V; V.enter(); } else if (self.pen === V) { V.leave(); self.pen = null; } return null; };
    const wait = (test, tmax, set) => ({ name: 'wait', t: 0, run(Lf, dt) { this.t += dt; set(Lf.want, this.t, Lf, dt); return test(Lf) || this.t > tmax; } });
    const watch = (W, u, Lf, dt) => { const g = V.lead(); if (g) Lf.turnTo(Math.atan2(g.x - Lf.pos.x, g.z - Lf.pos.z), dt, 2.5); };
    const react = k => () => { V.react(k); return null; };
    const L = [TK.path(V.out[0], V.out[1], 'hurry'), there, TK.face(V.toIn), gate(true), TK.act('open', 0.7, W => { W.pose = 'turn'; W.face = 'happy'; W.look = [0, -0.2]; })];
    L.push(react(['chase', 'wary', 'curious', 'friends'][V.stage]));      // (they've seen him: coming over, as far as they trust him)
    L.push(TK.walk(V.noGate ? [V.meet] : [V.gin, V.meet]));
    if (V.stage === 0) {
      let flew = false;
      L.push(wait(() => V.close() < 3.4, 20, (W, u, Lf, dt) => { W.pose = 'turn'; W.face = 'happy'; watch(W, u, Lf, dt); }),      // (here they come)
        TK.say('geese'), TK.act('wave', 1.8, STAND.wave), react('charge'),
        wait(() => V.close() < 2.0, 10, (W, u, Lf, dt) => { W.pose = 'worried'; W.face = 'worried'; watch(W, u, Lf, dt); }),
        TK.say('whoa'),
        // (off at a run for the gate: his hat knocked off as he goes through it, landing outside)
        { name: 'flee', i: 0, t: 0, run(Lf, dt) {
          this.t += dt; const pts = V.noGate ? [V.flee] : [V.gin, V.out, V.flee], p = pts[this.i], last = this.i >= pts.length - 1;
          const W = Lf.want; W.face = 'panic'; W.pose = 'panic';
          if (!flew && (this.i >= 1 || V.noGate) ) { flew = true; Lf.hatFly(V.hatAt); }
          if (this.i === 2 && self.pen === V) { V.leave(); self.pen = null; }       // (out: the gate shut behind him)
          if (Lf.moveTo(p[0], p[1], dt, 'run', !last) || (!last && Math.hypot(p[0] - Lf.pos.x, p[1] - Lf.pos.z) < 0.25)) { if (last) return true; this.i++; }
          return this.t > 15;
        } },
        gate(false),
        TK.act('phew', 1.2, W => { W.pose = 'worried'; W.face = 'worried'; }),
        () => TK.path(V.hatAt[0] + V.hatFrom[0] * 0.45, V.hatAt[1] + V.hatFrom[1] * 0.45),
        () => TK.face(Math.atan2(-V.hatFrom[0], -V.hatFrom[1])),
        TK.act('pick', 1.6, (W, u, Lf) => { W.pose = 'pet'; W.face = 'neutral'; W.look = [0, -0.5]; if (u > 0.45) Lf.hatHome(Math.min(1, (u - 0.45) / 0.9)); }),
        () => { self.hatOn(); return null; },
        TK.face('camera'), TK.say('tomorrow'), TK.act('shrug', 2.2, W => { W.pose = 'worried'; W.face = 'happy'; }));
    } else if (V.stage === 1) {
      L.push(TK.say('corn'), scatter(V, 3), TK.walk([V.gin]), TK.face(V.toIn), react('back'),
        wait(() => V.ate(), 16, (W, u, Lf, dt) => { STAND.hips(W, u); watch(W, u, Lf, dt); }),
        TK.act('about', 1.5, STAND.about));
    } else if (V.stage === 2) {
      L.push(TK.say('corn'), scatter(V, 1),
        TK.act('crouch', 0.8, W => { W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.3]; }),
        wait(() => V.close() < 1.3, 12, (W, u, Lf, dt) => { W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.3]; watch(W, u, Lf, dt); }),
        TK.say('there'),
        wait(() => V.ate(), 14, (W, u, Lf, dt) => { W.pose = 'pet'; W.face = 'cuddle'; W.look = [0, -0.35]; watch(W, u, Lf, dt); }),
        TK.act('up', 0.8, W => { W.pose = 'turn'; W.face = 'happy'; }));
    } else {
      let heart = 0.4;
      // (watching them come, across the water if they're on the far side; a crouch once they're near; the stroke once they're
      // up to him; if they never came after all, up again, a wave and off)
      const stroke = { name: 'stroke', t: 0, run(Lf, dt) {         // (turned to her, stroking her neck, hearts floating up)
        this.t += dt; const W = Lf.want; W.pose = 'pet'; W.face = 'cuddle'; W.patting = true; W.low = 0.5; watch(W, this.t, Lf, dt);
        if (this.t > heart) { heart += 0.6; V.heart(); }
        return this.t >= 5.4;
      } };
      const up = () => TK.act('up', 0.8, W => { W.pose = 'turn'; W.face = 'happy'; });
      L.push(wait(() => V.close() < 2.0, 45, (W, u, Lf, dt) => { W.pose = 'turn'; W.face = 'happy'; watch(W, u, Lf, dt); }),
        TK.act('crouch', 0.8, W => { W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.3]; }),
        wait(() => V.ready(), 12, (W, u, Lf, dt) => { W.pose = 'pet'; W.face = 'happy'; W.look = [0, -0.3]; watch(W, u, Lf, dt); }),
        () => V.ready() ? TK.seq('stroking', [react('stroke'), TK.say('cuddle'), stroke, up(), TK.face('camera'), TK.act('wave', 1.8, STAND.wave)])
          : TK.seq('nocuddle', [up(), TK.say('geese'), TK.act('wave', 1.8, STAND.wave)]));
    }
    if (V.stage > 0) L.push(TK.walk(V.noGate ? [V.out] : [V.gin, V.out]), gate(false));
    L.push(() => { V.done(true); return null; });
    const seq = TK.seq('pen', L), run = seq.run.bind(seq);
    seq.run = (Lf, dt) => { const r = seq.aborted || run(Lf, dt); if (r && self.hat) self.hatOn(); return r; };      // (never left without his hat)
    seq.visit = V;
    if (this.task && /^(out|home|pen)$/.test(this.task.name)) this.pending = seq; else this.task = seq;
    return true;
  }
  // ---- fishing (release 5; main.js startFishing, fishing.js): he hurries to F.start (outside the dock's gate while its
  // field is wild meadow, else the end of the dock on the bank), through the gate (F.gate: opened as he goes in, shut
  // behind him on his way out) and out along the dock (F.inPts: as into a pen, the water either side), turns to the water,
  // F.arrived(); then F.drive(life, dt) poses him each frame until he's done (true: his rod laid down on the dock, where
  // it's kept with his bucket); back along the dock and off (F.outPts), F.done(). Named 'pen': he isn't called away
  // meanwhile; never got there: F.done(false)
  fishAt(F) {
    if (this.home || this.running) return false;
    const self = this;
    const there = { name: 'check', run(Lf) { if (Math.hypot(Lf.pos.x - F.start[0], Lf.pos.z - F.start[1]) > 0.8) { seq.aborted = true; F.done(false); } return true; } };
    const gate = on => () => { if (on) { self.pen = F; F.enter(); } else if (self.pen === F) { F.leave(); self.pen = null; } return null; };
    const L = [TK.path(F.start[0], F.start[1], 'hurry'), there, TK.face(F.toIn), gate(true)];
    if (F.gate) L.push(TK.act('open', 0.6, W => { W.pose = 'turn'; W.face = 'happy'; W.look = [0, -0.2]; }));
    L.push(TK.walk(F.inPts), TK.face(F.face), () => { F.arrived(); return null; },
      { name: 'fishing', run: (Lf, dt) => F.drive(Lf, dt) },
      TK.walk(F.outPts), gate(false), () => { F.done(true); return null; });
    const seq = TK.seq('pen', L), run = seq.run.bind(seq);
    seq.run = (Lf, dt) => seq.aborted || run(Lf, dt);
    seq.fishing = F;
    if (this.task && /^(out|home|pen)$/.test(this.task.name)) this.pending = seq; else this.task = seq;
    return seq;
  }
  // his hat knocked off (the geese chasing him out): up off his head and down at `to` ([x, z]), tumbling; back on (hatHome
  // 0..1 as he picks it up and puts it on: farmer.js), on (hatOn)
  hatFly(to) {
    const M = this.f.rig.hatMatrix(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); M.decompose(p, q, sc);
    const gy = this.o.groundY ? this.o.groundY(to[0], to[1]) : 0, yaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
    this.hat = { t: 0, T: 0.95, p0: p, q0: q, sc, to: new THREE.Vector3(to[0], gy + HAT_REST, to[1]), qEnd: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + 1.3, 0)), spin: this.r() < 0.5 ? 1 : -1, home: 0 };
    this.f.rig.hatWorld = M; this.f.rig.hatHome = 0;
  }
  hatHome(k) { if (this.hat) this.hat.home = k; }
  hatOn() { this.hat = null; this.f.rig.hatWorld = null; this.f.rig.hatHome = 0; }
  hatStep(dt) {
    const H = this.hat; if (!H) return;
    H.t += dt; const u = Math.min(1, H.t / H.T);
    const p = H.p0.clone().lerp(H.to, u); p.y += 0.75 * 4 * u * (1 - u);                     // (up and over)
    const tumble = new THREE.Quaternion().setFromEuler(new THREE.Euler(H.spin * u * Math.PI * 2.2, 0, 0.6 * Math.sin(u * Math.PI)));
    const q = H.q0.clone().multiply(tumble).slerp(H.qEnd, u * u);
    this.f.rig.hatWorld = new THREE.Matrix4().compose(p, q, H.sc); this.f.rig.hatHome = H.home;
  }
  // where his pail is (its middle, world), as he's posed now
  pailAt() { const b = this.f.rig.B.pail; b.updateWorldMatrix(true, false); return b.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.08, 0)); }
  // where a handful of corn leaves his hand (the right hand, a little ahead of it)
  handTip() { return this.f.rig.B.wristR.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(Math.sin(this.heading) * 0.08, 0, Math.cos(this.heading) * 0.08)); }
  // tapped: a wave and "Hello!" (not indoors, nor while chasing Rusty off)
  tapped() {
    if (this.home || this.running || this.pen || (this.task && /^(out|home|pen)$/.test(this.task.name))) return false;
    this.task = TK.seq('tapped', [TK.face('camera'), TK.say('hello'), TK.act('wave', 2.4, STAND.wave)]);
    return true;
  }
  // ---- the night visit: the farmer sent after Rusty (nightvisit.js moves the torch; the farmer goes with it)
  torchRun(dt, V, F) {
    const T = V.torch, p = this.pos;
    if (!this.running) { this.running = true; this.task = null; V.torch.glowAt = () => this.torchTip(); }
    if (this.home) { this.home = false; p.set(T.pos.x, 0, T.pos.y); this.heading = T.aim; }
    if (this.f.opacity < 1) this.f.fade(Math.min(1, this.f.opacity + dt / 0.4));
    const dx = T.pos.x - p.x, dz = T.pos.y - p.z, d = Math.hypot(dx, dz);
    if (d > 1e-4) { if (d > 0.01) this.turnTo(Math.atan2(dx, dz), dt, 9); p.x = T.pos.x; p.z = T.pos.y; this.moved += Math.min(d, 0.5); }
    else this.turnTo(T.aim, dt, 5);
    this.speed += (Math.min(2.4, d / Math.max(1e-3, dt)) - this.speed) * Math.min(1, dt * 8);
    const W = this.want;
    W.props.torch = true; W.pose = 'torch'; W.keepArms = 'L';
    if (F.stage === 'shine') { W.face = 'stern'; W.talk = F.t < 2.4; W.pose = 'torch'; W.raise = 1; }
    else if (F.stage === 'coming') W.face = 'panic';
    else W.face = 'neutral';
  }
  // ---- each frame
  update(dt, hour) {
    this.time += dt; this.moved = 0; this.movedNow = false; this.turned = false;
    this.near = (this.o.others ? this.o.others() : []).filter(o => o && o.pos && (!o.root || o.root.visible));
    if (this.pen) this.near.push(...this.pen.hens());
    this.want = { pose: 'turn', face: 'neutral', look: [0, 0], head: null, props: {} };
    if (!this.placed) this.place(hour);
    const V = this.o.visit && this.o.visit(), F = V && V.farmer;
    if (F && F.stage !== 'gone') this.torchRun(dt, V, F);
    else {
      if (this.running) { this.running = false; this.task = null; if (V) V.torch.glowAt = null; }
      const night = this.night(hour);
      if (this.home) { if (!night && !this.task) this.task = this.comeOut(hour); }
      else if (night && (!this.task || !/^(home|out|pen)$/.test(this.task.name))) { this.task = this.goHome(); this.pending = null; }
      else if (!this.task) { this.task = this.pending && !night ? this.pending : this.next(hour); this.pending = null; }
      if (this.task && this.task.run(this, dt)) this.task = null;
      this.torchOn = !this.home && (hour >= TORCH_AT || hour < OUT_AT + 0.3);
      if (this.torchOn) { this.want.props.torch = true; if (this.want.pose === 'turn' || this.want.pose === 'hips') { this.want.pose = 'torch'; this.want.keepArms = 'L'; } }
    }
    if (!this.movedNow && !this.running) this.speed = Math.max(0, this.speed - 4 * dt);
    if (!this.turned) this.av *= Math.max(0, 1 - dt * 10);
    // ---- the body: walking (or running) as far as he really goes, the pose wanted, the face
    const W = this.want, sp = this.speed, run = sp > 1.7;
    this.phase += this.moved / (run ? 1.35 : 0.85) * Math.PI * 2;
    const f = this.f, A = { pose: W.pose, face: W.face, walk: clamp(sp / 0.9, 0, 1), run: run ? 1 : 0, phase: this.phase, keepArms: W.keepArms, props: W.props };
    const look = W.look || [0, 0], head = W.head, t = this.time;
    A.anim = (P, Fc) => {
      if (W.lookAbout && sp > 0.2) { Fc.look = [0.4 * Math.sin(t * 0.5), 0]; P.head[2] += 10 * Math.sin(t * 0.5); }
      else Fc.look = look;
      if (head) { P.head[0] += head[0]; P.head[1] += head[1]; P.head[2] += head[2]; }
      if (W.waving) { P.shR[0] += 10 * Math.sin(t * 7); P.wrR[0] += 18 * Math.sin(t * 7 + 0.6); }
      if (W.patting) { P.shR[1] += 8 * Math.sin(t * 3); P.elR[1] += 10 * Math.sin(t * 3 + 1); }
      if (W.hug !== undefined) {                              // her back stroked, a gentle sway from side to side
        const st = Math.sin(t * 2.4), sw = Math.sin(t * 1.25);
        P.shR[0] += 7 * st; P.elR[0] += 10 * st; P.wrR[0] += 12 * st; P.chest[0] += 4 * sw; P.head[0] += 7 * Math.sin(t * 1.25 + 0.6); P.head[1] += 4;
      }
      if (W.low) { P.chest[1] += 16 * W.low; P.head[1] -= 12 * W.low; P.shR[1] += 22 * W.low; P.elR[1] -= 6 * W.low; P.wrR[1] += 25 * W.low; }      // (down to a hen's back)
      if (W.raise) { P.shR[1] -= 18; P.elR[1] += 8; }
      if (W.pour) { P.shL[1] -= 45 * W.pour; P.elL[1] -= 25 * W.pour; P.wrL[1] += 70 * W.pour; P.chest[1] += 8 * W.pour; }      // the pail tipped
      if (W.scatter !== undefined) { const k = Math.sin(((W.scatter * 1.1) % 1) * Math.PI); P.shR[1] += -30 * k; P.elR[1] += 20 * k; P.wrR[1] += -30 * k; }
      if (W.talk) Fc.mouth = Math.sin(t * 13) > 0 ? 'talk' : 'o';
      if (W.anim) W.anim(P, Fc, t);                           // (a task's own movement: the fishing's reel wound, a hop and a fist pumped)
    };
    f.want = A;
    f.root.rotation.y = this.heading;
    if (this.o.groundY) this.pos.y = this.o.groundY(this.pos.x, this.pos.z);
    this.hatStep(dt);
    f.update(dt);
    if (this.pen) this.pen.at(this.pos, W.props.pail ? this.pailAt() : null);
    // ---- the animals step aside if he's right on them (geese, ducks on the grass, Biscuit)
    const nav = this.o.nav;
    if (!this.home) for (const o of this.near) {
      if (o.wet > 0.3 || o.inKennel || o.noPush) continue;
      const dx = o.pos.x - this.pos.x, dz = o.pos.z - this.pos.z, d = Math.hypot(dx, dz), min = o.isDuck ? 0.36 : 0.5;
      if (d < min && d > 1e-4) {
        const nx = this.pos.x + dx / d * min, nz = this.pos.z + dz / d * min;
        if (!nav || nav.freeAt(nx, nz)) { o.pos.x = nx; o.pos.z = nz; }
        else { const bx = o.pos.x - dx / d * min, bz = o.pos.z - dz / d * min; if (!nav || nav.freeAt(bx, bz)) { this.pos.x = bx; this.pos.z = bz; } }      // (no room for it: he steps back)
      }
    }
    // ---- the torch's light on the ground at dusk (the night visit's own torch when he's out after Rusty), the bubble
    const T = this.torch;
    if (this.torchOn && !this.running) { T.pos.set(this.pos.x, this.pos.z); T.aim = this.heading; T.walking = sp > 0.2; T.update(dt, true); }
    else T.update(dt, false);
    if (this.bubbleT > 0 && f.opacity > 0.5) {
      this.bubbleT -= dt; const u = Math.min(1, (2.6 - this.bubbleT) * 6), w = this.bubble.material.map.userData.w || 3, s = 0.2 * u;
      this.bubble.visible = this.bubbleT > 0 && this.group.visible; this.bubble.scale.set(s * w, s, 1);
      this.bubble.position.set(this.pos.x, this.pos.y + 1.78, this.pos.z); this.bubble.material.opacity = Math.min(1, this.bubbleT * 3);
    } else this.bubble.visible = false;
  }
}
