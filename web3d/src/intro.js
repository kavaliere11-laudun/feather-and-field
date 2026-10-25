// The onboarding pictures (?intro=1..4; Audrey chose "Scenes from the 3D farm"): four little scenes from the game, each on its
// own stage out past the village (as the welcome picture, ?poster), nobody else about, bright late-morning light. They are
// shot by intropics.mjs through main.js's __farm.posterShot (a perspective camera on the stage; each scene's camera is its
// `cam` here) and saved as intro/1.webp .. 4.webp for the first screens a new player sees.
//   1 "Your forever flock": the rustic Red Barn and its Rhode Island Red trio; the farmer crouched stroking one hen (eyes shut,
//     hearts floating up), the rooster proud, the other hen tilting her head at them.
//   2 "Eggs and chicks": a Rhode Island Red mum with her chicks (one sheltering under her spread wing, one hopping, one
//     pecking, one peering at the eggs) by a straw nest of brown eggs, the Red Barn behind.
//   3 "Land and new breeds": a field of wild meadow behind the land's fence with its FOR SALE sign and red-ribbon stakes (as
//     main.js draws them), mown farm grass in front, and the Buff Orpingtons arriving at their Thatched Cottage, delighted.
//   4 "Shows, honey and more": the judge pinning the first prize's red rosette on a Light Brahma in her little show coop;
//     the farmer beside her holding up a frame of honey from his hives, a couple of bees after it.
// The test village itself is hidden while a scene is on (clearView): only the ground, the stage and its cast show.
// Everything is the game's own: Bird (main.js) posed through its posterPose hook, Farmer (farmer.js) poses, the coops'
// models, the show ground (showground.js), the land's fence, sign and stakes, the hearts, the honey frame. Nothing here runs
// without ?intro, and no model or look is changed (the Silkies as they are).
import * as THREE from 'three';
import { Farmer } from './farmer.js';
import { loadShow, ShowGround, SHOW } from './showground.js';

const DEG = Math.PI / 180;
// a farmer's pose with the arms the other way round (the left doing what the right did): shoulders, elbows, wrists, hands
function mirrorArms(P) {
  const sw = (a, b) => { const l = P[a].slice(), r = P[b].slice(); P[a] = [-r[0], r[1], -r[2]]; P[b] = [-l[0], l[1], -l[2]]; };
  sw('shL', 'shR'); sw('elL', 'elR'); sw('wrL', 'wrR');
  const h = P.handL; P.handL = P.handR; P.handR = h;
}
// each scene's stage and camera turned together by this much (degrees) from the game's view, so the late-morning sun
// comes from in front and to the left: faces in the light, shadows falling away behind (?turn=N tries another)
const TURNS = [0, -50, -50, -50, -72];
const TURN_Q = typeof location !== 'undefined' && /[?&]turn=(-?\d+)/.test(location.search) ? +RegExp.$1 : null;
// every pose field a bird's rig reads, at rest: a scene's pose starts from these, so nothing the bird does by herself shows
const REST = { walk: 0, peck: 0, sit: 0, kick: 0, kickT: 0, flap: 0, crow: 0, ruffle: 0, hopT: -1, wag: 0, turn: 0, sing: 0, cluck: 0, kawk: 0,
  brood: 0, duck: 0, stretch: 0, sleep: 0, proud: 0, lookYaw: 0, lookTilt: 0 };

// ctx (main.js): { scene, centre (world), part(name), parts, batch(name, matrices, opts),
//   newBird(plot, breed, kind, colour, pos, yaw, r), plots, allBirds, grade(material), heart(world) -> its pool entry, rng,
//   fence(lines) (main.js buildFence: world [[x, z], ...] lines), saleBoard() (the sign: post, board, its words in the page's language),
//   saleStakes(points) (stakes with red ribbons, world [[x, z]]), honeyFrame() (the frame of honey), loadGLB, loadJSON }
export async function buildIntro(n, ctx) {
  const I = new Intro(n, ctx);
  await I.build();
  return I;
}

class Intro {
  constructor(n, ctx) {
    this.n = n; this.ctx = ctx; this.r = ctx.rng(300 + n); this.t = 0;
    // (its +z towards the camera, turned with it: TURNS)
    this.turn = TURN_Q ?? TURNS[n];
    const g = this.g = new THREE.Group(); g.position.copy(ctx.centre); g.rotation.y = (45 + this.turn) * DEG; ctx.scene.add(g); g.updateMatrixWorld(true);
    this.plot = { kind: 'lineup', frame: g, birds: [], centre: ctx.centre.clone(), poster: true };
    ctx.plots.push(this.plot);
    this.ticks = []; this.hearts = []; this.heartK = []; this.mine = new Set();
  }
  async build() {
    const C = this.ctx;
    if (this.n === 4) await loadShow(C.loadGLB, C.loadJSON);
    // (the sale sign's words are drawn once, in the game's own type: wait for it, a few seconds at most)
    if (this.n === 3 && document.fonts) await Promise.race([document.fonts.load('800 58px Nunito').catch(() => null), new Promise(ok => setTimeout(ok, 4000))]);
    [null, () => this.flock(), () => this.chicks(), () => this.land(), () => this.show()][this.n]();
    C.allBirds.push(...this.plot.birds);
    this.update(0);
  }
  // ---- the set: a model from the village's own parts, at (x, z) on the stage, turned deg, scaled s (still: it never moves)
  prop(name, x, z, deg = 0, s = 1, cast = true) {
    const C = this.ctx; if (!C.parts[name]) return null;
    const m = C.part(name); m.position.set(x, 0, z); m.rotation.y = deg * DEG; m.scale.setScalar(s);
    this.g.add(m); m.updateMatrixWorld(true); m.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = true; } });
    return m;
  }
  // grass tufts and flowers scattered round the stage, kept out of the boxes in `clear` ([x0, z0, x1, z1]) and the round
  // spots in `round` ([x, z, r])
  dress(count, { x0 = -5, x1 = 5, z0 = -5, z1 = 3, clear = [], round = [], flowers = 0.4, seed = 5 } = {}) {
    const r = this.ctx.rng(seed), kinds = ['grass_tuft_0', 'grass_tuft_1', 'grass_tuft_2'], fl = ['flower_daisy', 'flower_butter', 'flower_clover'];
    for (let i = 0, made = 0; i < count * 6 && made < count; i++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
      if (clear.some(b => x > b[0] && x < b[2] && z > b[1] && z < b[3]) || round.some(c => Math.hypot(x - c[0], z - c[1]) < c[2])) continue;
      const k = r() < flowers ? fl[Math.floor(r() * 3)] : kinds[Math.floor(r() * 3)];
      this.prop(k, x, z, r() * 360, 0.8 + r() * 0.5, false); made++;
    }
  }
  // a bird of the stage, posed: pose(A, t) sets what's wanted over REST each frame (the bird's own doings never show)
  bird(breed, kind, colour, x, z, yaw, pose) {
    const b = this.ctx.newBird(this.plot, breed, kind, colour, [x, 0, z], yaw, this.r);
    b.stay = true; b.wait = 1e9; this.plot.birds.push(b);
    this.posed(b, pose);
    return b;
  }
  posed(b, pose) { b.posterPose = (A) => { Object.assign(A, REST); if (pose) pose(A, this.t, b); }; }
  // after the rig has posed her: a bone or two turned further (a wing lifted over a chick), each frame
  after(b, f) { const P = b.rig.pose.bind(b.rig); b.rig.pose = (A) => { P(A); f(b.rig.bones, A); }; }
  // a farmer (look 'm' Arthur, 'j' the judge) at (x, z) turned yaw, wanting want(t) each frame
  farmer(look, x, z, yaw, want) {
    const f = new Farmer(this.g, look, this.ctx.grade, this.r); f.pos.set(x, 0, z); f.root.rotation.y = yaw;
    this.ticks.push(dt => { f.want = want(this.t); f.update(dt > 0 ? dt : 1); });
    return f;
  }
  // hearts floating up from `at` (on the stage: [x, y, z], or a function giving it), one every `every` seconds, drifting
  // `drift` (m/s, on the stage); the same each time (main.js spawnHeart, its random bits set here)
  heartsFrom(at, every = 0.5, drift = [0.05, 0.34, 0.02], size = 0.13) {
    const k = { next: 0, i: 0 }; this.heartK.push(k);
    this.ticks.push(dt => {
      if (dt <= 0 || this.t < k.next) return;
      k.next = this.t + every; const j = k.i++, p = typeof at === 'function' ? at() : at;
      this.g.updateMatrixWorld(true);
      const w = this.g.localToWorld(new THREE.Vector3(p[0] + Math.sin(j * 2.4) * 0.04, p[1], p[2] + Math.cos(j * 1.7) * 0.03));
      const d = new THREE.Vector3(drift[0] * (1 + 0.4 * Math.sin(j * 1.3)), drift[1], drift[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.g.rotation.y);
      const h = this.ctx.heart(w);
      if (h) { h.sprite.position.copy(w); h.size = size * (1 + 0.22 * ((j * 0.618) % 1)); h.drift = [d.x, d.y, d.z]; this.hearts.push(h); }
    });
  }
  // the test village out of sight (it would show over the stage's grass, behind): everything that isn't the stage's hidden
  // once everything's made (the first step); the ground, the light, the stage and what it made, and the birds' soft
  // shadows stay
  clearView() {
    for (const o of this.ctx.scene.children) {
      if (o === this.g || o.isLight || this.mine.has(o)) continue;
      if (o.isInstancedMesh && o.frustumCulled === false) continue;          // (the birds' soft shadows)
      if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width >= 100) continue;      // (the ground)
      o.visible = false;
    }
  }
  // what the stage makes outside its own group (main.js's batches, fence and stakes go straight into the scene)
  keep(list) { for (const o of [].concat(list || [])) this.mine.add(o); return list; }
  // the scene's clock from the start again (intropics.mjs, before posing it: the hearts the same at the moment it's shot,
  // whatever the page did before)
  restart() {
    this.t = 0;
    for (const h of this.hearts) { h.life = 0; h.sprite.visible = false; }
    this.hearts = []; for (const k of this.heartK) { k.next = 0; k.i = 0; }
  }
  update(dt) {
    if (this.cam) this.cam.az = this.turn;
    if (dt > 0 && !this.cleared) { this.cleared = true; this.clearView(); }
    this.t += dt;
    for (const f of this.ticks) f(dt);
    this.g.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------------ 1. Your forever flock
  flock() {
    this.cam = { at: [-0.02, 0.56, -0.45], el: 20, dist: 6.4, fov: 22.8, shadowReach: 4.5 };
    this.prop('rustic_rir', 0.1, -1.95, 0);
    this.prop('bush_a', -1.65, -1.75, 0, 0.75); this.prop('bush_b', 1.75, -1.9, 30, 0.7);
    this.prop('tree_apple', 2.6, -3.6, 0); this.prop('tree_a', -2.8, -3.9, 40);
    this.dress(150, { clear: [[-1.4, -2.6, 1.5, 1.2]], seed: 11 });
    this.dress(40, { x0: -2.4, x1: 2.4, z0: 1.2, z1: 2.6, seed: 21, flowers: 0.55 });
    // the farmer crouched, stroking the hen beside him with his left hand (the cuddle's 'pet', the other way round, so she sits
    // on the open side towards the coop); she sits under his hand, eyes shut, as content as can be
    const F = this.farmer('m', -0.98, 0.32, 0.8, t => ({ pose: 'pet', face: 'cuddle', props: {},
      anim: (P, Fc) => { mirrorArms(P); P.chest[1] += 8; P.head[1] -= 4; P.shL[0] += 26; P.shL[1] += 12; P.wrL[1] += 18; P.head[2] += 14; Fc.look = [0.3, -0.35]; } }));
    const pet = this.bird('rir', 'hen', null, -0.58, 0.67, -0.75, A => { A.sit = 1; A.lookYaw = 0.3; A.lookTilt = 0.2; A.wag = 0.4; });
    pet.rig.sleepy(true);
    this.under(pet, F, 0.03, 'L');
    // the rooster, chest out, head high, watching over them
    this.bird('rir', 'rooster', null, 0.85, 0.0, -0.5, A => { A.proud = 1; A.lookYaw = -0.2; A.lookTilt = 0.05; });
    // the other hen, coming over to see, her head on one side
    this.bird('rir', 'hen', null, 0.2, 0.78, -1.1, A => { A.walk = 1; A.phase = 1.2; A.lookYaw = 0.1; A.lookTilt = 0.45; });
    this.heartsFrom(() => { const p = pet.root.position; return [p.x + 0.04, 0.42, p.z + 0.02]; }, 0.36, [0.07, 0.36, 0.03], 0.17);
  }
  // a bird kept right under a farmer's stroking hand (his wrist, 'L' or 'R'), her back `back` m behind it
  under(b, F, back = 0, side = 'R') {
    this.ticks.push(() => {
      this.g.updateMatrixWorld(true);
      const h = this.g.worldToLocal(F.rig.B['wrist' + side].getWorldPosition(new THREE.Vector3())), y = b.root.rotation.y;
      b.root.position.x = h.x - Math.sin(y) * back; b.root.position.z = h.z - Math.cos(y) * back;
    });
  }

  // ------------------------------------------------------------------ 2. Eggs and chicks
  chicks() {
    this.cam = { at: [-0.2, 0.42, -0.1], el: 16, dist: 4.4, fov: 20.5, shadowReach: 3.5 };
    this.prop('rustic_rir', -0.12, -2.55, 0);
    this.prop('bush_b', -1.75, -2.25, 0, 0.75); this.prop('bush_a', -2.3, -1.5, 0, 0.6); this.prop('flower_pots', 0.98, -1.95, 10, 0.85); this.prop('bush_a', 1.75, -2.6, 0, 0.7);
    this.prop('tree_apple', -2.6, -4.6, 0); this.prop('tree_b', 3.3, -5.2, 30);
    this.dress(260, { x0: -3, x1: 3, z0: -4, z1: 1.6, clear: [[-0.95, -3.2, 0.7, -1.6], [-1.15, -0.35, 0.75, 0.75], [-0.5, -1.4, 0.6, -0.3], [0.7, -2.3, 1.3, -1.6]], seed: 12, flowers: 0.5 });
    // mum, settled low, her near wing spread over a chick sheltering under it
    const mum = this.bird('rir', 'hen', null, 0.0, 0.0, -0.6, A => { A.sit = 0.7; A.lookYaw = -0.25; A.lookTilt = 0.15; });
    this.after(mum, B => { B.wingL.rotation.z += 0.95; });
    this.bird('rir', 'chick', null, 0.14, 0.03, -0.6, A => { A.lookYaw = -0.3; A.lookTilt = 0.25; });
    // the others: one pecking, one hopping for joy, one peering at the eggs
    this.bird('rir', 'chick', null, -0.36, 0.4, 0.4, A => { A.peck = 1; });
    const hop = this.bird('rir', 'chick', null, 0.45, 0.42, -0.9, A => { A.hopT = 0.45; A.flap = 1; A.t = 2.3; A.lookTilt = 0.15; });
    hop.shadowY = 0.015; this.ticks.push(() => { hop.root.position.y = 0.07; });
    this.bird('rir', 'chick', null, -0.72, 0.02, -0.35, A => { A.lookYaw = 0.2; A.lookTilt = 0.3; A.peck = 0.35; });
    this.nest(-0.82, 0.3, 4);
  }
  // a straw nest of brown eggs at (x, z): a bed of straw, a raised rim of straws laid round it, a few loose ones, the eggs
  // in the middle (the game's own: main.js EGG_COLOUR, a touch bigger, so they show at phone size)
  nest(x, z, eggs) {
    const r = this.ctx.rng(77), grp = new THREE.Group(); grp.position.set(x, 0, z); this.g.add(grp);
    const straw = new THREE.MeshLambertMaterial(); this.ctx.grade(straw);
    const N = 420, geo = new THREE.CylinderGeometry(0.0042, 0.0042, 1, 5), inst = new THREE.InstancedMesh(geo, straw, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const a = r() * 6.28, kind = i < N * 0.72 ? 0 : i < N * 0.92 ? 1 : 2;          // (0: the rim, 1: the bed, 2: loose ones)
      const rad = kind === 0 ? 0.125 + r() * 0.06 : kind === 1 ? r() * 0.13 : 0.16 + r() * 0.1;
      const y = kind === 0 ? 0.02 + r() * 0.055 * (1 - Math.abs(rad - 0.155) / 0.04) : kind === 1 ? 0.03 + r() * 0.006 : 0.006;
      const yaw = kind === 2 ? r() * 6.28 : -a + (r() - 0.5) * (kind === 0 ? 0.7 : 3);
      e.set(Math.PI / 2 + (r() - 0.5) * (kind === 0 ? 0.5 : 0.15), yaw, (r() - 0.5) * 0.4, 'YXZ');
      m.compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), q.setFromEuler(e), new THREE.Vector3(1, kind === 2 ? 0.1 + r() * 0.06 : 0.07 + r() * 0.08, 1));
      inst.setMatrixAt(i, m); inst.setColorAt(i, c.setHSL(0.1 + r() * 0.035, 0.62 + r() * 0.15, 0.42 + r() * 0.18));
    }
    inst.castShadow = true; inst.receiveShadow = true; grp.add(inst);
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.035, 28), new THREE.MeshLambertMaterial({ color: '#c99d48' }));
    bed.position.y = 0.0175; bed.receiveShadow = true; this.ctx.grade(bed.material); grp.add(bed);
    const em = new THREE.MeshStandardMaterial({ color: '#b97a4f', roughness: 0.45 }); this.ctx.grade(em);      // (main.js EGG_COLOUR.rir)
    const spots = [[0, 0.0], [0.065, 0.035], [-0.06, 0.04], [0.01, -0.065], [-0.04, -0.03]];
    for (let i = 0; i < eggs; i++) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), em);
      egg.position.set(spots[i][0], 0.062, spots[i][1]); egg.rotation.set(1.2 + 0.3 * Math.sin(i * 3.1), i * 1.7, 0.2 * Math.cos(i * 2.3));
      egg.scale.set(0.05, 0.064, 0.05).multiplyScalar(1.25); egg.castShadow = true; egg.receiveShadow = true; grp.add(egg);
    }
    grp.updateMatrixWorld(true);
    return grp;
  }

  // ------------------------------------------------------------------ 3. Land and new breeds
  land() {
    this.cam = { at: [0.45, 0.52, -0.25], el: 15, dist: 7.6, fov: 24, shadowReach: 5 };
    // the land's fence, running from front left to back right: the wild meadow beyond it (the field for sale), the farm's
    // mown grass this side (side(x, z): how far from the fence, less than 0 in the meadow)
    const L = [[-3.4, 1.3], [-0.6, -0.5], [1.0, -2.2], [2.8, -4.0]];
    const w = p => { const v = this.g.localToWorld(new THREE.Vector3(p[0], 0, p[1])); return [v.x, v.z]; };
    const side = (x, z) => { let best = 1e9, s = 1; for (let i = 1; i < L.length; i++) { const [ax, az] = L[i - 1], [bx, bz] = L[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), d = Math.hypot(x - ax - dx * u, z - az - dz * u); if (d < best) { best = d; s = (dx * (z - az) - dz * (x - ax)) > 0 ? 1 : -1; } } return s * best; };
    this.g.updateMatrixWorld(true);
    this.keep(this.ctx.fence([L.map(w)]));
    this.tint(side);
    this.wild(side);
    // the FOR SALE sign just inside the fence, facing out over the farm; stakes with red ribbons along the field's border
    // with the rest of the meadow, running back from the fence
    const sign = this.ctx.saleBoard(); sign.position.set(-1.28, 0, -0.82); sign.rotation.y = 0.45; this.g.add(sign);
    sign.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    const st = []; for (let i = 1; i <= 5; i++) { const u = i / 5; st.push(w([0.25 - 2.0 * u, -1.35 - 2.6 * u])); }
    this.keep(this.ctx.saleStakes(st));
    // a few trees out in the meadow, far off
    for (const [m, x, z, d, sc] of [['tree_b', -5.5, -15, 20, 1], ['tree_a', -1.8, -16.5, 70, 1.1], ['tree_c', 1.6, -15.5, 0, 1], ['tree_apple', 5.2, -14, 0, 1], ['tree_a', -9, -13, 140, 1]]) this.prop(m, x, z, d, sc);
    // the Thatched Cottage on the farm side, the new trio just arrived in front of it
    this.prop('rustic_orp', 1.75, -1.0, -14);
    this.prop('bush_a', 3.1, -0.35, 0, 0.7); this.prop('bush_b', 3.4, -2.2, 0, 0.75);
    this.dress(260, { x0: -3, x1: 4.5, z0: -4, z1: 2.4, clear: [[0.9, -1.9, 2.65, 0.0], [-0.7, 0.3, 1.5, 1.4]], seed: 13, flowers: 0.4 });
    this.dress(70, { x0: -1.8, x1: 3.2, z0: 0.9, z1: 2.6, round: [[1.05, 1.25, 0.42], [0.36, 1.52, 0.4], [-0.36, 1.22, 0.4]], seed: 23, flowers: 0.6 });
    // (the farm's own short grass only this side of the fence)
    this.g.children.filter(c => /grass_tuft|flower_/.test(c.name) && side(c.position.x, c.position.z) < 0.25).forEach(c => c.removeFromParent());
    // the Buff Orpingtons, delighted with their new home: the rooster crowing, a hen leaping for joy, the other trotting up
    this.bird('orp', 'rooster', null, 1.05, 1.2, -0.75, A => { A.crow = 1; A.flap = 0.3; A.t = 2.3; A.lookTilt = 0.05; A.proud = 0.5; });
    const h1 = this.bird('orp', 'hen', null, 0.36, 1.48, -0.2, A => { A.hopT = 0.52; A.flap = 1; A.t = 2.3; A.lookTilt = 0.1; });
    h1.shadowY = 0.015; this.ticks.push(() => { h1.root.position.y = 0.2; });
    this.bird('orp', 'hen', null, -0.36, 1.18, 0.5, A => { A.walk = 1; A.phase = 0.6; A.proud = 0.6; A.lookYaw = -0.3; A.lookTilt = 0.2; });
  }
  // the meadow's warmer colour over the ground (as main.js landTint: soft-edged), and its long grass and wildflowers
  tint(side) {
    const S = 512, span = 80, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const c = cv.getContext('2d'), img = c.createImageData(S, S), d = img.data;
    for (let k = 0; k < S; k++) for (let i = 0; i < S; i++) {
      const x = (i / S - 0.5) * span, z = (k / S - 0.5) * span, o = (k * S + i) * 4;
      if (side(x, z) < 0) { d[o] = 196; d[o + 1] = 186; d[o + 2] = 92; d[o + 3] = 92; }
    }
    c.putImageData(img, 0, 0); c.filter = 'blur(2px)'; c.drawImage(cv, 0, 0); c.filter = 'none';
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.ctx.grade(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(span, span), mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.0022; m.receiveShadow = true; m.renderOrder = -1;
    this.g.add(m);
  }
  wild(side) {
    const tufts = [[], [], []], flowers = { flower_daisy: [], flower_butter: [], flower_clover: [] }, fn = Object.keys(flowers), step = 0.42;
    for (let z = -40, zi = 0; z < 4; z += step, zi++) for (let x = -16, xi = 0; x < 10; x += step, xi++) {
      const r = this.ctx.rng(xi * 7919 + zi * 104729 + 13);
      const px = x + r() * step, pz = z + r() * step;
      if (side(px, pz) > -0.12) continue;
      const v = this.g.localToWorld(new THREE.Vector3(px, 0, pz));
      tufts[Math.floor(r() * 3)].push(new THREE.Matrix4().compose(v, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3(1.3 + r() * 0.5, 1.9 + r() * 0.9, 1.3 + r() * 0.5)));
      if (r() < 0.22) { const k = fn[Math.floor((Math.sin(px * 0.9) + Math.cos(pz * 0.8) + 2) * 0.75) % 3]; for (let j = 0; j < 3; j++) { const u = this.g.localToWorld(new THREE.Vector3(px + (r() - 0.5) * 0.5, 0, pz + (r() - 0.5) * 0.5)); flowers[k].push(new THREE.Matrix4().compose(u, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28), new THREE.Vector3().setScalar(1.4 + r() * 0.6))); } }
    }
    tufts.forEach((list, k) => this.keep(this.ctx.batch('grass_tuft_' + k, list, { lambert: true, tile: 6, twoSided: true, wind: 1.2 })));
    for (const k of fn) this.keep(this.ctx.batch(k, flowers[k], { lambert: true, twoSided: true, wind: 1.2 }));
  }

  // ------------------------------------------------------------------ 4. Shows, honey and more
  show() {
    const I = SHOW, k = 2, P = I.pens[k];
    // the show ground on the stage (its own frame: x across, z towards the player), the camera on coop k
    const G = this.G = new ShowGround(this.g, { x: 0, z: 0, deg: 0, grade: this.ctx.grade });
    G.clipboard(true);
    this.cam = { at: [P.x - 0.08, 0.98, 1.25], el: 11, dist: 6.6, fov: 19.8, shadowReach: 4.5 };
    // her (a Light Brahma, white against her blue coop) and her neighbours in their coops (none of them changed: the Silkie as
    // she is); she stands tall, the others look over at her; the two behind the farmer and the judge settled down in the straw
    // (the coop behind the farmer an empty one, so nobody peeks out round his head)
    const kinds = [['sil', 'hen', 'white'], null, ['bra', 'hen'], ['orp', 'hen'], ['leg', 'hen'], ['rir', 'hen']];
    I.pens.forEach((p, i) => {
      if (!kinds[i]) return;
      const [breed, kind, colour] = kinds[i], low = i === k + 1;
      const b = this.bird(breed, kind, colour || null, p.bird[0] + (i === k + 1 ? 0.06 : 0), p.bird[2], i === k ? 0.12 : p.birdYaw + (i < k ? 0.25 : -0.7),
        i === k ? A => { A.proud = 1; A.flap = 0.22; A.t = 2.3; A.lookYaw = 0.25; A.lookTilt = 0.1; } : A => { A.sit = low ? 1 : 0; A.lookYaw = (i < k ? 0.45 : -0.45); A.lookTilt = 0.12; });
      this.ticks.push(() => { b.root.position.y = p.bird[1]; });
    });
    // the judge beside her coop, turned towards us, reaching out to his right to pin the first prize's red rosette on it
    // (his arm raised or lowered, and his feet moved, till the rosette in his fingers is right at the coop's pin, a little to
    // its right; then it's pinned there, facing out, his fingers just letting go of it)
    const aim = { lift: 0 }, ros = G.rosette('first');
    const J = this.judge = this.farmer('j', P.x + 0.5, 1.32, -0.45, t => ({ pose: 'judge_pin', face: 'happy', props: {},
      anim: (Q, Fc) => { Q.shR = [-52 - aim.lift, -24, 0]; Q.elR = [0, -12, 0]; Q.wrR = [0, -10, 0]; Q.chest[2] -= 10; Q.head[2] -= 22; Q.head[1] += 6; Q.hipR[1] = 0; Q.kneeR = 0; Fc.look = [-0.3, -0.15]; } }));
    this.held = G.hold(J, ros);
    this.ticks.push(dt => {
      if (aim.done || dt <= 0) return;
      const want = G.world(P.pin[0] + 0.075, P.pin[1] + 0.01, P.pin[2] + 0.03), at = this.held.getWorldPosition(new THREE.Vector3());
      aim.lift += (want.y - at.y) * 90;
      const d = this.g.worldToLocal(want.clone()).sub(this.g.worldToLocal(at.clone())); J.pos.x += d.x; J.pos.z += d.z;
      if (this.t > 2.2) { aim.done = true; G.pin(k, this.held); }
    });
    // the farmer on her other side, holding up a frame of honey from his hives, a bee or two after it
    const A = this.farmer('m', P.x - 0.78, 1.42, 0.3, t => ({ pose: 'hold', face: 'happy', props: {},
      anim: (Q, Fc) => { Q.head[2] += 4; Q.head[1] -= 6; Fc.look = [0, 0.05]; } }));
    const frame = this.ctx.honeyFrame(); this.g.add(frame);
    this.ticks.push(() => {
      const B = A.rig.B, a = B.wristL.getWorldPosition(new THREE.Vector3()), b = B.wristR.getWorldPosition(new THREE.Vector3()), h = A.root.rotation.y + this.g.rotation.y;
      const p = a.add(b).multiplyScalar(0.5).add(new THREE.Vector3(Math.sin(h) * 0.07, 0.07, Math.cos(h) * 0.07));
      frame.position.copy(this.g.worldToLocal(p)); frame.rotation.set(-0.3, A.root.rotation.y, 0, 'YXZ');
    });
    this.bees([[P.x - 0.36, 0.98, 1.76, -1.3], [P.x - 0.43, 1.2, 1.8, -1.95]]);
    this.heartsFrom([P.bird[0] + 0.02, 1.4, P.bird[2] + 0.25], 0.5, [0.02, 0.3, 0.12], 0.13);
  }
  // a few bees, as decorlife.js draws them (a fuzzy striped body, two round wings a blur of a beat), a little bigger so they
  // show in the picture: each [x, y, z, heading] on the stage
  bees(list) {
    const body = new THREE.SphereGeometry(1, 12, 10), col = [], P = body.attributes.position;
    for (let i = 0; i < P.count; i++) { const z = P.getZ(i), band = z < 0.6 && Math.sin(z * 8 + 0.6) > 0.25; col.push(...(band ? [0.14, 0.1, 0.05] : [0.98, 0.74, 0.14])); }
    body.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const bm = new THREE.MeshLambertMaterial({ vertexColors: true }), wm = new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
    this.ctx.grade(bm); this.ctx.grade(wm);
    const s = 0.04;
    for (const [x, y, z, h] of list) {
      const bee = new THREE.Group(); bee.position.set(x, y, z); bee.rotation.y = h; this.g.add(bee);
      const b = new THREE.Mesh(body, bm); b.scale.set(s * 0.85, s * 0.8, s * 1.3); bee.add(b);
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(1, 14), wm); wing.scale.set(s * 1.1, s * 0.62, 1);
        wing.position.set(side * s * 1.05, s * 0.75, -s * 0.25); wing.rotation.set(-Math.PI / 2, 0, side * 0.45, 'YZX'); bee.add(wing);
      }
    }
  }
}
